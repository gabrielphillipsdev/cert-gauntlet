/* Cert Gauntlet — KQL lexer. Turns query text into tokens with line/column so errors can read like the Log Analytics editor:
   "Query could not be parsed at 'summarise' on line [1,13]". */

export class KqlError extends Error {
  constructor(message, { code = "SEM0100", line = 0, col = 0, token = "" } = {}) {
    super(message); this.name = "KqlError"; this.code = code; this.line = line; this.col = col; this.token = token;
  }
}
export function syntaxError(tok, what) {
  const t = tok && tok.type !== "eof" ? tok.raw : "<end of query>"; const line = tok ? tok.line : 1, col = tok ? tok.col : 1;
  const msg = `Query could not be parsed at '${t}' on line [${line},${col}]` + (what ? `. ${what}` : "") + `\nToken: ${t}\nLine: ${line}, Position: ${col}`;
  return new KqlError(msg, { code: "SYN0002", line, col, token: t });
}

/* operators whose name contains a hyphen (lexed as one identifier) */
const HYPHEN_OPS = new Set(["project-away", "parse-where", "parse-kv", "project-rename", "project-reorder", "project-keep", "project-smart", "mv-expand", "mv-apply", "make-series", "top-nested", "top-hitters", "partition-by", "find-in"]);
/* words that are infix operators after a '!' (lexed together: !has, !in …) */
const BANG_WORDS = new Set(["has", "has_cs", "contains", "contains_cs", "startswith", "startswith_cs", "endswith", "endswith_cs", "in", "in~", "has_any", "has_all", "between", "hasprefix", "hassuffix", "matches"]);
const TS_SUFFIX = /^(d|h|m|s|ms|microsecond|microseconds|tick|ticks|day|days|hour|hours|min|minute|minutes|sec|second|seconds|millisecond|milliseconds)(?![A-Za-z0-9_])/;

