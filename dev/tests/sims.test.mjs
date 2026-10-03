/* Scripted grader tests for the Chat 2 simulation components. Run: node dev/tests/sims.test.mjs
   DOM-free: the sims' create()/score() and the console interpreter are exercised directly, exactly as the exam runner would.
   Also validates every console / fweditor / logview / drag-drop item in the Sec+ PBQ Lab against its schema and proves each
   one is solvable (a scripted "perfect" answer scores 1.0) and discriminating (a wrong answer does not). */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const { sim } = await import(pathToFileURL(path.join(root, "core/sims/registry.js")));
await import(pathToFileURL(path.join(root, "core/sims/basic.js")));
const { exec, covers, checks } = await import(pathToFileURL(path.join(root, "core/sims/console.js")));
const { evalPacket, scoreTable, inNet, portMatch } = await import(pathToFileURL(path.join(root, "core/sims/fweditor.js")));
const { scoreLog } = await import(pathToFileURL(path.join(root, "core/sims/logview.js")));
const { classOf } = await import(pathToFileURL(path.join(root, "core/sims/basic.js")));
const { LAB_CONSOLE } = await import(pathToFileURL(path.join(root, "packs/secplus/lab/console.js")));
const { LAB_FWEDITOR } = await import(pathToFileURL(path.join(root, "packs/secplus/lab/fweditor.js")));
const { LAB_LOGVIEW } = await import(pathToFileURL(path.join(root, "packs/secplus/lab/logview.js")));
const { LAB_DRAGDROP } = await import(pathToFileURL(path.join(root, "packs/secplus/lab/dragdrop.js")));
const { LAB_PBQS } = await import(pathToFileURL(path.join(root, "packs/secplus/lab.js")));

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✓", name); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const OBJ = /^[1-9]\.[1-9][0-9]?$/;
const IP = /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/;

/* ================= incident console ================= */
console.log("console");
const C = sim("console");
const webItem = LAB_CONSOLE.find(x => x.id === "c-web-c2"), minerItem = LAB_CONSOLE.find(x => x.id === "c-db-miner");
const run = (item, st, host, cmds) => cmds.map(c => exec(item, st, host, c));

