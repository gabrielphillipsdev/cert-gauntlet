/* CCNA content checker (Chat 9) — validates one content file (or all) against dev/specs/ccna.md and dev/specs/skills-ccna.json.
   Run from the repo root:
     node dev/check-ccna.mjs packs/ccna/cards-d3.js        one file (cards, twins or bank, detected from the export name)
     node dev/check-ccna.mjs all                           every CCNA content file + counts vs targets
   Stricter than dev/check-pack.mjs: the obj must be a real v1.1 topic (and sub-letter), the card/question category must belong to the
   obj's domain, length limits, Cisco-style multi-response wording, drag-drop schema. check-pack.mjs still runs the generic rules. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const skills = JSON.parse(readFileSync(path.join(root, "dev/specs/skills-ccna.json"), "utf8"));
const TOPIC = {}; const CAT_DOM = {};
for (const dm of skills.domains) for (const [id, t] of Object.entries(dm.topics)) { TOPIC[id] = { ...t, d: dm.d }; CAT_DOM[t.cat] = dm.d; }
const objOk = o => { const m = /^([1-6]\.\d{1,2})(?:\.([a-h]))?$/.exec(o || ""); if (!m || !TOPIC[m[1]]) return false; return !m[2] || !!(TOPIC[m[1]].sub && TOPIC[m[1]].sub[m[2]]); };
const domOf = o => +String(o).split(".")[0];
const prim = o => Array.isArray(o) ? o[0] : o;

let problems = [], warns = [];
const bad = m => problems.push(m), warn = m => warns.push(m);

function checkCards(list, where) {
  const shorts = {};
  list.forEach((cd, i) => {
    const k = `${where} card ${i} (${(cd.q || "").slice(0, 40)})`;
    if (!cd.c || !(cd.c in CAT_DOM)) bad(`${k}: unknown category ${cd.c}`);
    if (!objOk(cd.obj)) bad(`${k}: obj ${cd.obj} is not a v1.1 topic`); else if (CAT_DOM[cd.c] !== domOf(cd.obj)) bad(`${k}: obj ${cd.obj} not in the domain of category ${cd.c}`);
    if (!cd.q || !cd.a || !cd.x) bad(`${k}: missing q/a/x`);
    if ((cd.q || "").length > 90) bad(`${k}: q ${cd.q.length} > 90`);
    if (cd.a && !cd.a.startsWith("#")) bad(`${k}: a must start with a #headline line`);
    if (cd.a && cd.a.split("\n").length > 4) warn(`${k}: a has more than 4 lines`);
    if ((cd.x || "").length < 160 || (cd.x || "").length > 560) warn(`${k}: x length ${(cd.x || "").length} outside 160–560`);
    if (cd.s && cd.s.length > 60) bad(`${k}: s > 60`);
    if (cd.w && cd.w.length > 120) warn(`${k}: w > 120`);
    const short = (cd.s || (cd.a || "").split("\n")[0].replace(/^#/, "")).trim();
    const g = cd.g ? "g:" + cd.g : "c:" + cd.c; (shorts[g] = shorts[g] || {}); if (shorts[g][short]) bad(`${k}: duplicate short "${short}" in ${g}`); shorts[g][short] = 1;
    if (/[<>]/.test(cd.q + cd.a) && !/->|<-|=>|<=|>=/.test(cd.q + cd.a)) warn(`${k}: angle brackets (content is plain text; fine for CLI syntax like <cr>)`);
  });
}
function checkTwins(list, where) {
  const pairs = new Set();
  list.forEach((t, i) => {
    const k = `${where} twin ${i} (${t.a} | ${t.b})`;
    if (!t.a || !t.b || !t.n) bad(`${k}: missing a/b/n`);
    if (!objOk(t.obj)) bad(`${k}: bad obj ${t.obj}`);
    if (!Array.isArray(t.s) || t.s.length < 4 || t.s.length > 6) bad(`${k}: needs 4–6 statements`);
    else { const na = t.s.filter(s => s[1] === "a").length, nb = t.s.filter(s => s[1] === "b").length; if (na < 2 || nb < 2) bad(`${k}: needs ≥2 statements per side`); if (t.s.some(s => !["a", "b"].includes(s[1]) || !s[0])) bad(`${k}: statement malformed`); }
    const key = [t.a, t.b].sort().join("|"); if (pairs.has(key)) bad(`${k}: duplicate pair`); pairs.add(key);
    if ((t.n || "").length > 480) warn(`${k}: n > 480`);
  });
}
const MS_WORD = /\(Choose (two|three)\.\)\s*$/;
function checkBank(list, where, letter) {
  const stems = new Set(); const byD = {}; const types = {}; let ex = 0;
  list.forEach((q, i) => {
    const k = `${where} ${q.id || "#" + i}`;
    if (letter && !new RegExp(`^${letter}\\d{3}$`).test(q.id || "")) bad(`${k}: id must be ${letter}NNN`);
    if (!objOk(prim(q.obj))) bad(`${k}: obj ${q.obj} is not a v1.1 topic`); else if (domOf(prim(q.obj)) !== q.d) bad(`${k}: obj ${q.obj} not in domain ${q.d}`);
    if (!(q.cat in CAT_DOM)) bad(`${k}: unknown cat ${q.cat}`); else if (CAT_DOM[q.cat] !== q.d) bad(`${k}: cat ${q.cat} not in domain ${q.d}`);
    byD[q.d] = (byD[q.d] || 0) + 1; types[q.t] = (types[q.t] || 0) + 1;
    if (!q.q || q.q.length > 420) bad(`${k}: stem missing or > 420 chars`);
    if (stems.has(q.q)) bad(`${k}: duplicate stem`); stems.add(q.q);
    if (!q.w || q.w.length > 280) bad(`${k}: w missing or > 280`);
    if (q.ex) { ex++; const lines = q.ex.split("\n").length; if (lines > 26) warn(`${k}: exhibit ${lines} lines (> 26)`); if (q.ex.split("\n").some(l => l.length > 78)) warn(`${k}: exhibit line > 78 chars (wraps on iPhone)`); }
    if (q.t === "mc" || q.t === "ms") {
      const okN = (q.o || []).filter(o => o.ok).length;
      if (q.t === "mc" && ((q.o || []).length !== 4 || okN !== 1)) bad(`${k}: mc needs 4 options, 1 ok (has ${(q.o || []).length}/${okN})`);
      if (q.t === "ms") { if (![2, 3].includes(q.pick) || (q.o || []).length < 5 || (q.o || []).length > 6 || okN !== q.pick) bad(`${k}: ms needs pick 2|3, 5–6 options, pick ok (has ${okN})`); if (!MS_WORD.test(q.q)) bad(`${k}: ms stem must end with "(Choose two.)" / "(Choose three.)"`); else if ((q.pick === 2) !== /two/.test(q.q.match(MS_WORD)[1])) bad(`${k}: ms wording disagrees with pick`); }
      const texts = new Set(); (q.o || []).forEach((o, j) => { if (!o.t || !o.x) bad(`${k}: option ${j} missing t/x`); if ((o.t || "").length > 130) bad(`${k}: option ${j} > 130`); if ((o.x || "").length > 300) warn(`${k}: option ${j} x > 300`); if (texts.has(o.t)) bad(`${k}: duplicate option text`); texts.add(o.t); });
    } else if (q.t === "order" || q.t === "build") {
      if (!Array.isArray(q.pool) || q.pool.length < 4 || q.pool.length > 8) bad(`${k}: pool 4–8`);
      if (!Array.isArray(q.answer) || !q.answer.length) bad(`${k}: answer missing`);
      else { if (q.answer.some(j => !Number.isInteger(j) || j < 0 || j >= q.pool.length)) bad(`${k}: answer index out of range`); if (new Set(q.answer).size !== q.answer.length) bad(`${k}: answer repeats`); }
      if (q.t === "order" && q.answer && q.pool && q.answer.length !== q.pool.length) bad(`${k}: order must use every pool item`);
      if (q.t === "build" && q.answer && q.pool && q.answer.length >= q.pool.length) bad(`${k}: build needs distractors`);
      if (q.t === "build" && typeof q.ordered !== "boolean") bad(`${k}: build needs ordered:true|false`);
      (q.alt || []).forEach((a, j) => { if (!Array.isArray(a) || a.length !== (q.answer || []).length) bad(`${k}: alt ${j} length`); });
      if (!q.x) bad(`${k}: missing x`);
      if (q.pool && new Set(q.pool).size !== q.pool.length) bad(`${k}: duplicate pool entries`);
    } else bad(`${k}: type ${q.t} not allowed (mc, ms, order, build)`);
    if (/\b(Cisco Systems|Boson|Jeremy|Odom|ExSim)\b/.test(JSON.stringify(q))) warn(`${k}: mentions a vendor/author name`);
  });
  return { byD, types, ex };
}

async function loadFile(f) {
  const mod = await import(pathToFileURL(path.resolve(root, f)) + "?t=" + Date.now());
  return Object.entries(mod);
}
async function one(f) {
  for (const [name, list] of await loadFile(f)) {
    if (!Array.isArray(list)) continue;
    if (/CARDS/.test(name)) checkCards(list, name);
    else if (/TWINS/.test(name)) checkTwins(list, name);
    else if (/BANK/.test(name)) { const letter = (name.match(/BANK_([A-C])/) || [])[1]; const r = checkBank(list, name, letter ? letter.toLowerCase() : null); console.log(`${name}: ${list.length} items · domains ${JSON.stringify(r.byD)} · types ${JSON.stringify(r.types)} · exhibits ${r.ex}`); }
    console.log(`${f} → ${name}: ${list.length}`);
  }
}

const arg = process.argv[2] || "all";
if (arg !== "all") await one(arg);
else {
  const files = ["cards-d1", "cards-d2", "cards-d3", "cards-d4", "cards-d5", "cards-d6", "twins", "bank-a", "bank-b", "bank-c"].map(f => `packs/ccna/${f}.js`);
  const allCards = [];
  for (const f of files) {
    if (!existsSync(path.join(root, f))) { bad(`${f} missing`); continue; }
    for (const [name, list] of await loadFile(f)) {
      if (/CARDS/.test(name)) { checkCards(list, name); allCards.push(...list); }
      else if (/TWINS/.test(name)) { checkTwins(list, name); if (list.length < 45) bad(`twins ${list.length} < 45`); console.log(`twins: ${list.length}`); }
      else if (/BANK/.test(name)) {
        const letter = name.match(/BANK_([A-C])/)[1].toLowerCase(); const r = checkBank(list, name, letter);
        console.log(`${name}: ${list.length} · domains ${JSON.stringify(r.byD)} · types ${JSON.stringify(r.types)} · exhibits ${r.ex}`);
        if (list.length !== 100) bad(`${name}: ${list.length} questions (want 100)`);
        const quota = { 1: 20, 2: 20, 3: 25, 4: 10, 5: 15, 6: 10 }; for (const d in quota) if ((r.byD[d] || 0) !== quota[d]) bad(`${name}: domain ${d} has ${r.byD[d] || 0}, quota ${quota[d]}`);
        if ((r.types.ms || 0) < 10) bad(`${name}: ${r.types.ms || 0} multi-response (<10)`); if ((r.types.order || 0) < 4) bad(`${name}: ${r.types.order || 0} order drag-drops (<4)`); if ((r.types.build || 0) < 4) bad(`${name}: ${r.types.build || 0} build drag-drops (<4)`); if (r.ex < 30) bad(`${name}: ${r.ex} exhibits (<30)`);
      }
    }
  }
  const byC = {}; allCards.forEach(c => byC[c.c] = (byC[c.c] || 0) + 1);
  const byD = {}; allCards.forEach(c => byD[domOf(c.obj)] = (byD[domOf(c.obj)] || 0) + 1);
  console.log(`cards: ${allCards.length} · by domain ${JSON.stringify(byD)}`); console.log(`by deck ${JSON.stringify(byC)}`);
  if (allCards.length < 430) bad(`cards ${allCards.length} < 430`);
  for (const c of Object.keys(CAT_DOM)) if ((byC[c] || 0) < 8) bad(`deck ${c} has ${byC[c] || 0} cards (<8)`);
  const topics = Object.keys(TOPIC); const cov = new Set(allCards.map(c => String(c.obj).split(".").slice(0, 2).join(".")));
  const miss = topics.filter(t => !cov.has(t)); if (miss.length) bad(`topics with no cards: ${miss.join(", ")}`);
}
warns.slice(0, 40).forEach(w => console.log("WARN " + w)); if (warns.length > 40) console.log(`WARN … ${warns.length - 40} more`);
if (problems.length) { console.log(`FAIL (${problems.length})`); problems.slice(0, 80).forEach(p => console.log(" - " + p)); process.exit(1); }
console.log(`PASS (${warns.length} warnings)`);
