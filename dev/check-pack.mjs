/* Content validator for any pack. Run: node dev/check-pack.mjs secplus
   Checks: schema, every item carries an objective id (obj), category keys exist, card shorts are unique per category,
   exam bank sizes and domain quotas match the manifest, PBQ sim types are registered, order PBQ eq classes are valid,
   Chat 3 sim schemas (diagram/appanel/hardening) are well-formed and a blank attempt scores 0, exam PBQ mix rules (manifest exam.pbqMust). */
import { pathToFileURL } from "node:url";
import path from "node:path";

const id = process.argv[2] || "secplus";
const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const problems = [];
const bad = (m) => problems.push(m);

/* a DOM-free sim registry so we can import the sim modules and ask which types exist */
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const { simTypes, sim } = await import(pathToFileURL(path.join(root, "core/sims/registry.js")));
import { readdirSync } from "node:fs";
for (const f of readdirSync(path.join(root, "core/sims")).filter(f => f.endsWith(".js") && !["registry.js", "ui.js"].includes(f)).sort()) await import(pathToFileURL(path.join(root, "core/sims", f)));
await import(pathToFileURL(path.join(root, "core/sims/kql/drill.js")));     /* KQL Lab sim (Chat 6) */
await import(pathToFileURL(path.join(root, "core/exam/msitems.js")));      /* hot-area sim + Microsoft exam item types (Chat 6) */
const m = (await import(pathToFileURL(path.join(root, `packs/${id}/pack.js`)))).default;
const c = await m.load();
const types = new Set(simTypes());   /* read after load(): packs may import sim modules from subfolders (CCNA: core/sims/ios/ui) */
const OBJ_RE = m.objPattern ? new RegExp(m.objPattern) : /^[1-9]\.[1-9][0-9]?$/;   /* packs with multi-level objective ids (Microsoft skills bullets) declare objPattern */
const OBJ = { test: o => Array.isArray(o) ? o.length > 0 && o.every(x => OBJ_RE.test(x)) : OBJ_RE.test(o || "") };   /* an item may span two bullets: obj = ["1.1.9", "1.1.7"], first is primary */
const primary = o => Array.isArray(o) ? o[0] : o;
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
  if (!OBJ.test(q.obj || "")) bad(`exq ${q.id} missing obj`); else if (primary(q.obj).split(".")[0] !== String(q.d)) bad(`exq ${q.id} obj ${q.obj} not in domain ${q.d}`);
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
  /* Chat 3 sims */
  if (["diagram", "appanel", "hardening"].includes(p.type) && (!Array.isArray(p.task) || p.task.length < 2)) bad(`${where} PBQ ${p.id} needs task:[≥2 lines] for the task pane`);
  if (p.type === "diagram") {
    if (!Array.isArray(p.nodes) || !Array.isArray(p.slots) || p.slots.length < 3 || !Array.isArray(p.palette)) bad(`${where} PBQ ${p.id} diagram needs nodes, ≥3 slots, palette`);
    else {
      const ids = new Set([...p.nodes.map(n => n.id), ...p.slots.map(s => s.id)]);
      (p.links || []).forEach(([a, b]) => { if (!ids.has(a) || !ids.has(b)) bad(`${where} PBQ ${p.id} link ${a}-${b} references an unknown id`); });
      p.slots.forEach(sl => { const w = Array.isArray(sl.want) ? sl.want : [sl.want]; if (!w.length || !w.some(x => p.palette.includes(x))) bad(`${where} PBQ ${p.id} slot ${sl.id} wants ${w.join("/")} which is not in the palette`); });
      const wants = p.slots.map(sl => Array.isArray(sl.want) ? sl.want[0] : sl.want); if (!p.reuse && new Set(wants).size !== wants.length) bad(`${where} PBQ ${p.id} two slots want the same device without reuse:true`);
      const W = p.w || 480, H = p.h || 300; [...p.nodes, ...p.slots].forEach(n => { if (n.x < 0 || n.x > W || n.y < 0 || n.y > H) bad(`${where} PBQ ${p.id} ${n.id} is outside the viewBox`); });
    }
  }
  if (p.type === "appanel") {
    if (!p.want || !Object.keys(p.want).length) bad(`${where} PBQ ${p.id} appanel needs want`);
    else Object.keys(p.want).forEach(k => { if (!["ssid", "hidden", "band", "mode", "psk", "eap", "radiusHost", "radiusPort", "radiusSecret", "pmf", "wps", "macFilter", "isolation", "mgmtWifi", "adminDefault"].includes(k)) bad(`${where} PBQ ${p.id} appanel unknown field ${k}`); });
  }
  if (p.type === "hardening") {
    if (!Array.isArray(p.controls) || !p.controls.some(c => c.want !== undefined)) bad(`${where} PBQ ${p.id} hardening needs controls with want`);
    else { const ids = new Set(); const gs = new Set((p.groups || [{ id: "all" }]).map(g => g.id)); p.controls.forEach(c => { if (ids.has(c.id)) bad(`${where} PBQ ${p.id} duplicate control ${c.id}`); ids.add(c.id); if (!gs.has(c.g || "all")) bad(`${where} PBQ ${p.id} control ${c.id} in unknown group ${c.g}`); if (c.t === "select" && (!Array.isArray(c.o) || !c.o.includes(c.start) || (c.want !== undefined && !c.o.includes(c.want)))) bad(`${where} PBQ ${p.id} control ${c.id} start/want not in options`); if (c.t === "toggle" && typeof c.start !== "boolean") bad(`${where} PBQ ${p.id} control ${c.id} toggle start must be boolean`); }); }
  }
  /* every sim type must grade a blank attempt at 0 and not throw on its own key (deeper checks live in dev/tests/sims.test.mjs) */
  if (types.has(p.type) && !sim(p.type).generated) { try { const st = sim(p.type).create(p); const r = sim(p.type).score(p, st); if (typeof r.f !== "number" || r.f !== 0) bad(`${where} PBQ ${p.id} blank attempt scores ${r.f}, expected 0`); } catch (e) { bad(`${where} PBQ ${p.id} create/score threw: ${e.message}`); } }
}
(c.lab || []).forEach(p => checkPbq(p, "lab")); (c.generators || []).forEach(p => checkPbq(p, "gen"));
/* exams with lab slots must actually get their labs — fillLabSlots() silently drops a bank it cannot fill */
if (m.exam.labSlots) Object.keys(m.exam.banks || {}).forEach(x => { if (!(c.pbqs || {})[x]) bad(`exam ${x} has no lab items: a LAB_SLOTS topic has no matching lab (check each lab's \`topic\`)`); });
Object.entries(c.pbqs || {}).forEach(([x, list]) => {
  if (list.length !== (m.exam.pbqCount ?? 5)) bad(`exam ${x} has ${list.length} PBQs, expected ${m.exam.pbqCount || 5}`);
  list.forEach(p => { checkPbq(p, "exam " + x); if (p.d === undefined) bad(`exam ${x} PBQ ${p.id} needs d for domain scoring`); });
  const gen = list.filter(p => types.has(p.type) && sim(p.type).generated).map(p => p.type); if (new Set(gen).size !== gen.length) bad(`exam ${x} has two generated PBQs of the same type`);
  (m.exam.pbqMust || []).forEach(t => { if (!list.some(p => p.type === t)) (types.has(t) ? bad : (msg => console.log("WARN " + msg)))(`exam ${x} has no ${t} PBQ (required by manifest exam.pbqMust${types.has(t) ? "" : "; type not built yet"})`); });
});
const allPbqIds = [...(c.lab || []), ...(c.generators || []), ...Object.values(c.pbqs || {}).flat()].map(p => p.id);
allPbqIds.forEach((id, i) => { if (allPbqIds.indexOf(id) !== i) bad(`duplicate PBQ id ${id}`); });