ok("fresh state: nothing done, score 0, not answered", () => {
  const st = C.create(webItem); assert.equal(C.answered(webItem, st), false);
  const r = C.score(webItem, st); assert.equal(r.f, 0); assert.ok(r.notes.length >= 5);
});
ok("recon commands show the IoCs and change nothing", () => {
  const st = C.create(webItem);
  const [ss, ps, tl, ns] = [...run(webItem, st, "web01", ["ss -tulpn", "ps aux"]), ...run(webItem, st, "ws-fin07", ["tasklist", "netstat -ano"])];
  assert.match(ss, /0\.0\.0\.0:4444.*kworkerd/); assert.match(ss, /:443.*nginx/);
  assert.match(ps, /\/tmp\/\.cache\/kworkerd -c 198\.51\.100\.23:4444/);
  assert.match(tl, /svchost32\.exe\s+5124/); assert.match(ns, /203\.0\.113\.77:8443\s+ESTABLISHED\s+5124/);
  assert.equal(C.score(webItem, st).f, 0); assert.equal(C.answered(webItem, st), true);
});
ok("ss with -l shows listeners only; without it shows connections only; -a shows both", () => {
  const st = C.create(webItem);
  const l = exec(webItem, st, "web01", "ss -tlnp"), c = exec(webItem, st, "web01", "ss -tnp"), a = exec(webItem, st, "web01", "ss -tanp");
  assert.ok(l.includes("LISTEN") && !l.includes("ESTAB")); assert.ok(c.includes("ESTAB") && !c.includes("LISTEN")); assert.ok(a.includes("LISTEN") && a.includes("ESTAB"));
});
ok("logs are readable with cat / tail / grep / type / findstr", () => {
  const st = C.create(webItem);
  assert.match(exec(webItem, st, "web01", "tail -n 3 /var/log/syslog"), /CRON/);
  assert.match(exec(webItem, st, "web01", "grep -i started /var/log/auth.log"), /Started kworkerd/);
  assert.match(exec(webItem, st, "web01", "cat /etc/cron.d/kworkerd"), /\*\/5/);
  assert.match(exec(webItem, st, "ws-fin07", "type C:\\Temp\\update.log"), /sc create WinUpdSync/);
  assert.match(exec(webItem, st, "ws-fin07", "findstr beacon C:\\Temp\\update.log"), /203\.0\.113\.77/);
  assert.match(exec(webItem, st, "web01", "cat /nope"), /No such file/);
});
ok("the systemctl path: stop + disable + ufw/netsh blocks → 100%", () => {
  const st = C.create(webItem);
  run(webItem, st, "web01", ["sudo systemctl stop kworkerd", "sudo systemctl disable kworkerd", "sudo ufw deny out to 198.51.100.23"]);
  run(webItem, st, "ws-fin07", ["sc stop WinUpdSync", "sc config WinUpdSync start= disabled", 'netsh advfirewall firewall add rule name="Block C2" dir=out action=block remoteip=203.0.113.77']);
  const r = C.score(webItem, st); assert.equal(r.f, 1, r.notes.join("\n"));
  assert.match(exec(webItem, st, "web01", "systemctl status kworkerd"), /inactive \(dead\)/);
  assert.match(exec(webItem, st, "web01", "ufw status"), /DENY OUT/);
  assert.match(exec(webItem, st, "ws-fin07", "netsh advfirewall firewall show rule name=all"), /Block C2/);
});
ok("a different command path reaches the same state: kill + disable --now, iptables, taskkill + Set-Service + PowerShell rule", () => {
  const st = C.create(webItem);
  run(webItem, st, "web01", ["kill -9 2231", "systemctl disable --now kworkerd", "iptables -A OUTPUT -d 198.51.100.23 -j DROP"]);
  run(webItem, st, "ws-fin07", ["taskkill /PID 5124 /F", "Set-Service WinUpdSync -StartupType Disabled", "New-NetFirewallRule -DisplayName BlockC2 -Direction Outbound -RemoteAddress 203.0.113.77 -Action Block"]);
  assert.equal(C.score(webItem, st).f, 1);
});
ok("partial credit: stopped but not disabled, one IP unblocked", () => {
  const st = C.create(webItem);
  run(webItem, st, "web01", ["systemctl stop kworkerd", "ufw deny from 198.51.100.23"]);
  run(webItem, st, "ws-fin07", ["net stop WinUpdSync"]);
  const r = C.score(webItem, st);
  // positive points: 2×(stop .5 + disable .5) + 2 blocks = 4; got .5 + .5 + 1 = 2
  assert.ok(near(r.f, 2 / 4), "f=" + r.f); assert.ok(r.notes.some(x => /disable kworkerd/.test(x))); assert.ok(r.notes.some(x => /block 203\.0\.113\.77/.test(x)));
});
ok("collateral damage: stopping nginx costs a point; stopping node_exporter costs half a point", () => {
  const st = C.create(webItem);
  run(webItem, st, "web01", ["systemctl disable --now kworkerd", "ufw deny out to 198.51.100.23", "systemctl stop nginx", "systemctl stop node_exporter"]);
  run(webItem, st, "ws-fin07", ["sc stop WinUpdSync", "sc config WinUpdSync start= disabled", 'netsh advfirewall firewall add rule name=x dir=in action=block remoteip=203.0.113.77']);
  const r = C.score(webItem, st); assert.ok(near(r.f, (4 - 1 - 0.5) / 4), "f=" + r.f);
  assert.ok(r.notes.some(x => /nginx running was required/.test(x))); assert.ok(r.notes.some(x => /Collateral damage: web01: node_exporter/.test(x)));
  exec(webItem, st, "web01", "systemctl start nginx"); exec(webItem, st, "web01", "systemctl start node_exporter");
  assert.equal(C.score(webItem, st).f, 1, "undoing the mistake restores full credit (end state only)");
});
ok("blocking the whole internet is not a targeted block; a /24 or /32 is", () => {
  assert.equal(covers("0.0.0.0/0", "198.51.100.23"), false); assert.equal(covers("198.51.0.0/16", "198.51.100.23"), false);
  assert.equal(covers("198.51.100.0/24", "198.51.100.23"), true); assert.equal(covers("198.51.100.23/32", "198.51.100.23"), true); assert.equal(covers("198.51.100.24", "198.51.100.23"), false);
});
ok("unknown and malformed commands fail safely and never mutate state", () => {
  const st = C.create(webItem);
  const outs = run(webItem, st, "web01", ["rm -rf /", "systemctl stop", "systemctl stop nosuch", "iptables -A INPUT -j DROP", "ufw deny", "kill 1"]);
  assert.match(outs[0], /command not found/); assert.match(outs[2], /could not be found/); assert.match(outs[3], /needs -s/);
  const w = run(webItem, st, "ws-fin07", ["format c:", "taskkill /PID 5124", "sc stop Nope", 'netsh advfirewall firewall add rule name=x dir=out action=block']);
  assert.match(w[0], /not recognized/); assert.match(w[1], /forcefully/); assert.match(w[2], /does not exist/); assert.match(w[3], /remoteip/);
  assert.equal(C.score(webItem, st).f, 0);
});
ok("Reset = create() again gives a clean host set", () => {
  const st = C.create(webItem); run(webItem, st, "web01", ["systemctl stop nginx"]);
  const st2 = C.create(webItem); assert.equal(st2.hosts.web01.hist.length, 0); assert.equal(st2.hosts.web01.svc.nginx.run, true);
});
ok("miner item: the IoC address must be blocked on BOTH hosts that talk to it", () => {
  const st = C.create(minerItem);
  run(minerItem, st, "db01", ["systemctl stop sysupdated", "iptables -A OUTPUT -d 203.0.113.140 -j DROP"]);
  run(minerItem, st, "app02", ["Stop-Service WinDefendUpdater"]);
  let r = C.score(minerItem, st); const blockCheck = checks(minerItem, st).find(c => c.kind === "block"); assert.equal(blockCheck.ok, false);
  exec(minerItem, st, "app02", "netsh advfirewall firewall add rule name=pool dir=out action=block remoteip=203.0.113.140");
  r = C.score(minerItem, st); assert.equal(r.f, 1, r.notes.join("\n"));
});
ok("state round-trips through JSON (resumable on another device)", () => {
  const st = C.create(minerItem); run(minerItem, st, "db01", ["systemctl stop sysupdated", "ufw deny out to 203.0.113.140"]);
  const st2 = JSON.parse(JSON.stringify(st)); assert.deepEqual(C.score(minerItem, st2), C.score(minerItem, st));
});

