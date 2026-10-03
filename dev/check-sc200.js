#!/usr/bin/env node
// Validators for the SC-200 pack and the AZ-900 / SC-900 warm-up decks.
//   node dev/check-sc200.js all
//   node dev/check-sc200.js cards | twins | portal | bank a | bank b | bank c | fund az900 | fund sc900
// Exit 1 on any ERR. WARNs are advisory (length limits).
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const what = (args[0] || "all").toLowerCase();
const arg2 = (args[1] || "").toLowerCase();
const errs = [], warns = [];
const E = (m) => errs.push(m), W = (m) => warns.push(m);

function loadSkills(name) { return JSON.parse(fs.readFileSync(path.join(__dirname, "specs", `skills-${name}.json`), "utf8")); }
function bulletIndex(sk) {
  const b = {}; for (const d of sk.domains) for (const g of d.groups) for (const id in g.bullets) b[id] = { d: d.d, g: g.g, text: g.bullets[id] };
  return b;
}
function loadConst(rel, name) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { E(`${rel} missing`); return null; }
  const src = fs.readFileSync(f, "utf8");
  if (!/^export\s+const\s+/m.test(src)) E(`${rel}: must \`export const ${name}\` (ES module, see dev/ENGINE.md)`);
  const ctx = {}; vm.createContext(ctx);
  try { vm.runInContext(src.replace(/^export\s+const\s+/m, "const ") + `;this.__X=${name};`, ctx); } catch (e) { E(`${rel}: parse error — ${e.message}`); return null; }
  if (!Array.isArray(ctx.__X)) { E(`${rel}: ${name} is not an array`); return null; }
  return ctx.__X;
}
const HTML = /<\/?[a-z][^>]*>/i;
function objOk(tag, obj, B, wantDomain, cat, CATS) {
  const list = Array.isArray(obj) ? obj : [obj];
  if (!list.length || list.some(o => typeof o !== "string")) { E(`${tag}: obj missing`); return; }
  list.forEach((o, i) => {
    if (!B[o]) { E(`${tag}: unknown obj ${o}`); return; }
    if (i === 0 && wantDomain && B[o].d !== wantDomain) E(`${tag}: obj ${o} is domain ${B[o].d}, item says ${wantDomain}`);
    if (i === 0 && cat && CATS[cat] && CATS[cat].d !== B[o].d) E(`${tag}: cat ${cat} is domain ${CATS[cat].d} but obj ${o} is domain ${B[o].d}`);
  });
}
function shortOf(c) { const lines = (c.a || "").split("\n"); const big = lines.find(l => l.startsWith("#")); return (c.s || (big ? big.slice(1) : lines[0]) || "").trim(); }

