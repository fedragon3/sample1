# 운세 챗봇 프록시 (무료 Gemini · API 키 숨기기)

정적 사이트(GitHub Pages)에는 **API 키를 숨길 방법이 없습니다.** 번들에 넣은 키는
암호화·난독화를 해도 브라우저 개발자도구(Network 탭)에서 그대로 드러납니다.
그래서 키는 **서버 측 비밀**로만 두고, 브라우저는 키를 모르는 **프록시**에만 요청합니다.

이 프록시는 **무료 티어인 Google Gemini**로 중계합니다(개인 사용 수준이면 무료로 충분).

```
브라우저(config.js의 CHAT_ENDPOINT)  ──▶  Cloudflare Worker(키 보관)  ──▶  Gemini API (무료 티어)
        (키 없음)                              (GEMINI_API_KEY secret)
```

## 1. 준비

- **무료 Gemini API 키** — [Google AI Studio](https://aistudio.google.com/apikey) 접속 →
  "Create API key" → 키 복사 (`AIza...`). 결제 카드 없이 무료 티어로 발급됩니다.
- [Cloudflare 계정](https://dash.cloudflare.com/sign-up) (무료)
- Node.js 설치

> 무료 티어에는 분당·일일 요청 한도가 있습니다(예: Flash 모델 분당 수십 회 수준).
> 개인·소규모 사용엔 넉넉하지만, 트래픽이 많아지면 한도에 걸릴 수 있습니다.

## 2. 배포

```bash
cd proxy

# (선택) wrangler.toml 의 ALLOW_ORIGIN 을 본인 배포 주소로 수정
#   예: https://<사용자>.github.io

# Gemini 키를 '비밀'로 등록 — 이 값은 코드/저장소 어디에도 남지 않습니다
npx wrangler secret put GEMINI_API_KEY
#   → 프롬프트에 AIza... 붙여넣기

# 배포
npx wrangler deploy
```

배포가 끝나면 다음과 같은 URL이 출력됩니다:

```
https://fortune-chat.<계정>.workers.dev
```

## 3. 프론트엔드 연결

저장소 루트의 `config.js` 를 열어 위 URL을 넣고 커밋·배포합니다:

```js
window.FORTUNE_CHAT = {
  CHAT_ENDPOINT: "https://fortune-chat.<계정>.workers.dev",
};
```

이제 운세 통합 리포트 아래 **"운세 상담 챗봇"**이 활성화됩니다.
(모델은 프록시가 정하므로 `config.js` 에는 모델명을 넣지 않습니다.)

## 설정값

| 이름 | 위치 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | Worker **secret** (필수) | AI Studio 무료 키. `wrangler secret put` 으로만 등록 |
| `ALLOW_ORIGIN` | `wrangler.toml` `[vars]` | CORS 허용 오리진. 배포 주소로 지정 권장(기본 `*`) |
| `GEMINI_MODEL` | `wrangler.toml` `[vars]` (선택) | 기본 `gemini-1.5-flash` (무료 티어 대상) |
| `MAX_TOKENS` | `wrangler.toml` `[vars]` (선택) | 응답 토큰 상한 (기본 1024) |

## 클라이언트 ↔ 프록시 규약 (중립 포맷)

프록시는 특정 제공사에 종속되지 않는 포맷으로 통신하므로, 나중에 백엔드를
다른 모델(예: 유료 Claude, Groq 등)로 바꿔도 브라우저 코드는 그대로 둡니다.

- **요청**: `{ "system": string, "messages": [{ "role": "user"|"assistant", "content": string }] }`
- **응답**: `text/event-stream`, 각 줄 `data: {"text":"..."}`, 종료 `data: [DONE]`, 오류 `data: {"error":"..."}`

## 보안 메모

- **키는 절대 `config.js`·HTML·저장소에 넣지 마세요.** 오직 Worker secret 으로만.
- `ALLOW_ORIGIN` 을 본인 도메인으로 좁히면 남이 이 프록시를 함부로 쓰기 어렵습니다.
- Worker 는 `max_tokens`·메시지 길이/개수를 서버에서 제한해 남용·한도 소진을 완화합니다.
- 무료 한도 급증이 걱정되면 Cloudflare 의 Rate Limiting 이나 Turnstile 을 추가할 수 있습니다.
