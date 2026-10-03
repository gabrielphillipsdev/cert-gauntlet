#!/usr/bin/env node
// Plain-text exports for second-model review (Gemini/ChatGPT "hunt for wrong keys").
//   node dev/export-sc200.js            -> writes dev/export/*.txt
// Correct answers are marked so a reviewer can argue with the key. Keep these files out of the app.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, ".."), OUT = path.join(__dirname, "export");
fs.mkdirSync(OUT, { recursive: true });
function load(rel, name) { const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/^export\s+const\s+/m, "const ") + `;this.__X=${name};`, ctx); return ctx.__X; }
function sk(name) { return JSON.parse(fs.readFileSync(path.join(__dirname, "specs", `skills-${name}.json`), "utf8")); }
function bullets(s) { const b = {}; for (const d of s.domains) for (const g of d.groups) for (const id in g.bullets) b[id] = g.bullets[id]; return b; }
const objs = (o) => (Array.isArray(o) ? o : [o]).join(", ");
const ind = (s, n = 4) => String(s).split("\n").map(l => " ".repeat(n) + l).join("\n");

function fmtQ(q, B, prefix = "") {
  const L = [];
  L.push(`${prefix}[${q.id}] type=${q.t} domain=${q.d} obj=${objs(q.obj)} (${B[Array.isArray(q.obj) ? q.obj[0] : q.obj] || "?"})`);
  L.push(`${prefix}Q: ${q.q}`);
  if (q.ex) L.push(`${prefix}EXHIBIT:\n${ind(q.ex, prefix.length + 4)}`);
  if (q.t === "mc" || q.t === "ms") {
    if (q.t === "ms") L.push(`${prefix}(choose ${q.pick})`);
    q.o.forEach((o, i) => L.push(`${prefix}  ${o.ok ? "*" : " "} ${String.fromCharCode(65 + i)}. ${o.t}\n${prefix}        why: ${o.x}`));
  } else if (q.t === "order" || q.t === "build") {
    L.push(`${prefix}POOL:`); q.pool.forEach((p, i) => L.push(`${prefix}  [${i}] ${p}`));
    L.push(`${prefix}KEY (${q.t === "build" ? (q.ordered ? "ordered subset" : "unordered subset") : "full order"}): ${q.answer.map(i => `[${i}]`).join(" -> ")}`);
    if (q.alt) q.alt.forEach(a => L.push(`${prefix}ALSO ACCEPTED: ${a.map(i => `[${i}]`).join(" -> ")}`));
    L.push(`${prefix}why: ${q.x}`);
  } else if (q.t === "hot") {
    L.push(`${prefix}SCREEN: ${q.screen}`);
    q.regions.forEach(r => L.push(`${prefix}  ${r.ok ? "*" : " "} ${r.l}`));
    L.push(`${prefix}why: ${q.x}`);
  }
  L.push(`${prefix}TAKEAWAY: ${q.w}`);
  return L.join("\n");
}
function exportBank(rel, name, skName, outName, title) {
  const Bk = load(rel, name), B = bullets(sk(skName));
  const L = [`# ${title}`, `# Export for second-model review. '*' marks the keyed answer. Report any item where you believe the key or an explanation is wrong, citing a Microsoft Learn page.`, ""];
  Bk.forEach(q => {
    if (q.t === "case") {
      L.push(`==== CASE STUDY ${q.id}: ${q.title} ====`);
      for (const k of ["overview", "environment", "requirements", "issues"]) L.push(`--- ${k.toUpperCase()} ---\n${q.tabs[k]}\n`);
      q.questions.forEach(cq => L.push(fmtQ(cq, B, "  "), ""));
      L.push("==== END CASE STUDY ====", "");
    } else if (q.t === "series") {
      L.push(`==== SOLUTION SERIES ${q.id} (domain ${q.d}, obj ${objs(q.obj)}) ====`, q.scenario, "");
      q.solutions.forEach((s, i) => L.push(`  ${s.ok ? "*YES" : " NO "} ${i + 1}. ${s.s}\n        why: ${s.x}`));
      L.push(`TAKEAWAY: ${q.w}`, "==== END SERIES ====", "");
    } else L.push(fmtQ(q, B), "");
  });
  fs.writeFileSync(path.join(OUT, outName), L.join("\n"));
  console.log(`wrote ${outName} (${Bk.length} objects)`);
}
function exportCards(files, skName, outName, title) {
  const B = bullets(sk(skName));
  const L = [`# ${title}`, `# Export for second-model review: FRONT / BACK / explanation. Flag any back or explanation that is factually wrong for the current product, citing Microsoft Learn.`, ""];
  let n = 0;
  for (const [rel, name] of files) load(rel, name).forEach(c => {
    n++;
    L.push(`[${n}] cat=${c.c} obj=${objs(c.obj)} (${B[Array.isArray(c.obj) ? c.obj[0] : c.obj] || "?"})`, `FRONT: ${c.q}`, `BACK: ${c.a.replace(/\n/g, " | ")}`);
    if (c.k) L.push(`KQL:\n${ind(c.k)}`);
    L.push(`WHY: ${c.x}`); if (c.w) L.push(`HOOK: ${c.w}`); L.push("");
  });
  fs.writeFileSync(path.join(OUT, outName), L.join("\n")); console.log(`wrote ${outName} (${n} cards)`);
}
function exportTwins() {
  const B = bullets(sk("sc200")), T = load("packs/sc200/twins.js", "SC200_TWINS");
  const L = ["# SC-200 confusable twins", "# Each statement is tagged with the side it is true of. Flag any statement that is true of the other side, or of both.", ""];
  T.forEach((t, i) => { L.push(`[${i + 1}] A = ${t.a}   |   B = ${t.b}   (obj ${objs(t.obj)})`, `CONTRAST: ${t.n}`); t.s.forEach(s => L.push(`  (${s[1].toUpperCase()}) ${s[0]}`)); L.push(""); });
  fs.writeFileSync(path.join(OUT, "sc200-twins.txt"), L.join("\n")); console.log(`wrote sc200-twins.txt (${T.length} pairs)`);
}
function exportPortal() {
  const B = bullets(sk("sc200")), P = load("packs/sc200/portal.js", "SC200_PORTAL");
  const L = ["# SC-200 portal navigation deck (hot-area)", "# '*' marks the click target. Flag any path or label that does not match the current portal.", ""];
  P.forEach(p => { L.push(`[${p.id}] portal=${p.portal} obj=${objs(p.obj)} (${B[Array.isArray(p.obj) ? p.obj[0] : p.obj] || "?"})`, `Q: ${p.q}`, `PATH: ${p.path.join(" > ")}`, `TARGET: ${p.target}`); p.regions.forEach(r => L.push(`  ${r.ok ? "*" : " "} ${r.l}`)); L.push(`WHY: ${p.x}`, ""); });
  fs.writeFileSync(path.join(OUT, "sc200-portal.txt"), L.join("\n")); console.log(`wrote sc200-portal.txt (${P.length} items)`);
}

