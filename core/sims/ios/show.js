/* Cert Gauntlet — IOS simulator: `show` output renderers. Every function takes a converged device and returns text. */
import { maskStr, classfulLen, networkStr, ip4, str4, fmtRange, fmt6 } from "./net.js";
import { ifType, shortIf, cdpIf, isSub, parentOf, ifSpeedMbps } from "./device.js";
import { runningConfig, startupConfig, entryText } from "./config.js";
import { cmpIp, stpCost } from "./topology.js";

const pad = (s, n) => String(s).padEnd(n);
const UP = "00:12:34";                      // simulated timers are constant (see dev/specs/ccna.md)

export function ipIntBrief(dev) {
  const rows = dev.ifaces().map(i => {
    const ip = i.ip ? i.ip.addr : "unassigned";
    const method = i.ip ? "manual" : "unset";
    const status = i.shutdown ? "administratively down" : i.rt.errDisabled ? "down" : (i.rt.up ? "up" : "down");
    let proto = i.rt.up && i.rt.proto ? "up" : "down";
    if (ifType(i.name) === "Vlan" && i.rt.up && !i.rt.proto) proto = "down";
    return `${pad(i.name, 23)}${pad(ip, 16)}YES ${pad(method, 7)}${pad(status, 22)}${proto}`;
  });
  return `${pad("Interface", 23)}${pad("IP-Address", 16)}OK? Method Status                Protocol\n` + rows.join("\n");
}

