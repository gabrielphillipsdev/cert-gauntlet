/* Cert Gauntlet — CCNA lab item grader (Chat 8). No DOM. Graded on END STATE, so any configuration method that
   produces the outcome counts (Cisco: candidates "are free to use their preferred configuration options, as long as
   they produce the expected outcome").

   buildLab(item)            -> lab (core/sims/ios createLab from item.topology + item.configs)
   replay(lab, log)          -> feeds the student's per-device transcript {DEV:[lines]} back into fresh sessions
   isBlocked(item, line)     -> true when a line is a prefix of one of item.blocked (abbreviations allowed, `do` stripped)
   gradeLab(item, lab, answers) -> { f, earned, max, penalty, tasks:[{id, text, earned, max, checks}], guidelines:[{idx, text, pass, points}], checks:[{id, pass, detail, points}] }

   Check schema: { id, task: "t1" | guideline: <index into item.guidelines>, points?: 1, type, ...fields }.
   Task checks add points when they PASS; guideline checks subtract points when they FAIL. Fields per type:

   interfaceIp        device iface ip [len]              configured address (and prefix length)
   interfaceUp        device iface                       line + protocol up after converge
   interfaceDesc      device iface re                    description matches regex
   noShutdown         device iface                       not administratively down
   linkedUp           device                             no cabled interface is shut down (guideline guard; only for devices whose links start up)
   ipv6Address        device iface addr len [eui64]      address present (any textual form; eui64:true accepts the derived address)
   ipv6LinkLocal      device iface addr
   ipv6Routing        device                             ipv6 unicast-routing
   ipRouting          device                             ip routing (L3 switch)
   hostname           device name
   vlanExists         device vlan [name]
   accessVlan         device iface vlan                  port operationally access in that VLAN (mode access, or DTP that ends up access)
   voiceVlan          device iface vlan
   trunk              device iface [native] [allowed]    operationally trunking; allowed = [vlans] set-equality, or "all"
   staticRoute        device prefix len [nh] [iface] [ad]  configured static; when nh and iface are both given either is accepted
   defaultRoute       device [nh] [iface] [ad]           staticRoute for 0.0.0.0/0
   routeInstalled     device prefix len [code] [via]     in the live routing table (code prefix match: "S", "O", "C"…)
   ospfNeighbor       device neighbor                    FULL adjacency with that device label
   ospfRoute          device prefix len                  an O route to prefix
   ospfPassive        device iface
   ospfActive         device iface [area]                interface participates in OSPF (network statement or ip ospf) and is not passive
   ospfRouterId       device rid
   ospfDefaultOriginate device [always]
   aclApplied         device iface dir [name]
   aclPacket          device (acl | iface+dir) pkt{src dst proto dport sport} expect "permit"|"deny"
   forward            from pkt{dst proto dport sport} expect true|false     a TCP/UDP packet from a host through the whole path
   ping               from to [expect=true] [source]
   ping6              from to [expect=true]
   natInside / natOutside  device iface
   natStatic          device il ig
   natOverload        device [iface] [pool] [list]       a dynamic rule with overload
   natTranslation     device il [ig] [igIn:[lo,hi]]       an entry in the live translation table (run a ping check first)
   etherChannel       device po members[] [protocol LACP|PAgP|on] [mode] [up=true]
   dhcpPool           device network len [router] [dns] [excluded:[[lo,hi]]]
   dhcpHelper         device iface addr
   dhcpLease          host network len                   the host actually leased an address in that network
   portSecurity       device iface [max] [violation] [sticky]
   domainName         device [name]
   rsaKey             device [minBits]
   sshVersion         device [v=2]
   userExists         device user
   vtyLoginLocal      device
   vtyTransport       device only:["ssh"]                transport input exactly this set
   enableSecret       device
   servicePasswordEncryption device
   banner             device [re]
   consolePassword    device                             line con 0 has a password and login
   svi                device vlan ip len
   subinterface       device iface vlan [ip] [len] [native]
   stpRole            device iface vlan role             Root | Desg | Altn (uses live STP)
   stpRoot            device vlan
   answer             id accept[]                        analyze lab text answers (case/space-insensitive; interface names normalized)
   runningConfigMatches / runningConfigNotMatches  device re [flags]
   cmd                device line re                     run a show command on a scratch session and regex its output   */
