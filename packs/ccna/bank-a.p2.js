/* CCNA 200-301 v1.1 — Exam A, part 2 (a051–a100). Campus build-out theme: OSPF on the core transit segment (DR/BDR),
   routing-table reading, static and floating routes to the internet edge, HSRP on the distribution pair, ACLs for the
   server farm, NTP/syslog/SNMP for the NOC. Domains 3 (25), 4 (10), 5 (15). All text original. Spec: dev/specs/ccna.md §6. */
export const CCNA_BANK_A_P2 = [
{id:"a051",obj:"3.4.c",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. EDGE-1, DIST-1, DIST-2 and CORE-1 share the core transit segment 10.40.250.0/24. A junior engineer opens a ticket because EDGE-1 has shown CORE-1 in the 2WAY state for over an hour. What should the senior engineer reply?",
 ex:"EDGE-1# show ip ospf neighbor\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.40.255.2     200   FULL/DR         00:00:32    10.40.250.2     GigabitEthernet0/0\n10.40.255.3     150   FULL/BDR        00:00:32    10.40.250.3     GigabitEthernet0/0\n10.40.255.4       0   2WAY/DROTHER    00:00:32    10.40.250.4     GigabitEthernet0/0",
 o:[
  {t:"This is normal: two DROTHERs stop at 2WAY and synchronize their databases only with the DR and BDR",ok:true,x:"On a broadcast segment every router forms a FULL adjacency only with the DR and the BDR. EDGE-1 (priority 1) and CORE-1 (priority 0) are both DROTHERs, so 2WAY between them is the expected steady state; CORE-1's routes still reach EDGE-1 through the DR."},
  {t:"CORE-1's priority of 0 blocks the adjacency; set it to 1 on CORE-1",ok:false,x:"Priority 0 only makes CORE-1 ineligible for DR or BDR. At priority 1 it would still be a DROTHER (the DR and BDR are already elected and are not preempted), so the pair would still rest at 2WAY."},
  {t:"The hello and dead timers on EDGE-1 and CORE-1 do not match",ok:false,x:"With mismatched timers each router discards the other's hellos, so CORE-1 would not appear in the table at all. Reaching 2WAY proves the hellos are accepted in both directions."},
  {t:"EDGE-1 and CORE-1 are using the same OSPF router ID",ok:false,x:"The table lists CORE-1 as 10.40.255.4, which differs from EDGE-1's own ID. A duplicate router ID logs %OSPF-4-DUP_RTRID_NBR and breaks the adjacency; it does not produce a stable 2WAY."}
 ],
 w:"Broadcast segment: DROTHER to DROTHER = 2WAY (healthy). FULL only with the DR and BDR. A neighbor stuck in INIT, EXSTART or EXCHANGE is a fault; 2WAY between DROTHERs is not."},
{id:"a052",obj:"3.2.a",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. The static summary toward CORE-1 was left on EDGE-1 after the campus migrated to OSPF. EDGE-1 receives a packet destined to the print server 10.40.60.200. Which next hop does EDGE-1 use?",
 ex:"EDGE-1# show ip route\nCodes: L - local, C - connected, S - static, O - OSPF\n       * - candidate default\n\nGateway of last resort is 203.0.113.1 to network 0.0.0.0\n\nS*    0.0.0.0/0 [1/0] via 203.0.113.1\n      10.0.0.0/8 is variably subnetted, 7 subnets, 4 masks\nS        10.40.0.0/16 [1/0] via 10.40.250.4\nO        10.40.40.0/24 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0\n                       [110/2] via 10.40.250.3, 00:12:34, GigabitEthernet0/0\nO        10.40.50.0/24 [110/2] via 10.40.250.4, 00:12:34, GigabitEthernet0/0\nO        10.40.60.0/25 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0\nO        10.40.60.128/25 [110/2] via 10.40.250.3, 00:12:34, GigabitEthernet0/0\nC        10.40.250.0/24 is directly connected, GigabitEthernet0/0\nL        10.40.250.1/32 is directly connected, GigabitEthernet0/0\n      203.0.113.0/24 is variably subnetted, 2 subnets, 2 masks\nC        203.0.113.0/30 is directly connected, GigabitEthernet0/1\nL        203.0.113.2/32 is directly connected, GigabitEthernet0/1",
 o:[
  {t:"10.40.250.3",ok:true,x:"10.40.60.128/25 covers .128 to .255, so it contains .200. It is the longest (most specific) matching prefix, so its next hop, 10.40.250.3 (DIST-2), is used."},
  {t:"10.40.250.4",ok:false,x:"The static 10.40.0.0/16 also matches, but only with 16 bits. Its AD of 1 never competes with the /25: AD only breaks ties between routes to the same prefix and length."},
  {t:"10.40.250.2",ok:false,x:"10.40.60.0/25 covers only 10.40.60.0 to .127. Address .200 falls in the other half of the /24, the 10.40.60.128/25 subnet."},
  {t:"203.0.113.1",ok:false,x:"The default route is used only when nothing more specific matches. Here a /16 and a /25 both match, so the /0 is never consulted."}
 ],
 w:"Longest prefix match first. Administrative distance and metric only choose between candidates for the exact same prefix and mask."},
{id:"a053",obj:"4.5",d:4,cat:"mon",t:"mc",
 q:"Refer to the exhibit. DIST-2 has logging host 10.40.50.30 and logging trap warnings configured. It generates the four messages shown, in this order. Which messages does the NOC syslog server receive?",
 ex:"*Oct  3 08:14:02: %LINK-3-UPDOWN: Interface GigabitEthernet0/0,\n  changed state to down\n*Oct  3 08:14:03: %LINEPROTO-5-UPDOWN: Line protocol on Interface\n  GigabitEthernet0/0, changed state to down\n*Oct  3 08:14:03: %OSPF-5-ADJCHG: Process 1, Nbr 10.40.255.2 on\n  GigabitEthernet0/0 from FULL to DOWN, Neighbor Down: Interface down\n  or detached\n*Oct  3 08:20:11: %SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin]\n  [Source: 10.40.20.77] [localport: 22] [Reason: Login Authentication\n  Failed] at 08:20:11 UTC Sat Oct 3 2026",
 o:[
  {t:"Only the LINK-3 and SEC_LOGIN-4 messages",ok:true,x:"logging trap warnings sends severity 4 (warnings) and every more severe level (0-3). LINK-3 is error and SEC_LOGIN-4 is warning, so both go. The two severity 5 (notifications) messages stay local."},
  {t:"Only the LINK-3 message",ok:false,x:"This treats warnings as 'more severe than 4'. The configured level is included, so severity 4 messages such as SEC_LOGIN-4 are sent too."},
  {t:"All four messages",ok:false,x:"Notifications (5) are less severe than warnings (4). To send LINEPROTO-5 and OSPF-5 the trap level would have to be notifications or lower in severity."},
  {t:"Only the LINEPROTO-5 and OSPF-5 messages",ok:false,x:"This reverses the scale. Lower numbers are more severe; a trap level passes its own number and every lower number, not the higher ones."}
 ],
 w:"Severity: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging. A logging level sends that number and everything below it."},
{id:"a054",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"Refer to the exhibit. The ACL is applied with ip access-group SRV-PROTECT out on CORE-1 Gi0/1, the interface facing the server farm. Staff PC 10.40.20.44 opens an SSH session to 10.40.50.20 and then sends a DNS query over UDP to 10.40.50.53. What is the result?",
 ex:"CORE-1# show access-lists SRV-PROTECT\nExtended IP access list SRV-PROTECT\n    10 permit tcp 10.40.20.0 0.0.0.255 host 10.40.50.20 eq 443 (1832 matches)\n    20 permit udp any host 10.40.50.53 eq domain (912 matches)\n    30 deny ip 10.40.20.0 0.0.0.255 10.40.50.0 0.0.0.255 (57 matches)\n    40 permit ip any any (40210 matches)",
 o:[
  {t:"The SSH session is denied by line 30 and the DNS query is permitted by line 20",ok:true,x:"SSH is TCP 22, so line 10 (port 443 only) and line 20 (UDP) miss and line 30 denies it. The DNS query is UDP 53 to .53, which line 20 permits before line 30 is ever checked."},
  {t:"Both are denied by line 30",ok:false,x:"ACLs stop at the first match. The DNS query matches line 20 first, so line 30 never sees it."},
  {t:"Both are permitted by line 40",ok:false,x:"Line 40 is reached only by traffic that matched nothing above it. The SSH session matches the deny in line 30 first."},
  {t:"The SSH session is permitted by line 10 and the DNS query by line 20",ok:false,x:"Line 10 permits only TCP destination port 443 (HTTPS) to 10.40.50.20. SSH uses port 22 and does not match it."}
 ],
 w:"Read an ACL top-down and stop at the first matching line. Check protocol, source, destination and port; eq domain is how IOS displays port 53."},
{id:"a055",obj:"3.3.d",d:3,cat:"static",t:"mc",
 q:"Refer to the exhibit. EDGE-1 gets a second internet circuit on Gi0/2 (198.51.100.2/30) to ISP-B, whose router is 198.51.100.1. ISP-B must carry traffic only when the ISP-A default route is gone from the routing table. Which command meets the requirement?",
 ex:"EDGE-1# show running-config | include ip route\nip route 0.0.0.0 0.0.0.0 203.0.113.1\n\nEDGE-1# show ip interface brief | include Gigabit\nGigabitEthernet0/0     10.40.250.1     YES manual up                    up\nGigabitEthernet0/1     203.0.113.2     YES manual up                    up\nGigabitEthernet0/2     198.51.100.2    YES manual up                    up",
 o:[
  {t:"ip route 0.0.0.0 0.0.0.0 198.51.100.1 5",ok:true,x:"AD 5 is worse than the primary's AD of 1, so this route stays out of the table until the ISP-A route is removed (for example when Gi0/1 goes down). That is a floating static route."},
  {t:"ip route 0.0.0.0 0.0.0.0 198.51.100.1",ok:false,x:"Without a distance the route gets AD 1, the same as the ISP-A route. Both defaults would be installed and traffic would be shared across both ISPs."},
  {t:"ip route 0.0.0.0 0.0.0.0 198.51.100.1 255",ok:false,x:"AD 255 means the route is never trusted, so it is never installed, even after the ISP-A route disappears. The backup would never work."},
  {t:"ip route 0.0.0.0 255.255.255.255 198.51.100.1 5",ok:false,x:"A 255.255.255.255 mask describes a host route for the single address 0.0.0.0, not a default route that matches every destination."}
 ],
 w:"Floating static = same prefix, higher AD than the primary. It only takes over when the primary leaves the table (interface down or next hop lost), not when the ISP fails beyond the link."},
{id:"a056",obj:"3.4.c",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit, captured on CORE-1. Router IDs: EDGE-1 10.40.255.1, DIST-1 10.40.255.2, DIST-2 10.40.255.3, CORE-1 10.40.255.4. DIST-1 is reloaded for a software upgrade and rejoins the transit segment about five minutes later. No configuration is changed. After all adjacencies are stable again, which roles exist on 10.40.250.0/24?",
 ex:"CORE-1# show ip ospf neighbor\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.40.255.1       1   2WAY/DROTHER    00:00:32    10.40.250.1     GigabitEthernet0/0\n10.40.255.2     200   FULL/DR         00:00:32    10.40.250.2     GigabitEthernet0/0\n10.40.255.3     150   FULL/BDR        00:00:32    10.40.250.3     GigabitEthernet0/0\n\nCORE-1# show running-config interface g0/0 | include priority\n ip ospf priority 0",
 o:[
  {t:"DIST-2 is DR, EDGE-1 is BDR, and DIST-1 is a DROTHER",ok:true,x:"When DIST-1 died, BDR DIST-2 was promoted to DR and a new BDR was elected from the eligible routers: EDGE-1 (priority 1). CORE-1 cannot serve at priority 0. DR/BDR roles are not preemptive, so DIST-1 returns as a DROTHER."},
  {t:"DIST-1 is DR again and DIST-2 is BDR",ok:false,x:"This assumes OSPF preempts. A returning router with a higher priority does not take over an existing DR or BDR; it waits for the next election."},
  {t:"DIST-2 is DR and DIST-1 is BDR",ok:false,x:"The BDR role did not stay empty while DIST-1 was down. EDGE-1 was elected BDR as soon as DIST-2 was promoted, and it keeps the role."},
  {t:"DIST-2 is DR and CORE-1 is BDR",ok:false,x:"CORE-1 has the highest router ID of the remaining routers, but ip ospf priority 0 makes it ineligible. Router ID only breaks ties between eligible routers."}
 ],
 w:"DR election: highest priority, then highest router ID; priority 0 never serves. The BDR is promoted when the DR fails, and nobody preempts a DR or BDR that is already in place."},
{id:"a057",obj:"4.6",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. Staff PCs in VLAN 20 get 169.254.x.x addresses. The campus DHCP server, 10.40.50.5, has an active scope for 10.40.20.0/24 and is reachable from DIST-1. Addresses must come from that server. Which configuration fixes the problem?",
 ex:"DIST-1# show running-config interface vlan 20\ninterface Vlan20\n description STAFF\n ip address 10.40.20.2 255.255.255.0\n standby 20 ip 10.40.20.1\n standby 20 priority 110\n standby 20 preempt\nend\n\nDIST-1# show ip interface vlan 20 | include Helper\n  Helper address is not set",
 o:[
  {t:"Add ip helper-address 10.40.50.5 under interface Vlan20",ok:true,x:"DHCPDISCOVER is a broadcast and routers do not forward broadcasts. The helper on the interface that receives the client broadcasts relays them as unicast to 10.40.50.5, with Vlan20's address as the gateway address so the server picks the right scope."},
  {t:"Add ip helper-address 10.40.50.5 under the uplink interface that faces the server farm",ok:false,x:"The relay agent must be configured where the client broadcasts arrive. The uplink never receives the DHCPDISCOVER, so nothing would be relayed."},
  {t:"Add ip address dhcp under interface Vlan20",ok:false,x:"That makes the SVI itself a DHCP client and removes its static address and HSRP gateway role. It does nothing for the PCs."},
  {t:"Create ip dhcp pool STAFF on DIST-1 with network 10.40.20.0 /24",ok:false,x:"A local pool would hand out addresses, but the requirement is that leases come from the central server. It would also split lease records across two servers."}
 ],
 w:"DHCP relay: ip helper-address <server> on the client-facing L3 interface (SVI or subinterface). Configure it on both HSRP peers so relay survives a failover."},
{id:"a058",obj:"5.4",d:5,cat:"secbase",t:"ms",pick:2,
 q:"The campus is adding multifactor authentication for administrators who log in to CORE-1 and the wireless controller. Which two login methods qualify as MFA? (Choose two.)",
 o:[
  {t:"A password plus a one-time code from an authenticator app on the admin's phone",ok:true,x:"Something you know (password) plus something you have (the phone generating the code): two different factor types."},
  {t:"A smart card that holds the admin's certificate, unlocked with a PIN",ok:true,x:"The card and its certificate are something you have; the PIN is something you know. Two categories, so it is MFA."},
  {t:"A password plus the answers to two security questions",ok:false,x:"Every element is something you know. Adding more knowledge checks makes it multi-step, not multifactor."},
  {t:"A 20-character password that expires every 60 days",ok:false,x:"Length and expiry strengthen one factor. It is still a single knowledge factor."},
  {t:"A fingerprint scan repeated on two different readers",ok:false,x:"Both scans are something you are. Repeating the same factor type is not MFA."}
 ],
 w:"MFA = at least two different categories: know (password, PIN), have (phone token, smart card, certificate), are (biometrics). Two of the same category is not MFA."},
{id:"a059",obj:"3.4.a",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. CORE-1 was re-addressed during a maintenance window. It can ping DIST-1 at 10.40.250.2, but it no longer has any OSPF neighbors on Gi0/0. What is the cause?",
 ex:"DIST-1# show ip ospf interface g0/0\nGigabitEthernet0/0 is up, line protocol is up\n  Internet Address 10.40.250.2/24, Area 0, Attached via Network Statement\n  Process ID 1, Router ID 10.40.255.2, Network Type BROADCAST, Cost: 1\n  Transmit Delay is 1 sec, State DR, Priority 200\n  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5\n\nCORE-1# show ip ospf interface g0/0\nGigabitEthernet0/0 is up, line protocol is up\n  Internet Address 10.40.250.4/25, Area 0, Attached via Network Statement\n  Process ID 10, Router ID 10.40.255.4, Network Type BROADCAST, Cost: 1\n  Transmit Delay is 1 sec, State DROTHER, Priority 0\n  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5",
 o:[
  {t:"The subnet masks differ (/24 and /25), so each router rejects the other's hellos",ok:true,x:"On a broadcast network the hello carries the interface mask, and neighbors must agree on it. 10.40.250.2 still falls inside CORE-1's /25, which is why ping works while OSPF does not."},
  {t:"The OSPF process IDs differ (1 and 10)",ok:false,x:"The process ID is locally significant and is not carried in hellos. Routers with different process IDs form adjacencies normally."},
  {t:"CORE-1 has priority 0, so it cannot form adjacencies",ok:false,x:"Priority 0 only keeps CORE-1 out of the DR/BDR election. It still forms FULL adjacencies with the DR and BDR."},
  {t:"CORE-1's router ID is not inside the 10.40.250.0 subnet",ok:false,x:"A router ID is just a unique 32-bit identifier. It does not need to belong to any interface subnet."}
 ],
 w:"For an OSPF adjacency, these must match: area, subnet and mask, hello/dead timers, authentication, stub flags (and MTU to get past EXSTART). Process ID and priority do not need to match."},
{id:"a060",obj:"4.7",d:4,cat:"qos",t:"mc",
 q:"EDGE-1's 1-Gb/s link to ISP-A is contracted at a 300-Mb/s CIR, and ISP-A drops everything above that rate. Off-site backup jobs burst far above 300 Mb/s and the resulting drops cause gaps in voice calls. Which QoS tool should EDGE-1 apply outbound on Gi0/1 to stay within the CIR while queuing excess bursts instead of dropping them?",
 o:[
  {t:"Shaping",ok:true,x:"A shaper buffers traffic that exceeds the configured rate and releases it at the CIR. It smooths bursts so the provider's policer never sees excess traffic."},
  {t:"Policing",ok:false,x:"A policer drops or re-marks traffic that exceeds the rate with no buffering. That is what ISP-A already does, and it is what causes the drops."},
  {t:"Classification and marking",ok:false,x:"Classification and marking identify traffic and set DSCP values. They do not limit the sending rate, so bursts would still exceed the CIR."},
  {t:"Weighted random early detection (WRED)",ok:false,x:"WRED drops packets early as a queue fills, to make TCP senders slow down. It does not hold traffic to a configured rate."}
 ],
 w:"Shaping buffers excess traffic (adds delay, avoids drops) and is applied outbound toward a slower contract. Policing drops or re-marks excess traffic and is typical at the provider's ingress."},
{id:"a061",obj:"3.3.d",d:3,cat:"static",t:"mc",
 q:"Refer to the exhibit. DIST-2 has a 1.544-Mb/s serial link to CORE-1 that should carry server-farm traffic only if the OSPF path over Gi0/0 fails. An engineer added ip route 10.40.50.0 255.255.255.0 10.40.249.1 100. Gi0/0 and all OSPF neighbors are up, yet users complain that the servers are slow. Which change fixes the issue?",
 ex:"DIST-2# show ip route\nCodes: L - local, C - connected, S - static, O - OSPF\n\nGateway of last resort is not set\n\n      10.0.0.0/8 is variably subnetted, 10 subnets, 4 masks\nC        10.40.40.0/24 is directly connected, GigabitEthernet0/1\nL        10.40.40.3/32 is directly connected, GigabitEthernet0/1\nS        10.40.50.0/24 [100/0] via 10.40.249.1\nO        10.40.60.0/25 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0\nC        10.40.60.128/25 is directly connected, GigabitEthernet0/2\nL        10.40.60.129/32 is directly connected, GigabitEthernet0/2\nC        10.40.249.0/30 is directly connected, Serial0/1/0\nL        10.40.249.2/32 is directly connected, Serial0/1/0\nC        10.40.250.0/24 is directly connected, GigabitEthernet0/0\nL        10.40.250.3/32 is directly connected, GigabitEthernet0/0",
 o:[
  {t:"Configure the static route with an administrative distance above 110, such as 130",ok:true,x:"AD 100 beats OSPF's 110, so the static route over the slow serial link is installed and the OSPF route is hidden. With AD 130 the OSPF route wins while it exists and the static floats in only when it disappears."},
  {t:"Configure the static route with administrative distance 1",ok:false,x:"AD 1 makes the static route even more preferred. The serial link would carry server traffic permanently."},
  {t:"Set ip ospf cost 1 on DIST-2 Gi0/0",ok:false,x:"Gi0/0 already has cost 1, and OSPF cost only compares OSPF paths with each other. It cannot beat a route from a source with a lower AD."},
  {t:"Add the serial link to OSPF area 0",ok:false,x:"OSPF would then prefer the Gigabit path (cost 2 versus 65), but the static route at AD 100 would still beat any OSPF route for 10.40.50.0/24."}
 ],
 w:"A floating static that backs up a dynamic route needs an AD higher than that protocol: above 110 for OSPF, above 90 for EIGRP. Check the [AD/metric] in show ip route."},
{id:"a062",obj:"5.1",d:5,cat:"secbase",t:"mc",
 q:"A vendor advisory says the HTTPS management service in the campus controller firmware accepts crafted requests that skip the login check. Two days later a public script appears that sends those requests automatically. In security terms, what is the script?",
 o:[
  {t:"An exploit",ok:true,x:"An exploit is the tool or technique that takes advantage of a weakness. The script turns the flaw into working unauthorized access."},
  {t:"A vulnerability",ok:false,x:"The vulnerability is the flaw in the firmware itself (the skipped login check). It existed before the script was written."},
  {t:"A threat",ok:false,x:"A threat is a potential danger, such as an attacker who might use the flaw. The script is the means of attack, not the danger itself."},
  {t:"A mitigation",ok:false,x:"Mitigations reduce risk: patching, or limiting HTTPS management to the NOC subnet. The script increases risk."}
 ],
 w:"Vulnerability = the weakness. Exploit = the code or technique that uses it. Threat = who or what could use it. Mitigation = the control that reduces the risk."},
{id:"a063",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"Refer to the exhibit. DIST-1 is supposed to be the active gateway for VLAN 30. It was reloaded overnight, and this morning DIST-2 is still forwarding VLAN 30 traffic. What must be configured so that DIST-1 takes back the active role whenever it is available?",
 ex:"DIST-1# show standby brief\n                     P indicates configured to preempt.\n                     |\nInterface   Grp  Pri P State   Active          Standby         Virtual IP\nVl30        30   110   Standby 10.40.30.3      local           10.40.30.1\n\nDIST-2# show standby brief\n                     P indicates configured to preempt.\n                     |\nInterface   Grp  Pri P State   Active          Standby         Virtual IP\nVl30        30   100   Active  local           10.40.30.2      10.40.30.1",
 o:[
  {t:"standby 30 preempt on DIST-1's Vlan30 interface",ok:true,x:"HSRP preemption is off by default, so a higher-priority router that comes back waits as standby. With preempt, DIST-1 (110) takes the active role from DIST-2 (100) as soon as it is ready."},
  {t:"standby 30 priority 120 on DIST-1's Vlan30 interface",ok:false,x:"DIST-1 already has the higher priority. Without preempt, raising it further still leaves DIST-1 waiting as standby."},
  {t:"standby 30 preempt on DIST-2's Vlan30 interface",ok:false,x:"Preempt lets the router it is configured on take over. DIST-2 has the lower priority, so this would not move the active role to DIST-1."},
  {t:"standby version 2 on both switches",ok:false,x:"HSRPv2 adds more groups, millisecond timers and IPv6 support. It does not turn on preemption."}
 ],
 w:"HSRP: default priority 100, highest wins, and preempt is OFF by default. Without standby N preempt, the router that is active keeps the role until it fails."},
{id:"a064",obj:"3.2.c",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. Which route to the lab LAN 10.40.70.0/24 does DIST-1 install?",
 ex:"Topology (all routers OSPF area 0, default reference bandwidth,\nno ip ospf cost commands)\n\nLab LAN 10.40.70.0/24 is on BLDG-7 Gi0/1 (1 Gb/s)\n\nPath A: DIST-1 Se0/1/0 (1.544 Mb/s) --- BLDG-7\nPath B: DIST-1 Gi0/0 (1 Gb/s) --- CORE-1\n        CORE-1 Fa0/3 (100 Mb/s) --- BLDG-7",
 o:[
  {t:"The route through CORE-1, with a metric of 3",ok:true,x:"Cost = 100 Mb/s / interface bandwidth, minimum 1. Path B: Gi0/0 (1) + Fa0/3 (1) + BLDG-7 Gi0/1 (1) = 3. Path A: serial (100/1.544 = 64) + 1 = 65. OSPF installs only the lowest-cost path."},
  {t:"The route through the serial link, with a metric of 2",ok:false,x:"OSPF does not count hops. The serial link costs 64 on its own, so path A totals 65."},
  {t:"Both routes, load-shared, because Fast Ethernet and Gigabit Ethernet both cost 1",ok:false,x:"Fast Ethernet and Gigabit Ethernet do both cost 1 with the default reference, but path A crosses a serial link costing 64. The totals (65 and 3) are not equal."},
  {t:"The route through CORE-1, with a metric of 12",ok:false,x:"This uses 10 for Fast Ethernet. With the 100-Mb/s reference bandwidth, Fast Ethernet costs 1; 19 and 10 are spanning-tree or other-reference values."}
 ],
 w:"OSPF metric = sum of outgoing interface costs along the path plus the destination LAN's cost; cost = 100 Mb/s / bandwidth (min 1). T1 = 64, Fast and Gigabit Ethernet = 1 by default."},
{id:"a065",obj:"4.8",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. The NOC cannot open SSH sessions to CORE-1. Which command must be entered next on CORE-1?",
 ex:"CORE-1# show running-config | include hostname|domain|username\nhostname CORE-1\nip domain name campus.example\nusername netadmin privilege 15 secret 5 $1$kQ3x$Xr0Tq9mWb2Lr1nVf8sYcZ.\n\nCORE-1# show running-config | section line vty\nline vty 0 4\n login local\n transport input ssh\n\nCORE-1# show ip ssh\nSSH Disabled - version 1.99\n%Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).\nAuthentication methods:publickey,keyboard-interactive,password\nAuthentication timeout: 120 secs; Authentication retries: 3",
 o:[
  {t:"crypto key generate rsa modulus 2048",ok:true,x:"The hostname, domain name, local user and vty lines are ready, but SSH stays disabled until an RSA key pair exists. Generating a 2048-bit key enables SSH (768 bits or more is needed for SSHv2)."},
  {t:"ip ssh version 2",ok:false,x:"Version 2 needs RSA keys before it can run. Without keys, SSH remains disabled whatever version is set."},
  {t:"transport input telnet ssh under line vty 0 4",ok:false,x:"The vty lines already accept SSH. Adding Telnet would allow cleartext logins and still would not enable SSH without keys."},
  {t:"login under line vty 0 4",ok:false,x:"login would make the lines use a line password instead of the local user database. Authentication is not the problem; SSH is disabled."}
 ],
 w:"SSH setup: hostname (not Router), ip domain name, crypto key generate rsa (768+ bits for v2), local user, line vty with login local and transport input ssh. show ip ssh confirms it is enabled."},
{id:"a066",obj:"5.7",d:5,cat:"l2sec",t:"mc",
 q:"Refer to the exhibit. A staff member plugged a small unmanaged switch into the jack on ACC-4 Fa0/7 so a second laptop could share it, and both laptops lost connectivity. The second laptop has been removed. What should the technician do to restore the port with the least change to its security settings?",
 ex:"ACC-4# show port-security interface fa0/7\nPort Security              : Enabled\nPort Status                : Secure-shutdown\nViolation Mode             : Shutdown\nAging Time                 : 0 mins\nAging Type                 : Absolute\nSecureStatic Address Aging : Disabled\nMaximum MAC Addresses      : 1\nTotal MAC Addresses        : 1\nConfigured MAC Addresses   : 0\nSticky MAC Addresses       : 1\nLast Source Address:Vlan   : 3c52.82a1.9e04:20\nSecurity Violation Count   : 1",
 o:[
  {t:"Enter shutdown and then no shutdown on Fa0/7",ok:true,x:"The second MAC address exceeded the maximum of 1 and the shutdown violation mode put the port in err-disabled state. Bouncing the interface clears it; the original laptop's sticky MAC is still allowed."},
  {t:"Enter clear mac address-table dynamic interface fa0/7",ok:false,x:"The port is err-disabled, not just holding a stale entry. Clearing the MAC table does not bring an err-disabled interface back up."},
  {t:"Set switchport port-security maximum 2 on Fa0/7",ok:false,x:"That changes the security policy so two devices are allowed, which is not the least change. The port would also stay err-disabled until it is bounced."},
  {t:"Wait for the secure address aging timer to expire",ok:false,x:"Aging is 0 (disabled), and aging removes secure addresses; it never recovers an err-disabled port. Only a bounce or errdisable recovery does that."}
 ],
 w:"Port security in shutdown mode = err-disabled port (Secure-shutdown). Recover with shutdown / no shutdown, or errdisable recovery cause psecure-violation. Restrict and protect drop frames but leave the port up."},
{id:"a067",obj:"3.2.b",d:3,cat:"rtable",t:"order",
 q:"Drag the route sources into order from the lowest default administrative distance (most trusted) to the highest, as IOS uses them when the same prefix is learned from several sources.",
 pool:["OSPF","Static route","iBGP","Connected interface","RIPv2","eBGP","IS-IS","EIGRP (internal)"],
 answer:[3,1,5,7,0,6,4,2],
 x:"Connected 0, static 1, eBGP 20, internal EIGRP 90, OSPF 110, IS-IS 115, RIP 120, iBGP 200. When two sources offer the exact same prefix and mask, the one with the lowest AD is installed; metrics are compared only within one source.",
 w:"Learn the AD ladder cold: 0 connected, 1 static, 20 eBGP, 90 EIGRP, 110 OSPF, 115 IS-IS, 120 RIP, 170 external EIGRP, 200 iBGP, 255 unusable."},
{id:"a068",obj:"3.4.d",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. DIST-2 was built by pasting a copy of DIST-1's configuration and editing the addresses. DIST-1 and DIST-2 cannot keep a stable adjacency on the transit segment. Which action fixes the problem immediately?",
 ex:"*Oct  3 09:02:41: %OSPF-4-DUP_RTRID_NBR: OSPF detected duplicate router-id\n  10.40.255.2 from 10.40.250.2 on interface GigabitEthernet0/0\n\nDIST-2# show running-config | section router ospf\nrouter ospf 1\n router-id 10.40.255.2\n passive-interface GigabitEthernet0/1\n network 10.40.40.0 0.0.0.255 area 0\n network 10.40.250.0 0.0.0.255 area 0",
 o:[
  {t:"On DIST-2, enter router-id 10.40.255.3 under router ospf 1 and then clear ip ospf process",ok:true,x:"Router IDs must be unique. A new router-id on a running process only takes effect after the process restarts (IOS asks for clear ip ospf process or a reload), so both steps are needed."},
  {t:"On DIST-2, enter router-id 10.40.255.3 under router ospf 1 and do nothing else",ok:false,x:"IOS accepts the command but keeps using 10.40.255.2 until the OSPF process is cleared or the router reloads, so the duplicate remains for now."},
  {t:"On DIST-2, create Loopback0 with 10.40.255.3/32 and then clear ip ospf process",ok:false,x:"A manually configured router-id always beats loopback addresses. DIST-2 would still choose 10.40.255.2."},
  {t:"On DIST-2, change the process to router ospf 2",ok:false,x:"The process ID is local and is not part of the router ID. The copied router-id command would be re-entered under the new process with the same duplicate value."}
 ],
 w:"Router ID order: router-id command, then highest loopback IP, then highest IP on an up physical interface. A change on a running process needs clear ip ospf process (or a reload)."},
{id:"a069",obj:"5.3",d:5,cat:"secbase",t:"ms",pick:2,
 q:"Refer to the exhibit. Which two statements about ACC-4's device access configuration are true? (Choose two.)",
 ex:"ACC-4# show running-config | include password|secret|line|login\nno service password-encryption\nenable secret 5 $1$Gp7v$3mXq1rTzKc8W0dLw9eQaN/\nenable password Campus2026\nline con 0\n password C0nsole!\n login\nline vty 0 4\n password Vty#Acc4\n login",
 o:[
  {t:"Typing Campus2026 at the enable prompt does not give privileged EXEC access",ok:true,x:"When both are configured, the enable secret is the only one checked. The enable password is ignored."},
  {t:"The console and vty passwords are stored in clear text in the configuration",ok:true,x:"service password-encryption is off, so line passwords are shown and saved as plain text. Anyone who sees the config or a backup can read them."},
  {t:"Entering service password-encryption converts the enable secret to a type 7 password",ok:false,x:"The secret is already a type 5 hash and is left alone. service password-encryption only applies weak type 7 to clear-text passwords such as the line passwords."},
  {t:"Telnet and SSH users are checked against a local username database",ok:false,x:"login (without local) makes the vty lines use the line password Vty#Acc4. Checking local usernames would need login local."},
  {t:"Removing login under line con 0 makes the console prompt for C0nsole!",ok:false,x:"It is the other way round: without login the console never prompts, so anyone with a console cable gets in."}
 ],
 w:"enable secret beats enable password. service password-encryption = reversible type 7 for clear-text passwords only. login = line password; login local = username database."},
{id:"a070",obj:"3.1",d:3,cat:"rtable",t:"ms",pick:2,
 q:"Refer to the exhibit. Which two statements about DIST-2's routing table are true? (Choose two.)",
 ex:"DIST-2# show ip route\nCodes: L - local, C - connected, S - static, O - OSPF\n       E2 - OSPF external type 2, * - candidate default\n\nGateway of last resort is 10.40.250.1 to network 0.0.0.0\n\nO*E2  0.0.0.0/0 [110/1] via 10.40.250.1, 00:12:34, GigabitEthernet0/0\n      10.0.0.0/8 is variably subnetted, 10 subnets, 4 masks\nC        10.40.40.0/24 is directly connected, GigabitEthernet0/1\nL        10.40.40.3/32 is directly connected, GigabitEthernet0/1\nO        10.40.50.0/24 [110/2] via 10.40.250.4, 00:12:34, GigabitEthernet0/0\nO        10.40.60.0/25 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0\nC        10.40.60.128/25 is directly connected, GigabitEthernet0/2\nL        10.40.60.129/32 is directly connected, GigabitEthernet0/2\nC        10.40.249.0/30 is directly connected, Serial0/1/0\nL        10.40.249.2/32 is directly connected, Serial0/1/0\nC        10.40.250.0/24 is directly connected, GigabitEthernet0/0\nL        10.40.250.3/32 is directly connected, GigabitEthernet0/0",
 o:[
  {t:"The default route is an OSPF external type 2 route whose next hop is 10.40.250.1",ok:true,x:"O*E2 marks an OSPF external type 2 route that is also the candidate default. EDGE-1 (10.40.250.1) injects it, typically with default-information originate."},
  {t:"A packet to 10.40.50.25 is sent to 10.40.250.4 and the route has an OSPF cost of 2",ok:true,x:"10.40.50.25 falls in 10.40.50.0/24, learned by OSPF via 10.40.250.4. In [110/2], 110 is the administrative distance and 2 is the metric (cost)."},
  {t:"10.40.60.0/25 has an administrative distance of 2",ok:false,x:"In [110/2] the first number is the AD (110 for OSPF) and the second is the metric. The AD is 110."},
  {t:"The L routes are /32 host routes for PCs attached to DIST-2's subnets",ok:false,x:"L (local) entries are DIST-2's own interface addresses, installed so the router can recognize traffic addressed to itself. They are not learned client hosts."},
  {t:"A packet to 10.40.60.140 is forwarded to 10.40.250.2",ok:false,x:"10.40.60.140 is in 10.40.60.128/25, which is directly connected on Gi0/2. DIST-2 delivers it locally; 10.40.250.2 is the next hop only for .0 to .127."},
  {t:"A packet to 198.51.100.7 is dropped because no route matches it",ok:false,x:"The gateway of last resort is set. Any destination without a more specific match uses the 0.0.0.0/0 route via 10.40.250.1."}
 ],
 w:"Read a route as code, prefix/length, [AD/metric], next hop, age, exit interface. O*E2 = OSPF external default; L = the router's own address; C = the connected subnet."},
{id:"a071",obj:"4.2",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. DIST-1 is configured with ntp server 10.40.50.123. Which statement about DIST-1 is true?",
 ex:"DIST-1# show ntp associations\n\n  address         ref clock       st   when   poll reach  delay  offset   disp\n*~10.40.50.123    192.0.2.10      2      38     64   377   1.204   0.311   1.9\n * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured",
 o:[
  {t:"It is synchronized to 10.40.50.123 and runs at stratum 3",ok:true,x:"The asterisk marks the system peer DIST-1 is synchronized to. That server is stratum 2, so DIST-1 is one level further from the reference clock: stratum 3."},
  {t:"It is synchronized to 10.40.50.123 and runs at stratum 2",ok:false,x:"The st column shows the server's stratum. A client is always one stratum higher (worse) than the server it syncs from."},
  {t:"It is acting as the NTP server for 10.40.50.123",ok:false,x:"ntp server makes DIST-1 a client of 10.40.50.123. The tilde shows the association was configured locally, and the asterisk shows DIST-1 is following that server."},
  {t:"It has not synchronized yet because reach is not 1",ok:false,x:"Reach is an octal register of the last eight polls. 377 means all eight were answered, the best possible value."}
 ],
 w:"show ntp associations: * = sys.peer (synced), ~ = configured, st = the server's stratum (yours is +1), reach 377 = last 8 polls answered. ntp server = client mode; ntp master = act as an authoritative source."},
{id:"a072",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"Hosts in VLAN 20 use 10.40.20.1 as their default gateway. That address is the virtual IP of HSRP version 1 group 20, shared by DIST-1 and DIST-2. Which MAC address do the hosts store in their ARP caches for 10.40.20.1?",
 o:[
  {t:"0000.0c07.ac14",ok:true,x:"HSRPv1 virtual MACs are 0000.0c07.acXX, where XX is the group number in hex. Group 20 is 0x14."},
  {t:"0000.0c07.ac20",ok:false,x:"The group number is written in hexadecimal. 20 decimal is 14 hex; ac20 would be group 32."},
  {t:"0000.5e00.0114",ok:false,x:"0000.5e00.01XX is the VRRP virtual MAC format. VLAN 20 runs HSRP."},
  {t:"The burned-in MAC of the Vlan20 SVI on whichever switch is active",ok:false,x:"Hosts learn the virtual MAC, not a physical one. That is what lets the standby take over without the hosts updating their ARP caches."}
 ],
 w:"Virtual MACs: HSRPv1 0000.0c07.acXX, HSRPv2 0000.0c9f.fXXX, VRRP 0000.5e00.01XX (XX = group in hex). A shared virtual MAC is what makes failover invisible to hosts."},
{id:"a073",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"The lab PCs in VLAN 20 occupy 10.40.20.64 through 10.40.20.127. An ACL entry must match exactly those sources and no others. Which address and wildcard mask should the entry use?",
 o:[
  {t:"10.40.20.64 0.0.0.63",ok:true,x:"64 to 127 is a block of 64 addresses that starts on a multiple of 64 (a /26). The wildcard is 255.255.255.255 - 255.255.255.192 = 0.0.0.63."},
  {t:"10.40.20.64 0.0.0.64",ok:false,x:"A wildcard of 0.0.0.64 lets only the 64 bit vary, so it matches just two addresses: 10.40.20.0 and 10.40.20.64. A contiguous range needs a wildcard one less than a power of two."},
  {t:"10.40.20.64 255.255.255.192",ok:false,x:"That is a subnet mask, not a wildcard. Read as a wildcard it would ignore the first three octets and match far more than the lab range."},
  {t:"10.40.20.0 0.0.0.127",ok:false,x:"This matches .0 to .127, twice the required range. It would include hosts outside the lab."}
 ],
 w:"Wildcard = 255.255.255.255 minus the subnet mask. A block of 64 hosts on a 64 boundary is /26, wildcard 0.0.0.63. 0 bits must match; 1 bits are ignored."},
{id:"a074",obj:"3.4.b",d:3,cat:"ospf",t:"ms",pick:2,
 q:"Refer to the exhibit. DIST-1 and DIST-2 are joined by a dedicated /30 link, and both ends are configured with ip ospf network point-to-point. Which two statements about this link are true? (Choose two.)",
 ex:"DIST-1# show ip ospf neighbor gigabitEthernet 0/3\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.40.255.3       0   FULL/  -        00:00:31    10.40.249.6     GigabitEthernet0/3\n\nDIST-1# show ip ospf interface g0/3 | include Type|State\n  Process ID 1, Router ID 10.40.255.2, Network Type POINT_TO_POINT, Cost: 1\n  Transmit Delay is 1 sec, State POINT_TO_POINT",
 o:[
  {t:"No DR or BDR is elected on this link",ok:true,x:"Point-to-point networks skip the DR/BDR election. The dash after FULL/ shows that the neighbor has no DR or BDR role."},
  {t:"Changing ip ospf priority on either end has no effect on this link",ok:true,x:"Priority is used only in DR/BDR elections. With no election on a point-to-point link, the value is ignored."},
  {t:"The dash in FULL/  - means the adjacency is still forming",ok:false,x:"FULL is the final state: the databases are synchronized. The dash refers only to the missing DR/BDR role."},
  {t:"DIST-2 is a DROTHER on this link because the neighbor table shows its priority as 0",ok:false,x:"IOS lists point-to-point neighbors with Pri 0 because no election takes place. DROTHER exists only on broadcast and NBMA segments that elect a DR; a point-to-point neighbor has no such role."},
  {t:"Both ends must run OSPF process ID 1",ok:false,x:"Process IDs are locally significant and are not compared between neighbors."},
  {t:"Hellos on this link are sent every 30 seconds",ok:false,x:"On Ethernet, broadcast and point-to-point network types both use a 10-second hello and 40-second dead interval. 30/120 is the NBMA default."}
 ],
 w:"ip ospf network point-to-point on a two-router Ethernet link: no DR/BDR election, no wait timer, FULL/  - with Pri 0 in the neighbor table, State POINT_TO_POINT, priority ignored. Both ends must use the same network type."},
{id:"a075",obj:"3.3.a",d:3,cat:"static",t:"mc",
 q:"ISP-A now provides IPv6 on EDGE-1 Gi0/1, and its router gives only its link-local address, FE80::A, as the next hop. ipv6 unicast-routing is already enabled. Which command creates EDGE-1's IPv6 default route?",
 o:[
  {t:"ipv6 route ::/0 GigabitEthernet0/1 FE80::A",ok:true,x:"::/0 is the IPv6 default prefix. Link-local addresses are only unique per link, so a link-local next hop must be paired with the exit interface."},
  {t:"ipv6 route ::/0 FE80::A",ok:false,x:"IOS rejects a link-local next hop without an interface, because FE80::A could exist on any link. The interface tells the router which link to use."},
  {t:"ipv6 route ::/128 GigabitEthernet0/1 FE80::A",ok:false,x:"::/128 is a host route for the unspecified address, not a default route. A default matches every destination only with a /0 prefix."},
  {t:"ip route ::/0 GigabitEthernet0/1 FE80::A",ok:false,x:"ip route takes IPv4 prefixes and masks only. IPv6 static routes use ipv6 route."}
 ],
 w:"IPv6 default: ipv6 route ::/0 <next hop>. With a link-local next hop, add the exit interface. ipv6 unicast-routing must be on for the router to forward IPv6."},
{id:"a076",obj:"4.1",d:4,cat:"nat",t:"mc",
 q:"Refer to the exhibit. Early each morning the first staff members reach the internet, but by 8:30 most new users cannot, although nothing has failed. Which change lets every campus user share the public pool?",
 ex:"EDGE-1# show running-config | include nat|access-list 10\n ip nat inside\n ip nat outside\nip nat pool CAMPUS 203.0.113.17 203.0.113.30 netmask 255.255.255.240\nip nat inside source list 10 pool CAMPUS\naccess-list 10 permit 10.40.0.0 0.0.255.255\n\nEDGE-1# show ip nat statistics | begin Dynamic\nDynamic mappings:\n-- Inside Source\n[Id: 1] access-list 10 pool CAMPUS refcount 14\n pool CAMPUS: netmask 255.255.255.240\n        start 203.0.113.17 end 203.0.113.30\n        type generic, total addresses 14, allocated 14 (100%), misses 37",
 o:[
  {t:"Add overload to the ip nat inside source list 10 pool CAMPUS command",ok:true,x:"Without overload, dynamic NAT maps each inside host to its own pool address. All 14 are allocated and 37 attempts have failed. With overload (PAT) many hosts share each address, told apart by port numbers."},
  {t:"Change access-list 10 to permit 10.40.0.0 0.0.0.255",ok:false,x:"That narrows translation to 10.40.0.0/24, so most campus subnets would lose internet access altogether. The problem is the pool size, not the ACL."},
  {t:"Swap the ip nat inside and ip nat outside interface commands",ok:false,x:"Translations are being created and allocated, so inside and outside are correct. Swapping them would break NAT for everyone."},
  {t:"Change the pool netmask to 255.255.255.0",ok:false,x:"The pool still contains only the addresses from start to end (.17 to .30). The netmask is a sanity check on that range and does not add addresses."}
 ],
 w:"Dynamic NAT from a pool = one public address per inside host; when allocation hits 100% new hosts fail (misses climb). Add overload for PAT. ACL = who gets translated; pool = to what."},
{id:"a077",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"Refer to the exhibit. About 40 seconds after ACL 120 was applied inbound on DIST-1 Gi0/0, every OSPF adjacency on that interface went down. Which entry, added to ACL 120, restores the adjacencies and keeps the other restrictions?",
 ex:"DIST-1# show running-config interface g0/0\ninterface GigabitEthernet0/0\n ip address 10.40.250.2 255.255.255.0\n ip access-group 120 in\n ip ospf priority 200\nend\nDIST-1# show access-lists 120\nExtended IP access list 120\n    10 permit tcp any 10.40.20.0 0.0.0.255 established (4127 matches)\n    20 permit udp any eq domain 10.40.20.0 0.0.0.255 (388 matches)\n    30 permit icmp any 10.40.20.0 0.0.0.255 (52 matches)\n\n*Oct  3 10:41:52: %OSPF-5-ADJCHG: Process 1, Nbr 10.40.255.3 on\n  GigabitEthernet0/0 from FULL to DOWN, Neighbor Down: Dead timer expired",
 o:[
  {t:"permit ospf any any",ok:true,x:"OSPF hellos and updates (to 224.0.0.5, 224.0.0.6 and unicast neighbors) are IP protocol 89. No line permits them, so the implicit deny drops them and the dead timer expires. Permitting protocol ospf restores them without opening anything else."},
  {t:"permit udp any any eq 89",ok:false,x:"OSPF runs directly over IP as protocol 89. It does not use UDP, so a UDP port 89 entry matches none of its packets."},
  {t:"permit ip host 224.0.0.5 any",ok:false,x:"224.0.0.5 is the destination of OSPF hellos, not the source. This line would match nothing, and it would also miss unicast OSPF packets."},
  {t:"permit tcp any any eq 179",ok:false,x:"TCP 179 is BGP. OSPF does not use TCP at all."}
 ],
 w:"Every ACL ends with an implicit deny any. An inbound ACL on a routing interface must permit the routing protocol itself: OSPF = IP protocol 89 (permit ospf), EIGRP = 88, BGP = TCP 179."},
{id:"a078",obj:"3.4.a",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. DIST-2 Gi0/2 connects to LIB-R1, a router in the new library building. The adjacency never leaves the state shown. What is the most likely cause?",
 ex:"DIST-2# show ip ospf neighbor gigabitEthernet 0/2\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n10.40.255.8       1   EXCHANGE/DR     00:00:36    10.40.247.2     GigabitEthernet0/2\n\nDIST-2# show interfaces g0/2 | include MTU\n  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,\n\nLIB-R1# show interfaces g0/1 | include MTU\n  MTU 1400 bytes, BW 1000000 Kbit/sec, DLY 10 usec,",
 o:[
  {t:"The interface MTUs do not match, so database description packets are rejected",ok:true,x:"DBD packets carry the interface MTU. LIB-R1 (1400) rejects DIST-2's larger DBDs and stays in EXSTART, while DIST-2 accepts LIB-R1's and sits in EXCHANGE. The database exchange never completes even though hellos are fine."},
  {t:"The two routers are configured in different areas",ok:false,x:"An area mismatch is detected in the hello, so the routers would never list each other as neighbors at all, let alone reach EXCHANGE."},
  {t:"The hello and dead timers do not match",ok:false,x:"Mismatched timers also stop the process at the hello stage. Reaching EXSTART/EXCHANGE proves the hellos were accepted."},
  {t:"LIB-R1's interface is passive",ok:false,x:"A passive interface sends no hellos, so DIST-2 would not see LIB-R1 as a neighbor at all."}
 ],
 w:"Where an adjacency stops tells you why. No neighbor/INIT = hello parameters (area, mask, timers, auth, passive). EXSTART/EXCHANGE = MTU mismatch. 2WAY between DROTHERs = normal."},
{id:"a079",obj:"5.9",d:5,cat:"wsec",t:"mc",
 q:"The staff SSID uses WPA2-Personal with a passphrase. A penetration tester captured a four-way handshake from the parking lot and is running an offline dictionary attack against the passphrase. Which change best defends against this attack without moving to 802.1X?",
 o:[
  {t:"Move the SSID to WPA3-Personal, which uses SAE",ok:true,x:"SAE (Simultaneous Authentication of Equals) replaces the WPA2 PSK handshake. A captured exchange cannot be tested offline against a word list, and SAE adds forward secrecy."},
  {t:"Change the cipher from AES-CCMP to TKIP",ok:false,x:"TKIP is the older, weaker WPA cipher. It does not change how the passphrase is verified and lowers security."},
  {t:"Stop broadcasting the SSID",ok:false,x:"Hidden SSIDs still appear in probe and association frames. The handshake can still be captured and attacked."},
  {t:"Enable MAC address filtering on the WLAN",ok:false,x:"MAC addresses are visible in the air and easy to spoof. Filtering does nothing to protect the passphrase from an offline attack."}
 ],
 w:"WPA2-Personal: PSK + 4-way handshake, open to offline dictionary attacks on weak passphrases. WPA3-Personal: SAE. WPA2/WPA3-Enterprise: 802.1X with a RADIUS server. AES (CCMP/GCMP) beats TKIP."},
{id:"a080",obj:"3.1.g",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. EDGE-1 has a working static default route to ISP-A, but DIST-2 has no gateway of last resort and campus users cannot reach the internet. Which single change gives every OSPF router in the campus a default route?",
 ex:"EDGE-1# show running-config | section router ospf\nrouter ospf 1\n router-id 10.40.255.1\n network 10.40.250.0 0.0.0.255 area 0\n\nEDGE-1# show ip route static | include 0.0.0.0\nS*    0.0.0.0/0 [1/0] via 203.0.113.1\n\nDIST-2# show ip route | begin Gateway\nGateway of last resort is not set\n\n      10.0.0.0/8 is variably subnetted, 10 subnets, 4 masks\nC        10.40.40.0/24 is directly connected, GigabitEthernet0/1\nL        10.40.40.3/32 is directly connected, GigabitEthernet0/1\nO        10.40.50.0/24 [110/2] via 10.40.250.4, 00:12:34, GigabitEthernet0/0\nO        10.40.60.0/25 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0\nC        10.40.60.128/25 is directly connected, GigabitEthernet0/2\nL        10.40.60.129/32 is directly connected, GigabitEthernet0/2\nC        10.40.249.0/30 is directly connected, Serial0/1/0\nL        10.40.249.2/32 is directly connected, Serial0/1/0\nC        10.40.250.0/24 is directly connected, GigabitEthernet0/0\nL        10.40.250.3/32 is directly connected, GigabitEthernet0/0",
 o:[
  {t:"Enter default-information originate under router ospf 1 on EDGE-1",ok:true,x:"EDGE-1 has a default route in its table, but OSPF does not advertise it until told to. default-information originate injects 0.0.0.0/0 as an O*E2 route to every OSPF router."},
  {t:"Enter network 0.0.0.0 255.255.255.255 area 0 under router ospf 1 on EDGE-1",ok:false,x:"A network statement enables OSPF on matching interfaces, here every interface including the ISP link. It does not advertise the static default route."},
  {t:"Enter ip default-gateway 10.40.250.1 on DIST-2",ok:false,x:"ip default-gateway is used only when IP routing is disabled, such as on a Layer 2 switch. A routing device ignores it, and it would fix only DIST-2."},
  {t:"Enter ip route 0.0.0.0 0.0.0.0 10.40.250.1 on DIST-2",ok:false,x:"That would work for DIST-2 alone, but every other router would need its own static default. The requirement is one change that reaches all OSPF routers."}
 ],
 w:"Gateway of last resort = the installed default route. To share an ASBR's static default through OSPF: default-information originate (add always to advertise it even without a default in the table)."},
{id:"a081",obj:"3.4",d:3,cat:"ospf",t:"build",ordered:false,
 q:"BLDG-7 is joining OSPF area 0. Its router ID must be 10.40.255.7. Gi0/0 (10.40.250.7/24) must form adjacencies on the transit segment. The lab LAN on Gi0/1 (10.40.70.1/24) must be advertised but must not send hellos. Drag the commands needed under router ospf 1 into the answer area. Leave the commands that are not needed.",
 pool:["router-id 10.40.255.7","network 10.40.250.0 0.0.0.255 area 0","network 10.40.70.0 0.0.0.255 area 0","passive-interface GigabitEthernet0/1","passive-interface GigabitEthernet0/0","network 10.40.70.0 0.0.0.255 area 1","default-information originate","router-id 10.40.250.7"],
 answer:[0,1,2,3],
 x:"router-id sets the required ID (10.40.250.7 is the interface address, not the requested ID). The two area 0 network statements enable OSPF on Gi0/0 and Gi0/1, which also advertises both subnets. passive-interface Gi0/1 keeps the lab LAN advertised but silent. Making Gi0/0 passive would block the transit adjacencies; area 1 breaks the single-area design; default-information originate belongs on the internet edge router.",
 w:"Single-area OSPF recipe: router-id, network <net> <wildcard> area 0 for each interface, passive-interface for user and server LANs. passive = advertised, but no hellos and no neighbors."},
{id:"a082",obj:"4.3",d:4,cat:"svc",t:"mc",
 q:"Refer to the exhibit. A user in VLAN 20 reports that the intranet is down. Which conclusion is best supported by the output?",
 ex:"C:\\> ping 10.40.50.20\n\nPinging 10.40.50.20 with 32 bytes of data:\nReply from 10.40.50.20: bytes=32 time=1ms TTL=126\nReply from 10.40.50.20: bytes=32 time=1ms TTL=126\n\nC:\\> ping intranet.campus.example\nPing request could not find host intranet.campus.example. Please check\nthe name and try again.",
 o:[
  {t:"The PC cannot resolve the name; check its DNS server setting and the DNS record for the intranet",ok:true,x:"The server answers by IP address across two routed hops (TTL 126), so addressing, the gateway and the path work. Only the name-to-address lookup fails, which is DNS's job."},
  {t:"The PC's default gateway is wrong",ok:false,x:"10.40.50.20 is on another subnet. Replies from it prove the PC is using a working default gateway."},
  {t:"The PC's DHCP lease has expired",ok:false,x:"A PC with an expired lease would fall back to a 169.254.x.x address and could not reach a remote server by IP at all."},
  {t:"An ACL is blocking ICMP between VLAN 20 and the server farm",ok:false,x:"ICMP to 10.40.50.20 succeeds. The failure happens before any packet is sent to the server, when the name cannot be resolved."}
 ],
 w:"Ping by IP works but ping by name fails = DNS (server setting, reachability of UDP 53 or the record). DHCP hands out the DNS server address along with the IP, mask and gateway."},
{id:"a083",obj:"5.10",d:5,cat:"wsec",t:"mc",
 q:"Refer to the exhibit. The Staff-PSK WLAN on WLC-1 is meant to use WPA2 with a shared passphrase. Clients that enter the passphrase fail to connect, and some are prompted for a username and password instead. What must be changed?",
 ex:"WLANs > Edit 'Staff-PSK' > Security > Layer 2\n\n  Layer 2 Security            WPA+WPA2\n  WPA+WPA2 Parameters\n    WPA Policy                [ ]\n    WPA2 Policy               [x]\n    WPA2 Encryption           [x] AES     [ ] TKIP\n  Authentication Key Management\n    802.1X                    [x] Enable\n    PSK                       [ ] Enable\n    PSK Format                ASCII",
 o:[
  {t:"Under Authentication Key Management, disable 802.1X, enable PSK and enter the passphrase",ok:true,x:"The WLAN is set for WPA2-Enterprise (802.1X), so clients are asked for credentials to pass to a RADIUS server. WPA2-Personal needs PSK selected and an ASCII passphrase of 8 to 63 characters."},
  {t:"Enable TKIP alongside AES under WPA2 Encryption",ok:false,x:"The cipher is not the problem. AES is the correct WPA2 cipher; TKIP is legacy and weaker."},
  {t:"Enable WPA Policy in addition to WPA2 Policy",ok:false,x:"That adds legacy WPA support but leaves key management on 802.1X, so clients would still be asked for usernames."},
  {t:"Set Layer 2 Security to None and use web authentication",ok:false,x:"That removes WPA2 encryption entirely and replaces the passphrase with a portal login, which does not meet the requirement."}
 ],
 w:"WLC WPA2-Personal: Layer 2 Security WPA+WPA2, WPA2 Policy with AES, Auth Key Mgmt = PSK (not 802.1X), PSK format ASCII, then the passphrase. 802.1X = Enterprise (RADIUS)."},
{id:"a084",obj:"3.4.d",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. BLDG-7 has no router-id command under router ospf 1. Its configuration was saved and the router was reloaded. Which router ID does OSPF use?",
 ex:"BLDG-7# show ip interface brief | include Ethernet|Loopback\nGigabitEthernet0/0     10.40.250.7     YES manual up                    up\nGigabitEthernet0/1     172.16.99.2     YES manual up                    up\nGigabitEthernet0/2     192.168.70.1    YES manual administratively down down\nLoopback0              10.40.255.7     YES manual up                    up\nLoopback1              10.40.254.70    YES manual up                    up\n\nBLDG-7# show running-config | section router ospf\nrouter ospf 1\n network 10.40.250.0 0.0.0.255 area 0\n network 10.40.255.7 0.0.0.0 area 0",
 o:[
  {t:"10.40.255.7",ok:true,x:"With no router-id command, OSPF uses the highest loopback address. 10.40.255.7 is higher than 10.40.254.70 because the third octet (255 against 254) decides before the fourth."},
  {t:"10.40.254.70",ok:false,x:"Comparing only the last octet (70 against 7) is the trap. Addresses are compared octet by octet from the left, and 255 beats 254 in the third octet."},
  {t:"172.16.99.2",ok:false,x:"That is the highest address on an up physical interface, which is used only when no loopback has an address."},
  {t:"192.168.70.1",ok:false,x:"Gi0/2 is administratively down, and in any case a loopback address is preferred over every physical interface."}
 ],
 w:"OSPF router ID: router-id command, else the highest loopback IP, else the highest IP on an up physical interface. Compare addresses octet by octet; the loopback need not be advertised."},
{id:"a085",obj:"3.2.a",d:3,cat:"rtable",t:"ms",pick:2,
 q:"Refer to the exhibit. RES-1 connects the research park to the campus transit segment. Which two destination addresses does RES-1 forward to 10.40.250.3? (Choose two.)",
 ex:"RES-1# show ip route | begin Gateway\nGateway of last resort is 10.40.250.1 to network 0.0.0.0\n\nO*E2  0.0.0.0/0 [110/1] via 10.40.250.1, 00:12:34, GigabitEthernet0/0\n      10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks\nC        10.40.250.0/24 is directly connected, GigabitEthernet0/0\nL        10.40.250.9/32 is directly connected, GigabitEthernet0/0\n      172.16.0.0/16 is variably subnetted, 3 subnets, 3 masks\nS        172.16.0.0/16 [1/0] via 10.40.250.4\nO        172.16.32.0/20 [110/3] via 10.40.250.3, 00:12:34, GigabitEthernet0/0\nO        172.16.40.0/22 [110/2] via 10.40.250.2, 00:12:34, GigabitEthernet0/0",
 o:[
  {t:"172.16.47.200",ok:true,x:"172.16.32.0/20 covers 172.16.32.0 to 172.16.47.255. The /22 covers only 40.0 to 43.255, so the /20 is the longest match and the next hop is 10.40.250.3."},
  {t:"172.16.33.5",ok:true,x:"This falls inside the /20 (32 to 47) but outside the /22 (40 to 43). The /20 is the longest match, via 10.40.250.3."},
  {t:"172.16.43.10",ok:false,x:"This matches the /16, the /20 and the /22. The /22 is the longest match, so it goes to 10.40.250.2."},
  {t:"172.16.48.1",ok:false,x:"48 is just past the /20's range (32 to 47). Only the static 172.16.0.0/16 matches, so it goes to 10.40.250.4."},
  {t:"172.16.40.1",ok:false,x:"This is the first address of 172.16.40.0/22. The /22 beats the /20 and the /16, so the next hop is 10.40.250.2."},
  {t:"10.40.60.5",ok:false,x:"No 10.40.60.x route exists on RES-1, so this destination uses the default route via 10.40.250.1."}
 ],
 w:"For each destination, list every route that contains it and take the longest prefix. A /20 spans 16 values of the third octet (32-47); a /22 spans 4 (40-43)."},
{id:"a086",obj:"5.6",d:5,cat:"acl",t:"build",ordered:true,
 q:"On CORE-1, build the named ACL SRV-WEB: VLAN 20 (10.40.20.0/24) may reach the web server 10.40.50.20 over HTTPS only, all other traffic from VLAN 20 to the server farm 10.40.50.0/24 is blocked, and everything else is allowed. Apply it to traffic leaving Gi0/1 toward the servers. Drag the commands into the answer area in the order they are entered. Leave the commands that are not needed.",
 pool:["permit ip any any","interface GigabitEthernet0/1","ip access-list extended SRV-WEB","deny ip 10.40.20.0 0.0.0.255 10.40.50.0 0.0.0.255","ip access-group SRV-WEB in","permit tcp 10.40.20.0 0.0.0.255 host 10.40.50.20 eq 443","ip access-group SRV-WEB out","permit tcp host 10.40.50.20 eq 443 10.40.20.0 0.0.0.255"],
 answer:[2,5,3,0,1,6],
 alt:[[1,6,2,5,3,0]],
 x:"Inside the ACL, order is everything: the HTTPS permit must come before the broader deny, and permit ip any any must come last to override the implicit deny for all other traffic. Traffic toward the servers leaves Gi0/1, so the ACL is applied out. The reversed permit (server as source, port 443 as source port) matches return traffic, not requests. Applying the ACL before creating it is also accepted.",
 w:"Extended ACL entries run top-down: specific permits, then broader denies, then permit ip any any. Direction is from the router's point of view: toward the servers on the server-facing port is out."},
{id:"a087",obj:"3.1.d",d:3,cat:"rtable",t:"mc",
 q:"Refer to the exhibit. Which statement describes how EDGE-1 forwards traffic to 10.40.40.0/24?",
 ex:"EDGE-1# show ip route 10.40.40.0\nRouting entry for 10.40.40.0/24\n  Known via \"ospf 1\", distance 110, metric 2, type intra area\n  Last update from 10.40.250.3 on GigabitEthernet0/0, 00:12:34 ago\n  Routing Descriptor Blocks:\n  * 10.40.250.3, from 10.40.255.3, 00:12:34 ago, via GigabitEthernet0/0\n      Route metric is 2, traffic share count is 1\n    10.40.250.2, from 10.40.255.2, 00:12:34 ago, via GigabitEthernet0/0\n      Route metric is 2, traffic share count is 1",
 o:[
  {t:"It load-shares between next hops 10.40.250.2 and 10.40.250.3, because both paths have the same cost of 2",ok:true,x:"Two routing descriptor blocks with equal metrics mean OSPF installed both paths (equal-cost multipath). The traffic share count of 1 on each means traffic is spread evenly."},
  {t:"It sends everything to 10.40.250.3, and 10.40.250.2 is a backup used only if that path fails",ok:false,x:"The asterisk only points to the path that process-switched traffic will use next. Both entries are installed and in use; neither is a backup."},
  {t:"The route has an administrative distance of 2 and a metric of 110",ok:false,x:"This is reversed. distance 110 is OSPF's administrative distance and metric 2 is the OSPF cost."},
  {t:"It forwards the traffic to next hops 10.40.255.2 and 10.40.255.3",ok:false,x:"Those are the router IDs of the routers that advertised the route (from ...). The next hops are their interface addresses, 10.40.250.2 and 10.40.250.3."}
 ],
 w:"show ip route <prefix>: distance = AD, metric = cost, one descriptor block per installed next hop, 'from' = the advertising router ID. Equal metrics = equal-cost load sharing (OSPF installs 4 by default)."},
{id:"a088",obj:"4.4",d:4,cat:"mon",t:"mc",
 q:"The NOC wants CORE-1 to notify the network management station as soon as an interface goes down, and CORE-1 must send the notification again if the station does not acknowledge it. Which SNMP message type meets the requirement?",
 o:[
  {t:"Inform",ok:true,x:"An inform is an unsolicited notification from the agent that the manager must acknowledge. If no acknowledgment arrives, the agent resends it. Informs need SNMPv2c or SNMPv3."},
  {t:"Trap",ok:false,x:"A trap is also unsolicited, but it is fire-and-forget. If it is lost on the way to the NMS, the agent never knows and never resends it."},
  {t:"Get-response",ok:false,x:"This is the agent's reply to a Get request from the manager. The manager would have to poll; it is not an alert sent when the event happens."},
  {t:"Set",ok:false,x:"A Set is sent by the manager to change a value in the agent's MIB, such as shutting an interface. It flows the wrong way for an alert."}
 ],
 w:"SNMP: manager sends Get/GetNext/GetBulk/Set to the agent (UDP 161). The agent sends Trap (no ack) or Inform (acknowledged) to the manager (UDP 162). SNMPv3 adds authentication and encryption."},
{id:"a089",obj:"5.7",d:5,cat:"l2sec",t:"ms",pick:2,
 q:"A student plugged a home router into a classroom jack on ACC-2, and PCs in VLAN 20 began receiving 192.168.0.x addresses. The real DHCP server is reached through the uplink to DIST-1. Which two configurations on ACC-2 block the rogue server while legitimate DHCP keeps working? (Choose two.)",
 o:[
  {t:"ip dhcp snooping and ip dhcp snooping vlan 20 in global configuration",ok:true,x:"This turns on DHCP snooping for VLAN 20. Every port becomes untrusted, and server messages such as DHCPOFFER and DHCPACK arriving on an untrusted port are dropped."},
  {t:"ip dhcp snooping trust on the uplink toward DIST-1",ok:true,x:"The legitimate offers arrive on the uplink. Trusting only that port lets them through, while offers from the student's router on an access port are dropped."},
  {t:"ip dhcp snooping trust on the classroom access ports",ok:false,x:"That is backwards. Trusting the access ports would let the rogue router's offers through again."},
  {t:"ip arp inspection vlan 20 in global configuration",ok:false,x:"Dynamic ARP inspection checks ARP messages against the snooping bindings. It does not filter DHCP offers, so the rogue leases would continue."},
  {t:"switchport port-security maximum 1 on the classroom access ports",ok:false,x:"The home router uses one MAC address on the port, so port security would allow it. Port security limits MAC addresses; it does not look at DHCP messages."}
 ],
 w:"DHCP snooping: enable it globally and per VLAN, trust only the ports toward real DHCP servers (uplinks), leave access ports untrusted. Its binding table is what DAI and IP Source Guard rely on."},
{id:"a090",obj:"3.4.a",d:3,cat:"ospf",t:"ms",pick:3,
 q:"A new router, RES-1, will join the transit segment 10.40.250.0/24 where EDGE-1, DIST-1, DIST-2 and CORE-1 already run OSPF. Which three settings on RES-1's Gi0/0 must agree with the existing routers for adjacencies to form? (Choose three.)",
 o:[
  {t:"Area ID (area 0)",ok:true,x:"The area ID is carried in every hello. A router in another area on the same segment is ignored."},
  {t:"Subnet mask (/24)",ok:true,x:"On broadcast segments the hello includes the interface mask, and neighbors must agree on it as well as on the subnet."},
  {t:"Hello and dead intervals",ok:true,x:"Both timers are carried in the hello and must match exactly (10 and 40 seconds by default on Ethernet)."},
  {t:"OSPF process ID",ok:false,x:"The process ID is local to each router and is not sent in any OSPF packet. router ospf 7 can peer with router ospf 1."},
  {t:"Router priority",ok:false,x:"Priority only affects the DR/BDR election. Routers with different priorities still form adjacencies."},
  {t:"Router ID",ok:false,x:"Router IDs must be unique, not equal. A duplicate router ID causes problems instead of preventing them."}
 ],
 w:"Must match: area, subnet/mask, hello/dead timers, authentication, stub flag (and MTU, checked at EXSTART). Must differ: router ID. Doesn't matter: process ID, priority, cost."},
{id:"a091",obj:"3.3.c",d:3,cat:"static",t:"mc",
 q:"Traffic from EDGE-1 to the NOC monitoring server 10.40.50.30 must pass through DIST-1 (10.40.250.2), where a traffic tap is installed. The rest of 10.40.50.0/24 must keep following the OSPF route through CORE-1. Which command on EDGE-1 meets the requirement?",
 o:[
  {t:"ip route 10.40.50.30 255.255.255.255 10.40.250.2",ok:true,x:"A /32 host route matches only 10.40.50.30. It is longer than the OSPF /24, so it wins for that one address and leaves the rest of the subnet on OSPF."},
  {t:"ip route 10.40.50.0 255.255.255.0 10.40.250.2",ok:false,x:"This static /24 has AD 1 and would replace the OSPF /24 for the whole server farm, moving every server's traffic through DIST-1."},
  {t:"ip route 10.40.50.30 0.0.0.0 10.40.250.2",ok:false,x:"ip route takes a subnet mask, not a wildcard. With mask 0.0.0.0 the address has bits outside the mask, and IOS rejects it as an inconsistent address and mask."},
  {t:"ip route 10.40.250.2 255.255.255.255 10.40.50.30",ok:false,x:"The destination and next hop are reversed. This would create a route to DIST-1's address via the monitoring server."}
 ],
 w:"Host route = /32 (mask 255.255.255.255; IPv6 /128). Longest match lets it steer one address without touching the subnet's dynamic route."},
{id:"a092",obj:"5.2",d:5,cat:"secbase",t:"mc",
 q:"During a walk-through, an auditor follows an employee through the badge-controlled door of the campus data center without badging in. Which control most directly prevents this from happening?",
 o:[
  {t:"An access control vestibule that admits one person per badge swipe",ok:true,x:"A vestibule (mantrap) has two interlocked doors, so only one authenticated person can pass at a time. It physically stops tailgating."},
  {t:"CCTV cameras pointed at the data center door",ok:false,x:"Cameras are detective: they record the tailgating so it can be investigated, but they do not stop it."},
  {t:"Longer and more complex PINs on the badge readers",ok:false,x:"The auditor never used a badge or PIN. Stronger credentials do nothing when someone walks in behind an authorized person."},
  {t:"A sign reminding staff to keep the door closed",ok:false,x:"Signs and reminders support awareness but depend on people's behavior. They do not physically prevent entry."}
 ],
 w:"Physical access control: badges, locks, vestibules (stop tailgating), guards. Cameras detect. User awareness and training reduce human error such as holding doors or clicking phishing links."},
{id:"a093",obj:"4.5",d:4,cat:"mon",t:"order",
 q:"The NOC is setting logging trap levels on the campus devices. Drag the syslog severity keywords into order from level 0 (most severe) to level 7 (least severe).",
 pool:["Warnings","Emergencies","Notifications","Critical","Debugging","Alerts","Informational","Errors"],
 answer:[1,5,3,7,0,2,6,4],
 x:"0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging. A logging level includes its own number and every lower (more severe) number, so logging trap 6 sends levels 0 through 6.",
 w:"Lower number = more severe. Setting a level sends that level and all lower numbers, so a higher level means more messages."},
{id:"a094",obj:"3.4",d:3,cat:"ospf",t:"mc",
 q:"Refer to the exhibit. CORE-1 reaches the new data center router over a 10-Gb/s link (Te0/1) and a 1-Gb/s link (Gi0/2). OSPF sends half of the data center traffic over the 1-Gb/s link. Which change makes OSPF prefer the 10-Gb/s link and keeps costs consistent across the campus?",
 ex:"CORE-1# show ip ospf interface brief\nInterface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C\nTe0/1        1     0               10.40.248.5/30     1     P2P   1/1\nGi0/2        1     0               10.40.248.1/30     1     P2P   1/1\nGi0/0        1     0               10.40.250.4/24     1     DROTH 2/3",
 o:[
  {t:"Configure auto-cost reference-bandwidth 10000 under router ospf 1 on every OSPF router",ok:true,x:"With the default 100-Mb/s reference, every link of 100 Mb/s or faster costs 1, so 10G and 1G tie. A 10,000-Mb/s reference gives 10G a cost of 1 and 1G a cost of 10. Every router must use the same reference for consistent metrics."},
  {t:"Configure bandwidth 10000000 on CORE-1 Te0/1",ok:false,x:"Te0/1 already runs at 10 Gb/s. With a 100-Mb/s reference, any bandwidth above 100 Mb/s still gives the minimum cost of 1, so the tie remains."},
  {t:"Configure ip ospf priority 255 on CORE-1 Te0/1",ok:false,x:"Priority only affects DR/BDR elections, and this point-to-point link has no election. It does not change path cost."},
  {t:"Configure maximum-paths 1 under router ospf 1 on CORE-1",ok:false,x:"This installs only one of the two equal-cost paths, but OSPF does not choose by bandwidth, so the 1-Gb/s path could be the one kept."}
 ],
 w:"OSPF cost = reference bandwidth / interface bandwidth, minimum 1. Default reference 100 Mb/s makes Fa, Gi and Te all cost 1; raise it (auto-cost reference-bandwidth) on all routers, or set ip ospf cost."},
{id:"a095",obj:"5.5",d:5,cat:"vpn",t:"mc",
 q:"Three satellite buildings across town each have an internet circuit and a small router. Their users must reach campus servers over the internet with all traffic between the sites encrypted, and staff there must not have to install or start VPN software. Which solution fits?",
 o:[
  {t:"Site-to-site IPsec VPNs between each satellite router and EDGE-1",ok:true,x:"The routers build permanent encrypted tunnels and protect all traffic between the networks. Hosts send traffic normally and need no client."},
  {t:"A remote-access VPN with a client on every satellite PC",ok:false,x:"Remote access protects one device at a time and requires each user to run a client, which the requirement rules out."},
  {t:"GRE tunnels between each satellite router and EDGE-1",ok:false,x:"GRE alone encapsulates traffic but does not encrypt it. It would need IPsec added to protect the data."},
  {t:"A clientless SSL VPN portal on EDGE-1",ok:false,x:"Clientless VPNs give individual users browser-based access to selected applications. Users must log in to a portal, and it does not connect whole sites."}
 ],
 w:"Site-to-site IPsec = gateway to gateway, always on, transparent to hosts. Remote access = per user (client or clientless TLS/SSL). GRE adds multicast/routing support but no encryption."},
{id:"a096",obj:"3.5",d:3,cat:"fhrp",t:"mc",
 q:"The campus team wants both DIST-1 and DIST-2 to forward traffic from VLAN 40 hosts at the same time, while every host keeps the same default gateway address. Which first hop redundancy protocol does this within a single group?",
 o:[
  {t:"GLBP",ok:true,x:"In GLBP, the active virtual gateway (AVG) answers ARP requests for the one virtual IP with different virtual MACs, each owned by a forwarder (AVF). Hosts are spread across both switches automatically."},
  {t:"HSRP",ok:false,x:"One HSRP group has one active router that forwards for all hosts. Sharing load needs several groups and hosts split between different gateway addresses."},
  {t:"VRRP",ok:false,x:"Like HSRP, a VRRP group has one master that forwards. VRRP is the open-standard choice, but it does not load balance within a group."},
  {t:"HSRP version 2",ok:false,x:"Version 2 adds more group numbers, millisecond timers and IPv6. It still has only one active router per group."}
 ],
 w:"HSRP (Cisco): active/standby, preempt off. VRRP (open): master/backup, preempt on. GLBP (Cisco): one virtual IP, several virtual MACs, AVG + AVFs share the load."},
{id:"a097",obj:"3.3.b",d:3,cat:"static",t:"mc",
 q:"Refer to the exhibit. LAB-R2, a temporary lab router, connects to CORE-1 Fa0/3. Its lab networks, 10.40.72.0 through 10.40.75.255, are not in OSPF. Which command on CORE-1 adds a single route that covers exactly the lab networks?",
 ex:"CORE-1# show ip interface brief | include FastEthernet0/3\nFastEthernet0/3        10.40.246.1     YES manual up                    up\n\nLAB-R2# show ip interface brief | include 0/0\nGigabitEthernet0/0     10.40.246.2     YES manual up                    up",
 o:[
  {t:"ip route 10.40.72.0 255.255.252.0 10.40.246.2",ok:true,x:"72 to 75 is four values in the third octet starting on a multiple of 4: a /22, mask 255.255.252.0. The next hop is LAB-R2's address on the shared link."},
  {t:"ip route 10.40.72.0 255.255.255.0 10.40.246.2",ok:false,x:"A /24 covers only 10.40.72.x. Traffic to 10.40.73.0 through 10.40.75.255 would not match it."},
  {t:"ip route 10.40.72.0 0.0.3.255 10.40.246.2",ok:false,x:"ip route needs a subnet mask, not a wildcard. IOS rejects this as an inconsistent address and mask."},
  {t:"ip route 10.40.72.0 255.255.252.0 10.40.246.1",ok:false,x:"10.40.246.1 is CORE-1's own Fa0/3 address. IOS refuses a next hop that belongs to the router itself; the next hop must be LAB-R2."}
 ],
 w:"Static network route: ip route <network> <subnet mask> <next hop or exit interface>. Size the mask from the block: 4 consecutive /24s on a multiple of 4 = /22 = 255.255.252.0."},
{id:"a098",obj:"4.9",d:4,cat:"mon",t:"mc",
 q:"The NOC wants a nightly job to copy each switch's configuration to an archive server. Security requires the transfer to log in with a username and password and to run over a connection-oriented transport. Of these, which protocol meets the requirement?",
 o:[
  {t:"FTP",ok:true,x:"FTP runs over TCP (control on port 21) and requires a username and password. IOS supports it with copy running-config ftp: and ip ftp username/password."},
  {t:"TFTP",ok:false,x:"TFTP runs over UDP 69 and has no authentication at all, which is why it is simple but unsuitable for this requirement."},
  {t:"SNMP",ok:false,x:"SNMP is for monitoring and management (Get, Set, traps). It is not a file transfer protocol for configuration archives."},
  {t:"Syslog",ok:false,x:"Syslog sends one-way event messages, usually over UDP 514. It does not transfer files."}
 ],
 w:"TFTP: UDP 69, no login, no directory listing. FTP: TCP 20/21, username/password, but cleartext. SCP/SFTP add encryption. All are used to move IOS images and config backups."},
{id:"a099",obj:"5.6",d:5,cat:"acl",t:"mc",
 q:"Guest VLAN 30 (10.40.30.0/24) must be blocked from the server farm (10.40.50.0/24 behind CORE-1 Gi0/1), but guests must keep internet access and all other VLANs must keep server access. The engineer wrote access-list 15 deny 10.40.30.0 0.0.0.255 and access-list 15 permit any. Where should ACL 15 be applied?",
 o:[
  {t:"Outbound on CORE-1 Gi0/1, the server-farm interface",ok:true,x:"A standard ACL checks only the source address, so it belongs as close to the destination as possible. Outbound toward the servers, it affects only traffic headed into the server farm."},
  {t:"Inbound on the VLAN 30 SVI on DIST-2",ok:false,x:"Near the source, a source-only ACL drops all guest traffic, including internet traffic, which breaks the requirement."},
  {t:"Outbound on EDGE-1 Gi0/1 toward ISP-A",ok:false,x:"This blocks the guests' internet access and does nothing about guest traffic to the servers."},
  {t:"Inbound on CORE-1 Gi0/1",ok:false,x:"Inbound on the server-facing port only sees traffic coming from the servers, whose source addresses are 10.40.50.x. The deny for 10.40.30.0/24 would never match."}
 ],
 w:"Standard ACL (source only): place near the destination. Extended ACL (source, destination, protocol, port): place near the source. Direction is from the router's point of view."},
{id:"a100",obj:"5.8",d:5,cat:"vpn",t:"mc",
 q:"After an outage, the NOC needs to know which administrator entered which configuration commands on CORE-1 and at what time. Which AAA function provides this record?",
 o:[
  {t:"Accounting",ok:true,x:"Accounting records what authenticated users did: sessions, commands and times. With TACACS+, each command can be logged to the server."},
  {t:"Authentication",ok:false,x:"Authentication proves who the user is at login. It does not record what they did afterwards."},
  {t:"Authorization",ok:false,x:"Authorization decides which commands a user may run. It allows or denies; it does not keep a history."},
  {t:"Auditing",ok:false,x:"Auditing is a broader review activity, not one of the three AAA functions. The AAA function that produces the record is accounting."}
 ],
 w:"AAA: authentication = who are you, authorization = what may you do, accounting = what did you do. TACACS+ (TCP 49) can authorize and account per command; RADIUS (UDP 1812/1813) combines authN and authZ."}
];
