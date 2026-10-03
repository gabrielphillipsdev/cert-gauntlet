/* CCNA — reference sheet tables and acronym list (Chat 9). Plain text; the app escapes everything. */
export const DIAGRAMS = {};

export const REFERENCE = [
  { title: "Administrative distance (lower wins between sources)", head: ["Source", "AD"], rows: [
    ["Connected", "0"], ["Static", "1"], ["eBGP", "20"], ["EIGRP (internal)", "90"], ["OSPF", "110"], ["IS-IS", "115"], ["RIP", "120"],
    ["EIGRP (external)", "170"], ["iBGP", "200"], ["Unusable (never installed)", "255"]] },
  { title: "Forwarding decision, in order", rows: [
    ["1", "Longest prefix match — most specific route wins, whatever its source"], ["2", "Administrative distance — only between equal-length prefixes from different sources"],
    ["3", "Metric — only between routes from the same protocol"], ["4", "Equal metric → load-share (ECMP, 4 paths by default for OSPF)"]] },
  { title: "OSPF neighbor states", head: ["State", "What is happening"], rows: [
    ["Down", "No hellos heard"], ["Init", "Hello heard, but my RID is not in it yet"], ["2-Way", "Bidirectional; DR/BDR elected here. Final state between two DROTHERs"],
    ["ExStart", "Master/slave chosen for DBD exchange (stuck here → MTU mismatch)"], ["Exchange", "DBD packets describe each LSDB"],
    ["Loading", "LSRs sent for missing LSAs"], ["Full", "LSDBs synchronized"]] },
  { title: "OSPF adjacency must match", rows: [
    ["Area ID", "same on both ends of the link"], ["Subnet and mask", "same subnet, same mask"], ["Hello / dead", "10/40 on broadcast and P2P by default"],
    ["Authentication", "same type and key"], ["Stub flag", "same"], ["MTU", "mismatch → stuck in ExStart/Exchange"], ["Router ID", "must be unique"], ["Passive", "neither side passive"]] },
  { title: "OSPF quick facts", rows: [
    ["Router ID", "router-id > highest loopback IP > highest active physical IP; change needs clear ip ospf process"],
    ["DR/BDR", "highest priority (default 1, 0 = never), then highest RID; non-preemptive"], ["Multicast", "224.0.0.5 all OSPF routers · 224.0.0.6 DR/BDR"],
    ["Cost", "reference bandwidth (100 Mbps) ÷ interface bandwidth, min 1 — Fa, Gi, 10G all cost 1 by default"], ["Network types", "broadcast (Ethernet: DR/BDR) · point-to-point (no DR)"]] },
  { title: "STP path cost (short method) and timers", head: ["Speed", "Cost"], rows: [
    ["10 Mbps", "100"], ["100 Mbps", "19"], ["1 Gbps", "4"], ["10 Gbps", "2"], ["Bridge priority", "0–61440 in steps of 4096; default 32768 + VLAN (sys-id-ext)"],
    ["root primary / secondary", "24576 (or 4096 below the current root) / 28672"]] },
  { title: "RSTP roles and states", head: ["Role", "State when stable"], rows: [
    ["Root port", "Forwarding — best path to the root, one per non-root switch"], ["Designated port", "Forwarding — one per segment, all root-bridge ports"],
    ["Alternate port", "Discarding — backup path to the root via another switch"], ["Backup port", "Discarding — backup to a segment this switch already serves"],
    ["Edge (PortFast)", "Forwarding immediately; loses edge status if a BPDU arrives"]] },
  { title: "STP protection features", rows: [
    ["BPDU guard", "BPDU received on a PortFast port → err-disabled"], ["BPDU filter", "stop sending/processing BPDUs (risky)"],
    ["Root guard", "superior BPDU on this port → root-inconsistent (blocked) until it stops"], ["Loop guard", "BPDUs stop arriving on a root/alternate port → loop-inconsistent instead of forwarding"]] },
  { title: "EtherChannel modes", head: ["Side A", "Side B → forms?"], rows: [
    ["LACP active", "active ✓ · passive ✓"], ["LACP passive", "active ✓ · passive ✗"], ["PAgP desirable", "desirable ✓ · auto ✓"], ["PAgP auto", "desirable ✓ · auto ✗"],
    ["on", "on ✓ · anything else ✗"], ["Members must match", "speed, duplex, mode (access/trunk), access VLAN / allowed + native VLANs"]] },
  { title: "DTP: what the link becomes", head: ["", "trunk / desirable / auto / access"], rows: [
    ["trunk", "trunk · trunk · trunk · (mismatch)"], ["dynamic desirable", "trunk · trunk · trunk · access"], ["dynamic auto", "trunk · trunk · access · access"], ["access", "(mismatch) · access · access · access"]] },
  { title: "ACL numbers and placement", rows: [
    ["Standard", "1–99, 1300–1999 · source only · place near the destination"], ["Extended", "100–199, 2000–2699 · src, dst, protocol, ports · place near the source"],
    ["Rules", "top-down, first match wins · implicit deny any at the end · one ACL per interface, per direction, per protocol"],
    ["Wildcards", "host x = x 0.0.0.0 · any = 0.0.0.0 255.255.255.255 · wildcard = 255.255.255.255 − mask"]] },
  { title: "NAT terms", rows: [
    ["Inside local", "the inside host's real (private) address"], ["Inside global", "the public address that represents the inside host"],
    ["Outside global", "the outside host's real address"], ["Outside local", "how the outside host appears to inside hosts (usually = outside global)"],
    ["Static / dynamic / PAT", "1:1 fixed · 1:1 from a pool · many:1 by port (overload)"]] },
  { title: "FHRP comparison", head: ["", "HSRP · VRRP · GLBP"], rows: [
    ["Standard", "Cisco · IETF (RFC 5798) · Cisco"], ["Roles", "active/standby · master/backup · AVG + AVFs"], ["Load balancing", "per group only · per group only · yes (up to 4 MACs)"],
    ["Virtual MAC", "0000.0C07.ACxx (v1) / 0000.0C9F.Fxxx (v2) · 0000.5E00.01xx · 0007.B400.xxyy"], ["Preempt default", "off · on · off (AVG)"], ["Default priority", "100 · 100 · 100"]] },
  { title: "Syslog severity", head: ["Level", "Keyword"], rows: [
    ["0", "emergencies"], ["1", "alerts"], ["2", "critical"], ["3", "errors"], ["4", "warnings"], ["5", "notifications"], ["6", "informational"], ["7", "debugging"],
    ["Format", "%FACILITY-SEVERITY-MNEMONIC: text (e.g. %LINK-3-UPDOWN)"], ["logging trap 4", "sends levels 0–4 to the server"]] },
  { title: "Ports to know", head: ["Protocol", "Port"], rows: [
    ["FTP data / control", "TCP 20 / 21"], ["SSH", "TCP 22"], ["Telnet", "TCP 23"], ["SMTP", "TCP 25"], ["DNS", "UDP 53 (TCP for zone transfers / large replies)"],
    ["DHCP server / client", "UDP 67 / 68"], ["TFTP", "UDP 69"], ["HTTP / HTTPS", "TCP 80 / 443"], ["NTP", "UDP 123"], ["SNMP / traps", "UDP 161 / 162"],
    ["Syslog", "UDP 514"], ["TACACS+", "TCP 49"], ["RADIUS", "UDP 1812 / 1813"], ["CAPWAP control / data", "UDP 5246 / 5247"], ["NETCONF", "TCP 830"]] },
  { title: "IPv6 address types", rows: [
    ["Global unicast", "2000::/3"], ["Unique local", "FC00::/7 (FD00::/8 in use)"], ["Link-local", "FE80::/10 — every IPv6 interface, never routed"],
    ["Multicast", "FF00::/8 · FF02::1 all nodes · FF02::2 all routers · FF02::5/6 OSPFv3 · FF02::1:FFxx:xxxx solicited-node"],
    ["Loopback / unspecified", "::1 / ::"], ["Modified EUI-64", "split MAC, insert FFFE, flip the 7th bit of the first byte"]] },
  { title: "802.11 standards", head: ["Standard", "Band · max rate"], rows: [
    ["802.11b", "2.4 GHz · 11 Mbps"], ["802.11a", "5 GHz · 54 Mbps"], ["802.11g", "2.4 GHz · 54 Mbps"], ["802.11n (Wi-Fi 4)", "2.4 + 5 GHz · 600 Mbps"],
    ["802.11ac (Wi-Fi 5)", "5 GHz · ~6.9 Gbps"], ["802.11ax (Wi-Fi 6/6E)", "2.4 + 5 (+ 6 GHz for 6E) · ~9.6 Gbps"], ["Non-overlapping 2.4 GHz", "1, 6, 11"]] },
  { title: "Wireless security", rows: [
    ["WEP", "RC4, broken — never"], ["WPA", "TKIP (stopgap)"], ["WPA2", "AES-CCMP; Personal = PSK, Enterprise = 802.1X/EAP + RADIUS"],
    ["WPA3", "SAE replaces PSK handshake (forward secrecy), PMF required, 192-bit mode for Enterprise (GCMP-256)"]] },
  { title: "REST: CRUD and status codes", rows: [
    ["Create", "POST"], ["Read", "GET"], ["Update", "PUT (replace) · PATCH (modify)"], ["Delete", "DELETE"],
    ["2xx", "200 OK · 201 Created · 204 No Content"], ["4xx", "400 Bad Request · 401 Unauthorized (no/bad credentials) · 403 Forbidden · 404 Not Found"], ["5xx", "500 Internal Server Error"]] },
  { title: "Configuration management (v1.1 names Ansible and Terraform)", head: ["", "Ansible · Terraform"], rows: [
    ["Model", "procedural tasks, push · declarative desired state"], ["Language", "YAML playbooks · HCL"], ["Agent", "agentless (SSH/NETCONF/API) · agentless (provider APIs)"],
    ["Key pieces", "inventory, modules, playbooks · providers, plan/apply, state file"]] },
];

