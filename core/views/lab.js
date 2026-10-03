/* Cert Gauntlet — PBQ Lab: list of sims, one at a time, scored with feedback. Uses the sim registry. */
import { $, $$, esc } from "../util.js";
import { pack, rec, touch, bumpDay, persist } from "../store.js";
import { sim } from "../sims/registry.js";
import { labItems } from "./home.js";

let cur = null, st = null, locked = false;

export function renderLab(A, args = {}) {
  if (args.id) return startPbq(A, args.id);
  const p = pack(A.packId); const items = labItems(A);
  let html = `<div class="tb"><button data-go="home">Exit</button><div class="labtitle">PBQ Lab</div></div><p class="lead">Hands-on practice shaped like the real exam's performance-based questions. Generated items make a fresh problem every attempt.</p><div class="list">`;
  items.forEach(x => {
    const s = p.pbq[x.id]; const best = s ? Math.round(s.best) : null; const col = best === null ? "var(--muted)" : best >= 80 ? "var(--green)" : best >= 50 ? "var(--amber)" : "var(--red)"; const def = sim(x.type);
    html += `<button class="deck" data-id="${x.id}"><span class="jack" style="background:${def.color}"></span><span><span class="t">${esc(x.title)}</span><span class="s">${esc(def.label)}${s ? " — " + s.attempts + " attempt" + (s.attempts > 1 ? "s" : "") : ""}${x.obj ? " · obj " + x.obj : ""}</span></span><span class="n" style="color:${col}">${best === null ? "new" : best + "%"}</span></button>`;
  });
  A.el.innerHTML = html + "</div>";
  $("[data-go=home]", A.el).onclick = () => A.go("home");
  $$(".deck", A.el).forEach(b => b.onclick = () => startPbq(A, b.dataset.id));
}
function startPbq(A, id) {
  const items = labItems(A); cur = items.find(x => x.id === id); if (!cur) return renderLab(A);
  const def = sim(cur.type); st = def.create(cur); locked = false;
  A.el.innerHTML = `<div class="tb"><button id="pbqback">Lab</button><div class="labtitle">${esc(cur.title)}</div><button class="ghost tiny" id="pbqreset">Reset</button></div><div id="pbqbody" class="simbox"></div><div class="pbqfoot"><button class="bigbtn amber" id="pbqsubmit">Check answers</button></div><div id="pbqfb" class="pbqfb"></div>`;
  $("#pbqback", A.el).onclick = () => renderLab(A);
  const draw = (reveal) => def.render($("#pbqbody", A.el), cur, st, { onChange: () => { }, locked: reveal, reveal });
  draw(false);
  $("#pbqreset", A.el).onclick = () => { if (locked) return; st = def.generated ? { ...def.create(cur), g: st.g } : def.create(cur); draw(false); };
  $("#pbqsubmit", A.el).onclick = () => {
    if (locked) return; locked = true;
    const res = def.score(cur, st); const pct = Math.round(res.f * 100);
    const s = touch(rec(A.packId, "pbq", cur.id, { attempts: 0, best: 0 })); s.attempts++; s.best = Math.max(s.best, pct);
    bumpDay(A.packId, 1); persist();
    draw(true);
    $("#pbqsubmit", A.el).style.display = "none";
    const fb = $("#pbqfb", A.el); fb.style.display = "block";
    fb.innerHTML = `<div class="fbscore" style="color:${pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)"}">${pct}%</div><div class="fbwhy">${esc(res.notes.join("\n"))}${res.why ? "\n\n" + esc(res.why) : ""}</div><div class="fbbtns"><button id="fbagain">${def.generated ? "New problem" : "Try again"}</button><button id="fbnext">Next PBQ</button></div>`;
    $("#fbagain", A.el).onclick = () => startPbq(A, cur.id);
    $("#fbnext", A.el).onclick = () => { const i = items.findIndex(x => x.id === cur.id); startPbq(A, items[(i + 1) % items.length].id); };
    fb.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  A.el.scrollTop = 0; window.scrollTo(0, 0);   // the tile list may have been scrolled far down; open the item at its top (task pane visible)
}