// ---------------- cards (shared by sc200 + fundamentals) ----------------
function checkCards(cards, sk, label, { domainOf } = {}) {
  const B = bulletIndex(sk), CATS = sk.categories, targets = sk.cardTargets || {};
  const byCat = {}, qs = new Set(), shorts = {}, objCount = {};
  let hooks = 0;
  cards.forEach((c, i) => {
    const tag = `${label}#${i + 1} [${c.c}] ${(c.q || "").slice(0, 40)}`;
    if (!CATS[c.c]) { E(`${tag}: bad category`); return; }
    if (domainOf && CATS[c.c].d !== domainOf) E(`${tag}: category ${c.c} is domain ${CATS[c.c].d}, file is domain ${domainOf}`);
    objOk(tag, c.obj, B, null, c.c, CATS);
    const ob = Array.isArray(c.obj) ? c.obj[0] : c.obj; objCount[ob] = (objCount[ob] || 0) + 1;
    if (typeof c.q !== "string" || c.q.length < 3) E(`${tag}: missing q`);
    if (c.q && c.q.length > 90) W(`${tag}: q ${c.q.length} chars (>90)`);
    if (typeof c.a !== "string" || !c.a) E(`${tag}: missing a`);
    if (c.a && c.a.split("\n").length > 3) W(`${tag}: a has ${c.a.split("\n").length} lines (>3)`);
    if (typeof c.x !== "string" || c.x.length < 200) E(`${tag}: x missing or <200 chars`);
    if (c.x && c.x.length > 560) W(`${tag}: x ${c.x.length} chars (>560)`);
    if (c.w) { hooks++; if (c.w.length > 120) W(`${tag}: w ${c.w.length} chars (>120)`); }
    if (c.k && typeof c.k !== "string") E(`${tag}: k must be a string`);
    const s = shortOf(c); if (!s) E(`${tag}: empty short`); if (s.length > 60) W(`${tag}: short ${s.length} chars (>60): "${s}"`);
    const key = c.c + "|" + c.q.toLowerCase().trim(); if (qs.has(key)) E(`${tag}: duplicate q in category`); qs.add(key);
    const skey = c.c + "|" + s.toLowerCase(); if (shorts[skey]) E(`${tag}: short "${s}" duplicates ${shorts[skey]}`); shorts[skey] = tag;
    if (HTML.test(c.q + c.a + c.x)) E(`${tag}: HTML tags not allowed`);
    byCat[c.c] = (byCat[c.c] || 0) + 1;
  });
  return { byCat, objCount, hooks };
}
function finishCards(all, sk, label) {
  const CATS = sk.categories, targets = sk.cardTargets || {};
  for (const k in CATS) {
    const n = all.byCat[k] || 0;
    if (n < 8) E(`${label}: category ${k} has ${n} cards (<8)`);
    if (targets[k] && (n < Math.floor(targets[k] * 0.9) || n > Math.ceil(targets[k] * 1.15))) E(`${label}: category ${k} has ${n} cards, target ${targets[k]} (±10%)`);
  }
  const B = bulletIndex(sk);
  const missing = Object.keys(B).filter(id => !all.objCount[id]);
  if (missing.length) E(`${label}: skills bullets with no card: ${missing.join(", ")}`);
  const total = Object.values(all.byCat).reduce((a, b) => a + b, 0);
  console.log(`${label}: ${total} cards`, JSON.stringify(all.byCat), `hooks ${all.hooks}`);
}

function runSc200Cards() {
  const sk = loadSkills("sc200");
  const acc = { byCat: {}, objCount: {}, hooks: 0 };
  for (const d of [1, 2, 3]) {
    const cards = loadConst(`packs/sc200/cards-d${d}.js`, `SC200_CARDS_D${d}`); if (!cards) continue;
    const r = checkCards(cards, sk, `sc200-d${d}`, { domainOf: d });
    for (const k in r.byCat) acc.byCat[k] = (acc.byCat[k] || 0) + r.byCat[k];
    for (const k in r.objCount) acc.objCount[k] = (acc.objCount[k] || 0) + r.objCount[k];
    acc.hooks += r.hooks;
  }
  finishCards(acc, sk, "sc200 cards");
  const total = Object.values(acc.byCat).reduce((a, b) => a + b, 0);
  if (total < 380) E(`sc200 cards: ${total} total, target ~400 (min 380)`);
}

// ---------------- twins ----------------
function runTwins() {
  const sk = loadSkills("sc200"), B = bulletIndex(sk);
  const T = loadConst("packs/sc200/twins.js", "SC200_TWINS"); if (!T) return;
  const pairs = new Set();
  T.forEach((t, i) => {
    const g = `twin #${i + 1} ${t.a}/${t.b}`;
    if (!t.a || !t.b || !t.n || t.n.length < 40) E(`${g}: a/b/n`);
    if (t.a && t.b && t.a.toLowerCase() === t.b.toLowerCase()) E(`${g}: a equals b`);
    const pk = [t.a, t.b].map(s => (s || "").toLowerCase()).sort().join("|"); if (pairs.has(pk)) E(`${g}: duplicate pair`); pairs.add(pk);
    objOk(g, t.obj, B);
    if (!Array.isArray(t.s) || t.s.length < 4) E(`${g}: need ≥4 statements`);
    else {
      const a = t.s.filter(x => x[1] === "a").length, b = t.s.filter(x => x[1] === "b").length;
      if (a < 2 || b < 2) E(`${g}: need ≥2 statements each side`);
      if (t.s.length > 6) W(`${g}: ${t.s.length} statements (>6)`);
      t.s.forEach(x => { if (!Array.isArray(x) || !["a", "b"].includes(x[1]) || typeof x[0] !== "string" || x[0].length < 8) E(`${g}: bad statement ${JSON.stringify(x)}`); });
      if (new Set(t.s.map(x => (x[0] || "").toLowerCase())).size !== t.s.length) E(`${g}: duplicate statement`);
    }
    if (HTML.test(t.n + t.a + t.b)) E(`${g}: HTML`);
  });
  if (T.length < 50) E(`twins: ${T.length} (<50)`);
  console.log(`sc200 twins: ${T.length}`);
}

