/*
 * 통합 리포트 — 성격검사(TCI 7차원)와 사주(십성·오행·대운)를 교차 해석한다.
 *
 * 성격점수(tci): { NS,HA,RD,PS,SD,CO,ST } 각 0~100
 * 사주결과(r):   computeSaju() 반환값
 * deps:          questions.js / saju.js 의 필요한 값들
 *
 * 주의: 심리검사와 명리는 서로 다른 전통이며, 이 통합은 학술적 상관이 아니라
 * '타고난 결(사주) + 발달한 성향(성격)'을 함께 비추어 보는 자기성찰·오락용
 * 해석입니다.
 */
function buildIntegrated(tci, r, deps) {
  const { DIMENSIONS, ELEMENTS, STEMS, BRANCHES, STEM_ELEM, ELEM_TRAIT, ANIMALS,
    tenGodCounts, sajuPhases, TEN_GOD_KO, TEN_GOD_THEME } = deps;

  const DIM_ORDER = ["NS", "HA", "RD", "PS", "SD", "CO", "ST"];
  const tg = tenGodCounts(r);
  const ec = r.elemCount;                 // [목,화,토,금,수]
  const phases = sajuPhases(r);
  const D = STEM_ELEM[r.dayMaster];

  const T = (k) => (tci[k] >= 67 ? 2 : tci[k] >= 34 ? 1 : 0); // 성격 강도 0/1/2
  const strongDims = DIM_ORDER.slice().sort((a, b) => tci[b] - tci[a]);
  const topDims = strongDims.slice(0, 2);
  const strongElem = ec.indexOf(Math.max.apply(null, ec));
  const strongTg = Object.keys(tg).reduce((a, b) => (tg[b] > tg[a] ? b : a), "bigeop");

  // --- 1. 한눈에 보기 ---
  const summary =
    `<p class="rbody"><b>타고난 결(사주)</b> — 일간 ${STEMS[r.dayMaster]}(${ELEMENTS[D].label}), ` +
    `${ANIMALS[r.animal]}띠. 가장 강한 오행은 <b>${ELEMENTS[strongElem].name}</b>, 십성은 <b>${TEN_GOD_KO[strongTg]}</b>의 기운입니다.</p>` +
    `<p class="rbody"><b>발달한 성향(성격검사)</b> — ${topDims.map((d) => `${DIMENSIONS[d].name} ${tci[d]}%`).join(" · ")}이(가) 두드러집니다.</p>` +
    `<p class="rbody">아래는 두 결과가 <b>함께 가리키는 강점</b>과 <b>서로 어긋나 살펴볼 점</b>, 그리고 지금 시기의 방향입니다.</p>`;

  // --- 2. 함께 강한 점(시너지) ---
  const synergyRules = [
    { on: T("SD") >= 2 && tg.bigeop >= 2, t: "주관·독립의 시너지", b: "스스로 방향을 정하고 책임지는 힘이 성격·사주 양쪽에서 강합니다. 리더나 1인 전문가로 설 때 가장 빛납니다." },
    { on: T("NS") >= 2 && (tg.siksang >= 2 || ec[1] >= 3), t: "도전·표현의 시너지", b: "새로움을 좇는 기질과 재능을 드러내는 사주가 맞물려, 창작·기획·새 시도에서 에너지가 큽니다." },
    { on: T("CO") >= 2 && tg.inseong >= 2, t: "포용·공감의 시너지", b: "남을 배려하는 성격과 감싸 안는 사주가 겹쳐, 사람을 돕고 잇는 역할에 잘 맞습니다." },
    { on: T("PS") >= 2 && (tg.gwan >= 2 || ec[2] >= 3), t: "책임·끈기의 시너지", b: "끈기 있는 성격과 성실을 뜻하는 사주가 함께해, 오래 걸리는 목표를 완성하는 힘이 있습니다." },
    { on: T("RD") >= 2 && tg.jae >= 2, t: "관계·정의 시너지", b: "정이 많은 성격과 인연을 뜻하는 사주가 어울려, 사람과의 관계에서 기회와 행복이 찾아옵니다." },
    { on: T("ST") >= 2 && (ec[4] >= 3 || tg.inseong >= 2), t: "직관·의미의 시너지", b: "의미를 추구하는 성격과 지혜를 뜻하는 사주가 만나, 깊은 통찰과 몰입에 강합니다." },
  ];
  let synergies = synergyRules.filter((x) => x.on).slice(0, 3);
  if (!synergies.length) {
    synergies = [{ t: "고른 균형", b: `성격과 사주 어느 한쪽으로 크게 치우치지 않아, 상황에 맞춰 여러 얼굴을 꺼내 쓸 수 있는 유연함이 강점입니다. 특히 ${DIMENSIONS[topDims[0]].name} 성향과 ${ELEMENTS[strongElem].name} 기운을 상황에 맞게 활용해 보세요.` }];
  }

  // --- 3. 살펴볼 점(보완·긴장) ---
  const tensionRules = [
    { on: T("SD") === 0 && tg.bigeop >= 2, t: "주관 ↔ 자기확신", b: "주관은 타고났지만(사주 비겁) 스스로에 대한 확신은 낮게 나왔어요(자율성↓). 결정을 내린 뒤 ‘내 선택을 믿는’ 연습이 큰 힘이 됩니다." },
    { on: T("NS") >= 2 && T("HA") >= 2, t: "모험심 ↔ 조심성", b: "모험을 즐기는 마음과 조심스러운 마음이 함께 큽니다. 설렘과 불안이 동시에 올 때는, 작게 시도해 확인하는 방식이 잘 맞습니다." },
    { on: T("CO") === 0 && tg.inseong >= 2, t: "타고난 포용 ↔ 표현", b: "감싸 안는 기운은 타고났지만(사주 인성) 협력 성향은 낮게 나왔어요(연대감↓). 마음속 배려를 한 걸음 먼저 표현하면 관계가 달라집니다." },
    { on: T("PS") === 0 && tg.gwan === 0 && ec[2] <= 1, t: "꾸준함 보완", b: "끈기가 약하게 나온 편이에요. 큰 목표보다 ‘작게 끝까지 해내는’ 성공 경험을 쌓으면 인내력이 붙습니다." },
    { on: T("RD") >= 2 && tg.jae === 0, t: "관계 욕구 ↔ 인연 기운", b: "사람과 정을 나누고 싶은 마음은 큰데(사회적 민감성↑) 사주의 관계 기운은 옅어요. 먼저 다가가 관계를 ‘만드는’ 노력이 잘 맞습니다." },
    { on: T("HA") >= 2 && tg.gwan >= 2, t: "조심성 ↔ 책임감", b: "조심스러운 성격에 책임을 뜻하는 사주가 겹쳐, 스스로를 몰아붙이기 쉬워요. 완벽보다 ‘충분히 괜찮다’는 기준이 건강을 지킵니다." },
  ];
  let tensions = tensionRules.filter((x) => x.on).slice(0, 2);
  if (!tensions.length) {
    tensions = [{ t: "무난한 조화", b: "성격과 사주 사이에 두드러진 충돌은 보이지 않습니다. 큰 갈등 없이 자신을 밀고 나갈 수 있는 편이니, 강점을 꾸준히 키우는 데 집중해 보세요." }];
  }

  // --- 4. 관계와 일 ---
  const field = ELEM_TRAIT[strongElem].field;
  const workStyle = T("SD") >= 2 ? "주도적으로 이끌 때" : (T("CO") >= 2 ? "사람들과 함께할 때" : (T("PS") >= 2 ? "꾸준히 파고들 때" : "자신의 리듬을 지킬 때"));
  const gender = r.input.gender;
  const loveTg = gender === "여" ? tg.gwan : (gender === "남" ? tg.jae : tg.jae + tg.gwan);
  const workBody =
    `<p class="rbody"><b>일</b> — ${ELEMENTS[strongElem].name} 기운이 강해 ${field} 분야가 잘 맞고, ${workStyle} 성과가 큽니다. ` +
    (tg.gwan >= 2 ? "조직 안에서 책임을 맡는 흐름이 유리합니다." : (tg.siksang >= 2 || tg.jae >= 2 ? "전문성·자율성으로 승부하는 길이 잘 어울립니다." : "안정된 틀 안에서 힘을 기르는 편이 좋습니다.")) + "</p>" +
    `<p class="rbody"><b>관계</b> — ${T("RD") >= 2 || T("CO") >= 2 ? "정이 많고 사람을 챙기는 성향이라 관계에서 힘을 얻습니다." : "관계에서 자기 페이스를 지키는 편이라, 소수와 깊게 사귀는 방식이 편안합니다."} ` +
    `${loveTg >= 2 ? "사주의 인연 기운도 넉넉해 만남의 기회가 자연스럽게 열립니다." : "인연은 먼저 다가가 만들어갈 때 더 잘 풀립니다."}</p>`;

  // --- 5. 지금의 흐름(대운·세운) ---
  const se = phases.sewoon;
  let flowBody = "";
  if (phases.daeun) {
    flowBody += `<p class="rbody"><b>대운</b> — 지금은 <b>${TEN_GOD_KO[phases.daeun.tenGod]}</b> 대운(약 ${phases.daeun.ageStart}~${phases.daeun.ageEnd}세)의 흐름입니다. ${TEN_GOD_THEME[phases.daeun.tenGod]}</p>`;
  }
  flowBody += `<p class="rbody"><b>올해(${se.year} ${STEMS[se.stem]}${BRANCHES[se.branch]}년·${ANIMALS[se.branch]}띠)</b> — ${TEN_GOD_KO[se.tenGod]}의 기운이 들어옵니다. ${TEN_GOD_THEME[se.tenGod]}</p>`;
  flowBody += `<p class="rbody"><b>조언</b> — 이 시기의 흐름에 당신의 강점인 <b>${DIMENSIONS[topDims[0]].name}</b>을(를) 실어 보세요. 흐름과 성향이 같은 방향일 때 가장 큰 결실이 옵니다.</p>`;

  // --- 6. 오늘의 한마디 ---
  const oneLine =
    `${ELEMENTS[D].label}을(를) 닮은 ${STEMS[r.dayMaster]} 일간의 당신 — ` +
    `${DIMENSIONS[topDims[0]].name}이라는 발달한 성향을 무기로, ${TEN_GOD_KO[strongTg]}의 타고난 기운을 믿고 나아가세요.`;

  return {
    headline: `${STEMS[r.dayMaster]} 일간 · ${DIMENSIONS[topDims[0]].name} 유형`,
    sections: [
      { title: "한눈에 보기", html: summary },
      { title: "함께 강한 점 (시너지)", list: synergies },
      { title: "살펴볼 점 (보완)", list: tensions },
      { title: "관계와 일", html: workBody },
      { title: "지금의 흐름", html: flowBody },
      { title: "오늘의 한마디", html: `<p class="rbody oneline">${oneLine}</p>` },
    ],
  };
}

if (typeof module !== "undefined") { module.exports = { buildIntegrated }; }
