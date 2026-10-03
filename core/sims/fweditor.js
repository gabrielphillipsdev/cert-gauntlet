/* Cert Gauntlet — firewall rule editor sim ("fweditor").
   An editable rule table (add / delete / reorder / edit: action, source, destination, port, protocol) with the implicit
   deny shown at the bottom. The scenario states a policy in English; grading evaluates a HIDDEN packet set against the
   candidate's table top-down, so every table that implements the policy passes and ordering mistakes are caught.

   Item schema (see dev/specs/secplus.md):
   { id, obj, type:"fweditor", title, prompt, d?, cat?, why?,
     tasks:[policy lines],
     nets:[{ v:"10.0.10.0/24", l:"User LAN" }, { v:"any", l:"Any" }, …],    // choices for source / destination
     ports:["any","22","443","1024-65535", …],                              // choices for port
     protos?:["any","tcp","udp","icmp"],
     rules:[{ act:"allow"|"deny", src, dst, port, proto }],                 // starting table (may be empty or partly wrong)
     packets:[{ src, dst, port, proto, want:"allow"|"deny", note }],        // hidden grading set
     maxRules?: n }
   State: { rules:[…] }
   evalPacket / scoreTable are exported for the grader tests (DOM-free). */
import { registerSim } from "./registry.js";
import { esc } from "../util.js";
import { injectCss, instructionsPane, sortable } from "./ui.js";