export const ACRONYMS = [
  ["AAA", "Authentication, Authorization, Accounting"], ["ACL", "Access Control List"], ["AD", "Administrative Distance"], ["AP", "Access Point"],
  ["API", "Application Programming Interface"], ["ARP", "Address Resolution Protocol"], ["BDR", "Backup Designated Router"], ["BPDU", "Bridge Protocol Data Unit"],
  ["CAM", "Content Addressable Memory"], ["CAPWAP", "Control And Provisioning of Wireless Access Points"], ["CDP", "Cisco Discovery Protocol"],
  ["CoS", "Class of Service"], ["CRUD", "Create, Read, Update, Delete"], ["CSMA/CD", "Carrier Sense Multiple Access with Collision Detection"],
  ["DAI", "Dynamic ARP Inspection"], ["DHCP", "Dynamic Host Configuration Protocol"], ["DNS", "Domain Name System"], ["DR", "Designated Router"],
  ["DSCP", "Differentiated Services Code Point"], ["DTP", "Dynamic Trunking Protocol"], ["EAP", "Extensible Authentication Protocol"],
  ["ECMP", "Equal-Cost Multi-Path"], ["EUI-64", "Extended Unique Identifier (64-bit)"], ["FHRP", "First Hop Redundancy Protocol"],
  ["FTP", "File Transfer Protocol"], ["GLBP", "Gateway Load Balancing Protocol"], ["GRE", "Generic Routing Encapsulation"],
  ["GUA", "Global Unicast Address"], ["HCL", "HashiCorp Configuration Language"], ["HSRP", "Hot Standby Router Protocol"],
  ["IaC", "Infrastructure as Code"], ["IKE", "Internet Key Exchange"], ["IPS", "Intrusion Prevention System"], ["IPsec", "Internet Protocol Security"],
  ["JSON", "JavaScript Object Notation"], ["LACP", "Link Aggregation Control Protocol"], ["LAG", "Link Aggregation Group"],
  ["LLDP", "Link Layer Discovery Protocol"], ["LLQ", "Low Latency Queuing"], ["LSA", "Link-State Advertisement"], ["MIB", "Management Information Base"],
  ["MTU", "Maximum Transmission Unit"], ["NAT", "Network Address Translation"], ["NETCONF", "Network Configuration Protocol"],
  ["NGFW", "Next-Generation Firewall"], ["NTP", "Network Time Protocol"], ["OID", "Object Identifier"], ["OSPF", "Open Shortest Path First"],
  ["PAgP", "Port Aggregation Protocol"], ["PAT", "Port Address Translation"], ["PHB", "Per-Hop Behavior"], ["PMF", "Protected Management Frames"],
  ["PoE", "Power over Ethernet"], ["PSK", "Pre-Shared Key"], ["PVST+", "Per-VLAN Spanning Tree Plus"], ["QoS", "Quality of Service"],
  ["RADIUS", "Remote Authentication Dial-In User Service"], ["REST", "Representational State Transfer"], ["RID", "Router ID"],
  ["RSTP", "Rapid Spanning Tree Protocol"], ["SAE", "Simultaneous Authentication of Equals"], ["SDN", "Software-Defined Networking"],
  ["SFP", "Small Form-factor Pluggable"], ["SNMP", "Simple Network Management Protocol"], ["SOHO", "Small Office / Home Office"],
  ["SSH", "Secure Shell"], ["SSID", "Service Set Identifier"], ["STP", "Spanning Tree Protocol"], ["SVI", "Switched Virtual Interface"],
  ["TACACS+", "Terminal Access Controller Access-Control System Plus"], ["TFTP", "Trivial File Transfer Protocol"], ["ULA", "Unique Local Address"],
  ["VLAN", "Virtual Local Area Network"], ["VRF", "Virtual Routing and Forwarding"], ["VRRP", "Virtual Router Redundancy Protocol"],
  ["VXLAN", "Virtual Extensible LAN"], ["WLC", "Wireless LAN Controller"], ["WPA", "Wi-Fi Protected Access"], ["YAML", "YAML Ain't Markup Language"],
];
