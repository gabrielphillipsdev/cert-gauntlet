# CCNA subnetting trainer

Standalone, timed, infinite subnetting drills. Open `index.html` (on GitHub Pages: `/cert-gauntlet/packs/ccna/subnet/`). Plain ES modules, no build step, no dependency on `/core`.

## Problem types

| id | drill | fields |
|---|---|---|
| `v4-netbcast` | network, broadcast, first/last host from host + mask (CIDR or dotted) | 4 |
| `v4-mask` | /nn ↔ dotted mask ↔ usable hosts; smallest subnet for N hosts | 2 |
| `v4-which` | which subnet (and its broadcast) is this host in | 2 |
| `v4-wildcard` | wildcard for an ACL subnet; OSPF `network` statement for an interface; ACL match for a host's subnet | 1–2 |
| `v4-vlsm` | VLSM allocation for 3–5 host-count requirements — any valid, tight, non-overlapping layout passes | 3–5 |
| `v4-summary` | tightest single summary route covering a list of networks | 1 |
| `v6-prefix` | network prefix (compressed) from address/len | 1 |
| `v6-eui64` | full address from /64 prefix + MAC (Cisco or colon format) | 1 |
| `v6-compress` | RFC 5952 shortest form (any numerically-equal shortest form passes) | 1 |
| `v6-expand` | full 8 × 4-hex-digit form | 1 |

The first four are "IPv4 basics"; the goal readout targets a sub-20 s rolling average (last 20 correct solves) across them.

## Files

- `ip.js` — IPv4 (uint32) / IPv6 (BigInt) parsing, formatting, mask math
- `rng.js` — seeded PRNG; `?seed=N` on the trainer URL reproduces a run
- `generators.js` — `generate(typeId, rng)` → plain-JSON problem; `grade(problem, input)` → `{correct, parts}`
- `stats.js` — localStorage timing/accuracy; rolling averages. **TODO(engine):** replace with core per-record store + Gist sync when `/dev/ENGINE.md` lands
- `app.js`, `index.html`, `styles.css` — phone-first UI with a key row above the keyboard (`/`, `:`, `::`, `a–f`), two-column iPad layout from 768px, dark mode
- `test.html` — runs the independent checker in the browser

## Verification

`dev/tests/subnet-check.mjs` re-derives every answer from what the student sees, using a separate implementation (octet arrays + binary strings for IPv4, group arrays for IPv6, no shared code), then checks the grader accepts the independent answer (with sloppy case/spacing and alternative layouts) and rejects plausible wrong ones.

```
node dev/tests/subnet-check.mjs            # 10,000 problems per type, random seed
node dev/tests/subnet-check.mjs 10000 42   # fixed seed
```

Exit code 0 and `ALL GREEN` is the acceptance test for this pack.
