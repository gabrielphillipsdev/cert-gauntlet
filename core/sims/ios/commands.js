/* Cert Gauntlet — IOS simulator: command definitions (exec, show, global config, sub-modes). */
import { CommandTree, Session, tokenize } from "./cli.js";
import * as S from "./show.js";
import { runningConfig, startupConfig, ifaceConfigLines, type7, type5, PORT_NAMES } from "./config.js";
import { Device, parseIfName, ifType, isSub, parentOf, isPhysical, shortIf } from "./device.js";
import { isIPv4, isMask, maskLen, maskStr, wildcardStr, ip4, str4, parseRange, parse6, fmt6, isIPv6, prefix6, isValidHostAddr, network, networkStr, wildcardToLen, sameSubnet } from "./net.js";

export const tree = new CommandTree();
const def = (...a) => tree.def(...a);

/* ---------- helpers ---------- */
const dirty = ctx => ctx.topo && ctx.topo.dirty();
const conv = ctx => { if (ctx.topo && !ctx.topo.converged) ctx.topo.converge(); };
function caret(ctx, token) {           // "% Invalid input" with the caret under `token` (first occurrence in the raw line)
  const col = Math.max(0, ctx.raw.indexOf(token));
  return " ".repeat(ctx.session.promptText.length + col) + "^\n% Invalid input detected at '^' marker.";
}
const invalidFor = ctx => caret(ctx, tokenize(ctx.raw)[0]);
function eachIf(ctx, fn) { const outs = []; for (const i of ctx.ifaces) { const o = fn(i); if (o) outs.push(o); } return outs.join("\n") || undefined; }
function linkLog(ctx, before) {
  if (!ctx.topo) return "";
  ctx.topo.converge(); const L = [];
  for (const i of ctx.ifaces) {
    const was = before.get(i.name), now = i.rt.up && i.rt.proto;
    if (was === now) continue;
    if (now) L.push(`\n%LINK-5-CHANGED: Interface ${i.name}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to up`);
    else L.push(`\n%LINK-5-CHANGED: Interface ${i.name}, changed state to ${i.shutdown ? "administratively down" : "down"}\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to down`);
  }
  return L.join("");
}
const snapUp = ctx => new Map(ctx.ifaces.map(i => [i.name, !!(i.rt.up && i.rt.proto)]));
function storePw(dev, plain) { return dev.servicePwEnc ? { enc7: type7(plain) } : { plain }; }
function encryptAll(dev) {
  const enc = p => p && p.plain !== undefined ? { enc7: type7(p.plain) } : p;
  dev.enablePassword = enc(dev.enablePassword);
  for (const l of Object.values(dev.lines)) l.password = enc(l.password);
  for (const u of Object.values(dev.users)) if (u.password) u.password = enc(u.password);
}
const vlanName = v => `VLAN${String(v).padStart(4, "0")}`;

/* =====================================================================
   EXEC
   ===================================================================== */
def("user", "enable", ctx => {
  const d = ctx.dev, s = ctx.session;
  if (!d.enableSecret && !d.enablePassword) { s.enter("priv"); return; }
  let tries = 0;
  const ask = () => s.ask("Password: ", pw => {
    const ok = d.enableSecret ? type5(pw) === d.enableSecret.hash : (d.enablePassword.plain !== undefined ? pw === d.enablePassword.plain : type7(pw) === d.enablePassword.enc7);
    if (ok) { s.enter("priv"); return ""; }
    if (++tries >= 3) return "% Bad secrets";
    ask(); return "";
  }, { echo: false });
  ask();
});
def("priv", "disable", ctx => { ctx.session.enter("user"); });
def("exec", "exit", ctx => { ctx.session.exitMode(); });
def("exec", "logout", ctx => { ctx.session.enter("user"); });
def("config*", "exit", ctx => { ctx.session.exitMode(); });
def("config*", "end", ctx => { ctx.session.end(); });
def("priv", "configure terminal", ctx => { ctx.session.enter("config"); return "Enter configuration commands, one per line.  End with CNTL/Z."; });
def("priv", "configure", ctx => { ctx.session.ask("Configuring from terminal, memory, or network [terminal]? ", a => { if (!a || "terminal".startsWith(a.toLowerCase())) { ctx.session.enter("config"); return "Enter configuration commands, one per line.  End with CNTL/Z."; } return "% Invalid input"; }); });
def("exec", "terminal length <0-512>", () => {});
def("exec", "telnet (A.B.C.D|WORD)", ctx => `Trying ${ctx.p[0]} ...\n% Connection timed out; remote host not responding`);
def("exec", "ssh -l WORD (A.B.C.D|WORD)", ctx => `% Remote login is not simulated (see dev/specs/ccna.md)`);
def("priv", "setup", () => "% Setup mode is not simulated");
def("exec", "send LINE", () => "");
def("exec", "systat", () => "    Line       User       Host(s)              Idle       Location\n*  0 con 0                idle                 00:00:00");
def("exec", "terminal (monitor|no)", () => {});

/* ping / traceroute */
function doPing(ctx, target, opts = {}) {
  conv(ctx);
  if (!ctx.topo) return "% Unrecognized host or address, or protocol not running.";
  if (isIPv6(target)) return ctx.topo.ping6(ctx.dev, target).text;
  if (!isIPv4(target)) return `Translating "${target}"...domain server (255.255.255.255)\n% Unrecognized host or address, or protocol not running.`;
  const r = ctx.topo.ping(ctx.dev, target, opts); return r.text;
}
def("exec", "ping (A.B.C.D|X:X:X:X::X|WORD)", ctx => doPing(ctx, ctx.p[0]));
def("exec", "ping ip (A.B.C.D|WORD)", ctx => doPing(ctx, ctx.p[0]));
def("exec", "ping ipv6 (X:X:X:X::X|WORD)", ctx => doPing(ctx, ctx.p[0]));
def("exec", "ping A.B.C.D source (A.B.C.D|IFNAME)", ctx => {
  const src = ctx.p[1]; const i = ctx.dev.interfaces[src];
  if (!isIPv4(src) && !i) return caret(ctx, tokenize(ctx.raw).pop());
  const ip = isIPv4(src) ? src : i.ip?.addr; if (!ip) return "% Invalid source";
  return doPing(ctx, ctx.p[0], { source: src, sourceIp: ip });
});
def("exec", "ping A.B.C.D repeat <1-2147483647>", ctx => doPing(ctx, ctx.p[0], { count: +ctx.p[1] }));
def("exec", "ping", ctx => {
  ctx.session.ask("Protocol [ip]: ", () => { ctx.session.ask("Target IP address: ", t => { if (!t) return "% Bad IP address"; const o = doPing(ctx, t); return o; }); return ""; });
});
def("exec", "traceroute (A.B.C.D|WORD)", ctx => { conv(ctx); if (!isIPv4(ctx.p[0])) return `Translating "${ctx.p[0]}"...domain server (255.255.255.255)\n% Unrecognized host or address, or protocol not running.`; return ctx.topo.traceroute(ctx.dev, ctx.p[0]).text; });
def("exec", "traceroute ip A.B.C.D", ctx => { conv(ctx); return ctx.topo.traceroute(ctx.dev, ctx.p[0]).text; });

/* save / reload */
def("priv", "copy running-config startup-config", ctx => { ctx.session.ask("Destination filename [startup-config]? ", () => { ctx.dev.startup = runningConfig(ctx.dev); return "Building configuration...\n[OK]"; }); });
def("priv", "copy run start", ctx => { ctx.session.ask("Destination filename [startup-config]? ", () => { ctx.dev.startup = runningConfig(ctx.dev); return "Building configuration...\n[OK]"; }); });
def("priv", "copy startup-config running-config", ctx => { ctx.session.ask("Destination filename [running-config]? ", () => { if (!ctx.dev.startup) return "%Error opening nvram:/startup-config (No such file or directory)"; replayConfig(ctx.dev, ctx.topo, ctx.dev.startup, { boot: false }); return `${ctx.dev.startup.length} bytes copied in 0.416 secs (1023 bytes/sec)`; }); });
def("priv", "write", ctx => { ctx.dev.startup = runningConfig(ctx.dev); return "Building configuration...\n[OK]"; });
def("priv", "write memory", ctx => { ctx.dev.startup = runningConfig(ctx.dev); return "Building configuration...\n[OK]"; });
def("priv", "write erase", ctx => { ctx.session.ask("Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]", a => { if (a && !/^y/i.test(a)) return ""; ctx.dev.startup = null; return "[OK]\nErase of nvram: complete"; }); });
def("priv", "erase startup-config", ctx => { ctx.session.ask("Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]", a => { if (a && !/^y/i.test(a)) return ""; ctx.dev.startup = null; return "[OK]\nErase of nvram: complete"; }); });
def("priv", "reload", ctx => {
  const d = ctx.dev, s = ctx.session;
  const go = () => s.ask("Proceed with reload? [confirm]", a => { if (a && !/^y/i.test(a)) return ""; factoryReset(d, ctx.topo); if (d.startup) replayConfig(d, ctx.topo, d.startup); s.enter("user"); s.booted = true; return `\nSystem Bootstrap, Version 15.4(3)S, RELEASE SOFTWARE (fc1)\n...\nPress RETURN to get started!\n`; });
  if (d.startup !== runningConfig(d)) s.ask("System configuration has been modified. Save? [yes/no]: ", a => { if (/^y/i.test(a)) d.startup = runningConfig(d); go(); return /^y/i.test(a) ? "Building configuration...\n[OK]" : ""; });
  else go();
});
export function factoryReset(d, topo) {
  const fresh = new Device(d.label, { type: d.model, hostname: null, ports: Object.keys(d.interfaces).filter(n => isPhysical(n)), macBase: d.macBase, platform: d.platform });
  for (const k of Object.keys(fresh)) if (k !== "id" && k !== "topo" && k !== "label" && k !== "startup") d[k] = fresh[k];
  d.hostname = d.isSwitch ? "Switch" : "Router";
  for (const i of Object.values(d.interfaces)) i.rt = {};
  d.rt = { arp: [], mac: [], nat: [], dhcpBindings: [], aclHits: {}, natHits: 0, natMisses: 0, uptime: 0 };
  topo && topo.dirty();
}
export function replayConfig(d, topo, text, { boot = true } = {}) {
  // a saved config has no "no shutdown" lines: interfaces without an explicit "shutdown" come up on boot
  if (boot) for (const i of Object.values(d.interfaces)) if (!(d.isSwitch && i.name === "Vlan1")) i.shutdown = false;
  const s = new Session(d, topo, tree); s.enter("config");
  let ctxMode = null;
  for (let line of text.split("\n")) {
    if (/^(Building configuration|Current configuration|version |!|end$|boot-|no aaa|ip cef|no ipv6 cef|ip forward-protocol|service timestamps|no service password|no ip http|spanning-tree extend|Using \d+ out of)/.test(line.trim() === "" ? "!" : line)) continue;
    if (line === "") continue;
    if (!line.startsWith(" ")) { if (s.mode !== "config") { s.enter("config"); } s.exec(line); }
    else s.exec(line.trim());
    if (s.pending) s.exec("");
  }
  topo && topo.dirty();
}

