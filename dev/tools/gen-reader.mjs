/* Generates packs/ccna/reader.js — the CCNA show-output reader (Chat 8).
   node dev/tools/gen-reader.mjs          write the file
   node dev/tools/gen-reader.mjs --check  exit 1 if the file differs from what the simulator produces now (the validator runs this)

   For every item: build its scenario fresh (dev/tools/reader-scenarios.mjs), run the show command, keep the exact output,
   then call key(lab) to DERIVE the correct option from simulator state. Generation fails if the derived key is not one of
   the four options or equals a distractor. The correct option's position is fixed per id (hash), so diffs stay stable. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SCENARIOS } from "./reader-scenarios.mjs";
import { parseIfName } from "../../core/sims/ios/index.js";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const OUT = path.join(root, "packs/ccna/reader.js");
const sh = n => parseIfName(n)?.short || n;
const dev = (lab, n) => lab.topo.get(n);
const ifc = (lab, n, i) => dev(lab, n).interfaces[parseIfName(i).name];
const stp = (lab, n, v) => dev(lab, n).rt.stp[v];
const lk = (lab, n, ip) => lab.topo.lookup(dev(lab, n), ip);
const must = (cond, msg) => { if (!cond) throw new Error("key assertion failed: " + msg); };

/* item: [id, obj, scenario, device, command, question, key(lab) -> correct text, [3 distractors], why] */
const ITEMS = [
  /* ---------- show ip route (3.1 / 3.2) ---------- */
  ["rd-route-1", "3.2", "routing", "HQ", "show ip route", "BR1's Loopback1 is configured as 10.20.2.1/24. Which next hop does HQ use for a packet to 10.20.2.77?",
    l => { const r = lk(l, "HQ", "10.20.2.77"); must(r.route.len === 0, "falls to default"); return r.via; }, ["10.0.1.2", "10.0.2.2", "None — the packet is dropped"],
    "OSPF advertises a loopback as a /32 host route, so HQ only knows 10.20.2.1/32. 10.20.2.77 does not match it; the only matching route is the default S* 0.0.0.0/0, so the packet heads to the ISP. (ip ospf network point-to-point on the loopback would advertise the /24.)"],
  ["rd-route-2", "3.2", "routing", "HQ", "show ip route", "A packet for 172.16.50.9 arrives at HQ. Which route is used?",
    l => { const r = lk(l, "HQ", "172.16.50.9"); return `S 172.16.50.0/24 [${r.route.ad}/0] via ${r.via}`; }, ["S 172.16.50.0/24 [200/0] via 198.51.100.1", "S* 0.0.0.0/0 [1/0] via 198.51.100.1", "O 10.0.12.0/30 [110/65] via 10.0.2.2"],
    "The static route with administrative distance 1 is installed. HQ also has a floating static to the same prefix with AD 200 via the ISP; it stays out of the routing table until the AD-1 route's next hop stops resolving, so it never appears in this output."],
  ["rd-route-3", "3.1", "routing", "HQ", "show ip route", "How does HQ forward traffic to 10.0.12.0/30?",
    l => { const r = l.topo.get("HQ").rt.routes.find(x => x.prefix === "10.0.12.0"); must(r.nhs.length === 2, "ECMP"); return `Equal-cost load sharing via ${r.nhs.map(h => h.via).join(" and ")}, metric ${r.metric}`; },
    ["Only via 10.0.1.2; the second line is a backup", "Via the Serial0/1/0 default route", "Only via 10.0.2.2, the lower next-hop address wins"],
    "Two next hops listed under one prefix with the same [110/65] are equal-cost OSPF paths; IOS installs both (up to 4 by default) and load-shares."],
  ["rd-route-4", "3.2", "routing", "HQ", "show ip route", "HQ receives a packet for 203.0.113.9. What happens?",
    l => { const r = lk(l, "HQ", "203.0.113.9"); must(r.route.len === 0, "default"); return `It follows the gateway of last resort, ${r.via}`; },
    ["It is dropped: no route matches 203.0.113.9", "It is sent out every OSPF interface", "It is forwarded via 10.0.2.2, the floating route"],
    "No specific prefix covers 203.0.113.9, so the default route S* 0.0.0.0/0 — the gateway of last resort — is used."],
  ["rd-route-5", "3.1", "routing", "BR1", "show ip route", "In BR1's table, what does the O*E2 0.0.0.0/0 entry with [110/1] tell you?",
    l => { const r = l.topo.get("BR1").rt.routes.find(x => x.len === 0); must(r.code === "O*E2", "O*E2"); return "An OSPF external type 2 default route, AD 110, metric 1, originated by another router with default-information originate"; },
    ["A static default route configured on BR1 with metric 110", "An inter-area OSPF route with cost 110", "An EIGRP external route redistributed into OSPF"],
    "O = OSPF, * = candidate default, E2 = external type 2 (the metric is not increased along the path, so it stays 1). [110/1] is AD/metric. HQ injects it with default-information originate because HQ has its own static default."],

  /* ---------- show ip interface brief (1.4) ---------- */
  ["rd-ipbr-1", "1.4", "ifstates", "R1", "show ip interface brief", "Which interface on R1 has an IP address but was disabled with the shutdown command?",
    l => { const i = Object.values(dev(l, "R1").interfaces).find(x => x.ip && x.shutdown); return sh(i.name).replace("Se", "Serial"); }, ["GigabitEthernet0/1", "GigabitEthernet0/2", "Serial0/1/1"],
    "administratively down = shut locally. Serial0/1/1 is also administratively down but has no address (it is simply unconfigured)."],
  ["rd-ipbr-2", "1.4", "ifstates", "R1", "show ip interface brief", "Gi0/1 is down/down even though it was never shut on R1. What is the most likely cause?",
    l => { const i = ifc(l, "R1", "g0/1"); must(!i.shutdown && !i.rt.up, "down not shut"); return "A Layer 1 problem: the far-end port is shut down, or the cable is missing or faulty"; },
    ["A shutdown command on R1 Gi0/1", "An encapsulation or keepalive mismatch (that shows up/down)", "A duplicate IP address on the link"],
    "down/down without \"administratively\" means no physical link. up/down would point to Layer 2 (encapsulation, keepalives). Here the neighbor R2 has shut its side."],
  ["rd-ipbr-3", "1.4", "ifstates", "R1", "show ip interface brief", "How many of R1's interfaces can forward traffic right now (up/up)?",
    l => String(Object.values(dev(l, "R1").interfaces).filter(i => i.rt.up && i.rt.proto).length), ["1", "3", "4"],
    "Only Gi0/0 and Loopback0 are up/up; a loopback is always up unless shut."],
  ["rd-ipbr-4", "2.8", "ifstates", "SW1", "show ip interface brief", "Which address would an administrator use to SSH to SW1, and why?",
    l => { const v = ifc(l, "SW1", "vlan1"); must(v.rt.up && v.rt.proto, "svi up"); return `${v.ip.addr}, the address of the Vlan1 SVI`; }, ["192.168.10.1, the default gateway", "Any switch port's address", "None — a Layer 2 switch cannot be managed over IP"],
    "Layer 2 switch ports have no IP addresses (unassigned); remote management uses an SVI, here interface Vlan1, plus ip default-gateway for off-subnet access."],

  /* ---------- show spanning-tree (2.5) ---------- */
  ["rd-stp-1", "2.5", "campus", "AS1", "show spanning-tree vlan 10", "Which AS1 port is blocking in VLAN 10?",
    l => sh(stp(l, "AS1", 10).ports.find(p => p.sts === "BLK").name), ["Gi0/1", "Fa0/1", "Fa0/2"],
    "Altn BLK = alternate port, discarding. AS1 reaches the root (priority 24586) via Gi0/1; Gi0/2 is a second path to the root and is blocked to break the loop."],
  ["rd-stp-2", "2.5", "campus", "AS1", "show spanning-tree vlan 10", "The root bridge for VLAN 10 shows priority 24586. What was configured on it?",
    l => { const r = stp(l, "AS1", 10).rootId.pri; return `spanning-tree vlan 10 priority ${r - 10}`; }, ["spanning-tree vlan 10 priority 24586", "spanning-tree vlan 10 root secondary", "Nothing — 24586 is the default"],
    "With PVST+ the bridge priority is the configured value plus the VLAN number (extended system ID): 24576 + 10 = 24586. Priorities must be multiples of 4096; the default is 32768."],
  ["rd-stp-3", "2.5", "campus", "DS2", "show spanning-tree vlan 20", "Why is DS2 the root bridge for VLAN 20?",
    l => { must(stp(l, "DS2", 20).root, "ds2 root"); return "Its configured priority (24576) is lower than every other switch's for VLAN 20"; },
    ["It has the lowest MAC address", "It has the most designated ports", "VLAN 20 is the native VLAN on its trunks"],
    "The lowest bridge ID wins; priority is compared first and the MAC only breaks ties. DS1 uses 28672 for VLAN 20, AS1 the default 32768."],
  ["rd-stp-4", "2.5", "campus", "AS1", "show spanning-tree vlan 10", "Fa0/1 and Fa0/2 show type P2p Edge. What does that indicate?",
    l => { must(ifc(l, "AS1", "f0/1").stp.portfast, "portfast"); return "PortFast is enabled: the ports go straight to forwarding"; },
    ["The ports are trunks to other switches", "BPDU guard has err-disabled them", "The ports are blocked as alternates"],
    "Edge = PortFast; the port skips listening/learning. Use it only toward end hosts, usually with BPDU guard."],

  /* ---------- show vlan brief (2.1) ---------- */
  ["rd-vlan-1", "2.1", "campus", "AS1", "show vlan brief", "PCC is connected to Fa0/3. Which VLAN is it in?",
    l => String(ifc(l, "AS1", "f0/3").switchport.access), ["10", "1", "40"], "Fa0/3 is listed in the Ports column of VLAN 20 (VOICE)."],
  ["rd-vlan-2", "2.1", "campus", "AS1", "show vlan brief", "Why are Gi0/1 and Gi0/2 missing from the output?",
    l => { must(ifc(l, "AS1", "g0/1").rt.opMode === "trunk", "trunk"); return "They are trunk ports; show vlan brief lists access ports only"; },
    ["They are shut down", "They belong to an unlisted VLAN", "They are routed ports"],
    "Trunks carry many VLANs and are not shown in show vlan brief; use show interfaces trunk."],
  ["rd-vlan-3", "2.1", "campus", "AS1", "show vlan brief", "A new laptop is plugged into Fa0/9 with no further configuration. Which VLAN is it in?",
    l => `${ifc(l, "AS1", "f0/9").switchport.access} (default)`, ["10 (STAFF)", "40 (GUEST)", "None until a VLAN is assigned"],
    "Every switchport starts in VLAN 1, the default VLAN, and Fa0/9 is listed there."],
  ["rd-vlan-4", "2.1", "campus", "AS1", "show vlan brief", "Which VLAN exists on AS1 but has no access port assigned to it?",
    l => { const used = new Set(Object.values(dev(l, "AS1").interfaces).filter(i => i.switchport && i.rt.opMode !== "trunk").map(i => i.switchport.access)); const v = Object.keys(dev(l, "AS1").vlans).map(Number).filter(v => v < 1002 && !used.has(v)); must(v.length === 0, "all used"); return "None — every VLAN listed has at least one port"; },
    ["VLAN 20", "VLAN 40", "VLAN 1"], "1, 10, 20 and 40 all list ports. VLANs 1002–1005 are legacy defaults (act/unsup)."],

  /* ---------- show ip ospf neighbor (3.4) ---------- */
  ["rd-nbr-1", "3.4", "ospfLan", "RD", "show ip ospf neighbor", "Which router is the DR on the 10.50.0.0/24 segment, and why?",
    l => { const n = dev(l, "RD").rt.ospfNbrs.find(x => x.state.endsWith("/DR")); must(n.pri === 50, "pri"); return `${n.rid}, because its interface priority (50) is the highest`; },
    ["10.255.0.4, because it has the highest router ID", "10.255.0.1, because it was configured first", "10.255.0.3, because priority 0 is the best"],
    "DR election: highest interface priority first, highest router ID second. Priority 0 means never DR/BDR."],
  ["rd-nbr-2", "3.4", "ospfLan", "RA", "show ip ospf neighbor", "RA lists 10.255.0.3 in 2WAY/DROTHER. Is that a problem?",
    l => { const me = dev(l, "RA").rt.ospfIfs.find(x => x.iface.name === "GigabitEthernet0/0"); must(me.state === "DROTHER", "RA drother"); return "No — RA and that router are both DROTHERs, and DROTHERs stay in 2-WAY with each other"; },
    ["Yes — the adjacency is stuck and routes will not be exchanged", "Yes — the hello timers do not match", "No — 2WAY means the router is the BDR"],
    "On a broadcast segment, DROTHERs go FULL only with the DR and BDR. Two DROTHERs stop at 2-WAY by design; LSAs still reach both through the DR."],
  ["rd-nbr-3", "3.4", "routing", "HQ", "show ip ospf neighbor", "Both neighbors appear as FULL/DR. What role does HQ hold on those two links?",
    l => { const s = dev(l, "HQ").rt.ospfIfs.filter(x => /0\/[12]$/.test(x.iface.name)).map(x => x.state); must(s.every(x => x === "BDR"), "bdr"); return "BDR on both"; },
    ["DR on both", "DROTHER on both", "None — DR/BDR is not elected on Ethernet"],
    "Each /30 is still an Ethernet broadcast network, so a DR and BDR are elected. With equal priority the higher router ID (2.2.2.2, 3.3.3.3 vs 1.1.1.1) wins DR, leaving HQ as BDR. ip ospf network point-to-point would remove the election."],

  /* ---------- show ip ospf interface (3.4) ---------- */
  ["rd-ospfif-1", "3.4", "ospfLan", "RC", "show ip ospf interface g0/0", "Why can RC never become DR or BDR on this segment?",
    l => { must(ifc(l, "RC", "g0/0").ospfPriority === 0, "pri 0"); return "Its interface priority is 0"; }, ["Its router ID is the lowest", "Its interface is passive", "It joined the segment last"],
    "Priority 0 makes a router ineligible for DR/BDR. It still forms adjacencies (FULL with the DR and BDR)."],
  ["rd-ospfif-2", "3.4", "ospfLan", "RE", "show ip ospf interface g0/1", "RE's Gi0/1 is up/up and cabled to RA (whose interface is in area 0), yet it has no neighbors. Why?",
    l => { const a = dev(l, "RE").rt.ospfIfs.find(x => x.iface.name === "GigabitEthernet0/1").area; must(a !== 0, "area"); return `Area mismatch: RE's interface is in area ${a}`; },
    ["Network type mismatch", "RE has no router ID", "The interface is passive"],
    "Hellos carry the area ID, and neighbors on a link must agree on it. \"Area 2\" here vs area 0 on RA prevents the adjacency."],
  ["rd-ospfif-3", "3.4", "routing", "HQ", "show ip ospf interface brief", "Gi0/0 is in OSPF with 0/0 neighbors, yet BR1 has an O route to 10.10.0.0/24. Explain.",
    l => { const o = dev(l, "HQ").ospf; must([...o.passive].includes("GigabitEthernet0/0"), "passive"); return "Gi0/0 is a passive interface: its network is advertised but no hellos are sent"; },
    ["Gi0/0 is shut down", "Gi0/0 is in a different area", "BR1 learned the route from a static route"],
    "passive-interface stops hellos (no neighbors can form) but keeps the connected network in OSPF."],

  /* ---------- show interfaces trunk (2.2) ---------- */
  ["rd-trunk-1", "2.2", "campus", "AS1", "show interfaces trunk", "Which VLANs are allowed to cross AS1 Gi0/1?",
    l => [...ifc(l, "AS1", "g0/1").switchport.allowed].join(","), ["1-4094", "10,20,40", "10"],
    "\"Vlans allowed on trunk\" is the configured allowed list: 10,20. The last section (10) shows what is also forwarding in STP."],
  ["rd-trunk-2", "2.2", "campus", "AS1", "show interfaces trunk", "VLAN 40 exists on AS1. Why can it not cross Gi0/1?",
    l => { must(!ifc(l, "AS1", "g0/1").switchport.allowed.has(40), "not allowed"); return "It is not in Gi0/1's allowed VLAN list"; },
    ["STP is blocking VLAN 40 on Gi0/1", "VLAN 40 is the native VLAN", "Gi0/1 is not trunking"],
    "Gi0/1 allows only 10,20. switchport trunk allowed vlan add 40 would permit it (if the far end allows it too)."],
  ["rd-trunk-3", "2.2", "campus", "AS1", "show interfaces trunk", "VLAN 10 is allowed and active on Gi0/2 but missing from the last section. Why?",
    l => { must(ifc(l, "AS1", "g0/2").rt.stp[10].sts === "BLK", "blk"); return "Spanning tree is blocking Gi0/2 in VLAN 10"; },
    ["VLAN 10 is pruned by VTP", "VLAN 10 is the native VLAN on Gi0/2", "Gi0/2 is an access port in VLAN 20"],
    "The last section lists VLANs in STP forwarding state. Gi0/2 is the alternate (blocked) port for VLAN 10."],
  ["rd-trunk-4", "2.2", "campus", "DS2", "show interfaces trunk", "Which DS2 trunk carries untagged frames in a VLAN other than VLAN 1?",
    l => sh(Object.values(dev(l, "DS2").interfaces).find(i => i.rt.opMode === "trunk" && i.switchport.native !== 1).name), ["Gi0/1", "Both", "Neither"],
    "The Native vlan column shows 30 on Gi0/2. Both ends of a trunk must agree on the native VLAN; CDP warns when they do not."],

  /* ---------- show access-lists (5.6) ---------- */
  ["rd-acl-1", "5.6", "edge", "EDGE", "show access-lists", "How many guest packets to the staff LAN has GUEST-FILTER dropped with its explicit deny?",
    l => String(dev(l, "EDGE").rt.aclHits["GUEST-FILTER#10"]), ["4", "0", "6"], "Line 10 (deny ip 172.16.9.0 … 172.16.1.0 …) shows 2 matches."],
  ["rd-acl-2", "5.6", "edge", "EDGE", "show access-lists", "A guest opens http://8.8.8.8 (TCP 80). What does GUEST-FILTER do?",
    l => { const ok = l.topo.aclCheck(dev(l, "EDGE"), "GUEST-FILTER", { src: "172.16.9.50", dst: "8.8.8.8", proto: "tcp", dport: 80 }); must(!ok, "denied"); return "Denies it with the implicit deny at the end"; },
    ["Permits it with line 30", "Permits it with line 20", "Denies it with line 10"],
    "Line 10 only matches the staff LAN as destination, 20 only ICMP, 30 only TCP 443. TCP 80 to 8.8.8.8 matches nothing and hits the invisible deny any."],
  ["rd-acl-3", "5.6", "edge", "EDGE", "show access-lists", "Access list 15 shows no match counters. What is the most likely reason?",
    l => { const d = dev(l, "EDGE"); must(!Object.values(d.interfaces).some(i => i.acl.in === "15" || i.acl.out === "15") && !d.nat.dynamic.some(r => r.list === "15"), "unused"); return "It is not applied to any interface or used by any feature"; },
    ["Host 172.16.1.22 never sent traffic", "Standard ACLs do not keep counters", "Its implicit deny dropped everything before line 10"],
    "An ACL does nothing until it is referenced (ip access-group, NAT, vty access-class…). Counters only move when packets are evaluated."],
  ["rd-acl-4", "4.1", "edge", "EDGE", "show access-lists", "Access list 1 has matches but is not applied to any interface. What is it doing?",
    l => { must(dev(l, "EDGE").nat.dynamic.some(r => r.list === "1" && r.overload), "pat acl"); return "Selecting which inside addresses PAT translates"; },
    ["Filtering traffic on the vty lines", "Nothing; the matches are left over from earlier", "Filtering OSPF updates"],
    "ip nat inside source list 1 interface g0/1 overload uses ACL 1 to pick translatable sources. Each new translation increments the counter."],

  /* ---------- show ip nat translations (4.1) ---------- */
  ["rd-nat-1", "4.1", "edge", "EDGE", "show ip nat translations", "Which inside host is reachable from the Internet at 203.0.113.5?",
    l => dev(l, "EDGE").nat.static.find(s => s.ig === "203.0.113.5").il, ["172.16.1.21", "203.0.113.6", "172.16.9.50"],
    "The static entry maps inside global 203.0.113.5 to inside local 172.16.1.80 permanently, so outside hosts can start connections to it."],
  ["rd-nat-2", "4.1", "edge", "EDGE", "show ip nat translations", "Which inside global address do 172.16.1.21, 172.16.1.22 and 172.16.9.50 share?",
    l => { const g = new Set(dev(l, "EDGE").rt.nat.filter(t => t.overload).map(t => t.ig)); must(g.size === 1, "one global"); return [...g][0]; }, ["203.0.113.5", "203.0.113.1", "8.8.8.8"],
    "PAT (overload) maps many inside locals to one inside global — the outside interface address — and keeps flows apart by port (the :1, :2 … suffixes)."],
  ["rd-nat-3", "4.1", "edge", "EDGE", "show ip nat translations", "Why does the 203.0.113.5 line have no protocol and no outside addresses?",
    l => { must(dev(l, "EDGE").nat.static.some(s => s.ig === "203.0.113.5" && !s.proto), "static"); return "It is a static one-to-one entry that exists even with no traffic"; },
    ["The translation timed out", "It is a PAT entry for ICMP", "The server has not replied yet"],
    "Static entries are created by configuration and always present; dynamic entries carry the protocol, ports and outside addresses of a specific flow."],

  /* ---------- show mac address-table (1.13) ---------- */
  ["rd-mac-1", "1.13", "campus", "AS1", "show mac address-table", "Out of which port will AS1 send a frame for 00e0.4c00.0701 in VLAN 10?",
    l => sh(dev(l, "AS1").rt.mac.find(m => m.mac === "00e0.4c00.0701").port), ["Fa0/1", "Gi0/2", "Every port in VLAN 10"],
    "The address was learned on Gi0/1 (it is PCD, behind DS2), so the frame is forwarded only there."],
  ["rd-mac-2", "1.13", "campus", "AS1", "show mac address-table", "PCC (00e0.4c00.0601, VLAN 20, Fa0/3) has not sent anything yet. What does AS1 do with a frame addressed to it?",
    l => { must(!dev(l, "AS1").rt.mac.some(m => m.mac === "00e0.4c00.0601"), "unknown"); return "Floods it out every forwarding port in VLAN 20 except the one it arrived on"; },
    ["Drops it because the MAC is unknown", "Sends it out Fa0/3 because that is PCC's port", "Floods it out every port on the switch"],
    "Unknown unicast is flooded, but only within the frame's VLAN and only on ports forwarding in STP."],
  ["rd-mac-3", "1.13", "campus", "AS1", "show mac address-table", "How did AS1 learn 00e0.4c00.0401 on Fa0/1?",
    l => { must(dev(l, "AS1").rt.mac.find(m => m.mac === "00e0.4c00.0401").type === "DYNAMIC", "dyn"); return "From the source MAC of a frame that arrived on Fa0/1"; },
    ["From an ARP reply sent by AS1", "From a static mac address-table entry", "From CDP"],
    "Switches learn by reading source addresses on ingress; DYNAMIC entries age out (300 s default)."],

  /* ---------- show etherchannel summary (2.4) ---------- */
  ["rd-ec-1", "2.4", "channels", "CORE", "show etherchannel summary", "Which port-channel is actually carrying traffic?",
    l => { const po = ["1", "2", "3"].find(n => ifc(l, "CORE", "po" + n).rt.up); return "Po" + po; }, ["Po2", "Po3", "All three"],
    "SU = Layer 2, in use; SD = Layer 2, down. Only Po1 has bundled (P) members."],
  ["rd-ec-2", "2.4", "channels", "CORE", "show etherchannel summary", "Po2's members are (I) stand-alone. Both sides use PAgP. What is wrong?",
    l => { must(ifc(l, "CORE", "f0/1").channelGroup.mode === "auto" && ifc(l, "ACC2", "f0/1").channelGroup.mode === "auto", "auto/auto"); return "Both sides are in auto mode, so neither starts negotiation"; },
    ["The members have different speeds", "PAgP needs one side in passive mode", "Po2 needs an IP address"],
    "PAgP auto only responds and desirable initiates: auto/auto never forms a channel. LACP's equivalent is passive/passive."],
  ["rd-ec-3", "2.4", "channels", "CORE", "show etherchannel summary", "Po3 never forms. CORE uses PAgP desirable on Fa0/3–4. What is the likely configuration on the other switch?",
    l => { must(ifc(l, "ACC3", "f0/3").channelGroup.mode === "on", "on"); return "channel-group 3 mode on (no negotiation protocol)"; },
    ["channel-group 3 mode auto", "channel-group 3 mode desirable", "channel-group 3 mode active is the only mismatch possible"],
    "mode on sends no PAgP or LACP, so a negotiating peer never hears anything; on only bundles with on. auto or desirable on the far side would have formed the channel."],
];


