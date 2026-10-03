# ENGINE.md — how Cert Gauntlet is put together

Plain HTML/CSS/JS, ES modules, no build step, hosted from `main` on GitHub Pages. One app, one PWA, one home-screen icon; a **pack** per certification. Read this before touching `/core` or writing a pack.

```
index.html            shell: header (brand, sync badge, settings), #view container
manifest.json, sw.js  PWA + service worker (precache shell, stale-while-revalidate everything else on this origin)
assets/               icons (icon-180/192/512, 512-maskable), source art
core/
  app.js              boot + router. `app` object = {packId, manifest, content, el, go(view,args), openPack(id), picker(), setHeader(html), version}
  util.js             $, $$, esc, shuffle, pick, dkey, fmtClock, fmtDateTime, uid, toast, ask/askText (confirm/prompt wrappers), on/emit event bus
  store.js            in-memory state + localStorage + "dirty" signal; pack-scoped record helpers; in-progress exam store
  merge.js            PURE merge rules (unit-tested in dev/tests/merge.test.mjs) + legacy Gym Cards import
  sync.js             GitHub Gist client: pull → merge → patch; pulls on launch/focus/online; debounced push
  packs.js            pack registry + lazy loader; derives card.sid / card.short, content.domainOf(cat)
  srs.js              card leveling + spaced repetition, MC distractors, deck picking
  ready.js            readiness estimator, weakness-weighted picking
  sims/registry.js    registerSim(type, def) — shared by PBQ Lab and the exam runner
  sims/basic.js       match · order (with equivalence classes) · exhibit · scenario
  sims/generators.js  hashid · fwrule · risk (fresh problem each attempt; generator output lives in state.g)
  sims/ui.js          shared sim UI: ensureCss() · taskPane() (sticky task list + calculator) · dragify() (pointer drag + tap fallback) · valOk()/fmtWant()
  sims/sims.css       styles for the sim components (loaded by ui.js, so core/styles.css is untouched)
  sims/diagram.js     network diagram placement (palette → slots on an SVG topology)
  sims/appanel.js     wireless AP configuration panel
  sims/hardening.js   endpoint hardening panel
  sims/ios/           IOS CLI simulator engine (CCNA subset): index.js createLab/Topology/Session · device.js · topology.js (converge, ping) ·
                      cli.js (parser, modes, help, completion) · commands.js · show.js · config.js (running-config). No DOM; Chat 8 builds the lab UI.
                      Spec + out-of-scope list: dev/specs/ccna.md. Test: node dev/tests/ios-conformance.mjs
  exam/runner.js      full exam: picker, item rendering, review grid, scoring, results, review, drill. Rules from manifest.exam.
  exam/msitems.js     Microsoft item types (order · build · hot · series · case-study tabs), section locking, flattenBank(), "hotarea" sim (+ msitems.css)
  exam/learnpane.js   open-book Learn pane: opens learn.microsoft.com beside the exam, logs lookup time per question, results readout
  sims/kql/           KQL interpreter (kql.js API · lexer · parser · interp · funcs · values), seeded sample tables (tables.js), "kql" drill sim (drill.js + kql.css)
  ui/keyrow.js        symbol key row for typed modules on phones (KQL_KEYS, IOS_KEYS presets)
  views/picker.js     cert picker (launch screen)
  views/home.js       today's set, readiness, quick links, decks  (exports todaySet, labItems)
  views/session.js    flashcards
  views/lab.js        PBQ Lab (list + one sim at a time)
  views/practice.js   exam-style questions, twins, speed rounds, miss list, reference sheet
  views/settings.js   sync link/unlink, backup/restore (merges, never wipes), reset pack
  styles.css          tokens → layout → components. Breakpoints: 768 (tablet), 1024 (two-pane exam). Safe-area insets honored.
packs/<id>/pack.js    manifest (default export) + content modules
dev/                  PLAN.md, this file, SYNC.md, FIDELITY-*.md, specs/, tags/, tests/, check-pack.mjs, export/
```

## Views and routing

`app.go(name, args)` renders a view into `#view`. Views are plain functions `(app, args)`; they get everything through `app`:
`app.packId`, `app.manifest`, `app.content`, `app.el` (the container), `app.go`, `app.setHeader(html)` (text beside the sync badge).
Registered views: `home session lab exq twins sprint miss ref exam settings`. The picker is `app.picker()`.
`session` args: `{deck}` (category key, `all`, `weak`, `today`) or `{set:[cards], deck:label}`. `lab` args: `{id}` opens one sim. `exq` args: `{start:n}`.

Timers (speed rounds, exam clock) are stopped by `app.go` before every navigation.

