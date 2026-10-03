/* Grader proofs for the Sec+ EXAM console / fweditor PBQs (packs/secplus/pbqs.js). Run: node dev/tests/secplus-exam-pbqs.test.mjs
   For every exam console item: blank = 0; the intended solution, typed through the real command interpreter (exec), = 1;
   a one-mistake run is strictly between; stopping any keep:true service (including the look-alike decoy agents) costs points.
   For every exam fweditor item: untouched table = 0; a correct table = 1; the same table with one deny moved below the allow
   it must override is strictly between; the starting table is wrong in a way that depends on rule order.
   Also re-checks the exam mix rule: every exam has a console and a fweditor PBQ and no two generated sims of the same type. */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
globalThis.window = { addEventListener() { } };
const imp = p => import(pathToFileURL(path.join(root, p)));
const { sim } = await imp("core/sims/registry.js");
for (const f of ["basic", "generators", "diagram", "appanel", "hardening", "logview"]) await imp(`core/sims/${f}.js`);
const { exec, checks } = await imp("core/sims/console.js");
const { scoreTable, baselineOk, evalPacket } = await imp("core/sims/fweditor.js");
const { EXAM_PBQS } = await imp("packs/secplus/pbqs.js");

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✓", name); };
const OBJ = /^[1-9]\.[1-9][0-9]?$/;
const IP = /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/;
const RFC = ip => /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(ip);
const all = Object.entries(EXAM_PBQS).flatMap(([x, list]) => list.map(p => ({ x, p })));
const between = f => f > 0 && f < 1;

/* ================= exam mix ================= */
console.log("exam mix");
ok("every exam has ≥1 console and ≥1 fweditor; generated sims are distinct per exam", () => {
  for (const [x, list] of Object.entries(EXAM_PBQS)) {
    assert.ok(list.some(p => p.type === "console"), x + " console"); assert.ok(list.some(p => p.type === "fweditor"), x + " fweditor");
    const gen = list.filter(p => sim(p.type) && sim(p.type).generated).map(p => p.type); assert.equal(new Set(gen).size, gen.length, x + " duplicate generated type");
    list.forEach(p => assert.ok(p.d && OBJ.test(p.obj) && p.obj.split(".")[0] === String(p.d), p.id + " obj/d"));
  }
});

/* ================= incident console ================= */
console.log("exam console items");
const C = sim("console");
/* intended solutions, written as a candidate would type them; `mistake` = the index of the one command left out for the partial run */
const CON = {
  pa4: { steps: [
    ["sis01", "ss -tulpn"], ["sis01", "ss -tunap"], ["sis01", "cat /etc/systemd/system/dbus-sync.service"],
    ["sis01", "sudo systemctl stop dbus-sync"], ["sis01", "sudo systemctl disable dbus-sync"], ["sis01", "sudo ufw deny out to 198.51.100.61"],
    ["reg-pc04", "netstat -ano"], ["reg-pc04", "tasklist /svc"], ["reg-pc04", "sc qc WinHttpProxySync"],
    ["reg-pc04", "sc stop WinHttpProxySync"], ["reg-pc04", "sc config WinHttpProxySync start= disabled"],
    ["reg-pc04", 'netsh advfirewall firewall add rule name="Block IoC" dir=out action=block remoteip=203.0.113.88'],
  ], mistake: 10, partial: 3.5 / 4 },
  pb4: { steps: [
    ["ctr-node2", "ss -tunap"], ["ctr-node2", "ps aux"], ["ctr-node2", "systemctl stop netsvc-proxy"], ["ctr-node2", "iptables -A OUTPUT -d 192.0.2.150 -j DROP"],
    ["jump01", "netstat -ano"], ["jump01", "type C:\\Temp\\ps-transcript.txt"], ["jump01", "Stop-Service WinNetMon"],
    ["jump01", "New-NetFirewallRule -DisplayName BlockIRC -Direction Outbound -RemoteAddress 203.0.113.200 -Action Block"],
    ["jump01", "New-NetFirewallRule -DisplayName BlockProxyC2 -Direction Outbound -RemoteAddress 192.0.2.150 -Action Block"],
  ], mistake: 8, partial: 3 / 4 },
  pc4: { steps: [
    ["permits01", "ss -tulpn"], ["permits01", "ss -tnp"], ["permits01", "systemctl disable --now rmm-helper"],
    ["permits01", "ufw deny out to 198.51.100.140"], ["permits01", "ufw deny out to 203.0.113.45"],
    ["clerk-ws12", "netstat -ano"], ["clerk-ws12", "sc qc RMMAgentSvc"], ["clerk-ws12", "taskkill /PID 5520 /F"],
    ["clerk-ws12", "Set-Service RMMAgentSvc -StartupType Disabled"],
    ["clerk-ws12", "netsh advfirewall firewall add rule name=BlockRelay dir=out action=block remoteip=198.51.100.140"],
  ], mistake: 4, partial: 3 / 4 },
};
const play = (it, steps) => { const st = C.create(it); const outs = steps.map(([h, c]) => exec(it, st, h, c)); return { st, outs }; };
const consoles = all.filter(({ p }) => p.type === "console").map(({ p }) => p);
ok("every exam console item has a scripted solution", () => { assert.deepEqual(consoles.map(p => p.id).sort(), Object.keys(CON).sort()); });

