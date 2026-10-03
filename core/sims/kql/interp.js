/* Cert Gauntlet — KQL interpreter: walks the parser's AST against in-memory tables.
   A table is { cols: [{name, type}], rows: [[v, …]] }. Scalars follow values.js.
   Entry point: execute(ast, db) where db = { tables: {Name: table}, now: ms }. */
import { KqlError } from "./lexer.js";
import { DT, TS, isDT, isTS, isNullish, isStr, isNum, isBool, isDyn, toStr, toLong, toReal, toBool, toDT, toTS, castTo, hashKey, rowKey, cmp, eq, typeOfValue, isNumericType, safeJSON } from "./values.js";
import { FUNCS, AGGS, hasTerm, binValue, nearestName } from "./funcs.js";

const N = isNullish;
const TYPE_DOTNET = { string: "System.String", long: "System.Int64", int: "System.Int32", real: "System.Double", bool: "System.Boolean", datetime: "System.DateTime", timespan: "System.TimeSpan", dynamic: "System.Object", guid: "System.Guid" };

export function execute(ast, db) {
  const scope = { scalars: new Map(), tabulars: new Map(), lambdas: new Map() };
  const ctx = { now: db.now ?? Date.now(), seed: 12345, rowIndex: 0, warnings: [] };
  let result = null;
  for (const st of ast.stmts) {
    if (st.k === "let") {
      if (st.lambda) scope.lambdas.set(st.name, st.lambda);
      else if (st.tab) scope.tabulars.set(st.name, { ast: st.tab });
      else { const v = evalScalarConst(st.expr, scope, db, ctx); scope.scalars.set(st.name, v); }
    } else result = runTabular(st.tab, scope, db, ctx);
  }
  if (!result) throw new KqlError("The query has let statements but no tabular expression to run. End with a table name or an expression such as 'print 1'.", { code: "SEM0100" });
  result.warnings = ctx.warnings;
  return result;
}

/* ---------- tabular evaluation ---------- */
function runTabular(tab, scope, db, ctx) {
  let t = runSource(tab.src, scope, db, ctx);
  for (const op of tab.ops) t = runOp(op, t, scope, db, ctx);
  return t;
}
function clone(t) { return { cols: t.cols.map(c => ({ ...c })), rows: t.rows.map(r => r.slice()) }; }
function runSource(src, scope, db, ctx) {
  switch (src.k) {
    case "table": {
      if (scope.tabulars.has(src.name)) { const e = scope.tabulars.get(src.name); if (e.table) return clone(e.table); const t = runTabular(e.ast, scope, db, ctx); e.table = t; return clone(t); }
      if (db.tables[src.name]) return { cols: db.tables[src.name].cols.map(c => ({ ...c })), rows: db.tables[src.name].rows.slice() };
      if (scope.scalars.has(src.name)) throw new KqlError(`'${src.name}' is a scalar, not a table. A query must start with a tabular expression.`, { code: "SEM0100", line: src.line, col: src.col, token: src.name });
      throw new KqlError(`Failed to resolve table or column expression named '${src.name}'${hintTable(src.name, db)}`, { code: "SEM0100", line: src.line, col: src.col, token: src.name });
    }
    case "sub": return runTabular(src.tab, scope, db, ctx);
    case "datatable": {
      const n = src.cols.length; if (n === 0) throw new KqlError("datatable() needs at least one column.", { code: "SEM0100" });
      const vals = src.values.map(e => evalScalarConst(e, scope, db, ctx));
      if (vals.length % n !== 0) throw new KqlError(`datatable: ${vals.length} values don't fill ${n} columns evenly.`, { code: "SEM0100" });
      const rows = []; for (let i = 0; i < vals.length; i += n) rows.push(src.cols.map((c, j) => castTo(vals[i + j], c.type)));
      return { cols: src.cols.map(c => ({ ...c })), rows };
    }
    case "externaldata": {
      ctx.warnings.push(`externaldata is a stub in this lab: the real service would fetch ${src.urls.length} URI${src.urls.length === 1 ? "" : "s"} (${src.urls.map(u => u.split("/").pop()).join(", ")}); here it returns an empty table with the declared schema.`);
      const rows = (db.externaldata && src.urls.map(u => db.externaldata[u]).find(Boolean)) || [];
      return { cols: src.cols.map(c => ({ ...c })), rows: rows.map(r => src.cols.map(c => castTo(r[c.name], c.type))) };
    }
    case "print": {
      const cols = [], row = [];
      src.items.forEach((it, i) => { const v = evalScalarConst(it.expr, scope, db, ctx); cols.push({ name: it.name || `print_${i}`, type: staticType(it.expr, null, scope) || typeOfValue(v) || "string" }); row.push(v); });
      return { cols, rows: [row] };
    }
    case "range": {
      const from = evalScalarConst(src.from, scope, db, ctx), to = evalScalarConst(src.to, scope, db, ctx), step = evalScalarConst(src.step, scope, db, ctx);
      const rows = []; const isD = isDT(from); const f = isD || isTS(from) ? from.ms : from, tt = isDT(to) || isTS(to) ? to.ms : to, s = isTS(step) ? step.ms : step;
      if (!s) throw new KqlError("range: step must not be zero.", { code: "SEM0100" });
      for (let x = f; s > 0 ? x <= tt : x >= tt; x += s) { rows.push([isD ? new DT(x) : isTS(from) ? new TS(x) : x]); if (rows.length > 100000) break; }
      return { cols: [{ name: src.name, type: isD ? "datetime" : isTS(from) ? "timespan" : Number.isInteger(f) && Number.isInteger(s) ? "long" : "real" }], rows };
    }
    case "union": return runUnion(src, null, scope, db, ctx);
    case "lcall": {
      const lam = scope.lambdas.get(src.name); if (!lam || !lam.tab) throw new KqlError(`'${src.name}' is not a tabular function.`, { code: "SEM0100", line: src.line, col: src.col });
      return callTabularLambda(lam, src.args.map(a => evalScalarConst(a, scope, db, ctx)), scope, db, ctx);
    }
    default: throw new KqlError(`Unsupported source ${src.k}`, { code: "SEM0100" });
  }
}
function callTabularLambda(lam, args, scope, db, ctx) {
  const inner = { scalars: new Map(scope.scalars), tabulars: scope.tabulars, lambdas: scope.lambdas };
  lam.params.forEach((p, i) => inner.scalars.set(p.name, castTo(args[i], p.type)));
  return runTabular(lam.tab, inner, db, ctx);
}
function hintTable(name, db) {
  const names = Object.keys(db.tables || {}); const lower = name.toLowerCase();
  const near = names.find(n => n.toLowerCase() === lower) || nearestName(name, names) || names.find(n => n.toLowerCase().startsWith(lower.slice(0, 6)) || lower.startsWith(n.toLowerCase().slice(0, 6)));
  return near ? `. Did you mean '${near}'?` : "";
}

