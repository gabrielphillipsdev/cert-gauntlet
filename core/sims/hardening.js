/* Cert Gauntlet — endpoint hardening panel sim (SY0-701 2.5 hardening, 4.1 secure baselines, 4.5 OS security).
   A host's services, firewall, updates, encryption, accounts, ports and remote-access toggles. Harden to the stated
   spec WITHOUT breaking the host's business function. Graded per control.

   item = { type:"hardening", title, prompt, task:[...], why,
            host:{ name, os, role },                               // shown in the panel header
            groups:[{ id, label }],                                 // section order
            controls:[{ id, g, l, d?, t:"toggle"|"select", o?, on?, off?, start, want?, crit?, why? }],
              // want: required final value → scored (+1 when met)
              // no want: must stay at start; changing it is an unnecessary change (−½), or −1 when crit (breaks the business function)
   state = { v:{ controlId: value } } */
import { registerSim } from "./registry.js";
import { esc } from "../util.js";
import { ensureCss, taskPane, valOk, fmtWant, clamp01 } from "./ui.js";
ensureCss();

const lbl = (c, v) => c.t === "toggle" ? (v ? (c.on || "On") : (c.off || "Off")) : String(v);

registerSim("hardening", {
  label: "Endpoint hardening", color: "#FF8A5B",
  create(item) { const v = {}; item.controls.forEach(c => v[c.id] = c.start); return { v }; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    taskPane(el, item, ctx);
    const panel = document.createElement("div"); panel.className = "scfg shard";
    const draw = () => {
      const v = st.v; const h0 = item.host || {};
      let h = `${item.prompt ? `<p class="pbqp">${esc(item.prompt)}</p>` : ""}<div class="scfg-head"><span class="scfg-dev">${esc(h0.name || "Host")}</span><span class="scfg-sub">${esc([h0.os, h0.role].filter(Boolean).join(" · "))}</span></div>`;
      (item.groups || [{ id: "all", label: "Controls" }]).forEach(g => {
        const cs = item.controls.filter(c => (c.g || "all") === g.id); if (!cs.length) return;
        h += `<div class="scfg-g"><div class="scfg-gl">${esc(g.label)}</div>`;
        cs.forEach(c => {
          let cls = "scfg-r", tag = "";
          if (ctx.reveal) {
            if (c.want !== undefined) { const ok = valOk(v[c.id], c.want); cls += ok ? " ok" : " bad"; tag = ok ? `<span class="scfg-tag ok">✓</span>` : `<span class="scfg-tag bad">✗ key: ${esc(wantLabel(c))}</span>`; }
            else if (v[c.id] !== c.start) { cls += c.crit ? " bad" : " warn"; tag = `<span class="scfg-tag ${c.crit ? "bad" : "warn"}">${c.crit ? "breaks the business function" : "changed, not required"}</span>`; }
          }
          h += `<div class="${cls}" data-id="${c.id}"><div class="scfg-l">${esc(c.l)}${tag}${c.d ? `<span class="scfg-d">${esc(c.d)}</span>` : ""}</div><div class="scfg-c">`;
          if (c.t === "select") h += `<select class="scfg-sel" data-id="${c.id}" ${ctx.locked ? "disabled" : ""}>${c.o.map(o => `<option ${v[c.id] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
          else h += `<button class="stog ${v[c.id] ? "on" : ""}" data-id="${c.id}" ${ctx.locked ? "disabled" : ""}><span class="stog-k"></span><span class="stog-t">${esc(lbl(c, v[c.id]))}</span></button>`;
          h += `</div></div>`;
        });
        h += `</div>`;
      });
      panel.innerHTML = h;
      panel.querySelectorAll(".scfg-sel").forEach(s => s.onchange = e => { st.v[e.target.dataset.id] = e.target.value; ctx.onChange(); draw(); });
      panel.querySelectorAll(".stog").forEach(b => b.onclick = () => { if (ctx.locked) return; st.v[b.dataset.id] = !st.v[b.dataset.id]; ctx.onChange(); draw(); });
    };
    draw();
    el.appendChild(panel);
  },
  answered: (item, st) => item.controls.some(c => st.v[c.id] !== c.start),
  score(item, st) {
    const v = st.v; let ok = 0, pen = 0; const notes = []; const scored = item.controls.filter(c => c.want !== undefined);
    scored.forEach(c => { if (valOk(v[c.id], c.want)) ok++; else notes.push(`${c.l}: ${lbl(c, v[c.id])} — should be ${wantLabel(c)}.${c.why ? " " + c.why : ""}`); });
    item.controls.filter(c => c.want === undefined && v[c.id] !== c.start).forEach(c => {
      pen += c.crit ? 1 : 0.5;
      notes.push(c.crit ? `${c.l}: you set it to ${lbl(c, v[c.id])}, which breaks the stated business function (−1).${c.why ? " " + c.why : ""}` : `${c.l}: changed to ${lbl(c, v[c.id])} although nothing required it (−½).${c.why ? " " + c.why : ""}`);
    });
    const f = scored.length ? clamp01((ok - pen) / scored.length) : 0;
    return { f, notes, why: item.why || "" };
  },
});
function wantLabel(c) { if (c.t === "toggle" && typeof c.want === "boolean") return c.want ? (c.on || "On") : (c.off || "Off"); return fmtWant(c.want); }
