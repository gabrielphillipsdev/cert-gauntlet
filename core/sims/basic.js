/* Cert Gauntlet — the original Gym Cards PBQ types, ported onto the sim registry:
   match (tap-to-pair), order (tap in sequence, with equivalence classes), exhibit (multi-part MC), scenario (single MC).
   Chat 2 replaces match/order rendering with drag-and-drop; the state shape and score() stay the same. */
import { registerSim } from "./registry.js";
import { esc, shuffle } from "../util.js";

function btn(cls, html) { const b = document.createElement("button"); b.className = cls; b.innerHTML = html; return b; }

/* ---------- match ---------- */
registerSim("match", {
  label: "Matching", color: "#4FA3FF",
  create(item) {
    const n = item.pairs.length;
    return { L: shuffle(item.pairs.map((_, i) => i)), R: shuffle(item.pairs.map((_, i) => i)), assign: {}, sel: null, n };
  },
  render(el, item, st, ctx) {
    el.innerHTML = `${item.prompt ? `<p class="pbqp">${esc(item.prompt)}</p>` : ""}<div class="mgrid"><div class="mcol" data-side="L"></div><div class="mcol" data-side="R"></div></div>`;
    const draw = () => {
      const L = el.querySelector('[data-side="L"]'), R = el.querySelector('[data-side="R"]'); L.innerHTML = ""; R.innerHTML = "";
      const used = new Set(Object.values(st.assign));
      st.L.forEach(i => {
        const paired = st.assign[i] !== undefined;
        const b = btn("mi", esc(item.pairs[i][0]) + (paired ? `<span class="mtag">→ ${esc(item.pairs[st.assign[i]][1])}</span>` : ""));
        if (st.sel === i) b.classList.add("sel"); if (paired) b.classList.add("paired");
        if (ctx.reveal) b.classList.add(paired && st.assign[i] === i ? "ok" : "bad");
        b.onclick = () => { if (ctx.locked) return; if (paired) { delete st.assign[i]; st.sel = null; } else st.sel = st.sel === i ? null : i; ctx.onChange(); draw(); };
        L.appendChild(b);
      });
      st.R.forEach(i => {
        const b = btn("mi", esc(item.pairs[i][1])); if (used.has(i)) b.classList.add("used");
        b.onclick = () => { if (ctx.locked || st.sel === null || used.has(i)) return; st.assign[st.sel] = i; st.sel = null; ctx.onChange(); draw(); };
        R.appendChild(b);
      });
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

/* ---------- order ----------  item.eq = [[1,2],[4,5]] → those step indexes are interchangeable */
function classOf(item) {
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
    el.innerHTML = `${item.prompt ? `<p class="pbqp">${esc(item.prompt)}</p>` : ""}<div class="olist"></div><button class="ghost oundo">Undo last</button>`;
    const cls = classOf(item);
    const draw = () => {
      const box = el.querySelector(".olist"); box.innerHTML = "";
      st.items.forEach(i => {
        const pos = st.seq.indexOf(i);
        const b = btn("mi oi", `<span class="onum">${pos >= 0 ? pos + 1 : ""}</span><span>${esc(item.steps[i])}</span>`);
        if (pos >= 0) b.classList.add("paired");
        if (ctx.reveal) b.classList.add(pos >= 0 && cls[pos] === cls[i] ? "ok" : "bad");
        b.onclick = () => { if (ctx.locked || pos >= 0) return; st.seq.push(i); ctx.onChange(); draw(); };
        box.appendChild(b);
      });
    };
    el.querySelector(".oundo").onclick = () => { if (ctx.locked) return; st.seq.pop(); ctx.onChange(); draw(); };
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