import { createLab, runningConfig, parseIfName, makeSession, net } from "../index.js";

const { parse6, fmt6, samePrefix6, ip4, str4, networkStr, inPrefix } = net;

/* ---------- building / replaying ---------- */
export function buildLab(item) {
  const devices = {};
  for (const [name, o] of Object.entries(item.topology.devices)) { const { x, y, console: _c, ...rest } = o; devices[name] = rest; }
  return createLab({ devices, links: item.topology.links, configs: item.configs || {} });
}
export function replay(lab, log) {
  for (const [dev, lines] of Object.entries(log || {})) { const s = lab.cli(dev); for (const l of lines) s.exec(l); }
  lab.topo.converge();
  return lab;
}
/* "sh run", "do show running-config interface g0/1", "show start" → blocked when item.blocked has a matching command */
export function isBlocked(item, line) {
  if (!item.blocked || !item.blocked.length) return false;
  let toks = line.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (toks[0] === "do") toks = toks.slice(1);
  if (toks.length < 2) return false;
  return item.blocked.some(b => {
    const bt = b.toLowerCase().split(/\s+/);
    if (toks.length < bt.length) return false;
    return bt.every((w, i) => w.startsWith(toks[i]));
  });
}
export const BLOCKED_MSG = "% This command is disabled in this lab.";

/* ---------- helpers ---------- */
const norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const ifName = n => parseIfName(n)?.name || n;
const ifShort = n => parseIfName(n)?.short || n;
const sameIp6 = (a, b) => { try { return fmt6(parse6(a)) === fmt6(parse6(b)); } catch { return false; } };
const setEq = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const inRange = (ip, lo, hi) => ip4(ip) >= ip4(lo) && ip4(ip) <= ip4(hi);

function ctxFor(lab) {
  const topo = lab.topo;
  const dev = name => topo.get(name);
  const iface = (name, i) => { const d = dev(name); const n = ifName(i); return d.interfaces[n] || null; };
  return { lab, topo, dev, iface, rc: name => runningConfig(dev(name)) };
}
const R = (pass, detail) => ({ pass: !!pass, detail });

