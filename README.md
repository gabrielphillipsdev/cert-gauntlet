# Cert Gauntlet

One study app for the certs on my list — **CompTIA Security+ (SY0-701)**, Microsoft **AZ-900 / SC-900 / SC-200**, and **Cisco CCNA (200-301)** — built to make the real exam feel like something I've already done a dozen times: leveled flashcards with spaced repetition, confusable-twin drills, speed rounds, performance-based simulations, and full-length timed exams that copy each vendor's actual format (CompTIA's PBQs-first revisitable exam, Microsoft's case studies and no-backtrack solution series, Cisco's one-way exam with IOS lab items).

Live: **https://gabrielphillipsdev.github.io/cert-gauntlet** — add it to your home screen; it works offline and syncs progress across devices through a private GitHub Gist.

Successor to [Sec-Study](https://github.com/gabrielphillipsdev/Sec-Study) and [Net-Study](https://github.com/gabrielphillipsdev/Net-Study) (same engine, now shared; old progress imports automatically).

## Status
| pack | state |
|---|---|
| Security+ SY0-701 | live — cards, twins, sprints, PBQ Lab, 3 full exams; simulation PBQs in progress |
| AZ-900 / SC-900 | content pending |
| SC-200 | content + KQL lab + Microsoft-format exam pending |
| CCNA 200-301 v1.1 | subnetting trainer, IOS CLI simulator, labs pending |

## Develop
Plain HTML/CSS/JS ES modules, no build. `python3 -m http.server 8765` from the repo root and open http://localhost:8765/.
Docs for contributors (human or AI) live in `dev/`: `PLAN.md` (the plan), `ENGINE.md` (architecture + pack API), `SYNC.md`, `FIDELITY-*.md`, `specs/`.
Tests: `node dev/tests/merge.test.mjs` · `node dev/check-pack.mjs secplus` · `python3 dev/tests/e2e.py` (needs Playwright + the local server).

## Sync
Settings → paste a fine-grained GitHub token with only *Gists: read & write*. Progress is merged record-by-record, so several devices can be open at once. Export a backup from Settings now and then.
