/* Cert Gauntlet — network diagram placement sim (SY0-701 3.2 "device placement").
   Drag devices from a palette onto labeled slots on a topology; graded per slot.

   item = { type:"diagram", title, prompt, task:[...], why,
            w?, h?,                                   // viewBox (default 480 × 300)
            nodes:[{id, label, x, y, k?, w?, h?}],    // fixed topology pieces; k = cloud | rtr | sw | srv | pc | zone | box (default)
            links:[[a, b]],                           // ids of nodes or slots; drawn as lines
            slots:[{id, label, x, y, want, why?}],    // want = device id | [accepted ids]
            palette:["firewall", "ids", ...],         // device ids (see DEVICES) incl. distractors; items may add devices:{id:{n,s}}
            reuse?: false }                           // true = a device may fill several slots
   state = { place:{slotId: deviceId}, sel: deviceId|null, pal:[ids] } */
import { registerSim } from "./registry.js";
import { esc, shuffle } from "../util.js";
import { ensureCss, taskPane, dragify, valOk, fmtWant } from "./ui.js";
ensureCss();

export const DEVICES = {
  firewall: { n: "Firewall", s: "FW" }, ngfw: { n: "Next-gen firewall", s: "NGFW" }, waf: { n: "Web application firewall", s: "WAF" },
  ids: { n: "IDS (passive)", s: "IDS" }, ips: { n: "IPS (inline)", s: "IPS" }, tap: { n: "Network tap", s: "TAP" },
  jump: { n: "Jump box", s: "JUMP" }, vpn: { n: "VPN concentrator", s: "VPN" }, proxy: { n: "Forward proxy", s: "PROXY" }, rproxy: { n: "Reverse proxy", s: "RPROXY" },
  lb: { n: "Load balancer", s: "LB" }, dmz: { n: "DMZ / screened subnet", s: "DMZ" }, siem: { n: "SIEM collector", s: "SIEM" }, nac: { n: "NAC / 802.1X", s: "NAC" },
  honeypot: { n: "Honeypot", s: "HONEY" }, dlp: { n: "DLP gateway", s: "DLP" }, mailgw: { n: "Email security gateway", s: "MAILGW" }, sw: { n: "Switch", s: "SW" },
  rtr: { n: "Router", s: "RTR" }, sensor: { n: "Sensor / collector", s: "SENSOR" }, radius: { n: "RADIUS server", s: "RADIUS" }, bastion: { n: "Bastion host", s: "BASTION" },
  hsm: { n: "HSM", s: "HSM" }, sdwan: { n: "SD-WAN edge", s: "SDWAN" }, casb: { n: "CASB", s: "CASB" }, webfilter: { n: "Web filter", s: "WEBFLT" },
};
const dev = (item, id) => (item.devices && item.devices[id]) || DEVICES[id] || { n: id, s: id.toUpperCase().slice(0, 6) };
const SLOT_W = 92, SLOT_H = 32;
const KIND = { cloud: { rx: 18, w: 96, h: 40 }, rtr: { rx: 20, w: 72, h: 36 }, sw: { rx: 4, w: 84, h: 30 }, srv: { rx: 5, w: 82, h: 38 }, pc: { rx: 5, w: 80, h: 34 }, zone: { rx: 10, w: 160, h: 90 }, box: { rx: 8, w: 84, h: 36 } };

