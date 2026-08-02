/*
 * 운세 챗봇 설정.
 *
 * CHAT_ENDPOINT: 서버리스 프록시(Cloudflare Worker 등)의 URL.
 *   - 이 값이 비어 있으면 챗봇은 "설정 필요" 안내만 보여주고 비활성화됩니다.
 *   - 프록시가 API 키를 서버 측 비밀(secret)로 보관하므로, 이 파일과 배포물
 *     어디에도 API 키를 넣지 마세요. (정적 사이트에 넣은 키는 반드시 노출됩니다.)
 *   - 프록시는 무료 티어인 Google Gemini(AI Studio 키)로 중계합니다.
 *     발급·배포 방법은 proxy/README.md 참고.
 *
 * 예) CHAT_ENDPOINT: "https://fortune-chat.<계정>.workers.dev"
 *
 * 클라이언트는 프록시와 중립 포맷({system, messages} → {text} 스트림)으로만
 * 통신하므로, 백엔드 모델을 바꿔도 이 파일은 그대로 두면 됩니다.
 */
window.FORTUNE_CHAT = {
  CHAT_ENDPOINT: "https://fortune-chat.fortune-chat.workers.dev",
};
