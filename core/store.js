/* Cert Gauntlet — state store. Owns the in-memory state, localStorage persistence, and the
   "something changed" signal that sync.js listens to. Views never touch localStorage directly. */
import { emptyState, emptyPack, mergeState, STATE_VERSION } from "./merge.js";
import { dkey, emit } from "./util.js";

const KEY = "cg-state-v2";          // synced state (whole document, merged)
const DEVICE_KEY = "cg-device";     // per-device, never synced: {cert, token, gistId, owner}

let state = emptyState();
let device = { cert: "", token: "", gistId: "", owner: "" };

function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota / private mode */ } }

export function loadLocal() {
  const s = lsGet(KEY);
  if (s && s.v === STATE_VERSION) state = mergeState(emptyState(), s);
  const d = lsGet(DEVICE_KEY); if (d) device = { ...device, ...d };
  return state;
}
export function getState() { return state; }
export function replaceState(next) { state = mergeState(emptyState(), next); persist(true); }
export function adoptMerged(next) { state = next; lsSet(KEY, state); emit("state", state); }

/* persist(): write locally and tell sync there's something to push. */
export function persist(push = true) {
  lsSet(KEY, state);
  emit("state", state);
  if (push) emit("dirty");
}

/* ---------- device-local settings ---------- */
export function getDevice() { return device; }
export function setDevice(patch) { device = { ...device, ...patch }; lsSet(DEVICE_KEY, device); }

/* ---------- pack-scoped accessors ---------- */
export function pack(packId) {
  if (!state.packs[packId]) state.packs[packId] = emptyPack();
  return state.packs[packId];
}
export const now = () => Date.now();

/* Record helpers: each returns the live record, stamping u on write via touch(). */
export function rec(packId, bucket, key, init) {
  const p = pack(packId);
  if (!p[bucket][key]) p[bucket][key] = { ...init, u: 0 };
  return p[bucket][key];
}
export function touch(r) { r.u = now(); return r; }

export function bumpDay(packId, n = 1) {
  const p = pack(packId); const k = dkey();
  p.days[k] = (p.days[k] || 0) + n;
  state.settings.lastStudy = now();
}
export function setScalar(packId, name, value) { pack(packId)[name] = { v: value, u: now() }; }
export function getScalar(packId, name, def = null) { const s = pack(packId)[name]; return s && s.v !== undefined ? s.v : def; }
export function getRemind() { return state.settings.remind?.v || { on: true, hours: 4 }; }
export function setRemind(v) { state.settings.remind = { v, u: now() }; }
export function lastStudy() { return state.settings.lastStudy || 0; }

export function resetPack(packId) { state.packs[packId] = emptyPack(); persist(); }

/* ---------- in-progress exam (synced as its own Gist file) ---------- */
const XK = "cg-exam-inprogress";
let inprog = {};
export function loadInprogLocal() { inprog = lsGet(XK) || {}; return inprog; }
export function getInprog(packId) { const x = inprog[packId]; return x && !x.deleted ? x : null; }
export function setInprog(packId, xs, quiet = false) {
  if (xs) { xs.u = now(); inprog[packId] = xs; } else inprog[packId] = { deleted: true, u: now() }; // tombstone: other devices drop it too
  lsSet(XK, inprog); if (!quiet) emit("inprog");
}
export function allInprog() { return inprog; }
export function adoptInprog(remote) {
  /* newest u wins per pack; tombstones are kept (tiny) so a finished attempt never resurrects */
  const out = { ...inprog };
  for (const [k, v] of Object.entries(remote || {})) if (!out[k] || (v.u || 0) > (out[k].u || 0)) out[k] = v;
  inprog = out; lsSet(XK, inprog);
}
export const clearInprog = (packId) => setInprog(packId, null);
