/* Cert Gauntlet — KQL Lab drills as a sim type ("kql") so the PBQ Lab and the exam runner can both host them.
   item = { id, type:"kql", mode:"write"|"fix"|"predict", title, prompt, tables:[names], ref:"reference query",
            ordered?:bool (row order graded), names?:bool (column names graded), buggy?:"query with one bug" (fix),
            alts?:[q1,q2,q3] (predict: distractor outputs come from running these), hint?, why, obj, d, cat }
   Grading: write/fix = result-set equality with the reference (any correct query passes); predict = picked the real output.
   Phones get the engine's symbol key row (core/ui/keyrow.js); fine-pointer tablets/laptops use the real keyboard. */
import { registerSim } from "../registry.js";
import { esc, shuffle } from "../../util.js";
import { attachKeyRow, KQL_KEYS } from "../../ui/keyrow.js";
import { runKql, sameResult, formatError, KqlError } from "./kql.js";
import { fmtValue, fmtDT } from "./values.js";
import { LAB_DB, LAB_NOW, TABLE_NOTES } from "./tables.js";

const MAX_SHOW = 40;
let cssDone = false;
function ensureCss() {
  if (cssDone || typeof document === "undefined") return; cssDone = true;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("./kql.css", import.meta.url).href; document.head.appendChild(l);
}
export function run(q) { return runKql(q, LAB_DB, { maxRows: 2000 }); }

/* ---------- rendering helpers ---------- */
export function tableHtml(t, max = MAX_SHOW) {
  if (!t.cols.length) return `<div class="kq-empty">0 columns</div>`;
  const head = `<tr>${t.cols.map(c => `<th>${esc(c.name)}<span>${esc(c.type || "")}</span></th>`).join("")}</tr>`;
  const body = t.rows.slice(0, max).map(r => `<tr>${r.map((v, i) => `<td class="${v === null || v === undefined ? "nul" : ""}">${cell(v, t.cols[i].type)}</td>`).join("")}</tr>`).join("");
  const more = t.rows.length > max ? `<div class="kq-more">… ${t.rows.length - max} more row${t.rows.length - max === 1 ? "" : "s"}</div>` : "";
  return `<div class="kq-tblwrap"><table class="kq-tbl">${head}${body}</table></div>${more}`;
}
function cell(v, type) {
  if (v === null || v === undefined) return "<i>null</i>";
  const s = fmtValue(v, type); return esc(s.length > 160 ? s.slice(0, 157) + "…" : s);
}
function summaryLine(t) { return `${t.rows.length} row${t.rows.length === 1 ? "" : "s"} · ${t.cols.length} column${t.cols.length === 1 ? "" : "s"}${t.truncated ? ` (showing the first ${t.rows.length} of ${t.truncated})` : ""}`; }
function errorHtml(e) { const f = formatError(e); return `<div class="kq-err"><div class="kq-errh">✕ ${esc(f.head)}</div>${f.detail ? `<pre>${esc(f.detail)}</pre>` : ""}</div>`; }
function schemaHtml(name) {
  const t = LAB_DB.tables[name]; if (!t) return `<div class="kq-empty">Unknown table ${esc(name)}</div>`;
  const sample = { cols: t.cols, rows: t.rows.slice(0, 3) };
  return `<div class="kq-schemah"><b>${esc(name)}</b> · ${t.rows.length} rows · ${t.cols.length} columns</div><p class="kq-note">${esc(TABLE_NOTES[name] || "")}</p><div class="kq-cols">${t.cols.map(c => `<span><b>${esc(c.name)}</b> ${esc(c.type)}</span>`).join("")}</div><div class="kq-schemah small">First 3 rows</div>${tableHtml(sample, 3)}`;
}
export function labNowText() { return `now() is pinned to ${fmtDT(LAB_NOW).replace("T", " ").replace("Z", " UTC")} in this lab, so ago() is reproducible.`; }

