/* Cert Gauntlet — CCNA lab items (Chat 8). Sim type "ccna-lab" (core/sims/ios/ui/labItem.js); graded by core/sims/ios/ui/labGrader.js.
   Schema: dev/specs/ccna.md → "Lab item schema". Solutions live in dev/solutions/ccna/ (never shipped); test: node dev/tests/ccna-labs.test.mjs.
   Coordinates are for the Topology tab (viewBox 480 × 300). Objective ids are 200-301 v1.1 topic numbers. */

const pc = (ip, gw, x, y, extra = {}) => ({ host: true, ip, mask: "255.255.255.0", gw, x, y, ...extra });
const T = (id, text) => ({ id, text });
const C = (id, task, type, f, points = 1) => ({ id, task, points, type, ...f });
const G = (id, guideline, type, f, points = 1) => ({ id, guideline, points, type, ...f });
const hostnameGuards = (...devs) => devs.map((d, i) => G(`gh${i}`, 0, "hostname", { device: d, name: d }));

export const LABS = [
  /* ---------------------------------------------------------------- 1 · VLANs + trunking */
  {
    id: "lab-vlans-trunking", type: "ccna-lab", topic: "vlan", obj: "2.1", d: 2, title: "VLANs and an 802.1Q trunk", timeTargetMin: 6,
    topology: {
      devices: {
        SW1: { type: "switch", x: 140, y: 70 }, SW2: { type: "switch", x: 340, y: 70 },
        PC1: pc("10.1.10.11", "10.1.10.1", 70, 230), PC2: pc("10.1.20.12", "10.1.20.1", 200, 230),
        PC3: pc("10.1.10.13", "10.1.10.1", 280, 230), PC4: pc("10.1.20.14", "10.1.20.1", 410, 230),
      },
      links: [["SW1", "g0/1", "SW2", "g0/1"], ["SW1", "f0/1", "PC1"], ["SW1", "f0/2", "PC2"], ["SW2", "f0/1", "PC3"], ["SW2", "f0/2", "PC4"]],
    },
    configs: {
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "vlan 40", "name LEGACY-HR", "exit", "interface f0/2", "switchport mode access", "switchport access vlan 40", "end"],
      SW2: ["enable", "configure terminal", "hostname SW2", "no ip domain-lookup", "vlan 30", "name LEGACY-SALES", "exit", "interface f0/1", "switchport mode access", "switchport access vlan 30", "end"],
    },
    tasks: [
      T("t1", "On both switches, create VLAN 10 named SALES and VLAN 20 named HR."),
      T("t2", "Assign Fa0/1 on each switch to VLAN 10 and Fa0/2 on each switch to VLAN 20 as static access ports."),
      T("t3", "Make the Gi0/1 link between SW1 and SW2 a static 802.1Q trunk with native VLAN 99 that allows only VLANs 10, 20 and 99."),
      T("t4", "Verify: PC1 can ping PC3 (10.1.10.13) and PC2 can ping PC4 (10.1.20.14). (Legacy VLANs 30 and 40 may stay in the VLAN database.)"),
    ],
    guidelines: ["Do not change the hostname of either switch.", "Do not configure an IP address on interface Vlan1 of either switch.", "Do not shut down any interface."],
    checks: [
      C("c1", "t1", "vlanExists", { device: "SW1", vlan: 10, name: "SALES" }), C("c2", "t1", "vlanExists", { device: "SW1", vlan: 20, name: "HR" }),
      C("c3", "t1", "vlanExists", { device: "SW2", vlan: 10, name: "SALES" }), C("c4", "t1", "vlanExists", { device: "SW2", vlan: 20, name: "HR" }),
      C("c5", "t2", "accessVlan", { device: "SW1", iface: "f0/1", vlan: 10 }), C("c6", "t2", "accessVlan", { device: "SW1", iface: "f0/2", vlan: 20 }),
      C("c7", "t2", "accessVlan", { device: "SW2", iface: "f0/1", vlan: 10 }), C("c8", "t2", "accessVlan", { device: "SW2", iface: "f0/2", vlan: 20 }),
      C("c9", "t3", "trunk", { device: "SW1", iface: "g0/1", native: 99, allowed: [10, 20, 99] }, 2), C("c10", "t3", "trunk", { device: "SW2", iface: "g0/1", native: 99, allowed: [10, 20, 99] }, 2),
      C("c11", "t4", "ping", { from: "PC1", to: "10.1.10.13" }), C("c12", "t4", "ping", { from: "PC2", to: "10.1.20.14" }),
      ...hostnameGuards("SW1", "SW2"),
      G("g2", 1, "runningConfigNotMatches", { device: "SW1", re: "interface Vlan1\\n ip address" }), G("g3", 1, "runningConfigNotMatches", { device: "SW2", re: "interface Vlan1\\n ip address" }),
      G("g4", 2, "linkedUp", { device: "SW1" }), G("g5", 2, "linkedUp", { device: "SW2" }),
    ],
    why: "Access ports carry one VLAN untagged; the trunk tags every VLAN except the native one. Pruning the allowed list to 10,20,99 is what the task asked for; a trunk that still allows 1-4094 works but does not meet the requirement. PC1 and PC2 cannot talk: different VLANs, and no router in this topology.",
  },
  /* ---------------------------------------------------------------- 2 · router-on-a-stick */
  {
    id: "lab-router-on-a-stick", type: "ccna-lab", topic: "intervlan", obj: "2.1", d: 2, title: "Inter-VLAN routing: router-on-a-stick", timeTargetMin: 6,
    topology: {
      devices: { R1: { type: "router", x: 240, y: 50 }, SW1: { type: "switch", x: 240, y: 160 }, PC1: pc("10.1.10.11", "10.1.10.1", 130, 270), PC2: pc("10.1.20.12", "10.1.20.1", 350, 270) },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"], ["SW1", "f0/2", "PC2"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "vlan 10", "name SALES", "vlan 20", "name HR", "exit", "interface f0/1", "switchport mode access", "switchport access vlan 10", "interface f0/2", "switchport mode access", "switchport access vlan 20", "end"],
    },
    tasks: [
      T("t1", "On SW1, make Gi0/1 (toward R1) a static 802.1Q trunk. The router does not negotiate trunking."),
      T("t2", "On R1, create sub-interfaces of Gi0/0 for VLAN 10 (10.1.10.1/24) and VLAN 20 (10.1.20.1/24) with 802.1Q encapsulation."),
      T("t3", "Bring R1 Gi0/0 up. Leave the physical interface without an IP address."),
      T("t4", "Verify PC1 can ping PC2 (10.1.20.12) and PC2 can ping its gateway (10.1.20.1)."),
    ],
    guidelines: ["Do not change the hostname of either device.", "Do not change the VLAN assignments of Fa0/1 and Fa0/2 on SW1.", "Do not configure an IP address on the physical interface Gi0/0 of R1."],
    checks: [
      C("c1", "t1", "trunk", { device: "SW1", iface: "g0/1" }, 2),
      C("c2", "t2", "subinterface", { device: "R1", iface: "g0/0.10", vlan: 10, ip: "10.1.10.1", len: 24 }), C("c3", "t2", "subinterface", { device: "R1", iface: "g0/0.20", vlan: 20, ip: "10.1.20.1", len: 24 }),
      C("c4", "t3", "interfaceUp", { device: "R1", iface: "g0/0" }),
      C("c5", "t4", "ping", { from: "PC1", to: "10.1.20.12" }), C("c6", "t4", "ping", { from: "PC2", to: "10.1.20.1" }),
      ...hostnameGuards("R1", "SW1"),
      G("g2", 1, "accessVlan", { device: "SW1", iface: "f0/1", vlan: 10 }), G("g3", 1, "accessVlan", { device: "SW1", iface: "f0/2", vlan: 20 }),
      G("g4", 2, "runningConfigNotMatches", { device: "R1", re: "interface GigabitEthernet0/0\\n(?: .*\\n)*? ip address" }),
    ],
    why: "The switch port must be a trunk because a router never speaks DTP; left in dynamic auto it becomes an access port in VLAN 1 and the tagged frames never arrive. Each sub-interface needs `encapsulation dot1q <vlan>` before its address, and the physical interface only needs `no shutdown`. Sub-interface numbers are a convention; what matters is the VLAN in the encapsulation command.",
  },
  /* ---------------------------------------------------------------- 3 · SVI routing on a Layer 3 switch */
  {
    id: "lab-svi-routing", type: "ccna-lab", topic: "intervlan", obj: "2.1", d: 2, title: "Inter-VLAN routing with SVIs", timeTargetMin: 6,
    topology: {
      devices: { SW1: { type: "l3switch", x: 240, y: 60 }, PC1: pc("10.1.10.11", "10.1.10.1", 90, 230), PC2: pc("10.1.20.12", "10.1.20.1", 240, 230), PC3: pc("10.1.30.13", "10.1.30.1", 390, 230) },
      links: [["SW1", "g1/0/1", "PC1"], ["SW1", "g1/0/2", "PC2"], ["SW1", "g1/0/3", "PC3"]],
    },
    configs: { SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "end"] },
    tasks: [
      T("t1", "Create VLANs 10 (SALES), 20 (HR) and 30 (ENG) on SW1."),
      T("t2", "Assign Gi1/0/1 to VLAN 10, Gi1/0/2 to VLAN 20 and Gi1/0/3 to VLAN 30 as access ports."),
      T("t3", "Create an SVI for each VLAN with the first usable address of its /24 (10.1.10.1, 10.1.20.1, 10.1.30.1)."),
      T("t4", "Enable routing between the VLANs. Verify PC1 can ping PC2 (10.1.20.12) and PC3 (10.1.30.13)."),
    ],
    guidelines: ["Do not change the hostname.", "Do not convert any physical port to a routed port (no `no switchport`).", "Do not shut down Gi1/0/1–3."],
    checks: [
      C("c1", "t1", "vlanExists", { device: "SW1", vlan: 10, name: "SALES" }), C("c2", "t1", "vlanExists", { device: "SW1", vlan: 20, name: "HR" }), C("c3", "t1", "vlanExists", { device: "SW1", vlan: 30, name: "ENG" }),
      C("c4", "t2", "accessVlan", { device: "SW1", iface: "g1/0/1", vlan: 10 }), C("c5", "t2", "accessVlan", { device: "SW1", iface: "g1/0/2", vlan: 20 }), C("c6", "t2", "accessVlan", { device: "SW1", iface: "g1/0/3", vlan: 30 }),
      C("c7", "t3", "svi", { device: "SW1", vlan: 10, ip: "10.1.10.1", len: 24 }), C("c8", "t3", "svi", { device: "SW1", vlan: 20, ip: "10.1.20.1", len: 24 }), C("c9", "t3", "svi", { device: "SW1", vlan: 30, ip: "10.1.30.1", len: 24 }),
      C("c10", "t4", "ipRouting", { device: "SW1" }), C("c11", "t4", "ping", { from: "PC1", to: "10.1.20.12" }), C("c12", "t4", "ping", { from: "PC1", to: "10.1.30.13" }),
      ...hostnameGuards("SW1"), G("g1", 0, "hostname", { device: "SW1", name: "SW1" }),
      G("g2", 1, "runningConfigNotMatches", { device: "SW1", re: "^ no switchport$" }), G("g3", 2, "linkedUp", { device: "SW1" }),
    ],
    why: "An SVI comes up only when its VLAN exists and at least one port in that VLAN is up, and a multilayer switch forwards between SVIs only after `ip routing`. Everything else here is plain VLAN work; the classic miss is forgetting `ip routing` and wondering why the SVIs are up/up but nothing crosses.",
  },
  /* ---------------------------------------------------------------- 4 · static, default and floating routes */
  {
    id: "lab-static-routes", type: "ccna-lab", topic: "static", obj: "3.3", d: 3, title: "Static, default and floating static routes", timeTargetMin: 7,
    topology: {
      devices: {
        R1: { type: "router", x: 110, y: 90 }, R2: { type: "router", x: 240, y: 40 }, R3: { type: "router", x: 370, y: 90 },
        PC1: pc("10.1.1.10", "10.1.1.1", 70, 240), PC3: pc("10.3.3.10", "10.3.3.1", 410, 240),
      },
      links: [["R1", "g0/1", "R2", "g0/1"], ["R2", "g0/2", "R3", "g0/2"], ["R1", "s0/1/0", "R3", "s0/1/0"], ["R1", "g0/0", "PC1"], ["R3", "g0/0", "PC3"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "ip address 10.1.1.1 255.255.255.0", "no shutdown", "interface g0/1", "description Primary to R2", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "interface s0/1/0", "description Backup to R3", "ip address 10.0.13.1 255.255.255.252", "no shutdown", "interface loopback 0", "description Simulated Internet", "ip address 192.0.2.1 255.255.255.255", "end"],
      R2: ["enable", "configure terminal", "hostname R2", "no ip domain-lookup", "interface g0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.0.23.1 255.255.255.252", "no shutdown", "exit", "ip route 10.1.1.0 255.255.255.0 10.0.12.1", "ip route 10.3.3.0 255.255.255.0 10.0.23.2", "ip route 192.0.2.1 255.255.255.255 10.0.12.1", "end"],
      R3: ["enable", "configure terminal", "hostname R3", "no ip domain-lookup", "interface g0/0", "ip address 10.3.3.1 255.255.255.0", "no shutdown", "interface g0/2", "description Primary to R2", "ip address 10.0.23.2 255.255.255.252", "no shutdown", "interface s0/1/0", "description Backup to R1", "ip address 10.0.13.2 255.255.255.252", "no shutdown", "end"],
    },
    tasks: [
      T("t1", "R2 already routes to both LANs. Add a static route on R1 to 10.3.3.0/24 and on R3 to 10.1.1.0/24, each via R2's next-hop address on the primary Gigabit path. PC1 must reach PC3."),
      T("t2", "Add a floating static route for the same two destinations over the backup serial link (10.0.13.0/30) with an administrative distance of 5, so it is used only when the primary path fails."),
      T("t3", "On R3, add a default route via 10.0.23.1 so unknown destinations go toward R2. Verify PC3 can ping 192.0.2.1 (a loopback on R1 that stands in for the Internet)."),
    ],
    guidelines: ["Do not change any interface address or description.", "Do not enable a routing protocol; this lab is static routing only.", "Do not change the hostnames."],
    checks: [
      C("c1", "t1", "staticRoute", { device: "R1", prefix: "10.3.3.0", len: 24, nh: "10.0.12.2", ad: 1 }), C("c2", "t1", "staticRoute", { device: "R3", prefix: "10.1.1.0", len: 24, nh: "10.0.23.1", ad: 1 }),
      C("c3", "t1", "ping", { from: "PC1", to: "10.3.3.10" }),
      C("c4", "t2", "staticRoute", { device: "R1", prefix: "10.3.3.0", len: 24, nh: "10.0.13.2", ad: 5 }), C("c5", "t2", "staticRoute", { device: "R3", prefix: "10.1.1.0", len: 24, nh: "10.0.13.1", ad: 5 }),
      C("c6", "t2", "routeInstalled", { device: "R1", prefix: "10.3.3.0", len: 24, code: "S", via: "10.0.12.2" }),
      C("c7", "t3", "defaultRoute", { device: "R3", nh: "10.0.23.1" }), C("c8", "t3", "ping", { from: "PC3", to: "192.0.2.1" }),
      G("g0", 0, "interfaceIp", { device: "R1", iface: "g0/1", ip: "10.0.12.1" }), G("g1", 0, "interfaceIp", { device: "R3", iface: "g0/2", ip: "10.0.23.2" }), G("g2", 0, "interfaceIp", { device: "R1", iface: "s0/1/0", ip: "10.0.13.1" }),
      G("g3", 1, "runningConfigNotMatches", { device: "R1", re: "^router " }), G("g4", 1, "runningConfigNotMatches", { device: "R3", re: "^router " }),
      ...hostnameGuards("R1", "R2", "R3").map((g, i) => ({ ...g, id: "gh" + i, guideline: 2 })),
    ],
    why: "A floating static is the same route with a worse administrative distance: it stays out of the table while the AD-1 route is valid and takes over when the primary next hop stops resolving. `show ip route` only ever shows the floating route after the primary is gone — check the config with `show running-config | include ip route`. The default route on R3 covers 192.0.2.1 because R2 knows how to reach it.",
  },
  /* ---------------------------------------------------------------- 5 · single-area OSPFv2 */
  {
    id: "lab-ospf-single-area", type: "ccna-lab", topic: "ospf", obj: "3.4", d: 3, title: "Single-area OSPFv2", timeTargetMin: 7,
    topology: {
      devices: {
        R1: { type: "router", x: 120, y: 120 }, R2: { type: "router", x: 240, y: 40 }, R3: { type: "router", x: 360, y: 120 }, ISP: { type: "router", x: 120, y: 20 },
        PC1: pc("10.1.1.10", "10.1.1.1", 80, 250), PC3: pc("10.3.3.10", "10.3.3.1", 400, 250),
      },
      links: [["R1", "g0/1", "R2", "g0/1"], ["R2", "g0/2", "R3", "g0/2"], ["R1", "g0/2", "R3", "g0/1"], ["R1", "s0/1/0", "ISP", "s0/1/0"], ["R1", "g0/0", "PC1"], ["R3", "g0/0", "PC3"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "ip address 10.1.1.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.0.13.1 255.255.255.252", "no shutdown", "interface s0/1/0", "description To ISP", "ip address 203.0.113.2 255.255.255.252", "no shutdown", "end"],
      R2: ["enable", "configure terminal", "hostname R2", "no ip domain-lookup", "interface loopback 0", "ip address 2.2.2.2 255.255.255.255", "interface g0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.0.23.1 255.255.255.252", "no shutdown", "exit", "router ospf 1", "router-id 2.2.2.2", "network 10.0.12.0 0.0.0.3 area 0", "network 10.0.23.0 0.0.0.3 area 0", "network 2.2.2.2 0.0.0.0 area 0", "end"],
      R3: ["enable", "configure terminal", "hostname R3", "no ip domain-lookup", "interface g0/0", "ip address 10.3.3.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.13.2 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.0.23.2 255.255.255.252", "no shutdown", "end"],
      ISP: ["enable", "configure terminal", "hostname ISP", "no ip domain-lookup", "interface s0/1/0", "ip address 203.0.113.1 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 8.8.8.8 255.255.255.255", "exit", "ip route 10.0.0.0 255.0.0.0 203.0.113.2", "end"],
    },
    tasks: [
      T("t1", "R2 already runs OSPF process 1 in area 0. Configure OSPF process 1 on R1 with router ID 1.1.1.1 and on R3 with router ID 3.3.3.3, advertising every 10.x.x.x interface in area 0. Both must become FULL neighbors of R2 and of each other."),
      T("t2", "Make the LAN interfaces (Gi0/0 on R1 and R3) passive so no hellos are sent toward the PCs, while their networks stay advertised."),
      T("t3", "R1 is the exit to the ISP: add a default route via 203.0.113.1 and have OSPF advertise that default to the other routers."),
      T("t4", "Verify PC1 reaches PC3 (10.3.3.10) and PC3 reaches 8.8.8.8 through the OSPF-learned default."),
    ],
    guidelines: ["Do not change R2's configuration.", "Do not change any interface address.", "Do not change the hostnames."],
    checks: [
      C("c1", "t1", "ospfRouterId", { device: "R1", rid: "1.1.1.1" }), C("c2", "t1", "ospfRouterId", { device: "R3", rid: "3.3.3.3" }),
      C("c3", "t1", "ospfNeighbor", { device: "R1", neighbor: "R2" }), C("c4", "t1", "ospfNeighbor", { device: "R1", neighbor: "R3" }), C("c5", "t1", "ospfNeighbor", { device: "R3", neighbor: "R2" }),
      C("c6", "t1", "ospfRoute", { device: "R3", prefix: "10.1.1.0", len: 24 }), C("c7", "t1", "ospfRoute", { device: "R1", prefix: "10.3.3.0", len: 24 }),
      C("c8", "t2", "ospfPassive", { device: "R1", iface: "g0/0" }), C("c9", "t2", "ospfPassive", { device: "R3", iface: "g0/0" }), C("c10", "t2", "ospfActive", { device: "R1", iface: "g0/1", area: 0 }),
      C("c11", "t3", "defaultRoute", { device: "R1", nh: "203.0.113.1" }), C("c12", "t3", "ospfDefaultOriginate", { device: "R1" }), C("c13", "t3", "routeInstalled", { device: "R3", prefix: "0.0.0.0", len: 0, code: "O" }),
      C("c14", "t4", "ping", { from: "PC1", to: "10.3.3.10" }), C("c15", "t4", "ping", { from: "PC3", to: "8.8.8.8" }),
      G("g0", 0, "unchanged", { device: "R2" }, 2),
      G("g1", 1, "interfaceIp", { device: "R1", iface: "g0/1", ip: "10.0.12.1" }), G("g2", 1, "interfaceIp", { device: "R3", iface: "g0/2", ip: "10.0.23.2" }),
      ...hostnameGuards("R1", "R3").map((g, i) => ({ ...g, id: "gh" + i, guideline: 2 })),
    ],
    why: "`network` statements with wildcard masks (or `ip ospf 1 area 0` on each interface) decide which interfaces join area 0; the router ID is set with `router-id` and only takes effect with `clear ip ospf process` on a running process — here the process is new so it applies immediately. `passive-interface` keeps advertising the LAN prefix but stops hellos. `default-information originate` injects R1's default as an O*E2 route only while R1 itself has a default route.",
  },
  /* ---------------------------------------------------------------- 6 · standard + extended ACLs */
  {
    id: "lab-acls", type: "ccna-lab", topic: "acl", obj: "5.6", d: 5, title: "Standard and extended ACLs", timeTargetMin: 7,
    topology: {
      devices: {
        R1: { type: "router", x: 240, y: 120 },
        PC1: pc("10.1.10.11", "10.1.10.1", 70, 40), PC2: pc("10.1.10.12", "10.1.10.1", 70, 200), SW1: { type: "switch", x: 120, y: 120 },
        PC3: pc("10.1.20.13", "10.1.20.1", 410, 40), SRV: pc("10.1.99.10", "10.1.99.1", 410, 210),
      },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"], ["SW1", "f0/2", "PC2"], ["R1", "g0/1", "PC3"], ["R1", "g0/2", "SRV"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "description Staff LAN", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "interface g0/1", "description Guest LAN", "ip address 10.1.20.1 255.255.255.0", "no shutdown", "interface g0/2", "description Server LAN", "ip address 10.1.99.1 255.255.255.0", "no shutdown", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "end"],
    },
    tasks: [
      T("t1", "Create a standard ACL that stops host 10.1.10.12 (PC2) from reaching the server LAN while permitting every other source. Apply it on R1 as close to the destination as possible."),
      T("t2", "Create an extended ACL that denies HTTP (TCP 80) from the guest LAN 10.1.20.0/24 to the server 10.1.99.10 and permits all other traffic. Apply it on R1 as close to the source as possible."),
      T("t3", "Verify: PC1 can still ping the server, PC3 can still ping the server, and PC2 can still ping PC3."),
    ],
    guidelines: ["Do not change any interface address or description.", "Do not stop PC2 from reaching the guest LAN.", "Do not change the hostname."],
    checks: [
      C("c1", "t1", "aclPacket", { device: "R1", iface: "g0/2", dir: "out", pkt: { src: "10.1.10.12", dst: "10.1.99.10", proto: "icmp" }, expect: "deny" }, 2),
      C("c2", "t1", "aclApplied", { device: "R1", iface: "g0/2", dir: "out" }),
      C("c3", "t1", "aclPacket", { device: "R1", iface: "g0/2", dir: "out", pkt: { src: "10.1.10.11", dst: "10.1.99.10", proto: "icmp" }, expect: "permit", requires: ["c1"] }),
      C("c4", "t2", "forward", { from: "PC3", pkt: { dst: "10.1.99.10", proto: "tcp", dport: 80 }, expect: false }, 2),
      C("c5", "t2", "aclApplied", { device: "R1", iface: "g0/1", dir: "in" }),
      C("c6", "t2", "forward", { from: "PC3", pkt: { dst: "10.1.99.10", proto: "tcp", dport: 443 }, expect: true, requires: ["c4"] }),
      C("c7", "t3", "ping", { from: "PC1", to: "10.1.99.10", requires: ["c1"] }), C("c8", "t3", "ping", { from: "PC3", to: "10.1.99.10", requires: ["c4"] }),
      C("c9", "t3", "ping", { from: "PC2", to: "10.1.99.10", expect: false, requires: ["c2"] }),
      G("g0", 0, "interfaceIp", { device: "R1", iface: "g0/2", ip: "10.1.99.1" }), G("g1", 0, "interfaceIp", { device: "R1", iface: "g0/1", ip: "10.1.20.1" }),
      G("g2", 1, "ping", { from: "PC2", to: "10.1.20.13" }, 2), G("g3", 2, "hostname", { device: "R1", name: "R1" }),
    ],
    why: "Standard ACLs match only the source, so they go next to the destination (outbound on the server interface) — placed near the source they would cut PC2 off from everything. Extended ACLs match source, destination and port, so they go next to the source (inbound on the guest interface) and drop the traffic before it crosses the router. Both need an explicit `permit` at the end: the implicit `deny any` would otherwise block everything else. Pings are ICMP, so the extended ACL does not touch them.",
  },
  /* ---------------------------------------------------------------- 7 · static NAT + PAT */
  {
    id: "lab-nat-pat", type: "ccna-lab", topic: "nat", obj: "4.1", d: 4, title: "Static NAT and PAT", timeTargetMin: 6,
    topology: {
      devices: {
        R1: { type: "router", x: 240, y: 130 }, ISP: { type: "router", x: 400, y: 130 }, SW1: { type: "switch", x: 110, y: 130 },
        PC1: pc("10.1.10.11", "10.1.10.1", 50, 40), PC2: pc("10.1.10.12", "10.1.10.1", 50, 230), SRV: pc("10.1.10.50", "10.1.10.1", 170, 240),
      },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"], ["SW1", "f0/2", "PC2"], ["SW1", "f0/3", "SRV"], ["R1", "g0/1", "ISP", "g0/1"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "description LAN", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "interface g0/1", "description To ISP", "ip address 203.0.113.2 255.255.255.252", "no shutdown", "exit", "ip route 0.0.0.0 0.0.0.0 203.0.113.1", "end"],
      ISP: ["enable", "configure terminal", "hostname ISP", "no ip domain-lookup", "interface g0/1", "ip address 203.0.113.1 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 8.8.8.8 255.255.255.255", "exit", "ip route 203.0.113.0 255.255.255.0 203.0.113.2", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "end"],
    },
    tasks: [
      T("t1", "On R1, identify Gi0/0 as the NAT inside interface and Gi0/1 as the NAT outside interface."),
      T("t2", "Publish the server 10.1.10.50 to the Internet as 203.0.113.50 with a one-to-one static NAT. The ISP router must be able to ping 203.0.113.50."),
      T("t3", "Configure PAT so every host in 10.1.10.0/24 shares R1's Gi0/1 address. Use an ACL to identify the inside hosts. Verify PC1 can ping 8.8.8.8."),
    ],
    guidelines: ["Do not change the ISP router.", "Do not change any interface address on R1.", "Do not remove R1's default route."],
    checks: [
      C("c1", "t1", "natInside", { device: "R1", iface: "g0/0" }), C("c2", "t1", "natOutside", { device: "R1", iface: "g0/1" }),
      C("c3", "t2", "natStatic", { device: "R1", il: "10.1.10.50", ig: "203.0.113.50" }), C("c4", "t2", "ping", { from: "ISP", to: "203.0.113.50" }, 2),
      C("c5", "t3", "natOverload", { device: "R1" }), C("c6", "t3", "ping", { from: "PC1", to: "8.8.8.8" }, 2),
      C("c7", "t3", "natTranslation", { device: "R1", il: "10.1.10.11", ig: "203.0.113.2", requires: ["c6"] }),
      G("g0", 0, "unchanged", { device: "ISP" }, 2), G("g1", 1, "interfaceIp", { device: "R1", iface: "g0/1", ip: "203.0.113.2" }), G("g2", 2, "defaultRoute", { device: "R1", nh: "203.0.113.1" }),
    ],
    why: "NAT only translates traffic that enters an `ip nat inside` interface and leaves an `ip nat outside` one, so the interface roles come first. A static entry maps one inside local address to one inside global address permanently, which is why the ISP can start a ping toward 203.0.113.50. PAT (`overload`) lets the whole LAN share one global address by tracking source ports; `show ip nat translations` shows each flow with the same inside global and a different port. An ACL, a named ACL, or a one-address pool with `overload` all produce the same result.",
  },
  /* ---------------------------------------------------------------- 8 · EtherChannel */
  {
    id: "lab-etherchannel", type: "ccna-lab", topic: "etherchannel", obj: "2.4", d: 2, title: "LACP EtherChannel trunk", timeTargetMin: 5,
    topology: {
      devices: { SW1: { type: "switch", x: 130, y: 100 }, SW2: { type: "switch", x: 350, y: 100 }, PC1: pc("10.1.10.11", "10.1.10.1", 130, 240), PC2: pc("10.1.10.12", "10.1.10.1", 350, 240) },
      links: [["SW1", "g0/1", "SW2", "g0/1"], ["SW1", "g0/2", "SW2", "g0/2"], ["SW1", "f0/1", "PC1"], ["SW2", "f0/1", "PC2"]],
    },
    configs: {
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "vlan 10", "name USERS", "vlan 99", "name NATIVE", "exit", "interface f0/1", "switchport mode access", "switchport access vlan 10", "end"],
      SW2: ["enable", "configure terminal", "hostname SW2", "no ip domain-lookup", "vlan 10", "name USERS", "vlan 99", "name NATIVE", "exit", "interface f0/1", "switchport mode access", "switchport access vlan 10", "end"],
    },
    tasks: [
      T("t1", "Bundle Gi0/1 and Gi0/2 on both switches into Port-channel 1 using LACP. SW1 must actively initiate negotiation; SW2 must only respond."),
      T("t2", "Make Port-channel 1 a static 802.1Q trunk with native VLAN 99 on both switches."),
      T("t3", "Verify the bundle is up (SU with both members P) and PC1 can ping PC2 (10.1.10.12)."),
    ],
    guidelines: ["Do not change the access VLAN of Fa0/1 on either switch.", "Do not shut down any interface.", "Do not change the hostnames."],
    checks: [
      C("c1", "t1", "etherChannel", { device: "SW1", po: 1, members: ["g0/1", "g0/2"], protocol: "LACP", mode: "active", up: false }, 2),
      C("c2", "t1", "etherChannel", { device: "SW2", po: 1, members: ["g0/1", "g0/2"], protocol: "LACP", mode: "passive", up: false }, 2),
      C("c3", "t2", "trunk", { device: "SW1", iface: "po1", native: 99 }), C("c4", "t2", "trunk", { device: "SW2", iface: "po1", native: 99 }),
      C("c5", "t3", "etherChannel", { device: "SW1", po: 1 }), C("c6", "t3", "ping", { from: "PC1", to: "10.1.10.12" }),
      G("g0", 0, "accessVlan", { device: "SW1", iface: "f0/1", vlan: 10 }), G("g1", 0, "accessVlan", { device: "SW2", iface: "f0/1", vlan: 10 }),
      G("g2", 1, "linkedUp", { device: "SW1" }), G("g3", 1, "linkedUp", { device: "SW2" }),
      G("g4", 2, "hostname", { device: "SW1", name: "SW1" }), G("g5", 2, "hostname", { device: "SW2", name: "SW2" }),
    ],
    why: "LACP `active` sends LACPDUs; `passive` only answers, so active/passive and active/active bundle while passive/passive never does. Configure the trunk on the Port-channel interface: its settings are pushed to the members, and members whose settings disagree are suspended. In `show etherchannel summary`, SU means a Layer 2 channel in use and P means the member is bundled.",
  },
  /* ---------------------------------------------------------------- 9 · DHCP server + relay */
  {
    id: "lab-dhcp", type: "ccna-lab", topic: "dhcp", obj: "4.6", d: 4, title: "DHCP server and relay", timeTargetMin: 6,
    topology: {
      devices: {
        R1: { type: "router", x: 170, y: 110 }, R2: { type: "router", x: 330, y: 110 }, SW1: { type: "switch", x: 80, y: 200 },
        PC1: { host: true, dhcp: true, x: 60, y: 280 }, PC2: { host: true, dhcp: true, x: 400, y: 260 },
      },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"], ["R1", "g0/1", "R2", "g0/1"], ["R2", "g0/0", "PC2"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "exit", "ip route 10.1.20.0 255.255.255.0 10.0.12.2", "end"],
      R2: ["enable", "configure terminal", "hostname R2", "no ip domain-lookup", "interface g0/0", "ip address 10.1.20.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "exit", "ip route 0.0.0.0 0.0.0.0 10.0.12.1", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "end"],
    },
    tasks: [
      T("t1", "On R1, reserve 10.1.10.1–10.1.10.10 and 10.1.20.1–10.1.20.10 so DHCP never hands them out."),
      T("t2", "On R1, create a pool for 10.1.10.0/24 with default gateway 10.1.10.1 and DNS server 10.1.10.5. PC1 must lease an address."),
      T("t3", "On R1, create a pool for 10.1.20.0/24 with default gateway 10.1.20.1 and DNS server 10.1.10.5."),
      T("t4", "R1 is the only DHCP server. Make R2 forward DHCP requests from its Gi0/0 LAN to R1 (10.0.12.1). PC2 must lease an address and ping 10.1.10.1."),
    ],
    guidelines: ["Do not configure a DHCP pool on R2.", "Do not change any interface address.", "Do not change the static routes."],
    checks: [
      C("c1", "t1", "dhcpPool", { device: "R1", network: "10.1.10.0", len: 24, excluded: [["10.1.10.1", "10.1.10.10"]], requires: [] }),
      C("c2", "t1", "runningConfigMatches", { device: "R1", re: "^ip dhcp excluded-address 10\\.1\\.20\\.1 10\\.1\\.20\\.10$" }),
      C("c3", "t2", "dhcpPool", { device: "R1", network: "10.1.10.0", len: 24, router: "10.1.10.1", dns: ["10.1.10.5"] }),
      C("c4", "t2", "dhcpLease", { host: "PC1", network: "10.1.10.0", len: 24, notIn: ["10.1.10.1", "10.1.10.10"] }),
      C("c5", "t3", "dhcpPool", { device: "R1", network: "10.1.20.0", len: 24, router: "10.1.20.1", dns: ["10.1.10.5"] }),
      C("c6", "t4", "dhcpHelper", { device: "R2", iface: "g0/0", addr: "10.0.12.1" }),
      C("c7", "t4", "dhcpLease", { host: "PC2", network: "10.1.20.0", len: 24, notIn: ["10.1.20.1", "10.1.20.10"] }),
      C("c8", "t4", "ping", { from: "PC2", to: "10.1.10.1" }),
      G("g0", 0, "runningConfigNotMatches", { device: "R2", re: "^ip dhcp pool" }, 2), G("g1", 1, "interfaceIp", { device: "R2", iface: "g0/0", ip: "10.1.20.1" }),
      G("g2", 2, "staticRoute", { device: "R1", prefix: "10.1.20.0", len: 24, nh: "10.0.12.2" }), G("g3", 2, "defaultRoute", { device: "R2", nh: "10.0.12.1" }),
    ],
    why: "Exclusions are global on the server, not per pool, and both ranges are needed because the server hands out the lowest free address. DHCP Discover is a broadcast and routers do not forward broadcasts, so the remote LAN's gateway (R2 Gi0/0) needs `ip helper-address` pointing at the server; the server then picks the pool that matches the relay's interface address (giaddr), which is why the 10.1.20.0/24 pool lives on R1.",
  },
  /* ---------------------------------------------------------------- 10 · port security */
  {
    id: "lab-port-security", type: "ccna-lab", topic: "portsec", obj: "5.7", d: 5, title: "Port security and unused ports", timeTargetMin: 6,
    topology: {
      devices: { SW1: { type: "switch", x: 240, y: 70 }, PC1: pc("10.1.10.11", "10.1.10.1", 90, 230), PC2: pc("10.1.10.12", "10.1.10.1", 240, 230), PC3: pc("10.1.10.13", "10.1.10.1", 390, 230) },
      links: [["SW1", "f0/1", "PC1"], ["SW1", "f0/2", "PC2"], ["SW1", "f0/3", "PC3"]],
    },
    configs: { SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "vlan 10", "name USERS", "vlan 999", "name PARKING", "exit", "interface range f0/1 - 3", "switchport mode access", "switchport access vlan 10", "end"] },
    tasks: [
      T("t1", "On Fa0/1, enable port security: allow at most 2 MAC addresses, learn them as sticky addresses, and on a violation drop the traffic and log it without disabling the port."),
      T("t2", "On Fa0/2, enable port security with PC2's MAC address 00e0.4c00.0301 configured statically. Keep the default violation mode."),
      T("t3", "Disable the unused ports Fa0/4 through Fa0/24 and move them to VLAN 999 as access ports."),
      T("t4", "Verify PC1 can still ping PC2 and PC3, and that PC1's MAC has been learned as a sticky secure address."),
    ],
    guidelines: ["Do not configure port security on Fa0/3.", "Do not shut down Fa0/1, Fa0/2 or Fa0/3.", "Do not change the hostname."],
    checks: [
      C("c1", "t1", "portSecurity", { device: "SW1", iface: "f0/1", max: 2, sticky: true, violation: "restrict" }, 3),
      C("c2", "t2", "portSecurity", { device: "SW1", iface: "f0/2", violation: "shutdown" }), C("c3", "t2", "portSecurityMac", { device: "SW1", iface: "f0/2", mac: "00e0.4c00.0301", sticky: false }),
      C("c4", "t3", "adminDown", { device: "SW1", iface: "f0/4" }), C("c5", "t3", "adminDown", { device: "SW1", iface: "f0/24" }), C("c6", "t3", "adminDown", { device: "SW1", iface: "f0/15" }),
      C("c7", "t3", "accessVlan", { device: "SW1", iface: "f0/4", vlan: 999 }), C("c8", "t3", "accessVlan", { device: "SW1", iface: "f0/24", vlan: 999 }),
      C("c9", "t4", "portSecurityMac", { device: "SW1", iface: "f0/1", mac: "00e0.4c00.0201", sticky: true }),
      C("c10", "t4", "ping", { from: "PC1", to: "10.1.10.12", requires: ["c3"] }), C("c11", "t4", "ping", { from: "PC1", to: "10.1.10.13", requires: ["c1"] }),
      G("g0", 0, "runningConfigNotMatches", { device: "SW1", re: "interface FastEthernet0/3\\n(?: .*\\n)*? switchport port-security" }, 2),
      G("g1", 1, "linkedUp", { device: "SW1" }, 2), G("g2", 2, "hostname", { device: "SW1", name: "SW1" }),
    ],
    why: "Port security only works on a static access (or trunk) port, never on a dynamic one. `restrict` drops and counts frames from unknown MACs; `protect` drops silently; `shutdown` (the default) err-disables the port. Sticky addresses are written into the running-config as they are learned, so `copy run start` keeps them. Shutting unused ports and parking them in an unused VLAN is the matching hardening step.",
  },
  /* ---------------------------------------------------------------- 11 · SSH + device hardening */
  {
    id: "lab-ssh-hardening", type: "ccna-lab", topic: "ssh", obj: "4.8", d: 4, title: "SSH access and basic hardening", timeTargetMin: 6,
    topology: {
      devices: { R1: { type: "router", x: 240, y: 60 }, SW1: { type: "switch", x: 240, y: 160 }, PC1: pc("10.1.10.11", "10.1.10.1", 240, 260) },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "username backup privilege 15 secret B4ckup!Only", "interface g0/0", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "end"],
    },
    tasks: [
      T("t1", "On R1, set the domain name ccna.lab, generate a 2048-bit RSA key pair and force SSH version 2."),
      T("t2", "Create a local user netadmin with the secret Ne7Adm!n. Allow only SSH on VTY lines 0–4 and authenticate them against the local user database."),
      T("t3", "Protect privileged EXEC with the enable secret Pr1vEx3c, require the password C0ns0le! at the console, and encrypt all plain-text passwords in the configuration."),
      T("t4", "Add a message-of-the-day banner that contains the word Authorized."),
    ],
    guidelines: ["Do not change the hostname (the RSA key name depends on it).", "Do not delete the existing local user backup.", "Do not change Gi0/0."],
    checks: [
      C("c1", "t1", "domainName", { device: "R1", name: "ccna.lab" }), C("c2", "t1", "rsaKey", { device: "R1", minBits: 2048 }), C("c3", "t1", "sshVersion", { device: "R1", v: 2 }),
      C("c4", "t2", "userExists", { device: "R1", user: "netadmin" }), C("c5", "t2", "vtyLoginLocal", { device: "R1" }), C("c6", "t2", "vtyTransport", { device: "R1", only: ["ssh"] }),
      C("c7", "t3", "enableSecret", { device: "R1" }), C("c8", "t3", "consolePassword", { device: "R1" }), C("c9", "t3", "servicePasswordEncryption", { device: "R1" }),
      C("c10", "t4", "banner", { device: "R1", re: "authorized" }),
      G("g0", 0, "hostname", { device: "R1", name: "R1" }), G("g1", 1, "userExists", { device: "R1", user: "backup" }, 2),
      G("g2", 2, "interfaceIp", { device: "R1", iface: "g0/0", ip: "10.1.10.1", len: 24 }), G("g3", 2, "noShutdown", { device: "R1", iface: "g0/0" }),
    ],
    why: "The RSA key needs a hostname and a domain name because its label is hostname.domain; 768 bits is the minimum for SSHv2 and 2048 is the norm. `login local` uses the username database, `transport input ssh` refuses Telnet. `enable secret` is stored as a hash; `service password-encryption` only obscures the type 7 passwords (console, `enable password`, `username … password`) — it is not real encryption, which is why secrets are preferred.",
  },
  /* ---------------------------------------------------------------- 12 · IPv6 addressing + static routes */
  {
    id: "lab-ipv6", type: "ccna-lab", topic: "ipv6", obj: "1.8", d: 1, title: "IPv6 addressing and static routes", timeTargetMin: 7,
    topology: {
      devices: { R1: { type: "router", x: 150, y: 100 }, R2: { type: "router", x: 330, y: 100 }, SW1: { type: "switch", x: 150, y: 230 }, SW2: { type: "switch", x: 330, y: 230 } },
      links: [["R1", "g0/1", "R2", "g0/1"], ["R1", "g0/0", "SW1", "g0/1"], ["R2", "g0/0", "SW2", "g0/1"]],
    },
    configs: {
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "no shutdown", "interface g0/1", "no shutdown", "end"],
      R2: ["enable", "configure terminal", "hostname R2", "no ip domain-lookup", "interface g0/0", "no shutdown", "interface g0/1", "no shutdown", "end"],
      SW1: ["enable", "configure terminal", "hostname SW1", "end"], SW2: ["enable", "configure terminal", "hostname SW2", "end"],
    },
    tasks: [
      T("t1", "Enable IPv6 routing on R1 and R2."),
      T("t2", "Address the interfaces: R1 Gi0/0 2001:db8:acad:1::1/64, R1 Gi0/1 2001:db8:acad:12::1/64, R2 Gi0/1 2001:db8:acad:12::2/64. R2 Gi0/0 must take its interface ID from its MAC address (EUI-64) in prefix 2001:db8:acad:2::/64."),
      T("t3", "Set the link-local addresses on the R1–R2 link to fe80::1 (R1) and fe80::2 (R2)."),
      T("t4", "On R1, add a static route to 2001:db8:acad:2::/64 via 2001:db8:acad:12::2. On R2, add a default route via R1's link-local address. Verify R1 can ping R2's Gi0/0 address and R2 can ping 2001:db8:acad:1::1."),
    ],
    guidelines: ["Do not configure any IPv4 address.", "Do not shut down any interface.", "Do not change the hostnames."],
    checks: [
      C("c1", "t1", "ipv6Routing", { device: "R1" }), C("c2", "t1", "ipv6Routing", { device: "R2" }),
      C("c3", "t2", "ipv6Address", { device: "R1", iface: "g0/0", addr: "2001:db8:acad:1::1", len: 64 }), C("c4", "t2", "ipv6Address", { device: "R1", iface: "g0/1", addr: "2001:db8:acad:12::1", len: 64 }),
      C("c5", "t2", "ipv6Address", { device: "R2", iface: "g0/1", addr: "2001:db8:acad:12::2", len: 64 }), C("c6", "t2", "ipv6Address", { device: "R2", iface: "g0/0", addr: "2001:db8:acad:2::", len: 64, eui64: true }),
      C("c7", "t3", "ipv6LinkLocal", { device: "R1", iface: "g0/1", addr: "fe80::1" }), C("c8", "t3", "ipv6LinkLocal", { device: "R2", iface: "g0/1", addr: "fe80::2" }),
      C("c9", "t4", "staticRoute6", { device: "R1", prefix: "2001:db8:acad:2::", len: 64, nh: "2001:db8:acad:12::2" }),
      C("c10", "t4", "staticRoute6", { device: "R2", prefix: "::", len: 0, nh: "fe80::1", iface: "g0/1" }),
      C("c11", "t4", "ping6", { from: "R1", to: { device: "R2", iface: "g0/0" } }), C("c12", "t4", "ping6", { from: "R2", to: "2001:db8:acad:1::1" }),
      G("g0", 0, "runningConfigNotMatches", { device: "R1", re: "^ ip address \\d" }), G("g1", 0, "runningConfigNotMatches", { device: "R2", re: "^ ip address \\d" }),
      G("g2", 1, "linkedUp", { device: "R1" }), G("g3", 1, "linkedUp", { device: "R2" }),
      G("g4", 2, "hostname", { device: "R1", name: "R1" }), G("g5", 2, "hostname", { device: "R2", name: "R2" }),
    ],
    why: "EUI-64 splits the 48-bit MAC, inserts FFFE in the middle and flips the seventh bit, so `ipv6 address 2001:db8:acad:2::/64 eui-64` produces a different interface ID on every router. A link-local next hop is only meaningful on one link, so a static route that uses one must name the exit interface as well (`ipv6 route ::/0 g0/1 fe80::1`). Without `ipv6 unicast-routing` a router has addresses but forwards nothing.",
  },
  /* ---------------------------------------------------------------- 13 · analyze show output (show running-config blocked) */
  {
    id: "lab-analyze-show", type: "ccna-lab", topic: "showread", obj: "3.1", d: 3, title: "Troubleshoot from show output only", timeTargetMin: 6,
    topology: {
      devices: {
        SW1: { type: "switch", x: 110, y: 70 }, SW2: { type: "switch", x: 370, y: 70 }, SW3: { type: "switch", x: 240, y: 190 },
        R1: { type: "router", x: 110, y: 270 }, R2: { type: "router", x: 370, y: 270 },
      },
      links: [["SW1", "g0/1", "SW2", "g0/1"], ["SW2", "g0/2", "SW3", "g0/2"], ["SW1", "g0/2", "SW3", "g0/1"], ["R1", "g0/0", "SW3", "f0/24"], ["R1", "g0/1", "R2", "g0/1"]],
    },
    configs: {
      SW1: ["enable", "configure terminal", "hostname SW1", "no ip domain-lookup", "vlan 10", "name USERS", "exit", "interface range g0/1 - 2", "switchport mode trunk", "end"],
      SW2: ["enable", "configure terminal", "hostname SW2", "no ip domain-lookup", "vlan 10", "name USERS", "exit", "spanning-tree vlan 10 priority 4096", "interface range g0/1 - 2", "switchport mode trunk", "interface g0/1", "switchport trunk native vlan 99", "end"],
      SW3: ["enable", "configure terminal", "hostname SW3", "no ip domain-lookup", "vlan 10", "name USERS", "exit", "interface range g0/1 - 2", "switchport mode trunk", "interface f0/24", "switchport mode access", "switchport access vlan 10", "end"],
      R1: ["enable", "configure terminal", "hostname R1", "no ip domain-lookup", "interface g0/0", "ip address 10.1.10.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "exit", "ip route 10.9.9.0 255.255.255.0 10.0.12.2", "ip route 10.9.0.0 255.255.0.0 10.1.10.200", "router ospf 1", "network 10.0.12.0 0.0.0.3 area 0", "network 10.1.10.0 0.0.0.255 area 0", "end"],
      R2: ["enable", "configure terminal", "hostname R2", "no ip domain-lookup", "interface g0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "interface loopback 9", "ip address 10.9.9.1 255.255.255.0", "exit", "router ospf 1", "network 10.0.12.0 0.0.0.3 area 1", "network 10.9.9.0 0.0.0.255 area 1", "end"],
    },
    blocked: ["show running-config", "show startup-config"],
    tasks: [
      T("t1", "Spanning tree, VLAN 10: answer questions 1 and 2 below using show commands only."),
      T("t2", "OSPF: R1 and R2 are cabled and both interfaces are up/up, but they are not neighbors. Answer question 3."),
      T("t3", "Answer questions 4 and 5: the next hop R1 uses for 10.9.9.77, and the native VLAN SW2 uses on its trunk to SW1."),
    ],
    guidelines: ["This lab is read-only: do not change the switches. show running-config and show startup-config are disabled.", "Do not change the routers."],
    answers: [
      { id: "a1", prompt: "1. Which switch is the root bridge for VLAN 10?", accept: ["SW2"] },
      { id: "a2", prompt: "2. Which port is in the blocking (alternate) state for VLAN 10? Give switch and port, e.g. SW1 Gi0/1.", accept: ["SW3 Gi0/1", "SW3 g0/1", "SW3 GigabitEthernet0/1", "/^sw3\\s*(gi?|gigabitethernet)\\s*0\\/1$/"] },
      { id: "a3", prompt: "3. What OSPF setting on R2's Gi0/1 prevents the adjacency? Give the setting and R2's value.", accept: ["/area\\s*1\\b/", "/area.*\\b1$/"] },
      { id: "a4", prompt: "4. Next-hop address R1 uses to reach 10.9.9.77:", accept: ["10.0.12.2"] },
      { id: "a5", prompt: "5. Native VLAN on SW2 Gi0/1:", accept: ["99", "vlan 99", "VLAN99"] },
    ],
    checks: [
      C("c1", "t1", "answer", { answer: "a1", accept: ["SW2"] }), C("c2", "t1", "answer", { answer: "a2", accept: ["SW3 Gi0/1", "SW3 g0/1", "SW3 GigabitEthernet0/1", "/^sw3\\s*(gi?|gigabitethernet)\\s*0\\/1$/"] }),
      C("c3", "t2", "answer", { answer: "a3", accept: ["/area\\s*1\\b/", "/area.*\\b1$/"] }, 2),
      C("c4", "t3", "answer", { answer: "a4", accept: ["10.0.12.2"] }), C("c5", "t3", "answer", { answer: "a5", accept: ["99", "vlan 99", "VLAN99"] }),
      ...["SW1", "SW2", "SW3"].map((d, i) => G("gs" + i, 0, "unchanged", { device: d })),
      ...["R1", "R2"].map((d, i) => G("gr" + i, 1, "unchanged", { device: d })),
    ],
    why: "Root bridge: lowest bridge ID; SW2 has priority 4096 + 10 in `show spanning-tree vlan 10`. On the non-root SW3 both uplinks cost 4 to the root, so the tie goes to the lower upstream bridge ID: Gi0/2 (toward SW2, the root itself) is the root port and Gi0/1 (toward SW1) loses the segment to SW1 and blocks. `show ip ospf interface g0/1` on R2 shows Area 1 while R1 shows Area 0 — area mismatch, no adjacency. Longest match: 10.9.9.77 matches both 10.9.0.0/16 and 10.9.9.0/24, and the /24 wins (`show ip route 10.9.9.77`). `show interfaces trunk` on SW2 shows native 99 on Gi0/1 while SW1 uses 1 — a native VLAN mismatch CDP would also log.",
  },
];
