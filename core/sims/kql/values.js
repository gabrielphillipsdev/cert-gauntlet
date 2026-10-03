/* Cert Gauntlet — KQL value model. No dependencies.
   Scalars: string · long/int/real (JS number; the TYPE lives in the column schema, not the value) · bool · datetime (DT) ·
   timespan (TS) · dynamic (plain JSON value: array / object / primitive) · null.
   Everything the interpreter needs to compare, hash, format and coerce values lives here. */

export class DT { constructor(ms) { this.ms = ms; } valueOf() { return this.ms; } toString() { return fmtDT(this.ms); } toJSON() { return fmtDT(this.ms); } }
export class TS { constructor(ms) { this.ms = ms; } valueOf() { return this.ms; } toString() { return fmtTS(this.ms); } toJSON() { return fmtTS(this.ms); } }

export const isDT = v => v instanceof DT, isTS = v => v instanceof TS;
export const isNum = v => typeof v === "number", isStr = v => typeof v === "string", isBool = v => typeof v === "boolean";
export const isDyn = v => v !== null && typeof v === "object" && !isDT(v) && !isTS(v);
export const isNullish = v => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

/* The runtime type name of a value (schema types are the source of truth for columns; this is the fallback). */
export function typeOfValue(v) {
  if (isNullish(v)) return null;
  if (isStr(v)) return "string";
  if (isBool(v)) return "bool";
  if (isNum(v)) return Number.isInteger(v) ? "long" : "real";
  if (isDT(v)) return "datetime";
  if (isTS(v)) return "timespan";
  return "dynamic";
}
export const NUMERIC = new Set(["long", "int", "real", "decimal"]);
export const isNumericType = t => NUMERIC.has(t);

/* ---------- formatting (what the result grid shows) ---------- */
function pad(n, w = 2) { return String(n).padStart(w, "0"); }
export function fmtDT(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const frac = ms % 1000; const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return frac ? `${base}.${pad(Math.round(frac), 3)}Z` : `${base}Z`;
}
export function fmtTS(ms) {
  if (!Number.isFinite(ms)) return "";
  const neg = ms < 0; ms = Math.abs(ms);
  const days = Math.floor(ms / 86400000); ms -= days * 86400000;
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const s = Math.floor(ms / 1000); ms -= s * 1000;
  let out = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (ms) out += "." + String(Math.round(ms * 10000)).padStart(7, "0").replace(/0+$/, "");
  if (days) out = days + "." + out;
  return (neg ? "-" : "") + out;
}
export function fmtValue(v, type) {
  if (isNullish(v)) return "";
  if (isStr(v)) return v;
  if (isBool(v)) return v ? "true" : "false";
  if (isNum(v)) { if (type === "real" && Number.isInteger(v) && Math.abs(v) < 1e15) return String(v); return Number.isInteger(v) ? String(v) : String(+v.toPrecision(15)); }
  if (isDT(v)) return fmtDT(v.ms);
  if (isTS(v)) return fmtTS(v.ms);
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

/* ---------- equality / ordering / hashing ---------- */
export function eq(a, b) {
  if (isNullish(a) || isNullish(b)) return false;
  if (isDT(a) && isDT(b)) return a.ms === b.ms;
  if (isTS(a) && isTS(b)) return a.ms === b.ms;
  if (isDyn(a) || isDyn(b)) return hashKey(a) === hashKey(b);
  return a === b;
}
/* Sort comparator: numbers/strings/bool natural, datetime/timespan by ms. Nulls handled by the caller. */
export function cmp(a, b) {
  if (isDT(a) || isTS(a)) a = a.ms; if (isDT(b) || isTS(b)) b = b.ms;
  if (isDyn(a)) a = JSON.stringify(a); if (isDyn(b)) b = JSON.stringify(b);
  if (isStr(a) && isStr(b)) return a < b ? -1 : a > b ? 1 : 0;
  if (isBool(a)) a = a ? 1 : 0; if (isBool(b)) b = b ? 1 : 0;
  return a < b ? -1 : a > b ? 1 : 0;
}
/* Stable string key for grouping (summarize by, distinct, dcount, result-set comparison). */
export function hashKey(v) {
  if (isNullish(v)) return "\u0000null";
  if (isStr(v)) return "s" + v;
  if (isBool(v)) return v ? "b1" : "b0";
  if (isNum(v)) return "n" + (Number.isInteger(v) ? v : +v.toPrecision(12));
  if (isDT(v)) return "d" + v.ms;
  if (isTS(v)) return "t" + v.ms;
  return "j" + canonJSON(v);
}
export function canonJSON(v) {
  if (Array.isArray(v)) return "[" + v.map(canonJSON).join(",") + "]";
  if (v && typeof v === "object" && !isDT(v) && !isTS(v)) return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonJSON(v[k])).join(",") + "}";
  if (isDT(v) || isTS(v)) return JSON.stringify(v.toString());
  return JSON.stringify(v);
}
export function rowKey(row) { return row.map(hashKey).join("\u0001"); }

