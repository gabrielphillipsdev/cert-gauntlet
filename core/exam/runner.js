/* Cert Gauntlet — full-length exam runner. Rules come from manifest.exam (see dev/ENGINE.md):
   { minutes, pass, scaleMin, scaleMax, pbqPts, pbqFirst, backtrack, gate:{all,dom}, mixQuota:{d:n}, banks:{x:{name,sub}} }
   Content: content.banks {x:[q]}, content.pbqs {x:[item]}.
   Modes: exam (timed, no pause, counts toward the gate when fresh) · practice (pausable, never counts) · drill (instant feedback). */
import { $, $$, esc, shuffle, fmtClock, fmtDateTime, ask, uid } from "../util.js";
import { pack, bumpDay, persist, getInprog, setInprog, clearInprog } from "../store.js";
import { sim } from "../sims/registry.js";
import * as MS from "./msitems.js";      /* Microsoft item types (order, build, hot, series, case study) — Chat 6; mc/ms path unchanged */
import * as LP from "./learnpane.js";    /* open-book Learn pane timing — Chat 6 */

let A = null;          // app context {packId, manifest, content, el, go}
let XS = null, timer = null, mode = "exam";
const CONF = ["Sure", "Leaning", "No clue"], CONFLONG = ["I know this", "Leaning one way", "Total guess"];
const R = () => A.manifest.exam;
const hist = () => pack(A.packId).examHist;
const taken = x => hist().filter(h => h.x === x && !h.practice).length;
const domName = d => A.manifest.domName[d];
const domIds = () => A.manifest.sections.map(s => s.d);
const pct = p => p[1] ? Math.round(p[0] / p[1] * 100) : 0;
const bankQ = id => { for (const k in A.content.banks) { const q = A.content.banks[k].find(q => q.id === id); if (q) return q; } return null; };
const pbqItem = id => { for (const k in A.content.pbqs) { const p = A.content.pbqs[k].find(p => p.id === id); if (p) return p; } return null; };
function save() { if (XS && !XS.drill) setInprog(A.packId, XS); }
/* backtrack:false (Cisco): no Back, no review grid, no jumping either way, no flag — every Next is final (drill mode keeps its list) */
const linear = () => R().backtrack === false && mode !== "drill";

