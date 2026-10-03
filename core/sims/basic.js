/* Cert Gauntlet — the original Gym Cards PBQ types on the sim registry:
   match (drag-and-drop pairing), order (drag-to-sort, with equivalence classes), exhibit (multi-part MC), scenario (single MC).
   Chat 2 replaced the tap-to-pair rendering of match/order with drag-and-drop (touch + mouse, tap kept as a fallback);
   the state shapes and score() are unchanged, so every existing item and in-progress exam keeps working.
   This module also loads the Chat 2 simulation components so one import (core/app.js, dev/check-pack.mjs) registers everything. */
import { registerSim } from "./registry.js";
import { esc, shuffle } from "../util.js";
import { injectCss, instructionsPane, drag, ghostOf, targetAt, sortable } from "./ui.js";
import "./console.js";
import "./fweditor.js";
import "./logview.js";

function btn(cls, html) { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.innerHTML = html; return b; }

/* ---------- match ----------  state: { L:[left order], R:[right order], assign:{left:right}, sel:right|null, n } */
registerSim("match", {
  label: "Matching", color: "#4FA3FF",
  create(item) {
    const n = item.pairs.length;
    return { L: shuffle(item.pairs.map((_, i) => i)), R: shuffle(item.pairs.map((_, i) => i)), assign: {}, sel: null, n };
  },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    if (item.prompt) { const p = document.createElement("p"); p.className = "pbqp"; p.textContent = item.prompt; el.appendChild(p); }
    instructionsPane(el, item, { title: "How to answer", fallback: "Drag each answer from the right onto the item it matches on the left (or tap an answer, then tap its target). Drag a placed answer back to the pool, or onto another target, to change it." });
    const grid = document.createElement("div"); grid.className = "mgrid dd"; grid.innerHTML = `<div class="mcol" data-side="L"></div><div class="mcol pool" data-side="R"></div>`; el.appendChild(grid);
    const place = (left, right) => { for (const k in st.assign) if (st.assign[k] === right) delete st.assign[k]; st.assign[left] = right; st.sel = null; ctx.onChange(); draw(); };
    const unplace = (left) => { delete st.assign[left]; st.sel = null; ctx.onChange(); draw(); };
    const chip = (right, placedAt) => {
      const c = btn("mchip" + (st.sel === right ? " sel" : ""), esc(item.pairs[right][1]));
      c.dataset.r = right;
      if (ctx.reveal && placedAt !== null) c.classList.add(placedAt === right ? "ok" : "bad");
      drag(c, {
        disabled: () => !!ctx.locked,
        onStart: () => { c.classList.add("dragsrc"); grid.classList.add("dragging"); return ghostOf(c); },
        onMove: (x, y) => { const t = targetAt(x, y, ".mtarget, .pool"); grid.querySelectorAll(".over").forEach(e => e.classList.remove("over")); if (t) t.classList.add("over"); },
        onEnd: (x, y, ev, cancelled) => {
          c.classList.remove("dragsrc"); grid.classList.remove("dragging"); grid.querySelectorAll(".over").forEach(e => e.classList.remove("over"));
          if (cancelled) return; const t = targetAt(x, y, ".mtarget, .pool"); if (!t) return;
          if (t.classList.contains("pool")) { if (placedAt !== null) unplace(placedAt); return; }
          place(+t.dataset.l, right);
        },
        onTap: () => { if (ctx.locked) return; if (placedAt !== null) { unplace(placedAt); return; } st.sel = st.sel === right ? null : right; ctx.onChange(); draw(); },
      });
      return c;
    };
    const draw = () => {
      const L = grid.querySelector('[data-side="L"]'), R = grid.querySelector('[data-side="R"]'); L.innerHTML = ""; R.innerHTML = "";
      const used = new Set(Object.values(st.assign));
      st.L.forEach(i => {
        const t = document.createElement("div"); t.className = "mi mtarget" + (st.assign[i] !== undefined ? " paired" : "") + (st.sel !== null ? " armed" : ""); t.dataset.l = i;
        if (ctx.reveal) t.classList.add(st.assign[i] === i ? "ok" : "bad");
        t.innerHTML = `<span class="mq">${esc(item.pairs[i][0])}</span><span class="mslot">${st.assign[i] === undefined ? '<span class="mhint">drop here</span>' : ""}</span>`;
        if (st.assign[i] !== undefined) t.querySelector(".mslot").appendChild(chip(st.assign[i], i));
        t.onclick = ev => { if (ctx.locked || st.sel === null || ev.target.closest(".mchip")) return; place(i, st.sel); };
        L.appendChild(t);
      });
      st.R.forEach(i => { if (!used.has(i)) R.appendChild(chip(i, null)); });
      if (!R.children.length) R.innerHTML = `<div class="mempty">${ctx.reveal ? "" : "All answers placed. Drag one back here to undo."}</div>`;
    };
    draw();
  },
  answered: (item, st) => Object.keys(st.assign).length > 0,
  score(item, st) {
    let ok = 0; const notes = [];
    item.pairs.forEach((x, i) => {
      const j = st.assign[i];
      if (j === i) ok++;
      else if (j === undefined) notes.push(`${x[0]} was left unmatched.`);
      else notes.push(`You paired ${x[0]} with ${item.pairs[j][1]}; that belongs to ${item.pairs[j][0]}.`);
    });
    notes.push("Key: " + item.pairs.map(x => x[0] + " → " + x[1]).join(" · "));
    return { f: ok / item.pairs.length, notes, why: item.why || "" };
  },
});