/* ---------- operators ---------- */
function runOp(op, t, scope, db, ctx) {
  switch (op.k) {
    case "where": {
      const env = mkEnv(t, scope, db, ctx, "where"); check(op.expr, env);
      if (staticType(op.expr, env) && staticType(op.expr, env) !== "bool") throw new KqlError(`'where' operator: the expression must be of type bool. The filter you wrote evaluates to ${staticType(op.expr, env)}.`, { code: "SEM0100", line: op.line, col: op.col });
      const rows = []; t.rows.forEach((r, i) => { env.row = r; env.rowIndex = i; if (evalExpr(op.expr, env) === true) rows.push(r); });
      return { cols: t.cols, rows };
    }
    case "project": return project(op, t, scope, db, ctx, false);
    case "extend": return project(op, t, scope, db, ctx, true);
    case "serialize": return op.items.length ? project({ ...op, k: "extend" }, t, scope, db, ctx, true) : t;
    case "project-away": { const drop = matchNames(op.names, t.cols, "project-away"); const keep = t.cols.map((c, i) => i).filter(i => !drop.has(i)); return { cols: keep.map(i => t.cols[i]), rows: t.rows.map(r => keep.map(i => r[i])) }; }
    case "project-keep": { const keepSet = matchNames(op.names, t.cols, "project-keep"); const keep = t.cols.map((c, i) => i).filter(i => keepSet.has(i)); return { cols: keep.map(i => t.cols[i]), rows: t.rows.map(r => keep.map(i => r[i])) }; }
    case "project-reorder": { const first = []; for (const n of op.names) { const m = matchNames([n], t.cols, "project-reorder"); t.cols.forEach((c, i) => { if (m.has(i) && !first.includes(i)) first.push(i); }); } const rest = t.cols.map((c, i) => i).filter(i => !first.includes(i)); const order = first.concat(rest); return { cols: order.map(i => t.cols[i]), rows: t.rows.map(r => order.map(i => r[i])) }; }
    case "project-rename": { const cols = t.cols.map(c => ({ ...c })); for (const it of op.items) { const i = cols.findIndex(c => c.name === it.old); if (i < 0) throw new KqlError(`'project-rename' operator: Failed to resolve scalar expression named '${it.old}'${hintCol(it.old, t)}`, { code: "SEM0100", line: op.line, col: op.col, token: it.old }); if (cols.some((c, j) => j !== i && c.name === it.name)) throw new KqlError(`'project-rename' operator: a column named '${it.name}' already exists.`, { code: "SEM0100", line: op.line, col: op.col }); cols[i].name = it.name; } return { cols, rows: t.rows }; }
    case "summarize": return summarize(op, t, scope, db, ctx);
    case "join": case "lookup": return join(op, t, scope, db, ctx);
    case "union": return runUnion(op, t, scope, db, ctx);
    case "parse": case "parse-where": return parseOp(op, t, scope, db, ctx);
    case "mv-expand": return mvExpand(op, t, scope, db, ctx);
    case "sort": return sortTable(op.keys, t, scope, db, ctx, "sort");
    case "top": { const n = toLong(evalScalarConst(op.n, scope, db, ctx)); if (N(n) || n < 0) throw new KqlError("'top' operator: the row count must be a non-negative integer.", { code: "SEM0100", line: op.line, col: op.col }); const s = sortTable(op.keys, t, scope, db, ctx, "top"); return { cols: s.cols, rows: s.rows.slice(0, n) }; }
    case "take": { const n = toLong(evalScalarConst(op.n, scope, db, ctx)); if (N(n) || n < 0) throw new KqlError("'take' operator: the row count must be a non-negative integer.", { code: "SEM0100", line: op.line, col: op.col }); return { cols: t.cols, rows: t.rows.slice(0, n) }; }
    case "distinct": {
      let idx; if (op.all) idx = t.cols.map((c, i) => i); else { idx = op.names.map(n => { const i = t.cols.findIndex(c => c.name === n); if (i < 0) throw new KqlError(`'distinct' operator: Failed to resolve scalar expression named '${n}'${hintCol(n, t)}`, { code: "SEM0100", line: op.line, col: op.col, token: n }); return i; }); }
      const seen = new Set(), rows = []; t.rows.forEach(r => { const k = idx.map(i => hashKey(r[i])).join("\u0001"); if (!seen.has(k)) { seen.add(k); rows.push(idx.map(i => r[i])); } });
      return { cols: idx.map(i => t.cols[i]), rows };
    }
    case "count": return { cols: [{ name: op.name || "Count", type: "long" }], rows: [[t.rows.length]] };
    case "render": ctx.warnings.push(`render ${op.chart || ""}: charts are not drawn in this lab; the table is shown instead.`.replace("  ", " ")); return t;
    case "getschema": return { cols: [{ name: "ColumnName", type: "string" }, { name: "ColumnOrdinal", type: "long" }, { name: "DataType", type: "string" }, { name: "ColumnType", type: "string" }], rows: t.cols.map((c, i) => [c.name, i, TYPE_DOTNET[c.type] || "System.Object", c.type]) };
    case "as": scope.tabulars.set(op.name, { table: t }); return t;
    case "consume": return { cols: [], rows: [] };
    default: throw new KqlError(`'${op.k}' operator is not supported.`, { code: "SEM0100", line: op.line, col: op.col });
  }
}
function hintCol(name, t) {
  const lower = name.toLowerCase(); const c = t.cols.find(c => c.name.toLowerCase() === lower);
  if (c) return `. Column names are case-sensitive — did you mean '${c.name}'?`;
  const near = t.cols.find(c => c.name.toLowerCase().includes(lower.slice(0, 5)) || lower.includes(c.name.toLowerCase().slice(0, 5)));
  return near ? `. Did you mean '${near.name}'?` : "";
}
function matchNames(names, cols, opName) {
  const set = new Set();
  for (const n of names) {
    if (n.endsWith("*")) { const pre = n.slice(0, -1); cols.forEach((c, i) => { if (c.name.startsWith(pre)) set.add(i); }); }
    else { const i = cols.findIndex(c => c.name === n); if (i < 0) throw new KqlError(`'${opName}' operator: Failed to resolve scalar expression named '${n}'${hintCol(n, { cols })}`, { code: "SEM0100", token: n }); set.add(i); }
  }
  return set;
}
function autoName(expr, used, i) {
  if (expr.k === "col") return expr.name;
  if (expr.k === "call" && ["bin", "floor", "startofday", "startofweek", "startofmonth", "tolower", "toupper", "tostring"].includes(expr.name) && expr.args[0] && expr.args[0].k === "col" && ["bin", "floor"].includes(expr.name)) return expr.args[0].name;
  let n = 1; while (used.has("Column" + n)) n++; return "Column" + n;
}
function project(op, t, scope, db, ctx, isExtend) {
  const env = mkEnv(t, scope, db, ctx, isExtend ? "extend" : "project");
  const items = []; const used = new Set(isExtend ? t.cols.map(c => c.name) : []);
  for (const it of op.items) {
    if (it.expr.k === "star" && !isExtend) { t.cols.forEach((c, i) => { items.push({ name: c.name, idx: i, type: c.type }); used.add(c.name); }); continue; }
    check(it.expr, env);
    let name = it.name || autoName(it.expr, used, items.length);
    if (!isExtend && used.has(name) && !(it.expr.k === "col" && items.find(x => x.name === name && x.idx !== undefined))) throw new KqlError(`'project' operator: duplicate column name '${name}'.`, { code: "SEM0100", line: op.line, col: op.col });
    used.add(name);
    const type = staticType(it.expr, env);
    items.push({ name, expr: it.expr, type });
  }
  if (isExtend) {
    const cols = t.cols.map(c => ({ ...c })); const newIdx = [];
    for (const it of items) { const i = cols.findIndex(c => c.name === it.name); if (i >= 0) { cols[i] = { name: it.name, type: it.type || cols[i].type }; newIdx.push(i); } else { cols.push({ name: it.name, type: it.type }); newIdx.push(cols.length - 1); } }
    const rows = t.rows.map((r, ri) => { env.row = r; env.rowIndex = ri; const out = r.slice(); items.forEach((it, k) => { out[newIdx[k]] = evalExpr(it.expr, env); }); return out; });
    finalizeTypes(cols, rows, newIdx);
    return { cols, rows };
  }
  const cols = items.map(it => ({ name: it.name, type: it.type || (it.idx !== undefined ? t.cols[it.idx].type : null) }));
  const rows = t.rows.map((r, ri) => { env.row = r; env.rowIndex = ri; return items.map(it => it.idx !== undefined ? r[it.idx] : evalExpr(it.expr, env)); });
  finalizeTypes(cols, rows, cols.map((c, i) => i));
  return { cols, rows };
}
/* columns whose static type is unknown take the type of their first non-null value */
function finalizeTypes(cols, rows, idxs) {
  for (const i of idxs) {
    if (cols[i].type) continue;
    let ty = null; for (const r of rows) { const v = r[i]; if (!N(v)) { ty = typeOfValue(v); if (ty === "long" && rows.some(x => isNum(x[i]) && !Number.isInteger(x[i]))) ty = "real"; break; } }
    cols[i].type = ty || "string";
  }
}

