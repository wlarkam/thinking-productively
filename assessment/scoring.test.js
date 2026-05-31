/* ============================================================
   Unit tests for the Focus & Flow scoring core.
   Run: node assessment/scoring.test.js
   No framework, no deps. Exits non-zero on first failure.
   ============================================================ */
var S = require("./scoring.js");

var passed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    process.exit(1);
  }
  passed++;
}

var N = S.QUESTIONS.length;
function fill(pts) {
  var a = [];
  for (var i = 0; i < N; i++) a.push({ points: pts, dim: S.QUESTIONS[i].dim });
  return a;
}

/* ---- Boundaries ----------------------------------------- */
var lowest = S.scoreAssessment(fill(0), "honest");
assert(lowest.composite === 0, "all-zero answers score 0");
assert(lowest.band.key === "adrenaline", "all-zero lands in Running on Adrenaline");
assert(!lowest.capped, "honest low score is not capped");

// All-threes is a perfect sweep -> monoculture -> idealized -> capped
// down one tier from CEO to Finding the Rhythm.
var perfect = S.scoreAssessment(fill(3), "honest");
assert(perfect.composite === 100, "all-three answers score 100");
assert(perfect.monoculture === true, "all-three triggers monoculture flag");
assert(perfect.capped === true, "monoculture sweep is capped");
assert(perfect.band.key === "rhythm", "capped CEO falls to Finding the Rhythm");

/* ---- A genuine high scorer (mixed top answers, no sweep) - */
// Six 3s and two 2s = 22/24 ~= 92, only 6 top answers -> not monoculture.
var genuineHigh = [3, 3, 3, 3, 3, 3, 2, 2].map(function (p, i) {
  return { points: p, dim: S.QUESTIONS[i].dim };
});
var gh = S.scoreAssessment(genuineHigh, "honest");
assert(gh.monoculture === false, "6-of-8 top answers is not a monoculture sweep");
assert(gh.band.key === "ceo", "genuine high scorer reaches CEO uncapped");
assert(!gh.capped, "genuine high scorer is not capped");

/* ---- Mid band ------------------------------------------- */
var mid = S.scoreAssessment(fill(2), "honest"); // 16/24 ~= 67
assert(mid.composite === 67, "all-two answers score 67");
assert(mid.band.key === "rhythm", "all-two lands in Finding the Rhythm");

/* ---- Drift gate caps an honest-looking high score -------- */
// Same genuine-high pattern, but the user admits it was aspirational.
var driftCap = S.scoreAssessment(genuineHigh, "ideal");
assert(driftCap.capped === true, "drift=ideal caps a top-band result");
assert(driftCap.band.key === "rhythm", "drift cap drops CEO to Finding the Rhythm");
assert(driftCap.reasons.driftIdeal === true, "drift reason is recorded");

// Drift=ideal on an already-low score does NOT deflate further.
var driftLow = S.scoreAssessment(fill(0), "ideal");
assert(driftLow.capped === false, "drift cap does not touch a bottom band");
assert(driftLow.band.key === "adrenaline", "bottom band stays bottom under drift");

/* ---- Dimension map + gap detection ---------------------- */
// Tank one dimension (recovery) to the floor, others high.
var gapAnswers = S.QUESTIONS.map(function (q) {
  return { points: q.dim === "recovery" ? 0 : 3, dim: q.dim };
});
var gapRes = S.scoreAssessment(gapAnswers, "honest");
assert(gapRes.gap.key === "recovery", "lowest dimension is identified as the gap");
var recDim = gapRes.dimensions.filter(function (d) { return d.key === "recovery"; })[0];
assert(recDim.score === 0, "tanked dimension reads 0");
assert(gapRes.dimensions.length === 4, "four dimensions returned");

/* ---- Input validation ----------------------------------- */
var threw = false;
try { S.scoreAssessment([1, 2, 3], "honest"); } catch (e) { threw = true; }
assert(threw, "wrong answer count throws");

threw = false;
try { S.scoreAssessment(fill(9), "honest"); } catch (e) { threw = true; }
assert(threw, "out-of-range points throw");

console.log("ok - " + passed + " assertions passed");
