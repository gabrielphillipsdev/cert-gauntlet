/* Cert Gauntlet — KQL scalar functions and aggregation functions.
   Scalar: FUNCS[name] = { fn(args, types, ctx) -> value, ret: type | (types) => type, min, max }.
   Aggregates: AGGS[name] = { init(), step(acc, args), done(acc) -> value, ret(argTypes), name(argNames) }. */
import { DT, TS, isDT, isTS, isNullish, isStr, isNum, isBool, isDyn, toStr, toLong, toReal, toBool, toDT, toTS, castTo, hashKey, cmp, eq, typeOfValue, safeJSON, UNIT_MS, fmtValue } from "./values.js";
import { KqlError } from "./lexer.js";

const N = isNullish;
const num = (v) => N(v) ? null : isNum(v) ? v : isDT(v) || isTS(v) ? v.ms : toReal(v);
const str = (v) => N(v) ? "" : toStr(v);
const DAY = 86400000;

/* ---------- date helpers (UTC) ---------- */
function startOf(ms, unit, offset = 0) {
  const d = new Date(ms); let r;
  switch (unit) {
    case "day": r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset); break;
    case "week": { const dow = d.getUTCDay(); r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow + offset * 7); break; }
    case "month": r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1); break;
    case "year": r = Date.UTC(d.getUTCFullYear() + offset, 0, 1); break;
    case "hour": r = Math.floor(ms / 3600000) * 3600000 + offset * 3600000; break;
    case "minute": r = Math.floor(ms / 60000) * 60000 + offset * 60000; break;
    case "second": r = Math.floor(ms / 1000) * 1000 + offset * 1000; break;
    default: r = ms;
  }
  return r;
}
function endOf(ms, unit, offset = 0) {
  const d = new Date(ms); let r;
  switch (unit) {
    case "day": r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1 + offset); break;
    case "week": { const dow = d.getUTCDay(); r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow + 7 + offset * 7); break; }
    case "month": r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1 + offset, 1); break;
    case "year": r = Date.UTC(d.getUTCFullYear() + 1 + offset, 0, 1); break;
    default: r = ms;
  }
  return r - 0.0001; /* one tick before the next period, like Kusto's endofday */
}
const PERIOD = { year: "year", quarter: "quarter", month: "month", week: "week", day: "day", hour: "hour", minute: "minute", second: "second", millisecond: "millisecond", microsecond: "microsecond", nanosecond: "nanosecond" };
export function datetimeDiff(period, a, b) {
  const da = new Date(a), db = new Date(b);
  switch (period) {
    case "year": return da.getUTCFullYear() - db.getUTCFullYear();
    case "quarter": return (da.getUTCFullYear() - db.getUTCFullYear()) * 4 + (Math.floor(da.getUTCMonth() / 3) - Math.floor(db.getUTCMonth() / 3));
    case "month": return (da.getUTCFullYear() - db.getUTCFullYear()) * 12 + (da.getUTCMonth() - db.getUTCMonth());
    case "week": return Math.round((startOf(a, "week") - startOf(b, "week")) / (7 * DAY));
    case "day": return Math.round((startOf(a, "day") - startOf(b, "day")) / DAY);
    case "hour": return Math.round((startOf(a, "hour") - startOf(b, "hour")) / 3600000);
    case "minute": return Math.round((startOf(a, "minute") - startOf(b, "minute")) / 60000);
    case "second": return Math.round((startOf(a, "second") - startOf(b, "second")) / 1000);
    case "millisecond": return Math.round(a - b);
    case "microsecond": return Math.round((a - b) * 1000);
    case "nanosecond": return Math.round((a - b) * 1e6);
    default: return null;
  }
}
function datetimeAdd(period, n, ms) {
  const d = new Date(ms);
  switch (period) {
    case "year": case "quarter": case "month": { const months = period === "year" ? 12 * n : period === "quarter" ? 3 * n : n; const y = d.getUTCFullYear(), m0 = d.getUTCMonth() + months; const last = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); return Date.UTC(y, m0, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()); }
    case "week": return ms + n * 7 * DAY; case "day": return ms + n * DAY; case "hour": return ms + n * 3600000; case "minute": return ms + n * 60000; case "second": return ms + n * 1000; case "millisecond": return ms + n;
    default: return null;
  }
}
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatDatetime(ms, fmt) {
  const d = new Date(ms); const p2 = n => String(n).padStart(2, "0");
  return fmt.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|fffffff|ffffff|fffff|ffff|fff|ff|f|tt|FF+/g, tok => {
    switch (tok) {
      case "yyyy": return String(d.getUTCFullYear()); case "yy": return p2(d.getUTCFullYear() % 100);
      case "MMMM": return MON[d.getUTCMonth()]; case "MMM": return MON[d.getUTCMonth()].slice(0, 3); case "MM": return p2(d.getUTCMonth() + 1); case "M": return String(d.getUTCMonth() + 1);
      case "dddd": return DOW[d.getUTCDay()]; case "ddd": return DOW[d.getUTCDay()].slice(0, 3); case "dd": return p2(d.getUTCDate()); case "d": return String(d.getUTCDate());
      case "HH": return p2(d.getUTCHours()); case "H": return String(d.getUTCHours()); case "hh": return p2(d.getUTCHours() % 12 || 12); case "h": return String(d.getUTCHours() % 12 || 12);
      case "mm": return p2(d.getUTCMinutes()); case "m": return String(d.getUTCMinutes()); case "ss": return p2(d.getUTCSeconds()); case "s": return String(d.getUTCSeconds());
      case "tt": return d.getUTCHours() < 12 ? "AM" : "PM";
      default: { const frac = ((ms % 1000) + 1000) % 1000; return String(Math.round(frac * 10000)).padStart(7, "0").slice(0, tok.length); }
    }
  });
}
function formatTimespan(ms, fmt) {
  const neg = ms < 0; ms = Math.abs(ms); const days = Math.floor(ms / DAY); const h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000); const p2 = n => String(n).padStart(2, "0");
  return (neg ? "-" : "") + fmt.replace(/dd|d|HH|H|hh|h|mm|m|ss|s|f+|F+/g, tok => { switch (tok[0]) { case "d": return tok.length === 2 ? p2(days) : String(days); case "H": case "h": return tok.length === 2 ? p2(h) : String(h); case "m": return tok.length === 2 ? p2(m) : String(m); case "s": return tok.length === 2 ? p2(s) : String(s); default: return String(Math.round((ms % 1000) * 10000)).padStart(7, "0").slice(0, tok.length); } });
}

