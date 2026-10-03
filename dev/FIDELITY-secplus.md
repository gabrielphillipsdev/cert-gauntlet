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
- ⬜ Incident console (tabbed hosts, netstat/ps/systemctl/tasklist/firewall commands; stop bad services, block IPs) — the roommate's PBQ (Chat 2)
- ⬜ Firewall rule **editor** (add/delete/reorder/edit rows, graded by effective policy) — today's fwrule only *reads* a table (Chat 2)
- ⬜ Log analysis viewer (multi-source, select evidence lines, classify) (Chat 2)
- ⬜ Drag-and-drop match/order with touch + mouse — today is tap-to-pair (Chat 2). `dragify()` in `core/sims/ui.js` (pointer events + tap fallback, ghost clone, drop-target highlight) is the shared helper the diagram sim already uses
- ✅ Network diagram placement (`diagram`): palette → labeled slots on an SVG topology, drag or tap-then-tap, per-slot grading, alternatives accepted (IDS-or-IPS style keys), key shown on reveal
- ✅ Wireless AP config panel (`appanel`): SSID, hidden, band, WPA2/WPA3 Personal/Enterprise/192-bit/OWE, PSK, EAP method, RADIUS host/port/secret, PMF, WPS, MAC filtering, client isolation, admin-from-wireless, default admin password. Per-field grading; −½ for every field changed that the task did not ask for; mode-hidden fields ignored
- ✅ Endpoint hardening panel (`hardening`): grouped toggles/selects for services, host firewall, ports, accounts, remote access, updates, encryption. Per-control grading; −1 for breaking a `crit` business-function control, −½ for any other unrequested change
- 🟡 Every exam bank gets ≥1 console sim and ≥1 firewall editor — blocked on Chat 2's components. Banks are already re-mixed (A: diagram, AP panel, hash ID, exhibit, hardening · B: AP panel, hardening, rule walk, exhibit, risk · C: hardening, diagram, hash ID, exhibit, AP panel). **Swap plan when Chat 2 merges:** `pa4`/`pb4`/`pc4` (exhibits) → console sims; `pa3`/`pb3`/`pc3` (generators) → firewall editors. `exam.pbqMust: ["console","fweditor"]` in pack.js then makes the validator enforce it (it WARNs until the types exist)
- 🟡 PBQ Lab: 15 new sims (5 diagram, 5 AP panel, 5 hardening) + 3 generators = 18 sim items, plus the 25 match/order/scenario items. Reaches ~24 with 2 each of console / firewall editor / log viewer after Chat 2 (authored then, see PLAN §3)

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
