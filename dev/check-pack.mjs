/* Content validator for any pack. Run: node dev/check-pack.mjs secplus
   Checks: schema, every item carries an objective id (obj), category keys exist, card shorts are unique per category,
   exam bank sizes and domain quotas match the manifest, PBQ sim types are registered, order PBQ eq classes are valid. */
import { pathToFileURL } from "node:url";
import path from "node:path";

const id = process.argv[2] || "secplus";
const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const problems = [];
const bad = (m) => problems.push(m);

/* a DOM-free sim registry so we can import the sim modules and ask which types exist */
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const { simTypes } = await import(pathToFileURL(path.join(root, "core/sims/registry.js")));
await import(pathToFileURL(path.join(root, "core/sims/basic.js")));
await import(pathToFileURL(path.join(root, "core/sims/generators.js")));
const types = new Set(simTypes());

const m = (await import(pathToFileURL(path.join(root, `packs/${id}/pack.js`)))).default;
const c = await m.load();
const OBJ = m.objPattern ? new RegExp(m.objPattern) : /^[1-9]\.[1-9][0-9]?$/;   /* packs with multi-level objective ids (Microsoft skills bullets) declare objPattern */
const cats = new Set(Object.keys(m.cats));
const doms = new Set(m.sections.map(s => s.d));

/* cards */
const shorts = {};
c.cards.forEach((cd, i) => {
  const key = cd.c + "|" + cd.q;
  if (!cats.has(cd.c)) bad(`card ${i} unknown category ${cd.c}`);
  if (!cd.q || !cd.a || !cd.x) bad(`card ${key} missing q/a/x`);
  if (!OBJ.test(cd.obj || "")) bad(`card ${key} missing obj`);
  if (cd.q.length > 90) bad(`card ${key} q > 90 chars`);
  const lines = cd.a.split("\n"); const big = lines.find(l => l.startsWith("#"));
  const short = (cd.s || (big ? big.slice(1) : lines[0])).trim();
  const g = cd.g ? "g:" + cd.g : "c:" + cd.c;
  (shorts[g] = shorts[g] || {})[short] = (shorts[g][short] || 0) + 1;
  if (cd.c === "ports" && !/^\d/.test(short)) bad(`port card ${key} short must start with a digit`);
});
for (const [g, map] of Object.entries(shorts)) for (const [s, n] of Object.entries(map)) if (n > 1) bad(`duplicate short in ${g}: "${s}" ×${n}`);
m.sections.forEach(s => s.decks.forEach(k => { const n = c.cards.filter(x => x.c === k).length; if (n < 8) bad(`deck ${k} has ${n} cards (<8, MC distractors starve)`); }));

/* exam-style questions */
const stems = new Set();
(c.exq || []).forEach(q => {
  if (!/^x\d{3}$/.test(q.id)) bad(`exq bad id ${q.id}`);
  if (!doms.has(q.d)) bad(`exq ${q.id} bad domain`);
  if (!OBJ.test(q.obj || "")) bad(`exq ${q.id} missing obj`); else if (q.obj.split(".")[0] !== String(q.d)) bad(`exq ${q.id} obj ${q.obj} not in domain ${q.d}`);
  if (!Array.isArray(q.o) || q.o.length !== 4) bad(`exq ${q.id} needs 4 options`);
  if (!q.w || !Array.isArray(q.n) || q.n.length !== 3) bad(`exq ${q.id} needs w and 3 n`);
  if (stems.has(q.q)) bad(`exq ${q.id} duplicate stem`); stems.add(q.q);
});

/* twins */
(c.twins || []).forEach(t => { if (!t.a || !t.b || !t.n || !Array.isArray(t.s) || t.s.length < 4) bad(`twin ${t.a}|${t.b} malformed`); if (!OBJ.test(t.obj || "")) bad(`twin ${t.a}|${t.b} missing obj`); t.s.forEach(st => { if (!["a", "b"].includes(st[1])) bad(`twin ${t.a}|${t.b} statement side must be a/b`); }); });

/* PBQ items (lab + generators + exam) */
function checkPbq(p, where) {
  if (!p.id || !p.type || !p.title) bad(`${where} PBQ missing id/type/title`);
  if (!types.has(p.type)) bad(`${where} PBQ ${p.id} unknown sim type ${p.type}`);
  if (!OBJ.test(p.obj || "")) bad(`${where} PBQ ${p.id} missing obj`);
  if (p.d !== undefined && !doms.has(p.d)) bad(`${where} PBQ ${p.id} bad domain`);
  if (p.type === "match" && (!Array.isArray(p.pairs) || p.pairs.length < 4)) bad(`${where} PBQ ${p.id} needs ≥4 pairs`);
  if (p.type === "order") { if (!Array.isArray(p.steps) || p.steps.length < 3) bad(`${where} PBQ ${p.id} needs ≥3 steps`); (p.eq || []).forEach(g => g.forEach(i => { if (i < 0 || i >= p.steps.length) bad(`${where} PBQ ${p.id} eq index ${i} out of range`); })); }
  if (p.type === "exhibit") { if (!Array.isArray(p.qs) || !p.qs.length) bad(`${where} PBQ ${p.id} needs qs`); (p.qs || []).forEach((sq, i) => { if (!sq.q || !Array.isArray(sq.o) || sq.o.length !== 4 || !sq.x) bad(`${where} PBQ ${p.id} sub ${i} malformed`); }); }
  if (p.type === "scenario" && (!p.q || !Array.isArray(p.opts) || p.opts.length !== 4 || !p.why)) bad(`${where} PBQ ${p.id} scenario malformed`);
}
(c.lab || []).forEach(p => checkPbq(p, "lab")); (c.generators || []).forEach(p => checkPbq(p, "gen"));
Object.entries(c.pbqs || {}).forEach(([x, list]) => { if (list.length !== (m.exam.pbqCount ?? 5)) bad(`exam ${x} has ${list.length} PBQs, expected ${m.exam.pbqCount || 5}`); list.forEach(p => checkPbq(p, "exam " + x)); });