/* ---------- picker ---------- */
export function renderExam(app) {
  A = app; if (timer) { clearInterval(timer); timer = null; }
  const r = R(); const saved = getInprog(A.packId); const gate = gateStatus(); const H = hist();
  let html = `<div class="tb"><button data-go="home">Exit</button><div class="labtitle">Full exam</div></div>`;
  const nP = Math.max(0, ...Object.values(A.content.pbqs || {}).map(l => l.length)), nQ = Math.max(0, ...Object.values(A.content.banks || {}).map(l => l.length));
  const shape = r.backtrack === false ? `${nQ} questions${nP ? ` + ${nP} lab items mixed in` : ""}` : `${r.count} questions`;
  html += `<p class="lead">${shape}, ${r.minutes} minutes${r.pbqFirst ? ", PBQs first" : ""}, scored ${r.scaleMin}–${r.scaleMax} with ${r.pass} to pass. ${r.backtrack === false ? "<b>No going back:</b> every Next is final — no Back button, no review screen, no skipping ahead. " : ""}No pause, no feedback until you submit — exactly like the real thing. Mark how sure you are on every question; the report shows whether your guesses beat chance.</p>`;
  if (r.labSlots && !nP) html += `<p class="lead tight dim">Lab items join each exam once the IOS labs land (Chat 8); until then every exam is its ${nQ} questions.</p>`;
  html += `<div class="gatebox"><div class="gt">READINESS GATE · two consecutive fresh exams at ${r.gate.all}%+, every domain ${r.gate.dom}%+</div><div class="gv">${gate.html}</div></div>`;
  if (saved && !saved.done) {
    const left = r.minutes * 60000 - saved.elapsed;
    html += `<button class="deck resume" id="xmresume"><span class="jack" style="background:var(--amber)"></span><span><span class="t">Resume ${bankName(saved.x)}${saved.practice ? " (practice)" : ""}</span><span class="s">Question ${saved.i + 1} of ${saved.items.length} · ${fmtClock(left)} left${saved.practice ? "" : " · clock has kept running"}</span></span><span class="n" style="color:var(--amber)">resume</span></button><button class="ghost wide" id="xmdiscard">Discard the in-progress attempt</button>`;
  }
  html += `<div class="modebar"><span>Mode</span><button class="pill ${mode !== "practice" ? "on" : ""}" data-m="exam">Exam</button><button class="pill ${mode === "practice" ? "on" : ""}" data-m="practice">Practice</button><span class="hint">${mode === "practice" ? "Pausable, never counts toward the gate." : "Timed, no pause. Fresh attempts count toward the gate."}</span></div>`;
  for (const x of Object.keys(r.banks)) {
    const n = taken(x); const last = H.filter(h => h.x === x).slice(-1)[0];
    html += `<button class="deck" data-x="${x}"><span class="jack" style="background:${n ? "var(--muted)" : "var(--green)"}"></span><span><span class="t">${esc(r.banks[x].name)}<span class="fresh ${n ? "no" : "yes"}">${n ? "seen " + n + "×" : "fresh"}</span></span><span class="s">${esc(r.banks[x].sub || "")}</span></span><span class="n" style="color:${last ? (last.pass ? "var(--green)" : "var(--red)") : "var(--muted)"}">${last ? last.scaled + "<br><small>" + last.raw + "%</small>" : ((A.content.banks[x] || []).length + ((A.content.pbqs || {})[x] || []).length) + " Qs"}</span></button>`;
  }
  html += `<button class="deck" data-x="mix"><span class="jack" style="background:var(--amber)"></span><span><span class="t">Random mix</span><span class="s">Drawn across all banks to the real domain weights. Not fresh once you've taken the others, but good volume.</span></span><span class="n">${r.count} Qs</span></button>`;
  if (H.length) {
    html += `<div class="reft">History · ${H.length} attempt${H.length > 1 ? "s" : ""}</div>`;
    html += H.slice().reverse().map((h, k) => `<div class="histrow" data-h="${H.length - 1 - k}"><span>${bankName(h.x)}${h.practice ? " · practice" : ""}<br><span class="d">${fmtDateTime(h.t)} · ${Math.round(h.secs / 60)} min${h.pauses ? " · paused " + h.pauses + "×" : ""}</span></span><span class="sc ${h.pass ? "ok" : "no"}">${h.scaled}<br><span class="d">${h.raw}%${h.gate ? " · gate ✓" : ""}</span></span></div>`).join("");
    html += `<div class="reft">Trend</div>` + trendHtml();
  }
  A.el.innerHTML = html;
  $("[data-go=home]", A.el).onclick = () => A.go("home");
  $$(".modebar .pill", A.el).forEach(b => b.onclick = () => { mode = b.dataset.m; renderExam(A); });
  $$(".deck[data-x]", A.el).forEach(b => b.onclick = () => confirmStart(b.dataset.x));
  if (saved && !saved.done) { $("#xmresume", A.el).onclick = () => { XS = saved; mode = saved.practice ? "practice" : "exam"; resume(); }; $("#xmdiscard", A.el).onclick = () => { if (ask("Throw away the in-progress attempt?")) { XS = null; clearInprog(A.packId); renderExam(A); } }; }
  $$(".histrow", A.el).forEach(el => el.onclick = () => showResult(hist()[+el.dataset.h]));
}
function bankName(x) { return R().banks[x] ? R().banks[x].name : "Random mix"; }
function gateStatus() {
  const H = hist().filter(h => !h.practice); const r = R();
  if (!H.length) return { ok: false, html: "No full exams yet. Take a fresh one, timed, in one sitting." };
  const last = H[H.length - 1], prev = H[H.length - 2];
  if (last.gate && prev && prev.gate) return { ok: true, html: `<b>Gate met.</b> Two consecutive attempts at ${prev.raw}% and ${last.raw}% with every domain over ${r.gate.dom}%. Book the date.` };
  if (last.gate) return { ok: false, html: `Last attempt <b>${last.raw}%</b> cleared the gate. One more consecutive pass on a <i>fresh</i> exam and you're there.` };
  const weak = Object.keys(last.dom).filter(d => pct(last.dom[d]) < r.gate.dom).map(d => domName(d));
  return { ok: false, html: `Last attempt <i>${last.raw}%</i>${last.raw >= r.gate.all ? "" : " (need " + r.gate.all + "%)"}${weak.length ? " · under " + r.gate.dom + "% in " + weak.join(", ") : ""}. Drill those, then take the next fresh exam.` };
}
function trendHtml() {
  const H = hist().slice(-8); const W = 300, Hh = 90; const r = R();
  const pts = H.map((h, i) => [H.length > 1 ? 20 + i * (W - 40) / (H.length - 1) : W / 2, Hh - 8 - (h.raw / 100) * (Hh - 16)]);
  const gateY = Hh - 8 - (r.gate.all / 100) * (Hh - 16);
  return `<svg viewBox="0 0 ${W} ${Hh}" class="dg trend"><line x1="10" y1="${gateY}" x2="${W - 10}" y2="${gateY}" stroke="#43D97B" stroke-dasharray="4 4" stroke-width="1.5"/><text x="${W - 12}" y="${gateY - 4}" text-anchor="end" class="mt" style="fill:#43D97B">${r.gate.all}%</text>${pts.length > 1 ? `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#FFB454" stroke-width="2.5"/>` : ""}${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${H[i].pass ? "#43D97B" : "#FF5D52"}"/><text x="${p[0]}" y="${p[1] - 10}" text-anchor="middle" class="mt">${H[i].raw}</text>`).join("")}</svg>`;
}
function confirmStart(x) {
  const r = R(); const n = x === "mix" ? 0 : taken(x);
  const practice = mode === "practice";
  const msg = (practice ? "Practice run: pausable, instant resume, never counts toward the gate. " : (n ? `You've taken ${bankName(x)} before, so it isn't fresh; it won't count toward the gate. ` : "")) + `Start a ${r.minutes}-minute attempt now?${practice ? "" : " The clock does not stop if you leave."}`;
  if (!ask(msg)) return;
  start(x, practice);
}
function buildItems(x) {
  const r = R(); const B = A.content.banks, P = A.content.pbqs; let qs, pbqs;
  if (x === "mix") {
    const all = Object.values(B).flat(); const byD = {}; all.forEach(q => { (byD[q.d] = byD[q.d] || []).push(q); });
    qs = []; for (const d in r.mixQuota) qs = qs.concat(shuffle((byD[d] || []).slice()).slice(0, r.mixQuota[d])); qs = shuffle(qs);
    const seen = new Set(); pbqs = shuffle(Object.values(P).flat()).filter(p => { const k = sim(p.type).generated ? p.type : p.id; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, r.pbqCount || 5);
  } else { qs = shuffle(B[x].slice()); pbqs = (P[x] || []).slice(); }
  if (MS.applies(r)) qs = x === "mix" ? MS.mixPick(Object.values(B).flat(), r) : MS.arrangeBank(B[x]);   /* case study first, series last */
  const pItems = pbqs.map(newPbqItem), qItems = qs.map(q => ({ k: "q", id: q.id, ord: MS.initialOrder(q), ans: [], conf: 0, fl: false }));
  if (MS.applies(r)) return pItems.concat(qItems);
  return r.pbqFirst ? pItems.concat(qItems) : shuffle(pItems.concat(qItems));
}
function newPbqItem(p) { return { k: "p", id: p.id, type: p.type, conf: 0, fl: false, st: sim(p.type).create(p) }; }
function start(x, practice) {
  mode = practice ? "practice" : "exam";
  XS = { id: uid(), x, items: buildItems(x), i: 0, elapsed: 0, running: false, pauses: [], started: Date.now(), done: false, drill: false, practice, maxSeen: 0, caseLocked: false, midLocked: false, lookup: null };
  save(); resume();
}
function resume() {
  /* Exam mode: the clock never stopped. Whatever time passed since the last saved tick (leaving, app killed, other device) counts. */
  if (!XS.practice && XS.tick) XS.elapsed = Math.min(R().minutes * 60000, XS.elapsed + (Date.now() - XS.tick));
  XS.running = true; XS.tick = Date.now();
  if (timer) clearInterval(timer); timer = setInterval(tick, 500);
  renderItem();
}
function tick() {
  if (!XS || !XS.running) return;
  const now = Date.now(); XS.elapsed += now - XS.tick; XS.tick = now;
  const left = R().minutes * 60000 - XS.elapsed;
  const el = $("#xmclock"); if (el) { el.textContent = fmtClock(left); el.classList.toggle("low", left < 5 * 60000); }
  if (!XS.drill && (now - (XS.lastQuiet || 0)) > 15000) { XS.lastQuiet = now; setInprog(A.packId, XS, true); } // keep the saved tick fresh without a sync push
  LP.tick(XS);
  if (left <= 0) { XS.elapsed = R().minutes * 60000; submit(true); }
}
function pause() {
  if (!XS.running) return;
  XS.running = false; XS.pauses.push({ at: XS.elapsed, t: Date.now() }); save();
  const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "xmpause";
  ov.innerHTML = `<h2>Paused</h2><p>Practice mode only — the real exam has no pause. ${fmtClock(R().minutes * 60000 - XS.elapsed)} left.</p><button class="pri" id="xmgo">Resume</button><button class="ghost" id="xmleave">Leave (attempt is saved)</button>`;
  document.body.appendChild(ov);
  $("#xmgo").onclick = () => { ov.remove(); resume(); };
  $("#xmleave").onclick = () => { ov.remove(); if (timer) { clearInterval(timer); timer = null; } renderExam(A); };
}
function leave() {
  if (XS.practice) return pause();
  if (!ask("Leave the exam? The clock keeps running, just like walking out of the testing center. You can resume from any device.")) return;
  LP.end(XS, save); save(); if (timer) { clearInterval(timer); timer = null; } XS.running = false; renderExam(A);
}
document.addEventListener("visibilitychange", () => { if (document.hidden && XS && XS.running && !XS.done && XS.practice) pause(); });

/* ---------- item rendering ---------- */
function topbar(label, opts = {}) {
  const left = R().minutes * 60000 - XS.elapsed;
  return `<div class="tb"><button id="xmleave">${mode === "drill" ? "Exit" : XS.practice ? "Pause" : "Leave"}</button><span class="xm-count">${label}</span><span class="sp"></span>${mode === "drill" ? "" : LP.buttonHtml(R())}${mode === "drill" ? "" : `<span class="xm-clock ${left < 5 * 60000 ? "low" : ""}" id="xmclock">${fmtClock(left)}</span>`}${opts.noGrid || linear() ? "" : `<button class="gridbtn" id="xmgridbtn">${mode === "drill" ? "List" : "Review"}</button>`}</div>`;
}
function confHtml(it) {
  return `<div class="xm-conf"><div class="cl">HOW SURE ARE YOU?</div><div class="cb">${CONF.map((c, i) => `<button data-c="${i}" class="${it.conf === i ? "on" + i : ""}">${c}<br><span>${CONFLONG[i]}</span></button>`).join("")}</div></div>`;
}
function renderItem() {
  const it = XS.items[XS.i]; const n = XS.items.length; const r = R();
  XS.maxSeen = Math.max(XS.maxSeen || 0, XS.i);
  const nav = MS.navState(XS, r, bankQ);                       /* section rules for Microsoft-format exams; plain {back,grid,flag} otherwise */
  const msExam = MS.applies(r), inSeries = nav.section === "series";
  let html = topbar(`${XS.i + 1} / ${n}`, { noGrid: !nav.grid });
  if (msExam && mode !== "drill") html += LP.bannerHtml(XS, it);
  html += `<div class="xm-main">${it.k === "q" ? questionHtml(it) : pbqShell(it)}${confHtml(it)}`;
  const canBack = msExam ? nav.back : (r.backtrack !== false && XS.i > 0);
  html += `<div class="xm-nav">${r.backtrack === false || inSeries ? "" : `<button id="xmprev" ${canBack ? "" : "disabled"}>Back</button>`}${nav.flag && !linear() ? `<button class="flag ${it.fl ? "on" : ""}" id="xmflag" title="Flag for review">⚑</button>` : ""}${XS.i === n - 1 ? `<button class="submit" id="xmnext">Finish &amp; submit</button>` : `<button class="next" id="xmnext">Next</button>`}</div></div>`;
  A.el.innerHTML = `<div class="xm-wrap ${inSeries ? "single" : ""}">${inSeries ? "" : railHtml()}<div class="xm-pane">${html}</div></div>`;   /* linear exams get a read-only progress rail */
  A.el.scrollTop = 0;
  $("#xmleave").onclick = () => { if (mode === "drill") drillDone(); else leave(); };
  const gb = $("#xmgridbtn"); if (gb) gb.onclick = () => renderGrid();
  const prev = $("#xmprev"); if (prev) prev.onclick = () => { if (XS.i > 0 && canBack) { XS.i--; save(); renderItem(); } };
  const fb = $("#xmflag"); if (fb) fb.onclick = () => { it.fl = !it.fl; fb.classList.toggle("on", it.fl); save(); };
  $("#xmnext").onclick = () => {
    const blank = answered(it) ? "" : " This item is unanswered and will be scored as wrong.";
    if (XS.i === n - 1) {
      if (linear()) { if (ask(`This is the last item. Submit the exam now?${blank}`)) submit(false); return; }
      if (inSeries && !XS.drill) { if (ask("Submit the exam now?")) submit(false); return; } renderGrid(true); return;
    }
    if (linear() && !ask(`Next is final — once you move on you can't come back to this ${it.k === "p" ? "lab" : "question"}.${blank}`)) return;
    if (!MS.beforeMove(XS, XS.i + 1, r, bankQ)) return;
    XS.i++; save(); renderItem();
  };
  $$(".xm-conf .cb button").forEach(b => b.onclick = () => { it.conf = +b.dataset.c; $$(".xm-conf .cb button").forEach(x => x.className = (+x.dataset.c === it.conf) ? "on" + it.conf : ""); save(); });
  bindRail();
  if (it.k === "q") bindQuestion(it); else mountPbq(it, false);
  if (msExam && mode !== "drill") { LP.bind(XS, it, save, renderItem); LP.bindBanner(XS, save, renderItem); LP.hookFocus(() => XS, save, () => { if (XS && XS.running && !XS.done) renderItem(); }); }
}
/* iPad/laptop: a sticky rail with the question grid; hidden on phones by CSS */
function gridCell(it, i) {
  const r = R(); const ms = MS.applies(r); const sec = ms ? MS.sectionOf(XS, i, bankQ) : "";
  const locked = ms && i !== XS.i && !MS.canJump(XS, i, r, bankQ);
  return `<button data-i="${i}" class="${answered(it) ? "ans" : ""} ${i === XS.i ? "cur" : ""} ${it.fl ? "fl" : ""} ${it.conf === 2 ? "g2" : ""} ${it.k === "p" ? "pb" : ""} ${locked ? "lk" : ""} ${sec ? "sec-" + sec : ""}">${i + 1}</button>`;
}
function jumpTo(i) {
  const r = R();
  if (MS.applies(r)) { if (i === XS.i) return renderItem(); if (!MS.canJump(XS, i, r, bankQ)) { const m = MS.gridJumpMessage(XS, i, r, bankQ); if (m) alert(m); return; } if (!MS.beforeMove(XS, i, r, bankQ)) return; }
  else if (linear() && i !== XS.i) return;
  XS.i = i; save(); renderItem();
}
function railHtml() {
  const ms = MS.applies(R());
  if (linear()) return `<aside class="xm-rail"><div class="xm-grid lin">${XS.items.map((it, i) => `<button type="button" disabled tabindex="-1" aria-disabled="true" class="${i < XS.i ? "ans" : ""} ${i === XS.i ? "cur" : ""} ${it.k === "p" && i <= XS.i ? "pb" : ""}">${i + 1}</button>`).join("")}</div><div class="xm-legend">Progress only — this exam doesn't allow going back or skipping ahead.</div></aside>`;
  return `<aside class="xm-rail"><div class="xm-grid">${XS.items.map((it, i) => gridCell(it, i)).join("")}</div><div class="xm-legend">filled = answered · dot = flagged · red edge = no clue${ms ? " · teal = case study · amber = solution series · dotted = locked" : " · dashed = PBQ"}</div></aside>`;
}
function bindRail() { if (linear()) return; $$(".xm-rail .xm-grid button").forEach(b => b.onclick = () => jumpTo(+b.dataset.i)); }
function questionHtml(it) {
  const q = bankQ(it.id); const D = A.content.diagrams || {};
  if (MS.isMs(q)) return MS.caseTabsHtml(q, it) + MS.questionHtml(q, it, domName(q.d));
  let h = MS.caseTabsHtml(q, it);
  h += `<div><span class="xm-dom">${domName(q.d)}</span><span class="xm-type">${q.t === "ms" ? "choose " + q.pick : "single answer"}</span></div>`;
  if (q.dg && D[q.dg]) h += `<div class="qwrap">${D[q.dg]}</div>`;
  if (q.ex) h += `<pre class="out">${esc(q.ex)}</pre>`;
  h += `<div class="xm-q">${esc(q.q)}${q.t === "ms" ? `<span class="pickn">SELECT ${q.pick === 2 ? "TWO" : "THREE"}</span>` : ""}</div>`;
  h += `<div class="xm-opts" id="xmopts">${it.ord.map((oi, k) => `<button class="xm-opt ${q.t === "ms" ? "ms" : ""} ${it.ans.includes(oi) ? "sel" : ""}" data-i="${oi}"><span class="k">${"ABCDEF"[k]}</span><span>${esc(q.o[oi].t)}</span></button>`).join("")}</div>`;
  return h;
}
function bindQuestion(it) {
  const q = bankQ(it.id);
  MS.bindCaseTabs(A.el, q, it, save);
  if (MS.isMs(q)) return MS.bindQuestion(A.el, q, it, save, renderItem);
  $$("#xmopts .xm-opt").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (q.t === "mc") it.ans = [i]; else { if (it.ans.includes(i)) it.ans = it.ans.filter(x => x !== i); else { if (it.ans.length >= q.pick) it.ans.shift(); it.ans.push(i); } }
    $$("#xmopts .xm-opt").forEach(x => x.classList.toggle("sel", it.ans.includes(+x.dataset.i))); save();
  });
}
function pbqShell(it) {
  const p = pbqItem(it.id); const s = sim(p.type);
  return `<div><span class="xm-dom">${p.d ? domName(p.d) : "PBQ"}</span><span class="xm-type">PBQ · ${esc(s.label)}</span></div><div class="xm-q pbqhead">${esc(p.title)}<span class="pickn muted">${esc(p.prompt || p.setup || "")}</span><button class="ghost tiny" id="xmreset">Reset</button></div><div id="xmsim" class="simbox"></div>`;
}
function mountPbq(it, reveal) {
  const p = pbqItem(it.id); const s = sim(p.type); const el = $("#xmsim");
  const draw = () => s.render(el, { ...p, prompt: "" }, it.st, { onChange: save, locked: reveal, reveal });
  draw();
  const rb = $("#xmreset"); if (rb) rb.onclick = () => { if (reveal) return; if (!ask("Reset this PBQ to its starting state?")) return; it.st = s.generated ? { ...s.create(p), g: it.st.g } : s.create(p); save(); draw(); };
}
function answered(it) { if (it.k === "q") { const q = bankQ(it.id); return MS.isMs(q) ? MS.answeredMs(q, it) : it.ans.length > 0; } return sim(it.type).answered(pbqItem(it.id), it.st); }
function renderGrid(final) {
  if (linear()) return renderItem();                      /* no review screen on a no-backtrack exam */
  const n = XS.items.length, un = XS.items.filter(it => !answered(it)).length, fl = XS.items.filter(it => it.fl).length;
  const ms = MS.applies(R()); const nextIsSeries = ms && final && XS.i < n - 1;
  let html = topbar("Review", { noGrid: true });
  html += `<p class="lead tight">${final ? "Last question of this section done. " : ""}${un ? `<b style="color:var(--amber)">${un} unanswered</b>` : "Every question answered"}${fl ? ` · ${fl} flagged` : ""}. ${R().backtrack === false ? "This exam doesn't allow going back." : ms ? "Tap a number to jump. Locked sections are dotted." : "Tap a number to jump."}</p>`;
  html += `<div class="xm-legend">Filled = answered · dot = flagged · red edge = marked "no clue"${ms ? " · teal = case study · amber = solution series · dotted = locked" : " · dashed = PBQ"}</div>`;
  html += `<div class="xm-grid big">${XS.items.map((it, i) => gridCell(it, i)).join("")}</div>`;
  html += mode === "drill" ? `<div class="xm-actions"><button class="pri" id="xmsubmit">Finish drill</button><button id="xmback2">Back to question</button></div>`
    : `<div class="xm-actions"><button class="pri" id="xmsubmit">Submit exam${un ? " (" + un + " blank will count wrong)" : ""}</button><button id="xmback2">Back to question ${XS.i + 1}</button></div>`;
  A.el.innerHTML = `<div class="xm-wrap single"><div class="xm-pane">${html}</div></div>`; A.el.scrollTop = 0;
  $("#xmleave").onclick = () => { if (mode === "drill") drillDone(); else leave(); };
  $$(".xm-grid button").forEach(b => b.onclick = () => jumpTo(+b.dataset.i));
  $("#xmback2").onclick = () => renderItem();
  $("#xmsubmit").onclick = () => { if (mode === "drill") return drillDone(); if (ask(`Submit now?${un ? " " + un + " unanswered questions will be scored as wrong." : ""}`)) submit(false); };
}

