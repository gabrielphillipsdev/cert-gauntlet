# FIDELITY-ccna.md — does the CCNA pack feel like the real 200-301 v1.1?

Built from the verified exam format (dev/specs/ccna.md §1: Cisco's v1.1 exam-topics PDF fetched Oct 3, 2026; PLAN.md §1/§5; Cisco Learning Network score-report post). The last step of every CCNA chat is walking this list and fixing anything red.

Legend: ✅ done · 🟡 partial / accepted difference · ⬜ open (chat that owns it)

## Exam shell
- ✅ 120-minute clock, no pause in exam mode; leaving keeps the clock running and the attempt resumes on any device (practice mode pauses and never counts)
- ✅ **No backtracking on any item** (`exam.backtrack:false`): no Back button, no Review grid, no flag, no jumping either way — the iPad rail is read-only progress; Review-screen code paths refuse to render
- ✅ **"Next is final"** confirmation on every Next, naming whether the item is a question or a lab and warning when it is unanswered; the last Next asks to submit (there is no end-of-exam review on Cisco)
- ✅ 100 questions per exam + 4 lab slots = 104 items (real exam ~100–120)
- ✅ Multi-response says "(Choose two.)" / "(Choose three.)" in the stem, enforces the count, graded **all-or-nothing** (e2e: half-right MS items score 0)
- ✅ Drag-and-drop: `order` (sequence) and `build` (pick the right subset, ordered or unordered), touch + mouse, all-or-nothing
- ✅ Exhibits: real-shaped IOS/client/JSON output in a monospace block above the stem ("Refer to the exhibit.")
- ✅ Scaled 300–1000 (Cisco's scale); raw % beside it. Pass line 825 is the commonly reported figure — Cisco does not publish it — so the **gate** (85% raw on a fresh exam, every domain ≥ 70%, twice in a row) is what decides booking
- 🟡 Scaled score is linear; Cisco's is not published. Acceptable — the gate is on raw %
- ✅ Per-domain readout with blueprint weights and point counts, bars coloured against the 85% gate and the 70% domain floor
- ✅ Random mix draws to the blueprint quota (20/20/25/10/15/10 of 100)
- ✅ Unanswered = wrong, no guessing penalty; Sure / Leaning / No-clue calibration report
- ✅ Post-exam: miss review with every option's explanation and the correct drag-drop order; drill of misses + guesses with instant feedback (drill keeps a list view — it isn't the exam)

## Lab items (Chat 8 owns the labs)
- ✅ 4 lab slots per exam (`exam.labSlots`, `packs/ccna/exam-labs.js`), topics spread so A/B/C together cover all 12 lab topics; partial credit × 3 points each
- ✅ Lab items are placed like the real exam: mixed among the questions at random positions (`pbqFirst:false`), not grouped
- ⬜ **Chat 8:** ship `packs/ccna/labs/index.js` (`LABS` with `topic`, `d`, `obj`) and flip `LABS_READY` — contract in dev/specs/ccna.md §7. Until then each exam is its 100 questions and the picker says so
- ⬜ **Chat 8:** lab UI copies Cisco's (Tasks / Guidelines / Topology tabs left, tabbed terminals right), 5–7 min target, end-state grading

## Content
- ✅ Blueprint v1.1 topics fetched from Cisco and stored as the tag map (`dev/specs/skills-ccna.json`); every item carries `obj` = topic or sub-topic; validator enforces topic exists, domain matches, deck matches
- ✅ 481 cards across 26 decks / 6 domains (98 · 92 · 111 · 54 · 79 · 47); every v1.1 topic has cards
- ✅ 52 confusable twins incl. every required pair (OSPF states, STP states/roles, standard vs extended ACL placement, NAT types, FHRPs, 802.11 standards/bands, Ansible vs Terraform and vs Puppet/Chef, REST verbs, JSON vs YAML, TCP vs UDP apps, collision vs broadcast domains, SVI vs routed port)
- ✅ 3 × 100 exam questions, exact blueprint quota per bank, every v1.1 topic in every bank; A 14 MS · 5 order · 5 build · 50 exhibits, B 20 · 5 · 5 · 46, C 20 · 4 · 5 · 59
- ✅ 6.6 uses v1.1 wording (Ansible and Terraform); Puppet/Chef only as distractors and one contrast twin
- ✅ Independent wrong-key review of all 300 bank items by reviewers that did not write them: 0 wrong keys; 13 fixes (P2P OSPF exhibits showing Pri 0 / POINT_TO_POINT, MTU mismatch EXSTART vs EXCHANGE side, proxy-ARP ambiguity, unresolvable default route in an exhibit, route ordering, `show vlan brief` wrapping, CDP timer range, platform/port mismatch, missing router-ID mapping). Cards + twins reviewed too: 0 fact errors in defaults, ports, timers or syntax; 13 wording, twin-ambiguity and MC-overlap fixes
- ✅ Speed rounds: masks (/n ↔ dotted ↔ hosts ↔ wildcard), administrative distance, ports, syslog levels, acronyms; reference sheet (AD, forwarding order, OSPF states/requirements, STP costs/roles/guards, EtherChannel + DTP matrices, ACLs, NAT terms, FHRPs, syslog, ports, IPv6 types, 802.11, wireless security, REST, Ansible vs Terraform)
- ✅ Plain-text exports for second-model review: `node dev/export-ccna.mjs` → `dev/export/ccna-bank-{a,b,c}.txt`, `ccna-cards.txt`, `ccna-twins.txt`
- ⬜ **Gabe:** second-model (Gemini/ChatGPT) pass over the exports; findings filed as issues
- 🟡 Seven sub-bullets are taught on cards but not asked in any bank by their sub-letter (1.1.d–g, 1.2.a, 1.2.e, 1.3.b); their parent topics are in every bank
- 🟡 Long IOS table rows (`show ip ospf neighbor` with full interface names, `show glbp brief`) exceed 78 chars and wrap on iPhone (13 exhibits); kept verbatim because IOS prints them that wide

## Devices
- ✅ iPhone 390×844 and iPad 1024×1366: a full 100-item exam runs end to end in exam mode (`python3 dev/tests/e2e-ccna.py`): keyed answers → 100% / 1000 / gate; three deliberate all-or-nothing misses → exactly those three missed
- ✅ iPad ≥1024px shows the progress rail beside the question; phones single column
- ✅ Subnetting trainer (Chat 4) stays standalone at `packs/ccna/subnet/`

## Simulator findings for the IOS owner (Chat 7/8; out of Chat 9's scope)
- `show ip ospf interface brief` throws when a loopback is in OSPF (`commands.js:177`, null state)
- `show ip ospf interface` on point-to-point prints `State P2P, Priority 1`; IOS prints `State POINT_TO_POINT` and P2P neighbors show Pri 0
- ECMP: `show ip route` drops the second equal-cost next hop
- IPv6 solicited-node groups print with a leading zero (`FF02::1:FF00:0101`) and the `::1` group is missing
- `show ipv6 route` adds an exit interface to recursive statics; `show ip route <prefix>` lacks "Routing Descriptor Blocks"
- Static NAT: the router doesn't answer ARP for the inside-global address; pipe filters (`| include`) unsupported

## Chat 9 run log (2026-10-03)
- `node dev/check-ccna.mjs all` → PASS · `node dev/check-pack.mjs ccna` → PASS (481 cards · 52 twins · banks 100/100/100)
- `python3 dev/tests/e2e-ccna.py` → PASS on iPhone and iPad