/* ================= firewall rule editor ================= */
console.log("fweditor");
const F = sim("fweditor");
const dmz = LAB_FWEDITOR.find(x => x.id === "f-dmz-web"), vpn = LAB_FWEDITOR.find(x => x.id === "f-vpn-jump");
ok("matchers: CIDR, exact host, any; ports single / range / list; proto", () => {
  assert.equal(inNet("10.0.10.25", "10.0.10.0/24"), true); assert.equal(inNet("10.0.11.25", "10.0.10.0/24"), false); assert.equal(inNet("10.0.20.15", "10.0.20.15"), true); assert.equal(inNet("1.2.3.4", "any"), true);
  assert.equal(portMatch("443", 443), true); assert.equal(portMatch("1024-65535", 2048), true); assert.equal(portMatch("1024-65535", 80), false); assert.equal(portMatch("80,443", 443), true); assert.equal(portMatch("any", 1), true);
});
ok("first match wins; nothing matching falls to the implicit deny", () => {
  const rules = [{ act: "deny", src: "203.0.113.0/24", dst: "any", port: "any", proto: "any" }, { act: "allow", src: "any", dst: "10.0.50.10", port: "443", proto: "tcp" }];
  assert.deepEqual(evalPacket(rules, { src: "203.0.113.9", dst: "10.0.50.10", port: 443, proto: "tcp" }), { act: "deny", idx: 0 });
  assert.deepEqual(evalPacket(rules, { src: "198.51.100.7", dst: "10.0.50.10", port: 443, proto: "tcp" }), { act: "allow", idx: 1 });
  assert.deepEqual(evalPacket(rules, { src: "198.51.100.7", dst: "10.0.50.10", port: 22, proto: "tcp" }), { act: "deny", idx: -1 });
});
ok("starting table is wrong on purpose and scores below 1; untouched = not answered", () => {
  const st = F.create(dmz); assert.equal(F.answered(dmz, st), false); const r = F.score(dmz, st); assert.ok(r.f < 1 && r.f > 0, "f=" + r.f);
  assert.ok(r.notes.some(x => /203\.0\.113\.9.*should be DENIED but rule 1 ALLOWED/.test(x)), r.notes.join("\n"));
});
const DMZ_GOOD = [
  { act: "deny", src: "203.0.113.0/24", dst: "any", port: "any", proto: "any" },
  { act: "allow", src: "any", dst: "10.0.50.10", port: "80", proto: "tcp" },
  { act: "allow", src: "any", dst: "10.0.50.10", port: "443", proto: "tcp" },
  { act: "allow", src: "10.0.10.0/24", dst: "10.0.50.10", port: "22", proto: "tcp" },
  { act: "allow", src: "10.0.50.10", dst: "10.0.20.15", port: "5432", proto: "tcp" },
];
ok("a correct table scores 100%", () => { const r = scoreTable(dmz, DMZ_GOOD); assert.equal(r.f, 1, r.notes.join("\n")); });
ok("multiple correct tables pass: different order of independent allows, explicit denies added", () => {
  const alt = [DMZ_GOOD[4], DMZ_GOOD[3], DMZ_GOOD[0], DMZ_GOOD[2], DMZ_GOOD[1], { act: "deny", src: "any", dst: "any", port: "any", proto: "any" }];
  assert.equal(scoreTable(dmz, alt).f, 1);
  const alt2 = [DMZ_GOOD[0], ...DMZ_GOOD.slice(1), { act: "deny", src: "10.0.50.0/24", dst: "10.0.20.0/24", port: "any", proto: "any" }];
  assert.equal(scoreTable(dmz, alt2).f, 1);
});
ok("order mistake is caught: known-bad deny below the public allow", () => {
  const bad = [DMZ_GOOD[2], DMZ_GOOD[1], DMZ_GOOD[0], DMZ_GOOD[3], DMZ_GOOD[4]];
  const r = scoreTable(dmz, bad); assert.ok(r.f < 1); assert.ok(r.notes.some(x => /203\.0\.113\.9/.test(x)));
});
ok("over-permissive rule is caught: web → Server VLAN any", () => {
  const bad = DMZ_GOOD.slice(0, 4).concat([{ act: "allow", src: "10.0.50.10", dst: "10.0.20.0/24", port: "any", proto: "any" }]);
  const r = scoreTable(dmz, bad); assert.ok(near(r.f, 10 / 12), "f=" + r.f);
});
ok("editor state ops: add / edit / delete / reorder as the UI performs them", () => {
  const st = F.create(vpn); assert.equal(st.rules.length, 1);
  st.rules.splice(0, 1);                                                                                           // delete the permissive rule
  st.rules.push({ act: "allow", src: "10.0.99.0/24", dst: "10.0.20.5", port: "3389", proto: "tcp" });
  st.rules.push({ act: "deny", src: "10.0.99.50", dst: "any", port: "any", proto: "any" });
  st.rules.push({ act: "allow", src: "10.0.20.5", dst: "10.0.20.0/24", port: "22", proto: "tcp" });
  st.rules.push({ act: "allow", src: "10.0.20.5", dst: "10.0.20.0/24", port: "3389", proto: "tcp" });
  st.rules.push({ act: "allow", src: "10.0.10.0/24", dst: "10.0.20.0/24", port: "443", proto: "tcp" });
  st.rules.push({ act: "allow", src: "10.0.10.0/24", dst: "10.0.20.53", port: "53", proto: "udp" });
  st.touched = true;
  let r = F.score(vpn, st); assert.ok(r.f < 1 && r.notes.some(x => /10\.0\.99\.50.*rule 1 ALLOWED/.test(x)), "contractor deny is below the pool allow: " + r.notes.join("\n"));
  const [d] = st.rules.splice(1, 1); st.rules.splice(0, 0, d);                                                     // reorder (drag deny to the top)
  r = F.score(vpn, st); assert.equal(r.f, 1, r.notes.join("\n"));
  assert.ok(st.rules.length <= vpn.maxRules);
});
ok("all fweditor items: schema, choices cover the intended solution, a stated solution exists", () => {
  LAB_FWEDITOR.forEach(it => {
    assert.ok(OBJ.test(it.obj) && it.tasks.length >= 3 && it.packets.length >= 8 && it.nets.length && it.ports.length, it.id);
    it.packets.forEach(p => { assert.ok(IP.test(p.src) && IP.test(p.dst) && ["allow", "deny"].includes(p.want) && ["tcp", "udp", "icmp"].includes(p.proto), it.id + " packet"); });
    it.rules.forEach(r => { assert.ok(it.nets.some(n => n.v === r.src) && it.nets.some(n => n.v === r.dst) && it.ports.includes(String(r.port)), it.id + " starting rule uses an unavailable choice"); });
    assert.ok(it.packets.some(p => p.want === "allow") && it.packets.some(p => p.want === "deny"), it.id + " needs both allow and deny packets");
  });
});