export function ipRoute(dev) {
  const R = dev.rt.routes;
  if (dev.isSwitch && !dev.ipRouting) {
    return `Default gateway is ${dev.defaultGateway || "not set"}\n\nHost               Gateway           Last Use    Total Uses  Interface\nICMP redirect cache is empty`;
  }
  const codes = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR
`;
  const def = R.find(r => r.len === 0);
  const glr = def ? `Gateway of last resort is ${def.nhs[0].via || "0.0.0.0"} to network 0.0.0.0` : "Gateway of last resort is not set";
  const lines = [];
  const line = (r, nh, first) => {
    const code = pad(first ? r.code : "", 8);
    const pfx = `${r.prefix}/${r.len}`;
    if (r.code === "C" || r.code === "L") return `${code} ${pfx} is directly connected, ${nh.iface}`;
    const metric = `[${r.ad}/${r.metric}] `;
    const via = nh.via ? `via ${nh.via}` : `is directly connected, ${nh.iface}`;
    const tail = r.code.startsWith("O") ? `, ${UP}, ${nh.iface}` : (nh.via && nh.iface && r.ifaceShown ? `, ${nh.iface}` : "");
    if (!first) return " ".repeat(9 + pfx.length + 1) + `${nh.via ? metric : ""}${via}${tail}`;
    return `${code} ${pfx} ${nh.via ? metric : ""}${via}${tail}`;
  };
  // group by classful major network
  const groups = new Map();
  for (const r of R.filter(r => r.len > 0)) { const cl = classfulLen(r.prefix); const major = networkStr(r.prefix, cl) + "/" + cl; (groups.get(major) || groups.set(major, []).get(major)).push(r); }
  const majors = [...groups.keys()].sort((a, b) => cmpIp(a.split("/")[0], b.split("/")[0]));
  if (def) for (const nh of def.nhs) lines.push(line(def, nh, nh === def.nhs[0]).replace(/^(\S+)\s+/, (m, c) => pad(c, 6)));
  for (const m of majors) {
    const rs = groups.get(m).sort((a, b) => cmpIp(a.prefix, b.prefix) || a.len - b.len);
    const masks = new Set(rs.map(r => r.len));
    if (rs.length === 1 && rs[0].len === +m.split("/")[1]) { for (const nh of rs[0].nhs) lines.push(line(rs[0], nh, nh === rs[0].nhs[0]).replace(/^(\S+)\s+/, (m2, c) => pad(c, 6))); continue; }
    lines.push(`      ${m} is ${masks.size > 1 ? "variably subnetted" : "subnetted"}, ${rs.length} subnet${rs.length > 1 ? "s" : ""}${masks.size > 1 ? `, ${masks.size} masks` : ""}`);
    for (const r of rs) for (const nh of r.nhs) lines.push(line(r, nh, nh === r.nhs[0]));
  }
  return codes + "\n" + glr + "\n" + (lines.length ? "\n" + lines.join("\n") : "");
}

export function ipv6Route(dev) {
  const R = dev.rt.routes6 || [];
  const head = `IPv6 Routing Table - default - ${R.length + 1} entries
Codes: C - Connected, L - Local, S - Static, U - Per-user Static route
       B - BGP, R - RIP, H - NHRP, I1 - ISIS L1
       I2 - ISIS L2, IA - ISIS interarea, IS - ISIS summary, D - EIGRP, EX - EIGRP external
       ND - ND Default, NDp - ND Prefix, DCE - Destination, NDr - Redirect
       O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2
       ON1 - OSPF NSSA ext 1, ON2 - OSPF NSSA ext 2, a - Application`;
  const lines = R.map(r => {
    const pfx = `${fmt6(r.prefix).toUpperCase()}/${r.len}`;
    if (r.code === "S") return `S   ${pfx} [${r.ad}/0]\n     via ${r.via ? r.via.toUpperCase() : "::"}, ${r.iface}`;
    return `${pad(r.code, 4)}${pfx} [0/0]\n     via ${r.iface}, ${r.code === "L" ? "receive" : "directly connected"}`;
  });
  lines.push("L   FF00::/8 [0/0]\n     via Null0, receive");
  return head + "\n" + lines.join("\n");
}
export function ipv6IntBrief(dev) {
  return dev.ifaces().map(i => {
    const st = `[${i.shutdown ? "administratively down" : i.rt.up ? "up" : "down"}/${i.rt.up && i.rt.proto ? "up" : "down"}]`;
    const addrs = i.rt.ll6 ? [fmt6(i.rt.ll6).toUpperCase(), ...(i.rt.v6 || []).map(a => fmt6(a.g).toUpperCase())] : ["unassigned"];
    return `${pad(i.name, 23)}${st}\n` + addrs.map(a => "    " + a).join("\n");
  }).join("\n");
}

export function vlanBrief(dev) {
  const ports = v => dev.ifaces().filter(i => i.switchport?.on && ifType(i.name) !== "Port-channel" && !i.rt.bundled && i.rt.opMode !== "trunk" && i.switchport.access === v).map(i => shortIf(i.name));
  const rows = Object.keys(dev.vlans).map(Number).sort((a, b) => a - b).map(v => {
    const status = v >= 1002 ? "act/unsup" : "active";
    const ps = v >= 1002 ? [] : ports(v);
    const chunks = []; for (let i = 0; i < ps.length; i += 4) chunks.push(ps.slice(i, i + 4).join(", "));
    const first = `${pad(v, 5)}${pad(dev.vlans[v].name, 33)}${pad(status, 10)}${chunks[0] || ""}`;
    return [first, ...chunks.slice(1).map(c => " ".repeat(48) + c)].join("\n");
  });
  return `VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n` + rows.join("\n");
}

export function interfacesTrunk(dev) {
  const trunks = dev.ifaces().filter(i => i.switchport?.on && i.rt.up && i.rt.opMode === "trunk" && !(ifType(i.name) !== "Port-channel" && i.rt.bundled));
  if (!trunks.length) return "";
  const vlansActive = i => fmtRange([...(i.switchport.allowed || new Set(Object.keys(dev.vlans).map(Number)))].filter(v => dev.vlans[v] && v < 1002));
  const fwd = i => fmtRange([...(i.switchport.allowed || new Set(Object.keys(dev.vlans).map(Number)))].filter(v => dev.vlans[v] && v < 1002 && (!i.rt.stp[v] || i.rt.stp[v].sts === "FWD")));
  const modeTxt = i => i.switchport.mode === "trunk" ? "on" : i.switchport.mode === "dynamic desirable" ? "desirable" : "auto";
  return `${pad("Port", 12)}${pad("Mode", 17)}${pad("Encapsulation", 15)}${pad("Status", 14)}Native vlan\n` +
    trunks.map(i => `${pad(shortIf(i.name), 12)}${pad(modeTxt(i), 17)}${pad("802.1q", 15)}${pad("trunking", 14)}${i.switchport.native}`).join("\n") +
    `\n\n${pad("Port", 12)}Vlans allowed on trunk\n` + trunks.map(i => `${pad(shortIf(i.name), 12)}${i.switchport.allowed ? fmtRange(i.switchport.allowed) : "1-4094"}`).join("\n") +
    `\n\n${pad("Port", 12)}Vlans allowed and active in management domain\n` + trunks.map(i => `${pad(shortIf(i.name), 12)}${vlansActive(i)}`).join("\n") +
    `\n\n${pad("Port", 12)}Vlans in spanning tree forwarding state and not pruned\n` + trunks.map(i => `${pad(shortIf(i.name), 12)}${fwd(i)}`).join("\n");
}

export function interfacesSwitchport(dev, name) {
  const list = name ? [dev.interfaces[name]] : dev.ifaces().filter(i => i.switchport && ifType(i.name) !== "Port-channel" || (i.switchport && ifType(i.name) === "Port-channel"));
  return list.filter(Boolean).map(i => {
    if (!i.switchport?.on) return `Name: ${shortIf(i.name)}\nSwitchport: Disabled`;
    const s = i.switchport;
    const adm = s.mode === "trunk" ? "trunk" : s.mode === "access" ? "static access" : s.mode;
    const op = i.rt.up ? (i.rt.opMode || "static access") : "down";
    return `Name: ${shortIf(i.name)}
Switchport: Enabled
Administrative Mode: ${adm}
Operational Mode: ${op}
Administrative Trunking Encapsulation: dot1q
Operational Trunking Encapsulation: ${i.rt.opMode === "trunk" ? "dot1q" : "native"}
Negotiation of Trunking: ${s.nonegotiate || s.mode === "access" ? "Off" : "On"}
Access Mode VLAN: ${s.access} (${dev.vlans[s.access]?.name || "Inactive"})
Trunking Native Mode VLAN: ${s.native} (${dev.vlans[s.native]?.name || "Inactive"})
Administrative Native VLAN tagging: enabled
Voice VLAN: ${s.voice ? `${s.voice} (${dev.vlans[s.voice]?.name || "Inactive"})` : "none"}
Administrative private-vlan host-association: none
Operational private-vlan: none
Trunking VLANs Enabled: ${s.allowed ? fmtRange(s.allowed) : "ALL"}
Pruning VLANs Enabled: 2-1001
Capture Mode Disabled
Capture VLANs Allowed: ALL

Protected: false
Appliance trust: none`;
  }).join("\n\n");
}

export function interfaces(dev, name) {
  const list = name ? [dev.interfaces[name]] : dev.ifaces();
  return list.filter(Boolean).map(i => {
    const t = ifType(i.name);
    const status = i.shutdown ? "administratively down" : i.rt.up ? "up" : "down";
    const proto = i.rt.up && i.rt.proto ? "up" : "down";
    const hw = t === "Loopback" ? "Loopback" : t === "Vlan" ? "EtherSVI" : t === "Serial" ? "GT96K Serial" : t === "FastEthernet" ? "Fast Ethernet" : t === "Port-channel" ? "EtherChannel" : "iGbE";
    const mac = i.mac || dev.baseMac;
    const bw = t === "Loopback" ? 8000000 : t === "Serial" ? 1544 : (i.bandwidth || ifSpeedMbps(i.name) * 1000);
    const L = [`${i.name} is ${status}, line protocol is ${proto}${status === "down" && proto === "down" ? "" : ""}`];
    L.push(`  Hardware is ${hw}${t === "Loopback" || t === "Serial" ? "" : `, address is ${mac} (bia ${mac})`}`);
    if (i.desc) L.push(`  Description: ${i.desc}`);
    if (i.ip) L.push(`  Internet address is ${i.ip.addr}/${i.ip.len}`);
    L.push(`  MTU 1500 bytes, BW ${bw} Kbit/sec, DLY ${t === "Serial" ? 20000 : t === "Loopback" ? 5000 : 10} usec,`);
    L.push(`     reliability 255/255, txload 1/255, rxload 1/255`);
    L.push(`  Encapsulation ${t === "Serial" ? "HDLC" : i.encap ? "802.1Q Virtual LAN, Vlan ID  " + i.encap.vlan + "." : "ARPA"}, loopback not set`);
    if (t !== "Loopback") L.push(`  Keepalive set (10 sec)`);
    if (t === "GigabitEthernet" || t === "FastEthernet") L.push(`  ${i.rt.up ? (i.duplex === "auto" ? "Full-duplex" : i.duplex[0].toUpperCase() + i.duplex.slice(1) + "-duplex") : "Auto-duplex"}, ${i.rt.up ? (i.speed === "auto" ? (t === "FastEthernet" ? "100Mb/s" : "1000Mb/s") : i.speed + "Mb/s") : "Auto-speed"}, media type is RJ45`);
    L.push(`  Last input never, output never, output hang never`, `  Last clearing of "show interface" counters never`, `  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0`, `  Queueing strategy: fifo`, `  Output queue: 0/40 (size/max)`);
    L.push(`  5 minute input rate 0 bits/sec, 0 packets/sec`, `  5 minute output rate 0 bits/sec, 0 packets/sec`, `     0 packets input, 0 bytes, 0 no buffer`, `     Received 0 broadcasts (0 IP multicasts)`, `     0 runts, 0 giants, 0 throttles`, `     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored`, `     0 packets output, 0 bytes, 0 underruns`, `     0 output errors, 0 collisions, ${i.rt.up ? 1 : 0} interface resets`);
    return L.join("\n");
  }).join("\n");
}

export function ipOspfNeighbor(dev) {
  const n = dev.rt.ospfNbrs || [];
  if (!dev.ospf) return "";
  if (!n.length) return "";
  return `\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n` +
    n.sort((a, b) => cmpIp(a.rid, b.rid)).map(x => `${pad(x.rid, 16)}${String(x.pri).padStart(3)}   ${pad(x.state, 16)}${pad("00:00:3" + (x.rid.length % 9), 12)}${pad(x.addr, 16)}${x.iface}`).join("\n");
}
export function ipOspfInterface(dev, name) {
  if (!dev.ospf) return "";
  const list = (dev.rt.ospfIfs || []).filter(o => !name || o.iface.name === name);
  if (name && !list.length) return `%OSPF: OSPF not enabled on ${name}`;
  return list.map(o => {
    const i = o.iface; const nbrs = o.nbrs.length;
    const L = [`${i.name} is up, line protocol is up`, `  Internet Address ${i.ip.addr}/${i.ip.len}, Area ${o.area}, Attached via ${i.ospf ? "Interface Enable" : "Network Statement"}`,
    `  Process ID ${dev.ospf.pid}, Router ID ${dev.rt.ospfRid}, Network Type ${o.type}, Cost: ${o.cost}`,
    `  Topology-MTID    Cost    Disabled    Shutdown      Topology Name\n        0           ${o.cost}         no          no            Base`];
    if (o.type === "LOOPBACK") { L.push(`  Loopback interface is treated as a stub Host`); return L.join("\n"); }
    L.push(`  Transmit Delay is 1 sec, State ${o.passive ? "DOWN" : o.state}, Priority ${o.priority}`);
    if (o.type === "BROADCAST") {
      if (o.dr) L.push(`  Designated Router (ID) ${o.dr.dev.rt.ospfRid}, Interface address ${o.dr.iface.ip.addr}`);
      if (o.bdr) L.push(`  Backup Designated router (ID) ${o.bdr.dev.rt.ospfRid}, Interface address ${o.bdr.iface.ip.addr}`); else if (o.dr) L.push(`  No backup designated router on this network`);
    }
    L.push(`  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5`);
    if (o.passive) L.push(`    No Hellos (Passive interface)`); else L.push(`    oob-resync timeout 40\n    Hello due in 00:00:0${(nbrs + 3) % 10}`);
    L.push(`  Supports Link-local Signaling (LLS)`, `  Cisco NSF helper support enabled`, `  IETF NSF helper support enabled`, `  Index 1/1/1, flood queue length 0`, `  Next 0x0(0)/0x0(0)/0x0(0)`, `  Last flood scan length is 1, maximum is 1`, `  Last flood scan time is 0 msec, maximum is 0 msec`);
    L.push(`  Neighbor Count is ${nbrs}, Adjacent neighbor count is ${o.nbrs.filter(n => n.full).length}`);
    for (const n of o.nbrs) if (n.full) L.push(`    Adjacent with neighbor ${n.rid}${n.state.includes("/DR") ? "  (Designated Router)" : n.state.includes("/BDR") ? "  (Backup Designated Router)" : ""}`);
    L.push(`  Suppress hello for 0 neighbor(s)`);
    return L.join("\n");
  }).join("\n");
}
export function ipOspfDatabase(dev) {
  if (!dev.ospf) return "";
  const db = dev.rt.ospfDb; const out = [`\n            OSPF Router with ID (${dev.rt.ospfRid}) (Process ID ${dev.ospf.pid})\n`];
  const areas = [...new Set([...db.routers.map(r => r.area), ...db.nets.map(n => n.area)])].sort((a, b) => a - b);
  for (const a of areas) {
    const rs = db.routers.filter(r => r.area === a).sort((x, y) => cmpIp(x.rid, y.rid));
    out.push(`                Router Link States (Area ${a})\n`, `${pad("Link ID", 16)}${pad("ADV Router", 16)}${pad("Age", 12)}${pad("Seq#", 12)}${pad("Checksum", 9)}Link count`);
    out.push(...rs.map((r, k) => `${pad(r.rid, 16)}${pad(r.rid, 16)}${pad(100 + k * 7, 12)}${pad("0x80000003", 12)}${pad("0x00" + (0x1a2b + k * 17).toString(16).toUpperCase(), 9)}${r.links}`));
    const ns = db.nets.filter(n => n.area === a);
    if (ns.length) { out.push(`\n                Net Link States (Area ${a})\n`, `${pad("Link ID", 16)}${pad("ADV Router", 16)}${pad("Age", 12)}${pad("Seq#", 12)}Checksum`); out.push(...ns.map((n, k) => `${pad(n.linkId, 16)}${pad(n.rid, 16)}${pad(120 + k * 5, 12)}${pad("0x80000001", 12)}0x00${(0x3c4d + k * 11).toString(16).toUpperCase()}`)); }
    out.push("");
  }
  return out.join("\n");
}

export function accessLists(dev, which) {
  const acls = Object.values(dev.acls).filter(a => !which || a.name === which);
  if (which && !acls.length) return "";
  return acls.map(a => {
    const head = `${a.type === "standard" ? "Standard" : "Extended"} IP access list ${a.name}`;
    const rows = a.entries.filter(e => e.remark === undefined).map(e => {
      const hits = dev.rt.aclHits[a.name + "#" + e.seq];
      let txt = entryText(a, e, a.numbered);
      if (a.type === "standard" && e.srcWild !== "0.0.0.0" && e.srcWild !== "255.255.255.255") txt = `${e.action} ${e.src}, wildcard bits ${e.srcWild}${e.log ? " log" : ""}`;
      if (a.type === "standard" && e.srcWild === "0.0.0.0") txt = `${e.action} ${e.src}${e.log ? " log" : ""}`;
      return `    ${e.seq} ${txt}${hits ? ` (${hits} match${hits > 1 ? "es" : ""})` : ""}`;
    });
    return [head, ...rows].join("\n");
  }).join("\n");
}

export function natTranslations(dev) {
  const T = dev.rt.nat || []; const st = dev.nat.static;
  if (!T.length && !st.length) return "";
  const rows = [`${pad("Pro", 5)}${pad("Inside global", 19)}${pad("Inside local", 19)}${pad("Outside local", 19)}Outside global`];
  for (const s of st) rows.push(`${pad(s.proto || "---", 5)}${pad(s.proto ? `${s.ig}:${s.igPort}` : s.ig, 19)}${pad(s.proto ? `${s.il}:${s.ilPort}` : s.il, 19)}${pad("---", 19)}---`);
  for (const t of T) rows.push(t.overload ? `${pad(t.proto, 5)}${pad(`${t.ig}:${t.igPort}`, 19)}${pad(`${t.il}:${t.ilPort}`, 19)}${pad(`${t.ol}:${t.ilPort}`, 19)}${t.og}:${t.ilPort}`
    : `${pad("---", 5)}${pad(t.ig, 19)}${pad(t.il, 19)}${pad("---", 19)}---`);
  return rows.join("\n");
}
export function natStatistics(dev) {
  const T = dev.rt.nat || []; const dyn = T.length, stc = dev.nat.static.length, ext = T.filter(t => t.overload).length + dev.nat.static.filter(s => s.proto).length;
  const inside = dev.ifaces().filter(i => i.nat === "inside").map(i => i.name), outside = dev.ifaces().filter(i => i.nat === "outside").map(i => i.name);
  const L = [`Total active translations: ${dyn + stc} (${stc} static, ${dyn} dynamic; ${ext} extended)`, `Peak translations: ${dyn + stc}, occurred ${UP} ago`,
  `Outside interfaces:\n  ${outside.join(", ")}`, `Inside interfaces: \n  ${inside.join(", ")}`, `Hits: ${dev.rt.natHits}  Misses: ${dev.rt.natMisses}`, `CEF Translated packets: ${dev.rt.natHits}, CEF Punted packets: 0`, `Expired translations: 0`, `Dynamic mappings:`];
  dev.nat.dynamic.forEach((r, k) => {
    L.push(`-- Inside Source`, `[Id: ${k + 1}] access-list ${r.list} ${r.iface ? "interface " + r.iface : "pool " + r.pool} refcount ${T.filter(t => t.pool === (r.pool || null)).length}`);
    if (r.pool && dev.nat.pools[r.pool]) { const p = dev.nat.pools[r.pool]; L.push(` pool ${r.pool}: id ${k + 1}, netmask ${maskStr(p.len)}\n\tstart ${p.start} end ${p.end}\n\ttype generic, total addresses ${ip4(p.end) - ip4(p.start) + 1}, allocated ${T.filter(t => t.pool === r.pool && !t.overload).length} (${Math.round(T.filter(t => t.pool === r.pool && !t.overload).length / (ip4(p.end) - ip4(p.start) + 1) * 100)}%), misses 0`); }
  });
  return L.join("\n");
}

export function portSecurity(dev, name) {
  if (name) {
    const i = dev.interfaces[name]; if (!i) return "";
    const ps = i.portsec; const status = !ps.on ? "Secure-down" : i.rt.errDisabled ? "Secure-shutdown" : i.rt.up ? "Secure-up" : "Secure-down";
    return `Port Security              : ${ps.on ? "Enabled" : "Disabled"}
Port Status                : ${status}
Violation Mode             : ${ps.violation[0].toUpperCase() + ps.violation.slice(1)}
Aging Time                 : 0 mins
Aging Type                 : Absolute
SecureStatic Address Aging : Disabled
Maximum MAC Addresses      : ${ps.max}
Total MAC Addresses        : ${ps.macs.length}
Configured MAC Addresses   : ${ps.macs.filter(m => !m.sticky).length}
Sticky MAC Addresses       : ${ps.macs.filter(m => m.sticky).length}
Last Source Address:Vlan   : ${ps.macs.length ? ps.macs[ps.macs.length - 1].mac + ":" + i.switchport.access : "0000.0000.0000:0"}
Security Violation Count   : ${i.rt.psecCount || 0}`;
  }
  const ports = dev.ifaces().filter(i => i.portsec.on);
  return `Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action
                (Count)       (Count)          (Count)
---------------------------------------------------------------------------
` + ports.map(i => `${pad(shortIf(i.name), 17)}${pad(i.portsec.max, 15)}${pad(i.portsec.macs.length, 13)}${pad(i.rt.psecCount || 0, 19)}${i.portsec.violation[0].toUpperCase() + i.portsec.violation.slice(1)}`).join("\n") +
    `\n---------------------------------------------------------------------------\nTotal Addresses in System (excluding one mac per port)     : ${Math.max(0, ports.reduce((a, i) => a + Math.max(0, i.portsec.macs.length - 1), 0))}\nMax Addresses limit in System (excluding one mac per port) : 8192`;
}

export function etherchannelSummary(dev) {
  const pos = dev.ifaces().filter(i => ifType(i.name) === "Port-channel");
  const head = `Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP only)
        R - Layer3      S - Layer2
        U - in use      f - failed to allocate aggregator

        M - not in use, minimum links not met
        u - unsuitable for bundling
        w - waiting to be aggregated
        d - default port

        A - formed by Auto LAG