const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const outputs = {};
const items = ITEMS.map(([id, obj, sc, dv, cmd, q, key, wrong, why]) => {
  const lab = SCENARIOS[sc]();
  const output = lab.cli(dv).exec(cmd).out;
  const right = key(lab);
  if (!right) throw new Error(`${id}: key produced nothing`);
  if (wrong.includes(right)) throw new Error(`${id}: key "${right}" equals a distractor`);
  if (new Set(wrong).size !== 3) throw new Error(`${id}: duplicate distractors`);
  const pos = hash(id) % 4; const opts = wrong.slice(); opts.splice(pos, 0, right);
  outputs[id] = output;
  return { id, type: "show-reader", obj, d: +obj[0], title: `${cmd} — ${dv}`, device: dv, command: cmd, output, q, opts, ans: pos, why };
});
const body = `/* GENERATED by dev/tools/gen-reader.mjs from the IOS simulator — do not edit by hand.
   Every output is real simulator output; every key was derived from simulator state. Regenerate after simulator changes. */
export const READER = ${JSON.stringify(items, null, 1)};
`;
if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) { console.error("packs/ccna/reader.js is stale — run node dev/tools/gen-reader.mjs"); process.exit(1); }
  console.log(`reader: ${items.length} items match the simulator`);
} else { writeFileSync(OUT, body); console.log(`wrote ${items.length} reader items → packs/ccna/reader.js`); }