def("priv", "clear ip nat translation *", ctx => { ctx.dev.rt.nat = []; });
def("priv", "clear ip nat translation", ctx => { ctx.dev.rt.nat = []; });
def("priv", "clear arp-cache", ctx => { ctx.dev.rt.arp = []; });
def("priv", "clear arp", ctx => { ctx.dev.rt.arp = []; });
def("priv", "clear mac address-table dynamic", ctx => { ctx.dev.rt.mac = ctx.dev.rt.mac.filter(m => m.type !== "DYNAMIC"); });
def("priv", "clear mac address-table", ctx => { ctx.dev.rt.mac = ctx.dev.rt.mac.filter(m => m.type !== "DYNAMIC"); });
def("priv", "clear ip ospf process", ctx => { ctx.session.ask("Reset ALL OSPF processes? [no]: ", a => { if (/^y/i.test(a)) dirty(ctx); return ""; }); });
def("priv", "clear counters", ctx => { ctx.session.ask("Clear \"show interface\" counters on all interfaces [confirm]", () => ""); });
def("priv", "clear access-list counters", ctx => { ctx.dev.rt.aclHits = {}; });
def("priv", "clear line vty <0-15>", () => {});
def("priv", "debug LINE", () => "% Debugging is not simulated");
def("priv", "undebug all", () => "All possible debugging has been turned off");
def("exec", "show history", ctx => ctx.session.history.join("\n"));
def("exec", "show clock", () => "*22:14:07.230 UTC Fri Oct 2 2026");
def("exec", "show users", () => "    Line       User       Host(s)              Idle       Location\n*  0 con 0                idle                 00:00:00");
def("exec", "show flash", ctx => ctx.dev.isSwitch ? "Directory of flash:/\n\n    2  -rwx    11607161  Mar 1 1993 00:14:28 +00:00  c2960-lanbasek9-mz.152-4.E7.bin\n\n32514048 bytes total (20906880 bytes free)" : "-#- --length-- -----date/time------ path\n1    491716480  Mar 1 1993 00:14:28 isr4300-universalk9.03.13.00.S.154-3.S-ext.SPA.bin\n\n2142715904 bytes available (1651000000 bytes used)");