// ---------------- portal / hot-area deck ----------------
const PORTALS = new Set(["defender", "azure", "purview", "entra", "intune"]);
function checkHot(tag, q, { requirePath = false } = {}) {
  if (!Array.isArray(q.regions) || q.regions.length < 4 || q.regions.length > 8) E(`${tag}: regions must be 4–8`);
  else {
    const ok = q.regions.filter(r => r.ok === true).length, pick = q.pick || 1;
    if (ok !== pick) E(`${tag}: ${ok} ok regions but pick=${pick}`);
    q.regions.forEach((r, k) => { if (typeof r.l !== "string" || r.l.length < 2) E(`${tag}: region ${k} label`); if (typeof r.ok !== "boolean") E(`${tag}: region ${k} ok not boolean`); });
    if (new Set(q.regions.map(r => r.l.toLowerCase().trim())).size !== q.regions.length) E(`${tag}: duplicate region labels`);
  }
  if (!("img" in q)) E(`${tag}: img field required (null until screenshots land)`);
  if (q.img !== null && typeof q.img !== "string") E(`${tag}: img must be null or path`);
  if (requirePath) {
    if (!Array.isArray(q.path) || q.path.length < 2) E(`${tag}: path needs ≥2 entries`);
    if (typeof q.target !== "string" || q.target.length < 10) E(`${tag}: target`);
    if (!PORTALS.has(q.portal)) E(`${tag}: portal must be one of ${[...PORTALS].join("|")}`);
  }
}
function runPortal() {
  const sk = loadSkills("sc200"), B = bulletIndex(sk);
  const P = loadConst("packs/sc200/portal.js", "SC200_PORTAL"); if (!P) return;
  const ids = new Set(), qs = new Set(), dom = { 1: 0, 2: 0, 3: 0 }, portals = {};
  P.forEach((p, i) => {
    const tag = `portal #${i + 1} ${p.id}`;
    const want = "p" + String(i + 1).padStart(3, "0"); if (p.id !== want) E(`${tag}: id should be ${want}`);
    if (ids.has(p.id)) E(`${tag}: dup id`); ids.add(p.id);
    objOk(tag, p.obj, B); const ob = Array.isArray(p.obj) ? p.obj[0] : p.obj; if (B[ob]) dom[B[ob].d]++;
    if (typeof p.q !== "string" || p.q.length < 15) E(`${tag}: q`);
    const k = (p.q || "").toLowerCase().trim(); if (qs.has(k)) E(`${tag}: duplicate q`); qs.add(k);
    checkHot(tag, p, { requirePath: true });
    portals[p.portal] = (portals[p.portal] || 0) + 1;
    if (typeof p.x !== "string" || p.x.length < 60) E(`${tag}: x`);
    if (HTML.test(p.q + p.x + (p.target || ""))) E(`${tag}: HTML`);
  });
  if (P.length !== 60) E(`portal: ${P.length} items, need 60`);
  if (dom[1] < 28 || dom[2] < 10 || dom[3] < 6) E(`portal: domain spread ${JSON.stringify(dom)}; need ≥28/≥10/≥6`);
  console.log(`sc200 portal: ${P.length}`, JSON.stringify(dom), JSON.stringify(portals));
}

