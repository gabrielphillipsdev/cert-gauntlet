/* Cert Gauntlet — wireless access point configuration panel sim (SY0-701 4.1 wireless security, 3.2 802.1X/EAP).
   Set the fields to meet the stated requirement. Graded per field in item.want; changing a field the
   requirement did not ask for costs half a point ("unnecessary change" penalty), like the real PBQ.

   item = { type:"appanel", title, prompt, task:[...], why,
            start:{ field: value },                    // starting config (every field listed in FIELDS)
            want:{ field: value | [alternatives] | {re, label} },   // the scored fields
            fieldWhy?:{ field: "why this matters" } }
   state = { v:{ field: value } }
   Fields that only exist in one mode (PSK in Personal; EAP/RADIUS in Enterprise) are ignored when the final mode hides them. */
import { registerSim } from "./registry.js";
import { esc } from "../util.js";
import { ensureCss, taskPane, valOk, fmtWant, clamp01 } from "./ui.js";
ensureCss();

const ENT = m => /Enterprise/.test(m || ""), PSK = m => /Personal|mixed/.test(m || "");
export const MODES = ["Open", "OWE (Enhanced Open)", "WEP", "WPA2-Personal", "WPA2-Enterprise", "WPA3-Personal", "WPA3-Enterprise", "WPA3-Enterprise 192-bit", "WPA2/WPA3 mixed"];
export const FIELDS = [
  { k: "ssid", g: "Network", l: "SSID (network name)", t: "text", ph: "e.g. CorpWiFi" },
  { k: "hidden", g: "Network", l: "Hide SSID (disable broadcast)", t: "toggle" },
  { k: "band", g: "Network", l: "Band", t: "select", o: ["2.4 GHz", "5 GHz", "2.4 + 5 GHz", "6 GHz"] },
  { k: "mode", g: "Security", l: "Security mode", t: "select", o: MODES },
  { k: "psk", g: "Security", l: "Passphrase (pre-shared key)", t: "text", ph: "8–63 characters", when: v => PSK(v.mode) },
  { k: "eap", g: "Security", l: "EAP method", t: "select", o: ["PEAP (MSCHAPv2)", "EAP-TLS", "EAP-TTLS", "EAP-FAST", "LEAP"], when: v => ENT(v.mode) },
  { k: "radiusHost", g: "Security", l: "RADIUS server", t: "text", ph: "IP or hostname", when: v => ENT(v.mode) },
  { k: "radiusPort", g: "Security", l: "RADIUS authentication port", t: "text", ph: "1812", when: v => ENT(v.mode), num: true },
  { k: "radiusSecret", g: "Security", l: "RADIUS shared secret", t: "text", ph: "shared secret", when: v => ENT(v.mode) },
  { k: "pmf", g: "Security", l: "Protected management frames (802.11w)", t: "select", o: ["Disabled", "Optional", "Required"] },
  { k: "wps", g: "Access control", l: "WPS push-button / PIN setup", t: "toggle" },
  { k: "macFilter", g: "Access control", l: "MAC filtering", t: "select", o: ["Off", "Allow list only", "Deny list"] },
  { k: "isolation", g: "Access control", l: "Client isolation (block client-to-client)", t: "toggle" },
  { k: "mgmtWifi", g: "Management", l: "Admin interface reachable from wireless clients", t: "toggle" },
  { k: "adminDefault", g: "Management", l: "Admin password", t: "select", o: ["Factory default", "Changed to a unique strong password"] },
];
export const DEFAULT_START = { ssid: "Linksys-Setup", hidden: false, band: "2.4 + 5 GHz", mode: "WPA2-Personal", psk: "password123", eap: "PEAP (MSCHAPv2)", radiusHost: "", radiusPort: "1812", radiusSecret: "", pmf: "Optional", wps: true, macFilter: "Off", isolation: false, mgmtWifi: true, adminDefault: "Factory default" };
const visible = (f, v) => !f.when || f.when(v);

