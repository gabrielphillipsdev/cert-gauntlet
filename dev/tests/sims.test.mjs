/* Grader tests for the simulation components. Run: node dev/tests/sims.test.mjs [pack]
   Part 1: unit tests of each sim's scoring rules (diagram, appanel, hardening, calculator, valOk).
   Part 2: every authored item of those types in the pack — a blank attempt scores 0, the key scores 1,
   a one-mistake attempt scores strictly between, and touching an off-spec control costs points (no silent full marks). */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const imp = rel => import(pathToFileURL(path.join(root, rel)));
const { sim } = await imp("core/sims/registry.js");
await imp("core/sims/diagram.js"); await imp("core/sims/appanel.js"); await imp("core/sims/hardening.js"); await imp("core/sims/generators.js");
const { calcEval, valOk } = await imp("core/sims/ui.js");
const { FIELDS, DEFAULT_START } = await imp("core/sims/appanel.js");

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✓", name); };
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* ---------- part 1: rules ---------- */
ok("calculator: percent key, precedence, division by zero, garbage", () => {
  assert.equal(calcEval("250000×40%"), 100000); assert.equal(calcEval("100000*0.5"), 50000); assert.equal(calcEval("1+2*3"), 7);
  assert.equal(calcEval("12−2÷4"), 11.5); assert.equal(calcEval("5/0"), null); assert.equal(calcEval("abc"), null); assert.equal(calcEval("-3+5"), 2); assert.equal(calcEval("4+"), null);
});
ok("valOk: strings are case/space-insensitive, arrays are alternatives, {re} is a pattern, booleans exact", () => {
  assert.ok(valOk(" CorpSecure ", "corpsecure")); assert.ok(valOk("ips", ["ids", "ips"])); assert.ok(!valOk("waf", ["ids", "ips"]));
  assert.ok(valOk("Sixteen-characters!", { re: "^.{16,}$" })); assert.ok(!valOk("short", { re: "^.{16,}$" })); assert.ok(valOk(false, false)); assert.ok(!valOk("false", false));
});
const D = sim("diagram"), dItem = { slots: [{ id: "a", label: "A", want: "firewall" }, { id: "b", label: "B", want: ["ids", "ips"] }, { id: "c", label: "C", want: "waf" }], palette: ["firewall", "ids", "ips", "waf", "proxy"], nodes: [], links: [] };
ok("diagram: per-slot partial credit, alternatives accepted, blank = 0", () => {
  let st = D.create(dItem); assert.equal(D.score(dItem, st).f, 0); assert.equal(D.answered(dItem, st), false);
  st.place = { a: "firewall", b: "ips", c: "waf" }; assert.equal(D.score(dItem, st).f, 1);
  st.place = { a: "firewall", b: "ids" }; assert.ok(near(D.score(dItem, st).f, 2 / 3)); assert.ok(D.score(dItem, st).notes[0].includes("left empty"));
  st.place = { a: "proxy", b: "waf", c: "ids" }; assert.equal(D.score(dItem, st).f, 0); assert.equal(D.answered(dItem, st), true);
});
ok("diagram: palette order is shuffled into state so a resumed exam keeps it", () => { const st = D.create(dItem); assert.equal(st.pal.length, 5); assert.deepEqual(st.pal.slice().sort(), dItem.palette.slice().sort()); });

const A = sim("appanel"), aItem = { start: { mode: "WPA2-Personal", psk: "password123", wps: true, radiusPort: "1645" }, want: { mode: "WPA3-Enterprise", eap: "EAP-TLS", radiusHost: "10.0.5.20", radiusPort: "1812", wps: false } };
ok("appanel: per-field credit, unnecessary change costs half a point, hidden-mode fields are ignored", () => {
  let st = A.create(aItem); assert.equal(A.score(aItem, st).f, 0); assert.equal(A.answered(aItem, st), false);
  Object.assign(st.v, { mode: "WPA3-Enterprise", eap: "EAP-TLS", radiusHost: "10.0.5.20", radiusPort: "1812", wps: false }); assert.equal(A.score(aItem, st).f, 1);
  st.v.hidden = true; assert.ok(near(A.score(aItem, st).f, 4.5 / 5));
  st.v.hidden = false; st.v.psk = "changed-but-irrelevant-in-enterprise-mode"; assert.equal(A.score(aItem, st).f, 1, "PSK is hidden in Enterprise mode, so changing it is not penalized");
  st.v.eap = "PEAP (MSCHAPv2)"; assert.ok(near(A.score(aItem, st).f, 4 / 5));
  st = A.create(aItem); st.v.hidden = true; st.v.macFilter = "Deny list"; assert.equal(A.score(aItem, st).f, 0, "penalties never go below zero");
});
ok("appanel: FIELDS and DEFAULT_START agree", () => { FIELDS.forEach(f => assert.ok(f.k in DEFAULT_START, f.k)); });

