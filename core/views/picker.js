/* Cert Gauntlet — cert picker (launch screen). Shows every pack with its status and your progress. */
import { $$, esc } from "../util.js";
import { pack } from "../store.js";
import { listManifests } from "../packs.js";

export async function renderPicker(app) {
  const ms = await listManifests();
  app.el.innerHTML = `<div class="picker"><p class="lead">Pick the exam you're training for. Progress is kept per cert and synced across your devices.</p>${ms.map(m => {
    const p = pack(m.id); const H = p.examHist || []; const last = H[H.length - 1]; const seen = Object.keys(p.cards || {}).length;
    const ready = m.status === "ready";
    const sub = ready ? (seen ? `${seen} cards seen${last ? ` · last exam ${last.scaled} (${last.raw}%)` : ""}` : m.tagline) : (m.tagline || "Coming soon");
    return `<button class="deck cert ${ready ? "" : "soon"}" data-id="${m.id}" ${ready ? "" : "disabled"}><span class="jack" style="background:${m.color}"></span><span><span class="t">${esc(m.name)} <small>${esc(m.code)}</small></span><span class="s">${esc(sub)}</span></span><span class="n">${ready ? (m.examDateDefault ? esc(m.examDateDefault) : "") : "soon"}</span></button>`;
  }).join("")}<p class="small center">Order of play: Security+ → AZ-900 + SC-900 → SC-200 → CCNA (sit by Jan 25, 2027).</p></div>`;
  $$(".deck.cert", app.el).forEach(b => b.onclick = () => app.openPack(b.dataset.id));
}
