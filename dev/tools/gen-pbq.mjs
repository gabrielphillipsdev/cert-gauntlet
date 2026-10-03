/* Generates packs/ccna/pbq.js — CCNA config-order and topology-label PBQs (Chat 8).
   node dev/tools/gen-pbq.mjs [--check]
   Topology items: the scenario is built in the IOS simulator and every slot's key is READ from simulator state
   (STP role, OSPF DR/BDR state, routing lookup, NAT table, interface config that was proven to work). Slots sit on the
   links at computed positions. Config-order items are authored here; dev/tests/ccna-pbq.test.mjs proves them. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createLab, parseIfName } from "../../core/sims/ios/index.js";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const OUT = path.join(root, "packs/ccna/pbq.js");
const sh = n => parseIfName(n)?.short || n;
const must = (c, m) => { if (!c) throw new Error("assertion failed: " + m); };
const conv = lab => { lab.topo.converge(); return lab; };
const base = h => ["enable", "configure terminal", `hostname ${h}`, "no ip domain-lookup"];

/* ================= config-order items ================= */
const O = (id, obj, title, device, steps, task, why, pre) => ({ id, type: "ccna-order", obj, d: +obj[0], title, device, ...(pre ? { pre } : {}), steps,
  prompt: "Drag the configuration lines into an order that works when typed from global configuration mode.", task, why });
