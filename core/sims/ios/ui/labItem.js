/* Cert Gauntlet — CCNA lab item (sim type "ccna-lab"), Chat 8.
   Copies Cisco's lab item: left pane with Tasks / Guidelines / Topology tabs, right pane with one tabbed terminal per device,
   keyboard shortcuts between terminals, 5–7 minute target, graded on end state with partial credit (labGrader.js).

   state = { log: {DEV: [typed lines]}, answers: {id: text}, t0 }   — JSON, resumable: the live simulator is rebuilt by replaying `log`.
   The PBQ Lab / exam runner draw the title, Reset and Submit; this module renders the body.
   Phone (<768px): one pane at a time (Tasks · Guide · Topo · Terminal) with the IOS symbol key row. iPad/laptop: both panes. */
import { registerSim } from "../../registry.js";
import { esc } from "../../../util.js";
import { injectCss } from "../../ui.js";
import { attachKeyRow, IOS_KEYS } from "../../../ui/keyrow.js";
import { parseIfName } from "../index.js";
import { buildLab, gradeLab, isBlocked, BLOCKED_MSG, safeExec } from "./labGrader.js";

/* ---------- live simulator per state object (never serialized) ---------- */
const LIVE = new WeakMap();
function live(item, st) {
  let L = LIVE.get(st);
  if (L) return L;
  const lab = buildLab(item);
  const scroll = {}; const names = devNames(item);
  for (const n of names) scroll[n] = [];
  for (const n of names) { const s = lab.cli(n); for (const line of st.log?.[n] || []) { const ps = s.prompt(); const r = safeExec(s, line); scroll[n].push({ ps, c: r.echo === false ? "" : line, o: r.out, help: !!r.help }); } }
  lab.topo.converge();
  L = { lab, scroll, dev: names[0], tab: "tasks", view: "tasks", hist: Object.fromEntries(names.map(n => [n, (st.log?.[n] || []).length])) };
  LIVE.set(st, L);
  return L;
}
const devNames = item => Object.entries(item.topology.devices).filter(([, d]) => !d.host || d.console).map(([n]) => n);
const fmtClock = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const short = n => parseIfName(n)?.short || n;

/* ---------- topology SVG ---------- */
const ICON = { router: { w: 64, h: 40, rx: 20 }, switch: { w: 76, h: 32, rx: 4 }, l3switch: { w: 76, h: 32, rx: 4 }, host: { w: 54, h: 34, rx: 5 }, pc: { w: 54, h: 34, rx: 5 } };
function topoSvg(item, L) {
  const D = item.topology.devices; const pts = Object.values(D);
  const minX = Math.min(...pts.map(d => d.x ?? 0)) - 60, maxX = Math.max(...pts.map(d => d.x ?? 0)) + 60;
  const minY = Math.min(...pts.map(d => d.y ?? 0)) - 48, maxY = Math.max(...pts.map(d => d.y ?? 0)) + 52;
  const kind = d => d.host ? "host" : (d.type || "router");
  const at = n => [D[n].x ?? 0, D[n].y ?? 0];
  let s = `<svg class="cl-svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Topology">`;
  for (const [a, ia, b, ib] of item.topology.links) {
    const [x1, y1] = at(a), [x2, y2] = at(b);
    s += `<line class="cl-ln" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1; const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;   // unit normal
    const lab = (x, y, xo, yo, t) => { if (!t) return ""; const f = Math.min(0.45, 54 / len); const lx = x + (xo - x) * f + nx * 8, ly = y + (yo - y) * f + ny * 8; return `<text class="cl-pl" x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle">${esc(short(parseIfName(t)?.name || t))}</text>`; };
    s += lab(x1, y1, x2, y2, D[a].host ? "" : ia) + lab(x2, y2, x1, y1, D[b].host ? "" : ib);
  }
  for (const [n, d] of Object.entries(D)) {
    const k = kind(d), ic = ICON[k] || ICON.router; const [x, y] = at(n); const click = !d.host || d.console;
    const sub = d.host ? (d.ip || (d.dhcp ? "DHCP" : "")) : (d.type === "l3switch" ? "L3" : "");
    s += `<g class="cl-dev ${k} ${click ? "clk" : ""} ${L.dev === n ? "on" : ""}" data-dev="${esc(n)}" tabindex="${click ? 0 : -1}" role="${click ? "button" : "img"}" aria-label="${esc(n)}"><rect x="${x - ic.w / 2}" y="${y - ic.h / 2}" width="${ic.w}" height="${ic.h}" rx="${ic.rx}"/>` +
      (k === "router" ? `<path class="cl-ri" d="M${x - 14} ${y} h28 M${x - 14} ${y} l5 -4 M${x - 14} ${y} l5 4 M${x + 14} ${y} l-5 -4 M${x + 14} ${y} l-5 4" />` : "") +
      (k !== "router" && k !== "host" ? `<path class="cl-ri" d="M${x - 24} ${y - 5} h14 l-3 -3 M${x - 10} ${y - 5} l-3 3 M${x + 24} ${y + 5} h-14 l3 -3 M${x + 10} ${y + 5} l3 3"/>` : "") +
      (k === "host" ? `<rect class="cl-scr" x="${x - 14}" y="${y - 10}" width="28" height="16" rx="2"/>` : "") +
      `<text class="cl-dn" x="${x}" y="${y - ic.h / 2 - 7}" text-anchor="middle">${esc(n)}</text>` +
      (sub ? `<text class="cl-ds" x="${x}" y="${y + ic.h / 2 + 12}" text-anchor="middle">${esc(sub)}</text>` : "") + `</g>`;
  }
  return s + `</svg>`;
}