## State (see merge.js for the schema)

Everything synced lives in one document, `packs[<packId>]` per cert plus `settings`. Every record carries `u` (updatedAt, ms). Views mutate records through `store.js` helpers and call `persist()`:

```js
import { rec, touch, bumpDay, persist, pack, getScalar, setScalar } from "../store.js";
const s = touch(rec(packId, "pbq", item.id, { attempts: 0, best: 0 }));  // live record, stamped
s.attempts++; bumpDay(packId, 1); persist();                              // local save + debounced Gist push
```
Buckets: `cards` (by card.sid) · `pbq` (lab sims) · `exq` · `twins` (key `a|b`) · `sprint` (by kind) · `sims` (reserved for Chat 2+ sim stats) · `examHist[]` (union by id) · `readyLog` · `days` (study units per day) · `sessionsDone` · `examDate` / `studyHours` (`{v,u}`).
Per-device, never synced: `getDevice()/setDevice()` → `{cert, token, gistId, owner, legacyImported}`.
In-progress exams: `getInprog/setInprog/clearInprog(packId)`; synced as their own Gist file, newest wins, tombstoned on finish.

## Pack manifest (packs/<id>/pack.js, default export)

```js
{
  id, name, short, code, color, status: "ready" | "soon", tagline, examDateDefault: "YYYY-MM-DD", blurb, objectivesDoc,
  cats:      { key: {name, color} },                       // deck categories
  sections:  [{ d, name, weight, decks: [keys] }],         // exam domains with blueprint weights (must sum ~100)
  domName:   { d: "short name" },
  subtitles: { key: "one line under the deck name" },     // optional
  exam: {
    count, minutes, pass, scaleMin, scaleMax,              // e.g. 90, 90, 750, 100, 900
    pbqFirst, backtrack,                                   // backtrack:false = no Back, no grid jumps, "Next is final" (CCNA)
    pbqPts, pbqCount, gate: {all, dom}, mixQuota: {d: n},  // mixQuota = per-domain count for "Random mix" (sums to count - pbqCount)
    banks: { x: {name, sub} },                             // exam letters
  },
  sprints: ["ports", "acro", "risk"] | [{kind, name, color, wide?, make(content) => {q, ans, opts, explain?}}],
  async load() => content
}
```
`content` returned by `load()`:
`cards` (card schema below) · `exq` · `twins` · `lab` (sim items) · `generators` (sim items whose type is generated) · `banks {x:[q]}` · `pbqs {x:[sim items]}` · `diagrams {key: svg}` · `acronyms [[ACR, expansion]]` · `reference [{title, head?, rows}]`.
Every item carries `obj` — the objective id it tests (validator enforces). Content specs with field-level rules live in `dev/specs/<pack>.md`.

## Sims (PBQs)

```js
registerSim("mytype", {
  label, color, generated: false,
  create(item)                      -> state   // JSON-serializable; shuffles/generators/user answers all live here (resumable on another device)
  render(el, item, state, ctx)                 // draw everything into el; ctx = { onChange(), locked, reveal }
  answered(item, state)             -> bool
  score(item, state)                -> { f: 0..1, notes: [string], why: string }   // partial credit = f
});
```
Sim modules beyond basic/generators are imported by the pack that uses them (`packs/secplus/pack.js` → `import("../../core/sims/diagram.js")` inside `load()`), so adding a sim type never touches `core/app.js`. The validator imports every file in `core/sims/`.

Items may carry `task: ["step", …]` — the sticky Task pane (`taskPane(el, item, ctx)` from `sims/ui.js`) renders it with a minimize button and a calculator; the exam runner strips `prompt` but leaves `task`, so put the one-line prompt in `prompt` and the checklist in `task`.

Rules: render must be re-entrant (called again with `reveal:true` after scoring to show the key); call `ctx.onChange()` after every user change (the exam runner persists state); never read globals — everything comes from `item`, `state`, `ctx`. Reset = `create()` again (generated sims keep `state.g`). Touch and mouse both. The exam runner shows `item.title`, `item.prompt` and a Reset button itself; sims render the body.
Sim items may carry `d` (domain, used in exam scoring) and `obj`.

Order sims accept `eq: [[i, j], ...]` — step indexes that are interchangeable (used where the objectives define no fixed sequence).

## Exam runner behaviors (all driven by manifest.exam)

