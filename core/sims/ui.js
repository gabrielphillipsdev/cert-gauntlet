/* Cert Gauntlet — shared UI helpers for simulation components (Chat 3+).
   ensureCss()                 loads core/sims/sims.css once (called at import time by sim modules)
   taskPane(el, item, ctx)     sticky, minimizable instructions pane with a built-in calculator (the real exam has both)
   dragify(node, opts)         pointer-event drag with a tap fallback — one code path for touch and mouse
   valOk(got, want)            compare a user value against a key (string | number | bool | [alternatives] | {re})
   fmtWant(want)               human-readable key for notes / reveal
   --- Chat 2 helpers (incident console / firewall editor / log viewer / drag-drop match+order) ---
   injectCss(id, css)          one <style> per id; safe to call on every render
   instructionsPane(el,item,o) "Tasks" pane with IOC chips (ports / processes / IPs / hosts) — used by the Chat 2 sims
   drag(handle, opts)          lower-level pointer drag with onStart/onMove/onEnd callbacks
   targetAt(x, y, selector)    element under a point matching selector (ignores the drag ghost)
   ghostOf(el)                 fixed-position clone used as a drag ghost
   sortable(list, opts)        reorder children of a list by dragging their handles
   TERM_KEYS                   symbol key row preset for the console on phones
   NOTE: two task-pane styles coexist (taskPane = Chat 3 sims, instructionsPane = Chat 2 sims). Unifying them is a follow-up.
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

/* ======================= Chat 2 helpers ======================= */
export function injectCss(id, css) {
  if (typeof document === "undefined" || !document.head) return;
  if (document.getElementById(id)) return;
  const s = document.createElement("style"); s.id = id; s.textContent = css; document.head.appendChild(s);
}

/* ---------- instructions pane ----------
   item.tasks   : array of task strings (what the candidate must achieve)
   item.iocs    : optional { ports:[], procs:[], ips:[], hosts:[] } rendered as chips (incident console)
   opts.fallback: text used when the item has no tasks (match/order)
   Minimized state is remembered per item id for the session only (UI preference, never synced). */
const ipaneMin = {};
export function instructionsPane(el, item, opts = {}) {
  const tasks = item.tasks && item.tasks.length ? item.tasks : (opts.fallback ? [opts.fallback] : []);
  if (!tasks.length && !item.iocs) return null;
  const key = item.id || "x";
  const box = document.createElement("div"); box.className = "ipane" + (ipaneMin[key] ? " min" : "");
  const iocs = item.iocs || {};
  const chip = (label, arr, cls) => arr && arr.length ? `<div class="ipane-ioc"><span class="k">${label}</span>${arr.map(v => `<code class="${cls || ""}">${esc(String(v))}</code>`).join("")}</div>` : "";
  box.innerHTML = `<div class="ipane-head"><span class="ipane-t">${esc(opts.title || "Tasks")}<span class="ipane-n">${tasks.length}</span></span><button type="button" class="ipane-btn" aria-label="Minimize instructions">${ipaneMin[key] ? "Show" : "Hide"}</button></div>` +
    `<div class="ipane-body"><ol>${tasks.map(t => `<li>${esc(t)}</li>`).join("")}</ol>${chip("Ports", iocs.ports)}${chip("Processes", iocs.procs)}${chip("IPs", iocs.ips)}${chip("Hosts", iocs.hosts)}${opts.note ? `<div class="ipane-note">${esc(opts.note)}</div>` : ""}</div>`;
  box.querySelector(".ipane-btn").onclick = () => { ipaneMin[key] = !ipaneMin[key]; box.classList.toggle("min", !!ipaneMin[key]); box.querySelector(".ipane-btn").textContent = ipaneMin[key] ? "Show" : "Hide"; };
  el.appendChild(box);
  return box;
}

/* ---------- pointer drag ----------
   drag(handle, { onStart(ev) -> ghost|null, onMove(x, y, ev), onEnd(x, y, ev, cancelled) })
   Works for touch, pen and mouse. A pointer that moves < 6px before release is treated as a tap (no drag). */
