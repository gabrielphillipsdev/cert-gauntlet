// Problem generators and graders for the CCNA subnetting trainer.
//
// Every generator is `gen(rng) -> problem` and every problem is plain JSON
// (no BigInt, no functions) so it can be logged, replayed, or synced later.
// `grade(problem, input)` returns {correct, parts} where parts is keyed by
// field key: {ok, expected, got, note}.
//
// TODO(engine): when /dev/ENGINE.md lands, register these types with the
// engine's item registry and route results through core stats/sync instead
// of stats.js (see stats.js for the shape to migrate).

import {
  parse4,
  fmt4,
  maskOf,
  wildcardOf,
  network4,
  broadcast4,
  usableHosts,
  prefixForHosts,
  parseCidr4,
  parseMaskOrPrefix,
  summarize4,
  parse6,
  fmt6,
  fmt6Full,
  network6,
  parseCidr6,
  eui64,
  fmtMacCisco,
  fmtMacColon,
} from './ip.js';

// ---------- shared helpers ----------

const PRIVATE_BLOCKS = [
  { base: '10.0.0.0', prefix: 8 },
  { base: '172.16.0.0', prefix: 12 },
  { base: '192.168.0.0', prefix: 16 },
];

// A random "realistic" IPv4 host address: mostly RFC 1918, sometimes public-looking.
function randomHost4(rng) {
  if (rng.chance(0.75)) {
    const b = rng.pick(PRIVATE_BLOCKS);
    const base = parse4(b.base);
    const span = 2 ** (32 - b.prefix);
    return (base + Math.floor(rng.next() * span)) >>> 0;
  }
  // public-ish: first octet 1..223 excluding 10, 127, 169, 172, 192
  let o1;
  do o1 = rng.int(1, 223);
  while ([10, 127, 169, 172, 192].includes(o1));
  return ((o1 << 24) | rng.int(0, 0xffffff)) >>> 0;
}

function maskText(prefix, style) {
  return style === 'dotted' ? fmt4(maskOf(prefix)) : `/${prefix}`;
}

function part(ok, expected, got, note) {
  return { ok, expected, got: got ?? '', note: note || '' };
}

