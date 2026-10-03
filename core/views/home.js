/* Cert Gauntlet — pack home: today's set, readiness, quick links, decks. */
import { $, $$, esc, shuffle, askText } from "../util.js";
import { pack, getScalar, setScalar, persist, getRemind, setRemind, lastStudy } from "../store.js";
import { mastered, isWeak, isDue } from "../srs.js";
import { readyHtml, weakPick, leanTxt } from "../ready.js";
import { sim } from "../sims/registry.js";

export function renderHome(A) {
  const { packId, manifest: m, content: c } = A; const p = pack(packId);
  const weakN = c.cards.filter(cd => isWeak(packId, cd)).length; const mastN = c.cards.length - weakN;
  const H = p.examHist; const last = H[H.length - 1];
  let html = `<p class="lead">${esc(m.blurb)}</p>`;
  html += `<div id="today" class="todaybox">${todayHtml(A)}</div>`;
  html += `<div class="chips">${[["exam", "Full exam"], ["exq", "Exam questions"], ["twins", "Twins drill"], ["sprint", "Speed rounds"], ["miss", "Miss list"], ["ref", "Reference"]].map(([k, t]) => `<button data-go="${k}">${t}</button>`).join("")}</div>`;
  html += nudgeHtml();
  html += deck("weak", "Weak spots", weakN ? `${weakN} cards not yet mastered` : "All mastered — run any deck to stay sharp", weakN || c.cards.length, "var(--green)", true);
  html += deck("all", "Everything, shuffled", "20 random from the full stack", c.cards.length, "var(--amber)", false);
  html += `<div class="dh">Full exam (timed, scored like the real thing)</div>` + deck("exam", `Take a full ${m.exam.count}-question exam`, last ? `Last: ${last.scaled} · ${last.raw}% · ${H.length} attempt${H.length > 1 ? "s" : ""}` : examRules(m), last ? (last.pass ? "PASS" : "retry") : "new", "var(--amber)", true);
  const nLab = labItems(A).length;
  if (nLab) html += `<div class="dh">PBQ Lab (hands-on, exam-style)</div>` + deck("lab", "Open PBQ Lab", labBlurb(A), labCount(A), "var(--green)", true);
  for (const sec of m.sections) {
    html += `<div class="dh">Domain ${sec.d}: ${esc(sec.name)} (${sec.weight}%)</div>`;
    for (const k of sec.decks) { const pool = c.cards.filter(x => x.c === k); const mk = pool.filter(x => mastered(packId, x)).length; html += deck(k, m.cats[k].name, m.subtitles?.[k] || "", `${mk}/${pool.length}`, m.cats[k].color, false); }
  }
  A.el.innerHTML = html;
  A.setHeader(`<b>${mastN}</b>/${c.cards.length} mastered`);
  $$(".deck", A.el).forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === "lab" || k === "exam") A.go(k); else A.go("session", { deck: k }); });
  $$(".chips button", A.el).forEach(b => b.onclick = () => A.go(b.dataset.go));
  bindToday(A); bindNudge(A);
}
function deck(k, t, s, n, color, special) {
  return `<button class="deck ${special ? "special" : ""}" data-k="${k}"><span class="jack" style="background:${color}"></span><span><span class="t">${esc(t)}</span><span class="s">${esc(s)}</span></span><span class="n">${n}</span></button>`;
}
/* exam tile subtitle from the pack's own rules (manifest.exam), so no pack inherits another exam's format */
function examRules(m) {
  const e = m.exam; const n = e.pbqCount || 0;
  return [`${e.minutes} minutes`, e.pbqFirst && n ? "PBQs first" : null, e.backtrack === false ? "no going back" : null,
    n && !e.pbqFirst ? `${n} hands-on item${n > 1 ? "s" : ""} mixed in` : null, "confidence tracking", `${e.pass} to pass`].filter(Boolean).join(", ");
}
/* lab tile subtitle: the pack's labBlurb, else the names of the sim types it actually contains */
function labBlurb(A) {
  if (A.manifest.labBlurb) return A.manifest.labBlurb;
  const names = [...new Set(labItems(A).map(x => { try { return sim(x.type).label; } catch (e) { return null; } }).filter(Boolean))];
  return names.slice(0, 5).join(", ");
}
export function labItems(A) {
  const c = A.content;
  return [...(c.lab || []), ...(c.generators || [])];
}
function labCount(A) { const p = pack(A.packId); const items = labItems(A); return items.filter(x => p.pbq[x.id]).length + "/" + items.length; }