const H = sim("hardening"), hItem = { controls: [{ id: "t", l: "Telnet", t: "toggle", start: true, want: false }, { id: "f", l: "Firewall", t: "toggle", start: false, want: true }, { id: "n", l: "nginx", t: "toggle", start: true, crit: true }, { id: "c", l: "cups", t: "toggle", start: true }, { id: "p", l: "Patch", t: "select", o: ["Auto", "Window"], start: "Auto", want: "Window" }] };
ok("hardening: per-control credit; breaking the business function costs a full point, extra changes half", () => {
  let st = H.create(hItem); assert.equal(H.score(hItem, st).f, 0);
  st.v.t = false; st.v.f = true; st.v.p = "Window"; assert.equal(H.score(hItem, st).f, 1);
  st.v.c = false; assert.ok(near(H.score(hItem, st).f, 2.5 / 3));
  st.v.c = true; st.v.n = false; assert.ok(near(H.score(hItem, st).f, 2 / 3)); assert.ok(H.score(hItem, st).notes.some(x => x.includes("breaks the stated business function")));
  st = H.create(hItem); st.v.n = false; assert.equal(H.score(hItem, st).f, 0);
});
ok("generated sims keep their problem on Reset (state.g survives)", () => {
  const G = sim("risk"); const st = G.create({}); const g = st.g; const again = { ...G.create({}), g: st.g }; assert.equal(again.g, g); assert.equal(again.sle, "");
});

/* ---------- part 2: every authored item ---------- */
const packId = process.argv[2] || "secplus";
const m = (await imp(`packs/${packId}/pack.js`)).default; const c = await m.load();
const items = [...(c.lab || []), ...Object.values(c.pbqs || {}).flat()].filter(p => ["diagram", "appanel", "hardening"].includes(p.type));
function solve(p, st) {
  if (p.type === "diagram") p.slots.forEach(sl => st.place[sl.id] = Array.isArray(sl.want) ? sl.want[0] : sl.want);
  if (p.type === "appanel") Object.entries(p.want).forEach(([k, w]) => st.v[k] = Array.isArray(w) ? w[0] : (w && w.re) ? (w.sample || "Sample-Passphrase-With-Length-01") : w);
  if (p.type === "hardening") p.controls.forEach(ct => { if (ct.want !== undefined) st.v[ct.id] = Array.isArray(ct.want) ? ct.want[0] : ct.want; });
}
function breakOne(p, st) {   // undo the first scored control
  if (p.type === "diagram") delete st.place[p.slots[0].id];
  if (p.type === "appanel") { const k = Object.keys(p.want)[0]; st.v[k] = { ...DEFAULT_START, ...(p.start || {}) }[k]; }
  if (p.type === "hardening") { const ct = p.controls.find(x => x.want !== undefined); st.v[ct.id] = ct.start; }
}
function touchOffSpec(p, st) {  // change something the task did not ask for; returns false if the item has no such control
  if (p.type === "appanel") { const f = FIELDS.find(f => p.want[f.k] === undefined && (!f.when || f.when(st.v)) && f.t === "toggle"); if (!f) return false; st.v[f.k] = !st.v[f.k]; return true; }
  if (p.type === "hardening") { const ct = p.controls.find(x => x.want === undefined); if (!ct) return false; st.v[ct.id] = ct.t === "toggle" ? !ct.start : ct.o.find(o => o !== ct.start); return true; }
  return false;
}
let checked = 0;
for (const p of items) {
  const S = sim(p.type);
  const blank = S.create(p); assert.equal(S.score(p, blank).f, 0, `${p.id}: blank attempt must score 0`); assert.equal(S.answered(p, blank), false, `${p.id}: blank must not count as answered`);
  const full = S.create(p); solve(p, full); const r = S.score(p, full); assert.equal(r.f, 1, `${p.id}: the key must score 1 — ${r.notes.join(" | ")}`); assert.equal(S.answered(p, full), true);
  const one = S.create(p); solve(p, one); breakOne(p, one); const f1 = S.score(p, one).f; assert.ok(f1 > 0 && f1 < 1, `${p.id}: one mistake should score between 0 and 1, got ${f1}`);
  const off = S.create(p); solve(p, off); if (touchOffSpec(p, off)) { const f2 = S.score(p, off).f; assert.ok(f2 < 1, `${p.id}: an off-spec change must cost points`); }
  if (p.type === "appanel") { const st = S.create(p); Object.keys(p.want).forEach(k => assert.ok(!valOk(st.v[k], p.want[k]), `${p.id}: scored field ${k} already correct at start`)); }
  if (p.type === "hardening") p.controls.filter(x => x.want !== undefined).forEach(ct => assert.ok(!valOk(ct.start, ct.want), `${p.id}: control ${ct.id} already at its wanted value`));
  assert.ok(JSON.stringify(full).length < 20000, `${p.id}: state too large to sync`); JSON.parse(JSON.stringify(full));
  checked++;
}
console.log(`  ✓ ${checked} authored ${packId} sim items: blank=0, key=1, one-mistake partial, off-spec change penalized`);
console.log(`sims.test: ${n + 1} passed`);
