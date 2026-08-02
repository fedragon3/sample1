/*
 * 운세 챗봇용 서버리스 프록시 (Cloudflare Worker) — 초고속 무료 Groq API 중계.
 *
 * 목적: API 키를 브라우저에 노출하지 않으며, 구글 Gemini의 Cloudflare IP 차단 문제를 완전 우회합니다.
 *   - 키는 Worker 의 서버 측 비밀(secret) GROQ_API_KEY 로만 존재합니다.
 *   - Groq API(Llama 3.3 70B 모델 등)는 지리적/IP 차단이 없어 한국 및 Cloudflare Worker에서 100% 동작합니다.
 *
 * 프로토콜(중립 포맷 — 클라이언트 수정 필요 없음):
 *   요청  (브라우저 → Worker):  { system: string, messages: [{role:"user"|"assistant", content:string}] }
 *   응답  (Worker → 브라우저):  text/event-stream, 각 줄 `data: {"text":"..."}`, 종료 `data: [DONE]`
 *                              오류는 `data: {"error":"..."}`
 *
 * 환경 변수 / 비밀:
 *   GROQ_API_KEY     (필수, secret)  — Groq Console (https://console.groq.com/keys) 무료 API 키 (gsk_...)
 *   ALLOW_ORIGIN     (선택)          — CORS 허용 오리진. 예) "https://fedragon3.github.io"
 *   GROQ_MODEL       (선택)          — 기본 "llama-3.3-70b-versatile"
 *   MAX_TOKENS       (선택)          — 응답 최대 토큰 (기본 1024)
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    const apiKey = env.GROQ_API_KEY || env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: "server misconfigured: GROQ_API_KEY secret not set" }, 500, cors);

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: "invalid JSON body" }, 400, cors); }

    // 기본 모델: gpt-oss-120b (OpenAI 오픈모델, Groq 무료). Llama 3.3 대비 한국어에
    // 한자·키릴 등 다른 문자를 섞는 오염이 적어 순수 한글 출력에 유리하다.
    const model = env.GROQ_MODEL || "openai/gpt-oss-120b";
    const maxTokens = clampInt(body.max_tokens, 1, 4096, Number(env.MAX_TOKENS) || 1024);

    const formattedMessages = [];
    if (typeof body.system === "string" && body.system.trim()) {
      formattedMessages.push({ role: "system", content: body.system.trim() });
    }

    if (Array.isArray(body.messages)) {
      body.messages.forEach((m) => {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          formattedMessages.push({ role: m.role, content: m.content });
        }
      });
    }

    if (formattedMessages.length === 0) return json({ error: "messages required" }, 400, cors);

    const payload = {
      model,
      messages: formattedMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    };

    let upstream;
    try {
      upstream = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: "upstream fetch failed: " + String(e) }, 502, cors);
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return json({ error: `groq ${upstream.status}: ${detail.slice(0, 300)}` }, 502, cors);
    }

    // OpenAI SSE 포맷을 클라이언트용 중립 스트림으로 변환
    const { readable, writable } = new TransformStream();
    streamNeutral(upstream.body, writable);
    return new Response(readable, {
      status: 200,
      headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
    });
  },
};

async function streamNeutral(upstreamBody, writable) {
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const reader = upstreamBody.getReader();
  const dec = new TextDecoder();
  const send = (obj) => writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const p = s.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        let ev;
        try { ev = JSON.parse(p); } catch (e) { continue; }
        const text = ev?.choices?.[0]?.delta?.content;
        if (typeof text === "string" && text) {
          await send({ text });
        }
        if (ev?.error) await send({ error: ev.error.message || "groq error" });
      }
    }
  } catch (e) {
    try { await send({ error: String(e) }); } catch (_) {}
  } finally {
    try { await writer.write(enc.encode("data: [DONE]\n\n")); } catch (_) {}
    try { await writer.close(); } catch (_) {}
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function clampInt(v, lo, hi, dflt) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