/* ---------- coercion (tostring / tolong / todatetime …) ---------- */
export function toStr(v) {
  if (isNullish(v)) return "";
  if (isStr(v)) return v;
  if (isDyn(v)) return JSON.stringify(v);
  return fmtValue(v);
}
export function toLong(v) {
  if (isNullish(v)) return null;
  if (isNum(v)) return Math.trunc(v);
  if (isBool(v)) return v ? 1 : 0;
  if (isStr(v)) { const t = v.trim(); if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null; return Math.trunc(+t); }
  if (isDT(v) || isTS(v)) return Math.trunc(v.ms);
  return null;
}
export function toReal(v) {
  if (isNullish(v)) return null;
  if (isNum(v)) return v;
  if (isBool(v)) return v ? 1 : 0;
  if (isStr(v)) { const t = v.trim(); if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null; return +t; }
  if (isDT(v) || isTS(v)) return v.ms;
  return null;
}
export function toBool(v) {
  if (isNullish(v)) return null;
  if (isBool(v)) return v;
  if (isNum(v)) return v !== 0;
  if (isStr(v)) { const t = v.trim().toLowerCase(); if (t === "true" || t === "1") return true; if (t === "false" || t === "0") return false; return null; }
  return null;
}
export function toDT(v) {
  if (isNullish(v)) return null;
  if (isDT(v)) return v;
  if (isNum(v)) return new DT(v);
  if (isStr(v)) return parseDT(v);
  return null;
}
export function toTS(v) {
  if (isNullish(v)) return null;
  if (isTS(v)) return v;
  if (isNum(v)) return new TS(v * 86400000); /* a bare number is days, like Kusto totimespan(real) */
  if (isStr(v)) return parseTS(v);
  return null;
}
/* datetime literal / string forms: 2026-10-01, 2026-10-01 10:00, 2026-10-01T10:00:00Z, 2026-10-01T10:00:00.123Z, 10/01/2026 */
export function parseDT(s) {
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  if (m) {
    let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    if (m[7]) ms += Math.round(+("0." + m[7]) * 1000);
    if (m[8] && m[8].toUpperCase() !== "Z") { const z = m[8].replace(":", ""); const sign = z[0] === "-" ? -1 : 1; ms -= sign * (+z.slice(1, 3) * 60 + +z.slice(3, 5)) * 60000; }
    return new DT(ms);
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return new DT(Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  const t = Date.parse(s); return Number.isNaN(t) ? null : new DT(t);
}
/* timespan literal / string forms: 1d, 2h, 30m, 10s, 500ms, 1.02:03:04, 02:03:04, 02:03, 1.5h */
export function parseTS(s) {
  s = String(s).trim();
  let m = s.match(/^([+-]?\d+(?:\.\d+)?)\s*(d|day|days|h|hr|hour|hours|m|min|minute|minutes|s|sec|second|seconds|ms|millisecond|milliseconds|tick|ticks|microsecond|microseconds)$/i);
  if (m) return new TS(+m[1] * UNIT_MS[m[2].toLowerCase()]);
  m = s.match(/^(-)?(?:(\d+)\.)?(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/);
  if (m) {
    let ms = (+(m[2] || 0)) * 86400000 + (+m[3]) * 3600000 + (+m[4]) * 60000 + (+(m[5] || 0)) * 1000;
    if (m[6]) ms += +("0." + m[6]) * 1000;
    return new TS(m[1] ? -ms : ms);
  }
  return null;
}
export const UNIT_MS = {
  d: 86400000, day: 86400000, days: 86400000, h: 3600000, hr: 3600000, hour: 3600000, hours: 3600000,
  m: 60000, min: 60000, minute: 60000, minutes: 60000, s: 1000, sec: 1000, second: 1000, seconds: 1000,
  ms: 1, millisecond: 1, milliseconds: 1, tick: 0.0001, ticks: 0.0001, microsecond: 0.001, microseconds: 0.001,
};
export function castTo(v, type) {
  switch (type) {
    case "string": return toStr(v);
    case "long": case "int": return toLong(v);
    case "real": case "double": case "decimal": return toReal(v);
    case "bool": case "boolean": return toBool(v);
    case "datetime": case "date": return toDT(v);
    case "timespan": case "time": return toTS(v);
    case "dynamic": return isStr(v) ? safeJSON(v) : v;
    case "guid": return isNullish(v) ? null : toStr(v);
    default: return v;
  }
}
export function safeJSON(s) { try { return JSON.parse(s); } catch (e) { return s; } }
export const NORMAL_TYPE = { int: "int", long: "long", real: "real", double: "real", decimal: "real", string: "string", bool: "bool", boolean: "bool", datetime: "datetime", date: "datetime", timespan: "timespan", time: "timespan", dynamic: "dynamic", guid: "guid" };
