/* CCNA 200-301 v1.1 — Exam C, part 1 (c001–c050). Data center + automation theme: spine-leaf vs three-tier, virtualization,
   containers and VRFs, fiber uplinks and interface errors, IPv6 on server segments, L2/L3 LACP EtherChannel, STP guard features,
   TACACS+ management, SDN overlay/underlay, REST/JSON, Ansible and Terraform, AI/ML in operations.
   d1 Network Fundamentals 20 · d2 Network Access 20 · d6 Automation & Programmability 10. Addressing 10.60.0.0/16 and 2001:db8:60::/48.
   STP and EtherChannel exhibits shaped from core/sims/ios output; interface counters, logs, WLC, client, API and tool output hand-written.
   All text original. Spec: dev/specs/ccna.md §6. */
export const CCNA_BANK_C_P1 = [
{id:"c001",obj:"2.5.a",d:2,cat:"stp",t:"mc",
 q:"Refer to the exhibit. DC-CORE is the root bridge for VLAN 10 in the management block. AGG-1 was configured with spanning-tree vlan 10 root secondary, and MGMT-SW has default STP settings. DC-CORE loses power. Which switch becomes the root bridge for VLAN 10?",
 ex:"MGMT-SW# show spanning-tree vlan 10\nVLAN0010\n  Spanning tree enabled protocol rstp\n  Root ID    Priority    24586\n             Address     0001.4200.0100\n             Cost        3\n             Port        65 (Port-channel5)\n             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n\n  Bridge ID  Priority    32778  (priority 32768 sys-id-ext 10)\n             Address     0001.4200.0200\n             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n             Aging Time  300 sec\n\nInterface           Role Sts Cost      Prio.Nbr Type\n------------------- ---- --- --------- -------- --------------\nFa0/24              Desg FWD 19        128.24   P2p\nPo5                 Root FWD 3         128.65   P2p\n\nAGG-1# show spanning-tree vlan 10 bridge\n                                                   Hello  Max  Fwd\nVlan                         Bridge ID              Time  Age  Dly  Protocol\n---------------- --------------------------------- -----  ---  ---  --------\nVLAN0010         28682 (28672, 10) 0001.4200.0300    2    20   15  rstp",
 o:[
  {t:"AGG-1, because its bridge priority of 28682 is lower than MGMT-SW's 32778",ok:true,x:"Root election compares the whole bridge ID, priority first. root secondary set AGG-1 to 28672 (+10 sys-id-ext = 28682), which beats MGMT-SW's default 32768 + 10. The MAC address is only a tie-breaker."},
  {t:"MGMT-SW, because its MAC address 0001.4200.0200 is lower than AGG-1's",ok:false,x:"The MAC address is compared only when priorities tie. 28682 is lower than 32778, so AGG-1 wins before MAC addresses are considered."},
  {t:"AGG-1, and it takes priority 24586 because root secondary copies the primary's value",ok:false,x:"root secondary sets 28672 on the switch where it is entered. It does not copy anything from the primary, and the exhibit shows AGG-1 at 28682."},
  {t:"No switch; VLAN 10 has no root bridge until DC-CORE comes back",ok:false,x:"STP always elects a root among the switches that remain. The surviving switches stop receiving DC-CORE's BPDUs and elect the best remaining bridge ID."}
 ],
 w:"Root = lowest bridge ID: priority (multiple of 4096 + VLAN) first, MAC only on a tie. root primary sets 24576 (or lower if needed); root secondary sets 28672."},
{id:"c002",obj:"1.2.c",d:1,cat:"parts",t:"ms",pick:2,
 q:"Refer to the exhibit. The data center team drafted the cabling plan for its new spine-leaf fabric. Which two changes are needed for the plan to follow spine-leaf design rules? (Choose two.)",
 ex:"New fabric cabling plan\n\nSPINE-1   to  LEAF-1, LEAF-2, LEAF-3, LEAF-4\nSPINE-2   to  LEAF-1, LEAF-2, LEAF-3\nSPINE-1   to  SPINE-2   (2 links, for east-west traffic)\nLEAF-1    to  hypervisor hosts, rack 1\nLEAF-2    to  hypervisor hosts, rack 2\nLEAF-3    to  storage arrays, rack 3\nLEAF-4    to  border routers and firewalls",
 o:[
  {t:"Cable LEAF-4 to SPINE-2",ok:true,x:"Every leaf connects to every spine. With LEAF-4 on SPINE-1 only, traffic from LEAF-4 has half the uplink capacity and loses the fabric if SPINE-1 fails."},
  {t:"Remove the links between SPINE-1 and SPINE-2",ok:true,x:"Spines do not connect to each other. Any leaf reaches any other leaf through any spine, so a spine-to-spine link adds nothing but an extra, uneven path."},
  {t:"Add a direct link between LEAF-1 and LEAF-2 for VM migration traffic",ok:false,x:"Leaves do not connect to each other in spine-leaf. Rack-to-rack traffic goes leaf, spine, leaf, which keeps every path the same length."},
  {t:"Move the storage arrays from LEAF-3 to the spines",ok:false,x:"Endpoints, including storage, attach to leaves only. Spines carry nothing but leaf-to-leaf traffic."},
  {t:"Add a core layer above the spines to aggregate them",ok:false,x:"That would turn the fabric back into a three-tier design. Spine-leaf grows outward: add leaves for ports, add spines for bandwidth."},
  {t:"Move the border routers and firewalls from LEAF-4 to SPINE-1",ok:false,x:"External connections land on a leaf (a border leaf), like any other device. Attaching them to one spine breaks the uniform leaf-spine-leaf path."}
 ],
 w:"Spine-leaf: every leaf to every spine, no leaf-leaf or spine-spine links, endpoints only on leaves. Any server to any server is leaf, spine, leaf: predictable latency for east-west traffic."},
{id:"c003",obj:"6.6",d:6,cat:"cfgmgmt",t:"mc",
 q:"Refer to the exhibit. The automation team ran a playbook that adds VLAN 150 to the four leaf switches. Which statement about the result is true?",
 ex:"$ ansible-playbook -i inventory.ini add-vlan150.yml\n\nPLAY [Add backup VLAN to leaf switches] ****************************\n\nTASK [Ensure VLAN 150 BACKUP exists] *******************************\nok: [LEAF-1]\nchanged: [LEAF-2]\nok: [LEAF-3]\nchanged: [LEAF-4]\n\nPLAY RECAP *********************************************************\nLEAF-1  : ok=1  changed=0  unreachable=0  failed=0  skipped=0\nLEAF-2  : ok=1  changed=1  unreachable=0  failed=0  skipped=0\nLEAF-3  : ok=1  changed=0  unreachable=0  failed=0  skipped=0\nLEAF-4  : ok=1  changed=1  unreachable=0  failed=0  skipped=0",
 o:[
  {t:"LEAF-1 and LEAF-3 already had VLAN 150, so nothing was changed on them; only LEAF-2 and LEAF-4 were modified",ok:true,x:"Ansible modules are written to be idempotent: they compare the desired state with the device and change only what differs. ok means already compliant; changed means the module had to configure something."},
  {t:"The task failed on LEAF-1 and LEAF-3, which reported ok instead of changed",ok:false,x:"Failures appear as failed or unreachable, and both counters are 0 for every host. ok is a success with nothing to change."},
  {t:"LEAF-1 and LEAF-3 were skipped because they are not in the play's inventory group",ok:false,x:"Hosts outside the targeted group do not appear in the output at all, and skipped=0 for every host."},
  {t:"Running the playbook again will add a second copy of VLAN 150 on LEAF-2 and LEAF-4",ok:false,x:"An idempotent task describes an end state. On a second run all four leaves already match it, so every host reports ok and changed=0."}
 ],
 w:"Ansible run output: ok = already in desired state, changed = modified, failed / unreachable = errors. Idempotent modules make playbooks safe to rerun. Agentless, push over SSH, YAML playbooks, inventory of hosts and groups."},
{id:"c004",obj:"1.6",d:1,cat:"tcpip",t:"mc",
 q:"Refer to the exhibit. New VLAN 123 on LEAF-2 needs addresses for 25 servers. Its subnet must come from 10.60.21.0/24, must not overlap any existing subnet, and must be the smallest size that fits. Which SVI address configuration meets these requirements?",
 ex:"LEAF-2# show ip route connected\n      10.0.0.0/8 is variably subnetted, 8 subnets, 5 masks\nC        10.60.21.0/25 is directly connected, Vlan121\nL        10.60.21.1/32 is directly connected, Vlan121\nC        10.60.21.128/27 is directly connected, Vlan122\nL        10.60.21.129/32 is directly connected, Vlan122\nC        10.60.21.192/26 is directly connected, Vlan124\nL        10.60.21.193/32 is directly connected, Vlan124\nC        10.60.255.12/30 is directly connected, TenGigabitEthernet1/1/2\nL        10.60.255.13/32 is directly connected, TenGigabitEthernet1/1/2",
 o:[
  {t:"ip address 10.60.21.161 255.255.255.224",ok:true,x:"Used space: .0-.127 (/25), .128-.159 (/27) and .192-.255 (/26). The gap .160-.191 is exactly one /27 with 30 usable addresses, enough for 25 servers, and .161 is its first host."},
  {t:"ip address 10.60.21.161 255.255.255.192",ok:false,x:"A /26 containing .161 is 10.60.21.128/26 (.128-.191), which overlaps Vlan122's 10.60.21.128/27. IOS rejects the overlapping address."},
  {t:"ip address 10.60.21.177 255.255.255.240",ok:false,x:"10.60.21.176/28 is free, but a /28 has only 14 usable addresses, too few for 25 servers."},
  {t:"ip address 10.60.21.97 255.255.255.224",ok:false,x:"10.60.21.96/27 falls inside Vlan121's 10.60.21.0/25 (.0-.127), so it overlaps."}
 ],
 w:"Find free space: list each subnet's range (network to broadcast), look for a gap on a block boundary, and pick the smallest mask with 2^h - 2 >= hosts. 25 hosts needs h = 5: /27, 30 usable."},
{id:"c005",obj:"2.4",d:2,cat:"l2link",t:"mc",
 q:"Refer to the exhibit. DC-CORE and MGMT-SW are joined by an LACP bundle, Po5. MGMT-SW's members are in passive mode. What is the current state of the bundle?",
 ex:"DC-CORE# show etherchannel summary\nFlags:  D - down        P - bundled in port-channel\n        I - stand-alone s - suspended\n        H - Hot-standby (LACP only)\n        R - Layer3      S - Layer2\n        U - in use\n\nNumber of channel-groups in use: 1\nNumber of aggregators:           1\n\nGroup  Port-channel  Protocol    Ports\n------+-------------+-----------+------------------------------------------\n5      Po5(SU)       LACP        Gi1/0/21(P) Gi1/0/22(s)\n\nDC-CORE# show running-config interface gigabitEthernet1/0/21\ninterface GigabitEthernet1/0/21\n switchport trunk allowed vlan 10,20,140\n switchport mode trunk\n channel-group 5 mode active\n\nDC-CORE# show running-config interface gigabitEthernet1/0/22\ninterface GigabitEthernet1/0/22\n switchport trunk allowed vlan 10,20\n switchport mode trunk\n channel-group 5 mode active",
 o:[
  {t:"Gi1/0/22 is suspended because its allowed VLAN list does not match, so Po5 carries traffic on Gi1/0/21 only",ok:true,x:"Members must have matching Layer 2 settings. Gi1/0/22's allowed list differs, so IOS suspends it (s) and Po5 stays up (SU) with one bundled port (P). Making the lists match lets it bundle."},
  {t:"Gi1/0/22 is a hot-standby LACP member that will bundle only if Gi1/0/21 fails",ok:false,x:"Hot-standby is flag H, used when more ports are configured than the bundle allows. The flag shown is s, suspended."},
  {t:"The bundle cannot form because active on DC-CORE and passive on MGMT-SW are incompatible",ok:false,x:"Active with passive is a valid LACP pair: the active side starts negotiation. Po5 is in use and Gi1/0/21 is bundled, which proves negotiation worked."},
  {t:"Gi1/0/22 is stand-alone because MGMT-SW runs PAgP on that port",ok:false,x:"A port that cannot negotiate the protocol shows I (stand-alone). The flag here is s, and the cause is visible in the differing configuration."}
 ],
 w:"etherchannel summary flags: P bundled, I stand-alone, s suspended, H hot-standby, D down; S/R Layer 2/3, U in use. Members need the same speed, duplex, mode, access/native VLAN and allowed list."},
{id:"c006",obj:"1.8",d:1,cat:"ipv6",t:"mc",
 q:"The IPv6 gateway for the backup-server segment is documented in full as 2001:0db8:0060:0000:0000:0a00:0000:0010. Which entry is the correct fully compressed form for the address plan?",
 o:[
  {t:"2001:db8:60::a00:0:10",ok:true,x:"Leading zeros drop in each hextet (0db8 to db8, 0060 to 60, 0a00 to a00, 0010 to 10). The longest run of all-zero hextets (positions 4-5) becomes ::, and the lone zero hextet stays 0."},
  {t:"2001:db8:60::a00::10",ok:false,x:"Only one :: is allowed in an address. With two, a reader cannot tell how many zero hextets each one replaces."},
  {t:"2001:db8:60::a:0:10",ok:false,x:"Only leading zeros can be removed. Trimming the trailing zeros of a00 changes the value to 000a."},
  {t:"2001:db8:60:0:0:a00::10",ok:false,x:"This expands to the same address, but it is not fully compressed: :: should replace the longest zero run (two hextets), not a single zero hextet."}
 ],
 w:"IPv6 compression: drop leading zeros in each hextet; replace the longest run of zero hextets with :: once (leftmost if tied); never use :: for a single hextet in canonical form."},
{id:"c007",obj:"2.8",d:2,cat:"mgmt",t:"mc",
 q:"Refer to the exhibit. The TACACS+ server at 10.60.250.20 is powered off for maintenance. An engineer opens an SSH session to LEAF-3 with the local account netops, which exists on LEAF-3. What happens?",
 ex:"LEAF-3# show running-config\n...\naaa new-model\naaa authentication login VTY-LOGIN group tacacs+ local\n!\ntacacs server TAC-1\n address ipv4 10.60.250.20\n key 7 08154D4D5D1A165A36285A54\n!\nline vty 0 15\n login authentication VTY-LOGIN\n transport input ssh\n...",
 o:[
  {t:"LEAF-3 gets no answer from the TACACS+ server, then checks its local user database, and netops logs in",ok:true,x:"A method list moves to the next method only when the current one returns an error, such as an unreachable server. The local method then authenticates netops."},
  {t:"The login fails, because local is used only when the TACACS+ server rejects the credentials",ok:false,x:"It is the other way round. A reject from the server is final; local is tried only when the server cannot be reached."},
  {t:"LEAF-3 falls back to the password configured under the vty lines",ok:false,x:"The vty lines use the VTY-LOGIN list, so only its methods apply: TACACS+ and then local. A line password is not one of them."},
  {t:"LEAF-3 forwards the login to a RADIUS server as the standard backup for TACACS+",ok:false,x:"Only the methods named in the list are used. No RADIUS group is configured or listed."}
 ],
 w:"AAA method lists fail over only on an error (no response). An explicit reject ends the attempt. Keep a local account as the last method so devices stay reachable when the AAA server is down."},
{id:"c008",obj:"1.4",d:1,cat:"parts",t:"mc",
 q:"Refer to the exhibit. Applications on LEAF-3's servers report retransmissions, and the counters below increase steadily on LEAF-3's uplink to SPINE-2. Which action should the team take first?",
 ex:"LEAF-3# show interfaces tenGigabitEthernet1/1/2\nTenGigabitEthernet1/1/2 is up, line protocol is up (connected)\n  Hardware is Ten Gigabit Ethernet Port, address is 00a7.42e5.0882\n  Description: uplink to SPINE-2\n  Internet address is 10.60.255.14/30\n  MTU 1500 bytes, BW 10000000 Kbit/sec, DLY 10 usec,\n     reliability 238/255, txload 3/255, rxload 4/255\n  Encapsulation ARPA, loopback not set\n  Full-duplex, 10Gb/s, link type is auto, media type is SFP-10GBase-SR\n  input flow-control is off, output flow-control is unsupported\n  5 minute input rate 162344000 bits/sec, 15890 packets/sec\n  5 minute output rate 121802000 bits/sec, 12511 packets/sec\n     48211907 packets input, 52841117302 bytes, 0 no buffer\n     Received 21004 broadcasts (3120 multicasts)\n     0 runts, 0 giants, 0 throttles\n     88412 input errors, 88412 CRC, 0 frame, 0 overrun, 0 ignored\n     39507712 packets output, 41180933410 bytes, 0 underruns\n     0 output errors, 0 collisions, 0 interface resets",
 o:[
  {t:"Inspect, clean or replace the fiber patch cords and the SFP-10GBase-SR optics on this link",ok:true,x:"Every input error is a CRC error, the link is full duplex with no collisions, and load is low. Frames are corrupted in transit, which points to the physical layer: dirty connectors, a damaged cord or a failing optic."},
  {t:"Hard-code duplex full on both ends to fix a duplex mismatch",ok:false,x:"The port already runs full duplex at 10 Gb/s, and 10-Gigabit Ethernet has no half-duplex mode. A mismatch would also show collisions on one side."},
  {t:"Raise the MTU on both ends, because the frames are too large",ok:false,x:"Oversized frames would be counted as giants, and giants is 0."},
  {t:"Add a second uplink, because the link is congested and dropping frames",ok:false,x:"rxload is 4/255 and there are no overruns or no-buffer drops. Congestion does not corrupt frames or raise CRC counts."}
 ],
 w:"CRC/input errors with no collisions on a full-duplex link = bad bits on the medium: cable, connectors, optics. Late collisions = duplex mismatch. Runts/giants = framing/MTU. Overruns/no buffer = load."},
{id:"c009",obj:"6.5",d:6,cat:"api",t:"order",
 q:"A test script exercises the fabric controller's VLAN API: it creates VLAN 150, reads it back, renames it, deletes it, and finally confirms that it is gone. Drag the requests and responses into the order in which they occur.",
 pool:[
  "PATCH /api/v1/vlans/150 with {\"name\": \"BACKUP-NET\"}, then 200 OK",
  "GET /api/v1/vlans/150, then 404 Not Found",
  "POST /api/v1/vlans with {\"vlanId\": 150, \"name\": \"BACKUP\"}, then 201 Created",
  "DELETE /api/v1/vlans/150, then 204 No Content",
  "GET /api/v1/vlans/150, then 200 OK with the VLAN's JSON"
 ],
 answer:[2,4,0,3,1],
 x:"CRUD maps to HTTP verbs: create with POST to the collection (201 Created), read with GET (200 OK with a body), update part of a resource with PATCH, and delete with DELETE (often 204 No Content, a success with no body). A GET for a resource that no longer exists returns 404 Not Found, which confirms the delete.",
 w:"CRUD to HTTP: Create POST (201), Read GET (200), Update PUT (replace) or PATCH (modify part), Delete DELETE (200/204). 404 = no such resource; 401 = not authenticated; 403 = authenticated but not allowed."},
{id:"c010",obj:"2.1.a",d:2,cat:"vlan",t:"mc",
 q:"Refer to the exhibit. A database server on LEAF-2 Gi1/0/12 belongs in VLAN 130. Its link LED is green, but it cannot reach its gateway or any host in VLAN 130. VLAN 130 was removed from LEAF-2 during a cleanup last week. Which action restores connectivity?",
 ex:"LEAF-2# show interfaces gigabitEthernet1/0/12 switchport\nName: Gi1/0/12\nSwitchport: Enabled\nAdministrative Mode: static access\nNegotiation of Trunking: Off\nAccess Mode VLAN: 130 (Inactive)\nTrunking Native Mode VLAN: 1 (default)\nVoice VLAN: none",
 o:[
  {t:"Create VLAN 130 on LEAF-2 with the vlan 130 global command",ok:true,x:"(Inactive) means the access VLAN is not in the switch's VLAN database. The port keeps its assignment but forwards nothing until the VLAN exists again."},
  {t:"Change the port to switchport mode trunk so VLAN 130 is carried tagged",ok:false,x:"A server NIC sending untagged frames needs an access port, and a trunk still could not carry a VLAN that does not exist on the switch."},
  {t:"Set the trunk native VLAN to 130 on Gi1/0/12",ok:false,x:"The native VLAN applies only when the port is trunking. Gi1/0/12 is a static access port, so the setting would have no effect."},
  {t:"Enter switchport nonegotiate to stop DTP from blocking the port",ok:false,x:"Negotiation of Trunking is already Off for a static access port, and DTP never blocks traffic on an access port."}
 ],
 w:"Access Mode VLAN: N (Inactive) = the port's VLAN is missing from the VLAN database; the port drops traffic until the VLAN is created. show vlan brief lists the VLANs that exist."},
{id:"c011",obj:"1.12",d:1,cat:"wlbasics",t:"build",ordered:false,
 q:"The platform team is moving several web services from virtual machines to containers. Drag the characteristics of containers, compared with virtual machines, into the answer area. Leave the characteristics that do not apply.",
 pool:[
  "Share the host operating system's kernel",
  "Start in seconds or less because no guest operating system boots",
  "Package an application with its libraries and dependencies",
  "Each instance runs its own complete guest operating system",
  "A hypervisor emulates virtual hardware for each instance",
  "Can run a different kernel family from the host, such as Windows on a Linux host",
  "Usually need less memory and disk than an equivalent virtual machine"
 ],
 answer:[0,1,2,6],
 x:"A container is an isolated process group on a shared host kernel, packaged with its own libraries and dependencies. With no guest OS to boot, it starts quickly and uses fewer resources. A full guest OS per instance and virtual hardware emulated by a hypervisor describe VMs, and because containers share the kernel they cannot natively run a different kernel family.",
 w:"VM: hypervisor (type 1 bare-metal or type 2 hosted), virtual hardware, a full guest OS each. Container: shared host kernel, app + dependencies, lightweight, fast start; orchestrated with tools such as Kubernetes."},
{id:"c012",obj:"2.6",d:2,cat:"wlan",t:"mc",
 q:"The new operations building gets 12 APs. The team wants no controller hardware on site or in the data center: the APs are configured and monitored from a vendor-hosted web dashboard, and they switch client traffic onto the local LAN. Which wireless architecture fits?",
 o:[
  {t:"Cloud-based architecture with cloud-managed APs",ok:true,x:"Cloud-managed APs take their configuration and send monitoring data to a controller hosted in the cloud. Only management traffic goes there; client traffic is switched locally."},
  {t:"Autonomous APs",ok:false,x:"Autonomous APs need no controller, but each one is configured and monitored on its own. There is no central dashboard."},
  {t:"Centralized (split-MAC) architecture with lightweight APs in local mode",ok:false,x:"Lightweight APs in local mode need a WLC, and they tunnel all client traffic to it in CAPWAP rather than switching it locally."},
  {t:"Lightweight APs in FlexConnect mode",ok:false,x:"FlexConnect switches traffic locally, but the APs still need a WLC to join, which the team wants to avoid."}
 ],
 w:"Wireless architectures: autonomous (standalone, managed one by one), centralized/split-MAC (lightweight APs + WLC, CAPWAP), FlexConnect (remote APs, central WLC, local switching), cloud-based (cloud dashboard, local switching)."},
{id:"c013",obj:"1.9",d:1,cat:"ipv6",t:"ms",pick:3,
 q:"Refer to the exhibit. LEAF-2's VLAN 110 SVI has MAC address 00a7.42d1.3c40 and is the gateway for the web-server segment. Which three statements about the output are true? (Choose three.)",
 ex:"LEAF-2# show ipv6 interface vlan 110\nVlan110 is up, line protocol is up\n  IPv6 is enabled, link-local address is FE80::2A7:42FF:FED1:3C40\n  No Virtual link-local address(es):\n  Global unicast address(es):\n    2001:DB8:60:110::1, subnet is 2001:DB8:60:110::/64\n  Joined group address(es):\n    FF02::1\n    FF02::2\n    FF02::1:FF00:1\n    FF02::1:FFD1:3C40\n  MTU is 1500 bytes\n  ICMP error messages limited to one every 100 milliseconds\n  ICMP redirects are enabled\n  ICMP unreachables are sent\n  ND DAD is enabled, number of DAD attempts: 1\n  ND reachable time is 30000 milliseconds (using 30000)\n  ND advertised reachable time is 0 (unspecified)\n  ND advertised retransmit interval is 0 (unspecified)\n  ND router advertisements are sent every 200 seconds\n  ND router advertisements live for 1800 seconds\n  ND advertised default router preference is Medium\n  Hosts use stateless autoconfig for addresses.",
 o:[
  {t:"The link-local address was built from the SVI's MAC address with modified EUI-64",ok:true,x:"The interface ID 02A7:42FF:FED1:3C40 is the MAC split in half with FFFE inserted, and 00 became 02 because the seventh bit was inverted."},
  {t:"FF02::1:FF00:1 is the solicited-node group that neighbors use to resolve 2001:db8:60:110::1",ok:true,x:"A solicited-node group is FF02::1:FF plus the last 24 bits of a unicast address. The GUA ends in 00:0001, so its group is FF02::1:FF00:1, used for neighbor solicitations and DAD."},
  {t:"Membership in FF02::2 shows that LEAF-2 is acting as an IPv6 router",ok:true,x:"FF02::2 is the all-routers group. IOS joins it, and sends router advertisements, once ipv6 unicast-routing is enabled."},
  {t:"The global unicast address was also generated with EUI-64",ok:false,x:"The interface ID of the GUA is ::1, not a MAC-derived value with FFFE in the middle, so it was configured statically."},
  {t:"Hosts in other subnets can use the link-local address to reach LEAF-2",ok:false,x:"Link-local (FE80::/10) addresses are valid only on the local link. Routers never forward packets sourced from or sent to them."},
  {t:"FF02::1 is an anycast address that only the nearest router answers",ok:false,x:"FF02::1 is the link-scope all-nodes multicast group. Every IPv6 interface on the link joins it."}
 ],
 w:"IPv6 interface groups: FF02::1 all nodes, FF02::2 all routers (routing on), FF02::1:FFxx:xxxx solicited-node per unicast/anycast address (last 24 bits). FFFE in the middle of an interface ID = EUI-64."},
{id:"c014",obj:"2.2.a",d:2,cat:"vlan",t:"mc",
 q:"Refer to the exhibit. During the migration, LEAF-1 Gi1/0/48 trunks to the legacy aggregation switch AGG-1. An engineer must also carry new VLAN 140 on this trunk and enters the commands shown. What is the result?",
 ex:"LEAF-1# show interfaces trunk\n\nPort        Mode             Encapsulation  Status        Native vlan\nGi1/0/48    on               802.1q         trunking      999\n\nPort        Vlans allowed on trunk\nGi1/0/48    110,120,130,999\n\nPort        Vlans allowed and active in management domain\nGi1/0/48    110,120,130,999\n\nPort        Vlans in spanning tree forwarding state and not pruned\nGi1/0/48    110,120,130,999\n\nLEAF-1# configure terminal\nLEAF-1(config)# interface gigabitEthernet1/0/48\nLEAF-1(config-if)# switchport trunk allowed vlan 140",
 o:[
  {t:"VLAN 140 becomes the only allowed VLAN, so VLANs 110, 120, 130 and native VLAN 999 stop crossing the trunk",ok:true,x:"switchport trunk allowed vlan with a plain list replaces the existing list. Only the add keyword appends. The native VLAN is dropped too, because it is no longer in the allowed list."},
  {t:"VLAN 140 is added to the existing allowed list",ok:false,x:"Adding needs switchport trunk allowed vlan add 140. Without add, the command overwrites the list."},
  {t:"The command is rejected because VLAN 140 has not been created on LEAF-1",ok:false,x:"IOS accepts VLAN IDs in the allowed list whether or not they exist. A missing VLAN would just not appear as allowed and active."},
  {t:"VLAN 140 becomes the native VLAN and is sent untagged",ok:false,x:"The native VLAN is set with switchport trunk native vlan. The allowed list does not change which VLAN is untagged."}
 ],
 w:"switchport trunk allowed vlan X replaces the list; use add, remove, except, all or none to edit it. Check allowed vs allowed-and-active vs forwarding columns in show interfaces trunk."},
{id:"c015",obj:"6.3",d:6,cat:"sdn",t:"mc",
 q:"Refer to the exhibit. Which statement correctly describes how the parts of this fabric design depend on each other?",
 ex:"Data center fabric design (draft)\n\n1. SPINE-1/2 and LEAF-1..4 are joined by routed point-to-point links.\n   OSPF area 0 advertises every switch loopback (10.60.254.0/24).\n2. VXLAN tunnels between leaf loopbacks carry tenant VLANs 110-140,\n   so a VM keeps its IP subnet when it moves to a host in another rack.\n3. The fabric controller assigns tenant segments to leaves and\n   pushes the matching policy to every leaf.",
 o:[
  {t:"The VXLAN overlay needs the underlay only for reachability between leaf loopbacks; the spines need no routes to tenant subnets",ok:true,x:"Item 1 is the underlay: a routed network whose only job is to connect the tunnel endpoints. Tenant frames travel encapsulated between leaf loopbacks, so spines route on the outer header and never see tenant addresses."},
  {t:"The underlay must carry routes to every tenant subnet so the spines can forward VM traffic",ok:false,x:"That defeats the purpose of an overlay. Tenant traffic is encapsulated, so the underlay forwards on the leaf loopback addresses only."},
  {t:"VLANs 110-140 must be trunked on every spine-leaf link so VMs can move between racks",ok:false,x:"The spine-leaf links are routed. Layer 2 segments are stretched by the VXLAN tunnels, not by trunking VLANs through the fabric."},
  {t:"The controller in item 3 is the underlay, and the spines and leaves together form the overlay",ok:false,x:"The underlay is the physical, routed transport (item 1) and the overlay is the virtual tunnels on top of it (item 2). The fabric is the whole managed system, which the controller programs."}
 ],
 w:"Underlay = physical routed network that connects the tunnel endpoints. Overlay = virtual tunnels (VXLAN, etc.) carrying tenant traffic on top. Fabric = underlay + overlay managed as one system, usually by a controller."},
{id:"c016",obj:"1.5",d:1,cat:"tcpip",t:"mc",
 q:"Every leaf switch sends syslog messages to the monitoring server and copies its nightly configuration backup to the same server with SCP. During a period of heavy congestion, some syslog messages never arrived, yet every backup file arrived complete. Which statement explains the difference?",
 o:[
  {t:"Syslog uses UDP, which has no acknowledgments or retransmission; SCP runs over TCP, which resends lost segments",ok:true,x:"Syslog to a server uses UDP 514 by default: a dropped datagram is simply lost. SCP runs inside SSH on TCP 22, and TCP acknowledges data and retransmits segments that were not acknowledged."},
  {t:"Syslog uses TCP, but its window size was too small for the congestion",ok:false,x:"Standard IOS syslog to a host uses UDP 514. A small TCP window slows a transfer down; it does not lose data."},
  {t:"SCP uses UDP but adds its own sequence numbers to recover lost files",ok:false,x:"SCP runs over SSH, which uses TCP 22. Reliability comes from TCP, not from SCP."},
  {t:"Congested routers and switches drop UDP datagrams but never drop TCP segments",ok:false,x:"Congestion drops packets of any protocol. TCP recovers because the sender retransmits what was not acknowledged."}
 ],
 w:"TCP: connection-oriented, acknowledgments, retransmission, sequencing, windowing (SSH/SCP 22, HTTPS 443). UDP: best effort, no recovery (syslog 514, SNMP 161/162, TFTP 69, DNS queries 53)."},
{id:"c017",obj:"2.5.d",d:2,cat:"stp",t:"mc",
 q:"Refer to the exhibit. LEAF-2 Gi1/0/7 is an access port with PortFast and BPDU guard. A server administrator connected a hypervisor host whose virtual switch sent BPDUs. The host's virtual switch has now been fixed, and errdisable recovery is not configured. How is Gi1/0/7 returned to service?",
 ex:"LEAF-2#\n*Oct  2 22:41:07.311: %SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on\n  port GigabitEthernet1/0/7 with BPDU Guard enabled. Disabling port.\n*Oct  2 22:41:07.312: %PM-4-ERR_DISABLE: bpduguard error detected on\n  Gi1/0/7, putting Gi1/0/7 in err-disable state\n\nLEAF-2# show interfaces gigabitEthernet1/0/7 status\n\nPort      Name           Status       Vlan  Duplex  Speed Type\nGi1/0/7   HV-07 vmnic0   err-disabled 110     auto   auto 10/100/1000BaseTX",
 o:[
  {t:"Enter shutdown and then no shutdown on Gi1/0/7",ok:true,x:"BPDU guard puts the port in err-disabled state. Without errdisable recovery, the port stays down until an administrator bounces it with shutdown / no shutdown."},
  {t:"Wait; the port returns to forwarding on its own once BPDUs stop arriving",ok:false,x:"Automatic recovery is how root guard and loop guard behave. An err-disabled port stays down until it is reset."},
  {t:"Enter no spanning-tree bpduguard enable on Gi1/0/7",ok:false,x:"Removing BPDU guard does not clear the err-disabled state, and it removes the protection the edge port needs."},
  {t:"Enter clear mac address-table dynamic interface gigabitEthernet1/0/7",ok:false,x:"Clearing MAC entries does not change the port's state. The port stays err-disabled."}
 ],
 w:"BPDU guard: BPDU on a PortFast port means err-disabled; recover with shutdown/no shutdown or errdisable recovery cause bpduguard. Global form: spanning-tree portfast bpduguard default."},
{id:"c018",obj:"1.3.a",d:1,cat:"parts",t:"mc",
 q:"LEAF-3 will connect to a new storage switch in the same row, 40 meters away. Both switches have empty SFP+ ports, and the link must run at 10 Gb/s. Which fiber and optic combination meets the need at the lowest cost?",
 o:[
  {t:"OM4 multimode fiber with 10GBASE-SR optics",ok:true,x:"10GBASE-SR uses 850-nm optics over multimode fiber and reaches roughly 300-400 m on OM3/OM4, far more than 40 m. Multimode optics cost less than single-mode lasers."},
  {t:"OS2 single-mode fiber with 10GBASE-LR optics",ok:false,x:"This works, but 10GBASE-LR (1310 nm, up to 10 km) uses more expensive optics. It is meant for campus and inter-building distances, not a 40-m link in one row."},
  {t:"OS2 single-mode fiber with 10GBASE-SR optics",ok:false,x:"10GBASE-SR optics are built for multimode fiber. Mismatching the fiber type and the optic gives an unreliable link or none at all."},
  {t:"OM4 multimode fiber with 10GBASE-LR optics",ok:false,x:"10GBASE-LR is a single-mode optic. Pairing it with multimode fiber is not a supported combination."}
 ],
 w:"Multimode (OM3/OM4, 850 nm, SR): short runs in a room or building, cheaper optics. Single-mode (OS2, 1310/1550 nm, LR/ER): kilometers, costlier lasers. Copper (Cat 6A 10GBASE-T): up to 100 m."},
{id:"c019",obj:"2.3",d:2,cat:"l2link",t:"ms",pick:2,
 q:"The data center has Cisco switches and Linux hypervisor hosts from several vendors. The team wants every device's neighbors in its documentation tool. Which two statements about CDP and LLDP are true? (Choose two.)",
 o:[
  {t:"LLDP is defined by the IEEE (802.1AB), so non-Cisco hosts and switches can run it",ok:true,x:"LLDP is the vendor-neutral standard. Linux hosts commonly run an LLDP agent, which makes it the protocol to use in a mixed environment."},
  {t:"On Cisco IOS switches, CDP is enabled by default, while LLDP must usually be enabled with lldp run",ok:true,x:"CDP runs globally and on every interface by default. LLDP is off by default on most Catalyst platforms until lldp run is entered."},
  {t:"LLDP sends advertisements every 60 seconds with a 180-second holdtime by default",ok:false,x:"Those are CDP's defaults. LLDP's defaults are a 30-second timer and a 120-second holdtime."},
  {t:"CDP can discover the Linux hosts as long as they run an LLDP agent",ok:false,x:"CDP and LLDP are separate protocols. A device running only LLDP never appears in show cdp neighbors."},
  {t:"Both protocols need an IP address on the interface, because they run at Layer 3",ok:false,x:"CDP and LLDP are Layer 2 protocols sent to multicast MAC addresses. They work with no IP address on the port, though they can advertise a management address."}
 ],
 w:"CDP: Cisco proprietary, on by default, 60 s / 180 s. LLDP: IEEE 802.1AB, lldp run to enable, 30 s / 120 s, per-port lldp transmit / lldp receive. Both Layer 2; disable on untrusted edge ports."},
{id:"c020",obj:"6.7",d:6,cat:"api",t:"ms",pick:2,
 q:"Refer to the exhibit. A monitoring script builds this payload before posting it to the operations dashboard, and the dashboard rejects it as invalid JSON. Which two problems make the payload invalid? (Choose two.)",
 ex:"{\n  \"leaf\": \"LEAF-3\",\n  \"uplinks\": [\n    {\"port\": \"Te1/1/1\", \"peer\": \"SPINE-1\", \"crc\": 0},\n    {\"port\": \"Te1/1/2\", \"peer\": \"SPINE-2\", \"crc\": 88412},\n  ],\n  \"ipv6\": true,\n  'site': \"DH2\"\n}",
 o:[
  {t:"The comma after the last object in the uplinks array",ok:true,x:"JSON does not allow a trailing comma after the last element of an array or object. A comma must be followed by another element."},
  {t:"The single quotes around the key site",ok:true,x:"JSON strings, keys included, must use double quotes. Single quotes are valid in some programming languages but not in JSON."},
  {t:"The value true is not in quotes",ok:false,x:"true and false are JSON Boolean literals and are written without quotes. \"true\" would be a string instead."},
  {t:"The CRC counts are numbers without quotes",ok:false,x:"Numbers are written bare in JSON. Quoting them would turn them into strings."},
  {t:"An array cannot contain objects",ok:false,x:"Array elements can be any JSON value, including objects, arrays, strings, numbers, Booleans and null."},
  {t:"The value LEAF-3 contains a hyphen",ok:false,x:"Any characters are allowed inside a double-quoted string; only double quotes and backslashes must be escaped."}
 ],
 w:"JSON rules: keys and strings in double quotes; values are string, number, true/false, null, object {} or array []; commas only between elements, never trailing."},
{id:"c021",obj:"1.10",d:1,cat:"tcpip",t:"mc",
 q:"Refer to the exhibit. Server db-08 is in VLAN 120, whose gateway SVI is 10.60.20.65. The server reaches other servers in VLAN 120 but nothing outside it, including its DNS server. What is the cause?",
 ex:"[admin@db-08 ~]$ ip -4 addr show dev ens192\n2: ens192: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP\n    inet 10.60.20.71/27 brd 10.60.20.95 scope global noprefixroute ens192\n       valid_lft forever preferred_lft forever\n[admin@db-08 ~]$ ip route\n10.60.20.64/27 dev ens192 proto kernel scope link src 10.60.20.71 metric 100\n[admin@db-08 ~]$ cat /etc/resolv.conf\nsearch dc.example.net\nnameserver 10.60.250.53\n[admin@db-08 ~]$ ping -c 2 10.60.250.53\nping: connect: Network is unreachable",
 o:[
  {t:"The server has no default route; it needs a default gateway of 10.60.20.65",ok:true,x:"ip route lists only the connected /27, with no default via line. Linux has no route for any other destination, so it refuses to send (Network is unreachable) without even trying the gateway."},
  {t:"The prefix should be /24, so that the DNS server is on-link",ok:false,x:"10.60.20.71/27 matches VLAN 120 (10.60.20.64/27). The DNS server is in another subnet and must be reached through a gateway whatever the prefix length."},
  {t:"The DNS server address in /etc/resolv.conf is wrong",ok:false,x:"DNS is a symptom here, not the cause: the ping to the DNS server's IP address fails before any name lookup happens, because there is no route."},
  {t:"The interface is down, so only cached neighbors are reachable",ok:false,x:"The flags show UP and LOWER_UP and state UP, and the server reaches hosts in its own VLAN, so the interface works."}
 ],
 w:"Client checks. Linux: ip addr, ip route (look for default via), /etc/resolv.conf. Windows: ipconfig /all, route print. macOS: ifconfig, netstat -rn, networksetup. No default route = only the local subnet is reachable."},
{id:"c022",obj:"2.4",d:2,cat:"l2link",t:"build",ordered:true,
 q:"LEAF-3's uplinks Te1/1/3 and Te1/1/4 to DC-CORE must become one routed LACP bundle, Port-channel 20, with address 10.60.255.21/30. DC-CORE's members are set to passive. Starting in global configuration mode, drag the commands you need into the answer area in the order you enter them. Leave the commands that do not apply.",
 pool:[
  "interface range tenGigabitEthernet1/1/3 - 4",
  "no switchport",
  "channel-group 20 mode active",
  "interface port-channel 20",
  "ip address 10.60.255.21 255.255.255.252",
  "channel-group 20 mode passive",
  "channel-group 20 mode desirable",
  "switchport mode trunk"
 ],
 answer:[0,1,2,3,4],
 x:"The members are made routed ports first (no switchport), so the port-channel that channel-group creates is also Layer 3. Active is required because the far end is passive, and two passive sides never start LACP. The address then goes on the logical Port-channel 20, not on the members. Desirable is PAgP, and a trunk is Layer 2.",
 w:"L3 EtherChannel: no switchport on members, channel-group N mode active (LACP), then ip address on interface port-channel N. LACP active/active or active/passive; PAgP desirable/auto; on/on only."},
{id:"c023",obj:"1.1.c",d:1,cat:"parts",t:"mc",
 q:"The security team wants a sensor between DC-CORE and the server farm that inspects every packet and drops known exploit traffic before it reaches the servers. Which deployment meets this requirement?",
 o:[
  {t:"An IPS placed inline in the traffic path",ok:true,x:"An inline IPS sits in the forwarding path, so it can drop a malicious packet before it is passed on. That prevention is what separates an IPS from an IDS."},
  {t:"An IDS connected to a SPAN destination port on DC-CORE",ok:false,x:"A SPAN port delivers copies of traffic. A sensor there can detect and alert, but the original packets have already reached the servers."},
  {t:"An IPS in promiscuous mode attached to a network tap",ok:false,x:"In promiscuous mode the sensor sees only copies, like an IDS. It can alert or send resets but cannot reliably stop the first malicious packet."},
  {t:"A NetFlow collector receiving flow records from DC-CORE",ok:false,x:"NetFlow summarizes flows after they happen: addresses, ports, byte counts. It does not inspect payloads or block traffic."}
 ],
 w:"IDS: passive copy (SPAN/tap), detects and alerts. IPS: inline, detects and drops. NGFW: stateful firewall + application awareness + integrated IPS + URL/identity policy."},
{id:"c024",obj:"2.9",d:2,cat:"wlan",t:"mc",
 q:"Refer to the exhibit. The DC-OPS WLAN must authenticate engineers with their own directory credentials. Laptops associate, but every authentication fails. The global RADIUS server list on the WLC is empty. Which change fixes the problem?",
 ex:"WLANs > Edit 'DC-OPS'\n\nGeneral\n  Status            [x] Enabled\n  Interface         ops-vlan30\n  Broadcast SSID    [x] Enabled\n\nSecurity > Layer 2\n  Layer 2 Security  WPA+WPA2\n  WPA2 Policy       [x]     WPA2 Encryption  [x] AES\n  Auth Key Mgmt     [x] 802.1X    [ ] PSK\n\nSecurity > AAA Servers\n  Authentication Servers  [x] Enabled\n  Server 1   None\n  Server 2   None\n  Server 3   None",
 o:[
  {t:"Add the RADIUS server under Security > AAA > RADIUS > Authentication, then select it as Server 1 on the WLAN's AAA Servers tab",ok:true,x:"802.1X needs an authentication server. The WLC acts as the authenticator and relays EAP to RADIUS, but no server is defined globally or on the WLAN."},
  {t:"Change Auth Key Mgmt from 802.1X to PSK",ok:false,x:"A PSK would let clients connect, but every engineer would share one key. The requirement is per-user directory credentials, which need 802.1X with RADIUS."},
  {t:"Disable Broadcast SSID so only managed laptops can find the WLAN",ok:false,x:"Hiding the SSID does not affect authentication, and the laptops already associate."},
  {t:"Set the WLAN's QoS profile to Platinum",ok:false,x:"QoS profiles prioritize traffic such as voice. They play no part in authentication."}
 ],
 w:"WLC WLAN tabs: General (SSID, status, interface, broadcast), Security (Layer 2: WPA2/WPA3, PSK or 802.1X; AAA Servers), QoS (Platinum/Gold/Silver/Bronze), Advanced (timeouts, DHCP, FlexConnect)."},
{id:"c025",obj:"6.2",d:6,cat:"sdn",t:"mc",
 q:"The fabric has moved from box-by-box CLI management to a controller-based design: the controller cluster defines tenant segments and policy and programs all 48 leaf switches. During a maintenance window the whole controller cluster is unreachable for 20 minutes. What happens in the fabric?",
 o:[
  {t:"The switches keep forwarding with the state already programmed, but new changes cannot be deployed until the controller returns",ok:true,x:"The data plane stays on the switches, so traffic keeps flowing with the configuration and forwarding state they already hold. What is lost is central management: new segments, policy changes and controller dashboards wait for the controller."},
  {t:"All traffic stops, because every packet is forwarded through the controller",ok:false,x:"Controllers program devices; they are not in the forwarding path for every packet. Traffic does not pass through the controller."},
  {t:"Each switch reverts to its factory-default configuration until the controller pushes its policy again",ok:false,x:"Devices keep their configuration when the controller is unreachable. Losing the management connection does not erase anything."},
  {t:"The leaves elect one leaf as a temporary controller and keep accepting policy changes from it",ok:false,x:"Leaves have no controller role to take over. Redundancy comes from the controller cluster itself, which is why controllers are deployed in clusters."}
 ],
 w:"Controller-based: central management/control logic, devices keep the data plane and their programmed state. Traditional: every device runs its own control plane and is configured individually. Cluster the controller for redundancy."},
{id:"c026",obj:"1.13.d",d:1,cat:"switching",t:"mc",
 q:"Refer to the exhibit. VM web-14 (MAC 00a7.42c0.1b0e, VLAN 110) live-migrates from the hypervisor on LEAF-1 Gi1/0/5 to the hypervisor on LEAF-1 Gi1/0/9. Right after the move, the new host sends a frame sourced from web-14's MAC address. What does LEAF-1 do?",
 ex:"LEAF-1# show mac address-table address 00a7.42c0.1b0e\n          Mac Address Table\n-------------------------------------------\n\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n 110    00a7.42c0.1b0e    DYNAMIC     Gi1/0/5\nTotal Mac Addresses for this criterion: 1",
 o:[
  {t:"It changes the entry to Gi1/0/9 and restarts its aging timer, so frames for web-14 now go out Gi1/0/9",ok:true,x:"A switch learns from the source MAC of every frame. When a known MAC shows up on a different port in the same VLAN, the entry moves to the new port. That is why hypervisors send a frame for a VM right after migrating it."},
  {t:"It keeps Gi1/0/5 until the 300-second aging timer expires, so web-14 is unreachable until then",ok:false,x:"Aging removes entries that go quiet. A frame from the same MAC on a new port updates the entry immediately; it does not wait for the old one to age out."},
  {t:"It adds a second entry so that frames for web-14 are sent out both Gi1/0/5 and Gi1/0/9",ok:false,x:"A MAC address has one entry per VLAN. The table points to a single port, the one where the address was seen most recently."},
  {t:"It err-disables Gi1/0/9 because the MAC address is already learned on another port",ok:false,x:"Only port security reacts to a MAC moving between secured ports, and it is not configured here. Ordinary learning simply moves the entry."}
 ],
 w:"MAC learning: source MAC + VLAN + ingress port, refreshed on every frame, moved when seen on a new port, aged out after 300 s of silence (default). Forwarding uses the destination MAC."},
{id:"c027",obj:"2.5.d",d:2,cat:"stp",t:"ms",pick:2,
 q:"After a fiber that failed in one direction caused a loop between MGMT-SW and AGG-1, the team is reviewing STP protection features for the management block. Which two statements about loop guard and BPDU filter are true? (Choose two.)",
 o:[
  {t:"Loop guard puts a root or alternate port that stops receiving BPDUs into a loop-inconsistent (blocking) state",ok:true,x:"Without loop guard, a non-designated port that stops hearing BPDUs, for example because of a one-way fiber fault, becomes designated and starts forwarding. Loop guard keeps it blocked instead and releases it when BPDUs return."},
  {t:"BPDU filter on an interface stops it from sending and processing BPDUs, so a loop can form if a switch is connected there",ok:true,x:"Interface-level BPDU filter effectively turns STP off on the port. The port ignores incoming BPDUs, so a loop through it goes undetected."},
  {t:"Loop guard err-disables the port, which must then be bounced with shutdown and no shutdown",ok:false,x:"Loop guard blocks the port in the affected VLAN and recovers on its own once BPDUs arrive again. Err-disable is BPDU guard's action."},
  {t:"Loop guard is meant for PortFast edge ports that face servers",ok:false,x:"Edge ports never receive BPDUs in normal operation, so loop guard has nothing to watch there. It belongs on root and alternate ports between switches."},
  {t:"BPDU filter err-disables the port when a BPDU arrives, the same as BPDU guard",ok:false,x:"BPDU guard disables the port; BPDU filter suppresses BPDUs. The two are often confused, but filter never shuts a port down."}
 ],
 w:"Guards: BPDU guard (edge, BPDU in = err-disabled), root guard (designated ports, superior BPDU = root-inconsistent, auto-recovers), loop guard (root/alternate, BPDUs stop = loop-inconsistent, auto-recovers), BPDU filter (suppress BPDUs)."},
{id:"c028",obj:"1.9.d",d:1,cat:"ipv6",t:"order",
 q:"LEAF-2's VLAN 110 SVI has MAC address 0001.4200.0610 and is configured with ipv6 address 2001:db8:60:110::/64 eui-64. Drag the values into the order in which they are derived, from the MAC address to the final global unicast address.",
 pool:[
  "Prefix + interface ID: 2001:db8:60:110:201:42ff:fe00:610",
  "MAC split in half: 000142 | 000610",
  "Seventh bit inverted: 020142FFFE000610",
  "FFFE inserted: 000142FFFE000610"
 ],
 answer:[1,3,2,0],
 x:"Modified EUI-64 splits the 48-bit MAC into two 24-bit halves and inserts FFFE between them to make 64 bits. It then inverts the seventh bit of the first byte (the universal/local bit), so 00 becomes 02. The 64-bit interface ID is appended to the /64 prefix, and leading zeros are dropped when the result is written.",
 w:"EUI-64: split MAC, insert FFFE, flip bit 7 (U/L), append to /64. Quick check: the first byte changes by 2 (00 to 02, 02 to 00) and the middle of the interface ID reads ff:fe."},
{id:"c029",obj:"2.2.b",d:2,cat:"vlan",t:"ms",pick:2,
 q:"The hypervisor hosts on LEAF-4 use tagged NICs so that VMs in VLANs 110, 120 and 130 share one 25-Gb/s link, and the leaf ports are 802.1Q trunks. Which two statements about 802.1Q are true? (Choose two.)",
 o:[
  {t:"It inserts a 4-byte tag after the source MAC address and recalculates the frame's FCS",ok:true,x:"The tag (TPID 0x8100 plus priority, DEI and VLAN ID) goes between the source MAC and the EtherType. The frame changed, so the FCS is computed again."},
  {t:"The VLAN ID field is 12 bits, so VLAN IDs 1-4094 can be carried",ok:true,x:"12 bits give 4096 values. 0 and 4095 are reserved, which leaves 1-4094 usable."},
  {t:"It wraps the original frame in a new header and trailer, leaving the original frame untouched",ok:false,x:"That is how Cisco's old ISL encapsulation worked. 802.1Q inserts a tag into the existing frame instead."},
  {t:"Frames in the native VLAN carry a tag with VLAN ID 0",ok:false,x:"Native VLAN frames are sent with no tag at all, unless vlan dot1q tag native is configured."},
  {t:"It is a Cisco-proprietary trunking method, so the hosts' NICs must come from Cisco",ok:false,x:"802.1Q is an IEEE standard supported by NICs, hypervisors and switches from every vendor."},
  {t:"Switches add the tag to frames they send out access ports",ok:false,x:"Access ports send and expect untagged frames. Tags are used on trunks (and for the voice VLAN on an access port)."}
 ],
 w:"802.1Q: 4-byte tag (TPID 0x8100, 3-bit PCP, DEI, 12-bit VID) inserted after the source MAC; native VLAN untagged; IEEE standard. ISL: Cisco, encapsulates, obsolete."},
{id:"c030",obj:"6.4",d:6,cat:"sdn",t:"ms",pick:2,
 q:"The operations team is adding an ML-based assurance platform that learns baselines from six weeks of fabric telemetry. Which two outcomes can the team reasonably expect from it? (Choose two.)",
 o:[
  {t:"An alert on an uplink whose error rate departs from its learned normal pattern before users complain",ok:true,x:"Anomaly detection is a core predictive-AI use: the model learns what normal looks like for each link and flags deviations, without a hand-written threshold for every metric."},
  {t:"A forecast of when a leaf's uplink utilization will exceed capacity, based on its growth trend",ok:true,x:"Trend forecasting from historical telemetry is predictive analytics. It lets the team add capacity before congestion appears."},
  {t:"Recommendations that are always correct, so changes based on them can skip review",ok:false,x:"ML output is probabilistic and can be wrong, especially when conditions change. Recommendations still need validation and normal change control."},
  {t:"Accurate anomaly detection from the first day, without any historical data",ok:false,x:"A model needs data to learn a baseline. That is why the platform collects six weeks of telemetry before its alerts become meaningful."},
  {t:"An end to telemetry collection, because the model already knows how the network behaves",ok:false,x:"The model can only judge the network from data it keeps receiving. Telemetry is its input, not something it replaces."}
 ],
 w:"Predictive AI/ML: baselines, anomaly detection, forecasting, root-cause hints from telemetry. Generative AI: produces new content (configs, summaries, answers) from prompts. Both need human review."},
{id:"c031",obj:"1.6",d:1,cat:"tcpip",t:"mc",
 q:"The storage team receives 10.60.32.0/22. It needs VLAN 201 for 300 hosts, VLAN 202 for 100 hosts and VLAN 203 for 50 hosts. Subnets are allocated largest first, each the smallest size that fits, starting at the lowest free address. Which subnet does VLAN 203 receive?",
 o:[
  {t:"10.60.34.128/26",ok:true,x:"VLAN 201 needs 9 host bits: 10.60.32.0/23 (.32.0-.33.255). VLAN 202 needs 7: 10.60.34.0/25 (.34.0-.34.127). VLAN 203 needs 6 (62 hosts): the next free /26 is 10.60.34.128/26."},
  {t:"10.60.34.64/26",ok:false,x:"10.60.34.64-127 is inside 10.60.34.0/25, which is already VLAN 202's subnet."},
  {t:"10.60.34.128/27",ok:false,x:"A /27 has only 30 usable addresses, not enough for 50 hosts."},
  {t:"10.60.35.0/26",ok:false,x:"It fits and does not overlap, but it skips the lowest free block, 10.60.34.128/26, which the allocation rule requires."}
 ],
 w:"VLSM: sort by size, give each the smallest block (2^h - 2 >= hosts), place each on its own block boundary right after the previous one. /23 = 510, /25 = 126, /26 = 62, /27 = 30 hosts."},
{id:"c032",obj:"2.6",d:2,cat:"wlan",t:"ms",pick:2,
 q:"The operations building uses lightweight APs in local mode, joined to WLC-1 over CAPWAP in a split-MAC architecture. Which two functions does each lightweight AP perform itself? (Choose two.)",
 o:[
  {t:"Transmitting beacon frames for each SSID",ok:true,x:"Beacons are time-critical and sent on a strict interval, so the AP generates them locally."},
  {t:"Responding to probe requests from clients",ok:true,x:"Probe responses must go out within milliseconds, so the AP answers them in real time without involving the WLC."},
  {t:"Adjusting channel and transmit power across all APs (RRM)",ok:false,x:"Radio resource management needs a view of every AP, so the WLC runs it and tells each AP what to use."},
  {t:"Acting as the 802.1X authenticator that relays EAP to the RADIUS server",ok:false,x:"In local mode the WLC is the authenticator and talks to RADIUS. The AP passes the EAP frames to it through the CAPWAP tunnel."},
  {t:"Managing client roaming between APs",ok:false,x:"The WLC tracks client associations across all of its APs, so it handles mobility and roaming."}
 ],
 w:"Split-MAC. AP (real-time): beacons, probe responses, ACKs/retransmits, frame queuing, encryption on the air. WLC (management): authentication, association/roaming, RRM, security and QoS policy."},
{id:"c033",obj:"1.12",d:1,cat:"wlbasics",t:"mc",
 q:"Refer to the exhibit. DC-CORE has no default route. An engineer on DC-CORE cannot reach TENANT-A's server 10.60.30.25 with ping 10.60.30.25, although the server answers other tenant hosts. What explains the result?",
 ex:"DC-CORE# show ip route 10.60.30.25\n% Subnet not in table\n\nDC-CORE# show ip vrf\n  Name                             Default RD            Interfaces\n  TENANT-A                         65060:10              Vl300\n\nDC-CORE# show ip route vrf TENANT-A\n\nRouting Table: TENANT-A\nCodes: L - local, C - connected, S - static, O - OSPF\n\nGateway of last resort is not set\n\n      10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks\nC        10.60.30.0/24 is directly connected, Vlan300\nL        10.60.30.1/32 is directly connected, Vlan300",
 o:[
  {t:"Vlan300 is in VRF TENANT-A, whose routes are kept in a separate table; the test needs ping vrf TENANT-A 10.60.30.25",ok:true,x:"A VRF is a separate routing table on the same device. The connected route exists only in TENANT-A's table, so a plain ping, which uses the global table, finds no route."},
  {t:"Interface Vlan300 is down, so its connected route is missing",ok:false,x:"The C and L routes for Vlan300 are in TENANT-A's table, and connected routes appear only when the interface is up."},
  {t:"VRFs need MPLS, and DC-CORE has none configured",ok:false,x:"VRF-lite runs on a single router or Layer 3 switch with no MPLS. MPLS is needed only to carry VRFs across a provider core."},
  {t:"The route distinguisher 65060:10 must match the server's address before the route is used",ok:false,x:"The RD makes VPN routes unique in MP-BGP. It has nothing to do with host addresses or with local route lookups."}
 ],
 w:"VRF = separate routing table (and interfaces) on one device; overlapping subnets allowed between VRFs. Test with ping vrf NAME, show ip route vrf NAME. Server virtualization uses a hypervisor; containers share a kernel."},
{id:"c034",obj:"2.7",d:2,cat:"wlan",t:"mc",
 q:"A FlexConnect AP at the DR site switches WLAN DR-STAFF locally to VLAN 31 and DR-GUEST to VLAN 32. The AP's own management address is in VLAN 30, which the AP sends untagged. How should the access switch port that connects the AP be configured?",
 o:[
  {t:"switchport mode trunk, switchport trunk native vlan 30, switchport trunk allowed vlan 30-32",ok:true,x:"With local switching the AP puts each WLAN's client traffic on the wire tagged with its VLAN, so the port must be a trunk. Its untagged management traffic lands in the native VLAN, which must be VLAN 30."},
  {t:"switchport mode access, switchport access vlan 30",ok:false,x:"An access port carries one untagged VLAN. That suits a local-mode AP, which tunnels client traffic to the WLC, but not locally switched WLANs in VLANs 31 and 32."},
  {t:"switchport mode access, switchport access vlan 31, switchport voice vlan 32",ok:false,x:"The voice VLAN feature is for IP phones. It would also put the AP's management in VLAN 31 instead of 30."},
  {t:"switchport mode trunk, switchport trunk native vlan 1, switchport trunk allowed vlan 31,32",ok:false,x:"The AP's untagged management traffic would land in VLAN 1, and VLAN 30 is not allowed, so the AP could not reach its controller."}
 ],
 w:"AP switch ports: local mode = access port (CAPWAP to WLC). FlexConnect local switching / autonomous AP with several VLANs = trunk with native VLAN = AP management. WLC ports = trunks, often bundled in a LAG (mode on)."},
{id:"c035",obj:"6.5",d:6,cat:"api",t:"mc",
 q:"Refer to the exhibit. A script adds a VLAN through the fabric controller's REST API, and the exchange was captured in verbose mode. Which statement about the exchange is true?",
 ex:"> POST /api/v1/vlans HTTP/1.1\n> Host: fabric-ctl.dc.example.net\n> Content-Type: application/json\n> X-Auth-Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuZXRvcHMifQ.k3Jt\n>\n> {\"vlanId\": 150, \"name\": \"BACKUP\"}\n\n< HTTP/1.1 201 Created\n< Location: /api/v1/vlans/150\n< Content-Type: application/json\n<\n< {\"vlanId\": 150, \"name\": \"BACKUP\", \"state\": \"provisioning\"}",
 o:[
  {t:"The controller created a new VLAN resource and returned its URI in the Location header",ok:true,x:"POST maps to create in CRUD, and 201 Created confirms a new resource. The Location header gives its URI, which later GET, PUT, PATCH or DELETE calls would use."},
  {t:"The request was received, but authentication failed",ok:false,x:"An authentication failure returns 401 Unauthorized. 201 is a success code."},
  {t:"The client authenticated with HTTP Basic authentication",ok:false,x:"Basic authentication sends Authorization: Basic with a Base64 username:password. This request carries a token in X-Auth-Token, which is token-based authentication."},
  {t:"The request read the VLAN list, and the response body is the complete list",ok:false,x:"Reading is a GET. This was a POST with a JSON body describing one new VLAN, and the response describes only that VLAN."}
 ],
 w:"HTTP codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server Error. Auth: Basic, API key, bearer/custom token header, OAuth."},
{id:"c036",obj:"1.4",d:1,cat:"parts",t:"ms",pick:2,
 q:"Refer to the exhibit. MGMT-SW connects rack devices over short patch cables. A vendor technician hard-coded PDU-RACK3's NIC to 100 Mb/s full duplex. PDU-RACK4 is set to autonegotiate. CONSOLE-SRV-2 and KVM-1 are hard-coded to 100 Mb/s full duplex, and their cables test good. Which two statements are true? (Choose two.)",
 ex:"MGMT-SW# show interfaces status\n\nPort      Name            Status       Vlan  Duplex  Speed Type\nFa0/3     PDU-RACK3       connected    20    a-half  a-100 10/100BaseTX\nFa0/4     PDU-RACK4       connected    20    a-full  a-100 10/100BaseTX\nFa0/5     CONSOLE-SRV-2   notconnect   20      full     10 10/100BaseTX\nFa0/6     KVM-1           connected    20      full    100 10/100BaseTX",
 o:[
  {t:"Fa0/3 has a duplex mismatch: it fell back to half duplex while PDU-RACK3 runs full duplex",ok:true,x:"An autonegotiating port that hears no negotiation can sense 100 Mb/s but must assume half duplex. The far end is full duplex, so Fa0/3 will log collisions and late collisions while the PDU logs CRC errors."},
  {t:"Fa0/5 is down because it is hard-coded to 10 Mb/s while the console server is fixed at 100 Mb/s",ok:true,x:"With both speeds fixed and different, the two ends cannot agree on a signaling rate, so the link never comes up. Setting Fa0/5 to 100 (or auto) fixes it."},
  {t:"The a- prefix on Fa0/4 shows that its speed and duplex were hard-coded",ok:false,x:"a- means the value was reached by autonegotiation. Both ends of Fa0/4 negotiated, so they agreed on 100/full."},
  {t:"Fa0/6 is mismatched because both ends are hard-coded instead of negotiated",ok:false,x:"Hard-coding both ends to the same values is a valid setup. Problems appear when only one end is hard-coded."},
  {t:"Fa0/5 will come up at 10 Mb/s as soon as its cable is replaced",ok:false,x:"The cable tests good, and the link is down because of the speed setting. A new cable changes nothing while Fa0/5 stays at 10 and the server at 100."}
 ],
 w:"show interfaces status: a-full/a-100 = negotiated; plain full/100 = hard-coded. Speed mismatch = link down (notconnect). Duplex mismatch = link up but errors (half side: late collisions; full side: CRC/runts)."},
{id:"c037",obj:"2.1.c",d:2,cat:"vlan",t:"build",ordered:true,
 q:"DC-CORE, a Layer 3 switch with ip routing enabled, must route for new VLAN 150 (10.60.50.0/24, gateway 10.60.50.1). VLAN 150 does not exist yet, and DC-CORE's trunks allow all VLANs. Starting in global configuration mode, create the VLAN first and then configure its gateway so it comes up. Drag the commands you need into the answer area in order. Leave the commands that do not apply.",
 pool:[
  "vlan 150",
  "interface vlan 150",
  "ip address 10.60.50.1 255.255.255.0",
  "no shutdown",
  "encapsulation dot1q 150",
  "switchport access vlan 150",
  "ip default-gateway 10.60.50.1"
 ],
 answer:[0,1,2,3],
 alt:[[0,1,3,2]],
 x:"The VLAN must exist and be active on a forwarding port (the trunks carry it) for the SVI to come up. interface vlan 150 creates the SVI, which takes the gateway address. New SVIs are administratively down, so no shutdown is needed; it can come before or after the address. encapsulation dot1q is for router subinterfaces, switchport access vlan is for physical ports, and ip default-gateway is for switches that do not route.",
 w:"SVI inter-VLAN routing: ip routing, vlan N, interface vlan N, ip address, no shutdown. The SVI is up/up only when the VLAN exists and at least one port in it (or a trunk carrying it) is forwarding."},
{id:"c038",obj:"1.7",d:1,cat:"tcpip",t:"mc",
 q:"The company is acquiring another firm and will connect the two data centers over a private WAN. Both data centers number their servers from 10.60.0.0/16. Which statement about this situation is true?",
 o:[
  {t:"RFC 1918 space is reused by any organization without registration, so one side must be renumbered or translated",ok:true,x:"Private ranges are not globally unique: anyone may use 10.0.0.0/8 internally. Overlap is common in mergers and is solved with renumbering, NAT between the sites, or VRFs that keep the tables apart."},
  {t:"The overlap cannot happen, because each organization is assigned a unique private block",ok:false,x:"No authority assigns RFC 1918 space. It is free for anyone to use internally, which is exactly why overlaps occur."},
  {t:"The acquired firm could simply move to 172.32.0.0/16, which is also private",ok:false,x:"172.16.0.0/12 runs from 172.16.0.0 to 172.31.255.255. 172.32.0.0/16 is public address space."},
  {t:"The provider's private WAN routes duplicate 10.60.0.0/16 prefixes to the correct site automatically",ok:false,x:"Routing needs unique destinations. Two sites announcing the same prefix make it impossible to tell which one a packet is for, unless the provider keeps them in separate VRFs, which would not join the two networks."}
 ],
 w:"RFC 1918: 10.0.0.0/8, 172.16.0.0/12 (172.16-172.31), 192.168.0.0/16. Not routed on the internet, reusable by anyone; reaching the internet needs NAT, and overlaps need renumbering or NAT."},
{id:"c039",obj:"2.3",d:2,cat:"l2link",t:"mc",
 q:"Refer to the exhibit. A security review captured this frame on hypervisor host HV-03, which connects to LEAF-4 Gi1/0/3. LEAF-4 must stop sending this information to the hosts on Gi1/0/1-20, but the team still needs CDP to see the spines on Te1/1/1-2. Which configuration meets both needs?",
 ex:"HV-03 capture on vmnic0, frame 412\nDestination: 01:00:0c:cc:cc:cc   Protocol: CDP\n  Device ID: LEAF-4\n  Software Version: Cisco IOS XE Software, Version 17.09.04a\n  Platform: cisco C9300-48T\n  Port ID: GigabitEthernet1/0/3\n  Native VLAN: 110\n  Management Address: 10.60.250.44",
 o:[
  {t:"interface range gigabitEthernet1/0/1 - 20, then no cdp enable",ok:true,x:"no cdp enable stops CDP on just the selected interfaces. CDP keeps running globally and on the uplinks, so the spines stay visible."},
  {t:"no cdp run in global configuration mode",ok:false,x:"no cdp run disables CDP on every interface, including the uplinks, so the spines would disappear from show cdp neighbors."},
  {t:"interface range gigabitEthernet1/0/1 - 20, then no lldp transmit",ok:false,x:"The captured frame is CDP, not LLDP. Stopping LLDP advertisements does not affect CDP."},
  {t:"cdp timer 240 in global configuration mode",ok:false,x:"A longer timer (the maximum is 254 seconds) only sends the same information less often, on every port. The hosts would still receive it."}
 ],
 w:"CDP/LLDP reveal device name, software version, platform, port, native VLAN and management IP. Disable them on ports facing untrusted devices: no cdp enable / no lldp transmit per interface; no cdp run / no lldp run globally."},
{id:"c040",obj:"6.1",d:6,cat:"sdn",t:"mc",
 q:"The team keeps its Ansible playbooks and per-device variables in a Git repository, and every change is pushed from there. Last night's NTP change, pushed to all 48 leaf switches, pointed them at the wrong servers. What does this workflow let the team do?",
 o:[
  {t:"Find the exact change in the commit history, restore the previous version and push it to all 48 leaves in one run",ok:true,x:"Version control records who changed what and when. Because configuration is code, rolling back means re-running the last known-good version against every device, instead of fixing 48 switches by hand."},
  {t:"Undo the commit in Git, which automatically reverts the configuration on every switch",ok:false,x:"Git stores files; it never connects to devices. The restored version still has to be pushed by the automation tool."},
  {t:"Nothing more than manual CLI, because automation tools can add configuration lines but not remove or change them",ok:false,x:"Ansible modules can add, replace and remove configuration. Removing the wrong ntp server lines and adding the right ones is a normal task."},
  {t:"Recover the old values from the switches, because automation tools keep change history only on the devices",ok:false,x:"The history lives in the repository, not on the devices. Switches keep only their current running and startup configurations."}
 ],
 w:"Automation impact: configuration as code, version control (history, review, rollback), consistent pushes at scale, drift detection, less manual error, faster changes. A bad change also spreads faster, so test first."},
{id:"c041",obj:"1.2.f",d:1,cat:"parts",t:"mc",
 q:"The analytics team needs about 200 extra CPU cores for three days at the end of each month. The data center team is comparing buying servers for the on-premises data center with renting public cloud IaaS. Which statement about the comparison is true?",
 o:[
  {t:"With IaaS, capacity is provisioned when needed and released afterward, billed for use, on hardware the provider owns",ok:true,x:"On-demand self-service, rapid elasticity and measured service are cloud characteristics. A monthly burst is the textbook case: the team pays for three days instead of owning idle servers."},
  {t:"With IaaS, the provider patches the guest operating systems and applications on the team's VMs",ok:false,x:"In IaaS the provider runs the physical hosts, storage, network and hypervisor. The customer still manages the guest OS and everything above it."},
  {t:"Cloud workloads can reach the data center's private addresses without a VPN or private connection",ok:false,x:"Cloud and on-premises networks are separate. Reaching private addresses needs a site-to-site VPN or a dedicated private connection."},
  {t:"On-premises servers are an operating expense, while cloud capacity is a capital expense",ok:false,x:"It is the reverse. Bought servers are capital expense (CapEx); cloud capacity is paid as an ongoing operating expense (OpEx)."}
 ],
 w:"Cloud traits: on-demand self-service, broad network access, resource pooling, rapid elasticity, measured service. IaaS: provider runs hardware/hypervisor, you run the OS up. SaaS: provider runs everything."},
{id:"c042",obj:"2.5.d",d:2,cat:"stp",t:"mc",
 q:"Refer to the exhibit. DC-CORE is the root bridge for every VLAN. Gi1/0/30 connects to a vendor's test-rack switch and is configured with spanning-tree guard root. The vendor set the test-rack switch's priority to 4096 for VLAN 110. What is the effect, and what happens when the vendor restores the default priority?",
 ex:"DC-CORE#\n*Oct  3 09:12:44.507: %SPANTREE-2-ROOTGUARD_BLOCK: Root guard blocking\n  port GigabitEthernet1/0/30 on VLAN0110.\n\nDC-CORE# show spanning-tree inconsistentports\n\nName                 Interface                Inconsistency\n-------------------- ------------------------ ------------------\nVLAN0110             GigabitEthernet1/0/30    Root Inconsistent\n\nNumber of inconsistent ports (segments) in the system : 1",
 o:[
  {t:"Gi1/0/30 blocks VLAN 110 as root-inconsistent and DC-CORE stays root; the port recovers by itself once the superior BPDUs stop",ok:true,x:"Root guard refuses superior BPDUs on a designated port and blocks only the affected VLAN. When the BPDUs stop, the port goes back through the normal states with no operator action."},
  {t:"Gi1/0/30 is err-disabled and must be bounced with shutdown and no shutdown",ok:false,x:"Root guard does not err-disable a port. Err-disable is BPDU guard's action on PortFast ports."},
  {t:"The test-rack switch becomes root for VLAN 110, and Gi1/0/30 becomes DC-CORE's root port",ok:false,x:"Preventing exactly that is the purpose of root guard. DC-CORE ignores the superior BPDU and keeps its root role."},
  {t:"Every VLAN on Gi1/0/30 stays blocked until DC-CORE is reloaded",ok:false,x:"Only VLAN 110 received superior BPDUs, so only VLAN 110 is blocked, and recovery is automatic."}
 ],
 w:"Root guard: configure on designated ports facing switches that must never become root; superior BPDU = root-inconsistent (blocking) per VLAN, auto-recovery. Check with show spanning-tree inconsistentports."},
{id:"c043",obj:"1.11.d",d:1,cat:"wlbasics",t:"mc",
 q:"Engineers' laptops join the DC-OPS WLAN, which uses WPA2-Enterprise with AES, through lightweight APs in local mode. Some engineers still manage older switches with Telnet from those laptops. Which statement about the protection of their Telnet sessions is true?",
 o:[
  {t:"The frames are encrypted over the air between laptop and AP, but the Telnet session is cleartext once it leaves the wireless link",ok:true,x:"WPA2 encryption protects the radio hop. After the AP decrypts the frame, the payload travels the wired network (and the default CAPWAP data tunnel) unencrypted, so Telnet's cleartext login is still exposed."},
  {t:"WPA2 encrypts the traffic all the way to the switch, so Telnet is safe on this WLAN",ok:false,x:"Wi-Fi encryption ends at the AP (or the WLC). End-to-end protection must come from the application, such as SSH instead of Telnet."},
  {t:"Only the 802.1X authentication is encrypted; data frames are sent over the air in cleartext",ok:false,x:"After authentication, WPA2 derives per-session keys and encrypts every data frame on the air with AES-CCMP."},
  {t:"WPA2 with AES relies on the RC4-based TKIP cipher, which is not secure",ok:false,x:"TKIP (RC4-based) was WPA's cipher. WPA2 uses AES-CCMP, and WPA3 uses AES with GCMP/CCMP and SAE for personal mode."}
 ],
 w:"Wi-Fi encryption (WPA2 AES-CCMP, WPA3 GCMP/SAE) protects only the air between client and AP. Protect management sessions end to end with SSH/HTTPS. WEP and TKIP are obsolete."},
{id:"c044",obj:"2.8",d:2,cat:"mgmt",t:"ms",pick:2,
 q:"A security review of the data center switches lists every way administrators reach them. Which two methods send login credentials across the network in cleartext? (Choose two.)",
 o:[
  {t:"Telnet to the vty lines",ok:true,x:"Telnet sends everything, including the username and password, unencrypted over TCP 23. Anyone capturing the traffic can read them."},
  {t:"HTTP to the device's web interface",ok:true,x:"Plain HTTP on TCP 80 has no encryption, so credentials in the login exchange can be captured."},
  {t:"SSH version 2 to the vty lines",ok:false,x:"SSH (TCP 22) encrypts the whole session, including authentication."},
  {t:"HTTPS to the device's web interface",ok:false,x:"HTTPS (TCP 443) wraps HTTP in TLS, so credentials are encrypted in transit."},
  {t:"TACACS+ between the switch and its AAA server",ok:false,x:"TACACS+ (TCP 49) encrypts the entire packet body with the shared key, including the password. RADIUS encrypts only the password field."}
 ],
 w:"Management access: console (local, out-of-band), Telnet 23 (cleartext), SSH 22, HTTP 80 (cleartext), HTTPS 443, cloud-managed dashboards. AAA: TACACS+ TCP 49 (full body encrypted), RADIUS UDP 1812/1813 (password only)."},
{id:"c045",obj:"6.6",d:6,cat:"cfgmgmt",t:"mc",
 q:"Refer to the exhibit. The team manages fabric VLANs as code with Terraform. An engineer runs the command shown. What is the state of the fabric now, and what comes next?",
 ex:"$ terraform plan\n\nResource actions are indicated with the following symbols:\n  + create\n  ~ update in-place\n\nTerraform will perform the following actions:\n\n  # dcfabric_vlan.backup will be created\n  + resource \"dcfabric_vlan\" \"backup\" {\n      + id      = (known after apply)\n      + name    = \"BACKUP\"\n      + vlan_id = 150\n    }\n\n  # dcfabric_vlan.storage will be updated in-place\n  ~ resource \"dcfabric_vlan\" \"storage\" {\n        id      = \"140\"\n      ~ name    = \"STOR\" -> \"STORAGE\"\n        vlan_id = 140\n    }\n\nPlan: 1 to add, 1 to change, 0 to destroy.",
 o:[
  {t:"Nothing has changed yet; terraform apply will create VLAN 150 and rename VLAN 140",ok:true,x:"plan compares the configuration files with the state and the real infrastructure, then shows the proposed actions without making them. apply carries them out and updates the state file."},
  {t:"VLAN 150 already exists, because plan creates resources as it evaluates them",ok:false,x:"plan is a dry run. The id is (known after apply) because the resource has not been created."},
  {t:"VLAN 140 will be deleted and re-created, interrupting its traffic",ok:false,x:"The ~ symbol means update in place. A destroy-and-recreate is shown as -/+, and the summary would count it under destroy."},
  {t:"The leaf switches will pull the plan from the state file at their next agent check-in",ok:false,x:"Terraform has no agents on devices. It calls provider APIs when apply runs; the state file is Terraform's own record of what it manages."}
 ],
 w:"Terraform: declarative IaC in HCL; providers talk to APIs; init, plan (preview diff), apply (make changes), destroy; state file tracks managed resources. Plan symbols: + create, ~ update, - destroy, -/+ replace."},
{id:"c046",obj:"1.1.b",d:1,cat:"parts",t:"mc",
 q:"DC-CORE is a Layer 3 switch with SVIs for VLAN 110 (web) and VLAN 120 (database). A web server in VLAN 110 sends a packet to a database server in VLAN 120, both connected to DC-CORE. How does DC-CORE handle it?",
 o:[
  {t:"It routes the packet between the SVIs in hardware, rewriting the source and destination MAC addresses and decrementing the TTL",ok:true,x:"A Layer 3 switch combines switching with routing in its forwarding hardware. Between VLANs it routes like any router: new Layer 2 header, TTL decremented, IP addresses unchanged."},
  {t:"It switches the frame unchanged, because both servers are on the same physical switch",ok:false,x:"Different VLANs are different broadcast domains and subnets. Traffic between them must be routed, even inside one switch."},
  {t:"It sends the frame up a trunk to an external router, because switches cannot route",ok:false,x:"That is router-on-a-stick with a Layer 2 switch. A Layer 3 switch with ip routing and SVIs routes the packet itself."},
  {t:"It floods the frame to every port in VLANs 110 and 120 until the destination answers",ok:false,x:"Flooding happens only for unknown unicast, broadcast and multicast within one VLAN. Frames are never flooded across VLANs."}
 ],
 w:"Layer 2 switch: forwards by MAC within a VLAN. Layer 3 switch: also routes between VLANs (SVIs or routed ports) in hardware. Router: WAN/edge features, routes between interfaces and subinterfaces."},
{id:"c047",obj:"2.4",d:2,cat:"l2link",t:"ms",pick:2,
 q:"MGMT-SW is getting a second LACP bundle, Po6, to a new out-of-band switch over Fa0/22 and Fa0/23. Only one of the two ports bundles. Which two differences between the member ports would prevent them from bundling together? (Choose two.)",
 o:[
  {t:"One port was hard-set to speed 10 while the other runs at 100 Mb/s",ok:true,x:"All members must use the same speed and duplex. A port at a different speed is not compatible with the bundle and is suspended or left out."},
  {t:"One port is a static access port in VLAN 10 and the other is a trunk",ok:true,x:"Members must share the same switchport mode and VLAN settings (access VLAN, or native VLAN and allowed list for trunks)."},
  {t:"The ports have different interface descriptions",ok:false,x:"Descriptions are labels only. They are not part of EtherChannel compatibility checks."},
  {t:"The port numbers are not next to each other",ok:false,x:"Members do not have to be adjacent ports. Spreading them over different modules or stack members is even recommended."},
  {t:"One port has a load-interval of 30 seconds and the other the default",ok:false,x:"load-interval changes only how interface rates are averaged for display. It does not affect bundling."}
 ],
 w:"EtherChannel members must match: speed, duplex, switchport mode, access VLAN or trunk native/allowed VLANs, and channel-group protocol. Up to 8 active LACP members; LACP active/passive, PAgP desirable/auto."},
{id:"c048",obj:"1.8",d:1,cat:"ipv6",t:"mc",
 q:"Data hall 2 was delegated the /56 that contains the server segment 2001:db8:60:4a7c::/64. Which prefix was delegated, and how many /64 server subnets does it hold?",
 o:[
  {t:"2001:db8:60:4a00::/56, which holds 256 /64 subnets",ok:true,x:"/56 keeps 48 bits (three hextets) plus the first 8 bits of the fourth hextet: 4a7c becomes 4a00. Bits 57-64 are free for subnetting: 2^8 = 256 subnets of /64."},
  {t:"2001:db8:60:4a00::/56, which holds 64 /64 subnets",ok:false,x:"The prefix is right, but the count is not. 64 - 56 = 8 subnet bits, which gives 2^8 = 256 subnets."},
  {t:"2001:db8:60:4a70::/56, which holds 256 /64 subnets",ok:false,x:"Keeping 4a7 masks 12 bits of the fourth hextet, which would be a /60. A /56 keeps only the first two hex digits (8 bits)."},
  {t:"2001:db8:60::/56, which holds 256 /64 subnets",ok:false,x:"2001:db8:60::/56 covers 2001:db8:60:0000 to 2001:db8:60:00ff only. 4a7c is outside that range."}
 ],
 w:"IPv6 prefixes on nibble boundaries: every 4 bits = 1 hex digit. /48 = 3 hextets, /52 +1 digit, /56 +2 digits, /60 +3 digits, /64 = 4 hextets. Subnets = 2^(new length - old length)."},
{id:"c049",obj:"2.9",d:2,cat:"wlan",t:"mc",
 q:"Refer to the exhibit. An engineer's laptop uses a static address in the operations subnet to reach out-of-band gear. It associates and authenticates to DC-OPS but cannot pass any traffic, while laptops that use DHCP on DC-OPS work normally. Which setting causes the problem?",
 ex:"WLANs > Edit 'DC-OPS' > Advanced\n\n  Allow AAA Override        [ ] Enabled\n  Enable Session Timeout    [x]  1800  Session Timeout (secs)\n  Client Exclusion          [x] Enabled   60  Timeout Value (secs)\n  Maximum Allowed Clients   0\n\n  DHCP\n    DHCP Server             [ ] Override\n    DHCP Addr. Assignment   [x] Required\n\n  P2P Blocking Action       Disabled",
 o:[
  {t:"DHCP Addr. Assignment Required, which blocks clients that did not get their address through DHCP",ok:true,x:"With this option on, the WLC passes traffic only for clients whose address came from DHCP. A static client authenticates but never reaches the run state. Use a DHCP reservation, or clear the option."},
  {t:"Client Exclusion, which blocks the laptop for 60 seconds",ok:false,x:"Exclusion blocks a client after repeated failures, such as failed authentications. This laptop authenticated successfully."},
  {t:"Session Timeout, which disconnects clients with static addresses after 1800 seconds",ok:false,x:"Session timeout forces reauthentication for every client after the interval, whatever the address type. The laptop fails from the start."},
  {t:"Maximum Allowed Clients 0, which allows no more clients to join",ok:false,x:"0 means no limit. The DHCP clients on the same WLAN work, so the WLAN is not refusing new clients."}
 ],
 w:"WLAN Advanced tab: session timeout, client exclusion, max clients (0 = unlimited), DHCP server override, DHCP Addr. Assignment Required (no static clients), AAA override, P2P blocking, FlexConnect local switching."},
{id:"c050",obj:"6.3.a",d:6,cat:"sdn",t:"mc",
 q:"In the controller-based fabric, the controller computes policy and programs the leaves, while each leaf still runs OSPF with the spines and accepts SSH from the jump host. Which task performed by LEAF-3 belongs to the data plane?",
 o:[
  {t:"Looking up a frame's destination in the forwarding tables and sending it out the egress port",ok:true,x:"The data plane (forwarding plane) moves user traffic through the device, using the tables that the control plane and the controller have built."},
  {t:"Exchanging OSPF hellos with the spines and running SPF",ok:false,x:"Building routing information with a routing protocol is control-plane work. It produces the tables the data plane uses."},
  {t:"Accepting the engineer's SSH session and SNMP polls",ok:false,x:"Traffic that is used to manage the device itself belongs to the management plane."},
  {t:"Receiving policy from the controller through a southbound API",ok:false,x:"Programming instructions from the controller are control and management traffic. They change how the device forwards; they are not the forwarding itself."}
 ],
 w:"Data plane: forwards user traffic (switching, routing lookups, encapsulation, ACL enforcement in hardware). Control plane: builds the tables (OSPF, STP, ARP). Management plane: SSH, SNMP, syslog, API access."},
];
