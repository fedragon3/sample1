/*
 * 운세 통합 리포트 — 사주(십성·오행)·별자리·바이오리듬·타로를 하나로 종합해
 * 오늘의 운세 / 연애운 / 직장운 / 재물운으로 정리해 해석한다.
 *
 * 표기 원칙: 선택한 카드·데이터는 짧고 기계적으로, 일상어 해석은 길고 실질적으로.
 * picks: 사용자가 뽑은 타로 4장 [오늘, 연애, 직장, 재물] 각 {card, reversed}
 * 모든 해석은 공개 구조·아키타입에 기반한 원본 텍스트이며 재미·오락용입니다.
 */
function buildFortuneReport(input, picks, deps) {
  const {
    computeSaju, tenGodCounts, tenGodOf, sajuPhases,
    STEM_ELEM, STEMS, TEN_GOD_KO, ELEMENTS, ELEM_TRAIT,
    getZodiac, ZODIAC, zodiacDaily, biorhythm, bioPhase, BIO, TAROT,
  } = deps;

  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const uk = input.year + "" + input.month + input.day;

  const saju = computeSaju(input);
  const D = STEM_ELEM[saju.dayMaster];
  const tg = tenGodCounts(saju);
  const phases = sajuPhases(saju);
  const zi = getZodiac(input.month, input.day), z = ZODIAC[zi];
  const daily = zodiacDaily(zi, dateKey + "|" + uk);
  const bio = biorhythm(input.year, input.month, input.day, now);
  const td = computeSaju({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hasTime: false });
  const todayRel = tenGodOf(D, STEM_ELEM[td.pillars.day.stem]);
  const gender = input.gender || "";
  const strongEl = saju.elemCount.indexOf(Math.max.apply(null, saju.elemCount));

  const P = (s) => `<p class="rbody">${s}</p>`;
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const tsc = (t) => (t.reversed ? -0.6 : 1);
  function verdict(s) {
    if (s >= 2.4) return { label: "매우 좋음", cls: "lv-hi" };
    if (s >= 1.2) return { label: "양호", cls: "lv-hi" };
    if (s >= 0.2) return { label: "무난", cls: "lv-mid" };
    return { label: "주의", cls: "lv-lo" };
  }
  function cardBlock(t) {
    const c = TAROT[t.card], m = t.reversed ? c.rev : c.up;
    return `<div class="rcard">
      <span class="rcard-e${t.reversed ? " flip" : ""}">${c.e}</span>
      <div class="rcard-body">
        <div><b>${c.n}</b> <span class="tc-dir ${t.reversed ? "lv-lo" : "lv-hi"}">${t.reversed ? "역방향" : "정방향"}</span></div>
        <div class="muted small">${m}</div>
      </div></div>`;
  }
  const cN = (t) => TAROT[t.card].n;
  const join = (arr) => arr.filter(Boolean).join(" ");

  const bioDom = BIO.reduce((a, b) => (Math.abs(bio.now[b.key]) > Math.abs(bio.now[a.key]) ? b : a));
  const bioDomPh = bioPhase(bio.now[bioDom.key]);
  const emo = bio.now.emotional, intel = bio.now.intellectual, phys = bio.now.physical;

  const TG_SHORT = { bigeop: "자기 주도와 경쟁의 흐름", siksang: "표현과 활동의 흐름", jae: "재물과 성취의 흐름", inseong: "배움과 안정의 흐름", gwan: "책임과 도전의 흐름" };
  const TG_TODAY = {
    bigeop: "특히 사람들과 힘을 합치거나 내 주관을 뚜렷이 세우는 일에서 성과가 납니다. 남에게 끌려다니기보다 내가 판을 짜는 쪽이 유리한 날이에요.",
    siksang: "특히 나를 표현하고 아이디어를 밖으로 꺼내는 일, 그동안 배운 것을 실제로 써먹는 일에서 즐거움과 성과가 함께 옵니다.",
    jae: "특히 돈·거래·눈에 보이는 결과와 관련된 일에서 손에 잡히는 성과를 기대할 수 있습니다. 미뤄둔 실무를 처리하기에도 좋아요.",
    inseong: "특히 배우고 정리하고 기대는 일, 윗사람이나 조력자의 도움을 받는 일에서 운이 트입니다. 조언을 구하기 좋은 날입니다.",
    gwan: "특히 책임을 맡거나 공적인 자리에서 인정받는 일, 시험·평가·마감과 관련된 일에 힘이 실립니다.",
  };

  // ================= 오늘의 운세 =================
  const todayScore = (daily.star - 3) + (bio.now[bioDom.key] > 0 ? 0.5 : -0.5) + tsc(picks[0]) + 1.2;
  const tGood = join([
    daily.star >= 4
      ? "오늘은 전반적으로 순풍이 부는 날입니다. 마음먹은 일을 시작하거나 미뤄둔 연락을 하기에 좋고, 평소보다 주변의 도움이나 우연한 기회가 따르기 쉽습니다."
      : daily.star === 3
        ? "오늘은 큰 기복 없이 흐르는 무난한 날입니다. 요란한 사건보다, 하던 일을 차분히 이어갈 때 잔잔한 만족이 쌓입니다."
        : "오늘은 흐름이 조금 무겁게 느껴질 수 있는 날입니다. 그렇다고 나쁜 날은 아니고, 벌이기보다 다지기에 어울리는 하루예요.",
    TG_TODAY[todayRel],
    picks[0].reversed ? "" : "뽑은 카드도 순방향이라, 지금의 흐름을 믿고 한 걸음 내디뎌도 좋다는 신호로 읽힙니다.",
  ]);
  const tCaution = join([
    bio.now[bioDom.key] < 0
      ? `다만 오늘은 ${bioDom.name} 컨디션이 낮은 시기라, 무리하게 밀어붙이면 평소보다 쉽게 지치거나 판단이 흐려질 수 있습니다. 중요한 결정은 컨디션이 회복될 때로 미루고, 오늘만큼은 자신을 조금 아끼는 편이 낫습니다.`
      : `오늘은 ${bioDom.name} 기운이 활발한 시기라, 그 에너지를 아끼지 말고 하루에 쏟아보세요.`,
    picks[0].reversed ? "뽑은 카드가 역방향인 만큼, 서두르다 놓치는 부분은 없는지 한 번 더 점검하는 습관이 오늘의 실수를 줄여줍니다." : "",
    `작은 팁으로, 오늘 행운의 색은 ‘${daily.color}’, 행운의 숫자는 ${daily.num}입니다. 옷·소품·약속 시간처럼 사소한 곳에 슬쩍 활용해 기분을 띄워보세요.`,
  ]);
  const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY[now.getDay()]}요일`;
  const today = {
    id: "today", label: "오늘의 운세", emoji: "📅", verdict: verdict(todayScore),
    body: P(`📅 <b>${todayLabel}</b>의 운세입니다.`) +
      P(`${z.name}(${z.sym}) · ${z.elem}의 기운 아래, 오늘의 별 운은 <b>${stars(daily.star)}</b>. 사주로는 오늘이 <b>${TEN_GOD_KO[todayRel]}</b>의 날이라 ${TG_SHORT[todayRel]}입니다.`) +
      cardBlock(picks[0]) + P(tGood) + P(tCaution),
  };

  // ================= 연애운 =================
  const loveCnt = gender === "여" ? tg.gwan : gender === "남" ? tg.jae : Math.round((tg.jae + tg.gwan) / 2);
  const loveScore = loveCnt * 0.7 + (emo > 0 ? 0.5 : -0.4) + tsc(picks[1]);
  const lGood = join([
    loveCnt >= 2
      ? "인연의 기운이 넉넉한 시기입니다. 새로운 만남의 문이 자연스럽게 열리고, 이미 있는 관계라면 한층 가까워지기 좋은 흐름이에요. 마음이 가는 자리라면 미루지 말고 나가 보세요."
      : loveCnt === 1
        ? "인연의 기운은 무난합니다. 요란한 이벤트보다, 익숙한 모임이나 신뢰가 쌓인 관계 속에서 마음이 조용히 오가는 시기예요. 가까운 사람을 새롭게 다시 보게 될 수도 있습니다."
        : "지금은 인연의 기운이 은은한 편입니다. 조급해할 필요는 없어요. 나를 가꾸고 관심사를 넓히다 보면, 그 과정에서 자연스럽게 좋은 사람이 곁에 다가옵니다.",
    (z.elem === "물" || z.elem === "불")
      ? `${z.name}는 타고난 감성이 풍부해 상대의 마음을 잘 읽고, 그만큼 관계에서 존재감이 큰 편입니다. 그 매력을 편하게 드러내는 것이 지금의 강점이에요.`
      : `${z.name}는 감정을 차분히 다루는 편이라, 한번 신뢰가 생기면 오래가는 안정적인 관계를 만듭니다. 천천히 쌓는 방식이 잘 맞습니다.`,
    emo > 20 ? "게다가 감정 바이오리듬이 고조라 마음이 풍부하고 표현이 자연스러운 시기입니다. 좋아하는 사람에게 마음을 전하거나 관계의 온도를 높이기에 지금이 적기예요." : "",
    picks[1].reversed ? "" : `뽑은 ${cN(picks[1])} 카드도 관계에 우호적인 신호를 보내고 있습니다.`,
  ]);
  const lCaution = join([
    emo < -20 ? "다만 감정 리듬이 가라앉은 시기라, 사소한 말에 예민해지거나 서운함이 평소보다 크게 느껴질 수 있습니다. 감정이 격해질 때는 바로 반응하기보다 한 박자 쉬고 말하는 것이, 아끼는 관계를 지키는 가장 좋은 방법입니다." : "",
    picks[1].reversed ? `역방향으로 나온 ${cN(picks[1])} 카드는 오해나 밀당의 엇갈림을 조심하라는 뜻입니다. 상대의 속도를 존중하고, 내 기대를 상대에게 은근히 강요하고 있지는 않은지 돌아보면 관계가 한결 편해집니다.` : "표현은 솔직하게, 기다림은 여유 있게 — 이 균형을 지키면 지금의 연애운이 더 크게 열립니다.",
  ]);
  const love = {
    id: "love", label: "연애운", emoji: "💕", verdict: verdict(loveScore),
    body: P(`연애운은 사주의 ${gender === "여" ? "<b>관성</b>(인연·배우자)" : gender === "남" ? "<b>재성</b>(이성·매력)" : "<b>재성·관성</b>(인연)"} 기운으로 봅니다 — 사주에 ${loveCnt}개로, ${verdict(loveCnt >= 2 ? 1.5 : loveCnt).label}한 편입니다.`) +
      cardBlock(picks[1]) + P(lGood) + P(lCaution),
  };

  // ================= 직장운 =================
  const workScore = tg.gwan * 0.7 + (intel > 0 ? 0.5 : -0.4) + tsc(picks[2]);
  const wGood = join([
    tg.gwan >= 2
      ? "조직 안에서 책임과 직책이 잘 어울리는 시기입니다. 맡은 일을 성실히 해내면 윗사람의 눈에 들고, 승진·평가·중요한 자리 배정에서 유리한 흐름을 탑니다. 지금은 드러나게 일하는 것이 이득이에요."
      : "지금은 틀에 갇히기보다 전문성과 자율성으로 승부할 때 빛나는 시기입니다. 내 강점을 보여줄 수 있는 프로젝트나 제안에 먼저 손을 들면, 예상보다 큰 기회로 이어질 수 있어요.",
    `사주로는 ${ELEMENTS[strongEl].name} 기운이 강해 ${ELEM_TRAIT[strongEl].field} 계열의 일과 특히 잘 맞습니다. 진로나 업무 방향을 고민 중이라면 이 결을 참고하면 좋아요.`,
    intel > 20 ? "지성 바이오리듬이 고조라 판단과 기획이 예리한 시기입니다. 복잡한 문제를 정리하거나 새 아이디어를 제안하기에 지금만 한 때가 없습니다." : "",
    picks[2].reversed ? "" : `뽑은 ${cN(picks[2])} 카드도 순방향이라, 지금의 노력이 결실로 이어질 가능성이 큽니다.`,
  ]);
  const wCaution = join([
    intel < -20 ? "다만 지성 리듬이 낮은 시기라, 큰 결정이나 계약은 서두르지 말고 실무를 다지며 흐름이 돌아올 때를 기다리는 편이 안전합니다. 실수가 나기 쉬운 때이니, 중요한 문서나 숫자는 반드시 두 번 확인하세요." : "",
    picks[2].reversed ? `역방향 ${cN(picks[2])} 카드는 조급함이나 방향 상실을 경계하라는 신호입니다. 눈앞의 성과에만 매달리기보다, 지금 하는 일이 내가 정말 가고 싶은 방향과 맞는지 한 번 점검할 때입니다.` : "성실함은 결국 신뢰가 되어 돌아옵니다. 오늘의 꾸준함이 다음 기회를 부른다는 마음으로 임하세요.",
  ]);
  const work = {
    id: "work", label: "직장운", emoji: "💼", verdict: verdict(workScore),
    body: P(`직장·명예운은 사주의 <b>관성</b>(조직·책임)으로 봅니다 — 사주에 ${tg.gwan}개로, ${verdict(tg.gwan >= 2 ? 1.5 : tg.gwan).label}한 편입니다.`) +
      cardBlock(picks[2]) + P(wGood) + P(wCaution),
  };

  // ================= 재물운 =================
  const moneyScore = tg.jae * 0.7 + (tg.siksang >= 2 ? 0.4 : 0) + tsc(picks[3]);
  const mGood = join([
    tg.jae >= 2
      ? "재물을 다루고 불리는 감각이 좋은 시기입니다. 들어오는 기회를 잘 살리면 손에 잡히는 성과가 따르고, 거래·구매·계약처럼 현실적인 일에 특히 운이 실립니다. 미뤄둔 정산이나 협상을 매듭짓기에도 좋아요."
      : "지금은 큰 횡재보다, 내 재능과 노력을 수입으로 연결할 때 돈이 붙는 시기입니다. 잘하는 일을 꾸준히 쌓아 가면 재물이 들어오는 통로가 조금씩 넓어집니다.",
    tg.siksang >= 2 ? "특히 표현·활동의 재능이 재물로 이어지는 구조라, 콘텐츠·기술·영업처럼 능력을 밖으로 드러내는 일에서 기회가 큽니다." : "",
    picks[3].reversed ? "" : `뽑은 ${cN(picks[3])} 카드도 순방향이라, 지나친 욕심만 부리지 않는다면 조심스럽게 움직여 볼 만한 시기입니다.`,
  ]);
  const mCaution = join([
    picks[3].reversed
      ? `역방향으로 나온 ${cN(picks[3])} 카드는 충동적인 지출이나 ‘한 방’을 노리는 투자가 지금 특히 위험하다는 경고입니다. 큰돈이 오가는 결정은 하루 이틀 미뤄 두고, 반드시 계획과 예산 안에서 움직이세요.`
      : "다만 기회가 보인다고 무리하게 빚을 내거나 검증되지 않은 곳에 크게 넣는 것은 삼가야 합니다. 들어오는 것을 잘 살리되, 나가는 것을 막는 데도 그만큼 신경 쓰세요.",
    "새는 돈을 막는 것이 버는 것만큼 중요한 시기입니다. 자동이체 점검, 불필요한 구독 정리 같은 작은 습관 하나가 통장의 흐름을 바꿔줍니다.",
  ]);
  const money = {
    id: "money", label: "재물운", emoji: "💰", verdict: verdict(moneyScore),
    body: P(`재물운은 사주의 <b>재성</b>(재화)으로 봅니다 — 사주에 ${tg.jae}개로, ${verdict(tg.jae >= 2 ? 1.5 : tg.jae).label}한 편입니다.`) +
      cardBlock(picks[3]) + P(mGood) + P(mCaution),
  };

  // ================= 종합 요약 =================
  const summary =
    P(`<b>${z.name}(${z.sym}) · ${STEMS[saju.dayMaster]} 일간</b>인 당신, 오늘의 종합 운은 <b>${stars(daily.star)}</b>입니다.`) +
    P(`사주·별자리·바이오리듬·타로가 함께 가리키는 오늘의 큰 흐름은 <b>${TG_SHORT[todayRel]}</b>이며, 지금은 ${bioDom.name} 컨디션이 ${bioDomPh.txt}인 시기입니다. ${daily.star >= 4 ? "네 신호가 대체로 순방향이라 적극적으로 움직여도 좋은 날이에요." : daily.star <= 2 ? "흐름이 다소 무거우니 벌이기보다 정비·준비에 힘을 쓰면 오히려 이득입니다." : "큰 기복 없는 무난한 흐름이니 하던 일을 차근히 이어가면 됩니다."}`) +
    P(`아래에서 <b>오늘·연애·직장·재물</b> 순으로, 좋은 점과 유의할 점을 하나씩 풀어드릴게요.`);

  const chips = [
    { t: `일간 ${STEMS[saju.dayMaster]}` },
    { t: `${z.sym} ${z.name}` },
    { t: `${bioDom.name} ${bioDomPh.txt}` },
    { t: `${now.getFullYear()} ${STEMS[phases.sewoon.stem]}년` },
  ];

  return { summary, chips, categories: [today, love, work, money], bioSeries: bio.series, meta: { zodiac: z, star: daily.star } };
}

if (typeof module !== "undefined") { module.exports = { buildFortuneReport }; }
