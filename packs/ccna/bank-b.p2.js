/* CCNA Exam B — part 2 (b051–b100): branch office + WAN edge. d3 IP Connectivity 25 · d4 IP Services 10 · d5 Security Fundamentals 15.
   Routing, OSPF, NAT, IPv6, ACL and port-security exhibits generated with core/sims/ios and trimmed; VRRP, syslog, WLC and client output hand-written. */
export const CCNA_BANK_B_P2 = [
{id:"b051",obj:"3.2.a",d:3,cat:"rtable",t:"ms",pick:2,
 q:"Refer to the exhibit. BR1 receives packets from branch hosts for several destinations. Which two statements describe how BR1 forwards them? (Choose two.)",
 ex:"BR1# show ip route\nCodes: L - local, C - connected, S - static, O - OSPF\n       * - candidate default\n\nGateway of last resort is 203.0.113.1 to network 0.0.0.0\n\nS*    0.0.0.0/0 [1/0] via 203.0.113.1\n      10.0.0.0/8 is variably subnetted, 10 subnets, 4 masks\nS        10.10.0.0/16 [1/0] via 10.255.1.1\nO        10.10.1.0/24 [110/2] via 10.255.1.1, 00:12:34, GigabitEthernet0/1\nO        10.10.50.0/24 [110/2] via 10.255.1.1, 00:12:34, GigabitEthernet0/1\nS        10.10.50.10/32 [1/0] via 10.255.2.1\nC        10.20.10.0/24 is directly connected, GigabitEthernet0/0\nL        10.20.10.1/32 is directly connected, GigabitEthernet0/0\nC        10.255.1.0/30 is directly connected, GigabitEthernet0/1\nL        10.255.1.2/32 is directly connected, GigabitEthernet0/1\nC        10.255.2.0/30 is directly connected, Serial0/1/0\nL        10.255.2.2/32 is directly connected, Serial0/1/0\n      203.0.113.0/24 is variably subnetted, 2 subnets, 2 masks\nC        203.0.113.0/29 is directly connected, GigabitEthernet0/2\nL        203.0.113.6/32 is directly connected, GigabitEthernet0/2",
 o:[
  {t:"A packet to 10.10.50.10 is sent to 10.255.2.1",ok:true,x:"Three routes match 10.10.50.10 (/16, /24 and /32). The /32 host route is the longest match, so it wins regardless of administrative distance."},
  {t:"A packet to 10.10.50.25 is sent to 10.255.1.1 out GigabitEthernet0/1 using the OSPF route",ok:true,x:"10.10.50.25 matches the /16 static and the /24 OSPF route but not the /32. The /24 is longer, so the OSPF entry is used even though its AD (110) is higher than the static's (1)."},
  {t:"A packet to 10.10.1.20 uses the 10.10.0.0/16 static route because AD 1 beats OSPF's 110",ok:false,x:"AD only breaks ties between routes to the same prefix. 10.10.1.0/24 is more specific than 10.10.0.0/16, so the OSPF /24 is chosen first."},
  {t:"A packet to 10.10.99.5 is sent to 203.0.113.1 because no specific route matches",ok:false,x:"10.10.99.5 falls inside 10.10.0.0/16, so the static route via 10.255.1.1 matches. The default route is only used when nothing longer matches."},
  {t:"A packet to 172.16.5.5 is dropped because the table has no 172.16.0.0 route",ok:false,x:"The S* 0.0.0.0/0 entry matches every destination, so 172.16.5.5 goes to the gateway of last resort, 203.0.113.1."},
  {t:"A packet to 10.10.50.10 is sent to 10.255.1.1 because OSPF routes are refreshed more recently",ok:false,x:"Route age plays no part in the forwarding decision. The /32 static route is the longest match for 10.10.50.10."}
 ],
 w:"Forwarding order: longest prefix first; AD only decides between sources offering the same prefix; metric only decides within one source."},
{id:"b052",obj:"5.5",d:5,cat:"vpn",t:"mc",
 q:"A new branch has 30 users who must reach HQ servers across the internet. The traffic must be encrypted, the tunnel must stay up permanently, and nothing may be installed or launched on the users' PCs. Which solution meets these requirements?",
 o:[
  {t:"A site-to-site IPsec VPN between the branch router and the HQ VPN gateway",ok:true,x:"Site-to-site IPsec is built between two gateways and protects every host behind them. The PCs send ordinary traffic to their default gateway and never know a tunnel exists."},
  {t:"A remote-access IPsec VPN with a client installed on each branch PC",ok:false,x:"Remote-access VPNs need client software and a per-user login on every PC, which the requirements rule out."},
  {t:"A GRE tunnel between the branch router and HQ without IPsec",ok:false,x:"GRE encapsulates traffic but does not encrypt it, so the confidentiality requirement fails."},
  {t:"A clientless TLS VPN portal that users open in a web browser",ok:false,x:"A clientless portal needs each user to sign in from a browser and only reaches published web applications; it is not a permanent network-to-network tunnel."}
 ],
 w:"Site-to-site = gateway to gateway, always on, hosts unaware. Remote access = one user's device to a headend, per-user authentication."},
{id:"b053",obj:"4.1",d:4,cat:"nat",t:"ms",pick:2,
 q:"Refer to the exhibit. BR1 performs NAT on its internet edge, GigabitEthernet0/2 (203.0.113.6/29). Which two statements are true? (Choose two.)",
 ex:"BR1# show ip nat translations\nPro  Inside global      Inside local       Outside local      Outside global\n---  203.0.113.5        10.20.10.50        ---                ---\nicmp 203.0.113.6:1      10.20.10.21:1      198.51.100.20:1    198.51.100.20:1\nicmp 203.0.113.6:2      10.20.10.21:2      198.51.100.20:2    198.51.100.20:2\nicmp 203.0.113.6:6      10.20.10.22:6      198.51.100.20:6    198.51.100.20:6\nicmp 203.0.113.6:7      10.20.10.22:7      198.51.100.20:7    198.51.100.20:7\n\nBR1# show ip nat statistics | include Total|access-list\nTotal active translations: 5 (1 static, 4 dynamic; 4 extended)\n[Id: 1] access-list 10 interface GigabitEthernet0/2 refcount 4",
 o:[
  {t:"The branch server 10.20.10.50 is always represented on the internet as 203.0.113.5",ok:true,x:"The entry with no protocol or ports and dashes for the outside columns is a static one-to-one mapping. It exists whether or not traffic is flowing, so the server is reachable at 203.0.113.5."},
  {t:"Hosts 10.20.10.21 and 10.20.10.22 share inside global address 203.0.113.6, told apart by port or ICMP ID",ok:true,x:"Both hosts are translated to the Gi0/2 address with different identifiers. That is PAT (overload) using the interface address, as the statistics line confirms."},
  {t:"198.51.100.20 is an inside global address",ok:false,x:"198.51.100.20 is the outside host. It appears in the outside local and outside global columns, which are equal because no outside NAT is configured."},
  {t:"10.20.10.21 is the inside global address of the first PC",ok:false,x:"10.20.10.21 is the PC's own private address, which is the inside local address. Its inside global is 203.0.113.6."},
  {t:"The dynamic translations draw from a pool of public addresses",ok:false,x:"The mapping references 'interface GigabitEthernet0/2', not a pool. Every dynamic flow uses the single interface address with overload."}
 ],
 w:"Inside local = real private address; inside global = what the internet sees. Same global with different ports = PAT. A row with dashes and no ports = static NAT."},
{id:"b054",obj:"3.4.d",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. The team expected BR1 to use 10.0.0.2 as its OSPF router ID. Why did BR1 choose 172.16.200.2?",
 ex:"BR1# show running-config | section router ospf\nrouter ospf 10\n network 10.0.0.2 0.0.0.0 area 0\n network 10.20.10.0 0.0.0.255 area 0\n network 10.255.1.0 0.0.0.3 area 0\n\nBR1# show ip interface brief | include up\nGigabitEthernet0/0     10.20.10.1      YES manual up                    up\nGigabitEthernet0/1     10.255.1.2      YES manual up                    up\nGigabitEthernet0/2     203.0.113.6     YES manual up                    up\nLoopback0              10.0.0.2        YES manual up                    up\nLoopback1              172.16.200.2    YES manual up                    up\n\nBR1# show ip protocols | include Router ID\n  Router ID 172.16.200.2",
 o:[
  {t:"No router-id is configured, so OSPF took the highest IP on an up loopback, even one not in a network statement",ok:true,x:"With no router-id command, OSPF uses the highest IPv4 address on an up loopback. Lo1 (172.16.200.2) is higher than Lo0 (10.0.0.2). A loopback does not have to be advertised in OSPF to supply the router ID."},
  {t:"OSPF uses the highest address among interfaces matched by its network statements",ok:false,x:"The network statements only decide which interfaces run OSPF. Router ID selection looks at all up loopbacks first, and Lo1 is not even in a network statement."},
  {t:"OSPF uses the highest address on any up interface, physical or loopback",ok:false,x:"If that were true, the router ID would be 203.0.113.6 from Gi0/2. Loopbacks are preferred over physical interfaces when no router ID is configured."},
  {t:"Someone configured router-id 172.16.200.2 under the OSPF process",ok:false,x:"The OSPF section of the running-config has no router-id line, so the value was chosen automatically."}
 ],
 w:"Router ID order: router-id command, then the highest up loopback, then the highest up physical interface. A change only takes effect after clear ip ospf process or a reload."},
{id:"b055",obj:"3.3.d",d:3,cat:"static",t:"mc",
 q:"Refer to the exhibit. The output was captured after the branch fiber circuit on GigabitEthernet0/1 failed. Which statement explains the 10.10.0.0/16 entry?",
 ex:"BR1# show running-config | include ip route\nip route 0.0.0.0 0.0.0.0 203.0.113.1\nip route 10.10.0.0 255.255.0.0 10.255.1.1\nip route 10.10.0.0 255.255.0.0 10.255.2.1 5\n\nBR1# show ip route | begin Gateway\nGateway of last resort is 203.0.113.1 to network 0.0.0.0\n\nS*    0.0.0.0/0 [1/0] via 203.0.113.1\n      10.0.0.0/8 is variably subnetted, 5 subnets, 4 masks\nS        10.10.0.0/16 [5/0] via 10.255.2.1\nC        10.20.10.0/24 is directly connected, GigabitEthernet0/0\nL        10.20.10.1/32 is directly connected, GigabitEthernet0/0\nC        10.255.2.0/30 is directly connected, Serial0/1/0\nL        10.255.2.2/32 is directly connected, Serial0/1/0\n      203.0.113.0/24 is variably subnetted, 2 subnets, 2 masks\nC        203.0.113.0/29 is directly connected, GigabitEthernet0/2\nL        203.0.113.6/32 is directly connected, GigabitEthernet0/2",
 o:[
  {t:"Next hop 10.255.1.1 is unreachable, so the floating static route with AD 5 was installed",ok:true,x:"With Gi0/1 down, 10.255.1.0/30 left the table and the primary route's next hop no longer resolves. The AD 5 route via the serial link, which was waiting in the background, is now the best route to 10.10.0.0/16."},
  {t:"Both static routes are installed and BR1 load-balances across the fiber and serial links",ok:false,x:"Routes with different ADs never share the load. Only the [5/0] route is listed, and its next hop is the serial link."},
  {t:"The serial route was chosen because its metric is lower than the fiber route's",ok:false,x:"Static routes have a metric of 0. The [5/0] shows AD 5, which only matters because the AD 1 route can no longer be used."},
  {t:"BR1 will keep using the serial route after Gi0/1 recovers until the routes are cleared",ok:false,x:"Floating statics are not sticky. As soon as 10.255.1.1 is reachable again, the AD 1 route returns and replaces the backup automatically."}
 ],
 w:"A floating static is a normal static with a higher AD. It stays out of the table until the preferred route is withdrawn, and steps back as soon as that route returns."},
{id:"b056",obj:"5.7",d:5,cat:"l2sec",t:"mc",
 q:"Refer to the exhibit. The desktop on BSW1 Fa0/5 has already been learned. The user connects a small unmanaged switch to Fa0/5 and plugs a personal laptop into it. What happens when the laptop sends frames?",
 ex:"BSW1# show port-security interface fa0/5\nPort Security              : Enabled\nPort Status                : Secure-up\nViolation Mode             : Restrict\nAging Time                 : 0 mins\nAging Type                 : Absolute\nSecureStatic Address Aging : Disabled\nMaximum MAC Addresses      : 1\nTotal MAC Addresses        : 1\nConfigured MAC Addresses   : 0\nSticky MAC Addresses       : 1\nLast Source Address:Vlan   : 00e0.4c00.0201:10\nSecurity Violation Count   : 0",
 o:[
  {t:"Laptop frames are dropped, the violation count rises and a log message is sent; the desktop keeps working",ok:true,x:"Restrict mode drops frames from the extra MAC, increments the Security Violation Count, and generates a syslog message and SNMP trap. The port stays Secure-up, so the sticky desktop MAC is unaffected."},
  {t:"Fa0/5 is placed in the err-disabled state and both devices lose connectivity",ok:false,x:"Err-disable is what the default shutdown mode does. This port is in Restrict mode, which never shuts the port down."},
  {t:"Laptop frames are dropped silently and the violation count stays at 0",ok:false,x:"That describes Protect mode. Restrict also drops the frames, but it counts and logs each violation."},
  {t:"The laptop's MAC is learned as a second sticky address",ok:false,x:"The maximum is 1 and one sticky MAC is already learned. A new address beyond the maximum is a violation, not an addition."}
 ],
 w:"Shutdown = err-disable plus a log message. Restrict = drop, count and log. Protect = drop silently. The default maximum is 1 MAC."},
{id:"b057",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"Refer to the exhibit. The branch LAN has two routers. BR1 Gi0/0 is 10.20.10.2 and BR2 Gi0/0 is 10.20.10.3. Which statement is correct?",
 ex:"BR1# show vrrp brief\nInterface          Grp Pri Time  Own Pre State   Master addr     Group addr\nGi0/0              10  110 3570       Y  Master  10.20.10.2      10.20.10.1\n\nBR2# show vrrp brief\nInterface          Grp Pri Time  Own Pre State   Master addr     Group addr\nGi0/0              10  100 3609       Y  Backup  10.20.10.2      10.20.10.1",
 o:[
  {t:"Hosts use 10.20.10.1 as their gateway, and BR1 answers ARP for it with MAC 0000.5e00.010a",ok:true,x:"10.20.10.1 is the group's virtual address. The master replies with the VRRP virtual MAC 0000.5e00.01xx, where xx is the group number in hex (10 = 0a)."},
  {t:"BR1 is master because it owns the virtual IP address",ok:false,x:"The Own column is blank. BR1's real address is 10.20.10.2, so it is master because its priority (110) is higher than BR2's (100), not because it owns 10.20.10.1."},
  {t:"If BR1 fails and later recovers, BR2 stays master because preemption is disabled",ok:false,x:"The Pre column shows Y on both routers. Preemption is on by default in VRRP, so BR1 takes back the master role when it returns."},
  {t:"Hosts should use 10.20.10.2 as their gateway so their traffic prefers BR1",ok:false,x:"Pointing hosts at BR1's real address removes the redundancy. If BR1 fails, nobody answers for 10.20.10.2."}
 ],
 w:"VRRP: open standard, master/backup, virtual MAC 0000.5e00.01xx, preempt on by default, advertisements to 224.0.0.18."},
{id:"b058",obj:"4.6",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. Branch PCs on 10.20.10.0/24 receive 169.254.x.x addresses. The HQ DHCP server 10.10.1.20 has a scope for 10.20.10.0/24 and BR1 can ping it. What should the engineer do?",
 ex:"BR1# show running-config interface g0/0\ninterface GigabitEthernet0/0\n description BRANCH-LAN\n ip address 10.20.10.1 255.255.255.0\n ip nat inside\nend\n\nBR1# show running-config interface g0/1\ninterface GigabitEthernet0/1\n description WAN-TO-HQ1\n ip address 10.255.1.2 255.255.255.252\n ip helper-address 10.10.1.20\n ip ospf network point-to-point\nend",
 o:[
  {t:"Remove the helper address from Gi0/1 and configure ip helper-address 10.10.1.20 on Gi0/0",ok:true,x:"The relay must sit on the interface that receives the clients' DHCPDISCOVER broadcasts, which is the LAN interface. BR1 then unicasts the request to 10.10.1.20 with giaddr 10.20.10.1, so the server picks the right scope."},
  {t:"Configure ip helper-address 10.20.10.1 on HQ1's WAN interface",ok:false,x:"The client broadcasts never leave the branch LAN, so nothing on HQ1 can see them. The relay belongs on the branch router's LAN interface."},
  {t:"Change the helper on Gi0/1 to 255.255.255.255 so broadcasts are flooded toward HQ",ok:false,x:"Gi0/1 never receives the client broadcasts, so a helper there does nothing whatever its address. Flooding broadcasts across the WAN is also not how relay works."},
  {t:"Configure ip address dhcp on Gi0/0 so BR1 learns the scope from HQ",ok:false,x:"That makes BR1 a DHCP client on its LAN interface. It would not forward anything for the PCs, and the gateway address would no longer be fixed."}
 ],
 w:"ip helper-address goes on the interface facing the clients. The relay fills in giaddr, and the server uses it to choose the scope."},
{id:"b059",obj:"3.4.a",d:3,cat:"ospf",t:"order",
 q:"BR1 and HQ1 have just been connected over a new point-to-point WAN link with matching OSPF settings. Drag and drop the OSPF neighbor states into the order BR1 moves through them for HQ1, from first to last.",
 pool:["Down","Init","2-Way","ExStart","Exchange","Loading","Full"],answer:[0,1,2,3,4,5,6],
 x:"BR1 starts in Down. It moves to Init when it receives HQ1's hello and to 2-Way when that hello lists BR1's own router ID. On a point-to-point link there is no DR election, so both routers go straight on: ExStart negotiates master/slave and the DBD sequence number, Exchange swaps DBD summaries, Loading requests the missing LSAs with LSRs, and Full means the LSDBs are synchronized.",
 w:"Down, Init, 2-Way, ExStart, Exchange, Loading, Full. On broadcast links, DROTHERs stay in 2-Way with each other; P2P neighbors always go to Full."},
{id:"b060",obj:"5.3",d:5,cat:"secbase",t:"mc",
 q:"Refer to the exhibit. An audit of the branch routers flags the protection of privileged EXEC mode on BR1 as weak. Which change addresses the finding?",
 ex:"BR1# show running-config | begin service password\nservice password-encryption\n!\nhostname BR1\n!\nenable password 7 08035E1A071A0D321C4A\n!\nline con 0\n password 7 08021C401A160912515A\n login\nline vty 0 4\n password 7 08175857442904040152\n login\n transport input telnet ssh",
 o:[
  {t:"Configure enable secret with a strong password and remove the enable password line",ok:true,x:"enable secret is stored as a one-way hash (type 5, 8 or 9) and takes priority over enable password. Type 7 is a reversible encoding that free tools decode instantly."},
  {t:"Enter service password-encryption again so the enable password is re-encrypted",ok:false,x:"The command is already on, and it only produces type 7, which is the weakness the audit found. Entering it again changes nothing."},
  {t:"Configure login local on the console line",ok:false,x:"That changes how users log in at the console. It does nothing for the enable password that protects privileged EXEC mode."},
  {t:"Change the vty lines to transport input ssh",ok:false,x:"Removing Telnet is good practice and protects the login in transit, but the enable password would still be a reversible type 7 string in the config."}
 ],
 w:"Use enable secret, never enable password. service password-encryption only hides line and username passwords with reversible type 7."},
{id:"b061",obj:"3.3.b",d:3,cat:"static",t:"mc",
 q:"BR1 adds a new subnet, 10.20.30.0/24, for branch cameras. HQ1 reaches branch subnets with static routes across the fiber link, where HQ1 Gi0/1 is 10.255.1.1/30 and BR1 Gi0/1 is 10.255.1.2/30. Which command on HQ1 provides reachability to the new subnet?",
 o:[
  {t:"ip route 10.20.30.0 255.255.255.0 10.255.1.2",ok:true,x:"A network route needs the destination, its subnet mask and a next hop on a connected subnet. BR1's side of the /30 is 10.255.1.2."},
  {t:"ip route 10.20.30.0 0.0.0.255 10.255.1.2",ok:false,x:"Static routes take a subnet mask, not a wildcard mask. 0.0.0.255 is not a valid mask, so IOS rejects the command."},
  {t:"ip route 10.20.30.0 255.255.255.0 10.255.1.1",ok:false,x:"10.255.1.1 is HQ1's own Gi0/1 address. A next hop must be the neighboring router, not the local interface."},
  {t:"ip route 10.20.0.0 255.255.255.0 10.255.1.2",ok:false,x:"10.20.0.0/24 covers 10.20.0.0 to 10.20.0.255 and does not include 10.20.30.0/24."}
 ],
 w:"ip route <network> <subnet mask> <next hop | exit interface> [AD]. Wildcards belong in ACLs and OSPF network statements, not in static routes."},
{id:"b062",obj:"3.4.b",d:3,cat:"ospf",t:"ms",pick:2,
 q:"Refer to the exhibit. BR1 connects to HQ1 over a fiber link (Gi0/1) and a serial link (Se0/1/0). Which two statements are true? (Choose two.)",
 ex:"BR1# show ip ospf neighbor\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.0.0.1          0   FULL/  -        00:00:37    10.255.1.1      GigabitEthernet0/1\n10.0.0.1          0   FULL/  -        00:00:37    10.255.2.1      Serial0/1/0\n\nBR1# show ip ospf interface g0/1\nGigabitEthernet0/1 is up, line protocol is up\n  Internet Address 10.255.1.2/30, Area 0, Attached via Network Statement\n  Process ID 10, Router ID 10.0.0.2, Network Type POINT_TO_POINT, Cost: 1\n  Transmit Delay is 1 sec, State POINT_TO_POINT\n  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5",
 o:[
  {t:"No DR or BDR is elected on either WAN link",ok:true,x:"The dash after FULL/ means the neighbor has no DR/BDR role, and Gi0/1 shows Network Type POINT_TO_POINT, State POINT_TO_POINT. Serial links with HDLC are point-to-point by default."},
  {t:"BR1 is fully adjacent to the same neighbor, router ID 10.0.0.1, over both links",ok:true,x:"An OSPF router has one router ID for the whole process. HQ1 appears twice because BR1 has one adjacency per link, and both are FULL."},
  {t:"HQ1 uses two different router IDs because it has two OSPF interfaces",ok:false,x:"The router ID is per process, not per interface. Both rows show 10.0.0.1; only the neighbor's interface address differs."},
  {t:"The dash in FULL/ - means the adjacency has not finished forming",ok:false,x:"FULL means the databases are synchronized. The dash only shows that the neighbor holds no DR or BDR role."},
  {t:"Gi0/1 uses 30-second hellos because it is a point-to-point interface",ok:false,x:"The output shows Hello 10, Dead 40. Point-to-point and broadcast networks both default to 10/40; 30/120 is for NBMA types."},
  {t:"Se0/1/0 runs the broadcast network type because it was not configured as point-to-point",ok:false,x:"Serial interfaces default to the point-to-point network type, and the FULL/ - state on Se0/1/0 confirms there was no DR election."}
 ],
 w:"FULL/ - = point-to-point adjacency, no DR or BDR. Ethernet defaults to broadcast (DR/BDR); serial defaults to point-to-point."},
{id:"b063",obj:"5.9",d:5,cat:"wsec",t:"build",ordered:false,
 q:"The branch guest and staff SSIDs are being moved from WPA2-Personal to WPA3-Personal. Drag the characteristics of WPA3-Personal into the answer area. Leave the items that do not apply.",
 pool:["Authenticates with SAE (Simultaneous Authentication of Equals)","Requires Protected Management Frames (PMF)","Gives forward secrecy, so captured traffic stays protected if the passphrase later leaks","Uses TKIP with RC4 for backward compatibility","Requires a RADIUS server to check each user's credentials","Lets an attacker who captures one handshake run an offline dictionary attack","Uses a static 40-bit or 104-bit key"],
 answer:[0,1,2],
 x:"WPA3-Personal replaces the PSK-derived key exchange with SAE, which blocks offline dictionary attacks and gives forward secrecy, and it makes PMF mandatory. TKIP/RC4 belongs to WPA, a per-user RADIUS check is Enterprise mode, offline cracking of a captured handshake is the WPA2-Personal weakness, and static 40/104-bit keys are WEP.",
 w:"WPA3-Personal = SAE + mandatory PMF + forward secrecy. WPA2-Personal = PSK + AES-CCMP, open to offline guessing of weak passphrases."},
{id:"b064",obj:"4.8",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. An engineer is preparing BR1 for SSH-only management, and a local admin user already exists. Which two commands, entered in this order, will let SSH start?",
 ex:"BR1# show ip ssh\nSSH Disabled - version 1.99\n%Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).\nAuthentication methods:publickey,keyboard-interactive,password\nAuthentication timeout: 120 secs; Authentication retries: 3\n\nBR1# show running-config | include hostname|domain\nhostname BR1",
 o:[
  {t:"ip domain-name branch.example, then crypto key generate rsa modulus 2048",ok:true,x:"The RSA key is named from the hostname and domain name. The hostname is already set but no domain name is configured, so the domain name must come first, then the key. SSH enables itself once a key exists."},
  {t:"crypto key generate rsa modulus 2048, then ip ssh version 2",ok:false,x:"Key generation fails without a domain name; IOS asks you to define one first. ip ssh version 2 cannot help while no key exists."},
  {t:"ip ssh version 2, then transport input ssh under line vty 0 4",ok:false,x:"Neither command creates the RSA key pair the output says is missing, so SSH stays disabled."},
  {t:"hostname BR1, then crypto key generate rsa modulus 2048",ok:false,x:"The hostname is already BR1. The missing piece is the domain name, so key generation would still fail."}
 ],
 w:"SSH on IOS: hostname (not the default 'Router'), ip domain-name, crypto key generate rsa (2048), a local user, then vty: login local and transport input ssh."},
{id:"b065",obj:"3.2.c",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. OSPF runs over both WAN links, and HQ1's LAN interface Gi0/0 has the default cost. If the Gi0/1 fiber circuit fails, which entry will BR1 install for 10.10.1.0/24?",
 ex:"BR1# show ip ospf interface | include line protocol|Cost:\nGigabitEthernet0/0 is up, line protocol is up\n  Process ID 10, Router ID 10.0.0.2, Network Type BROADCAST, Cost: 1\nGigabitEthernet0/1 is up, line protocol is up\n  Process ID 10, Router ID 10.0.0.2, Network Type POINT_TO_POINT, Cost: 1\nSerial0/1/0 is up, line protocol is up\n  Process ID 10, Router ID 10.0.0.2, Network Type POINT_TO_POINT, Cost: 64\n\nBR1# show ip route ospf | include 10.10.1.0\nO        10.10.1.0/24 [110/2] via 10.255.1.1, 00:12:34, GigabitEthernet0/1",
 o:[
  {t:"O 10.10.1.0/24 [110/65] via 10.255.2.1, Serial0/1/0",ok:true,x:"OSPF cost is the sum of the outgoing interface costs along the path: Se0/1/0 (64) plus HQ1 Gi0/0 (1) = 65. The serial path was always in the database; it only loses to the cost-2 fiber path while Gi0/1 is up."},
  {t:"O 10.10.1.0/24 [110/64] via 10.255.2.1, Serial0/1/0",ok:false,x:"This counts only the serial link. The cost of HQ1's outgoing LAN interface (1) must also be added, giving 65."},
  {t:"O 10.10.1.0/24 [110/2] via 10.255.2.1, Serial0/1/0",ok:false,x:"The metric changes with the path. Over the T1-speed serial link (default cost 64) the total cannot stay at 2."},
  {t:"No route; OSPF only installs a backup path after clear ip ospf process",ok:false,x:"OSPF reruns SPF automatically when the topology changes. The serial adjacency is already FULL, so the new best path is installed without any manual step."}
 ],
 w:"OSPF metric = sum of outgoing interface costs; default cost = 100 Mbps / interface bandwidth (minimum 1), so serial (1544 kbps) = 64 and Fa/Gi = 1."},
{id:"b066",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"Refer to the exhibit. What is the effect of this configuration on BR1?",
 ex:"BR1# show access-lists MGMT-HQ\nStandard IP access list MGMT-HQ\n    10 permit 10.10.99.0, wildcard bits 0.0.0.255 (14 matches)\n    20 deny   any log (6 matches)\n\nBR1# show running-config | section line vty\nline vty 0 4\n access-class MGMT-HQ in\n login local\n transport input ssh\nline vty 5 15\n access-class MGMT-HQ in\n login local\n transport input ssh",
 o:[
  {t:"Only hosts in 10.10.99.0/24 can open SSH sessions to BR1, and traffic passing through BR1 is not filtered",ok:true,x:"access-class applies the ACL to connections to the vty lines only. All 16 lines carry it and only allow SSH, so the HQ management subnet is the only source that can log in. Transit traffic is unaffected."},
  {t:"Hosts in 10.10.99.0/24 can reach BR1 using either SSH or Telnet",ok:false,x:"transport input ssh disables Telnet on these lines, whatever the ACL allows."},
  {t:"All traffic entering BR1 from outside 10.10.99.0/24 is dropped and logged",ok:false,x:"That would need ip access-group on an interface. access-class only checks sessions to the router's own vty lines."},
  {t:"The ACL has no effect because vty filtering needs an extended ACL",ok:false,x:"A standard ACL is the usual choice for access-class because only the source address matters. The match counters show it is working."}
 ],
 w:"ip access-group = filter traffic through an interface. access-class = filter who can open a vty session to the device. Apply it to every vty line."},
{id:"b067",obj:"3.3.b",d:3,cat:"static",t:"ms",pick:2,
 q:"Refer to the exhibit. Which two statements about BR1's IPv6 routing are true? (Choose two.)",
 ex:"BR1# show ipv6 route\nIPv6 Routing Table - default - 7 entries\nCodes: C - Connected, L - Local, S - Static\nS   ::/0 [10/0]\n     via 2001:DB8:FF:1::1\nS   2001:DB8:10::/48 [1/0]\n     via FE80::1, GigabitEthernet0/1\nC   2001:DB8:20:10::/64 [0/0]\n     via GigabitEthernet0/0, directly connected\nL   2001:DB8:20:10::1/128 [0/0]\n     via GigabitEthernet0/0, receive\nC   2001:DB8:FF:1::/64 [0/0]\n     via GigabitEthernet0/1, directly connected\nL   2001:DB8:FF:1::2/128 [0/0]\n     via GigabitEthernet0/1, receive\nL   FF00::/8 [0/0]\n     via Null0, receive",
 o:[
  {t:"The route to 2001:DB8:10::/48 uses a link-local next hop, so its exit interface had to be specified",ok:true,x:"FE80::1 is only meaningful on one link, and every interface has link-local addresses in FE80::/10. IOS requires the exit interface with a link-local next hop, as the 'via FE80::1, GigabitEthernet0/1' entry shows."},
  {t:"A packet to 2001:DB8:77::5 is forwarded to 2001:DB8:FF:1::1",ok:true,x:"No connected or static prefix covers 2001:DB8:77::5, so the ::/0 default route matches. It is the only default route, so its AD of 10 does not keep it out of the table."},
  {t:"The default route is not used because its AD of 10 is higher than the other static route's AD of 1",ok:false,x:"AD only compares routes to the same prefix. ::/0 and 2001:DB8:10::/48 are different prefixes, so both are installed."},
  {t:"A packet to 2001:DB8:10:5::20 follows the default route because /0 is checked before /48",ok:false,x:"Longest prefix match applies to IPv6 as well. 2001:DB8:10:5::20 is inside 2001:DB8:10::/48, which is far more specific than ::/0."},
  {t:"FE80::1 is routed across the WAN, so HQ1 can be several hops away",ok:false,x:"Link-local addresses are never forwarded off their link. FE80::1 must be HQ1's address on the segment attached to Gi0/1."}
 ],
 w:"IPv6 static with a link-local next hop: ipv6 route prefix/len <interface> FE80::x. A global next hop can stand alone. Longest match and AD rules are the same as in IPv4."},
{id:"b068",obj:"3.1.g",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. BR1 has no other default route configured. After the messages appear, what happens to branch traffic destined for 198.51.100.80?",
 ex:"BR1# show ip route | include Gateway|0.0.0.0/0\nGateway of last resort is 203.0.113.1 to network 0.0.0.0\nS*    0.0.0.0/0 [1/0] via 203.0.113.1\n\n%LINK-3-UPDOWN: Interface GigabitEthernet0/2, changed state to down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2,\n changed state to down\n\nBR1# show ip interface brief | include 0/2\nGigabitEthernet0/2     203.0.113.6     YES manual down                  down",
 o:[
  {t:"The default route is withdrawn because 203.0.113.1 is no longer reachable, so the packets are dropped",ok:true,x:"203.0.113.1 was reachable only through the connected 203.0.113.0/29, which disappears when Gi0/2 goes down. The static default no longer resolves and is removed, the gateway of last resort becomes 'not set', and BR1 drops traffic with no matching route."},
  {t:"The packets are sent to HQ over the 10.10.0.0/16 static route",ok:false,x:"198.51.100.80 is not inside 10.10.0.0/16. Without a default route pointing at HQ, nothing in the table matches."},
  {t:"The default route stays in the table and the packets are queued until Gi0/2 returns",ok:false,x:"Routers do not hold packets waiting for a route. A static route whose next hop cannot be resolved is removed from the table."},
  {t:"BR1 sends an ARP request for 198.51.100.80 on every up interface",ok:false,x:"Routers do not ARP for off-subnet destinations they have no route to. They drop the packet and may send ICMP unreachable."}
 ],
 w:"A static route stays in the table only while its next hop resolves. To keep internet access when the ISP link fails, add a floating default route that points elsewhere."},
{id:"b069",obj:"4.5",d:4,cat:"mon",t:"ms",pick:2,
 q:"Refer to the exhibit. BR1 is configured with logging host 10.10.1.50 and logging trap warnings. The listed messages are generated on BR1. Which two messages are sent to the syslog server? (Choose two.)",
 ex:"%LINK-3-UPDOWN: Interface Serial0/1/0, changed state to down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Serial0/1/0,\n changed state to down\n%SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin]\n [Source: 10.20.10.37] [localport: 22] [Reason: Login Authentication Failed]\n%SYS-5-CONFIG_I: Configured from console by netops on vty0 (10.10.99.25)",
 o:[
  {t:"%LINK-3-UPDOWN",ok:true,x:"Severity 3 (errors) is more severe than 4 (warnings). logging trap warnings sends levels 0 through 4, so this message goes to the server."},
  {t:"%SEC_LOGIN-4-LOGIN_FAILED",ok:true,x:"Severity 4 is warnings itself, the configured threshold, so it is included."},
  {t:"%LINEPROTO-5-UPDOWN",ok:false,x:"Severity 5 (notifications) is less severe than warnings, so it stays local."},
  {t:"%SYS-5-CONFIG_I",ok:false,x:"Configuration events are severity 5 and fall below the warnings threshold."},
  {t:"None of them, because logging trap only controls console output",ok:false,x:"logging trap sets the severity threshold for messages sent to syslog servers. The console threshold is set with logging console."}
 ],
 w:"The number in %FACILITY-SEVERITY-MNEMONIC is the severity. A trap level sends that level and every lower number: 0 emerg, 1 alert, 2 crit, 3 err, 4 warn, 5 notice, 6 info, 7 debug."},
{id:"b070",obj:"5.4",d:5,cat:"secbase",t:"ms",pick:2,
 q:"Branch technicians currently log in to the VPN headend with a username and password. Security requires multifactor authentication. Which two login methods meet the requirement? (Choose two.)",
 o:[
  {t:"Password plus a one-time code from a hardware token",ok:true,x:"Something you know (password) plus something you have (a token generating codes) are two different factor types."},
  {t:"Smart card holding a certificate, unlocked with a PIN",ok:true,x:"The card and its private key are something you have; the PIN is something you know. That is two factors."},
  {t:"Password plus the answer to a security question",ok:false,x:"Both are something you know. Two items from the same factor type are not multifactor."},
  {t:"A 20-character passphrase that changes every 30 days",ok:false,x:"A longer, rotated secret is still a single knowledge factor."},
  {t:"Two different passwords entered one after the other",ok:false,x:"Two knowledge factors are one factor type used twice, not MFA."}
 ],
 w:"MFA = at least two DIFFERENT categories: something you know, something you have, something you are (biometrics)."},
{id:"b071",obj:"3.4.c",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. Routers BR1 (RID 10.0.0.21), BR2 (RID 10.0.0.22, priority 1) and BR3 (RID 10.0.0.23) share branch transit VLAN 99. BR3 reloads, and after it comes back all adjacencies re-form. What are the roles on VLAN 99 then?",
 ex:"BR2# show ip ospf neighbor\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.0.0.21         0   FULL/DROTHER    00:00:30    10.20.99.1      GigabitEthernet0/0\n10.0.0.23         5   FULL/DR         00:00:30    10.20.99.3      GigabitEthernet0/0",
 o:[
  {t:"BR2 is DR, BR3 is BDR, BR1 is DROTHER",ok:true,x:"When BR3 drops, BR2 (the BDR) is promoted to DR. BR1 has priority 0 and cannot become BDR. When BR3 returns, the DR role is not preempted, so BR3 fills the empty BDR role."},
  {t:"BR3 is DR, BR2 is BDR, BR1 is DROTHER",ok:false,x:"That would need preemption. The DR/BDR election is non-preemptive, so a higher priority does not take back the DR role while the current DR is up."},
  {t:"BR2 is DR, BR1 is BDR, BR3 is DROTHER",ok:false,x:"BR1 has priority 0, so it can never be DR or BDR, whatever its router ID."},
  {t:"BR2 is DR and no BDR is elected while BR3 is a DROTHER",ok:false,x:"BR3 has priority 5 and is eligible. With no BDR on the segment, it is elected BDR when it rejoins."}
 ],
 w:"DR/BDR: highest priority, then highest RID; priority 0 = never; non-preemptive, so the BDR is promoted when the DR fails and newcomers only fill empty roles."},
{id:"b072",obj:"3.2.b",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. BR1 learns HQ's 10.10.1.0/24 through OSPF over the fiber link. To add a backup over the serial link, an engineer configured ip route 10.10.1.0 255.255.255.0 10.255.2.1 5. Now HQ traffic uses the serial link even though the fiber adjacency is FULL. What explains this?",
 ex:"BR1# show ip route 10.10.1.0\nRouting entry for 10.10.1.0/24\n  Known via \"static\", distance 5, metric 0\n  Routing Descriptor Blocks:\n  * 10.255.2.1\n      Route metric is 0, traffic share count is 1",
 o:[
  {t:"The static route's AD of 5 is lower than OSPF's 110, so it replaces the OSPF route; its AD must be above 110",ok:true,x:"Both routes are for the same /24, so AD decides and the lower value wins. A floating static that backs up OSPF needs an AD higher than 110, for example 130."},
  {t:"Static routes are always preferred over dynamic routes, so the backup must be learned dynamically",ok:false,x:"Static routes win only because their default AD (1) is low. Raising the AD above 110 makes the static the backup."},
  {t:"The static route is more specific than the OSPF route, so longest match selects it",ok:false,x:"Both are 10.10.1.0/24. With equal prefix length, the tie is broken by administrative distance."},
  {t:"OSPF costs the serial link lower than the fiber link, so OSPF itself prefers the serial path",ok:false,x:"The table shows the route is known via static, not OSPF, and OSPF would cost the serial link 64 against the fiber's 1."}
 ],
 w:"Floating static rule: its AD must be higher than the route it backs up. Backing up OSPF means AD above 110; backing up another static means AD above 1."},
{id:"b073",obj:"5.7",d:5,cat:"l2sec",t:"ms",pick:2,
 q:"A contractor's device on branch switch BSW1 handed out bad DHCP leases. Legitimate leases come from the HQ server through BR1, which connects to BSW1 Gi0/1. Users are in VLAN 10 on Fa0/1-24. Which two actions on BSW1 are required to block rogue servers while users keep getting leases? (Choose two.)",
 o:[
  {t:"Enable DHCP snooping globally and for VLAN 10",ok:true,x:"ip dhcp snooping alone does nothing until it is also enabled per VLAN with ip dhcp snooping vlan 10. Then server messages arriving on untrusted ports are dropped."},
  {t:"Configure ip dhcp snooping trust on Gi0/1, the uplink toward BR1",ok:true,x:"Every port is untrusted by default. The relayed OFFER and ACK from HQ arrive on Gi0/1, so it must be trusted or legitimate leases are dropped too."},
  {t:"Configure ip dhcp snooping trust on Fa0/1-24",ok:false,x:"Trusting the access ports would let the rogue server's OFFERs through, which defeats the purpose."},
  {t:"Enable dynamic ARP inspection on VLAN 10",ok:false,x:"DAI uses the snooping binding table to stop ARP spoofing. It is useful, but it does not block DHCP server messages and is not required here."},
  {t:"Configure ip helper-address on BSW1's VLAN 10 SVI",ok:false,x:"BR1 already relays DHCP for the VLAN. A second relay on the switch is not needed to block rogue servers."},
  {t:"Set switchport port-security maximum 1 on Fa0/1-24",ok:false,x:"Port security limits MAC addresses per port. A rogue server with one MAC would still be allowed to send OFFERs."}
 ],
 w:"DHCP snooping: enable globally and per VLAN, trust only ports toward real servers or relays. Untrusted ports drop OFFER and ACK; the binding table it builds also feeds DAI."},
{id:"b074",obj:"3.4.d",d:3,cat:"ospf",t:"build",ordered:true,
 q:"BR1's OSPF process 10 is using router ID 172.16.200.2. Starting in global configuration mode, drag the commands needed to make 10.0.0.2 the router ID and apply it immediately without a reload into the answer area, in order.",
 pool:["router ospf 10","router-id 10.0.0.2","end","clear ip ospf process","ip ospf router-id 10.0.0.2","network 10.0.0.2 0.0.0.0 area 0","clear ip route *"],
 answer:[0,1,2,3],
 x:"router-id is a router-configuration command, so enter router ospf 10 first. IOS accepts it but warns that a reload or clear ip ospf process is needed, because a running process keeps its RID. clear ip ospf process is a privileged EXEC command, so leave config mode with end first, then confirm the prompt. ip ospf router-id is not a valid interface command, advertising the loopback has no effect on the RID, and clearing the routing table does not restart OSPF.",
 w:"router ospf N, router-id X, end, clear ip ospf process (confirm yes). Clearing the process resets every adjacency on the router, so do it in a maintenance window."},
{id:"b075",obj:"4.3",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. A branch user can ping 10.10.1.80, the HQ intranet server, but the browser cannot open intranet.corp.example. BR1 only routes and relays DHCP; the HQ DNS server is 10.10.1.53. What is the most likely cause?",
 ex:"C:\\> ipconfig /all\n\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . : branch.example\n   DHCP Enabled. . . . . . . . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : 10.20.10.37(Preferred)\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 10.20.10.1\n   DHCP Server . . . . . . . . . . . : 10.10.1.20\n   DNS Servers . . . . . . . . . . . : 10.20.10.1",
 o:[
  {t:"The DHCP scope gives clients 10.20.10.1 as DNS server, but BR1 does not answer DNS queries",ok:true,x:"Reaching the server by IP proves addressing, gateway and routing work. Only name resolution fails, and the client is sending queries to BR1, which is not a DNS server. The scope's DNS option should point to 10.10.1.53."},
  {t:"The default gateway is wrong, so packets to HQ are not routed",ok:false,x:"The ping to 10.10.1.80 succeeds, so the gateway and the routing path to HQ are working."},
  {t:"The DHCP relay is misconfigured, so the PC has an APIPA address",ok:false,x:"The PC has a valid 10.20.10.37 lease from 10.10.1.20, not a 169.254.x.x address, so the relay works."},
  {t:"DNS uses TCP 53 only, and BR1 blocks TCP from the branch",ok:false,x:"Ordinary DNS queries use UDP 53 (TCP for large replies and zone transfers). There is also no sign of an ACL; the client is simply asking the wrong server."}
 ],
 w:"Ping by IP works but by name fails = DNS. Check the DNS server the client was given, usually the DHCP scope's dns-server option."},
{id:"b076",obj:"3.3.a",d:3,cat:"static",t:"mc",
 q:"BR1 sends internet traffic to its ISP with ip route 0.0.0.0 0.0.0.0 203.0.113.1. If the ISP link fails, internet traffic must be sent to HQ1 (10.255.1.1) over the fiber link instead, and only then. Which command meets the requirement?",
 o:[
  {t:"ip route 0.0.0.0 0.0.0.0 10.255.1.1 10",ok:true,x:"A second default route with a higher AD floats: it stays out of the table while the AD 1 route via the ISP is valid and is installed when 203.0.113.1 becomes unreachable."},
  {t:"ip route 0.0.0.0 0.0.0.0 10.255.1.1",ok:false,x:"Without an AD this route also has AD 1. Two equal default routes are both installed and traffic is shared across the ISP and HQ, which is not 'only then'."},
  {t:"ip route 0.0.0.0 255.255.255.255 10.255.1.1 10",ok:false,x:"A default route has mask 0.0.0.0. The command as written pairs network 0.0.0.0 with a /32 mask, so it is not a default route at all."},
  {t:"ip default-gateway 10.255.1.1",ok:false,x:"ip default-gateway is only used when IP routing is disabled, such as on a Layer 2 switch. A routing router ignores it."}
 ],
 w:"Floating default route: ip route 0.0.0.0 0.0.0.0 <backup next hop> <AD higher than the primary>. An equal AD gives load sharing, not backup."},
{id:"b077",obj:"5.10",d:5,cat:"wsec",t:"mc",
 q:"Refer to the exhibit. The BR-STAFF WLAN must use WPA2-Personal with a shared passphrase. Clients are being asked for a username, and the WLC has no RADIUS server defined. Which change is needed?",
 ex:"WLANs > Edit 'BR-STAFF'\n General:  Status [x] Enabled   SSID: BR-STAFF   Interface: branch-staff\n Security > Layer 2\n   Layer 2 Security     : WPA+WPA2\n   MAC Filtering        : [ ]\n   WPA+WPA2 Parameters\n     WPA Policy         : [ ]\n     WPA2 Policy        : [x]   WPA2 Encryption: [x] AES  [ ] TKIP\n   Authentication Key Management\n     802.1X             : [x] Enable\n     PSK                : [ ] Enable\n     PSK Format         : ASCII",
 o:[
  {t:"Disable 802.1X, enable PSK, enter an 8 to 63 character ASCII passphrase, and click Apply",ok:true,x:"WPA2-Personal is WPA2 with AES and PSK key management. With 802.1X selected, the WLAN expects EAP logins checked by a RADIUS server, which is why clients ask for a username."},
  {t:"Enable TKIP alongside AES in the WPA2 encryption settings",ok:false,x:"The cipher is not the problem. AES alone is correct for WPA2, and adding TKIP weakens the WLAN without changing the authentication method."},
  {t:"Set Layer 2 Security to None and enable MAC filtering",ok:false,x:"That creates an open, unencrypted WLAN. MAC filtering is easily spoofed and is not WPA2-Personal."},
  {t:"Enable WPA Policy in addition to WPA2 Policy",ok:false,x:"Turning on legacy WPA (TKIP) adds an older protocol but leaves 802.1X key management selected, so clients still prompt for credentials."}
 ],
 w:"WLC WPA2-PSK: Security > Layer 2 = WPA+WPA2, WPA2 Policy with AES, Auth Key Mgmt = PSK, passphrase of 8 to 63 ASCII characters, Apply. 802.1X there means Enterprise."},
{id:"b078",obj:"3.5",d:3,cat:"fhrp",t:"ms",pick:2,
 q:"The branch is replacing HSRP with VRRP because the second LAN router comes from a different vendor. Which two statements about VRRP are true? (Choose two.)",
 o:[
  {t:"It is an open standard, so routers from different vendors can share one group",ok:true,x:"VRRP is defined by the IETF (RFC 5798), while HSRP is Cisco proprietary. That is the usual reason to choose VRRP in a mixed-vendor branch."},
  {t:"Preemption is enabled by default, so a higher-priority router reclaims the master role",ok:true,x:"VRRP preempts by default, while HSRP needs the preempt command."},
  {t:"Hosts learn virtual MAC 0000.0c07.acxx for the default gateway",ok:false,x:"0000.0c07.acxx is the HSRP version 1 virtual MAC. VRRP uses 0000.5e00.01xx."},
  {t:"Routers in the group are called active and standby",ok:false,x:"Active and standby are HSRP terms. VRRP uses master and backup."},
  {t:"One virtual IP is answered by several routers at once to spread the load",ok:false,x:"That describes GLBP, where the AVG hands out different virtual MACs belonging to several AVFs. A single VRRP group has one forwarding master."},
  {t:"The virtual IP can never be a real interface address on any router",ok:false,x:"VRRP allows the virtual IP to be a router's real address. That router is the address owner with priority 255."}
 ],
 w:"HSRP: Cisco, active/standby, 0000.0c07.acxx, no preempt by default. VRRP: open, master/backup, 0000.5e00.01xx, preempt on. GLBP: Cisco, load balancing (AVG/AVF)."},
{id:"b079",obj:"4.2",d:4,cat:"svc",t:"mc",
 q:"The HQ NTP server 10.10.1.123 is stratum 2. BR1 (LAN address 10.20.10.1) must take its time from HQ, and the branch switch BSW1 must take its time from BR1 so that switch NTP traffic never crosses the WAN. Which configuration meets the requirement?",
 o:[
  {t:"BR1: ntp server 10.10.1.123 / BSW1: ntp server 10.20.10.1",ok:true,x:"Each device acts as a client of the next device up. Once BR1 is synchronized (stratum 3) it answers NTP requests from BSW1, which becomes stratum 4. An IOS NTP client also serves time to others."},
  {t:"BR1: ntp master 3 / BSW1: ntp server 10.20.10.1",ok:false,x:"ntp master makes BR1 an authoritative source using its own internal clock. The branch would no longer follow HQ time."},
  {t:"BR1: ntp server 10.20.10.1 / BSW1: ntp server 10.10.1.123",ok:false,x:"This is reversed. BR1 points at its own address, and BSW1 sends its NTP traffic across the WAN to HQ."},
  {t:"BR1: ntp peer 10.10.1.123 / BSW1: ntp master",ok:false,x:"A peer relationship is for devices at the same level syncing with each other, and ntp master makes BSW1 a time source on its own clock."}
 ],
 w:"ntp server X = be a client of X. A synchronized IOS client also serves time downstream, one stratum higher. ntp master = trust my own clock."},
{id:"b080",obj:"3.4.a",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. The design is single-area OSPF, but BR1 and HQ1 do not form an adjacency over the serial link. Which change on BR1 fixes the problem?",
 ex:"BR1# show ip ospf interface serial0/1/0 | include Area|Neighbor Count\n  Internet Address 10.255.2.2/30, Area 1, Attached via Network Statement\n  Neighbor Count is 0, Adjacent neighbor count is 0\n\nHQ1# show ip ospf interface serial0/1/0 | include Area|Neighbor Count\n  Internet Address 10.255.2.1/30, Area 0, Attached via Network Statement\n  Neighbor Count is 0, Adjacent neighbor count is 0\n\nBR1# show running-config | section router ospf\nrouter ospf 10\n network 10.20.10.0 0.0.0.255 area 0\n network 10.255.1.0 0.0.0.3 area 0\n network 10.255.2.0 0.0.0.3 area 1",
 o:[
  {t:"Replace network 10.255.2.0 0.0.0.3 area 1 with network 10.255.2.0 0.0.0.3 area 0",ok:true,x:"The area ID is carried in every hello and must match on both ends of a link. BR1 puts Se0/1/0 in area 1 while HQ1 uses area 0, so the hellos are rejected."},
  {t:"Change BR1's OSPF process ID from 10 to 1 to match HQ1",ok:false,x:"The process ID only matters on the local router and is not sent in hellos. Different process IDs on neighbors are normal."},
  {t:"Configure ip ospf network point-to-point on Se0/1/0",ok:false,x:"Serial interfaces are already point-to-point by default. The network type is not what is blocking the adjacency."},
  {t:"Configure BR1 with the same router ID as HQ1",ok:false,x:"Router IDs must be unique. A duplicate RID would cause a new problem rather than fix this one."}
 ],
 w:"Hello parameters that must match: area ID, subnet and mask, hello/dead timers, authentication, stub flag. Process ID and router ID do not match; RIDs must be unique."},
{id:"b081",obj:"5.5",d:5,cat:"vpn",t:"ms",pick:2,
 q:"The branch manager travels and must reach HQ applications securely from a laptop at hotels and at home. HQ will deploy a remote-access IPsec VPN. Which two statements describe this solution? (Choose two.)",
 o:[
  {t:"The laptop runs VPN client software and the user authenticates individually to the HQ headend",ok:true,x:"Remote-access VPNs terminate on a headend such as a firewall or VPN concentrator, and each user signs in, often with MFA."},
  {t:"The tunnel is built on demand from wherever the laptop has internet access",ok:true,x:"The client starts the tunnel when the user connects, from any network: hotel, home or mobile hotspot."},
  {t:"The manager's home router must support IPsec and build the tunnel to HQ",ok:false,x:"That describes site-to-site VPN. In remote access the endpoint itself is the tunnel end, so any home router works."},
  {t:"Every device on the manager's home network is protected by the tunnel",ok:false,x:"Only traffic from the laptop running the client goes through the tunnel. Other home devices are not involved."},
  {t:"The tunnel is set up automatically between two routers when they boot",ok:false,x:"Automatic, permanent router-to-router tunnels are site-to-site VPNs like the branch-to-HQ link."}
 ],
 w:"Remote access: one device, client software, per-user authentication, on demand. Site-to-site: two gateways, whole networks, always on, hosts unaware."},
{id:"b082",obj:"3.3.c",d:3,cat:"static",t:"mc",
 q:"BR1 sends all HQ traffic over the fiber link with ip route 10.10.0.0 255.255.0.0 10.255.1.1. The HQ call-control server 10.10.50.10 must be reached only over the serial link (next hop 10.255.2.1), while the rest of HQ keeps using the fiber. Which command meets the requirement?",
 o:[
  {t:"ip route 10.10.50.10 255.255.255.255 10.255.2.1",ok:true,x:"A /32 host route is more specific than the /16, so longest match sends only that server's traffic over the serial link."},
  {t:"ip route 10.10.50.10 0.0.0.0 10.255.2.1",ok:false,x:"A host route needs mask 255.255.255.255. Mask 0.0.0.0 with a host address is an inconsistent address and mask, and IOS rejects it."},
  {t:"ip route 10.10.50.0 255.255.255.0 10.255.2.1",ok:false,x:"This moves the whole 10.10.50.0/24 subnet to the serial link, not just the one server."},
  {t:"ip route 10.10.50.10 255.255.255.255 10.255.1.1",ok:false,x:"This next hop is HQ1's fiber address, so the server's traffic would stay on the fiber link."}
 ],
 w:"Host route = /32 (IPv4) or /128 (IPv6). Longest match lets one host take a different path from the rest of its network."},
{id:"b083",obj:"4.7",d:4,cat:"qos",t:"mc",
 q:"BR1's internet circuit is delivered on a 1-Gbps Ethernet handoff, but the contract is 100 Mbps and the ISP polices everything above that. Bursts from the branch are dropped by the ISP, causing TCP retransmissions. What should be configured outbound on BR1 Gi0/2?",
 o:[
  {t:"Shaping to 100 Mbps, so bursts above the contract are queued and sent later",ok:true,x:"A shaper buffers excess traffic and releases it at the contracted rate, so the ISP policer never sees traffic above 100 Mbps. The cost is some extra delay instead of drops."},
  {t:"Policing to 100 Mbps, so traffic above the contract is dropped on BR1",ok:false,x:"An outbound policer drops or re-marks excess traffic just as the ISP's does. The drops simply move to BR1."},
  {t:"Marking all branch traffic DSCP EF so the ISP gives it priority",ok:false,x:"Marking only labels packets. It does not limit the rate, and the ISP is unlikely to honor customer EF on internet traffic."},
  {t:"The bandwidth 100000 interface command",ok:false,x:"bandwidth only informs routing protocol metrics and QoS calculations. It does not limit how fast the interface sends."}
 ],
 w:"Shaping = buffer and delay the excess (smooth, adds latency), used outbound toward a slower contract. Policing = drop or re-mark the excess, typical at the provider edge."},
{id:"b084",obj:"3.1.f",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. BR1 Gi0/1 and HQ1 Gi0/0 both have the default OSPF cost. Which statement describes the values in this route entry?",
 ex:"BR1# show ip route ospf | include 10.10.1.0\nO        10.10.1.0/24 [110/2] via 10.255.1.1, 00:12:34, GigabitEthernet0/1",
 o:[
  {t:"110 is the administrative distance and 2 is the total OSPF cost to reach 10.10.1.0/24",ok:true,x:"The bracket holds [AD/metric]. OSPF cost adds the outgoing interface costs along the path: BR1 Gi0/1 (1) plus HQ1 Gi0/0 (1) = 2."},
  {t:"110 is the metric and 2 is the administrative distance",ok:false,x:"The order is [AD/metric]. 110 is OSPF's default AD."},
  {t:"2 is the hop count to the destination network",ok:false,x:"OSPF uses cost based on bandwidth, not hop count. Here the two costs just happen to be 1 each."},
  {t:"00:12:34 is the time left before the route expires unless it is refreshed",ok:false,x:"The timestamp is how long ago the route was learned or last changed. OSPF routes do not count down to expiry."}
 ],
 w:"Route entry anatomy: code, prefix/length, [AD/metric], via next hop, age, outgoing interface."},
{id:"b085",obj:"5.7",d:5,cat:"l2sec",t:"order",
 q:"Refer to the exhibit. Fa0/8 on BSW1 uses port security in the default violation mode. A visitor's laptop has been plugged in at the front desk. Drag and drop the steps into the order an engineer should follow to restore the port for the authorized PC.",
 ex:"BSW1# show interfaces status err-disabled\n\nPort      Name               Status       Reason               Err-disabled Vlans\nFa0/8     FRONT-DESK         err-disabled psecure-violation",
 pool:["Confirm the violating MAC with show port-security interface fa0/8","Remove the unauthorized laptop from the port","In Fa0/8 interface configuration mode, enter shutdown","In Fa0/8 interface configuration mode, enter no shutdown","Verify Port Status shows Secure-up"],
 answer:[0,1,2,3,4],alt:[[0,2,1,3,4]],
 x:"The shutdown violation mode puts the port in err-disabled. Find out what caused it first, then remove the device; otherwise the port goes straight back to err-disabled. Recovery is a shutdown followed by no shutdown on the interface (or errdisable recovery if configured). Removing the laptop after the shutdown but before the no shutdown is equally valid. Finish by checking that the port is Secure-up.",
 w:"Err-disabled by port security: fix the cause, then shutdown / no shutdown. Without errdisable recovery the port stays down until someone does this."},
{id:"b086",obj:"3.4.d",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. BR1 was built from a copy of HQ1's configuration template, and HQ1's router ID is 10.0.0.1. Routes are not being exchanged between them. Which action resolves the problem?",
 ex:"%OSPF-4-DUP_RTRID_NBR: OSPF detected duplicate router-id 10.0.0.1\n from 10.255.1.1 on interface GigabitEthernet0/1\n\nBR1# show running-config | section router ospf\nrouter ospf 10\n router-id 10.0.0.1\n network 10.20.10.0 0.0.0.255 area 0\n network 10.255.1.0 0.0.0.3 area 0",
 o:[
  {t:"Configure router-id 10.0.0.2 under router ospf 10 on BR1, then run clear ip ospf process",ok:true,x:"Every OSPF router needs a unique router ID, and neighbors with the same ID cannot form an adjacency. A new router-id applies only after the process is cleared or the router reloads."},
  {t:"Change BR1's OSPF process ID to 1 to match HQ1",ok:false,x:"The process ID is local to each router and is not compared between neighbors. The duplicate router ID would remain."},
  {t:"Configure ip ospf priority 0 on BR1 Gi0/1",ok:false,x:"Priority only affects DR/BDR election. It does nothing about two routers using the same ID."},
  {t:"Remove the router-id command; the new ID takes effect immediately",ok:false,x:"A running OSPF process keeps its current router ID until it is cleared or the router reloads, so the conflict would continue."}
 ],
 w:"Duplicate RIDs break adjacencies and LSDB consistency. Give each router a unique router-id, then clear ip ospf process."},
{id:"b087",obj:"5.1",d:5,cat:"secbase",t:"mc",
 q:"BR1 runs an IOS release with a published flaw in its HTTP server, and ip http server is enabled on the internet-facing interface. A researcher posts a script that sends crafted HTTP requests to gain privilege level 15. Which statement uses the security terms correctly?",
 o:[
  {t:"The flaw is the vulnerability, the script is the exploit, and patching or disabling the HTTP server is the mitigation",ok:true,x:"A vulnerability is a weakness, an exploit is the code or technique that takes advantage of it, and a mitigation removes or reduces it. No ip http server, or an upgrade, removes the attack surface."},
  {t:"The script is the vulnerability, the flaw is the exploit, and the HTTP server is the mitigation",ok:false,x:"The terms are swapped. The weakness in the code is the vulnerability, and the script that abuses it is the exploit."},
  {t:"The flaw is the threat, the script is the vulnerability, and the researcher is the exploit",ok:false,x:"A threat is a potential danger, such as an attacker who might use the script. The script itself is the exploit, and a person is never an exploit."},
  {t:"The HTTP server is the exploit, and enabling HTTPS instead is the vulnerability",ok:false,x:"A service is not an exploit. Moving to HTTPS encrypts the session but would not fix a flaw in the same server code."}
 ],
 w:"Vulnerability = weakness. Exploit = what uses it. Threat = who or what might. Mitigation = what reduces the risk. Turn off services you do not use."},
{id:"b088",obj:"3.3.a",d:3,cat:"static",t:"mc",
 q:"An engineer configures the branch default route as ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/2, with no next-hop address. Gi0/2 connects to the ISP's multi-access Ethernet segment 203.0.113.0/29. What is the effect?",
 o:[
  {t:"BR1 treats every internet destination as directly connected on Gi0/2 and ARPs for each one, relying on ISP proxy ARP",ok:true,x:"With only an exit interface on a multi-access network, BR1 sends an ARP request for every destination address. This works only if the ISP router answers with proxy ARP, and it bloats the ARP cache, so a next hop is recommended on Ethernet."},
  {t:"It behaves exactly like a default route via 203.0.113.1",ok:false,x:"With a next hop, BR1 ARPs once for 203.0.113.1. With only an exit interface, it ARPs for each final destination."},
  {t:"IOS rejects the command because Ethernet static routes require a next-hop address",ok:false,x:"IOS accepts it. The route shows as directly connected, which works on point-to-point links but is a poor choice on Ethernet."},
  {t:"The route is installed with AD 0, so it overrides connected routes",ok:false,x:"A static route to an exit interface still has AD 1, and it cannot override connected routes, which are more specific anyway."}
 ],
 w:"Exit-interface-only statics are fine on point-to-point serial links. On Ethernet, use a next hop (or interface plus next hop) to avoid ARPing for every destination."},
{id:"b089",obj:"4.4",d:4,cat:"mon",t:"mc",
 q:"The HQ network management station polls BR1's interface counters every five minutes, and it must also be told immediately when a WAN link goes down. Which statement describes the SNMP communication?",
 o:[
  {t:"The NMS sends Get requests to BR1's agent on UDP 161, and BR1 sends traps or informs to the NMS on UDP 162",ok:true,x:"Polling is manager-to-agent Get/GetNext/GetBulk on UDP 161. Unsolicited events go agent-to-manager as traps (no acknowledgment) or informs (acknowledged) on UDP 162."},
  {t:"BR1 sends unsolicited Get responses every five minutes to the NMS on UDP 162",ok:false,x:"Responses only answer requests. The NMS controls the polling interval, and UDP 162 is for notifications."},
  {t:"Traps need SNMPv3, because SNMPv2c supports only polling",ok:false,x:"SNMPv2c supports traps and adds informs. SNMPv3 adds authentication and encryption, not notifications."},
  {t:"The NMS reads the counters with Set requests on UDP 162",ok:false,x:"Set changes values on the agent, and agents listen on UDP 161. Reading uses Get."}
 ],
 w:"SNMP: manager polls the agent (Get, Set) on UDP 161; the agent notifies the manager (Trap, Inform) on UDP 162. Data lives in the MIB, identified by OIDs."},
{id:"b090",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"Branch PCs use 10.20.10.1, the VRRP virtual address shared by BR1 (master) and BR2 (backup), as their default gateway. BR1 loses power. What happens on the branch PCs?",
 o:[
  {t:"Nothing changes on the PCs; BR2 takes over the same virtual IP and virtual MAC and announces it with gratuitous ARP",ok:true,x:"The PCs' gateway IP and its ARP entry still point to the virtual MAC, which BR2 now owns. Its gratuitous ARP updates the switches' MAC tables so frames reach the new master."},
  {t:"The PCs must renew their DHCP leases to learn BR2 as the new gateway",ok:false,x:"The gateway address handed out by DHCP is the virtual IP, which does not change. An FHRP exists so hosts need no change."},
  {t:"Traffic stops until each PC's ARP entry for the gateway ages out and is relearned",ok:false,x:"The virtual MAC moves with the virtual IP, so the existing ARP entries stay correct."},
  {t:"The PCs are redirected with ICMP to BR2's real address, 10.20.10.3",ok:false,x:"VRRP does not rely on ICMP redirects. Hosts keep using the virtual address."}
 ],
 w:"FHRPs are invisible to hosts: same virtual IP, same virtual MAC, different physical router. The new master's gratuitous ARP fixes the switch MAC tables."},
{id:"b091",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"Refer to the exhibit. Guest VLAN 50 must not reach HQ (10.10.0.0/16) but must have internet access; guests use a public DNS resolver. After GUEST-IN was applied, guests can resolve names but no websites load. Which change fixes the problem?",
 ex:"BR1# show access-lists GUEST-IN\nExtended IP access list GUEST-IN\n    10 deny ip 10.20.50.0 0.0.0.255 10.10.0.0 0.0.255.255 (42 matches)\n    20 permit udp 10.20.50.0 0.0.0.255 any eq domain (318 matches)\n\nBR1# show running-config interface g0/0.50\ninterface GigabitEthernet0/0.50\n encapsulation dot1Q 50\n ip address 10.20.50.1 255.255.255.0\n ip access-group GUEST-IN in\n ip nat inside",
 o:[
  {t:"Add 30 permit ip 10.20.50.0 0.0.0.255 any to GUEST-IN",ok:true,x:"Only DNS is permitted, so web traffic hits the implicit deny at the end. A permit after line 10 lets guests reach everything except HQ, which line 10 has already denied."},
  {t:"Apply GUEST-IN outbound on Gi0/0.50 instead of inbound",ok:false,x:"Outbound on the guest subinterface, the ACL would see return traffic toward the guests, whose source is not 10.20.50.0/24, so almost everything would hit the implicit deny."},
  {t:"Add 5 permit tcp any any eq www to GUEST-IN",ok:false,x:"Sequence 5 is checked before the deny, so guests could reach HQ web servers. HTTPS (443) would still be blocked."},
  {t:"Move GUEST-IN to Gi0/2 inbound",ok:false,x:"Inbound on the internet interface, the source addresses are internet hosts, not 10.20.50.0/24. Guest traffic would no longer be filtered toward HQ."}
 ],
 w:"Every ACL ends in an implicit deny any. When an ACL exists to block one thing, end it with an explicit permit for everything else."},
{id:"b092",obj:"3.4.b",d:3,cat:"ospf",t:"mc",
 q:"BR1 Gi0/1 and HQ1 Gi0/1 are the two ends of an Ethernet WAN handoff in 10.255.1.0/30. show ip ospf neighbor on BR1 lists HQ1 as FULL/DR, and after every flap the adjacency waits for a DR election. Which command, on both interfaces, removes the election while keeping the adjacency FULL?",
 o:[
  {t:"ip ospf network point-to-point",ok:true,x:"With only two routers on the segment, the point-to-point network type skips the DR/BDR election and wait timer and goes straight to FULL. It must match on both ends."},
  {t:"ip ospf priority 0",ok:false,x:"With priority 0 on both routers, no DR can be elected. On a broadcast network the neighbors then stay in 2-WAY and never exchange LSAs."},
  {t:"ip ospf cost 1",ok:false,x:"Cost only affects path selection. Gi interfaces already cost 1, and the network type stays broadcast."},
  {t:"ip ospf hello-interval 1",ok:false,x:"Faster hellos speed up neighbor-loss detection but keep the broadcast network type and its DR election. They also must match on both ends."}
 ],
 w:"Two routers on an Ethernet link: set ip ospf network point-to-point on both ends. No DR/BDR, faster adjacency, shown as FULL/ -."},
{id:"b093",obj:"5.8",d:5,cat:"vpn",t:"mc",
 q:"Branch routers check administrator logins against a TACACS+ server at HQ. A junior technician logs in successfully, but when she types configure terminal the router replies 'Command authorization failed.' Which AAA function denied the command?",
 o:[
  {t:"Authorization",ok:true,x:"Authorization decides what an authenticated user may do. TACACS+ can authorize each command separately, which is why it is preferred for device administration."},
  {t:"Authentication",ok:false,x:"Authentication proves identity. It succeeded, because she logged in."},
  {t:"Accounting",ok:false,x:"Accounting records what users did, such as session times and commands entered. It does not allow or deny anything."},
  {t:"TACACS+ payload encryption",ok:false,x:"TACACS+ encrypts the whole payload, but that protects the exchange. It is not the function that refuses commands."}
 ],
 w:"Authentication = who are you. Authorization = what may you do. Accounting = what did you do. TACACS+ (TCP 49) separates all three; RADIUS (UDP 1812/1813) combines authentication and authorization."},
{id:"b094",obj:"3.3.d",d:3,cat:"static",t:"mc",
 q:"BR1 reaches the IPv6 internet through its ISP at 2001:db8:aa::1 on Gi0/2. If that path fails, IPv6 internet traffic must go to HQ1, whose link-local address on the Gi0/1 link is FE80::1. Which pair of commands meets the requirement?",
 o:[
  {t:"ipv6 route ::/0 2001:db8:aa::1 and ipv6 route ::/0 GigabitEthernet0/1 FE80::1 200",ok:true,x:"The ISP default has AD 1 and is preferred. The HQ default floats with AD 200 and names the exit interface, which is required with a link-local next hop."},
  {t:"ipv6 route ::/0 2001:db8:aa::1 and ipv6 route ::/0 GigabitEthernet0/1 FE80::1",ok:false,x:"Both routes have AD 1, so both are installed and traffic is shared between the ISP and HQ, not held in reserve."},
  {t:"ipv6 route ::/0 2001:db8:aa::1 200 and ipv6 route ::/0 GigabitEthernet0/1 FE80::1",ok:false,x:"The ADs are reversed. HQ would become the primary path and the ISP the backup."},
  {t:"ipv6 route ::/0 2001:db8:aa::1 and ipv6 route ::/0 FE80::1 200",ok:false,x:"A link-local next hop is ambiguous without an exit interface, because every interface has FE80::/10 addresses. IOS requires the interface."}
 ],
 w:"IPv6 floating static works like IPv4: same prefix, higher AD. With a link-local next hop, always name the exit interface."},
{id:"b095",obj:"4.9",d:4,cat:"mon",t:"mc",
 q:"An engineer backs up BR1's configuration with copy running-config tftp: to the HQ server 10.10.1.69. Which statement about the transfer is true?",
 o:[
  {t:"It uses UDP 69 with no authentication or encryption, so anyone capturing it on the path can read the configuration",ok:true,x:"TFTP has no login and no encryption. It relies on simple acknowledgments over UDP, which is why it suits IOS images and configs on trusted networks only."},
  {t:"TFTP prompts for a username and password before the transfer starts",ok:false,x:"TFTP has no authentication at all. FTP is the protocol that logs in with a username and password."},
  {t:"It uses TCP 20 and 21, so TCP retransmits any lost segments",ok:false,x:"TCP 20/21 is FTP. TFTP runs over UDP and handles loss with its own block acknowledgments."},
  {t:"The transfer is encrypted with the router's RSA key pair",ok:false,x:"The RSA keys serve SSH (and SCP). TFTP sends everything in clear text."}
 ],
 w:"TFTP: UDP 69, no authentication, clear text, simple. FTP: TCP 21 control and 20 data, username and password, still clear text. Use SCP or SFTP when confidentiality matters."},
{id:"b096",obj:"5.2",d:5,cat:"secbase",t:"mc",
 q:"The branch router and switches sit on an open shelf in a storeroom that cleaning and delivery staff use. The devices have strong enable secrets and SSH-only vty lines. Which control best addresses the remaining risk?",
 o:[
  {t:"Move the equipment into a locked room or rack with access limited to IT staff",ok:true,x:"With physical access, someone can use the console and the password-recovery procedure, unplug cables, or connect a rogue device. Physical access control closes that gap."},
  {t:"Configure an even longer enable secret on each device",ok:false,x:"Password recovery from the console bypasses the enable secret, so its length does not stop someone standing at the device."},
  {t:"Train the cleaning staff to report suspicious activity",ok:false,x:"Awareness helps, but it does not stop anyone from reaching the hardware. It supports physical security rather than replacing it."},
  {t:"Disable CDP on all branch devices",ok:false,x:"CDP hardening reduces information leakage on the network. It does nothing about people with physical access to the equipment."}
 ],
 w:"Physical access defeats most logical controls through console password recovery. Lock the room or rack, and badge or log entry."},
{id:"b097",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"The branch adds a second internet-capable router. Management wants both BR1 and BR2 to forward branch traffic at the same time while every host keeps the same single default gateway address. Which first hop redundancy protocol meets this requirement natively?",
 o:[
  {t:"GLBP",ok:true,x:"GLBP's active virtual gateway answers ARP for the one virtual IP with different virtual MACs belonging to the active virtual forwarders. Hosts end up spread across both routers."},
  {t:"VRRP with one group",ok:false,x:"A single VRRP group has one master forwarding for the virtual IP; the backup is idle until failover."},
  {t:"HSRP with one group",ok:false,x:"One HSRP group has one active router. Load sharing with HSRP needs several groups and hosts split across different gateway addresses."},
  {t:"VRRP with preemption disabled",ok:false,x:"Preemption only controls whether a recovered router takes back the master role. Only one router forwards at a time either way."}
 ],
 w:"Only GLBP load-balances with one virtual IP (AVG plus up to 4 AVFs). HSRP and VRRP give one forwarder per group."},
{id:"b098",obj:"5.9",d:5,cat:"wsec",t:"mc",
 q:"Branch staff Wi-Fi uses a single WPA2 passphrase, which has to be changed on every device whenever an employee leaves. Security wants per-user credentials checked against the HQ directory that can be revoked one at a time. Which solution meets the requirement?",
 o:[
  {t:"WPA2-Enterprise using 802.1X/EAP with a RADIUS server",ok:true,x:"Enterprise mode authenticates each user with EAP through a RADIUS server tied to the directory. Disabling one account removes only that person's access."},
  {t:"WPA3-Personal with SAE",ok:false,x:"SAE strengthens the passphrase exchange, but everyone still shares one passphrase, so a departure still means changing it everywhere."},
  {t:"MAC address filtering on the WLC",ok:false,x:"MAC filters are easy to spoof and identify devices, not users. They are not tied to directory credentials."},
  {t:"Disabling SSID broadcast",ok:false,x:"A hidden SSID still appears in probe traffic and adds no authentication at all."}
 ],
 w:"Personal (PSK/SAE) = one shared secret. Enterprise (802.1X/EAP + RADIUS) = individual credentials, per-user revocation and accounting."},
{id:"b099",obj:"4.1",d:4,cat:"nat",t:"mc",
 q:"BR1 already has ip nat inside on Gi0/0 and ip nat outside on Gi0/2. The branch video recorder at 10.20.10.60 must be reachable from the internet at 203.0.113.4 through a permanent one-to-one mapping. Which command completes the configuration?",
 o:[
  {t:"ip nat inside source static 10.20.10.60 203.0.113.4",ok:true,x:"Static inside source NAT takes the inside local address first and the inside global second. The mapping is permanent and works in both directions, so internet hosts can start connections."},
  {t:"ip nat inside source static 203.0.113.4 10.20.10.60",ok:false,x:"The addresses are reversed. IOS would treat the public address as the inside local host."},
  {t:"ip nat outside source static 10.20.10.60 203.0.113.4",ok:false,x:"Outside source NAT translates addresses of hosts on the outside network, not a server on the branch LAN."},
  {t:"ip nat inside source list 10 interface GigabitEthernet0/2 overload",ok:false,x:"PAT creates translations only when inside hosts start a connection. Internet hosts cannot reach the recorder through it."}
 ],
 w:"ip nat inside source static <inside local> <inside global>. Inside/outside interface roles must also be set. Static = permanent and bidirectional; PAT = outbound-initiated only."},
{id:"b100",obj:"3.1.e",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. During a migration, BR1 runs both OSPF and EIGRP with HQ1 over Gi0/1, and both protocols advertise 10.10.1.0/24. The OSPF cost to that subnet is 2. Why does the routing table show the EIGRP route?",
 ex:"BR1# show ip route | include 10.10.1.0\nD        10.10.1.0/24 [90/3072] via 10.255.1.1, 00:03:12, GigabitEthernet0/1",
 o:[
  {t:"EIGRP's administrative distance of 90 is lower than OSPF's 110",ok:true,x:"When two routing sources offer the same prefix, the router installs the one with the lower AD. Metrics from different protocols are never compared."},
  {t:"The OSPF adjacency must be down, because OSPF's metric of 2 is lower than EIGRP's 3072",ok:false,x:"Metrics of different protocols are not comparable. The OSPF route can be valid and still lose on AD."},
  {t:"The EIGRP route is more specific than the OSPF route",ok:false,x:"Both protocols advertise 10.10.1.0/24, so prefix length is equal and AD decides."},
  {t:"The router installs whichever protocol learned the route most recently",ok:false,x:"Arrival order plays no part. Equal prefixes are decided by AD, then by metric within one protocol."}
 ],
 w:"AD: connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110, IS-IS 115, RIP 120, external EIGRP 170, iBGP 200. Lower is more trusted."}
];
