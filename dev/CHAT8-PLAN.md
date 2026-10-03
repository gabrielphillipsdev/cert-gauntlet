# Chat 8 — CCNA Lab UI, Labs, Show-Output Reader, PBQs
## Execution plan (written for handoff; follow in order, don't skip the verification steps)

Branch: `chat-8/ccna-labs`. Allowed to touch: `/core/sims/ios/ui/`, `/packs/ccna/`, `/dev/`.
NOT allowed: `/core/sims/ios/*` engine files from Chat 7, `/core/engine|store|sync|exam`, other packs.
If something in `/core` is genuinely missing, STOP and tell Gabe — do not patch it in this chat.

Hard rule for the whole chat: **every grading claim is proven by a script, not by eye.** Labs, reader
answers, config-order equivalences and topology-label answers are all checked by running Chat 7's
simulator, never asserted from memory. All content text is original and every item carries a
200-301 v1.1 exam-topic number (e.g. `2.1.a`).

---

## Phase 0 — Orientation (do all of this before writing any code)

0.1 Attach the repo with push access (`add_repo` gabrielphillipsdev/cert-gauntlet, access=push),
    clone it, check out `main`, create `chat-8/ccna-labs`. `git log --oneline -20` to confirm which
    chats have merged. **Chat 7's simulator must be on main.** If `/core/sims/ios/` is absent, check
    for an unmerged `chat-7/ios-sim` branch; if nothing exists, stop and report — this chat cannot
    proceed without it.

0.2 Read, in this order, and take notes in `/dev/CHAT8-NOTES.md` (actual function names, file
    paths, schemas — a later model works from these notes, not from assumptions):
    - `/dev/PLAN.md` §5 (CCNA pack) and §6 Chat 8 row.
    - `/dev/ENGINE.md`: sim registry API (how a sim component registers, what props it receives,
      how it reports a score/partial credit, Reset contract, instructions-pane contract), item
      schema conventions, pack manifest format, the symbol-key-row component, validator runner.
    - `/dev/specs/ccna.md`: what Chat 7 declared in/out of scope for the simulator.
    - `/core/sims/ios/` (Chat 7): find the public API. Expected shape — something like
      `createTopology({devices, links})`, `device.exec(line)` → output string, prompt accessor,
      Tab/`?` completion hooks, `ping(from, dst)`, and state accessors (interfaces, VLANs, routing
      table, ACLs, NAT table, OSPF neighbors, port-security, EtherChannel, DHCP pools, STP state,
      running-config text). Write down the exact names. If state accessors don't exist and only
      `show` text does, the grader parses `show` output — note that.
    - `/core/sims/` existing components from Chats 2/3 (incident console, firewall editor,
      drag-drop match/order, network diagram placement): copy their conventions (Reset, partial
      credit, floating instructions pane, touch+mouse) and reuse the drag-drop order component for
      config-order PBQs and (if generalizable) the diagram-placement component for topology PBQs.
    - `/packs/secplus/` for how items/labs/manifest are laid out; `/packs/ccna/` for what Chat 4
      (subnetting) already put there.
    - `/dev/tests/` for the test runner convention (plain `node`? a runner script? naming).
    - `/dev/FIDELITY-*.md` and the Chat 9 prompt: Chat 9 owns cards/twins/banks and `/packs/ccna/`
      except the labs folder. This chat owns `/packs/ccna/labs/`, `/packs/ccna/reader/`,
      `/packs/ccna/pbq/`. Don't create cards or banks.

0.3 Verify the simulator actually works before depending on it: run Chat 7's conformance suite.
    Then write a 10-line smoke script: build a 2-router topology, configure IPs, ping, assert
    success. If it fails, stop and report.

0.4 Fetch Cisco's official 200-301 v1.1 exam topics page and the Cisco exam-tutorial / lab-item
    description page (search, then WebFetch). From them, confirm: tab names on the lab item
    (Tasks / Guidelines / Topology), terminals tabbed per device, 5–7 minute guidance, partial
    credit, no backtracking. Record source URLs in `/dev/specs/ccna.md` under a "Lab item fidelity"
    section. Facts come from these pages, not memory.

Create a task list (TaskCreate) with Phases 1–7 so progress is visible.

---

## Phase 1 — Lab item schema + end-state grader (no UI yet; testable headlessly)