/* ---------- strings ---------- */
export const TERM_RE = /[A-Za-z0-9_]/;
export function hasTerm(hay, needle, cs = false) {
  if (N(hay) || N(needle)) return false;
  hay = toStr(hay); needle = toStr(needle); if (!needle) return false;
  const H = cs ? hay : hay.toLowerCase(), Nd = cs ? needle : needle.toLowerCase();
  let i = 0;
  while ((i = H.indexOf(Nd, i)) >= 0) {
    const before = i === 0 ? "" : H[i - 1], after = H[i + Nd.length] || "";
    const bOk = !before || !TERM_RE.test(before) || !TERM_RE.test(Nd[0]), aOk = !after || !TERM_RE.test(after) || !TERM_RE.test(Nd[Nd.length - 1]);
    if (bOk && aOk) return true;
    i += 1;
  }
  return false;
}
function regexOf(pat, flags = "") { try { return new RegExp(pat, flags); } catch (e) { throw new KqlError(`Invalid regular expression '${pat}': ${e.message}`, { code: "SEM0100" }); } }
function toJSONish(v) { return isStr(v) ? safeJSON(v) : v; }
function ipToNum(ip) { const m = String(ip).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/); if (!m) return null; const parts = m.slice(1, 5).map(Number); if (parts.some(x => x > 255)) return null; return { n: ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3], bits: m[5] !== undefined ? +m[5] : 32 }; }
function ipInRange(ip, range) { const a = ipToNum(ip), r = ipToNum(range); if (!a || !r) return null; const mask = r.bits === 0 ? 0 : (~0 << (32 - r.bits)) >>> 0; return ((a.n & mask) >>> 0) === ((r.n & mask) >>> 0); }
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function argErr(name, want) { return new KqlError(`Function '${name}' expected ${want}.`, { code: "SEM0100" }); }
const checkPeriod = (name, p) => { if (!PERIOD[p]) throw new KqlError(`Function '${name}': unknown period '${p}'. Use year, quarter, month, week, day, hour, minute, second or millisecond.`, { code: "SEM0100" }); return p; };
const retNum = (t) => t.some(x => x === "real") ? "real" : "long";
const retFirstNonNull = (t) => t.find(x => x) || "dynamic";

