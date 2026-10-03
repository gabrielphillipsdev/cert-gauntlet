/* Scripted tests for CCNA config-order and topology-label PBQs (Chat 8). Run: node dev/tests/ccna-pbq.test.mjs
   order: the canonical order types cleanly (no IOS errors) and scores 1; the reversed order scores < 1; a blank attempt scores 0;
          every single-line move that still produces the required config is ACCEPTED (scores 1) — i.e. grading really is "any working order";
          at least one single-line move per item breaks it (the item actually tests ordering).
   topo:  the key scores 1, a blank 0, a wrong label < 1; keys are re-derived by dev/tools/gen-pbq.mjs --check. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } }, head: null };
globalThis.window = { addEventListener() { } };
const { sim } = await import(pathToFileURL(path.join(root, "core/sims/registry.js")));
const { runOrder, canonical, orderWorks } = await import(pathToFileURL(path.join(root, "core/sims/ios/ui/configOrder.js")));
await import(pathToFileURL(path.join(root, "core/sims/diagram.js")));
const { PBQ_ORDER, PBQ_TOPO } = await import(pathToFileURL(path.join(root, "packs/ccna/pbq.js")));
let pass = 0, fail = 0;
const ok = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); } };
const S = sim("ccna-order");
console.log("config order");
for (const it of PBQ_ORDER) ok(it.id, () => {
  const c = canonical(it); assert.equal(c.errors.length, 0, "canonical errors: " + c.errors.map(e => e.line).join("; "));
  const n = it.steps.length, idx = [...Array(n).keys()];
  assert.equal(S.score(it, { items: idx, seq: idx }).f, 1, "canonical");
  assert.ok(S.score(it, { items: idx, seq: idx.slice().reverse() }).f < 1, "reversed should fail");
  assert.equal(S.score(it, S.create(it)).f, 0, "blank");
  let works = 0, breaks = 0;
  for (let from = 0; from < n; from++) for (let to = 0; to < n; to++) {
    if (from === to) continue; const seq = idx.slice(); const [v] = seq.splice(from, 1); seq.splice(to, 0, v);
    const w = orderWorks(it, seq); const f = S.score(it, { items: seq, seq }).f;
    if (w) { works++; assert.equal(f, 1, `working move ${from}→${to} not accepted`); } else { breaks++; assert.ok(f < 1, `broken move ${from}→${to} scored 1`); }
  }
  assert.ok(breaks > 0, "no single move breaks the config — the item does not test order");
  console.log(`      ${works} single-line moves still work (accepted), ${breaks} break it`);
});
console.log("topology labels");
const D = sim("diagram");
for (const it of PBQ_TOPO) ok(it.id, () => {
  const st = D.create(it); assert.equal(D.score(it, st).f, 0, "blank");
  for (const s of it.slots) st.place[s.id] = s.want; assert.equal(D.score(it, st).f, 1, "key");
  const s0 = it.slots[0]; st.place[s0.id] = it.palette.find(p => p !== s0.want); assert.ok(D.score(it, st).f < 1, "wrong label");
});
ok("generated file matches the simulator (gen-pbq --check)", () => { execFileSync("node", [path.join(root, "dev/tools/gen-pbq.mjs"), "--check"], { stdio: "pipe" }); });
console.log(`\nccna-pbq: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