Number of channel-groups in use: ${pos.length}
Number of aggregators:           ${pos.length}

Group  Port-channel  Protocol    Ports
------+-------------+-----------+-----------------------------------------------`;
  return head + "\n" + pos.map(po => {
    const id = +po.name.replace("Port-channel", "");
    const flags = (po.switchport?.on ? "S" : "R") + (po.rt.up ? "U" : "D");
    const members = (po.rt.members || []).map(m => `${shortIf(m.name)}(${m.rt.poFlag || "D"})`).join(" ");
    return `${pad(id, 7)}${pad(`Po${id}(${flags})`, 14)}${pad(po.rt.protocol || "-", 12)}${members}`;
  }).join("\n");
}

export function cdpNeighbors(dev, detail) {
  if (!dev.cdp) return "% CDP is not enabled";
  const n = dev.rt.cdp || [];
  if (detail) {
    if (!n.length) return "";
    return n.map(x => `-------------------------
Device ID: ${x.dev.hostname}
Entry address(es):
${(x.dev.allIps()[0] ? `  IP address: ${x.dev.allIps()[0].ip}` : "")}
Platform: cisco ${x.dev.platform},  Capabilities: ${x.dev.isSwitch ? "Switch IGMP" : "Router Source-Route-Bridge Switch IGMP"}
Interface: ${x.local},  Port ID (outgoing port): ${x.remote}
Holdtime : 1${(x.dev.id * 7) % 60 + 20} sec

