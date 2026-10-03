# ccna pack — content spec

Pack: `packs/ccna/`. Manifest: `pack.js`. Topic map for tagging: `dev/specs/skills-ccna.json` (Cisco 200-301 **v1.1** exam topics, fetched Oct 3, 2026 from Cisco's official PDF). Validate with `node dev/check-ccna.mjs all` (strict CCNA rules) **and** `node dev/check-pack.mjs ccna` (generic engine rules) until both print PASS. Export for second-model review: `node dev/export-ccna.mjs` → `dev/export/ccna-*.txt`. Fidelity checklist: `dev/FIDELITY-ccna.md`. End-to-end: `python3 dev/tests/e2e-ccna.py` (serve the repo on :8765 first).

Sections: §1 exam facts · §2 files · §3 categories/domains · §4 card · §5 twin · §6 exam banks · §7 lab slots (contract with Chat 8) · then the IOS simulator (Chat 7).

All text original — never copy Cisco Press, Cisco's own sample questions, Boson, Jeremy's IT Lab, or any practice exam. Facts must be correct for IOS 15/16 and the v1.1 blueprint. Neutral voice, no real company names; addresses from RFC 1918 / RFC 5737 / `2001:db8::/32`. Escape `"` inside strings; no HTML (content is escaped on render). Every item carries `obj` — the topic it tests (`"3.4"`, or a sub-topic `"3.4.c"` when it targets one bullet). The obj's domain must equal the item's domain and its category's domain.

## 1. Exam facts (sources)

| Fact | Value | Source |
|---|---|---|
| Blueprint | v1.1: Network Fundamentals 20 · Network Access 20 · IP Connectivity 25 · IP Services 10 · Security Fundamentals 15 · Automation & Programmability 10 | Cisco exam topics PDF (skills-ccna.json `source`) |
| Version cliff | v2.0 replaces v1.1 on Feb 3, 2027 | PLAN.md §1 (verified Oct 2, 2026) |
| Length | 120 minutes; ~100–120 items | Cisco exam topics PDF; PLAN.md §1 |
| Navigation | **No backtracking on any item.** Once you click Next the item is final | PLAN.md §1 |
| Item types | MC single, multi-response (graded all-or-nothing), drag-and-drop, 3–4 lab items (tabbed IOS terminals, Tasks/Guidelines/Topology, 5–7 min each, partial credit) | PLAN.md §1/§5 |
| Score | Scaled 300–1000; Cisco does **not** publish the passing score ("will not be the same number across all exams") | Cisco Learning Network, *Demystifying the Cisco score report* |
| App pass line | 825 scaled (= 75% raw on the app's linear scale) — the commonly reported figure, unofficial. The **gate** decides booking: 85% raw on a fresh exam, every domain ≥ 70%, twice in a row (plus Boson ExSim ≥ 85% twice, PLAN.md §1) | PLAN.md §7 |
| 6.6 wording | v1.1 names **Ansible and Terraform** (Puppet and Chef were v1.0). Puppet/Chef appear only as distractors and in one contrast twin | Cisco exam topics PDF |

## 2. Files

| file | export | count |
|---|---|---|
| `cards-d1.js` … `cards-d6.js` | `CCNA_CARDS_D1` … `CCNA_CARDS_D6` | ~450 cards, 26 decks |
| `twins.js` | `CCNA_TWINS` | ~50 confusable pairs |
| `bank-a.js`, `bank-b.js`, `bank-c.js` | `CCNA_BANK_A/B/C` | 100 questions each; each concatenates `bank-x.p1.js` (domains 1/2/6, x001–x050) and `bank-x.p2.js` (3/4/5, x051–x100) |
| `exam-labs.js` | `LAB_SLOTS`, `fillLabSlots`, `loadLabs`, `LABS_READY` | 4 lab slots per exam (§7) |
| `extras.js` | `DIAGRAMS`, `ACRONYMS`, `REFERENCE` | reference sheet tables, acronym list |
| `sprints.js` | `SPRINTS` | speed rounds: masks, administrative distance, ports |
| `subnet/` | standalone subnetting trainer (Chat 4) | |
| `labs/` | **Chat 8** — lab items, show-output reader, config-order/topology PBQs | |

## 3. Categories (`c` / `cat`) and domains

| d | weight | decks (category keys) |
|---|---|---|
| 1 Network Fundamentals | 20 | `parts` (1.1–1.4) · `tcpip` (1.5–1.7, 1.10) · `ipv6` (1.8–1.9) · `wlbasics` (1.11–1.12) · `switching` (1.13) |
| 2 Network Access | 20 | `vlan` (2.1–2.2) · `l2link` (2.3–2.4) · `stp` (2.5) · `wlan` (2.6, 2.7, 2.9) · `mgmt` (2.8) |
| 3 IP Connectivity | 25 | `rtable` (3.1–3.2) · `static` (3.3) · `ospf` (3.4) · `fhrp` (3.5) |
| 4 IP Services | 10 | `nat` (4.1) · `svc` (4.2, 4.3, 4.6, 4.8) · `mon` (4.4, 4.5, 4.9) · `qos` (4.7) |
| 5 Security Fundamentals | 15 | `secbase` (5.1–5.4) · `vpn` (5.5, 5.8) · `acl` (5.6) · `l2sec` (5.7) · `wsec` (5.9–5.10) |
| 6 Automation & Programmability | 10 | `sdn` (6.1–6.4) · `api` (6.5, 6.7) · `cfgmgmt` (6.6) |

The topic → deck mapping is the `cat` field in skills-ccna.json. A card may use another deck in the same domain when it reads better there.

## 4. Card

```js
{obj:"3.4.c", c:"ospf", q:"≤90 chars front", a:"#Big headline line\nsupporting line (1–3 lines)", s:"optional ≤60-char MC option text",
 x:"2–4 sentences, 200–520 chars: teaches it, why it matters, how it differs from neighbors, the exam/CLI keyword", w:"optional hook ≤120", g:"optional distractor group"}
```
Same engine schema as Sec+ (dev/specs/secplus.md). Shorts (`s`, else the `#` line) unique within a deck (or `g` group). CLI cards put the command in the headline (`#show ip ospf neighbor`). Each deck ≥ 8 cards; every v1.1 topic has cards.

Targets: d1 ~90 · d2 ~90 · d3 ~110 · d4 ~50 · d5 ~70 · d6 ~45. Shipped (Chat 9): 98 · 92 · 111 · 54 · 79 · 47 = 481.

## 5. Twin

```js
{a:"Term A", b:"Term B", obj:"2.5.b", n:"2–3 sentence contrast", s:[["statement true of A","a"],["…","b"], … 4–6 statements, ≥2 each side]}
```
Required pairs (Chat 9 brief): OSPF states, STP port states/roles, standard vs extended ACL placement, NAT types, FHRPs, 802.11 standards/bands, Ansible vs Terraform (and Ansible vs Puppet/Chef as the pull-vs-push contrast), REST verbs, JSON vs YAML, TCP vs UDP apps, collision vs broadcast domains, SVI vs routed port — plus ~38 more of the pairs Cisco questions lean on.

## 6. Exam banks

100 questions per bank; ids `a001`…`a100` in file order. Authored in two halves (p1 = domains 1/2/6, p2 = 3/4/5), domains interleaved within each half; the runner shuffles items and options at sitting time, so file order never reaches the candidate. Correct options are conventionally listed first in the file for the same reason.

| rule | value |
|---|---|
| Domain quota per bank | d1 **20** · d2 **20** · d3 **25** · d4 **10** · d5 **15** · d6 **10** |
| Types (`t`) | `mc` (4 options, 1 ok) · `ms` multi-response (`pick` 2–3, 5–6 options, stem ends "(Choose two.)" / "(Choose three.)") · `order` drag-drop sequence · `build` drag-drop selection/sort |
| Mix per bank | ≥ 10 `ms`, ≥ 4 `order`, ≥ 4 `build`, ≥ 30 with an `ex` exhibit (show output, running-config excerpt, routing table, topology described in text, JSON payload) |
| Scoring | every item all-or-nothing, 1 point (no partial credit on MC/MS/drag-drop); lab items `exam.pbqPts` × partial credit |

```js
{id:"a017", obj:"3.1.e", d:3, cat:"rtable", t:"mc"|"ms", pick:2|3 (ms only),
 q:"≤420 chars. Cisco voice: 'Refer to the exhibit.' first when there is one; 'Which command…?', 'What is the result…?'",
 ex:"optional monospace exhibit, ≤26 lines, ≤78 chars per line (iPhone width)",
 o:[{t:"≤130 chars", ok:true|false, x:"why right / why wrong HERE, ≤300"} ×4 (mc) | ×5–6 (ms)], w:"takeaway ≤280"}
```
Drag-and-drop uses the engine's Microsoft-format item renderers (`core/exam/msitems.js`), which work in any pack; the CCNA exam does **not** turn on Microsoft sectioning (no `itemTypes` in the manifest — the validator reads `exam.bankTypes` instead).
```js
{id:"a033", obj:"4.3", d:4, cat:"svc", t:"order",
 q:"Drag and drop the DHCP messages into the order they are exchanged when a client joins the network.",
 pool:["DHCPDISCOVER","DHCPOFFER","DHCPREQUEST","DHCPACK"], answer:[0,1,2,3], alt:[ /* optional equivalent orders */ ],
 x:"why this order", w:"takeaway"}
{id:"a061", obj:"1.5", d:1, cat:"tcpip", t:"build", ordered:false,
 q:"Drag the characteristics of UDP into the answer area. Leave the characteristics that do not apply.",
 pool:[6–8 entries incl. distractors], answer:[indexes that belong], x:"…", w:"…"}
```
`build` with `ordered:true` = pick the needed config lines and put them in order. Exhibits are real-shaped IOS output; the simulator in `core/sims/ios/` can generate it (`createLab(...)`, `lab.cli("R1").exec("show ip route")`).

## 7. Lab slots — contract with Chat 8

`exam.pbqCount = 4`, `exam.pbqPts = 3`. `exam-labs.js` holds `LAB_SLOTS` (4 topics per exam, all 12 lab topics covered across A/B/C) and fills each slot with the first Chat 8 lab whose `topic` matches, cloned under an exam id (`pa1`…`pc4`, `src` = the lab's own id).

Chat 8's side (as merged): `loadLabs()` in `exam-labs.js` imports `labs.js` (`LABS`), `pbq.js` (`PBQ_ORDER`, `PBQ_TOPO`) and `reader.js` (`READER`) plus the `core/sims/ios/ui/` modules that register their sim types. Each of the 13 `ccna-lab` items carries `topic` (one of `vlan intervlan static ospf acl nat etherchannel dhcp portsec ssh ipv6 showread`), `d`, `obj`. `dev/check-pack.mjs` FAILs if any exam's slots cannot be filled. Nothing else in `packs/ccna/` needs to change: the PBQ Lab lists `LABS`, each exam gets its 4 labs, and the runner places them among the 100 questions at random positions (the real exam does not group them).

---

## IOS CLI simulator (`core/sims/ios/`) — Chat 7

**Scope honesty, in one line:** this is a CCNA-blueprint *subset* of IOS behaviour, built so the lab items feel like the real thing at typing speed. It is not IOS. Packet Tracer / real gear stay in the loop for everything below under *Out of scope*.

### What it is

| File | Role |
|---|---|
| `index.js` | Public API: `createLab(spec)`, `Topology`, `Session`, `makeSession`, `runningConfig`. Nothing touches the DOM. |
| `net.js` | IPv4/IPv6 math (masks, wildcards, prefix match, RFC 5952 compression, EUI-64, link-local). |
| `device.js` | `Device` (router / switch / l3switch) and `Host` (PC) models: configuration state, interface naming (`g0/1`, `Gi0/1`, `gigabitEthernet 0/1`), defaults per platform. |
| `topology.js` | Links, `converge()` (derives all runtime state), L2 flooding, ARP, forwarding, `ping`, `traceroute`, `ping6`. |
| `cli.js` | Command tree + `Session`: modes/prompts, unique-prefix abbreviation, `?` help, Tab completion, `% Ambiguous` / `% Incomplete` / `% Invalid input` with caret, `no`/`default`, `do`, interactive prompts (passwords, confirms, banner text). |
| `commands.js` | Every exec, show and config command (the list below). |
| `show.js` | `show` renderers (real-shaped output). |
| `config.js` | `show running-config` renderer in IOS order; type 7 (real algorithm) and type 5 (stand-in) password rendering. |

Test: `node dev/tests/ios-conformance.mjs` (118 cases; `-v` for verbose, a word to filter). Every case builds a topology, types CLI lines, and asserts `show` output and ping results.

### Using it (Chat 8)

```js
import { createLab } from "../core/sims/ios/index.js";
const lab = createLab({
  devices: { R1: { type: "router" }, SW1: { type: "switch" }, PC1: { host: true, ip: "10.1.1.10", mask: "255.255.255.0", gw: "10.1.1.1" } },
  links:   [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"]],
  configs: { R1: ["en", "conf t", "hostname R1", "int g0/0", "ip add 10.1.1.1 255.255.255.0", "no shut"] },   // pre-config typed as CLI
  startup: { SW1: "hostname SW1\n!\ninterface Vlan1\n ip address 10.1.1.2 255.255.255.0\n no shutdown\n" },   // or a saved config text
});
const cli = lab.cli("R1");                    // one Session per terminal tab; sessions start in user mode
cli.prompt();                                 // "R1>"
const r = cli.exec("sh ip int br");           // {out, prompt, echo?, help?}  — echo:false = hidden password input
cli.exec("show ip ?");                        // help text in .out (the UI re-prints the line after it)
cli.complete("conf t");                       // Tab → "configure t"  (completes the LAST word only when unique)
lab.topo.ping("PC1", "10.1.1.1");             // {sent, received, marks:".!!!!", pct, text, why}
lab.state("R1");                              // JSON snapshot of configuration (no runtime data) for end-state graders
```

Device types and ports: `router` = Gi0/0, Gi0/1, Gi0/2, Se0/1/0, Se0/1/1 (ISR4321 banner, 2901-style naming); `switch` = Fa0/1–24, Gi0/1–2 (2960); `l3switch` = Gi1/0/1–24 (3650; `ip routing`, `no switchport`). Pass `ports: [...]` to override. Router ports start `shutdown`; switch ports start up in `dynamic auto`. MACs are deterministic per topology (`0001.4200.0n00` + port index; hosts `00e0.4c00.0n01`).

Hosts: `{host:true, ip, mask, gw}` or `{host:true, dhcp:true}`. Hosts have no CLI; drive them with `lab.topo.ping("PC1", dst)`. A host's `ip`/`gw` is readable from `lab.topo.get("PC1")` (set by DHCP when leased).

Timers and counters: `show` output that carries uptime/age/dead-time uses constant values (`00:12:34`, dead `00:00:3x`). Counters in `show interfaces` are zero. ACL match counts and NAT hits/misses are real (incremented by pings).

### Behaviours that are simulated (and tested)

*Parser* — unique-prefix abbreviation (exact match wins), Tab completion, `?` at the end of a line (full list with descriptions and `<cr>`) or mid-word (`sh ip ro?` → `route`), `% Ambiguous command:  "s"`, `% Incomplete command.`, `% Invalid input detected at '^' marker.` with the caret under the offending token (prompt length included), `Translating "foo"...domain server (255.255.255.255)` for unknown EXEC words (shortened by `no ip domain-lookup`), `no` and `default` prefixes, `do` in config modes, mode-entering commands (`interface`, `vlan`, `line`, `router ospf`, `ip access-list`, `ip dhcp pool`) accepted from any config sub-mode, `exit`/`end`/`disable`, interactive prompts (`enable` password with 3 tries → `% Bad secrets`, `copy run start` filename, `reload` save/confirm, `crypto key generate rsa` modulus, multi-line `banner motd`).

*Modes/prompts* — `>`, `#`, `(config)#`, `(config-if)#`, `(config-subif)#`, `(config-if-range)#`, `(config-line)#`, `(config-router)#`, `(config-vlan)#`, `(config-std-nacl)#`, `(config-ext-nacl)#`, `(dhcp-config)#`.

*Global config* — `hostname`, `enable secret|password` (type 5 / type 7 rendering), `service password-encryption` (converts existing passwords; `no` leaves them encrypted, like IOS), `banner motd`, `line con 0` / `line vty 0 4` / `line vty 0 15` (password, login, login local, transport input, exec-timeout, logging synchronous), `username … secret|password [privilege]`, `ip domain-name`, `ip domain-lookup`, `crypto key generate rsa [modulus N]` (needs a domain name), `ip ssh version 2`, `ip routing` (l3switch), `ipv6 unicast-routing`, `ip default-gateway`, `ntp server`, `cdp run`, `lldp run`, `ip http server`, `spanning-tree mode pvst|rapid-pvst|mst`, `spanning-tree vlan X priority N` (multiples of 4096 enforced) / `root primary|secondary`, `spanning-tree portfast [bpduguard] default`, `vlan N` / `vlan 10,20` / `vlan 30-32` + `name`, `ip route` (next hop, exit interface, both, AD → floating), `ipv6 route`, `router ospf N` (network w/ wildcard — a subnet mask is inverted like IOS does, passive-interface incl. default, router-id, default-information originate [always], auto-cost reference-bandwidth), numbered ACLs 1–99/1300–1999 standard and 100–199/2000–2699 extended, named ACLs with sequence numbers, remarks, `no <seq>`, `ip nat pool`, `ip nat inside source list … interface|pool … [overload]`, `ip nat inside source static [tcp|udp]`, `ip dhcp excluded-address`, `ip dhcp pool` (network incl. `/24`, default-router, dns-server, domain-name, lease).

*Interface config* — `ip address [secondary]` (overlap check, bad-mask check), `no ip address`, `ipv6 address X/len [eui-64]`, `ipv6 address … link-local`, `ipv6 enable`, `shutdown`/`no shutdown` (emits `%LINK-5-CHANGED` / `%LINEPROTO-5-UPDOWN` when the state actually changes), `description`, `speed`, `duplex`, `bandwidth`, `clock rate`, `encapsulation dot1q N [native]` (sub-interfaces; duplicate VLAN rejected), `switchport` / `no switchport`, `switchport mode access|trunk|dynamic auto|dynamic desirable`, `switchport access vlan` (creates the VLAN with the IOS notice), `switchport voice vlan`, `switchport trunk native vlan`, `switchport trunk allowed vlan [add|remove|except|all|none]`, `switchport trunk encapsulation dot1q` (l3switch), `switchport nonegotiate` (conflict with dynamic rejected), `switchport port-security [maximum|violation|mac-address [sticky] [H.H.H]]` (rejected on dynamic ports), `spanning-tree portfast`, `spanning-tree bpduguard enable`, `spanning-tree cost`, `channel-group N mode active|passive|on|desirable|auto` (creates Po, rejects mixed protocols), `ip access-group X in|out`, `ip nat inside|outside`, `ip helper-address`, `ip ospf N area A`, `ip ospf cost|priority|network point-to-point`, `cdp enable`, `interface range`.

*Show* — `running-config` (+ `interface X`), `startup-config`, `version`, `ip interface brief`, `ipv6 interface brief`, `ip interface X`, `ipv6 interface X`, `interfaces [X]`, `interfaces status`, `interfaces trunk`, `interfaces [X] switchport`, `ip route [ospf|static|connected|A.B.C.D]`, `ipv6 route`, `ip protocols`, `vlan brief`, `vlan`, `vlan id N`, `ip ospf neighbor|interface [X|brief]|database`, `ip ospf`, `access-lists [X]`, `ip access-lists`, `ip nat translations|statistics`, `port-security [interface X|address]`, `etherchannel summary`, `cdp neighbors [detail]`, `cdp`, `lldp neighbors`, `lldp`, `mac address-table [dynamic|vlan N|interface X|address H.H.H]`, `spanning-tree [vlan N|summary]`, `ip dhcp binding|pool|server statistics`, `arp` / `ip arp`, `ntp associations|status`, `ip ssh`, `crypto key mypubkey rsa`, `history`, `clock`, `users`, `flash`, `logging`, `inventory`, `protocols`.

*Exec* — `enable`/`disable`, `configure terminal` (and the interactive `configure`), `ping A.B.C.D [source X|repeat N]`, `ping X:X::X`, interactive `ping`, `traceroute`, `copy running-config startup-config`, `copy startup-config running-config`, `write [memory]`, `write erase`, `erase startup-config`, `reload` (save prompt → factory state → replays startup-config; interfaces without `shutdown` come up), `clear ip nat translation *`, `clear arp-cache`, `clear mac address-table dynamic`, `clear ip ospf process`, `clear counters`, `clear access-list counters`, `terminal length`, `telnet`/`ssh` (stubbed, see below).

*Runtime model (what makes ping honest)* — link status needs both ends up (`shutdown` on either side); sub-interfaces follow their parent; loopbacks are always up; SVIs are up/up only when the VLAN exists and some port (access or trunk) carries it in STP forwarding; DTP (auto+auto stays access; desirable or trunk negotiates; nonegotiate blocks DTP); EtherChannel bundling (LACP active/passive, PAgP desirable/auto, on/on; incompatible modes → `(I)`, inconsistent member config → `(s)`; the Po carries the trunk config; STP cost 12 for 2×Fa, 3 for 2×Gi); per-VLAN STP (root by priority+sys-id-ext then MAC, root port by cost then neighbor bridge ID then port ID, designated/alternate per segment, Edge type for portfast) and blocked ports really don't forward; L2 flooding through switches honoring access VLAN, voice VLAN, trunk allowed list, native VLAN tagging (so a native mismatch leaks exactly as on real gear) and VLAN existence in the local database; MAC learning on every switch a frame crosses; ARP (first IOS echo to an unresolved next hop is lost: `.!!!!`); routing table = connected/local + statics (lowest AD installed, floating hidden until the primary's next hop stops resolving) + OSPF; OSPF adjacency needs both interfaces up, same subnet+mask, same area, neither passive, DR/BDR election by priority then router ID (P2P on serial / `ip ospf network point-to-point`), SPF with cost = reference-bandwidth / interface bandwidth (`ip ospf cost` overrides), equal-cost multipath, loopbacks advertised as /32, `O IA` when the path crosses areas, `O*E2 [110/1]` default from `default-information originate [always]`; inbound ACL → routing → NAT (inside→outside) → outbound ACL on transit traffic (locally generated traffic skips outbound ACLs like IOS); ACL implicit deny, empty/unknown ACL permits, hit counters; static NAT both directions, dynamic NAT one global per inside host (pool exhaustion drops), PAT with per-flow ICMP ids; DHCP leases (lowest free address above the network, honoring excluded ranges) directly or via `ip helper-address` relay, with `show ip dhcp binding`; CDP/LLDP neighbor tables for directly linked IOS devices; port-security static/sticky learning and violation handling (shutdown → err-disabled until `shutdown`/`no shutdown`; restrict/protect drop the offending MAC); IPv6 connected/local/static routes and ND-based `ping ipv6`.

### Out of scope (use Packet Tracer / real gear)

- **Routing protocols other than OSPFv2 single-process**: RIP, EIGRP, BGP, OSPFv3 (`ipv6 ospf` is accepted but not run), multi-process OSPF, OSPF authentication, hello/dead timer mismatch detection, MTU mismatch (EXSTART), stub/NSSA areas, summarization, redistribution. Inter-area routing is approximated (`O IA` tag from path areas; no ABR summary LSAs).
- **FHRP** (HSRP/VRRP/GLBP), **DHCP snooping, DAI, 802.1X, AAA/RADIUS/TACACS+**, **VTP** (accepted as a no-op; VLANs are per-switch and not shown in `show running-config`, matching VTP server mode / Packet Tracer), **private VLANs**, **QoS**, **GRE/IPsec/VPN**, **PPP/HDLC specifics** (serial links come up without `clock rate`), **wireless** (WLC GUI is not a CLI item), **SNMP/syslog servers**, **NetFlow**, **REST/NETCONF/automation**.
- **IPv6 beyond addressing + static routes**: no IPv6 ACLs (`ipv6 access-list` prints a scope notice), no SLAAC/DHCPv6 for hosts, no IPv6 NAT, no OSPFv3, no IPv6 default-route from RA.
- **Telnet/SSH into another device** from the CLI: `telnet`/`ssh -l` are stubbed. The lab UI gives each device its own tab, as the real exam does. Login banners/`login` on vty lines are configured and shown in running-config but no remote login is simulated. The console line's `password`/`login` is not enforced on the session (students land at `>` already).
- **Timers**: no STP convergence delay, OSPF hello/dead timers, DHCP lease expiry, ARP aging, NAT translation timeouts, port-security aging. Everything converges instantly; `show` shows constant times.
- **MD5**: `enable secret 5` / `username secret 5` strings have the IOS *shape* (`$1$mERr$` + 22 chars) but are a deterministic stand-in, not md5crypt. Type 7 is the real algorithm (`cisco` → `0822455D0A16`). Pasting a real hash in works (`enable secret 5 <hash>` is stored verbatim) but `enable` will then not match the original plaintext.
- **`show running-config` byte count** is approximate; IOS orders a few global lines differently across versions. Interface blocks, line blocks, ACL/NAT/route blocks follow IOS 15 order.
- **Hosts** are not simulated beyond IP/ARP/ICMP: no host CLI, no TCP/UDP applications (ACL tests for tcp/udp use the extended-ACL matcher directly; pings are ICMP and are not matched by `permit tcp` lines, which is correct).
- **IOS 15 "exec in config mode" shortcut**: show commands typed in config mode without `do` return `% Invalid input` (older IOS behaviour); `do` works everywhere.
- `interface range` accepts one type per range segment (`f0/1 - 4, g0/1`); it does not support range macros.
- Extended `ping` dialog is reduced to protocol + target; `ping … size/df-bit/sweep` are not implemented.
- `traceroute` prints at most 3 star rows before stopping (IOS continues to 30).

### Hooks for Chat 8 graders

- End state: `lab.state(name)` returns the configuration snapshot (`hostname`, `interfaces[...].ip/switchport/portsec/acl/nat/...`, `vlans`, `routes`, `ospf`, `acls`, `nat`, `dhcp`, `lines`, `users`, `startup`). Runtime (`rt`) is excluded so graders assert on configuration, and use `lab.topo.ping(...)`/`converge()` + `lab.topo.get(name).rt` for *effects* (neighbors, routes, STP roles, translations).
- "Any method accepted": grade effects (does `PC1` reach `SRV`? is `Gi0/1` trunking with native 99? is `R2` in `show ip ospf neighbor`?) rather than exact commands.
- Partial credit: one check per sub-task; the sim never throws on bad input, it returns IOS-style errors.

---

## Lab item fidelity (Chat 8) — what the UI copies and where the facts come from

Source: Cisco Learning blog, *New Performance-Based Lab Exam Items Build Opportunities* (https://blogs.cisco.com/learning/new-performance-based-lab-exam-items-build-opportunities), fetched 2026-10-03. Facts taken from it, verbatim where quoted:

- Layout: "horizontal split screen". "The left panel has three top tabs for easy navigation between the **Tasks** (instructions on the tasks at hand and requirements for each step), **Guidelines** (things candidates should not change), and the **Topology** (a network diagram for tasks). The right panel is a web-based terminal with tabs for each device."
- Terminals: candidates "navigate between terminal tabs using keyboard shortcuts and may manually reorder terminal tabs, but they cannot split the right panel to see two or more terminals at the same time."
- Time: "designed to give candidates 5-7 minutes to complete."
- Grading: candidates "are often free to use their preferred configuration options, as long as they produce the expected outcome" — graded on outcome, "far beyond their respective 'running configuration'". → end-state checks, any method accepted.
- Navigation: "Candidates can skip any item and move to the next item, but they cannot go back to a previous item." (no-backtrack is Chat 9's exam-runner job; the lab UI itself has no Previous.)
- Exam shape (PLAN.md §1, verified Oct 2 2026): ~100–120 items, 120 min, 3–4 lab items, partial credit.

Exam topics: Cisco *200-301 CCNA v1.1 exam topics* PDF (https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf), fetched 2026-10-03. Every lab/reader/PBQ item carries `obj` = a topic number from it (`2.1`, `3.3.d`, …); the pack manifest declares `objPattern: "^[1-6]\\.\\d{1,2}(\\.[a-z])?$"` for the validator.

What the simulated lab item does NOT copy (and why): no draggable tab reordering (keyboard shortcut switching is there); the timer shows the 5–7 minute target rather than enforcing it (the exam has one clock for the whole test); a per-item **Reset** exists because the PBQ Lab offers it on every sim (Cisco's lab item does not advertise one — the real-exam "no Reset, no going back" behaviour belongs to Chat 9's exam mode).

## Lab item schema (`packs/ccna/labs.js`, sim type `ccna-lab`)

```js
{ id: "lab-vlans-trunking", type: "ccna-lab", obj: "2.1", d: 2, title, timeTargetMin: 6,
  topology: { devices: { SW1: { type: "switch", x, y }, R1: { type: "router", x, y }, PC1: { host: true, ip, mask, gw, x, y } },
              links: [["SW1", "g0/1", "SW2", "g0/1"], ["SW1", "f0/1", "PC1"]] },      // same shapes createLab() takes, plus x/y for the diagram (viewBox 480×300)
  configs: { SW1: ["enable", "configure terminal", ...] },                           // pre-config typed as CLI (hidden from the student)
  blocked: ["show running-config", "show startup-config"],                           // analyze lab: prefixes refused with "% This command is disabled in this lab"
  tasks: [{ id: "t1", text: "..." }],                                               // Tasks tab (numbered)
  guidelines: ["Do not change ..."],                                                // Guidelines tab
  answers: [{ id: "a1", prompt: "...", accept: ["Gi0/2", "g0/2"] }],                // analyze lab: text answers graded with the checks
  checks: [{ id, task: "t1", points: 1, type: "vlanExists", device: "SW1", vlan: 10, name: "SALES" },
           { id, guideline: 0, points: 1, type: "runningConfigMatches", device: "SW1", re: "^hostname SW1$" }],  // guideline checks are penalties when they FAIL
  why: "one paragraph shown after grading" }
```
Check types and their fields are documented at the top of `core/sims/ios/ui/labGrader.js`. Scoring: `earned = Σ points of passing task checks`, `penalty = Σ points of failing guideline checks`, `f = clamp((earned − penalty) / Σ task points, 0, 1)`. Solutions (never shipped) live in `dev/solutions/ccna/<id>.{primary,alt,partial}.txt`; `node dev/tests/ccna-labs.test.mjs` proves fresh = 0, primary = alt = 1, partial = its declared score, and that a guideline violation costs points.

## Show-output reader (`packs/ccna/reader.js`, sim type `show-reader`) — Chat 8

GENERATED: `node dev/tools/gen-reader.mjs` builds each scenario in `dev/tools/reader-scenarios.mjs`, runs the show command, stores the exact output, and derives the key from simulator state (generation fails if the key is missing from the options or equals a distractor). Never hand-edit `reader.js`; edit the generator and regenerate.
```js
{ id: "rd-route-1", type: "show-reader", obj: "3.2", d: 3, title, device: "HQ", command: "show ip route", output, q, opts: [4 strings], ans: 0..3, why }
```
Quotas: ≥40 items, ≥3 per command (ip route, ip interface brief, spanning-tree, vlan brief, ip ospf neighbor, ip ospf interface, interfaces trunk, access-lists, ip nat translations, mac address-table, etherchannel summary). Validator: `node dev/validate-ccna-reader.mjs` (also runs `gen-reader --check`).

## Config-order PBQs (`packs/ccna/pbq.js` → `PBQ_ORDER`, sim type `ccna-order`) — Chat 8
```js
{ id: "po-ssh", type: "ccna-order", obj, d, title, prompt, task: [≥2], device: "router"|"switch"|"l3switch", pre?: [cli], steps: [lines, canonical working order], why }
```
Steps are typed from global configuration mode. Graded by `core/sims/ios/ui/configOrder.js`: the student's order is replayed on a fresh device; identical running-config to the canonical order = 100 %, otherwise partial credit for lines in their canonical position (by text). No `eq` list is needed — any working order passes, which `dev/tests/ccna-pbq.test.mjs` checks for every single-line move.

## Topology-label PBQs (`PBQ_TOPO`, core sim type `diagram`) — Chat 8
Reuses Chat 3's diagram placement sim with CCNA palettes (`devices: {root:{n,s}, …}`, `reuse: true` where a label repeats). Keys are read from the simulator in `dev/tools/gen-pbq.mjs` (STP port roles, OSPF interface state, `topo.lookup()` next hops, NAT translation fields, interface NAT roles of a configuration proven to work). Validator: `node dev/validate-ccna-pbq.mjs`; proofs + `--check`: `node dev/tests/ccna-pbq.test.mjs`.

## Tests for this pack
`node dev/tests/ccna-labs.test.mjs && node dev/tests/ccna-pbq.test.mjs && node dev/validate-ccna-reader.mjs && node dev/validate-ccna-pbq.mjs && node dev/check-pack.mjs ccna && node dev/tests/ios-conformance.mjs`, then `python3 dev/tests/ccna-e2e.py` with the repo served on :8765. Preview page: `dev/pages/ccna-lab.html`.
