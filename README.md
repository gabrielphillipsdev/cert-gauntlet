# Cert Gauntlet

One study app for the certs on my list — **CompTIA Security+ (SY0-701)**, Microsoft **AZ-900 / SC-900 / SC-200**, and **Cisco CCNA (200-301)** — built to make the real exam feel like something I've already done a dozen times: leveled flashcards with spaced repetition, confusable-twin drills, speed rounds, performance-based simulations, and full-length timed exams that copy each vendor's actual format (CompTIA's PBQs-first revisitable exam, Microsoft's case studies and no-backtrack solution series, Cisco's one-way exam with IOS lab items).

Live: **https://gabrielphillipsdev.github.io/cert-gauntlet** — add it to your home screen; it works offline and syncs progress across devices through a private GitHub Gist.

Successor to [Sec-Study](https://github.com/gabrielphillipsdev/Sec-Study) and [Net-Study](https://github.com/gabrielphillipsdev/Net-Study) (same engine, now shared; old progress imports automatically).

## Status — v1 complete (Oct 2026)
| pack | what's in it |
|---|---|
| Security+ SY0-701 | 398 cards, 45 twins, speed rounds, PBQ Lab (51 items: incident console, firewall editor, log viewer, diagram, AP panel, hardening, drag-drop, generators), 3 full exams with 5 simulation PBQs each |
| AZ-900 | 155 cards, 50-question practice exam |
| SC-900 | 155 cards, 50-question practice exam |
| SC-200 | 417 cards, 59 twins, KQL Lab (60 drills on a real in-browser KQL interpreter) + 60 portal hot-areas, 3 Microsoft-format exams (case study, solution series, open-book Learn pane) |
| CCNA 200-301 v1.1 | 481 cards, 52 twins, subnetting trainer, PBQ Lab (13 IOS CLI labs, 40 show-output items, config-order + topology PBQs), 3 × 100-question no-backtrack exams with 4 IOS labs each |

Not affiliated with CompTIA, Microsoft or Cisco. All content is original.

## Develop
Plain HTML/CSS/JS ES modules, no build. `python3 -m http.server 8765` from the repo root and open http://localhost:8765/.
Docs for contributors (human or AI) live in `dev/`: `PLAN.md` (the plan), `ENGINE.md` (architecture + pack API), `SYNC.md`, `FIDELITY-*.md`, `specs/`.
Tests: the full list per pack is in `dev/ENGINE.md` ("Validate before PR"); the browser tests need Playwright and the local server.

## Sync
Settings → paste a fine-grained GitHub token with only *Gists: read & write*. Progress is merged record-by-record, so several devices can be open at once. Export a backup from Settings now and then.
