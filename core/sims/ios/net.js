/* Cert Gauntlet — IOS simulator: address math (IPv4 + IPv6).
   Pure functions, no state. IPv4 addresses are handled as unsigned 32-bit numbers,
   IPv6 as arrays of 8 16-bit groups. */

/* ---------------- IPv4 ---------------- */
export function isIPv4(s) {
  if (typeof s !== "string") return false;
  const p = s.split(".");
  return p.length === 4 && p.every(x => /^\d{1,3}$/.test(x) && +x <= 255);
}
export function ip4(s) {
  const p = s.split(".").map(Number);
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
export function str4(n) {
  n >>>= 0;
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}
export function maskLen(mask) {              // "255.255.255.0" -> 24 ; returns -1 if not contiguous
  const n = typeof mask === "number" ? mask : ip4(mask);
  const bin = (n >>> 0).toString(2).padStart(32, "0");
  const i = bin.indexOf("0");
  const len = i === -1 ? 32 : i;
  return bin === "1".repeat(len) + "0".repeat(32 - len) ? len : -1;
}
export function isMask(s) { return isIPv4(s) && maskLen(s) >= 0; }
export function lenMask(len) { return len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0; }
export function maskStr(len) { return str4(lenMask(len)); }
export function wildcardStr(len) { return str4(~lenMask(len) >>> 0); }
export function network(addr, len) { return (ip4(addr) & lenMask(len)) >>> 0; }
export function networkStr(addr, len) { return str4(network(addr, len)); }
export function broadcast(addr, len) { return (network(addr, len) | (~lenMask(len) >>> 0)) >>> 0; }
export function sameSubnet(a, b, len) { return network(a, len) === network(b, len); }
export function inPrefix(addr, prefix, len) { return (ip4(addr) & lenMask(len)) >>> 0 === (ip4(prefix) & lenMask(len)) >>> 0; }
/* ACL-style match: address + wildcard (1 bits = don't care). */
export function wildcardMatch(addr, base, wildcard) {
  const w = ip4(wildcard) >>> 0;
  return ((ip4(addr) & ~w) >>> 0) === ((ip4(base) & ~w) >>> 0);
}
export function cidr(addr, len) { return addr + "/" + len; }
export function isMulticast4(a) { return (ip4(a) >>> 28) === 14; }
/* class of a network for show ip route grouping ("10.0.0.0/8 is variably subnetted") */
export function classfulLen(addr) {
  const o = ip4(addr) >>> 24;
  if (o < 128) return 8; if (o < 192) return 16; return 24;
}
export function wildcardToLen(w) { return maskLen((~ip4(w)) >>> 0); }
export function isValidHostAddr(addr, len) {
  const n = ip4(addr); if (len >= 31) return true;
  return n !== network(addr, len) && n !== broadcast(addr, len);
}

/* ---------------- IPv6 ---------------- */
export function isIPv6(s) {
  if (typeof s !== "string" || !s.includes(":")) return false;
  try { return !!parse6(s); } catch { return false; }
}
export function parse6(s) {                   // -> [8 ints] or throws
  s = s.trim().toLowerCase();
  if (s.includes("/")) s = s.split("/")[0];
  const dbl = s.split("::");
  if (dbl.length > 2) throw new Error("bad ipv6");
  const grp = str => str === "" ? [] : str.split(":").map(g => { if (!/^[0-9a-f]{1,4}$/.test(g)) throw new Error("bad group"); return parseInt(g, 16); });
  let groups;
  if (dbl.length === 2) {
    const a = grp(dbl[0]), b = grp(dbl[1]);
    if (a.length + b.length > 7) throw new Error("bad ipv6");
    groups = [...a, ...new Array(8 - a.length - b.length).fill(0), ...b];
  } else {
    groups = grp(s); if (groups.length !== 8) throw new Error("bad ipv6");
  }
  return groups;
}
export function fmt6(g) {                      // RFC 5952 compressed, lowercase
  let bestStart = -1, bestLen = 0;
  for (let i = 0; i < 8;) {
    if (g[i] === 0) { let j = i; while (j < 8 && g[j] === 0) j++; if (j - i > bestLen) { bestLen = j - i; bestStart = i; } i = j; } else i++;
  }
  if (bestLen < 2) return g.map(x => x.toString(16)).join(":");
  const head = g.slice(0, bestStart).map(x => x.toString(16)).join(":");
  const tail = g.slice(bestStart + bestLen).map(x => x.toString(16)).join(":");
  return head + "::" + tail;
}
export function fmt6Upper(g) { return fmt6(g).toUpperCase(); }
export function prefix6(g, len) {              // zero host bits
  const out = g.slice();
  for (let i = 0; i < 8; i++) {
    const bits = Math.max(0, Math.min(16, len - i * 16));
    out[i] = bits === 0 ? 0 : (g[i] & (0xffff << (16 - bits)) & 0xffff);
  }
  return out;
}
export function samePrefix6(a, b, len) { const pa = prefix6(a, len), pb = prefix6(b, len); return pa.every((x, i) => x === pb[i]); }
export function isLinkLocal6(g) { return (g[0] & 0xffc0) === 0xfe80; }
export function isMulticast6(g) { return (g[0] & 0xff00) === 0xff00; }
/* EUI-64 interface id from a MAC "aabb.ccdd.eeff" */
export function eui64(mac, prefixGroups) {
  const hex = mac.replace(/[^0-9a-f]/gi, "").toLowerCase();
  const bytes = []; for (let i = 0; i < 12; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  bytes[0] ^= 0x02;
  const id = [bytes[0], bytes[1], bytes[2], 0xff, 0xfe, bytes[3], bytes[4], bytes[5]];
  const groups = [(id[0] << 8) | id[1], (id[2] << 8) | id[3], (id[4] << 8) | id[5], (id[6] << 8) | id[7]];
  return [...prefixGroups.slice(0, 4), ...groups];
}
export function linkLocalFromMac(mac) { return eui64(mac, [0xfe80, 0, 0, 0]); }
export function eq6(a, b) { return a.every((x, i) => x === b[i]); }

/* ---------------- MAC ---------------- */
export function fmtMac(hex12) { const h = hex12.replace(/[^0-9a-f]/gi, "").toLowerCase().padStart(12, "0"); return h.slice(0, 4) + "." + h.slice(4, 8) + "." + h.slice(8, 12); }
export function isMac(s) { return /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(s) || /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(s); }
export function normMac(s) { return fmtMac(s); }

/* ---------------- ranges like "1-5,10,20-22" ---------------- */
export function parseRange(spec, lo = 1, hi = 4094) {
  const out = new Set();
  for (const part of String(spec).split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/); if (!m) return null;
    const a = +m[1], b = m[2] === undefined ? a : +m[2];
    if (a < lo || b > hi || a > b) return null;
    for (let i = a; i <= b; i++) out.add(i);
  }
  return out;
}
export function fmtRange(set) {                // Set/array of ints -> "1,10-12,20"
  const a = [...set].map(Number).sort((x, y) => x - y); const parts = [];
  for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; parts.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`); i = j + 1; }
  return parts.join(",");
}