/* ---------- check implementations ---------- */
export const CHECKS = {
  interfaceIp(c, k) { const i = c.iface(k.device, k.iface); if (!i) return R(false, `${k.device} has no ${k.iface}`); const ok = i.ip && i.ip.addr === k.ip && (k.len === undefined || i.ip.len === k.len); return R(ok, i.ip ? `${k.device} ${ifShort(i.name)} is ${i.ip.addr}/${i.ip.len}` : `${k.device} ${ifShort(i.name)} has no address`); },
  interfaceUp(c, k) { const i = c.iface(k.device, k.iface); if (!i) return R(false, `no ${k.iface}`); return R(i.rt.up && i.rt.proto !== false, `${k.device} ${ifShort(i.name)} is ${i.rt.up ? "up" : i.shutdown ? "administratively down" : "down"}`); },
  noShutdown(c, k) { const i = c.iface(k.device, k.iface); return R(i && !i.shutdown, i ? (i.shutdown ? `${ifShort(i.name)} is shut down` : `${ifShort(i.name)} is enabled`) : `no ${k.iface}`); },
  linkedUp(c, k) { const d = c.dev(k.device); const down = Object.values(d.interfaces).filter(i => i.shutdown && c.topo.peer(d, i.name)); return R(!down.length, down.length ? `${k.device} shut down ${down.map(i => ifShort(i.name)).join(", ")}` : `${k.device}: all cabled interfaces enabled`); },
  interfaceDesc(c, k) { const i = c.iface(k.device, k.iface); return R(i && new RegExp(k.re, "i").test(i.desc || ""), i ? `description "${i.desc || ""}"` : `no ${k.iface}`); },
  ipv6Address(c, k) {
    const i = c.iface(k.device, k.iface); if (!i) return R(false, `no ${k.iface}`);
    const want = parse6(k.addr);
    const hit = i.ipv6.find(a => a.len === k.len && (k.eui64 ? a.eui64 && samePrefix6(parse6(a.addr), want, k.len) : sameIp6(a.addr, k.addr)));
    return R(!!hit, i.ipv6.length ? `${k.device} ${ifShort(i.name)} has ${i.ipv6.map(a => a.addr + "/" + a.len + (a.eui64 ? " eui-64" : "")).join(", ")}` : `${k.device} ${ifShort(i.name)} has no IPv6 address`);
  },
  ipv6LinkLocal(c, k) { const i = c.iface(k.device, k.iface); return R(i && i.ipv6LinkLocal && sameIp6(i.ipv6LinkLocal, k.addr), i ? `link-local ${i.ipv6LinkLocal || "(auto)"}` : `no ${k.iface}`); },
  ipv6Routing(c, k) { return R(c.dev(k.device).ipv6Routing, `ipv6 unicast-routing ${c.dev(k.device).ipv6Routing ? "on" : "off"}`); },
  ipRouting(c, k) { return R(c.dev(k.device).ipRouting, `ip routing ${c.dev(k.device).ipRouting ? "on" : "off"}`); },
  hostname(c, k) { const d = c.dev(k.device); return R(d.hostname === k.name, `hostname ${d.hostname}`); },
  vlanExists(c, k) { const v = c.dev(k.device).vlans[k.vlan]; if (!v) return R(false, `VLAN ${k.vlan} does not exist on ${k.device}`); return R(!k.name || norm(v.name) === norm(k.name), `VLAN ${k.vlan} is "${v.name}"`); },
  accessVlan(c, k) { const i = c.iface(k.device, k.iface); if (!i?.switchport) return R(false, `no switchport ${k.iface}`); return R(i.rt.opMode !== "trunk" && i.switchport.access === k.vlan, `${ifShort(i.name)}: ${i.rt.opMode || "down"}, access VLAN ${i.switchport.access}`); },
  voiceVlan(c, k) { const i = c.iface(k.device, k.iface); return R(i?.switchport && i.switchport.voice === k.vlan, i ? `voice VLAN ${i.switchport?.voice ?? "none"}` : `no ${k.iface}`); },
  trunk(c, k) {
    const i = c.iface(k.device, k.iface); if (!i?.switchport) return R(false, `no switchport ${k.iface}`);
    if (i.rt.opMode !== "trunk") return R(false, `${k.device} ${ifShort(i.name)} is not trunking (${i.rt.opMode || "down"}, mode ${i.switchport.mode})`);
    if (k.native !== undefined && i.switchport.native !== k.native) return R(false, `${ifShort(i.name)} native VLAN is ${i.switchport.native}`);
    if (k.allowed !== undefined) { const have = i.switchport.allowed ? [...i.switchport.allowed] : "all"; const ok = k.allowed === "all" ? have === "all" : have !== "all" && setEq(have.map(Number), k.allowed.map(Number)); if (!ok) return R(false, `${ifShort(i.name)} allows ${have === "all" ? "all VLANs" : have.join(",")}`); }
    return R(true, `${k.device} ${ifShort(i.name)} trunking, native ${i.switchport.native}`);
  },
  staticRoute(c, k) {
    const d = c.dev(k.device); const want = k.iface ? ifName(k.iface) : null;
    const rs = d.routes.filter(r => r.prefix === k.prefix && r.len === k.len);
    const hit = rs.find(r => (k.ad === undefined || r.ad === k.ad) && ((k.nh === undefined && !want) || (k.nh !== undefined && r.nh === k.nh) || (want && r.iface === want)));
    return R(!!hit, rs.length ? `${k.device} has ${rs.map(r => `${r.prefix}/${r.len} via ${r.nh || ""}${r.iface ? " " + ifShort(r.iface) : ""} [AD ${r.ad}]`).join("; ")}` : `${k.device} has no static route to ${k.prefix}/${k.len}`);
  },
  defaultRoute(c, k) { return CHECKS.staticRoute(c, { ...k, prefix: "0.0.0.0", len: 0 }); },
  routeInstalled(c, k) {
    const d = c.dev(k.device); const r = (d.rt.routes || []).find(r => r.prefix === k.prefix && r.len === k.len && (!k.code || r.code.startsWith(k.code)) && (!k.via || r.nhs.some(h => h.via === k.via)));
    return R(!!r, r ? `${k.device}: ${r.code} ${r.prefix}/${r.len} via ${r.nhs.map(h => h.via || ifShort(h.iface)).join(",")}` : `${k.device} has no ${k.code || ""} route to ${k.prefix}/${k.len}`);
  },
  ospfNeighbor(c, k) { const d = c.dev(k.device); const n = d.rt.ospfNbrs.filter(n => n.dev.label === k.neighbor); const full = n.some(x => x.full); return R(full, n.length ? `${k.device} sees ${k.neighbor} in ${n.map(x => x.state).join("/")}` : `${k.device} has no OSPF neighbor ${k.neighbor}`); },
  ospfRoute(c, k) { return CHECKS.routeInstalled(c, { ...k, code: "O" }); },
  ospfPassive(c, k) { const d = c.dev(k.device); const n = ifName(k.iface); const p = d.ospf && (d.ospf.passive.includes(n) || (d.ospf.passiveDefault && !d.ospf.noPassive.includes(n))); return R(!!p, p ? `${ifShort(n)} is passive` : `${ifShort(n)} is not passive`); },
  ospfActive(c, k) { const d = c.dev(k.device); const n = ifName(k.iface); const x = d.rt.ospfIfs.find(o => o.iface.name === n); return R(x && !x.passive && (k.area === undefined || x.area === k.area), x ? `${ifShort(n)} in area ${x.area}${x.passive ? " (passive)" : ""}` : `${ifShort(n)} is not running OSPF`); },
  ospfRouterId(c, k) { const d = c.dev(k.device); return R(d.rt.ospfRid === k.rid, `router ID ${d.rt.ospfRid || "none"}`); },
  ospfDefaultOriginate(c, k) { const o = c.dev(k.device).ospf; return R(o?.defOrig?.on && (!k.always || o.defOrig.always), o?.defOrig?.on ? "default-information originate set" : "no default-information originate"); },
  aclApplied(c, k) { const i = c.iface(k.device, k.iface); const a = i?.acl?.[k.dir]; return R(a && (!k.name || norm(a) === norm(k.name)), a ? `ACL ${a} applied ${k.dir}bound on ${ifShort(i.name)}` : `no ${k.dir}bound ACL on ${k.device} ${k.iface}`); },
  aclPacket(c, k) {
    const d = c.dev(k.device); let name = k.acl;
    if (!name && k.iface) { const i = c.iface(k.device, k.iface); name = i?.acl?.[k.dir]; if (!name) return R(k.expect === "permit", `no ${k.dir}bound ACL on ${k.iface} — everything permitted`); }
    if (!d.acls[name]) return R(k.expect === "permit", `ACL ${name} does not exist — everything permitted`);
    const ok = c.topo.aclCheck(d, name, { ...k.pkt }); const verdict = ok ? "permit" : "deny";
    return R(verdict === k.expect, `${name}: ${k.pkt.proto || "ip"} ${k.pkt.src} → ${k.pkt.dst}${k.pkt.dport ? ":" + k.pkt.dport : ""} is ${verdict}ted`);
  },
  forward(c, k) { c.topo.converge(); const r = c.topo.forward(c.dev(k.from), { src: null, ttl: 255, proto: "tcp", sport: 40000 + Math.floor(Math.random() * 1000), id: 9000, ...k.pkt }, null, []); const want = k.expect !== false; return R(r.ok === want, `${k.from} → ${k.pkt.dst}${k.pkt.dport ? ":" + k.pkt.dport : ""} (${k.pkt.proto || "tcp"}) ${r.ok ? "reaches" : "fails: " + r.why}`); },
  ping(c, k) { const p = c.topo.ping(k.from, k.to, k.source ? { source: k.source } : {}); const want = k.expect !== false; const got = p.pct >= 60; return R(got === want, `ping ${k.from} → ${k.to}: ${p.marks}${p.why && !got ? " (" + p.why + ")" : ""}`); },
  ping6(c, k) { const p = c.topo.ping6(k.from, k.to); const want = k.expect !== false; return R((p.pct === 100) === want, `ping ${k.from} → ${k.to}: ${p.marks}${p.why && !p.pct ? " (" + p.why + ")" : ""}`); },
  natInside(c, k) { const i = c.iface(k.device, k.iface); return R(i?.nat === "inside", `${k.iface}: ip nat ${i?.nat || "none"}`); },
  natOutside(c, k) { const i = c.iface(k.device, k.iface); return R(i?.nat === "outside", `${k.iface}: ip nat ${i?.nat || "none"}`); },
  natStatic(c, k) { const d = c.dev(k.device); const s = d.nat.static.find(s => s.il === k.il && s.ig === k.ig && !s.proto); return R(!!s, s ? `static NAT ${k.il} ↔ ${k.ig}` : `no static NAT for ${k.il} → ${k.ig} (${d.nat.static.map(s => s.il + "→" + s.ig).join(", ") || "none"})`); },
  natOverload(c, k) { const d = c.dev(k.device); const r = d.nat.dynamic.find(r => r.overload && (!k.iface || r.iface === ifName(k.iface)) && (!k.pool || r.pool === k.pool) && (!k.list || norm(r.list) === norm(k.list))); return R(!!r, r ? `PAT: list ${r.list} → ${r.iface ? ifShort(r.iface) : "pool " + r.pool} overload` : `no overloaded dynamic NAT rule on ${k.device}${d.nat.dynamic.length ? " (" + d.nat.dynamic.map(r => "list " + r.list + (r.overload ? " overload" : "")).join("; ") + ")" : ""}`); },
  natTranslation(c, k) { const d = c.dev(k.device); const t = d.rt.nat.find(t => t.il === k.il && (!k.ig || t.ig === k.ig) && (!k.igIn || inRange(t.ig, k.igIn[0], k.igIn[1]))); return R(!!t, t ? `${k.il} translated to ${t.ig}` : `no translation for ${k.il}`); },
  etherChannel(c, k) {
    const d = c.dev(k.device); const po = d.interfaces["Port-channel" + k.po]; if (!po) return R(false, `no Port-channel${k.po} on ${k.device}`);
    const members = Object.values(d.interfaces).filter(i => i.channelGroup?.id === k.po);
    const want = (k.members || []).map(ifName);
    if (k.members && !setEq(members.map(m => m.name), want)) return R(false, `Po${k.po} members: ${members.map(m => ifShort(m.name)).join(", ") || "none"}`);
    const modes = new Set(members.map(m => m.channelGroup.mode));
    const proto = [...modes].every(m => m === "active" || m === "passive") ? "LACP" : [...modes].every(m => m === "desirable" || m === "auto") ? "PAgP" : [...modes].every(m => m === "on") ? "on" : "mixed";
    if (k.protocol && proto !== k.protocol) return R(false, `Po${k.po} uses ${proto} (${[...modes].join("/")})`);
    if (k.mode && ![...modes].every(m => m === k.mode)) return R(false, `Po${k.po} member mode ${[...modes].join("/")}`);
    if (k.up !== false && !po.rt.up) return R(false, `Po${k.po} is down (${members.map(m => ifShort(m.name) + "(" + m.rt.poFlag + ")").join(" ")})`);
    return R(true, `Po${k.po} ${proto} ${po.rt.up ? "up" : "down"}, ${members.map(m => ifShort(m.name) + "(" + m.rt.poFlag + ")").join(" ")}`);
  },
  dhcpPool(c, k) {
    const d = c.dev(k.device); const p = Object.values(d.dhcp.pools).find(p => p.network === k.network && p.len === k.len);
    if (!p) return R(false, `no DHCP pool for ${k.network}/${k.len}`);
    if (k.router && p.router !== k.router) return R(false, `pool ${p.name} default-router ${p.router || "none"}`);
    if (k.dns && !k.dns.every(x => p.dns.includes(x))) return R(false, `pool ${p.name} dns ${p.dns.join(",") || "none"}`);
    if (k.excluded && !k.excluded.every(([lo, hi]) => d.dhcp.excluded.some(e => ip4(e.lo) <= ip4(lo) && ip4(e.hi) >= ip4(hi)))) return R(false, `excluded: ${d.dhcp.excluded.map(e => e.lo + "-" + e.hi).join(", ") || "none"}`);
    return R(true, `pool ${p.name} ${p.network}/${p.len} router ${p.router}`);
  },
  dhcpHelper(c, k) { const i = c.iface(k.device, k.iface); return R(i && i.helper.includes(k.addr), i ? `helper ${i.helper.join(",") || "none"} on ${ifShort(i.name)}` : `no ${k.iface}`); },
  dhcpLease(c, k) { c.topo.converge(); const h = c.dev(k.host); return R(h.ip && inPrefix(h.ip, k.network, k.len), `${k.host} got ${h.ip || "no address"}`); },
  portSecurity(c, k) {
    const i = c.iface(k.device, k.iface); if (!i) return R(false, `no ${k.iface}`); const p = i.portsec;
    if (!p.on) return R(false, `port security off on ${ifShort(i.name)}`);
    if (k.max !== undefined && p.max !== k.max) return R(false, `${ifShort(i.name)} maximum ${p.max}`);
    if (k.violation && p.violation !== k.violation) return R(false, `${ifShort(i.name)} violation ${p.violation}`);
    if (k.sticky !== undefined && p.sticky !== k.sticky) return R(false, `${ifShort(i.name)} sticky ${p.sticky ? "on" : "off"}`);
    return R(true, `${ifShort(i.name)}: port-security max ${p.max} violation ${p.violation}${p.sticky ? " sticky" : ""}`);
  },
  domainName(c, k) { const d = c.dev(k.device); return R(d.domainName && (!k.name || norm(d.domainName) === norm(k.name)), `domain ${d.domainName || "not set"}`); },
  rsaKey(c, k) { const d = c.dev(k.device); return R(d.rsaBits >= (k.minBits || 1), d.rsaBits ? `RSA ${d.rsaBits}-bit` : "no RSA key"); },
  sshVersion(c, k) { const d = c.dev(k.device); return R(d.sshVersion === (k.v || 2), `ip ssh version ${d.sshVersion || "(default)"}`); },
  userExists(c, k) { const d = c.dev(k.device); const u = d.users[k.user]; return R(!!u && (u.secret || u.password), u ? `user ${k.user} ok` : `no user ${k.user}`); },
  vtyLoginLocal(c, k) { const l = c.dev(k.device).lines["vty 0 4"]; return R(l.login === "local", `vty login ${l.login}`); },
  vtyTransport(c, k) { const l = c.dev(k.device).lines["vty 0 4"]; const have = l.transport || ["telnet", "ssh"]; return R(setEq(have, k.only), `vty transport input ${have.join(" ")}`); },
  enableSecret(c, k) { const d = c.dev(k.device); return R(!!d.enableSecret, d.enableSecret ? "enable secret set" : "no enable secret"); },
  servicePasswordEncryption(c, k) { const d = c.dev(k.device); return R(d.servicePwEnc, `service password-encryption ${d.servicePwEnc ? "on" : "off"}`); },
  banner(c, k) { const d = c.dev(k.device); return R(d.banner && (!k.re || new RegExp(k.re, "i").test(d.banner)), d.banner ? `banner "${d.banner}"` : "no banner"); },
  consolePassword(c, k) { const l = c.dev(k.device).lines["con 0"]; return R(l.password && l.login !== "none", l.password ? `console password set, login ${l.login}` : "console has no password"); },
  svi(c, k) { const i = c.iface(k.device, "Vlan" + k.vlan); return R(i && i.ip && i.ip.addr === k.ip && (k.len === undefined || i.ip.len === k.len) && !i.shutdown, i ? `Vlan${k.vlan} ${i.ip ? i.ip.addr + "/" + i.ip.len : "no ip"}${i.shutdown ? " shutdown" : ""}` : `no interface Vlan${k.vlan}`); },
  subinterface(c, k) {
    const i = c.iface(k.device, k.iface); if (!i) return R(false, `no ${k.iface}`);
    if (!i.encap || i.encap.vlan !== k.vlan) return R(false, `${ifShort(i.name)} encapsulation ${i.encap ? "dot1q " + i.encap.vlan : "none"}`);
    if (k.native !== undefined && !!i.encap.native !== k.native) return R(false, `${ifShort(i.name)} native ${i.encap.native}`);
    if (k.ip && !(i.ip && i.ip.addr === k.ip && (k.len === undefined || i.ip.len === k.len))) return R(false, `${ifShort(i.name)} ${i.ip ? i.ip.addr + "/" + i.ip.len : "no ip"}`);
    return R(true, `${ifShort(i.name)} dot1q ${i.encap.vlan}${i.ip ? " " + i.ip.addr + "/" + i.ip.len : ""}`);
  },
  stpRole(c, k) { c.topo.converge(); const i = c.iface(k.device, k.iface); const st = i?.rt.stp?.[k.vlan]; return R(st && st.role === k.role, st ? `${ifShort(i.name)} VLAN ${k.vlan}: ${st.role}/${st.sts}` : `${k.iface} not in VLAN ${k.vlan} STP`); },
  stpRoot(c, k) { c.topo.converge(); const d = c.dev(k.device); return R(d.rt.stp?.[k.vlan]?.root, `${k.device} ${d.rt.stp?.[k.vlan]?.root ? "is" : "is not"} root for VLAN ${k.vlan}`); },
  answer(c, k, answers) {
    const got = answers?.[k.id] ?? ""; const g = norm(got); const gi = parseIfName(g)?.short?.toLowerCase();
    const ok = k.accept.some(a => { const n = norm(a); return n === g || (gi && parseIfName(n)?.short?.toLowerCase() === gi); });
    return R(ok, got ? `you answered "${got}"` : "no answer");
  },
  runningConfigMatches(c, k) { const re = new RegExp(k.re, k.flags || "m"); return R(re.test(c.rc(k.device)), `${k.device} running-config ${re.test(c.rc(k.device)) ? "contains" : "lacks"} /${k.re}/`); },
  runningConfigNotMatches(c, k) { const re = new RegExp(k.re, k.flags || "m"); return R(!re.test(c.rc(k.device)), `${k.device} running-config ${re.test(c.rc(k.device)) ? "contains" : "lacks"} /${k.re}/`); },
  /* scratch session so the student's own terminal mode is untouched */
  cmd(c, k) { const s = makeSession(c.dev(k.device), c.topo); s.enter("priv"); const out = s.exec(k.line).out; const ok = new RegExp(k.re, k.flags || "m").test(out); return R(ok, `${k.device}# ${k.line} → ${ok ? "matches" : "does not match"} /${k.re}/`); },
};

