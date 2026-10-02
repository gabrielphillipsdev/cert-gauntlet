/* Cert Gauntlet — GitHub Gist sync. See dev/SYNC.md.
   Files in the secret Gist:
     cert-gauntlet-state.json     merged study state (merge.js)
     cert-gauntlet-inprog.json    in-progress exams per pack (newest wins)
   Protocol: every push is pull → merge → PATCH, so two devices can both write safely.
   Pull also happens on launch, on focus/visibility, and when the browser comes back online. */
import { mergeState, sameState, importLegacy } from "./merge.js";
import { getState, adoptMerged, getDevice, setDevice, allInprog, adoptInprog, loadInprogLocal } from "./store.js";
import { on, emit } from "./util.js";

const STATE_FILE = "cert-gauntlet-state.json";
const INPROG_FILE = "cert-gauntlet-inprog.json";
const LEGACY_FILES = { secplus: "secplus-state.json", netplus: "netplus-state.json" };
const DESC = "Cert Gauntlet progress";

let status = "unlinked";   // unlinked | syncing | ok | off
let pushTimer = null, pushing = false, pullInFlight = null, wantPush = false;
export const SYNC_LABEL = { ok: "synced", off: "local only", unlinked: "not linked", syncing: "syncing" };
function setStatus(s) { status = s; emit("sync", s); }
export const syncStatus = () => status;

function gh(path, opts = {}) {
  const { token } = getDevice();
  const h = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (opts.body) h["Content-Type"] = "application/json";
  return fetch("https://api.github.com" + path, { method: opts.method || "GET", headers: h, body: opts.body, cache: "no-store" });
}
async function readFile(g, name) {
  const f = g.files && g.files[name]; if (!f) return null;
  let content = f.content;
  if (f.truncated && f.raw_url) { const r = await fetch(f.raw_url, { cache: "no-store" }); content = await r.text(); }
  try { const d = JSON.parse(content || "null"); return d && typeof d === "object" ? d : null; } catch (e) { return null; }
}
/* Find (or create) our gist. Also returns any legacy Gym Cards gists found, for one-time import. */
async function findGist() {
  const dev = getDevice();
  if (dev.gistId) {
    const r = await gh("/gists/" + dev.gistId);
    if (r.ok) return { gist: await r.json(), legacy: [] };
    if (r.status !== 404) return null;
    setDevice({ gistId: "" });
  }
  const r = await gh("/gists?per_page=100"); if (!r.ok) return null;
  const list = await r.json(); if (!Array.isArray(list)) return null;
  const legacy = list.filter(g => g.files && Object.values(LEGACY_FILES).some(f => g.files[f]));
  let hit = list.find(g => g.files && g.files[STATE_FILE]);
  if (!hit) {
    const c = await gh("/gists", { method: "POST", body: JSON.stringify({ description: DESC, public: false, files: { [STATE_FILE]: { content: "{}" } } }) });
    if (!c.ok) return null; hit = await c.json();
  }
  setDevice({ gistId: hit.id, owner: hit.owner?.login || "" });
  const full = await gh("/gists/" + hit.id);
  return { gist: full.ok ? await full.json() : hit, legacy };
}
async function importLegacyGists(legacyList) {
  let st = null;
  for (const g of legacyList) {
    const full = await gh("/gists/" + g.id); if (!full.ok) continue;
    const fg = await full.json();
    for (const [packId, fname] of Object.entries(LEGACY_FILES)) {
      const d = await readFile(fg, fname); if (!d || !d.stats) continue;
      const rename = packId === "secplus" ? SECPLUS_RENAME : {};
      const imported = importLegacy(d, packId, rename);
      st = st ? mergeState(st, imported) : imported;
    }
  }
  return st;
}
/* Sec+ Gym Cards card ids that moved category in the port (malware cards: social → attacks). */
const SECPLUS_RENAME = Object.fromEntries(["Ransomware", "Trojan", "Worm vs virus", "Spyware, keylogger and bloatware", "Logic bomb", "Rootkit"].map(q => ["social|" + q, "attacks|" + q]));