/* exam-level rules */
if (m.exam.backtrack === false && (m.exam.caseFirst || m.exam.seriesLast)) bad("exam.backtrack:false cannot be combined with Microsoft sectioning (caseFirst/seriesLast)");
if (m.exam.bankTypes && (m.exam.itemTypes || []).length) bad("declare drag-drop types in exam.bankTypes OR exam.itemTypes, not both");
const qsum = Object.values(m.exam.mixQuota || {}).reduce((a, b) => a + b, 0); if (Object.keys(c.banks || {}).length && qsum !== m.exam.count - (m.exam.pbqCount ?? 5)) bad(`mixQuota sums to ${qsum}, expected ${m.exam.count - (m.exam.pbqCount ?? 5)}`);

/* exam banks (Microsoft-format packs declare exam.itemTypes and ship banks flattened: case questions as x001-n, series solutions as x040-n) */
const nQ = m.exam.count - (m.exam.pbqCount ?? 5);
const allowed = new Set(m.exam.bankTypes || m.exam.itemTypes || ["mc", "ms"]);   /* bankTypes: drag-drop item types in a pack that does NOT use Microsoft sectioning (CCNA) */
Object.entries(c.banks || {}).forEach(([x, bank]) => {
  if (bank.length !== nQ) bad(`bank ${x} has ${bank.length} questions, expected ${nQ}`);
  const byD = {}; let ms = 0, ex = 0;
  if (m.exam.caseFirst) { const cases = new Set(bank.filter(q => q.caseId).map(q => q.caseId)); if (cases.size !== 1) bad(`bank ${x} should carry exactly one case study, has ${cases.size}`); const n = bank.filter(q => q.caseId).length; if (n < 6 || n > 9) bad(`bank ${x} case study has ${n} questions (want 6–9)`); }
  if (m.exam.seriesLast) { const ser = new Set(bank.filter(q => q.t === "series").map(q => q.seriesId)); if (ser.size !== 1) bad(`bank ${x} should carry exactly one solution series, has ${ser.size}`); const sol = bank.filter(q => q.t === "series"); if (sol.length !== 4) bad(`bank ${x} series has ${sol.length} solutions (want 4)`); const okN = sol.filter(q => q.ok).length; if (okN < 1 || okN > 2) bad(`bank ${x} series has ${okN} Yes answers (want 1–2)`); }
  bank.forEach(q => {
    if (!new RegExp(`^${x}\\d{3}(-\\d+)?$`).test(q.id)) bad(`bank ${x} bad id ${q.id}`);
    if (!doms.has(q.d)) bad(`bank ${q.id} bad domain`); byD[q.d] = (byD[q.d] || 0) + 1;
    if (!cats.has(q.cat)) bad(`bank ${q.id} unknown cat ${q.cat}`);
    if (!OBJ.test(q.obj || "")) bad(`bank ${q.id} missing obj`); else if (primary(q.obj).split(".")[0] !== String(q.d)) bad(`bank ${q.id} obj ${q.obj} not in domain ${q.d}`);
    if (!allowed.has(q.t)) bad(`bank ${q.id} bad type ${q.t}`);
    const okN = (q.o || []).filter(o => o.ok).length;
    if (q.t === "mc" && (q.o.length !== 4 || okN !== 1)) bad(`bank ${q.id} mc needs 4 options, 1 correct (has ${okN})`);
    if (q.t === "ms") { ms++; if (q.o.length < 5 || okN !== q.pick) bad(`bank ${q.id} ms needs ≥5 options and pick=${q.pick} correct (has ${okN})`); }
    if (q.t === "order" || q.t === "build") { if (!Array.isArray(q.pool) || q.pool.length < 4 || q.pool.length > 8) bad(`bank ${q.id} pool must have 4–8 entries`); if (!Array.isArray(q.answer) || !q.answer.length) bad(`bank ${q.id} answer missing`); else { q.answer.forEach(i => { if (!Number.isInteger(i) || i < 0 || i >= (q.pool || []).length) bad(`bank ${q.id} answer index ${i} out of range`); }); if (new Set(q.answer).size !== q.answer.length) bad(`bank ${q.id} answer repeats an index`); } if (q.t === "order" && q.answer && q.answer.length !== (q.pool || []).length) bad(`bank ${q.id} order must use every pool item`); if (q.t === "build" && q.answer && q.answer.length >= (q.pool || []).length) bad(`bank ${q.id} build list needs distractors in the pool`); (q.alt || []).forEach((a, k) => { if (!Array.isArray(a) || a.length !== q.answer.length) bad(`bank ${q.id} alt ${k} length`); }); if (!q.x) bad(`bank ${q.id} missing x`); }
    if (q.t === "hot") { if (!Array.isArray(q.regions) || q.regions.length < 4 || q.regions.length > 8) bad(`bank ${q.id} hot needs 4–8 regions`); else if (q.regions.filter(r => r.ok).length !== (q.pick || 1)) bad(`bank ${q.id} hot ok-region count ≠ pick`); if (!("img" in q)) bad(`bank ${q.id} hot needs img (null until screenshots)`); if (!q.screen) bad(`bank ${q.id} hot needs screen text`); }
    if (q.t === "series") { if (!q.scenario || !q.s || typeof q.ok !== "boolean" || !q.x) bad(`bank ${q.id} series solution malformed`); }
    if (q.caseId && !(q.tabs && ["overview", "environment", "requirements", "issues"].every(k => q.tabs[k] && q.tabs[k].length >= 300))) bad(`bank ${q.id} case tabs incomplete`);
    if (q.ex) ex++;
    (q.o || []).forEach((o, i) => { if (!o.t || !o.x) bad(`bank ${q.id} option ${i} missing t/x`); if (o.t.length > 130) bad(`bank ${q.id} option ${i} > 130 chars`); });
    if (!q.w) bad(`bank ${q.id} missing w`); if ((q.q || "").length > (m.exam.itemTypes || m.exam.bankTypes ? 520 : 420)) bad(`bank ${q.id} stem > ${m.exam.itemTypes || m.exam.bankTypes ? 520 : 420} chars`);
    if (stems.has(q.q)) bad(`bank ${q.id} duplicate stem`); stems.add(q.q);
  });
  for (const d in m.exam.mixQuota) if ((byD[d] || 0) !== m.exam.mixQuota[d]) bad(`bank ${x} domain ${d}: ${byD[d] || 0} questions, quota ${m.exam.mixQuota[d]}`);
  const minMs = m.exam.minMs ?? 8, minEx = m.exam.minEx ?? 10;
  if (ms < minMs) bad(`bank ${x} has ${ms} multi-select (<${minMs})`); if (ex < minEx) bad(`bank ${x} has ${ex} exhibits (<${minEx})`);
});

