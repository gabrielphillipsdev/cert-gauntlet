/* Cert Gauntlet — Learn pane for open-book Microsoft exams (manifest.exam.learnPane).
   The real exam lets you open learn.microsoft.com in a split pane while the clock runs. Sites can't be embedded, so the app
   opens Learn in a separate window/tab (iPad Split View, laptop side-by-side), keeps the exam clock running, and logs how long
   each question's lookup took: it.lk = { n: lookups, ms: time }. The results screen then shows minutes lost vs points gained. */
import { esc, fmtClock } from "../util.js";

export const LEARN_URL = "https://learn.microsoft.com/en-us/security/";
let winRef = null;

export function buttonHtml(r) { return r && r.learnPane ? `<button type="button" class="learnbtn" id="xmlearn" title="Open Microsoft Learn (clock keeps running)">Learn ↗</button>` : ""; }

/* bind the button on the current item; `save` persists XS */
export function bind(XS, it, save, rerenderBanner) {
  const b = document.getElementById("xmlearn"); if (!b) return;
  b.onclick = () => {
    const q = it.lkq || "";
    try { winRef = window.open(q ? `${LEARN_URL}search/?terms=${encodeURIComponent(q)}` : LEARN_URL, "cg-learn"); } catch (e) { winRef = null; }
    start(XS, it, save);
    rerenderBanner();
  };
}
export function start(XS, it, save) {
  if (XS.lookup) return;
  it.lk = it.lk || { n: 0, ms: 0 }; it.lk.n++;
  XS.lookup = { start: Date.now(), i: XS.i };
  save();
}
export function end(XS, save) {
  if (!XS || !XS.lookup) return false;
  const it = XS.items[XS.lookup.i]; const ms = Date.now() - XS.lookup.start;
  if (it) { it.lk = it.lk || { n: 0, ms: 0 }; it.lk.ms += ms; }
  XS.lookup = null; save(); return true;
}
/* banner shown while a lookup is open; the candidate taps Done (iPad Split View keeps both visible so focus events can't tell) */
export function bannerHtml(XS, it) {
  if (!XS.lookup) return it && it.lk && it.lk.ms ? `<div class="learn-note">Looked up ${it.lk.n}× on this question · ${fmtClock(it.lk.ms)} so far</div>` : "";
  return `<div class="learn-live" id="xmlearnlive"><span>Looking it up on Learn… the clock is running.</span><span class="learn-t" id="xmlearnt">${fmtClock(Date.now() - XS.lookup.start)}</span><button type="button" id="xmlearndone">Done</button></div>`;
}
export function bindBanner(XS, save, rerender) {
  const d = document.getElementById("xmlearndone"); if (d) d.onclick = () => { end(XS, save); rerender(); };
}
/* called from the exam tick: keep the live counter current */
export function tick(XS) { const el = document.getElementById("xmlearnt"); if (el && XS && XS.lookup) el.textContent = fmtClock(Date.now() - XS.lookup.start); }
/* when the app regains focus on a phone (the Learn tab was in front), close the lookup automatically */
let hooked = false;
export function hookFocus(getXS, save, rerender) {
  if (hooked || typeof window === "undefined") return; hooked = true;
  const onBack = () => { const XS = getXS(); if (XS && XS.lookup && !document.hidden && window.matchMedia && window.matchMedia("(max-width: 767px)").matches) { end(XS, save); rerender(); } };
  window.addEventListener("focus", onBack); document.addEventListener("visibilitychange", onBack);
}

/* ---------- results ---------- */
export function summary(XS, scoreOf) {
  const items = XS.items.map((it, i) => ({ id: it.id, ms: it.lk ? it.lk.ms : 0, n: it.lk ? it.lk.n : 0, r: scoreOf(it) }));
  const used = items.filter(x => x.n > 0), rest = items.filter(x => !x.n);
  const pct = a => a.length ? Math.round(a.reduce((s, x) => s + x.r, 0) / a.length * 100) : null;
  return { n: used.length, secs: Math.round(used.reduce((s, x) => s + x.ms, 0) / 1000), right: used.reduce((s, x) => s + x.r, 0), pctUsed: pct(used), pctRest: pct(rest), items: used.map(x => ({ id: x.id, secs: Math.round(x.ms / 1000), r: x.r })) };
}
export function readoutHtml(res, r) {
  const L = res.learn; if (!L) return "";
  const perQ = r.count ? Math.round(r.minutes * 60 / r.count) : 0;
  if (!L.n) return `<div class="reft">Learn lookups</div><div class="xm-note">You didn't open Learn during this attempt. The real exam allows it with the clock running (${perQ}s per question on average); use the Learn button when a lookup is likely to flip the answer, and skip it when it won't.</div>`;
  const mins = (L.secs / 60).toFixed(1); const avg = Math.round(L.secs / L.n);
  const verdict = L.pctUsed === null ? "" : L.pctUsed >= 75 ? `Lookups paid off: <b>${L.pctUsed}%</b> right on looked-up questions${L.pctRest !== null ? ` vs ${L.pctRest}% on the rest` : ""}.` : L.pctUsed >= 50 ? `Mixed: <b>${L.pctUsed}%</b> right on looked-up questions${L.pctRest !== null ? ` vs ${L.pctRest}% on the rest` : ""} — look up facts (role names, limits, table names), not judgement calls.` : `Lookups didn't help much: <b>${L.pctUsed}%</b> right on looked-up questions${L.pctRest !== null ? ` vs ${L.pctRest}% on the rest` : ""}. Spend that time on the questions you can reason through.`;
  const budget = L.secs > r.minutes * 60 * 0.2 ? ` That is more than a fifth of the exam clock.` : "";
  return `<div class="reft">Learn lookups · open-book readout</div><div class="xm-note"><b>${L.n} lookup${L.n === 1 ? "" : "s"}, ${mins} min total</b> (${avg}s each; the exam budgets ${perQ}s per question).${budget} ${verdict}</div><table class="xm-tbl"><tr><th>Question</th><th class="r">Lookup</th><th class="r">Result</th></tr>${L.items.map(x => `<tr><td>${esc(x.id)}</td><td class="r">${fmtClock(x.secs * 1000)}</td><td class="r ${x.r >= 1 ? "g0" : "g2"}">${x.r >= 1 ? "right" : "wrong"}</td></tr>`).join("")}</table>`;
}
