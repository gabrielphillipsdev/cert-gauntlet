/* Cert Gauntlet — IOS simulator: running-config rendering + password encoding. */
import { maskStr, fmtRange, fmt6, parse6 } from "./net.js";
import { ifType, isSub, isPhysical } from "./device.js";

/* IOS type-7 (Vigenère) — real algorithm, so students see familiar strings like 0822455D0A16 for "cisco". */
const XLAT = "dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87";
export function type7(pw, seed = 8) {
  let out = String(seed).padStart(2, "0");
  for (let i = 0; i < pw.length; i++) out += (pw.charCodeAt(i) ^ XLAT.charCodeAt((seed + i) % XLAT.length)).toString(16).toUpperCase().padStart(2, "0");
  return out;
}
/* type 5 — deterministic stand-in for md5crypt (same shape: $1$salt$22chars); not cryptographic. */
const B64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export function type5(pw) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let r = 0; r < 3; r++) for (let i = 0; i < pw.length; i++) { h1 = ((h1 ^ pw.charCodeAt(i)) * 16777619) >>> 0; h2 = ((h2 + pw.charCodeAt(i) * (i + 7 + r)) * 2654435761) >>> 0; }
  let s = ""; let a = h1, b = h2;
  for (let i = 0; i < 22; i++) { s += B64[(a ^ (b >>> (i % 5))) & 63]; a = ((a * 1103515245) + 12345) >>> 0; b = ((b * 214013) + 2531011) >>> 0; }
  return "$1$mERr$" + s;
}

export function renderPassword(dev, stored) {          // stored: {plain} | {enc7} ; service password-encryption applies
  if (stored.enc7) return "7 " + stored.enc7;
  return dev.servicePwEnc ? "7 " + type7(stored.plain) : stored.plain;
}