/* ---------- show ---------- */
const show = (syntax, fn, opts) => def("exec", "show " + syntax, ctx => { conv(ctx); return fn(ctx); }, opts);
def("priv", "show running-config", ctx => { conv(ctx); return runningConfig(ctx.dev); });
def("priv", "show running-config interface IFNAME", ctx => { conv(ctx); const i = ctx.dev.interfaces[ctx.p[0]]; if (!i) return caret(ctx, tokenize(ctx.raw).pop()); return `Building configuration...\n\nCurrent configuration : 120 bytes\n!\ninterface ${i.name}\n${S_ifaceLines(ctx.dev, i)}\nend`; });
def("priv", "show startup-config", ctx => startupConfig(ctx.dev));
def("priv", "show configuration", ctx => startupConfig(ctx.dev));
show("version", ctx => S.version(ctx.dev));
show("ip interface brief", ctx => S.ipIntBrief(ctx.dev));
show("ip interface", ctx => S.ipIntBrief(ctx.dev));
show("ipv6 interface brief", ctx => S.ipv6IntBrief(ctx.dev));
show("ip route", ctx => S.ipRoute(ctx.dev));
show("ip route (ospf|static|connected)", ctx => { const d = ctx.dev; const keep = { ospf: r => r.code.startsWith("O"), static: r => r.code.startsWith("S"), connected: r => r.code === "C" || r.code === "L" }[ctx.args[3]]; const saved = d.rt.routes; d.rt.routes = saved.filter(keep); try { return S.ipRoute(d); } finally { d.rt.routes = saved; } });
show("ip route A.B.C.D", ctx => { conv(ctx); const lk = ctx.topo.lookup(ctx.dev, ctx.p[0]); if (!lk) return "% Network not in table"; const r = lk.route; return `Routing entry for ${r.prefix}/${r.len}${r.len === 0 ? ", supernet" : ""}\n  Known via "${r.code === "C" ? "connected" : r.code.startsWith("S") ? "static" : "ospf " + ctx.dev.ospf?.pid}", distance ${r.ad}, metric ${r.metric}${r.len === 0 ? ", candidate default path" : ""}${r.code.startsWith("O") ? ", type intra area" : ""}\n` + r.nhs.map(nh => nh.via ? `  * ${nh.via}, via ${nh.iface}\n      Route metric is ${r.metric}, traffic share count is 1` : `  * directly connected, via ${nh.iface}\n      Route metric is 0, traffic share count is 1`).join("\n"); });
show("ipv6 route", ctx => S.ipv6Route(ctx.dev));
show("ip protocols", ctx => S.ipProtocols(ctx.dev));
show("vlan brief", ctx => ctx.dev.isSwitch ? S.vlanBrief(ctx.dev) : caret(ctx, "vlan"));
show("vlan", ctx => ctx.dev.isSwitch ? S.vlanBrief(ctx.dev) + "\n\nVLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2\n---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------\n" + Object.keys(ctx.dev.vlans).sort((a, b) => a - b).map(v => `${String(v).padEnd(5)}enet  ${String(100000 + +v).padEnd(11)}1500  -      -      -        -    -        0      0`).join("\n") : caret(ctx, "vlan"));
show("vlan id <1-4094>", ctx => { const v = +ctx.p[0]; if (!ctx.dev.vlans[v]) return `VLAN id ${v} not found in current VLAN database`; const saved = ctx.dev.vlans; ctx.dev.vlans = { [v]: saved[v] }; try { return S.vlanBrief(ctx.dev); } finally { ctx.dev.vlans = saved; } });
show("interfaces", ctx => S.interfaces(ctx.dev));
show("interfaces IFNAME", ctx => ctx.dev.interfaces[ctx.p[0]] ? S.interfaces(ctx.dev, ctx.p[0]) : caret(ctx, tokenize(ctx.raw).pop()));
show("interfaces trunk", ctx => ctx.dev.isSwitch ? S.interfacesTrunk(ctx.dev) : caret(ctx, "trunk"));
show("interfaces switchport", ctx => ctx.dev.isSwitch ? S.interfacesSwitchport(ctx.dev) : caret(ctx, "switchport"));
show("interfaces IFNAME switchport", ctx => ctx.dev.isSwitch && ctx.dev.interfaces[ctx.p[0]] ? S.interfacesSwitchport(ctx.dev, ctx.p[0]) : caret(ctx, "switchport"));
show("interfaces IFNAME trunk", ctx => { const d = ctx.dev, i = d.interfaces[ctx.p[0]]; if (!d.isSwitch || !i) return caret(ctx, "trunk"); const saved = d.interfaces; d.interfaces = { [i.name]: i }; try { return S.interfacesTrunk(d); } finally { d.interfaces = saved; } });
show("interfaces status", ctx => { if (!ctx.dev.isSwitch) return caret(ctx, "status"); return "Port      Name               Status       Vlan       Duplex  Speed Type\n" + ctx.dev.ifaces().filter(i => i.switchport).map(i => `${shortIf(i.name).padEnd(10)}${i.desc.slice(0, 18).padEnd(19)}${(i.rt.errDisabled ? "err-disabled" : i.shutdown ? "disabled" : i.rt.up ? "connected" : "notconnect").padEnd(13)}${(i.rt.opMode === "trunk" ? "trunk" : String(i.switchport.access)).padEnd(11)}${(i.duplex === "auto" ? "a-full" : i.duplex).padEnd(8)}${(i.speed === "auto" ? (ifType(i.name) === "FastEthernet" ? "a-100" : "a-1000") : i.speed).padEnd(7)}${ifType(i.name) === "FastEthernet" ? "10/100BaseTX" : "10/100/1000BaseTX"}`).join("\n"); });
show("ip ospf neighbor", ctx => S.ipOspfNeighbor(ctx.dev));
show("ip ospf interface", ctx => S.ipOspfInterface(ctx.dev));
show("ip ospf interface IFNAME", ctx => S.ipOspfInterface(ctx.dev, ctx.p[0]));
show("ip ospf interface brief", ctx => { if (!ctx.dev.ospf) return ""; return `Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C\n` + ctx.dev.rt.ospfIfs.map(o => `${shortIf(o.iface.name).padEnd(13)}${String(ctx.dev.ospf.pid).padEnd(6)}${String(o.area).padEnd(16)}${(o.iface.ip.addr + "/" + o.iface.ip.len).padEnd(19)}${String(o.cost).padEnd(6)}${(o.passive ? "DOWN" : o.state === "LOOPBACK" ? "LOOP" : o.state).padEnd(6)}${o.nbrs.filter(n => n.full).length}/${o.nbrs.length}`).join("\n"); });
show("ip ospf database", ctx => S.ipOspfDatabase(ctx.dev));
show("ip ospf", ctx => { const d = ctx.dev; if (!d.ospf) return ""; return ` Routing Process "ospf ${d.ospf.pid}" with ID ${d.rt.ospfRid}\n Start time: 00:00:12.000, Time elapsed: 00:12:34.000\n Supports only single TOS(TOS0) routes\n Supports opaque LSA\n Router is not originating router-LSAs with maximum metric\n Initial SPF schedule delay 5000 msecs\n Reference bandwidth unit is ${d.ospf.refBw} mbps\n    Area BACKBONE(0)\n        Number of interfaces in this area is ${d.rt.ospfIfs.filter(x => x.area === 0).length}\n        Area has no authentication\n        SPF algorithm executed 4 times`; });
show("access-lists", ctx => S.accessLists(ctx.dev));
show("access-lists (WORD|<1-2699>)", ctx => S.accessLists(ctx.dev, ctx.p[0]));
show("ip access-lists", ctx => S.accessLists(ctx.dev));
show("ip access-lists (WORD|<1-2699>)", ctx => S.accessLists(ctx.dev, ctx.p[0]));
show("ip nat translations", ctx => S.natTranslations(ctx.dev));
show("ip nat statistics", ctx => S.natStatistics(ctx.dev));
show("port-security", ctx => ctx.dev.isSwitch ? S.portSecurity(ctx.dev) : caret(ctx, "port-security"));
show("port-security interface IFNAME", ctx => ctx.dev.isSwitch ? S.portSecurity(ctx.dev, ctx.p[0]) : caret(ctx, "port-security"));
show("port-security address", ctx => { if (!ctx.dev.isSwitch) return caret(ctx, "port-security"); const rows = []; for (const i of ctx.dev.ifaces()) if (i.portsec.on) for (const m of i.portsec.macs) rows.push(`${String(i.switchport.access).padStart(4).padEnd(8)}${m.mac.padEnd(19)}${(m.sticky ? "SecureSticky" : "SecureConfigured").padEnd(19)}${shortIf(i.name).padEnd(14)}-`); return `               Secure Mac Address Table\n-----------------------------------------------------------------------------\nVlan    Mac Address       Type                          Ports   Remaining Age\n                                                                   (mins)\n----    -----------       ----                          -----   -------------\n${rows.join("\n")}\n-----------------------------------------------------------------------------\nTotal Addresses in System (excluding one mac per port)     : 0\nMax Addresses limit in System (excluding one mac per port) : 8192`; });
show("etherchannel summary", ctx => ctx.dev.isSwitch ? S.etherchannelSummary(ctx.dev) : caret(ctx, "etherchannel"));
show("etherchannel", ctx => ctx.dev.isSwitch ? S.etherchannelSummary(ctx.dev) : caret(ctx, "etherchannel"));
show("etherchannel port-channel", ctx => ctx.dev.isSwitch ? S.etherchannelSummary(ctx.dev) : caret(ctx, "etherchannel"));
show("cdp neighbors", ctx => S.cdpNeighbors(ctx.dev, false));
show("cdp neighbors detail", ctx => S.cdpNeighbors(ctx.dev, true));
show("cdp", ctx => ctx.dev.cdp ? "Global CDP information:\n\tSending CDP packets every 60 seconds\n\tSending a holdtime value of 180 seconds\n\tSending CDPv2 advertisements is  enabled" : "% CDP is not enabled");
show("lldp neighbors", ctx => S.lldpNeighbors(ctx.dev));
show("lldp", ctx => ctx.dev.lldp ? "Global LLDP Information:\n    Status: ACTIVE\n    LLDP advertisements are sent every 30 seconds\n    LLDP hold time advertised is 120 seconds\n    LLDP interface reinitialisation delay is 2 seconds" : "% LLDP is not enabled");
show("mac address-table", ctx => ctx.dev.isSwitch ? S.macTable(ctx.dev) : caret(ctx, "address-table"));
show("mac-address-table", ctx => ctx.dev.isSwitch ? S.macTable(ctx.dev) : caret(ctx, "mac-address-table"));
show("mac address-table dynamic", ctx => S.macTable(ctx.dev, { dynamic: true }));
show("mac address-table vlan <1-4094>", ctx => S.macTable(ctx.dev, { vlan: +ctx.p[0] }));
show("mac address-table interface IFNAME", ctx => S.macTable(ctx.dev, { iface: ctx.p[0] }));
show("mac address-table address H.H.H", ctx => S.macTable(ctx.dev, { address: ctx.p[0].toLowerCase() }));
show("spanning-tree", ctx => ctx.dev.isSwitch ? S.spanningTree(ctx.dev) : caret(ctx, "spanning-tree"));
show("spanning-tree vlan <1-4094>", ctx => ctx.dev.isSwitch ? S.spanningTree(ctx.dev, +ctx.p[0]) : caret(ctx, "spanning-tree"));
show("spanning-tree summary", ctx => { const d = ctx.dev; if (!d.isSwitch) return caret(ctx, "spanning-tree"); const insts = Object.values(d.rt.stp); return `Switch is in ${d.stpMode} mode\nRoot bridge for: ${insts.filter(i => i.root).map(i => vlanName(i.vlan)).join(", ") || "none"}\nExtended system ID           is enabled\nPortfast Default             is ${d.stpPortfastDefault ? "enabled" : "disabled"}\nPortFast BPDU Guard Default  is ${d.stpBpduguardDefault ? "enabled" : "disabled"}\nPortfast BPDU Filter Default is disabled\nLoopguard Default            is disabled\n\nName                   Blocking Listening Learning Forwarding STP Active\n---------------------- -------- --------- -------- ---------- ----------\n` + insts.map(i => `${vlanName(i.vlan).padEnd(23)}${String(i.ports.filter(p => p.sts === "BLK").length).padStart(8)}${"0".padStart(10)}${"0".padStart(9)}${String(i.ports.filter(p => p.sts === "FWD").length).padStart(11)}${String(i.ports.length).padStart(11)}`).join("\n"); });
show("ip dhcp binding", ctx => S.dhcpBinding(ctx.dev));
show("ip dhcp pool", ctx => S.dhcpPool(ctx.dev));
show("ip dhcp conflict", () => "");
show("arp", ctx => S.arp(ctx.dev));
show("ip arp", ctx => S.arp(ctx.dev));
show("ntp associations", ctx => S.ntpAssociations(ctx.dev));
show("ntp status", ctx => S.ntpStatus(ctx.dev));
show("ip ssh", ctx => ctx.dev.rsaBits ? `SSH Enabled - version ${ctx.dev.sshVersion || "1.99"}\nAuthentication methods:publickey,keyboard-interactive,password\nAuthentication timeout: 120 secs; Authentication retries: 3\nMinimum expected Diffie Hellman key size : 1024 bits\nIOS Keys in SECSH format(ssh-rsa, base64 encoded): ${ctx.dev.hostname}.${ctx.dev.domainName}` : "SSH Disabled - version 1.99\n%Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).\nAuthentication methods:publickey,keyboard-interactive,password\nAuthentication timeout: 120 secs; Authentication retries: 3");
show("crypto key mypubkey rsa", ctx => ctx.dev.rsaBits ? `% Key pair was generated at: 22:14:07 UTC Oct 2 2026\nKey name: ${ctx.dev.hostname}.${ctx.dev.domainName}\nKey type: RSA KEYS\n Storage Device: not specified\n Usage: General Purpose Key\n Key is not exportable.\n Key Data:\n  30819F30 0D06092A 864886F7 0D010101 05000381 8D003081 89028181 00C2B1A3` : "");
show("ip interface IFNAME", ctx => { const i = ctx.dev.interfaces[ctx.p[0]]; if (!i) return caret(ctx, tokenize(ctx.raw).pop()); return `${i.name} is ${i.shutdown ? "administratively down" : i.rt.up ? "up" : "down"}, line protocol is ${i.rt.up && i.rt.proto ? "up" : "down"}\n  Internet ${i.ip ? `address is ${i.ip.addr}/${i.ip.len}` : "protocol processing disabled"}${i.ip ? `\n  Broadcast address is 255.255.255.255\n  Address determined by setup command\n  MTU is 1500 bytes\n  Helper address${i.helper.length ? "es are " + i.helper.join(", ") : " is not set"}\n  Directed broadcast forwarding is disabled\n  Outgoing access list is ${i.acl.out || "not set"}\n  Inbound  access list is ${i.acl.in || "not set"}\n  Proxy ARP is enabled\n  Local Proxy ARP is disabled\n  Security level is default\n  Split horizon is enabled\n  ICMP redirects are always sent\n  ICMP unreachables are always sent\n  ICMP mask replies are never sent\n  IP fast switching is enabled\n  IP Flow switching is disabled\n  IP CEF switching is enabled\n  IP Null turbo vector\n  IP multicast fast switching is enabled\n  Policy routing is disabled\n  Network address translation is ${i.nat ? "enabled, interface in domain " + i.nat : "disabled"}` : ""}`; });
show("ipv6 interface IFNAME", ctx => { const i = ctx.dev.interfaces[ctx.p[0]]; if (!i) return caret(ctx, tokenize(ctx.raw).pop()); if (!i.rt.ll6) return `${i.name} is ${i.rt.up ? "up" : "down"}, line protocol is ${i.rt.proto ? "up" : "down"}\n  IPv6 is disabled`; return `${i.name} is ${i.rt.up ? "up" : "down"}, line protocol is ${i.rt.proto ? "up" : "down"}\n  IPv6 is enabled, link-local address is ${fmt6(i.rt.ll6).toUpperCase()} \n  No Virtual link-local address(es):\n  Global unicast address(es):\n` + (i.rt.v6 || []).map(a => `    ${fmt6(a.g).toUpperCase()}, subnet is ${fmt6(prefix6(a.g, a.len)).toUpperCase()}/${a.len}${a.eui64 ? " [EUI]" : ""}`).join("\n") + `\n  Joined group address(es):\n    FF02::1\n    FF02::2\n    FF02::1:FF${hex2(i.rt.ll6[6] & 0xff)}:${(i.rt.ll6[7]).toString(16).toUpperCase().padStart(4, "0")}\n  MTU is 1500 bytes\n  ICMP error messages limited to one every 100 milliseconds\n  ICMP redirects are enabled\n  ICMP unreachables are sent\n  ND DAD is enabled, number of DAD attempts: 1\n  ND reachable time is 30000 milliseconds (using 30000)\n  Hosts use stateless autoconfig for addresses.`; });
show("ipv6 neighbors", ctx => "IPv6 Address                              Age Link-layer Addr State Interface");
show("ip dhcp server statistics", ctx => `Memory usage         40278\nAddress pools        ${Object.keys(ctx.dev.dhcp.pools).length}\nDatabase agents      0\nAutomatic bindings   ${ctx.dev.rt.dhcpBindings.length}\nManual bindings      0\nExpired bindings     0\nMalformed messages   0\nSecure arp entries   0`);
show("logging", () => "Syslog logging: enabled (0 messages dropped, 0 messages rate-limited, 0 flushes, 0 overruns, xml disabled, filtering disabled)\n    Console logging: level debugging, 12 messages logged");
show("inventory", ctx => `NAME: "Chassis", DESCR: "Cisco ${ctx.dev.platform} Chassis"\nPID: ${ctx.dev.platform}        , VID: V01  , SN: FDO2048A1B2`);
show("protocols", ctx => "Global values:\n  Internet Protocol routing is enabled\n" + ctx.dev.ifaces().map(i => `${i.name} is ${i.shutdown ? "administratively down" : i.rt.up ? "up" : "down"}, line protocol is ${i.rt.up && i.rt.proto ? "up" : "down"}${i.ip ? `\n  Internet address is ${i.ip.addr}/${i.ip.len}` : ""}`).join("\n"));
show("tech-support", () => "% Not simulated — use the individual show commands.");
const hex2 = n => n.toString(16).toUpperCase().padStart(2, "0");
function S_ifaceLines(dev, i) { return ifaceConfigLines(dev, i).join("\n"); }

/* =====================================================================
   GLOBAL CONFIG
   ===================================================================== */
