/* Cert Gauntlet — Microsoft exam item types for the exam runner (added by Chat 6; the existing mc/ms path is untouched).
   Types: order (drag-drop ordering) · build (build list: pick the subset, then order) · hot (hot area) · series (problem-solution Yes/No)
   plus the case study wrapper (pinned scenario tabs on mc/ms/order/build questions that carry caseId).
   Section rules (manifest.exam.caseFirst / seriesLast): case study first and locked once left; middle backtrackable with mark-for-review;
   solution series last with no backtrack and no review grid. Schemas: dev/specs/sc200.md §6.
   The pack flattens its banks with flattenBank() so the runner's bankQ() lookup keeps working. */
import { esc, shuffle, ask } from "../util.js";
import { registerSim } from "../sims/registry.js";

const MS_TYPES = new Set(["order", "build", "hot", "series"]);
export const isMs = q => !!q && MS_TYPES.has(q.t);
export const applies = r => !!(r && (r.caseFirst || r.seriesLast || (r.itemTypes || []).some(t => MS_TYPES.has(t) || t === "case")));
let cssDone = false;
function ensureCss() { if (cssDone || typeof document === "undefined") return; cssDone = true; const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("./msitems.css", import.meta.url).href; document.head.appendChild(l); }

/* ---------- bank flattening (used by packs/sc200/pack.js) ---------- */
export function flattenBank(units) {
  const out = [];
  for (const u of units) {
    if (u.t === "case") u.questions.forEach((q, i) => out.push({ ...q, caseId: u.id, caseTitle: u.title, tabs: u.tabs, caseN: i + 1, caseOf: u.questions.length }));
    else if (u.t === "series") u.solutions.forEach((s, i) => out.push({ id: `${u.id}-${i + 1}`, d: u.d, obj: u.obj, cat: u.cat, t: "series", scenario: u.scenario, seriesId: u.id, n: i + 1, of: u.solutions.length, s: s.s, ok: !!s.ok, x: s.x || "", w: u.w || "", q: `${u.id} solution ${i + 1}` }));
    else out.push(u);
  }
  return out;
}

/* ---------- ordering a sitting ---------- */
const sec = q => q.caseId ? "case" : q.t === "series" ? "series" : "mid";
export function arrangeBank(flat) {
  const cases = flat.filter(q => sec(q) === "case"), series = flat.filter(q => sec(q) === "series"), mid = shuffle(flat.filter(q => sec(q) === "mid"));
  return cases.concat(mid, series);
}
/* Random mix: one case study + one solution series drawn whole, standalone items filled to the per-domain quota */
export function mixPick(allFlat, r) {
  const groups = {}; allFlat.forEach(q => { if (q.caseId) (groups[q.caseId] = groups[q.caseId] || []).push(q); });
  const sgroups = {}; allFlat.forEach(q => { if (q.seriesId) (sgroups[q.seriesId] = sgroups[q.seriesId] || []).push(q); });
  const caseIds = Object.keys(groups), seriesIds = Object.keys(sgroups);
  const cas = caseIds.length ? groups[caseIds[Math.floor(Math.random() * caseIds.length)]] : [];
  const ser = seriesIds.length ? sgroups[seriesIds[Math.floor(Math.random() * seriesIds.length)]] : [];
  const need = {}; for (const d in r.mixQuota) need[d] = r.mixQuota[d];
  cas.concat(ser).forEach(q => { if (need[q.d] !== undefined) need[q.d]--; });
  const byD = {}; allFlat.filter(q => sec(q) === "mid").forEach(q => (byD[q.d] = byD[q.d] || []).push(q));
  let mid = []; for (const d in need) mid = mid.concat(shuffle((byD[d] || []).slice()).slice(0, Math.max(0, need[d])));
  return cas.concat(shuffle(mid), ser);
}
/* initial option order for a new item */
export function initialOrder(q) {
  if (q.t === "order" || q.t === "build") return shuffle(q.pool.map((_, i) => i));
  if (q.t === "hot") return q.regions.map((_, i) => i);
  if (q.t === "series") return [];
  return shuffle((q.o || []).map((_, i) => i));
}

