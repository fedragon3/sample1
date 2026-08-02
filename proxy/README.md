# 운세 챗봇 프록시 (Groq API · 초고속 · IP 차단 없음)

정적 사이트(GitHub Pages)에는 **API 키를 숨길 방법이 없습니다.**
이 프록시는 **Groq API (Llama 3.3 70B)**를 경유하여 API 키를 숨기고, 구글 Gemini의 Cloudflare IP 차단 이슈를 완벽히 해결합니다.

```
브라우저(config.js의 CHAT_ENDPOINT)  ──▶  Cloudflare Worker(키 보관)  ──▶  Groq API (무료 · 초고속)
        (키 없음)                              (GROQ_API_KEY secret)
```

## 1. 준비

1. **Groq 무료 API 키 발급 (1초 소요)**
   - [Groq Console API Keys](https://console.groq.com/keys) 접속 → "Create API Key" → 키 복사 (`gsk_...`).
2. [Cloudflare 계정](https://dash.cloudflare.com/sign-up) (무료)
3. Node.js 설치

## 2. 배포

```bash
cd proxy

# Groq API 키를 '비밀'로 등록
npx wrangler secret put GROQ_API_KEY
#   → 프롬프트에 gsk_... 붙여넣기

# 배포
npx wrangler deploy
```

배포가 끝나면 다음과 같은 URL이 출력됩니다:
```
https://fortune-chat.<계정>.workers.dev
```

## 3. 프론트엔드 연결

저장소 루트의 `config.js` 에 위 URL을 넣습니다:

```js
window.FORTUNE_CHAT = {
  CHAT_ENDPOINT: "https://fortune-chat.<계정>.workers.dev",
};
```

## 설정값 (`wrangler.toml`)

| 이름 | 위치 | 설명 |
|------|------|------|
| `GROQ_API_KEY` | Worker **secret** (필수) | Groq 무료 API 키 (`wrangler secret put GROQ_API_KEY`) |
| `ALLOW_ORIGIN` | `wrangler.toml` `[vars]` | CORS 허용 오리진 (기본 `*`) |
| `GROQ_MODEL` | `wrangler.toml` `[vars]` | 기본 `llama-3.3-70b-versatile` |
| `MAX_TOKENS` | `wrangler.toml` `[vars]` | 응답 토큰 상한 (기본 1024) |
