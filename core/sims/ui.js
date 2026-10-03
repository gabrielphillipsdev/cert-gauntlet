/* Cert Gauntlet — shared UI helpers for simulation components (Chat 3+).
   ensureCss()                 loads core/sims/sims.css once (called at import time by sim modules)
   taskPane(el, item, ctx)     sticky, minimizable instructions pane with a built-in calculator (the real exam has both)
   dragify(node, opts)         pointer-event drag with a tap fallback — one code path for touch and mouse
   valOk(got, want)            compare a user value against a key (string | number | bool | [alternatives] | {re})
   fmtWant(want)               human-readable key for notes / reveal
   No globals, no DOM access at import time beyond the stylesheet link (guarded so node validators can import). */
import { esc } from "../util.js";

let cssDone = false;
export function ensureCss() {
  if (cssDone || typeof document === "undefined" || !document.head || !document.head.appendChild) return;
  cssDone = true;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("./sims.css", import.meta.url).href;
  document.head.appendChild(l);
}

/* ---------- task pane ---------- */
let paneMin = false, calcOpen = false, calcExpr = "";   // session-level UI state (never part of sim state)
export function taskPane(el, item, ctx) {
  const lines = Array.isArray(item.task) && item.task.length ? item.task : (item.prompt ? [item.prompt] : []);
  if (!lines.length) return;
  const box = document.createElement("div"); box.className = "stask" + (paneMin ? " min" : "");
  const draw = () => {
    box.className = "stask" + (paneMin ? " min" : "");
    box.innerHTML = `<div class="stask-h"><span class="stask-t">${paneMin ? "Task · tap to expand" : "Task"}</span><span class="sp"></span>` +
      (paneMin ? "" : `<button class="stask-b" data-a="calc" title="Calculator">${calcOpen ? "Hide calc" : "Calc"}</button>`) +
      `<button class="stask-b" data-a="min" title="${paneMin ? "Expand" : "Minimize"}">${paneMin ? "+" : "–"}</button></div>` +
      (paneMin ? "" : `<ol class="stask-l">${lines.map(t => `<li>${esc(t)}</li>`).join("")}</ol>${item.note && !ctx.reveal ? `<div class="stask-n">${esc(item.note)}</div>` : ""}${calcOpen ? calcHtml() : ""}`);
    box.querySelectorAll("[data-a]").forEach(b => b.onclick = ev => { ev.stopPropagation(); if (b.dataset.a === "min") paneMin = !paneMin; else calcOpen = !calcOpen; draw(); });
    box.querySelector(".stask-h").onclick = () => { if (paneMin) { paneMin = false; draw(); } };
    if (calcOpen && !paneMin) bindCalc(box);
  };
  draw();
  el.appendChild(box);
  return box;
}

/* ---------- calculator (4-function, exam-style) ---------- */
const CALC_KEYS = ["C", "⌫", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "00", "="];
function calcHtml() { return `<div class="scalc"><div class="scalc-d">${esc(calcExpr || "0")}</div><div class="scalc-k">${CALC_KEYS.map(k => `<button data-k="${k}" class="${/[÷×−+=]/.test(k) ? "op" : ""}">${k}</button>`).join("")}</div></div>`; }
function bindCalc(box) {
  const disp = box.querySelector(".scalc-d");
  box.querySelectorAll(".scalc-k button").forEach(b => b.onclick = ev => {
    ev.stopPropagation(); const k = b.dataset.k;
    if (k === "C") calcExpr = "";
    else if (k === "⌫") calcExpr = calcExpr.slice(0, -1);
    else if (k === "=") { const v = calcEval(calcExpr); calcExpr = v === null ? "" : String(v); }
    else calcExpr += k;
    disp.textContent = calcExpr || "0";
  });
}
/* tiny infix evaluator: numbers, + − × ÷ %, left-to-right with × ÷ % binding tighter. No eval(). */
export function calcEval(src) {
  const s = String(src).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  const toks = s.match(/(\d+\.?\d*|\.\d+|[+\-*/%])/g); if (!toks || toks.join("") !== s) return null;
  const out = [], ops = []; const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
  let expectNum = true;
  for (const t of toks) {
    if (t === "%") { if (expectNum) return null; out[out.length - 1] /= 100; continue; }   // postfix percent: 40% → 0.4
    if (/[+\-*/]/.test(t)) {
      if (expectNum) { if (t === "-") { out.push(0); } else return null; }
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) out.push(ops.pop());
      ops.push(t); expectNum = true;
    } else { out.push(parseFloat(t)); expectNum = false; }
  }
  if (expectNum) return null;
  while (ops.length) out.push(ops.pop());
  const st = [];
  for (const t of out) {
    if (typeof t === "number") st.push(t);
    else { const b = st.pop(), a = st.pop(); if (a === undefined || b === undefined) return null; st.push(t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : (b === 0 ? NaN : a / b)); }
  }
  const v = st.length === 1 ? st[0] : null; if (v === null || !isFinite(v)) return null;
  return Math.round(v * 1e6) / 1e6;
}