/* ---------- navigation / locking ----------
   XS.caseLocked: the candidate left the case study · XS.midLocked: the series has started */
export function sectionOf(XS, i, bankQ) { const q = bankQ(XS.items[i].id); return q ? sec(q) : "mid"; }
export function navState(XS, r, bankQ) {
  if (!applies(r)) return { back: r.backtrack !== false && XS.i > 0, grid: true, flag: true, lockedBack: false };
  const s = sectionOf(XS, XS.i, bankQ);
  const prevSec = XS.i > 0 ? sectionOf(XS, XS.i - 1, bankQ) : null;
  const back = XS.i > 0 && s !== "series" && !(s === "mid" && prevSec === "case" && XS.caseLocked) && !(s === "case" && XS.caseLocked);
  return { back, grid: s !== "series", flag: s !== "series", section: s };
}
/* can the candidate jump (grid/rail) from the current item to `to`? */
export function canJump(XS, to, r, bankQ) {
  if (!applies(r)) return !(r.backtrack === false && to < XS.i);
  const from = sectionOf(XS, XS.i, bankQ), target = sectionOf(XS, to, bankQ);
  if (from === "series") return false;                 /* no backtrack, no skipping within the series */
  if (target === "series") return false;               /* the series is reached with Next, in order */
  if (target === "case" && XS.caseLocked) return false;
  if (XS.midLocked) return false;
  return true;
}
/* called before moving from XS.i to `to` (Next or jump). Returns false to cancel. Sets locks. */
export function beforeMove(XS, to, r, bankQ) {
  if (!applies(r)) return true;
  const from = sectionOf(XS, XS.i, bankQ), target = sectionOf(XS, to, bankQ);
  if (from === "case" && target !== "case" && !XS.caseLocked) {
    const left = XS.items.filter((it, k) => sectionOf(XS, k, bankQ) === "case" && !answeredMs(bankQ(it.id), it)).length;
    if (!ask(`You are leaving the case study.${left ? ` ${left} of its questions ${left === 1 ? "is" : "are"} unanswered.` : ""} Once you continue you cannot return to the case study questions. Continue?`)) return false;
    XS.caseLocked = true;
  }
  if (target === "series" && from !== "series" && !XS.midLocked) {
    if (!ask("You are about to start the problem-solution series. Each solution is answered Yes or No in order; you cannot go back to it or to any earlier question. Continue?")) return false;
    XS.midLocked = true; XS.caseLocked = true;
  }
  return true;
}
export function gridJumpMessage(XS, to, r, bankQ) {
  const target = sectionOf(XS, to, bankQ);
  if (target === "case") return "The case study is locked — you left it.";
  if (target === "series") return "The solution series starts after the last question, with Next.";
  if (XS.midLocked) return "You're in the solution series; earlier questions are locked.";
  return "";
}

