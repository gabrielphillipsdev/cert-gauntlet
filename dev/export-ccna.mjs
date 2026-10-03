#!/usr/bin/env node
// Plain-text exports of the CCNA pack for second-model review (Gemini/ChatGPT "hunt for wrong keys").
//   node dev/export-ccna.mjs   -> dev/export/ccna-bank-{a,b,c}.txt, ccna-cards.txt, ccna-twins.txt
// '*' marks the keyed answer. Keep these files out of the app.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, ".."), OUT = path.join(ROOT, "dev/export");
mkdirSync(OUT, { recursive: true });
const sk = JSON.parse(readFileSync(path.join(ROOT, "dev/specs/skills-ccna.json"), "utf8"));
const T = {}; for (const d of sk.domains) for (const [id, t] of Object.entries(d.topics)) { T[id] = t.t; for (const [l, s] of Object.entries(t.sub || {})) T[`${id}.${l}`] = `${t.t} — ${s}`; }
const imp = f => import(pathToFileURL(path.join(ROOT, "packs/ccna", f)));
const ind = (s, n) => String(s).split("\n").map(l => " ".repeat(n) + l).join("\n");
const L4 = String.fromCharCode;

function fmtQ(q) {
  const L = [`[${q.id}] type=${q.t}${q.t === "ms" ? " pick=" + q.pick : ""}${q.t === "build" ? " ordered=" + q.ordered : ""} domain=${q.d} obj=${q.obj} (${T[q.obj] || "?"})`, `Q: ${q.q}`];
  if (q.ex) L.push(`EXHIBIT:\n${ind(q.ex, 4)}`);
  if (q.t === "mc" || q.t === "ms") q.o.forEach((o, i) => L.push(`  ${o.ok ? "*" : " "} ${L4(65 + i)}. ${o.t}\n        why: ${o.x}`));
  else {
    L.push("POOL:"); q.pool.forEach((p, i) => L.push(`  [${i}] ${p}`));
    L.push(`KEY (${q.t === "build" ? (q.ordered ? "ordered subset" : "unordered subset") : "full order"}): ${q.answer.map(i => `[${i}]`).join(q.t === "build" && !q.ordered ? " + " : " -> ")}`);
    (q.alt || []).forEach(a => L.push(`ALSO ACCEPTED: ${a.map(i => `[${i}]`).join(" -> ")}`));
    L.push(`why: ${q.x}`);
  }
  L.push(`TAKEAWAY: ${q.w}`);
  return L.join("\n");
}

const pack = (await imp("pack.js")).default;
for (const x of ["a", "b", "c"]) {
  const bank = (await imp(`bank-${x}.js`))[`CCNA_BANK_${x.toUpperCase()}`];
  const head = [`# CCNA 200-301 v1.1 — Exam ${x.toUpperCase()} (${pack.exam.banks[x].sub})`,
    `# ${bank.length} questions. Export for second-model review: '*' marks the keyed answer. Multi-response and drag-drop items are graded all-or-nothing.`,
    `# Report any item where the key or an explanation is wrong (cite a cisco.com configuration guide or command reference), any exhibit that IOS would not print that way, and any item with two defensible answers.`,
    `# Lab slots for this exam (filled from Chat 8's labs): ${pack.exam.labSlots[x].map(s => `${s.topic} (${s.obj})`).join(", ")}`, ""];
  writeFileSync(path.join(OUT, `ccna-bank-${x}.txt`), head.concat(bank.map(fmtQ).join("\n\n")).join("\n") + "\n");
  console.log(`wrote ccna-bank-${x}.txt (${bank.length})`);
}
const cards = [];
for (let d = 1; d <= 6; d++) cards.push(...(await imp(`cards-d${d}.js`))[`CCNA_CARDS_D${d}`]);
const byC = {}; cards.forEach(c => (byC[c.c] = byC[c.c] || []).push(c));
const CL = [`# CCNA 200-301 v1.1 — ${cards.length} flashcards by deck. Check every fact; flag anything wrong or outdated for v1.1.`, ""];
for (const s of pack.sections) for (const k of s.decks) {
  CL.push(`==== ${pack.cats[k].name} (domain ${s.d}) · ${byC[k].length} cards ====`);
  byC[k].forEach(c => CL.push(`- [${c.obj}] ${c.q}\n    A: ${c.a.replace(/^#/, "").split("\n").join(" / ")}${c.s ? `\n    MC: ${c.s}` : ""}\n    X: ${c.x}${c.w ? `\n    HOOK: ${c.w}` : ""}`));
  CL.push("");
}
writeFileSync(path.join(OUT, "ccna-cards.txt"), CL.join("\n")); console.log(`wrote ccna-cards.txt (${cards.length})`);
const tw = (await imp("twins.js")).CCNA_TWINS;
writeFileSync(path.join(OUT, "ccna-twins.txt"), [`# CCNA confusable twins (${tw.length}). Each statement is tagged with the side it is true of; flag any that is true of both or neither.`, ""]
  .concat(tw.map(t => `== ${t.a}  vs  ${t.b}  [${t.obj}]\n${t.n}\n${t.s.map(s => `  (${s[1] === "a" ? "A" : "B"}) ${s[0]}`).join("\n")}`).join("\n\n")).join("\n") + "\n");
console.log(`wrote ccna-twins.txt (${tw.length})`);
