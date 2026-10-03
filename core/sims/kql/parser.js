/* Cert Gauntlet — KQL parser. Recursive descent over lexer tokens → AST (shapes documented inline).
   knownTables lets the parser tell `in (TableName)` and `let X = TableName | …` apart from scalar expressions. */
import { lex, KqlError, syntaxError } from "./lexer.js";
import { parseDT, parseTS, UNIT_MS, NORMAL_TYPE } from "./values.js";

const TYPE_WORDS = new Set(Object.keys(NORMAL_TYPE));
const CAST_WORDS = new Set(["datetime", "date", "timespan", "time", "dynamic", "long", "int", "real", "double", "decimal", "bool", "boolean", "guid"]);
const TABULAR_HEADS = new Set(["datatable", "externaldata", "union", "print", "range", "materialize", "find", "search"]);
const UNSUPPORTED_OPS = { "make-series": "use summarize … by bin(TimeGenerated, 1h) and sort by instead", "mv-apply": "use mv-expand followed by where/summarize", evaluate: "plugins are not available", invoke: "functions can be inlined with let", "top-nested": "use summarize + top", scan: "", fork: "run the branches as separate queries", facet: "use summarize count() by Column", partition: "", "partition-by": "", search: "use a table name with where * has 'term'", "find-in": "", find: "use union followed by where" };
const STR_OPS = new Set(["has", "!has", "has_cs", "!has_cs", "contains", "!contains", "contains_cs", "!contains_cs", "startswith", "!startswith", "startswith_cs", "!startswith_cs", "endswith", "!endswith", "endswith_cs", "!endswith_cs", "hasprefix", "!hasprefix", "hassuffix", "!hassuffix", "has_any", "has_all", "in", "!in", "in~", "!in~", "between", "!between", "matches"]);
const CMP_OPS = new Set(["==", "!=", "<", "<=", ">", ">=", "=~", "!~", "<>"]);

