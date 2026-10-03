/* Cert Gauntlet — CCNA config-order PBQ (sim type "ccna-order"), Chat 8.
   Same drag-to-order UI and state as the core "order" sim (core/sims/basic.js), but graded by the IOS simulator:
   the student's order is typed into a fresh device; if the resulting running-config equals the one the canonical
   order produces, any order is accepted (IOS lets blocks swap and accepts global commands from sub-modes, so a fixed
   equivalence list cannot describe every working order). Otherwise partial credit = steps in their canonical position.

   item = { id, type:"ccna-order", obj, d, title, prompt, task:[...], device:"router"|"switch"|"l3switch", pre?:[cli lines], steps:[lines in canonical order], why }
   Steps start in global configuration mode. */
import { registerSim, sim } from "../../registry.js";
import "../../basic.js";
import { createLab, runningConfig } from "../index.js";
import { safeExec } from "./labGrader.js";

/* run lines on a fresh device; returns {config, errors:[{line, out}]} */
export function runOrder(item, lines) {
  const lab = createLab({ devices: { D: { type: item.device || "router" } } });
  const s = lab.cli("D");
  for (const l of ["enable", "configure terminal", ...(item.pre || [])]) safeExec(s, l);
  const errors = [];
  for (const l of lines) { const r = safeExec(s, l); if (/% (Invalid|Incomplete|Ambiguous)|Internal simulator error/.test(r.out || "")) errors.push({ line: l, out: r.out }); }
  safeExec(s, "end"); lab.topo.converge();
  return { config: runningConfig(lab.topo.get("D")).replace(/^Building configuration.*$|^Current configuration.*$/gm, "").trim(), errors };
}
const canon = new Map();
export function canonical(item) { if (!canon.has(item.id)) canon.set(item.id, runOrder(item, item.steps)); return canon.get(item.id); }
export function orderWorks(item, seq) { if (!seq.length) return false; const r = runOrder(item, seq.map(i => item.steps[i])); return !r.errors.length && r.config === canonical(item).config; }

const base = () => sim("order");
registerSim("ccna-order", {
  label: "Config order", color: "#FFD166",
  create(item) { return base().create(item); },
  render(el, item, st, ctx) { base().render(el, { ...item, eq: [] }, st, ctx); },
  answered: (item, st) => st.seq.length > 0,
  score(item, st) {
    if (!st.seq.length) return { f: 0, notes: ["Not answered."], why: item.why || "" };
    if (orderWorks(item, st.seq)) return { f: 1, notes: ["Your order produces the required configuration."], why: item.why || "" };
    const r = runOrder(item, st.seq.map(i => item.steps[i]));
    const pos = st.seq.filter((v, k) => item.steps[v] === item.steps[k]).length / item.steps.length;   // by text: identical lines (two "no shutdown") are interchangeable
    const notes = [];
    if (r.errors.length) notes.push(...r.errors.slice(0, 3).map(e => `"${e.line}" was rejected here: ${e.out.split("\n").pop()}`));
    else notes.push("Every line was accepted, but the result is not the required configuration (a line landed in the wrong mode or on the wrong interface).");
    notes.push("A working order: " + item.steps.map((s, i) => `${i + 1}. ${s}`).join("  "));
    return { f: Math.min(pos, (item.steps.length - 1) / item.steps.length), notes, why: item.why || "" };
  },
});
