/*
 * 사주팔자 계산 엔진 (양력 입력) — 데이터베이스 없이 순수 계산
 *
 * 구성:
 *  - 일주(日柱): 율리우스 적일수(JDN) 기반 60갑자 순환 = (JDN + 49) mod 60, 0=갑자
 *  - 연/월주: 태양 황경(黃經)으로 24절기 경계를 계산(입춘 기준 연, 12절 기준 월)
 *  - 시주(時柱): 일간 + 2시간 단위 지지(오자둔 규칙)
 *
 * 정확도 안내(v1):
 *  - 양력 입력, 한국 표준시(UTC+9) 시계시각 기준.
 *  - 절기 경계 ±1일 이내, 자시(23시 이후) 날짜 처리(야자시)는 유파에 따라 다를 수 있음.
 *  - 오락·자기이해 목적이며 전문 명리 상담을 대체하지 않습니다.
 */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEMS_H = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCHES_H = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

// 오행: 0목 1화 2토 3금 4수
const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const YINYANG_STEM = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]; // 1=양 0=음
const ELEMENTS = [
  { name: "목", en: "木", color: "#5aa17a", label: "나무" },
  { name: "화", en: "火", color: "#e05a47", label: "불" },
  { name: "토", en: "土", color: "#cf9b46", label: "흙" },
  { name: "금", en: "金", color: "#8a8f99", label: "쇠" },
  { name: "수", en: "水", color: "#4a7bb5", label: "물" },
];

// === 율리우스 적일수 (정오 기준 정수) ===
function julianDayNumber(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// === 태양 황경(도) — Meeus 저정밀도, UT 기준 JD(소수 포함) ===
function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const rad = Math.PI / 180;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = ((M % 360) + 360) % 360 * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  let trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  return ((lambda % 360) + 360) % 360;
}

const KST_OFFSET = 9 / 24;

// === 사주 계산 ===
// input: { year, month, day, hour, minute, hasTime, gender }
function computeSaju(input) {
  const { year, month, day } = input;
  const hasTime = !!input.hasTime;
  const hour = hasTime ? input.hour : 12;
  const minute = hasTime ? (input.minute || 0) : 0;

  // 일주
  const jdn = julianDayNumber(year, month, day);
  const dayIdx = (((jdn + 49) % 60) + 60) % 60;
  const dayStem = dayIdx % 10;
  const dayBranch = dayIdx % 12;

  // 태양 황경 (UT 기준)
  const jdUT = jdn - 0.5 + (hour * 60 + minute) / 1440 - KST_OFFSET;
  const lambda = solarLongitude(jdUT);

  // 월지: 315°(입춘)에서 30°씩 → 寅(2)부터
  const sector = Math.floor(((((lambda - 315) % 360) + 360) % 360) / 30); // 0..11
  const monthBranch = (sector + 2) % 12;

  // 연주: 입춘 이전이면 전년
  let sajuYear = year;
  if (month === 1) sajuYear -= 1;
  else if (month === 2 && lambda < 315) sajuYear -= 1;
  const yearStem = (((sajuYear - 4) % 10) + 10) % 10;
  const yearBranch = (((sajuYear - 4) % 12) + 12) % 12;

  // 월간: 오호둔
  const monthStem = (((yearStem % 5) * 2 + 2) + sector) % 10;

  // 시주: 오자둔
  let hourStem = null, hourBranch = null;
  if (hasTime) {
    hourBranch = Math.floor(((((hour * 60 + minute) + 60) % 1440)) / 120);
    hourStem = (dayStem * 2 + hourBranch) % 10;
  }

  const pillars = {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    hour: hasTime ? { stem: hourStem, branch: hourBranch } : null,
  };

  // 오행 분포
  const elemCount = [0, 0, 0, 0, 0];
  const addStem = (s) => elemCount[STEM_ELEM[s]]++;
  const addBranch = (b) => elemCount[BRANCH_ELEM[b]]++;
  addStem(yearStem); addBranch(yearBranch);
  addStem(monthStem); addBranch(monthBranch);
  addStem(dayStem); addBranch(dayBranch);
  if (hasTime) { addStem(hourStem); addBranch(hourBranch); }

  return {
    input: { year, month, day, hour, minute, hasTime, gender: input.gender || "" },
    pillars,
    dayMaster: dayStem,          // 일간(日干) = 나 자신
    animal: yearBranch,          // 띠
    lambda,
    jdUT,                        // 생시(정오 대체) 율리우스일(UT)
    elemCount,
  };
}