/* ---------- order ----------  item.eq = [[1,2],[4,5]] → those step indexes are interchangeable
   state: { items:[current display order], seq:[committed order, empty until the first move] } */
export function classOf(item) {
  const cls = item.steps.map((_, i) => i);
  (item.eq || []).forEach(group => group.forEach(i => { cls[i] = Math.min(...group); }));
  return cls;
}
registerSim("order", {
  label: "Put in order", color: "#FFD166",
  create(item) {
    const items = shuffle(item.steps.map((_, i) => i));
    if (items.every((v, k) => v === k)) [items[0], items[1]] = [items[1], items[0]];
    return { items, seq: [] };
  },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    if (item.prompt) { const p = document.createElement("p"); p.className = "pbqp"; p.textContent = item.prompt; el.appendChild(p); }
    instructionsPane(el, item, { title: "How to answer", fallback: "Drag the handles to put the steps in order, first at the top (or use the arrows). The list is graded as it stands when you submit." + (item.eq && item.eq.length ? " Some steps have no fixed order between them; either order is accepted." : "") });
    const list = document.createElement("div"); list.className = "olist dd"; el.appendChild(list);
    const cls = classOf(item);
    const order = () => (st.seq.length ? st.seq : st.items);
    const commit = (arr) => { st.items = arr.slice(); st.seq = arr.slice(); ctx.onChange(); draw(); };
    const draw = () => {
      const cur = order(); list.innerHTML = "";
      cur.forEach((i, pos) => {
        const row = document.createElement("div"); row.className = "mi oi orow"; row.dataset.i = i;
        if (ctx.reveal) row.classList.add(cls[pos] === cls[i] ? "ok" : "bad");
        row.innerHTML = `<span class="grab" aria-label="Drag to reorder">☰</span><span class="onum">${pos + 1}</span><span class="otext">${esc(item.steps[i])}</span><span class="omv"><button type="button" data-d="-1" aria-label="Move up" ${ctx.locked || pos === 0 ? "disabled" : ""}>▲</button><button type="button" data-d="1" aria-label="Move down" ${ctx.locked || pos === cur.length - 1 ? "disabled" : ""}>▼</button></span>`;
        row.querySelectorAll(".omv button").forEach(b => b.onclick = () => { const j = pos + +b.dataset.d; if (j < 0 || j >= cur.length) return; const arr = cur.slice(); [arr[pos], arr[j]] = [arr[j], arr[pos]]; commit(arr); });
        list.appendChild(row);
      });
      sortable(list, { item: ".orow", handle: ".grab", disabled: () => !!ctx.locked, onReorder: (from, to) => { const arr = cur.slice(); const [v] = arr.splice(from, 1); arr.splice(to, 0, v); commit(arr); } });
    };
    draw();
  },
  answered: (item, st) => st.seq.length > 0,
  score(item, st) {
    const cls = classOf(item); let ok = 0; const notes = [];
    st.seq.forEach((v, k) => { if (cls[v] === cls[k]) ok++; });
    item.steps.forEach((s, i) => {
      const k = st.seq.indexOf(i);
      if (k === -1) notes.push(`Never placed: "${s}" (step ${i + 1}).`);
      else if (cls[k] !== cls[i]) notes.push(`"${s}" is step ${i + 1}; you put it at ${k + 1}.`);
    });
    notes.push("Correct order: " + item.steps.map((s, i) => (i + 1) + ". " + s).join("  ") + (item.note ? "  (" + item.note + ")" : ""));
    return { f: ok / item.steps.length, notes, why: item.why || "" };
  },
});