/* ================= log analysis viewer ================= */
console.log("logview");
const L = sim("logview");
const spray = LAB_LOGVIEW.find(x => x.id === "l-vpn-spray");
const perfect = (item) => { const st = L.create(item); item.evidence.forEach(([s, l]) => { st.sel[s + ":" + l] = true; }); st.sub.forEach(x => x.ans = 0); return st; };
ok("fresh state: not answered, score 0", () => { const st = L.create(spray); assert.equal(L.answered(spray, st), false); assert.equal(L.score(spray, st).f, 0); });
ok("perfect answer scores 100% on every logview item", () => { LAB_LOGVIEW.forEach(it => { const r = L.score(it, perfect(it)); assert.equal(r.f, 1, it.id + ": " + r.notes.join("\n")); }); });
ok("per-sub-answer scoring: evidence, attack, account, first response are independent quarters", () => {
  const st = perfect(spray); st.sub[2].ans = 1;                 // wrong FIRST response only
  let r = scoreLog(spray, st); assert.ok(near(r.f, 0.75), "f=" + r.f); assert.ok(r.notes.some(x => /FIRST/.test(x)));
  const st2 = L.create(spray); st2.sub.forEach(x => x.ans = 0);  // questions right, no evidence
  r = scoreLog(spray, st2); assert.ok(near(r.f, 0.75)); assert.ok(r.notes[0].startsWith("Evidence"));
});
ok("evidence: partial recall gives partial credit; noise picks cost half a point each; floor at 0", () => {
  const st = L.create(spray); spray.evidence.slice(0, 6).forEach(([s, l]) => { st.sel[s + ":" + l] = true; });
  assert.ok(near(scoreLog(spray, st).evF, 6 / 11));
  st.sel["0:0"] = true; st.sel["2:0"] = true;                   // two noise lines
  assert.ok(near(scoreLog(spray, st).evF, 5 / 11));
  const st3 = L.create(spray); ["0:0", "0:9", "0:10", "2:0"].forEach(k => st3.sel[k] = true);
  assert.equal(scoreLog(spray, st3).evF, 0);
});
ok("all logview items: schema, evidence indexes in range, exactly 4 options per question, keys present", () => {
  LAB_LOGVIEW.forEach(it => {
    assert.ok(OBJ.test(it.obj) && it.sources.length >= 2 && it.evidence.length >= 3 && it.qs.length >= 3, it.id);
    it.evidence.forEach(([s, l]) => assert.ok(it.sources[s] && it.sources[s].lines[l] !== undefined, it.id + " evidence out of range " + s + ":" + l));
    const seen = new Set(); it.evidence.forEach(e => { const k = e.join(":"); assert.ok(!seen.has(k), it.id + " duplicate evidence " + k); seen.add(k); });
    it.qs.forEach(q => assert.ok(q.k && q.q && q.o.length === 4 && q.x, it.id + " question malformed"));
    assert.ok(it.qs.some(q => q.k === "attack") && it.qs.some(q => q.k === "first") && it.qs.some(q => ["account", "host"].includes(q.k)), it.id + " needs attack / account-or-host / first questions");
  });
});