def("config", "hostname WORD", ctx => { if (ctx.neg) { ctx.dev.hostname = ctx.dev.isSwitch ? "Switch" : "Router"; return; } if (!/^[A-Za-z][\w-]*$/.test(ctx.p[0])) return "% Hostname contains one or more illegal characters."; ctx.dev.hostname = ctx.p[0]; dirty(ctx); }, { no: "hostname" });
def("config", "enable secret WORD", ctx => { ctx.dev.enableSecret = ctx.neg ? null : { hash: type5(ctx.p[0]) }; }, { no: ["enable secret", "enable secret WORD"] });
def("config", "enable secret (0|5) WORD", ctx => { ctx.dev.enableSecret = ctx.neg ? null : { hash: ctx.args[2] === "5" ? ctx.p[0] : type5(ctx.p[0]) }; });
def("config", "enable password WORD", ctx => { ctx.dev.enablePassword = ctx.neg ? null : storePw(ctx.dev, ctx.p[0]); }, { no: ["enable password", "enable password WORD"] });
def("config", "enable password 7 WORD", ctx => { ctx.dev.enablePassword = { enc7: ctx.p[0] }; });
def("config", "service password-encryption", ctx => { ctx.dev.servicePwEnc = !ctx.neg; if (!ctx.neg) encryptAll(ctx.dev); }, { no: true });
def("config", "service (timestamps|tcp-keepalives-in|tcp-keepalives-out) LINE", () => {}, { no: true });
def("config", "service (timestamps|sequence-numbers)", () => {}, { no: true });
def("config", "banner motd LINE", ctx => {
  if (ctx.neg) { ctx.dev.banner = null; return; }
  const text = ctx.p[0]; const delim = text[0]; const rest = text.slice(1); const end = rest.indexOf(delim);
  if (end >= 0) { ctx.dev.banner = rest.slice(0, end); return; }
  const buf = rest ? [rest] : []; const s = ctx.session;
  const more = () => s.ask("", line => { const k = line.indexOf(delim); if (k >= 0) { buf.push(line.slice(0, k)); ctx.dev.banner = buf.join("\n"); return ""; } buf.push(line); more(); return ""; });
  more();
  return `Enter TEXT message.  End with the character '${delim}'.`;
}, { no: "banner motd" });
def("config", "banner (login|exec) LINE", () => {}, { no: ["banner (login|exec)"] });
def("config", "username WORD (secret|password) WORD", ctx => { const d = ctx.dev; if (ctx.neg) { delete d.users[ctx.p[0]]; return; } const u = d.users[ctx.p[0]] ||= {}; if (ctx.args[2] === "secret") { u.secret = type5(ctx.p[1]); delete u.password; } else { u.password = storePw(d, ctx.p[1]); delete u.secret; } }, { no: ["username WORD", "username WORD (secret|password) WORD"] });
def("config", "username WORD (secret|password) (0|5|7) WORD", ctx => { const u = ctx.dev.users[ctx.p[0]] ||= {}; const kind = ctx.args[3]; if (ctx.args[2] === "secret") { u.secret = kind === "5" ? ctx.p[1] : type5(ctx.p[1]); } else u.password = kind === "7" ? { enc7: ctx.p[1] } : storePw(ctx.dev, ctx.p[1]); });
def("config", "username WORD privilege <0-15> (secret|password) WORD", ctx => { const u = ctx.dev.users[ctx.p[0]] ||= {}; u.priv = +ctx.p[1]; if (ctx.args[4] === "secret") { u.secret = type5(ctx.p[2]); delete u.password; } else { u.password = storePw(ctx.dev, ctx.p[2]); delete u.secret; } });
def("config", "username WORD privilege <0-15> (secret|password) (0|5|7) WORD", ctx => { const u = ctx.dev.users[ctx.p[0]] ||= {}; u.priv = +ctx.p[1]; const kind = ctx.args[5]; if (ctx.args[4] === "secret") u.secret = kind === "5" ? ctx.p[2] : type5(ctx.p[2]); else u.password = kind === "7" ? { enc7: ctx.p[2] } : storePw(ctx.dev, ctx.p[2]); });
def("config", "ip domain-name WORD", ctx => { ctx.dev.domainName = ctx.neg ? null : ctx.p[0]; }, { no: ["ip domain-name", "ip domain-name WORD"] });
def("config", "ip domain name WORD", ctx => { ctx.dev.domainName = ctx.neg ? null : ctx.p[0]; }, { no: ["ip domain name", "ip domain name WORD"] });
def("config", "ip domain-lookup", ctx => { ctx.dev.domainLookup = !ctx.neg; }, { no: true });
def("config", "ip domain lookup", ctx => { ctx.dev.domainLookup = !ctx.neg; }, { no: true });
def("config", "ip name-server A.B.C.D", () => {}, { no: true });
function genRsa(ctx, bits) {
  const d = ctx.dev; if (!d.domainName) return "% Please define a domain-name first.";
  if (bits < 360 || bits > 4096) return "% Invalid modulus size";
  d.rsaBits = bits; d.sshVersion ||= null;
  return `The name for the keys will be: ${d.hostname}.${d.domainName}\n\n% The key modulus size is ${bits} bits\n% Generating ${bits} bit RSA keys, keys will be non-exportable...\n[OK] (elapsed time was 1 seconds)\n\n%SSH-5-ENABLED: SSH 1.99 has been enabled`;
}
def("config", "crypto key generate rsa", ctx => { if (!ctx.dev.domainName) return "% Please define a domain-name first."; ctx.session.ask("How many bits in the modulus [512]: ", a => genRsa(ctx, a ? +a : 512)); return `The name for the keys will be: ${ctx.dev.hostname}.${ctx.dev.domainName}\nChoose the size of the key modulus in the range of 360 to 4096 for your\n  General Purpose Keys. Choosing a key modulus greater than 512 may take\n  a few minutes.\n`; });
def("config", "crypto key generate rsa general-keys", ctx => { if (!ctx.dev.domainName) return "% Please define a domain-name first."; ctx.session.ask("How many bits in the modulus [512]: ", a => genRsa(ctx, a ? +a : 512)); return `The name for the keys will be: ${ctx.dev.hostname}.${ctx.dev.domainName}`; });
def("config", "crypto key generate rsa [general-keys] modulus <360-4096>", ctx => genRsa(ctx, +ctx.p[0]));
def("config", "crypto key zeroize rsa", ctx => { ctx.session.ask("Do you really want to remove these keys? [yes/no]: ", a => { if (/^y/i.test(a)) ctx.dev.rsaBits = 0; return ""; }); return `% All RSA keys will be removed.\n% All router certs issued using these keys will also be removed.`; });
def("config", "ip ssh version (1|2)", ctx => { if (ctx.neg) { ctx.dev.sshVersion = null; return; } if (!ctx.dev.rsaBits) return "Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2)."; if (ctx.p.length === 0 && ctx.args[3] === "2" && ctx.dev.rsaBits < 768) return "Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2)."; ctx.dev.sshVersion = +ctx.args[3]; }, { no: "ip ssh version" });
def("config", "ip ssh (time-out|authentication-retries) <0-120>", () => {}, { no: true });
def("config", "ip http server", ctx => { ctx.dev.httpServer = !ctx.neg; }, { no: true });
def("config", "ip http secure-server", () => {}, { no: true });
def("config", "logging (console|buffered|monitor)", () => {}, { no: true });
def("config", "logging LINE", () => {}, { no: true });
def("config", "clock timezone WORD <-23-23>", () => {}, { no: true });
def("config", "ip cef", () => {}, { no: true });
def("config", "no ip domain-lookup", ctx => { ctx.dev.domainLookup = false; }, { noOnly: true });
def("config", "ip routing", ctx => { if (!ctx.dev.isL3) return caret(ctx, "routing"); ctx.dev.ipRouting = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "ipv6 unicast-routing", ctx => { ctx.dev.ipv6Routing = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "ip default-gateway A.B.C.D", ctx => { ctx.dev.defaultGateway = ctx.neg ? null : ctx.p[0]; dirty(ctx); }, { no: ["ip default-gateway", "ip default-gateway A.B.C.D"] });
def("config", "ntp server A.B.C.D", ctx => { const d = ctx.dev; if (ctx.neg) d.ntp = d.ntp.filter(x => x !== ctx.p[0]); else if (!d.ntp.includes(ctx.p[0])) d.ntp.push(ctx.p[0]); }, { no: true });
def("config", "ntp server A.B.C.D (prefer|key) [WORD]", ctx => { if (!ctx.dev.ntp.includes(ctx.p[0])) ctx.dev.ntp.push(ctx.p[0]); });
def("config", "ntp master [<1-15>]", () => {}, { no: true });
def("config", "cdp run", ctx => { ctx.dev.cdp = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "lldp run", ctx => { ctx.dev.lldp = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "cdp (timer|holdtime) <5-254>", () => {}, { no: true });

/* ---------- static routes ---------- */
def("config", "ip route A.B.C.D MASK (A.B.C.D|IFNAME) [A.B.C.D] [<1-255>]", ctx => {
  const d = ctx.dev; if (!d.isL3) return caret(ctx, "route");
  const [prefix, mask] = ctx.p; let nh = null, iface = null, ad = 1; const rest = ctx.p.slice(2);
  if (isIPv4(rest[0])) nh = rest[0]; else { iface = rest[0]; if (!d.interfaces[iface]) return caret(ctx, tokenize(ctx.raw)[4]); }
  if (rest[1] && isIPv4(rest[1])) { nh = rest[1]; if (rest[2]) ad = +rest[2]; } else if (rest[1]) ad = +rest[1];
  const len = maskLen(mask); if (len < 0) return "%Inconsistent address and mask";
  if (network(prefix, len) !== ip4(prefix) >>> 0 && !(prefix === "0.0.0.0")) return "%Inconsistent address and mask";
  if (ctx.neg) { d.routes = d.routes.filter(r => !(r.prefix === prefix && r.len === len && (nh ? r.nh === nh : true) && (iface ? r.iface === iface : true))); dirty(ctx); return; }
  if (nh && d.allIps().some(x => x.ip === nh)) return "%Invalid next hop address (it's this router)";
  d.routes = d.routes.filter(r => !(r.prefix === prefix && r.len === len && r.nh === nh && r.iface === iface));
  d.routes.push({ prefix, len, nh, iface, ad }); dirty(ctx);
}, { no: ["ip route A.B.C.D MASK", "ip route A.B.C.D MASK (A.B.C.D|IFNAME) [A.B.C.D] [<1-255>]"] });
def("config", "ipv6 route X:X:X:X::X/<0-128> (X:X:X:X::X|IFNAME) [X:X:X:X::X] [<1-254>]", ctx => {
  const d = ctx.dev; const [pfx, len] = ctx.p[0].split("/"); let nh = null, iface = null, ad = 1; const rest = ctx.p.slice(1);
  if (isIPv6(rest[0])) nh = rest[0]; else { iface = rest[0]; if (!d.interfaces[iface]) return caret(ctx, tokenize(ctx.raw)[3]); }
  if (rest[1] && isIPv6(rest[1])) { nh = rest[1]; if (rest[2]) ad = +rest[2]; } else if (rest[1]) ad = +rest[1];
  const g = prefix6(parse6(pfx), +len);
  if (ctx.neg) { d.routes6 = d.routes6.filter(r => !(r.len === +len && r.prefix.every((x, i) => x === g[i]))); dirty(ctx); return; }
  d.routes6.push({ prefix: g, len: +len, nh, iface, ad }); dirty(ctx);
}, { no: ["ipv6 route X:X:X:X::X/<0-128>", "ipv6 route X:X:X:X::X/<0-128> (X:X:X:X::X|IFNAME) [X:X:X:X::X] [<1-254>]"] });

/* ---------- interface / range ---------- */
def("config*", "interface IFNAME", ctx => {
  const d = ctx.dev; const name = ctx.p[0];
  if (!d.interfaces[name]) {
    if (!d.creatable(name)) return caret(ctx, tokenize(ctx.raw).slice(1).join(" "));
    if (ifType(name) === "Vlan" && !d.isL3 && +name.slice(4) !== 1 && Object.values(d.interfaces).filter(i => ifType(i.name) === "Vlan").length >= 1 && false) {}
    d.ensureIface(name);
    if (ifType(name) === "Vlan") { d.interfaces[name].shutdown = false; }
  }
  const i = d.interfaces[name];
  if (ctx.neg) { if (!d.creatable(name)) return "% Cannot remove physical interface"; delete d.interfaces[name]; dirty(ctx); return; }
  ctx.session.enter(isSub(name) ? "config-subif" : "config-if", { ifaces: [i] }); dirty(ctx);
}, { no: true });
def("config*", "interface range RANGE", ctx => {
  const d = ctx.dev; const names = [];
  for (const part of ctx.p[0].split(",")) {
    const m = part.trim().match(/^([a-z-]+)\s*((?:\d+\/)*)(\d+)(?:\s*-\s*(\d+))?$/i);
    if (!m) return caret(ctx, part.trim());
    const base = parseIfName(m[1] + m[2] + m[3]); if (!base) return caret(ctx, part.trim());
    const lo = +m[3], hi = m[4] ? +m[4] : lo;
    for (let k = lo; k <= hi; k++) { const n = base.type + m[2] + k; if (!d.interfaces[n]) { if (d.creatable(n)) d.ensureIface(n); else return `% Interface ${n} does not exist`; } names.push(n); }
  }
  ctx.session.enter("config-if-range", { ifaces: names.map(n => d.interfaces[n]) });
});
const IF = ["config-if", "config-subif", "config-if-range"];
def(IF, "shutdown", ctx => { const was = snapUp(ctx); for (const i of ctx.ifaces) { i.shutdown = !ctx.neg; if (!ctx.neg) i.rt.errDisabled = false; } dirty(ctx); return linkLog(ctx, was) || undefined; }, { no: true });
def(IF, "description LINE", ctx => eachIf(ctx, i => { i.desc = ctx.neg ? "" : ctx.p[0]; }), { no: ["description", "description LINE"] });
def(IF, "ip address A.B.C.D MASK [secondary]", ctx => {
  const d = ctx.dev; const [addr, mask] = ctx.p;
  if (ctx.neg && !mask) return eachIf(ctx, i => { i.ip = null; i.secondary = []; dirty(ctx); });
  const len = maskLen(mask);
  if (len < 0) return "Bad mask 0x" + ip4(mask).toString(16).toUpperCase() + " for address " + addr;
  if (ctx.neg) return eachIf(ctx, i => { if (ctx.args.includes("secondary")) i.secondary = i.secondary.filter(s => s.addr !== addr); else { i.ip = null; i.secondary = []; } dirty(ctx); });
  if (!isValidHostAddr(addr, len) && len < 31) return `Bad mask /${len} for address ${addr}`;
  return eachIf(ctx, i => {
    if (d.isSwitch && i.switchport?.on) return "% IP addresses may not be configured on L2 links.";
    if (len === 32 && ifType(i.name) !== "Loopback") return "Bad mask /32 for address " + addr;
    const clash = d.ifaces().find(o => o !== i && o.ip && o.rt && (sameSubnet(o.ip.addr, addr, Math.min(o.ip.len, len))) && !isSub(o.name) === !isSub(i.name) && !(d.isSwitch && o.switchport?.on));
    if (clash && !(ctx.args.includes("secondary"))) return `% ${networkStr(addr, len)} overlaps with ${clash.name}`;
    if (ctx.args.includes("secondary")) { if (!i.ip) return "% Must have a primary address first"; i.secondary.push({ addr, len }); } else i.ip = { addr, len };
    dirty(ctx);
  });
}, { no: ["ip address", "ip address A.B.C.D MASK [secondary]"] });
def(IF, "ip address dhcp", ctx => eachIf(ctx, () => "% DHCP client is not simulated (use a static address)"));
def(IF, "ipv6 address X:X:X:X::X/<0-128> [eui-64]", ctx => eachIf(ctx, i => {
  if (ctx.neg && !ctx.p[0]) { i.ipv6 = []; i.ipv6LinkLocal = null; dirty(ctx); return; }
  const [a, l] = ctx.p[0].split("/"); const eui = ctx.args.includes("eui-64");
  if (ctx.neg) { i.ipv6 = i.ipv6.filter(x => !(x.len === +l && fmt6(parse6(x.addr)) === fmt6(parse6(a)))); dirty(ctx); return; }
  if (ctx.dev.isSwitch && i.switchport?.on) return "% IPv6 addresses may not be configured on L2 links.";
  i.ipv6.push({ addr: fmt6(parse6(a)), len: +l, eui64: eui }); dirty(ctx);
}), { no: ["ipv6 address", "ipv6 address X:X:X:X::X/<0-128> [eui-64]"] });
def(IF, "ipv6 address X:X:X:X::X link-local", ctx => eachIf(ctx, i => { if (ctx.neg) { i.ipv6LinkLocal = null; return; } const g = parse6(ctx.p[0]); if ((g[0] & 0xffc0) !== 0xfe80) return "% Invalid link-local address"; i.ipv6LinkLocal = fmt6(g); dirty(ctx); }), { no: true });
def(IF, "ipv6 enable", ctx => eachIf(ctx, i => { i.ipv6Enable = !ctx.neg; dirty(ctx); }), { no: true });
def(IF, "ipv6 traffic-filter WORD (in|out)", ctx => eachIf(ctx, i => { i.acl6[ctx.args[3]] = ctx.neg ? null : ctx.p[0]; }), { no: true });
def(IF, "speed (10|100|1000|auto)", ctx => eachIf(ctx, i => { i.speed = ctx.neg ? "auto" : ctx.args[1]; }), { no: ["speed", "speed (10|100|1000|auto)"] });
def(IF, "duplex (auto|full|half)", ctx => eachIf(ctx, i => { i.duplex = ctx.neg ? "auto" : ctx.args[1]; }), { no: ["duplex", "duplex (auto|full|half)"] });
def(IF, "bandwidth <1-10000000>", ctx => eachIf(ctx, i => { i.bandwidth = ctx.neg ? null : +ctx.p[0]; dirty(ctx); }), { no: ["bandwidth", "bandwidth <1-10000000>"] });
def(IF, "mtu <64-9216>", ctx => eachIf(ctx, i => { i.mtu = ctx.neg ? 1500 : +ctx.p[0]; }), { no: true });
def(IF, "clock rate <1200-8000000>", ctx => eachIf(ctx, i => { if (ifType(i.name) !== "Serial") return caret(ctx, "clock"); i.clockRate = ctx.neg ? null : +ctx.p[0]; }), { no: ["clock rate", "clock rate <1200-8000000>"] });
def(IF, "cdp enable", ctx => eachIf(ctx, i => { i.cdp = !ctx.neg; dirty(ctx); }), { no: true });
def(IF, "encapsulation dot1q <1-4094> [native]", ctx => eachIf(ctx, i => {
  if (!isSub(i.name)) return caret(ctx, "encapsulation");
  if (ctx.neg) { i.encap = null; dirty(ctx); return; }
  const v = +ctx.p[0]; const native = ctx.args.includes("native");
  const clash = ctx.dev.ifaces().find(o => o !== i && isSub(o.name) && parentOf(o.name) === parentOf(i.name) && o.encap?.vlan === v);
  if (clash) return `Command rejected: VLAN ${v} is already configured on ${clash.name}`;
  i.encap = { vlan: v, native }; dirty(ctx);
}), { no: ["encapsulation dot1q", "encapsulation dot1q <1-4094> [native]"] });
def(IF, "encapsulation dot1Q <1-4094> [native]", ctx => eachIf(ctx, i => { if (!isSub(i.name)) return caret(ctx, "encapsulation"); i.encap = { vlan: +ctx.p[0], native: ctx.args.includes("native") }; dirty(ctx); }));
/* switchport */
const needSw = (ctx, i, word) => (!ctx.dev.isSwitch || !i.switchport || isSub(i.name)) ? caret(ctx, word || "switchport") : null;
def(IF, "switchport", ctx => eachIf(ctx, i => { if (!ctx.dev.isSwitch || isSub(i.name) || ifType(i.name) === "Vlan" || ifType(i.name) === "Loopback") return caret(ctx, "switchport"); if (!i.switchport) i.switchport = { on: true, mode: "dynamic auto", access: 1, voice: null, native: 1, allowed: null, nonegotiate: false }; if (ctx.neg) { if (!ctx.dev.isL3) return caret(ctx, "switchport"); i.switchport.on = false; i.ip = null; } else { i.switchport.on = true; i.ip = null; } dirty(ctx); }), { no: true });
def(IF, "switchport mode (access|trunk)", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; if (!i.switchport.on) return "Command rejected: An interface whose trunk encapsulation is \"Auto\" can not be configured to \"trunk\" mode."; i.switchport.mode = ctx.neg ? "dynamic auto" : ctx.args[2]; dirty(ctx); }), { no: ["switchport mode", "switchport mode (access|trunk)"] });
def(IF, "switchport mode dynamic (auto|desirable)", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; i.switchport.mode = ctx.neg ? "dynamic auto" : "dynamic " + ctx.args[3]; dirty(ctx); }), { no: true });
def(IF, "switchport access vlan <1-4094>", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; const v = +ctx.p[0]; if (ctx.neg) { i.switchport.access = 1; dirty(ctx); return; } let msg; if (!ctx.dev.vlans[v]) { ctx.dev.vlans[v] = { name: vlanName(v) }; msg = `% Access VLAN does not exist. Creating vlan ${v}`; } i.switchport.access = v; dirty(ctx); return msg; }), { no: ["switchport access vlan", "switchport access vlan <1-4094>"] });
def(IF, "switchport voice vlan <1-4094>", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; const v = +ctx.p[0]; if (ctx.neg) { i.switchport.voice = null; dirty(ctx); return; } let msg; if (!ctx.dev.vlans[v]) { ctx.dev.vlans[v] = { name: vlanName(v) }; msg = `% Voice VLAN does not exist. Creating vlan ${v}`; } i.switchport.voice = v; dirty(ctx); return msg; }), { no: ["switchport voice vlan", "switchport voice vlan <1-4094>"] });
def(IF, "switchport trunk native vlan <1-4094>", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; i.switchport.native = ctx.neg ? 1 : +ctx.p[0]; dirty(ctx); }), { no: ["switchport trunk native vlan", "switchport trunk native vlan <1-4094>"] });
def(IF, "switchport trunk encapsulation (dot1q|isl|negotiate)", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; if (ctx.dev.model !== "l3switch") return caret(ctx, "encapsulation"); }), { no: true });
def(IF, "switchport trunk allowed vlan (all|none|LINE)", ctx => eachIf(ctx, i => {
  const e = needSw(ctx, i); if (e) return e; const s = i.switchport;
  if (ctx.neg || ctx.args[4] === "all") { s.allowed = null; dirty(ctx); return; }
  if (ctx.args[4] === "none") { s.allowed = new Set(); dirty(ctx); return; }
  const words = tokenize(ctx.p[0]); const op = ["add", "remove", "except"].includes(words[0]) ? words.shift() : null;
  const set = parseRange(words.join(""), 1, 4094); if (!set) return caret(ctx, words[0]);
  if (op === "add") { s.allowed = s.allowed ? new Set([...s.allowed, ...set]) : new Set([...Array.from({ length: 4094 }, (_, k) => k + 1)]); }
  else if (op === "remove") { s.allowed = new Set([...(s.allowed || Array.from({ length: 4094 }, (_, k) => k + 1))].filter(v => !set.has(v))); }
  else if (op === "except") { s.allowed = new Set(Array.from({ length: 4094 }, (_, k) => k + 1).filter(v => !set.has(v))); }
  else s.allowed = set;
  if (s.allowed && s.allowed.size === 4094) s.allowed = null;
  dirty(ctx);
}), { no: ["switchport trunk allowed vlan", "switchport trunk allowed vlan (all|none|LINE)"] });
def(IF, "switchport nonegotiate", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; if (!ctx.neg && i.switchport.mode.startsWith("dynamic")) return "Command rejected: Conflict between 'nonegotiate' and 'dynamic' status."; i.switchport.nonegotiate = !ctx.neg; dirty(ctx); }), { no: true });
def(IF, "switchport port-security", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; if (!ctx.neg && i.switchport.mode.startsWith("dynamic")) return "Command rejected: " + i.name + " is a dynamic port."; i.portsec.on = !ctx.neg; if (ctx.neg) { i.rt.errDisabled = false; } dirty(ctx); }), { no: true });
def(IF, "switchport port-security maximum <1-3072>", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; i.portsec.max = ctx.neg ? 1 : +ctx.p[0]; dirty(ctx); }), { no: ["switchport port-security maximum", "switchport port-security maximum <1-3072>"] });
def(IF, "switchport port-security violation (protect|restrict|shutdown)", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; i.portsec.violation = ctx.neg ? "shutdown" : ctx.args[3]; dirty(ctx); }), { no: ["switchport port-security violation", "switchport port-security violation (protect|restrict|shutdown)"] });
def(IF, "switchport port-security mac-address sticky", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; i.portsec.sticky = !ctx.neg; if (ctx.neg) i.portsec.macs = i.portsec.macs.filter(m => !m.sticky); dirty(ctx); }), { no: true });
def(IF, "switchport port-security mac-address [sticky] H.H.H", ctx => eachIf(ctx, i => { const e = needSw(ctx, i); if (e) return e; const mac = ctx.p[0].toLowerCase(); const sticky = ctx.args.includes("sticky"); if (ctx.neg) { i.portsec.macs = i.portsec.macs.filter(m => m.mac !== mac); dirty(ctx); return; } if (i.portsec.macs.length >= i.portsec.max && !i.portsec.macs.some(m => m.mac === mac)) return `Total secure mac-addresses on interface ${i.name} has reached maximum limit.`; if (!i.portsec.macs.some(m => m.mac === mac)) i.portsec.macs.push({ mac, sticky }); dirty(ctx); }), { no: true });
def(IF, "spanning-tree portfast [edge]", ctx => eachIf(ctx, i => { if (!ctx.dev.isSwitch) return caret(ctx, "spanning-tree"); i.stp.portfast = !ctx.neg; dirty(ctx); if (!ctx.neg && i.rt.opMode === "trunk") return "%Warning: portfast should only be enabled on ports connected to a single\n host. Connecting hubs, concentrators, switches, bridges, etc... to this\n interface  when portfast is enabled, can cause temporary bridging loops.\n Use with CAUTION"; return !ctx.neg ? `%Warning: portfast should only be enabled on ports connected to a single\n host. Connecting hubs, concentrators, switches, bridges, etc... to this\n interface  when portfast is enabled, can cause temporary bridging loops.\n Use with CAUTION\n\n%Portfast has been configured on ${i.name} but will only\n have effect when the interface is in a non-trunking mode.` : undefined; }), { no: true });
def(IF, "spanning-tree portfast (disable|trunk)", ctx => eachIf(ctx, i => { i.stp.portfast = ctx.args[2] === "trunk"; dirty(ctx); }));
def(IF, "spanning-tree bpduguard (enable|disable)", ctx => eachIf(ctx, i => { if (!ctx.dev.isSwitch) return caret(ctx, "spanning-tree"); i.stp.bpduguard = !ctx.neg && ctx.args[2] === "enable"; dirty(ctx); }), { no: ["spanning-tree bpduguard", "spanning-tree bpduguard (enable|disable)"] });
def(IF, "spanning-tree cost <1-200000000>", ctx => eachIf(ctx, i => { i.stp.cost = ctx.neg ? null : +ctx.p[0]; dirty(ctx); }), { no: ["spanning-tree cost", "spanning-tree cost <1-200000000>"] });
def(IF, "spanning-tree vlan <1-4094> cost <1-200000000>", ctx => eachIf(ctx, i => { i.stp.cost = ctx.neg ? null : +ctx.p[1]; dirty(ctx); }), { no: true });
def(IF, "spanning-tree port-priority <0-240>", ctx => eachIf(ctx, i => { i.stp.priority = ctx.neg ? null : +ctx.p[0]; dirty(ctx); }), { no: true });
def(IF, "channel-group <1-128> mode (active|passive|on|desirable|auto)", ctx => eachIf(ctx, i => {
  if (!ctx.dev.isSwitch || !isPhysical(i.name)) return caret(ctx, "channel-group");
  if (ctx.neg) { i.channelGroup = null; dirty(ctx); return; }
  const id = +ctx.p[0], mode = ctx.args[3];
  const others = ctx.dev.ifaces().filter(o => o !== i && o.channelGroup?.id === id);
  if (others.length && others.some(o => o.channelGroup.mode !== mode && !(/active|passive/.test(mode) && /active|passive/.test(o.channelGroup.mode)) && !(/desirable|auto/.test(mode) && /desirable|auto/.test(o.channelGroup.mode)))) return `Command rejected (Port-channel${id}): the protocol of this port is different from the channel group's`;
  i.channelGroup = { id, mode };
  const created = !ctx.dev.interfaces["Port-channel" + id];
  const po = ctx.dev.ensureIface("Port-channel" + id);
  if (created && i.switchport) { po.switchport = JSON.parse(JSON.stringify({ ...i.switchport, allowed: i.switchport.allowed ? [...i.switchport.allowed] : null })); if (po.switchport.allowed) po.switchport.allowed = new Set(po.switchport.allowed); }
  dirty(ctx);
  return created ? `Creating a port-channel interface Port-channel ${id}` : undefined;
}), { no: ["channel-group <1-128>", "channel-group <1-128> mode (active|passive|on|desirable|auto)"] });
/* L3 interface subcommands */
def(IF, "ip access-group (WORD|<1-2699>) (in|out)", ctx => eachIf(ctx, i => { if (ctx.dev.isSwitch && i.switchport?.on) return caret(ctx, "access-group"); i.acl[ctx.args[3]] = ctx.neg ? null : ctx.p[0]; dirty(ctx); }), { no: true });
def(IF, "ip nat (inside|outside)", ctx => eachIf(ctx, i => { if (!ctx.dev.isL3 || (ctx.dev.isSwitch && i.switchport?.on)) return caret(ctx, "nat"); i.nat = ctx.neg ? null : ctx.args[2]; dirty(ctx); }), { no: true });
def(IF, "ip helper-address A.B.C.D", ctx => eachIf(ctx, i => { if (ctx.neg) i.helper = i.helper.filter(h => h !== ctx.p[0]); else if (!i.helper.includes(ctx.p[0])) i.helper.push(ctx.p[0]); dirty(ctx); }), { no: true });
def(IF, "ip ospf <1-65535> area <0-4294967295>", ctx => eachIf(ctx, i => { if (ctx.neg) { i.ospf = null; dirty(ctx); return; } const pid = +ctx.p[0]; if (!ctx.dev.ospf) ctx.dev.ospf = newOspf(pid); i.ospf = { pid, area: +ctx.p[1] }; dirty(ctx); }), { no: true });
def(IF, "ip ospf cost <1-65535>", ctx => eachIf(ctx, i => { i.ospfCost = ctx.neg ? null : +ctx.p[0]; dirty(ctx); }), { no: ["ip ospf cost", "ip ospf cost <1-65535>"] });
def(IF, "ip ospf priority <0-255>", ctx => eachIf(ctx, i => { i.ospfPriority = ctx.neg ? 1 : +ctx.p[0]; dirty(ctx); }), { no: ["ip ospf priority", "ip ospf priority <0-255>"] });
def(IF, "ip ospf network (point-to-point|broadcast)", ctx => eachIf(ctx, i => { i.ospfNetwork = ctx.neg ? null : ctx.args[3]; dirty(ctx); }), { no: ["ip ospf network", "ip ospf network (point-to-point|broadcast)"] });
def(IF, "ip ospf (hello-interval|dead-interval) <1-65535>", () => {}, { no: true });
def(IF, "ipv6 ospf <1-65535> area <0-4294967295>", ctx => eachIf(ctx, i => { i.ipv6Ospf = ctx.neg ? null : { pid: +ctx.p[0], area: +ctx.p[1] }; }), { no: true });
def(IF, "no switchport", ctx => eachIf(ctx, i => { if (!ctx.dev.isL3 || !ctx.dev.isSwitch) return caret(ctx, "switchport"); if (i.switchport) i.switchport.on = false; dirty(ctx); }), { noOnly: true });