for (const it of consoles) {
  const sol = CON[it.id];
  ok(`${it.id}: schema — Linux + Windows hosts, RFC addresses, bad services tied to an IoC, IoC IPs on the wire, a decoy keep agent`, () => {
    assert.ok(OBJ.test(it.obj) && it.tasks.length >= 3 && it.iocs && it.iocs.ips.length && it.iocs.ports.length, it.id);
    assert.ok(it.hosts.some(h => h.os === "linux") && it.hosts.some(h => h.os === "windows"));
    const ids = new Set(); it.hosts.forEach(h => { assert.ok(!ids.has(h.id) && IP.test(h.ip) && RFC(h.ip)); ids.add(h.id); const names = new Set(), pids = new Set(); h.services.forEach(s => { assert.ok(s.name && s.proc && s.pid && !names.has(s.name.toLowerCase()) && !pids.has(s.pid), h.id + "/" + s.name); names.add(s.name.toLowerCase()); pids.add(s.pid); if (s.remote) assert.ok(RFC(s.remote.split(":")[0]), s.remote); }); });
    it.iocs.ips.forEach(ip => assert.ok(RFC(ip), ip));
    const bad = it.hosts.flatMap(h => h.services.filter(s => s.bad));
    assert.ok(bad.length >= 2 && bad.every(s => it.iocs.ports.includes(s.port) || it.iocs.procs.includes(s.proc) || (s.remote && it.iocs.ips.includes(s.remote.split(":")[0]))), "every bad service matches an IoC port / proc / IP");
    it.iocs.ips.forEach(ip => assert.ok(it.hosts.some(h => h.services.some(s => s.remote && s.remote.startsWith(ip + ":")) || (h.conns || []).some(c => c.remote.startsWith(ip + ":"))), ip + " never on the wire"));
    const decoys = it.hosts.flatMap(h => h.services.filter(s => s.keep && s.remote && !it.iocs.ips.includes(s.remote.split(":")[0])));
    assert.ok(decoys.length >= 1, "needs a keep:true agent with an outbound session to a legitimate address");
  });
  ok(`${it.id}: blank attempt = 0 and recon alone changes nothing`, () => {
    assert.equal(C.score(it, C.create(it)).f, 0);
    const recon = sol.steps.filter(([, c]) => /^(ss|netstat|ps|tasklist|cat|type|sc qc)/.test(c));
    const { st, outs } = play(it, recon); assert.equal(C.score(it, st).f, 0);
    const seen = outs.join("\n"); it.iocs.ports.forEach(p => assert.ok(seen.includes(":" + p), "recon shows IoC port " + p)); it.iocs.ips.forEach(ip => assert.ok(seen.includes(ip), "recon shows IoC ip " + ip));
  });
  ok(`${it.id}: intended solution through the interpreter = 1`, () => {
    const { st, outs } = play(it, sol.steps); const r = C.score(it, st); assert.equal(r.f, 1, r.notes.join("\n"));
    outs.forEach((o, i) => assert.ok(!/not recognized|command not found|could not be found|does not exist|ERROR|Usage|usage/.test(o), `step ${i} "${sol.steps[i][1]}" failed: ${o}`));
    assert.ok(checks(it, st).every(c => c.ok));
  });
  ok(`${it.id}: one mistake ("${sol.steps[sol.mistake][1]}" left out) is strictly between 0 and 1`, () => {
    const { st } = play(it, sol.steps.filter((_, i) => i !== sol.mistake)); const f = C.score(it, st).f;
    assert.ok(between(f), "f=" + f); assert.ok(Math.abs(f - sol.partial) < 1e-3, "f=" + f + " want " + sol.partial);
  });
  ok(`${it.id}: stopping any keep:true service costs a full point (decoy agents included); other legit services cost half`, () => {
    const max = checks(it, C.create(it)).filter(c => c.kind !== "keep").reduce((a, c) => a + c.w, 0);
    it.hosts.forEach(h => h.services.filter(s => s.keep).forEach(s => {
      const { st } = play(it, [...sol.steps, [h.id, h.os === "windows" ? `sc stop ${s.name}` : `systemctl stop ${s.name}`]]);
      const r = C.score(it, st); assert.ok(Math.abs(r.f - (max - 1) / max) < 1e-3, `${h.id}/${s.name}: f=${r.f}`); assert.ok(r.notes.some(x => /Broke the business/.test(x)));
    }));
    const other = it.hosts.flatMap(h => h.services.filter(s => !s.keep && !s.bad).map(s => [h, s]));
    assert.ok(other.length >= 1, "needs at least one ordinary legitimate service");
    other.forEach(([h, s]) => { const { st } = play(it, [...sol.steps, [h.id, h.os === "windows" ? `net stop ${s.name}` : `systemctl stop ${s.name}`]]); assert.ok(Math.abs(C.score(it, st).f - (max - 0.5) / max) < 1e-3, s.name); });
  });
}
ok("pb4: the IoC address seen only in the jump box's netstat must be blocked there too", () => {
  const it = consoles.find(p => p.id === "pb4"); const { st, outs } = play(it, CON.pb4.steps.slice(0, 5));
  assert.match(outs[4], /192\.0\.2\.150:443\s+CLOSE_WAIT\s+7712/);
  assert.equal(checks(it, st).find(c => c.what === "192.0.2.150").host, "ctr-node2, JUMP01");
});
ok("pc4: stopping the genuine RMM agent instead of the imitation scores below the correct run", () => {
  const it = consoles.find(p => p.id === "pc4");
  const wrong = CON.pc4.steps.map(([h, c]) => [h, c.replace("rmm-helper", "rmm-agent").replace("/PID 5520", "/PID 2240").replace("Set-Service RMMAgentSvc", "Set-Service RMMAgent")]);
  const { st } = play(it, wrong); const r = C.score(it, st);
  // blocks earn 2 of 4, the rogue tool is still up (0), and both genuine agents are down (−1 each) → 0
  assert.equal(r.f, 0, r.notes.join("\n")); assert.equal(r.notes.filter(x => /Broke the business/.test(x)).length, 2);
});