/* ================= drag-and-drop match / order ================= */
console.log("dragdrop");
const M = sim("match"), O = sim("order");
const logsrc = LAB_DRAGDROP.find(x => x.id === "m-logsrc"), ransom = LAB_DRAGDROP.find(x => x.id === "o-ransom");
ok("match: state shape unchanged (L, R, assign); drop = assign; re-drop moves the chip; drop to pool unassigns", () => {
  const st = M.create(logsrc); assert.ok(Array.isArray(st.L) && Array.isArray(st.R) && st.assign && st.n === logsrc.pairs.length);
  st.assign[0] = 0; st.assign[1] = 1; assert.equal(M.answered(logsrc, st), true); assert.ok(near(M.score(logsrc, st).f, 2 / 7));
  for (const k in st.assign) if (st.assign[k] === 1) delete st.assign[k]; st.assign[2] = 1;      // chip 1 dragged from target 1 to target 2
  assert.equal(st.assign[1], undefined); assert.ok(near(M.score(logsrc, st).f, 1 / 7));
  delete st.assign[2];                                                                             // dragged back to the pool
  assert.ok(near(M.score(logsrc, st).f, 1 / 7));
  logsrc.pairs.forEach((_, i) => st.assign[i] = i); assert.equal(M.score(logsrc, st).f, 1);
});
ok("order: seq empty until the first move; after a move seq is a full permutation; equivalent sequences all score 1", () => {
  const st = O.create(ransom); assert.equal(O.answered(ransom, st), false); assert.equal(st.seq.length, 0);
  st.seq = [0, 1, 2, 3, 4, 5]; st.items = st.seq.slice(); assert.equal(O.score(ransom, st).f, 1);
  st.seq = [1, 0, 2, 3, 4, 5]; assert.equal(O.score(ransom, st).f, 1, "eq [[0,1]] accepts disable-account first");
  st.seq = [2, 0, 1, 3, 4, 5]; const r = O.score(ransom, st); assert.ok(near(r.f, 4 / 6), "f=" + r.f);   // position 2 is in class 0, so step 0 there still counts
  st.seq = [5, 4, 3, 2, 1, 0]; assert.equal(O.score(ransom, st).f, 0);
});
ok("order equivalence spec: classOf merges groups; the existing o-vol and o-chg items still accept both orders", () => {
  assert.deepEqual(classOf({ steps: [1, 2, 3, 4], eq: [[1, 2]] }), [0, 1, 1, 3]);
  const vol = LAB_PBQS.find(x => x.id === "o-vol"); const st = O.create(vol); st.seq = [0, 2, 1, 3, 4, 5]; assert.equal(O.score(vol, st).f, 1);
  const chg = LAB_PBQS.find(x => x.id === "o-chg"); const st2 = O.create(chg); st2.seq = [0, 1, 3, 2, 4, 5]; assert.equal(O.score(chg, st2).f, 1);
});
ok("all drag-drop items: schema and eq indexes in range; prompts no longer say tap", () => {
  LAB_DRAGDROP.forEach(it => { assert.ok(OBJ.test(it.obj), it.id); if (it.type === "match") assert.ok(it.pairs.length >= 4); if (it.type === "order") { assert.ok(it.steps.length >= 3); (it.eq || []).forEach(g => g.forEach(i => assert.ok(i >= 0 && i < it.steps.length))); } });
  LAB_PBQS.filter(x => ["match", "order"].includes(x.type)).forEach(it => assert.ok(!/\btap\b/i.test(it.prompt || ""), it.id + " prompt still says tap"));
});

