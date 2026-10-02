// Independent checker for /packs/ccna/subnet/generators.js
//
// Deliberately re-implements every calculation from scratch with a different
// representation than ip.js (octet arrays + binary strings for IPv4, arrays
// of 8 group integers for IPv6, no BigInt, no shared helpers) so that a bug
// in ip.js cannot be mirrored here. For each problem it:
//   1. recomputes the answer from what the student would SEE (given/prompt)
//      and compares with problem.answer;
//   2. checks that the grader accepts the independently computed answer,
//      including sloppy spacing / uppercase;
//   3. checks that the grader rejects a plausible wrong answer.
//
// Usage:   node dev/tests/subnet-check.mjs [perType=10000] [seed]
// Also importable from the browser test page: runChecks({ n, seed, log }).

import { TYPES, generate, grade } from '../../packs/ccna/subnet/generators.js';
import { makeRng } from '../../packs/ccna/subnet/rng.js';

// ---------------- independent IPv4 (octet arrays / binary strings) ----------------

const toOctets = (s) => s.trim().split('.').map((x) => parseInt(x, 10));
const fromOctets = (o) => o.join('.');
const toBin = (o) => o.map((x) => x.toString(2).padStart(8, '0')).join('');
const fromBin = (b) => fromOctets([0, 8, 16, 24].map((i) => parseInt(b.slice(i, i + 8), 2)));
const maskBin = (p) => '1'.repeat(p) + '0'.repeat(32 - p);
const prefixFromDotted = (m) => {
  const b = toBin(toOctets(m));
  const p = b.indexOf('0') === -1 ? 32 : b.indexOf('0');
  if (b !== maskBin(p)) throw new Error(`non-contiguous mask ${m}`);
  return p;
};
const maskToken = (t) => (t.startsWith('/') ? parseInt(t.slice(1), 10) : prefixFromDotted(t));
const netBin = (hostStr, p) => toBin(toOctets(hostStr)).slice(0, p) + '0'.repeat(32 - p);
const bcBin = (hostStr, p) => toBin(toOctets(hostStr)).slice(0, p) + '1'.repeat(32 - p);
const addBin = (b, k) => {
  // add small integer k (can be negative) to a 32-bit binary string
  let n = parseInt(b, 2) + k;
  return n.toString(2).padStart(32, '0');
};
const dottedMask = (p) => fromBin(maskBin(p));
const dottedWild = (p) => fromBin('0'.repeat(p) + '1'.repeat(32 - p));
const hostsFor = (p) => (p === 32 ? 1 : p === 31 ? 2 : 2 ** (32 - p) - 2);
const smallestPrefixFor = (n) => {
  let p = 30;
  while (hostsFor(p) < n) p--;
  return p;
};
const splitCidr = (s) => {
  const [a, b] = s.trim().split('/');
  return { addr: a, prefix: parseInt(b, 10) };
};

// ---------------- independent IPv6 (arrays of 8 ints) ----------------

