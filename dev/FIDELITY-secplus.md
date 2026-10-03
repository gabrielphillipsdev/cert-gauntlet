# FIDELITY-secplus.md — does the Sec+ pack feel like the real SY0-701?

Facts verified Oct 2, 2026 against comptia.org; Chat 3 pass Oct 2, 2026 (exam page, PBQ FAQ, "performance-based questions explained") and candidate reports. The last step of every Sec+ chat is walking this list and fixing anything red.

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
- 🟡 Sticky, minimizable **Task pane** on PBQs (`taskPane()` in `core/sims/ui.js`): shows the item's `task` bullets, stays pinned under the header while the sim scrolls, collapses to one line. Live on diagram / AP panel / hardening and the three generators. Match/order/exhibit/scenario adopt it with one call each once Chat 2's drag-drop lands (basic.js is Chat 2's file)
- 🟡 Calculator (4-function with % key) built into the Task pane, so it is on every PBQ that has the pane — which is where the real exam's calculator gets used (risk math). Putting it on MC items too needs a one-line hook in `core/exam/runner.js` (engine owner)

## PBQs — real exam uses *simulations*: "approximate environments or tools — firewalls, network diagrams, terminals, operating systems — with restricted functionality but multiple solution paths"; per-item Reset; partial credit; revisitable
- ✅ Reset button on every PBQ (lab and exam); generated sims keep their problem on reset
- ✅ Partial credit (every sim scores 0..1); `dev/tests/sims.test.mjs` proves for every authored sim item that blank = 0, key = 1, one mistake is strictly between, and an off-spec change costs points
- ✅ Order PBQs accept equivalent orders where the objectives define none (`eq`)
- ✅ Incident console (`console`, `core/sims/console.js`): tabbed Linux + Windows hosts with a restricted shell (ss/netstat, ps/tasklist, systemctl/sc/Stop-Service, kill/taskkill, ufw/iptables/netsh/New-NetFirewallRule, log reading); graded by end state — bad services stopped (+ disabled), IoC IPs blocked on every talker, −1 per keep service stopped, −½ other collateral
- ✅ Firewall rule **editor** (`fweditor`, `core/sims/fweditor.js`): add / delete / reorder (drag or arrows) / edit rows with implicit deny shown; graded by replaying a hidden packet set top-down, credit measured above the starting table's baseline
- ✅ Log analysis viewer (`logview`, `core/sims/logview.js`): multi-source logs, select evidence lines (−½ per noise pick), then attack / account-or-host / FIRST-response questions, each scored on its own
- ✅ Drag-and-drop match/order (`core/sims/basic.js`): touch + mouse drag with tap kept as a fallback, state shape unchanged; Chat 2 lab items in `packs/secplus/lab/dragdrop.js`
- ✅ Network diagram placement (`diagram`): palette → labeled slots on an SVG topology, drag or tap-then-tap, per-slot grading, alternatives accepted (IDS-or-IPS style keys), key shown on reveal
- ✅ Wireless AP config panel (`appanel`): SSID, hidden, band, WPA2/WPA3 Personal/Enterprise/192-bit/OWE, PSK, EAP method, RADIUS host/port/secret, PMF, WPS, MAC filtering, client isolation, admin-from-wireless, default admin password. Per-field grading; −½ for every field changed that the task did not ask for; mode-hidden fields ignored
- ✅ Endpoint hardening panel (`hardening`): grouped toggles/selects for services, host firewall, ports, accounts, remote access, updates, encryption. Per-control grading; −1 for breaking a `crit` business-function control, −½ for any other unrequested change
- ✅ Every exam bank gets ≥1 console sim and ≥1 firewall editor (`exam.pbqMust: ["console","fweditor"]`, validator enforces; proved by `dev/tests/secplus-exam-pbqs.test.mjs`). Mix after the swap — A: diagram, AP panel, firewall editor (pa3 hospital segmentation), console (pa4 school SIS breach), hardening · B: AP panel, hardening, firewall editor (pb3 plant IT/OT boundary), console (pb4 cloud container proxy node), risk · C: hardening, diagram, firewall editor (pc3 MSP client egress), console (pc4 city hall rogue RMM tool), AP panel. Only generated sim left in any exam is B's risk
- ✅ PBQ Lab: 48 items + 3 generators = 51. Sims: 5 diagram, 5 AP panel, 5 hardening (Chat 3) + 2 console, 2 firewall editor, 2 log viewer (Chat 2) + 3 generators = 24 sim items; plus 27 match/order/scenario (10 match, 7 order, 10 scenario)

## Content
- ✅ 85 MC/MS per bank, domain quotas match 12/22/18/28/20; ≥8 multi-select, ≥10 exhibits per bank
- ✅ Every item tagged with its SY0-701 objective (`obj`), validator enforces
- ✅ Objective coverage: 4.2 and 4.9 each have one exam-bank question per bank (a057, b042, c006 · a073, b070, c053 — replaced duplicate ABAC/NAC/COPE/web-filter items)
- ✅ Malware cards live under attacks (2.4), not social engineering
- ✅ CompTIA voice: MOST / BEST / FIRST stems; distractor explanations on every option
- ✅ Plain-text exports: `node dev/export-secplus.mjs` → `dev/export/secplus-bank-{a,b,c}.txt` (PBQs + 85 Qs, keys marked) and `secplus-lab.txt`

## Devices
- ✅ iPhone: single column, safe-area insets, pinch-zoom allowed
- ✅ iPad: real tablet layout (720px reading column, 2-col picker); ≥1024px exam shows question-grid rail + question pane
- ✅ Offline: service worker precaches shell, caches packs on first use
- ✅ Progress merges record-by-record across devices; in-progress exams follow you

## Chat 9 pass (2026-10-03)
- ✅ Six exam PBQs authored (pa3/pb3/pc3 firewall editor, pa4/pb4/pc4 incident console); `node dev/check-pack.mjs secplus` PASS again; `dev/tests/secplus-exam-pbqs.test.mjs` proves blank = 0, key = 1, one mistake in between, keep-services penalized (35 checks)
- ✅ `dev/export-secplus.mjs` now prints console / firewall-editor / log-viewer keys (services to stop/keep, hidden test packets, evidence lines) so the second-model review sees them
- ✅ `dev/tests/e2e.py` two-device sync check made deterministic (one more pull on device B; Gist writes are last-writer-wins, so convergence takes a second round) — 4/4 green
- 🟡 items above unchanged (linear scaling by design; task-pane unification and a calculator on MC items are engine follow-ups)

