/* Cert Gauntlet — log analysis viewer sim ("logview").
   A scrollable multi-source log (auth, web, firewall, SIEM, …). The candidate selects the evidence lines, classifies the
   attack, names the compromised account / host and picks the FIRST response. Each sub-answer is scored on its own.

   Item schema (see dev/specs/secplus.md):
   { id, obj, type:"logview", title, prompt, d?, cat?, why?,
     tasks?:[string],
     sources:[{ name:"auth.log", lines:[string] }],
     evidence:[[sourceIndex, lineIndex], …],            // the lines that prove the finding
     qs:[{ k:"attack"|"account"|"host"|"first"|…, q, o:[4 options, first correct], x:"why" }] }
   State: { sel:{ "s:l": true }, sub:[{ ord:[shuffled option idx], ans:null }] }
   Scoring: evidence part = (hits − ½·wrong picks) / evidence.length, floored at 0; each question 1 point; f = total / (1 + qs.length).
   scoreLog is exported for the grader tests (DOM-free). */
import { registerSim } from "./registry.js";
import { esc, shuffle } from "../util.js";
import { injectCss, instructionsPane } from "./ui.js";

const key = (s, l) => s + ":" + l;
export function scoreLog(item, st) {
  const ev = new Set(item.evidence.map(([s, l]) => key(s, l)));
  const picked = Object.keys(st.sel || {}).filter(k => st.sel[k]);
  const hits = picked.filter(k => ev.has(k)).length, wrong = picked.length - hits;
  const evF = ev.size ? Math.max(0, (hits - 0.5 * wrong) / ev.size) : 1;
  const notes = [];
  if (hits < ev.size) notes.push(`Evidence: you selected ${hits} of ${ev.size} key lines${wrong ? ` and ${wrong} that were noise (−½ each)` : ""}. Key lines: ` + item.evidence.map(([s, l]) => `${item.sources[s].name} #${l + 1}`).join(", ") + ".");
  else if (wrong) notes.push(`Evidence: all ${ev.size} key lines found, but ${wrong} noise line${wrong > 1 ? "s" : ""} selected too (−½ each).`);
  let q = 0;
  item.qs.forEach((sq, i) => { const a = st.sub[i].ans; if (a === 0) q++; else notes.push(`${sq.q} ${a === null ? "Left blank." : "You picked: " + sq.o[a] + "."} Answer: ${sq.o[0]}${sq.x ? " — " + sq.x : ""}`); });
  const parts = 1 + item.qs.length;
  return { f: Math.round(((evF + q) / parts) * 1000) / 1000, notes, why: item.why || "", evF, q };
}