function center(item, id) {
  const n = item.nodes.find(x => x.id === id); if (n) return [n.x, n.y];
  const s = item.slots.find(x => x.id === id); if (s) return [s.x, s.y];
  return [0, 0];
}
function svgHtml(item, st, ctx) {
  const W = item.w || 480, H = item.h || 300;
  let s = `<svg class="sdg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  item.nodes.filter(n => n.k === "zone").forEach(n => { const k = KIND.zone; const w = n.w || k.w, h = n.h || k.h; s += `<rect class="sdg-zone" x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="${k.rx}"/><text class="sdg-zl" x="${n.x - w / 2 + 8}" y="${n.y - h / 2 + 14}">${esc(n.label)}</text>`; });
  (item.links || []).forEach(([a, b]) => { const [x1, y1] = center(item, a), [x2, y2] = center(item, b); s += `<line class="sdg-ln" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; });
  item.nodes.filter(n => n.k !== "zone").forEach(n => {
    const k = KIND[n.k] || KIND.box; const w = n.w || k.w, h = n.h || k.h;
    const lines = String(n.label).split("\n");
    s += `<g class="sdg-n ${n.k || "box"}"><rect x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="${k.rx}"/>${lines.map((t, i) => `<text x="${n.x}" y="${n.y + (i - (lines.length - 1) / 2) * 12 + 4}" text-anchor="middle">${esc(t)}</text>`).join("")}</g>`;
  });
  item.slots.forEach(sl => {
    const d = st.place[sl.id]; const ok = ctx.reveal ? valOk(d, sl.want) : null;
    const cls = "sdg-slot" + (d ? " filled" : "") + (ctx.reveal ? (ok ? " ok" : " bad") : "") + (st.sel && !ctx.locked ? " ready" : "");
    s += `<g class="${cls}" data-drop="${sl.id}"><rect x="${sl.x - SLOT_W / 2}" y="${sl.y - SLOT_H / 2}" width="${SLOT_W}" height="${SLOT_H}" rx="7"/>`;
    s += `<text class="sdg-sl" x="${sl.x}" y="${sl.y - SLOT_H / 2 - 4}" text-anchor="middle">${esc(sl.label)}</text>`;
    if (d) s += `<text class="sdg-sd" x="${sl.x}" y="${sl.y + 4}" text-anchor="middle">${esc(dev(item, d).s)}${ctx.reveal && !ok ? " ✗" : ""}</text>`;
    else s += `<text class="sdg-sd empty" x="${sl.x}" y="${sl.y + 4}" text-anchor="middle">${ctx.reveal ? "— " : "drop here"}</text>`;
    if (ctx.reveal && !ok) s += `<text class="sdg-key" x="${sl.x}" y="${sl.y + SLOT_H / 2 + 12}" text-anchor="middle">key: ${esc(fmtWant(Array.isArray(sl.want) ? sl.want.map(w => dev(item, w).s) : dev(item, sl.want).s))}</text>`;
    s += `</g>`;
  });
  return s + `</svg>`;
}

registerSim("diagram", {
  label: "Network diagram placement", color: "#C9B8FF",
  create(item) { return { place: {}, sel: null, pal: shuffle(item.palette.slice()) }; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    taskPane(el, item, ctx);
    const wrap = document.createElement("div"); wrap.className = "sdg-wrap";
    const used = () => new Set(Object.values(st.place));
    const draw = () => {
      wrap.innerHTML = `${item.prompt ? `<p class="pbqp">${esc(item.prompt)}</p>` : ""}<div class="sdg-box">${svgHtml(item, st, ctx)}</div>` +
        `<div class="spal"><div class="spal-h">${ctx.locked ? "Devices" : st.sel ? `<b>${esc(dev(item, st.sel).n)}</b> selected — tap a slot to place it, or tap it again to cancel` : "Drag a device onto a slot, or tap a device then tap a slot. Tap a filled slot to clear it."}</div><div class="spal-c">${st.pal.map(id => { const u = used().has(id) && !item.reuse; return `<button class="spal-i ${st.sel === id ? "sel" : ""} ${u ? "used" : ""}" data-dev="${id}" ${ctx.locked ? "disabled" : ""}>${esc(dev(item, id).n)}</button>`; }).join("")}</div></div>`;
      const placeInto = (slotId, devId) => {
        if (!devId) return;
        if (!item.reuse) for (const k in st.place) if (st.place[k] === devId) delete st.place[k];
        st.place[slotId] = devId; st.sel = null; ctx.onChange(); draw();
      };
      wrap.querySelectorAll(".spal-i").forEach(b => {
        const id = b.dataset.dev;
        if (ctx.locked || (b.classList.contains("used"))) return;
        dragify(b, { disabled: () => ctx.locked, onTap: () => { st.sel = st.sel === id ? null : id; ctx.onChange(); draw(); }, onDrop: t => placeInto(t.dataset.drop, id) });
      });
      wrap.querySelectorAll("[data-drop]").forEach(g => g.addEventListener("click", () => {
        if (ctx.locked) return; const sid = g.dataset.drop;
        if (st.sel) placeInto(sid, st.sel);
        else if (st.place[sid]) { delete st.place[sid]; ctx.onChange(); draw(); }
      }));
    };
    draw();
    el.appendChild(wrap);
  },
  answered: (item, st) => Object.keys(st.place).length > 0,
  score(item, st) {
    let ok = 0; const notes = [];
    item.slots.forEach(sl => {
      const d = st.place[sl.id];
      if (valOk(d, sl.want)) ok++;
      else {
        const key = Array.isArray(sl.want) ? sl.want.map(w => dev(item, w).n).join(" or ") : dev(item, sl.want).n;
        notes.push(`${sl.label}: ${d ? "you placed " + dev(item, d).n : "left empty"}; key is ${key}.${sl.why ? " " + sl.why : ""}`);
      }
    });
    notes.push("Key: " + item.slots.map(sl => `${sl.label} → ${Array.isArray(sl.want) ? sl.want.map(w => dev(item, w).n).join("/") : dev(item, sl.want).n}`).join(" · "));
    return { f: ok / item.slots.length, notes, why: item.why || "" };
  },
});
