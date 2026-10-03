# Sec+ pack — content spec (SY0-701)

Pack: `packs/secplus/`. Manifest: `pack.js`. Objectives for tagging: `dev/specs/secplus-objectives.md`. Validate with `node dev/check-pack.mjs secplus` until PASS, and `node dev/tests/sims.test.mjs` (schema + grader tests for console / fweditor / logview / drag-drop items; `python3 dev/tests/sims-e2e.py` drives each one at iPhone and iPad sizes). Fidelity checklist: `dev/FIDELITY-secplus.md`.

All text original (never copy Dion, Messer, CompTIA samples or any published practice exam). Every fact must be correct for SY0-701. Neutral tone, no real company names, RFC 5737/1918 addresses. Escape `"` inside strings; no HTML (content is escaped on render). Every item carries `obj:"n.n"` — the single objective it tests.

## Files
| file | export | count |
|---|---|---|
| `cards-d12.js`, `cards-d34.js`, `cards-d45.js` | `CARDS_D12/D34/D45` | 398 cards, 16 categories |
| `exq.js` | `EXQ` | 92 exam-style questions |
| `twins.js` | `TWINS` | 45 confusable pairs |
| `lab.js` + `lab/*.js` | `LAB_PBQS` (concatenates `LAB_CONSOLE`, `LAB_FWEDITOR`, `LAB_LOGVIEW`, `LAB_DRAGDROP` + the ported match/order/scenario items) | 33 PBQ Lab items (Chat 3 grows this to ~24 sims) |
| `bank-a.js`, `bank-b.js`, `bank-c.js` | `EXAM_BANK_A/B/C` | 85 questions each |
| `pbqs.js` | `EXAM_PBQS` `{a,b,c}` | 5 PBQs per exam |
| `extras.js` | `DIAGRAMS`, `ACRONYMS`, `REFERENCE` | 16 SVG diagrams, 79 acronyms, 12 reference tables |

Generated PBQs (hashid, fwrule, risk) are declared in `pack.js` → `generators`.

## Categories (`c` / `cat`) and domains
controls · crypto · ports (1) · actors · social · attacks · vulns (2) · arch · netsec · data (3) · harden · iam · ops · ir (4) · gov · third (5). Weights 12/22/18/28/20. Malware cards belong to `attacks` (obj 2.4); `social` is social engineering only (2.2).

## Card
```js
{obj:"1.1", c:"controls", q:"≤90 chars front", a:"#Big headline line\nsupporting line (1–3 lines)", s:"optional ≤60-char MC option text",
 x:"2–4 sentences, 200–520 chars: teaches it, why it matters, how it differs from neighbors, the exam keyword", w:"optional hook ≤120", v:"diagram key on back", vq:"diagram key on front", g:"distractor group"}
```
Shorts (`s`, else the `#` line, else first line) must be unique within a category (or within a `g` group). Ports category: `q` = protocol, `a` = `#<port>\n<note>`, `s` = the port number(s) starting with a digit. Each deck ≥ 8 cards.

## Exam-style question (`EXQ`)
```js
{id:"x001", obj:"4.8", d:4, q:"scenario stem ≤380 chars … MOST/BEST/FIRST?", o:["correct","wrong1","wrong2","wrong3"], w:"why correct (1–3 sentences)", n:["why wrong1","why wrong2","why wrong3"]}
```
First option is correct (the app shuffles). Quotas by domain: 11/20/17/26/18. Stems unique across the whole pack.

## Twin
```js
{a:"Term A", b:"Term B", obj:"1.4", n:"2–3 sentence contrast", s:[["statement true of A","a"],["…","b"], … 4–6 statements, ≥2 each side]}
```