/* ---------- scoring ---------- */
function scoreQ(it) { const q = bankQ(it.id); if (MS.isMs(q)) return MS.scoreMs(q, it); const ok = q.o.map((o, i) => o.ok ? i : -1).filter(i => i >= 0).sort(); const a = it.ans.slice().sort(); return ok.length === a.length && ok.every((v, k) => v === a[k]) ? 1 : 0; }
function scoreP(it) { const p = pbqItem(it.id); return sim(p.type).score(p, it.st); }
function submit(timedOut) {
  if (!XS || XS.done) return;
  const r = R();
  LP.end(XS, save);
  XS.running = false; XS.done = true; if (timer) { clearInterval(timer); timer = null; }
  const dom = {}; domIds().forEach(d => dom[d] = [0, 0]); const conf = { 0: [0, 0], 1: [0, 0], 2: [0, 0] };
  let pts = 0, max = 0; const miss = [], guess = [], flags = [], detail = [];
  XS.items.forEach(it => {
    if (it.k === "q") { const q = bankQ(it.id); const s = scoreQ(it); pts += s; max += 1; dom[q.d][0] += s; dom[q.d][1] += 1; conf[it.conf][0] += s; conf[it.conf][1] += 1; if (!s) miss.push(it.id); if (it.conf === 2) guess.push(it.id); if (it.fl) flags.push(it.id); detail.push({ id: it.id, r: s, conf: it.conf, ans: it.ans, ...(it.lk ? { lk: it.lk } : {}) }); }
    else { const p = pbqItem(it.id); const s = scoreP(it); const e = s.f * r.pbqPts; pts += e; max += r.pbqPts; const d = p.d || domIds()[0]; dom[d][0] += e; dom[d][1] += r.pbqPts; conf[it.conf][0] += s.f; conf[it.conf][1] += 1; if (s.f < 1) miss.push(it.id); if (it.conf === 2) guess.push(it.id); if (it.fl) flags.push(it.id); detail.push({ id: it.id, r: s.f, conf: it.conf, notes: s.notes, why: s.why }); }
  });
  for (const d in dom) dom[d][0] = Math.round(dom[d][0] * 100) / 100;
  for (const c in conf) conf[c][0] = Math.round(conf[c][0] * 100) / 100;
  const raw = Math.round(pts / max * 100); const scaled = Math.round(r.scaleMin + (r.scaleMax - r.scaleMin) * pts / max);
  const fresh = !XS.practice && XS.x !== "mix" && taken(XS.x) === 0;
  const gate = fresh && raw >= r.gate.all && Object.values(dom).every(p => pct(p) >= r.gate.dom);
  const res = { id: XS.id, t: Date.now(), x: XS.x, fresh, practice: !!XS.practice, raw, scaled, pass: scaled >= r.pass, gate, dom, conf, secs: Math.round(XS.elapsed / 1000), pauses: XS.pauses.length, timedOut: !!timedOut, miss, guess, flags, detail };
  if (r.learnPane) res.learn = LP.summary(XS, it => it.k === "q" ? scoreQ(it) : scoreP(it).f);
  hist().push(res);
  bumpDay(A.packId, 5); persist();
  XS = null; clearInprog(A.packId);
  showResult(res, true);
}