const ORDER = [
  O("po-ssh", "4.8", "Order: enable SSH on a router", "router",
    ["hostname R1", "ip domain-name ccna.lab", "crypto key generate rsa modulus 2048", "line vty 0 4", "transport input ssh", "login local"],
    ["The router must end up with an RSA key named after its hostname and domain.", "VTY lines must accept only SSH and use the local user database."],
    "The key label is hostname.domain, so both must exist before `crypto key generate rsa`; the two VTY commands only work inside line configuration mode. Any order that satisfies those two constraints is accepted."),
  O("po-roas", "2.1", "Order: router-on-a-stick sub-interfaces", "router",
    ["interface g0/0", "no shutdown", "interface g0/0.10", "encapsulation dot1q 10", "ip address 10.1.10.1 255.255.255.0", "interface g0/0.20", "encapsulation dot1q 20", "ip address 10.1.20.1 255.255.255.0"],
    ["Enable the physical interface.", "VLAN 10 and VLAN 20 each need a sub-interface with 802.1Q encapsulation and the gateway address."],
    "IOS refuses an IP address on a sub-interface until `encapsulation dot1q` is set. Blocks for the physical interface and each sub-interface can come in any order."),
  O("po-ospf", "3.4", "Order: single-area OSPF with a loopback router ID", "router",
    ["interface loopback 0", "ip address 1.1.1.1 255.255.255.255", "router ospf 1", "router-id 1.1.1.1", "network 10.0.12.0 0.0.0.3 area 0", "passive-interface g0/0", "default-information originate"],
    ["Create Loopback0 with 1.1.1.1/32.", "Run OSPF 1 with router ID 1.1.1.1, area 0 on 10.0.12.0/30, Gi0/0 passive, and advertise a default route."],
    "`router-id`, `network`, `passive-interface` and `default-information originate` are router-configuration commands, so they follow `router ospf 1`."),
  O("po-acl", "5.6", "Order: named extended ACL and apply it", "router",
    ["ip access-list extended LAB-WEB", "deny tcp host 10.1.10.66 any eq 80", "permit tcp 10.1.10.0 0.0.0.255 any eq 80", "interface g0/0", "ip access-group LAB-WEB in"],
    ["Host 10.1.10.66 must not browse (TCP 80); the rest of 10.1.10.0/24 may.", "Apply the ACL inbound on Gi0/0."],
    "ACEs are evaluated top-down and the first match wins, so the host-specific deny must come before the subnet permit — reversed, the permit would match .66 first."),
  O("po-pat", "4.1", "Order: PAT for a LAN", "router",
    ["interface g0/0", "ip nat inside", "interface g0/1", "ip nat outside", "exit", "access-list 1 permit 10.1.10.0 0.0.0.255", "ip nat inside source list 1 interface g0/1 overload"],
    ["Gi0/0 faces the LAN, Gi0/1 faces the ISP.", "All of 10.1.10.0/24 shares Gi0/1's address."],
    "`ip nat inside|outside` belong under their interfaces; the ACL and the NAT rule are global commands (entered after leaving interface mode) and can be entered in either order."),
  O("po-dhcp", "4.6", "Order: DHCP pool with exclusions", "router",
    ["ip dhcp excluded-address 10.1.10.1 10.1.10.10", "ip dhcp pool LAN", "network 10.1.10.0 255.255.255.0", "default-router 10.1.10.1", "dns-server 10.1.10.5"],
    ["Never lease 10.1.10.1–10.1.10.10.", "Pool LAN hands out 10.1.10.0/24 with gateway 10.1.10.1 and DNS 10.1.10.5."],
    "`network`, `default-router` and `dns-server` are DHCP-pool commands; the exclusion is global and may come before or after the pool."),
  O("po-ec", "2.4", "Order: LACP EtherChannel trunk", "switch",
    ["interface range g0/1 - 2", "channel-group 1 mode active", "interface port-channel 1", "switchport mode trunk", "switchport trunk native vlan 99"],
    ["Bundle Gi0/1–2 into Po1 with LACP, actively negotiating.", "Po1 is a trunk with native VLAN 99."],
    "`channel-group` creates Port-channel1, and the trunk settings belong on the Port-channel so they apply to every member."),
  O("po-psec", "5.7", "Order: port security on an access port", "switch",
    ["interface f0/5", "switchport mode access", "switchport port-security", "switchport port-security maximum 2", "switchport port-security violation restrict", "switchport port-security mac-address sticky"],
    ["Fa0/5 is a static access port.", "Allow 2 sticky MACs; restrict on violation."],
    "Port security is rejected on a dynamic (DTP) port, so `switchport mode access` must come before `switchport port-security`. The other port-security lines can be in any order."),
  O("po-float", "3.3", "Order: primary and floating default routes", "router",
    ["interface g0/1", "ip address 203.0.113.2 255.255.255.252", "no shutdown", "interface s0/1/0", "ip address 198.51.100.2 255.255.255.252", "no shutdown", "exit", "ip route 0.0.0.0 0.0.0.0 203.0.113.1", "ip route 0.0.0.0 0.0.0.0 198.51.100.1 10"],
    ["Address and enable both WAN interfaces.", "Default via 203.0.113.1; backup default via 198.51.100.1 with AD 10."],
    "Interface lines belong under their interface; the two static routes are global commands. They can even be entered before the interfaces exist — IOS keeps a static route whose next hop is not reachable yet and installs it once it is."),
  O("po-vlan", "2.2", "Order: access VLAN and trunk", "switch",
    ["vlan 10", "name SALES", "interface f0/1", "switchport mode access", "switchport access vlan 10", "interface g0/1", "switchport mode trunk", "switchport trunk allowed vlan 10,99"],
    ["Create VLAN 10 named SALES and put Fa0/1 in it.", "Gi0/1 is a trunk that allows VLANs 10 and 99."],
    "`name` is a VLAN-configuration command, so it must directly follow `vlan 10`. Interface blocks can come in either order."),
];

/* ================= topology-label items ================= */
const STP_DEV = { root: { n: "Root port", s: "ROOT" }, desg: { n: "Designated port", s: "DESG" }, altn: { n: "Alternate (blocking)", s: "BLOCK" } };
const ROLE = { Root: "root", Desg: "desg", Altn: "altn" };
/* slot on the link a–b, near a, offset to one side */
function portSlot(item, a, b, frac = 0.3, off = 0) {
  const A = item.nodes.find(n => n.id === a), B = item.nodes.find(n => n.id === b);
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  return { x: Math.round(A.x + dx * frac - dy / L * off), y: Math.round(A.y + dy * frac + dx / L * off) };
}
function stpItem(id, title, prompt, sws, links, place, why) {
  const devices = {}; for (const s of sws) devices[s.name] = { type: "switch" };
  const lab = createLab({ devices, links: links.map(l => [l.a, l.ia, l.b, l.ib]), configs: Object.fromEntries(sws.map(s => [s.name, [...base(s.name), ...(s.prio ? [`spanning-tree vlan 1 priority ${s.prio}`] : []), "end"]])) });
  conv(lab);
  const W = 480, H = 320;
  const item = { id, type: "diagram", obj: "2.5", d: 2, title, prompt, w: W, h: H, reuse: true, devices: STP_DEV, palette: ["root", "desg", "altn"], nodes: [], links: [], slots: [],
    task: ["Every port between the switches is a trunk carrying VLAN 1 and is up.", "Drag a role onto every port slot. A role can be used more than once."], why };
  for (const s of sws) { const d = lab.topo.get(s.name); const st = d.rt.stp[1]; item.nodes.push({ id: s.name, label: `${s.name}\nprio ${st.bridgeId.pri - 1} · ${d.baseMac}`, x: place[s.name][0], y: place[s.name][1], k: "sw", w: 132, h: 40 }); }
  for (const l of links) {
    item.links.push([l.a, l.b]);
    for (const [me, my, other] of [[l.a, l.ia, l.b], [l.b, l.ib, l.a]]) {
      const port = lab.topo.get(me).rt.stp[1].ports.find(p => p.name === parseIfName(my).name); must(port, `${me} ${my} in STP`);
      const p = portSlot(item, me, other, l.frac || 0.36, l.off || 0);
      item.slots.push({ id: `${me}-${sh(parseIfName(my).name)}`, label: `${me} ${sh(parseIfName(my).name)} (cost ${port.cost})`, x: p.x, y: p.y, want: ROLE[port.role] });
    }
  }
  return item;
}

