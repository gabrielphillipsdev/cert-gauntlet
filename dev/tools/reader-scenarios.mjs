/* Scenario topologies for the CCNA show-output reader (Chat 8). Each builder returns a converged lab from core/sims/ios.
   gen-reader.mjs runs show commands against these and computes answers from simulator state, so every output in
   packs/ccna/reader.js is real simulator output and every key is derived, not typed. */
import { createLab } from "../../core/sims/ios/index.js";

const host = (ip, gw, extra = {}) => ({ host: true, ip, mask: "255.255.255.0", gw, ...extra });
const base = h => ["enable", "configure terminal", `hostname ${h}`, "no ip domain-lookup"];
const ready = lab => { for (const n of Object.keys(lab.topo.devices)) { if (!lab.topo.get(n).isHost) lab.cli(n).exec("enable"); } lab.topo.converge(); return lab; };

export const SCENARIOS = {
  /* HQ router with OSPF to two branches, statics, a floating backup, a default and loopbacks */
  routing() {
    const lab = createLab({
      devices: { HQ: { type: "router" }, BR1: { type: "router" }, BR2: { type: "router" }, ISP: { type: "router" }, SW: { type: "switch" }, PC: host("10.10.0.20", "10.10.0.1") },
      links: [["HQ", "g0/1", "BR1", "g0/1"], ["HQ", "g0/2", "BR2", "g0/2"], ["HQ", "s0/1/0", "ISP", "s0/1/0"], ["HQ", "g0/0", "SW", "g0/1"], ["SW", "f0/1", "PC"], ["BR1", "s0/1/1", "BR2", "s0/1/1"]],
      configs: {
        HQ: [...base("HQ"), "interface g0/0", "ip address 10.10.0.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.0.1.1 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.0.2.1 255.255.255.252", "no shutdown",
          "interface s0/1/0", "ip address 198.51.100.2 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 1.1.1.1 255.255.255.255",
          "exit", "ip route 0.0.0.0 0.0.0.0 198.51.100.1", "ip route 172.16.50.0 255.255.255.0 10.0.2.2", "ip route 172.16.50.0 255.255.255.0 198.51.100.1 200", "ip route 192.168.99.0 255.255.255.0 10.0.1.2",
          "router ospf 10", "router-id 1.1.1.1", "network 10.0.0.0 0.0.255.255 area 0", "network 10.10.0.0 0.0.0.255 area 0", "passive-interface g0/0", "default-information originate", "end"],
        BR1: [...base("BR1"), "interface g0/1", "ip address 10.0.1.2 255.255.255.252", "no shutdown", "interface s0/1/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 10.20.1.1 255.255.255.0", "interface loopback 1", "ip address 10.20.2.1 255.255.255.0",
          "exit", "router ospf 10", "router-id 2.2.2.2", "network 10.0.0.0 0.0.255.255 area 0", "network 10.20.0.0 0.0.255.255 area 0", "end"],
        BR2: [...base("BR2"), "interface g0/2", "ip address 10.0.2.2 255.255.255.252", "no shutdown", "interface s0/1/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 10.30.1.1 255.255.255.0",
          "exit", "router ospf 10", "router-id 3.3.3.3", "network 10.0.0.0 0.0.255.255 area 0", "network 10.30.1.0 0.0.0.255 area 0", "end"],
        ISP: [...base("ISP"), "interface s0/1/0", "ip address 198.51.100.1 255.255.255.252", "no shutdown", "end"],
      },
    });
    return ready(lab);
  },
  /* one router with every interface state: up/up, admin down, down/down (cable unplugged), unassigned, loopback */
  ifstates() {
    const lab = createLab({
      devices: { R1: { type: "router" }, R2: { type: "router" }, SW1: { type: "switch" }, PC1: host("192.168.10.10", "192.168.10.1"), PC2: host("192.168.20.10", "192.168.20.1") },
      links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"], ["R1", "g0/1", "R2", "g0/1"], ["SW1", "f0/2", "PC2"]],
      configs: {
        R1: [...base("R1"), "interface g0/0", "ip address 192.168.10.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.1.1.1 255.255.255.252", "no shutdown", "interface g0/2", "ip address 10.1.2.1 255.255.255.252", "no shutdown",
          "interface s0/1/0", "ip address 10.1.3.1 255.255.255.252", "interface loopback 0", "ip address 9.9.9.9 255.255.255.255", "end"],
        R2: [...base("R2"), "interface g0/1", "ip address 10.1.1.2 255.255.255.252", "shutdown", "end"],
        SW1: [...base("SW1"), "interface vlan 1", "ip address 192.168.10.2 255.255.255.0", "no shutdown", "interface f0/2", "shutdown", "exit", "ip default-gateway 192.168.10.1", "end"],
      },
    });
    return ready(lab);
  },
  /* three switches in a triangle, VLANs 10/20/30, priorities, trunk allowed lists, a native mismatch, access ports with hosts */
  campus() {
    const lab = createLab({
      devices: {
        DS1: { type: "switch" }, DS2: { type: "switch" }, AS1: { type: "switch" },
        PCA: host("10.10.10.11", "10.10.10.1"), PCB: host("10.10.10.12", "10.10.10.1"), PCC: host("10.10.20.13", "10.10.20.1"), PCD: host("10.10.10.14", "10.10.10.1"),
      },
      links: [["DS1", "g0/1", "DS2", "g0/1"], ["DS1", "g0/2", "AS1", "g0/1"], ["DS2", "g0/2", "AS1", "g0/2"], ["AS1", "f0/1", "PCA"], ["AS1", "f0/2", "PCB"], ["AS1", "f0/3", "PCC"], ["DS2", "f0/5", "PCD"]],
      configs: {
        DS1: [...base("DS1"), "vlan 10", "name STAFF", "vlan 20", "name VOICE", "vlan 30", "name MGMT", "exit", "spanning-tree vlan 10 priority 24576", "spanning-tree vlan 20 priority 28672",
          "interface range g0/1 - 2", "switchport mode trunk", "switchport trunk allowed vlan 10,20,30", "end"],
        DS2: [...base("DS2"), "vlan 10", "name STAFF", "vlan 20", "name VOICE", "vlan 30", "name MGMT", "exit", "spanning-tree vlan 20 priority 24576",
          "interface range g0/1 - 2", "switchport mode trunk", "interface g0/2", "switchport trunk native vlan 30", "interface f0/5", "switchport mode access", "switchport access vlan 10", "end"],
        AS1: [...base("AS1"), "vlan 10", "name STAFF", "vlan 20", "name VOICE", "vlan 40", "name GUEST", "exit",
          "interface range g0/1 - 2", "switchport mode trunk", "interface g0/1", "switchport trunk allowed vlan 10,20", "interface g0/2", "switchport trunk native vlan 30",
          "interface range f0/1 - 2", "switchport mode access", "switchport access vlan 10", "spanning-tree portfast", "interface f0/3", "switchport mode access", "switchport access vlan 20", "interface f0/7", "switchport mode access", "switchport access vlan 40", "end"],
      },
    });
    ready(lab);
    // generate MAC-table entries: PCA ↔ PCB, PCA ↔ PCD
    lab.topo.ping("PCA", "10.10.10.12"); lab.topo.ping("PCA", "10.10.10.14");
    return lab;
  },
  /* edge router: static NAT for a web server, PAT for the LAN, ACLs with hit counters */
  edge() {
    const lab = createLab({
      devices: { EDGE: { type: "router" }, ISP: { type: "router" }, SW: { type: "switch" }, WEB: host("172.16.1.80", "172.16.1.1"), PC1: host("172.16.1.21", "172.16.1.1"), PC2: host("172.16.1.22", "172.16.1.1"), GUEST: host("172.16.9.50", "172.16.9.1") },
      links: [["EDGE", "g0/0", "SW", "g0/1"], ["SW", "f0/1", "WEB"], ["SW", "f0/2", "PC1"], ["SW", "f0/3", "PC2"], ["EDGE", "g0/1", "ISP", "g0/1"], ["EDGE", "g0/2", "GUEST"]],
      configs: {
        EDGE: [...base("EDGE"), "interface g0/0", "ip address 172.16.1.1 255.255.255.0", "ip nat inside", "no shutdown", "interface g0/2", "ip address 172.16.9.1 255.255.255.0", "ip nat inside", "no shutdown",
          "interface g0/1", "ip address 203.0.113.6 255.255.255.248", "ip nat outside", "no shutdown", "exit", "ip route 0.0.0.0 0.0.0.0 203.0.113.1",
          "ip nat inside source static 172.16.1.80 203.0.113.5", "access-list 1 permit 172.16.1.0 0.0.0.255", "access-list 1 permit 172.16.9.0 0.0.0.255", "ip nat inside source list 1 interface g0/1 overload",
          "ip access-list extended GUEST-FILTER", "deny ip 172.16.9.0 0.0.0.255 172.16.1.0 0.0.0.255", "permit icmp 172.16.9.0 0.0.0.255 any", "permit tcp 172.16.9.0 0.0.0.255 any eq 443", "exit",
          "interface g0/2", "ip access-group GUEST-FILTER in", "exit",
          "access-list 15 deny host 172.16.1.22", "access-list 15 permit 172.16.1.0 0.0.0.255", "end"],
        ISP: [...base("ISP"), "interface g0/1", "ip address 203.0.113.1 255.255.255.248", "no shutdown", "interface loopback 0", "ip address 8.8.8.8 255.255.255.255", "interface loopback 1", "ip address 1.0.0.1 255.255.255.255", "end"],
      },
    });
    ready(lab);
    lab.topo.ping("PC1", "8.8.8.8", { count: 2 }); lab.topo.ping("PC2", "1.0.0.1", { count: 1 }); lab.topo.ping("ISP", "203.0.113.5", { count: 3 });
    lab.topo.ping("GUEST", "8.8.8.8", { count: 4 }); lab.topo.ping("GUEST", "172.16.1.21", { count: 2 });
    return lab;
  },
  /* EtherChannel: Po1 LACP up, Po2 PAgP auto/auto never forms, Po3 one member mismatched */
  channels() {
    const lab = createLab({
      devices: { CORE: { type: "switch", ports: [...Array.from({ length: 8 }, (_, i) => `FastEthernet0/${i + 1}`), "GigabitEthernet0/1", "GigabitEthernet0/2"] }, ACC1: { type: "switch" }, ACC2: { type: "switch" }, ACC3: { type: "switch" } },
      links: [["CORE", "g0/1", "ACC1", "g0/1"], ["CORE", "g0/2", "ACC1", "g0/2"], ["CORE", "f0/1", "ACC2", "f0/1"], ["CORE", "f0/2", "ACC2", "f0/2"], ["CORE", "f0/3", "ACC3", "f0/3"], ["CORE", "f0/4", "ACC3", "f0/4"]],
      configs: {
        CORE: [...base("CORE"), "interface range g0/1 - 2", "channel-group 1 mode active", "interface range f0/1 - 2", "channel-group 2 mode auto", "interface range f0/3 - 4", "channel-group 3 mode desirable", "exit",
          "interface port-channel 1", "switchport mode trunk", "end"],
        ACC1: [...base("ACC1"), "interface range g0/1 - 2", "channel-group 1 mode passive", "exit", "interface port-channel 1", "switchport mode trunk", "end"],
        ACC2: [...base("ACC2"), "interface range f0/1 - 2", "channel-group 2 mode auto", "end"],
        ACC3: [...base("ACC3"), "interface range f0/3 - 4", "channel-group 3 mode on", "end"],
      },
    });
    return ready(lab);
  },
  /* OSPF broadcast segment with four routers (DR/BDR/DROTHER) plus an area mismatch and a passive interface */
  ospfLan() {
    const lab = createLab({
      devices: { RA: { type: "router" }, RB: { type: "router" }, RC: { type: "router" }, RD: { type: "router" }, RE: { type: "router" }, LAN: { type: "switch" } },
      links: [["RA", "g0/0", "LAN", "f0/1"], ["RB", "g0/0", "LAN", "f0/2"], ["RC", "g0/0", "LAN", "f0/3"], ["RD", "g0/0", "LAN", "f0/4"], ["RA", "g0/1", "RE", "g0/1"]],
      configs: {
        RA: [...base("RA"), "interface g0/0", "ip address 10.50.0.1 255.255.255.0", "no shutdown", "interface g0/1", "ip address 10.60.0.1 255.255.255.252", "no shutdown", "interface loopback 0", "ip address 10.255.0.1 255.255.255.255", "exit",
          "router ospf 1", "router-id 10.255.0.1", "network 10.50.0.0 0.0.0.255 area 0", "network 10.60.0.0 0.0.0.3 area 0", "network 10.255.0.1 0.0.0.0 area 0", "end"],
        RB: [...base("RB"), "interface g0/0", "ip address 10.50.0.2 255.255.255.0", "ip ospf priority 50", "no shutdown", "exit", "router ospf 1", "router-id 10.255.0.2", "network 10.50.0.0 0.0.0.255 area 0", "end"],
        RC: [...base("RC"), "interface g0/0", "ip address 10.50.0.3 255.255.255.0", "ip ospf priority 0", "no shutdown", "interface g0/1", "ip address 10.70.0.1 255.255.255.0", "no shutdown", "exit", "router ospf 1", "router-id 10.255.0.3", "network 10.50.0.0 0.0.0.255 area 0", "network 10.70.0.0 0.0.0.255 area 0", "passive-interface g0/1", "end"],
        RD: [...base("RD"), "interface g0/0", "ip address 10.50.0.4 255.255.255.0", "no shutdown", "exit", "router ospf 1", "router-id 10.255.0.4", "network 10.50.0.0 0.0.0.255 area 0", "end"],
        RE: [...base("RE"), "interface g0/1", "ip address 10.60.0.2 255.255.255.252", "no shutdown", "exit", "router ospf 1", "router-id 10.255.0.5", "network 10.60.0.0 0.0.0.3 area 2", "end"],
      },
    });
    return ready(lab);
  },
};
