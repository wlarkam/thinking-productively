/* ============================================================
   FOCUS & FLOW READINESS ASSESSMENT — scoring core
   Pure logic + item data. No DOM, no fetch. Unit-tested in
   scoring.test.js BEFORE any UI was built (see the skill's
   "TDD the scoring core" step).

   The Ungameable Law, applied:
   - Every option is a believable, mature-sounding coping style.
   - The "grind / push-through" answers SOUND admirable but score
     LOW on readiness (Brent's "Dark Side of Flow" thesis: peak
     performance without self-regulation + recovery is the risk,
     not the win). So there is no obvious "best answer" to game
     toward.
   - The grade emerges from the PATTERN across all items, capped
     by two gates: a monoculture cap (too-clean = idealized) and
     an explicit honesty/drift question.

   COPY STATUS: draft, pending Dr. Hogarth's voice review.
   Conventions: American -ize spellings, no em dashes, "Flow"
   capitalized as a proper noun.
   ============================================================ */
(function (root) {
  "use strict";

  /* ---- DIMENSIONS ----------------------------------------- */
  var DIMENSIONS = [
    { key: "focus",      label: "Drive & Focus",             short: "Focus",      stage: "flow" },
    { key: "regulation", label: "Nervous-System Regulation", short: "Regulation", stage: "release" },
    { key: "recovery",   label: "Recovery & Sleep",          short: "Recovery",   stage: "recovery" },
    { key: "alignment",  label: "Values & Direction",        short: "Direction",  stage: "struggle" }
  ];

  /* ---- ITEMS ----------------------------------------------
     Each scenario probes ONE dimension. Options are ordered
     low->high readiness and carry points 0..3. Order is shuffled
     in the view layer so the ramp is not visible to the user. */
  var QUESTIONS = [
    {
      dim: "focus",
      prompt: "It is the start of your most important work block. What happens?",
      options: [
        { points: 0, text: "I open the hard task, feel the resistance, and slip into email to feel productive." },
        { points: 1, text: "I start, but within ten minutes I have a dozen tabs open and no idea which one I am in." },
        { points: 2, text: "I clear the obvious distractions and set a timer. Some blocks hold, some fall apart." },
        { points: 3, text: "I run a protected block: phone away, one task, a timer going. I have a ritual that drops me in." }
      ]
    },
    {
      dim: "regulation",
      prompt: "A deadline slips and someone important to you is frustrated. In your body, what happens?",
      options: [
        { points: 0, text: "The inner critic gets loud. I tear into myself, then bury it under more work." },
        { points: 1, text: "I replay the conversation for hours. I cannot put it down, and it leaks into everything else." },
        { points: 2, text: "I notice the spike, take a few breaths, and usually find my feet within the hour." },
        { points: 3, text: "I talk to myself the way I would a teammate, name what I feel, and let it move through." }
      ]
    },
    {
      dim: "recovery",
      prompt: "It is 10:47pm and tomorrow is a big one. What is the honest scene?",
      options: [
        { points: 0, text: "Still going. Rest feels like falling behind, and there is always one more thing." },
        { points: 1, text: "In bed, on my phone, telling myself five more minutes for the last hour." },
        { points: 2, text: "Winding down most nights, though a hard day can still hijack my sleep." },
        { points: 3, text: "I treat sleep as training, not the reward for finishing. I defend the wind-down." }
      ]
    },
    {
      dim: "alignment",
      prompt: "Look at last week. The hours you spent: who chose them?",
      options: [
        { points: 0, text: "Whoever shouted loudest. The urgent ran the week, and the important never got a look in." },
        { points: 1, text: "A blur. I was busy, but I could not tell you what any of it added up to." },
        { points: 2, text: "Mostly mine, with some drift. I can tell the important from the merely urgent, most days." },
        { points: 3, text: "Me. The important work got the prime hours, and the urgent waited its turn." }
      ]
    },
    {
      dim: "focus",
      prompt: "Your phone buzzes mid-task. Be honest about the next sixty seconds.",
      options: [
        { points: 0, text: "It is already in my hand, and twenty minutes are gone before I look up." },
        { points: 1, text: "I glance to clear the notification and lose my place in the work." },
        { points: 2, text: "I usually let it wait until my next break, though a slow day tests me." },
        { points: 3, text: "Phone is in another room during a work block. Notifications wait for the break, not the other way around." }
      ]
    },
    {
      dim: "regulation",
      prompt: "You fall short on something you care about. What is the story you tell yourself?",
      options: [
        { points: 0, text: "That something is wrong with me. Everyone else seems to have this handled." },
        { points: 1, text: "I go quiet, drop my head, and grind alone until I have fixed it." },
        { points: 2, text: "I remind myself that hard stretches are normal, though it does not always land." },
        { points: 3, text: "I know the struggle is part of the work everyone does. I stay kind to myself and keep going." }
      ]
    },
    {
      dim: "recovery",
      prompt: "Think about your energy across the last three months. The pattern?",
      options: [
        { points: 0, text: "Sprint, crash, repeat. I get a lot done and then I am useless for days." },
        { points: 1, text: "Running on fumes more often than not, but pushing through." },
        { points: 2, text: "Mostly steady, with the occasional week that empties the tank." },
        { points: 3, text: "Sustainable. I work in waves on purpose: full effort, then real recovery." }
      ]
    },
    {
      dim: "alignment",
      prompt: "When the day is done, how often does it feel like it counted?",
      options: [
        { points: 0, text: "Rarely. I am productive and still feel like I am running from something." },
        { points: 1, text: "Hit and miss. Some days land, most just happen to me." },
        { points: 2, text: "More often than not. I can usually point to something worthwhile." },
        { points: 3, text: "Most days. I am building toward something I chose, and I can feel it." }
      ]
    }
  ];

  /* ---- DRIFT / HONESTY GATE -------------------------------
     Not scored into the composite. Detects the domain's known
     failure mode (aspirational self-report) and caps the band. */
  var DRIFT_QUESTION = {
    prompt: "Last thing, and be honest. When you answered, what were you describing?",
    options: [
      { id: "honest", text: "My honest last couple of weeks.", cap: false },
      { id: "between", text: "Somewhere between my real and my ideal.", cap: false },
      { id: "ideal",  text: "More like the version of me I am working toward.", cap: true }
    ]
  };

  /* ---- BANDS (state-of-being tiers, low -> high readiness) - */
  var BANDS = [
    {
      key: "adrenaline",
      name: "Running on Adrenaline",
      min: 0, max: 37,
      summary: "You can perform. The question is at what cost.",
      body: "Right now you are running on stress chemistry. Drive carries you, but your nervous system rarely stands down, so the wins arrive with a crash you keep outrunning. In my experience it is the most common pattern among high performers, and the most expensive: performance bought with your own physiology. It is what the Focus & Flow Group is built to interrupt.",
      fit: "high"
    },
    {
      key: "scattered",
      name: "Scattered Focus",
      min: 38, max: 59,
      summary: "Capable, but pulled in a dozen directions.",
      body: "The talent shows up. Attention is what keeps slipping. Task initiation is a daily negotiation, distraction wins more rounds than you would like, and the day tends to run you. What looks like a discipline problem is usually an untrained skill. The Group gives you the structure, and the self-regulation, to aim that capacity at the work worth doing.",
      fit: "high"
    },
    {
      key: "rhythm",
      name: "Finding the Rhythm",
      min: 60, max: 80,
      summary: "The foundation is forming. It is not yet automatic.",
      body: "You have built real skills. You can regulate, you can recover, you can find Flow. What you do not have yet is consistency, so good days and hard days still feel like weather. The Group turns the rhythm you have glimpsed into something you can return to on demand.",
      fit: "medium"
    },
    {
      key: "ceo",
      name: "CEO of Your Nervous System",
      min: 81, max: 100,
      summary: "You lead your state instead of being led by it.",
      body: "You have done the work most people avoid. You regulate under pressure, you recover on purpose, and your hours follow your values. This is what self-mastery looks like in practice. For you the Group is about sharpening an edge you already have, and sustaining it alongside peers who operate where you do.",
      fit: "low"
    }
  ];

  /* ---- PURE SCORING --------------------------------------- */
  // answers: array of chosen option {points, dim} OR array of point
  //          values aligned to QUESTIONS order. We accept the
  //          richer {points} objects produced by the UI.
  // drift:   one of "honest" | "between" | "ideal" | undefined.
  function scoreAssessment(answers, drift) {
    if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
      throw new Error(
        "scoreAssessment expects " + QUESTIONS.length + " answers, got " +
        (Array.isArray(answers) ? answers.length : typeof answers)
      );
    }

    // Per-dimension point totals + max possible.
    var dimTotals = {};
    var dimMax = {};
    DIMENSIONS.forEach(function (d) { dimTotals[d.key] = 0; dimMax[d.key] = 0; });

    var topCount = 0; // how many "3 pt" (idealized-looking) answers
    var rawTotal = 0;

    answers.forEach(function (ans, i) {
      var pts = typeof ans === "number" ? ans : ans.points;
      if (typeof pts !== "number" || pts < 0 || pts > 3) {
        throw new Error("Answer " + i + " has invalid points: " + pts);
      }
      var dim = QUESTIONS[i].dim;
      dimTotals[dim] += pts;
      dimMax[dim] += 3;
      rawTotal += pts;
      if (pts === 3) topCount += 1;
    });

    var maxTotal = QUESTIONS.length * 3;
    var composite = Math.round((rawTotal / maxTotal) * 100);

    // Dimension sub-scores, 0..100.
    var dimensions = DIMENSIONS.map(function (d) {
      return {
        key: d.key,
        label: d.label,
        short: d.short,
        stage: d.stage,
        score: Math.round((dimTotals[d.key] / dimMax[d.key]) * 100)
      };
    });

    // Lowest dimension = the headline lever (ties -> first in canonical order).
    var gap = dimensions.reduce(function (lo, d) {
      return d.score < lo.score ? d : lo;
    }, dimensions[0]);

    // ---- Gating ----
    // Monoculture cap: a too-clean top-tier sweep reads as gamed/
    // unexamined rather than genuinely mastered.
    var monoculture = topCount >= QUESTIONS.length - 1; // 7 or 8 of 8
    var driftIdeal = drift === "ideal";
    var idealized = monoculture || driftIdeal;

    var bandIndex = bandIndexForScore(composite);
    var capped = false;

    // Only cap when the (idealized) result actually lands in the
    // top two bands. If they idealized into a low band anyway,
    // there is nothing to deflate.
    if (idealized && bandIndex >= 2) {
      bandIndex -= 1;
      capped = true;
    }

    var band = BANDS[bandIndex];

    return {
      composite: composite,        // 0..100 (raw, pre-cap)
      bandIndex: bandIndex,        // 0..3 (post-cap)
      band: band,                  // resolved band object
      dimensions: dimensions,      // [{key,label,stage,score}]
      gap: gap,                    // lowest dimension
      idealized: idealized,        // monoculture or drift-ideal
      capped: capped,              // band was deflated one tier
      monoculture: monoculture,
      reasons: {
        monoculture: monoculture,
        driftIdeal: driftIdeal
      }
    };
  }

  function bandIndexForScore(score) {
    for (var i = 0; i < BANDS.length; i++) {
      if (score >= BANDS[i].min && score <= BANDS[i].max) return i;
    }
    return score < 0 ? 0 : BANDS.length - 1;
  }

  /* ---- PRESCRIBED PLAYBOOKS -------------------------------
     The result hands the person the one real Dr. Hogarth playbook
     that matches their gap dimension ("a personalized prescription
     for Flow"). Paths are relative to the /assessment/ page. */
  var PLAYBOOKS = {
    selfcompassion: {
      key: "selfcompassion",
      kicker: "WORKBOOK · SESSION ONE OF THE GROUP",
      title: "Resilience through Self-Compassion",
      desc: "A four-day self-authorship practice to train your nervous system to stay calm under pressure.",
      cover: "../assets/playbook-covers/selfcompassion.png",
      file: "../assets/DrBH-SelfCompassion-Playbook.pdf"
    },
    productivity: {
      key: "productivity",
      kicker: "PLAYBOOK · TOP THREE TOOLS",
      title: "Focus & Flow: Top 3 Tools",
      desc: "The Eisenhower Matrix, the Pomodoro Technique, and the Deep Work Day, to turn scattered effort into focus.",
      cover: "../assets/playbook-covers/productivity.png",
      file: "../assets/DrBH-ProductivityPlaybook.pdf"
    }
  };
  // Regulation and recovery gaps point to nervous-system work;
  // focus and direction gaps point to the productivity toolkit.
  function prescribePlaybook(gapKey) {
    return (gapKey === "regulation" || gapKey === "recovery")
      ? PLAYBOOKS.selfcompassion
      : PLAYBOOKS.productivity;
  }

  /* ---- GAP INSIGHTS ---------------------------------------
     Names the specific concept behind each dimension (drawn from
     Dr. Hogarth's playbooks) so the result reads like a diagnosis,
     and hands off to where the free series begins for that gap.
       focus      -> Deep Work / Pomodoro (Productivity Playbook)
       alignment  -> Eisenhower importance-vs-urgency (Productivity)
       regulation -> Neff self-kindness vs self-criticism (Self-Compassion)
       recovery   -> recovery-as-training (Self-Compassion / sleep) */
  var GAP_INSIGHTS = {
    focus: {
      concept: "Deep Work and protected focus",
      detail: "Your attention leaks because nothing guards it. The fix is structural, not more willpower: protected focus blocks, worked in intervals, with a reliable way back in when you drift.",
      seriesStart: "reclaiming your attention and building a real deep-work block"
    },
    regulation: {
      concept: "self-kindness over self-criticism",
      detail: "Under pressure your default is the inner critic, not the steady hand. Self-compassion is the regulation skill that changes that, and the research is clear that it is trainable.",
      seriesStart: "the daily self-compassion practice that settles the nervous system"
    },
    recovery: {
      concept: "recovery as training, not reward",
      detail: "You treat rest as whatever is left over, so the tank keeps emptying. Recovery is a discipline that makes the performance possible, not the prize for finishing.",
      seriesStart: "rebuilding sleep and recovery as the foundation everything else stands on"
    },
    alignment: {
      concept: "the important over the merely urgent",
      detail: "Your hours go to whatever shouts loudest. Sorting the genuinely important from the merely urgent is what puts your values back in the driver's seat.",
      seriesStart: "anchoring your attention to your real priorities"
    }
  };
  function gapInsight(gapKey) { return GAP_INSIGHTS[gapKey] || null; }

  var api = {
    DIMENSIONS: DIMENSIONS,
    QUESTIONS: QUESTIONS,
    DRIFT_QUESTION: DRIFT_QUESTION,
    BANDS: BANDS,
    PLAYBOOKS: PLAYBOOKS,
    GAP_INSIGHTS: GAP_INSIGHTS,
    scoreAssessment: scoreAssessment,
    bandIndexForScore: bandIndexForScore,
    prescribePlaybook: prescribePlaybook,
    gapInsight: gapInsight
  };

  // UMD-ish: browser global + node/commonjs for the test runner.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.FFScoring = api;
  }
})(typeof self !== "undefined" ? self : this);