- Modes: **exam** (timed, no pause; leaving keeps the clock running; fresh attempts count toward the gate), **practice** (pausable, pauses on tab hide, never counts), **drill** (missed + guessed items with instant feedback).
- Items: `{k:"q", id, ord, ans[], conf, fl}` or `{k:"p", id, type, st, conf, fl}`. PBQs first when `pbqFirst`. Confidence `conf` 0 Sure / 1 Leaning / 2 No clue.
- Scoring: MC/MS exact-match 1 pt; PBQ `f × pbqPts`. Scaled = `scaleMin + (scaleMax - scaleMin) × pts/max`. Pass = `scaled ≥ pass`. Gate = fresh && raw ≥ gate.all && every domain ≥ gate.dom.
- Result record: `{id, t, x, fresh, practice, raw, scaled, pass, gate, dom:{d:[pts,max]}, conf, secs, pauses, timedOut, miss[], guess[], flags[], detail[]}`.
- Layout: phone = single column; ≥1024px = sticky question-grid rail + question pane (`.xm-wrap`).

## Microsoft-format exams (SC-200; Chat 6)

Set on `manifest.exam`: `caseFirst`, `seriesLast`, `learnPane`, `itemTypes: ["mc","ms","order","build","hot","case","series"]`, optional `minMs` / `minEx` for the validator. Banks are shipped **flattened** by the pack's `load()` through `flattenBank()` (core/exam/msitems.js): a `case` unit becomes its 6–9 questions carrying `caseId/caseTitle/tabs/caseN/caseOf`, a `series` unit becomes 4 `t:"series"` questions (`id` = `unitId-n`, `s`, `ok`, `scenario`). The runner then: puts the case study first and the series last (`arrangeBank`, or `mixPick` for Random mix — one whole case + one whole series + standalone to `mixQuota`), locks the case study once the candidate leaves it (`XS.caseLocked`), and runs the series with no Back, no grid and no flag (`XS.midLocked`). Item state reuses `it.ans`: option indexes for mc/ms/hot, pool indexes in chosen order for order/build, `[1]`/`[0]` for Yes/No. Scoring is all-or-nothing per item (`order` accepts `alt` sequences; `build` with `ordered:false` is graded as a set). Per-item Learn lookups live in `it.lk = {n, ms}` and the result record gains `learn: {n, secs, right, pctUsed, pctRest, items[]}`. The mc/ms/PBQ path is unchanged, so CompTIA packs behave exactly as before.

The two new modules inject their own stylesheets (`core/exam/msitems.css`, `core/sims/kql/kql.css`) because Chat 6 was scoped away from `core/styles.css`; Chat 1 may fold them in.

## KQL Lab (core/sims/kql)

`runKql(query, db, {maxRows})` → `{cols:[{name,type}], rows:[[…]], warnings[]}`; throws `KqlError` whose message reads like the Log Analytics editor (`'where' operator: Failed to resolve scalar expression named 'X'`, `Query could not be parsed at 'summarise' on line [1,13]`, `Cannot compare values of types string and long. Try adding explicit casts`). `db = {tables, now}`; the lab pins `now()` to `LAB_NOW` (2026-11-15 09:00Z) so `ago()` is reproducible. `sameResult(a, b, {ordered, names, strict})` grades drills by result set so any correct query passes. Sim type `kql` (`item.mode` write | fix | predict; schema in packs/sc200/kql-drills.js) attaches the phone key row itself. Conformance: `node dev/tests/kql.test.mjs`; drills: `node dev/check-kql-drills.mjs`.

## Key row (typed modules)

`attachKeyRow(scopeEl, keys)` from `core/ui/keyrow.js` shows a fixed symbol bar above the on-screen keyboard when an input inside `scopeEl` has focus and inserts at the caret. Presets `KQL_KEYS`, `IOS_KEYS`. Hidden on fine-pointer tablets/laptops. Inputs that must not trigger it: `data-keyrow="off"`.

## Conventions

- Views never touch `localStorage`, `fetch` or `window.confirm` directly — go through store/sync/util.
- No HTML from content: content strings are plain text; `esc()` everything. Diagrams are the one exception (trusted SVG strings in the pack).
- CSS: use tokens; new components get their own section in styles.css; phone first, then `@media(min-width:768px)` / `1024px`.
- `VERSION` in `core/app.js` and `sw.js` move together when a deploy should invalidate caches.
- Validate before PR: `node dev/tests/merge.test.mjs && node dev/check-pack.mjs <pack> && python3 dev/tests/e2e.py` (serve the repo on :8765 first). SC-200 adds `node dev/tests/kql.test.mjs && node dev/check-kql-drills.mjs && python3 dev/tests/e2e-sc200.py`. Sec+ sims: also `node dev/tests/sims.test.mjs && node dev/tests/sims-lab.test.mjs` (`python3 dev/tests/sims-e2e.py` for the Chat 2 sims). Anything under `core/sims/ios/`: also `node dev/tests/ios-conformance.mjs`.