/* ---------- rendering ---------- */
export function caseTabsHtml(q, it) {
  if (!q.caseId) return "";
  const tabs = [["overview", "Overview"], ["environment", "Environment"], ["requirements", "Requirements"], ["issues", "Existing issues"]].filter(([k]) => q.tabs && q.tabs[k]);
  const cur = it.tab || "overview";
  return `<div class="cs"><div class="cs-head"><span class="cs-title">Case study · ${esc(q.caseTitle || "")}</span><span class="cs-n">question ${q.caseN} of ${q.caseOf}</span></div><div class="cs-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" class="${cur === k ? "on" : ""}">${l}</button>`).join("")}<button type="button" class="cs-toggle" data-toggle="1">${it.tabOpen === false ? "Show" : "Hide"}</button></div><div class="cs-body ${it.tabOpen === false ? "closed" : ""}">${esc((q.tabs || {})[cur] || "")}</div></div>`;
}
export function bindCaseTabs(el, q, it, save) {
  if (!q.caseId) return;
  el.querySelectorAll(".cs-tabs [data-tab]").forEach(b => b.onclick = () => { it.tab = b.dataset.tab; it.tabOpen = true; save(); const body = el.querySelector(".cs-body"); body.textContent = (q.tabs || {})[it.tab] || ""; body.classList.remove("closed"); el.querySelectorAll(".cs-tabs [data-tab]").forEach(x => x.classList.toggle("on", x === b)); el.querySelector(".cs-toggle").textContent = "Hide"; });
  const tg = el.querySelector(".cs-toggle"); if (tg) tg.onclick = () => { it.tabOpen = it.tabOpen === false; save(); el.querySelector(".cs-body").classList.toggle("closed", !it.tabOpen); tg.textContent = it.tabOpen ? "Hide" : "Show"; };
}
const TYPE_LABEL = { order: "drag-drop · arrange in order", build: "build list", hot: "hot area", series: "yes / no" };
export function questionHtml(q, it, domName) {
  ensureCss();
  let h = `<div><span class="xm-dom">${esc(domName)}</span><span class="xm-type">${TYPE_LABEL[q.t]}${q.t === "hot" && q.pick > 1 ? ` · select ${q.pick}` : ""}</span></div>`;
  if (q.ex) h += `<pre class="out">${esc(q.ex)}</pre>`;
  if (q.t === "series") {
    h += `<div class="sr"><div class="sr-head">Problem-solution series · solution ${q.n} of ${q.of}</div><div class="sr-scn">${esc(q.scenario)}</div><div class="sr-sol">${esc(q.s)}</div><div class="sr-q">Does the solution meet the goal?</div></div>`;
    h += `<div class="sr-yn" id="xmopts"><button type="button" class="xm-opt ${it.ans[0] === 1 ? "sel" : ""}" data-v="1"><span class="k">Y</span><span>Yes</span></button><button type="button" class="xm-opt ${it.ans[0] === 0 ? "sel" : ""}" data-v="0"><span class="k">N</span><span>No</span></button></div>`;
    return h;
  }
  h += `<div class="xm-q">${esc(q.q)}</div>`;
  if (q.t === "order" || q.t === "build") h += dndHtml(q, it);
  if (q.t === "hot") h += hotHtml(q, it);
  return h;
}
function dndHtml(q, it) {
  const sub = q.t === "build" ? `Move the ${q.answer.length} actions you need into the answer area${q.ordered === false ? "." : " and arrange them in the correct order."} Leave the distractors in the list.` : "Tap an action to move it to the answer area, then use the arrows (or drag) to order it.";
  return `<p class="dnd-sub">${sub}</p>` + dndBoxHtml(q, it);
}
function dndBoxHtml(q, it) {
  const inAns = new Set(it.ans); const pool = it.ord.filter(i => !inAns.has(i));
  return `<div class="dnd" id="xmopts"><div class="dnd-col"><div class="dnd-h">Actions</div><div class="dnd-list pool">${pool.map(i => `<button type="button" class="dnd-item" data-i="${i}" data-side="pool"><span class="t">${esc(q.pool[i])}</span><span class="arr">→</span></button>`).join("")}${pool.length ? "" : `<div class="dnd-empty">All actions placed</div>`}</div></div><div class="dnd-col"><div class="dnd-h">Answer area${q.t === "build" ? ` <span>${it.ans.length} / ${q.answer.length}</span>` : ""}</div><div class="dnd-list ans">${it.ans.map((i, k) => `<div class="dnd-item placed" data-i="${i}" data-k="${k}" draggable="true"><span class="n">${k + 1}</span><span class="t">${esc(q.pool[i])}</span><span class="ctl"><button type="button" data-up="${k}" ${k === 0 ? "disabled" : ""} aria-label="Move up">▲</button><button type="button" data-down="${k}" ${k === it.ans.length - 1 ? "disabled" : ""} aria-label="Move down">▼</button><button type="button" data-rm="${k}" aria-label="Remove">✕</button></span></div>`).join("")}${it.ans.length ? "" : `<div class="dnd-empty">Nothing placed yet</div>`}</div></div></div>`;
}
function hotHtml(q, it) {
  const sel = new Set(it.ans);
  if (q.img) {
    return `<p class="dnd-sub">${esc(q.screen || "")}</p><div class="hot-img" id="xmopts"><img src="${esc(q.img)}" alt="screenshot">${q.regions.map((r, i) => r.r ? `<button type="button" class="hot-rect ${sel.has(i) ? "sel" : ""}" data-i="${i}" style="left:${r.r[0]}%;top:${r.r[1]}%;width:${r.r[2]}%;height:${r.r[3]}%" aria-label="${esc(r.l)}"></button>` : "").join("")}</div>`;
  }
  return `<div class="hot-screen"><div class="hot-h">Screen</div>${esc(q.screen || "")}</div><p class="dnd-sub">Select the ${q.pick > 1 ? q.pick + " elements" : "element"} you would click:</p><div class="xm-opts hot-list" id="xmopts">${it.ord.map((i, k) => `<button type="button" class="xm-opt ${sel.has(i) ? "sel" : ""}" data-i="${i}"><span class="k">${"ABCDEFGH"[k]}</span><span>${esc(q.regions[i].l)}</span></button>`).join("")}</div>`;
}
export function bindQuestion(el, q, it, save, rerender) {
  if (q.t === "series") { el.querySelectorAll("#xmopts .xm-opt").forEach(b => b.onclick = () => { it.ans = [+b.dataset.v]; el.querySelectorAll("#xmopts .xm-opt").forEach(x => x.classList.toggle("sel", +x.dataset.v === it.ans[0])); save(); }); return; }
  if (q.t === "hot") {
    el.querySelectorAll("#xmopts [data-i]").forEach(b => b.onclick = () => { const i = +b.dataset.i; const pick = q.pick || 1; if (it.ans.includes(i)) it.ans = it.ans.filter(x => x !== i); else { if (pick === 1) it.ans = [i]; else { if (it.ans.length >= pick) it.ans.shift(); it.ans.push(i); } } el.querySelectorAll("#xmopts [data-i]").forEach(x => x.classList.toggle("sel", it.ans.includes(+x.dataset.i))); save(); });
    return;
  }
  /* order / build */
  const box = el.querySelector("#xmopts"); if (!box) return;
  const redraw = () => { save(); box.outerHTML = dndBoxHtml(q, it); bindQuestion(el, q, it, save, rerender); };
  box.querySelectorAll('.pool .dnd-item').forEach(b => b.onclick = () => { it.ans.push(+b.dataset.i); redraw(); });
  box.querySelectorAll("[data-up]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const k = +b.dataset.up; [it.ans[k - 1], it.ans[k]] = [it.ans[k], it.ans[k - 1]]; redraw(); });
  box.querySelectorAll("[data-down]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const k = +b.dataset.down; [it.ans[k + 1], it.ans[k]] = [it.ans[k], it.ans[k + 1]]; redraw(); });
  box.querySelectorAll("[data-rm]").forEach(b => b.onclick = ev => { ev.stopPropagation(); it.ans.splice(+b.dataset.rm, 1); redraw(); });
  /* drag to reorder inside the answer area (mouse + touch via pointer events) */
  let drag = null;
  box.querySelectorAll(".ans .dnd-item.placed").forEach(row => {
    row.addEventListener("dragstart", ev => { drag = +row.dataset.k; ev.dataTransfer.effectAllowed = "move"; row.classList.add("dragging"); });
    row.addEventListener("dragend", () => { row.classList.remove("dragging"); });
    row.addEventListener("dragover", ev => { ev.preventDefault(); row.classList.add("over"); });
    row.addEventListener("dragleave", () => row.classList.remove("over"));
    row.addEventListener("drop", ev => { ev.preventDefault(); const to = +row.dataset.k; if (drag === null || drag === to) return; const [m] = it.ans.splice(drag, 1); it.ans.splice(to, 0, m); drag = null; redraw(); });
    /* touch: long-press-free pointer drag using the number badge as the handle */
    const handle = row.querySelector(".n");
    handle.addEventListener("pointerdown", ev => {
      if (ev.pointerType === "mouse") return; ev.preventDefault(); handle.setPointerCapture(ev.pointerId); row.classList.add("dragging");
      const from = +row.dataset.k; let over = from;
      const move = e => { const rows = [...box.querySelectorAll(".ans .dnd-item.placed")]; rows.forEach(r => r.classList.remove("over")); const hit = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom; }); if (hit) { over = +hit.dataset.k; hit.classList.add("over"); } };
      const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up); row.classList.remove("dragging"); if (over !== from) { const [m] = it.ans.splice(from, 1); it.ans.splice(over, 0, m); } redraw(); };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
    });
  });
}

/* ---------- answered / scoring ---------- */
export function answeredMs(q, it) {
  if (!q) return false;
  if (q.t === "series") return it.ans.length === 1;
  if (q.t === "hot") return it.ans.length > 0;
  if (q.t === "order") return it.ans.length === q.pool.length;
  if (q.t === "build") return it.ans.length > 0;
  return it.ans.length > 0;
}
const sameSeq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameSet = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
export function scoreMs(q, it) {
  if (q.t === "series") return it.ans.length && (it.ans[0] === 1) === !!q.ok ? 1 : 0;
  if (q.t === "hot") { const ok = q.regions.map((r, i) => r.ok ? i : -1).filter(i => i >= 0); return sameSet(it.ans, ok) ? 1 : 0; }
  if (q.t === "order") { const accepted = [q.answer].concat(q.alt || []); return accepted.some(a => sameSeq(it.ans, a)) ? 1 : 0; }
  if (q.t === "build") { if (q.ordered === false) return sameSet(it.ans, q.answer) ? 1 : 0; const accepted = [q.answer].concat(q.alt || []); return accepted.some(a => sameSeq(it.ans, a)) ? 1 : 0; }
  return 0;
}
/* key shown in review / drill feedback */
export function keyHtml(q, it) {
  if (q.t === "series") return `<div class="sr-key"><b>Correct answer: ${q.ok ? "Yes" : "No"}</b>${it && it.ans.length ? ` · you said ${it.ans[0] === 1 ? "Yes" : "No"}` : ""}<div class="ox">${esc(q.x)}</div></div>`;
  if (q.t === "hot") return `<div class="xm-opts">${q.regions.map((r, i) => `<div class="xm-opt static ${r.ok ? "right" : it && it.ans.includes(i) ? "wrong" : ""}"><span class="k">${r.ok ? "✓" : it && it.ans.includes(i) ? "✗" : ""}</span><span>${esc(r.l)}</span></div>`).join("")}<div class="rx">${esc(q.x || "")}</div></div>`;
  const yours = it && it.ans.length ? `<div class="dnd-keycol"><div class="dnd-h">Your order</div>${it.ans.map((i, k) => `<div class="dnd-item static ${q.answer[k] === i || (q.t === "build" && q.ordered === false && q.answer.includes(i)) ? "ok" : "bad"}"><span class="n">${k + 1}</span><span class="t">${esc(q.pool[i])}</span></div>`).join("")}</div>` : "";
  return `<div class="dnd-key">${yours}<div class="dnd-keycol"><div class="dnd-h">Correct${q.t === "build" && q.ordered === false ? " (any order)" : ""}</div>${q.answer.map((i, k) => `<div class="dnd-item static ok"><span class="n">${k + 1}</span><span class="t">${esc(q.pool[i])}</span></div>`).join("")}${(q.alt || []).length ? `<div class="dnd-alt">Also accepted: ${q.alt.map(a => a.map(i => i + 1).join(" → ")).join(" · ")} (pool positions as shown above)</div>` : ""}</div></div><div class="rx">${esc(q.x || "")}</div>`;
}
export function reviewHtml(q, d, domName, CONF) {
  const it = { ans: (d && d.ans) || [] };
  const head = q.t === "series" ? `<div class="rq">${esc(q.scenario)}<br><br><b>${esc(q.s)}</b></div>` : `<div class="rq">${esc(q.q)}</div>`;
  return `<div class="xm-rev"><div class="rh"><span style="color:var(--amber)">${esc(domName)} · ${TYPE_LABEL[q.t]}${q.obj ? " · obj " + q.obj : ""}</span><span class="st">${d && d.conf !== undefined && CONF ? CONF[d.conf] : ""} · missed</span></div>${q.ex ? `<pre class="out">${esc(q.ex)}</pre>` : ""}${head}${keyHtml(q, it)}<div class="rx"><b>Remember:</b> ${esc(q.w || "")}</div></div>`;
}

/* ---------- hot-area sim for the PBQ Lab (portal "where do you…" deck; regions as the hot rectangles once img lands) ---------- */
registerSim("hotarea", {
  label: "Hot area · portal navigation", color: "#B48CFF",
  create(item) { return { ord: shuffle(item.regions.map((_, i) => i)), ans: [], showPath: false }; },
  render(el, item, st, ctx) {
    ensureCss();
    const sel = new Set(st.ans); const pick = item.pick || 1;
    let h = `<div class="hot-portal">${item.portal ? `<span class="hot-portal-tag">${esc(item.portal)} portal</span>` : ""}${item.path && (st.showPath || ctx.reveal) ? `<div class="hot-path">${item.path.map(p => `<span>${esc(p)}</span>`).join("<i>›</i>")}</div>` : item.path ? `<button type="button" class="ghost tiny hot-pathbtn">Show the click path</button>` : ""}</div>`;
    if (item.screen) h += `<div class="hot-screen"><div class="hot-h">Screen</div>${esc(item.screen)}</div>`;
    if (item.img) h += `<div class="hot-img">${`<img src="${esc(item.img)}" alt="screenshot">`}${item.regions.map((r, i) => r.r ? `<button type="button" class="hot-rect ${sel.has(i) ? "sel" : ""} ${ctx.reveal ? (r.ok ? "right" : sel.has(i) ? "wrong" : "") : ""}" data-i="${i}" style="left:${r.r[0]}%;top:${r.r[1]}%;width:${r.r[2]}%;height:${r.r[3]}%" aria-label="${esc(r.l)}"></button>` : "").join("")}</div>`;
    else h += `<p class="dnd-sub">On the final screen, which element do you click?</p><div class="xm-opts hot-list">${st.ord.map((i, k) => `<button type="button" class="xm-opt ${sel.has(i) ? "sel" : ""} ${ctx.reveal ? (item.regions[i].ok ? "right" : sel.has(i) ? "wrong" : "") : ""}" data-i="${i}"><span class="k">${"ABCDEFGH"[k]}</span><span>${esc(item.regions[i].l)}</span></button>`).join("")}</div>`;
    if (ctx.reveal && item.target) h += `<div class="rx"><b>Target:</b> ${esc(item.target)}</div>`;
    el.innerHTML = h;
    const pb = el.querySelector(".hot-pathbtn"); if (pb) pb.onclick = () => { st.showPath = true; ctx.onChange(); this.render(el, item, st, ctx); };
    el.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { if (ctx.locked) return; const i = +b.dataset.i; if (st.ans.includes(i)) st.ans = st.ans.filter(x => x !== i); else { if (pick === 1) st.ans = [i]; else { if (st.ans.length >= pick) st.ans.shift(); st.ans.push(i); } } ctx.onChange(); el.querySelectorAll("[data-i]").forEach(x => x.classList.toggle("sel", st.ans.includes(+x.dataset.i))); });
  },
  answered: (item, st) => st.ans.length > 0,
  score(item, st) {
    const ok = item.regions.map((r, i) => r.ok ? i : -1).filter(i => i >= 0); const right = sameSet(st.ans, ok);
    const notes = right ? ["Correct."] : [st.ans.length ? `You picked: ${st.ans.map(i => item.regions[i].l).join(", ")}.` : "You didn't pick anything.", `Answer: ${ok.map(i => item.regions[i].l).join(", ")}${item.path ? " — path: " + item.path.join(" › ") : ""}.`];
    return { f: right ? 1 : 0, notes, why: item.x || "" };
  },
});