/* ---------- results ---------- */
export function showResult(res, justFinished) {
  const r = R(); const c = res.pass ? "var(--green)" : "var(--red)";
  const wk = Object.keys(res.dom).filter(d => pct(res.dom[d]) < r.gate.dom);
  let html = `<div class="tb"><button id="xmhome">Exams</button><div class="labtitle">${bankName(res.x)} · ${fmtDateTime(res.t)}</div></div>`;
  html += `<div class="xm-score"><div class="big" style="color:${c}">${res.scaled}</div><div class="pf" style="color:${c}">${res.pass ? "PASS" : "NOT YET"} · ${res.raw}% raw · ${r.pass} to pass</div><div class="sub">${Math.round(res.secs / 60)} min used${res.pauses ? " · paused " + res.pauses + "×" : ""}${res.timedOut ? " · <b style='color:var(--red)'>time ran out</b>" : ""} · ${res.miss.length} missed · ${res.guess.length} marked no-clue${res.practice ? " · practice run" : ""}</div></div>`;
  html += `<div class="gatebox"><div class="gt">GATE CHECK · ${r.gate.all}% overall, ${r.gate.dom}% every domain</div><div class="gv">${res.gate ? "<b>Cleared.</b> This attempt counts toward the two-in-a-row." : (res.practice ? "Practice runs never count toward the gate. " : res.fresh === false ? "Not a fresh exam, so it can't count toward the gate. " : "") + (res.raw < r.gate.all ? `<i>${res.raw}%</i> overall, need ${r.gate.all}%. ` : "") + (wk.length ? `Under ${r.gate.dom}% in <i>${wk.map(d => domName(d)).join(", ")}</i>.` : "")}</div></div>`;
  html += `<div class="reft">By domain</div><div class="xm-bars">${domIds().map(d => { const p = pct(res.dom[d]); const w = A.manifest.sections.find(s => s.d === d).weight; return `<div class="xm-bar"><span class="nm">${domName(d)}<br><span class="dim">${w}% of exam · ${res.dom[d][1]} pts</span></span><span class="tr"><i class="${p >= r.gate.all ? "" : p >= r.gate.dom ? "warn" : "bad"}" style="width:${p}%"></i></span><span class="pc" style="color:${p >= r.gate.all ? "var(--green)" : p >= r.gate.dom ? "var(--amber)" : "var(--red)"}">${p}%</span></div>`; }).join("")}</div>`;
  html += `<div class="reft">How good are your guesses?</div><table class="xm-tbl"><tr><th>You said</th><th class="r">Questions</th><th class="r">Right</th><th class="r">Hit rate</th></tr>${[0, 1, 2].map(k => { const p = res.conf[k]; const q = p[1] ? Math.round(p[0] / p[1] * 100) : null; return `<tr><td class="g${k}">${CONF[k]}<br><span class="dim">${CONFLONG[k]}</span></td><td class="r">${p[1]}</td><td class="r">${Math.round(p[0])}</td><td class="r g${k}">${q === null ? "—" : q + "%"}</td></tr>`; }).join("")}</table>`;
  html += `<div class="xm-note">${confNote(res)}</div>`;
  html += LP.readoutHtml(res, r);
  html += `<div class="xm-actions">${res.miss.length || res.guess.length ? `<button class="pri" id="xmdrill">Drill the ${new Set(res.miss.concat(res.guess)).size} missed + guessed (with answers)</button>` : ""}${res.miss.length ? `<button class="amb" id="xmreview">Review every miss with explanations</button>` : ""}<button id="xmcards">Flashcards for the weak topics</button><button class="ghost" id="xmhome2">Back to exams</button></div>`;
  A.el.innerHTML = html; A.el.scrollTop = 0;
  $("#xmhome").onclick = () => renderExam(A); $("#xmhome2").onclick = () => renderExam(A);
  const dr = $("#xmdrill"); if (dr) dr.onclick = () => startDrill(res);
  const rv = $("#xmreview"); if (rv) rv.onclick = () => review(res);
  $("#xmcards").onclick = () => cardsFor(res);
}
function confNote(res) {
  const s = res.conf[0], l = res.conf[1], g = res.conf[2]; const p = x => x[1] ? x[0] / x[1] * 100 : null; const ps = p(s), pl = p(l), pg = p(g); const out = [];
  if (ps !== null && ps < 85) out.push(`<b>Overconfidence check:</b> you were "sure" on ${s[1]} questions but only got ${Math.round(ps)}% of them. Those are the misses to study hardest: you don't know that you don't know them.`);
  else if (ps !== null) out.push(`<b>Calibration is good:</b> when you said "sure" you were right ${Math.round(ps)}% of the time.`);
  if (pg !== null) out.push(pg >= 50 ? `<b>Your guesses beat chance</b> (${Math.round(pg)}% on ${g[1]} "no clue" questions vs ~25% random). Trust your instincts on the real exam: never leave one blank.` : `Your "no clue" guesses landed ${Math.round(pg)}% (${g[1]} questions). Around 25% is pure chance; use the explanations to learn how to eliminate distractors.`);
  if (pl !== null) out.push(`"Leaning" answers: ${Math.round(pl)}% right on ${l[1]}. ${pl >= 70 ? "Your lean is usually right; commit to it." : "When you lean, slow down and eliminate two options before choosing."}`);
  return out.join(" ") || "Mark your confidence on every question next time to unlock this analysis.";
}
function cardsFor(res) {
  const cats = {}; res.miss.forEach(id => { const q = bankQ(id) || pbqItem(id); if (q && q.cat) cats[q.cat] = (cats[q.cat] || 0) + 1; });
  const order = Object.keys(cats).sort((a, b) => cats[b] - cats[a]);
  if (!order.length) { alert("No misses to build from. Nice."); return; }
  let set = []; order.forEach(c => { set = set.concat(shuffle(A.content.cards.filter(cd => cd.c === c)).slice(0, Math.max(3, Math.ceil(20 * cats[c] / res.miss.length)))); });
  A.go("session", { set: shuffle(set).slice(0, 24), deck: "exam" });
}
function review(res) {
  let html = `<div class="tb"><button id="xmback">Report</button><div class="labtitle">Misses · ${res.miss.length}</div></div><p class="lead">Every miss, with why the right answer is right and why each distractor is wrong. Read it once now and again tomorrow.</p>`;
  res.miss.forEach(id => {
    const d = res.detail.find(x => x.id === id); const q = bankQ(id);
    if (q && MS.isMs(q)) html += MS.reviewHtml(q, d, domName(q.d), CONF);
    else if (q) html += `<div class="xm-rev"><div class="rh"><span style="color:var(--amber)">${domName(q.d)}${q.t === "ms" ? " · choose " + q.pick : ""}${q.obj ? " · obj " + q.obj : ""}</span><span class="st">${d && d.conf !== undefined ? CONF[d.conf] : ""} · missed</span></div>${q.ex ? `<pre class="out">${esc(q.ex)}</pre>` : ""}<div class="rq">${esc(q.q)}</div><div class="xm-opts">${q.o.map((o, i) => `<div class="xm-opt static ${o.ok ? "right" : (d && d.ans && d.ans.includes(i)) ? "wrong" : ""}"><span class="k">${o.ok ? "✓" : (d && d.ans && d.ans.includes(i)) ? "✗" : ""}</span><span>${esc(o.t)}<span class="ox">${esc(o.x)}</span></span></div>`).join("")}</div><div class="rx"><b>Remember:</b> ${esc(q.w)}</div></div>`;
    else { const p = pbqItem(id); if (!p) return; html += `<div class="xm-rev"><div class="rh"><span style="color:var(--amber)">${p.d ? domName(p.d) : "PBQ"} · PBQ${p.obj ? " · obj " + p.obj : ""}</span><span class="st">${d ? Math.round(d.r * 100) + "%" : ""}</span></div><div class="rq">${esc(p.title)}</div>${p.out ? `<pre class="out">${esc(p.out)}</pre>` : ""}<div class="rx">${d && d.notes ? esc(d.notes.join("\n")).replace(/\n/g, "<br>") : ""}${d && d.why ? `<br><br><b>Remember:</b> ${esc(d.why)}` : ""}</div></div>`; }
  });
  A.el.innerHTML = html; A.el.scrollTop = 0;
  $("#xmback").onclick = () => showResult(res);
}