/* ================= firewall rule editor ================= */
console.log("exam fweditor items");
const F = sim("fweditor");
const R = (act, src, dst, port, proto) => ({ act, src, dst, port, proto });
/* correct tables; `swap` = [i, j] — moving rule i below rule j is the one-mistake (order) attempt */
const FW = {
  pa3: { rules: [R("deny", "10.40.90.0/24", "10.40.0.0/16", "any", "any"), R("allow", "10.40.90.0/24", "any", "80", "tcp"), R("allow", "10.40.90.0/24", "any", "443", "tcp"), R("allow", "10.40.20.0/24", "10.40.30.10", "443", "tcp"), R("allow", "10.40.10.0/24", "10.40.30.30", "8443", "tcp"), R("allow", "10.40.50.5", "10.40.30.20", "22", "tcp")], swap: [0, 2] },
  pb3: { rules: [R("deny", "10.0.10.66", "any", "any", "any"), R("allow", "10.0.10.0/24", "10.0.150.10", "443", "tcp"), R("allow", "10.0.200.20", "10.0.150.10", "1433", "tcp"), R("allow", "10.0.5.0/24", "10.0.200.0/24", "502", "tcp"), R("allow", "10.0.5.0/24", "10.0.200.0/24", "44818", "tcp")], swap: [0, 1] },
  pc3: { rules: [R("deny", "any", "203.0.113.0/24", "any", "any"), R("allow", "10.60.20.0/24", "any", "80", "tcp"), R("allow", "10.60.20.0/24", "any", "443", "tcp"), R("allow", "10.60.20.0/24", "10.60.10.53", "53", "udp"), R("allow", "10.60.10.53", "any", "53", "udp"), R("allow", "10.60.10.25", "any", "25", "tcp"), R("allow", "10.99.0.0/24", "10.60.10.0/24", "3389", "tcp")], swap: [0, 6] },
};
const fws = all.filter(({ p }) => p.type === "fweditor").map(({ p }) => p);
ok("every exam fweditor item has a correct table", () => { assert.deepEqual(fws.map(p => p.id).sort(), Object.keys(FW).sort()); });
const move = (rules, i, j) => { const r = rules.slice(); const [x] = r.splice(i, 1); r.splice(j, 0, x); return r; };
for (const it of fws) {
  const sol = FW[it.id];
  const protos = it.protos || ["any", "tcp", "udp", "icmp"];
  const inChoices = r => it.nets.some(x => x.v === r.src) && it.nets.some(x => x.v === r.dst) && it.ports.includes(String(r.port)) && protos.includes(r.proto);
  ok(`${it.id}: schema — ≥8 packets mixing allow and deny, RFC addresses, starting and solution rules use offered choices`, () => {
    assert.ok(OBJ.test(it.obj) && it.tasks.length >= 3 && it.packets.length >= 8);
    assert.ok(it.packets.some(p => p.want === "allow") && it.packets.some(p => p.want === "deny"));
    it.packets.forEach(p => assert.ok(IP.test(p.src) && IP.test(p.dst) && RFC(p.src) && RFC(p.dst) && ["tcp", "udp", "icmp"].includes(p.proto) && p.note, JSON.stringify(p)));
    it.nets.forEach(x => assert.ok(x.v === "any" || RFC(x.v), x.v));
    it.rules.forEach(r => assert.ok(inChoices(r), "starting rule " + JSON.stringify(r)));
    sol.rules.forEach(r => assert.ok(inChoices(r), "solution rule " + JSON.stringify(r)));
    assert.ok(!it.maxRules || sol.rules.length <= it.maxRules, "solution fits maxRules");
  });
  ok(`${it.id}: starting table is wrong because of rule order — a deny is shadowed by an allow above it`, () => {
    const shadowed = it.rules.some((d, j) => d.act === "deny" && it.packets.some(p => { const hit = evalPacket(it.rules, p); return hit.idx >= 0 && hit.idx < j && hit.act === "allow" && evalPacket([d], p).idx === 0; }));
    assert.ok(shadowed);
    const base = baselineOk(it); assert.ok(base > 0 && base < it.packets.length, "base=" + base);
  });
  ok(`${it.id}: untouched table = 0, correct table = 1`, () => {
    const st = F.create(it); assert.equal(F.answered(it, st), false); assert.equal(F.score(it, st).f, 0);
    st.rules = sol.rules.map(r => ({ ...r })); st.touched = true; const r = F.score(it, st); assert.equal(r.f, 1, r.notes.join("\n"));
  });
  ok(`${it.id}: one mistake (rule ${sol.swap[0] + 1} moved below rule ${sol.swap[1] + 1}) is strictly between 0 and 1`, () => {
    const bad = move(sol.rules, sol.swap[0], sol.swap[1]); const r = scoreTable(it, bad);
    assert.ok(between(r.f), "f=" + r.f); assert.ok(r.notes.some(x => /should be DENIED but rule \d+ ALLOWED/.test(x)), r.notes.join("\n"));
  });
  ok(`${it.id}: one over-broad rule (first allow widened to any port / protocol) is strictly between 0 and 1`, () => {
    const i = sol.rules.findIndex(r => r.act === "allow"); const bad = sol.rules.map((r, k) => k === i ? { ...r, port: "any", proto: "any" } : r);
    const f = scoreTable(it, bad).f; assert.ok(between(f), "f=" + f);
  });
}

console.log(`\n${n} exam PBQ tests passed`);