registerSim("appanel", {
  label: "Wireless AP configuration", color: "#43D97B",
  create(item) { return { v: { ...DEFAULT_START, ...(item.start || {}) } }; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    taskPane(el, item, ctx);
    const start = { ...DEFAULT_START, ...(item.start || {}) };
    const panel = document.createElement("div"); panel.className = "scfg";
    const draw = () => {
      const v = st.v; const groups = [...new Set(FIELDS.map(f => f.g))];
      let h = `${item.prompt ? `<p class="pbqp">${esc(item.prompt)}</p>` : ""}<div class="scfg-head"><span class="scfg-dev">${esc(item.device || "Access point")}</span><span class="scfg-sub">${esc(item.deviceSub || "Wireless settings")}</span></div>`;
      groups.forEach(g => {
        const fs = FIELDS.filter(f => f.g === g && visible(f, v)); if (!fs.length) return;
        h += `<div class="scfg-g"><div class="scfg-gl">${esc(g)}</div>`;
        fs.forEach(f => {
          const want = item.want && item.want[f.k]; const scored = want !== undefined;
          let cls = "scfg-r"; let tag = "";
          if (ctx.reveal) {
            if (scored) { const ok = valOk(v[f.k], want); cls += ok ? " ok" : " bad"; tag = ok ? `<span class="scfg-tag ok">✓</span>` : `<span class="scfg-tag bad">✗ key: ${esc(fmtWantField(f, want))}</span>`; }
            else if (v[f.k] !== start[f.k]) { cls += " warn"; tag = `<span class="scfg-tag warn">changed, not required</span>`; }
          }
          h += `<div class="${cls}" data-k="${f.k}"><div class="scfg-l">${esc(f.l)}${tag}</div><div class="scfg-c">`;
          if (f.t === "text") h += `<input class="scfg-in" data-k="${f.k}" value="${esc(v[f.k] ?? "")}" placeholder="${esc(f.ph || "")}" ${f.num ? 'inputmode="numeric"' : ""} autocomplete="off" autocapitalize="off" spellcheck="false" data-keyrow="off" ${ctx.locked ? "disabled" : ""}>`;
          else if (f.t === "select") h += `<select class="scfg-sel" data-k="${f.k}" ${ctx.locked ? "disabled" : ""}>${f.o.map(o => `<option ${v[f.k] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
          else h += `<button class="stog ${v[f.k] ? "on" : ""}" data-k="${f.k}" ${ctx.locked ? "disabled" : ""}><span class="stog-k"></span><span class="stog-t">${v[f.k] ? "On" : "Off"}</span></button>`;
          h += `</div></div>`;
        });
        h += `</div>`;
      });
      panel.innerHTML = h;
      panel.querySelectorAll(".scfg-in").forEach(i => i.oninput = e => { st.v[e.target.dataset.k] = e.target.value; ctx.onChange(); });
      panel.querySelectorAll(".scfg-sel").forEach(s => s.onchange = e => { st.v[e.target.dataset.k] = e.target.value; ctx.onChange(); draw(); });
      panel.querySelectorAll(".stog").forEach(b => b.onclick = () => { if (ctx.locked) return; st.v[b.dataset.k] = !st.v[b.dataset.k]; ctx.onChange(); draw(); });
    };
    draw();
    el.appendChild(panel);
  },
  answered(item, st) { const start = { ...DEFAULT_START, ...(item.start || {}) }; return FIELDS.some(f => st.v[f.k] !== start[f.k]); },
  score(item, st) {
    const start = { ...DEFAULT_START, ...(item.start || {}) }; const v = st.v; const want = item.want || {};
    let ok = 0, pen = 0; const notes = []; const keys = Object.keys(want);
    keys.forEach(k => {
      const f = FIELDS.find(x => x.k === k);
      if (valOk(v[k], want[k])) ok++;
      else notes.push(`${f ? f.l : k}: ${showVal(f, v[k])} — should be ${fmtWantField(f, want[k])}.${item.fieldWhy && item.fieldWhy[k] ? " " + item.fieldWhy[k] : ""}`);
    });
    FIELDS.forEach(f => {
      if (want[f.k] !== undefined || !visible(f, v)) return;
      if (String(v[f.k] ?? "") !== String(start[f.k] ?? "")) { pen += 0.5; notes.push(`${f.l}: changed to ${showVal(f, v[f.k])} although the requirement did not call for it (−½ point). Touch only what the task asks for.`); }
    });
    const f = keys.length ? clamp01((ok - pen) / keys.length) : 0;
    if (pen) notes.push(`Unnecessary changes: ${pen / 0.5}.`);
    return { f, notes, why: item.why || "" };
  },
});
function showVal(f, v) { if (f && f.t === "toggle") return v ? "On" : "Off"; return v === "" || v === undefined || v === null ? "blank" : `"${v}"`; }
function fmtWantField(f, want) { if (f && f.t === "toggle" && typeof want === "boolean") return want ? "On" : "Off"; return fmtWant(want); }
