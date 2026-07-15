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
  // pool 순서는 고정, seed 로 Fisher–Yates 셔플하여 매 검사 순서를 무작위화한다.
  function buildDeck(mode, seed) {
    const deck = (mode === "full" ? QUESTIONS : QUESTIONS.filter((q) => q.short)).slice();
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
    if (confirm("검사를 중단하고 처음으로 돌아갈까요? 지금까지의 응답은 사라집니다.")) show("intro");
  });

  function startTest(mode) {
    state.mode = mode === "full" ? "full" : "short";
    state.seed = (Math.random() * 0x7fffffff) >>> 0;   // 매 검사 새 순서
    state.deck = buildDeck(state.mode, state.seed);
    state.answers = new Array(state.deck.length).fill(0);
    state.idx = 0;
    show("quiz");
  }

  // === 화면 전환 ===
  function show(which) {
    intro.classList.toggle("hidden", which !== "intro");
    quiz.classList.toggle("hidden", which !== "quiz");
    result.classList.toggle("hidden", which !== "result");
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

  function finish() {
    // 형식: r=<F|S><seed(36진)>-<응답숫자열>  (mode·순서·응답을 모두 담아 링크로 재현)
    const code = (state.mode === "full" ? "F" : "S") + state.seed.toString(36) + "-" + state.answers.join("");
    history.replaceState(null, "", location.pathname + "#r=" + code);
    renderResult(computeScores(state.deck, state.answers));
    show("result");
  }

  // === 결과 렌더 ===
  function renderResult(scores) {
    $("resultMode").textContent = state.mode === "full" ? "심화 검사 · 140문항" : "간단 검사 · 28문항";
    $("chartWrap").innerHTML = radarSVG(scores.dim);

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

  if (!tryRestore()) show("intro");
})();