Version :
Cisco IOS Software, ${x.dev.isSwitch ? "C2960 Software (C2960-LANBASEK9-M), Version 15.2(4)E7" : "ISR4300 Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 15.4(3)S"}, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2018 by Cisco Systems, Inc.

advertisement version: 2
Duplex: full`).join("\n") + "\n\nTotal cdp entries displayed : " + n.length;
  }
  return `Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone,
                  D - Remote, C - CVTA, M - Two-port Mac Relay

${pad("Device ID", 17)}${pad("Local Intrfce", 18)}${pad("Holdtme", 11)}${pad("Capability", 12)}${pad("Platform", 10)}Port ID
` + n.map(x => `${pad(x.dev.hostname, 17)}${pad(cdpIf(x.local), 18)}${pad(1 + ((x.dev.id * 7) % 60 + 20), 11)}${pad(x.dev.isSwitch ? "S I" : "R S I", 12)}${pad(x.dev.platform, 10)}${cdpIf(x.remote)}`).join("\n") + `\n\nTotal cdp entries displayed : ${n.length}`;
}
export function lldpNeighbors(dev) {
  if (!dev.lldp) return "% LLDP is not enabled";
  const n = dev.rt.lldp || [];
  return `Capability codes:
    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device
    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other

${pad("Device ID", 19)}${pad("Local Intf", 15)}${pad("Hold-time", 11)}${pad("Capability", 12)}Port ID
` + n.map(x => `${pad(x.dev.hostname, 19)}${pad(shortIf(x.local), 15)}${pad(120, 11)}${pad(x.dev.isSwitch ? "B" : "R", 12)}${shortIf(x.remote)}`).join("\n") + `\n\nTotal entries displayed: ${n.length}`;
}

export function macTable(dev, filter = {}) {
  let rows = (dev.rt.mac || []).slice();
  // static entries from port-security replace dynamic ones
  for (const i of dev.ifaces()) if (i.portsec.on && i.switchport?.on) for (const m of i.portsec.macs) { rows = rows.filter(r => !(r.mac === m.mac && r.vlan === i.switchport.access)); rows.push({ vlan: i.switchport.access, mac: m.mac, type: "STATIC", port: i.name }); }
  if (filter.vlan) rows = rows.filter(r => r.vlan === filter.vlan);
  if (filter.iface) rows = rows.filter(r => r.port === filter.iface);
  if (filter.dynamic) rows = rows.filter(r => r.type === "DYNAMIC");
  if (filter.address) rows = rows.filter(r => r.mac === filter.address);
  rows.sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac));
  return `          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