// ---------------- banks ----------------
const STEM_LIMIT = 500, OPT_LIMIT = 120, X_LIMIT = 280, W_LIMIT = 260;
function checkOptions(tag, q) {
  if (!Array.isArray(q.o)) { E(`${tag}: no options`); return; }
  const n = q.o.length, ok = q.o.filter(o => o.ok === true).length;
  if (q.t === "mc" && n !== 4) E(`${tag}: mc needs 4 options, has ${n}`);
  if (q.t === "mc" && ok !== 1) E(`${tag}: mc needs exactly 1 ok, has ${ok}`);
  if (q.t === "ms") { if (![2, 3].includes(q.pick)) E(`${tag}: ms needs pick 2|3`); if (n < 5 || n > 6) E(`${tag}: ms needs 5–6 options, has ${n}`); if (ok !== q.pick) E(`${tag}: ms pick=${q.pick} but ${ok} ok`); }
  q.o.forEach((o, k) => {
    if (typeof o.t !== "string" || !o.t) E(`${tag}: option ${k} no text`);
    if (o.t && o.t.length > OPT_LIMIT) W(`${tag}: option ${k} ${o.t.length} chars (>${OPT_LIMIT})`);
    if (typeof o.ok !== "boolean") E(`${tag}: option ${k} ok not boolean`);
    if (typeof o.x !== "string" || o.x.length < 15) E(`${tag}: option ${k} missing explanation`);
    if (o.x && o.x.length > X_LIMIT) W(`${tag}: option ${k} x ${o.x.length} chars (>${X_LIMIT})`);
  });
  if (new Set(q.o.map(o => (o.t || "").toLowerCase().trim())).size !== n) E(`${tag}: duplicate option text`);
}
function checkSeq(tag, q) {
  if (!Array.isArray(q.pool) || q.pool.length < 4) E(`${tag}: pool needs ≥4`);
  else {
    if (new Set(q.pool.map(s => s.toLowerCase().trim())).size !== q.pool.length) E(`${tag}: duplicate pool entries`);
    q.pool.forEach((s, k) => { if (typeof s !== "string" || s.length < 5) E(`${tag}: pool ${k}`); if (s.length > OPT_LIMIT) W(`${tag}: pool ${k} ${s.length} chars`); });
    if (!Array.isArray(q.answer) || !q.answer.length) E(`${tag}: answer missing`);
    else {
      const bad = q.answer.filter(i => !Number.isInteger(i) || i < 0 || i >= q.pool.length);
      if (bad.length) E(`${tag}: answer indices out of range ${JSON.stringify(bad)}`);
      if (new Set(q.answer).size !== q.answer.length) E(`${tag}: answer repeats an index`);
      if (q.t === "order") { if (q.answer.length !== q.pool.length) E(`${tag}: order must use every pool item`); if (q.pool.length > 6) W(`${tag}: order pool ${q.pool.length} (>6)`); }
      if (q.t === "build") {
        if (q.answer.length >= q.pool.length) E(`${tag}: build needs distractors (answer < pool)`);
        if (q.pool.length < 6 || q.pool.length > 8) W(`${tag}: build pool ${q.pool.length}, spec says 6–8`);
        if (q.answer.length < 3 || q.answer.length > 5) W(`${tag}: build answer ${q.answer.length}, spec says 3–5`);
        if (typeof q.ordered !== "boolean") E(`${tag}: build needs ordered:true|false`);
      }
      if (q.alt) {
        if (!Array.isArray(q.alt)) E(`${tag}: alt must be array of arrays`);
        else q.alt.forEach((a, k) => {
          if (!Array.isArray(a) || a.length !== q.answer.length) E(`${tag}: alt ${k} length`);
          else if ([...a].sort().join() !== [...q.answer].sort().join()) E(`${tag}: alt ${k} must be a permutation of answer`);
          else if (a.join() === q.answer.join()) E(`${tag}: alt ${k} equals answer`);
        });
      }
    }
  }
  if (typeof q.x !== "string" || q.x.length < 40) E(`${tag}: x explanation`);
}
function checkStandalone(tag, q, B, CATS, ctx) {
  if (!["mc", "ms", "order", "build", "hot"].includes(q.t)) { E(`${tag}: bad t ${q.t}`); return; }
  if (!CATS[q.cat]) E(`${tag}: bad cat ${q.cat}`);
  if (![1, 2, 3, 4].includes(q.d)) E(`${tag}: bad d ${q.d}`);
  objOk(tag, q.obj, B, q.d, q.cat, CATS);
  if (typeof q.q !== "string" || q.q.length < 20) E(`${tag}: stem`);
  if (q.q && q.q.length > STEM_LIMIT) W(`${tag}: stem ${q.q.length} chars (>${STEM_LIMIT})`);
  const key = (q.q || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (ctx.stems.has(key)) E(`${tag}: duplicate stem (${ctx.stems.get(key)})`); ctx.stems.set(key, tag);
  if (q.ex) { ctx.ex++; if (q.ex.split("\n").length > 16) W(`${tag}: exhibit ${q.ex.split("\n").length} lines`); }
  if (typeof q.w !== "string" || q.w.length < 15) E(`${tag}: missing w`);
  if (q.w && q.w.length > W_LIMIT) W(`${tag}: w ${q.w.length} chars`);
  if (HTML.test(q.q + (q.w || "") + (q.ex || ""))) E(`${tag}: HTML`);
  if (q.t === "mc" || q.t === "ms") checkOptions(tag, q);
  else if (q.t === "order" || q.t === "build") checkSeq(tag, q);
  else if (q.t === "hot") { checkHot(tag, q); if (typeof q.screen !== "string" || q.screen.length < 40) E(`${tag}: screen description`); if (typeof q.x !== "string" || q.x.length < 40) E(`${tag}: x`); }
  ctx.types[q.t] = (ctx.types[q.t] || 0) + 1;
  if (ctx.dom[q.d] !== undefined) ctx.dom[q.d]++;
}
function runBank(x, { sk, B, CATS, globalStems, name, file, constName, idPrefix, quota, units, requireCase = true, requireSeries = true, mix }) {
  const Bk = loadConst(file, constName); if (!Bk) return;
  const ctx = { stems: globalStems, ex: 0, types: {}, dom: Object.fromEntries(Object.keys(quota).map(k => [Number(k), 0])) };
  let unitCount = 0, cases = 0, series = 0;
  const ids = new Set();
  Bk.forEach((q, i) => {
    const tag = `${name} #${i + 1} ${q.id || "?"}`;
    const want = idPrefix + String(i + 1).padStart(3, "0");
    if (q.id !== want) E(`${tag}: id should be ${want}`);
    if (ids.has(q.id)) E(`${tag}: dup id`); ids.add(q.id);
    if (q.t === "case") {
      cases++; if (i !== 0) E(`${tag}: case study must be first in the bank`);
      if (typeof q.title !== "string" || q.title.length < 5) E(`${tag}: title`);
      const tabs = q.tabs || {};
      for (const k of ["overview", "environment", "requirements", "issues"]) if (typeof tabs[k] !== "string" || tabs[k].length < 300) E(`${tag}: tab ${k} missing or <300 chars`);
      if (!Array.isArray(q.questions) || q.questions.length !== 8) E(`${tag}: case needs exactly 8 questions`);
      else {
        const ds = new Set();
        q.questions.forEach((cq, k) => {
          const ctag = `${tag} q${k + 1} ${cq.id}`;
          if (cq.id !== `${q.id}-${k + 1}`) E(`${ctag}: id should be ${q.id}-${k + 1}`);
          if (cq.t === "hot") E(`${ctag}: hot not allowed inside case study`);
          checkStandalone(ctag, cq, B, CATS, ctx); ds.add(cq.d); unitCount++;
        });
        if (ds.size < 2) E(`${tag}: case study must span ≥2 domains`);
      }
      return;
    }
    if (q.t === "series") {
      series++; if (i !== Bk.length - 1) E(`${tag}: solution series must be last in the bank`);
      if (!CATS[q.cat]) E(`${tag}: bad cat`); objOk(tag, q.obj, B, q.d, q.cat, CATS);
      if (typeof q.scenario !== "string" || q.scenario.length < 200) E(`${tag}: scenario <200 chars`);
      if (!Array.isArray(q.solutions) || q.solutions.length !== 4) E(`${tag}: series needs exactly 4 solutions`);
      else {
        const ok = q.solutions.filter(s => s.ok === true).length;
        if (ok < 1 || ok > 2) E(`${tag}: series needs 1–2 ok solutions, has ${ok}`);
        q.solutions.forEach((s, k) => { if (typeof s.s !== "string" || s.s.length < 30) E(`${tag}: solution ${k} text`); if (typeof s.ok !== "boolean") E(`${tag}: solution ${k} ok`); if (typeof s.x !== "string" || s.x.length < 20) E(`${tag}: solution ${k} x`); });
        if (new Set(q.solutions.map(s => (s.s || "").toLowerCase().trim())).size !== q.solutions.length) E(`${tag}: duplicate solutions`);
        unitCount += 4; if (ctx.dom[q.d] !== undefined) ctx.dom[q.d] += 4;
      }
      if (typeof q.w !== "string" || q.w.length < 15) E(`${tag}: w`);
      return;
    }
    checkStandalone(tag, q, B, CATS, ctx); unitCount++;
  });
  if (requireCase && cases !== 1) E(`${name}: need exactly 1 case study, found ${cases}`);
  if (requireSeries && series !== 1) E(`${name}: need exactly 1 solution series, found ${series}`);
  if (unitCount !== units) E(`${name}: ${unitCount} question units, need ${units}`);
  for (const d in quota) if (ctx.dom[d] !== quota[d]) E(`${name}: domain ${d} has ${ctx.dom[d]} units, quota ${quota[d]}`);
  for (const t in mix) if (t !== "ex" && (ctx.types[t] || 0) < mix[t]) E(`${name}: ${t} count ${ctx.types[t] || 0}, need ≥${mix[t]}`);
  if ((ctx.types.hot || 0) > 2) E(`${name}: hot count ${ctx.types.hot} (>2)`);
  if (mix.ex && ctx.ex < mix.ex) E(`${name}: exhibits ${ctx.ex}, need ≥${mix.ex}`);
  const standalone = Bk.filter(q => !["case", "series"].includes(q.t));
  let run = 1; for (let i = 1; i < standalone.length; i++) { run = standalone[i].d === standalone[i - 1].d ? run + 1 : 1; if (run >= 6) { W(`${name}: domain run of ${run} ending at ${standalone[i].id} — shuffle`); break; } }
  console.log(`${name}: ${unitCount} units, domains ${JSON.stringify(ctx.dom)}, types ${JSON.stringify(ctx.types)}, exhibits ${ctx.ex}`);
}
const sc200GlobalStems = new Map();
function runSc200Bank(x) {
  const sk = loadSkills("sc200");
  runBank(x, { sk, B: bulletIndex(sk), CATS: sk.categories, globalStems: sc200GlobalStems, name: `sc200 bank-${x}`, file: `packs/sc200/bank-${x}.js`, constName: `SC200_BANK_${x.toUpperCase()}`, idPrefix: x, quota: sk.bankQuota, units: 50, mix: { ms: 6, order: 3, build: 3, ex: 8 } });
}
function runFund(name) {
  const sk = loadSkills(name), B = bulletIndex(sk);
  const C = loadConst(`packs/${name}/cards.js`, `${name.toUpperCase()}_CARDS`);
  if (C) { const r = checkCards(C, sk, `${name} cards`); finishCards(r, sk, `${name} cards`); if (C.length < 140) E(`${name}: ${C.length} cards (<140)`); }
  const prefix = name === "az900" ? "z" : "s";
  runBank(prefix, { sk, B, CATS: sk.categories, globalStems: new Map(), name: `${name} questions`, file: `packs/${name}/questions.js`, constName: `${name.toUpperCase()}_QUESTIONS`, idPrefix: prefix, quota: sk.questionQuota, units: 50, requireCase: false, requireSeries: false, mix: { ms: 6 } });
}

if (what === "all" || what === "cards") runSc200Cards();
if (what === "all" || what === "twins") runTwins();
if (what === "all" || what === "portal") runPortal();
if (what === "all") ["a", "b", "c"].forEach(runSc200Bank); else if (what === "bank") runSc200Bank(arg2 || "a");
if (what === "all") ["az900", "sc900"].forEach(runFund); else if (what === "fund") runFund(arg2 || "az900");

warns.forEach(w => console.log("WARN " + w));
errs.forEach(e => console.log("ERR  " + e));
console.log(errs.length ? `FAIL (${errs.length} errors, ${warns.length} warnings)` : `PASS (${warns.length} warnings)`);
process.exit(errs.length ? 1 : 0);