export function lex(src) {
  const toks = []; let i = 0, line = 1, col = 1; const n = src.length;
  let tokStart = 0;
  const push = (type, value, raw, l, c) => toks.push({ type, value, raw, line: l, col: c, pos: tokStart, end: i });
  const adv = (k = 1) => { for (let j = 0; j < k; j++) { if (src[i] === "\n") { line++; col = 1; } else col++; i++; } };
  while (i < n) {
    const ch = src[i];
    if (ch === "\n" || ch === " " || ch === "\t" || ch === "\r") { adv(); continue; }
    if (ch === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") adv(); continue; }
    const l = line, c = col, start = i; tokStart = i;
    /* multi-line string */
    if (src.startsWith("```", i)) { const end = src.indexOf("```", i + 3); if (end < 0) throw new KqlError(`Unterminated string literal starting on line [${l},${c}]\nToken: \`\`\`\nLine: ${l}, Position: ${c}`, { code: "SYN0002", line: l, col: c }); const v = src.slice(i + 3, end); adv(end + 3 - i); push("str", v, src.slice(start, i), l, c); continue; }
    /* verbatim string @'…' / @"…" */
    if (ch === "@" && (src[i + 1] === "'" || src[i + 1] === '"')) {
      const q = src[i + 1]; adv(2); let v = "";
      while (i < n) { if (src[i] === q) { if (src[i + 1] === q) { v += q; adv(2); continue; } break; } v += src[i]; adv(); }
      if (i >= n) throw new KqlError(`Unterminated string literal starting on line [${l},${c}]\nToken: ${src.slice(start, Math.min(n, start + 12))}\nLine: ${l}, Position: ${c}`, { code: "SYN0002", line: l, col: c });
      adv(); push("str", v, src.slice(start, i), l, c); continue;
    }
    if (ch === "'" || ch === '"' || ((ch === "h" || ch === "H") && (src[i + 1] === "'" || src[i + 1] === '"'))) {
      if (ch !== "'" && ch !== '"') adv();
      const q = src[i]; adv(); let v = "";
      while (i < n && src[i] !== q) {
        if (src[i] === "\n") throw new KqlError(`Unterminated string literal starting on line [${l},${c}]\nToken: ${src.slice(start, i)}\nLine: ${l}, Position: ${c}`, { code: "SYN0002", line: l, col: c });
        if (src[i] === "\\") { const e = src[i + 1]; v += e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : e === "0" ? "\0" : e; adv(2); continue; }
        v += src[i]; adv();
      }
      if (i >= n) throw new KqlError(`Unterminated string literal starting on line [${l},${c}]\nToken: ${src.slice(start, Math.min(n, start + 12))}\nLine: ${l}, Position: ${c}`, { code: "SYN0002", line: l, col: c });
      adv(); push("str", v, src.slice(start, i), l, c); continue;
    }
    /* bracket-quoted identifier ['Column Name'] — not after an identifier or ')' / ']' (that's indexing or a datatable/externaldata row list) */
    const prevTok = toks[toks.length - 1];
    const prevBlocks = prevTok && ((prevTok.type === "id" && prevTok.end === i) || prevTok.type === "str" || prevTok.type === "num" || (prevTok.type === "p" && (prevTok.value === ")" || prevTok.value === "]")));
    if (ch === "[" && (src[i + 1] === "'" || src[i + 1] === '"') && !prevBlocks) {
      const q = src[i + 1]; let j = i + 2; let v = "";
      while (j < n && src[j] !== q) { v += src[j]; j++; }
      if (src[j] === q && src[j + 1] === "]") { adv(j + 2 - i); push("id", v, src.slice(start, i), l, c); continue; }
    }
    /* numbers (with optional timespan suffix) */
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i; if (src[j] === "0" && (src[j + 1] === "x" || src[j + 1] === "X")) { j += 2; while (j < n && /[0-9a-fA-F]/.test(src[j])) j++; adv(j - i); push("num", parseInt(src.slice(start, i), 16), src.slice(start, i), l, c); continue; }
      while (j < n && /[0-9]/.test(src[j])) j++;
      let real = false;
      if (src[j] === "." && /[0-9]/.test(src[j + 1] || "")) { real = true; j++; while (j < n && /[0-9]/.test(src[j])) j++; }
      if ((src[j] === "e" || src[j] === "E") && /[0-9+-]/.test(src[j + 1] || "")) { const k = j + 1; let m = k; if (src[m] === "+" || src[m] === "-") m++; if (/[0-9]/.test(src[m] || "")) { real = true; j = m; while (j < n && /[0-9]/.test(src[j])) j++; } }
      const numTxt = src.slice(i, j); const suf = src.slice(j).match(TS_SUFFIX);
      if (suf) { adv(j + suf[1].length - i); push("ts", { n: +numTxt, unit: suf[1] }, src.slice(start, i), l, c); continue; }
      adv(j - i); push("num", +numTxt, numTxt, l, c); toks[toks.length - 1].real = real; continue;
    }
    /* identifiers / keywords */
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      let word = src.slice(i, j);
      /* hyphenated operator names */
      if (src[j] === "-" && /[a-z]/.test(src[j + 1] || "")) { let k = j + 1; while (k < n && /[a-z]/.test(src[k])) k++; const joined = src.slice(i, k); if (HYPHEN_OPS.has(joined)) { word = joined; j = k; } }
      if (word === "in" && src[j] === "~") { word = "in~"; j++; }
      adv(j - i); push("id", word, word, l, c); continue;
    }
    /* '!' followed by a word → negated operator */
    if (ch === "!" && /[a-z]/.test(src[i + 1] || "")) {
      let j = i + 1; while (j < n && /[a-z_~]/.test(src[j])) j++;
      const w = src.slice(i + 1, j); if (BANG_WORDS.has(w)) { adv(j - i); push("id", "!" + w, "!" + w, l, c); continue; }
    }
    /* punctuation */
    const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
    if (["=~", "!~", "==", "!=", "<=", ">=", "..", "<>", "<|"].includes(two)) { adv(2); push("p", two, two, l, c); continue; }
    if ("|(),;=<>+-*/%.[]{}:!".includes(ch)) { adv(); push("p", ch, ch, l, c); continue; }
    throw new KqlError(`Query could not be parsed at '${ch}' on line [${l},${c}]\nToken: ${ch}\nLine: ${l}, Position: ${c}`, { code: "SYN0002", line: l, col: c, token: ch });
  }
  tokStart = n; push("eof", null, "", line, col);
  return toks;
}