export function ifaceConfigLines(dev, i) {
  const L = []; const t = ifType(i.name);
  if (i.desc) L.push(` description ${i.desc}`);
  if (dev.isSwitch && !i.switchport?.on && (t === "GigabitEthernet" || t === "FastEthernet" || t === "TenGigabitEthernet") && !isSub(i.name) && dev.isL3) L.push(" no switchport");
  if (i.switchport?.on) {
    const s = i.switchport;
    if (s.mode === "trunk" && dev.model === "l3switch") L.push(" switchport trunk encapsulation dot1q");
    if (s.native !== 1) L.push(` switchport trunk native vlan ${s.native}`);
    if (s.allowed) L.push(` switchport trunk allowed vlan ${fmtRange(s.allowed)}`);
    if (s.access !== 1) L.push(` switchport access vlan ${s.access}`);
    if (s.mode === "trunk") L.push(" switchport mode trunk");
    else if (s.mode === "access") L.push(" switchport mode access");
    else if (s.mode === "dynamic desirable") L.push(" switchport mode dynamic desirable");
    if (s.voice) L.push(` switchport voice vlan ${s.voice}`);
    if (s.nonegotiate) L.push(" switchport nonegotiate");
    if (i.portsec.on) {
      L.push(" switchport port-security");
      if (i.portsec.max !== 1) L.push(` switchport port-security maximum ${i.portsec.max}`);
      if (i.portsec.violation !== "shutdown") L.push(` switchport port-security violation ${i.portsec.violation}`);
      if (i.portsec.sticky) L.push(" switchport port-security mac-address sticky");
      for (const m of i.portsec.macs) L.push(` switchport port-security mac-address ${m.sticky ? "sticky " : ""}${m.mac}`);
    } else if (i.portsec.macs.length || i.portsec.max !== 1 || i.portsec.sticky || i.portsec.violation !== "shutdown") {
      if (i.portsec.max !== 1) L.push(` switchport port-security maximum ${i.portsec.max}`);
      if (i.portsec.violation !== "shutdown") L.push(` switchport port-security violation ${i.portsec.violation}`);
      if (i.portsec.sticky) L.push(" switchport port-security mac-address sticky");
      for (const m of i.portsec.macs) L.push(` switchport port-security mac-address ${m.sticky ? "sticky " : ""}${m.mac}`);
    }
  }
  if (i.encap) L.push(` encapsulation dot1Q ${i.encap.vlan}${i.encap.native ? " native" : ""}`);
  if (i.bandwidth) L.push(` bandwidth ${i.bandwidth}`);
  if (i.ip) L.push(` ip address ${i.ip.addr} ${maskStr(i.ip.len)}`);
  else if (!i.switchport?.on && (t !== "Loopback") && !(dev.isSwitch && t === "Vlan") && !isSub(i.name) && t !== "Port-channel") L.push(" no ip address");
  else if (dev.isSwitch && t === "Vlan" && !i.ip) L.push(" no ip address");
  for (const s of i.secondary) L.push(` ip address ${s.addr} ${maskStr(s.len)} secondary`);
  for (const h of i.helper) L.push(` ip helper-address ${h}`);
  if (i.acl.in) L.push(` ip access-group ${i.acl.in} in`);
  if (i.acl.out) L.push(` ip access-group ${i.acl.out} out`);
  if (i.nat) L.push(` ip nat ${i.nat}`);
  if (i.ospf) L.push(` ip ospf ${i.ospf.pid} area ${i.ospf.area}`);
  if (i.ospfCost) L.push(` ip ospf cost ${i.ospfCost}`);
  if (i.ospfPriority !== 1) L.push(` ip ospf priority ${i.ospfPriority}`);
  if (i.ospfNetwork) L.push(` ip ospf network ${i.ospfNetwork}`);
  if (!dev.isSwitch && (t === "GigabitEthernet" || t === "FastEthernet") && !isSub(i.name)) {
    L.push(` duplex ${i.duplex}`); L.push(` speed ${i.speed}`);
  } else if (dev.isSwitch && i.switchport?.on) { if (i.duplex !== "auto") L.push(` duplex ${i.duplex}`); if (i.speed !== "auto") L.push(` speed ${i.speed}`); }
  if (i.ipv6Enable) L.push(" ipv6 enable");
  if (i.ipv6LinkLocal) L.push(` ipv6 address ${i.ipv6LinkLocal.toUpperCase()} link-local`);
  for (const a of i.ipv6) L.push(` ipv6 address ${fmt6Up(a.addr)}/${a.len}${a.eui64 ? " eui-64" : ""}`);
  if (i.acl6.in) L.push(` ipv6 traffic-filter ${i.acl6.in} in`);
  if (i.clockRate) L.push(` clock rate ${i.clockRate}`);
  if (i.shutdown && !(dev.isSwitch && t === "Vlan" && i.name === "Vlan1" && !i.ip && !i.desc)) L.push(" shutdown");
  if (i.channelGroup) L.push(` channel-group ${i.channelGroup.id} mode ${i.channelGroup.mode}`);
  if (i.stp.portfast) L.push(" spanning-tree portfast");
  if (i.stp.bpduguard) L.push(" spanning-tree bpduguard enable");
  if (i.stp.cost) L.push(` spanning-tree cost ${i.stp.cost}`);
  return L;
}
function fmt6Up(s) { try { return fmt6(parse6(s)).toUpperCase(); } catch { return s.toUpperCase(); } }

export function aclLines(dev, a) {
  const L = [];
  if (a.numbered) {
    for (const e of a.entries) L.push(`access-list ${a.name} ${entryText(a, e, true)}`);
    if (a.remark) for (const r of a.remark) L.push(`access-list ${a.name} remark ${r}`);
  } else {
    L.push(`ip access-list ${a.type} ${a.name}`);
    for (const e of a.entries) L.push(` ${e.remark !== undefined ? "remark " + e.remark : entryText(a, e, false)}`);
  }
  return L;
}
export function entryText(a, e, numbered) {
  if (e.remark !== undefined) return "remark " + e.remark;
  const src = e.srcWild === "0.0.0.0" ? (a.type === "standard" ? (numbered ? e.src : "host " + e.src) : "host " + e.src) : e.srcWild === "255.255.255.255" ? "any" : `${e.src} ${e.srcWild}`;
  if (a.type === "standard") return `${e.action} ${src}${e.log ? " log" : ""}`;
  const dst = e.dstWild === "0.0.0.0" ? "host " + e.dst : e.dstWild === "255.255.255.255" ? "any" : `${e.dst} ${e.dstWild}`;
  const port = p => p ? ` ${p.op} ${p.op === "range" ? portName(p.a) + " " + portName(p.b) : portName(p.a)}` : "";
  return `${e.action} ${e.proto} ${src}${port(e.srcPort)} ${dst}${port(e.dstPort)}${e.established ? " established" : ""}${e.log ? " log" : ""}`;
}
export const PORTS = { 20: "ftp-data", 21: "ftp", 22: "22", 23: "telnet", 25: "smtp", 53: "domain", 67: "bootps", 68: "bootpc", 69: "tftp", 80: "www", 110: "pop3", 123: "ntp", 143: "143", 161: "snmp", 443: "443", 514: "syslog", 3389: "3389" };
export const PORT_NAMES = { "ftp-data": 20, ftp: 21, ssh: 22, telnet: 23, smtp: 25, domain: 53, dns: 53, bootps: 67, bootpc: 68, tftp: 69, www: 80, http: 80, pop3: 110, ntp: 123, snmp: 161, https: 443, syslog: 514 };
export function portName(n) { return PORTS[n] || String(n); }

