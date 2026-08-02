/*
 * 운세 통합 리포트 — 사주(십성·오행)·별자리·바이오리듬·타로를 하나로 종합해
 * 오늘의 운세 / 연애운 / 직장운 / 재물운으로 정리해 해석한다.
 *
 * picks: 사용자가 뽑은 타로 4장 [오늘, 연애, 직장, 재물] 각 {card, reversed}
 * deps:  saju.js / fortune.js 의 필요한 값들
 *
 * 모든 해석은 공개 구조·아키타입에 기반한 원본 텍스트이며 재미·오락용입니다.
 */
function buildFortuneReport(input, picks, deps) {
  const {
    computeSaju, tenGodCounts, tenGodOf, sajuPhases,
    STEM_ELEM, STEMS, TEN_GOD_KO,
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

  const TG_SHORT = {
    bigeop: "자기 주도와 경쟁의 흐름", siksang: "표현과 활동의 흐름",
    jae: "재물과 성취의 흐름", inseong: "배움과 안정의 흐름", gwan: "책임과 도전의 흐름",
  };
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
  const cardMean = (t) => (t.reversed ? TAROT[t.card].rev : TAROT[t.card].up);
  const cardName = (t) => TAROT[t.card].n;

  const bioDom = BIO.reduce((a, b) => (Math.abs(bio.now[b.key]) > Math.abs(bio.now[a.key]) ? b : a));
  const bioDomPh = bioPhase(bio.now[bioDom.key]);
  const emo = bio.now.emotional, intel = bio.now.intellectual;

  // ---- 오늘의 운세 ----
  const todayScore = (daily.star - 3) + (bio.now[bioDom.key] > 0 ? 0.5 : -0.5) + tsc(picks[0]) + 1.2;
  const today = {
    id: "today", label: "오늘의 운세", emoji: "📅", verdict: verdict(todayScore),
    body:
      P(`${z.name}(${z.sym}) · ${z.elem}의 기운 아래, 오늘의 별 운은 <b>${stars(daily.star)}</b>. 사주로는 오늘이 <b>${TEN_GOD_KO[todayRel]}</b>의 날이라 ${TG_SHORT[todayRel]}입니다.`) +
      cardBlock(picks[0]) +
      P(`뽑은 <b>${cardName(picks[0])}</b> 카드는 이렇게 말합니다 — ${cardMean(picks[0])}. 바이오리듬상 오늘은 ${bioDom.name} 기운이 ${bioDomPh.txt}입니다.`) +
      P(`<b>종합</b> — ${daily.star >= 4
        ? "네 가지 신호가 대체로 순방향입니다. 미뤄둔 일을 실제 행동으로 옮기기 좋은 날이에요."
        : daily.star <= 2
          ? "흐름이 조금 무거우니 무리한 확장보다 정비·준비에 힘을 쓰면 좋은 날입니다."
          : "큰 기복 없는 무난한 하루입니다. 작은 것부터 차근히 매듭지어 보세요."}`),
  };

  // ---- 연애운 ----
  const loveCnt = gender === "여" ? tg.gwan : gender === "남" ? tg.jae : Math.round((tg.jae + tg.gwan) / 2);
  const loveScore = loveCnt * 0.7 + (emo > 0 ? 0.5 : -0.4) + tsc(picks[1]);
  const love = {
    id: "love", label: "연애운", emoji: "💕", verdict: verdict(loveScore),
    body:
      P(`연애운은 사주의 ${gender === "여" ? "<b>관성</b>(인연·배우자)" : gender === "남" ? "<b>재성</b>(이성·매력)" : "<b>재성·관성</b>(인연)"} 기운으로 봅니다 — 사주에 ${loveCnt}개로 ${verdict(loveCnt >= 2 ? 1.5 : loveCnt).label}. ${z.elem === "물" || z.elem === "불" ? `${z.name}는 감정 표현이 풍부해 인연에서 존재감이 큰 편입니다.` : `${z.name}는 관계에서 자기 페이스를 지키는 편이라, 신뢰가 쌓인 자리에서 인연이 열립니다.`}`) +
      cardBlock(picks[1]) +
      P(`<b>${cardName(picks[1])}</b> 카드가 지금의 인연에 전하는 메시지 — ${cardMean(picks[1])}. 감정 바이오리듬이 ${emo > 20 ? "고조라 마음을 표현하기 좋은 시기" : emo < -20 ? "저조라 서두르기보다 나를 돌보는 편이 좋은 시기" : "안정적이라 담담하게 관계를 이어가기 좋은 시기"}입니다.`),
  };

  // ---- 직장운 ----
  const workScore = tg.gwan * 0.7 + (intel > 0 ? 0.5 : -0.4) + tsc(picks[2]);
  const strongEl = saju.elemCount.indexOf(Math.max.apply(null, saju.elemCount));
  const work = {
    id: "work", label: "직장운", emoji: "💼", verdict: verdict(workScore),
    body:
      P(`직장·명예운은 사주의 <b>관성</b>(조직·책임)으로 봅니다 — 사주에 ${tg.gwan}개로 ${verdict(tg.gwan >= 2 ? 1.5 : tg.gwan).label}. ${tg.gwan >= 2 ? "조직 안에서 책임을 맡아 인정받는 흐름이 유리합니다." : "틀에 갇히기보다 전문성·자율성으로 승부할 때 빛나는 유형입니다."}`) +
      cardBlock(picks[2]) +
      P(`<b>${cardName(picks[2])}</b> 카드가 일에 던지는 힌트 — ${cardMean(picks[2])}. 지성 바이오리듬이 ${intel > 20 ? "고조라 판단·기획이 예리한 시기" : intel < -20 ? "저조라 큰 결정은 미루고 실무를 다지기 좋은 시기" : "안정적이라 꾸준히 밀어붙이기 좋은 시기"}입니다.`),
  };

  // ---- 재물운 ----
  const moneyScore = tg.jae * 0.7 + (tg.siksang >= 2 ? 0.4 : 0) + tsc(picks[3]);
  const money = {
    id: "money", label: "재물운", emoji: "💰", verdict: verdict(moneyScore),
    body:
      P(`재물운은 사주의 <b>재성</b>(재화)으로 봅니다 — 사주에 ${tg.jae}개로 ${verdict(tg.jae >= 2 ? 1.5 : tg.jae).label}. ${tg.jae >= 2 ? "재물을 다루고 불리는 감각이 좋아 현실적 기회를 잘 살립니다." : "재능·활동(식상)을 수입으로 연결하는 전략이 잘 맞습니다."}`) +
      cardBlock(picks[3]) +
      P(`<b>${cardName(picks[3])}</b> 카드가 돈의 흐름에 보내는 신호 — ${cardMean(picks[3])}. ${picks[3].reversed ? "충동적인 지출·투자는 한 박자 늦추는 편이 좋습니다." : "들어오는 기회를 놓치지 말되, 큰 욕심보다 꾸준한 관리가 부를 지킵니다."}`),
  };

  // ---- 종합 요약 ----
  const summary =
    P(`<b>${z.name}(${z.sym}) · ${STEMS[saju.dayMaster]} 일간</b>인 당신, 오늘의 종합 운은 <b>${stars(daily.star)}</b>입니다.`) +
    P(`사주·별자리·바이오리듬·타로 네 가지가 함께 가리키는 오늘의 큰 흐름은 <b>${TG_SHORT[todayRel]}</b>이며, ${bioDom.name} 컨디션이 ${bioDomPh.txt}인 시기입니다. 아래에서 오늘·연애·직장·재물 순으로 자세히 풀었습니다.`);

  const chips = [
    { t: `일간 ${STEMS[saju.dayMaster]}` },
    { t: `${z.sym} ${z.name}` },
    { t: `${bioDom.name} ${bioDomPh.txt}` },
    { t: `${now.getFullYear()} ${STEMS[phases.sewoon.stem]}년` },
  ];

  return { summary, chips, categories: [today, love, work, money], bioSeries: bio.series, meta: { zodiac: z, star: daily.star } };
}

if (typeof module !== "undefined") { module.exports = { buildFortuneReport }; }
