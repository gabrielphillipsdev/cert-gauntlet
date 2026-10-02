# SYNC.md — how progress moves between devices

Goal: iPhone and iPad (and a laptop) can all be open at once, all studying, and nothing is ever lost. No server; the store is a secret GitHub Gist on Gabe's account, written with a fine-grained PAT that has only `Gists: read & write`.

## Files in the Gist

| file | holds | merge rule |
|---|---|---|
| `cert-gauntlet-state.json` | the whole study state (`core/merge.js` schema v2) | record-level, see below |
| `cert-gauntlet-inprog.json` | in-progress exams, `{packId: XS}` | newest `u` wins per pack; a finished/discarded attempt leaves a tombstone `{deleted:true,u}` so no device resurrects it |

Legacy Gym Cards gists (`secplus-state.json`, `netplus-state.json`) are read once, converted with `importLegacy()`, merged in, and never written. The device remembers it did the import (`legacyImported`).

## Merge rules (pure functions in merge.js, tested in dev/tests/merge.test.mjs)

- Every record carries `u` = updatedAt (ms). **Newer `u` wins**; on a tie the record with more progress (`seen`/`attempts`/`runs`) wins, so a retried push can't regress.
- `examHist`: union by `id`, sorted by time, capped at 60.
- `days` (study units per day): max per key — two devices never double-count a day.
- `sessionsDone`, `lastStudy`: max.
- Scalars (`examDate`, `studyHours`, `remind`): `{v, u}`, newer wins.
- Merge is commutative and idempotent — any order of pushes converges.

## Protocol (sync.js)

- **pull()** — GET gist → merge(local, remote) → adopt → if the merge contains anything remote lacked, PATCH. Runs on launch, on `visibilitychange` → visible, on window `focus`, on `online`, and after linking. One pull in flight at a time.
- **push()** — same as pull but always PATCHes at the end. Triggered by `persist()` through the `dirty` event, debounced 1.5 s; in-progress exam changes debounce 3 s. The exam clock tick saves locally every 15 s without pushing. `pagehide` and tab-hide flush the pending push.
- Status badge: `ok` / `syncing` / `off` (network or token problem, local saves continue) / `unlinked`.
- Offline: saves stay local; the next `online`/focus pulls and pushes. The service worker keeps the app itself loadable.

## Why pull-before-push

The Gist API has no conditional PATCH, so a blind PATCH could overwrite another device's write that landed seconds earlier. Pull-merge-patch costs one extra GET and makes the race harmless: whatever the other device wrote is merged in before we write.

## Token handling

Stored in `localStorage` under the device record only; never in the Gist, never logged. Unlinking clears it and the gist id but keeps local progress. Rotating the token: unlink, link with the new one — the gist is found again by filename.

## Backup files

Settings → Export writes `{app:"cert-gauntlet", version:2, exportedAt, data}`. Import **merges** (same rules), it never replaces, and accepts old `secplus`/`netplus` Gym Cards backups too.