/* ---------- exhibit (one exhibit, several MC parts; first option correct in content) ---------- */
registerSim("exhibit", {
  label: "Exhibit, several parts", color: "#B48CFF",
  create(item) { return { sub: item.qs.map(sq => ({ ord: shuffle(sq.o.map((_, i) => i)), ans: null })) }; },
  render(el, item, st, ctx) {
    el.innerHTML = `${item.setup ? `<p class="pbqp">${esc(item.setup)}</p>` : ""}${item.out ? `<pre class="out">${esc(item.out)}</pre>` : ""}` +
      item.qs.map((sq, si) => `<div class="xm-sub"><div class="sq">${si + 1}. ${esc(sq.q)}</div><div class="xm-opts" data-s="${si}">${st.sub[si].ord.map((oi, k) => `<button class="xm-opt ${st.sub[si].ans === oi ? "sel" : ""} ${ctx.reveal ? (oi === 0 ? "right" : st.sub[si].ans === oi ? "wrong" : "") : ""}" data-i="${oi}"><span class="k">${"ABCDEF"[k]}</span><span>${esc(sq.o[oi])}</span></button>`).join("")}</div></div>`).join("");
    el.querySelectorAll(".xm-opts[data-s]").forEach(box => { const si = +box.dataset.s; box.querySelectorAll(".xm-opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.sub[si].ans = +b.dataset.i; box.querySelectorAll(".xm-opt").forEach(x => x.classList.toggle("sel", +x.dataset.i === st.sub[si].ans)); ctx.onChange(); }); });
  },
  answered: (item, st) => st.sub.some(s => s.ans !== null),
  score(item, st) {
    let ok = 0; const notes = [];
    item.qs.forEach((sq, si) => { if (st.sub[si].ans === 0) ok++; else notes.push(`${si + 1}. ${st.sub[si].ans === null ? "Left blank. " : "You picked: " + sq.o[st.sub[si].ans] + ". "}Answer: ${sq.o[0]} — ${sq.x || ""}`); });
    return { f: ok / item.qs.length, notes, why: item.why || "" };
  },
});

/* ---------- scenario (lab-only single MC with exhibit) ---------- */
registerSim("scenario", {
  label: "Exhibit question", color: "#B48CFF",
  create(item) { return { ord: shuffle(item.opts.map((_, i) => i)), sel: null }; },
  render(el, item, st, ctx) {
    el.innerHTML = `<p class="pbqp">${esc(item.setup || "")}</p>${item.out ? `<pre class="out">${esc(item.out)}</pre>` : ""}<p class="pbqp strong">${esc(item.q)}</p><div class="xm-opts">${st.ord.map((i, k) => `<button class="xm-opt ${st.sel === i ? "sel" : ""} ${ctx.reveal ? (i === 0 ? "right" : st.sel === i ? "wrong" : "") : ""}" data-i="${i}"><span class="k">${"ABCD"[k]}</span><span>${esc(item.opts[i])}</span></button>`).join("")}</div>`;
    el.querySelectorAll(".xm-opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.sel = +b.dataset.i; el.querySelectorAll(".xm-opt").forEach(x => x.classList.toggle("sel", +x.dataset.i === st.sel)); ctx.onChange(); });
  },
  answered: (item, st) => st.sel !== null,
  score(item, st) {
    const right = st.sel === 0; const notes = [];
    if (!right) notes.push(st.sel === null ? "You didn't pick an answer." : "You picked: " + item.opts[st.sel] + (item.no && item.no[st.sel - 1] ? " — " + item.no[st.sel - 1] : ""));
    return { f: right ? 1 : 0, notes, why: item.why || "" };
  },
});

injectCss("cg-sim-dd", `
.mgrid.dd{grid-template-columns:1.25fr 1fr;align-items:start}
.mtarget{display:flex;flex-direction:column;gap:6px;min-height:64px;cursor:default;padding:10px}
.mtarget .mq{font-size:13px;line-height:1.3}
.mslot{display:block;min-height:34px;border:2px dashed var(--line);border-radius:10px;padding:2px;display:flex;align-items:center;justify-content:center}
.mtarget.paired .mslot{border-style:solid;border-color:transparent;padding:0}
.mtarget.armed .mslot{border-color:var(--amber)}
.mtarget.over .mslot,.pool.over{border-color:var(--teal);background:rgba(46,230,214,.08)}
.mhint{font-size:11px;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.mtarget.paired,.mtarget.ok,.mtarget.bad{opacity:1;border-style:solid}
.mtarget.paired{border-color:var(--line-2)}
.mtarget.ok{border-color:var(--green)}.mtarget.bad{border-color:var(--red)}
.pool{border:2px dashed transparent;border-radius:12px;padding:2px;min-height:80px;position:sticky;top:calc(118px + var(--sat))}
.mgrid.dd.dragging .pool{border-color:var(--line-2)}
.mchip{display:block;width:100%;border:2px solid var(--blue);background:rgba(79,163,255,.12);border-radius:10px;padding:9px 10px;color:var(--ink);font-size:13px;font-weight:650;text-align:left;line-height:1.3;user-select:none;-webkit-user-select:none;cursor:grab}
.mchip.sel{border-color:var(--amber);background:rgba(255,180,84,.14)}
.mchip.ok{border-color:var(--green);background:rgba(67,217,123,.12)}.mchip.bad{border-color:var(--red);background:rgba(255,93,82,.12)}
.mempty{font-size:12px;color:var(--dim);text-align:center;padding:14px 6px}
.olist.dd .orow{display:flex;align-items:center;gap:8px;cursor:default;padding:8px 8px 8px 6px}
.olist.dd .otext{flex:1;min-width:0}
.olist.dd .omv{display:flex;flex-direction:column;gap:3px;flex:none}
.olist.dd .omv button{width:30px;height:24px;border-radius:7px;border:1px solid var(--line);background:var(--panel-2);color:var(--muted);font-size:11px}
.olist.dd .omv button:disabled{opacity:.3}
@media(min-width:768px){.mgrid.dd{gap:12px}.mtarget .mq{font-size:14px}.mchip{font-size:13.5px}}
`);