/* ---------- grading ---------- */
export function gradeLab(item, lab, answers = {}) {
  lab.topo.converge();
  const c = ctxFor(lab);
  const results = [];
  for (const k of item.checks) {
    const fn = CHECKS[k.type]; let r;
    if (!fn) r = R(false, `unknown check type ${k.type}`);
    else { try { r = fn(c, k, answers); } catch (e) { r = R(false, `check error: ${e.message}`); } }
    results.push({ id: k.id, type: k.type, task: k.task, guideline: k.guideline, points: k.points ?? 1, pass: r.pass, detail: r.detail });
  }
  const tasks = (item.tasks || []).map(t => { const cs = results.filter(r => r.task === t.id); const max = cs.reduce((a, r) => a + r.points, 0); const earned = cs.filter(r => r.pass).reduce((a, r) => a + r.points, 0); return { id: t.id, text: t.text, earned, max, checks: cs }; });
  const guidelines = results.filter(r => r.guideline !== undefined).map(r => ({ idx: r.guideline, text: item.guidelines?.[r.guideline] || "", pass: r.pass, points: r.points, detail: r.detail }));
  const max = tasks.reduce((a, t) => a + t.max, 0) || 1;
  const earned = tasks.reduce((a, t) => a + t.earned, 0);
  const penalty = guidelines.filter(g => !g.pass).reduce((a, g) => a + g.points, 0);
  const f = Math.max(0, Math.min(1, (earned - penalty) / max));
  return { f, earned, max, penalty, tasks, guidelines, checks: results };
}