1.1 Schema `/packs/ccna/labs/<lab-id>.json` (also document it in `/dev/specs/ccna.md`):
```
{
  "id": "ccna-lab-vlans-trunking",
  "type": "ccna-lab",
  "title": "...",
  "objectives": ["2.1.a", "2.1.b"],
  "timeTargetMin": 6,
  "topology": {
    "devices": [ { "name": "SW1", "kind": "switch", "x": 120, "y": 80 }, ... ],
    "links":   [ { "a": "SW1 Gi0/1", "b": "SW2 Gi0/1" }, { "a": "R1 Gi0/0", "b": "SW1 Gi0/2" } ],
    "hosts":   [ { "name": "PC1", "ip": "10.1.10.10", "mask": "255.255.255.0", "gw": "10.1.10.1", "attach": "SW1 Fa0/1", "x":..., "y":... } ]
  },
  "initialConfigs": { "SW1": ["hostname SW1", "interface Gi0/1", "no shutdown", ...], "R1": [...] },
  "blockedCommands": [ "show running-config", "show run" ],      // used by the analyze lab only
  "tasks": [ { "id": "t1", "text": "Create VLAN 10 named SALES and VLAN 20 named HR on SW1 and SW2." }, ... ],
  "guidelines": [ "Do not change the hostname of any device.", "Do not shut down Gi0/1 on either switch.", ... ],
  "answers": [ { "id": "a1", "prompt": "Which port is blocking?", "accept": ["Gi0/2","g0/2","gigabitethernet0/2"] } ],  // analyze lab only
  "checks": [
    { "id": "c1", "task": "t1", "points": 1, "type": "vlanExists", "device": "SW1", "vlan": 10, "name": "SALES" },
    ...
    { "id": "g1", "guideline": true, "points": -1, "type": "runningConfigMatches", "device": "SW1", "regex": "^hostname SW1$" }   // negative = penalty if it FAILS
  ]
}
```
    Hosts are simulated minimally: if Chat 7's model has no PC concept, implement a "host" as an
    extra device with one interface configured from `hosts[]` (or use the simulator's ping with a
    source IP) — write down which. Device x/y are explicit so the topology SVG is deterministic.

1.2 Check types (implement in `/core/sims/ios/ui/labGrader.js`, exported `gradeLab(lab, topology)`).
    Prefer **state/behavior** checks; use regex-on-running-config only for things the state API
    can't express (banner text, service password-encryption, descriptions).
    - `interfaceIp`, `interfaceUp`, `ipv6Address` (accept compressed/expanded forms — normalize)
    - `vlanExists`, `accessVlan`, `voiceVlan`, `trunk` (mode, native, allowed-list set-equality)
    - `staticRoute` (prefix+mask; next-hop OR exit-interface accepted when the lab allows either;
      `admin` for floating), `defaultRoute`
    - `ospfNeighborUp` (device, neighbor), `ospfRoute` (prefix appears via O), `ospfPassive`,
      `ospfRouterId`
    - `aclPacket` (device, acl, packet{src,dst,proto,dport,sport} → expect permit|deny) — evaluate
      through the simulator's ACL engine; `aclApplied` (iface, direction, name|number).
      Numbered vs named both accepted when the task doesn't specify.
    - `natInside`/`natOutside` on interfaces, `natTranslates` (send a simulated packet / ping from
      inside host, assert translation table entry with expected outside address or pool range)
    - `etherChannel` (po-id, members set, protocol LACP/PAgP, mode active/passive/desirable/auto,
      operational up)
    - `dhcpPool` (network, default-router, dns optional, excluded ranges), `dhcpHelper`
    - `portSecurity` (max, violation mode, sticky, enabled)
    - `sshReady` (ip domain-name set, RSA key generated, username exists, vty `login local`,
      `transport input ssh`), `enableSecretSet`, `bannerSet`, `servicePasswordEncryption`,
      `consolePasswordSet`
    - `ping` { from, to, expect } — the strongest check; use it on every connectivity lab.
    - `svi` (interface vlan N ip), `ipRoutingEnabled`, `subinterface` (encapsulation dot1q N, ip)
    - `answer` { id, accept[] } for the analyze lab (case-insensitive, whitespace-trimmed, short
      interface forms normalized)
    - `runningConfigMatches` / `runningConfigNotMatches` { device, regex } — fallback + guidelines
    Return `{ score, max, pct, tasks: [{ id, earned, max, checks: [{ id, pass, detail }] }],
    penalties: [...] }`. pct = clamp((earned − penalties) / max, 0, 1). Partial credit is per
    check, summed per task.

1.3 Solutions live OUTSIDE the pack so the app never ships answers:
    `/dev/solutions/ccna/<lab-id>.primary.txt` — one command per line, `! device NAME` lines switch
    device. Also `<lab-id>.alt.txt` for a different valid method (e.g. named vs numbered ACL,
    exit-interface vs next-hop, abbreviated commands `int g0/1` / `ip add`, config via `interface
    range`) and `<lab-id>.partial.txt` with an expected pct in `<lab-id>.partial.json`.