/* ---------- drill: re-run missed + guessed with instant feedback ---------- */
function startDrill(res) {
  const ids = [...new Set(res.miss.concat(res.guess))];
  const qs = ids.filter(id => bankQ(id)), pbs = ids.filter(id => pbqItem(id)).map(pbqItem);
  mode = "drill";
  XS = { x: res.x, items: pbs.map(newPbqItem).concat(shuffle(qs).map(id => { const q = bankQ(id); return { k: "q", id, ord: MS.initialOrder(q), ans: [], conf: 0, fl: false }; })), i: 0, elapsed: 0, running: false, pauses: [], started: Date.now(), done: false, drill: true, from: res, right: 0 };
  drillItem();
}
function drillItem() {
  const it = XS.items[XS.i]; const n = XS.items.length;
  let html = `<div class="tb"><button id="xmleave">Exit</button><span class="xm-count">Drill · ${XS.i + 1} / ${n} · ${XS.right} right</span><span class="sp"></span></div>`;
  html += (it.k === "q" ? questionHtml(it) : pbqShell(it)) + `<div id="xmfb"></div><div class="xm-nav"><button class="next" id="xmcheck">Check</button></div>`;
  A.el.innerHTML = `<div class="xm-wrap single"><div class="xm-pane">${html}</div></div>`; A.el.scrollTop = 0;
  $("#xmleave").onclick = () => drillDone();
  if (it.k === "q") bindQuestion(it); else mountPbq(it, false);
  $("#xmcheck").onclick = () => {
    let fb = "";
    if (it.k === "q" && MS.isMs(bankQ(it.id))) {
      const q = bankQ(it.id); const r = scoreQ(it); if (r) XS.right++;
      $$("#xmopts button, #xmopts [data-i]").forEach(b => { b.onclick = null; b.disabled = true; });
      fb = `<div class="xm-fb"><b>${r ? "Correct." : "Not quite."}</b> ${esc(q.w || "")}</div>${MS.keyHtml(q, it)}`;
    } else if (it.k === "q") {
      const q = bankQ(it.id); const r = scoreQ(it); if (r) XS.right++;
      $$("#xmopts .xm-opt").forEach(b => { const i = +b.dataset.i; const o = q.o[i]; b.classList.remove("sel"); if (o.ok) b.classList.add("right"); else if (it.ans.includes(i)) b.classList.add("wrong"); b.onclick = null; const sp = document.createElement("span"); sp.className = "ox"; sp.textContent = o.x; b.lastElementChild.appendChild(sp); });
      fb = `<div class="xm-fb"><b>${r ? "Correct." : "Not quite."}</b> ${esc(q.w)}</div>`;
    } else {
      const s = scoreP(it); if (s.f >= 0.999) XS.right++;
      fb = `<div class="xm-fb"><b>${Math.round(s.f * 100)}%</b>\n${esc(s.notes.join("\n"))}${s.why ? "\n\n" + esc(s.why) : ""}</div>`;
      mountPbq(it, true);
    }
    $("#xmfb").innerHTML = fb;
    $("#xmcheck").textContent = XS.i === n - 1 ? "Finish" : "Next";
    $("#xmcheck").onclick = () => { XS.i++; if (XS.i >= n) drillDone(); else drillItem(); };
    $("#xmfb").scrollIntoView({ behavior: "smooth", block: "end" });
  };
}
function drillDone() {
  const from = XS && XS.from; const n = XS ? XS.items.length : 0, r = XS ? XS.right : 0;
  XS = null; mode = "exam";
  if (from) {
    bumpDay(A.packId, 1); persist();
    A.el.innerHTML = `<div class="tb"><button id="xmback">Report</button><div class="labtitle">Drill done</div></div><div class="xm-score"><div class="big" style="color:${n && r / n >= .8 ? "var(--green)" : "var(--amber)"}">${n ? Math.round(r / n * 100) : 0}%</div><div class="sub">${r} of ${n} on the second pass.</div></div><div class="xm-actions"><button class="pri" id="xmagain">Run the drill again</button><button class="ghost" id="xmback2">Back to report</button></div>`;
    $("#xmback").onclick = () => showResult(from); $("#xmback2").onclick = () => showResult(from); $("#xmagain").onclick = () => startDrill(from);
  } else renderExam(A);
}
export function stopExamTimer() { if (timer) { clearInterval(timer); timer = null; } if (XS && XS.running && !XS.drill) { LP.end(XS, save); XS.running = false; save(); } }