const DR_DEV = { dr: { n: "DR", s: "DR" }, bdr: { n: "BDR", s: "BDR" }, drother: { n: "DROTHER", s: "DROTHER" } };
function drItem(id, title, prompt, routers, why) {
  const devices = { LAN: { type: "switch" } }; routers.forEach(r => devices[r.name] = { type: "router" });
  const lab = createLab({ devices, links: routers.map((r, i) => [r.name, "g0/0", "LAN", `f0/${i + 1}`]), configs: Object.fromEntries(routers.map(r => [r.name, [...base(r.name), "interface g0/0", `ip address ${r.ip} 255.255.255.0`, ...(r.pri !== undefined ? [`ip ospf priority ${r.pri}`] : []), "no shutdown",
    ...(r.lo ? ["interface loopback 0", `ip address ${r.lo} 255.255.255.255`] : []), "router ospf 1", ...(r.rid ? [`router-id ${r.rid}`] : []), "network 0.0.0.0 255.255.255.255 area 0", "end"]])) });
  conv(lab);
  const item = { id, type: "diagram", obj: "3.4", d: 3, title, prompt, w: 480, h: 300, reuse: true, devices: DR_DEV, palette: ["dr", "bdr", "drother"], nodes: [{ id: "LAN", label: "Ethernet segment 10.50.0.0/24", x: 240, y: 150, k: "sw", w: 200, h: 30 }], links: [], slots: [],
    task: ["All four routers run OSPF on Gi0/0 in area 0 and booted at the same moment.", "Label each router's role on the segment."], why };
  const pos = [[90, 60], [390, 60], [90, 250], [390, 250]];
  routers.forEach((r, i) => {
    const d = lab.topo.get(r.name); const oi = d.rt.ospfIfs.find(x => x.iface.name === "GigabitEthernet0/0");
    const facts = [`Gi0/0 ${r.ip}`, `priority ${r.pri ?? 1}`, r.rid ? `router-id ${r.rid}` : r.lo ? `Loopback0 ${r.lo}` : "no router-id, no loopback"];
    item.nodes.push({ id: r.name, label: `${r.name}\n${facts.join("\n")}`, x: pos[i][0], y: pos[i][1] + (i < 2 ? 0 : 0), k: "rtr", w: 150, h: 58 });
    item.links.push([r.name, "LAN"]);
    item.slots.push({ id: `${r.name}-role`, label: `${r.name} role`, x: pos[i][0] + (i % 2 ? -120 : 120), y: pos[i][1], want: { DR: "dr", BDR: "bdr", DROTHER: "drother" }[oi.state] });
  });
  return item;
}