function expand6(s) {
  s = s.trim().toLowerCase();
  let groups;
  if (s.includes('::')) {
    const [l, r] = s.split('::');
    const L = l ? l.split(':') : [];
    const R = r ? r.split(':') : [];
    groups = [...L, ...Array(8 - L.length - R.length).fill('0'), ...R];
  } else groups = s.split(':');
  if (groups.length !== 8) throw new Error(`bad v6 ${s}`);
  return groups.map((g) => parseInt(g, 16));
}
const full6 = (g) => g.map((x) => x.toString(16).padStart(4, '0')).join(':');
function compress6(g) {
  // scan for longest zero run >= 2, leftmost
  let best = { start: -1, len: 0 };
  let i = 0;
  while (i < 8) {
    if (g[i] === 0) {
      let j = i;
      while (j < 8 && g[j] === 0) j++;
      if (j - i > best.len) best = { start: i, len: j - i };
      i = j;
    } else i++;
  }
  const h = g.map((x) => x.toString(16));
  if (best.len < 2) return h.join(':');
  return h.slice(0, best.start).join(':') + '::' + h.slice(best.start + best.len).join(':');
}
function prefix6(g, p) {
  const bits = g.map((x) => x.toString(2).padStart(16, '0')).join('');
  const kept = bits.slice(0, p) + '0'.repeat(128 - p);
  const out = [];
  for (let i = 0; i < 128; i += 16) out.push(parseInt(kept.slice(i, i + 16), 2));
  return out;
}
function eui64FromMac(macText) {
  const hex = macText.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (hex.length !== 12) throw new Error(`bad mac ${macText}`);
  const first = parseInt(hex.slice(0, 2), 16);
  const flipped = (first ^ 0b00000010).toString(16).padStart(2, '0');
  const iid = flipped + hex.slice(2, 6) + 'fffe' + hex.slice(6, 12);
  return [0, 4, 8, 12].map((i) => parseInt(iid.slice(i, i + 4), 16));
}
const same6 = (a, b) => a.length === 8 && a.every((x, i) => x === b[i]);

// ---------------- per-type checks ----------------
// Each returns null when fine, or a string describing the disagreement.

function expectOk(p, input, why) {
  const r = grade(p, input);
  if (!r.correct) return `grader rejected ${why}: ${JSON.stringify(input)} -> ${JSON.stringify(r.parts)}`;
  return null;
}
function expectBad(p, input, why) {
  const r = grade(p, input);
  if (r.correct) return `grader accepted ${why}: ${JSON.stringify(input)}`;
  return null;
}
const giv = (p, label) => p.given.find((g) => g.label === label)?.value;

