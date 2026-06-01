/* ============================================================
   FOCUS & FLOW READINESS ASSESSMENT — view layer
   Renders the flow (intro -> 8 questions -> honesty check ->
   result). All grading is delegated to the pure FFScoring core
   (scoring.js); this file owns DOM + flow only.

   Sample build: the result opt-in is an optimistic demo (matches
   the landing page's form), not wired to an ESP.
   ============================================================ */
(function () {
  "use strict";

  var S = window.FFScoring;
  var Q = S.QUESTIONS;
  var DRIFT = S.DRIFT_QUESTION;

  var stage = document.getElementById("assess-stage");
  if (!stage) return;

  var state = { step: "intro", answers: new Array(Q.length).fill(null), drift: null };

  /* ---- small helpers -------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // Deterministic-enough shuffle so the 0..3 ramp is not visible.
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function dimLabel(key) {
    var d = S.DIMENSIONS.filter(function (x) { return x.key === key; })[0];
    return d ? d.label : key;
  }

  function swap(node) {
    stage.innerHTML = "";
    node.classList.add("assess__stage");
    stage.appendChild(node);
    stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---- INTRO ---------------------------------------------- */
  function renderIntro() {
    var wrap = el("div", "assess__intro");
    wrap.appendChild(el("p", "assess__body",
      "Eight questions, about three minutes. There are no right answers here, and nothing to perform for. " +
      "We read the <em>pattern</em> across all of them together, and show you where you stand."));
    var btn = el("button", "assess__start", "Begin the assessment");
    btn.type = "button";
    btn.addEventListener("click", function () { state.step = 0; render(); });
    wrap.appendChild(btn);
    wrap.appendChild(el("span", "assess__start-meta", "8 questions · ~3 min · private"));
    swap(wrap);
  }

  /* ---- QUESTION ------------------------------------------- */
  function renderQuestion(i) {
    var q = Q[i];
    var wrap = el("div");

    // progress
    var prog = el("div", "assess__progress");
    var meta = el("div", "assess__progress-meta");
    meta.appendChild(el("span", null, "Question " + (i + 1) + " of " + Q.length));
    meta.appendChild(el("span", "assess__dim", dimLabel(q.dim)));
    prog.appendChild(meta);
    var bar = el("div", "assess__bar");
    var fill = el("div", "assess__bar-fill");
    bar.appendChild(fill);
    prog.appendChild(bar);
    wrap.appendChild(prog);

    wrap.appendChild(el("h2", "assess__q", esc(q.prompt)));

    var opts = el("div", "assess__options");
    var order = q._order || (q._order = shuffled(q.options)); // stable per session
    order.forEach(function (opt) {
      var b = el("button", "assess__option", esc(opt.text));
      b.type = "button";
      if (state.answers[i] && state.answers[i].points === opt.points) {
        b.classList.add("is-picked");
      }
      b.addEventListener("click", function () {
        state.answers[i] = { points: opt.points, dim: q.dim };
        // reflect selection, then advance
        opts.querySelectorAll(".assess__option").forEach(function (o) { o.classList.remove("is-picked"); });
        b.classList.add("is-picked");
        window.setTimeout(function () {
          if (i + 1 < Q.length) { state.step = i + 1; }
          else { state.step = "drift"; }
          render();
        }, 230);
      });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);

    // foot: back + hint
    var foot = el("div", "assess__foot");
    var back = el("button", "assess__back" + (i > 0 ? " is-shown" : ""), "← Back");
    back.type = "button";
    back.addEventListener("click", function () { state.step = i - 1; render(); });
    foot.appendChild(back);
    foot.appendChild(el("span", "assess__hint", "Pick the one closest to true"));
    wrap.appendChild(foot);

    swap(wrap);
    // animate progress fill after paint
    window.requestAnimationFrame(function () {
      fill.style.width = Math.round(((i) / Q.length) * 100) + "%";
    });
  }

  /* ---- DRIFT / HONESTY CHECK ------------------------------ */
  function renderDrift() {
    var wrap = el("div");

    var prog = el("div", "assess__progress");
    var meta = el("div", "assess__progress-meta");
    meta.appendChild(el("span", null, "One honest check"));
    meta.appendChild(el("span", "assess__dim", "Self-Authorship"));
    prog.appendChild(meta);
    var bar = el("div", "assess__bar");
    var fill = el("div", "assess__bar-fill");
    bar.appendChild(fill);
    prog.appendChild(bar);
    wrap.appendChild(prog);

    wrap.appendChild(el("h2", "assess__q", esc(DRIFT.prompt)));
    wrap.appendChild(el("p", "assess__drift-note",
      "Self-honesty is the whole game. The work begins with seeing yourself clearly, without flinching. " +
      "Answer for the last two weeks as they were, not as you wish they had been."));

    var opts = el("div", "assess__options");
    DRIFT.options.forEach(function (opt) {
      var b = el("button", "assess__option", esc(opt.text));
      b.type = "button";
      if (state.drift === opt.id) b.classList.add("is-picked");
      b.addEventListener("click", function () {
        state.drift = opt.id;
        opts.querySelectorAll(".assess__option").forEach(function (o) { o.classList.remove("is-picked"); });
        b.classList.add("is-picked");
        window.setTimeout(function () { state.step = "result"; render(); }, 230);
      });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);

    var foot = el("div", "assess__foot");
    var back = el("button", "assess__back is-shown", "← Back");
    back.type = "button";
    back.addEventListener("click", function () { state.step = Q.length - 1; render(); });
    foot.appendChild(back);
    foot.appendChild(el("span", "assess__hint", "Last one"));
    wrap.appendChild(foot);

    swap(wrap);
    window.requestAnimationFrame(function () { fill.style.width = "100%"; });
  }

  /* ---- RESULT --------------------------------------------- */
  function ctaForFit(fit, band) {
    var group = "https://www.brenthogarth.com/focus-group";
    if (fit === "high") {
      return {
        title: "When you are ready to go deeper.",
        sub: "The series gets you moving. The Focus & Flow Group is the full build: eight weekly live sessions with Dr. Hogarth to train the self-regulation, recovery, and focus this result asks for.",
        primary: { label: "Explore the Group", href: group }
      };
    }
    if (fit === "medium") {
      return {
        title: "When you are ready to go deeper.",
        sub: "The Focus & Flow Group turns the rhythm you have glimpsed into something repeatable, alongside peers training the same skills.",
        primary: { label: "Explore the Group", href: group }
      };
    }
    return {
      title: "When you are ready to go deeper.",
      sub: "At your level the Focus & Flow Group is about edge: a room of peers operating where you do, with the science to sustain it.",
      primary: { label: "See the Group &amp; membership", href: group }
    };
  }

  function renderResult() {
    var res = S.scoreAssessment(state.answers, state.drift);
    var band = res.band;
    var wrap = el("div");

    wrap.appendChild(el("p", "eyebrow assess__result-eyebrow", "YOUR READINESS"));

    // Band name (italicize a key word where natural)
    var bandHtml = esc(band.name).replace("CEO", "<span class=\"italic\">CEO</span>");
    wrap.appendChild(el("h2", "assess__band", bandHtml));
    wrap.appendChild(el("p", "assess__summary", "“" + esc(band.summary) + "”"));

    // readiness meter
    var meter = el("div", "assess__meter");
    var track = el("div", "assess__meter-track");
    var marker = el("div", "assess__meter-marker");
    track.appendChild(marker);
    meter.appendChild(track);
    var scale = el("div", "assess__meter-scale");
    S.BANDS.forEach(function (b) {
      var s = el("span", b.key === band.key ? "is-current" : null, esc(b.name));
      scale.appendChild(s);
    });
    meter.appendChild(scale);
    wrap.appendChild(meter);

    // body
    wrap.appendChild(el("p", "assess__body", esc(band.body)));

    // capped caveat
    if (res.capped) {
      var why = res.reasons.driftIdeal
        ? "You told us these answers leaned toward the version of you that you are working toward, rather than your last couple of weeks."
        : "Your answers came back almost perfectly even, which usually means the assessment was read as a test rather than a mirror.";
      wrap.appendChild(el("div", "assess__caveat",
        "<strong>A note on this result.</strong> " + why +
        " So we have held your standing one tier back. Retake it describing the last two weeks exactly as they were, and you will get a truer read."));
    }

    // dimension map — the animated Flow Signature radar
    var sig = buildSignature(res);
    wrap.appendChild(sig.node);

    // the prescription: matched playbook + email capture (lead magnet)
    // the gap insight (names the concept to train, from the playbooks)
    var gi = S.gapInsight(res.gap.key);
    if (gi) {
      var ins = el("div", "assess__insight");
      ins.appendChild(el("p", "assess__insight-head", "WHAT TO TRAIN FIRST"));
      ins.appendChild(el("p", "assess__insight-body",
        "<strong>" + esc(gi.concept) + ".</strong> " + esc(gi.detail)));
      wrap.appendChild(ins);
    }

    // primary next step: start the free 8-day series (with playbook bonus)
    wrap.appendChild(buildSeriesCard(S.prescribePlaybook(res.gap.key), gi));

    // secondary: the Group, when they are ready to go deeper
    var cta = ctaForFit(band.fit, band);
    var ctaBox = el("div", "assess__cta assess__cta--secondary");
    ctaBox.appendChild(el("h3", "assess__cta-title", cta.title));
    ctaBox.appendChild(el("p", "assess__cta-sub", cta.sub));
    var row = el("div", "assess__cta-row");
    var prim = el("a", "assess__btn assess__btn--primary", cta.primary.label);
    prim.href = cta.primary.href;
    row.appendChild(prim);
    ctaBox.appendChild(row);
    wrap.appendChild(ctaBox);

    // retake
    var retake = el("button", "assess__retake", "Retake the assessment");
    retake.type = "button";
    retake.addEventListener("click", function () {
      state.answers = new Array(Q.length).fill(null);
      state.drift = null;
      Q.forEach(function (q) { delete q._order; });
      state.step = 0;
      render();
    });
    wrap.appendChild(retake);

    swap(wrap);

    // animate the meter + Flow Signature shortly after paint (setTimeout,
    // not rAF: rAF can be throttled to never-fire in background tabs, which
    // would leave the reveal stuck hidden).
    window.setTimeout(function () {
      marker.style.left = res.composite + "%";
      sig.animate();
    }, 30);
  }

  /* ---- Flow Signature radar ------------------------------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // A 4-axis radar: a unique "signature" shape per person, drawn on
  // like an instrument calibrating. Reads as a measurement device,
  // not a toy (the brand's halftone-dot / court-line language).
  function buildSignature(res) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dims = res.dimensions;           // canonical order: focus, regulation, recovery, alignment
    var COMPASS = [-90, 0, 90, 180];     // top, right, bottom, left
    var CX = 240, CY = 188, R = 118;

    function pt(deg, radius) {
      var a = deg * Math.PI / 180;
      return [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius];
    }
    function poly(frac) {
      return COMPASS.map(function (deg) { var p = pt(deg, R * frac); return p[0] + "," + p[1]; }).join(" ");
    }

    function dpt(i) { return pt(COMPASS[i], R * (dims[i].score / 100)); }
    function layer(cls) {
      return svg("svg", { "class": "assess__radar-layer " + cls, viewBox: "0 0 480 392", "aria-hidden": "true" });
    }

    var box = el("div", "assess__dims");
    box.appendChild(el("p", "assess__dims-head", "WHERE IT IS COMING FROM · YOUR FLOW SIGNATURE"));

    var scene = el("div", "assess__radar");
    scene.setAttribute("role", "img");
    scene.setAttribute("aria-label",
      "Flow Signature: " + dims.map(function (d) { return d.short + " " + d.score + " percent"; }).join(", "));
    var rotor = el("div", "assess__radar-rotor");

    // --- layer 1: grid rings (diamonds) + axis spokes (back plane) ---
    var gridSvg = layer("is-grid");
    var grid = svg("g", { "class": "assess__radar-grid" });
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      grid.appendChild(svg("polygon", { points: poly(f), "class": f === 1 ? "is-outer" : "" }));
    });
    COMPASS.forEach(function (deg) {
      var p = pt(deg, R);
      grid.appendChild(svg("line", { x1: CX, y1: CY, x2: p[0], y2: p[1] }));
    });
    gridSvg.appendChild(grid);
    rotor.appendChild(gridSvg);

    // --- layer 2: axis labels (mid plane) ---
    var labelSvg = layer("is-labels");
    COMPASS.forEach(function (deg, i) {
      var d = dims[i];
      var isGap = d.key === res.gap.key;
      var lp = pt(deg, R + 34);
      var g = svg("g", { "class": "assess__radar-axis" + (isGap ? " is-gap" : "") });
      var name = svg("text", { x: lp[0], y: lp[1] - 2, "text-anchor": "middle", "class": "assess__radar-axis-name" });
      name.textContent = d.short.toUpperCase();
      var pct = svg("text", { x: lp[0], y: lp[1] + 15, "text-anchor": "middle", "class": "assess__radar-axis-pct" });
      pct.textContent = d.score + "%";
      g.appendChild(name); g.appendChild(pct);
      labelSvg.appendChild(g);
    });
    rotor.appendChild(labelSvg);

    // --- layer 3: the signature polygon + vertices (front plane) ---
    var dataSvg = layer("is-data");
    var dataPoints = COMPASS.map(function (deg, i) { var p = dpt(i); return p[0] + "," + p[1]; }).join(" ");
    dataSvg.appendChild(svg("polygon", { points: dataPoints, "class": "assess__radar-area" }));
    COMPASS.forEach(function (deg, i) {
      var isGap = dims[i].key === res.gap.key;
      var p = dpt(i);
      dataSvg.appendChild(svg("circle", {
        cx: p[0], cy: p[1], r: isGap ? 6 : 4.5,
        "class": "assess__radar-vert" + (isGap ? " is-gap" : "")
      }));
    });
    rotor.appendChild(dataSvg);

    scene.appendChild(rotor);
    box.appendChild(scene);

    box.appendChild(el("p", "assess__radar-gap",
      "Your biggest lever right now: <strong>" + esc(res.gap.label) + "</strong>."));
    if (!reduce) box.appendChild(el("p", "assess__radar-hint", "Drag to explore · move your cursor to tilt"));

    // ---- interaction: hover-tilt + drag-to-spin (no rAF; pointer-driven
    // inline transforms, so it responds even where rAF is throttled) ----
    if (!reduce) {
      var rx = 9, ry = 0, dragging = false, lastX = 0, lastY = 0;
      var HOVER_Y = 24, HOVER_X = 16;
      function apply() { rotor.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)"; }
      scene.addEventListener("pointerenter", function () { scene.classList.add("is-active"); });
      scene.addEventListener("pointermove", function (e) {
        if (dragging) {
          ry += (e.clientX - lastX) * 0.55;
          rx -= (e.clientY - lastY) * 0.55;
          rx = Math.max(-60, Math.min(60, rx));
          lastX = e.clientX; lastY = e.clientY;
        } else {
          var b = scene.getBoundingClientRect();
          ry = ((e.clientX - b.left) / b.width - 0.5) * 2 * HOVER_Y;
          rx = 9 - ((e.clientY - b.top) / b.height - 0.5) * 2 * HOVER_X;
        }
        apply();
      });
      scene.addEventListener("pointerdown", function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        scene.classList.add("is-grabbing", "is-active");
        if (scene.setPointerCapture) { try { scene.setPointerCapture(e.pointerId); } catch (x) {} }
      });
      window.addEventListener("pointerup", function () {
        dragging = false; scene.classList.remove("is-grabbing");
      });
      scene.addEventListener("pointerleave", function () {
        if (dragging) return;
        scene.classList.remove("is-active"); // resume the idle CSS orbit
        rotor.style.transform = "";          // hand control back to the keyframes
      });
    }

    // The radar is fully painted at build; nothing to defer.
    function animate() {}
    return { node: box, animate: animate };
  }

  /* ---- the next step: start the free 8-day series --------
     The email capture starts the personalized series (the real
     nurture engine into the Group). The matched playbook rides
     along as the welcome gift, so the playbooks reinforce the
     series rather than competing with it. Demo only: success is
     optimistic, no real ESP. */
  function buildSeriesCard(pb, gi) {
    var startPhrase = (gi && gi.seriesStart) ? gi.seriesStart : "the area your result flagged";

    var box = el("div", "assess__rx");
    box.appendChild(el("p", "assess__rx-eyebrow", "YOUR NEXT STEP"));

    var card = el("div", "assess__rx-card");

    // welcome-gift cover (the matched playbook)
    var coverWrap = el("div", "assess__rx-cover");
    var img = el("img");
    img.src = pb.cover;
    img.alt = pb.title + " cover";
    img.loading = "lazy";
    coverWrap.appendChild(img);
    coverWrap.appendChild(el("p", "assess__rx-cover-cap", "WELCOME GIFT"));
    card.appendChild(coverWrap);

    var body = el("div", "assess__rx-body");
    body.appendChild(el("p", "assess__rx-kicker", "FREE · 8-DAY EMAIL SERIES"));
    body.appendChild(el("h3", "assess__rx-title", "Start where it matters most."));
    body.appendChild(el("p", "assess__rx-desc",
      "One short, practical email a day from Dr. Hogarth. Yours begins with " + esc(startPhrase) +
      ". You will get the <strong>" + esc(pb.title) + "</strong> as your welcome gift on day one."));

    var form = el("div", "email-form");
    form.setAttribute("data-email-form", "");
    form.innerHTML =
      '<form novalidate>' +
        '<div class="email-form__row">' +
          '<input class="email-form__input" type="email" name="email" required ' +
                 'placeholder="you@company.com" autocomplete="email" aria-label="Email address">' +
          '<button class="email-form__btn" type="submit">Start the series</button>' +
        '</div>' +
      '</form>' +
      '<div class="email-form__success" role="status">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:var(--courtside);flex:none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '<div>' +
          '<div class="email-form__success-title">You are in.</div>' +
          '<div class="email-form__success-sub">Day 1, and your welcome gift, are on the way to <span data-email-echo></span></div>' +
        '</div>' +
      '</div>';
    body.appendChild(form);
    body.appendChild(el("p", "assess__consent",
      "Dr. Hogarth may follow up about the Focus & Flow Group based on your result. No spam, unsubscribe anytime."));
    card.appendChild(body);
    box.appendChild(card);

    // Bind the demo handler locally (main.js bound only forms present at load).
    var f = form.querySelector("form");
    var input = form.querySelector(".email-form__input");
    var echo = form.querySelector("[data-email-echo]");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.setCustomValidity("Enter a valid email address");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      if (echo) echo.textContent = email;
      form.classList.add("is-done");
    });
    input.addEventListener("input", function () { input.setCustomValidity(""); });
    return box;
  }

  /* ---- router --------------------------------------------- */
  function render() {
    if (state.step === "intro") return renderIntro();
    if (state.step === "drift") return renderDrift();
    if (state.step === "result") return renderResult();
    if (typeof state.step === "number") return renderQuestion(state.step);
    renderIntro();
  }

  render();
})();