/* ---------- summarize ---------- */
function summarize(op, t, scope, db, ctx) {
  const env = mkEnv(t, scope, db, ctx, "summarize");
  const byDefs = []; const used = new Set();
  for (const b of op.by) {
    check(b.expr, env); let name = b.name || autoName(b.expr, used, byDefs.length);
    if (b.expr.k === "call" && !b.name && ["bin", "floor"].includes(b.expr.name) && b.expr.args[0] && b.expr.args[0].k === "col") name = b.expr.args[0].name;
    used.add(name); byDefs.push({ name, expr: b.expr, type: staticType(b.expr, env) });
  }
  const aggDefs = [];
  const aggCall = (e) => e.k === "call" && AGGS[e.name];
  const containsAgg = (e) => { if (!e || typeof e !== "object") return false; if (aggCall(e)) return true; return Object.values(e).some(v => Array.isArray(v) ? v.some(containsAgg) : v && typeof v === "object" && containsAgg(v)); };
  const simpleAgg = (e, name) => {
    const def = AGGS[e.name];
    if (e.args.length < def.min || e.args.length > def.max) throw new KqlError(`Function '${e.name}' expected ${def.min === def.max ? def.min : def.min + " to " + def.max} argument${def.max === 1 ? "" : "s"} but got ${e.args.length}.`, { code: "SEM0100", line: e.line, col: e.col });
    e.args.forEach(x => { if (containsAgg(x)) throw new KqlError(`'summarize' operator: aggregation functions can't be nested (${e.name} contains another aggregate).`, { code: "SEM0100", line: e.line, col: e.col }); check(x, env); });
    const argTypes = e.args.map(x => staticType(x, env));
    const constVals = e.args.map(x => x.k === "lit" ? x.v : null);
    return { def, args: e.args, name: name || def.name(e.args, constVals), type: def.ret(argTypes) };
  };
  /* rewrite an expression over aggregates (100.0 * countif(x) / count()) into {k:"aggref"} leaves + sub-aggregates */
  const lift = (e, subs) => {
    if (aggCall(e)) { if (AGGS[e.name].row) throw new KqlError(`'summarize' operator: ${e.name}() can't be combined with other expressions. Use it on its own.`, { code: "SEM0100", line: e.line, col: e.col }); subs.push(simpleAgg(e)); return { k: "aggref", i: subs.length - 1, type: subs[subs.length - 1].type }; }
    if (e.k === "col" && !scope.scalars.has(e.name)) throw new KqlError(`'summarize' operator: '${e.name}' must be inside an aggregation function or listed after 'by'.`, { code: "SEM0100", line: op.line, col: op.col, token: e.name });
    const out = { ...e };
    for (const k of Object.keys(e)) { const v = e[k]; if (Array.isArray(v)) out[k] = v.map(x => x && typeof x === "object" && x.k ? lift(x, subs) : x); else if (v && typeof v === "object" && v.k) out[k] = lift(v, subs); }
    return out;
  };
  for (const a of op.aggs) {
    const e = a.expr;
    if (!aggCall(e)) {
      if (containsAgg(e)) { const subs = []; const expr = lift(e, subs); const ty = staticType(expr, env); aggDefs.push({ expr: true, subs, exprAst: expr, name: a.name || ("Column" + (aggDefs.length + 1)), type: ty }); continue; }
      if (e.k === "call" && FUNCS[e.name]) throw new KqlError(`'summarize' operator: '${e.name}()' is not an aggregation function. Use it inside an aggregate (for example dcount(${e.name}(...))) or in the by clause.`, { code: "SEM0100", line: op.line, col: op.col });
      if (e.k === "call") throw new KqlError(`Unknown aggregation function: '${e.name}'.${nearAgg(e.name)}`, { code: "SEM0100", line: e.line, col: e.col, token: e.name });
      if (e.k === "col") throw new KqlError(`'summarize' operator: '${e.name}' is not an aggregation function. Did you mean: summarize ... by ${e.name}?`, { code: "SEM0100", line: op.line, col: op.col, token: e.name });
      throw new KqlError(`'summarize' operator: every expression before 'by' must be an aggregation function such as count(), dcount(), sum() or make_set().`, { code: "SEM0100", line: op.line, col: op.col });
    }
    const def = AGGS[e.name];
    if (def.row) {
      if (e.args.length < def.min || e.args.length > def.max) throw new KqlError(`Function '${e.name}' expected ${def.min === def.max ? def.min : def.min + " to " + def.max} arguments but got ${e.args.length}.`, { code: "SEM0100", line: e.line, col: e.col });
      /* arg_max(T, *) / arg_max(T, A, B) / any(*) */
      const isAny = e.name === "any" || e.name === "take_any" || e.name === "take_anyif";
      const keyExpr = isAny ? null : e.args[0]; if (keyExpr) check(keyExpr, env);
      let outs = isAny ? (e.name === "take_anyif" ? [e.args[0]] : e.args) : e.args.slice(1);
      const star = outs.some(x => x.k === "star");
      const outCols = star ? t.cols.map((c, i) => ({ name: c.name, type: c.type, idx: i })) : outs.map(x => { check(x, env); return { name: x.k === "col" ? x.name : autoName(x, used, 0), type: staticType(x, env), expr: x }; });
      if (!star && keyExpr && (e.name === "arg_max" || e.name === "arg_min")) { outCols.unshift({ name: keyExpr.k === "col" ? keyExpr.name : (e.name + "_" + "Column1"), type: staticType(keyExpr, env), expr: keyExpr, isKey: true }); }
      if (star && keyExpr && (e.name === "arg_max" || e.name === "arg_min") && keyExpr.k !== "col") outCols.unshift({ name: e.name + "_", type: staticType(keyExpr, env), expr: keyExpr, isKey: true });
      aggDefs.push({ row: true, def, keyExpr, outCols, cond: e.name === "take_anyif" ? e.args[1] : null, name: a.name });
      continue;
    }
    aggDefs.push(simpleAgg(e, a.name));
  }
  if (!byDefs.length && !aggDefs.length) throw new KqlError("'summarize' operator: specify at least one aggregation or a by clause.", { code: "SEM0100", line: op.line, col: op.col });
  /* group */
  const groups = new Map();
  t.rows.forEach((r, ri) => {
    env.row = r; env.rowIndex = ri;
    const keyVals = byDefs.map(b => evalExpr(b.expr, env));
    const key = keyVals.map(hashKey).join("\u0001");
    let g = groups.get(key);
    if (!g) { g = { keyVals, accs: aggDefs.map(a => a.row ? { best: undefined, row: null, outVals: null } : a.expr ? a.subs.map(sd => sd.def.init()) : a.def.init()) }; groups.set(key, g); }
    aggDefs.forEach((a, i) => {
      if (a.row) {
        if (a.cond && evalExpr(a.cond, env) !== true) return;
        const cand = a.keyExpr ? evalExpr(a.keyExpr, env) : null;
        if (a.def.pick(g.accs[i].best, cand) && (g.accs[i].best === undefined || a.keyExpr)) { g.accs[i].best = a.keyExpr ? cand : true; g.accs[i].outVals = a.outCols.map(c => c.idx !== undefined ? r[c.idx] : evalExpr(c.expr, env)); }
        else if (g.accs[i].best === undefined) { g.accs[i].best = true; g.accs[i].outVals = a.outCols.map(c => c.idx !== undefined ? r[c.idx] : evalExpr(c.expr, env)); }
      } else if (a.expr) { a.subs.forEach((sd, j) => { const vals = sd.args.map(x => evalExpr(x, env)); g.accs[i][j] = sd.def.step(g.accs[i][j], vals); }); }
      else { const vals = a.args.map(x => evalExpr(x, env)); g.accs[i] = a.def.step(g.accs[i], vals); }
    });
  });
  if (!byDefs.length && groups.size === 0) groups.set("", { keyVals: [], accs: aggDefs.map(a => a.row ? { best: undefined, outVals: null } : a.expr ? a.subs.map(sd => sd.def.init()) : a.def.init()) });
  const cols = byDefs.map(b => ({ name: b.name, type: b.type }));
  aggDefs.forEach(a => { if (a.row) a.outCols.forEach(c => cols.push({ name: c.name, type: c.type })); else cols.push({ name: a.name, type: a.type }); });
  /* duplicate output names get a numeric suffix like Kusto */
  const seen = new Map(); cols.forEach(c => { if (seen.has(c.name)) { const n = seen.get(c.name) + 1; seen.set(c.name, n); c.name = c.name + n; } else seen.set(c.name, 0); });
  const rows = [];
  for (const g of groups.values()) {
    const row = g.keyVals.slice();
    aggDefs.forEach((a, i) => {
      if (a.row) { const vals = g.accs[i].outVals || a.outCols.map(() => null); row.push(...vals); }
      else if (a.expr) { const aggVals = a.subs.map((sd, j) => sd.def.done(g.accs[i][j], sd.args.map(x => x.k === "lit" ? x.v : null))); row.push(evalExpr(a.exprAst, { ...env, row: g.keyVals, aggVals })); }
      else { const constArgs = a.args.map(x => x.k === "lit" ? x.v : null); row.push(a.def.done(g.accs[i], constArgs)); }
    });
    rows.push(row);
  }
  finalizeTypes(cols, rows, cols.map((c, i) => i));
  return { cols, rows };
}
function nearAgg(name) { const l = name.toLowerCase(); const c = Object.keys(AGGS).find(a => a === l) || Object.keys(AGGS).find(a => a.startsWith(l.slice(0, 3))); return c ? ` Did you mean '${c}'?` : ""; }

