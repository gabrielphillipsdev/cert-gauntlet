/* Cert Gauntlet — shared helpers (no DOM state here). */
export const $ = (q, root = document) => root.querySelector(q);
export const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = a => a[Math.floor(Math.random() * a.length)];
export function dkey(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function fmtClock(ms) {
  ms = Math.max(0, ms); const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
export function fmtDateTime(t) {
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
export function fmtDate(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
export function uid() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }

let toastTimer = null;
export function toast(msg) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1300);
}
/* Confirm/prompt wrappers so views never call window.* directly (easier to test). */
export const ask = (msg) => window.confirm(msg);
export const askText = (msg, def) => window.prompt(msg, def);

/* Simple event bus for cross-module notifications (sync status, state changes). */
const listeners = {};
export function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => off(ev, fn); }
export function off(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); }
export function emit(ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