/* ---------- sim ---------- */
registerSim("ccna-lab", {
  label: "IOS lab", color: "#FF8093",
  create(item) { return { log: {}, answers: {}, t0: Date.now() }; },
  render(el, item, st, ctx) {
    const L = live(item, st); const names = devNames(item);
    el.innerHTML = "";
    const root = document.createElement("div"); root.className = "cl" + (ctx.reveal ? " reveal" : ""); root.dataset.view = L.view; el.appendChild(root);
    const result = ctx.reveal ? gradeLab(item, L.lab, st.answers) : null;
    const target = item.timeTargetMin || 6;
    root.innerHTML =
      `<div class="cl-bar"><span class="cl-timer" aria-live="off">00:00</span><span class="cl-target">target ${target} min <small>(exam labs: 5–7)</small></span><span class="sp"></span>` +
      `<span class="cl-kb">Tab complete · ? help · Ctrl+Z end · Ctrl+L clear · Alt+1…${names.length} terminal</span></div>` +
      `<div class="cl-seg" role="tablist"><button type="button" data-v="tasks" role="tab">Tasks</button><button type="button" data-v="guide" role="tab">Guidelines</button><button type="button" data-v="topo" role="tab">Topology</button><button type="button" data-v="term" role="tab">Terminal</button></div>` +
      `<div class="cl-body"><div class="cl-left"><div class="cl-tabs" role="tablist"><button type="button" data-t="tasks" role="tab">Tasks</button><button type="button" data-t="guide" role="tab">Guidelines</button><button type="button" data-t="topo" role="tab">Topology</button></div><div class="cl-pane"></div></div>` +
      `<div class="cl-right"><div class="cl-dtabs" role="tablist"></div><div class="cl-term"><pre class="cl-out" tabindex="0"></pre><form class="cl-in" autocomplete="off"><span class="cl-ps"></span><input type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="send" aria-label="IOS command" ${ctx.locked ? "disabled" : ""}><button type="button" class="cl-up" title="Previous command" aria-label="Previous command">↑</button><button type="submit" ${ctx.locked ? "disabled" : ""}>Enter</button></form></div></div></div>`;
    const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
    const pane = $(".cl-pane"), out = $(".cl-out"), inp = $("input"), ps = $(".cl-ps");

    /* ---- timer ---- */
    const timer = $(".cl-timer");
    const tick = () => { const s = Math.floor((Date.now() - (st.t0 || Date.now())) / 1000); timer.textContent = fmtClock(s); timer.className = "cl-timer" + (s >= target * 60 + 120 ? " late" : s >= target * 60 ? " warn" : ""); };
    tick(); if (el._clTimer) clearInterval(el._clTimer); if (!ctx.reveal) el._clTimer = setInterval(() => { if (!root.isConnected) { clearInterval(el._clTimer); return; } tick(); }, 1000);
    else timer.textContent = fmtClock(Math.floor(((st.tEnd || Date.now()) - (st.t0 || Date.now())) / 1000));

    /* ---- left pane ---- */
    const setView = v => { L.view = v; root.dataset.view = v; $$(".cl-seg button").forEach(b => b.classList.toggle("on", b.dataset.v === v)); if (v !== "term") { L.tab = v; drawLeft(); } };
    const drawLeft = () => {
      $$(".cl-tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === L.tab));
      if (L.tab === "tasks") {
        let h = "";
        if (result) h += `<div class="cl-res"><div class="cl-res-h">Score <b>${Math.round(result.f * 100)}%</b> · ${result.earned}/${result.max} points${result.penalty ? ` − ${result.penalty} guideline penalty` : ""}</div></div>`;
        h += `<ol class="cl-tasks">` + item.tasks.map((t, i) => {
          const tr = result?.tasks.find(x => x.id === t.id);
          return `<li class="${tr ? (tr.earned === tr.max ? "ok" : tr.earned ? "part" : "bad") : ""}"><div class="cl-tt">${esc(t.text)}</div>` +
            (tr ? `<div class="cl-tc">${tr.earned}/${tr.max}${tr.checks.filter(c => !c.pass).map(c => `<div class="cl-cd">✗ ${esc(c.detail)}</div>`).join("")}</div>` : "") + `</li>`;
        }).join("") + `</ol>`;
        if (item.answers?.length) h += `<div class="cl-ans"><div class="cl-ans-h">Answers</div>` + item.answers.map(a => { const ck = item.checks.find(k => k.type === "answer" && k.answer === a.id); const r = ck && result?.checks.find(c => c.id === ck.id); return `<label class="cl-a ${r ? (r.pass ? "ok" : "bad") : ""}"><span>${esc(a.prompt)}</span><input type="text" data-a="${esc(a.id)}" value="${esc(st.answers?.[a.id] || "")}" autocapitalize="off" autocorrect="off" spellcheck="false" data-keyrow="off" ${ctx.locked ? "disabled" : ""}>${r && !r.pass ? `<small>key: ${esc(a.accept[0])}</small>` : ""}</label>`; }).join("") + `</div>`;
        if (result && item.why) h += `<p class="cl-why">${esc(item.why)}</p>`;
        pane.innerHTML = h;
        pane.querySelectorAll("input[data-a]").forEach(i => i.oninput = () => { st.answers ||= {}; st.answers[i.dataset.a] = i.value; ctx.onChange(); });
      } else if (L.tab === "guide") {
        pane.innerHTML = `<p class="cl-gl">Do not change anything the guidelines list. Breaking one costs points.</p><ul class="cl-guide">` + item.guidelines.map((g, i) => { const gr = result?.guidelines.filter(x => x.idx === i); const bad = gr?.some(x => !x.pass); return `<li class="${gr?.length ? (bad ? "bad" : "ok") : ""}">${esc(g)}${bad ? gr.filter(x => !x.pass).map(x => `<div class="cl-cd">✗ ${esc(x.detail)}</div>`).join("") : ""}</li>`; }).join("") + `</ul>`;
      } else {
        pane.innerHTML = `<div class="cl-topo">${topoSvg(item, L)}</div><p class="cl-gl">Tap a device to open its terminal.</p>`;
        pane.querySelectorAll(".cl-dev.clk").forEach(g => { const go = () => { setDev(g.dataset.dev); if (root.dataset.view !== "term") setView("term"); inp.focus({ preventScroll: true }); }; g.onclick = go; g.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } }; });
      }
    };
    $$(".cl-tabs button").forEach(b => b.onclick = () => { L.tab = b.dataset.t; drawLeft(); });
    $$(".cl-seg button").forEach(b => b.onclick = () => setView(b.dataset.v));

    /* ---- terminals ---- */
    const sess = () => L.lab.cli(L.dev);
    const line = e => `<span class="c">${esc(e.ps)}${esc(e.c)}</span>\n${e.o ? `<span class="${e.help ? "h" : ""}">${esc(e.o)}</span>\n` : ""}`;
    const drawTabs = () => { $(".cl-dtabs").innerHTML = names.map((n, i) => `<button type="button" role="tab" class="cl-dtab ${n === L.dev ? "on" : ""}" data-dev="${esc(n)}"><span class="cl-dk">${i + 1}</span>${esc(n)}</button>`).join(""); $$(".cl-dtab").forEach(b => b.onclick = () => { setDev(b.dataset.dev); inp.focus({ preventScroll: true }); }); };
    const drawTerm = () => { const sc = L.scroll[L.dev]; out.innerHTML = (sc.length ? "" : `<span class="m">${esc(L.dev)} con0 is now available\n\nPress RETURN to get started.\n\n</span>`) + sc.map(line).join(""); out.scrollTop = out.scrollHeight; ps.textContent = sess().prompt(); inp.type = sess().pending && sess().pending.echo === false ? "password" : "text"; };
    const setDev = n => { L.dev = n; L.hist[n] = (st.log[n] || []).length; drawTabs(); drawTerm(); if (L.tab === "topo") drawLeft(); };
    const append = e => { L.scroll[L.dev].push(e); out.insertAdjacentHTML("beforeend", line(e)); out.scrollTop = out.scrollHeight; ps.textContent = sess().prompt(); inp.type = sess().pending && sess().pending.echo === false ? "password" : "text"; };
    const run = text => {
      const s = sess(); const psNow = s.prompt();
      if (!s.pending && isBlocked(item, text)) { append({ ps: psNow, c: text, o: BLOCKED_MSG }); return; }
      const r = safeExec(s, text); (st.log[L.dev] ||= []).push(text); L.hist[L.dev] = st.log[L.dev].length;
      append({ ps: psNow, c: r.echo === false ? "" : text, o: r.out, help: !!r.help }); ctx.onChange();
      L.lab.topo.dirty && L.lab.topo.dirty();
    };
    $("form").onsubmit = ev => { ev.preventDefault(); if (ctx.locked) return; const v = inp.value; inp.value = ""; if (!v.trim() && !sess().pending) { append({ ps: sess().prompt(), c: "", o: "" }); return; } run(v); inp.focus({ preventScroll: true }); };
    const histUp = () => { const h = st.log[L.dev] || []; if (L.hist[L.dev] > 0) { L.hist[L.dev]--; inp.value = h[L.hist[L.dev]]; } };
    $(".cl-up").onclick = () => { histUp(); inp.focus({ preventScroll: true }); };
    inp.onkeydown = ev => {
      if (ctx.locked) return;
      const h = st.log[L.dev] || [];
      if (ev.key === "ArrowUp") { ev.preventDefault(); histUp(); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); if (L.hist[L.dev] < h.length - 1) { L.hist[L.dev]++; inp.value = h[L.hist[L.dev]]; } else { L.hist[L.dev] = h.length; inp.value = ""; } }
      else if (ev.key === "Tab") { ev.preventDefault(); if (!sess().pending) inp.value = sess().complete(inp.value); }
      else if (ev.key === "?" && !sess().pending) { ev.preventDefault(); const s = sess(); const q = inp.value + "?"; const psNow = s.prompt(); if (isBlocked(item, inp.value + " x")) { append({ ps: psNow, c: q, o: BLOCKED_MSG }); return; } const r = safeExec(s, q); append({ ps: psNow, c: q, o: r.out, help: true }); }
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "l") { ev.preventDefault(); L.scroll[L.dev] = []; out.innerHTML = ""; }
      else if (ev.ctrlKey && ev.key.toLowerCase() === "z") { ev.preventDefault(); if (sess().mode.startsWith("config")) { inp.value = ""; run("end"); } }
      else if (ev.ctrlKey && ev.key.toLowerCase() === "c" && sess().pending) { ev.preventDefault(); sess().pending = null; append({ ps: ps.textContent, c: "^C", o: "" }); }
      else if ((ev.altKey || ev.ctrlKey) && /^[1-9]$/.test(ev.key) && names[+ev.key - 1]) { ev.preventDefault(); setDev(names[+ev.key - 1]); }
    };
    root.onkeydown = ev => { if ((ev.altKey || ev.ctrlKey) && /^[1-9]$/.test(ev.key) && names[+ev.key - 1] && ev.target !== inp) { ev.preventDefault(); setDev(names[+ev.key - 1]); inp.focus({ preventScroll: true }); } };
    out.onclick = () => { if (!ctx.locked && !window.getSelection()?.toString()) inp.focus({ preventScroll: true }); };

    setView(ctx.reveal ? "tasks" : L.view); drawTabs(); drawTerm();
    if (ctx.reveal) { L.tab = "tasks"; drawLeft(); st.tEnd ||= Date.now(); }
    if (!ctx.locked && typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(pointer:fine)").matches) { if (el._kr) el._kr(); el._kr = attachKeyRow(root, IOS_KEYS); }
  },
  answered: (item, st) => Object.values(st.log || {}).some(l => l.length > 0) || Object.values(st.answers || {}).some(v => v && v.trim()),
  score(item, st) {
    const L = live(item, st); try { L.lab.topo.converge(); } catch { /* graded below; checks catch their own errors */ }
    const r = gradeLab(item, L.lab, st.answers || {});
    const notes = r.tasks.map((t, i) => `Task ${i + 1}: ${t.earned}/${t.max}${t.earned === t.max ? " ✓" : " — " + t.checks.filter(c => !c.pass).map(c => c.detail).join("; ")}`);
    r.guidelines.filter(g => !g.pass).forEach(g => notes.push(`Guideline broken (−${g.points}): ${g.text} — ${g.detail}`));
    return { f: r.f, notes, why: item.why || "" };
  },
});