/* ---------- join ---------- */
function join(op, left, scope, db, ctx) {
  const right = runTabular(op.right, scope, db, ctx);
  const lenv = mkEnv(left, scope, db, ctx, op.k), renv = mkEnv(right, scope, db, ctx, op.k);
  const keys = op.on.map(k => {
    const lx = sideExpr(k.left, "left"), rx = sideExpr(k.right, "right");
    const lName = lx.k === "col" ? lx.name : null, rName = rx.k === "col" ? rx.name : null;
    if (lName && !lenv.cols.has(lName) && !scope.scalars.has(lName)) throw new KqlError(`'${op.k}' operator: Failed to resolve scalar expression named '${lName}' on the left side of the join${hintCol(lName, left)}`, { code: "SEM0100", line: op.line, col: op.col, token: lName });
    if (rName && !renv.cols.has(rName) && !scope.scalars.has(rName)) throw new KqlError(`'${op.k}' operator: Failed to resolve scalar expression named '${rName}' on the right side of the join${hintCol(rName, right)}`, { code: "SEM0100", line: op.line, col: op.col, token: rName });
    check(lx, lenv); check(rx, renv);
    const lt = staticType(lx, lenv), rt = staticType(rx, renv);
    if (lt && rt && lt !== rt && !(isNumericType(lt) && isNumericType(rt)) && lt !== "dynamic" && rt !== "dynamic") throw new KqlError(`'${op.k}' operator: the join key types don't match — '${lName || "left key"}' is ${lt} and '${rName || "right key"}' is ${rt}. Convert one side (for example tostring()).`, { code: "SEM0100", line: op.line, col: op.col });
    return { lx, rx, same: k.same, rName };
  });
  const lk = left.rows.map((r, i) => { lenv.row = r; lenv.rowIndex = i; return keys.map(k => evalExpr(k.lx, lenv)); });
  const rk = right.rows.map((r, i) => { renv.row = r; renv.rowIndex = i; return keys.map(k => evalExpr(k.rx, renv)); });
  const keyStr = vals => vals.some(N) ? null : vals.map(hashKey).join("\u0001");
  const rIndex = new Map(); rk.forEach((vals, i) => { const k = keyStr(vals); if (k === null) return; if (!rIndex.has(k)) rIndex.set(k, []); rIndex.get(k).push(i); });
  const kind = op.kind === "anti" ? "leftanti" : op.kind === "leftantisemi" ? "leftanti" : op.kind === "rightantisemi" ? "rightanti" : op.kind;
  /* output schema */
  /* Kusto keeps the right-side key as Key1; only lookup drops it */
  const dropRight = new Set(op.k === "lookup" ? keys.filter(k => k.same).map(k => right.cols.findIndex(c => c.name === k.rName)).filter(i => i >= 0) : []);
  const leftOnly = ["leftanti", "leftsemi"].includes(kind), rightOnly = ["rightanti", "rightsemi"].includes(kind);
  let cols, rightKeep;
  if (leftOnly) { cols = left.cols.map(c => ({ ...c })); rightKeep = []; }
  else if (rightOnly) { cols = right.cols.map(c => ({ ...c })); rightKeep = right.cols.map((c, i) => i); }
  else {
    cols = left.cols.map(c => ({ ...c })); rightKeep = right.cols.map((c, i) => i).filter(i => !dropRight.has(i));
    const names = new Set(cols.map(c => c.name));
    for (const i of rightKeep) { let name = right.cols[i].name; if (names.has(name)) { let n = 1; while (names.has(name + n)) n++; name = name + n; } names.add(name); cols.push({ name, type: right.cols[i].type }); }
  }
  const rows = []; const rMatched = new Set();
  const nullsR = rightKeep.map(() => null), nullsL = left.cols.map(() => null);
  const seenLeft = new Set();
  left.rows.forEach((lr, li) => {
    const k = keyStr(lk[li]); const matches = k === null ? [] : (rIndex.get(k) || []);
    if (kind === "innerunique") { if (k !== null && seenLeft.has(k)) return; seenLeft.add(k); }
    matches.forEach(ri => rMatched.add(ri));
    switch (kind) {
      case "inner": case "innerunique": matches.forEach(ri => rows.push(lr.concat(rightKeep.map(i => right.rows[ri][i])))); break;
      case "leftouter": case "fullouter": if (matches.length) matches.forEach(ri => rows.push(lr.concat(rightKeep.map(i => right.rows[ri][i])))); else rows.push(lr.concat(nullsR)); break;
      case "rightouter": matches.forEach(ri => rows.push(lr.concat(rightKeep.map(i => right.rows[ri][i])))); break;
      case "leftanti": if (!matches.length) rows.push(lr.slice()); break;
      case "leftsemi": if (matches.length) rows.push(lr.slice()); break;
      default: break;
    }
  });
  if (kind === "rightouter" || kind === "fullouter") right.rows.forEach((rr, ri) => { if (!rMatched.has(ri)) rows.push(nullsL.concat(rightKeep.map(i => rr[i]))); });
  if (kind === "rightanti") right.rows.forEach((rr, ri) => { if (!rMatched.has(ri)) rows.push(rr.slice()); });
  if (kind === "rightsemi") right.rows.forEach((rr, ri) => { if (rMatched.has(ri)) rows.push(rr.slice()); });
  return { cols, rows };
}
function sideExpr(e, side) { if (e.k === "side") { if (e.side !== side) throw new KqlError(`'join' operator: $${e.side}.${e.name} is on the wrong side of '=='. Write on $left.Key == $right.Key.`, { code: "SEM0100" }); return { k: "col", name: e.name }; } return e; }