` + rows.map(r => `${pad(r.vlan, 8).padStart(8).slice(0, 8)}${pad(r.mac, 18)}${pad(r.type, 12)}${shortIf(r.port)}`.replace(/^(\s*\d+)\s+/, (m, v) => pad(v.trim().padStart(4), 8))).join("\n") + `\nTotal Mac Addresses for this criterion: ${rows.length}`;
}

export function spanningTree(dev, vlan) {
  const insts = Object.values(dev.rt.stp || {}).filter(s => !vlan || s.vlan === vlan).sort((a, b) => a.vlan - b.vlan);
  if (!insts.length) return vlan ? `\nSpanning tree instance(s) for vlan ${vlan} does not exist.\n` : "No spanning tree instance exists.";
  const protoName = dev.stpMode === "rapid-pvst" ? "rstp" : dev.stpMode === "mst" ? "mstp" : "ieee";
  return insts.map(s => {
    const rootPort = s.rootPort ? dev.interfaces[s.rootPort] : null;
    const L = [`VLAN${String(s.vlan).padStart(4, "0")}`, `  Spanning tree enabled protocol ${protoName}`, `  Root ID    Priority    ${s.rootId.pri}`, `             Address     ${s.rootId.mac}`];
    if (s.root) L.push(`             This bridge is the root`);
    else L.push(`             Cost        ${s.cost}`, `             Port        ${portIndex(dev, s.rootPort)} (${s.rootPort})`);
    L.push(`             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`, ``,
      `  Bridge ID  Priority    ${s.bridgeId.pri}  (priority ${s.bridgeId.pri - s.vlan} sys-id-ext ${s.vlan})`, `             Address     ${s.bridgeId.mac}`,
      `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`, `             Aging Time  300 sec`, ``,
      `${pad("Interface", 20)}${pad("Role", 5)}${pad("Sts", 4)}${pad("Cost", 10)}${pad("Prio.Nbr", 9)}Type`, `------------------- ---- --- --------- -------- --------------------------------`);
    for (const p of s.ports) L.push(`${pad(shortIf(p.name), 20)}${pad(p.role, 5)}${pad(p.sts, 4)}${pad(p.cost, 10)}${pad(`128.${portIndex(dev, p.name)}`, 9)}${p.type}`);
    return L.join("\n");
  }).join("\n\n\n");
}
function portIndex(dev, name) { const names = Object.keys(dev.interfaces).filter(n => n !== "Vlan1" && ifType(n) !== "Vlan").sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); const t = ifType(name); const list = names.filter(n => ifType(n) === t || (t !== "Port-channel")); const k = list.indexOf(name); return k < 0 ? 1 : k + 1; }

export function dhcpBinding(dev) {
  const b = dev.rt.dhcpBindings || [];
  return `Bindings from all pools not associated with VRF:
${pad("IP address", 20)}${pad("Client-ID/", 24)}${pad("Lease expiration", 24)}${pad("Type", 11)}${pad("State", 11)}Interface
${pad("", 20)}${pad("Hardware address/", 24)}
${pad("", 20)}${pad("User name", 24)}
` + b.map(x => `${pad(x.ip, 20)}${pad(clientId(x.mac), 24)}${pad("Oct 03 2026 10:15 PM", 24)}${pad("Automatic", 11)}${pad("Active", 11)}${x.iface}`).join("\n");
}
function clientId(mac) { const h = "01" + mac.replace(/\./g, ""); return h.match(/.{1,4}/g).join("."); }
export function dhcpPool(dev) {
  return Object.entries(dev.dhcp.pools).map(([n, p]) => `Pool ${n} :
 Utilization mark (high/low)    : 100 / 0
 Subnet size (first/next)       : 0 / 0
 Total addresses                : ${p.network ? Math.pow(2, 32 - p.len) - 2 : 0}
 Leased addresses               : ${(dev.rt.dhcpBindings || []).filter(b => b.pool === n).length}
 Excluded addresses             : ${dev.dhcp.excluded.reduce((a, x) => a + (ip4(x.hi) - ip4(x.lo) + 1), 0)}
 Pending event                  : none
 1 subnet is currently in the pool :
 Current index        IP address range                    Leased/Excluded/Total
 ${pad(p.network ? p.network : "0.0.0.0", 21)}${p.network ? `${str4(ip4(p.network) + 1)}  - ${str4(ip4(p.network) + Math.pow(2, 32 - p.len) - 2)}` : ""}`).join("\n");
}

export function arp(dev) {
  const own = dev.ifaces().filter(i => i.ip && i.rt.up && !(dev.isSwitch && i.switchport?.on)).map(i => ({ ip: i.ip.addr, mac: i.mac || dev.baseMac, iface: i.name, age: "-" }));
  const learned = (dev.rt.arp || []).filter(a => !own.some(o => o.ip === a.ip)).map(a => ({ ...a, age: String(a.age ?? 0) }));
  const rows = [...own, ...learned].sort((a, b) => cmpIp(a.ip, b.ip));
  return `${pad("Protocol", 10)}${pad("Address", 17)}${pad("Age (min)", 11)}${pad("Hardware Addr", 16)}${pad("Type", 7)}Interface\n` +
    rows.map(r => `${pad("Internet", 10)}${pad(r.ip, 17)}${r.age.padStart(8)}   ${pad(r.mac, 16)}${pad("ARPA", 7)}${r.iface}`).join("\n");
}

export function version(dev) {
  const sw = dev.isSwitch;
  return `Cisco IOS Software, ${sw ? "C2960 Software (C2960-LANBASEK9-M), Version 15.2(4)E7" : "ISR4300 Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 15.4(3)S"}, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2018 by Cisco Systems, Inc.
