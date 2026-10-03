# FIDELITY-ccna.md — does the CCNA pack feel like the real 200-301 v1.1?

Lab-item facts verified Oct 3, 2026 against Cisco's *New Performance-Based Lab Exam Items Build Opportunities* (blogs.cisco.com/learning) and the 200-301 v1.1 exam topics PDF; exam-shell facts from PLAN.md §1 (verified Oct 2, 2026). Sources and quotes: `dev/specs/ccna.md` → "Lab item fidelity". The last step of every CCNA chat is walking this list and fixing anything red.

Legend: ✅ done · 🟡 partial · ⬜ open (chat that owns it)

## Lab items (Chat 8 — `core/sims/ios/ui/labItem.js`, sim type `ccna-lab`)
- ✅ Horizontal split: left panel with three top tabs **Tasks / Guidelines / Topology**; right panel a terminal **with a tab per device**
- ✅ Guidelines tab lists "things candidates should not change"; breaking one costs points (guideline checks are penalties) — every lab has ≥2, `dev/tests/ccna-labs.test.mjs` proves a violation lowers the score
- ✅ Keyboard shortcuts between terminal tabs (Alt/Ctrl+1…9), plus Tab completion, `?` help, Up/Down history, Ctrl+Z → `end`, Ctrl+L clear, Ctrl+C cancels a prompt
- ✅ Clicking a device on the Topology tab opens its terminal (tap on phone switches to the terminal view)
- ✅ One terminal at a time (no split view), like the exam
- 🟡 Terminal tabs cannot be dragged to reorder (the exam allows it; shortcuts cover the speed need)
- ✅ **5–7 minute** target shown with a running timer (amber at target, red at target + 2 min); every lab's target is 5–7 and its shortest solution is ≤ ~3 min of typing
- ✅ Graded on **end state**, any method: checks read configuration state and behaviour (ping, packet through ACLs, OSPF adjacency, NAT table, DHCP lease), not command text. Every lab has an `alt` solution using a different method (named vs numbered ACL, `ip ospf` vs `network`, pool vs interface PAT, exit-interface routes, `interface range`, abbreviations) that must also score 100 %
- ✅ **Partial credit** per sub-task (each task has weighted checks); `partial` solutions prove intermediate scores
- ✅ `show running-config` blocked in the analyze-output lab (`blocked`), answers typed into the Tasks pane
- 🟡 Reset: present (PBQ Lab convention, timer keeps running). Cisco does not advertise a per-lab Reset — Chat 9 decides whether exam mode hides it
- ⬜ No going back once a lab is left (exam runner, Chat 9 — `backtrack:false` is already in the manifest)
- ⬜ 3–4 labs placed in each exam form (Chat 9)
- ✅ Works on iPad landscape (side-by-side panes), iPad portrait (stacked, both on screen), phone (one pane at a time + IOS symbol key row) — `dev/tests/ccna-e2e.py`
- ⬜ Gabe completes a lab on a real iPad in under 7 minutes (manual; PR names the lab)

## Simulator behind the labs (Chat 7 engine — gaps found by Chat 8, see `dev/CHAT8-NOTES.md`)
- 🟡 ACL `remark` crashes packet matching; `show ip ospf interface brief` can throw → contained by `safeExec` (student sees `% Internal simulator error…`), fix belongs in `core/sims/ios`
- 🟡 Global non-mode commands (`ip route`, `access-list`) rejected from sub-modes; `enable` at `#` rejected; no proxy-ARP / static-NAT ARP; loopback `ip ospf network point-to-point` still /32 — labs and PBQs are written around them

## Show-output reader (Chat 8 — `packs/ccna/reader.js`, sim type `show-reader`)
- ✅ 40 items over the 11 required commands (ip route, ip int brief, spanning-tree, vlan brief, ip ospf neighbor/interface, interfaces trunk, access-lists, ip nat translations, mac address-table, etherchannel summary), ≥3 each
- ✅ Output is real simulator output and every key is derived from simulator state (`dev/tools/gen-reader.mjs`; validator re-runs it)
- 🟡 No "stuck in EXSTART/MTU" or timer-mismatch items: the simulator does not model them (adjacency questions use area mismatch, passive, DR/BDR, priority 0)

## Config-order + topology PBQs (Chat 8 — `packs/ccna/pbq.js`)
- ✅ 10 config-order items graded by replaying the order in the simulator: **any working order is accepted** (the test checks every single-line move)
- ✅ 10 topology-label items (STP root/designated/blocked ×3, DR/BDR ×2, next hop ×2, NAT terms + inside/outside ×2, OSPF passive ×1), keys read from simulator state; touch + mouse, per-slot partial credit

## Exam shell (Chat 9)
- ⬜ ~100–120 items, 120 min, **no backtracking on any item**, "Next is final" warning
- ⬜ Multi-response all-or-nothing; drag-drop; 3–4 lab items
- ⬜ Per-domain readout vs the 85 % gate