/* ---------- union ---------- */
function runUnion(op, first, scope, db, ctx) {
  const parts = []; if (first) parts.push({ t: first, name: "union_arg0" });
  op.sources.forEach((s, i) => { const t = runTabular(s, scope, db, ctx); parts.push({ t, name: s.src.k === "table" && !s.ops.length ? s.src.name : `union_arg${parts.length}` }); });
  const cols = [], key = new Map(); /* name -> index */
  const typeOf = new Map();
  if (op.withsource) { cols.push({ name: op.withsource, type: "string" }); key.set(op.withsource, 0); }
  const maps = parts.map(p => p.t.cols.map(c => {
    let name = c.name;
    if (key.has(name) && cols[key.get(name)].type !== c.type && cols[key.get(name)].type !== "dynamic" && c.type !== "dynamic" && !(isNumericType(c.type) && isNumericType(cols[key.get(name)].type))) {
      /* Kusto splits same-name columns of different types into Name_type columns */
      const existing = cols[key.get(name)]; if (!existing.split) { existing.split = true; const oldName = existing.name; existing.name = oldName + "_" + existing.type; key.delete(oldName); key.set(existing.name, cols.indexOf(existing)); }
      name = c.name + "_" + c.type;
    }
    if (!key.has(name)) { key.set(name, cols.length); cols.push({ name, type: c.type }); }
    return key.get(name);
  }));
  const rows = [];
  parts.forEach((p, pi) => p.t.rows.forEach(r => { const out = new Array(cols.length).fill(null); if (op.withsource) out[0] = p.name; maps[pi].forEach((ci, i) => { out[ci] = r[i]; }); rows.push(out); }));
  cols.forEach(c => delete c.split);
  if (op.kind === "inner") { const common = cols.filter((c, i) => maps.every(m => m.includes(i)) || (op.withsource && i === 0)); const idx = common.map(c => cols.indexOf(c)); return { cols: common, rows: rows.map(r => idx.map(i => r[i])) }; }
  return { cols, rows };
}

/* ---------- parse ---------- */
function parseOp(op, t, scope, db, ctx) {
  const env = mkEnv(t, scope, db, ctx, "parse"); check(op.expr, env);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let re = ""; const caps = [];
  const parts = op.parts; if (!parts.length) throw new KqlError("'parse' operator: expected a pattern after 'with'.", { code: "SEM0100", line: op.line, col: op.col });
  let anchored = !(parts[0].star);
  parts.forEach((p, i) => {
    if (p.star) { re += i === 0 ? "" : ".*?"; return; }
    if (p.lit !== undefined) { re += op.kind === "regex" ? p.lit : esc(p.lit); return; }
    const nxt = parts[i + 1];
    caps.push(p);
    if (op.kind === "regex") re += nxt && nxt.lit !== undefined ? "(.*?)" : "(.*)";
    else re += nxt && nxt.lit !== undefined ? "(.*?)" : "(.*)";
  });
  let rx; try { rx = new RegExp((anchored ? "^" : "") + re + (parts[parts.length - 1].star ? "" : "$"), "s"); } catch (e) { throw new KqlError(`'parse' operator: invalid pattern — ${e.message}`, { code: "SEM0100", line: op.line, col: op.col }); }
  const cols = t.cols.map(c => ({ ...c }));
  const newIdx = caps.map(c => { const i = cols.findIndex(x => x.name === c.col); if (i >= 0) { cols[i].type = c.type; return i; } cols.push({ name: c.col, type: c.type }); return cols.length - 1; });
  const rows = [];
  t.rows.forEach((r, ri) => {
    env.row = r; env.rowIndex = ri; const s = toStr(evalExpr(op.expr, env)); const m = rx.exec(s);
    if (!m && op.k === "parse-where") return;
    const out = r.slice(); while (out.length < cols.length) out.push(null);
    caps.forEach((c, i) => { out[newIdx[i]] = m ? castTo(m[i + 1], c.type) : null; });
    rows.push(out);
  });
  return { cols, rows };
}

/* ---------- mv-expand ---------- */
function mvExpand(op, t, scope, db, ctx) {
  const env = mkEnv(t, scope, db, ctx, "mv-expand");
  const limit = op.limit ? toLong(evalScalarConst(op.limit, scope, db, ctx)) : 2147483647;
  const defs = op.cols.map(c => {
    check(c.expr, env);
    const name = c.name || (c.expr.k === "col" ? c.expr.name : autoName(c.expr, new Set(t.cols.map(x => x.name)), 0));
    const st = staticType(c.expr, env);
    if (st && st !== "dynamic" && st !== "string") throw new KqlError(`'mv-expand' operator: cannot expand '${name}' of type ${st}. mv-expand works on dynamic arrays and property bags.`, { code: "SEM0100", line: op.line, col: op.col });
    return { name, expr: c.expr, type: c.type || "dynamic" };
  });
  const cols = t.cols.map(c => ({ ...c })); const idx = defs.map(d => { const i = cols.findIndex(c => c.name === d.name); if (i >= 0) { cols[i] = { name: d.name, type: d.type }; return i; } cols.push({ name: d.name, type: d.type }); return cols.length - 1; });
  let idxCol = -1; if (op.index) { cols.push({ name: op.index, type: "long" }); idxCol = cols.length - 1; }
  const rows = [];
  t.rows.forEach((r, ri) => {
    env.row = r; env.rowIndex = ri;
    const lists = defs.map(d => { let v = evalExpr(d.expr, env); if (isStr(v)) v = safeJSON(v); if (N(v) || v === "") return []; if (Array.isArray(v)) return v; if (isDyn(v)) return Object.keys(v).map(k => ({ [k]: v[k] })); return [v]; }); /* null / empty → the record is dropped, as in Kusto */
    const n = Math.min(limit, Math.max(...lists.map(l => l.length)));
    for (let k = 0; k < n; k++) { const out = r.slice(); while (out.length < cols.length) out.push(null); defs.forEach((d, j) => { const v = lists[j][k] ?? null; out[idx[j]] = d.type !== "dynamic" ? castTo(v, d.type) : v; }); if (idxCol >= 0) out[idxCol] = k; rows.push(out); }
  });
  return { cols, rows };
}

