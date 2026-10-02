/* Cert Gauntlet — simulation / PBQ registry.
   A sim type is registered once and used by both the PBQ Lab and the exam runner.

   registerSim(type, {
     label: "Matching",                 // shown in lists
     color: "#4FA3FF",                  // list accent
     generated: false,                  // true = a fresh problem every attempt (state.g holds it)
     create(item) -> state              // JSON-serializable; shuffles, generators, user answers all live here
     render(el, item, state, ctx)       // draw into el; ctx = {onChange(), locked, reveal}
     answered(item, state) -> bool      // has the user touched it?
     score(item, state) -> {f:0..1, notes:[string], why:string}
   })
   Items may carry: id, type, title, prompt, obj (objective id), d (domain), cat, plus type-specific fields.
   Chat 2/3 add drag-drop, console, firewall editor, log viewer, diagram, AP panel, hardening panel here. */
const SIMS = {};
export function registerSim(type, def) { SIMS[type] = { generated: false, ...def }; }
export function sim(type) { const s = SIMS[type]; if (!s) throw new Error("unknown sim type " + type); return s; }
export function hasSim(type) { return !!SIMS[type]; }
export function simTypes() { return Object.keys(SIMS); }