export function parse(src, { knownTables = [] } = {}) {
  const toks = lex(src); let p = 0;
  const tables = new Set(knownTables); const tabLets = new Set(); const scalarLets = new Set(); const lambdas = new Set();
  const peek = (o = 0) => toks[Math.min(p + o, toks.length - 1)];
  const at = (type, value) => { const t = peek(); return t.type === type && (value === undefined || t.value === value); };
  const atWord = w => { const t = peek(); return t.type === "id" && t.value === w; };
  const next = () => toks[p++];
  const expect = (type, value, what) => { if (!at(type, value)) throw syntaxError(peek(), what); return next(); };
  const expectWord = (w, what) => { if (!atWord(w)) throw syntaxError(peek(), what || `Expected '${w}'`); return next(); };
  const ident = (what = "Expected a column name") => { if (!at("id")) throw syntaxError(peek(), what); return next().value; };
  const isTabularStart = () => {
    const t = peek();
    if (t.type !== "id") return t.type === "p" && t.value === "(" && (() => { const save = p; p++; const r = isTabularStart(); p = save; return r; })();
    if (TABULAR_HEADS.has(t.value) && !(t.value === "materialize" && false)) return true;
    if (tables.has(t.value) || tabLets.has(t.value)) { const n = peek(1); return !(n.type === "p" && [".", "[", "+", "-", "*", "/", "%"].includes(n.value)); }
    { const n = peek(1); if (n.type === "p" && n.value === "|") return true; } /* Unknown | … → let the interpreter report the table */
    if (lambdas.has(t.value) && peek(1).type === "p" && peek(1).value === "(") { /* lambda call: tabular if its body was tabular — decided at eval; treat as tabular when followed by | */ let d = 0, q = p + 1; for (; q < toks.length; q++) { const v = toks[q]; if (v.type === "p" && v.value === "(") d++; if (v.type === "p" && v.value === ")") { d--; if (d === 0) break; } } const after = toks[q + 1]; return after && after.type === "p" && after.value === "|"; }
    return false;
  };

  /* ---------- statements ---------- */
  const stmts = [];
  while (!at("eof")) {
    if (atWord("let")) {
      next(); const name = ident("Expected a name after let"); expect("p", "=", "Expected '=' after let name");
      if (at("p", "(") && looksLikeLambda()) { stmts.push(parseLambda(name)); lambdas.add(name); }
      else if (isTabularStart()) { stmts.push({ k: "let", name, tab: parseTabular() }); tabLets.add(name); }
      else { stmts.push({ k: "let", name, expr: parseExpr() }); scalarLets.add(name); }
    } else if (atWord("set")) { next(); while (!at("p", ";") && !at("eof")) next(); }
    else { const t0 = peek(); const bare = t0.type === "id" && ["eof", "p"].includes(peek(1).type) && (peek(1).type === "eof" || peek(1).value === ";" || peek(1).value === "|"); if (!isTabularStart() && !bare && !(t0.type === "id" && (tables.has(t0.value) || tabLets.has(t0.value) || TABULAR_HEADS.has(t0.value)))) throw syntaxError(t0, "A query must start with a table name"); stmts.push({ k: "query", tab: parseTabular() }); }
    if (at("p", ";")) next(); else if (!at("eof")) throw syntaxError(peek());
  }
  if (!stmts.length) throw new KqlError("The query is empty.", { code: "SYN0002", line: 1, col: 1 });
  return { stmts };

  function looksLikeLambda() { /* ( [id : type ,]* ) { */ let q = p + 1; while (toks[q].type === "id" && toks[q + 1].type === "p" && toks[q + 1].value === ":" && toks[q + 2].type === "id") { q += 3; if (toks[q].type === "p" && toks[q].value === ",") q++; } return toks[q].type === "p" && toks[q].value === ")" && toks[q + 1].type === "p" && toks[q + 1].value === "{"; }
  function parseLambda(name) {
    expect("p", "("); const params = [];
    while (!at("p", ")")) { const pn = ident(); expect("p", ":"); const pt = ident(); params.push({ name: pn, type: NORMAL_TYPE[pt] || pt }); if (at("p", ",")) next(); }
    expect("p", ")"); expect("p", "{");
    params.forEach(pr => scalarLets.add(pr.name));
    let body; if (isTabularStart()) body = { tab: parseTabular() }; else body = { expr: parseExpr() };
    expect("p", "}", "Expected '}' to close the function body");
    return { k: "let", name, lambda: { params, ...body } };
  }

  /* ---------- tabular ---------- */
  function parseTabular() {
    const src = parseSource(); const ops = [];
    while (at("p", "|")) { next(); ops.push(parseOperator()); }
    return { k: "pipe", src, ops };
  }
  function parseSource() {
    const t = peek();
    if (t.type === "p" && t.value === "(") { next(); const tab = parseTabular(); expect("p", ")", "Expected ')'"); return { k: "sub", tab }; }
    if (t.type !== "id") throw syntaxError(t, "A query must start with a table name");
    if (t.value === "datatable") { next(); return parseDatatable(); }
    if (t.value === "externaldata") { next(); return parseExternaldata(); }
    if (t.value === "union") { next(); return parseUnion(); }
    if (t.value === "print") { next(); return { k: "print", items: parseNamedList() }; }
    if (t.value === "range") { next(); const name = ident(); expectWord("from"); const from = parseExpr(); expectWord("to"); const to = parseExpr(); expectWord("step"); const step = parseExpr(); return { k: "range", name, from, to, step }; }
    if (t.value === "materialize") { next(); expect("p", "("); const tab = parseTabular(); expect("p", ")"); return { k: "sub", tab }; }
    if (t.value === "search" || t.value === "find") throw unsupported(t);
    next();
    if (lambdas.has(t.value) && at("p", "(")) { next(); const args = []; while (!at("p", ")")) { args.push(parseExpr()); if (at("p", ",")) next(); } expect("p", ")"); return { k: "lcall", name: t.value, args, line: t.line, col: t.col }; }
    return { k: "table", name: t.value, line: t.line, col: t.col };
  }
  function parseSchema() {
    expect("p", "(", "Expected '('"); const cols = [];
    while (!at("p", ")")) { const name = ident(); expect("p", ":", "Expected ':' and a type"); const ty = ident("Expected a type"); if (!TYPE_WORDS.has(ty)) throw syntaxError(toks[p - 1], `Unknown type '${ty}'`); cols.push({ name, type: NORMAL_TYPE[ty] }); if (at("p", ",")) next(); else if (!at("p", ")")) throw syntaxError(peek()); }
    expect("p", ")"); return cols;
  }
  function parseDatatable() {
    const cols = parseSchema(); expect("p", "[", "Expected '[' with the datatable rows"); const values = [];
    while (!at("p", "]")) { values.push(parseExpr()); if (at("p", ",")) next(); else if (!at("p", "]")) throw syntaxError(peek()); }
    expect("p", "]"); return { k: "datatable", cols, values };
  }
  function parseExternaldata() {
    const cols = parseSchema(); expect("p", "[", "Expected '[' with the data URIs"); const urls = [];
    while (!at("p", "]")) { if (at("str")) urls.push(next().value); else if (at("p", ",")) next(); else throw syntaxError(peek()); }
    expect("p", "]");
    if (atWord("with")) { next(); skipParens(); }
    return { k: "externaldata", cols, urls };
  }
  function parseUnion() {
    const u = { k: "union", sources: [], withsource: null, kind: "outer" };
    for (;;) {
      if (atWord("withsource") || atWord("kind") || atWord("isfuzzy")) { const w = next().value; expect("p", "="); const v = next(); if (w === "withsource") u.withsource = v.value; else if (w === "kind") u.kind = v.value; continue; }
      if (at("id") && peek().value.startsWith("hint")) { next(); if (at("p", ".")) { next(); next(); } expect("p", "="); next(); continue; }
      break;
    }
    for (;;) {
      if (at("p", "(")) { next(); u.sources.push(parseTabular()); expect("p", ")"); }
      else if (at("id")) { const t = next(); u.sources.push({ k: "pipe", src: { k: "table", name: t.value, line: t.line, col: t.col }, ops: [] }); }
      else throw syntaxError(peek(), "Expected a table name");
      if (at("p", ",")) next(); else break;
    }
    return u;
  }
  function parseOperator() {
    const t = peek(); if (t.type !== "id") throw syntaxError(t, "Expected a query operator after '|'");
    const op = next().value; const node = { k: op, line: t.line, col: t.col };
    switch (op) {
      case "where": case "filter": node.k = "where"; node.expr = parseExpr(); return node;
      case "project": node.items = parseNamedList(); return node;
      case "extend": node.items = parseNamedList(); return node;
      case "project-away": case "project-keep": case "project-reorder": node.names = parseNameList(); return node;
      case "project-rename": { node.items = []; do { const name = ident(); expect("p", "=", "Expected NewName = OldName"); const old = ident(); node.items.push({ name, old }); } while (at("p", ",") && next()); return node; }
      case "summarize": return parseSummarize(node);
      case "join": case "lookup": return parseJoin(node);
      case "union": { const u = parseUnion(); return { ...u, line: t.line, col: t.col }; }
      case "parse": case "parse-where": return parseParse(node);
      case "mv-expand": return parseMvExpand(node);
      case "sort": case "order": { node.k = "sort"; expectWord("by", "Expected 'by' after sort"); node.keys = parseSortKeys(); return node; }
      case "top": { node.n = parseExpr(); expectWord("by", "Expected 'by' after the top count"); node.keys = parseSortKeys(); return node; }
      case "take": case "limit": node.k = "take"; node.n = parseExpr(); return node;
      case "sample": node.k = "take"; node.n = parseExpr(); return node;
      case "distinct": { if (at("p", "*")) { next(); node.all = true; } else node.names = parseNameList(); return node; }
      case "count": { if (atWord("as") || at("p", "=")) { next(); node.name = ident(); } return node; }
      case "render": { node.chart = at("id") ? next().value : ""; if (atWord("with")) { next(); skipParens(); } return node; }
      case "serialize": { node.items = at("id") ? parseNamedList() : []; return node; }
      case "getschema": return node;
      case "as": { while (at("id") && peek().value.startsWith("hint")) { next(); expect("p", "."); next(); expect("p", "="); next(); } node.name = ident(); tabLets.add(node.name); return node; }
      case "consume": return node;
      default:
        if (op in UNSUPPORTED_OPS) throw unsupported(t);
        throw syntaxError(t, `'${op}' is not a query operator`);
    }
  }
  function unsupported(t) { const hint = UNSUPPORTED_OPS[t.value]; return new KqlError(`'${t.value}' operator isn't available in this lab${hint ? " — " + hint : ""}.\nToken: ${t.value}\nLine: ${t.line}, Position: ${t.col}`, { code: "LAB0001", line: t.line, col: t.col, token: t.value }); }
  function skipParens() { if (!at("p", "(")) return; let d = 0; do { const x = next(); if (x.type === "p" && x.value === "(") d++; if (x.type === "p" && x.value === ")") d--; if (x.type === "eof") throw syntaxError(x, "Expected ')'"); } while (d > 0); }
  function parseNamedList() {
    const items = [];
    do {
      if (at("id") && peek(1).type === "p" && peek(1).value === "=" ) { const name = next().value; next(); items.push({ name, expr: parseExpr() }); }
      else { const e = parseExpr(); items.push({ name: null, expr: e }); }
    } while (at("p", ",") && next());
    return items;
  }
  function parseNameList() { const names = []; do { if (!at("id")) throw syntaxError(peek(), "Expected a column name"); let n = next().value; if (at("p", "*")) { next(); n += "*"; } names.push(n); } while (at("p", ",") && next()); return names; }
  function parseSummarize(node) {
    node.aggs = []; node.by = [];
    while (at("id") && peek().value.startsWith("hint")) { next(); expect("p", "."); next(); expect("p", "="); next(); }
    if (!atWord("by")) node.aggs = parseNamedList();
    if (atWord("by")) { next(); node.by = parseNamedList(); }
    return node;
  }
  function parseJoin(node) {
    node.kind = node.k === "lookup" ? "leftouter" : "innerunique";
    for (;;) {
      if (atWord("kind")) { next(); expect("p", "="); const kt = next(); node.kind = kt.value; if (!["inner", "innerunique", "leftouter", "rightouter", "fullouter", "leftanti", "rightanti", "leftsemi", "rightsemi", "anti", "leftantisemi", "rightantisemi"].includes(node.kind)) throw syntaxError(kt, `Unknown join kind '${kt.value}'`); continue; }
      if (at("id") && peek().value.startsWith("hint")) { next(); expect("p", "."); next(); expect("p", "="); next(); continue; }
      break;
    }
    if (at("p", "(")) { next(); node.right = parseTabular(); expect("p", ")", "Expected ')' to close the right side of the join"); }
    else if (at("id") && !atWord("on")) { const t = next(); node.right = { k: "pipe", src: { k: "table", name: t.value, line: t.line, col: t.col }, ops: [] }; }
    else throw syntaxError(peek(), "Expected the right side of the join in parentheses");
    expectWord("on", "Expected 'on' with the join key");
    node.on = [];
    do {
      const e = parseExpr();
      if (e.k === "bin" && e.op === "==") node.on.push({ left: e.l, right: e.r });
      else if (e.k === "col") node.on.push({ left: { k: "col", name: e.name }, right: { k: "col", name: e.name }, same: true });
      else throw syntaxError(peek(), "Join keys must be column names or $left.X == $right.Y");
    } while (at("p", ",") && next());
    return node;
  }
  function parseParse(node) {
    node.kind = "simple";
    if (atWord("kind")) { next(); expect("p", "="); node.kind = next().value; }
    if (atWord("flags")) { next(); expect("p", "="); next(); }
    node.expr = parseExpr(); expectWord("with", "Expected 'with' after the parsed expression");
    node.parts = [];
    while (!at("p", "|") && !at("p", ";") && !at("eof") && !at("p", ")")) {
      if (at("p", "*")) { next(); node.parts.push({ star: true }); }
      else if (at("str")) node.parts.push({ lit: next().value });
      else if (at("id")) { const col = next().value; let type = "string"; if (at("p", ":")) { next(); type = NORMAL_TYPE[ident("Expected a type")] || "string"; } node.parts.push({ col, type }); }
      else throw syntaxError(peek());
    }
    return node;
  }
  function parseMvExpand(node) {
    node.cols = []; node.limit = null; node.index = null;
    for (;;) {
      if (atWord("bagexpansion")) { next(); expect("p", "="); next(); continue; }
      if (atWord("with_itemindex")) { next(); expect("p", "="); node.index = ident(); continue; }
      break;
    }
    do {
      if (atWord("limit")) break;
      let name = null; if (at("id") && peek(1).type === "p" && peek(1).value === "=") { name = next().value; next(); }
      const expr = parseExpr(); let type = null;
      if (atWord("to")) { next(); expectWord("typeof"); expect("p", "("); type = NORMAL_TYPE[ident()]; expect("p", ")"); }
      node.cols.push({ name, expr, type });
    } while (at("p", ",") && next());
    if (atWord("limit")) { next(); node.limit = parseExpr(); }
    return node;
  }
  function parseSortKeys() {
    const keys = [];
    do {
      const key = { expr: parseExpr(), desc: true, nulls: null };
      if (atWord("asc")) { next(); key.desc = false; } else if (atWord("desc")) { next(); key.desc = true; }
      if (atWord("nulls")) { next(); const w = next().value; key.nulls = w === "first" ? "first" : "last"; }
      keys.push(key);
    } while (at("p", ",") && next());
    return keys;
  }

  /* ---------- scalar expressions ---------- */
  function parseExpr() { return parseOr(); }
  function parseOr() { let l = parseAnd(); while (atWord("or")) { next(); l = { k: "bin", op: "or", l, r: parseAnd() }; } return l; }
  function parseAnd() { let l = parseCmp(); while (atWord("and")) { next(); l = { k: "bin", op: "and", l, r: parseCmp() }; } return l; }
  function parseCmp() {
    let l = parseAdd();
    for (;;) {
      const t = peek();
      if (t.type === "p" && CMP_OPS.has(t.value)) { next(); l = { k: "bin", op: t.value === "<>" ? "!=" : t.value, l, r: parseAdd(), line: t.line, col: t.col }; continue; }
      if (t.type === "id" && STR_OPS.has(t.value)) {
        next(); const op = t.value;
        if (op === "matches") { expectWord("regex", "Expected 'regex' after 'matches'"); l = { k: "bin", op: "matches regex", l, r: parseAdd(), line: t.line, col: t.col }; continue; }
        if (op === "in" || op === "!in" || op === "in~" || op === "!in~" || op === "has_any" || op === "has_all") { l = { k: "in", op, e: l, ...parseInList(), line: t.line, col: t.col }; continue; }
        if (op === "between" || op === "!between") { expect("p", "(", "Expected '(' after between"); const lo = parseAdd(); expect("p", "..", "Expected '..' in between (low .. high)"); const hi = parseAdd(); expect("p", ")"); l = { k: "between", neg: op[0] === "!", e: l, lo, hi, line: t.line, col: t.col }; continue; }
        l = { k: "bin", op, l, r: parseAdd(), line: t.line, col: t.col }; continue;
      }
      return l;
    }
  }
  function parseInList() {
    expect("p", "(", "Expected '(' after in");
    /* tabular subquery? */
    if (isTabularStart() && !(at("id") && peek(1).type === "p" && [",", ")"].includes(peek(1).value) && !tables.has(peek().value) && !tabLets.has(peek().value))) { const tab = parseTabular(); expect("p", ")"); return { tab }; }
    const list = []; while (!at("p", ")")) { list.push(parseExpr()); if (at("p", ",")) next(); else if (!at("p", ")")) throw syntaxError(peek(), "Expected ',' or ')'"); }
    expect("p", ")"); return { list };
  }
  function parseAdd() { let l = parseMul(); for (;;) { const t = peek(); if (t.type === "p" && (t.value === "+" || t.value === "-")) { next(); l = { k: "bin", op: t.value, l, r: parseMul(), line: t.line, col: t.col }; } else return l; } }
  function parseMul() { let l = parseUnary(); for (;;) { const t = peek(); if (t.type === "p" && (t.value === "*" || t.value === "/" || t.value === "%")) { next(); l = { k: "bin", op: t.value, l, r: parseUnary(), line: t.line, col: t.col }; } else return l; } }
  function parseUnary() { const t = peek(); if (t.type === "p" && t.value === "-") { next(); return { k: "un", op: "-", e: parseUnary() }; } if (t.type === "p" && t.value === "+") { next(); return parseUnary(); } if (t.type === "p" && t.value === "!") { next(); return { k: "call", name: "not", args: [parseUnary()], line: t.line, col: t.col }; } return parsePostfix(); }
  function parsePostfix() {
    let e = parsePrimary();
    for (;;) {
      if (at("p", "[")) { next(); const i = parseExpr(); expect("p", "]", "Expected ']'"); e = { k: "idx", e, i }; continue; }
      if (at("p", ".") && peek(1).type === "id") { next(); const name = next().value; e = { k: "dot", e, name }; continue; }
      return e;
    }
  }
  function parsePrimary() {
    const t = peek();
    if (t.type === "num") { next(); return { k: "lit", v: t.value, type: t.real ? "real" : "long" }; }
    if (t.type === "str") { next(); let s = t.value; while (at("str")) s += next().value; return { k: "lit", v: s, type: "string" }; }
    if (t.type === "ts") { next(); return { k: "lit", v: { ts: t.value.n * UNIT_MS[t.value.unit] }, type: "timespan" }; }
    if (t.type === "p" && t.value === "(") { next(); if (isTabularStart()) { const tab = parseTabular(); expect("p", ")"); return { k: "toscalar", tab }; } const e = parseExpr(); expect("p", ")", "Expected ')'"); return e; }
    if (t.type === "p" && t.value === "*") { next(); return { k: "star" }; }
    if (t.type !== "id") throw syntaxError(t);
    next();
    const w = t.value;
    if (w === "true" || w === "false") return { k: "lit", v: w === "true", type: "bool" };
    if (w === "null") return { k: "lit", v: null, type: null };
    if (w === "$left" || w === "$right") { expect("p", ".", "Expected '.' after " + w); const name = ident(); return { k: "side", side: w.slice(1), name }; }
    if (CAST_WORDS.has(w) && at("p", "(")) return parseCastLiteral(w, t);
    if (w === "typeof" && at("p", "(")) { next(); const ty = ident(); expect("p", ")"); return { k: "typeof", type: NORMAL_TYPE[ty] || ty }; }
    if (w === "toscalar" && at("p", "(")) { next(); const tab = parseTabular(); expect("p", ")"); return { k: "toscalar", tab }; }
    if (at("p", "(")) {
      next(); const args = [];
      while (!at("p", ")")) { if (at("p", "*")) { next(); args.push({ k: "star" }); } else args.push(parseExpr()); if (at("p", ",")) next(); else if (!at("p", ")")) throw syntaxError(peek(), "Expected ',' or ')'"); }
      expect("p", ")");
      return { k: "call", name: w, args, line: t.line, col: t.col };
    }
    return { k: "col", name: w, line: t.line, col: t.col };
  }
  /* datetime(2026-01-01 10:00), timespan(1d), dynamic([…]), long(5), real(1.5), bool(true), guid(…) — the argument isn't ordinary expression syntax */
  function parseCastLiteral(w, t) {
    const open = next(); let depth = 1, q = p; while (q < toks.length && depth > 0) { const x = toks[q]; if (x.type === "p" && x.value === "(") depth++; if (x.type === "p" && x.value === ")") depth--; if (x.type === "eof") throw syntaxError(x, "Expected ')'"); q++; }
    const close = toks[q - 1]; const raw = src.slice(open.pos + 1, close.pos).trim();
    const type = NORMAL_TYPE[w];
    if (w === "dynamic") { p = q; return { k: "lit", v: parseDynamic(raw, t), type: "dynamic" }; }
    if (type === "datetime") { const d = raw === "null" ? null : parseDT(raw); if (d || raw === "null") { p = q; return { k: "lit", v: d, type: "datetime" }; } if (/^[0-9]/.test(raw)) throw new KqlError(`Invalid datetime literal 'datetime(${raw})'. Use datetime(2026-10-01) or datetime(2026-10-01T09:00:00Z).\nToken: ${raw}\nLine: ${t.line}, Position: ${t.col}`, { code: "SYN0002", line: t.line, col: t.col, token: raw }); }
    if (type === "timespan") { const s = raw === "null" ? null : parseTS(raw); if (s || raw === "null") { p = q; return { k: "lit", v: s ? { ts: s.ms } : null, type: "timespan" }; } }
    if (w === "guid") { p = q; return { k: "lit", v: raw, type: "guid" }; }
    /* otherwise treat as a conversion call: long(x) == tolong(x) */
    const e = parseExpr(); expect("p", ")");
    return { k: "cast", type, e };
  }
  function parseDynamic(raw, t) {
    if (raw === "null") return null;
    const fixed = raw.replace(/'((?:[^'\\]|\\.)*)'/g, (m, s) => JSON.stringify(s.replace(/\\'/g, "'"))).replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":').replace(/\b(true|false|null)\b/g, "$1");
    try { return JSON.parse(fixed); } catch (e) {
      const n = Number(raw); if (!Number.isNaN(n) && raw !== "") return n;
      throw new KqlError(`Invalid dynamic literal 'dynamic(${raw})'. Use dynamic([\"a\",\"b\"]) or dynamic({\"key\":\"value\"}).\nToken: ${raw}\nLine: ${t.line}, Position: ${t.col}`, { code: "SYN0002", line: t.line, col: t.col, token: raw });
    }
  }
}
