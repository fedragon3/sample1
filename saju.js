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
    elemCount,
  };
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

if (typeof module !== "undefined") {
  module.exports = {
    STEMS, STEMS_H, BRANCHES, BRANCHES_H, ANIMALS,
    STEM_ELEM, BRANCH_ELEM, YINYANG_STEM, ELEMENTS,
    DAY_MASTER, ELEM_TRAIT, ANIMAL_TRAIT,
    julianDayNumber, solarLongitude, computeSaju, pillarText, buildReadings,
  };
}
