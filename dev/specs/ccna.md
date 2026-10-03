# ccna pack — content spec

> Status: the **IOS simulator engine** section (Chat 7) and the **lab item / show-output reader / PBQ** sections (Chat 8) are written. The content sections (cards, twins, exam banks, show-output reader, lab items) are still to be written by the chats that build them (8 and 9), following the shape of `dev/specs/secplus.md`: files + exports, categories/domains with weights, every item schema, quotas, and the objective-tag rule (`obj` on every item, validator-enforced). Those chats also add the pack's exam rules to `packs/ccna/pack.js` (see `dev/ENGINE.md` → Pack manifest) and a `dev/FIDELITY-ccna.md` checklist built from the verified exam format in PLAN.md §1/§5.

Blueprint: Cisco 200-301 v1.1 — Network Fundamentals 20%, Network Access 20%, IP Connectivity 25%, IP Services 10%, Security Fundamentals 15%, Automation & Programmability 10%. Exam facts (no backtracking, 3–4 lab items with tabbed IOS terminals, 5–7 min each, partial credit) are in PLAN.md §1 and §5 and are the reason the simulator exists.

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
