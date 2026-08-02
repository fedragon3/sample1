/*
 * 운세 챗봇용 서버리스 프록시 (Cloudflare Worker) — 무료 티어 Google Gemini 중계.
 *
 * 목적: API 키를 브라우저에 노출하지 않는다.
 *   - 키는 Worker 의 서버 측 비밀(secret) GEMINI_API_KEY 로만 존재한다.
 *   - 브라우저(config.js 의 CHAT_ENDPOINT)는 이 Worker 로만 요청하며 키를 모른다.
 *   - Worker 가 키를 붙여 Gemini 로 중계하고, 응답을 '중립 스트림'으로 돌려준다.
 *
 * 프로토콜(중립 포맷 — 특정 제공사에 종속되지 않음):
 *   요청  (브라우저 → Worker):  { system: string, messages: [{role:"user"|"assistant", content:string}] }
 *   응답  (Worker → 브라우저):  text/event-stream, 각 줄 `data: {"text":"..."}`, 종료 `data: [DONE]`
 *                              오류는 `data: {"error":"..."}`
 *   → 나중에 백엔드(모델/제공사)를 바꿔도 브라우저 코드는 그대로 둘 수 있다.
 *
 * 무료 키 발급·배포: proxy/README.md 참고.
 *
 * 환경 변수 / 비밀:
 *   GEMINI_API_KEY   (필수, secret)  — Google AI Studio 무료 API 키
 *   ALLOW_ORIGIN     (선택)          — CORS 허용 오리진. 예) "https://fedragon3.github.io"
 *                                      미설정 시 "*" (개발 편의용, 배포 시 지정 권장)
 *   GEMINI_MODEL     (선택)          — 기본 "gemini-2.5-flash" (무료 티어 대상, 또는 "gemini-flash-latest")
 *   MAX_TOKENS       (선택)          — 응답 최대 토큰 (기본 1024)
 */

const GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta/models";

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
    if (!env.GEMINI_API_KEY) return json({ error: "server misconfigured: GEMINI_API_KEY not set" }, 500, cors);

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: "invalid JSON body" }, 400, cors); }

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const maxTokens = clampInt(body.max_tokens, 1, 4096, Number(env.MAX_TOKENS) || 1024);
    const contents = toGeminiContents(body.messages);
    if (!contents.length) return json({ error: "messages required" }, 400, cors);

    const payload = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
    };
    if (typeof body.system === "string" && body.system.trim()) {
      payload.system_instruction = { parts: [{ text: body.system }] };
    }

    let upstream;
    try {
      upstream = await fetch(`${GEMINI_HOST}/${model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: "upstream fetch failed: " + String(e) }, 502, cors);
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return json({ error: `gemini ${upstream.status}: ${detail.slice(0, 300)}` }, 502, cors);
    }

    // Gemini 의 SSE(candidates[].content.parts[].text)를 중립 스트림으로 변환.
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
    for (; ;) {
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
        const parts = ev?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part.text === "string" && part.text) await send({ text: part.text });
          }
        }
        if (ev?.error) await send({ error: ev.error.message || "gemini error" });
      }
    }
  } catch (e) {
    try { await send({ error: String(e) }); } catch (_) { }
  } finally {
    try { await writer.write(enc.encode("data: [DONE]\n\n")); } catch (_) { }
    try { await writer.close(); } catch (_) { }
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

// {role:"user"|"assistant", content} → Gemini contents({role:"user"|"model", parts})
function toGeminiContents(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 4000) }] }));
}
