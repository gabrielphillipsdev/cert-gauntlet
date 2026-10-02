/* Cert Gauntlet — exam-style question sets, confusable twins, speed rounds, miss list, reference sheet. */
import { $, $$, esc, shuffle, pick } from "../util.js";
import { pack, rec, touch, bumpDay, persist } from "../store.js";
import { mastered } from "../srs.js";
import { weakPick } from "../ready.js";
import { genRisk } from "../sims/generators.js";

const tb = (title, back = "Exit") => `<div class="tb"><button data-back>${back}</button><div class="labtitle">${esc(title)}</div></div>`;
function bindBack(A, fn) { $("[data-back]", A.el).onclick = fn || (() => A.go("home")); }
const scoreColor = pct => pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--amber)" : "var(--red)";

/* ================= EXAM-STYLE QUESTIONS ================= */
let xq = null;
export function renderExq(A, args = {}) {
  if (args.start) return startExq(A, args.start);
  const p = pack(A.packId); const EXQ = A.content.exq || []; const m = A.manifest;
  const tot = EXQ.reduce((a, q) => a + ((p.exq[q.id] || {}).seen || 0), 0), r = EXQ.reduce((a, q) => a + ((p.exq[q.id] || {}).right || 0), 0);
  const seen = EXQ.filter(q => p.exq[q.id]).length; const missedN = EXQ.filter(q => p.exq[q.id] && p.exq[q.id].last === 0).length;
  const dom = m.sections.map(s => { const qs = EXQ.filter(q => q.d === s.d); const sn = qs.reduce((a, q) => a + ((p.exq[q.id] || {}).seen || 0), 0), rr = qs.reduce((a, q) => a + ((p.exq[q.id] || {}).right || 0), 0); return `<div class="pairrow">${esc(m.domName[s.d])}<span>${sn ? Math.round(rr / sn * 100) + "% · " : ""}${qs.length} Qs</span></div>`; }).join("");
  A.el.innerHTML = tb("Exam-style questions") + `<p class="lead">Facts are the cards' job. This is the exam's job: a scenario, four plausible answers, and words like MOST likely and BEST. ${EXQ.length} questions weighted like the real blueprint. ${seen}/${EXQ.length} seen${tot ? `, ${Math.round(r / tot * 100)}% right over ${tot} answers` : ""}.</p><button class="bigbtn green" id="xqstart">Start a set of 15</button>${missedN ? `<button class="ghost wide" id="xqmiss">Retry the ${missedN} you missed last time</button>` : ""}<div class="reft">Accuracy by domain</div>${dom}`;
  bindBack(A);
  $("#xqstart", A.el).onclick = () => startExq(A, 15);
  if (missedN) $("#xqmiss", A.el).onclick = () => startExq(A, 0, shuffle(EXQ.filter(q => p.exq[q.id] && p.exq[q.id].last === 0)));
}
function exqPick(A, n) {
  const p = pack(A.packId); const EXQ = A.content.exq || [];
  const unseen = weakPick(A, EXQ.filter(q => !p.exq[q.id]), n, q => q.d);
  const missed = shuffle(EXQ.filter(q => p.exq[q.id] && p.exq[q.id].last === 0)); const rest = shuffle(EXQ.filter(q => p.exq[q.id] && p.exq[q.id].last !== 0));
  return unseen.concat(missed, rest).slice(0, n);
}
function startExq(A, n, pool) { xq = { queue: pool || exqPick(A, n), i: 0, right: 0, locked: false }; xqQuestion(A); }
function xqQuestion(A) {
  if (xq.i >= xq.queue.length) return xqDone(A);
  const q = xq.queue[xq.i]; xq.locked = false; const order = shuffle([0, 1, 2, 3]);
  A.el.innerHTML = tb("Exam-style questions") + `<div class="spscore">${xq.i + 1} / ${xq.queue.length} · ${xq.right} right</div><div class="xdom">${esc(A.manifest.domName[q.d])}${q.obj ? ` · obj ${q.obj}` : ""}</div><div class="xq">${esc(q.q)}</div><div class="optcol" id="xopts">${order.map(i => `<button class="opt" data-i="${i}">${esc(q.o[i])}</button>`).join("")}</div><div id="xnote"></div>`;
  bindBack(A, () => renderExq(A));
  $$("#xopts .opt", A.el).forEach(b => b.onclick = () => xqAnswer(A, +b.dataset.i));
}
function xqAnswer(A, i) {
  if (xq.locked) return; xq.locked = true;
  const q = xq.queue[xq.i]; const right = i === 0;
  const s = touch(rec(A.packId, "exq", q.id, { seen: 0, right: 0, last: 1 })); s.seen++; if (right) { s.right++; xq.right++; } s.last = right ? 1 : 0;
  $$("#xopts .opt", A.el).forEach(b => { const k = +b.dataset.i; if (k === 0) b.classList.add("right"); else if (k === i) b.classList.add("wrong"); b.disabled = true; });
  $("#xnote", A.el).innerHTML = `<div class="xnote">${right ? "<b>Correct.</b> " : `<div class="xpick"><b>You picked:</b> ${esc(q.o[i])}\n${esc(q.n[i - 1] || "")}</div><b>Why ${esc(q.o[0])}:</b> `}${esc(q.w)}</div><button class="bigbtn amber" id="xnext">${xq.i + 1 >= xq.queue.length ? "Finish" : "Next"}</button>`;
  $("#xnext", A.el).onclick = () => { xq.i++; xqQuestion(A); };
  bumpDay(A.packId, 1); persist();
}
function xqDone(A) {
  const n = xq.queue.length, pct = n ? Math.round(xq.right / n * 100) : 0;
  A.el.innerHTML = tb("Exam-style questions") + `<div class="fbscore center" style="color:${scoreColor(pct)}">${pct}%</div><p class="lead center">${xq.right} of ${n}. ${pct >= 80 ? "That's exam-ready pace on this set." : "Misses are on your Miss list with the full reasoning."}</p><button class="bigbtn green" id="xqagain">Another set of 15</button><button class="ghost wide" id="xqhome">Back</button>`;
  bindBack(A, () => renderExq(A)); $("#xqagain", A.el).onclick = () => startExq(A, 15); $("#xqhome", A.el).onclick = () => renderExq(A);
}