/* ---------- today ---------- */
export function todaySet(A) {
  const { packId, content: c } = A;
  const due = shuffle(c.cards.filter(cd => isDue(packId, cd))).slice(0, 12);
  const weak = weakPick(A, c.cards.filter(cd => isWeak(packId, cd)), Math.max(0, 20 - due.length), cd => c.domainOf(cd.c));
  let set = due.concat(weak);
  if (set.length < 20) set = set.concat(shuffle(c.cards.filter(x => !set.includes(x))).slice(0, 20 - set.length));
  return shuffle(set);
}
function todayPbqs(A) {
  const p = pack(A.packId); const items = labItems(A); const dayN = Math.floor(Date.now() / 86400000);
  const gen = items.filter(x => sim(x.type).generated), statics = items.filter(x => !sim(x.type).generated);
  const out = [];
  if (gen.length) out.push(gen[dayN % gen.length]);
  if (statics.length) { const weak = statics.filter(x => !(p.pbq[x.id] && p.pbq[x.id].best >= 80)); const pool = weak.length ? weak : statics; out.push(pool[dayN % pool.length]); }
  return out;
}
function streakDays(p) { let n = 0; const d = new Date(); d.setHours(0, 0, 0, 0); const k = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); if (!p.days[k(d)]) d.setDate(d.getDate() - 1); while (p.days[k(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
function todayHtml(A) {
  const { packId, content: c, manifest: m } = A; const p = pack(packId);
  const due = c.cards.filter(cd => isDue(packId, cd)).length; const exam = getScalar(packId, "examDate", m.examDateDefault);
  const t = new Date(); t.setHours(0, 0, 0, 0); const dte = exam ? Math.round((new Date(exam + "T00:00:00") - t) / 86400000) : null;
  const st = streakDays(p); const set = todaySet(A); const pb = todayPbqs(A); const remind = getRemind();
  const idleH = lastStudy() ? Math.floor((Date.now() - lastStudy()) / 3600000) : null;
  const idle = (remind.on && idleH !== null && idleH >= remind.hours) ? `<div class="idle">${idleH} hours since your last card. Today's set is waiting.</div>` : "";
  const cdTxt = dte === null ? `Set exam date<span>tap</span>` : dte > 0 ? `${dte} day${dte === 1 ? "" : "s"}<span>to exam · tap to change</span>` : dte === 0 ? "Exam day" : "Exam date passed<span>tap to set</span>";
  const xq = c.exq || []; const seen = xq.filter(q => p.exq[q.id]).length; const tot = xq.reduce((a, q) => a + ((p.exq[q.id] || {}).seen || 0), 0), r = xq.reduce((a, q) => a + ((p.exq[q.id] || {}).right || 0), 0);
  return `<div class="tdrow"><div class="cd" id="examcd">${cdTxt}</div><div class="st">${st ? `<b>${st}</b>-day streak` : "start a streak today"}</div></div>${idle}${readyHtml(A)}<button id="startToday" class="bigbtn green">Start today's set: ${set.length} cards${due ? ` (${Math.min(due, 12)} due for review)` : ""}</button><div class="rdlean">${leanTxt(A)}</div><div class="tdp">${pb.map(x => `<button data-pbq="${x.id}">${esc(x.title)}<small>Today's PBQ · ${esc(sim(x.type).label)}</small></button>`).join("")}<button data-xq="1">10 exam-style questions<small>Scenario MC · ${seen}/${xq.length} seen${tot ? ` · ${Math.round(r / tot * 100)}% right` : ""}</small></button></div>`;
}
function bindToday(A) {
  const { packId, manifest: m } = A;
  $("#examcd", A.el).onclick = () => { const v = askText("Exam date (YYYY-MM-DD)", getScalar(packId, "examDate", m.examDateDefault)); if (v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) { setScalar(packId, "examDate", v.trim()); persist(); renderHome(A); } };
  $("#startToday", A.el).onclick = () => A.go("session", { set: todaySet(A), deck: "today" });
  $$("[data-pbq]", A.el).forEach(b => b.onclick = () => A.go("lab", { id: b.dataset.pbq }));
  $("[data-xq]", A.el).onclick = () => A.go("exq", { start: 10 });
  const inp = $("#rdhours", A.el); if (inp) { inp.onchange = () => { const v = parseFloat(inp.value); setScalar(packId, "studyHours", v > 0 ? v : null); persist(); renderHome(A); }; inp.onclick = ev => ev.stopPropagation(); }
  const cl = $("#rdclear", A.el); if (cl) cl.onclick = () => { setScalar(packId, "studyHours", null); persist(); renderHome(A); };
}
function nudgeHtml() {
  const r = getRemind();
  return `<div class="nudgerow"><span>Nudge if idle</span><div class="hopts">${[2, 4, 6, 8].map(h => `<button data-h="${h}" class="${r.hours === h ? "sel" : ""}">${h}h</button>`).join("")}</div><button class="tog ${r.on ? "on" : ""}" id="nudgetog">${r.on ? "On" : "Off"}</button></div>`;
}
function bindNudge(A) {
  $$(".hopts button", A.el).forEach(b => b.onclick = () => { const r = getRemind(); setRemind({ ...r, hours: +b.dataset.h }); persist(); renderHome(A); });
  $("#nudgetog", A.el).onclick = () => { const r = getRemind(); setRemind({ ...r, on: !r.on }); persist(); renderHome(A); };
}