function nextHopItems() {
  const lab = createLab({
    devices: { R1: { type: "router" }, R2: { type: "router" }, R3: { type: "router" }, ISP: { type: "router" }, H8: { host: true, ip: "10.8.0.10", mask: "255.255.255.0", gw: "10.8.0.1" }, H9: { host: true, ip: "10.9.0.10", mask: "255.255.255.0", gw: "10.9.0.1" } },
    links: [["R1", "g0/1", "R2", "g0/1"], ["R1", "g0/2", "R3", "g0/2"], ["R1", "s0/1/0", "ISP", "s0/1/0"], ["R2", "g0/0", "H8"], ["R2", "g0/2", "H9"]],
    configs: {
      R1: [...base("R1"), "interface g0/1", "ip address 10.0.12.1 255.255.255.0", "no shutdown", "interface g0/2", "ip address 10.0.13.1 255.255.255.0", "no shutdown", "interface s0/1/0", "ip address 203.0.113.2 255.255.255.252", "no shutdown", "exit",
        "ip route 10.2.0.0 255.255.0.0 10.0.12.2", "ip route 10.2.5.0 255.255.255.0 10.0.13.3", "ip route 10.2.5.128 255.255.255.128 10.0.12.2", "ip route 0.0.0.0 0.0.0.0 203.0.113.1",
        "ip route 10.9.0.0 255.255.255.0 10.0.13.3", "ip route 10.8.0.0 255.255.255.0 10.0.13.3 120", "router ospf 1", "network 10.0.12.0 0.0.0.255 area 0", "end"],
      R2: [...base("R2"), "interface g0/1", "ip address 10.0.12.2 255.255.255.0", "no shutdown", "interface g0/0", "ip address 10.8.0.1 255.255.255.0", "no shutdown", "interface g0/2", "ip address 10.9.0.1 255.255.255.0", "no shutdown", "exit",
        "router ospf 1", "network 10.0.12.0 0.0.0.255 area 0", "network 10.8.0.0 0.0.0.255 area 0", "network 10.9.0.0 0.0.0.255 area 0", "end"],
      R3: [...base("R3"), "interface g0/2", "ip address 10.0.13.3 255.255.255.0", "no shutdown", "end"],
      ISP: [...base("ISP"), "interface s0/1/0", "ip address 203.0.113.1 255.255.255.252", "no shutdown", "end"],
    },
  });
  conv(lab);
  const R1 = lab.topo.get("R1");
  const NH = { r2: { n: "10.0.12.2 (R2)", s: "10.0.12.2" }, r3: { n: "10.0.13.3 (R3)", s: "10.0.13.3" }, isp: { n: "203.0.113.1 (ISP)", s: "203.0.113.1" } };
  const byIp = { "10.0.12.2": "r2", "10.0.13.3": "r3", "203.0.113.1": "isp" };
  const nodes = [{ id: "R1", label: "R1", x: 240, y: 150, k: "rtr" }, { id: "R2", label: "R2 10.0.12.2", x: 90, y: 60, k: "rtr", w: 110 }, { id: "R3", label: "R3 10.0.13.3", x: 90, y: 250, k: "rtr", w: 110 }, { id: "ISP", label: "ISP 203.0.113.1", x: 400, y: 150, k: "cloud", w: 130 }];
  const links = [["R1", "R2"], ["R1", "R3"], ["R1", "ISP"]];
  const mk = (id, title, prompt, dests, task, why) => ({
    id, type: "diagram", obj: "3.2", d: 3, title, prompt, w: 480, h: 300, reuse: true, devices: NH, palette: ["r2", "r3", "isp"], nodes, links, task, why,
    slots: dests.map((dst, i) => { const r = lab.topo.lookup(R1, dst); must(r, "route for " + dst); return { id: "d" + i, label: `to ${dst}`, x: 300 + (i % 2) * 120, y: 40 + Math.floor(i / 2) * 210 + (i % 2) * 20, want: byIp[r.via] }; }),
  });
  const table = "R1 routes: S 10.2.0.0/16 via 10.0.12.2 · S 10.2.5.0/24 via 10.0.13.3 · S 10.2.5.128/25 via 10.0.12.2 · S* 0.0.0.0/0 via 203.0.113.1";
  const t1 = mk("pt-nexthop-lpm", "Next hop: longest prefix match", "R1's static routes are listed in the task pane. Label the next hop R1 uses for each destination.",
    ["10.2.5.9", "10.2.5.200", "10.2.77.1", "172.20.0.1"], [table, "Drag a next hop onto each destination. A next hop can be used more than once."],
    "The most specific matching prefix wins regardless of the order routes were entered: 10.2.5.9 → /24 (R3); 10.2.5.200 → /25 (R2); 10.2.77.1 → only the /16 (R2); 172.20.0.1 → only the default (ISP).");
  const t2 = mk("pt-nexthop-ad", "Next hop: administrative distance", "R1 learns some prefixes from OSPF (via R2) and has static routes for them via R3. Label the next hop R1 installs for each destination.",
    ["10.9.0.5", "10.8.0.5", "10.0.13.77", "198.18.0.1"], ["OSPF from R2 advertises 10.8.0.0/24 and 10.9.0.0/24.", "Statics on R1: 10.9.0.0/24 via 10.0.13.3 (AD 1) · 10.8.0.0/24 via 10.0.13.3 AD 120 · default via 203.0.113.1.", "10.0.13.0/24 is directly connected on Gi0/2 — label it with the R3 address it reaches it toward."],
    "Same prefix length, so administrative distance decides: static (1) beats OSPF (110) for 10.9.0.0/24, but OSPF (110) beats the floating static (120) for 10.8.0.0/24. A connected network is delivered directly; the label shows the neighbor on that segment.");
  // connected destination: lookup returns no via → map to r3 for the 10.0.13.0/24 segment
  t2.slots.forEach((s, i) => { if (!s.want) { const r = lab.topo.lookup(R1, ["10.9.0.5", "10.8.0.5", "10.0.13.77", "198.18.0.1"][i]); must(r.connected && r.iface === "GigabitEthernet0/2", "connected"); s.want = "r3"; } });
  must(t2.slots[0].want === "r3" && t2.slots[1].want === "r2", "AD outcome");
  return [t1, t2];
}