/* ---------- sort ---------- */
function sortTable(keys, t, scope, db, ctx, opName) {
  const env = mkEnv(t, scope, db, ctx, opName);
  keys.forEach(k => check(k.expr, env));
  const decorated = t.rows.map((r, i) => { env.row = r; env.rowIndex = i; return { r, i, k: keys.map(k => evalExpr(k.expr, env)) }; });
  decorated.sort((a, b) => {
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]; const x = a.k[j], y = b.k[j]; const nx = N(x), ny = N(y);
      if (nx || ny) { if (nx && ny) continue; const nullsFirst = key.nulls ? key.nulls === "first" : !key.desc; return nx ? (nullsFirst ? -1 : 1) : (nullsFirst ? 1 : -1); }
      const c = cmp(x, y); if (c) return key.desc ? -c : c;
    }
    return a.i - b.i;
  });
  return { cols: t.cols, rows: decorated.map(d => d.r) };
}

/* ---------- scalar evaluation ---------- */
function mkEnv(t, scope, db, ctx, opName) {
  const cols = new Map(); t.cols.forEach((c, i) => cols.set(c.name, i));
  return { t, cols, row: null, rowIndex: 0, scope, db, ctx, opName };
}
function evalScalarConst(expr, scope, db, ctx) {
  const env = { t: { cols: [] }, cols: new Map(), row: [], rowIndex: 0, scope, db, ctx, opName: "let" };
  check(expr, env); return evalExpr(expr, env);
}
function opErr(env, msg, node) { return new KqlError(`'${env.opName}' operator: ${msg}`, { code: "SEM0100", line: node && node.line, col: node && node.col, token: node && (node.name || node.op) }); }