async function patch(files) {
  const { gistId } = getDevice(); if (!gistId) return false;
  const r = await gh("/gists/" + gistId, { method: "PATCH", body: JSON.stringify({ files }) });
  return r.ok;
}

/* pull(): fetch remote, merge with local, adopt; push back if local had anything remote lacked. */
export async function pull() {
  if (!getDevice().token) { setStatus("unlinked"); return false; }
  if (pullInFlight) return pullInFlight;
  pullInFlight = (async () => {
    setStatus("syncing");
    try {
      const found = await findGist(); if (!found) { setStatus("off"); return false; }
      let remote = await readFile(found.gist, STATE_FILE);
      const remoteInprog = await readFile(found.gist, INPROG_FILE);
      const dev = getDevice();
      if ((!remote || !remote.packs) && found.legacy.length && !dev.legacyImported) {
        const imported = await importLegacyGists(found.legacy);
        if (imported) { remote = mergeState(remote || undefined, imported); emit("toast", "Imported your Gym Cards progress"); }
        setDevice({ legacyImported: true });
      }
      const merged = mergeState(getState(), remote || undefined);
      const needPush = !remote || !sameState(merged, mergeState(remote, remote));
      adoptMerged(merged);
      if (remoteInprog) adoptInprog(remoteInprog);
      if (needPush) await patch({ [STATE_FILE]: { content: JSON.stringify(merged) }, [INPROG_FILE]: { content: JSON.stringify(allInprog()) } });
      setStatus("ok"); return true;
    } catch (e) { console.warn("sync pull failed", e); setStatus("off"); return false; }
    finally { pullInFlight = null; }
  })();
  return pullInFlight;
}
/* push(): pull-merge first (cheap insurance), then PATCH. Debounced by schedulePush(). */
export async function push() {
  if (!getDevice().token) { setStatus("unlinked"); return false; }
  if (pushing) { wantPush = true; return false; }
  pushing = true; setStatus("syncing");
  try {
    const found = await findGist(); if (!found) { setStatus("off"); return false; }
    const remote = await readFile(found.gist, STATE_FILE);
    const remoteInprog = await readFile(found.gist, INPROG_FILE);
    const merged = mergeState(getState(), remote || undefined);
    adoptMerged(merged);
    if (remoteInprog) adoptInprog(remoteInprog);
    const ok = await patch({ [STATE_FILE]: { content: JSON.stringify(merged) }, [INPROG_FILE]: { content: JSON.stringify(allInprog()) } });
    setStatus(ok ? "ok" : "off"); return ok;
  } catch (e) { console.warn("sync push failed", e); setStatus("off"); return false; }
  finally { pushing = false; if (wantPush) { wantPush = false; schedulePush(300); } }
}
export function schedulePush(delay = 1500) {
  if (!getDevice().token) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(push, delay);
}
export function flushPush() { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; return push(); } return Promise.resolve(false); }

/* ---------- link / unlink ---------- */
export async function link(token) {
  setDevice({ token: token.trim(), gistId: "" });
  const ok = await pull();
  if (!ok) { setDevice({ token: "", gistId: "" }); setStatus("unlinked"); }
  return ok;
}
export function unlink() { setDevice({ token: "", gistId: "", owner: "" }); setStatus("unlinked"); }

/* ---------- wiring ---------- */
export function initSync() {
  loadInprogLocal();
  on("dirty", () => schedulePush());
  on("inprog", () => schedulePush(3000));
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushPush(); else pull(); });
  window.addEventListener("focus", () => pull());
  window.addEventListener("online", () => pull());
  window.addEventListener("pagehide", () => { flushPush(); });
  if (getDevice().token) pull(); else setStatus("unlinked");
}
