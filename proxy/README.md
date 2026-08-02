# 운세 챗봇 프록시 (API 키 숨기기)

정적 사이트(GitHub Pages)에는 **API 키를 숨길 방법이 없습니다.** 번들에 넣은 키는
암호화·난독화를 해도 브라우저 개발자도구(Network 탭)에서 그대로 드러납니다.
그래서 키는 **서버 측 비밀**로만 두고, 브라우저는 키를 모르는 **프록시**에만 요청합니다.

```
브라우저(config.js의 CHAT_ENDPOINT)  ──▶  Cloudflare Worker(키 보관)  ──▶  Anthropic API
        (키 없음)                              (ANTHROPIC_API_KEY secret)
```

여기서는 무료 티어로 충분한 **Cloudflare Workers**를 예로 듭니다. (Vercel/Netlify/Deno Deploy 등도 원리는 동일)

## 1. 준비

- [Cloudflare 계정](https://dash.cloudflare.com/sign-up) (무료)
- Node.js 설치
- Anthropic API 키 (`sk-ant-...`) — [console.anthropic.com](https://console.anthropic.com)

## 2. 배포

```bash
cd proxy

# (선택) wrangler.toml 의 ALLOW_ORIGIN 을 본인 배포 주소로 수정
#   예: https://<사용자>.github.io   (GitHub Pages 기본 도메인)

# API 키를 '비밀'로 등록 — 이 값은 코드/저장소 어디에도 남지 않습니다
npx wrangler secret put ANTHROPIC_API_KEY
#   → 프롬프트에 sk-ant-... 붙여넣기

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
  MODEL: "claude-sonnet-5",
};
```

이제 운세 통합 리포트 아래 **“운세 상담 챗봇”**이 활성화됩니다.

## 설정값

| 이름 | 위치 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Worker **secret** (필수) | Anthropic API 키. `wrangler secret put` 으로만 등록 |
| `ALLOW_ORIGIN` | `wrangler.toml` `[vars]` | CORS 허용 오리진. 배포 주소로 지정 권장(기본 `*`) |
| `ANTHROPIC_MODEL` | `wrangler.toml` `[vars]` (선택) | 클라이언트 요청 무시하고 서버에서 모델 강제 |
| `MAX_TOKENS` | `wrangler.toml` `[vars]` (선택) | 응답 토큰 상한 (기본 1024) |

## 보안 메모

- **키는 절대 `config.js`·HTML·저장소에 넣지 마세요.** 오직 Worker secret 으로만.
- `ALLOW_ORIGIN` 을 본인 도메인으로 좁히면 남이 이 프록시를 함부로 쓰기 어렵습니다.
- Worker 는 클라이언트가 보낸 `model` 을 화이트리스트로 제한하고, `max_tokens`·메시지
  길이/개수를 서버에서 제한해 남용·과금 폭주를 완화합니다.
- 그래도 공개 프록시이므로, 사용량 급증이 걱정되면 Cloudflare 의 요청 수 제한
  (Rate Limiting)이나 Turnstile 을 추가로 붙일 수 있습니다.
- 비용이 걱정되면 `MODEL` 을 `claude-haiku-4-5-20251001` 로 낮추세요.
