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
    id: "lab-vlans-trunking", type: "ccna-lab", obj: "2.1", d: 2, title: "VLANs and an 802.1Q trunk", timeTargetMin: 6,
    topology: {
      devices: {
        SW1: { type: "switch", x: 150, y: 120 }, SW2: { type: "switch", x: 330, y: 120 },
        PC1: pc("10.1.10.11", "10.1.10.1", 70, 230), PC2: pc("10.1.20.12", "10.1.20.1", 190, 230),
        PC3: pc("10.1.10.13", "10.1.10.1", 290, 230), PC4: pc("10.1.20.14", "10.1.20.1", 410, 230),
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
];
