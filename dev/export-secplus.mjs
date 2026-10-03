#!/usr/bin/env node
/* Plain-text exports of the Sec+ pack for second-model review (paste into Gemini/ChatGPT: "hunt for wrong keys").
     node dev/export-secplus.mjs      -> dev/export/secplus-bank-a.txt, -bank-b, -bank-c, secplus-pbqs.txt, secplus-lab.txt
   '*' marks the keyed answer. Sim items print their starting state and the key so a reviewer can argue with the grading. */
import { pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(root, "dev/export"); mkdirSync(OUT, { recursive: true });
const m = (await import(pathToFileURL(path.join(root, "packs/secplus/pack.js")))).default;
const c = await m.load();
const { FIELDS, DEFAULT_START } = await import(pathToFileURL(path.join(root, "core/sims/appanel.js")));
const { DEVICES } = await import(pathToFileURL(path.join(root, "core/sims/diagram.js")));

/* objective titles from the objectives doc */
const OBJ = {}; readFileSync(path.join(root, "dev/specs/secplus-objectives.md"), "utf8").split("\n").forEach(l => { const mm = l.match(/^- (\d\.\d+) (.+?)(?: \(|$)/); if (mm) OBJ[mm[1]] = mm[2]; });
const ind = (s, n = 4) => String(s).split("\n").map(l => " ".repeat(n) + l).join("\n");
const fmtWant = w => Array.isArray(w) ? w.map(fmtWant).join(" | ") : (w && typeof w === "object" && w.re) ? (w.label || "/" + w.re + "/") : typeof w === "boolean" ? (w ? "On" : "Off") : String(w);

function fmtQ(q) {
  const L = [`[${q.id}] type=${q.t} domain=${q.d} obj=${q.obj} (${OBJ[q.obj] || "?"}) cat=${q.cat}`, `Q: ${q.q}`];
  if (q.ex) L.push(`EXHIBIT:\n${ind(q.ex)}`);
  if (q.t === "ms") L.push(`(choose ${q.pick})`);
  q.o.forEach((o, i) => L.push(`  ${o.ok ? "*" : " "} ${String.fromCharCode(65 + i)}. ${o.t}\n        why: ${o.x}`));
  L.push(`TAKEAWAY: ${q.w}`);
  return L.join("\n");
}
function fmtSim(p) {
  const L = [`[${p.id}] sim=${p.type} domain=${p.d ?? "-"} obj=${p.obj} (${OBJ[p.obj] || "?"})`, `TITLE: ${p.title}`];
  if (p.prompt) L.push(`PROMPT: ${p.prompt}`); if (p.setup) L.push(`SETUP: ${p.setup}`);
  if (p.task) L.push("TASK:\n" + p.task.map((t, i) => `    ${i + 1}. ${t}`).join("\n"));
  if (p.out) L.push(`EXHIBIT:\n${ind(p.out)}`);
  if (p.type === "match") { L.push("PAIRS (left → right):"); p.pairs.forEach(x => L.push(`    ${x[0]}  →  ${x[1]}`)); }
  if (p.type === "order") { L.push("CORRECT ORDER:"); p.steps.forEach((s, i) => L.push(`    ${i + 1}. ${s}`)); if (p.eq) L.push(`    interchangeable steps: ${p.eq.map(g => g.map(i => i + 1).join("=")).join(", ")}${p.note ? " (" + p.note + ")" : ""}`); }
  if (p.type === "exhibit") p.qs.forEach((sq, i) => { L.push(`  ${i + 1}. ${sq.q}`); sq.o.forEach((o, k) => L.push(`     ${k === 0 ? "*" : " "} ${String.fromCharCode(65 + k)}. ${o}`)); L.push(`     why: ${sq.x}`); });
  if (p.type === "scenario") { L.push(`Q: ${p.q}`); p.opts.forEach((o, k) => L.push(`  ${k === 0 ? "*" : " "} ${String.fromCharCode(65 + k)}. ${o}${k > 0 && p.no && p.no[k - 1] ? "\n        why wrong: " + p.no[k - 1] : ""}`)); }
  if (p.type === "diagram") {
    L.push("TOPOLOGY NODES: " + p.nodes.map(n => `${n.id}="${n.label.replace(/\n/g, " ")}"${n.k ? " (" + n.k + ")" : ""}`).join(", "));
    L.push("LINKS: " + (p.links || []).map(l => l.join("—")).join(", "));
    L.push("PALETTE: " + p.palette.map(d => `${d}=${(p.devices && p.devices[d] || DEVICES[d] || { n: d }).n}`).join(", "));
    L.push("SLOTS (key):"); p.slots.forEach(s => L.push(`    ${s.label}  →  ${fmtWant(s.want)}${s.why ? "   // " + s.why : ""}`));
  }
  if (p.type === "appanel") {
    const start = { ...DEFAULT_START, ...(p.start || {}) };
    L.push(`DEVICE: ${p.device || "Access point"} — fields not listed under KEY must stay at their START value (changing them costs ½ point):`);
    FIELDS.forEach(f => { const w = p.want[f.k]; L.push(`    ${w !== undefined ? "*" : " "} ${f.l}: start=${fmtWant(start[f.k])}${w !== undefined ? "  →  KEY=" + fmtWant(w) : ""}${p.fieldWhy && p.fieldWhy[f.k] ? "   // " + p.fieldWhy[f.k] : ""}`); });
  }
  if (p.type === "hardening") {
    L.push(`HOST: ${p.host.name} · ${p.host.os} · ${p.host.role}`);
    L.push("CONTROLS ('*' = scored; 'crit' = changing it breaks the business function, −1; unmarked = leave alone, −½ if changed):");
    (p.groups || [{ id: "all", label: "" }]).forEach(g => { L.push(`  ${g.label}`); p.controls.filter(x => (x.g || "all") === g.id).forEach(ct => { const lab = v => ct.t === "toggle" ? (v ? ct.on || "On" : ct.off || "Off") : v; L.push(`    ${ct.want !== undefined ? "*" : ct.crit ? "!" : " "} ${ct.l}${ct.d ? " (" + ct.d + ")" : ""}: start=${lab(ct.start)}${ct.want !== undefined ? "  →  KEY=" + lab(ct.want) : ct.crit ? "  [crit: keep]" : "  [leave alone]"}${ct.why ? "   // " + ct.why : ""}`); }); });
  }
  /* Chat 2 sims (console / fweditor / logview) — added in Chat 9 so their keys reach the reviewer too */
  if (p.tasks && !p.task) { L.push("TASKS:"); p.tasks.forEach(t => L.push(`    - ${t}`)); }
  if (p.type === "console") {
    if (p.iocs) L.push(`IOCs given: ${Object.entries(p.iocs).map(([k, v]) => `${k}=${[].concat(v).join(", ")}`).join(" · ")}${p.requireDisable ? " · malicious services must be stopped AND disabled" : ""}`);
    p.hosts.forEach(h => {
      L.push(`HOST ${h.name || h.id} (${h.os}, ${h.ip})`);
      h.services.forEach(sv => L.push(`    ${sv.bad ? "* STOP" : sv.keep ? "! KEEP" : "  leave"}  ${sv.name}${sv.display ? " \"" + sv.display + "\"" : ""} proc=${sv.proc} pid=${sv.pid}${sv.port ? ` listen=${sv.proto || "tcp"}/${sv.port}` : ""}${sv.remote ? ` remote=${sv.remote}` : ""}`));
    });
    const ips = [].concat((p.iocs || {}).ips || []); if (ips.length) L.push(`KEY: block ${ips.join(", ")} on every host that talks to it; stop${p.requireDisable ? " + disable" : ""} every '* STOP' service; '! KEEP' stopped = −1, other legit services stopped = −½`);
  }
  if (p.type === "fweditor") {
    L.push("NETWORKS: " + (p.nets || []).map(n => `${n.v}=${n.l}`).join(", "));
    L.push("STARTING RULES (top-down, first match):"); p.rules.forEach((r, i) => L.push(`    ${i + 1}. ${r.act} ${r.src} → ${r.dst} ${r.proto || "any"}/${r.port}`));
    L.push("HIDDEN TEST PACKETS (KEY):"); p.packets.forEach(k => L.push(`    ${k.want === "allow" || k.want === true ? "ALLOW" : "DENY "}  ${k.src} → ${k.dst} ${k.proto || "tcp"}/${k.port}${k.note ? "   // " + k.note : ""}`));
  }
  if (p.type === "logview") {
    p.sources.forEach((src, si) => { L.push(`LOG ${src.name} ('*' = evidence line in the key):`); src.lines.forEach((ln, i) => L.push(`    ${(p.evidence || []).some(e => (e[0] === si || e[0] === src.name) && (e[1] === i || e[1] === ln)) ? "*" : " "} ${ln}`)); });
    (p.qs || []).forEach((sq, i) => { L.push(`  Q${i + 1} (${sq.k}). ${sq.q}`); sq.o.forEach((o, k) => L.push(`     ${k === 0 ? "*" : " "} ${String.fromCharCode(65 + k)}. ${o}`)); if (sq.x) L.push(`     why: ${sq.x}`); });
  }
  if (["hashid", "fwrule", "risk"].includes(p.type)) L.push("(generated: a fresh problem every attempt; grader in core/sims/generators.js)");
  if (p.why) L.push(`TAKEAWAY: ${p.why}`);
  return L.join("\n");
}
const HEAD = [`# Export for second-model review. '*' marks the keyed answer. Report any item where you believe the key, a distractor explanation, or a sim grading key is wrong for CompTIA Security+ SY0-701, citing the objective bullet.`, ""];
for (const x of Object.keys(c.banks)) {
  const L = [`# Security+ SY0-701 — Exam bank ${x.toUpperCase()} (${c.banks[x].length} questions + ${c.pbqs[x].length} PBQs)`, ...HEAD, "==== PBQs (presented first) ====", ""];
  c.pbqs[x].forEach(p => L.push(fmtSim(p), "")); L.push("==== QUESTIONS ====", ""); c.banks[x].forEach(q => L.push(fmtQ(q), ""));
  writeFileSync(path.join(OUT, `secplus-bank-${x}.txt`), L.join("\n")); console.log(`wrote secplus-bank-${x}.txt`);
}
const lab = [`# Security+ SY0-701 — PBQ Lab (${c.lab.length} items + ${c.generators.length} generators)`, ...HEAD];
[...c.lab, ...c.generators].forEach(p => lab.push(fmtSim(p), ""));
writeFileSync(path.join(OUT, "secplus-lab.txt"), lab.join("\n")); console.log("wrote secplus-lab.txt");