export const FUNCS = {
  /* time */
  now: { min: 0, max: 1, ret: "datetime", fn: (a, t, ctx) => new DT(ctx.now + (a[0] ? toTS(a[0]).ms : 0)) },
  ago: { min: 1, max: 1, ret: "datetime", fn: (a, t, ctx) => { const ts = toTS(a[0]); return N(ts) ? null : new DT(ctx.now - ts.ms); } },
  startofday: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(startOf(d.ms, "day", toLong(a[1]) || 0)); } },
  startofweek: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(startOf(d.ms, "week", toLong(a[1]) || 0)); } },
  startofmonth: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(startOf(d.ms, "month", toLong(a[1]) || 0)); } },
  startofyear: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(startOf(d.ms, "year", toLong(a[1]) || 0)); } },
  endofday: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(endOf(d.ms, "day", toLong(a[1]) || 0)); } },
  endofweek: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(endOf(d.ms, "week", toLong(a[1]) || 0)); } },
  endofmonth: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(endOf(d.ms, "month", toLong(a[1]) || 0)); } },
  endofyear: { min: 1, max: 2, ret: "datetime", fn: a => { const d = toDT(a[0]); return N(d) ? null : new DT(endOf(d.ms, "year", toLong(a[1]) || 0)); } },
  datetime_diff: { min: 3, max: 3, ret: "long", fn: a => { const p = checkPeriod("datetime_diff", str(a[0]).toLowerCase()); const x = toDT(a[1]), y = toDT(a[2]); return N(x) || N(y) ? null : datetimeDiff(p, x.ms, y.ms); } },
  datetime_add: { min: 3, max: 3, ret: "datetime", fn: a => { const p = checkPeriod("datetime_add", str(a[0]).toLowerCase()); const n = toLong(a[1]), d = toDT(a[2]); return N(n) || N(d) ? null : new DT(datetimeAdd(p, n, d.ms)); } },
  datetime_part: { min: 2, max: 2, ret: "long", fn: a => { const p = str(a[0]).toLowerCase(), d = toDT(a[1]); if (N(d)) return null; const x = new Date(d.ms); switch (p) { case "year": return x.getUTCFullYear(); case "quarter": return Math.floor(x.getUTCMonth() / 3) + 1; case "month": return x.getUTCMonth() + 1; case "weekofyear": case "week_of_year": return Math.ceil(((d.ms - Date.UTC(x.getUTCFullYear(), 0, 1)) / DAY + new Date(Date.UTC(x.getUTCFullYear(), 0, 1)).getUTCDay() + 1) / 7); case "day": return x.getUTCDate(); case "dayofyear": return Math.floor((d.ms - Date.UTC(x.getUTCFullYear(), 0, 1)) / DAY) + 1; case "hour": return x.getUTCHours(); case "minute": return x.getUTCMinutes(); case "second": return x.getUTCSeconds(); case "millisecond": return x.getUTCMilliseconds(); default: throw new KqlError(`Function 'datetime_part': unknown part '${p}'.`, { code: "SEM0100" }); } } },
  format_datetime: { min: 2, max: 2, ret: "string", fn: a => { const d = toDT(a[0]); return N(d) ? "" : formatDatetime(d.ms, str(a[1])); } },
  format_timespan: { min: 2, max: 2, ret: "string", fn: a => { const d = toTS(a[0]); return N(d) ? "" : formatTimespan(d.ms, str(a[1])); } },
  dayofweek: { min: 1, max: 1, ret: "timespan", fn: a => { const d = toDT(a[0]); return N(d) ? null : new TS(new Date(d.ms).getUTCDay() * DAY); } },
  dayofmonth: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); return N(d) ? null : new Date(d.ms).getUTCDate(); } },
  dayofyear: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); if (N(d)) return null; const x = new Date(d.ms); return Math.floor((d.ms - Date.UTC(x.getUTCFullYear(), 0, 1)) / DAY) + 1; } },
  hourofday: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); return N(d) ? null : new Date(d.ms).getUTCHours(); } },
  getyear: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); return N(d) ? null : new Date(d.ms).getUTCFullYear(); } },
  getmonth: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); return N(d) ? null : new Date(d.ms).getUTCMonth() + 1; } },
  monthofyear: { min: 1, max: 1, ret: "long", fn: a => { const d = toDT(a[0]); return N(d) ? null : new Date(d.ms).getUTCMonth() + 1; } },
  weekofyear: { min: 1, max: 1, ret: "long", fn: a => FUNCS.datetime_part.fn(["weekofyear", a[0]]) },
  make_datetime: { min: 1, max: 7, ret: "datetime", fn: a => { const v = a.map(toLong); if (v.some(N)) return null; return new DT(Date.UTC(v[0], (v[1] || 1) - 1, v[2] || 1, v[3] || 0, v[4] || 0, v[5] || 0)); } },
  make_timespan: { min: 1, max: 4, ret: "timespan", fn: a => { const v = a.map(toReal); if (v.some(N)) return null; return a.length === 4 ? new TS(v[0] * DAY + v[1] * 3600000 + v[2] * 60000 + v[3] * 1000) : new TS((v[0] || 0) * 3600000 + (v[1] || 0) * 60000 + (v[2] || 0) * 1000); } },
  unixtime_seconds_todatetime: { min: 1, max: 1, ret: "datetime", fn: a => { const n = toReal(a[0]); return N(n) ? null : new DT(n * 1000); } },
  unixtime_milliseconds_todatetime: { min: 1, max: 1, ret: "datetime", fn: a => { const n = toReal(a[0]); return N(n) ? null : new DT(n); } },
  totimespan: { min: 1, max: 1, ret: "timespan", fn: a => toTS(a[0]) },
  todatetime: { min: 1, max: 1, ret: "datetime", fn: a => toDT(a[0]) },
  bin: { min: 2, max: 2, ret: t => t[0] === "datetime" || t[0] === "timespan" ? t[0] : retNum(t), fn: (a, t) => binValue(a[0], a[1]) },
  floor: { min: 2, max: 2, ret: t => t[0] === "datetime" || t[0] === "timespan" ? t[0] : retNum(t), fn: a => binValue(a[0], a[1]) },
  bin_at: { min: 3, max: 3, ret: t => t[0], fn: a => { const x = a[0], size = a[1], fixed = a[2]; if (N(x) || N(size) || N(fixed)) return null; const xs = num(x), ss = isTS(size) ? size.ms : num(size), fs = num(fixed); const r = fs + Math.floor((xs - fs) / ss) * ss; return isDT(x) ? new DT(r) : isTS(x) ? new TS(r) : r; } },

  /* strings */
  strlen: { min: 1, max: 1, ret: "long", fn: a => N(a[0]) ? 0 : [...str(a[0])].length },
  tolower: { min: 1, max: 1, ret: "string", fn: a => str(a[0]).toLowerCase() },
  toupper: { min: 1, max: 1, ret: "string", fn: a => str(a[0]).toUpperCase() },
  tostring: { min: 1, max: 1, ret: "string", fn: a => toStr(a[0]) },
  strcat: { min: 1, max: 64, ret: "string", fn: a => a.map(str).join("") },
  strcat_delim: { min: 2, max: 64, ret: "string", fn: a => a.slice(1).map(str).join(str(a[0])) },
  substring: { min: 2, max: 3, ret: "string", fn: a => { const s = str(a[0]); const st = Math.max(0, toLong(a[1]) || 0); return a.length > 2 ? s.substr(st, Math.max(0, toLong(a[2]) || 0)) : s.slice(st); } },
  split: { min: 2, max: 3, ret: t => t.length > 2 ? "string" : "dynamic", fn: a => { const parts = str(a[0]).split(str(a[1])); if (a.length > 2) { const i = toLong(a[2]); return i === null ? null : (i < 0 ? parts[parts.length + i] : parts[i]) ?? null; } return parts; } },
  indexof: { min: 2, max: 5, ret: "long", fn: a => { const s = str(a[0]), n = str(a[1]); const start = toLong(a[2]) || 0; const i = s.indexOf(n, start < 0 ? Math.max(0, s.length + start) : start); return i; } },
  countof: { min: 2, max: 3, ret: "long", fn: a => { const s = str(a[0]), n = str(a[1]); if (str(a[2]) === "regex") return (s.match(regexOf(n, "g")) || []).length; if (!n) return 0; let c = 0, i = 0; while ((i = s.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; } },
  extract: { min: 3, max: 4, ret: t => t.length > 3 ? null : "string", fn: a => { const m = regexOf(str(a[0])).exec(str(a[2])); if (!m) return null; const g = toLong(a[1]) || 0; const v = m[g]; if (v === undefined) return null; return a.length > 3 ? castTo(v, a[3]) : v; }, typeArg: 3 },
  extract_all: { min: 2, max: 3, ret: "dynamic", fn: a => { const re = regexOf(str(a[0]), "g"); const s = str(a[a.length - 1]); const out = []; let m; while ((m = re.exec(s))) { out.push(m.length > 2 ? m.slice(1) : m[1] ?? m[0]); if (!m[0]) re.lastIndex++; } return out; } },
  replace_string: { min: 3, max: 3, ret: "string", fn: a => str(a[0]).split(str(a[1])).join(str(a[2])) },
  replace_regex: { min: 3, max: 3, ret: "string", fn: a => str(a[0]).replace(regexOf(str(a[1]), "g"), str(a[2]).replace(/\\(\d)/g, "$$$1")) },
  replace: { min: 3, max: 3, ret: "string", fn: a => str(a[2]).replace(regexOf(str(a[0]), "g"), str(a[1]).replace(/\\(\d)/g, "$$$1")) },
  trim: { min: 2, max: 2, ret: "string", fn: a => { const re = str(a[0]); return str(a[1]).replace(regexOf(`^(?:${re})+`), "").replace(regexOf(`(?:${re})+$`), ""); } },
  trim_start: { min: 2, max: 2, ret: "string", fn: a => str(a[1]).replace(regexOf(`^(?:${str(a[0])})+`), "") },
  trim_end: { min: 2, max: 2, ret: "string", fn: a => str(a[1]).replace(regexOf(`(?:${str(a[0])})+$`), "") },
  reverse: { min: 1, max: 1, ret: "string", fn: a => [...str(a[0])].reverse().join("") },
  strcmp: { min: 2, max: 2, ret: "long", fn: a => { const x = str(a[0]), y = str(a[1]); return x < y ? -1 : x > y ? 1 : 0; } },
  isempty: { min: 1, max: 1, ret: "bool", fn: a => N(a[0]) || a[0] === "" },
  isnotempty: { min: 1, max: 1, ret: "bool", fn: a => !(N(a[0]) || a[0] === "") },
  isnull: { min: 1, max: 1, ret: "bool", fn: a => N(a[0]) },
  isnotnull: { min: 1, max: 1, ret: "bool", fn: a => !N(a[0]) },
  base64_encode_tostring: { min: 1, max: 1, ret: "string", fn: a => { try { return btoa(unescape(encodeURIComponent(str(a[0])))); } catch (e) { return null; } } },
  base64_decode_tostring: { min: 1, max: 1, ret: "string", fn: a => { try { return decodeURIComponent(escape(atob(str(a[0])))); } catch (e) { return null; } } },
  url_decode: { min: 1, max: 1, ret: "string", fn: a => { try { return decodeURIComponent(str(a[0])); } catch (e) { return str(a[0]); } } },
  url_encode: { min: 1, max: 1, ret: "string", fn: a => encodeURIComponent(str(a[0])) },
  hash: { min: 1, max: 2, ret: "long", fn: a => { const h = fnv(hashKey(a[0])); const m = toLong(a[1]); return m ? h % m : h; } },
  hash_sha256: { min: 1, max: 1, ret: "string", fn: a => fnv(str(a[0])).toString(16).padStart(8, "0").repeat(8) },
  parse_json: { min: 1, max: 1, ret: "dynamic", fn: a => toJSONish(a[0]) },
  todynamic: { min: 1, max: 1, ret: "dynamic", fn: a => toJSONish(a[0]) },
  parse_url: { min: 1, max: 1, ret: "dynamic", fn: a => { try { const u = new URL(str(a[0])); const q = {}; u.searchParams.forEach((v, k) => q[k] = v); return { Scheme: u.protocol.replace(":", ""), Host: u.hostname, Port: u.port, Path: u.pathname, Username: u.username, Password: u.password, "Query Parameters": q, Fragment: u.hash.replace("#", "") }; } catch (e) { return null; } } },
  parse_ipv4: { min: 1, max: 1, ret: "long", fn: a => { const r = ipToNum(a[0]); return r ? r.n : null; } },
  ipv4_is_private: { min: 1, max: 1, ret: "bool", fn: a => { const r = ipToNum(a[0]); if (!r) return null; return ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"].some(rg => ipInRange(str(a[0]).split("/")[0], rg)); } },
  ipv4_is_in_range: { min: 2, max: 2, ret: "bool", fn: a => ipInRange(a[0], a[1]) },
  ipv4_is_in_any_range: { min: 2, max: 64, ret: "bool", fn: a => { const list = a.slice(1).flatMap(x => Array.isArray(x) ? x : [x]); const r = list.map(rg => ipInRange(a[0], rg)); return r.some(x => x === true) ? true : r.every(x => x === null) ? null : false; } },
  ipv4_is_match: { min: 2, max: 3, ret: "bool", fn: a => ipInRange(a[0], a.length > 2 ? str(a[1]).split("/")[0] + "/" + toLong(a[2]) : a[1]) },
  ipv4_compare: { min: 2, max: 2, ret: "long", fn: a => { const x = ipToNum(a[0]), y = ipToNum(a[1]); if (!x || !y) return null; return x.n < y.n ? -1 : x.n > y.n ? 1 : 0; } },
  geo_info_from_ip_address: { min: 1, max: 1, ret: "dynamic", fn: a => { const r = ipToNum(a[0]); if (!r) return null; const priv = FUNCS.ipv4_is_private.fn(a); return priv ? null : { country: ["United States", "Germany", "Brazil", "Nigeria", "Russia"][r.n % 5], state: "", city: "", latitude: 0, longitude: 0 }; } },

  /* conversion */
  toint: { min: 1, max: 1, ret: "int", fn: a => toLong(a[0]) },
  tolong: { min: 1, max: 1, ret: "long", fn: a => toLong(a[0]) },
  toreal: { min: 1, max: 1, ret: "real", fn: a => toReal(a[0]) },
  todouble: { min: 1, max: 1, ret: "real", fn: a => toReal(a[0]) },
  todecimal: { min: 1, max: 1, ret: "real", fn: a => toReal(a[0]) },
  tobool: { min: 1, max: 1, ret: "bool", fn: a => toBool(a[0]) },
  toboolean: { min: 1, max: 1, ret: "bool", fn: a => toBool(a[0]) },
  toguid: { min: 1, max: 1, ret: "guid", fn: a => N(a[0]) ? null : str(a[0]) },
  gettype: { min: 1, max: 1, ret: "string", fn: a => { const t = typeOfValue(a[0]); return t === null ? "null" : t === "dynamic" ? (Array.isArray(a[0]) ? "array" : "dictionary") : t; } },

  /* logic */
  iff: { min: 3, max: 3, ret: t => t[1] || t[2], fn: a => toBool(a[0]) === true ? a[1] : a[2] },
  iif: { min: 3, max: 3, ret: t => t[1] || t[2], fn: a => toBool(a[0]) === true ? a[1] : a[2] },
  case: { min: 3, max: 128, ret: t => t[1], fn: a => { if (a.length % 2 === 0) throw argErr("case", "an odd number of arguments: predicate, value, …, default"); for (let i = 0; i + 1 < a.length; i += 2) if (toBool(a[i]) === true) return a[i + 1]; return a[a.length - 1]; } },
  coalesce: { min: 1, max: 64, ret: retFirstNonNull, fn: a => a.find(v => !N(v) && v !== "") ?? null },
  not: { min: 1, max: 1, ret: "bool", fn: a => { const b = toBool(a[0]); return N(b) ? null : !b; } },
  column_ifexists: { min: 2, max: 2, ret: t => t[1], fn: a => a[0], special: "column_ifexists" },

  /* math */
  abs: { min: 1, max: 1, ret: t => t[0] === "timespan" ? "timespan" : retNum(t), fn: a => N(a[0]) ? null : isTS(a[0]) ? new TS(Math.abs(a[0].ms)) : Math.abs(num(a[0])) },
  round: { min: 1, max: 2, ret: "real", fn: a => { const x = num(a[0]); if (N(x)) return null; const d = toLong(a[1]) || 0; const f = 10 ** d; return Math.round(x * f) / f; } },
  ceiling: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.ceil(num(a[0])) },
  exp: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.exp(num(a[0])) },
  log: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.log(num(a[0])) },
  log10: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.log10(num(a[0])) },
  log2: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.log2(num(a[0])) },
  sqrt: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.sqrt(num(a[0])) },
  pow: { min: 2, max: 2, ret: "real", fn: a => N(a[0]) || N(a[1]) ? null : Math.pow(num(a[0]), num(a[1])) },
  min_of: { min: 2, max: 64, ret: t => t[0], fn: a => { const v = a.filter(x => !N(x)); if (!v.length) return null; return v.reduce((m, x) => cmp(x, m) < 0 ? x : m); } },
  max_of: { min: 2, max: 64, ret: t => t[0], fn: a => { const v = a.filter(x => !N(x)); if (!v.length) return null; return v.reduce((m, x) => cmp(x, m) > 0 ? x : m); } },
  rand: { min: 0, max: 1, ret: "real", fn: (a, t, ctx) => { ctx.seed = (ctx.seed * 1103515245 + 12345) % 2147483648; const r = ctx.seed / 2147483648; return a.length ? Math.floor(r * toLong(a[0])) : r; } },
  sign: { min: 1, max: 1, ret: "real", fn: a => N(a[0]) ? null : Math.sign(num(a[0])) },
  isnan: { min: 1, max: 1, ret: "bool", fn: a => Number.isNaN(a[0]) },
  isfinite: { min: 1, max: 1, ret: "bool", fn: a => Number.isFinite(a[0]) },

  /* dynamic */
  array_length: { min: 1, max: 1, ret: "long", fn: a => Array.isArray(a[0]) ? a[0].length : null },
  pack_array: { min: 1, max: 64, ret: "dynamic", fn: a => a.slice() },
  pack: { min: 2, max: 128, ret: "dynamic", fn: a => { const o = {}; for (let i = 0; i + 1 < a.length; i += 2) o[str(a[i])] = a[i + 1]; return o; } },
  bag_pack: { min: 2, max: 128, ret: "dynamic", fn: a => FUNCS.pack.fn(a) },
  pack_all: { min: 0, max: 0, ret: "dynamic", fn: (a, t, ctx) => ctx.rowBag ? ctx.rowBag() : {} },
  bag_keys: { min: 1, max: 1, ret: "dynamic", fn: a => isDyn(a[0]) && !Array.isArray(a[0]) ? Object.keys(a[0]) : null },
  bag_has_key: { min: 2, max: 2, ret: "bool", fn: a => isDyn(a[0]) && !Array.isArray(a[0]) ? Object.prototype.hasOwnProperty.call(a[0], str(a[1])) : false },
  bag_remove_keys: { min: 2, max: 2, ret: "dynamic", fn: a => { if (!isDyn(a[0])) return a[0]; const o = { ...a[0] }; (Array.isArray(a[1]) ? a[1] : [a[1]]).forEach(k => delete o[str(k)]); return o; } },
  bag_merge: { min: 2, max: 64, ret: "dynamic", fn: a => Object.assign({}, ...a.filter(isDyn)) },
  set_has_element: { min: 2, max: 2, ret: "bool", fn: a => Array.isArray(a[0]) && a[0].some(x => eq(x, a[1]) || (isNum(x) && isStr(a[1]) && String(x) === a[1]) || (isStr(x) && isNum(a[1]) && x === String(a[1]))) },
  array_index_of: { min: 2, max: 2, ret: "long", fn: a => Array.isArray(a[0]) ? a[0].findIndex(x => eq(x, a[1])) : -1 },
  array_concat: { min: 1, max: 64, ret: "dynamic", fn: a => a.flatMap(x => Array.isArray(x) ? x : N(x) ? [] : [x]) },
  array_slice: { min: 3, max: 3, ret: "dynamic", fn: a => Array.isArray(a[0]) ? a[0].slice(toLong(a[1]), toLong(a[2]) + 1) : null },
  array_sort_asc: { min: 1, max: 1, ret: "dynamic", fn: a => Array.isArray(a[0]) ? a[0].slice().sort(cmp) : null },
  array_sort_desc: { min: 1, max: 1, ret: "dynamic", fn: a => Array.isArray(a[0]) ? a[0].slice().sort((x, y) => cmp(y, x)) : null },
  array_reverse: { min: 1, max: 1, ret: "dynamic", fn: a => Array.isArray(a[0]) ? a[0].slice().reverse() : null },
  set_union: { min: 2, max: 64, ret: "dynamic", fn: a => { const seen = new Set(), out = []; a.flat().forEach(x => { const k = hashKey(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }); return out; } },
  set_intersect: { min: 2, max: 64, ret: "dynamic", fn: a => a.slice(1).reduce((acc, arr) => acc.filter(x => Array.isArray(arr) && arr.some(y => eq(x, y))), Array.isArray(a[0]) ? a[0] : []) },
  set_difference: { min: 2, max: 64, ret: "dynamic", fn: a => (Array.isArray(a[0]) ? a[0] : []).filter(x => !a.slice(1).some(arr => Array.isArray(arr) && arr.some(y => eq(x, y)))) },
  range: { min: 2, max: 3, ret: "dynamic", fn: a => { const s = num(a[0]), e = num(a[1]), st = a.length > 2 ? num(a[2]) : 1; const out = []; for (let x = s; st > 0 ? x <= e : x >= e; x += st) { out.push(x); if (out.length > 100000) break; } return out; } },
  repeat: { min: 2, max: 2, ret: "dynamic", fn: a => Array(Math.max(0, toLong(a[1]) || 0)).fill(a[0]) },
  zip: { min: 2, max: 16, ret: "dynamic", fn: a => { const n = Math.max(...a.map(x => Array.isArray(x) ? x.length : 0)); return Array.from({ length: n }, (_, i) => a.map(x => Array.isArray(x) ? x[i] ?? null : null)); } },
  treepath: { min: 1, max: 1, ret: "dynamic", fn: a => { const out = []; const walk = (v, pre) => { if (isDyn(v) && !Array.isArray(v)) for (const k in v) { out.push(pre + "['" + k + "']"); walk(v[k], pre + "['" + k + "']"); } else if (Array.isArray(v)) { out.push(pre + "[0]"); walk(v[0], pre + "[0]"); } }; walk(a[0], ""); return out; } },
  /* misc */
  current_cluster_endpoint: { min: 0, max: 0, ret: "string", fn: () => "https://ade.loganalytics.io/subscriptions/lab/resourcegroups/rg-lab/providers/microsoft.operationalinsights/workspaces/cg-lab" },
  current_principal: { min: 0, max: 0, ret: "string", fn: () => "aaduser=gabe@tailspintoys.example" },
  ingestion_time: { min: 0, max: 0, ret: "datetime", fn: (a, t, ctx) => ctx.ingestionTime ? ctx.ingestionTime() : new DT(ctx.now) },
  new_guid: { min: 0, max: 0, ret: "guid", fn: (a, t, ctx) => { ctx.seed = (ctx.seed * 1103515245 + 12345) % 2147483648; return ("00000000" + ctx.seed.toString(16)).slice(-8) + "-0000-4000-8000-000000000000"; } },
  row_number: { min: 0, max: 2, ret: "long", fn: (a, t, ctx) => ctx.rowIndex + (a.length ? toLong(a[0]) : 1) },
  strrep: { min: 2, max: 3, ret: "string", fn: a => Array(Math.max(0, toLong(a[1]) || 0)).fill(str(a[0])).join(a.length > 2 ? str(a[2]) : "") },
  translate: { min: 3, max: 3, ret: "string", fn: a => { const from = str(a[0]), to = str(a[1]); return [...str(a[2])].map(ch => { const i = from.indexOf(ch); return i < 0 ? ch : (to[i] ?? to[to.length - 1] ?? ""); }).join(""); } },
};
/* aliases */
FUNCS.strlen_cs = FUNCS.strlen; FUNCS.todatetime_utc = FUNCS.todatetime; FUNCS.array_strcat = { min: 2, max: 2, ret: "string", fn: a => Array.isArray(a[0]) ? a[0].map(str).join(str(a[1])) : "" };