/* ================= console item schema (all authored items) ================= */
console.log("console items");
ok("all console items: schema, both OS flavors, every IoC is findable, keep services exist, a perfect run scores 1.0", () => {
  LAB_CONSOLE.forEach(it => {
    assert.ok(OBJ.test(it.obj) && it.tasks.length >= 3 && it.hosts.length >= 2 && it.iocs && it.iocs.ips.length, it.id);
    assert.ok(it.hosts.some(h => h.os === "linux") && it.hosts.some(h => h.os === "windows"), it.id + " needs a Linux and a Windows host");
    const ids = new Set(); it.hosts.forEach(h => { assert.ok(!ids.has(h.id) && IP.test(h.ip), it.id + " host " + h.id); ids.add(h.id); const names = new Set(); h.services.forEach(s => { assert.ok(s.name && s.proc && s.pid && !names.has(s.name), it.id + "/" + h.id + " service " + s.name); names.add(s.name); }); });
    const bad = it.hosts.flatMap(h => h.services.filter(s => s.bad)); assert.ok(bad.length >= 1 && bad.every(s => it.iocs.procs.includes(s.proc) || it.iocs.ports.includes(s.port)), it.id + " every bad service must match an IoC");
    assert.ok(it.hosts.some(h => h.services.some(s => s.keep)), it.id + " needs keep:true services");
    it.iocs.ips.forEach(ip => assert.ok(it.hosts.some(h => h.services.some(s => s.remote && s.remote.startsWith(ip + ":")) || (h.conns || []).some(c => c.remote.startsWith(ip + ":"))), it.id + " IoC ip " + ip + " never appears in a connection"));
    const st = C.create(it);
    it.hosts.forEach(h => { it.iocs.ips.forEach(ip => exec(it, st, h.id, h.os === "windows" ? `netsh advfirewall firewall add rule name=b dir=out action=block remoteip=${ip}` : `ufw deny out to ${ip}`)); h.services.filter(s => s.bad).forEach(s => exec(it, st, h.id, h.os === "windows" ? `sc stop ${s.name}` : `systemctl disable --now ${s.name}`)); if (h.os === "windows") h.services.filter(s => s.bad).forEach(s => exec(it, st, h.id, `sc config ${s.name} start= disabled`)); });
    const r = C.score(it, st); assert.equal(r.f, 1, it.id + ": " + r.notes.join("\n"));
  });
});

console.log(`\n${n} sim tests passed`);