function natItems() {
  const lab = createLab({
    devices: { EDGE: { type: "router" }, ISP: { type: "router" }, PC: { host: true, ip: "172.16.1.21", mask: "255.255.255.0", gw: "172.16.1.1" }, LAN2: { host: true, ip: "172.16.2.30", mask: "255.255.255.0", gw: "172.16.2.1" }, DMZ: { host: true, ip: "192.168.50.10", mask: "255.255.255.0", gw: "192.168.50.1" } },
    links: [["EDGE", "g0/0", "PC"], ["EDGE", "g0/1", "LAN2"], ["EDGE", "g0/2", "DMZ"], ["EDGE", "s0/1/0", "ISP", "s0/1/0"]],
    configs: {
      EDGE: [...base("EDGE"), "interface g0/0", "ip address 172.16.1.1 255.255.255.0", "ip nat inside", "no shutdown", "interface g0/1", "ip address 172.16.2.1 255.255.255.0", "ip nat inside", "no shutdown", "interface g0/2", "ip address 192.168.50.1 255.255.255.0", "ip nat inside", "no shutdown",
        "interface s0/1/0", "ip address 203.0.113.6 255.255.255.248", "ip nat outside", "no shutdown", "exit", "ip route 0.0.0.0 0.0.0.0 203.0.113.1",
        "access-list 1 permit 172.16.0.0 0.0.255.255", "ip nat inside source list 1 interface s0/1/0 overload", "ip nat inside source static 192.168.50.10 203.0.113.50", "end"],
      ISP: [...base("ISP"), "interface s0/1/0", "ip address 203.0.113.1 255.255.255.248", "no shutdown", "interface loopback 0", "ip address 8.8.8.8 255.255.255.255", "exit", "ip route 203.0.113.48 255.255.255.240 203.0.113.6", "end"],
    },
  });
  conv(lab);
  for (const [f, t] of [["PC", "8.8.8.8"], ["LAN2", "8.8.8.8"], ["ISP", "203.0.113.50"]]) { const p = lab.topo.ping(f, t); if (p.pct < 80) console.log(f, t, p.marks, p.why); }
  must(lab.topo.ping("PC", "8.8.8.8").pct === 100 && lab.topo.ping("LAN2", "8.8.8.8").pct === 100 && lab.topo.ping("ISP", "203.0.113.50").pct >= 80, "NAT scenario works");
  const E = lab.topo.get("EDGE"); const t = E.rt.nat.find(x => x.il === "172.16.1.21"); must(t && t.ol === "8.8.8.8" && t.og === "8.8.8.8", "translation");
  const TERMS = { il: { n: "Inside local", s: "IN-LOCAL" }, ig: { n: "Inside global", s: "IN-GLOBAL" }, ol: { n: "Outside local", s: "OUT-LOCAL" }, og: { n: "Outside global", s: "OUT-GLOBAL" } };
  const t1 = {
    id: "pt-nat-terms", type: "diagram", obj: "4.1", d: 4, title: "NAT address terms", prompt: "PC 172.16.1.21 pings 8.8.8.8 through EDGE's PAT. Label each address with its NAT term.", w: 480, h: 300, devices: TERMS, palette: ["il", "ig", "ol", "og"],
    nodes: [{ id: "PC", label: "PC", x: 50, y: 150, k: "pc", w: 60 }, { id: "EDGE", label: "EDGE (PAT)", x: 240, y: 150, k: "rtr", w: 100 }, { id: "NET", label: "8.8.8.8", x: 430, y: 150, k: "cloud", w: 80 }, { id: "IN", label: "inside", x: 140, y: 270, k: "box", w: 70, h: 24 }, { id: "OUT", label: "outside", x: 340, y: 270, k: "box", w: 70, h: 24 }],
    links: [["PC", "EDGE"], ["EDGE", "NET"]],
    slots: [
      { id: "src-in", label: `source ${t.il} (inside)`, x: 130, y: 70, want: "il" }, { id: "dst-in", label: `destination ${t.ol} (inside)`, x: 130, y: 220, want: "ol" },
      { id: "src-out", label: `source ${t.ig} (outside)`, x: 350, y: 70, want: "ig" }, { id: "dst-out", label: `destination ${t.og} (outside)`, x: 350, y: 220, want: "og" },
    ],
    task: ["Inside = how the address appears on the inside network; global vs local = whose address it is (ours or theirs) as seen on that side.", "Each term is used exactly once."],
    why: `Read straight from show ip nat translations: Inside local ${t.il} (our host as seen inside), Inside global ${t.ig} (our host as seen outside), Outside local and Outside global both ${t.og} (their host — PAT does not translate the destination).`,
  };
  const NI = { inside: { n: "ip nat inside", s: "INSIDE" }, outside: { n: "ip nat outside", s: "OUTSIDE" } };
  const t2 = {
    id: "pt-nat-interfaces", type: "diagram", obj: "4.1", d: 4, title: "NAT inside and outside interfaces", prompt: "Both LANs share the serial address (PAT) and the DMZ server is published as 203.0.113.50. Label every EDGE interface.", w: 480, h: 300, reuse: true, devices: NI, palette: ["inside", "outside"],
    nodes: [{ id: "EDGE", label: "EDGE", x: 240, y: 150, k: "rtr" }, { id: "L1", label: "LAN 172.16.1.0/24", x: 70, y: 60, k: "pc", w: 130 }, { id: "L2", label: "LAN 172.16.2.0/24", x: 70, y: 240, k: "pc", w: 130 }, { id: "DMZ", label: "DMZ web 192.168.50.10", x: 410, y: 250, k: "srv", w: 140 }, { id: "ISP", label: "ISP / Internet", x: 410, y: 50, k: "cloud", w: 120 }],
    links: [["EDGE", "L1"], ["EDGE", "L2"], ["EDGE", "DMZ"], ["EDGE", "ISP"]],
    slots: [["g0/0", "L1", 155, 100], ["g0/1", "L2", 155, 200], ["g0/2", "DMZ", 330, 205], ["s0/1/0", "ISP", 330, 95]].map(([i, , x, y]) => ({ id: i, label: sh(parseIfName(i).name), x, y, want: E.interfaces[parseIfName(i).name].nat })),
    task: ["Every interface that private addresses enter from is inside; the interface toward the public network is outside.", "A label can be used more than once."],
    why: "The DMZ server has a private address too, so its interface is inside — static NAT translates it on the way out the outside interface. The scenario was proven in the simulator: both LANs reach 8.8.8.8 and the ISP reaches 203.0.113.50.",
  };
  return [t1, t2];
}

