/* Cert Gauntlet — CCNA show-output reader item (sim type "show-reader"), Chat 8.
   item = { id, obj, d, title, device, command, output, q, opts:[4], ans, why }   (generated: dev/tools/gen-reader.mjs)
   state = { pick: null | index }. One point, all or nothing — like the MC items it trains for. */
import { registerSim } from "../../registry.js";
import { esc } from "../../../util.js";
import { injectCss } from "../../ui.js";

registerSim("show-reader", {
  label: "Show-output reader", color: "#7FD1AE",
  create() { return { pick: null }; },
  render(el, item, st, ctx) {
    el.innerHTML = `<div class="sr"><div class="sr-term"><div class="sr-cmd">${esc(item.device)}# ${esc(item.command)}</div><pre class="sr-out" tabindex="0">${esc(item.output)}</pre></div>` +
      `<div class="sr-q"><p class="sr-qt">${esc(item.q)}</p><div class="sr-opts" role="radiogroup">${item.opts.map((o, i) => {
        const cls = ctx.reveal ? (i === item.ans ? "ok" : i === st.pick ? "bad" : "") : (i === st.pick ? "sel" : "");
        return `<button type="button" role="radio" aria-checked="${i === st.pick}" class="sr-o ${cls}" data-i="${i}" ${ctx.locked ? "disabled" : ""}><span class="sr-l">${"ABCD"[i]}</span>${esc(o)}</button>`;
      }).join("")}</div>${ctx.reveal && item.why ? `<p class="sr-why">${esc(item.why)}</p>` : ""}</div></div>`;
    el.querySelectorAll(".sr-o").forEach(b => b.onclick = () => { if (ctx.locked) return; st.pick = +b.dataset.i; ctx.onChange(); this.render(el, item, st, ctx); });
  },
  answered: (item, st) => st.pick !== null,
  score(item, st) {
    const ok = st.pick === item.ans;
    return { f: ok ? 1 : 0, notes: [ok ? "Correct." : st.pick === null ? "Not answered." : `You chose ${"ABCD"[st.pick]}; the answer is ${"ABCD"[item.ans]}: ${item.opts[item.ans]}`], why: item.why || "" };
  },
});

injectCss("cg-sim-show-reader", `
.sr{display:flex;flex-direction:column;gap:12px}
.sr-term{background:#0A1017;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.sr-cmd{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#9EF0E4;padding:8px 12px;border-bottom:1px solid var(--line);background:#0D1620}
.sr-out{margin:0;padding:10px 12px;max-height:52vh;overflow:auto;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.4;color:#C9D6E6;white-space:pre;-webkit-overflow-scrolling:touch}
.sr-qt{font-size:15px;line-height:1.45;font-weight:600;margin:0 0 10px}
.sr-opts{display:flex;flex-direction:column;gap:8px}
.sr-o{display:flex;gap:10px;align-items:flex-start;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:10px;color:var(--ink);font-size:14px;line-height:1.4;padding:10px 12px}
.sr-o .sr-l{flex:none;font-weight:800;color:var(--muted);width:16px}
.sr-o.sel{border-color:var(--teal);background:#11283A}.sr-o.ok{border-color:var(--green);background:rgba(67,217,123,.12)}.sr-o.bad{border-color:var(--red);background:rgba(255,93,82,.1)}
.sr-why{color:var(--muted);font-size:13.5px;line-height:1.5;border-top:1px solid var(--line);padding-top:10px;margin:10px 0 0}
@media(min-width:1024px){.sr{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start}.sr-out{max-height:70vh;font-size:12px}}
`);