registerSim("logview", {
  label: "Log analysis", color: "#B48CFF",
  create(item) { return { sel: {}, src: 0, sub: item.qs.map(sq => ({ ord: shuffle(sq.o.map((_, i) => i)), ans: null })) }; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    if (item.prompt) { const p = document.createElement("p"); p.className = "pbqp"; p.textContent = item.prompt; el.appendChild(p); }
    instructionsPane(el, item, { title: "Tasks", fallback: "Tap the log lines that are evidence of the incident, then answer the questions below the log.", note: "Noise lines you select cost half a point each; nothing is lost by leaving a line unselected." });
    const ev = new Set(item.evidence.map(([s, l]) => key(s, l)));
    const wrap = document.createElement("div"); wrap.className = "lv"; el.appendChild(wrap);
    const nSel = () => Object.keys(st.sel).filter(k => st.sel[k]).length;
    const draw = () => {
      const si = Math.min(st.src || 0, item.sources.length - 1); const src = item.sources[si];
      wrap.innerHTML = `<div class="lv-tabs" role="tablist">${item.sources.map((s, i) => { const n = s.lines.filter((_, l) => st.sel[key(i, l)]).length; return `<button type="button" role="tab" class="lv-tab ${i === si ? "on" : ""}" data-s="${i}">${esc(s.name)}${n ? `<b>${n}</b>` : ""}</button>`; }).join("")}<span class="lv-count">${nSel()} selected</span></div>` +
        `<div class="lv-log" role="listbox" aria-multiselectable="true">${src.lines.map((ln, l) => { const k = key(si, l); const on = !!st.sel[k]; const cls = ctx.reveal ? (ev.has(k) ? (on ? "ok" : "miss") : (on ? "bad" : "")) : (on ? "on" : ""); return `<div class="lv-ln ${cls}" role="option" aria-selected="${on}" data-k="${k}"><span class="n">${l + 1}</span><span class="t">${esc(ln)}</span></div>`; }).join("")}</div>`;
      wrap.querySelectorAll(".lv-tab").forEach(b => b.onclick = () => { st.src = +b.dataset.s; ctx.onChange(); draw(); });
      wrap.querySelectorAll(".lv-ln").forEach(d => d.onclick = () => { if (ctx.locked) return; const k = d.dataset.k; if (st.sel[k]) delete st.sel[k]; else st.sel[k] = true; ctx.onChange(); d.classList.toggle("on", !!st.sel[k]); d.setAttribute("aria-selected", !!st.sel[k]); wrap.querySelector(".lv-count").textContent = nSel() + " selected"; const tab = wrap.querySelector(`.lv-tab[data-s="${si}"]`); const n = src.lines.filter((_, l) => st.sel[key(si, l)]).length; tab.innerHTML = esc(src.name) + (n ? `<b>${n}</b>` : ""); });
    };
    draw();
    const qbox = document.createElement("div"); qbox.className = "lv-qs"; el.appendChild(qbox);
    qbox.innerHTML = item.qs.map((sq, i) => `<div class="xm-sub"><div class="sq">${i + 1}. ${esc(sq.q)}</div><div class="xm-opts" data-s="${i}">${st.sub[i].ord.map((oi, k) => `<button type="button" class="xm-opt ${st.sub[i].ans === oi ? "sel" : ""} ${ctx.reveal ? (oi === 0 ? "right" : st.sub[i].ans === oi ? "wrong" : "") : ""}" data-i="${oi}"><span class="k">${"ABCDEF"[k]}</span><span>${esc(sq.o[oi])}</span></button>`).join("")}</div></div>`).join("");
    qbox.querySelectorAll(".xm-opts[data-s]").forEach(box => { const i = +box.dataset.s; box.querySelectorAll(".xm-opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.sub[i].ans = +b.dataset.i; box.querySelectorAll(".xm-opt").forEach(x => x.classList.toggle("sel", +x.dataset.i === st.sub[i].ans)); ctx.onChange(); }); });
  },
  answered: (item, st) => Object.keys(st.sel || {}).length > 0 || st.sub.some(s => s.ans !== null),
  score(item, st) { const r = scoreLog(item, st); return { f: r.f, notes: r.notes, why: r.why }; },
});

injectCss("cg-sim-logview", `
.lv{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0A1017;margin-bottom:12px}
.lv-tabs{display:flex;align-items:center;gap:0;overflow-x:auto;background:var(--panel);border-bottom:1px solid var(--line)}
.lv-tab{flex:none;border:none;background:none;color:var(--muted);font-size:13px;font-weight:700;padding:10px 12px;border-right:1px solid var(--line);position:relative;display:inline-flex;align-items:center;gap:6px}
.lv-tab b{font-size:10.5px;background:rgba(255,180,84,.2);color:var(--amber);border-radius:8px;padding:1px 6px}
.lv-tab.on{color:var(--ink);background:#0A1017}
.lv-tab.on::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:#B48CFF}
.lv-count{margin-left:auto;flex:none;font-size:11.5px;font-weight:700;color:var(--muted);padding:0 10px;white-space:nowrap}
.lv-log{max-height:300px;overflow:auto;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.4;-webkit-overflow-scrolling:touch}
.lv-ln{display:flex;gap:8px;padding:5px 10px 5px 6px;border-left:3px solid transparent;color:#C9D6E6;cursor:pointer;white-space:pre-wrap;word-break:break-word}
.lv-ln:nth-child(even){background:rgba(255,255,255,.02)}
.lv-ln .n{flex:none;width:26px;text-align:right;color:var(--dim);user-select:none;-webkit-user-select:none}
.lv-ln.on{background:rgba(255,180,84,.12);border-left-color:var(--amber)}
.lv-ln.ok{background:rgba(67,217,123,.14);border-left-color:var(--green)}
.lv-ln.miss{background:rgba(67,217,123,.06);border-left-color:var(--green);border-left-style:dashed}
.lv-ln.bad{background:rgba(255,93,82,.14);border-left-color:var(--red)}
.lv-qs .sq{font-size:14.5px;font-weight:700;margin:14px 0 8px;line-height:1.35}
.lv-qs .xm-opts{display:flex;flex-direction:column;gap:8px}
@media(min-width:768px){.lv-log{max-height:380px;font-size:12.5px}}
@media(min-width:1024px){.lv-log{max-height:460px}}
`);