exportBank("packs/sc200/bank-a.js", "SC200_BANK_A", "sc200", "sc200-bank-a.txt", "SC-200 exam bank A");
exportBank("packs/sc200/bank-b.js", "SC200_BANK_B", "sc200", "sc200-bank-b.txt", "SC-200 exam bank B");
exportBank("packs/sc200/bank-c.js", "SC200_BANK_C", "sc200", "sc200-bank-c.txt", "SC-200 exam bank C");
exportCards([["packs/sc200/cards-d1.js", "SC200_CARDS_D1"], ["packs/sc200/cards-d2.js", "SC200_CARDS_D2"], ["packs/sc200/cards-d3.js", "SC200_CARDS_D3"]], "sc200", "sc200-cards.txt", "SC-200 flashcards (domains 1–3)");
exportTwins();
exportPortal();
exportCards([["packs/az900/cards.js", "AZ900_CARDS"]], "az900", "az900-cards.txt", "AZ-900 flashcards");
exportBank("packs/az900/questions.js", "AZ900_QUESTIONS", "az900", "az900-questions.txt", "AZ-900 practice questions");
exportCards([["packs/sc900/cards.js", "SC900_CARDS"]], "sc900", "sc900-cards.txt", "SC-900 flashcards");
exportBank("packs/sc900/questions.js", "SC900_QUESTIONS", "sc900", "sc900-questions.txt", "SC-900 practice questions");