/* ================= TWINS ================= */
let tw = null;
export function renderTwins(A) {
  const p = pack(A.packId); const TWINS = A.content.twins || [];
  const rows = TWINS.map(x => ({ x, st: p.twins[x.a + "|" + x.b] || { seen: 0, right: 0 } }));
  const seen = rows.reduce((a, r) => a + r.st.seen, 0), right = rows.reduce((a, r) => a + r.st.right, 0);
  const worst = rows.filter(r => r.st.seen >= 2).sort((a, b) => (a.st.right / a.st.seen) - (b.st.right / b.st.seen)).slice(0, 6);
  A.el.innerHTML = tb("Confusable twins") + `<p class="lead">The exam's wrong answers are near-twins. Read the statement, tap the term it describes. ${TWINS.length} pairs.${seen ? ` You're at ${Math.round(right / seen * 100)}% over ${seen} statements.` : ""}</p><button class="bigbtn green" id="twstart">Start a set of 20</button>${worst.length ? `<div class="reft">Pairs you miss most</div>` + worst.map(r => `<div class="pairrow">${esc(r.x.a)} vs ${esc(r.x.b)}<span>${r.st.right}/${r.st.seen}</span></div>`).join("") : ""}`;
  bindBack(A); $("#twstart", A.el).onclick = () => startTwins(A);
}
function startTwins(A) { const items = []; (A.content.twins || []).forEach(x => x.s.forEach(st => items.push({ x, st }))); tw = { queue: shuffle(items).slice(0, 20), i: 0, right: 0, locked: false }; twQuestion(A); }
function twQuestion(A) {
  if (tw.i >= tw.queue.length) return twDone(A);
  const { x, st } = tw.queue[tw.i]; tw.locked = false;
  A.el.innerHTML = tb("Confusable twins") + `<div class="spscore">${tw.i + 1} / ${tw.queue.length} · ${tw.right} right</div><div class="twq">${esc(st[0])}</div><div class="twbtns"><button data-k="a">${esc(x.a)}</button><button data-k="b">${esc(x.b)}</button></div><div class="twnote" id="twnote"></div>`;
  bindBack(A, () => renderTwins(A));
  $$(".twbtns button", A.el).forEach(b => b.onclick = () => twAnswer(A, b, b.dataset.k === st[1]));
}
function twAnswer(A, btn, right) {
  if (tw.locked) return; tw.locked = true;
  const { x, st } = tw.queue[tw.i];
  const t = touch(rec(A.packId, "twins", x.a + "|" + x.b, { seen: 0, right: 0 })); t.seen++; if (right) { t.right++; tw.right++; }
  $$(".twbtns button", A.el).forEach(b => { if (b.dataset.k === st[1]) b.classList.add("right"); else if (b === btn) b.classList.add("wrong"); b.disabled = true; });
  $("#twnote", A.el).innerHTML = (right ? "<b>Right.</b> " : "<b>Not quite.</b> ") + esc(x.n) + (right ? "" : `<button class="bigbtn amber" id="twnext">Next</button>`);
  if (right) setTimeout(() => { tw.i++; twQuestion(A); }, 1100); else $("#twnext", A.el).onclick = () => { tw.i++; twQuestion(A); };
  bumpDay(A.packId, 1); persist();
}
function twDone(A) {
  const pct = Math.round(tw.right / tw.queue.length * 100);
  A.el.innerHTML = tb("Confusable twins") + `<div class="fbscore center" style="color:${scoreColor(pct)}">${pct}%</div><p class="lead center">${tw.right} of ${tw.queue.length}. Misses feed the list on the Twins screen.</p><button class="bigbtn green" id="twagain">Another 20</button><button class="ghost wide" id="twhome">Back to Twins</button>`;
  bindBack(A, () => renderTwins(A)); $("#twagain", A.el).onclick = () => startTwins(A); $("#twhome", A.el).onclick = () => renderTwins(A);
}

