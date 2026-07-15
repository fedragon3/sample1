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

  const state = {
    idx: 0,
    answers: new Array(QUESTIONS.length).fill(0), // 0 = 미응답
  };

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const intro = $("intro"), quiz = $("quiz"), result = $("result");

  $("qcount").textContent = QUESTIONS.length;
  $("progLabel").textContent = `1 / ${QUESTIONS.length}`;

  // --- 이벤트 ---
  $("startBtn").addEventListener("click", () => show("quiz"));
  $("retryBtn").addEventListener("click", () => {
    state.idx = 0;
    state.answers.fill(0);
    history.replaceState(null, "", location.pathname);
    show("intro");
  });
  $("prevBtn").addEventListener("click", () => {
    if (state.idx > 0) { state.idx--; renderQuestion(); }
  });
  $("nextBtn").addEventListener("click", () => {
    if (state.answers[state.idx] === 0) return;
    advance();
  });
  $("copyBtn").addEventListener("click", copyResultLink);

  // --- 화면 전환 ---
  function show(which) {
    intro.classList.toggle("hidden", which !== "intro");
    quiz.classList.toggle("hidden", which !== "quiz");
    result.classList.toggle("hidden", which !== "result");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (which === "quiz") renderQuestion();
  }

  // --- 문항 렌더 ---
  function renderQuestion() {
    const i = state.idx;
    const q = QUESTIONS[i];
    const total = QUESTIONS.length;
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
        // 선택 즉시 반영 후 짧은 딜레이로 자동 진행
        renderQuestion();
        setTimeout(advance, 220);
      });
      box.appendChild(b);
    });

    $("prevBtn").disabled = i === 0;
    $("prevBtn").style.visibility = i === 0 ? "hidden" : "visible";
    const isLast = i === total - 1;
    const nextBtn = $("nextBtn");
    nextBtn.textContent = isLast ? "결과 보기 →" : "다음 →";
    nextBtn.disabled = state.answers[i] === 0;
  }

  function advance() {
    if (state.idx < QUESTIONS.length - 1) {
      state.idx++;
      renderQuestion();
    } else if (state.answers.every((a) => a !== 0)) {
      finish();
    } else {
      // 미응답 문항으로 이동
      const miss = state.answers.findIndex((a) => a === 0);
      state.idx = miss;
      renderQuestion();
      toast("아직 응답하지 않은 문항이 있어요");
    }
  }

  // --- 채점 ---
  function scoreFrom(answers) {
    const acc = {}; // dim -> {sum, count}
    DIM_ORDER.forEach((d) => (acc[d] = { sum: 0, count: 0 }));
    QUESTIONS.forEach((q, i) => {
      let v = answers[i];
      if (!v) v = 3; // 안전장치: 미응답은 중앙값
      if (q.reverse) v = 6 - v; // 1<->5 역채점
      acc[q.d].sum += v;
      acc[q.d].count += 1;
    });
    const out = {};
    DIM_ORDER.forEach((d) => {
      const { sum, count } = acc[d];
      const min = count * 1, max = count * 5;
      out[d] = Math.round(((sum - min) / (max - min)) * 100);
    });
    return out;
  }

  function levelOf(p) {
    if (p >= 67) return { txt: "높음", bg: "#e05a4722", fg: "#c0432f" };
    if (p >= 34) return { txt: "보통", bg: "#88888822", fg: "var(--muted)" };
    return { txt: "낮음", bg: "#4a7bb522", fg: "#3a6aa5" };
  }

  function finish() {
    const scores = scoreFrom(state.answers);
    // URL에 응답 저장 (숫자 이어붙이기)
    const code = state.answers.join("");
    history.replaceState(null, "", location.pathname + "#r=" + code);
    renderResult(scores);
    show("result");
  }

  // --- 결과 렌더 ---
  function renderResult(scores) {
    $("chartWrap").innerHTML = radarSVG(scores);
    const dims = $("dims");
    dims.innerHTML = "";
    DIM_ORDER.forEach((d) => {
      const info = DIMENSIONS[d];
      const p = scores[d];
      const lv = levelOf(p);
      const desc = p >= 50 ? info.high : info.low;
      const el = document.createElement("div");
      el.className = "dim";
      el.innerHTML = `
        <div class="dim-head">
          <span class="dim-name" style="color:${info.color}">${info.name}</span>
          <span class="dim-en">${info.en}</span>
          <span class="dim-type">${info.type}</span>
        </div>
        <div class="score-row">
          <div class="score-bar"><span style="width:${p}%;background:${info.color}"></span></div>
          <span class="score-num">${p}%</span>
          <span class="level" style="background:${lv.bg};color:${lv.fg}">${lv.txt}</span>
        </div>
        <p class="muted small">${desc}</p>`;
      dims.appendChild(el);
    });
  }

  // --- 레이더 차트 (순수 SVG) ---
  const SHORT = { NS: "자극추구", HA: "위험회피", RD: "사회성", PS: "인내력", SD: "자율성", CO: "연대감", ST: "자기초월" };
  function radarSVG(scores) {
    const cx = 170, cy = 170, R = 122;
    const n = DIM_ORDER.length;
    const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    let g = "";
    // 그리드 링
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      const pts = DIM_ORDER.map((_, i) => pt(i, R * f).map((x) => x.toFixed(1)).join(",")).join(" ");
      g += `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
    });
    // 축선 + 라벨
    DIM_ORDER.forEach((d, i) => {
      const [x, y] = pt(i, R);
      g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
      const [lx, ly] = pt(i, R + 24);
      let anchor = "middle";
      if (lx > cx + 5) anchor = "start";
      else if (lx < cx - 5) anchor = "end";
      g += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}"
        font-size="12.5" font-weight="700" fill="${DIMENSIONS[d].color}">${SHORT[d]}</text>`;
    });
    // 데이터 폴리곤
    const dpts = DIM_ORDER.map((d, i) => pt(i, R * (scores[d] / 100)).map((x) => x.toFixed(1)).join(",")).join(" ");
    g += `<polygon points="${dpts}" fill="rgba(122,92,196,0.22)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
    DIM_ORDER.forEach((d, i) => {
      const [x, y] = pt(i, R * (scores[d] / 100));
      g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${DIMENSIONS[d].color}" stroke="var(--card)" stroke-width="1.5"/>`;
    });

    return `<svg viewBox="-38 -8 416 356" width="360" height="330" role="img" aria-label="7차원 레이더 차트">${g}</svg>`;
  }

  // --- 링크 복사 ---
  function copyResultLink() {
    const url = location.href;
    const done = () => toast("결과 링크가 복사되었습니다 ✓");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
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
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // --- 공유된 결과 링크로 진입 시 복원 ---
  function tryRestore() {
    const m = location.hash.match(/r=(\d+)/);
    if (!m) return false;
    const code = m[1];
    if (code.length !== QUESTIONS.length) return false;
    const answers = code.split("").map(Number);
    if (answers.some((a) => a < 1 || a > 5)) return false;
    state.answers = answers;
    renderResult(scoreFrom(answers));
    show("result");
    return true;
  }

  if (!tryRestore()) show("intro");
})();
