/* Scripted grader test for every CCNA lab item (Chat 8). Run: node dev/tests/ccna-labs.test.mjs [filter]
   For each lab in packs/ccna/labs.js:
     fresh    — starting config grades 0 and no task check passes (a check that is already true at the start is a bug)
     primary  — dev/solutions/ccna/<id>.primary.txt scores 1.0 with no guideline penalty
     alt      — <id>.alt.txt (a different valid method / abbreviations) also scores 1.0
     partial  — <id>.partial.txt scores exactly what <id>.partial.json says
     violate  — primary + <id>.violate.txt trips at least one guideline and scores < 1
     blocked  — every item.blocked command is refused by isBlocked() and a few look-alikes are not
   Solution files: one CLI line per line; "! device NAME" switches the device the lines are typed on; "! answer ID text" sets an analyze-lab answer. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const { LABS } = await import(pathToFileURL(path.join(root, "packs/ccna/labs.js")));
const { buildLab, replay, gradeLab, isBlocked } = await import(pathToFileURL(path.join(root, "core/sims/ios/ui/labGrader.js")));
const filter = process.argv[2];
const SOL = path.join(root, "dev/solutions/ccna");

function parseSolution(text) {
  const log = {}, answers = {}; let dev = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    const m = line.match(/^!\s*device\s+(\S+)/i); if (m) { dev = m[1]; log[dev] ||= []; continue; }
    const a = line.match(/^!\s*answer\s+(\S+)\s+(.*)$/i); if (a) { answers[a[1]] = a[2]; continue; }
    if (line.startsWith("!")) continue;
    if (!dev) throw new Error("solution line before any '! device'");
    log[dev].push(line);
  }
  return { log, answers };
}
const sol = (id, kind) => { const p = path.join(SOL, `${id}.${kind}.txt`); return existsSync(p) ? parseSolution(readFileSync(p, "utf8")) : null; };
const near = (a, b) => Math.abs(a - b) < 0.011;
let pass = 0, fail = 0;
const ok = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); } };
const failing = r => r.checks.filter(c => !c.pass && c.task).map(c => `${c.id}:${c.detail}`).join(" | ");

for (const item of LABS) {
  if (filter && !item.id.includes(filter)) continue;
  console.log(item.id);
  ok("schema", () => {
    assert.equal(item.type, "ccna-lab"); assert.ok(item.title && item.obj && item.tasks.length >= 3 && item.checks.length >= 3, "title/obj/tasks/checks");
    const tids = new Set(item.tasks.map(t => t.id)); const cids = new Set();
    for (const c of item.checks) { assert.ok(!cids.has(c.id), "dup check id " + c.id); cids.add(c.id); if (c.task) assert.ok(tids.has(c.task), `check ${c.id} task ${c.task} unknown`); else assert.ok(c.guideline !== undefined && item.guidelines[c.guideline], `check ${c.id} needs task or guideline`); }
    for (const t of item.tasks) assert.ok(item.checks.some(c => c.task === t.id), `task ${t.id} has no check`);
    assert.ok(item.guidelines.length >= 2 && item.checks.filter(c => c.guideline !== undefined).length >= 2, "≥2 guidelines wired to penalty checks");
    assert.ok(item.timeTargetMin >= 5 && item.timeTargetMin <= 7, "5–7 minute target");
  });
  ok("fresh = 0, no task check passes", () => {
    const r = gradeLab(item, replay(buildLab(item), {}), {});
    assert.equal(r.f, 0, "f=" + r.f); assert.equal(r.penalty, 0, "penalty on fresh");
    const pre = r.checks.filter(c => c.task && c.pass); assert.equal(pre.length, 0, "already true: " + pre.map(c => c.id + " " + c.detail).join("; "));
  });
  const p = sol(item.id, "primary");
  ok("primary = 1", () => { assert.ok(p, "missing primary solution"); const r = gradeLab(item, replay(buildLab(item), p.log), p.answers); assert.equal(r.penalty, 0, "penalty: " + r.guidelines.filter(g => !g.pass).map(g => g.detail).join("; ")); assert.equal(r.f, 1, failing(r)); });
  ok("alt = 1", () => { const a = sol(item.id, "alt"); assert.ok(a, "missing alt solution"); const r = gradeLab(item, replay(buildLab(item), a.log), a.answers); assert.equal(r.f, 1, failing(r)); assert.equal(r.penalty, 0); });
  ok("partial = declared", () => {
    const s = sol(item.id, "partial"); const want = JSON.parse(readFileSync(path.join(SOL, `${item.id}.partial.json`), "utf8")).f;
    const r = gradeLab(item, replay(buildLab(item), s.log), s.answers); assert.ok(near(r.f, want), `f=${r.f.toFixed(3)} want ${want} :: ${failing(r)}`); assert.ok(r.f > 0 && r.f < 1, "partial must be strictly between 0 and 1");
  });
  ok("violation costs points", () => {
    const v = sol(item.id, "violate"); assert.ok(v && p, "missing violate solution");
    const log = {}; for (const [d, l] of Object.entries(p.log)) log[d] = l.slice(); for (const [d, l] of Object.entries(v.log)) (log[d] ||= []).push(...l);
    const r = gradeLab(item, replay(buildLab(item), log), p.answers); assert.ok(r.penalty > 0, "no penalty recorded"); assert.ok(r.f < 1, "f still 1");
  });
  if (item.blocked?.length) ok("blocked commands", () => {
    for (const b of item.blocked) { assert.ok(isBlocked(item, b), b); assert.ok(isBlocked(item, "do " + b), "do " + b); }
    assert.ok(isBlocked(item, "sh run")); assert.ok(isBlocked(item, "show running-config interface g0/1"));
    assert.ok(!isBlocked(item, "show ip route")); assert.ok(!isBlocked(item, "show vlan brief")); assert.ok(!isBlocked(item, "show spanning-tree")); assert.ok(!isBlocked(item, "sh ip ospf nei"));
    const lab = replay(buildLab(item), {}); const before = JSON.stringify(lab.state(Object.keys(item.topology.devices)[0]));
    assert.equal(before, JSON.stringify(lab.state(Object.keys(item.topology.devices)[0])));
  });
}
console.log(`\nccna-labs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
