/* Cert Gauntlet — flashcard session (levels 1-2 multiple choice, level 3 flip + honest self-grade). */
import { $, $$, esc, toast } from "../util.js";
import { pack, persist } from "../store.js";
import { stat, answer, options, pickDeck } from "../srs.js";

let S = null; // {queue:[{cd,recycled}], idx,total,missed,right,deck,flipped,locked}

export function renderSession(A, args = {}) {
  const set = args.set || pickDeck(A.packId, A.content.cards, args.deck || "all");
  S = { queue: set.map(cd => ({ cd, recycled: false })), idx: 0, total: set.length, missed: [], right: 0, deck: args.deck || "all", flipped: false, locked: false };
  A.el.innerHTML = `<div class="session"><div class="topbar"><button id="quit">Exit</button><div class="bar"><div class="barfill" id="barfill"></div></div><div class="count" id="count"></div></div><div class="cardwrap"><div class="card" id="card"><div class="face front" id="frontFace"><div class="meta"><span class="chip" id="chipF"></span><span class="lvl" id="lvlF"></span></div><div class="qa" id="qtext"></div><div class="opts" id="opts"></div><div class="why" id="why"></div><div class="hint" id="hintF">tap to flip</div></div><div class="face back"><div class="meta"><span class="chip" id="chipB"></span><span class="lvl" id="lvlB"></span></div><div class="qa" id="atext"></div><div class="hint">be honest — did you have it?</div></div></div></div><div class="answers" id="answers"><button id="missed">Missed it</button><button id="gotit">Got it</button></div></div>`;
  $("#quit", A.el).onclick = () => A.go("home");
  $("#gotit", A.el).onclick = () => grade(A, true); $("#missed", A.el).onclick = () => grade(A, false);
  $("#card", A.el).onclick = () => { if (!S.queue[S.idx]) return; if (stat(A.packId, S.queue[S.idx].cd).level < 3) return; S.flipped = !S.flipped; $("#card", A.el).classList.toggle("flipped", S.flipped); $("#answers", A.el).style.visibility = S.flipped ? "visible" : "hidden"; };
  showCard(A);
}
const lvlHtml = level => [1, 2, 3].map(i => `<span class="pip ${i <= level ? "on" : ""}"></span>`).join("") + `<span class="lbl">${{ 1: "EASY", 2: "HARD", 3: "RECALL" }[level]}</span>`;
function showCard(A) {
  if (S.idx >= S.queue.length) return endSession(A);
  const { cd } = S.queue[S.idx]; const s = stat(A.packId, cd); const level = s.level; const D = A.content.diagrams || {};
  S.flipped = false; S.locked = false;
  $("#card", A.el).classList.remove("flipped"); $("#why", A.el).style.display = "none"; $("#hintF", A.el).style.display = "block";
  const cat = A.manifest.cats[cd.c];
  for (const id of ["#chipF", "#chipB"]) { const e = $(id, A.el); e.textContent = cat.name; e.style.background = cat.color; }
  $("#lvlF", A.el).innerHTML = lvlHtml(level); $("#lvlB", A.el).innerHTML = lvlHtml(level);
  $("#qtext", A.el).innerHTML = cd.vq && D[cd.vq] ? `<div class="qwrap">${D[cd.vq]}<div class="qcap">${esc(cd.q)}</div></div>` : esc(cd.q);
  $("#atext", A.el).innerHTML = `<div class="qwrap">${answerHtml(A, cd)}</div>`;
  const front = $("#frontFace", A.el);
  $("#answers", A.el).style.visibility = "hidden";
  if (level < 3) { front.classList.add("mc"); $("#hintF", A.el).textContent = "pick one"; renderOptions(A, cd, level === 1 ? 3 : 4); $("#opts", A.el).style.display = "flex"; }
  else { front.classList.remove("mc"); $("#hintF", A.el).textContent = "tap to flip"; $("#opts", A.el).style.display = "none"; }
  $("#barfill", A.el).style.width = (S.idx / S.total * 100) + "%"; $("#count", A.el).textContent = `${Math.min(S.idx + 1, S.total)} / ${S.total}`;
}
function renderOptions(A, cd, n) {
  const box = $("#opts", A.el); box.innerHTML = "";
  options(A.content.cards, cd, n).forEach(o => { const b = document.createElement("button"); b.className = "opt"; b.textContent = o.t; b.onclick = () => pickOption(A, b, o.right); box.appendChild(b); });
}
function pickOption(A, btn, right) {
  if (S.locked) return; S.locked = true;
  const { cd } = S.queue[S.idx];
  $$(".opt", A.el).forEach(b => { b.disabled = true; if (b.textContent === cd.short) b.classList.add("right"); });
  if (right) { setTimeout(() => grade(A, true), 550); return; }
  btn.classList.add("wrong");
  const t = btn.textContent; const C = A.content.cards;
  const picked = C.find(x => x.sid !== cd.sid && x.short === t && (cd.g ? x.g === cd.g : x.c === cd.c)) || C.find(x => x.sid !== cd.sid && x.short === t);
  showWhy(A, cd, picked);
}
function answerHtml(A, cd) {
  const D = A.content.diagrams || {}; let h = cd.v && D[cd.v] ? `<div class="qwrap">${D[cd.v]}</div>` : "";
  cd.a.split("\n").forEach(line => { h += line.startsWith("#") ? `<span class="big">${esc(line.slice(1))}</span>` : `<div>${esc(line)}</div>`; });
  if (cd.w) h += `<div class="hook">Hook: ${esc(cd.w)}</div>`; if (cd.x) h += `<div class="xp">${esc(cd.x)}</div>`;
  return h;
}
function showWhy(A, cd, picked) {
  const D = A.content.diagrams || {}; const lines = cd.a.split("\n"); const big = lines.find(l => l.startsWith("#")); const rest = lines.filter(l => !l.startsWith("#"));
  if (big && big.slice(1).trim() !== cd.short) rest.unshift(big.slice(1).trim());
  let pk = "";
  if (picked) { const line = picked.a.split("\n").filter(l => !l.startsWith("#"))[0] || ""; pk = `<div class="wp"><div class="wt amber">What you picked</div><div class="wpa">${esc(picked.short)}</div>${picked.vq && D[picked.vq] ? `<div class="qwrap">${D[picked.vq]}</div>` : ""}<div class="wx">${picked.vq ? esc(line) : `That's the answer to "${esc(picked.q)}"${line ? ": " + esc(line) : ""}.`}</div></div>`; }
  const w = $("#why", A.el);
  w.innerHTML = (cd.v && D[cd.v] ? `<div class="qwrap">${D[cd.v]}</div>` : "") + `<div class="wt">Correct answer</div><div class="wa">${esc(cd.short)}</div>` + (rest.length ? `<div class="wx">${esc(rest.join("\n"))}</div>` : "") + pk + (cd.w ? `<div class="wh">Hook: ${esc(cd.w)}</div>` : "") + (cd.x ? `<div class="wx2">${esc(cd.x)}</div>` : "") + `<button class="whynext" id="whynext">Got it — next card</button>`;
  w.style.display = "block"; $("#hintF", A.el).style.display = "none";
  $("#whynext", A.el).onclick = () => grade(A, false);
  w.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function grade(A, right) {
  const item = S.queue[S.idx]; const cd = item.cd;
  const msg = answer(A.packId, cd, right); if (msg) toast(msg);
  if (right) S.right++; else { if (!S.missed.includes(cd)) S.missed.push(cd); if (!item.recycled) { S.queue.push({ cd, recycled: true }); S.total++; } }
  S.idx++; persist(); showCard(A);
}
function endSession(A) {
  const p = pack(A.packId); p.sessionsDone = (p.sessionsDone || 0) + 1; persist();
  const pct = S.total ? Math.round(S.right / S.total * 100) : 0; const u = S.missed.length;
  A.el.innerHTML = `<div class="done"><h2>${pct >= 80 ? "Set complete — strong" : "Set complete"}</h2><div class="score" style="color:${pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--amber)" : "var(--red)"}">${pct}%</div><p>${u ? `${u} card${u > 1 ? "s" : ""} missed this set — streaks reset, so they'll keep showing up until you climb them back to Recall.` : "Clean set. Every card here climbed toward mastery."}</p><div class="actions">${u ? `<button id="drill" class="drill">Drill this set's misses</button>` : ""}<button id="again" class="again">Run it again</button><button id="backhome" class="link">Back to decks</button></div></div>`;
  const d = $("#drill", A.el); if (d) d.onclick = () => renderSession(A, { set: S.missed.slice(), deck: "drill" });
  $("#again", A.el).onclick = () => A.go("session", S.deck === "today" ? { deck: "today", set: null } : { deck: S.deck });
  $("#backhome", A.el).onclick = () => A.go("home");
}