export function runningConfig(dev) {
  const L = [];
  L.push("!");
  L.push(dev.isSwitch ? "version 15.2" : "version 15.4");
  L.push("service timestamps debug datetime msec", "service timestamps log datetime msec");
  L.push(dev.servicePwEnc ? "service password-encryption" : "no service password-encryption");
  L.push("!", `hostname ${dev.hostname}`, "!", "boot-start-marker", "boot-end-marker", "!");
  if (dev.enableSecret) L.push(`enable secret 5 ${dev.enableSecret.hash}`);
  if (dev.enablePassword) L.push(`enable password ${renderPassword(dev, dev.enablePassword)}`);
  if (dev.enableSecret || dev.enablePassword) L.push("!");
  L.push("no aaa new-model", "!");
  if (dev.isSwitch && dev.isL3 && dev.ipRouting) L.push("ip routing", "!");
  const ex = dev.dhcp.excluded; if (ex.length) { for (const x of ex) L.push(`ip dhcp excluded-address ${x.lo}${x.hi !== x.lo ? " " + x.hi : ""}`); L.push("!"); }
  for (const [name, p] of Object.entries(dev.dhcp.pools)) {
    L.push(`ip dhcp pool ${name}`);
    if (p.network) L.push(` network ${p.network} ${maskStr(p.len)}`);
    if (p.router) L.push(` default-router ${p.router}`);
    if (p.dns?.length) L.push(` dns-server ${p.dns.join(" ")}`);
    if (p.domain) L.push(` domain-name ${p.domain}`);
    if (p.lease) L.push(` lease ${p.lease}`);
    L.push("!");
  }
  if (!dev.domainLookup) L.push("no ip domain-lookup");
  if (dev.domainName) L.push(`ip domain-name ${dev.domainName}`);
  if (!dev.isSwitch) L.push("ip cef");
  if (dev.ipv6Routing) L.push("ipv6 unicast-routing");
  if (!dev.isSwitch) L.push("no ipv6 cef");
  L.push("!");
  const users = Object.entries(dev.users);
  if (users.length) { for (const [u, c] of users) L.push(`username ${u}${c.priv ? " privilege " + c.priv : ""} ${c.secret ? "secret 5 " + c.secret : "password " + renderPassword(dev, c.password)}`); L.push("!"); }
  if (dev.sshVersion) { L.push(`ip ssh version ${dev.sshVersion}`); L.push("!"); }
  if (dev.isSwitch) {
    L.push(`spanning-tree mode ${dev.stpMode}`, "spanning-tree extend system-id");
    if (dev.stpPortfastDefault) L.push("spanning-tree portfast default");
    if (dev.stpBpduguardDefault) L.push("spanning-tree portfast bpduguard default");
    const byPri = {}; for (const [v, p] of Object.entries(dev.stpPriority)) (byPri[p] ||= []).push(+v);
    for (const [p, vs] of Object.entries(byPri)) L.push(`spanning-tree vlan ${fmtRange(vs)} priority ${p}`);
    L.push("!");
  }
  if (!dev.cdp) L.push("no cdp run", "!");
  if (dev.lldp) L.push("lldp run", "!");
  for (const i of dev.ifaces()) {
    if (ifType(i.name) === "Vlan" && i.name === "Vlan1" && dev.isSwitch && !i.ip && !i.desc && !i.ipv6.length) { L.push("interface Vlan1", " no ip address", i.shutdown ? " shutdown" : null, "!"); continue; }
    L.push(`interface ${i.name}`, ...ifaceConfigLines(dev, i), "!");
  }
  if (dev.ospf) {
    const o = dev.ospf; L.push(`router ospf ${o.pid}`);
    if (o.routerId) L.push(` router-id ${o.routerId}`);
    if (o.passiveDefault) { L.push(" passive-interface default"); for (const n of [...o.noPassive].sort()) L.push(` no passive-interface ${n}`); }
    else for (const n of [...o.passive].sort()) L.push(` passive-interface ${n}`);
    for (const n of o.networks) L.push(` network ${n.addr} ${n.wild} area ${n.area}`);
    if (o.defOrig?.on) L.push(` default-information originate${o.defOrig.always ? " always" : ""}`);
    if (o.refBw !== 100) L.push(` auto-cost reference-bandwidth ${o.refBw}`);
    L.push("!");
  }
  if (!dev.isSwitch) L.push("ip forward-protocol nd", "!");
  if (dev.isSwitch && dev.defaultGateway) L.push(`ip default-gateway ${dev.defaultGateway}`);
  L.push(dev.httpServer ? "ip http server" : "no ip http server", "no ip http secure-server");
  for (const [n, p] of Object.entries(dev.nat.pools)) L.push(`ip nat pool ${n} ${p.start} ${p.end} netmask ${maskStr(p.len)}`);
  for (const r of dev.nat.dynamic) L.push(`ip nat inside source list ${r.list} ${r.iface ? "interface " + r.iface : "pool " + r.pool}${r.overload ? " overload" : ""}`);
  for (const s of dev.nat.static) L.push(`ip nat inside source static ${s.proto ? s.proto + " " : ""}${s.il}${s.proto ? " " + s.ilPort : ""} ${s.ig}${s.proto ? " " + s.igPort : ""}`);
  for (const r of dev.routes) L.push(`ip route ${r.prefix} ${maskStr(r.len)} ${r.iface ? r.iface + (r.nh ? " " + r.nh : "") : r.nh}${r.ad !== 1 ? " " + r.ad : ""}`);
  L.push("!");
  const named = Object.values(dev.acls).filter(a => !a.numbered), numbered = Object.values(dev.acls).filter(a => a.numbered);
  for (const a of named) L.push(...aclLines(dev, a));
  if (named.length) L.push("!");
  for (const a of numbered) L.push(...aclLines(dev, a));
  if (numbered.length) L.push("!");
  for (const r of dev.routes6) L.push(`ipv6 route ${fmt6(r.prefix).toUpperCase()}/${r.len} ${r.iface ? r.iface + (r.nh ? " " + r.nh.toUpperCase() : "") : r.nh.toUpperCase()}${r.ad !== 1 ? " " + r.ad : ""}`);
  if (dev.routes6.length) L.push("!");
  if (dev.banner) L.push(`banner motd ^C${dev.banner}^C`, "!");
  for (const [name, ln] of Object.entries(dev.lines)) {
    L.push(`line ${name}`);
    if (ln.execTimeout) L.push(` exec-timeout ${ln.execTimeout}`);
    if (ln.password) L.push(` password ${renderPassword(dev, ln.password)}`);
    if (ln.logSync) L.push(" logging synchronous");
    if (ln.login === "line") L.push(" login"); else if (ln.login === "local") L.push(" login local");
    if (name.startsWith("vty") && ln.transport) L.push(` transport input ${ln.transport.length ? ln.transport.join(" ") : "none"}`);
    if (name === "con 0" && !dev.isSwitch) L.push("line aux 0");
  }
  L.push("!");
  for (const n of dev.ntp) L.push(`ntp server ${n}`);
  if (dev.ntp.length) L.push("!");
  L.push("end");
  const body = L.filter(x => x !== null).join("\n");
  return `Building configuration...\n\nCurrent configuration : ${body.length + 20} bytes\n${body}`;
}
export function startupConfig(dev) {
  if (!dev.startup) return "startup-config is not present";
  return `Using ${dev.startup.length} out of 262144 bytes\n` + dev.startup.replace(/^Building configuration\.\.\.\n\nCurrent configuration : \d+ bytes\n/, "");
}