// 천간(s)·지지(b) → 60갑자 순번(0~59)
function ganziIndex(s, b) {
  for (let n = 0; n < 60; n++) if (n % 10 === s && n % 12 === b) return n;
  return 0;
}
// 각도 최단 차(-180~180)
function angDiff(a, target) { return (((a - target) % 360 + 540) % 360) - 180; }
// 구간 [lo,hi]에서 태양황경이 target 이 되는 JD (lo에서 음, hi에서 양이라고 가정)
function findTermJD(lo, hi, target) {
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    if (angDiff(solarLongitude(mid), target) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function pillarText(p) {
  if (!p) return "—";
  return STEMS[p.stem] + BRANCHES[p.branch];
}

// === 해석(운세) — 규칙 기반으로 직접 작성한 원본 텍스트 ===
const DAY_MASTER = [
  "곧게 자라는 큰 나무처럼 추진력과 리더십이 있고 원칙을 중시합니다. 자존심이 강해 좀처럼 굽히지 않는 면도 있습니다.",
  "덩굴이나 화초처럼 유연해 환경에 잘 적응하고 섬세합니다. 부드러워 보여도 끈질긴 생활력을 지녔습니다.",
  "한낮의 태양처럼 밝고 열정적이며 표현력이 뛰어납니다. 솔직하고 화끈하지만 감정 기복에 유의하면 좋습니다.",
  "촛불이나 별빛 같은 따뜻함으로 세심하게 배려합니다. 은근한 열정과 예술적 감성을 함께 지녔습니다.",
  "큰 산처럼 듬직하고 포용력이 있어 사람들이 곧잘 기댑니다. 신중하지만 한번 마음먹으면 고집이 셉니다.",
  "기름진 밭처럼 실속 있고 꼼꼼하며 현실 감각이 뛰어납니다. 온화하면서도 배려심이 깊습니다.",
  "무쇠나 원석 같은 강단과 결단력이 있고 의리를 소중히 여깁니다. 직선적이라 때로 강해 보일 수 있습니다.",
  "보석처럼 예리하고 세련되며 자기 관리가 철저합니다. 섬세한 자존심과 완벽주의 성향이 있습니다.",
  "큰 강이나 바다처럼 지혜와 포용력이 넓고 활동 범위가 큽니다. 자유로우며 임기응변에 능합니다.",
  "이슬이나 시냇물처럼 맑고 총명해 통찰이 깊습니다. 조용하지만 상상력과 감수성이 풍부합니다.",
];

const ELEM_TRAIT = [
  { field: "교육·기획·창업·행정", keyword: "성장과 기획", love: "정이 많고 헌신적이면서도 자기 페이스를 지키려는 편", trait: "진취적이고 인정이 많으며 새로 시작하는 힘이 강합니다", organ: "간·담(눈·근육·스트레스)" },
  { field: "예술·홍보·방송·영업", keyword: "표현과 열정", love: "감정을 뜨겁게 표현하는 솔직한 스타일이지만 기복 관리가 필요한 편", trait: "밝고 활동적이며 표현력과 추진력이 돋보입니다", organ: "심장·소장(혈압·수면)" },
  { field: "부동산·중개·관리·요식", keyword: "신뢰와 안정", love: "묵묵히 신뢰를 쌓으며 안정된 관계를 선호하는 편", trait: "듬직하고 포용력이 있어 사람들의 신뢰를 얻습니다", organ: "비·위(소화기)" },
  { field: "금융·법률·기계·의료", keyword: "결단과 규율", love: "쉽게 곁을 주지 않지만 한번 정하면 의리가 깊은 편", trait: "명료하고 결단력이 있으며 원칙과 의리를 중시합니다", organ: "폐·대장(호흡·피부)" },
  { field: "연구·기획·유통·IT·상담", keyword: "지혜와 소통", love: "유연하게 상대를 헤아리며 관계의 리듬을 잘 타는 편", trait: "총명하고 유연하며 상황 판단과 통찰이 빠릅니다", organ: "신장·방광(체력·수분)" },
];

const ANIMAL_TRAIT = [
  "재치 있고 부지런하며 기회를 잘 포착합니다.",
  "성실하고 끈기가 있으며 믿음직합니다.",
  "용맹하고 리더십이 있으며 도전적입니다.",
  "온화하고 섬세하며 대인관계가 원만합니다.",
  "기상이 크고 자신감이 넘치며 이상이 높습니다.",
  "지혜롭고 신중하며 직관이 뛰어납니다.",
  "활동적이고 자유로우며 추진력이 있습니다.",
  "온순하고 예술적이며 배려심이 깊습니다.",
  "영리하고 재주가 많으며 임기응변에 능합니다.",
  "부지런하고 꼼꼼하며 자기 관리가 철저합니다.",
  "의리 있고 정직하며 책임감이 강합니다.",
  "넉넉하고 복이 많으며 사람을 잘 챙깁니다.",
];

function argExtreme(arr, max) {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (max ? arr[i] > arr[idx] : arr[i] < arr[idx]) idx = i;
  }
  return idx;
}

function buildReadings(r) {
  const dm = r.dayMaster;
  const ec = r.elemCount;
  const strong = argExtreme(ec, true);
  const weak = argExtreme(ec, false);
  const missing = ec.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const spread = Math.max.apply(null, ec) - Math.min.apply(null, ec);
  const target = missing.length ? missing[0] : weak;
  const nm = (i) => ELEMENTS[i].name;

  const sections = [
    {
      title: "타고난 기질",
      body: `일간은 '${STEMS[dm]}(${STEMS_H[dm]})' — ${YINYANG_STEM[dm] ? "양(陽)" : "음(陰)"}의 ${ELEMENTS[STEM_ELEM[dm]].label} 기운입니다. ${DAY_MASTER[dm]} 사주 전체로는 ${nm(strong)} 기운이 두드러져, ${ELEM_TRAIT[strong].trait}.`,
    },
    {
      title: "오행의 균형",
      body: `여덟 글자의 오행은 ${ec.map((c, i) => nm(i) + " " + c).join(" · ")} 입니다. ` +
        (missing.length
          ? `특히 '${missing.map(nm).join("·")}' 기운이 부족해, 이 기운을 상징하는 색·활동·사람과 가까이하면 균형에 도움이 됩니다.`
          : (spread <= 2
              ? "다섯 기운이 비교적 고르게 갖춰져 안정적인 편입니다."
              : `'${nm(strong)}' 기운이 강하고 '${nm(weak)}' 기운이 약해, 약한 쪽을 보완하는 것이 관건입니다.`)),
    },
    {
      title: "애정·관계운",
      body: `${ELEM_TRAIT[strong].love}입니다. ${YINYANG_STEM[dm] ? "먼저 다가가 이끄는 힘이 있으니, 상대의 속도를 기다려 주는 여유가 관계를 오래가게 합니다." : "은근하게 마음을 전하는 편이라, 솔직한 표현을 조금 더하면 오해를 줄일 수 있습니다."}`,
    },
    {
      title: "재물·직업운",
      body: `${nm(strong)} 기운이 강해 ${ELEM_TRAIT[strong].field} 분야의 적성이 잘 맞습니다. ${ELEM_TRAIT[strong].keyword}의 재능을 살릴수록 재물의 흐름도 함께 열립니다.`,
    },
    {
      title: "건강운",
      body: `${nm(target)} 기운이 ${missing.length ? "없어" : "약해"} ${ELEM_TRAIT[target].organ} 계통을 평소 살피면 좋습니다. 과로와 무리를 피하고 규칙적인 생활을 지키는 것이 최고의 보약입니다.`,
    },
    {
      title: "총운",
      body: `${ANIMALS[r.animal]}띠 — ${ANIMAL_TRAIT[r.animal]} ` +
        (spread <= 2
          ? "오행이 비교적 균형을 이뤄 큰 기복 없이 꾸준히 나아가는 흐름입니다. 서두르지 않아도 쌓아온 것이 결실을 맺습니다."
          : "특정 기운이 강해 개성과 전문성이 뚜렷한 대신, 부족한 기운을 채우려는 노력이 한 해의 열쇠가 됩니다."),
    },
  ];

  return { strong, weak, missing, spread, sections };
}

// === 십성(十星) 기반 운세 (오행 상생/상극) ===
// 상생: 목→화→토→금→수→목 / 상극: 목극토·화극금·토극수·금극목·수극화
const ELEM_GEN = [1, 2, 3, 4, 0];   // e 가 생하는 오행
const ELEM_CTRL = [2, 3, 4, 0, 1];  // e 가 극하는 오행
const ELEM_LUCK = [
  { color: "초록", dir: "동쪽", num: "3, 8" },      // 목
  { color: "빨강", dir: "남쪽", num: "2, 7" },      // 화
  { color: "노랑", dir: "중앙", num: "5, 10" },     // 토
  { color: "흰색", dir: "서쪽", num: "4, 9" },      // 금
  { color: "검정·파랑", dir: "북쪽", num: "1, 6" }, // 수
];

// 나(일간 오행) 기준으로 다른 오행 e 의 십성 관계
function tenGodOf(D, e) {
  if (e === D) return "bigeop";        // 비겁: 자아·경쟁·협력
  if (ELEM_GEN[D] === e) return "siksang"; // 식상: 표현·활동·재능
  if (ELEM_GEN[e] === D) return "inseong"; // 인성: 도움·학습·보호
  if (ELEM_CTRL[D] === e) return "jae";    // 재성: 재물·성취·이성(남)
  return "gwan";                        // 관성: 직장·규율·이성(여)
}

function tenGodCounts(r) {
  const D = STEM_ELEM[r.dayMaster];
  const t = { bigeop: 0, siksang: 0, jae: 0, inseong: 0, gwan: 0 };
  r.elemCount.forEach((c, e) => { t[tenGodOf(D, e)] += c; });
  return t;
}

function verdict(n) {
  if (n >= 3) return { label: "강함", cls: "lv-hi" };
  if (n === 2) return { label: "양호", cls: "lv-mid" };
  if (n === 1) return { label: "무난", cls: "lv-mid" };
  return { label: "약함", cls: "lv-lo" };
}

const TEN_GOD_KO = { bigeop: "비겁", siksang: "식상", jae: "재성", inseong: "인성", gwan: "관성" };
const TEN_GOD_THEME = {
  bigeop: "자기 주관과 경쟁의 기운이 강해지는 시기입니다. 독립·동업·자기 사업에 관심이 커지되, 지출과 고집은 관리가 필요합니다.",
  siksang: "표현과 재능을 펼치는 시기입니다. 창작·활동·후배와의 인연이 활발하고, 새로운 시도에서 성취가 따릅니다.",
  jae: "재물과 현실적 성취의 시기입니다. 일과 재산을 키우기 좋고, 남성에게는 이성·결혼운도 함께 상승합니다.",
  inseong: "배움과 안정의 시기입니다. 공부·자격·문서·부동산과 인연이 깊고, 윗사람과 귀인의 도움이 따릅니다.",
  gwan: "책임과 명예의 시기입니다. 승진·직책·시험의 결실이 있으나 부담·스트레스 관리가 관건이며, 여성에게는 인연·결혼운도 함께합니다.",
};

// 운세 카테고리 배열 생성
function buildCategories(r) {
  const D = STEM_ELEM[r.dayMaster];
  const tg = tenGodCounts(r);
  const rd = buildReadings(r);
  const gender = r.input.gender;
  const strong = rd.strong, weak = rd.weak, missing = rd.missing;
  const nm = (i) => ELEMENTS[i].name;
  const P = (s) => `<p class="rbody">${s}</p>`;

  // --- 오늘의 운세 ---
  const now = new Date();
  const td = computeSaju({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hasTime: false });
  const tStem = td.pillars.day.stem, tBranch = td.pillars.day.branch;
  const tElem = STEM_ELEM[tStem];
  const tRel = tenGodOf(D, tElem);
  const luck = ELEM_LUCK[tElem];
  const seed = (tStem * 12 + tBranch + r.dayMaster * 7 + r.animal);
  const star = 2 + (seed % 4); // 2~5
  const stars = "★".repeat(star) + "☆".repeat(5 - star);
  const TODAY = {
    bigeop: "경쟁과 협력의 기운이 도는 날입니다. 뜻이 맞는 사람과 힘을 합치면 시너지가 크지만, 고집과 충동적인 지출은 잠시 접어두세요.",
    siksang: "표현과 활동의 날입니다. 아이디어를 밖으로 꺼내거나 재능을 펼치기 좋고, 새로운 시도가 즐거움을 안겨 줍니다.",
    jae: "재물과 기회의 기운이 들어옵니다. 거래·구매·현실적인 성과에 유리하지만, 지나친 욕심은 오히려 화를 부릅니다.",
    inseong: "도움과 배움의 날입니다. 공부·정리·휴식이 잘 맞고, 윗사람이나 조력자의 손길이 따릅니다.",
    gwan: "책임과 규율의 기운입니다. 일·시험·공적인 자리에서 성취가 있으나, 무리한 압박과 스트레스는 조절이 필요합니다.",
  };
  const today = {
    id: "today", label: "오늘의 운세", emoji: "📅",
    badge: { label: stars, cls: "lv-star" },
    body: P(`${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 — 오늘은 <b>${STEMS[tStem]}${BRANCHES[tBranch]}(${STEMS_H[tStem]}${BRANCHES_H[tBranch]})</b>일입니다.`) +
      P(TODAY[tRel]) +
      `<div class="luck">🍀 행운의 색 <b>${luck.color}</b> · 방위 <b>${luck.dir}</b> · 숫자 <b>${luck.num}</b></div>`,
  };

  // --- 연애운 ---
  let loveN, loveNote;
  if (gender === "남") { loveN = tg.jae; loveNote = "이성에 대한 적극성과 매력을 나타내는 <b>재성</b>"; }
  else if (gender === "여") { loveN = tg.gwan; loveNote = "인연과 배우자운을 나타내는 <b>관성</b>"; }
  else { loveN = Math.round((tg.jae + tg.gwan) / 2); loveNote = "인연을 나타내는 <b>재성·관성</b>"; }
  const love = {
    id: "love", label: "연애운", emoji: "💕", badge: verdict(loveN),
    body: P(`연애운은 ${loveNote} 기운으로 봅니다. 당신의 사주에는 이 기운이 ${loveN}개로, ${verdict(loveN).label}한 편입니다.`) +
      P(loveN >= 2
        ? "인연의 기운이 넉넉해 만남의 기회가 자연스럽게 열립니다. 다만 마음이 앞서 서두르기보다 상대의 속도를 존중할 때 관계가 오래갑니다."
        : loveN === 1
          ? "인연의 기운은 무난합니다. 익숙한 모임이나 신뢰가 쌓인 자리에서 좋은 만남이 찾아옵니다."
          : "인연의 기운이 은은한 편이라, 나를 가꾸고 활동 반경을 넓힐수록 기회가 늘어납니다. 조급함은 금물입니다.") +
      P(`연애 스타일: ${ELEM_TRAIT[D].love}입니다.`),
  };

  // --- 직장운 ---
  const work = {
    id: "work", label: "직장운", emoji: "💼", badge: verdict(tg.gwan),
    body: P(`직장·명예운은 조직과 규율을 뜻하는 <b>관성</b>으로 봅니다. 사주에 관성이 ${tg.gwan}개로 ${verdict(tg.gwan).label}합니다.`) +
      P(tg.gwan >= 2
        ? "조직 안에서 책임과 직책을 맡아 인정받는 흐름입니다. 규율 있는 환경일수록 강점이 살아납니다."
        : tg.gwan === 1
          ? "무난한 직장운으로, 성실함이 차곡차곡 신뢰로 이어집니다."
          : "조직의 틀보다 전문성과 자율성으로 승부할 때 빛나는 유형입니다. 전문직·프리랜서·창업도 잘 어울립니다.") +
      P(`적성: ${nm(strong)} 기운이 강해 ${ELEM_TRAIT[strong].field} 분야가 잘 맞습니다.`),
  };

  // --- 재물운 ---
  const money = {
    id: "money", label: "재물운", emoji: "💰", badge: verdict(tg.jae),
    body: P(`재물운은 재화를 뜻하는 <b>재성</b>으로 봅니다. 사주에 재성이 ${tg.jae}개로 ${verdict(tg.jae).label}합니다.`) +
      P(tg.jae >= 2
        ? "재물을 다루고 불리는 감각이 좋아 현실적인 기회를 잘 살립니다. 큰 욕심보다 꾸준한 관리가 부를 지켜 줍니다."
        : tg.jae === 1
          ? "재물운은 무난합니다. 성실한 노력이 착실한 축적으로 이어집니다."
          : "재물이 들어오는 길이 좁을 수 있으니, 재능·활동(식상)으로 재성을 키우는 전략이 유효합니다. 잘하는 일을 수입으로 연결해 보세요.") +
      (tg.siksang >= 2 ? P("특히 표현·활동의 재능이 재물로 이어지는 구조라, 콘텐츠·기술·영업처럼 능력을 드러내는 일에서 기회가 큽니다.") : ""),
  };

  // --- 건강운 ---
  const hTarget = missing.length ? missing[0] : weak;
  const hBadge = missing.length ? { label: "주의", cls: "lv-lo" } : (r.elemCount[weak] >= 2 ? { label: "양호", cls: "lv-mid" } : { label: "보통", cls: "lv-mid" });
  const health = {
    id: "health", label: "건강운", emoji: "🩺", badge: hBadge,
    body: P(`건강은 사주에서 약한 오행으로 살핍니다. ${nm(hTarget)} 기운이 ${missing.length ? "없어" : "약해"} ${ELEM_TRAIT[hTarget].organ} 계통을 평소 살피면 좋습니다.`) +
      P(`충분한 휴식과 규칙적인 생활이 최고의 보약입니다. ${nm(hTarget)}을 상징하는 ${ELEM_LUCK[hTarget].color} 계열의 색과 ${ELEM_LUCK[hTarget].dir} 방위의 기운을 가까이하면 균형에 도움이 됩니다.`) +
      P(`<span class="muted small">※ 건강 해석은 참고용입니다. 이상 증상이 있으면 반드시 전문의와 상담하세요.</span>`),
  };

  // --- 올해의 운세 (세운) ---
  const seStem = td.pillars.year.stem, seBranch = td.pillars.year.branch;
  const seRel = tenGodOf(D, STEM_ELEM[seStem]);
  const sewoon = {
    id: "sewoon", label: "올해의 운세", emoji: "📆",
    badge: { label: `${now.getFullYear()}`, cls: "lv-star" },
    body: P(`올해는 <b>${STEMS[seStem]}${BRANCHES[seBranch]}(${STEMS_H[seStem]}${BRANCHES_H[seBranch]})</b>년, ${ANIMALS[seBranch]}띠 해입니다. 당신의 일간(${STEMS[r.dayMaster]}) 기준으로 <b>${TEN_GOD_KO[seRel]}</b>의 기운이 들어옵니다.`) +
      P(TEN_GOD_THEME[seRel]) +
      P(`올 한 해는 이 흐름을 의식하며 강점은 살리고 약점은 대비하면 한결 수월합니다.`),
  };

  // --- 대운 (10년 주기) ---
  const daeun = { id: "daeun", label: "대운(10년)", emoji: "🌊" };
  if (!gender) {
    daeun.body = P("대운은 10년마다 바뀌는 인생의 큰 흐름으로, 방향이 <b>성별</b>에 따라 달라집니다. 정확한 대운을 보려면 ‘다시 입력하기’에서 성별을 선택해 주세요.");
  } else {
    const yang = YINYANG_STEM[r.pillars.year.stem] === 1;
    const forward = (gender === "남" && yang) || (gender === "여" && !yang);
    const bl = r.lambda, bj = r.jdUT;
    const m = Math.floor((bl - 15) / 30);
    let days;
    if (forward) {
      const nextB = (((15 + 30 * (m + 1)) % 360) + 360) % 360;
      days = findTermJD(bj, bj + 35, nextB) - bj;
    } else {
      const prevB = (((15 + 30 * m) % 360) + 360) % 360;
      days = bj - findTermJD(bj - 35, bj, prevB);
    }
    const startAge = Math.max(1, Math.round(days / 3));
    const monthIdx = ganziIndex(r.pillars.month.stem, r.pillars.month.branch);
    const now2 = new Date();
    const ageNow = (julianDayNumber(now2.getFullYear(), now2.getMonth() + 1, now2.getDate())
      - julianDayNumber(r.input.year, r.input.month, r.input.day)) / 365.2425;

    let curRel = null, cells = "";
    for (let n = 0; n < 8; n++) {
      const idx = (((monthIdx + (forward ? 1 : -1) * (n + 1)) % 60) + 60) % 60;
      const s = idx % 10, b = idx % 12;
      const a0 = startAge + 10 * n, a1 = a0 + 9;
      const cur = ageNow >= a0 && ageNow <= a1 + 0.999;
      if (cur) curRel = tenGodOf(D, STEM_ELEM[s]);
      cells += `<div class="dae${cur ? " cur" : ""}">
        <div class="dae-age">${a0}~${a1}세</div>
        <div class="dae-gz"><span style="color:${ELEMENTS[STEM_ELEM[s]].color}">${STEMS[s]}</span><span style="color:${ELEMENTS[BRANCH_ELEM[b]].color}">${BRANCHES[b]}</span></div>
        <div class="dae-ss">${TEN_GOD_KO[tenGodOf(D, STEM_ELEM[s])]}</div>
      </div>`;
    }
    daeun.body = P(`대운은 10년마다 바뀌는 인생의 큰 흐름입니다. <b>${gender} · ${forward ? "순행" : "역행"}</b>이며 첫 대운은 <b>약 ${startAge}세</b>부터 시작합니다.`) +
      `<div class="daegrid">${cells}</div>` +
      (curRel ? P(`지금(약 ${Math.floor(ageNow)}세)은 <b>${TEN_GOD_KO[curRel]}</b> 대운의 흐름 속에 있습니다. ${TEN_GOD_THEME[curRel]}`) : "") +
      P(`<span class="muted small">※ 대운수(시작 나이)는 절기까지의 날수를 3으로 나눈 근사값입니다.</span>`);
  }

  // --- 종합·기질 (기질 + 오행균형 + 총운) ---
  const overall = {
    id: "overall", label: "종합·기질", emoji: "🧭",
    body: [rd.sections[0], rd.sections[1], rd.sections[5]].map((s) =>
      `<div class="rsub"><b>${s.title}</b> ${s.body}</div>`).join(""),
  };

  return [today, sewoon, daeun, love, work, money, health, overall];
}

if (typeof module !== "undefined") {
  module.exports = {
    STEMS, STEMS_H, BRANCHES, BRANCHES_H, ANIMALS,
    STEM_ELEM, BRANCH_ELEM, YINYANG_STEM, ELEMENTS,
    DAY_MASTER, ELEM_TRAIT, ANIMAL_TRAIT, ELEM_LUCK,
    julianDayNumber, solarLongitude, computeSaju, pillarText, buildReadings,
    tenGodOf, tenGodCounts, buildCategories,
  };
}