function ip2n(ip) { const p = String(ip).split(".").map(Number); if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return null; return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
export function inNet(ip, spec) {
  spec = String(spec || "any").trim().toLowerCase(); if (spec === "any" || spec === "0.0.0.0/0") return true;
  const [net, bitsS] = spec.split("/"); const bits = bitsS === undefined ? 32 : +bitsS; const a = ip2n(net), b = ip2n(ip); if (a === null || b === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0; return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}
export function portMatch(spec, port) {
  spec = String(spec || "any").trim().toLowerCase(); if (spec === "any" || spec === "*") return true;
  return spec.split(",").some(part => { const m = part.trim().match(/^(\d+)\s*-\s*(\d+)$/); if (m) return port >= +m[1] && port <= +m[2]; return +part === +port; });
}
export function protoMatch(spec, proto) { spec = String(spec || "any").toLowerCase(); return spec === "any" || spec === String(proto).toLowerCase(); }
export function evalPacket(rules, pkt) {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (inNet(pkt.src, r.src) && inNet(pkt.dst, r.dst) && portMatch(r.port, pkt.port) && protoMatch(r.proto, pkt.proto)) return { act: String(r.act).toLowerCase() === "allow" ? "allow" : "deny", idx: i };
  }
  return { act: "deny", idx: -1 };
}
export function scoreTable(item, rules) {
  const res = item.packets.map(p => { const r = evalPacket(rules, p); return { p, got: r.act, idx: r.idx, ok: r.act === p.want }; });
  const ok = res.filter(r => r.ok).length;
  const past = a => a === "allow" ? "ALLOWED" : "DENIED";
  const notes = res.filter(r => !r.ok).map(r => `${r.p.src} → ${r.p.dst} port ${r.p.port}/${r.p.proto} should be ${past(r.p.want)} but ${r.idx < 0 ? "fell through to the implicit deny" : "rule " + (r.idx + 1) + " " + past(r.got) + " it"}${r.p.note ? " — " + r.p.note : ""}.`);
  if (!notes.length) notes.push("Every test packet was handled the way the policy requires.");
  return { f: ok / item.packets.length, notes, why: item.why || "", res };
}
const label = (item, v) => { const n = (item.nets || []).find(x => x.v === v); return n ? `${n.l} (${n.v})` : v; };

registerSim("fweditor", {
  label: "Firewall rule editor", color: "#FF8093",
  create(item) { return { rules: (item.rules || []).map(r => ({ act: r.act || "allow", src: r.src || "any", dst: r.dst || "any", port: String(r.port || "any"), proto: r.proto || "any" })), touched: false }; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    if (item.prompt) { const p = document.createElement("p"); p.className = "pbqp"; p.textContent = item.prompt; el.appendChild(p); }
    instructionsPane(el, item, { title: "Policy", note: "Rules are evaluated top-down, first match wins. Traffic that matches nothing hits the implicit deny." });
    const wrap = document.createElement("div"); wrap.className = "fwe"; el.appendChild(wrap);
    const nets = item.nets || [{ v: "any", l: "Any" }], ports = item.ports || ["any"], protos = item.protos || ["any", "tcp", "udp", "icmp"];
    const sel = (i, k, opts, fmt) => `<label class="fwe-f"><span>${k === "src" ? "Source" : k === "dst" ? "Destination" : k === "port" ? "Port" : "Proto"}</span><select data-i="${i}" data-k="${k}" ${ctx.locked ? "disabled" : ""}>${opts.map(o => { const v = typeof o === "string" ? o : o.v; return `<option value="${esc(v)}" ${String(st.rules[i][k]) === String(v) ? "selected" : ""}>${esc(fmt ? fmt(o) : v)}</option>`; }).join("")}</select></label>`;
    const draw = () => {
      const rev = ctx.reveal ? scoreTable(item, st.rules) : null;
      const used = rev ? new Set(rev.res.map(r => r.idx)) : null;
      wrap.innerHTML = `<div class="fwe-head"><span>#</span><span>Rule</span></div><div class="fwe-list">` + st.rules.map((r, i) => `<div class="fwe-row ${rev && used.has(i) ? (rev.res.filter(x => x.idx === i).every(x => x.ok) ? "okrow" : "badrow") : ""}" data-i="${i}">` +
        `<div class="fwe-top"><span class="grab" aria-label="Drag to reorder">☰</span><span class="fwe-n">${i + 1}</span>` +
        `<button type="button" class="fwe-act ${r.act}" data-i="${i}" ${ctx.locked ? "disabled" : ""}>${r.act.toUpperCase()}</button>` +
        `<span class="fwe-sp"></span><button type="button" class="fwe-mv" data-i="${i}" data-d="-1" aria-label="Move up" ${ctx.locked || i === 0 ? "disabled" : ""}>▲</button><button type="button" class="fwe-mv" data-i="${i}" data-d="1" aria-label="Move down" ${ctx.locked || i === st.rules.length - 1 ? "disabled" : ""}>▼</button><button type="button" class="fwe-del" data-i="${i}" aria-label="Delete rule" ${ctx.locked ? "disabled" : ""}>×</button></div>` +
        `<div class="fwe-fields">${sel(i, "src", nets, o => `${o.l} · ${o.v}`)}${sel(i, "dst", nets, o => `${o.l} · ${o.v}`)}${sel(i, "port", ports)}${sel(i, "proto", protos, p => p.toUpperCase())}</div></div>`).join("") +
        `</div><div class="fwe-row imp"><div class="fwe-top"><span class="fwe-n">${st.rules.length + 1}</span><span class="fwe-act deny">DENY</span><span class="fwe-imp">any → any · any port · any protocol <em>(implicit deny)</em></span></div></div>` +
        (ctx.locked ? "" : `<button type="button" class="fwe-add" ${item.maxRules && st.rules.length >= item.maxRules ? "disabled" : ""}>+ Add rule${item.maxRules ? ` (${st.rules.length}/${item.maxRules})` : ""}</button>`) +
        (rev ? `<div class="fwe-pk"><div class="fwe-pkh">Hidden test packets</div>${rev.res.map(r => `<div class="${r.ok ? "ok" : "bad"}">${r.ok ? "✓" : "✗"} ${esc(r.p.src)} → ${esc(r.p.dst)} :${esc(String(r.p.port))}/${esc(r.p.proto)} · want ${r.p.want.toUpperCase()} · got ${r.got.toUpperCase()}${r.idx >= 0 ? " (rule " + (r.idx + 1) + ")" : " (implicit)"}</div>`).join("")}</div>` : "");
      const change = () => { st.touched = true; ctx.onChange(); draw(); };
      wrap.querySelectorAll("select").forEach(s => s.onchange = () => { st.rules[+s.dataset.i][s.dataset.k] = s.value; st.touched = true; ctx.onChange(); if (ctx.reveal) draw(); });
      wrap.querySelectorAll(".fwe-act[data-i]").forEach(b => b.onclick = () => { const r = st.rules[+b.dataset.i]; r.act = r.act === "allow" ? "deny" : "allow"; change(); });
      wrap.querySelectorAll(".fwe-del").forEach(b => b.onclick = () => { st.rules.splice(+b.dataset.i, 1); change(); });
      wrap.querySelectorAll(".fwe-mv").forEach(b => b.onclick = () => { const i = +b.dataset.i, j = i + +b.dataset.d; if (j < 0 || j >= st.rules.length) return; [st.rules[i], st.rules[j]] = [st.rules[j], st.rules[i]]; change(); });
      const add = wrap.querySelector(".fwe-add"); if (add) add.onclick = () => { st.rules.push({ act: "allow", src: nets[0].v, dst: nets[0].v, port: String(ports[0]), proto: protos[0] }); change(); };
      sortable(wrap.querySelector(".fwe-list"), { item: ".fwe-row", handle: ".grab", disabled: () => !!ctx.locked, onReorder: (from, to) => { const [r] = st.rules.splice(from, 1); st.rules.splice(to, 0, r); change(); } });
    };
    draw();
  },
  answered: (item, st) => !!st.touched,
  score(item, st) { const r = scoreTable(item, st.rules); return { f: r.f, notes: r.notes, why: r.why }; },
});

injectCss("cg-sim-fweditor", `
.fwe{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
.fwe-head{display:none}
.fwe-row{border-bottom:1px solid var(--line);padding:8px 10px;background:var(--panel)}
.fwe-row.okrow{box-shadow:inset 4px 0 0 var(--green)}.fwe-row.badrow{box-shadow:inset 4px 0 0 var(--red)}
.fwe-row.imp{background:var(--panel-2);opacity:.85}
.fwe-top{display:flex;align-items:center;gap:8px}
.fwe-n{flex:none;width:22px;text-align:center;font-weight:800;color:var(--muted);font-size:13px}
.fwe-act{flex:none;border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:900;letter-spacing:.04em;min-width:68px;text-align:center}
.fwe-act.allow{background:rgba(67,217,123,.18);color:var(--green)}.fwe-act.deny{background:rgba(255,93,82,.18);color:var(--red)}
button.fwe-act:not(:disabled):active{transform:scale(.97)}
.fwe-sp{flex:1}
.fwe-mv,.fwe-del{flex:none;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--muted);font-size:13px}
.fwe-del{color:var(--red);font-size:18px}
.fwe-mv:disabled,.fwe-del:disabled{opacity:.3}
.fwe-imp{font-size:12.5px;color:var(--muted)}.fwe-imp em{font-style:normal;color:var(--dim)}
.fwe-fields{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.fwe-f{display:flex;flex-direction:column;gap:2px;min-width:0}
.fwe-f span{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--dim)}
.fwe-f select{width:100%;min-width:0;background:var(--bg);border:1px solid var(--line);border-radius:9px;color:var(--ink);font-size:14px;padding:8px 8px;-webkit-appearance:none;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 14px) 55%,calc(100% - 9px) 55%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:24px}
.fwe-add{display:block;width:100%;border:none;background:var(--panel-2);color:var(--teal);font-weight:800;font-size:14px;padding:12px}
.fwe-pk{padding:10px 12px;font-size:12.5px;line-height:1.6;border-top:1px solid var(--line);font-family:ui-monospace,Menlo,Consolas,monospace}
.fwe-pkh{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:4px}
.fwe-pk .ok{color:var(--green)}.fwe-pk .bad{color:var(--red)}
@media(min-width:768px){
  .fwe-row:not(.imp){display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
  .fwe-fields{margin-top:0;grid-template-columns:1.4fr 1.4fr .8fr .7fr}
  .fwe-top .fwe-sp{display:none}
  .fwe-row:not(.imp) .fwe-top{display:contents}
  .fwe-row:not(.imp) .fwe-top>*{order:0}
  .fwe-row:not(.imp){grid-template-columns:28px 22px 76px 1fr 32px 32px 32px;grid-template-areas:"g n a f up dn del"}
  .fwe-row:not(.imp) .grab{grid-area:g}.fwe-row:not(.imp) .fwe-n{grid-area:n}.fwe-row:not(.imp) .fwe-act{grid-area:a}.fwe-row:not(.imp) .fwe-fields{grid-area:f}
  .fwe-row:not(.imp) .fwe-mv[data-d="-1"]{grid-area:up}.fwe-row:not(.imp) .fwe-mv[data-d="1"]{grid-area:dn}.fwe-row:not(.imp) .fwe-del{grid-area:del}
}
`);
