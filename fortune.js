/*
 * 운세 종합 엔진 — 별자리 · 바이오리듬 · 타로 (데이터베이스 없이 계산)
 *
 * 모든 해석 텍스트는 공개된 구조(별자리 날짜, 바이오리듬 공식, 타로 메이저
 * 아르카나 목록·아키타입)에 기반해 독자적으로 작성한 원본입니다. 특정 책·
 * 사이트의 문구를 옮기지 않았으며, 재미·자기성찰용입니다.
 */

// --- 공통 유틸 ---
function fJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
function fMul(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// 받침 유무로 조사(이/가) 선택
function josa(word) { const c = word.charCodeAt(word.length - 1); if (c < 0xAC00 || c > 0xD7A3) return "가"; return ((c - 0xAC00) % 28 === 0) ? "가" : "이"; }

// ===== 별자리 (서양 점성 태양궁) =====
const ZODIAC = [
  { name: "물병자리", en: "Aquarius", sym: "♒", elem: "바람", from: [1, 20], to: [2, 18], trait: "독창적이고 자유로우며 개성을 중시합니다. 인류애가 있지만 때로 한 걸음 거리를 둡니다.", color: "하늘색", num: "4, 22" },
  { name: "물고기자리", en: "Pisces", sym: "♓", elem: "물", from: [2, 19], to: [3, 20], trait: "감성적이고 상상력이 풍부하며 공감 능력이 큽니다. 현실과 이상 사이에서 흔들리기도 합니다.", color: "바다색", num: "7, 16" },
  { name: "양자리", en: "Aries", sym: "♈", elem: "불", from: [3, 21], to: [4, 19], trait: "저돌적이고 열정적이며 도전을 두려워하지 않습니다. 시작의 에너지가 강하나 성급함은 주의.", color: "빨강", num: "1, 9" },
  { name: "황소자리", en: "Taurus", sym: "♉", elem: "흙", from: [4, 20], to: [5, 20], trait: "끈기 있고 현실적이며 안정과 아름다움을 추구합니다. 한번 정하면 잘 바꾸지 않습니다.", color: "초록", num: "6, 15" },
  { name: "쌍둥이자리", en: "Gemini", sym: "♊", elem: "바람", from: [5, 21], to: [6, 21], trait: "호기심 많고 재치 있으며 소통에 능합니다. 관심이 넓은 대신 한 곳에 오래 머물기 어려워합니다.", color: "노랑", num: "5, 14" },
  { name: "게자리", en: "Cancer", sym: "♋", elem: "물", from: [6, 22], to: [7, 22], trait: "정이 깊고 감수성이 풍부하며 소속과 가족을 소중히 여깁니다. 상처에 예민한 편입니다.", color: "은색", num: "2, 11" },
  { name: "사자자리", en: "Leo", sym: "♌", elem: "불", from: [7, 23], to: [8, 22], trait: "당당하고 관대하며 주목받는 자리에서 빛납니다. 자존심이 강합니다.", color: "금색", num: "1, 19" },
  { name: "처녀자리", en: "Virgo", sym: "♍", elem: "흙", from: [8, 23], to: [9, 22], trait: "꼼꼼하고 분석적이며 성실합니다. 완벽을 추구하다 스스로를 다그치기도 합니다.", color: "베이지", num: "5, 23" },
  { name: "천칭자리", en: "Libra", sym: "♎", elem: "바람", from: [9, 23], to: [10, 23], trait: "균형과 조화를 중시하고 미적 감각이 뛰어납니다. 결정을 미루는 경향이 있습니다.", color: "분홍", num: "6, 24" },
  { name: "전갈자리", en: "Scorpio", sym: "♏", elem: "물", from: [10, 24], to: [11, 22], trait: "깊고 강렬하며 통찰력이 있습니다. 마음을 주면 헌신적이지만 집착으로 흐를 수 있습니다.", color: "진홍", num: "8, 13" },
  { name: "사수자리", en: "Sagittarius", sym: "♐", elem: "불", from: [11, 23], to: [12, 21], trait: "자유롭고 낙천적이며 모험과 배움을 즐깁니다. 솔직하지만 직설적일 때가 있습니다.", color: "보라", num: "3, 21" },
  { name: "염소자리", en: "Capricorn", sym: "♑", elem: "흙", from: [12, 22], to: [1, 19], trait: "책임감 있고 인내심이 강하며 목표를 향해 꾸준합니다. 다소 딱딱해 보일 수 있습니다.", color: "짙은갈색", num: "8, 10" },
];

function getZodiac(month, day) {
  for (let i = 0; i < ZODIAC.length; i++) {
    const z = ZODIAC[i];
    const [fm, fd] = z.from, [tm, td] = z.to;
    if (fm <= tm) { if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return i; }
    else { if ((month === fm && day >= fd) || (month === tm && day <= td) || month > fm || month < tm) return i; } // 염소자리(연말~연초)
  }
  return 0;
}

const DAILY_LINES = [
  "마음먹은 일을 한 걸음 밀고 나가기 좋은 흐름입니다.",
  "익숙한 일상 속에서 뜻밖의 즐거움이 찾아옵니다.",
  "서두르기보다 한 박자 쉬어 갈 때 길이 보입니다.",
  "사람과의 인연에서 작은 행운이 따르는 날입니다.",
  "생각을 정리하고 계획을 세우기에 좋은 시기입니다.",
  "감정이 앞설 수 있으니 한 번 더 생각하면 좋습니다.",
  "노력한 만큼의 결실이 조용히 다가옵니다.",
];

function zodiacDaily(idx, dateKey) {
  const seed = fHash("z" + idx + "|" + dateKey);
  const r = fMul(seed);
  const star = 2 + Math.floor(r() * 4); // 2~5
  const line = DAILY_LINES[Math.floor(r() * DAILY_LINES.length)];
  return { star, line, color: ZODIAC[idx].color, num: ZODIAC[idx].num };
}

// ===== 바이오리듬 =====
const BIO = [
  { key: "physical", name: "신체", period: 23, color: "#e05a47", desc: "체력·활력·질병 저항력" },
  { key: "emotional", name: "감정", period: 28, color: "#5aa17a", desc: "기분·정서·감수성" },
  { key: "intellectual", name: "지성", period: 33, color: "#4a7bb5", desc: "집중·논리·판단력" },
];
function biorhythm(y, m, d, today) {
  const days = fJDN(today.getFullYear(), today.getMonth() + 1, today.getDate()) - fJDN(y, m, d);
  const val = (T) => Math.sin((2 * Math.PI * days) / T); // -1..1
  const now = {};
  BIO.forEach((b) => (now[b.key] = Math.round(val(b.period) * 100)));
  // ±15일 시리즈
  const series = [];
  for (let dd = -15; dd <= 15; dd++) {
    const p = {};
    BIO.forEach((b) => (p[b.key] = Math.sin((2 * Math.PI * (days + dd)) / b.period)));
    series.push({ d: dd, v: p });
  }
  return { days, now, series };
}
function bioPhase(v) {
  if (v >= 60) return { txt: "고조", cls: "lv-hi" };
  if (v <= -60) return { txt: "저조", cls: "lv-lo" };
  if (v > -20 && v < 20) return { txt: "전환(주의)", cls: "lv-mid" };
  return { txt: v > 0 ? "상승" : "하강", cls: "lv-mid" };
}

// ===== 타로 (메이저 아르카나 22장) =====
const TAROT = [
  { n: "바보", en: "The Fool", e: "🃏", up: "새로운 시작, 순수한 도전, 자유로운 모험", rev: "무모함, 경솔한 결정, 방향 없는 방황" },
  { n: "마법사", en: "The Magician", e: "🎩", up: "의지와 창조력, 가진 것을 현실로 만드는 힘", rev: "미숙함, 재능의 낭비, 얕은 속임수" },
  { n: "여사제", en: "The High Priestess", e: "🌙", up: "직관과 내면의 지혜, 드러나지 않은 진실", rev: "억눌린 감정, 혼란, 직관 무시" },
  { n: "여황제", en: "The Empress", e: "👑", up: "풍요와 감성, 사랑과 결실이 무르익음", rev: "의존, 정체, 돌봄의 과잉" },
  { n: "황제", en: "The Emperor", e: "🏛️", up: "안정과 권위, 책임감 있는 리더십", rev: "독선, 경직, 지나친 통제" },
  { n: "교황", en: "The Hierophant", e: "📿", up: "전통과 가르침, 신뢰할 조언과 배움", rev: "형식에 갇힘, 반항, 낡은 규범" },
  { n: "연인", en: "The Lovers", e: "💞", up: "사랑과 조화, 중요한 선택 앞의 결합", rev: "갈등, 유혹, 어긋난 가치관" },
  { n: "전차", en: "The Chariot", e: "🛞", up: "의지로 나아가는 전진, 승리와 추진력", rev: "통제 상실, 조급함, 방향 잃은 질주" },
  { n: "힘", en: "Strength", e: "🦁", up: "용기와 인내, 부드러움으로 이기는 마음", rev: "자신감 저하, 나약, 감정에 휘둘림" },
  { n: "은둔자", en: "The Hermit", e: "🏮", up: "성찰과 탐구, 홀로 답을 찾는 시간", rev: "고립, 회피, 지나친 침잠" },
  { n: "운명의 수레바퀴", en: "Wheel of Fortune", e: "🎡", up: "전환점과 행운, 흐름이 바뀌는 순간", rev: "불운, 지연, 통제 밖의 변화" },
  { n: "정의", en: "Justice", e: "⚖️", up: "균형과 공정, 원인이 결과로 돌아옴", rev: "불공정, 편향, 책임 회피" },
  { n: "매달린 사람", en: "The Hanged Man", e: "🙃", up: "멈춤과 관점 전환, 기꺼운 내려놓음", rev: "정체, 헛된 희생, 놓지 못함" },
  { n: "죽음", en: "Death", e: "🦋", up: "끝과 새 시작, 변화와 재생", rev: "변화에 대한 저항, 집착, 미룸" },
  { n: "절제", en: "Temperance", e: "🍶", up: "조화와 균형, 중용으로 섞이는 지혜", rev: "과잉, 불균형, 조급한 혼합" },
  { n: "악마", en: "The Devil", e: "😈", up: "욕망과 속박, 끊기 어려운 유혹", rev: "해방, 자각, 사슬을 끊음" },
  { n: "탑", en: "The Tower", e: "🗼", up: "급작스러운 붕괴, 충격 뒤의 각성", rev: "위기 회피, 미뤄진 변화, 서서히 무너짐" },
  { n: "별", en: "The Star", e: "⭐", up: "희망과 영감, 상처가 아무는 치유", rev: "실망, 자신감 상실, 흐려진 희망" },
  { n: "달", en: "The Moon", e: "🌕", up: "불안과 환상, 무의식이 보내는 신호", rev: "혼란이 걷힘, 감춰진 진실이 드러남" },
  { n: "태양", en: "The Sun", e: "☀️", up: "성공과 활력, 밝은 기쁨과 성취", rev: "일시적 침체, 과신, 미뤄진 성공" },
  { n: "심판", en: "Judgement", e: "🎺", up: "각성과 부활, 결단의 부름", rev: "미련, 자기비판, 결정을 못 내림" },
  { n: "세계", en: "The World", e: "🌍", up: "완성과 성취, 하나로 통합됨", rev: "미완, 마무리 지연, 마지막 한 걸음" },
];
const TAROT_POS = ["과거", "현재", "미래"];

function drawTarot(seed, n) {
  n = n || 3;
  const idx = TAROT.map((_, i) => i);
  const r = fMul(seed);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  const out = [];
  for (let i = 0; i < n; i++) out.push({ card: idx[i], reversed: r() < 0.45, pos: TAROT_POS[i] || "" });
  return out;
}

// ===== 종합 =====
function buildFortune(input, tarotSeed) {
  const now = new Date();
  const dateKey = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  const zi = getZodiac(input.month, input.day);
  const daily = zodiacDaily(zi, dateKey + "|" + input.year + input.month + input.day);
  const bio = biorhythm(input.year, input.month, input.day, now);
  const tarot = drawTarot(tarotSeed != null ? tarotSeed : fHash(dateKey + "|" + input.year + input.month + input.day), 3);

  // 종합 한 줄
  const domBio = BIO.reduce((a, b) => (Math.abs(bio.now[b.key]) > Math.abs(bio.now[a.key]) ? b : a));
  const domPhase = bioPhase(bio.now[domBio.key]);
  const summary =
    `${ZODIAC[zi].name}(${ZODIAC[zi].sym}) · ${ZODIAC[zi].elem}의 기운. ` +
    `오늘의 별 운은 ${"★".repeat(daily.star)}${"☆".repeat(5 - daily.star)}, ` +
    `바이오리듬은 ${domBio.name}${josa(domBio.name)} ${domPhase.txt}입니다. ` +
    (daily.star >= 4
      ? "흐름이 좋은 날이니, 마음먹은 일을 실제 행동으로 옮겨 보세요."
      : daily.star <= 2
        ? "무리하기보다 정비하고 준비하는 데 힘을 쓰면 좋은 날입니다."
        : "큰 기복 없이 무난한 하루, 작은 것부터 차근히 해나가면 됩니다.");

  return { dateKey, zodiac: { idx: zi, ...ZODIAC[zi], daily }, bio, tarot, summary };
}

if (typeof module !== "undefined") {
  module.exports = {
    ZODIAC, BIO, TAROT, TAROT_POS,
    getZodiac, zodiacDaily, biorhythm, bioPhase, drawTarot, buildFortune, fHash,
  };
}