export function drag(handle, opts) {
  let id = null, sx = 0, sy = 0, started = false, ghost = null;
  const move = ev => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!started) { if (Math.hypot(dx, dy) < 6) return; started = true; ghost = opts.onStart ? opts.onStart(ev) : null; if (ghost) { ghost.classList.add("dragghost"); document.body.appendChild(ghost); } }
    ev.preventDefault();
    if (ghost) { ghost.style.transform = `translate(${ev.clientX - ghost.offsetWidth / 2}px, ${ev.clientY - ghost.offsetHeight / 2}px)`; }
    opts.onMove && opts.onMove(ev.clientX, ev.clientY, ev);
  };
  const end = (ev, cancelled) => {
    if (ev.pointerId !== id) return;
    handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", end); handle.removeEventListener("pointercancel", cancel);
    try { handle.releasePointerCapture(id); } catch (e) { /* already released */ }
    if (ghost) ghost.remove();
    const was = started; id = null; started = false; ghost = null;
    if (was) opts.onEnd && opts.onEnd(ev.clientX, ev.clientY, ev, !!cancelled);
    else if (!cancelled && opts.onTap) opts.onTap(ev);
  };
  const cancel = ev => end(ev, true);
  handle.addEventListener("pointerdown", ev => {
    if (id !== null || (ev.button !== undefined && ev.button !== 0)) return;
    if (opts.disabled && opts.disabled()) return;
    id = ev.pointerId; sx = ev.clientX; sy = ev.clientY; started = false;
    try { handle.setPointerCapture(id); } catch (e) { /* ok */ }
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", cancel);
  });
  /* Scroll suppression while a finger is down on a handle: a non-passive touchmove listener instead of touch-action:none.
     Both work on iOS Safari; touch-action:none makes headless Chromium swallow the NEXT tap after a drag (dev/tests/sims-e2e.py). */
  handle.addEventListener("touchmove", ev => { if (id !== null && ev.cancelable) ev.preventDefault(); }, { passive: false });
}
/* element under a point that matches selector (ignores the ghost) */
export function targetAt(x, y, selector) {
  const stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
  for (const e of stack) { if (!e || e.classList.contains("dragghost")) continue; const t = e.closest(selector); if (t) return t; }
  return null;
}
export function ghostOf(el) {
  const g = el.cloneNode(true); const r = el.getBoundingClientRect();
  g.style.width = r.width + "px"; g.style.position = "fixed"; g.style.left = "0"; g.style.top = "0"; g.style.pointerEvents = "none"; g.style.zIndex = "999"; g.style.opacity = ".92";
  g.style.transform = `translate(${r.left}px, ${r.top}px)`;
  return g;
}

/* ---------- sortable list ----------
   sortable(list, { item: ".row", handle: ".grab", onReorder(from, to), disabled() })
   Rows keep their DOM order as the source of truth; the caller re-renders after onReorder. */
export function sortable(list, opts) {
  const rows = () => Array.from(list.querySelectorAll(opts.item));
  rows().forEach((row, idx) => {
    const h = opts.handle ? row.querySelector(opts.handle) : row; if (!h) return;
    let over = null;
    drag(h, {
      disabled: opts.disabled,
      onStart: () => { row.classList.add("dragsrc"); return ghostOf(row); },
      onMove: (x, y) => {
        const t = targetAt(x, y, opts.item);
        rows().forEach(r => r.classList.remove("dropbefore", "dropafter"));
        over = null;
        if (t && t !== row && list.contains(t)) { const r = t.getBoundingClientRect(); const after = y > r.top + r.height / 2; t.classList.add(after ? "dropafter" : "dropbefore"); over = { el: t, after }; }
      },
      onEnd: (x, y, ev, cancelled) => {
        row.classList.remove("dragsrc"); rows().forEach(r => r.classList.remove("dropbefore", "dropafter"));
        if (cancelled || !over) return;
        const all = rows(); const from = all.indexOf(row); let to = all.indexOf(over.el) + (over.after ? 1 : 0); if (to > from) to--;
        if (to !== from) opts.onReorder(from, to);
      },
    });
  });
}

export const TERM_KEYS = [{ label: "Tab", insert: "\t" }, "-", "/", "|", ".", ":", "=", "\"", "*", "_", "\\", "~"];

injectCss("cg-sim-ui", `
.ipane{position:sticky;top:calc(58px + var(--sat));z-index:6;background:rgba(27,40,56,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--line-2);border-radius:12px;margin:0 0 10px;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.ipane-head{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 12px}
.ipane-t{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--amber)}
.ipane-n{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:rgba(255,180,84,.18);font-size:11px;margin-left:6px;padding:0 5px}
.ipane-btn{border:1px solid var(--line);border-radius:8px;background:none;color:var(--muted);font-size:12px;font-weight:700;padding:4px 9px}
.ipane-body{padding:0 12px 10px;font-size:13.5px;line-height:1.45}
.ipane-body ol{padding-left:18px;margin:0 0 6px}
.ipane-body li{margin:3px 0}
.ipane.min .ipane-body{display:none}
.ipane-ioc{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:5px}
.ipane-ioc .k{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-right:2px}
.ipane-ioc code{background:#0A1017;border:1px solid var(--line);border-radius:6px;padding:2px 6px;font-size:12px;color:#FFD7A6}
.ipane-note{font-size:12px;color:var(--muted);margin-top:4px}
.dragghost{box-shadow:0 10px 28px rgba(0,0,0,.45);border-radius:12px}
.dragsrc{opacity:.35}
.dropbefore{box-shadow:0 -3px 0 0 var(--amber)}
.dropafter{box-shadow:0 3px 0 0 var(--amber)}
.grab{flex:none;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);background:var(--panel-2);font-size:16px;cursor:grab;user-select:none;-webkit-user-select:none}
.grab:active{cursor:grabbing}
@media(min-width:1024px){.ipane{top:calc(66px + var(--sat))}}
`);