/* ---------- drag with tap fallback ----------
   dragify(node, { onDrop(targetEl), onTap(), accept: "[data-drop]" })
   Pointer events cover mouse, touch and pen. Movement under 6px before release counts as a tap.
   The dragged visual is a ghost clone; the drop target is whatever `accept` element sits under the pointer on release. */
export function dragify(node, opts) {
  const accept = opts.accept || "[data-drop]";
  let ghost = null, sx = 0, sy = 0, dragging = false, over = null, pid = null;
  const move = (x, y) => { if (!ghost) return; ghost.style.transform = `translate(${x - ghost._ox}px, ${y - ghost._oy}px)`; const t = targetAt(x, y); if (t !== over) { if (over) over.classList.remove("over"); over = t; if (over) over.classList.add("over"); } };
  const targetAt = (x, y) => { const e = document.elementFromPoint(x, y); return e ? e.closest(accept) : null; };
  const end = (ev, cancelled) => {
    if (pid === null) return;
    node.removeEventListener("pointermove", onMove); node.removeEventListener("pointerup", onUp); node.removeEventListener("pointercancel", onCancel);
    try { node.releasePointerCapture(pid); } catch (e) { /* already released */ }
    pid = null;
    if (dragging) {
      const t = cancelled ? null : targetAt(ev.clientX, ev.clientY);
      if (ghost) ghost.remove(); ghost = null; if (over) over.classList.remove("over"); over = null; node.classList.remove("dragging");
      dragging = false;
      if (t && opts.onDrop) opts.onDrop(t);
    } else if (!cancelled && opts.onTap) opts.onTap();
  };
  const onMove = ev => {
    if (!dragging) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; dragging = true; node.classList.add("dragging"); const r = node.getBoundingClientRect(); ghost = node.cloneNode(true); ghost.className = node.className.replace("dragging", "") + " sdrag-ghost"; ghost.style.width = r.width + "px"; ghost._ox = sx - r.left; ghost._oy = sy - r.top; ghost.style.left = "0px"; ghost.style.top = "0px"; document.body.appendChild(ghost); }
    ev.preventDefault(); move(ev.clientX, ev.clientY);
  };
  const onUp = ev => end(ev, false), onCancel = ev => end(ev, true);
  node.addEventListener("pointerdown", ev => {
    if (opts.disabled && opts.disabled()) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    sx = ev.clientX; sy = ev.clientY; dragging = false; pid = ev.pointerId;
    try { node.setPointerCapture(pid); } catch (e) { /* ignore */ }
    node.addEventListener("pointermove", onMove); node.addEventListener("pointerup", onUp); node.addEventListener("pointercancel", onCancel);
  });
  node.addEventListener("dragstart", ev => ev.preventDefault());
}

/* ---------- key comparison ---------- */
const norm = v => typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : v;
export function valOk(got, want) {
  if (Array.isArray(want)) return want.some(w => valOk(got, w));
  if (want && typeof want === "object" && want.re) return new RegExp(want.re, "i").test(String(got ?? ""));
  if (typeof want === "boolean") return got === want;
  if (typeof want === "number") return parseFloat(String(got)) === want;
  return norm(String(got ?? "")) === norm(String(want));
}
export function fmtWant(want) {
  if (Array.isArray(want)) return want.map(fmtWant).join(" or ");
  if (want && typeof want === "object" && want.re) return want.label || "matching " + want.re;
  if (typeof want === "boolean") return want ? "On" : "Off";
  return String(want);
}
export const clamp01 = f => Math.max(0, Math.min(1, f));
