/*
 * 운세 챗봇 설정.
 *
 * CHAT_ENDPOINT: 서버리스 프록시(Cloudflare Worker 등)의 URL.
 *   - 이 값이 비어 있으면 챗봇은 "설정 필요" 안내만 보여주고 비활성화됩니다.
 *   - 프록시가 API 키를 서버 측 비밀(secret)로 보관하므로, 이 파일과 배포물
 *     어디에도 API 키를 넣지 마세요. (정적 사이트에 넣은 키는 반드시 노출됩니다.)
 *   - 배포 방법은 proxy/README.md 참고.
 *
 * 예) CHAT_ENDPOINT: "https://fortune-chat.<계정>.workers.dev"
 */
window.FORTUNE_CHAT = {
  CHAT_ENDPOINT: "",
  MODEL: "claude-sonnet-5", // 비용/속도 우선. 더 좋은 품질은 "claude-opus-5"
};
