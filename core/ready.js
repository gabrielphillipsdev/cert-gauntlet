/* Cert Gauntlet — readiness estimator (ported from Gym Cards ready.js, pack-agnostic).
   Predicts a fresh-exam score per domain from card mastery, exam-style accuracy, PBQ scores and real full-exam
   results, measures pace, and projects the date the gate will be met. */
import { pack, getScalar, persist } from "./store.js";
import { mastered } from "./srs.js";
import { esc, fmtDate, dkey } from "./util.js";

const UNITS_PER_HOUR = 60, MIN_DAYS = 3, WINDOW = 10, EXAM_DAYS = 3;

export function predict(A) {
  const { packId, manifest: m, content: c } = A; const p = pack(packId); const gate = m.exam.gate;
  const lastFresh = p.examHist.slice().reverse().find(h => h.fresh !== false && !h.practice && h.dom);
  const labBest = (c.lab || []).filter(x => p.pbq[x.id]).map(x => p.pbq[x.id].best);
  const labAvg = labBest.length >= 3 ? labBest.reduce((a, b) => a + b, 0) / labBest.length : null;
  let total = 0, wsum = 0;
  const doms = m.sections.map(s => {
    const pool = c.cards.filter(cd => s.decks.includes(cd.c));
    const mf = pool.length ? pool.filter(cd => mastered(packId, cd)).length / pool.length : 0;
    const qs = (c.exq || []).filter(q => q.d === s.d);
    const seen = qs.reduce((a, q) => a + ((p.exq[q.id] || {}).seen || 0), 0), right = qs.reduce((a, q) => a + ((p.exq[q.id] || {}).right || 0), 0);
    const acc = seen >= 5 ? right / seen * 100 : null;
    let base = acc === null ? mf * 100 * 0.85 : 0.5 * mf * 100 + 0.5 * acc;
    if (labAvg !== null) base = 0.85 * base + 0.15 * labAvg;
    let pr = base, src = "cards" + (acc !== null ? "+questions" : "") + (labAvg !== null ? "+lab" : "");
    if (lastFresh && lastFresh.dom[s.d]) { const ep = lastFresh.dom[s.d][1] ? lastFresh.dom[s.d][0] / lastFresh.dom[s.d][1] * 100 : 0; const age = (Date.now() - lastFresh.t) / 86400000; const wE = age <= 14 ? 0.6 : 0.35; pr = wE * ep + (1 - wE) * base; src = "exam+" + src; }
    pr = Math.max(0, Math.min(100, pr)); total += pr * s.weight; wsum += s.weight;
    return { d: s.d, name: s.name, w: s.weight, decks: s.decks, p: pr, mastery: Math.round(mf * 100), acc: acc === null ? null : Math.round(acc), src };
  });
  return { doms, overall: wsum ? total / wsum : 0, hasExam: !!lastFresh, hasQ: doms.some(d => d.acc !== null), gate };
}
function snapshot(A, overall) {
  const p = pack(A.packId); const k = dkey(); const prev = p.readyLog[k];
  p.readyLog[k] = { p: Math.round(overall * 10) / 10, n: p.days[k] || 0, u: Date.now() };
  const keys = Object.keys(p.readyLog).sort(); while (keys.length > 60) delete p.readyLog[keys.shift()];
  return !prev || Math.abs(prev.p - p.readyLog[k].p) >= 0.5;
}
function pace(A) {
  const p = pack(A.packId); const today = new Date(); today.setHours(0, 0, 0, 0);
  const keys = []; for (let i = WINDOW - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); keys.push(dkey(d)); }
  const active = keys.filter(k => (p.days[k] || 0) > 0); const units = keys.reduce((a, k) => a + (p.days[k] || 0), 0);
  const logged = keys.filter(k => p.readyLog[k]); let ptsPerUnit = null;
  if (logged.length >= 2) { const first = p.readyLog[logged[0]], last = p.readyLog[logged[logged.length - 1]]; const gained = last.p - first.p; const spent = keys.slice(keys.indexOf(logged[0]) + 1, keys.indexOf(logged[logged.length - 1]) + 1).reduce((a, k) => a + (p.days[k] || 0), 0); if (spent > 0 && gained > 0) ptsPerUnit = gained / spent; }
  return { unitsPerDay: units / WINDOW, activeDays: active.length, ptsPerUnit, units };
}
const fmtHours = u => { const h = u / UNITS_PER_HOUR; if (h < 1) return Math.round(h * 60) + " min"; const m = Math.round((h % 1) * 60); return Math.floor(h) + " h" + (m ? " " + String(m).padStart(2, "0") : ""); };
export function estimate(A) {
  const pr = predict(A); const pc = pace(A); const p = pack(A.packId); const gate = pr.gate;
  const studyHours = getScalar(A.packId, "studyHours", null); const exam = getScalar(A.packId, "examDate", A.manifest.examDateDefault);
  const gapAll = Math.max(0, gate.all - pr.overall), gapDom = Math.max(0, ...pr.doms.map(d => gate.dom - d.p));
  const bottleneck = pr.doms.slice().sort((a, b) => (gate.dom - b.p) - (gate.dom - a.p))[0];
  const gap = Math.max(gapAll, gapDom);
  const H = p.examHist.filter(h => !h.practice); const gateMet = H.length >= 2 && H[H.length - 1].gate && H[H.length - 2].gate;
  const perDay = studyHours ? studyHours * UNITS_PER_HOUR : pc.unitsPerDay;
  const ppu = pc.ptsPerUnit || 0.045; const measured = !!pc.ptsPerUnit;
  let daysNeeded = null, lo = null, hi = null;
  if (gap === 0) daysNeeded = EXAM_DAYS; else if (perDay > 0) { daysNeeded = gap / (ppu * perDay) + EXAM_DAYS; lo = gap / (ppu * 1.25 * perDay) + EXAM_DAYS; hi = gap / (ppu * 0.75 * perDay) + EXAM_DAYS; }
  const target = exam ? new Date(exam + "T00:00:00") : null;
  const daysToTarget = target ? Math.round((target - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  let needPerDay = null; if (target && daysToTarget > EXAM_DAYS && gap > 0) needPerDay = gap / (ppu * (daysToTarget - EXAM_DAYS));
  return { pr, pace: pc, gap, gapAll, gapDom, bottleneck, gateMet, perDay, measured, daysNeeded, lo, hi, target, daysToTarget, needPerDay, override: !!studyHours, studyHours };
}
export function readyHtml(A) {
  const e = estimate(A); const pr = e.pr; const gate = pr.gate;
  if (snapshot(A, pr.overall)) persist();
  const bars = pr.doms.map(d => { const p = Math.round(d.p); const c = p >= gate.all ? "var(--green)" : p >= gate.dom ? "var(--amber)" : "var(--red)"; return `<div class="pd">${esc(d.name)} ${p}%<div class="bar"><i style="width:${p}%;background:${c}"></i></div></div>`; }).join("");
  let head, detail = "";
  const paceTxt = e.override ? `What-if pace: <b>${Math.round(e.perDay)}</b> cards/day (${e.studyHours} h/day)` : `Your pace: <b>${Math.round(e.pace.unitsPerDay)}</b> cards/day over the last ${WINDOW} days (≈${fmtHours(e.pace.unitsPerDay)}/day, ${e.pace.activeDays} study day${e.pace.activeDays === 1 ? "" : "s"})`;
  if (e.gateMet) head = `<b style="color:var(--green)">Ready.</b> Two fresh exams cleared the gate. Book it.`;
  else if (e.perDay <= 0 || (!e.override && e.pace.activeDays < MIN_DAYS)) head = `Estimate unlocks after <b>${MIN_DAYS} study days</b>. ${e.pace.activeDays} so far.`;
  else {
    const start = new Date(); const est = new Date(start); est.setDate(est.getDate() + Math.round(e.daysNeeded));
    let range = ""; if (e.lo !== null) { const a = new Date(start), b = new Date(start); a.setDate(a.getDate() + Math.round(e.lo)); b.setDate(b.getDate() + Math.round(e.hi)); range = ` <span class="rdr">(${fmtDate(a)} – ${fmtDate(b)})</span>`; }
    head = `At ${e.override ? "that" : "this"} pace, ready around <b>${fmtDate(est)}</b>${range}`;
    if (e.target && e.daysToTarget !== null) { const diff = Math.round(e.daysNeeded) - e.daysToTarget; if (diff <= 0) head += ` · <b style="color:var(--green)">${-diff} day${diff === -1 ? "" : "s"} before your target</b>`; else { head += ` · <b style="color:var(--red)">${diff} day${diff === 1 ? "" : "s"} after your target</b>`; if (e.needPerDay) detail += `To make ${fmtDate(e.target)}: about <b>${Math.round(e.needPerDay)}</b> cards/day (≈${fmtHours(e.needPerDay)}/day).`; } }
    if (e.gapDom > e.gapAll && e.bottleneck) detail += (detail ? " " : "") + `Bottleneck: <b>${esc(e.bottleneck.name)}</b> at ${Math.round(e.bottleneck.p)}%, needs ${gate.dom}%.`;
    if (!pr.hasExam) detail += (detail ? " " : "") + `No full exam yet, so this leans on cards and is deliberately pessimistic; the first fresh exam will move it.`;
    else if (!e.measured) detail += (detail ? " " : "") + `Learning rate not measured yet; using a conservative default.`;
  }
  return `<div class="rdhead"><span class="rdp">Predicted fresh-exam score <b>${Math.round(pr.overall)}%</b></span><span class="rdg">gate ${gate.all}% · ${gate.dom}% per domain</span></div><div class="proj">${bars}</div><div class="rdline">${head}</div>${detail ? `<div class="rddetail">${detail}</div>` : ""}<div class="rdpace">${paceTxt} <span class="rdwhat">What if <input id="rdhours" type="number" inputmode="decimal" min="0.25" max="12" step="0.25" value="${e.studyHours || ""}" placeholder="h" data-keyrow="off"> h/day?${e.studyHours ? ` <button id="rdclear">use my pace</button>` : ""}</span></div>`;
}
/* weakness-weighted picking */
export function weights(A) { const pr = predict(A); const w = {}; pr.doms.forEach(d => { w[d.d] = Math.max(5, pr.gate.all - d.p + 5); }); return w; }
export function weakPick(A, pool, n, keyFn) {
  const w = weights(A); const items = pool.map(x => ({ x, w: w[keyFn(x)] || 10 })); const out = [];
  while (out.length < n && items.length) { let tot = items.reduce((a, i) => a + i.w, 0), r = Math.random() * tot, k = 0; for (; k < items.length; k++) { r -= items[k].w; if (r <= 0) break; } if (k >= items.length) k = items.length - 1; out.push(items[k].x); items.splice(k, 1); }
  return out;
}
export function leanTxt(A) { const pr = predict(A); const worst = pr.doms.slice().sort((a, b) => a.p - b.p); const w = weights(A); const tot = Object.values(w).reduce((a, b) => a + b, 0); const share = Math.round(w[worst[0].d] / tot * 100); return `Weighted toward your weakest domains: ${esc(worst[0].name)} gets ~${share}% of the weak-card slots today.`; }