/* ---------- sim ---------- */
registerSim("kql", {
  label: "KQL Lab", color: "#43D97B",
  create(item) {
    if (item.mode === "predict") { const n = 1 + (item.alts || []).length; return { ord: shuffle(Array.from({ length: n }, (_, i) => i)), sel: null, q: "" }; }
    return { q: item.mode === "fix" ? (item.buggy || "") : "", ran: 0, sel: null };
  },
  render(el, item, st, ctx) {
    ensureCss();
    if (el.__kqlDetach) { el.__kqlDetach(); el.__kqlDetach = null; }
    const tables = item.tables || [];
    const modeLabel = item.mode === "write" ? "Write it" : item.mode === "fix" ? "Fix it — exactly one bug" : "Predict it — pick the output";
    let html = `<div class="kq"><div class="kq-mode">${modeLabel}</div>${item.prompt ? `<p class="kq-task">${esc(item.prompt)}</p>` : ""}`;
    html += `<div class="kq-tables"><span>Tables</span>${tables.map(n => `<button type="button" class="kq-chip" data-t="${esc(n)}">${esc(n)}</button>`).join("")}<button type="button" class="kq-chip ghost" data-t="*">all tables</button></div><div class="kq-schema" hidden></div>`;
    if (item.mode === "predict") {
      html += `<pre class="kq-q">${esc(item.ref)}</pre><div class="kq-predict">${st.ord.map((oi, k) => `<button type="button" class="kq-opt ${st.sel === oi ? "sel" : ""} ${ctx.reveal ? (oi === 0 ? "right" : st.sel === oi ? "wrong" : "") : ""}" data-i="${oi}"><span class="k">${"ABCD"[k]}</span><div class="kq-optbody">${optionHtml(item, oi)}</div></button>`).join("")}</div>`;
    } else {
      html += `<textarea class="kq-ed" rows="5" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" placeholder="SigninLogs&#10;| where …" ${ctx.locked ? "readonly" : ""}>${esc(st.q || "")}</textarea>`;
      html += `<div class="kq-bar"><button type="button" class="kq-run" ${ctx.locked ? "disabled" : ""}>▶ Run</button>${item.hint && !ctx.reveal ? `<button type="button" class="kq-hintbtn">Hint</button>` : ""}<span class="kq-nowhint">${esc(labNowText())}</span></div><div class="kq-hint" hidden>${esc(item.hint || "")}</div><div class="kq-out"></div>`;
    }
    if (ctx.reveal) {
      let refHtml = "";
      try { const r = run(item.ref); refHtml = `<div class="kq-keyh">Reference query</div><pre class="kq-q">${esc(item.ref)}</pre><div class="kq-sum">${summaryLine(r)}</div>${tableHtml(r, 12)}`; } catch (e) { refHtml = errorHtml(e); }
      html += `<div class="kq-key">${refHtml}${item.why ? `<div class="kq-why">${esc(item.why)}</div>` : ""}</div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
    /* table chips */
    const schema = el.querySelector(".kq-schema");
    el.querySelectorAll(".kq-chip").forEach(b => b.onclick = () => {
      const n = b.dataset.t; const open = !schema.hidden && schema.dataset.t === n;
      if (open) { schema.hidden = true; schema.dataset.t = ""; el.querySelectorAll(".kq-chip").forEach(x => x.classList.remove("on")); return; }
      schema.dataset.t = n; schema.hidden = false; el.querySelectorAll(".kq-chip").forEach(x => x.classList.toggle("on", x === b));
      schema.innerHTML = n === "*" ? Object.keys(LAB_DB.tables).map(k => `<div class="kq-tline"><b>${esc(k)}</b> <span>${LAB_DB.tables[k].rows.length} rows</span> <em>${esc(TABLE_NOTES[k] || "")}</em></div>`).join("") : schemaHtml(n);
    });
    if (item.mode === "predict") {
      el.querySelectorAll(".kq-opt").forEach(b => b.onclick = () => { if (ctx.locked) return; st.sel = +b.dataset.i; el.querySelectorAll(".kq-opt").forEach(x => x.classList.toggle("sel", +x.dataset.i === st.sel)); ctx.onChange(); });
      return;
    }
    const ed = el.querySelector(".kq-ed"), out = el.querySelector(".kq-out");
    ed.addEventListener("input", () => { st.q = ed.value; ctx.onChange(); });
    ed.addEventListener("keydown", ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); doRun(); } if (ev.key === "Tab" && !ev.shiftKey) { ev.preventDefault(); const s = ed.selectionStart; ed.value = ed.value.slice(0, s) + "    " + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = s + 4; ed.dispatchEvent(new Event("input")); } });
    const doRun = () => {
      st.ran = (st.ran || 0) + 1; ctx.onChange();
      try { const r = run(st.q); out.innerHTML = `<div class="kq-sum">${summaryLine(r)}${r.warnings && r.warnings.length ? r.warnings.map(w => `<div class="kq-warn">${esc(w)}</div>`).join("") : ""}</div>${tableHtml(r)}`; }
      catch (e) { out.innerHTML = errorHtml(e); if (!(e instanceof KqlError)) console.error(e); }
    };
    el.querySelector(".kq-run").onclick = doRun;
    const hb = el.querySelector(".kq-hintbtn"); if (hb) hb.onclick = () => { el.querySelector(".kq-hint").hidden = false; hb.remove(); };
    if (ctx.reveal && st.q) doRun();
    if (!ctx.locked) el.__kqlDetach = attachKeyRow(el, KQL_KEYS);
  },
  answered(item, st) { return item.mode === "predict" ? st.sel !== null : !!(st.q && st.q.trim()) && (item.mode !== "fix" || st.q.trim() !== (item.buggy || "").trim()); },
  score(item, st) {
    if (item.mode === "predict") {
      const right = st.sel === 0;
      return { f: right ? 1 : 0, notes: [right ? "Correct — that is what the query returns." : st.sel === null ? "You didn't pick an output." : "Not this one. Compare the operators in the query with the shape of each table: summarize changes the columns, where only drops rows, project only picks columns."], why: item.why || "" };
    }
    return gradeQuery(item, st.q);
  },
});
function optionHtml(item, oi) {
  try { const r = run(oi === 0 ? item.ref : item.alts[oi - 1]); return `<div class="kq-sum">${summaryLine(r)}</div>${tableHtml(r, 6)}`; } catch (e) { return errorHtml(e); }
}
export function gradeQuery(item, q) {
  if (!q || !q.trim()) return { f: 0, notes: ["No query was written."], why: item.why || "" };
  let ref; try { ref = run(item.ref); } catch (e) { return { f: 0, notes: ["Reference query failed: " + e.message], why: "" }; }
  let user; try { user = run(q); } catch (e) { const f = formatError(e); return { f: 0, notes: ["Your query didn't run: " + f.head], why: item.why || "" }; }
  const cmp = sameResult(user, ref, { ordered: !!item.ordered, names: !!item.names });
  if (cmp.ok) return { f: 1, notes: [`Result set matches the reference (${summaryLine(ref)}).`], why: item.why || "" };
  const shape = user.rows.length === ref.rows.length && user.cols.length === ref.cols.length;
  const notes = [`Your result: ${summaryLine(user)}. Expected: ${summaryLine(ref)}. ${cmp.why}.`];
  if (user.rows.length > ref.rows.length && user.cols.length === ref.cols.length) notes.push("Too many rows — a filter is missing or too loose (check has vs contains, == vs =~, and the time window).");
  if (user.rows.length < ref.rows.length && user.cols.length === ref.cols.length) notes.push("Too few rows — a filter is too strict, or you filtered a value with the wrong case or type.");
  if (user.cols.length !== ref.cols.length) notes.push(`Column count differs (${user.cols.length} vs ${ref.cols.length}) — check the project / summarize output.`);
  return { f: shape ? 0.3 : 0, notes, why: item.why || "" };
}