Compiled Tue 18-Sep-18 13:07 by prod_rel_team

ROM: Bootstrap program is ${sw ? "C2960 boot loader" : "ISR4300 boot loader"}

${dev.hostname} uptime is 12 minutes
System returned to ROM by power-on
System image file is "${sw ? "flash:c2960-lanbasek9-mz.152-4.E7.bin" : "bootflash:isr4300-universalk9.03.13.00.S.154-3.S-ext.SPA.bin"}"

${sw ? "cisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory." : "cisco ISR4321/K9 (1RU) processor with 1687137K/6147K bytes of memory."}
${sw ? "24 FastEthernet interfaces\n2 Gigabit Ethernet interfaces" : "2 Gigabit Ethernet interfaces\n2 Serial interfaces"}
${sw ? "64K bytes of flash-simulated non-volatile configuration memory." : "32768K bytes of non-volatile configuration memory."}
Base ethernet MAC Address       : ${dev.baseMac.toUpperCase().replace(/\./g, "").match(/../g).join(":")}

Configuration register is 0x${sw ? "F" : "2102"}`;
}

export { runningConfig, startupConfig };
export function ipProtocols(dev) {
  if (!dev.ospf) return "";
  return `*** IP Routing is NSF aware ***\n\nRouting Protocol is "ospf ${dev.ospf.pid}"\n  Outgoing update filter list for all interfaces is not set\n  Incoming update filter list for all interfaces is not set\n  Router ID ${dev.rt.ospfRid}\n  Number of areas in this router is ${new Set(dev.rt.ospfIfs.map(x => x.area)).size}. ${new Set(dev.rt.ospfIfs.map(x => x.area)).size} normal 0 stub 0 nssa\n  Maximum path: 4\n  Routing for Networks:\n` +
    dev.ospf.networks.map(n => `    ${n.addr} ${n.wild} area ${n.area}`).join("\n") +
    (dev.ospf.passive.size || dev.ospf.passiveDefault ? `\n  Passive Interface(s):\n` + (dev.ospf.passiveDefault ? dev.ifaces().filter(i => !dev.ospf.noPassive.has(i.name)).map(i => "    " + i.name).join("\n") : [...dev.ospf.passive].map(n => "    " + n).join("\n")) : "") +
    `\n  Routing Information Sources:\n    Gateway         Distance      Last Update\n` + [...new Set(dev.rt.ospfNbrs.map(n => n.rid))].map(r => `    ${pad(r, 16)}110      ${UP}`).join("\n") + `\n  Distance: (default is 110)`;
}
export function ntpAssociations(dev) {
  if (!dev.ntp.length) return "";
  return `  address         ref clock       st   when   poll reach  delay  offset   disp\n` + dev.ntp.map((s, k) => `${k === 0 ? "*~" : " ~"}${pad(s, 16)}${pad("127.127.1.1", 16)}${pad(k === 0 ? "2" : "16", 5)}${pad("10", 7)}${pad("64", 5)}${pad(k === 0 ? "377" : "0", 6)}1.000   0.500   1.2`).join("\n") + `\n * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured`;
}
export function ntpStatus(dev) {
  if (!dev.ntp.length) return "Clock is unsynchronized, stratum 16, no reference clock\nnominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10";
  return `Clock is synchronized, stratum 3, reference is ${dev.ntp[0]}\nnominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10\nreference time is DB8A5E9F.3B2C1A00 (22:14:07.230 UTC Fri Oct 2 2026)\nclock offset is 0.5000 msec, root delay is 1.00 msec`;
}
