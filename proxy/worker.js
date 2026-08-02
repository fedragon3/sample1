/*
 * 운세 챗봇용 서버리스 프록시 (Cloudflare Worker).
 *
 * 목적: Anthropic API 키를 브라우저에 노출하지 않는다.
 *   - 키는 Worker 의 서버 측 비밀(secret) ANTHROPIC_API_KEY 로만 존재한다.
 *   - 브라우저(config.js 의 CHAT_ENDPOINT)는 이 Worker 로만 요청하며 키를 모른다.
 *   - Worker 가 키를 붙여 Anthropic /v1/messages 로 중계하고, (스트리밍) 응답을 그대로 돌려준다.
 *
 * 배포: proxy/README.md 참고.
 *
 * 환경 변수 / 비밀:
 *   ANTHROPIC_API_KEY  (필수, secret)  — Anthropic 콘솔의 API 키
 *   ALLOW_ORIGIN       (선택)          — CORS 허용 오리진. 예) "https://fedragon3.github.io"
 *                                        미설정 시 "*" (개발 편의용, 배포 시 지정 권장)
 *   ANTHROPIC_MODEL    (선택)          — 클라이언트 model 을 무시하고 강제할 모델
 *   MAX_TOKENS         (선택)          — 응답 최대 토큰 상한 (기본 1024)
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ALLOWED_MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"];

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
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "server misconfigured: ANTHROPIC_API_KEY not set" }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "invalid JSON body" }, 400, cors);
    }

    // 클라이언트 입력을 신뢰하지 않고 서버에서 안전하게 재구성한다.
    const model = env.ANTHROPIC_MODEL ||
      (ALLOWED_MODELS.includes(body.model) ? body.model : "claude-sonnet-5");
    const maxTokens = clampInt(body.max_tokens, 1, Number(env.MAX_TOKENS) || 1024, 512);
    const messages = sanitizeMessages(body.messages);
    if (!messages.length) return json({ error: "messages required" }, 400, cors);

    const payload = {
      model,
      max_tokens: maxTokens,
      messages,
      stream: body.stream !== false,
    };
    if (typeof body.system === "string" && body.system.trim()) payload.system = body.system;

    let upstream;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: "upstream fetch failed", detail: String(e) }, 502, cors);
    }

    // 스트리밍 여부와 무관하게 업스트림 본문을 그대로 흘려보낸다(키 헤더는 제외).
    const headers = new Headers(cors);
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function clampInt(v, lo, hi, dflt) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

// role 이 user/assistant 이고 content 가 문자열인 항목만, 길이 제한을 걸어 남긴다.
function sanitizeMessages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}
