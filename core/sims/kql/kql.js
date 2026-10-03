/* Cert Gauntlet — KQL interpreter public API (no dependencies).
     import { runKql, sameResult, KqlError, formatError } from "./kql.js";
     const res = runKql("SigninLogs | where ResultType != 0 | summarize count() by UserPrincipalName", db);
     // res = { cols:[{name,type}], rows:[[…]], warnings:[…] }     db = { tables:{Name:{cols,rows}}, now: ms }
   Errors throw KqlError with .message shaped like the Log Analytics editor, plus .line/.col/.code. */
import { parse } from "./parser.js";
import { execute } from "./interp.js";
import { KqlError } from "./lexer.js";
import { hashKey, fmtValue, isNullish } from "./values.js";
export { KqlError } from "./lexer.js";
export { fmtValue, DT, TS } from "./values.js";

export function runKql(query, db, opts = {}) {
  if (typeof query !== "string" || !query.trim()) throw new KqlError("The query is empty.", { code: "SYN0002", line: 1, col: 1 });
  const ast = parse(query, { knownTables: Object.keys(db.tables || {}) });
  const t = execute(ast, db);
  if (opts.maxRows && t.rows.length > opts.maxRows) { t.truncated = t.rows.length; t.rows = t.rows.slice(0, opts.maxRows); }
  return t;
}

/* One-line + detail form for the result pane. */
export function formatError(e) {
  if (!(e instanceof KqlError)) return { head: "Query failed", detail: String(e && e.message || e), code: "ERR" };
  const [head, ...rest] = e.message.split("\n");
  return { head, detail: rest.join("\n"), code: e.code, line: e.line, col: e.col };
}

/* Result-set equality used to grade "write it" drills: any query producing the same data passes.
   Column NAMES are ignored by default (summarize Total=count() vs count_ are both right); column ORDER is ignored
   (columns are matched by their value vectors); row order matters only when `ordered` is true. */
export function sameResult(a, b, { ordered = false, names = false } = {}) {
  if (!a || !b) return { ok: false, why: "no result" };
  if (a.cols.length !== b.cols.length) return { ok: false, why: `expected ${b.cols.length} column${b.cols.length === 1 ? "" : "s"}, got ${a.cols.length}` };
  if (a.rows.length !== b.rows.length) return { ok: false, why: `expected ${b.rows.length} row${b.rows.length === 1 ? "" : "s"}, got ${a.rows.length}` };
  if (names) { const an = a.cols.map(c => c.name).sort().join("|"), bn = b.cols.map(c => c.name).sort().join("|"); if (an !== bn) return { ok: false, why: `column names differ: ${a.cols.map(c => c.name).join(", ")} vs ${b.cols.map(c => c.name).join(", ")}` }; }
  const n = a.cols.length;
  /* column vectors, as multisets (unordered) or sequences (ordered) */
  const vec = (t, i) => { const v = t.rows.map(r => hashKey(r[i])); return ordered ? v.join("\u0002") : v.slice().sort().join("\u0002"); };
  const av = a.cols.map((c, i) => vec(a, i)), bv = b.cols.map((c, i) => vec(b, i));
  const map = new Array(n).fill(-1); const used = new Set();
  /* prefer same-name matches, then any unused column with the same vector */
  for (let i = 0; i < n; i++) { const j = b.cols.findIndex((c, j) => !used.has(j) && c.name === a.cols[i].name && bv[j] === av[i]); if (j >= 0) { map[i] = j; used.add(j); } }
  for (let i = 0; i < n; i++) { if (map[i] >= 0) continue; const j = bv.findIndex((v, j) => !used.has(j) && v === av[i]); if (j < 0) return { ok: false, why: `column '${a.cols[i].name}' doesn't match any expected column` }; map[i] = j; used.add(j); }
  /* row-wise check with the column mapping (catches columns that match individually but not jointly) */
  const keyA = a.rows.map(r => map.map((j, i) => [j, hashKey(r[i])]).sort((x, y) => x[0] - y[0]).map(x => x[1]).join("\u0001"));
  const keyB = b.rows.map(r => r.map(hashKey).join("\u0001"));
  if (!ordered) { keyA.sort(); keyB.sort(); }
  for (let i = 0; i < keyA.length; i++) if (keyA[i] !== keyB[i]) return { ok: false, why: ordered ? `row ${i + 1} differs (check the sort order)` : "rows differ" };
  return { ok: true };
}

/* Small helpers for UIs and tests */
export function tableToText(t, max = 20) {
  const widths = t.cols.map((c, i) => Math.min(40, Math.max(c.name.length, ...t.rows.slice(0, max).map(r => fmtValue(r[i], c.type).length))));
  const line = row => row.map((v, i) => String(v).slice(0, 40).padEnd(widths[i])).join("  ");
  const out = [line(t.cols.map(c => c.name)), line(widths.map(w => "-".repeat(w)))];
  t.rows.slice(0, max).forEach(r => out.push(line(r.map((v, i) => fmtValue(v, t.cols[i].type)))));
  if (t.rows.length > max) out.push(`… ${t.rows.length - max} more rows`);
  return out.join("\n");
}
export const isNull = isNullish;