/* objective coverage summary */
const cover = {};
[...c.cards, ...(c.exq || []), ...(c.twins || []), ...(c.lab || []), ...Object.values(c.banks || {}).flat(), ...Object.values(c.pbqs || {}).flat()].forEach(i => { if (i.obj) cover[primary(i.obj)] = (cover[primary(i.obj)] || 0) + 1; });
const objs = Object.keys(cover).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
console.log(`pack ${id}: ${c.cards.length} cards · ${(c.exq || []).length} exq · ${(c.twins || []).length} twins · ${(c.lab || []).length} lab + ${(c.generators || []).length} generators · banks ${Object.values(c.banks || {}).map(b => b.length).join("/")} · exam PBQs ${Object.values(c.pbqs || {}).map(b => b.length).join("/")}`);
console.log("objective coverage: " + objs.map(o => `${o}:${cover[o]}`).join(" "));
const examOnly = {}; [...Object.values(c.banks || {}).flat(), ...Object.values(c.pbqs || {}).flat()].forEach(i => { examOnly[primary(i.obj)] = (examOnly[primary(i.obj)] || 0) + 1; });
const related = (o, e) => o === e || o.startsWith(e + ".") || e.startsWith(o + ".");   /* "1.13" (topic) and "1.13.a" (sub-topic) cover each other */
const missing = objs.filter(o => !Object.keys(examOnly).some(e => related(o, e))); if (missing.length) console.log("WARN objectives with no exam-bank items: " + missing.join(", "));
if (problems.length) { console.log(`FAIL (${problems.length})`); problems.slice(0, 60).forEach(p => console.log(" - " + p)); process.exit(1); }
console.log("PASS");