/* ---------- vlan ---------- */
def("config*", "vlan <1-4094>", ctx => { const d = ctx.dev; if (!d.isSwitch) return caret(ctx, "vlan"); const v = +ctx.p[0]; if (ctx.neg) { if (v === 1 || v >= 1002 && v <= 1005) return `%Default VLAN ${v} may not be deleted.`; delete d.vlans[v]; dirty(ctx); return; } if (!d.vlans[v]) d.vlans[v] = { name: vlanName(v) }; ctx.session.enter("config-vlan", { vlans: [v] }); dirty(ctx); }, { no: true });
def("config*", "vlan WORD", ctx => { const d = ctx.dev; if (!d.isSwitch) return caret(ctx, "vlan"); const set = parseRange(ctx.p[0], 1, 4094); if (!set) return caret(ctx, ctx.p[0]); if (ctx.neg) { for (const v of set) if (v !== 1) delete d.vlans[v]; dirty(ctx); return; } for (const v of set) if (!d.vlans[v]) d.vlans[v] = { name: vlanName(v) }; ctx.session.enter("config-vlan", { vlans: [...set] }); dirty(ctx); }, { no: true });
def("config-vlan", "name WORD", ctx => { for (const v of ctx.vlans) { if (v === 1 || v >= 1002) return `Default VLAN ${v} may not have its name changed.`; if (!ctx.dev.vlans[v]) continue; ctx.dev.vlans[v].name = ctx.neg ? vlanName(v) : ctx.p[0]; } }, { no: ["name", "name WORD"] });
def("config-vlan", "state (active|suspend)", () => {});
def("config", "spanning-tree mode (pvst|rapid-pvst|mst)", ctx => { if (!ctx.dev.isSwitch) return caret(ctx, "spanning-tree"); ctx.dev.stpMode = ctx.neg ? "pvst" : ctx.args[2]; dirty(ctx); }, { no: ["spanning-tree mode", "spanning-tree mode (pvst|rapid-pvst|mst)"] });
def("config", "spanning-tree vlan WORD priority <0-61440>", ctx => { if (!ctx.dev.isSwitch) return caret(ctx, "spanning-tree"); const set = parseRange(ctx.p[0], 1, 4094); if (!set) return caret(ctx, ctx.p[0]); const pri = +ctx.p[1]; if (pri % 4096) return "% Bridge Priority must be in increments of 4096.\n% Allowed values are:\n  0     4096  8192  12288 16384 20480 24576 28672\n  32768 36864 40960 45056 49152 53248 57344 61440"; for (const v of set) { if (ctx.neg) delete ctx.dev.stpPriority[v]; else ctx.dev.stpPriority[v] = pri; } dirty(ctx); }, { no: ["spanning-tree vlan WORD priority", "spanning-tree vlan WORD priority <0-61440>", "spanning-tree vlan WORD"] });
def("config", "spanning-tree vlan WORD root (primary|secondary)", ctx => { if (!ctx.dev.isSwitch) return caret(ctx, "spanning-tree"); const set = parseRange(ctx.p[0], 1, 4094); if (!set) return caret(ctx, ctx.p[0]); conv(ctx); for (const v of set) { if (ctx.neg) { delete ctx.dev.stpPriority[v]; continue; } if (ctx.args[4] === "secondary") { ctx.dev.stpPriority[v] = 28672; continue; } const inst = ctx.dev.rt.stp?.[v]; const cur = inst ? inst.rootId.pri - v : 32768; ctx.dev.stpPriority[v] = cur > 24576 ? 24576 : Math.max(0, cur - 4096); } dirty(ctx); }, { no: true });
def("config", "spanning-tree portfast default", ctx => { ctx.dev.stpPortfastDefault = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "spanning-tree portfast edge default", ctx => { ctx.dev.stpPortfastDefault = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "spanning-tree portfast bpduguard default", ctx => { ctx.dev.stpBpduguardDefault = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "spanning-tree portfast edge bpduguard default", ctx => { ctx.dev.stpBpduguardDefault = !ctx.neg; dirty(ctx); }, { no: true });
def("config", "spanning-tree extend system-id", () => {}, { no: true });
def("config", "errdisable recovery cause LINE", () => {}, { no: true });
def("config", "vtp (mode|domain|password|version) LINE", () => {}, { no: true });

/* ---------- line ---------- */
def("config*", "line (con|console) 0", ctx => { ctx.session.enter("config-line", { lines: ["con 0"] }); });
def("config*", "line vty <0-15> [<1-15>]", ctx => {
  const lo = +ctx.p[0], hi = ctx.p[1] !== undefined ? +ctx.p[1] : lo; if (hi < lo) return "% Invalid range";
  const keys = []; if (lo <= 4) keys.push("vty 0 4"); if (hi >= 5) { ctx.dev.lines["vty 5 15"] ||= { password: null, login: "none", transport: ["telnet", "ssh"], execTimeout: null, logSync: false }; keys.push("vty 5 15"); }
  ctx.session.enter("config-line", { lines: keys });
});
def("config*", "line aux 0", ctx => { if (ctx.dev.isSwitch) return caret(ctx, "aux"); ctx.dev.lines["aux 0"] ||= { password: null, login: "none", transport: null }; ctx.session.enter("config-line", { lines: ["aux 0"] }); });
const LN = "config-line"; const eachLine = (ctx, fn) => { for (const k of ctx.lines) fn(ctx.dev.lines[k], k); };
def(LN, "password WORD", ctx => eachLine(ctx, l => { l.password = ctx.neg ? null : storePw(ctx.dev, ctx.p[0]); }), { no: ["password", "password WORD"] });
def(LN, "password (0|7) WORD", ctx => eachLine(ctx, l => { l.password = ctx.args[1] === "7" ? { enc7: ctx.p[0] } : storePw(ctx.dev, ctx.p[0]); }));
def(LN, "login", ctx => { if (!ctx.neg && ctx.lines.some(k => !ctx.dev.lines[k].password)) { eachLine(ctx, l => { l.login = "line"; }); return "% Login disabled on line " + (ctx.lines[0].startsWith("con") ? "0" : "66") + ", until 'password' is set"; } eachLine(ctx, l => { l.login = ctx.neg ? "none" : "line"; }); }, { no: true });
def(LN, "login local", ctx => eachLine(ctx, l => { l.login = ctx.neg ? "none" : "local"; }), { no: true });
def(LN, "transport input (ssh|telnet|all|none) [(ssh|telnet)]", ctx => eachLine(ctx, (l, k) => { if (!k.startsWith("vty")) return; if (ctx.neg) { l.transport = ["telnet", "ssh"]; return; } const w = ctx.args.slice(2); l.transport = w.includes("all") ? ["telnet", "ssh"] : w.includes("none") ? [] : w; }), { no: ["transport input", "transport input (ssh|telnet|all|none) [(ssh|telnet)]"] });
def(LN, "transport output LINE", () => {}, { no: true });
def(LN, "exec-timeout <0-35791> [<0-2147483>]", ctx => eachLine(ctx, l => { l.execTimeout = ctx.neg ? null : ctx.p.join(" "); }), { no: ["exec-timeout", "exec-timeout <0-35791> [<0-2147483>]"] });
def(LN, "logging synchronous", ctx => eachLine(ctx, l => { l.logSync = !ctx.neg; }), { no: true });
def(LN, "privilege level <0-15>", () => {}, { no: true });
def(LN, "history size <0-256>", () => {}, { no: true });

/* ---------- router ospf ---------- */
function newOspf(pid) { return { pid, routerId: null, networks: [], passive: new Set(), noPassive: new Set(), passiveDefault: false, defOrig: null, refBw: 100 }; }
def("config*", "router ospf <1-65535>", ctx => { const d = ctx.dev; if (!d.isL3) return caret(ctx, "router"); if (d.isSwitch && !d.ipRouting) return "IP routing not enabled"; if (ctx.neg) { if (d.ospf?.pid === +ctx.p[0]) { d.ospf = null; for (const i of d.ifaces()) i.ospf = null; } dirty(ctx); return; } if (d.ospf && d.ospf.pid !== +ctx.p[0]) return "% Only one OSPF process is simulated"; d.ospf ||= newOspf(+ctx.p[0]); ctx.session.enter("config-router"); dirty(ctx); }, { no: true });
def("config", "router (rip|eigrp|bgp) [LINE]", ctx => `% ${ctx.args[1].toUpperCase()} is outside the CCNA 200-301 blueprint and is not simulated`);
const RO = "config-router";
def(RO, "network A.B.C.D A.B.C.D area <0-4294967295>", ctx => { const o = ctx.dev.ospf; const [addr, wild, area] = ctx.p; if (ctx.neg) { o.networks = o.networks.filter(n => !(n.addr === addr && n.wild === wild)); dirty(ctx); return; } if (isMask(wild) && wild !== "0.0.0.0" && wild !== "255.255.255.255" && maskLen(wild) > 0) { /* IOS accepts a mask and inverts it */ } const w = isMask(wild) && wild !== "0.0.0.0" && wild !== "255.255.255.255" ? wildcardStr(maskLen(wild)) : wild; if (!o.networks.some(n => n.addr === addr && n.wild === w)) o.networks.push({ addr, wild: w, area: +area }); dirty(ctx); }, { no: true });
def(RO, "network A.B.C.D A.B.C.D", () => "% Incomplete command.");
def(RO, "router-id A.B.C.D", ctx => { ctx.dev.ospf.routerId = ctx.neg ? null : ctx.p[0]; dirty(ctx); return ctx.neg ? undefined : "Reload or use \"clear ip ospf process\" command, for this to take effect"; }, { no: ["router-id", "router-id A.B.C.D"] });
def(RO, "passive-interface IFNAME", ctx => { const o = ctx.dev.ospf; const n = ctx.p[0]; if (!ctx.dev.interfaces[n]) return caret(ctx, tokenize(ctx.raw).slice(1).join(" ")); if (o.passiveDefault) { if (ctx.neg) o.noPassive.add(n); else o.noPassive.delete(n); } else { if (ctx.neg) o.passive.delete(n); else o.passive.add(n); } dirty(ctx); }, { no: true });
def(RO, "passive-interface default", ctx => { const o = ctx.dev.ospf; o.passiveDefault = !ctx.neg; o.passive.clear(); o.noPassive.clear(); dirty(ctx); }, { no: true });
def(RO, "default-information originate [always]", ctx => { ctx.dev.ospf.defOrig = ctx.neg ? null : { on: true, always: ctx.args.includes("always") }; dirty(ctx); }, { no: ["default-information originate", "default-information originate [always]"] });
def(RO, "auto-cost reference-bandwidth <1-4294967>", ctx => { ctx.dev.ospf.refBw = ctx.neg ? 100 : +ctx.p[0]; dirty(ctx); return ctx.neg ? undefined : "% OSPF: Reference bandwidth is changed.\n        Please ensure reference bandwidth is consistent across all routers."; }, { no: ["auto-cost reference-bandwidth", "auto-cost reference-bandwidth <1-4294967>", "auto-cost"] });
def(RO, "log-adjacency-changes [detail]", () => {}, { no: true });
def(RO, "maximum-paths <1-32>", () => {}, { no: true });
def(RO, "area <0-4294967295> LINE", () => {}, { no: true });
def(RO, "redistribute LINE", () => "% Redistribution is outside the simulated CCNA subset", { no: true });

/* ---------- ACLs ---------- */
function parseAddr(w, k, std) {       // returns {addr, wild, next} or {err: token}
  const t = w[k];
  if (!t) return { err: null };
  if (t === "any") return { addr: "0.0.0.0", wild: "255.255.255.255", next: k + 1 };
  if (t === "host") { if (!isIPv4(w[k + 1])) return { err: w[k + 1] ?? null }; return { addr: w[k + 1], wild: "0.0.0.0", next: k + 2 }; }
  if (!isIPv4(t)) return { err: t };
  if (isIPv4(w[k + 1])) return { addr: t, wild: w[k + 1], next: k + 2 };
  if (std) return { addr: t, wild: "0.0.0.0", next: k + 1 };
  return { err: w[k + 1] ?? null };
}
function parsePort(w, k) {
  const ops = ["eq", "gt", "lt", "neq", "range"]; if (!ops.includes(w[k])) return { next: k };
  const num = x => x === undefined ? null : (/^\d+$/.test(x) ? +x : PORT_NAMES[x] ?? null);
  const a = num(w[k + 1]); if (a === null) return { err: w[k + 1] ?? null };
  if (w[k] === "range") { const b = num(w[k + 2]); if (b === null) return { err: w[k + 2] ?? null }; return { port: { op: "range", a, b }, next: k + 3 }; }
  return { port: { op: w[k], a }, next: k + 2 };
}
function parseEntry(acl, action, line, ctx) {
  const w = tokenize(line.toLowerCase()); const e = { action, seq: null };
  let k = 0;
  if (acl.type === "standard") {
    const s = parseAddr(w, 0, true); if (s.err !== undefined) return { err: s.err };
    e.src = s.addr; e.srcWild = s.wild; k = s.next;
  } else {
    const proto = w[0]; if (!proto) return { err: null };
    if (!["ip", "tcp", "udp", "icmp", "ospf", "eigrp", "gre", "esp", "ahp"].includes(proto) && !/^\d+$/.test(proto)) return { err: proto };
    e.proto = proto;
    const s = parseAddr(w, 1, false); if (s.err !== undefined) return { err: s.err };
    e.src = s.addr; e.srcWild = s.wild; k = s.next;
    if (proto === "tcp" || proto === "udp") { const p = parsePort(w, k); if (p.err !== undefined) return { err: p.err }; e.srcPort = p.port || null; k = p.next; }
    const d = parseAddr(w, k, false); if (d.err !== undefined) return { err: d.err };
    e.dst = d.addr; e.dstWild = d.wild; k = d.next;
    if (proto === "tcp" || proto === "udp") { const p = parsePort(w, k); if (p.err !== undefined) return { err: p.err }; e.dstPort = p.port || null; k = p.next; }
    if (proto === "icmp" && w[k] && ["echo", "echo-reply", "unreachable", "ttl-exceeded"].includes(w[k])) { e.icmp = w[k]; k++; }
    if (w[k] === "established") { if (proto !== "tcp") return { err: "established" }; e.established = true; k++; }
  }
  if (w[k] === "log" || w[k] === "log-input") { e.log = true; k++; }
  if (k < w.length) return { err: w[k] };
  return { entry: e };
}
function addEntry(ctx, acl, action, line, seq) {
  const r = parseEntry(acl, action, line, ctx);
  if (r.err !== undefined) return r.err === null ? "% Incomplete command." : caret(ctx, r.err);
  const e = r.entry;
  if (acl.entries.some(x => x.remark === undefined && JSON.stringify({ ...x, seq: 0 }) === JSON.stringify({ ...e, seq: 0 }))) return "% Duplicate entry";
  e.seq = seq ?? (acl.entries.length ? Math.max(...acl.entries.map(x => x.seq)) + 10 : 10);
  if (acl.entries.some(x => x.seq === e.seq)) return "% Duplicate sequence number.";
  acl.entries.push(e); acl.entries.sort((a, b) => a.seq - b.seq); dirty(ctx);
}
function aclTypeOfNumber(n) { n = +n; if ((n >= 1 && n <= 99) || (n >= 1300 && n <= 1999)) return "standard"; if ((n >= 100 && n <= 199) || (n >= 2000 && n <= 2699)) return "extended"; return null; }
def("config", "access-list <1-2699> (permit|deny) LINE", ctx => {
  const d = ctx.dev; const n = ctx.p[0]; const type = aclTypeOfNumber(n); if (!type) return caret(ctx, n);
  if (ctx.neg) { if (!d.acls[n]) return; const r = parseEntry(d.acls[n], ctx.args[2], ctx.p[1], ctx); if (r.entry) { d.acls[n].entries = d.acls[n].entries.filter(e => JSON.stringify({ ...e, seq: 0 }) !== JSON.stringify({ ...r.entry, seq: 0 })); if (!d.acls[n].entries.length) delete d.acls[n]; } dirty(ctx); return; }
  const acl = d.acls[n] ||= { name: n, type, numbered: true, entries: [] };
  return addEntry(ctx, acl, ctx.args[2], ctx.p[1]);
}, { no: ["access-list <1-2699>", "access-list <1-2699> (permit|deny) LINE"] });
def("config", "access-list <1-2699> remark LINE", ctx => { const d = ctx.dev; const n = ctx.p[0]; const type = aclTypeOfNumber(n); if (!type) return caret(ctx, n); const acl = d.acls[n] ||= { name: n, type, numbered: true, entries: [] }; (acl.remark ||= []).push(ctx.p[1]); });
def("config", "no access-list <1-2699>", ctx => { delete ctx.dev.acls[ctx.p[0]]; dirty(ctx); }, { noOnly: true });
def("config*", "ip access-list (standard|extended) (WORD|<1-2699>)", ctx => {
  const d = ctx.dev; const type = ctx.args[2], name = ctx.p[0];
  if (/^\d+$/.test(name) && aclTypeOfNumber(name) !== type) return caret(ctx, name);
  if (ctx.neg) { delete d.acls[name]; dirty(ctx); return; }
  if (d.acls[name] && d.acls[name].type !== type) return `% Access-list ${name} already exists as ${d.acls[name].type}`;
  d.acls[name] ||= { name, type, numbered: /^\d+$/.test(name), entries: [] };
  ctx.session.enter(type === "standard" ? "config-std-nacl" : "config-ext-nacl", { acl: d.acls[name] });
}, { no: true });
const NACL = ["config-std-nacl", "config-ext-nacl"];
def(NACL, "(permit|deny) LINE", ctx => { if (ctx.neg) { const r = parseEntry(ctx.acl, ctx.args[0], ctx.p[0], ctx); if (r.entry) ctx.acl.entries = ctx.acl.entries.filter(e => JSON.stringify({ ...e, seq: 0 }) !== JSON.stringify({ ...r.entry, seq: 0 })); dirty(ctx); return; } return addEntry(ctx, ctx.acl, ctx.args[0], ctx.p[0]); }, { no: true });
def(NACL, "<1-2147483647> (permit|deny) LINE", ctx => addEntry(ctx, ctx.acl, ctx.args[1], ctx.p[1], +ctx.p[0]));
def(NACL, "remark LINE", ctx => { ctx.acl.entries.push({ seq: ctx.acl.entries.length ? Math.max(...ctx.acl.entries.map(x => x.seq)) + 10 : 10, remark: ctx.p[0] }); });
def(NACL, "no <1-2147483647>", ctx => { ctx.acl.entries = ctx.acl.entries.filter(e => e.seq !== +ctx.p[0]); dirty(ctx); }, { noOnly: true });
def("config", "ipv6 access-list WORD", ctx => "% IPv6 ACLs are outside the simulated subset (see dev/specs/ccna.md)");

/* ---------- NAT ---------- */
def("config", "ip nat pool WORD A.B.C.D A.B.C.D netmask MASK", ctx => { const [name, a, b, m] = ctx.p; if (ctx.neg) { delete ctx.dev.nat.pools[name]; dirty(ctx); return; } if (ip4(b) < ip4(a)) return "%End address less than start address"; ctx.dev.nat.pools[name] = { start: a, end: b, len: maskLen(m) }; dirty(ctx); }, { no: ["ip nat pool WORD", "ip nat pool WORD A.B.C.D A.B.C.D netmask MASK"] });
def("config", "ip nat pool WORD A.B.C.D A.B.C.D prefix-length <1-32>", ctx => { const [name, a, b, l] = ctx.p; ctx.dev.nat.pools[name] = { start: a, end: b, len: +l }; dirty(ctx); });
def("config", "ip nat inside source list (WORD|<1-2699>) interface IFNAME [overload]", ctx => { const d = ctx.dev; const [list, iface] = ctx.p; if (!d.interfaces[iface]) return caret(ctx, tokenize(ctx.raw)[7]); if (ctx.neg) { d.nat.dynamic = d.nat.dynamic.filter(r => !(r.list === list && r.iface === iface)); d.rt.nat = []; dirty(ctx); return; } d.nat.dynamic.push({ list, iface, overload: ctx.args.includes("overload") }); dirty(ctx); }, { no: true });
def("config", "ip nat inside source list (WORD|<1-2699>) pool WORD [overload]", ctx => { const d = ctx.dev; const [list, pool] = ctx.p; if (ctx.neg) { d.nat.dynamic = d.nat.dynamic.filter(r => !(r.list === list && r.pool === pool)); d.rt.nat = []; dirty(ctx); return; } if (!d.nat.pools[pool]) return `%Pool ${pool} not found`; d.nat.dynamic.push({ list, pool, overload: ctx.args.includes("overload") }); dirty(ctx); }, { no: true });
def("config", "ip nat inside source static A.B.C.D A.B.C.D", ctx => { const d = ctx.dev; const [il, ig] = ctx.p; if (ctx.neg) { d.nat.static = d.nat.static.filter(s => !(s.il === il && s.ig === ig)); dirty(ctx); return; } if (d.nat.static.some(s => s.il === il && !s.proto)) return `% ${il} already mapped (${il} -> ${d.nat.static.find(s => s.il === il).ig})`; d.nat.static.push({ il, ig }); dirty(ctx); }, { no: true });
def("config", "ip nat inside source static (tcp|udp) A.B.C.D <1-65535> A.B.C.D <1-65535>", ctx => { const d = ctx.dev; const [il, ilPort, ig, igPort] = ctx.p; const proto = ctx.args[5]; if (ctx.neg) { d.nat.static = d.nat.static.filter(s => !(s.il === il && s.proto === proto && s.ilPort === +ilPort)); dirty(ctx); return; } d.nat.static.push({ il, ig, proto, ilPort: +ilPort, igPort: +igPort }); dirty(ctx); }, { no: true });
def("config", "ip nat (inside|outside) LINE", ctx => caret(ctx, tokenize(ctx.p[0])[0]));

/* ---------- DHCP ---------- */
def("config", "ip dhcp excluded-address A.B.C.D [A.B.C.D]", ctx => { const d = ctx.dev; const lo = ctx.p[0], hi = ctx.p[1] || lo; if (ctx.neg) { d.dhcp.excluded = d.dhcp.excluded.filter(x => !(x.lo === lo && x.hi === hi)); dirty(ctx); return; } if (ip4(hi) < ip4(lo)) return "% Invalid address range"; d.dhcp.excluded.push({ lo, hi }); dirty(ctx); }, { no: true });
def("config*", "ip dhcp pool WORD", ctx => { const d = ctx.dev; if (ctx.neg) { delete d.dhcp.pools[ctx.p[0]]; dirty(ctx); return; } d.dhcp.pools[ctx.p[0]] ||= { name: ctx.p[0], network: null, len: 24, router: null, dns: [], domain: null, lease: null }; ctx.session.enter("config-dhcp", { pool: d.dhcp.pools[ctx.p[0]] }); }, { no: true });
def("config", "service dhcp", () => {}, { no: true });
const DH = "config-dhcp";
def(DH, "network A.B.C.D (MASK|WORD)", ctx => { if (ctx.neg && !ctx.p[1]) { ctx.pool.network = null; dirty(ctx); return; } const m = ctx.p[1]; const len = m.startsWith("/") ? +m.slice(1) : maskLen(m); if (isNaN(len) || len < 1 || len > 31) return caret(ctx, m); if (ctx.neg) { ctx.pool.network = null; dirty(ctx); return; } ctx.pool.network = networkStr(ctx.p[0], len); ctx.pool.len = len; dirty(ctx); }, { no: ["network", "network A.B.C.D (MASK|WORD)"] });
def(DH, "default-router A.B.C.D [A.B.C.D]", ctx => { ctx.pool.router = ctx.neg ? null : ctx.p[0]; dirty(ctx); }, { no: ["default-router", "default-router A.B.C.D [A.B.C.D]"] });
def(DH, "dns-server A.B.C.D [A.B.C.D] [A.B.C.D]", ctx => { ctx.pool.dns = ctx.neg ? [] : ctx.p.slice(); dirty(ctx); }, { no: ["dns-server", "dns-server A.B.C.D [A.B.C.D] [A.B.C.D]"] });
def(DH, "domain-name WORD", ctx => { ctx.pool.domain = ctx.neg ? null : ctx.p[0]; }, { no: ["domain-name", "domain-name WORD"] });
def(DH, "lease (<0-365>|infinite) [<0-23>] [<0-59>]", ctx => { ctx.pool.lease = ctx.neg ? null : ctx.args.slice(1).join(" "); }, { no: ["lease", "lease (<0-365>|infinite) [<0-23>] [<0-59>]"] });
def(DH, "option <0-254> LINE", () => {}, { no: true });

/* `do` is handled by the session; `exit`/`end` above. */
export function makeSession(dev, topo) { return new Session(dev, topo, tree); }
