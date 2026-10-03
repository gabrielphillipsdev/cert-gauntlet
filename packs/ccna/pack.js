/* Cert Gauntlet — Cisco CCNA 200-301 v1.1 pack manifest. See dev/ENGINE.md for every field; content spec in dev/specs/ccna.md.
   Exam topics v1.1 (fetched Oct 3, 2026 — dev/specs/skills-ccna.json): Network Fundamentals 20% · Network Access 20% · IP Connectivity 25% ·
   IP Services 10% · Security Fundamentals 15% · Automation & Programmability 10%. v2.0 replaces v1.1 on Feb 3, 2027.
   Objective ids are Cisco topic numbers, optionally with the sub-letter ("3.4" or "3.4.c"). */
import { LAB_SLOTS, fillLabSlots, loadLabs } from "./exam-labs.js";
import { SPRINTS } from "./sprints.js";

export default {
  id: "ccna", name: "Cisco CCNA", short: "CCNA", code: "200-301 v1.1", color: "#FF8093", status: "ready",
  tagline: "Subnetting, IOS labs, no-backtrack exam — Dec 19 → sit by Jan 25, 2027",
  examDateDefault: "2027-01-25",
  blurb: "CCNA 200-301 v1.1 the way Cisco tests it: no going back, multi-response graded all-or-nothing, drag-and-drop, and IOS lab items. Cards and twins across all six domains, three 100-question exams weighted to the blueprint, show-output exhibits everywhere, plus speed rounds for masks, administrative distance and ports. The subnetting trainer lives at packs/ccna/subnet/.",
  objectivesDoc: "dev/specs/skills-ccna.json",
  objPattern: "^[1-6]\\.(1[0-3]|[1-9])(\\.[a-h])?$",

  cats: {
    parts: { name: "Components, topologies & cabling", color: "#8AA6FF" },
    tcpip: { name: "TCP/UDP & IPv4 addressing", color: "#4FA3FF" },
    ipv6: { name: "IPv6 addressing & types", color: "#5EE0D8" },
    wlbasics: { name: "Wireless principles & virtualization", color: "#C9B8FF" },
    switching: { name: "Switching concepts", color: "#7FD1AE" },
    vlan: { name: "VLANs & trunks", color: "#43D97B" },
    l2link: { name: "CDP/LLDP & EtherChannel", color: "#6EE7B7" },
    stp: { name: "Rapid PVST+ spanning tree", color: "#FFD166" },
    wlan: { name: "Cisco wireless architecture & WLC", color: "#F2B8C6" },
    mgmt: { name: "Device management access", color: "#9DB2CE" },
    rtable: { name: "Routing table & forwarding", color: "#FF8093" },
    static: { name: "IPv4/IPv6 static routing", color: "#F4A261" },
    ospf: { name: "Single-area OSPFv2", color: "#FF6B5E" },
    fhrp: { name: "First hop redundancy", color: "#FF9BE0" },
    nat: { name: "NAT", color: "#B48CFF" },
    svc: { name: "NTP, DHCP, DNS & SSH", color: "#8AA6FF" },
    mon: { name: "SNMP, syslog & TFTP/FTP", color: "#5EE0D8" },
    qos: { name: "QoS per-hop behavior", color: "#C9B8FF" },
    secbase: { name: "Security concepts & device passwords", color: "#FFB454" },
    vpn: { name: "VPNs & AAA", color: "#F4A261" },
    acl: { name: "Access control lists", color: "#FF6B5E" },
    l2sec: { name: "Layer 2 security", color: "#FFD166" },
    wsec: { name: "Wireless security", color: "#F2B8C6" },
    sdn: { name: "Automation, SDN & AI", color: "#43D97B" },
    api: { name: "REST APIs & JSON", color: "#7FD1AE" },
    cfgmgmt: { name: "Ansible & Terraform", color: "#6EE7B7" },
  },
  sections: [
    { d: 1, name: "Network Fundamentals", weight: 20, decks: ["parts", "tcpip", "ipv6", "wlbasics", "switching"] },
    { d: 2, name: "Network Access", weight: 20, decks: ["vlan", "l2link", "stp", "wlan", "mgmt"] },
    { d: 3, name: "IP Connectivity", weight: 25, decks: ["rtable", "static", "ospf", "fhrp"] },
    { d: 4, name: "IP Services", weight: 10, decks: ["nat", "svc", "mon", "qos"] },
    { d: 5, name: "Security Fundamentals", weight: 15, decks: ["secbase", "vpn", "acl", "l2sec", "wsec"] },
    { d: 6, name: "Automation & Programmability", weight: 10, decks: ["sdn", "api", "cfgmgmt"] },
  ],
  domName: { 1: "Fundamentals", 2: "Access", 3: "IP Connectivity", 4: "IP Services", 5: "Security", 6: "Automation" },
  subtitles: {
    parts: "Routers, switches, NGFW, APs, PoE, tiers, spine-leaf, fiber vs copper, duplex", tcpip: "TCP vs UDP, subnetting, RFC 1918, client IP checks",
    ipv6: "Prefixes, GUA/ULA/link-local, multicast, anycast, EUI-64", wlbasics: "Channels 1/6/11, SSID, RF, encryption, VMs, containers, VRFs",
    switching: "MAC learning, aging, flooding, the MAC table", vlan: "Access/voice ports, trunks, 802.1Q, native VLAN, inter-VLAN",
    l2link: "CDP vs LLDP, LACP/PAgP modes, Po interfaces", stp: "Root bridge, port roles and states, PortFast, BPDU guard, root/loop guard",
    wlan: "Autonomous vs lightweight vs cloud, AP modes, WLC ports, LAG, WLAN GUI", mgmt: "Console, Telnet vs SSH, HTTP/S, TACACS+ vs RADIUS, cloud managed",
    rtable: "Codes, AD, metric, longest prefix match, gateway of last resort", static: "Default, network, host, floating; IPv6 statics",
    ospf: "Neighbors, DR/BDR, router ID, P2P, cost. Biggest single topic", fhrp: "HSRP, VRRP, GLBP: virtual IP and MAC, active/standby",
    nat: "Static, pool, PAT, inside/outside local/global", svc: "NTP client/server, DHCP DORA + relay, DNS, SSH setup",
    mon: "SNMP versions and messages, syslog levels, TFTP vs FTP", qos: "Classification, marking, queuing, policing vs shaping",
    secbase: "Threats, vulns, exploits, programs, local passwords, MFA", vpn: "IPsec site-to-site vs remote access, AAA",
    acl: "Standard vs extended, wildcards, placement, named ACLs", l2sec: "Port security, DHCP snooping, DAI",
    wsec: "WPA, WPA2, WPA3, PSK vs Enterprise, WLC GUI", sdn: "Controllers, planes, overlay/underlay/fabric, APIs, AI/ML",
    api: "CRUD ↔ verbs, status codes, auth types, JSON syntax", cfgmgmt: "Ansible (agentless, push, YAML) vs Terraform (declarative IaC)",
  },

  /* CCNA 200-301 rules (PLAN.md §1, verified Oct 2, 2026; dev/specs/ccna.md §1): 100–120 items, 120 minutes, NO backtracking on any item,
     multi-response graded all-or-nothing, drag-and-drop, 3–4 lab items with tabbed IOS terminals and partial credit.
     Scale 300–1000 (Cisco). Cisco does not publish the passing score; 825 is the commonly reported figure and is used here only
     as the scaled pass line — the readiness gate (85% raw, every domain 70%+) is what decides when to book. */
  exam: {
    count: 104, minutes: 120, pass: 825, scaleMin: 300, scaleMax: 1000,
    pbqFirst: false, backtrack: false, pbqPts: 3, pbqCount: 4,
    bankTypes: ["mc", "ms", "order", "build"],      /* order = drag-drop sequence, build ordered:false = drag-drop sort into a category; all-or-nothing */
    gate: { all: 85, dom: 70 },
    mixQuota: { 1: 20, 2: 20, 3: 25, 4: 10, 5: 15, 6: 10 },
    minMs: 10, minEx: 30,
    banks: {
      a: { name: "Exam A", sub: "Campus build-out: VLANs, trunks, STP, OSPF, ACLs. Labs: trunking, OSPF, ACL, SSH." },
      b: { name: "Exam B", sub: "Branch + WAN edge: inter-VLAN, statics, NAT, wireless. Labs: inter-VLAN, static, NAT, port security." },
      c: { name: "Exam C", sub: "Data center + automation: EtherChannel, IPv6, services, APIs. Labs: EtherChannel, IPv6, DHCP, show output." },
    },
    labSlots: LAB_SLOTS,
  },
  sprints: SPRINTS,   /* mask · AD · ports · syslog · acronyms (packs/ccna/sprints.js) */

  async load() {
    const [c1, c2, c3, c4, c5, c6, t, a, b, c, e, labs] = await Promise.all([
      import("./cards-d1.js"), import("./cards-d2.js"), import("./cards-d3.js"), import("./cards-d4.js"), import("./cards-d5.js"), import("./cards-d6.js"),
      import("./twins.js"), import("./bank-a.js"), import("./bank-b.js"), import("./bank-c.js"), import("./extras.js"),
      loadLabs(),
      import("../../core/exam/msitems.js"),           /* renders/scores the drag-drop items (order, build) */
    ]);
    return {
      cards: [...c1.CCNA_CARDS_D1, ...c2.CCNA_CARDS_D2, ...c3.CCNA_CARDS_D3, ...c4.CCNA_CARDS_D4, ...c5.CCNA_CARDS_D5, ...c6.CCNA_CARDS_D6],
      exq: [], twins: t.CCNA_TWINS,
      lab: labs,                                       /* Chat 8's labs, show-output reader and config/topology PBQs */
      generators: [],
      banks: { a: a.CCNA_BANK_A, b: b.CCNA_BANK_B, c: c.CCNA_BANK_C },
      pbqs: fillLabSlots(labs),                        /* 4 lab items per exam once Chat 8 lands; {a:[],b:[],c:[]} before */
      diagrams: e.DIAGRAMS, acronyms: e.ACRONYMS, reference: e.REFERENCE,
    };
  },
};
