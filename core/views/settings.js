/* Cert Gauntlet — settings: GitHub sync link, backup & restore, reset, about. */
import { $, esc, ask, toast } from "../util.js";
import { getState, getDevice, replaceState, resetPack, pack } from "../store.js";
import { link, unlink, pull, syncStatus, SYNC_LABEL } from "../sync.js";
import { importLegacy, mergeState } from "../merge.js";

export function renderSettings(A) {
  const dev = getDevice(); const st = syncStatus();
  A.el.innerHTML = `<div class="tb"><button data-back>Back</button><div class="labtitle">Settings</div></div>
  <div class="box"><div class="bx-t">Sync across devices <span class="sync ${st}">${SYNC_LABEL[st]}</span></div>
  ${dev.token ? `<div class="bx-s">Linked to GitHub${dev.owner ? " as <b>" + esc(dev.owner) + "</b>" : ""}. Progress lives in a secret Gist on your account and merges record-by-record, so iPhone and iPad can both be open. In-progress exams sync too.</div><div class="bx-row"><button id="syncnow">Sync now</button><button id="unlink" class="danger">Unlink this device</button></div>`
      : `<div class="bx-s">Paste a GitHub <b>fine-grained token</b> with only <b>Gists: read &amp; write</b>. It's stored on this device only. Same token on every device = same progress. Your old Sec+ Gym Cards progress is imported automatically the first time.</div><input id="tok" type="password" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false" data-keyrow="off"><button id="linkbtn" class="bigbtn amber">Link GitHub</button><div id="linkmsg" class="msg"></div>`}
  </div>
  <div class="box"><div class="bx-t">Backup &amp; restore</div><div class="bx-s">Export saves everything for every cert to one JSON file. Import restores from a Cert Gauntlet backup, or from an old Sec+/Net+ Gym Cards backup. Do an export once a week.</div><div class="bx-row"><button id="bkexport" class="primary">Export backup</button><button id="bkimport">Import backup…</button><input id="bkfile" type="file" accept=".json,application/json" hidden></div><div id="bkmsg" class="msg"></div></div>
  <div class="box"><div class="bx-t">This cert</div><div class="bx-s">Wipe all progress for <b>${esc(A.manifest.name)}</b> on every device. Everything else stays.</div><div class="bx-row"><button id="resetpack" class="danger">Reset ${esc(A.manifest.short)} progress</button></div></div>
  <div class="box about"><div class="bx-t">Cert Gauntlet</div><div class="bx-s">Built by Gabe Phillips. Source: <a href="https://github.com/gabrielphillipsdev/cert-gauntlet" target="_blank" rel="noopener">github.com/gabrielphillipsdev/cert-gauntlet</a>. Version ${esc(A.version)}.</div></div>`;
  $("[data-back]", A.el).onclick = () => A.go("home");
  const lb = $("#linkbtn", A.el); if (lb) lb.onclick = async () => { const t = $("#tok", A.el).value.trim(); if (!t) { $("#linkmsg", A.el).textContent = "Paste the token first."; return; } $("#linkmsg", A.el).textContent = "Linking…"; const ok = await link(t); if (ok) { toast("Linked"); renderSettings(A); } else $("#linkmsg", A.el).textContent = "GitHub rejected that token or there's no connection. Check it has Gists read & write and try again."; };
  const sn = $("#syncnow", A.el); if (sn) sn.onclick = async () => { await pull(); renderSettings(A); };
  const ul = $("#unlink", A.el); if (ul) ul.onclick = () => { if (!ask("Unlink GitHub on this device? Progress stays in your Gist and on this device.")) return; unlink(); renderSettings(A); };
  $("#bkexport", A.el).onclick = bkExport;
  $("#bkimport", A.el).onclick = () => { const f = $("#bkfile", A.el); f.value = ""; f.click(); };
  $("#bkfile", A.el).onchange = e => { const f = e.target.files && e.target.files[0]; if (f) bkImport(A, f); };
  $("#resetpack", A.el).onclick = () => { if (!ask(`Wipe all ${A.manifest.name} progress?`)) return; resetPack(A.packId); toast("Reset"); A.go("home"); };
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
function summary(s) { const packs = Object.keys(s.packs || {}); const cards = packs.reduce((a, k) => a + Object.keys(s.packs[k].cards || {}).length, 0); const ex = packs.reduce((a, k) => a + (s.packs[k].examHist || []).length, 0); return `${packs.length} cert${packs.length === 1 ? "" : "s"} · ${cards} cards seen · ${ex} exam${ex === 1 ? "" : "s"}`; }
async function bkExport() {
  const name = `cert-gauntlet-backup-${stamp()}.json`;
  const body = JSON.stringify({ app: "cert-gauntlet", version: 2, exportedAt: new Date().toISOString(), data: getState() }, null, 1);
  const blob = new Blob([body], { type: "application/json" });
  try { const file = new File([blob], name, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: name }); $("#bkmsg").textContent = "Exported " + name; return; } }
  catch (e) { if (e && e.name === "AbortError") { $("#bkmsg").textContent = "Export cancelled."; return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  $("#bkmsg").textContent = "Exported " + name + " (" + summary(getState()) + ").";
}
async function bkImport(A, file) {
  let obj; try { obj = JSON.parse(await file.text()); } catch (e) { $("#bkmsg").textContent = "That file isn't valid JSON."; return; }
  let incoming = null, label = "";
  if (obj && obj.app === "cert-gauntlet" && obj.data && obj.data.packs) { incoming = obj.data; label = "Cert Gauntlet backup"; }
  else if (obj && (obj.app === "secplus" || obj.app === "netplus") && obj.data && obj.data.stats) { incoming = importLegacy(obj.data, obj.app); label = (obj.app === "secplus" ? "Sec+" : "Net+") + " Gym Cards backup"; }
  else if (obj && obj.stats) { incoming = importLegacy(obj, "secplus"); label = "Gym Cards backup"; }
  if (!incoming) { $("#bkmsg").textContent = "That doesn't look like a Cert Gauntlet or Gym Cards backup."; return; }
  const when = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString() : "unknown date";
  if (!ask(`Merge ${label} from ${when}?\n${summary(incoming)}\n\nIt is merged with your current progress (newest record wins), nothing is wiped.`)) return;
  replaceState(mergeState(getState(), incoming));
  $("#bkmsg").textContent = "Merged backup from " + when + ".";
  toast("Backup merged");
}
