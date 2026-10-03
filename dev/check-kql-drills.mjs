/* Validator for the SC-200 KQL Lab drills.  Run: node dev/check-kql-drills.mjs
   Checks schema, skills-bullet ids, uniqueness, that every reference query runs against the lab tables and returns rows,
   that every "fix it" buggy query is actually broken (errors or differs from the reference), that every "predict it"
   distractor produces a different result from the reference and from each other, and the per-mode counts. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runKql, sameResult, KqlError } from "../core/sims/kql/kql.js";
import { LAB_DB } from "../core/sims/kql/tables.js";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const { SC200_KQL_DRILLS: D } = await import(pathToFileURL(path.join(root, "packs/sc200/kql-drills.js")));
const skills = JSON.parse(readFileSync(path.join(root, "dev/specs/skills-sc200.json"), "utf8"));
const bullets = new Set(); skills.domains.forEach(d => d.groups.forEach(g => Object.keys(g.bullets).forEach(b => bullets.add(b))));
const problems = []; const bad = m => problems.push(m);
const ids = new Set(), prompts = new Set(); const modes = { write: 0, fix: 0, predict: 0 };
const run = q => runKql(q, LAB_DB);
D.forEach((d, i) => {
  const tag = `${d.id || "#" + i} (${d.mode})`;
  if (!/^k\d{3}$/.test(d.id || "")) bad(`${tag}: id must be kNNN`);
  if (ids.has(d.id)) bad(`${tag}: duplicate id`); ids.add(d.id);
  if (d.type !== "kql") bad(`${tag}: type must be "kql"`);
  if (!["write", "fix", "predict"].includes(d.mode)) { bad(`${tag}: bad mode`); return; } modes[d.mode]++;
  if (!d.title || !d.prompt || !d.ref || !d.why) bad(`${tag}: title/prompt/ref/why required`);
  if (!bullets.has(d.obj)) bad(`${tag}: unknown obj ${d.obj}`);
  if (d.cat !== "kql" || d.d !== 3) bad(`${tag}: cat must be kql and d 3 (lab deck)`);
  if (!Array.isArray(d.tables) || !d.tables.length) bad(`${tag}: tables list required`); else d.tables.forEach(t => { if (!LAB_DB.tables[t]) bad(`${tag}: unknown table ${t}`); });
  const pk = d.prompt.toLowerCase(); if (prompts.has(pk)) bad(`${tag}: duplicate prompt`); prompts.add(pk);
  let ref; try { ref = run(d.ref); } catch (e) { bad(`${tag}: reference query fails — ${e.message.split("\n")[0]}`); return; }
  if (!ref.rows.length) bad(`${tag}: reference query returns no rows`);
  if (ref.rows.length > 60 && d.mode === "predict") bad(`${tag}: predict output has ${ref.rows.length} rows (keep ≤ 60 so options fit on a phone)`);
  if (/\|\s*(sort|order|top)\b/.test(d.ref) && !d.ordered && d.mode !== "write") console.log(`WARN ${tag}: reference sorts but ordered is not set`);
  if (d.mode === "fix") {
    if (!d.buggy) { bad(`${tag}: buggy query required`); return; }
    if (d.buggy.trim() === d.ref.trim()) bad(`${tag}: buggy equals reference`);
    try { const b = run(d.buggy); if (sameResult(b, ref, { ordered: !!d.ordered, names: !!d.names }).ok) bad(`${tag}: buggy query produces the same result as the reference — it isn't broken`); }
    catch (e) { if (!(e instanceof KqlError)) bad(`${tag}: buggy query crashed the interpreter: ${e.message}`); }
  }
  if (d.mode === "predict") {
    if (!Array.isArray(d.alts) || d.alts.length !== 3) { bad(`${tag}: predict needs exactly 3 alts`); return; }
    const outs = [ref];
    d.alts.forEach((q, k) => {
      try { const r = run(q); if (!r.rows.length && !ref.rows.length) bad(`${tag}: alt ${k + 1} and reference are both empty`); outs.forEach((o, j) => { if (sameResult(r, o, { ordered: !!d.ordered, strict: true }).ok) bad(`${tag}: alt ${k + 1} produces the same output as ${j === 0 ? "the reference" : "alt " + j}`); }); outs.push(r); }
      catch (e) { if (!(e instanceof KqlError)) bad(`${tag}: alt ${k + 1} crashed: ${e.message}`); else outs.push({ cols: [], rows: [], err: e.message }); }
    });
  }
  if (d.mode === "write" && d.hint && d.hint.length > 200) console.log(`WARN ${tag}: hint is long`);
});
console.log(`kql drills: ${D.length} total · write ${modes.write} · fix ${modes.fix} · predict ${modes.predict}`);
if (D.length < 60) bad(`need ≥ 60 drills, have ${D.length}`);
if (modes.write < 20 || modes.fix < 15 || modes.predict < 12) bad(`mode mix below target (write ≥20, fix ≥15, predict ≥12)`);
const objs = {}; D.forEach(d => objs[d.obj] = (objs[d.obj] || 0) + 1); console.log("objective coverage: " + Object.entries(objs).sort().map(([k, v]) => `${k}:${v}`).join(" "));
if (problems.length) { console.log(`FAIL (${problems.length})`); problems.forEach(p => console.log(" - " + p)); process.exit(1); }
console.log("PASS");
