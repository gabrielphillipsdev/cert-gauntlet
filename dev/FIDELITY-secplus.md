# FIDELITY-secplus.md — does the Sec+ pack feel like the real SY0-701?

Facts verified Oct 2, 2026 against comptia.org (exam page, PBQ FAQ, "performance-based questions explained") and candidate reports. The last step of every Sec+ chat is walking this list and fixing anything red.

Legend: ✅ done · 🟡 partial · ⬜ open (chat that owns it)

## Exam shell
- ✅ Max 90 items, 90 minutes, scored 100–900, **750 to pass** (was 720 in Gym Cards)
- ✅ PBQs presented first
- ✅ Every item revisitable: Back, Next, flag, review grid with jump
- ✅ No pause in exam mode; leaving keeps the clock running (practice mode is pausable and never counts)
- ✅ Unanswered = wrong, no penalty for guessing; "N blank will count wrong" warning on submit
- ✅ Multi-select shows "SELECT TWO/THREE", enforces the count
- ✅ Exhibits shown with the question (monospace block); diagrams inline
- ✅ Raw % shown next to the scaled score so 750 has a feel (community consensus: low-to-mid 80s raw)
- 🟡 Scaled score is linear; the real exam is IRT-scaled. Acceptable — the gate is on raw % anyway
- ✅ In-progress attempt survives leaving, app kill, and switching device
- ⬜ Floating/minimizable instructions pane on PBQs (Chat 3)
- ⬜ Exam-screen calculator (real exam has one) (Chat 3)

## PBQs — real exam uses *simulations*: "approximate environments or tools — firewalls, network diagrams, terminals, operating systems — with restricted functionality but multiple solution paths"; per-item Reset; partial credit; revisitable
- ✅ Reset button on every PBQ (lab and exam); generated sims keep their problem on reset
- ✅ Partial credit (every sim scores 0..1)
- ✅ Order PBQs accept equivalent orders where the objectives define none (`eq`)
- ⬜ Incident console (tabbed hosts, netstat/ps/systemctl/tasklist/firewall commands; stop bad services, block IPs) — the roommate's PBQ (Chat 2)
- ⬜ Firewall rule **editor** (add/delete/reorder/edit rows, graded by effective policy) — today's fwrule only *reads* a table (Chat 2)
- ⬜ Log analysis viewer (multi-source, select evidence lines, classify) (Chat 2)
- ⬜ Drag-and-drop match/order with touch + mouse — today is tap-to-pair (Chat 2)
- ⬜ Network diagram placement (Chat 3)
- ⬜ Wireless AP config panel (Chat 3)
- ⬜ Endpoint hardening panel (Chat 3)
- ⬜ Every exam bank gets ≥1 console sim and ≥1 firewall editor among its 5 PBQs (Chat 3)
- ⬜ PBQ Lab ≈ 24 sims across all types (Chat 3)

## Content
- ✅ 85 MC/MS per bank, domain quotas match 12/22/18/28/20; ≥8 multi-select, ≥10 exhibits per bank
- ✅ Every item tagged with its SY0-701 objective (`obj`), validator enforces
- 🟡 Objective coverage: 4.2 (asset management) has no exam-bank items, 4.9 (data sources) only PBQs — add 2–3 bank items each (Chat 3)
- ✅ Malware cards live under attacks (2.4), not social engineering
- ✅ CompTIA voice: MOST / BEST / FIRST stems; distractor explanations on every option
- ⬜ Plain-text exports of each bank for second-model review (`dev/export/`) (Chat 3)

## Devices
- ✅ iPhone: single column, safe-area insets, pinch-zoom allowed
- ✅ iPad: real tablet layout (720px reading column, 2-col picker); ≥1024px exam shows question-grid rail + question pane
- ✅ Offline: service worker precaches shell, caches packs on first use
- ✅ Progress merges record-by-record across devices; in-progress exams follow you