const checks = {
  'v4-netbcast'(p) {
    const host = giv(p, 'Host');
    const prefix = maskToken(giv(p, 'Mask'));
    const n = netBin(host, prefix);
    const b = bcBin(host, prefix);
    const mine = { network: fromBin(n), broadcast: fromBin(b), first: fromBin(addBin(n, 1)), last: fromBin(addBin(b, -1)) };
    for (const k of Object.keys(mine)) if (mine[k] !== p.answer[k]) return `${k}: mine ${mine[k]} vs ${p.answer[k]}`;
    return (
      expectOk(p, { network: ` ${mine.network} `, broadcast: mine.broadcast, first: mine.first, last: mine.last }, 'own answer') ||
      expectBad(p, { ...mine, broadcast: fromBin(addBin(b, 1)) }, 'broadcast+1') ||
      expectBad(p, { ...mine, first: mine.network }, 'first=network') ||
      expectBad(p, { ...mine, last: '' }, 'blank last')
    );
  },
  'v4-mask'(p) {
    const v = p.data.variant;
    let prefix;
    if (v === 'cidr2dotted') prefix = parseInt(giv(p, 'Prefix').slice(1), 10);
    else if (v === 'dotted2cidr') prefix = prefixFromDotted(giv(p, 'Mask'));
    else prefix = smallestPrefixFor(parseInt(giv(p, 'Hosts needed'), 10));
    const mine = {};
    for (const f of p.fields) {
      if (f.key === 'prefix') mine.prefix = `/${prefix}`;
      if (f.key === 'mask') mine.mask = dottedMask(prefix);
      if (f.key === 'hosts') mine.hosts = String(hostsFor(prefix));
    }
    for (const k of Object.keys(mine)) if (mine[k] !== p.answer[k]) return `${k}: mine ${mine[k]} vs ${p.answer[k]}`;
    const sloppy = { ...mine };
    if (sloppy.prefix) sloppy.prefix = sloppy.prefix.slice(1); // "24" without slash
    const wrong = { ...mine };
    if (wrong.hosts) wrong.hosts = String(Number(wrong.hosts) + 2);
    else wrong.mask = dottedMask(prefix === 30 ? 29 : prefix + 1);
    return expectOk(p, sloppy, 'own answer (no slash)') || expectBad(p, wrong, 'off-by-two hosts / wrong mask');
  },
  'v4-which'(p) {
    const m = p.prompt.match(/^([\d.]+)\/(\d+) is subnetted with (\S+)\. Which/);
    if (!m) return `prompt unparsable: ${p.prompt}`;
    const sub = maskToken(m[3]);
    const host = giv(p, 'Host');
    // host must lie inside the base block
    if (netBin(host, parseInt(m[2], 10)) !== netBin(m[1], parseInt(m[2], 10))) return 'host outside base block';
    if (!(sub > parseInt(m[2], 10))) return 'sub prefix not longer than base';
    const mine = { subnet: fromBin(netBin(host, sub)), broadcast: fromBin(bcBin(host, sub)) };
    if (host === mine.subnet || host === mine.broadcast) return 'given host is a network/broadcast address, not a host';
    for (const k of Object.keys(mine)) if (mine[k] !== p.answer[k]) return `${k}: mine ${mine[k]} vs ${p.answer[k]}`;
    return (
      expectOk(p, { subnet: `${mine.subnet}/${sub}`, broadcast: mine.broadcast }, 'own answer with /len') ||
      expectBad(p, { subnet: `${mine.subnet}/${sub - 1}`, broadcast: mine.broadcast }, 'wrong /len') ||
      expectBad(p, { subnet: host, broadcast: mine.broadcast }, 'host as subnet')
    );
  },
  'v4-vlsm'(p) {
    const m = p.prompt.match(/Carve ([\d.]+)\/(\d+) into/);
    const base = m[1],
      basePrefix = parseInt(m[2], 10);
    const baseLo = parseInt(netBin(base, basePrefix), 2);
    const baseHi = parseInt(bcBin(base, basePrefix), 2);
    const reqs = p.given.map((g) => parseInt(g.value, 10));
    // 1. reference answer must be valid: tight, aligned, inside, disjoint
    const ranges = [];
    for (let i = 0; i < reqs.length; i++) {
      const { addr, prefix } = splitCidr(p.answer[`r${i}`]);
      if (prefix !== smallestPrefixFor(reqs[i])) return `r${i}: prefix /${prefix} not tight for ${reqs[i]}`;
      const lo = parseInt(toBin(toOctets(addr)), 2);
      if (lo !== parseInt(netBin(addr, prefix), 2)) return `r${i}: not aligned`;
      const hi = lo + 2 ** (32 - prefix) - 1;
      if (lo < baseLo || hi > baseHi) return `r${i}: outside base`;
      ranges.push([lo, hi]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < ranges.length; i++) if (ranges[i][0] <= ranges[i - 1][1]) return 'reference answer overlaps';
    // 2. grader accepts the reference answer
    let e = expectOk(p, p.answer, 'reference layout');
    if (e) return e;
    // 3. grader accepts an alternative valid layout: pack from the TOP of the block, largest first
    const order = reqs.map((h, i) => ({ i, p: smallestPrefixFor(h) })).sort((a, b) => a.p - b.p);
    let cursor = baseHi + 1;
    const alt = {};
    for (const { i, p: pr } of order) {
      cursor -= 2 ** (32 - pr);
      alt[`r${i}`] = `${fromBin(cursor.toString(2).padStart(32, '0'))}/${pr}`;
    }
    const sameAsRef = Object.keys(alt).every((k) => alt[k] === p.answer[k]);
    if (!sameAsRef) {
      e = expectOk(p, alt, 'top-packed alternative layout');
      if (e) return e;
    }
    // also: dotted-mask input form and /31 for a 2-host link
    const dotted = {};
    for (const k of Object.keys(p.answer)) {
      const { addr, prefix } = splitCidr(p.answer[k]);
      dotted[k] = `${addr} ${dottedMask(prefix)}`;
    }
    e = expectOk(p, dotted, 'dotted-mask form');
    if (e) return e;
    // 4. grader rejects: duplicate first subnet for two requirements (overlap), and an oversized subnet
    if (reqs.length >= 2) {
      const dup = { ...p.answer, r1: p.answer.r0 };
      // only an overlap if r0 and r1 need the same size; otherwise it's a wrong-size answer — both must fail
      e = expectBad(p, dup, 'duplicate subnet');
      if (e) return e;
    }
    const big = { ...p.answer };
    {
      const { addr, prefix } = splitCidr(big.r0);
      big.r0 = `${fromBin(netBin(addr, prefix - 1))}/${prefix - 1}`;
    }
    e = expectBad(p, big, 'oversized subnet');
    if (e) return e;
    const outside = { ...p.answer };
    {
      const { prefix } = splitCidr(outside.r0);
      const far = (baseHi + 1 + 2 ** (32 - prefix)) % 2 ** 32; // just above the block (wraps for the top block; still outside)
      const farAligned = fromBin((far - (far % 2 ** (32 - prefix))).toString(2).padStart(32, '0'));
      outside.r0 = `${farAligned}/${prefix}`;
    }
    return expectBad(p, outside, 'subnet outside block');
  },
  'v4-wildcard'(p) {
    let prefix, net;
    if (p.data.variant === 'acl') {
      const v = giv(p, 'Subnet');
      const [a, mTok] = v.includes('/') ? v.split('/').map((x, i) => (i ? '/' + x : x)) : v.split(' ');
      prefix = maskToken(mTok);
      net = fromBin(netBin(a, prefix));
      if (net !== a) return 'given subnet is not a network address';
    } else {
      const hostEntry = p.given.find((g) => g.label !== 'Mask');
      prefix = maskToken(giv(p, 'Mask'));
      net = fromBin(netBin(hostEntry.value, prefix));
    }
    const mine = { wildcard: dottedWild(prefix) };
    if (p.fields.some((f) => f.key === 'network')) mine.network = net;
    for (const k of Object.keys(mine)) if (mine[k] !== p.answer[k]) return `${k}: mine ${mine[k]} vs ${p.answer[k]}`;
    return expectOk(p, mine, 'own answer') || expectBad(p, { ...mine, wildcard: dottedMask(prefix) }, 'subnet mask instead of wildcard');
  },
  'v4-summary'(p) {
    const nets = p.given.map((g) => {
      const v = g.value;
      if (v.includes('/')) return splitCidr(v);
      const [a, m] = v.split(' ');
      return { addr: a, prefix: prefixFromDotted(m) };
    });
    // longest common prefix over the binary strings, capped at the shortest child prefix
    const bins = nets.map((n) => toBin(toOctets(n.addr)));
    let p0 = Math.min(...nets.map((n) => n.prefix));
    let common = 0;
    while (common < p0 && bins.every((b) => b[common] === bins[0][common])) common++;
    const mine = `${fromBin(bins[0].slice(0, common) + '0'.repeat(32 - common))}/${common}`;
    if (mine !== p.answer.summary) return `mine ${mine} vs ${p.answer.summary}`;
    const { addr } = splitCidr(mine);
    return (
      expectOk(p, { summary: `${addr} ${dottedMask(common)}` }, 'own answer dotted') ||
      expectBad(p, { summary: `${fromBin(bins[0].slice(0, common - 1) + '0'.repeat(33 - common))}/${common - 1}` }, 'one bit too short') ||
      expectBad(p, { summary: `${fromBin(bins[0].slice(0, common + 1) + '0'.repeat(31 - common))}/${common + 1}` }, 'one bit too long')
    );
  },
  'v6-prefix'(p) {
    const [a, l] = giv(p, 'Address').split('/');
    const len = parseInt(l, 10);
    const g = prefix6(expand6(a), len);
    const mine = `${compress6(g)}/${len}`;
    if (mine !== p.answer.prefix) return `mine ${mine} vs ${p.answer.prefix}`;
    return (
      expectOk(p, { prefix: `${full6(g).toUpperCase()} / ${len}` }, 'own answer, full form, upper') ||
      expectBad(p, { prefix: giv(p, 'Address') }, 'unmasked address') ||
      expectBad(p, { prefix: `${compress6(g)}/${len - 4}` }, 'wrong length')
    );
  },
  'v6-eui64'(p) {
    const pre = expand6(giv(p, 'Prefix').split('/')[0]);
    const iid = eui64FromMac(giv(p, 'MAC'));
    const g = [...pre.slice(0, 4), ...iid];
    const mine = compress6(g);
    if (mine !== p.answer.address) return `mine ${mine} vs ${p.answer.address}`;
    const noFlip = g.slice();
    noFlip[4] ^= 0x0200;
    return (
      expectOk(p, { address: full6(g).toUpperCase() }, 'own answer full upper') ||
      expectBad(p, { address: compress6(noFlip) }, 'U/L bit not flipped')
    );
  },
  'v6-compress'(p) {
    const g = expand6(giv(p, 'Address'));
    const mine = compress6(g);
    if (mine !== p.answer.compressed) return `mine ${mine} vs ${p.answer.compressed}`;
    // sanity: round-trips
    if (!same6(expand6(mine), g)) return 'my compression does not round-trip';
    return (
      expectOk(p, { compressed: mine.toUpperCase() }, 'own answer upper') ||
      expectBad(p, { compressed: giv(p, 'Address') }, 'uncompressed input') ||
      (mine.includes('::') ? expectBad(p, { compressed: mine.replace('::', ':0::') }, 'nonsense ::') : null)
    );
  },
  'v6-expand'(p) {
    const g = expand6(giv(p, 'Address'));
    const mine = full6(g);
    if (mine !== p.answer.full) return `mine ${mine} vs ${p.answer.full}`;
    if (compress6(g) !== giv(p, 'Address')) return 'shown address is not canonical';
    const unleaded = mine
      .split(':')
      .map((x) => x.replace(/^0+(?=.)/, ''))
      .join(':');
    return (
      expectOk(p, { full: mine.toUpperCase() }, 'own answer upper') ||
      expectBad(p, { full: giv(p, 'Address') }, 'still compressed') ||
      (unleaded !== mine ? expectBad(p, { full: unleaded }, 'leading zeros dropped') : null)
    );
  },
};

// ---------------- runner ----------------

export function runChecks({ n = 10000, seed = 1, types = TYPES.map((t) => t.id), log = () => {} } = {}) {
  const results = [];
  for (const id of types) {
    const rng = makeRng(seed + id.length * 7919);
    let fails = 0;
    const samples = [];
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const p = generate(id, rng);
      let err;
      try {
        err = checks[id](p);
      } catch (ex) {
        err = `exception: ${ex.message}`;
      }
      if (err) {
        fails++;
        if (samples.length < 3) samples.push({ problem: p, err });
      }
    }
    const row = { type: id, n, fails, ms: Date.now() - t0, samples };
    results.push(row);
    log(`${fails === 0 ? 'ok  ' : 'FAIL'} ${id.padEnd(13)} ${n} problems, ${fails} disagreements (${row.ms} ms)`);
    for (const s of samples) log(`     ${s.err}\n     ${JSON.stringify(s.problem)}`);
  }
  const totalFails = results.reduce((a, r) => a + r.fails, 0);
  log(totalFails === 0 ? `ALL GREEN — ${results.length} types × ${n}` : `${totalFails} DISAGREEMENTS`);
  return { ok: totalFails === 0, results };
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const n = Number(process.argv[2] || 10000);
  const seed = Number(process.argv[3] || Date.now() % 1e9);
  console.log(`subnet-check: ${n} per type, seed ${seed}`);
  const { ok } = runChecks({ n, seed, log: console.log });
  process.exit(ok ? 0 : 1);
}
