/* Cert Gauntlet — shared UI helpers for simulation components (Chat 2).
   Kept inside core/sims so the sims own their styling and pointer handling without touching core engine files.

   injectCss(id, css)                  one <style> per id; safe to call on every render
   instructionsPane(el, item, opts)    floating / minimizable "Tasks" pane rendered at the top of a sim body
   drag(handle, opts)                  pointer-event drag (touch + mouse) with a ghost that follows the finger
   sortable(list, opts)                reorder children of a list by dragging their handles
   TERM_KEYS                           symbol key row preset for the console on phones */
import { esc } from "../util.js";

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
const paneMin = {};
export function instructionsPane(el, item, opts = {}) {
  const tasks = item.tasks && item.tasks.length ? item.tasks : (opts.fallback ? [opts.fallback] : []);
  if (!tasks.length && !item.iocs) return null;
  const key = item.id || "x";
  const box = document.createElement("div"); box.className = "ipane" + (paneMin[key] ? " min" : "");
  const iocs = item.iocs || {};
  const chip = (label, arr, cls) => arr && arr.length ? `<div class="ipane-ioc"><span class="k">${label}</span>${arr.map(v => `<code class="${cls || ""}">${esc(String(v))}</code>`).join("")}</div>` : "";
  box.innerHTML = `<div class="ipane-head"><span class="ipane-t">${esc(opts.title || "Tasks")}<span class="ipane-n">${tasks.length}</span></span><button type="button" class="ipane-btn" aria-label="Minimize instructions">${paneMin[key] ? "Show" : "Hide"}</button></div>` +
    `<div class="ipane-body"><ol>${tasks.map(t => `<li>${esc(t)}</li>`).join("")}</ol>${chip("Ports", iocs.ports)}${chip("Processes", iocs.procs)}${chip("IPs", iocs.ips)}${chip("Hosts", iocs.hosts)}${opts.note ? `<div class="ipane-note">${esc(opts.note)}</div>` : ""}</div>`;
  box.querySelector(".ipane-btn").onclick = () => { paneMin[key] = !paneMin[key]; box.classList.toggle("min", !!paneMin[key]); box.querySelector(".ipane-btn").textContent = paneMin[key] ? "Show" : "Hide"; };
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