export function binValue(x, size) {
  if (N(x) || N(size)) return null;
  if (isDT(x)) { const s = isTS(size) ? size.ms : num(size) * DAY; if (!s) return null; return new DT(Math.floor(x.ms / s) * s); }
  if (isTS(x)) { const s = isTS(size) ? size.ms : num(size) * DAY; if (!s) return null; return new TS(Math.floor(x.ms / s) * s); }
  const s = num(size); const xv = num(x); if (!s || N(xv)) return null;
  const r = Math.floor(xv / s) * s; return Number.isInteger(s) && Number.isInteger(xv) ? r : +r.toPrecision(12);
}

/* ---------- aggregations ---------- */
const colName = (a) => a && a.k === "col" ? a.name : null;
const sumType = t => t[0] === "timespan" ? "timespan" : t[0] === "real" ? "real" : "long";
const first = (acc, v) => acc === undefined ? v : acc;
export const AGGS = {
  count: { min: 0, max: 0, ret: () => "long", name: () => "count_", init: () => 0, step: acc => acc + 1, done: acc => acc },
  countif: { min: 1, max: 1, ret: () => "long", name: () => "countif_", init: () => 0, step: (acc, a) => acc + (toBool(a[0]) === true ? 1 : 0), done: acc => acc },
  dcount: { min: 1, max: 2, ret: () => "long", name: (a) => "dcount_" + (colName(a[0]) || ""), init: () => new Set(), step: (acc, a) => { if (!N(a[0])) acc.add(hashKey(a[0])); return acc; }, done: acc => acc.size },
  dcountif: { min: 2, max: 3, ret: () => "long", name: (a) => "dcountif_" + (colName(a[0]) || ""), init: () => new Set(), step: (acc, a) => { if (!N(a[0]) && toBool(a[1]) === true) acc.add(hashKey(a[0])); return acc; }, done: acc => acc.size },
  count_distinct: { min: 1, max: 1, ret: () => "long", name: (a) => "count_distinct_" + (colName(a[0]) || ""), init: () => new Set(), step: (acc, a) => { if (!N(a[0])) acc.add(hashKey(a[0])); return acc; }, done: acc => acc.size },
  sum: { min: 1, max: 1, ret: sumType, name: (a) => "sum_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => { const v = a[0]; if (N(v)) return acc; const x = isTS(v) ? v.ms : num(v); return acc === null ? { v: x, ts: isTS(v) } : { v: acc.v + x, ts: acc.ts }; }, done: acc => acc === null ? null : acc.ts ? new TS(acc.v) : acc.v },
  sumif: { min: 2, max: 2, ret: sumType, name: (a) => "sumif_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => toBool(a[1]) === true ? AGGS.sum.step(acc, a) : acc, done: acc => AGGS.sum.done(acc) },
  avg: { min: 1, max: 1, ret: t => t[0] === "timespan" ? "timespan" : "real", name: (a) => "avg_" + (colName(a[0]) || ""), init: () => ({ s: 0, n: 0, ts: false }), step: (acc, a) => { const v = a[0]; if (N(v)) return acc; acc.s += isTS(v) ? v.ms : num(v); acc.n++; acc.ts = isTS(v); return acc; }, done: acc => acc.n ? (acc.ts ? new TS(acc.s / acc.n) : acc.s / acc.n) : null },
  avgif: { min: 2, max: 2, ret: () => "real", name: (a) => "avgif_" + (colName(a[0]) || ""), init: () => ({ s: 0, n: 0 }), step: (acc, a) => toBool(a[1]) === true ? AGGS.avg.step(acc, a) : acc, done: acc => AGGS.avg.done(acc) },
  min: { min: 1, max: 1, ret: t => t[0], name: (a) => "min_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => N(a[0]) ? acc : acc === null || cmp(a[0], acc) < 0 ? a[0] : acc, done: acc => acc },
  max: { min: 1, max: 1, ret: t => t[0], name: (a) => "max_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => N(a[0]) ? acc : acc === null || cmp(a[0], acc) > 0 ? a[0] : acc, done: acc => acc },
  minif: { min: 2, max: 2, ret: t => t[0], name: (a) => "minif_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => toBool(a[1]) === true ? AGGS.min.step(acc, a) : acc, done: acc => acc },
  maxif: { min: 2, max: 2, ret: t => t[0], name: (a) => "maxif_" + (colName(a[0]) || ""), init: () => null, step: (acc, a) => toBool(a[1]) === true ? AGGS.max.step(acc, a) : acc, done: acc => acc },
  make_set: { min: 1, max: 2, ret: () => "dynamic", name: (a) => "set_" + (colName(a[0]) || ""), init: () => ({ seen: new Set(), out: [] }), step: (acc, a, n) => { const v = a[0]; if (N(v)) return acc; const k = hashKey(v); if (!acc.seen.has(k) && acc.out.length < (N(a[1]) ? 1048576 : toLong(a[1]))) { acc.seen.add(k); acc.out.push(v); } return acc; }, done: acc => acc.out },
  make_set_if: { min: 2, max: 3, ret: () => "dynamic", name: (a) => "set_" + (colName(a[0]) || ""), init: () => ({ seen: new Set(), out: [] }), step: (acc, a) => toBool(a[1]) === true ? AGGS.make_set.step(acc, [a[0], a[2]]) : acc, done: acc => acc.out },
  make_list: { min: 1, max: 2, ret: () => "dynamic", name: (a) => "list_" + (colName(a[0]) || ""), init: () => [], step: (acc, a) => { if (!N(a[0]) && acc.length < (N(a[1]) ? 1048576 : toLong(a[1]))) acc.push(a[0]); return acc; }, done: acc => acc },
  make_list_if: { min: 2, max: 3, ret: () => "dynamic", name: (a) => "list_" + (colName(a[0]) || ""), init: () => [], step: (acc, a) => toBool(a[1]) === true ? AGGS.make_list.step(acc, [a[0], a[2]]) : acc, done: acc => acc },
  make_bag: { min: 1, max: 2, ret: () => "dynamic", name: () => "bag_", init: () => ({}), step: (acc, a) => { if (isDyn(a[0]) && !Array.isArray(a[0])) Object.assign(acc, a[0]); return acc; }, done: acc => acc },
  make_list_with_nulls: { min: 1, max: 1, ret: () => "dynamic", name: (a) => "list_" + (colName(a[0]) || ""), init: () => [], step: (acc, a) => { acc.push(N(a[0]) ? null : a[0]); return acc; }, done: acc => acc },
  percentile: { min: 2, max: 2, ret: t => t[0] === "timespan" || t[0] === "datetime" ? t[0] : "real", name: (a, vals) => `percentile_${colName(a[0]) || ""}_${vals[1]}`, init: () => [], step: (acc, a) => { if (!N(a[0])) acc.push(a[0]); return acc; }, done: (acc, a) => { if (!acc.length) return null; acc.sort(cmp); const p = toReal(a[1]) / 100; const idx = Math.min(acc.length - 1, Math.max(0, Math.ceil(p * acc.length) - 1)); return acc[idx]; } },
  stdev: { min: 1, max: 1, ret: () => "real", name: (a) => "stdev_" + (colName(a[0]) || ""), init: () => [], step: (acc, a) => { if (!N(a[0])) acc.push(num(a[0])); return acc; }, done: acc => { if (acc.length < 2) return null; const m = acc.reduce((s, x) => s + x, 0) / acc.length; return Math.sqrt(acc.reduce((s, x) => s + (x - m) ** 2, 0) / (acc.length - 1)); } },
  variance: { min: 1, max: 1, ret: () => "real", name: (a) => "variance_" + (colName(a[0]) || ""), init: () => [], step: (acc, a) => { if (!N(a[0])) acc.push(num(a[0])); return acc; }, done: acc => { if (acc.length < 2) return null; const m = acc.reduce((s, x) => s + x, 0) / acc.length; return acc.reduce((s, x) => s + (x - m) ** 2, 0) / (acc.length - 1); } },
  /* arg_max / arg_min / any / take_any are "row aggregates": they return several columns — handled specially in the interpreter */
  arg_max: { row: true, min: 1, max: 64, pick: (best, cand) => best === undefined || (!N(cand) && (N(best) || cmp(cand, best) > 0)) },
  arg_min: { row: true, min: 1, max: 64, pick: (best, cand) => best === undefined || (!N(cand) && (N(best) || cmp(cand, best) < 0)) },
  any: { row: true, min: 1, max: 64, pick: (best) => best === undefined },
  take_any: { row: true, min: 1, max: 64, pick: (best) => best === undefined },
  take_anyif: { row: true, min: 2, max: 2, pick: (best) => best === undefined },
};
AGGS.countif.alias = true;

/* closest known name within edit distance 2 (for "Did you mean" hints) */
export function nearestName(name, names) {
  const l = name.toLowerCase(); let best = null, bestD = 3;
  const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
  for (const c of names) { const dd = c.toLowerCase() === l ? 0 : lev(l, c.toLowerCase()); if (dd < bestD) { bestD = dd; best = c; } }
  return best;
}