/* static check: unresolved names, unknown functions, arity, aggregates out of place */
function check(e, env) {
  switch (e.k) {
    case "lit": case "star": case "typeof": case "aggref": return;
    case "col": if (!env.cols.has(e.name) && !env.scope.scalars.has(e.name)) {
      if (env.scope.tabulars.has(e.name) || (env.db.tables && env.db.tables[e.name])) throw opErr(env, `'${e.name}' is a table, not a column. To look up values from another table use join, or 'in (${e.name} | project Column)'.`, e);
      if (FUNCS[e.name] || AGGS[e.name]) throw opErr(env, `'${e.name}' is a function — call it with parentheses: ${e.name}()`, e);
      throw opErr(env, `Failed to resolve scalar expression named '${e.name}'${hintCol(e.name, env.t)}`, e);
    } return;
    case "side": return;
    case "call": {
      if (AGGS[e.name]) throw opErr(env, `Aggregation function '${e.name}()' is not allowed in this context. Use it inside summarize.`, e);
      if (env.scope.lambdas.has(e.name)) { e.args.forEach(a => check(a, env)); return; }
      const f = FUNCS[e.name];
      if (!f) { const l = e.name.toLowerCase(); const near = FUNCS[l] ? l : Object.keys(FUNCS).find(n => n.replace(/_/g, "") === l.replace(/_/g, "")) || nearestName(e.name, Object.keys(FUNCS)); throw new KqlError(`Unknown function: '${e.name}'.${near ? ` Did you mean '${near}'?` : ""}`, { code: "SEM0100", line: e.line, col: e.col, token: e.name }); }
      if (e.args.length < f.min || e.args.length > f.max) throw new KqlError(`Function '${e.name}' expected ${f.min === f.max ? f.min : f.max >= 64 ? "at least " + f.min : f.min + " to " + f.max} argument${f.max === 1 && f.min === 1 ? "" : "s"} but got ${e.args.length}.`, { code: "SEM0100", line: e.line, col: e.col, token: e.name });
      if (f.special === "column_ifexists") { check(e.args[1], env); return; }
      e.args.forEach((a, i) => { if (f.typeArg === i && a.k === "typeof") return; check(a, env); });
      return;
    }
    case "cast": check(e.e, env); return;
    case "un": check(e.e, env); return;
    case "bin": {
      if (e.l.k === "star") { check(e.r, env); return; }
      check(e.l, env); check(e.r, env);
      const lt = staticType(e.l, env), rt = staticType(e.r, env);
      if (["==", "!=", "<", "<=", ">", ">="].includes(e.op) && lt && rt && !compatible(lt, rt)) throw new KqlError(`Cannot compare values of types ${lt} and ${rt}. Try adding explicit casts${castHint(lt, rt, e)}`, { code: "SEM0100", line: e.line, col: e.col, token: e.op });
      if (["=~", "!~"].includes(e.op) && lt && rt && (isNumericType(lt) || isNumericType(rt) || lt === "datetime" || rt === "datetime")) throw new KqlError(`Operator '${e.op}' works on strings; got ${lt} and ${rt}. Use == for numbers and dates.`, { code: "SEM0100", line: e.line, col: e.col, token: e.op });
      if (["+", "-", "*", "/", "%"].includes(e.op) && lt && rt) {
        if (lt === "string" || rt === "string") { if (e.op === "+" && lt === "string" && rt === "string") throw new KqlError(`Operator '+' isn't defined for operands of type string. Use strcat(a, b) to concatenate strings.`, { code: "SEM0100", line: e.line, col: e.col, token: "+" }); throw new KqlError(`Operator '${e.op}' isn't defined for operands of type ${lt} and ${rt}. Convert with tolong()/toreal() first.`, { code: "SEM0100", line: e.line, col: e.col, token: e.op }); }
        if (lt === "bool" || rt === "bool") throw new KqlError(`Operator '${e.op}' isn't defined for operands of type ${lt} and ${rt}.`, { code: "SEM0100", line: e.line, col: e.col, token: e.op });
      }
      if (["has", "!has", "has_cs", "!has_cs", "contains", "!contains", "contains_cs", "!contains_cs", "startswith", "!startswith", "startswith_cs", "!startswith_cs", "endswith", "!endswith", "endswith_cs", "!endswith_cs", "hasprefix", "hassuffix", "!hasprefix", "!hassuffix", "matches regex"].includes(e.op) && rt && rt !== "string" && rt !== "dynamic") throw new KqlError(`The right side of '${e.op}' must be a string, got ${rt}. Quote the value: ${e.op} "${e.r.k === "lit" ? toStr(e.r.v) : "..."}".`, { code: "SEM0100", line: e.line, col: e.col, token: e.op });
      if (["has", "!has", "has_cs", "!has_cs", "contains", "!contains", "contains_cs", "!contains_cs", "startswith", "!startswith", "startswith_cs", "!startswith_cs", "endswith", "!endswith", "endswith_cs", "!endswith_cs", "matches regex"].includes(e.op) && lt && (lt === "datetime" || lt === "timespan" || lt === "bool")) throw new KqlError(`Operator '${e.op}' isn't defined for a left operand of type ${lt}. Convert it with tostring() first.`, { code: "SEM0100", line: e.line, col: e.col, token: e.op });
      if (["and", "or"].includes(e.op)) { if (lt && lt !== "bool") throw new KqlError(`Operator '${e.op}' expects bool operands; the left side is ${lt}. Did you mean (A == x or A == y)?`, { code: "SEM0100", line: e.line, col: e.col, token: e.op }); if (rt && rt !== "bool") throw new KqlError(`Operator '${e.op}' expects bool operands; the right side is ${rt}. Each side of '${e.op}' needs its own comparison, for example Column == "a" or Column == "b".`, { code: "SEM0100", line: e.line, col: e.col, token: e.op }); }
      return;
    }
    case "in": { check(e.e, env); if (e.list) e.list.forEach(x => check(x, env)); return; }
    case "between": check(e.e, env); check(e.lo, env); check(e.hi, env); return;
    case "idx": { check(e.e, env); check(e.i, env); const t = staticType(e.e, env); if (t && t !== "dynamic") throw opErr(env, `Cannot index a value of type ${t}. ${t === "string" ? "Use parse_json() or todynamic() first — this column holds JSON text, not a dynamic object." : ""}`.trim(), e.e); return; }
    case "dot": { check(e.e, env); const t = staticType(e.e, env); if (t && t !== "dynamic") throw opErr(env, `Cannot use '.' on a value of type ${t}${e.e.k === "col" ? ` (column '${e.e.name}')` : ""}. ${t === "string" ? "Use parse_json() or todynamic() first — the column holds JSON text, not a dynamic object." : ""}`.trim(), e.e); return; }
    case "toscalar": return;
    default: return;
  }
}
function castHint(lt, rt, e) {
  if (isNumericType(lt) && rt === "string") return ` — for example ${e.l.k === "col" ? e.l.name : "the left side"} == ${e.r.k === "lit" ? toLong(e.r.v) ?? "..." : "tolong(...)"} (no quotes), or tostring(${e.l.k === "col" ? e.l.name : "..."}) == "...".`;
  if (lt === "string" && isNumericType(rt)) return ` — for example ${e.l.k === "col" ? e.l.name : "the left side"} == "${e.r.k === "lit" ? e.r.v : "..."}" (with quotes), or tolong(${e.l.k === "col" ? e.l.name : "..."}) == ${e.r.k === "lit" ? e.r.v : "..."}.`;
  if (lt === "datetime" && rt === "string") return ` — for example ${e.l.k === "col" ? e.l.name : "..."} > datetime(${e.r.k === "lit" ? e.r.v : "2026-01-01"}) or > ago(7d).`;
  return ".";
}
function compatible(a, b) {
  if (a === b) return true;
  if (a === "dynamic" || b === "dynamic") return true;
  if (isNumericType(a) && isNumericType(b)) return true;
  if ((a === "guid" && b === "string") || (a === "string" && b === "guid")) return true;
  return false;
}
/* static type of an expression (null = unknown, decide from runtime values) */
export function staticType(e, env, scope) {
  const sc = env ? env.scope : scope;
  switch (e.k) {
    case "lit": return e.type;
    case "aggref": return e.type;
    case "col": { if (env && env.cols.has(e.name)) return env.t.cols[env.cols.get(e.name)].type; if (sc && sc.scalars.has(e.name)) return typeOfValue(sc.scalars.get(e.name)) || null; return null; }
    case "side": return null;
    case "cast": return e.type;
    case "typeof": return e.type;
    case "star": return null;
    case "un": return staticType(e.e, env, scope);
    case "call": {
      if (sc && sc.lambdas.has(e.name)) { const l = sc.lambdas.get(e.name); return l.expr ? staticType(l.expr, null, sc) : null; }
      const f = FUNCS[e.name]; if (!f) return null;
      if (e.name === "extract" && e.args[3] && e.args[3].k === "typeof") return e.args[3].type;
      if (typeof f.ret === "string") return f.ret;
      return f.ret(e.args.map(a => staticType(a, env, scope)));
    }
    case "bin": {
      const lt = staticType(e.l, env, scope), rt = staticType(e.r, env, scope);
      if (["==", "!=", "<", "<=", ">", ">=", "=~", "!~", "and", "or"].includes(e.op) || e.op.includes("has") || e.op.includes("contains") || e.op.includes("startswith") || e.op.includes("endswith") || e.op === "matches regex") return "bool";
      if (e.op === "/") return "real";
      if (e.op === "+" || e.op === "-") { if (lt === "datetime" && rt === "timespan") return "datetime"; if (lt === "timespan" && rt === "datetime" && e.op === "+") return "datetime"; if (lt === "datetime" && rt === "datetime") return "timespan"; if (lt === "timespan" || rt === "timespan") return "timespan"; }
      if (e.op === "*" && (lt === "timespan" || rt === "timespan")) return "timespan";
      if (!lt || !rt) return null;
      if (lt === "real" || rt === "real") return "real";
      if (lt === "dynamic" || rt === "dynamic") return null;
      return "long";
    }
    case "in": case "between": return "bool";
    case "idx": case "dot": return "dynamic";
    case "toscalar": return null;
    default: return null;
  }
}
function evalExpr(e, env) {
  switch (e.k) {
    case "lit": return e.type === "timespan" && e.v ? new TS(e.v.ts) : e.v;
    case "aggref": return env.aggVals[e.i];
    case "col": { if (env.cols.has(e.name)) return env.row[env.cols.get(e.name)]; return env.scope.scalars.get(e.name); }
    case "side": { const side = env[e.side]; if (!side) throw opErr(env, `$${e.side} can only be used in a join 'on' clause.`, e); return side.row[side.cols.get(e.name)]; }
    case "cast": return castTo(evalExpr(e.e, env), e.type);
    case "typeof": return e.type;
    case "star": return null;
    case "un": { const v = evalExpr(e.e, env); if (N(v)) return null; if (isTS(v)) return new TS(-v.ms); return -v; }
    case "call": return evalCall(e, env);
    case "bin": return evalBinary(e, env);
    case "in": return evalIn(e, env);
    case "between": {
      const v = evalExpr(e.e, env), lo = evalExpr(e.lo, env), hi = evalExpr(e.hi, env);
      if (N(v) || N(lo) || N(hi)) return false;
      let hiV = hi; if (isDT(v) && isTS(hi)) hiV = new DT(lo.ms + hi.ms); /* between (start .. 1h) form */
      const r = cmp(v, lo) >= 0 && cmp(v, hiV) <= 0; return e.neg ? !r : r;
    }
    case "idx": { const v = evalExpr(e.e, env); const i = evalExpr(e.i, env); if (N(v)) return null; const d = isStr(v) ? safeJSON(v) : v; if (Array.isArray(d)) { const n = toLong(i); return N(n) ? null : (d[n < 0 ? d.length + n : n] ?? null); } if (isDyn(d)) return d[toStr(i)] ?? null; return null; }
    case "dot": { const v = evalExpr(e.e, env); if (N(v)) return null; const d = isStr(v) ? safeJSON(v) : v; return isDyn(d) && !Array.isArray(d) ? (d[e.name] ?? null) : null; }
    case "toscalar": { const t = runTabular(e.tab, env.scope, env.db, env.ctx); return t.rows.length && t.cols.length ? t.rows[0][0] : null; }
    default: throw new KqlError(`Cannot evaluate ${e.k}`, { code: "SEM0100" });
  }
}
function evalCall(e, env) {
  if (env.scope.lambdas.has(e.name)) {
    const lam = env.scope.lambdas.get(e.name); const args = e.args.map(a => evalExpr(a, env));
    if (lam.tab) { const t = callTabularLambda(lam, args, env.scope, env.db, env.ctx); return t.rows.length ? t.rows[0][0] : null; }
    const inner = { ...env, scope: { scalars: new Map(env.scope.scalars), tabulars: env.scope.tabulars, lambdas: env.scope.lambdas } };
    lam.params.forEach((p, i) => inner.scope.scalars.set(p.name, castTo(args[i], p.type)));
    return evalExpr(lam.expr, inner);
  }
  const f = FUNCS[e.name];
  if (f.special === "column_ifexists") { const name = e.args[0].k === "lit" ? e.args[0].v : (e.args[0].k === "col" ? e.args[0].name : toStr(evalExpr(e.args[0], env))); return env.cols.has(name) ? env.row[env.cols.get(name)] : evalExpr(e.args[1], env); }
  const args = e.args.map((a, i) => f.typeArg === i && a.k === "typeof" ? a.type : evalExpr(a, env));
  const types = e.args.map(a => staticType(a, env));
  env.ctx.rowIndex = env.rowIndex; env.ctx.rowBag = () => { const o = {}; env.cols.forEach((i, k) => o[k] = env.row[i]); return o; };
  return f.fn(args, types, env.ctx);
}
function evalBinary(e, env) {
  const op = e.op;
  if (op === "and") { const l = evalExpr(e.l, env); if (l === false) return false; const r = evalExpr(e.r, env); if (r === false) return false; if (N(l) || N(r)) return null; return true; }
  if (op === "or") { const l = evalExpr(e.l, env); if (l === true) return true; const r = evalExpr(e.r, env); if (r === true) return true; if (N(l) || N(r)) return null; return false; }
  if (e.l.k === "star") { /* where * has "term": search every column */ const r0 = evalExpr(e.r, env); return env.t.cols.some((c, i) => { const v = env.row[i]; if (N(v)) return false; return evalBinary({ ...e, l: { k: "lit", v: isStr(v) ? v : toStr(v), type: "string" }, r: { k: "lit", v: r0, type: typeOfValue(r0) } }, env) === true; }); }
  const l = evalExpr(e.l, env), r = evalExpr(e.r, env);
  switch (op) {
    case "==": return !N(l) && !N(r) && looseEq(l, r);
    case "!=": return !N(l) && !N(r) && !looseEq(l, r);
    case "=~": return !N(l) && !N(r) && toStr(l).toLowerCase() === toStr(r).toLowerCase();
    case "!~": return !N(l) && !N(r) && toStr(l).toLowerCase() !== toStr(r).toLowerCase();
    case "<": return !N(l) && !N(r) && cmp(l, r) < 0;
    case "<=": return !N(l) && !N(r) && cmp(l, r) <= 0;
    case ">": return !N(l) && !N(r) && cmp(l, r) > 0;
    case ">=": return !N(l) && !N(r) && cmp(l, r) >= 0;
    case "+": case "-": case "*": case "/": case "%": return arith(op, l, r);
    case "has": return hasTerm(l, r, false); case "!has": return !hasTerm(l, r, false);
    case "has_cs": return hasTerm(l, r, true); case "!has_cs": return !hasTerm(l, r, true);
    case "contains": return !N(l) && !N(r) && toStr(l).toLowerCase().includes(toStr(r).toLowerCase()); case "!contains": return !(!N(l) && !N(r) && toStr(l).toLowerCase().includes(toStr(r).toLowerCase()));
    case "contains_cs": return !N(l) && !N(r) && toStr(l).includes(toStr(r)); case "!contains_cs": return !(!N(l) && !N(r) && toStr(l).includes(toStr(r)));
    case "startswith": case "hasprefix": return !N(l) && !N(r) && toStr(l).toLowerCase().startsWith(toStr(r).toLowerCase()); case "!startswith": case "!hasprefix": return !(!N(l) && !N(r) && toStr(l).toLowerCase().startsWith(toStr(r).toLowerCase()));
    case "startswith_cs": return !N(l) && !N(r) && toStr(l).startsWith(toStr(r)); case "!startswith_cs": return !(!N(l) && !N(r) && toStr(l).startsWith(toStr(r)));
    case "endswith": case "hassuffix": return !N(l) && !N(r) && toStr(l).toLowerCase().endsWith(toStr(r).toLowerCase()); case "!endswith": case "!hassuffix": return !(!N(l) && !N(r) && toStr(l).toLowerCase().endsWith(toStr(r).toLowerCase()));
    case "endswith_cs": return !N(l) && !N(r) && toStr(l).endsWith(toStr(r)); case "!endswith_cs": return !(!N(l) && !N(r) && toStr(l).endsWith(toStr(r)));
    case "matches regex": { if (N(l) || N(r)) return false; let rx; try { rx = new RegExp(toStr(r)); } catch (err) { throw new KqlError(`Invalid regular expression '${toStr(r)}': ${err.message}`, { code: "SEM0100", line: e.line, col: e.col }); } return rx.test(toStr(l)); }
    default: throw new KqlError(`Operator '${op}' is not supported.`, { code: "SEM0100", line: e.line, col: e.col });
  }
}
function looseEq(l, r) {
  if (isDyn(l) || isDyn(r)) { const a = isDyn(l) && !Array.isArray(l) && typeof l !== "object" ? l : l, b = r; if (isStr(a) || isStr(b) || isNum(a) || isNum(b) || isBool(a) || isBool(b)) { if (isStr(a) && isNum(b)) return a === String(b); if (isNum(a) && isStr(b)) return String(a) === b; } return eq(l, r); }
  if (isNum(l) && isNum(r)) return l === r;
  return eq(l, r);
}
function arith(op, l, r) {
  if (N(l) || N(r)) return null;
  if (isDT(l) && isTS(r)) return op === "+" ? new DT(l.ms + r.ms) : op === "-" ? new DT(l.ms - r.ms) : null;
  if (isTS(l) && isDT(r) && op === "+") return new DT(l.ms + r.ms);
  if (isDT(l) && isDT(r) && op === "-") return new TS(l.ms - r.ms);
  if (isTS(l) && isTS(r)) { if (op === "+") return new TS(l.ms + r.ms); if (op === "-") return new TS(l.ms - r.ms); if (op === "/") return r.ms === 0 ? null : l.ms / r.ms; if (op === "%") return new TS(l.ms % r.ms); return null; }
  if (isTS(l) && isNum(r)) { if (op === "*") return new TS(l.ms * r); if (op === "/") return new TS(l.ms / r); return null; }
  if (isNum(l) && isTS(r) && op === "*") return new TS(l * r.ms);
  const a = isNum(l) ? l : toReal(l), b = isNum(r) ? r : toReal(r);
  if (N(a) || N(b)) return null;
  switch (op) { case "+": return a + b; case "-": return a - b; case "*": return a * b; case "/": return b === 0 ? (a === 0 ? null : a > 0 ? Infinity : -Infinity) : a / b; case "%": return b === 0 ? null : a % b; }
  return null;
}
function evalIn(e, env) {
  const v = evalExpr(e.e, env); const ci = e.op.endsWith("~"); const neg = e.op.startsWith("!");
  let list;
  if (e.tab) { const t = runTabular(e.tab, env.scope, env.db, env.ctx); if (!t.cols.length) list = []; else list = t.rows.map(r => r[0]); }
  else { list = []; e.list.forEach(x => { const val = evalExpr(x, env); if (Array.isArray(val)) list.push(...val); else list.push(val); }); }
  if (e.op === "has_any" || e.op === "has_all") { if (N(v)) return false; const hits = list.map(x => hasTerm(v, x, false)); return e.op === "has_any" ? hits.some(Boolean) : hits.length > 0 && hits.every(Boolean); }
  if (N(v)) return false;
  const hit = list.some(x => !N(x) && (ci ? toStr(x).toLowerCase() === toStr(v).toLowerCase() : looseEq(v, x)));
  return neg ? !hit : hit;
}