## Exam bank question
```js
{id:"a017", obj:"3.2", d:3, cat:"netsec", t:"mc"|"ms", pick:2|3 (ms only), q:"≤420 chars", ex:"optional exhibit, \n lines, ~12 max", dg:"optional diagram key",
 o:[{t:"≤130 chars", ok:true|false, x:"why right / why wrong HERE, ≤260"} ×4 (mc) | ×5–6 (ms)], w:"takeaway ≤260"}
```
Per bank: 85 questions, domain quotas 10/19/15/24/17, ≥8 `ms`, ≥10 with `ex`, order shuffled across domains, exactly one `ok` for mc / exactly `pick` for ms. Bank letter = id prefix. Topic checklist per domain: see the original EXAM_SPEC coverage list reproduced in `dev/PLAN.md` §3 and the objectives doc — every objective should appear in every bank at least once (4.2 and 4.9 currently thin).

## PBQ / sim items (lab, generators, exam)
Common: `{id, obj, type, title, prompt|setup, d?, cat?, why?}`. `d` is required for exam PBQs (domain scoring). Ids: lab `m-…` `o-…` `s-…` `c-…` (console) `f-…` (fweditor) `l-…` (logview), exam `pa1…pc5`, generators `g-…`. Sim items should carry `tasks` (rendered in the floating Tasks pane) and `why`.

| type | fields | notes |
|---|---|---|
| `match` | `pairs:[[left,right]] (4–8)` | |
| `order` | `steps:[…] (3–7)`, `eq:[[i,j]]` optional, `note` optional | `eq` = interchangeable step indexes; use whenever the objectives define no fixed sequence |
| `exhibit` | `setup, out (monospace), qs:[{q, o:[4, first correct], x}]` | multi-part |
| `scenario` | `setup, out?, q, opts:[4, first correct], why, no:[3]` | lab only |
| `hashid` / `fwrule` / `risk` | none (generated) | declared in pack.js `generators`; exam PBQs reference the type |
| `console` | `tasks:[…]`, `iocs:{ports,procs,ips}`, `requireDisable?`, `hosts:[{id, os:"linux"|"windows", name, ip, user?, domain?, services:[{name, display?, proc, pid, port?, proto?, bind?, user?, cmd?, remote?:"ip:port", bad?, keep?}], conns?, files?:{path:text}, ufw?}]` | ≥1 Linux + ≥1 Windows host. `bad:true` = must be stopped (and disabled when `requireDisable`); `keep:true` = must stay running (−1 if stopped); other legit services −½ if stopped. Every `iocs.ips` entry must appear as a `remote` on some host; it must be blocked on every host that talks to it. Graded by end state only (`core/sims/console.js`, `exec()` is the interpreter). |
| `fweditor` | `tasks:[policy lines]`, `nets:[{v,l}]`, `ports:[…]`, `protos?`, `rules:[{act,src,dst,port,proto}]` starting table, `packets:[{src,dst,port,proto,want,note}]` hidden set (≥8, both allow and deny), `maxRules?` | Score = packets handled as `want` / packets. Starting rules may only use values present in `nets`/`ports`. First match wins; implicit deny shown. |
| `logview` | `tasks?`, `sources:[{name, lines:[…]}] (≥2)`, `evidence:[[src,line]] (≥3)`, `qs:[{k:"attack"|"account"|"host"|"first", q, o:[4, first correct], x}] (≥3)` | Evidence part = (hits − ½·noise) / evidence, floored at 0; each `qs` entry 1 point; f = total / (1 + qs). Must include an `attack`, an `account` or `host`, and a `first` question. |
| `match` / `order` (drag-and-drop) | as above; `order` `eq:[[i,j]]` = interchangeable step indexes | Rendering is drag-and-drop (touch + mouse, tap-to-pair kept as a fallback). State shape unchanged. Prompts say "drag", never "tap". |
| Chat 3 types | see their sim definitions in `core/sims/` and update this table | diagram, appanel, hardening |

Exam PBQ mix per bank (target after Chat 3): ≥1 console, ≥1 firewall editor, the rest from the other sims; no two generated sims of the same type in one exam.

## Objective tags
Tag maps used for the initial pass are in `dev/tags/*.json` (cards keyed `c|q`, questions by id, twins `a|b`, pbqs by id). New items: tag inline when authoring. Validator rejects untagged items and tags whose domain disagrees with `d`.
