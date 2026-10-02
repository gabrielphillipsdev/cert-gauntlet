/* Cert Gauntlet — symbol key row for typed modules (KQL Lab, IOS CLI) on phones.
   attachKeyRow(scopeEl, keys) shows a fixed bar above the on-screen keyboard whenever an <input>/<textarea>
   inside scopeEl has focus, and inserts the tapped symbol at the caret. Returns a detach() function.
   keys: array of strings or {label, insert} (e.g. {label:"Tab", insert:"\t"}). */
export const KQL_KEYS = ["|", "==", "!=", "(", ")", "\"", "'", "/", "-", "_", "?", ":", "<", ">", "=", ","];
export const IOS_KEYS = [{ label: "Tab", insert: "\t" }, "?", "/", "-", ".", ":", "_", "|", "!", "{", "}", "[", "]", "#"];

export function attachKeyRow(scopeEl, keys = KQL_KEYS) {
  const bar = document.createElement("div");
  bar.className = "keyrow"; bar.setAttribute("role", "toolbar");
  keys.forEach(k => {
    const def = typeof k === "string" ? { label: k, insert: k } : k;
    const b = document.createElement("button"); b.type = "button"; b.textContent = def.label;
    b.addEventListener("pointerdown", ev => { ev.preventDefault(); insert(def.insert); });
    bar.appendChild(b);
  });
  let active = null;
  function insert(text) {
    const el = active; if (!el) return;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    el.selectionStart = el.selectionEnd = s + text.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }
  function onFocus(ev) {
    const t = ev.target; if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    if (t.dataset.keyrow === "off") return;
    active = t; if (!bar.isConnected) document.body.appendChild(bar); bar.classList.add("show");
  }
  function onBlur() { setTimeout(() => { if (document.activeElement !== active) { bar.classList.remove("show"); } }, 120); }
  scopeEl.addEventListener("focusin", onFocus); scopeEl.addEventListener("focusout", onBlur);
  return () => { scopeEl.removeEventListener("focusin", onFocus); scopeEl.removeEventListener("focusout", onBlur); bar.remove(); };
}