function passiveItem() {
  const lab = createLab({
    devices: { R1: { type: "router" }, R2: { type: "router" }, R3: { type: "router" }, PCS: { host: true, ip: "10.1.10.10", mask: "255.255.255.0", gw: "10.1.10.1" }, SRV: { host: true, ip: "10.1.20.10", mask: "255.255.255.0", gw: "10.1.20.1" } },
    links: [["R1", "g0/0", "PCS"], ["R1", "g0/2", "SRV"], ["R1", "g0/1", "R2", "g0/1"], ["R1", "s0/1/0", "R3", "s0/1/0"]],
    configs: {
      R1: [...base("R1"), "interface g0/0", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "interface g0/2", "ip address 10.1.20.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "interface s0/1/0", "ip address 10.0.13.1 255.255.255.252", "no shutdown", "exit",
        "router ospf 1", "network 10.0.0.0 0.255.255.255 area 0", "passive-interface default", "no passive-interface g0/1", "no passive-interface s0/1/0", "end"],
      R2: [...base("R2"), "interface g0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "exit", "router ospf 1", "network 10.0.0.0 0.255.255.255 area 0", "end"],
      R3: [...base("R3"), "interface s0/1/0", "ip address 10.0.13.2 255.255.255.252", "no shutdown", "exit", "router ospf 1", "network 10.0.0.0 0.255.255.255 area 0", "end"],
    },
  });
  conv(lab);
  const R1 = lab.topo.get("R1");
  must(R1.rt.ospfNbrs.filter(n => n.full).length === 2, "two adjacencies");
  must(lab.topo.get("R2").rt.routes.some(r => r.prefix === "10.1.20.0" && r.code === "O") && lab.topo.get("R3").rt.routes.some(r => r.prefix === "10.1.10.0" && r.code === "O"), "LANs advertised");
  const passive = n => { const o = R1.ospf; const has = (x, v) => x instanceof Set ? x.has(v) : x.includes(v); return o.passiveDefault ? !has(o.noPassive, n) : has(o.passive, n); };
  const P = { passive: { n: "passive-interface", s: "PASSIVE" }, active: { n: "Send hellos (not passive)", s: "HELLOS" } };
  return {
    id: "pt-ospf-passive", type: "diagram", obj: "3.4", d: 3, title: "OSPF: which interfaces should be passive?", prompt: "R1 advertises all four networks in OSPF. Hellos should go only where another router listens. Label each R1 interface.", w: 480, h: 300, reuse: true, devices: P, palette: ["passive", "active"],
    nodes: [{ id: "R1", label: "R1", x: 240, y: 150, k: "rtr" }, { id: "PCS", label: "Staff PCs 10.1.10.0/24", x: 70, y: 60, k: "pc", w: 140 }, { id: "SRV", label: "Servers 10.1.20.0/24", x: 70, y: 245, k: "srv", w: 140 }, { id: "R2", label: "R2", x: 420, y: 60, k: "rtr" }, { id: "R3", label: "R3", x: 420, y: 245, k: "rtr" }],
    links: [["R1", "PCS"], ["R1", "SRV"], ["R1", "R2"], ["R1", "R3"]],
    slots: [["g0/0", 155, 100], ["g0/2", 155, 205], ["g0/1", 330, 100], ["s0/1/0", 330, 205]].map(([i, x, y]) => ({ id: i, label: sh(parseIfName(i).name), x, y, want: passive(parseIfName(i).name) ? "passive" : "active" })),
    task: ["Passive interfaces keep their network in OSPF but send no hellos.", "A label can be used more than once."],
    why: "Hellos toward PCs and servers are wasted and let a rogue device try to peer. Passive keeps the LAN advertised (proven: R2 and R3 learn both LANs) while the router-facing links keep their adjacencies.",
  };
}

const TOPO = [
  stpItem("pt-stp-triangle", "STP port roles: triangle with a configured root", "Label every inter-switch port with its spanning-tree role for VLAN 1.",
    [{ name: "SW1", prio: 4096 }, { name: "SW2" }, { name: "SW3" }],
    [{ a: "SW1", ia: "g0/1", b: "SW2", ib: "g0/1" }, { a: "SW1", ia: "g0/2", b: "SW3", ib: "g0/1" }, { a: "SW2", ia: "g0/2", b: "SW3", ib: "g0/2" }],
    { SW1: [240, 50], SW2: [90, 250], SW3: [390, 250] },
    "SW1 has the lowest priority, so it is root and all its ports are designated. SW2 and SW3 each pick the port toward SW1 as root port. On the SW2–SW3 link both have cost 4 to the root, so the lower bridge ID (equal priority → lower MAC, SW2) is designated and SW3's end blocks."),
  stpItem("pt-stp-square", "STP port roles: four switches, mixed link speeds", "Label every inter-switch port with its spanning-tree role for VLAN 1. FastEthernet costs 19, GigabitEthernet 4.",
    [{ name: "SW1", prio: 8192 }, { name: "SW2" }, { name: "SW3" }, { name: "SW4" }],
    [{ a: "SW1", ia: "g0/1", b: "SW2", ib: "g0/1" }, { a: "SW2", ia: "f0/2", b: "SW3", ib: "f0/2" }, { a: "SW3", ia: "g0/2", b: "SW4", ib: "g0/2" }, { a: "SW4", ia: "f0/1", b: "SW1", ib: "f0/1" }],
    { SW1: [90, 50], SW2: [390, 50], SW3: [390, 260], SW4: [90, 260] },
    "Root path cost decides root ports: SW2 reaches SW1 for 4 over Gi; SW4's direct Fa link costs 19, SW3 has two paths costing 4+19 = 23 (via SW2) and 19+4 = 23 (via SW4), so the tie goes to the neighbor with the lower bridge ID. On each segment, the switch with the lower root path cost is designated; the remaining port blocks."),
  stpItem("pt-stp-default", "STP port roles: nobody configured a priority", "No priorities were configured. Label every inter-switch port with its role for VLAN 1 (bridge MACs are shown).",
    [{ name: "ACC1" }, { name: "DIST1" }, { name: "DIST2" }],
    [{ a: "DIST1", ia: "g0/1", b: "DIST2", ib: "g0/1" }, { a: "DIST1", ia: "g0/2", b: "ACC1", ib: "g0/1" }, { a: "DIST2", ia: "g0/2", b: "ACC1", ib: "g0/2" }],
    { DIST1: [90, 50], DIST2: [390, 50], ACC1: [240, 260] },
    "With every priority at 32768 the lowest MAC wins — here the access switch ACC1, which is why the exam keeps telling you to set root priorities on the distribution switches. Both distribution switches point their root port at ACC1; on the DIST1–DIST2 link DIST1 (lower MAC) is designated and DIST2's port blocks."),
  drItem("pt-dr-priority", "OSPF DR/BDR: priorities", "Label each router's OSPF role on the shared Ethernet segment.",
    [{ name: "RA", ip: "10.50.0.1", rid: "1.1.1.1" }, { name: "RB", ip: "10.50.0.2", rid: "2.2.2.2", pri: 100 }, { name: "RC", ip: "10.50.0.3", rid: "3.3.3.3" }, { name: "RD", ip: "10.50.0.4", rid: "4.4.4.4", pri: 0 }],
    "Highest priority wins DR (RB, 100). For BDR the priorities tie at 1 between RA and RC, so the higher router ID wins (RC, 3.3.3.3). RD has priority 0 and can never be DR or BDR even with the highest router ID."),
  drItem("pt-dr-rid", "OSPF DR/BDR: router IDs without router-id", "No priorities were changed. Label each router's OSPF role on the segment.",
    [{ name: "RA", ip: "10.50.0.1", lo: "10.0.0.9" }, { name: "RB", ip: "10.50.0.2", lo: "10.0.0.20" }, { name: "RC", ip: "10.50.0.3", lo: "192.168.1.1" }, { name: "RD", ip: "10.50.0.4" }],
    "Router ID order: router-id command, else highest loopback, else highest active interface. RC = 192.168.1.1 (DR), RD has no loopback so its RID is 10.50.0.4 (BDR, beats 10.0.0.20 and 10.0.0.9)."),
  ...nextHopItems(), ...natItems(), passiveItem(),
];

const items = { order: ORDER, topo: TOPO };
const body = `/* GENERATED by dev/tools/gen-pbq.mjs — do not edit by hand. Topology keys were read from the IOS simulator;
   config-order items are graded by replaying the student's order in the simulator (core/sims/ios/ui/configOrder.js). */
export const PBQ_ORDER = ${JSON.stringify(items.order, null, 1)};
export const PBQ_TOPO = ${JSON.stringify(items.topo, null, 1)};
`;
if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) { console.error("packs/ccna/pbq.js is stale — run node dev/tools/gen-pbq.mjs"); process.exit(1); }
  console.log(`pbq: ${ORDER.length} order + ${TOPO.length} topology items match the simulator`);
} else { writeFileSync(OUT, body); console.log(`wrote ${ORDER.length} order + ${TOPO.length} topology PBQs → packs/ccna/pbq.js`); }
