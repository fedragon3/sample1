/* 기질·성격 자가탐색 검사 — 앱 로직 (외부 라이브러리 없음) */
(function () {
  "use strict";

  const LIKERT = [
    { v: 1, label: "전혀 그렇지 않다" },
    { v: 2, label: "그렇지 않다" },
    { v: 3, label: "보통이다" },
    { v: 4, label: "그렇다" },
    { v: 5, label: "매우 그렇다" },
  ];
  const DIM_ORDER = ["NS", "HA", "RD", "PS", "SD", "CO", "ST"];
  const SHORT = { NS: "자극추구", HA: "위험회피", RD: "사회성", PS: "인내력", SD: "자율성", CO: "연대감", ST: "자기초월" };

  const state = {
    mode: "short",   // 'short' | 'full'
    seed: 0,         // 이번 검사의 순서 시드
    deck: [],        // 이번 검사의 문항 배열(무작위 순서)
    idx: 0,
    answers: [],     // deck 와 같은 길이, 0 = 미응답
  };

  const $ = (id) => document.getElementById(id);
  const intro = $("intro"), quiz = $("quiz"), result = $("result");

  // === 시드 기반 난수 (mulberry32) → 같은 시드는 항상 같은 순서를 만든다 ===
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // === 문항 덱 구성 (mode + seed 에 대한 순수 함수 → 링크로 순서까지 재현) ===
  // 성향 문항 + 신뢰도 확인 문항(간단 1 / 심화 2)을 합쳐 seed 로 셔플한다.
  function buildDeck(mode, seed) {
    const base = mode === "full" ? QUESTIONS : QUESTIONS.filter((q) => q.short);
    const checks = mode === "full" ? CHECKS.slice(0, 2) : CHECKS.slice(0, 1);
    const deck = base.concat(checks);
    const rnd = mulberry32(seed);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    return deck;
  }

  // === 이벤트 ===
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => startTest(btn.getAttribute("data-mode")));
  });
  $("retryBtn").addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    show("intro");
  });
  $("prevBtn").addEventListener("click", () => { if (state.idx > 0) { state.idx--; renderQuestion(); } });
  $("nextBtn").addEventListener("click", () => { if (state.answers[state.idx] !== 0) advance(); });
  $("copyBtn").addEventListener("click", copyResultLink);
  $("abortBtn").addEventListener("click", () => {
    if (confirm("검사를 중단하고 처음으로 돌아갈까요? 지금까지의 응답은 사라집니다.")) goHome();
  });

  // 홈(메인 메뉴) 이동
  function goHome() { history.replaceState(null, "", location.pathname); show("home"); }
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => navTo(btn.getAttribute("data-goto")));
  });

  // ===== 저장(로컬) — 통합 리포트용 =====
  const LS = { tci: "ir_tci", saju: "ir_saju" };
  function saveLS(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* 비공개 모드 등 */ }
  }
  function loadLS(key) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  // ===== 사주 컨트롤러 =====
  $("sajuForm").addEventListener("submit", (e) => {
    e.preventDefault();
    runSaju(readSajuForm());
  });
  $("sajuNoTime").addEventListener("change", (e) => {
    $("sajuHour").disabled = e.target.checked;
    $("sajuMinute").disabled = e.target.checked;
  });
  $("sajuRetry").addEventListener("click", () => show("sajuInput"));
  $("sajuCopy").addEventListener("click", copyResultLink);

  function readSajuForm() {
    return {
      year: parseInt($("sajuYear").value, 10),
      month: parseInt($("sajuMonth").value, 10),
      day: parseInt($("sajuDay").value, 10),
      hour: parseInt($("sajuHour").value, 10) || 0,
      minute: parseInt($("sajuMinute").value, 10) || 0,
      hasTime: !$("sajuNoTime").checked,
      gender: $("sajuGender").value,
    };
  }

  function validSajuInput(v) {
    if (!Number.isFinite(v.year) || v.year < 1900 || v.year > 2100) return "연도는 1900~2100 사이로 입력해 주세요.";
    if (!Number.isFinite(v.month) || v.month < 1 || v.month > 12) return "월을 1~12로 입력해 주세요.";
    const dmax = new Date(v.year, v.month, 0).getDate();
    if (!Number.isFinite(v.day) || v.day < 1 || v.day > dmax) return `${v.month}월은 1~${dmax}일까지 입력할 수 있어요.`;
    if (v.hasTime && (v.hour < 0 || v.hour > 23)) return "시(時)는 0~23으로 입력해 주세요.";
    return null;
  }

  function runSaju(v) {
    const err = validSajuInput(v);
    if (err) { toast(err); return; }
    // 링크: #s=Y.M.D.H.Min.T.G
    const code = [v.year, v.month, v.day, v.hasTime ? v.hour : "", v.hasTime ? v.minute : "",
      v.hasTime ? 1 : 0, v.gender === "여" ? "F" : (v.gender === "남" ? "M" : "")].join(".");
    history.replaceState(null, "", location.pathname + "#s=" + code);
    renderSaju(computeSaju(v));
    show("sajuResult");
  }

  function trySajuRestore() {
    const m = location.hash.match(/s=([^&]+)/);
    if (!m) return false;
    const p = m[1].split(".");
    if (p.length < 7) return false;
    const v = {
      year: parseInt(p[0], 10), month: parseInt(p[1], 10), day: parseInt(p[2], 10),
      hour: parseInt(p[3], 10) || 0, minute: parseInt(p[4], 10) || 0,
      hasTime: p[5] === "1", gender: p[6] === "F" ? "여" : (p[6] === "M" ? "남" : ""),
    };
    if (validSajuInput(v)) return false;
    // 폼에도 값 반영
    $("sajuYear").value = v.year; $("sajuMonth").value = v.month; $("sajuDay").value = v.day;
    if (v.hasTime) { $("sajuHour").value = v.hour; $("sajuMinute").value = v.minute; }
    $("sajuNoTime").checked = !v.hasTime;
    $("sajuHour").disabled = !v.hasTime; $("sajuMinute").disabled = !v.hasTime;
    if (v.gender) $("sajuGender").value = v.gender;
    renderSaju(computeSaju(v));
    show("sajuResult");
    return true;
  }

  // 사주 결과 렌더
  function renderSaju(r) {
    const iv = r.input;
    saveLS(LS.saju, { input: iv, ts: Date.now() });
    const genderTxt = iv.gender ? " · " + iv.gender : "";
    const timeTxt = iv.hasTime ? ` ${String(iv.hour).padStart(2, "0")}:${String(iv.minute).padStart(2, "0")}` : " (시간 모름)";
    $("sajuSub").textContent = `${iv.year}년 ${iv.month}월 ${iv.day}일${timeTxt} · 양력${genderTxt}`;

    // 사주 4기둥 표
    const cols = [
      { key: "hour", label: "시주(時)" },
      { key: "day", label: "일주(日)" },
      { key: "month", label: "월주(月)" },
      { key: "year", label: "연주(年)" },
    ];
    const colHTML = cols.map((c) => {
      const p = r.pillars[c.key];
      if (!p) {
        return `<div class="pcol"><div class="phead">${c.label}</div><div class="pchar pna">·</div><div class="pchar pna">·</div><div class="pmeta">시간 모름</div></div>`;
      }
      const se = STEM_ELEM[p.stem], be = BRANCH_ELEM[p.branch];
      return `<div class="pcol${c.key === "day" ? " pday" : ""}">
        <div class="phead">${c.label}${c.key === "day" ? " · 나" : ""}</div>
        <div class="pchar" style="background:${ELEMENTS[se].color}">${STEMS[p.stem]}<span class="ph">${STEMS_H[p.stem]}</span></div>
        <div class="pchar" style="background:${ELEMENTS[be].color}">${BRANCHES[p.branch]}<span class="ph">${BRANCHES_H[p.branch]}</span></div>
        <div class="pmeta">${ELEMENTS[se].name}·${ELEMENTS[be].name}</div>
      </div>`;
    }).join("");
    $("sajuPillars").innerHTML = colHTML;

    // 오행 분포 막대
    const maxc = Math.max.apply(null, r.elemCount) || 1;
    $("sajuElems").innerHTML = ELEMENTS.map((el, i) => `
      <div class="erow">
        <span class="ename" style="color:${el.color}">${el.name}(${el.en})</span>
        <div class="ebar"><span style="width:${(r.elemCount[i] / maxc) * 100}%;background:${el.color}"></span></div>
        <span class="enum">${r.elemCount[i]}</span>
      </div>`).join("");

    // 운세 카테고리 탭
    const cats = buildCategories(r);
    const tabs = $("sajuTabs");
    tabs.innerHTML = "";
    cats.forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.className = "tab" + (idx === 0 ? " active" : "");
      btn.innerHTML = `<span class="t-emoji">${c.emoji}</span>${c.label}`;
      btn.addEventListener("click", () => selectCat(cats, idx, tabs));
      tabs.appendChild(btn);
    });
    selectCat(cats, 0, tabs);
  }

  function selectCat(cats, idx, tabs) {
    Array.prototype.forEach.call(tabs.children, (b, i) => b.classList.toggle("active", i === idx));
    const c = cats[idx];
    const badge = c.badge ? `<div class="cat-badge ${c.badge.cls}">${c.badge.label}</div>` : "";
    $("sajuCat").innerHTML = badge + c.body;
  }

  // ===== 통합 리포트 컨트롤러 =====
  function navTo(t) {
    if (t === "home") goHome();
    else if (t === "intro") show("intro");
    else if (t === "sajuInput") show("sajuInput");
    else if (t === "report") showReport();
    else if (t === "fortuneInput") showFortuneInput();
  }
  function wireGoto(root) {
    root.querySelectorAll("[data-goto]").forEach((b) => {
      b.addEventListener("click", () => navTo(b.getAttribute("data-goto")));
    });
  }

  // ===== 운세 통합 리포트 컨트롤러 =====
  const DRAW_SLOTS = ["오늘의 운세", "연애운", "직장운", "재물운"];
  let fInput = null, drawDeck = [], drawPicks = [];

  $("fortuneForm").addEventListener("submit", (e) => { e.preventDefault(); runFortune(); });
  $("fRetry").addEventListener("click", () => show("fortuneInput"));
  $("fNoTime").addEventListener("change", (e) => { $("fHour").disabled = e.target.checked; });
  $("drawReset").addEventListener("click", setupDraw);
  $("drawGo").addEventListener("click", buildAndShowReport);

  function showFortuneInput() {
    const saju = loadLS(LS.saju);
    if (saju && saju.input) {
      $("fYear").value = saju.input.year; $("fMonth").value = saju.input.month; $("fDay").value = saju.input.day;
      if (saju.input.hasTime) $("fHour").value = saju.input.hour;
      $("fNoTime").checked = !saju.input.hasTime; $("fHour").disabled = !saju.input.hasTime;
      if (saju.input.gender) $("fGender").value = saju.input.gender;
    }
    show("fortuneInput");
  }

  function runFortune() {
    const hasTime = !$("fNoTime").checked;
    const v = {
      year: parseInt($("fYear").value, 10), month: parseInt($("fMonth").value, 10), day: parseInt($("fDay").value, 10),
      hour: hasTime ? (parseInt($("fHour").value, 10) || 0) : 0, minute: 0, hasTime, gender: $("fGender").value,
    };
    if (!Number.isFinite(v.year) || v.year < 1900 || v.year > 2100) return toast("연도는 1900~2100 사이로 입력해 주세요.");
    if (!Number.isFinite(v.month) || v.month < 1 || v.month > 12) return toast("월을 1~12로 입력해 주세요.");
    const dmax = new Date(v.year, v.month, 0).getDate();
    if (!Number.isFinite(v.day) || v.day < 1 || v.day > dmax) return toast(`${v.month}월은 1~${dmax}일까지 입력할 수 있어요.`);
    if (hasTime && (v.hour < 0 || v.hour > 23)) return toast("시(時)는 0~23으로 입력해 주세요.");
    fInput = v;
    setupDraw();
    show("tarotDraw");
  }

  function setupDraw() {
    drawDeck = drawTarot((Math.random() * 0x7fffffff) >>> 0, 8); // 8장 face-down
    drawPicks = [];
    $("drawGo").classList.add("hidden");
    updateDrawStatus();
    const el = $("tdeck");
    el.innerHTML = "";
    drawDeck.forEach((cd, i) => {
      const c = TAROT[cd.card];
      const f = document.createElement("div");
      f.className = "tflip";
      f.innerHTML = `<div class="tflip-in">
        <div class="tface tf-back"></div>
        <div class="tface tf-front"><span class="fe">${c.e}</span><span class="fn">${c.n}</span><span class="fd ${cd.reversed ? "lv-lo" : "lv-hi"}">${cd.reversed ? "역" : "정"}</span></div>
      </div>`;
      f.addEventListener("click", () => pickCard(f, cd));
      el.appendChild(f);
    });
  }

  function pickCard(el, cd) {
    if (el.classList.contains("used") || drawPicks.length >= 4) return;
    el.classList.add("flipped", "used", "chosen");
    drawPicks.push({ card: cd.card, reversed: cd.reversed });
    updateDrawStatus();
    if (drawPicks.length >= 4) $("drawGo").classList.remove("hidden");
  }

  function updateDrawStatus() {
    $("drawCount").textContent = `${drawPicks.length} / 4`;
    $("drawSlot").textContent = drawPicks.length < 4 ? DRAW_SLOTS[drawPicks.length] : "완료 —";
  }

  function buildAndShowReport() {
    const deps = {
      computeSaju, tenGodCounts, tenGodOf, sajuPhases, STEM_ELEM, STEMS, TEN_GOD_KO,
      getZodiac, ZODIAC, zodiacDaily, biorhythm, bioPhase, BIO, TAROT,
    };
    const rep = buildFortuneReport(fInput, drawPicks, deps);
    $("fChips").innerHTML = `<div class="sum-row">${rep.chips.map((c) => `<span class="chip">${c.t}</span>`).join("")}</div>`;
    $("fSummary").innerHTML = rep.summary;
    $("fGraph").innerHTML = bioSVG(rep.bioSeries);
    $("fCats").innerHTML = rep.categories.map((c) => `
      <div class="fcat">
        <div class="fcat-h"><span class="fcat-emoji">${c.emoji}</span><span class="fcat-name">${c.label}</span><span class="fcat-v ${c.verdict.cls}">${c.verdict.label}</span></div>
        ${c.body}
      </div>`).join("");
    show("fortuneResult");
  }

  function bioSVG(series) {
    const W = 340, H = 150, padX = 8, midY = H / 2, amp = H / 2 - 12;
    const n = series.length;
    const x = (i) => padX + (i / (n - 1)) * (W - 2 * padX);
    const y = (v) => midY - v * amp;
    let g = `<line x1="${padX}" y1="${midY}" x2="${W - padX}" y2="${midY}" stroke="var(--line)" stroke-width="1"/>`;
    const todayI = series.findIndex((s) => s.d === 0);
    g += `<line x1="${x(todayI).toFixed(1)}" y1="8" x2="${x(todayI).toFixed(1)}" y2="${H - 8}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    BIO.forEach((b) => {
      const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.v[b.key]).toFixed(1)}`).join(" ");
      g += `<polyline points="${pts}" fill="none" stroke="${b.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
      g += `<circle cx="${x(todayI).toFixed(1)}" cy="${y(series[todayI].v[b.key]).toFixed(1)}" r="3.5" fill="${b.color}"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="바이오리듬 그래프">${g}</svg>`;
  }


  function showReport() {
    const tci = loadLS(LS.tci), saju = loadLS(LS.saju);
    const body = $("reportBody");
    if (!tci || !saju) {
      body.innerHTML = reportEmptyHTML(!!tci, !!saju);
    } else {
      const r = computeSaju(saju.input);
      const deps = {
        DIMENSIONS, ELEMENTS, STEMS, BRANCHES, STEM_ELEM, ELEM_TRAIT, ANIMALS,
        tenGodCounts, sajuPhases, TEN_GOD_KO, TEN_GOD_THEME,
      };
      body.innerHTML = reportFullHTML(buildIntegrated(tci.scores, r, deps));
    }
    wireGoto(body);
    show("report");
  }

  function reportEmptyHTML(hasTci, hasSaju) {
    const item = (done, ic, name, goto) =>
      `<div class="rep-item ${done ? "done" : ""}">
        <span class="ri-ic">${done ? "✅" : ic}</span>
        <span class="ri-txt"><span class="ri-name">${name}</span><br><span class="ri-state">${done ? "완료됨" : "아직 하지 않음"}</span></span>
        ${done ? "" : `<button class="ri-go" data-goto="${goto}">하러 가기 →</button>`}
      </div>`;
    return `
      <div class="rep-empty">
        <span class="re-emoji">🧬</span>
        <h1 class="rep-head">통합 리포트</h1>
        <p class="muted">성격검사와 사주, 두 가지를 모두 마치면<br>둘을 합친 맞춤 분석이 열립니다.</p>
      </div>
      <div class="rep-status">
        ${item(hasTci, "🧭", "기질·성격 검사", "intro")}
        ${item(hasSaju, "🔮", "사주팔자", "sajuInput")}
      </div>`;
  }

  function reportFullHTML(rep) {
    const sec = rep.sections.map((s) => {
      let inner = s.html || "";
      if (s.list) inner = s.list.map((i) => `<div class="icard"><div class="icard-t">${i.t}</div><div class="icard-b">${i.b}</div></div>`).join("");
      return `<div class="isec"><div class="ititle">${s.title}</div>${inner}</div>`;
    }).join("");
    return `
      <h1 class="rep-head">${rep.headline}</h1>
      <p class="rep-sub">성격검사 + 사주 통합 분석</p>
      ${sec}
      <div class="actions">
        <button class="btn btn-ghost" data-goto="home">← 메뉴로</button>
      </div>
      <div class="disclaimer">
        통합 리포트는 서로 다른 전통(심리검사·명리)을 함께 비추어 보는 <strong>자기성찰·오락용</strong> 해석이며,
        학술적 상관을 뜻하지 않고 전문 진단·상담을 대체하지 않습니다.
      </div>`;
  }

  function startTest(mode) {
    state.mode = mode === "full" ? "full" : "short";
    state.seed = (Math.random() * 0x7fffffff) >>> 0;   // 매 검사 새 순서
    state.deck = buildDeck(state.mode, state.seed);
    state.answers = new Array(state.deck.length).fill(0);
    state.idx = 0;
    show("quiz");
  }

  // === 화면 전환 ===
  const SCREENS = ["home", "intro", "quiz", "result", "sajuInput", "sajuResult", "report", "fortuneInput", "tarotDraw", "fortuneResult"];
  function show(which) {
    SCREENS.forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle("hidden", id !== which);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (which === "quiz") renderQuestion();
  }

  // === 문항 렌더 ===
  function renderQuestion() {
    const i = state.idx;
    const q = state.deck[i];
    const total = state.deck.length;
    const pct = Math.round(((i + 1) / total) * 100);

    $("progLabel").textContent = `${i + 1} / ${total}`;
    $("progPct").textContent = `${pct}%`;
    $("progFill").style.width = pct + "%";
    $("qText").textContent = q.t;

    const box = $("likert");
    box.innerHTML = "";
    LIKERT.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "opt" + (state.answers[i] === opt.v ? " sel" : "");
      b.innerHTML = `<span class="dot"></span><span class="lbl">${opt.label}</span>`;
      b.addEventListener("click", () => {
        state.answers[i] = opt.v;
        renderQuestion();
        setTimeout(advance, 200);
      });
      box.appendChild(b);
    });

    $("prevBtn").style.visibility = i === 0 ? "hidden" : "visible";
    const isLast = i === total - 1;
    const nextBtn = $("nextBtn");
    nextBtn.textContent = isLast ? "결과 보기 →" : "다음 →";
    nextBtn.disabled = state.answers[i] === 0;
  }

  function advance() {
    if (state.idx < state.deck.length - 1) {
      state.idx++;
      renderQuestion();
    } else if (state.answers.every((a) => a !== 0)) {
      finish();
    } else {
      state.idx = state.answers.findIndex((a) => a === 0);
      renderQuestion();
      toast("아직 응답하지 않은 문항이 있어요");
    }
  }

  // === 채점 ===
  // deck + answers 로부터 차원별·하위척도별 점수(0~100) 계산
  function computeScores(deck, answers) {
    const dim = {}, fac = {};
    DIM_ORDER.forEach((d) => (dim[d] = { sum: 0, n: 0 }));
    deck.forEach((q, i) => {
      if (q.check) return; // 신뢰도 확인 문항은 점수에서 제외
      let v = answers[i] || 3;
      if (q.reverse) v = 6 - v;
      dim[q.d].sum += v; dim[q.d].n += 1;
      if (!fac[q.f]) fac[q.f] = { sum: 0, n: 0 };
      fac[q.f].sum += v; fac[q.f].n += 1;
    });
    const pct = (o) => Math.round(((o.sum - o.n) / (o.n * 4)) * 100);
    const dimOut = {}, facOut = {};
    DIM_ORDER.forEach((d) => (dimOut[d] = pct(dim[d])));
    Object.keys(fac).forEach((f) => (facOut[f] = pct(fac[f])));
    return { dim: dimOut, fac: facOut };
  }

  function levelOf(p) {
    if (p >= 67) return { txt: "높음", cls: "lv-hi" };
    if (p >= 34) return { txt: "보통", cls: "lv-mid" };
    return { txt: "낮음", cls: "lv-lo" };
  }

  // === 응답 신뢰도(참고용) 분석 — 임상 타당성 척도가 아닌 품질 휴리스틱 ===
  function computeQuality(deck, answers) {
    // (1) 주의 문항 통과 여부
    let checkTotal = 0, checkPass = 0;
    // (2) 직선 응답: 성향 문항의 최대 연속 동일 응답 + 중앙값 비율
    const sub = [];
    deck.forEach((q, i) => {
      const a = answers[i];
      if (q.check) {
        checkTotal++;
        if (Math.abs(a - q.expect) < 2) checkPass++;
      } else {
        sub.push(a);
      }
    });
    let run = 1, maxRun = sub.length ? 1 : 0;
    for (let i = 1; i < sub.length; i++) {
      if (sub[i] === sub[i - 1]) { run++; if (run > maxRun) maxRun = run; }
      else run = 1;
    }
    const midRatio = sub.length ? sub.filter((v) => v === 3).length / sub.length : 0;

    // (3) 내적 일관성(심화 전용): facet별 |정방향평균 + 역방향평균 - 6|
    let contradictions = null, facetCount = 0;
    if (state.mode === "full") {
      const byF = {};
      deck.forEach((q, i) => {
        if (q.check) return;
        if (!byF[q.f]) byF[q.f] = { f: [], r: [] };
        byF[q.f][q.reverse ? "r" : "f"].push(answers[i]);
      });
      contradictions = 0;
      Object.keys(byF).forEach((f) => {
        const o = byF[f];
        if (!o.f.length || !o.r.length) return;
        facetCount++;
        const mF = o.f.reduce((s, v) => s + v, 0) / o.f.length;
        const mR = o.r.reduce((s, v) => s + v, 0) / o.r.length;
        if (Math.abs(mF + mR - 6) >= 2.5) contradictions++;
      });
    }

    // 종합 판정(휴리스틱 임계값)
    const strThresh = state.mode === "full" ? 12 : 7;
    const flags = [];
    if (checkTotal && checkPass < checkTotal) flags.push("주의 문항 놓침");
    if (maxRun >= strThresh) flags.push("한 보기 연속 응답");
    if (midRatio > 0.6) flags.push("'보통' 응답 과다");
    if (contradictions !== null && contradictions >= 5) flags.push("상반 응답 다수");

    return {
      verdict: flags.length ? "주의" : "양호",
      flags, checkTotal, checkPass, maxRun, strThresh,
      midRatio, contradictions, facetCount,
    };
  }

  function finish() {
    // 형식: r=<F|S><seed(36진)>-<응답숫자열>  (mode·순서·응답을 모두 담아 링크로 재현)
    const code = (state.mode === "full" ? "F" : "S") + state.seed.toString(36) + "-" + state.answers.join("");
    history.replaceState(null, "", location.pathname + "#r=" + code);
    renderResult(computeScores(state.deck, state.answers));
    show("result");
  }

  // === 결과 렌더 ===
  function renderResult(scores) {
    saveLS(LS.tci, { scores: scores.dim, mode: state.mode, ts: Date.now() });
    const nSub = state.deck.filter((q) => !q.check).length;
    $("resultMode").textContent = (state.mode === "full" ? "심화 검사" : "간단 검사") + " · " + nSub + "문항";
    $("chartWrap").innerHTML = radarSVG(scores.dim);
    renderQuality(computeQuality(state.deck, state.answers));

    const hasFacets = state.mode === "full";
    const dims = $("dims");
    dims.innerHTML = "";

    DIM_ORDER.forEach((d) => {
      const info = DIMENSIONS[d];
      const p = scores.dim[d];
      const lv = levelOf(p);
      const desc = p >= 50 ? info.high : info.low;

      let facetHTML = "";
      if (hasFacets) {
        const rows = Object.keys(FACETS)
          .filter((f) => FACETS[f].dim === d)
          .map((f) => {
            const fp = scores.fac[f];
            const flv = levelOf(fp);
            return `
              <div class="facet">
                <div class="facet-top">
                  <span class="facet-name">${FACETS[f].name}</span>
                  <span class="facet-num">${fp}%</span>
                </div>
                <div class="score-bar sm"><span style="width:${fp}%;background:${info.color}"></span></div>
                <div class="facet-desc">${FACETS[f].desc} · <span class="lvtag ${flv.cls}">${flv.txt}</span></div>
              </div>`;
          }).join("");
        facetHTML = `<div class="facets">${rows}</div>`;
      }

      const el = document.createElement("div");
      el.className = "dim";
      el.innerHTML = `
        <div class="dim-head">
          <span class="dim-name" style="color:${info.color}">${info.name}</span>
          <span class="dim-en">${info.en}</span>
          <span class="dim-type">${info.type}</span>
          <span class="level ${lv.cls}">${lv.txt}</span>
        </div>
        <div class="score-row">
          <div class="score-bar"><span style="width:${p}%;background:${info.color}"></span></div>
          <span class="score-num">${p}%</span>
        </div>
        <p class="muted small dim-desc">${desc}</p>
        ${facetHTML}`;
      dims.appendChild(el);
    });

    // 상위/하위 특성 요약
    renderSummary(scores.dim);
  }

  function renderQuality(q) {
    const ok = q.verdict === "양호";
    const lines = [];
    if (q.checkTotal) {
      const pass = q.checkPass === q.checkTotal;
      lines.push(`<li class="${pass ? "q-ok" : "q-warn"}">주의 문항 ${q.checkPass}/${q.checkTotal} 통과</li>`);
    }
    const strWarn = q.maxRun >= q.strThresh;
    lines.push(`<li class="${strWarn ? "q-warn" : "q-ok"}">같은 보기 최대 연속 ${q.maxRun}회${strWarn ? " (다소 많음)" : ""}</li>`);
    if (q.contradictions !== null) {
      const cWarn = q.contradictions >= 5;
      lines.push(`<li class="${cWarn ? "q-warn" : "q-ok"}">상반된 문항 간 모순 신호 ${q.contradictions} / ${q.facetCount}</li>`);
    }
    if (q.midRatio > 0.6) {
      lines.push(`<li class="q-warn">'보통' 응답 비율 ${Math.round(q.midRatio * 100)}% (다소 높음)</li>`);
    }
    const note = ok
      ? "응답 패턴이 대체로 일관됩니다."
      : "일부 응답이 패턴적이거나 주의 문항을 놓쳤을 수 있어요. 결과를 참고로만 보세요.";
    $("quality").innerHTML = `
      <div class="q-head">
        <span class="q-title">응답 신뢰도</span>
        <span class="q-badge ${ok ? "q-good" : "q-bad"}">${q.verdict}</span>
      </div>
      <p class="q-note">${note}</p>
      <ul class="q-list">${lines.join("")}</ul>
      <p class="q-foot">임상적 타당성 척도가 아니라, 성의 없는 응답을 걸러내기 위한 참고용 품질 지표입니다.</p>`;
  }

  function renderSummary(dimScores) {
    const sorted = DIM_ORDER.slice().sort((a, b) => dimScores[b] - dimScores[a]);
    const top = sorted.slice(0, 2), bottom = sorted.slice(-2).reverse();
    const chip = (d) => `<span class="chip" style="border-color:${DIMENSIONS[d].color};color:${DIMENSIONS[d].color}">${DIMENSIONS[d].name} ${dimScores[d]}%</span>`;
    $("summary").innerHTML =
      `<div class="sum-row"><span class="sum-lbl">두드러지는 특성</span>${top.map(chip).join("")}</div>` +
      `<div class="sum-row"><span class="sum-lbl">낮게 나타난 특성</span>${bottom.map(chip).join("")}</div>`;
  }

  // === 레이더 차트 (순수 SVG) ===
  function radarSVG(dimScores) {
    const cx = 170, cy = 170, R = 122;
    const n = DIM_ORDER.length;
    const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    let g = "";
    [0.25, 0.5, 0.75, 1].forEach((fr) => {
      const pts = DIM_ORDER.map((_, i) => pt(i, R * fr).map((x) => x.toFixed(1)).join(",")).join(" ");
      g += `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
    });
    DIM_ORDER.forEach((d, i) => {
      const [x, y] = pt(i, R);
      g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
      const [lx, ly] = pt(i, R + 24);
      let anchor = "middle";
      if (lx > cx + 5) anchor = "start"; else if (lx < cx - 5) anchor = "end";
      g += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="12.5" font-weight="700" fill="${DIMENSIONS[d].color}">${SHORT[d]}</text>`;
    });
    const dpts = DIM_ORDER.map((d, i) => pt(i, R * (dimScores[d] / 100)).map((x) => x.toFixed(1)).join(",")).join(" ");
    g += `<polygon points="${dpts}" fill="rgba(122,92,196,0.22)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
    DIM_ORDER.forEach((d, i) => {
      const [x, y] = pt(i, R * (dimScores[d] / 100));
      g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${DIMENSIONS[d].color}" stroke="var(--card)" stroke-width="1.5"/>`;
    });
    return `<svg viewBox="-38 -8 416 356" width="360" height="330" role="img" aria-label="7차원 레이더 차트">${g}</svg>`;
  }

  // === 링크 복사 ===
  function copyResultLink() {
    const url = location.href;
    const done = () => toast("결과 링크가 복사되었습니다 ✓");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
    } else fallbackCopy(url, done);
  }
  function fallbackCopy(text, cb) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); cb(); } catch (e) { toast("복사에 실패했습니다"); }
    document.body.removeChild(ta);
  }

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // === 공유 링크로 진입 시 결과 복원 ===
  function tryRestore() {
    const m = location.hash.match(/r=([FS])([0-9a-z]+)-(\d+)/);
    if (!m) return false;
    const mode = m[1] === "F" ? "full" : "short";
    const seed = parseInt(m[2], 36);
    const digits = m[3];
    if (!Number.isFinite(seed)) return false;
    const deck = buildDeck(mode, seed);
    if (digits.length !== deck.length) return false;
    const answers = digits.split("").map(Number);
    if (answers.some((a) => a < 1 || a > 5)) return false;
    state.mode = mode; state.seed = seed; state.deck = deck; state.answers = answers;
    renderResult(computeScores(deck, answers));
    show("result");
    return true;
  }

  if (!tryRestore() && !trySajuRestore()) show("home");
})();