/* ================= SPEED ROUNDS =================
   manifest.sprints: [{kind, name, color, make(content) -> {q, ans, opts}}] — built-in kinds: ports, acro, risk. */
let sp = { kind: "", t: 0, timer: null, score: 0, n: 0, locked: false };
const PORTCARDS = c => c.cards.filter(x => x.c === "ports" && /^\d/.test(x.short));
const BUILTIN = {
  ports: { name: "Ports sprint", color: "var(--green)", make(c) { const cards = PORTCARDS(c); const x = pick(cards); const pool = shuffle([...new Set(cards.filter(y => y.short !== x.short).map(y => y.short))]); return { q: x.q, ans: x.short, opts: shuffle([x.short, ...pool.slice(0, 3)]), explain: a => { const pk = cards.find(y => y.short === a); return pk ? a + " is " + pk.q : ""; } }; } },
  acro: { name: "Acronym sprint", color: "var(--amber)", wide: true, make(c) { const a = pick(c.acronyms); const pool = shuffle(c.acronyms.filter(x => x[0] !== a[0]).map(x => x[1])); return { q: a[0], ans: a[1], opts: shuffle([a[1], ...pool.slice(0, 3)]) }; } },
  risk: { name: "Risk-math sprint", color: "var(--panel-2)", ink: true, make() { const g = genRisk(); const kind = pick(["sle", "ale", "aro"]); const $$ = n => "$" + Math.round(n).toLocaleString(); let q, ans, ds; if (kind === "sle") { q = `AV ${$$(g.av)}, EF ${g.ef}%. SLE?`; ans = $$(g.sle); ds = [$$(g.sle * 2), $$(g.av - g.sle), $$(g.sle / 2), $$(g.av)]; } else if (kind === "ale") { q = `SLE ${$$(g.sle)}, ${g.aroTxt}. ALE?`; ans = $$(g.ale); ds = [$$(g.sle), $$(g.ale * 2), $$(g.sle * (g.aro >= 1 ? g.aro + 1 : 1 / g.aro)), $$(g.ale / 2)]; } else { q = `Expected ${g.aroTxt}. ARO?`; ans = String(g.aro); ds = [String(1 / g.aro), String(g.aro * 2), String(g.aro / 2), "1"]; } const uniq = [...new Set(ds.filter(d => d !== ans))].slice(0, 3); return { q, ans, opts: shuffle([ans, ...uniq]) }; } },
};
function sprintKinds(A) { return (A.manifest.sprints || ["ports", "acro", "risk"]).map(k => typeof k === "string" ? { kind: k, ...BUILTIN[k] } : k); }
export function renderSprint(A) {
  if (sp.timer) { clearInterval(sp.timer); sp.timer = null; }
  const p = pack(A.packId);
  A.el.innerHTML = tb("Speed rounds") + `<p class="lead">90 seconds. Tap as fast as you can; a miss costs nothing but time. When these are automatic, the scenario questions stop eating your clock.</p>` + sprintKinds(A).map(k => { const b = p.sprint[k.kind] || {}; return `<button class="bigbtn" data-kind="${k.kind}" style="background:${k.color};${k.ink ? "color:var(--ink)" : ""}">${esc(k.name)}<small>best ${b.best || 0} · ${b.runs || 0} runs</small></button>`; }).join("");
  bindBack(A); $$("[data-kind]", A.el).forEach(b => b.onclick = () => startSprint(A, b.dataset.kind));
}
function startSprint(A, kind) {
  sp = { kind, t: 90, timer: null, score: 0, n: 0, locked: false };
  sp.timer = setInterval(() => { sp.t--; const el = $("#sptimer", A.el); if (el) { el.textContent = sp.t + "s"; el.classList.toggle("low", sp.t <= 10); } if (sp.t <= 0) endSprint(A); }, 1000);
  spQuestion(A);
}
function spQuestion(A) {
  sp.locked = false; const def = sprintKinds(A).find(k => k.kind === sp.kind); const q = def.make(A.content);
  A.el.innerHTML = tb("Speed rounds") + `<div class="sptimer${sp.t <= 10 ? " low" : ""}" id="sptimer">${sp.t}s</div><div class="spscore">${sp.score} right · ${sp.n} answered</div><div class="spq">${esc(q.q)}</div><div class="spopts${def.wide ? " wide" : ""}">${q.opts.map(o => `<button>${esc(o)}</button>`).join("")}</div>`;
  bindBack(A, () => { clearInterval(sp.timer); sp.timer = null; renderSprint(A); });
  $$(".spopts button", A.el).forEach(b => b.onclick = () => {
    if (sp.locked || !sp.timer) return; sp.locked = true; sp.n++;
    const ok = b.textContent === q.ans;
    if (ok) { sp.score++; b.classList.add("right"); } else { b.classList.add("wrong"); $$(".spopts button", A.el).forEach(x => { if (x.textContent === q.ans) x.classList.add("right"); }); if (q.explain) { const t = q.explain(b.textContent); if (t) { const c = document.createElement("div"); c.className = "spscore"; c.textContent = t; A.el.appendChild(c); } } }
    setTimeout(() => { if (sp.timer) spQuestion(A); }, ok ? 250 : 1300);
  });
}
function endSprint(A) {
  clearInterval(sp.timer); sp.timer = null;
  const s = touch(rec(A.packId, "sprint", sp.kind, { best: 0, runs: 0 })); s.runs++; const isBest = sp.score > s.best; s.best = Math.max(s.best, sp.score);
  bumpDay(A.packId, sp.n); persist();
  A.el.innerHTML = tb("Speed rounds") + `<div class="fbscore center" style="color:var(--green)">${sp.score}</div><p class="lead center">right in 90 seconds, ${sp.n} answered${isBest ? ". New best!" : ". Best: " + s.best + "."}</p><button class="bigbtn green" id="spagain">Run it again</button><button class="ghost wide" id="spmenu">Back to speed rounds</button>`;
  bindBack(A, () => renderSprint(A)); $("#spagain", A.el).onclick = () => startSprint(A, sp.kind); $("#spmenu", A.el).onclick = () => renderSprint(A);
}
export function stopSprint() { if (sp.timer) { clearInterval(sp.timer); sp.timer = null; } }