1.4 Test `/dev/tests/ccna-labs.test.mjs` (match the repo's runner convention). For each lab:
    a. Load lab, build topology, apply initialConfigs. Grade → assert pct == 0 **and** assert no
       positive check passes (catches checks that are trivially true on the starting config).
    b. Apply primary solution → pct == 1.0, zero penalties.
    c. Apply alt solution → pct == 1.0.
    d. Apply partial solution → pct within ±0.01 of expected.
    e. Apply primary solution + one deliberate guideline violation → penalty recorded, pct < 1.
    f. Analyze lab: assert each blocked command returns the blocked message and does not change
       state; assert correct answers score and wrong ones don't.
    This test is the "all labs grade correctly in a scripted test" acceptance criterion.

---

## Phase 2 — Lab item UI (`/core/sims/ios/ui/labItem.js` + `labItem.css`), registered as `ccna-lab`

2.1 Layout (copy Cisco's lab item):
    - ≥1024 and iPad (≥768): left pane ~34% with tabs **Tasks | Guidelines | Topology**; right pane
      with one tab per device, each a terminal. Toolbar on top: lab title, elapsed timer with the
      5–7 min target (turns amber at target, red at +2 min), **Reset**, **Submit**.
    - <768 (phone): single column; a segmented control switches Tasks/Guidelines/Topology/Terminal;
      the engine's symbol key row appears above the terminal input (`| ? / - _ : . ( ) " Tab Up`
      — Up = previous command). Verify it renders on a 390px viewport.
    - Safe-area insets honored; pinch-zoom not blocked.
2.2 Terminal: scrollback `<pre>` + single-line `<input>` showing the simulator's live prompt
    (`R1(config-if)#`). Enter → `device.exec(line)`, append echo + output. Up/Down = history.
    Tab → simulator completion. `?` → help output inline (don't submit the line). Ctrl+L / `clear`
    clears scrollback. Ctrl+Z → `end` (match IOS). Ctrl+1..9 or Alt+1..9 → switch device tab.
    Commands in `blockedCommands` (prefix-matched after abbreviation expansion) return
    `% This command is disabled in this lab` and do not reach the simulator.
2.3 Topology tab: SVG from lab.topology (device icons by kind: router circle, switch rectangle,
    host small box; link lines labeled with interface names at each end). Tap/click a device →
    opens/focuses its terminal tab (on phone, switches to Terminal view). Hosts are not
    clickable unless the lab marks them `console: true`.
2.4 Answers panel (analyze lab): rendered under Tasks as text inputs; included in grading.
2.5 Reset: confirm dialog → rebuild topology from initialConfigs, clear terminals/history, timer
    keeps running (Cisco's does). Submit: grade, show per-task results with check detail and
    pct; report to the sim registry exactly as other sims do (read ENGINE.md for the call).
2.6 Instructions pane: reuse the shared floating/minimizable pane component from Chat 2/3 for
    the Tasks text so the user can keep it visible over a terminal on iPad.
2.7 Add a standalone dev page `/dev/pages/ccna-lab.html?lab=<id>` that loads any lab outside the
    engine for quick iteration — cheap and makes iPad testing easy. Record it in the notes.

---

## Phase 3 — Author the 12 labs (each: topology + initialConfigs + tasks + guidelines + checks +
primary/alt/partial solutions + passing tests). Keep each at 3–5 subtasks and a 5–7 min target.

| # | id | Topology | Core tasks | Key checks |
|---|---|---|---|---|
| 1 | vlans-trunking | SW1–SW2 trunk, 2 PCs each | create VLANs 10/20 named; assign access ports; 802.1Q trunk, native 99, allowed 10,20,99 | vlanExists, accessVlan, trunk, ping PC1→PC3 same VLAN succeeds, cross-VLAN fails |
| 2 | router-on-a-stick | R1–SW1, PCs in VLAN 10/20 | subinterfaces dot1q 10/20 with IPs, trunk SW1→R1, no shut | subinterface, trunk, ping PC1→PC2 across VLANs |
| 3 | svi-routing | L3 switch SW1 + PCs | ip routing, SVIs 10/20/30, access ports | svi, ipRoutingEnabled, ping cross-VLAN |
| 4 | static-default-routes | R1–R2–R3 chain, LAN each end | statics on R1/R3, default on stub, floating backup | staticRoute, defaultRoute (admin 5 for floating), ping end-to-end |
| 5 | ospf-single-area | R1–R2–R3 triangle + LANs | OSPF 1 area 0 with network/wildcard, router-ids, passive LAN ifaces, default-information originate on R1 | ospfNeighborUp ×3, ospfRoute, ospfPassive, ping |
| 6 | acls | R1 with inside LAN, server LAN, Internet | standard ACL on vty-style host restriction near destination; extended ACL blocking HTTP from 10.1.10.0/24 to server, permit everything else; apply inbound | aclPacket (deny 80, permit 443, permit other hosts), aclApplied; numbered or named accepted |
| 7 | nat-pat | R1 inside LAN, outside ISP | static NAT for a server, PAT with overload for LAN using outside interface, inside/outside marks | natInside/Outside, natTranslates (static + overloaded), ping from PC to ISP |
| 8 | etherchannel | SW1–SW2 2 parallel links | Po1 LACP active/passive, trunk on Po1 | etherChannel (members, protocol, mode), trunk on Po1, ping across |
| 9 | dhcp | R1 with 2 LANs, SW2 remote | pool + excluded + default-router + dns, helper-address on remote SVI/subif | dhcpPool, dhcpHelper, runningConfig for lease (if the sim binds leases, use `show ip dhcp binding` check) |
| 10 | port-security | SW1 access ports | enable, max 2, sticky, violation restrict on Fa0/1; shutdown on Fa0/2 | portSecurity ×2, guideline: don't touch Fa0/3 |
| 11 | ssh-hardening | R1 | hostname+domain, RSA 2048, user, vty login local + ssh only, enable secret, service password-encryption, banner motd, console password | sshReady, enableSecretSet, servicePasswordEncryption, bannerSet, consolePasswordSet |
| 12 | ipv6-addressing | R1–R2 + LANs | global unicast /64s, eui-64 on one, link-local manual on one, ipv6 unicast-routing, static ::/0 | ipv6Address (normalized), ping6 (if the sim supports; else routing-table check) |
| 13 (the analyze lab) | analyze-show-output | pre-broken 3-switch STP + 2-router OSPF topology; `show running-config` blocked | answer 5 questions using only `show` commands: root bridge, blocked port, why OSPF neighbor missing (area mismatch), next hop for a prefix, trunk native mismatch | answer ×5, blocked-command test |

(That's 13 ids; the prompt counts "analyze" within the 12 — keep all of them; the plan said 12 labs
and it's fine to ship 13.) Each lab's `guidelines` must include at least two concrete "do not"
items wired to penalty checks. Starting configs must be realistic: hostnames, some interfaces
already up, `no ip domain-lookup` — a candidate should not spend time on boilerplate the exam
gives them.

Authoring loop per lab: write solution first → run it through the simulator by hand (dev page or
node) → confirm the end state is what you expect → write checks → run the test → only then write
the task prose. If the simulator can't support a task (e.g. no DHCP bindings), swap the check for
one it can prove and note the gap in `/dev/specs/ccna.md` for Chat 7 follow-up — don't fake it.

---

## Phase 4 — Show-output reader (`/packs/ccna/reader/*.json`, 40 items, 4 per show type)

Show types (exactly as the prompt lists): ip route, ip interface brief, spanning-tree, vlan brief,
ip ospf neighbor, ip ospf interface, interfaces trunk, access-lists, ip nat translations, mac
address-table, etherchannel summary (that's 11 — give the two OSPF ones 3 and 4 so the total is 40,
or do 4 each = 44; either is fine, ≥40).

4.1 **Generate the output text from the simulator, don't hand-write it.** Script
    `/dev/tools/gen-reader-output.mjs`: for each item, a small topology + config → run the show
    command → paste the exact output into the item. This guarantees "real-shaped" output that is
    consistent with Chat 7's rendering and makes the answer provably correct. Keep the generator
    config in the item under `"_source"` (stripped by the validator from app builds? — no, just
    leave it; it's small) so a reviewer can regenerate.
4.2 Item schema: `{ id, type: "show-reader", objective, command, output, question, choices[4],
    answer (index or array for multi-response), explanation, _source }`. Question styles: next hop
    / admin distance / metric for a prefix; which interface is down/down vs administratively down;
    which port is root/designated/blocked and why; which VLANs are allowed/active on a trunk; why
    an OSPF neighbor is stuck (EXSTART = MTU, missing = area/timers/passive); which ACE matched
    (hit counts); which inside-local maps to which inside-global; which MAC is on which port /
    dynamic vs static; Po flags (SU vs SD, P vs I/w).
4.3 Validator `/dev/validate-ccna-reader.mjs`: 40+ items, unique stems, 4 choices, answer
    in range, each item's `output` regenerated from `_source` matches stored text byte-for-byte,
    objective tag matches the v1.1 topic regex, ≥3 items per show type.
4.4 Wire into the pack manifest as a question collection using the existing MC item renderer
    (check ENGINE.md — if the MC renderer can show a `<pre>` block, use it; if not, the reader
    gets a tiny renderer in `/core/sims/ios/ui/showReader.js`).

---

## Phase 5 — Config-order PBQ (10) and topology PBQ (10) → `/packs/ccna/pbq/`

5.1 Config-order: reuse Chat 2's drag-drop **order** component with its equivalence spec.
    Item = shuffled config lines → correct working order, with `equivalence` groups listing lines
    whose relative order doesn't matter. **Prove each equivalence with the simulator**: test
    `/dev/tests/ccna-pbq-order.test.mjs` runs the canonical order and every permutation allowed
    by the equivalence spec, asserts identical end state (running-config normalized) — and runs
    one disallowed permutation and asserts it either errors (`% Invalid`, wrong mode) or produces a
    different state. Topics: SSH setup, router-on-a-stick, OSPF, named extended ACL + apply,
    PAT, DHCP pool, EtherChannel, port-security, static + floating route, VLAN + trunk.
5.2 Topology PBQ: labels dragged onto slots on a diagram. First check Chat 3's network-diagram
    placement component: if it accepts arbitrary label palettes and slot ids, reuse it with a
    CCNA diagram SVG per item. If it's device-icon-specific, write `/core/sims/ios/ui/
    topologyLabel.js` (same Reset/partial-credit/instructions conventions, touch+mouse) — do NOT
    modify Chat 3's component. Items (10): STP root/designated/blocked ×3 (verify roles by building
    the topology in the simulator and reading its STP state), OSPF DR/BDR ×2 (priority/RID rules),
    next-hop per prefix ×2, NAT inside/outside ×2, OSPF area labels / passive ×1. Per-slot scoring.
    Test: `/dev/tests/ccna-pbq-topology.test.mjs` — simulator-derived answers equal the item key.
5.3 Validator for both (`/dev/validate-ccna-pbq.mjs`): counts, objective tags, unique stems, every
    label used exactly once per item, no slot without an answer.

---

## Phase 6 — Pack wiring

- `/packs/ccna/manifest.json`: add `labs`, `reader`, `pbq` collections and sim types
  (`ccna-lab`, order, topology-label). Do not add cards/twins/banks (Chat 9). Add a
  `labSlots: 3` hint for Chat 9's exam assembler if ENGINE.md's manifest supports it; else note it.
- Service worker precache list: add the new files the same way Chats 2/3 did (check `sw.js`
  mechanism — if it globs the pack dir, nothing to do; if explicit, append).
- Cert picker / CCNA home: a "Labs", "Show Reader", "PBQs" entry per the engine's pack navigation.

---

## Phase 7 — Verification, fidelity, PR

7.1 Run **every** validator in `/dev/` and every test in `/dev/tests/` (including Chat 7's suite
    — you may have discovered sim bugs; report them, don't fix them here).
7.2 `/dev/FIDELITY-ccna.md`: add/mark lab-item rows: Tasks/Guidelines/Topology tabs ✓, tabbed
    terminals ✓, click device → terminal ✓, 5–7 min target ✓, Reset ✓, partial credit ✓, any
    method accepted ✓ (cite the alt-solution tests), no backtrack (Chat 9), lab placement (Chat 9).
7.3 Manual device pass: open the dev page at 390px and 1024px widths (headless browser screenshot
    via the shell if available — e.g. playwright/chromium if installed; otherwise describe what to
    check). Note anything that could not be verified.
7.4 Commit in logical chunks (schema+grader, UI, labs, reader, pbqs, wiring, docs). Push. Open the
    PR `chat-8/ccna-labs → main` with a changelog: files added, counts (13 labs, N reader items,
    10+10 PBQs), test commands, known gaps, and "Gabe to verify: complete lab `vlans-trunking` on
    iPad in < 7 min via `?lab=` dev page or the CCNA pack's Labs tab".
7.5 Update `/dev/CHAT8-NOTES.md` with final state and anything Chat 9 needs (lab ids for exam
    slots, how to call `gradeLab`, manifest keys).

## Done criteria (from the prompt)
- `ccna-labs.test.mjs` passes for all labs (fresh=0, primary=1, alt=1, partial=expected, penalty).
- All `/dev` validators pass.
- Gabe completes a lab on iPad in under 7 minutes (he reports; the PR names which lab to try).
- PR open with changelog.
