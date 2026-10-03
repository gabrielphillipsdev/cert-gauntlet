# SC-200 exam-mode fidelity checklist

Built from the verified exam format (dev/specs/sc200.md §1: Microsoft Learn study guide + exam duration/experience page, fetched Oct 2, 2026). Chat 5 wrote the content and this list; Chat 6 builds the runner and turns the boxes green. Final step of every SC-200 chat: run this list.

Legend: ☐ not done · ☑ done · — not applicable to this chat

## Format
- ☑ 40–60 items per sitting; the app's banks are 50 units (case ×8 + 38 standalone + series ×4)
- ☑ 100-minute clock, no pause in exam mode (practice mode may pause)
- ☑ Score shown as 1–1000 scaled with pass at 700, plus raw % and per-domain % against the 80/70 gate
- ☑ Domain weights in "Random mix": d1 21 / d2 19 / d3 10 of 50 (42/38/20)

## Item types (all rendered from the schemas in dev/specs/sc200.md §6)
- ☑ `mc` single answer, 4 options, shuffled
- ☑ `ms` multi-response with "Each correct answer presents part of / a complete solution" wording; graded all-or-nothing like Microsoft
- ☑ `order` drag-and-drop ordering; touch and mouse; accepts any order listed in `alt`
- ☑ `build` build list: pick the subset from a pool with distractors, then order it (or unordered when `ordered:false`); graded per Microsoft (all-or-nothing by default, partial credit flag optional)
- ☑ `hot` hot area: click target on a screenshot (`img`) — falls back to the labelled-region list while `img` is null
- ☑ `case` case study: pinned tabs (Overview · Environment · Requirements · Issues) beside the question; appears FIRST; once the candidate leaves the case study its questions are locked (no return)
- ☑ `series` problem-solution series: same scenario, 4 proposed solutions, Yes/No each, shown one at a time, NO backtrack within the series, appears LAST
- ☑ Mark-for-review and review grid available only on the backtrackable middle section (not case study after leaving, not series)

## Learn pane (open-book)
- ☑ "Learn" button opens learn.microsoft.com in a side-by-side window (iPad Split View / laptop); timer keeps running
- ☑ Time spent with the Learn window open is logged per question
- ☑ Post-exam readout: minutes lost to lookups vs points gained on looked-up items

## Portal / hot-area deck
- ☐ 60 items in `packs/sc200/portal.js` render as click targets once screenshots are attached (`img`, regions with `r:[x%,y%,w%,h%]`) — the `hotarea` sim already draws the rectangles when `img` is set; screenshots still to capture
- ☑ Until screenshots exist, the deck runs as "pick the right label" using `regions`
- ☐ Screenshot source: MSP tenant with Security Reader if granted, else Microsoft Learn screenshots

## Content gates
- ☑ `node dev/check-sc200.js all` → PASS
- ☑ `node dev/check-pack.mjs sc200` → PASS (cards + twins loaded; banks wired by Chat 6)
- ☑ Every item tagged with a skills-measured bullet id (Oct 21, 2026 outline)
- ☑ Independent wrong-key review of all bank items (1 wrong key, 5 fact errors, 7 ambiguities fixed)
- ☐ Second-model review of `dev/export/sc200-bank-*.txt`; findings filed as issues

## Chat 6 run log (2026-10-03)
- `node dev/tests/kql.test.mjs` → 227/227 (169 literal fixtures · 25 editor-style error messages · 33 independent checks on the sample tables)
- `node dev/check-kql-drills.mjs` → 60 drills (26 write · 18 fix · 16 predict) PASS
- `node dev/check-pack.mjs sc200` → PASS (417 cards · 59 twins · 120 lab · banks 50/50/50)
- `python3 dev/tests/e2e-sc200.py` → PASS on iPhone 390×844 and iPad 1024×1366: case study first with pinned tabs, locked once left (Back disabled, grid refuses), middle with mark-for-review, series last with no Back/grid/flag, Learn lookup logged and read out
- `python3 dev/tests/e2e.py` (Sec+) → still passes: the mc/ms path is untouched

## Done-when (Chat 6)
- ☑ A full 50-unit exam runs end to end on iPhone and iPad with case study first and solution series last
- ☑ KQL Lab interpreter passes its 150-query suite (separate checklist in Chat 6)
