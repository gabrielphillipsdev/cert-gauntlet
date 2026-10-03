/* Cert Gauntlet — generated PBQs: a fresh problem every attempt. hashid · fwrule (read a rule table) · risk (SLE/ALE).
   Items may carry task:[...] for the sticky task pane (ui.js); the pane also holds the exam-style calculator.
   The generator output lives in state.g so an in-progress exam can be resumed on another device with the same problem. */
import { registerSim } from "./registry.js";
import { esc, shuffle, pick } from "../util.js";
import { ensureCss, taskPane } from "./ui.js";
ensureCss();
/* Every generator mounts the sticky task pane (instructions + calculator) above its body. */
function pane(el, item, ctx) { const b = taskPane(el, item, ctx); if (b) el.prepend(b); }

/* ---------- hash identification ---------- */
const HASHALG = [{ n: "MD5", bits: 128 }, { n: "SHA-1", bits: 160 }, { n: "SHA-256", bits: 256 }, { n: "SHA-512", bits: 512 }];
function randHex(n) { let s = ""; for (let i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; }
export function genHash() {
  const a = pick(HASHALG); const hex = a.bits / 4; const b64 = Math.random() < 0.3;
  let str = randHex(hex), enc = "hex";
  if (b64) { const bytes = []; for (let i = 0; i < a.bits / 8; i++) bytes.push(Math.floor(Math.random() * 256)); str = btoa(String.fromCharCode(...bytes)); enc = "base64"; }
  const ctx = pick(["a password hash in an /etc/shadow-style dump", "a file checksum published next to a download", "a digest in a digital signature header", "an integrity value in a FIM alert"]);
  return { alg: a.n, bits: a.bits, str, enc, hexLen: hex, ctx, order: shuffle(HASHALG.map(x => x.n)) };
}
export function hashCheck(g, alg, bits) {
  let ok = 0; const notes = [];
  const tell = g.enc === "hex" ? `${g.hexLen} hex characters × 4 bits = ${g.bits} bits` : `${g.str.length} Base64 characters ≈ ${g.bits / 8} bytes = ${g.bits} bits`;
  if (alg === g.alg) ok++; else notes.push((alg ? "You picked " + alg + ". " : "No algorithm picked. ") + "Length is the tell: " + tell + " = " + g.alg + ".");
  const b = parseInt(bits, 10);
  if (b === g.bits) ok++; else notes.push("Bit length: " + (bits ? "you entered " + bits : "blank") + "; " + g.alg + " produces " + g.bits + " bits.");
  return { f: ok / 2, notes, why: "Ladder: MD5 128 bits = 32 hex · SHA-1 160 = 40 hex · SHA-256 = 64 hex · SHA-512 = 128 hex. Hex chars × 4 = bits; Base64 chars × 6 ≈ bits." };
}
registerSim("hashid", {
  label: "Hash identification", color: "#5EE0D8", generated: true,
  create() { return { g: genHash(), alg: null, bits: "" }; },
  render(el, item, st, ctx) {
    const g = st.g;
    el.innerHTML = `<p class="pbqp">${esc(item.prompt || "Read the digest, name the algorithm, give its bit length.")}</p><div class="given mono">${esc(g.str)}</div><p class="pbqp">Seen as ${esc(g.ctx)}. It is ${g.enc === "hex" ? g.str.length + " hex characters" : "Base64, " + g.str.length + " characters"}.</p><p class="pbqp strong">Which algorithm produced it?</p><div class="optcol hx">${g.order.map(n => `<button class="opt ${st.alg === n ? "sel" : ""} ${ctx.reveal ? (n === g.alg ? "right" : st.alg === n ? "wrong" : "") : ""}" data-alg="${n}">${n}</button>`).join("")}</div><label class="fl">Digest length in bits<input class="fi ${ctx.reveal ? (parseInt(st.bits, 10) === g.bits ? "ok" : "bad") : ""}" inputmode="numeric" placeholder="e.g. 256" autocomplete="off" value="${esc(st.bits)}" ${ctx.locked ? "disabled" : ""}></label>`;
    pane(el, item, ctx);
    el.querySelectorAll(".hx .opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.alg = b.dataset.alg; el.querySelectorAll(".hx .opt").forEach(x => x.classList.toggle("sel", x.dataset.alg === st.alg)); ctx.onChange(); });
    el.querySelector(".fi").oninput = e => { st.bits = e.target.value; ctx.onChange(); };
  },
  answered: (item, st) => st.alg !== null || !!(st.bits && st.bits.trim()),
  score: (item, st) => hashCheck(st.g, st.alg, st.bits),
});

/* ---------- firewall rule walk ---------- */
const FWNETS = [["10.0.10.0/24", "user LAN"], ["10.0.20.0/24", "server VLAN"], ["203.0.113.0/24", "internet"]];
const FWPORTS = [[22, "SSH"], [443, "HTTPS"], [3389, "RDP"], [445, "SMB"], [53, "DNS"], [25, "SMTP"]];
export function inNet(ip, net) {
  if (net === "any") return true;
  const [b, c] = net.split("/"); const m = (0xFFFFFFFF << (32 - +c)) >>> 0; const n = s => s.split(".").reduce((a, o) => (a * 256) + (+o), 0);
  return ((n(ip) & m) >>> 0) === ((n(b) & m) >>> 0);
}
function randIp(net) { const base = net.split("/")[0].split("."); base[3] = String(5 + Math.floor(Math.random() * 200)); return base.join("."); }
export function genFw() {
  const rules = []; const n = 4 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const src = Math.random() < 0.25 ? "any" : pick(FWNETS)[0]; let dst = Math.random() < 0.25 ? "any" : pick(FWNETS)[0];
    if (Math.random() < 0.4 && dst !== "any") dst = randIp(dst);
    rules.push({ src, dst, port: Math.random() < 0.2 ? "any" : String(pick(FWPORTS)[0]), act: Math.random() < 0.6 ? "ALLOW" : "DENY" });
  }
  const pkt = { src: randIp(pick(FWNETS)[0]), dst: randIp(pick(FWNETS)[0]), port: String(pick(FWPORTS)[0]) };
  let match = null;
  for (let i = 0; i < rules.length; i++) { const r = rules[i]; if (inNet(pkt.src, r.src) && (r.dst === "any" || (r.dst.includes("/") ? inNet(pkt.dst, r.dst) : r.dst === pkt.dst)) && (r.port === "any" || r.port === pkt.port)) { match = i; break; } }
  return { rules, pkt, match, act: match === null ? "DENY" : rules[match].act, svc: (FWPORTS.find(p => String(p[0]) === pkt.port) || ["", "?"])[1] };
}
export function fwCheck(g, act, rule) {
  let ok = 0; const notes = [];
  if (act === g.act) ok++; else notes.push("Action: " + (act ? "you said " + act : "blank") + "; the packet is " + g.act + "ED.");
  const want = g.match === null ? "imp" : String(g.match);
  if (rule === want) ok++; else notes.push("Rule: " + (rule ? (rule === "imp" ? "you chose implicit deny" : "you chose rule " + (+rule + 1)) : "blank") + "; " + (g.match === null ? "nothing matched, so the implicit deny at the bottom applies." : "rule " + (g.match + 1) + " is the first line whose source, destination and port all fit, and evaluation stops there."));
  const trace = g.rules.map((r, i) => { const s = inNet(g.pkt.src, r.src), d = r.dst === "any" || (r.dst.includes("/") ? inNet(g.pkt.dst, r.dst) : r.dst === g.pkt.dst), p = r.port === "any" || r.port === g.pkt.port; return (i + 1) + ": " + (s && d && p ? "MATCH → " + r.act : "no (" + (!s ? "source" : !d ? "destination" : "port") + " doesn't fit)"); });
  notes.push("Walk it top-down:\n" + trace.join("\n"));
  return { f: ok / 2, notes, why: "First match wins; anything unmatched hits the implicit deny." };
}
registerSim("fwrule", {
  label: "Firewall rule evaluation", color: "#FF8093", generated: true,
  create() { return { g: genFw(), act: null, rule: null }; },
  render(el, item, st, ctx) {
    const g = st.g; const want = g.match === null ? "imp" : String(g.match);
    const rv = (sel, key, mine) => ctx.reveal ? (mine === key ? "right" : sel === mine ? "wrong" : "") : "";
    el.innerHTML = `<p class="pbqp">${esc(item.prompt || "Walk the rule table top-down for the packet shown.")}</p><pre class="out"># ACTION  SOURCE            DESTINATION       PORT\n${g.rules.map((r, i) => `${i + 1} ${r.act.padEnd(6)}  ${r.src.padEnd(17)} ${r.dst.padEnd(17)} ${r.port}`).join("\n")}\n${g.rules.length + 1} DENY    any               any               any   (implicit)</pre><div class="given">Packet: <b>${g.pkt.src} → ${g.pkt.dst}</b><br>TCP ${g.pkt.port} (${g.svc}). Networks: 10.0.10.0/24 users · 10.0.20.0/24 servers · 203.0.113.0/24 internet</div><p class="pbqp strong">What happens to it?</p><div class="optrow fw-act">${["ALLOW", "DENY"].map(a => `<button class="opt ${st.act === a ? "sel" : ""} ${rv(st.act, g.act, a)}" data-act="${a}">${a}</button>`).join("")}</div><p class="pbqp strong">Which rule decides it?</p><div class="optrow wrap fw-rule">${g.rules.map((_, i) => `<button class="opt ${st.rule === String(i) ? "sel" : ""} ${rv(st.rule, want, String(i))}" data-rule="${i}">${i + 1}</button>`).join("")}<button class="opt grow ${st.rule === "imp" ? "sel" : ""} ${rv(st.rule, want, "imp")}" data-rule="imp">Implicit deny</button></div>`;
    pane(el, item, ctx);
    el.querySelectorAll(".fw-act .opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.act = b.dataset.act; el.querySelectorAll(".fw-act .opt").forEach(x => x.classList.toggle("sel", x.dataset.act === st.act)); ctx.onChange(); });
    el.querySelectorAll(".fw-rule .opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.rule = b.dataset.rule; el.querySelectorAll(".fw-rule .opt").forEach(x => x.classList.toggle("sel", x.dataset.rule === st.rule)); ctx.onChange(); });
  },
  answered: (item, st) => st.act !== null || st.rule !== null,
  score: (item, st) => fwCheck(st.g, st.act, st.rule),
});

/* ---------- risk math ---------- */
export function genRisk() {
  const av = pick([50000, 120000, 250000, 400000, 800000, 1500000]); const ef = pick([10, 20, 25, 40, 50, 75]);
  const aroPick = pick([["once every 10 years", 0.1], ["once every 5 years", 0.2], ["once every 4 years", 0.25], ["once every 2 years", 0.5], ["once a year", 1], ["twice a year", 2]]);
  const sle = av * ef / 100, ale = sle * aroPick[1];
  const asset = pick(["The customer database", "The e-commerce web tier", "The manufacturing PLC network", "The payroll system", "The file server cluster"]);
  const ctrlCost = Math.round(ale * (Math.random() < 0.5 ? 0.5 + Math.random() * 0.4 : 1.1 + Math.random() * 0.8) / 100) * 100;
  const newEf = Math.max(5, ef - pick([10, 15, 20])); const newAle = av * newEf / 100 * aroPick[1];
  return { av, ef, aro: aroPick[1], aroTxt: aroPick[0], sle, ale, asset, ctrlCost, newEf, newAle, worth: (ale - newAle) > ctrlCost };
}
export function riskCheck(g, sle, ale, worth) {
  let ok = 0; const notes = []; const num = s => parseInt(String(s || "").replace(/[^0-9]/g, ""), 10); const $$ = n => "$" + Math.round(n).toLocaleString();
  if (num(sle) === g.sle) ok++; else notes.push("SLE: " + (sle ? "you entered " + sle : "blank") + "; AV " + $$(g.av) + " × EF " + g.ef + "% = " + $$(g.sle) + ".");
  if (num(ale) === Math.round(g.ale)) ok++; else notes.push("ALE: " + (ale ? "you entered " + ale : "blank") + "; SLE " + $$(g.sle) + " × ARO " + g.aro + " = " + $$(g.ale) + ".");
  if (worth === (g.worth ? "Yes" : "No")) ok++; else notes.push("Cost-benefit: new ALE = " + $$(g.av) + " × " + g.newEf + "% × " + g.aro + " = " + $$(g.newAle) + "; savings " + $$(g.ale - g.newAle) + " per year vs cost " + $$(g.ctrlCost) + " → " + (g.worth ? "justified." : "NOT justified."));
  return { f: ok / 3, notes, why: "SLE = AV × EF · ALE = SLE × ARO · a control pays when (ALE before − ALE after) > annual cost." };
}
registerSim("risk", {
  label: "Risk calculation", color: "#6EE7B7", generated: true,
  create() { return { g: genRisk(), sle: "", ale: "", worth: null }; },
  render(el, item, st, ctx) {
    const g = st.g; const num = s => parseInt(String(s || "").replace(/[^0-9]/g, ""), 10);
    const fi = (k, want) => `fi ${ctx.reveal ? (num(st[k]) === Math.round(want) ? "ok" : "bad") : ""}`;
    el.innerHTML = `<p class="pbqp">${esc(item.prompt || "Compute the loss figures and decide whether the control is worth buying.")}</p><div class="given">${esc(g.asset)} is valued at <b>$${g.av.toLocaleString()}</b>. A ransomware event would destroy <b>${g.ef}%</b> of its value and is expected <b>${g.aroTxt}</b>.<br><br>A proposed control costs <b>$${g.ctrlCost.toLocaleString()}</b> per year and would cut the loss to ${g.newEf}% of value.</div><label class="fl">SLE, single loss expectancy ($)<input class="${fi("sle", g.sle)}" data-k="sle" inputmode="numeric" placeholder="AV × EF" value="${esc(st.sle)}" ${ctx.locked ? "disabled" : ""}></label><label class="fl">ALE, annualized loss expectancy ($)<input class="${fi("ale", g.ale)}" data-k="ale" inputmode="numeric" placeholder="SLE × ARO" value="${esc(st.ale)}" ${ctx.locked ? "disabled" : ""}></label><p class="pbqp strong">Is the control cost-justified?</p><div class="optrow rk">${["Yes", "No"].map(a => `<button class="opt ${st.worth === a ? "sel" : ""} ${ctx.reveal ? (a === (g.worth ? "Yes" : "No") ? "right" : st.worth === a ? "wrong" : "") : ""}" data-w="${a}">${a}</button>`).join("")}</div>`;
    pane(el, item, ctx);
    el.querySelectorAll(".fi").forEach(i => i.oninput = e => { st[e.target.dataset.k] = e.target.value; ctx.onChange(); });
    el.querySelectorAll(".rk .opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.worth = b.dataset.w; el.querySelectorAll(".rk .opt").forEach(x => x.classList.toggle("sel", x.dataset.w === st.worth)); ctx.onChange(); });
  },
  answered: (item, st) => st.worth !== null || !!(st.sle && st.sle.trim()) || !!(st.ale && st.ale.trim()),
  score: (item, st) => riskCheck(st.g, st.sle, st.ale, st.worth),
});