injectCss("cg-sim-ccna-lab", `
.cl{display:flex;flex-direction:column;gap:8px;min-height:60vh}
.cl-bar{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);font-weight:600;padding:0 2px}
.cl-bar .sp{flex:1}
.cl-timer{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;font-weight:800;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:3px 8px}
.cl-timer.warn{color:var(--amber);border-color:var(--amber)}.cl-timer.late{color:var(--red);border-color:var(--red)}
.cl-target small{color:var(--dim);font-weight:600}
.cl-kb{display:none;color:var(--dim)}
.cl-seg{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:3px;gap:3px}
.cl-seg button{flex:1;border:none;background:none;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;border-radius:8px}
.cl-seg button.on{background:var(--panel-2);color:var(--ink)}
.cl-body{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0}
.cl-left,.cl-right{display:none;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;min-height:0}
.cl[data-view="tasks"] .cl-left,.cl[data-view="guide"] .cl-left,.cl[data-view="topo"] .cl-left{display:flex}
.cl[data-view="term"] .cl-right{display:flex}
.cl-tabs{display:none;border-bottom:1px solid var(--line)}
.cl-tabs button{flex:1;border:none;background:none;color:var(--muted);font-weight:700;font-size:13px;padding:10px 6px;position:relative}
.cl-tabs button.on{color:var(--ink)}.cl-tabs button.on::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--teal)}
.cl-pane{padding:12px 14px;overflow:auto;flex:1;font-size:14px;line-height:1.5;-webkit-overflow-scrolling:touch}
.cl-tasks{margin:0;padding-left:22px}.cl-tasks li{margin:0 0 10px;padding-left:2px}
.cl-tasks li.ok>.cl-tt{color:var(--green)}.cl-tasks li.part>.cl-tt{color:var(--amber)}.cl-tasks li.bad>.cl-tt{color:var(--red)}
.cl-tc{font-size:12.5px;color:var(--muted);margin-top:2px}.cl-cd{color:var(--red);font-size:12.5px;margin-top:2px}
.cl-guide{margin:0;padding-left:20px}.cl-guide li{margin:0 0 8px}.cl-guide li.ok{color:var(--green)}.cl-guide li.bad{color:var(--red)}
.cl-gl{color:var(--muted);font-size:12.5px;margin:0 0 10px}
.cl-res{background:var(--panel-2);border-radius:10px;padding:10px 12px;margin-bottom:12px}.cl-res-h b{color:var(--teal);font-size:18px}
.cl-why{color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:10px;margin-top:6px}
.cl-ans{border-top:1px solid var(--line);padding-top:10px;margin-top:6px}.cl-ans-h{font-weight:800;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
.cl-a{display:block;margin-bottom:10px}.cl-a span{display:block;font-size:13.5px;margin-bottom:4px}
.cl-a input{width:100%;background:var(--bg);border:1px solid var(--line-2);border-radius:8px;color:var(--ink);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;padding:8px 10px}
.cl-a.ok input{border-color:var(--green)}.cl-a.bad input{border-color:var(--red)}.cl-a small{color:var(--muted);font-size:12px}
.cl-topo{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:6px;margin-bottom:8px}
.cl-svg{width:100%;height:auto;display:block}
.cl-ln{stroke:var(--line-2);stroke-width:2}
.cl-pl{fill:var(--muted);font-size:9.5px;font-family:ui-monospace,Menlo,Consolas,monospace;paint-order:stroke;stroke:var(--bg);stroke-width:3px}
.cl-scr{fill:none;stroke:var(--dim);stroke-width:1.2}
.cl-dev rect{fill:var(--panel-2);stroke:var(--line-2);stroke-width:1.5}
.cl-dev.router rect{stroke:var(--blue)}.cl-dev.switch rect,.cl-dev.l3switch rect{stroke:var(--teal)}.cl-dev.host rect{stroke:var(--dim)}
.cl-dev .cl-ri{stroke:var(--ink);stroke-width:1.6;fill:none;stroke-linecap:round}
.cl-dev.clk{cursor:pointer}.cl-dev.clk:hover rect,.cl-dev.clk:focus rect{fill:#22334A}
.cl-dev.on rect{stroke-width:3}
.cl-dn{fill:var(--ink);font-size:12.5px;font-weight:700}.cl-ds{fill:var(--muted);font-size:9.5px;font-family:ui-monospace,Menlo,Consolas,monospace}
.cl-dtabs{display:flex;overflow-x:auto;background:var(--panel);border-bottom:1px solid var(--line);-webkit-overflow-scrolling:touch}
.cl-dtab{flex:1 0 auto;min-width:88px;border:none;background:none;color:var(--muted);font-size:13px;font-weight:800;padding:10px 12px;border-right:1px solid var(--line);position:relative;display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,Menlo,Consolas,monospace}
.cl-dtab .cl-dk{font-size:10px;color:var(--dim);border:1px solid var(--line-2);border-radius:4px;padding:0 4px;font-weight:700}
.cl-dtab.on{color:var(--ink);background:#0A1017}.cl-dtab.on::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--teal)}
.cl-term{display:flex;flex-direction:column;background:#0A1017;flex:1;min-height:0}
.cl-out{margin:0;padding:10px 12px;height:46vh;min-height:220px;overflow:auto;font-size:12.5px;line-height:1.42;color:#C9D6E6;white-space:pre;font-family:ui-monospace,Menlo,Consolas,monospace;user-select:text;-webkit-user-select:text;-webkit-overflow-scrolling:touch;flex:1}
.cl-out .c{color:#9EF0E4}.cl-out .m{color:var(--muted)}.cl-out .h{color:#D9E4F2}
.cl-in{display:flex;align-items:center;gap:6px;border-top:1px solid var(--line);padding:6px 8px 6px 12px;background:#0D1620}
.cl-ps{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#9EF0E4;white-space:nowrap;flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis}
.cl-in input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;padding:6px 0}
.cl-in button{border:1px solid var(--line-2);border-radius:8px;background:var(--panel-2);color:var(--ink);font-size:12px;font-weight:800;padding:7px 11px;flex:none}
.cl-in button:disabled,.cl-in input:disabled{opacity:.5}
.cl.reveal .cl-term{opacity:.85}
@media(min-width:768px){
  .cl{min-height:0}.cl-seg,.cl-up{display:none}.cl-kb{display:inline}
  .cl-body{flex:none;flex-direction:row;align-items:stretch;height:calc(100vh - 230px);min-height:480px}
  .cl-left{display:flex;flex:0 0 34%;max-width:420px}.cl-right{display:flex;flex:1}
  .cl-tabs{display:flex}
  .cl-out{height:auto;font-size:13px}
}
@media(min-width:1024px){.cl-body{height:calc(100vh - 210px)}}
/* iPad portrait: a 34% left pane is too narrow for the topology, so stack the panes — both stay on screen, like the exam's split */
@media(min-width:768px) and (max-width:1023px) and (orientation:portrait){
  .cl-body{flex-direction:column;height:calc(100vh - 200px)}
  .cl-left{flex:0 0 40%;max-width:none}.cl-right{flex:1;min-height:0}
  .cl-topo .cl-svg{max-height:calc(40vh - 120px)}
}
`);
