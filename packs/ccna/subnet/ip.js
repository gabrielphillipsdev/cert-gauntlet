// IPv4 / IPv6 address utilities for the subnetting trainer.
// IPv4 addresses are unsigned 32-bit integers; IPv6 addresses are BigInt.
// Pure functions, no DOM, importable from node for the test suite.

// ---------- IPv4 ----------

export function parse4(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) return null;
  const parts = s.split('.').map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function fmt4(n) {
  n = n >>> 0;
  return `${n >>> 24}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

export function maskOf(prefix) {
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function wildcardOf(prefix) {
  return (~maskOf(prefix)) >>> 0;
}

// Returns prefix length for a contiguous mask, or null if not a valid mask.
export function prefixOfMask(mask) {
  mask = mask >>> 0;
  for (let p = 0; p <= 32; p++) if (maskOf(p) === mask) return p;
  return null;
}

export function network4(addr, prefix) {
  return (addr & maskOf(prefix)) >>> 0;
}

export function broadcast4(addr, prefix) {
  return (network4(addr, prefix) | wildcardOf(prefix)) >>> 0;
}

export function blockSize(prefix) {
  return 2 ** (32 - prefix);
}

export function usableHosts(prefix) {
  if (prefix >= 31) return prefix === 31 ? 2 : 1; // RFC 3021 / host route
  return blockSize(prefix) - 2;
}

// Smallest-size subnet (largest prefix) with at least `n` usable hosts.
// Classic CCNA convention: 2 hosts -> /30.
export function prefixForHosts(n) {
  for (let p = 30; p >= 0; p--) if (usableHosts(p) >= n) return p;
  return 0;
}

// Parse "a.b.c.d/nn", "a.b.c.d nn", "a.b.c.d m.m.m.m", or "a.b.c.d" (prefix null).
export function parseCidr4(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().replace(/\s+/g, ' ');
  let m = s.match(/^([\d.]+)\s*\/\s*(\d{1,2})$/) || s.match(/^([\d.]+) (\d{1,2})$/);
  if (m) {
    const addr = parse4(m[1]);
    const p = Number(m[2]);
    if (addr === null || p > 32) return null;
    return { addr, prefix: p };
  }
  m = s.match(/^([\d.]+)[ /]([\d.]+)$/);
  if (m) {
    const addr = parse4(m[1]);
    const mask = parse4(m[2]);
    if (addr === null || mask === null) return null;
    const p = prefixOfMask(mask);
    if (p === null) return null;
    return { addr, prefix: p };
  }
  const addr = parse4(s);
  if (addr === null) return null;
  return { addr, prefix: null };
}

// Accept either "/nn" (with or without slash) or a dotted mask. Returns prefix or null.
export function parseMaskOrPrefix(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  let m = s.match(/^\/?\s*(\d{1,2})$/);
  if (m) {
    const p = Number(m[1]);
    return p <= 32 ? p : null;
  }
  const mask = parse4(s);
  if (mask === null) return null;
  return prefixOfMask(mask);
}

// Longest common prefix of a list of networks (each {addr, prefix}) -> {addr, prefix}
export function summarize4(nets) {
  let p = Math.min(...nets.map((n) => n.prefix));
  for (; p > 0; p--) {
    const first = network4(nets[0].addr, p);
    if (nets.every((n) => network4(n.addr, p) === first)) return { addr: first, prefix: p };
  }
  return { addr: 0, prefix: 0 };
}

// ---------- IPv6 ----------

const MAX6 = (1n << 128n) - 1n;

// Parse any legal textual IPv6 (RFC 4291 §2.2 forms, no zone / no embedded IPv4). Returns BigInt or null.
export function parse6(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  if (!/^[0-9a-f:]+$/.test(s)) return null;
  if (s.indexOf(':::') !== -1) return null;
  const dbl = s.split('::');
  if (dbl.length > 2) return null;
  const toGroups = (part) => {
    if (part === '') return [];
    const g = part.split(':');
    for (const x of g) if (!/^[0-9a-f]{1,4}$/.test(x)) return null;
    return g;
  };
  let groups;
  if (dbl.length === 2) {
    const head = toGroups(dbl[0]);
    const tail = toGroups(dbl[1]);
    if (!head || !tail) return null;
    const fill = 8 - head.length - tail.length;
    if (fill < 1) return null; // "::" must stand for at least one group
    groups = [...head, ...Array(fill).fill('0'), ...tail];
  } else {
    groups = toGroups(s);
    if (!groups || groups.length !== 8) return null;
  }
  let v = 0n;
  for (const g of groups) v = (v << 16n) | BigInt(parseInt(g, 16));
  return v;
}

export function groups6(v) {
  const out = [];
  for (let i = 7; i >= 0; i--) out.push(Number((v >> BigInt(i * 16)) & 0xffffn));
  return out;
}

// Full form: 8 groups, 4 lowercase hex digits each.
export function fmt6Full(v) {
  return groups6(v)
    .map((g) => g.toString(16).padStart(4, '0'))
    .join(':');
}

// RFC 5952 canonical compressed form.
export function fmt6(v) {
  const g = groups6(v);
  // find longest run of zeros (len >= 2), leftmost on tie
  let bestStart = -1,
    bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestLen) {
      bestLen = j - i;
      bestStart = i;
    }
    i = j;
  }
  const hex = g.map((x) => x.toString(16));
  if (bestLen < 2) return hex.join(':');
  const head = hex.slice(0, bestStart).join(':');
  const tail = hex.slice(bestStart + bestLen).join(':');
  return `${head}::${tail}`;
}

export function mask6(prefix) {
  if (prefix === 0) return 0n;
  return (MAX6 << BigInt(128 - prefix)) & MAX6;
}

export function network6(v, prefix) {
  return v & mask6(prefix);
}

// Parse "addr/len". Returns {addr, prefix} or null. prefix null when no "/len".
export function parseCidr6(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  const m = s.match(/^([0-9a-fA-F:]+)\s*\/\s*(\d{1,3})$/);
  if (m) {
    const addr = parse6(m[1]);
    const p = Number(m[2]);
    if (addr === null || p > 128) return null;
    return { addr, prefix: p };
  }
  const addr = parse6(s);
  if (addr === null) return null;
  return { addr, prefix: null };
}

// Modified EUI-64 interface ID from a MAC (as a 48-bit BigInt).
export function eui64(mac48) {
  const oui = (mac48 >> 24n) & 0xffffffn;
  const nic = mac48 & 0xffffffn;
  const flipped = oui ^ 0x020000n; // invert U/L bit (bit 1 of first octet)
  return (flipped << 40n) | (0xfffen << 24n) | nic;
}

export function parseMac(str) {
  if (typeof str !== 'string') return null;
  const hex = str.trim().toLowerCase().replace(/[.:-]/g, '');
  if (!/^[0-9a-f]{12}$/.test(hex)) return null;
  return BigInt('0x' + hex);
}

// Cisco dotted-triplet format, e.g. 0050.56ab.1234
export function fmtMacCisco(mac48) {
  const h = mac48.toString(16).padStart(12, '0');
  return `${h.slice(0, 4)}.${h.slice(4, 8)}.${h.slice(8, 12)}`;
}

export function fmtMacColon(mac48) {
  const h = mac48.toString(16).padStart(12, '0');
  return h.match(/../g).join(':');
}