function finish(parts) {
  return { correct: Object.values(parts).every((p) => p.ok), parts };
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

// ---------- IPv4: network / broadcast / first / last ----------

export function genNetBcast(rng) {
  const prefix = rng.int(8, 30);
  const host = randomHost4(rng);
  const style = rng.chance(0.5) ? 'cidr' : 'dotted';
  const net = network4(host, prefix);
  const bc = broadcast4(host, prefix);
  return {
    type: 'v4-netbcast',
    data: { host, prefix },
    given: [
      { label: 'Host', value: fmt4(host) },
      { label: 'Mask', value: maskText(prefix, style) },
    ],
    fields: [
      { key: 'network', label: 'Network', kind: 'ip4' },
      { key: 'broadcast', label: 'Broadcast', kind: 'ip4' },
      { key: 'first', label: 'First host', kind: 'ip4' },
      { key: 'last', label: 'Last host', kind: 'ip4' },
    ],
    answer: {
      network: fmt4(net),
      broadcast: fmt4(bc),
      first: fmt4(net + 1),
      last: fmt4(bc - 1),
    },
  };
}

function gradeNetBcast(p, input) {
  const parts = {};
  for (const f of p.fields) {
    const got = str(input[f.key]).trim();
    const v = parse4(got);
    parts[f.key] = part(v !== null && fmt4(v) === p.answer[f.key], p.answer[f.key], got);
  }
  return finish(parts);
}

// ---------- IPv4: mask conversion ----------

export function genMask(rng) {
  const variant = rng.pick(['cidr2dotted', 'dotted2cidr', 'hosts2prefix']);
  if (variant === 'hosts2prefix') {
    const prefix = rng.int(18, 30);
    // hosts in (usable(prefix+1), usable(prefix)] so `prefix` is the tightest fit
    const cap = usableHosts(prefix);
    const floor = prefix === 30 ? 1 : usableHosts(prefix + 1) + 1;
    const hosts = rng.int(floor, cap);
    return {
      type: 'v4-mask',
      data: { variant, hosts, prefix },
      given: [{ label: 'Hosts needed', value: String(hosts) }],
      prompt: 'Smallest subnet that fits this many hosts',
      fields: [
        { key: 'prefix', label: 'Prefix (/nn)', kind: 'cidr' },
        { key: 'mask', label: 'Subnet mask', kind: 'ip4' },
      ],
      answer: { prefix: `/${prefix}`, mask: fmt4(maskOf(prefix)) },
    };
  }
  const prefix = rng.int(8, 30);
  if (variant === 'cidr2dotted') {
    return {
      type: 'v4-mask',
      data: { variant, prefix },
      given: [{ label: 'Prefix', value: `/${prefix}` }],
      fields: [
        { key: 'mask', label: 'Subnet mask', kind: 'ip4' },
        { key: 'hosts', label: 'Usable hosts', kind: 'int' },
      ],
      answer: { mask: fmt4(maskOf(prefix)), hosts: String(usableHosts(prefix)) },
    };
  }
  return {
    type: 'v4-mask',
    data: { variant, prefix },
    given: [{ label: 'Mask', value: fmt4(maskOf(prefix)) }],
    fields: [
      { key: 'prefix', label: 'Prefix (/nn)', kind: 'cidr' },
      { key: 'hosts', label: 'Usable hosts', kind: 'int' },
    ],
    answer: { prefix: `/${prefix}`, hosts: String(usableHosts(prefix)) },
  };
}

function gradeMask(p, input) {
  const parts = {};
  for (const f of p.fields) {
    const got = str(input[f.key]).trim();
    const exp = p.answer[f.key];
    let ok = false;
    if (f.key === 'prefix') ok = parseMaskOrPrefix(got) === p.data.prefix;
    else if (f.key === 'mask') ok = parse4(got) !== null && fmt4(parse4(got)) === exp;
    else if (f.key === 'hosts') ok = /^\d+$/.test(got.replace(/,/g, '')) && Number(got.replace(/,/g, '')) === Number(exp);
    parts[f.key] = part(ok, exp, got);
  }
  return finish(parts);
}

// ---------- IPv4: which subnet is this host in ----------

export function genWhich(rng) {
  const basePrefix = rng.pick([16, 20, 22, 23, 24, 24, 24, 25, 26]);
  const subPrefix = rng.int(basePrefix + 1, Math.min(basePrefix + 6, 30));
  const base = network4(randomHost4(rng), basePrefix);
  // pick a real host: never the subnet's network or broadcast address
  const subCount = 2 ** (subPrefix - basePrefix);
  const subSize = 2 ** (32 - subPrefix);
  const host = (base + rng.int(0, subCount - 1) * subSize + rng.int(1, subSize - 2)) >>> 0;
  const net = network4(host, subPrefix);
  const style = rng.chance(0.5) ? 'cidr' : 'dotted';
  return {
    type: 'v4-which',
    data: { base, basePrefix, subPrefix, host },
    prompt: `${fmt4(base)}/${basePrefix} is subnetted with ${maskText(subPrefix, style)}. Which subnet is this host in?`,
    given: [{ label: 'Host', value: fmt4(host) }],
    fields: [
      { key: 'subnet', label: 'Subnet (network addr)', kind: 'ip4' },
      { key: 'broadcast', label: 'Its broadcast', kind: 'ip4' },
    ],
    answer: { subnet: fmt4(net), broadcast: fmt4(broadcast4(host, subPrefix)) },
  };
}

function gradeWhich(p, input) {
  const parts = {};
  const s = str(input.subnet).trim();
  const c = parseCidr4(s);
  parts.subnet = part(
    c !== null && fmt4(c.addr) === p.answer.subnet && (c.prefix === null || c.prefix === p.data.subPrefix),
    p.answer.subnet,
    s,
    c !== null && c.prefix !== null && c.prefix !== p.data.subPrefix ? `prefix should be /${p.data.subPrefix}` : ''
  );
  const b = str(input.broadcast).trim();
  const bv = parse4(b);
  parts.broadcast = part(bv !== null && fmt4(bv) === p.answer.broadcast, p.answer.broadcast, b);
  return finish(parts);
}

// ---------- IPv4: VLSM ----------

const DEPT_NAMES = ['Sales', 'Engineering', 'HR', 'Finance', 'Guest Wi-Fi', 'Servers', 'Mgmt', 'VoIP', 'Lab', 'Warehouse', 'Marketing', 'Support'];

export function genVlsm(rng) {
  const count = rng.int(3, 5);
  // requirement sizes: a few LANs plus maybe a point-to-point link
  const reqs = [];
  const names = rng.shuffle(DEPT_NAMES).slice(0, count);
  for (let i = 0; i < count; i++) {
    let hosts;
    const r = rng.next();
    if (r < 0.2) hosts = 2; // WAN link
    else if (r < 0.6) hosts = rng.int(3, 60);
    else if (r < 0.9) hosts = rng.int(61, 250);
    else hosts = rng.int(251, 1000);
    reqs.push({ name: hosts === 2 ? `WAN link ${names[i]}` : names[i], hosts });
  }
  // base block must fit the sum of tight allocations
  const total = reqs.reduce((a, r) => a + 2 ** (32 - prefixForHosts(r.hosts)), 0);
  let basePrefix = 32 - Math.ceil(Math.log2(total));
  // leave some slack sometimes so there is more than one valid answer
  if (rng.chance(0.4)) basePrefix -= 1;
  basePrefix = Math.max(basePrefix, 16);
  const base = network4(randomHost4(rng), basePrefix);
  // reference answer: largest first, packed
  const order = reqs
    .map((r, i) => ({ i, p: prefixForHosts(r.hosts) }))
    .sort((a, b) => a.p - b.p);
  let cursor = base;
  const answer = {};
  for (const { i, p } of order) {
    answer[`r${i}`] = `${fmt4(cursor)}/${p}`;
    cursor = (cursor + 2 ** (32 - p)) >>> 0;
  }
  return {
    type: 'v4-vlsm',
    data: { base, basePrefix, reqs },
    prompt: `Carve ${fmt4(base)}/${basePrefix} into subnets for these requirements using the smallest subnet that fits each. Any non-overlapping layout is accepted.`,
    given: reqs.map((r) => ({ label: r.name, value: `${r.hosts} hosts` })),
    fields: reqs.map((r, i) => ({ key: `r${i}`, label: `${r.name} (${r.hosts})`, kind: 'cidr4', placeholder: 'a.b.c.d/nn' })),
    answer,
  };
}

function gradeVlsm(p, input) {
  const parts = {};
  const parsed = [];
  const baseLo = p.data.base;
  const baseHi = (p.data.base + 2 ** (32 - p.data.basePrefix) - 1) >>> 0;
  p.data.reqs.forEach((r, i) => {
    const key = `r${i}`;
    const got = str(input[key]).trim();
    const c = parseCidr4(got);
    const exp = p.answer[key];
    if (c === null || c.prefix === null) {
      parts[key] = part(false, exp, got, 'need network/prefix');
      parsed.push(null);
      return;
    }
    const tight = prefixForHosts(r.hosts);
    const okTight = c.prefix === tight || (r.hosts === 2 && c.prefix === 31);
    const aligned = network4(c.addr, c.prefix) === c.addr;
    const lo = c.addr;
    const hi = (c.addr + 2 ** (32 - c.prefix) - 1) >>> 0;
    const inBlock = lo >= baseLo && hi <= baseHi;
    let note = '';
    if (!aligned) note = 'not a network address for that prefix';
    else if (!okTight) note = c.prefix < tight ? `too big — /${tight} fits ${r.hosts} hosts` : `too small for ${r.hosts} hosts`;
    else if (!inBlock) note = 'outside the base block';
    parts[key] = part(aligned && okTight && inBlock, exp, got, note);
    parsed.push(aligned && okTight && inBlock ? { lo, hi, key } : null);
  });
  // overlap check among valid entries
  for (let a = 0; a < parsed.length; a++) {
    for (let b = a + 1; b < parsed.length; b++) {
      const x = parsed[a],
        y = parsed[b];
      if (!x || !y) continue;
      if (x.lo <= y.hi && y.lo <= x.hi) {
        parts[x.key].ok = false;
        parts[y.key].ok = false;
        parts[x.key].note = parts[y.key].note = 'overlaps another subnet';
      }
    }
  }
  const res = finish(parts);
  // expected shown is one valid layout, not the only one
  res.note = 'Reference layout shown; any valid non-overlapping layout is accepted.';
  return res;
}

// ---------- IPv4: wildcard masks (ACL / OSPF) ----------

export function genWildcard(rng) {
  const variant = rng.pick(['acl', 'ospf', 'acl-host']);
  const prefix = rng.int(8, 30);
  const host = randomHost4(rng);
  const net = network4(host, prefix);
  const wc = wildcardOf(prefix);
  const style = rng.chance(0.5) ? 'cidr' : 'dotted';
  if (variant === 'acl') {
    return {
      type: 'v4-wildcard',
      data: { variant, prefix, net },
      prompt: 'Wildcard mask for an ACL entry that matches exactly this subnet',
      given: [{ label: 'Subnet', value: style === 'cidr' ? `${fmt4(net)}/${prefix}` : `${fmt4(net)} ${fmt4(maskOf(prefix))}` }],
      fields: [{ key: 'wildcard', label: 'Wildcard', kind: 'ip4' }],
      answer: { wildcard: fmt4(wc) },
    };
  }
  if (variant === 'ospf') {
    const iface = rng.pick(['GigabitEthernet0/0', 'GigabitEthernet0/1', 'Serial0/0/0', 'GigabitEthernet0/0/1', 'Loopback0']);
    return {
      type: 'v4-wildcard',
      data: { variant, prefix, net, host },
      prompt: `Write the OSPF network statement that enables OSPF on exactly this interface's subnet: network <address> <wildcard> area 0`,
      given: [
        { label: iface, value: fmt4(host) },
        { label: 'Mask', value: maskText(prefix, style) },
      ],
      fields: [
        { key: 'network', label: 'network address', kind: 'ip4' },
        { key: 'wildcard', label: 'wildcard', kind: 'ip4' },
      ],
      answer: { network: fmt4(net), wildcard: fmt4(wc) },
    };
  }
  return {
    type: 'v4-wildcard',
    data: { variant, prefix, net, host },
    prompt: 'This host is on a subnet. Write the ACL source address + wildcard that matches the whole subnet.',
    given: [
      { label: 'Host', value: fmt4(host) },
      { label: 'Mask', value: maskText(prefix, style) },
    ],
    fields: [
      { key: 'network', label: 'address', kind: 'ip4' },
      { key: 'wildcard', label: 'wildcard', kind: 'ip4' },
    ],
    answer: { network: fmt4(net), wildcard: fmt4(wc) },
  };
}

function gradeWildcard(p, input) {
  const parts = {};
  for (const f of p.fields) {
    const got = str(input[f.key]).trim();
    const v = parse4(got);
    let note = '';
    if (f.key === 'wildcard' && v !== null && fmt4(v) === fmt4(maskOf(p.data.prefix))) note = "that's the subnet mask, invert it";
    parts[f.key] = part(v !== null && fmt4(v) === p.answer[f.key], p.answer[f.key], got, note);
  }
  return finish(parts);
}

// ---------- IPv4: route summarization ----------

export function genSummary(rng) {
  const sumPrefix = rng.int(13, 23);
  const depth = rng.int(1, 3); // children are sumPrefix+depth
  const childPrefix = sumPrefix + depth;
  const nChildren = 2 ** depth;
  const base = network4(randomHost4(rng), sumPrefix);
  const childSize = 2 ** (32 - childPrefix);
  // choose which children to list: always include one from the low half and one from the high half
  // so the longest common prefix is exactly sumPrefix.
  let idx;
  if (rng.chance(0.55)) {
    idx = [...Array(nChildren).keys()]; // all of them (classic "summarize these 4 /24s")
  } else {
    const half = nChildren / 2;
    const picked = new Set([rng.int(0, half - 1), rng.int(half, nChildren - 1)]);
    const extra = rng.int(0, Math.min(4, nChildren - 2));
    for (let i = 0; i < extra; i++) picked.add(rng.int(0, nChildren - 1));
    idx = [...picked].sort((a, b) => a - b);
  }
  if (rng.chance(0.3)) idx = rng.shuffle(idx);
  const nets = idx.map((i) => ({ addr: (base + i * childSize) >>> 0, prefix: childPrefix }));
  const style = rng.chance(0.6) ? 'cidr' : 'dotted';
  return {
    type: 'v4-summary',
    data: { nets: nets.map((n) => ({ addr: n.addr, prefix: n.prefix })), sumPrefix, base },
    prompt: 'Single summary route that covers all of these networks with the longest possible prefix',
    given: nets.map((n) => ({ label: '', value: `${fmt4(n.addr)}${style === 'cidr' ? `/${n.prefix}` : ' ' + fmt4(maskOf(n.prefix))}` })),
    fields: [{ key: 'summary', label: 'Summary', kind: 'cidr4', placeholder: 'a.b.c.d/nn' }],
    answer: { summary: `${fmt4(base)}/${sumPrefix}` },
  };
}

function gradeSummary(p, input) {
  const got = str(input.summary).trim();
  const c = parseCidr4(got);
  let ok = false,
    note = '';
  if (c === null || c.prefix === null) note = 'need network/prefix';
  else {
    const covers = p.data.nets.every((n) => n.prefix >= c.prefix && network4(n.addr, c.prefix) === network4(c.addr, c.prefix));
    const aligned = network4(c.addr, c.prefix) === c.addr;
    if (!aligned) note = 'not a network address for that prefix';
    else if (!covers) note = "doesn't cover every network";
    else if (c.prefix < p.data.sumPrefix) note = `covers them, but /${p.data.sumPrefix} is tighter`;
    else ok = true;
  }
  return finish({ summary: part(ok, p.answer.summary, got, note) });
}

// ---------- IPv6 helpers ----------

function randomGlobal6(rng) {
  // 2001:db8::/32 documentation space with random subnet + interface ID
  const hi = (0x20010db8n << 96n) | (BigInt(rng.int(0, 0xffff)) << 80n) | (BigInt(rng.int(0, 0xffff)) << 64n);
  const lo = (BigInt(rng.u32()) << 32n) | BigInt(rng.u32());
  return hi | lo;
}

// Random address with plenty of zero groups, for compression practice.
function randomCompressible6(rng) {
  const g = [];
  const pattern = rng.pick(['one-run', 'two-runs', 'tie', 'single-zeros', 'leading', 'trailing', 'none']);
  const nz = () => (rng.chance(0.5) ? rng.int(1, 0xfff) : rng.int(0x1000, 0xffff));
  for (let i = 0; i < 8; i++) g.push(nz());
  const zero = (a, b) => {
    for (let i = a; i <= b; i++) g[i] = 0;
  };
  switch (pattern) {
    case 'one-run':
      {
        const s = rng.int(1, 5),
          l = rng.int(2, 7 - s);
        zero(s, s + l - 1);
      }
      break;
    case 'two-runs':
      zero(1, 2);
      zero(4, 6);
      break;
    case 'tie':
      zero(1, 2);
      zero(5, 6);
      break;
    case 'single-zeros':
      g[1] = 0;
      g[4] = 0;
      g[6] = 0;
      break;
    case 'leading':
      zero(0, rng.int(1, 5));
      break;
    case 'trailing':
      zero(rng.int(3, 6), 7);
      break;
    default:
      break;
  }
  if (rng.chance(0.3)) g[0] = 0x2001;
  let v = 0n;
  for (const x of g) v = (v << 16n) | BigInt(x);
  // never a no-op problem: make sure compressing actually changes something
  if (fmt6(v) === fmt6Full(v)) return randomCompressible6(rng);
  return v;
}

// ---------- IPv6: prefix ----------

export function genV6Prefix(rng) {
  const prefix = rng.pick([32, 36, 40, 44, 48, 48, 52, 56, 56, 60, 64, 64, 64]);
  const addr = randomGlobal6(rng);
  const net = network6(addr, prefix);
  return {
    type: 'v6-prefix',
    data: { addr: fmt6Full(addr), prefix },
    prompt: 'Network prefix (compressed) for this address',
    given: [{ label: 'Address', value: `${rng.chance(0.5) ? fmt6(addr) : fmt6Full(addr)}/${prefix}` }],
    fields: [{ key: 'prefix', label: 'Prefix', kind: 'cidr6', placeholder: '2001:db8::/48' }],
    answer: { prefix: `${fmt6(net)}/${prefix}` },
  };
}

function gradeV6Prefix(p, input) {
  const got = str(input.prefix).trim();
  const c = parseCidr6(got);
  const exp = network6(parse6(p.data.addr), p.data.prefix);
  let ok = false,
    note = '';
  if (c === null) note = 'not a valid IPv6 prefix';
  else if (c.prefix !== null && c.prefix !== p.data.prefix) note = `prefix length should be /${p.data.prefix}`;
  else if (c.addr !== exp) note = c.addr === parse6(p.data.addr) ? 'that is the full address, zero the host bits' : '';
  else ok = true;
  return finish({ prefix: part(ok, p.answer.prefix, got, note) });
}

// ---------- IPv6: EUI-64 ----------

export function genEui64(rng) {
  const mac = (BigInt(rng.int(0, 0xffff)) << 32n) | BigInt(rng.u32());
  const prefix = (0x20010db8n << 96n) | (BigInt(rng.int(0, 0xffff)) << 80n) | (BigInt(rng.int(0, 0xffff)) << 64n);
  const addr = prefix | eui64(mac);
  const macText = rng.chance(0.6) ? fmtMacCisco(mac) : fmtMacColon(mac);
  return {
    type: 'v6-eui64',
    data: { mac: mac.toString(16).padStart(12, '0'), prefix: fmt6Full(prefix) },
    prompt: 'Full IPv6 address the interface gets with EUI-64',
    given: [
      { label: 'Prefix', value: `${fmt6(prefix)}/64` },
      { label: 'MAC', value: macText },
    ],
    fields: [{ key: 'address', label: 'Address', kind: 'ip6' }],
    answer: { address: fmt6(addr) },
  };
}

function gradeEui64(p, input) {
  const got = str(input.address).trim().replace(/\/64$/, '');
  const v = parse6(got);
  const exp = parse6(p.answer.address);
  let note = '';
  if (v !== null && v !== exp) {
    const noFlip = exp ^ (0x02n << 56n);
    if (v === noFlip) note = 'forgot to flip the U/L bit (7th bit of the first byte)';
    else if ((v & ~0xffffffffffffffffn) !== (exp & ~0xffffffffffffffffn)) note = 'prefix half is wrong';
    else if (((v >> 24n) & 0xffffn) !== 0xfffen) note = 'fffe goes between the OUI and the NIC half';
  }
  return finish({ address: part(v !== null && v === exp, p.answer.address, got, note) });
}

// ---------- IPv6: compression / expansion ----------

export function genCompress(rng) {
  const addr = randomCompressible6(rng);
  return {
    type: 'v6-compress',
    data: { addr: fmt6Full(addr) },
    prompt: 'Shortest valid form (RFC 5952)',
    given: [{ label: 'Address', value: fmt6Full(addr) }],
    fields: [{ key: 'compressed', label: 'Compressed', kind: 'ip6' }],
    answer: { compressed: fmt6(addr) },
  };
}

function gradeCompress(p, input) {
  const got = str(input.compressed).trim().toLowerCase();
  const v = parse6(got);
  const exp = parse6(p.data.addr);
  let ok = false,
    note = '';
  if (v === null) note = 'not a valid IPv6 address';
  else if (v !== exp) note = 'different address';
  else if (got.length > p.answer.compressed.length) note = 'valid, but not the shortest form';
  else ok = true;
  return finish({ compressed: part(ok, p.answer.compressed, got, note) });
}

export function genExpand(rng) {
  const addr = randomCompressible6(rng);
  return {
    type: 'v6-expand',
    data: { addr: fmt6Full(addr) },
    prompt: 'Write all 8 groups with 4 hex digits each',
    given: [{ label: 'Address', value: fmt6(addr) }],
    fields: [{ key: 'full', label: 'Expanded', kind: 'ip6' }],
    answer: { full: fmt6Full(addr) },
  };
}

function gradeExpand(p, input) {
  const got = str(input.full).trim().toLowerCase();
  const v = parse6(got);
  const exp = parse6(p.data.addr);
  let ok = false,
    note = '';
  if (v === null) note = 'not a valid IPv6 address';
  else if (v !== exp) note = 'different address';
  else if (!/^[0-9a-f]{4}(:[0-9a-f]{4}){7}$/.test(got)) note = 'right address, but not fully expanded (8 groups × 4 digits)';
  else ok = true;
  return finish({ full: part(ok, p.answer.full, got, note) });
}

// ---------- registry ----------

export const TYPES = [
  { id: 'v4-netbcast', name: 'Network / broadcast', short: 'Net/Bcast', family: 'v4', basic: true, gen: genNetBcast, grade: gradeNetBcast },
  { id: 'v4-mask', name: 'Mask conversion', short: 'Mask', family: 'v4', basic: true, gen: genMask, grade: gradeMask },
  { id: 'v4-which', name: 'Which subnet?', short: 'Which', family: 'v4', basic: true, gen: genWhich, grade: gradeWhich },
  { id: 'v4-wildcard', name: 'Wildcard (ACL / OSPF)', short: 'Wildcard', family: 'v4', basic: true, gen: genWildcard, grade: gradeWildcard },
  { id: 'v4-vlsm', name: 'VLSM allocation', short: 'VLSM', family: 'v4', basic: false, gen: genVlsm, grade: gradeVlsm },
  { id: 'v4-summary', name: 'Route summarization', short: 'Summary', family: 'v4', basic: false, gen: genSummary, grade: gradeSummary },
  { id: 'v6-prefix', name: 'IPv6 prefix', short: 'v6 Prefix', family: 'v6', basic: false, gen: genV6Prefix, grade: gradeV6Prefix },
  { id: 'v6-eui64', name: 'EUI-64', short: 'EUI-64', family: 'v6', basic: false, gen: genEui64, grade: gradeEui64 },
  { id: 'v6-compress', name: 'IPv6 compress', short: 'Compress', family: 'v6', basic: false, gen: genCompress, grade: gradeCompress },
  { id: 'v6-expand', name: 'IPv6 expand', short: 'Expand', family: 'v6', basic: false, gen: genExpand, grade: gradeExpand },
];

export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

export function generate(typeId, rng) {
  const t = TYPE_BY_ID[typeId];
  if (!t) throw new Error(`unknown type ${typeId}`);
  const p = t.gen(rng);
  p.title = t.name;
  return p;
}

export function grade(problem, input) {
  return TYPE_BY_ID[problem.type].grade(problem, input || {});
}