/* exam banks */
const nQ = m.exam.count - (m.exam.pbqCount ?? 5);
Object.entries(c.banks || {}).forEach(([x, bank]) => {
  if (bank.length !== nQ) bad(`bank ${x} has ${bank.length} questions, expected ${nQ}`);
  const byD = {}; let ms = 0, ex = 0;
  bank.forEach(q => {
    if (!new RegExp(`^${x}\\d{3}$`).test(q.id)) bad(`bank ${x} bad id ${q.id}`);
    if (!doms.has(q.d)) bad(`bank ${q.id} bad domain`); byD[q.d] = (byD[q.d] || 0) + 1;
    if (!cats.has(q.cat)) bad(`bank ${q.id} unknown cat ${q.cat}`);
    if (!OBJ.test(q.obj || "")) bad(`bank ${q.id} missing obj`); else if (q.obj.split(".")[0] !== String(q.d)) bad(`bank ${q.id} obj ${q.obj} not in domain ${q.d}`);
    if (!["mc", "ms"].includes(q.t)) bad(`bank ${q.id} bad type`);
    const okN = (q.o || []).filter(o => o.ok).length;
    if (q.t === "mc" && (q.o.length !== 4 || okN !== 1)) bad(`bank ${q.id} mc needs 4 options, 1 correct (has ${okN})`);
    if (q.t === "ms") { ms++; if (q.o.length < 5 || okN !== q.pick) bad(`bank ${q.id} ms needs ≥5 options and pick=${q.pick} correct (has ${okN})`); }
    if (q.ex) ex++;
    (q.o || []).forEach((o, i) => { if (!o.t || !o.x) bad(`bank ${q.id} option ${i} missing t/x`); if (o.t.length > 130) bad(`bank ${q.id} option ${i} > 130 chars`); });
    if (!q.w) bad(`bank ${q.id} missing w`); if (q.q.length > 420) bad(`bank ${q.id} stem > 420 chars`);
    if (stems.has(q.q)) bad(`bank ${q.id} duplicate stem`); stems.add(q.q);
  });
  for (const d in m.exam.mixQuota) if ((byD[d] || 0) !== m.exam.mixQuota[d]) bad(`bank ${x} domain ${d}: ${byD[d] || 0} questions, quota ${m.exam.mixQuota[d]}`);
  const minMs = m.exam.minMs ?? 8, minEx = m.exam.minEx ?? 10;
  if (ms < minMs) bad(`bank ${x} has ${ms} multi-select (<${minMs})`); if (ex < minEx) bad(`bank ${x} has ${ex} exhibits (<${minEx})`);
});

/* objective coverage summary */
const cover = {};
[...c.cards, ...(c.exq || []), ...(c.twins || []), ...(c.lab || []), ...Object.values(c.banks || {}).flat(), ...Object.values(c.pbqs || {}).flat()].forEach(i => { if (i.obj) cover[i.obj] = (cover[i.obj] || 0) + 1; });
const objs = Object.keys(cover).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
console.log(`pack ${id}: ${c.cards.length} cards · ${(c.exq || []).length} exq · ${(c.twins || []).length} twins · ${(c.lab || []).length} lab + ${(c.generators || []).length} generators · banks ${Object.values(c.banks || {}).map(b => b.length).join("/")} · exam PBQs ${Object.values(c.pbqs || {}).map(b => b.length).join("/")}`);
console.log("objective coverage: " + objs.map(o => `${o}:${cover[o]}`).join(" "));
const examOnly = {}; [...Object.values(c.banks || {}).flat(), ...Object.values(c.pbqs || {}).flat()].forEach(i => { examOnly[i.obj] = (examOnly[i.obj] || 0) + 1; });
const missing = objs.filter(o => !examOnly[o]); if (missing.length) console.log("WARN objectives with no exam-bank items: " + missing.join(", "));
if (problems.length) { console.log(`FAIL (${problems.length})`); problems.slice(0, 60).forEach(p => console.log(" - " + p)); process.exit(1); }
console.log("PASS");
