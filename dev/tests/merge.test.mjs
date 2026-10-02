/* Two-device merge test for core/merge.js. Run: node dev/tests/merge.test.mjs
   Simulates iPhone + iPad both open, both studying, syncing in any order — nothing may be lost. */
import assert from "node:assert/strict";
import { mergeState, mergePack, emptyState, emptyPack, importLegacy, mergeExamHist, EXAM_HIST_CAP } from "../../core/merge.js";

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✓", name); };

ok("newer record wins per card, not per file", () => {
  const a = emptyPack(), b = emptyPack();
  a.cards["x|1"] = { seen: 3, right: 2, level: 2, u: 100 }; a.cards["x|2"] = { seen: 1, right: 1, level: 1, u: 50 };
  b.cards["x|1"] = { seen: 2, right: 1, level: 1, u: 90 };  b.cards["x|2"] = { seen: 4, right: 3, level: 2, u: 200 };
  const m = mergePack(a, b);
  assert.equal(m.cards["x|1"].seen, 3); assert.equal(m.cards["x|2"].seen, 4);
});
ok("equal timestamps prefer more progress (retry-safe)", () => {
  const a = emptyPack(), b = emptyPack();
  a.cards.k = { seen: 5, u: 7 }; b.cards.k = { seen: 2, u: 7 };
  assert.equal(mergePack(a, b).cards.k.seen, 5); assert.equal(mergePack(b, a).cards.k.seen, 5);
});
ok("exam history is a union by id, sorted, capped", () => {
  const a = [{ id: "e1", t: 1 }, { id: "e2", t: 2 }], b = [{ id: "e2", t: 2 }, { id: "e3", t: 3 }];
  const m = mergeExamHist(a, b); assert.deepEqual(m.map(h => h.id), ["e1", "e2", "e3"]);
  const big = Array.from({ length: EXAM_HIST_CAP + 10 }, (_, i) => ({ id: "h" + i, t: i }));
  assert.equal(mergeExamHist(big, []).length, EXAM_HIST_CAP);
});
ok("study-day counters take the max, never add twice", () => {
  const a = emptyPack(), b = emptyPack(); a.days["2026-10-02"] = 40; b.days["2026-10-02"] = 25; b.days["2026-10-01"] = 10;
  const m = mergePack(a, b); assert.equal(m.days["2026-10-02"], 40); assert.equal(m.days["2026-10-01"], 10);
});
ok("scalars with timestamps: newer wins, missing side ignored", () => {
  const a = emptyPack(), b = emptyPack(); a.examDate = { v: "2026-10-30", u: 5 }; b.examDate = { v: "2026-11-02", u: 9 };
  assert.equal(mergePack(a, b).examDate.v, "2026-11-02"); assert.equal(mergePack(a, emptyPack()).examDate.v, "2026-10-30");
});
ok("merge is commutative and idempotent", () => {
  const a = emptyState(), b = emptyState();
  a.packs.secplus = emptyPack(); a.packs.secplus.cards.q = { seen: 1, u: 1 }; a.packs.secplus.examHist = [{ id: "e", t: 1 }];
  b.packs.secplus = emptyPack(); b.packs.secplus.cards.r = { seen: 2, u: 2 }; b.packs.ccna = emptyPack(); b.packs.ccna.days["2026-10-02"] = 3;
  const ab = mergeState(a, b), ba = mergeState(b, a);
  assert.deepEqual(ab, ba); assert.deepEqual(mergeState(ab, ab), ab); assert.deepEqual(mergeState(ab, a), ab);
});
ok("two devices both open: interleaved saves lose nothing", () => {
  // remote = Gist; A and B each hold a local copy and push via pull→merge→patch
  let remote = emptyState();
  const A = emptyState(), B = emptyState(); A.packs.secplus = emptyPack(); B.packs.secplus = emptyPack();
  const push = local => { remote = mergeState(local, remote); return remote; };
  const pull = local => mergeState(local, remote);
  A.packs.secplus.cards.c1 = { seen: 1, u: 10 }; push(A);
  B.packs.secplus.cards.c2 = { seen: 1, u: 11 }; push(B);                // B never pulled first — old app would have wiped c1
  A.packs.secplus.cards.c1 = { seen: 2, u: 12 }; push(A);
  B.packs.secplus.examHist.push({ id: "ex1", t: 13 }); push(B);
  const finalA = pull(A), finalB = pull(B);
  assert.deepEqual(finalA, finalB);
  assert.equal(finalA.packs.secplus.cards.c1.seen, 2); assert.equal(finalA.packs.secplus.cards.c2.seen, 1); assert.equal(finalA.packs.secplus.examHist.length, 1);
});
ok("legacy Sec+ Gym Cards payload imports, with category renames", () => {
  const legacy = { stats: { "social|Rootkit": { seen: 4, right: 3, streak: 2, level: 3, due: 0, ivl: 2 }, "crypto|AES": { seen: 1, right: 1, streak: 1, level: 1, due: 0, ivl: 0 } }, pbq: { "o-ir": { attempts: 2, best: 100 } }, exq: {}, examHist: [{ t: 1700000000000, raw: 81, scaled: 748 }], days: { "2026-09-20": 30 }, twins: {}, sprint: { ports: { best: 20, runs: 3 } }, updatedAt: 1700000001000, exam: "2026-10-28", studyHours: "2", remindOn: "no", remindHours: 6, lastStudy: "2026-09-20T10:00:00.000Z", sessionsDone: 7 };
  const st = importLegacy(legacy, "secplus", { "social|Rootkit": "attacks|Rootkit" });
  const p = st.packs.secplus;
  assert.ok(p.cards["attacks|Rootkit"]); assert.ok(!p.cards["social|Rootkit"]); assert.equal(p.cards["attacks|Rootkit"].u, 1700000001000);
  assert.equal(p.examHist[0].id, "legacy-1700000000000"); assert.equal(p.examDate.v, "2026-10-28"); assert.equal(p.studyHours.v, 2);
  assert.equal(st.settings.remind.v.on, false); assert.equal(st.settings.remind.v.hours, 6); assert.equal(p.sessionsDone, 7);
  // importing twice changes nothing
  assert.deepEqual(mergeState(st, importLegacy(legacy, "secplus", { "social|Rootkit": "attacks|Rootkit" })), st);
});
console.log(`merge.test: ${n} passed`);