/* ================= MISS LIST ================= */
export function renderMiss(A) {
  const p = pack(A.packId); const m = A.manifest; const D = A.content.diagrams || {};
  const rows = A.content.cards.map(cd => { const s = p.cards[cd.sid]; if (!s) return null; const mm = s.seen - s.right; return mm > 0 ? { cd, m: mm, seen: s.seen, ok: mastered(A.packId, cd) } : null; }).filter(Boolean).sort((a, b) => (b.m - a.m) || (a.ok - b.ok) || (b.seen - a.seen));
  const xrows = (A.content.exq || []).map(q => { const s = p.exq[q.id]; if (!s) return null; const mm = s.seen - s.right; return mm > 0 ? { q, m: mm, seen: s.seen, last: s.last } : null; }).filter(Boolean).sort((a, b) => (b.m - a.m) || (a.last - b.last));
  let html = tb("Miss list") + `<p class="lead">Everything you've ever missed, worst first. Re-read it once a day; tap a row for the full reasoning.</p>`;
  if (!rows.length && !xrows.length) html += `<p class="lead">Nothing missed yet. Run a set and this list fills itself.</p>`;
  if (rows.length) html += `<button class="bigbtn green" id="missdrill">Drill the ${Math.min(20, rows.length)} worst cards</button><div class="reft">Cards · ${rows.length}</div>` + rows.map(r => { const cd = r.cd; const lines = cd.a.split("\n").filter(l => !l.startsWith("#")); return `<div class="mrow"><div class="mrh"><span class="mcat" style="color:${m.cats[cd.c].color}">${esc(m.cats[cd.c].name)}</span><span class="mrn">${r.m}× missed · ${r.seen} seen${r.ok ? " · mastered now" : ""}</span></div><div class="mrq">${esc(cd.q)}</div><div class="mra">${esc(cd.short)}</div><div class="mrx">${cd.vq && D[cd.vq] ? `<div class="qwrap">${D[cd.vq]}</div>` : ""}${lines.length ? esc(lines.join("\n")) + "\n\n" : ""}${cd.w ? "Hook: " + esc(cd.w) + "\n\n" : ""}${esc(cd.x || "")}</div></div>`; }).join("");
  if (xrows.length) html += `<div class="reft">Exam questions · ${xrows.length}</div>` + xrows.map(r => { const q = r.q; return `<div class="mrow"><div class="mrh"><span class="mcat amber">${esc(m.domName[q.d])}</span><span class="mrn">${r.m}× missed · ${r.seen} seen${r.last ? " · got it last time" : ""}</span></div><div class="mrq">${esc(q.q)}</div><div class="mra">${esc(q.o[0])}</div><div class="mrx">${esc(q.w)}\n\nWhy the others are wrong:\n${q.n.map((t, i) => "• " + esc(q.o[i + 1]) + " — " + esc(t)).join("\n")}</div></div>`; }).join("");
  A.el.innerHTML = html; bindBack(A);
  $$(".mrow", A.el).forEach(el => el.onclick = () => el.classList.toggle("open"));
  const d = $("#missdrill", A.el); if (d) d.onclick = () => A.go("session", { set: rows.slice(0, 20).map(r => r.cd), deck: "miss" });
}

/* ================= REFERENCE SHEET ================= */
export function renderRef(A) {
  const c = A.content; const T = (rows, h) => `<table class="rf">${h ? `<tr>${h.map(x => `<th>${x}</th>`).join("")}</tr>` : ""}${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join("")}</tr>`).join("")}</table>`;
  let html = tb("Brain-dump sheet") + `<p class="lead">The last-five-minutes skim. Nothing here you have not already seen on a card.</p>`;
  const ports = PORTCARDS(c); if (ports.length) html += `<div class="reft">Secure ports</div>` + T(ports.map(x => [esc(x.short), esc(x.q), esc(x.a.split("\n").filter(l => !l.startsWith("#"))[0] || "")]), ["Port", "Protocol", "Notes"]);
  (c.reference || []).forEach(sec => { html += `<div class="reft">${esc(sec.title)}</div>` + T(sec.rows.map(r => r.map(esc)), sec.head || null); });
  A.el.innerHTML = html; bindBack(A);
}
