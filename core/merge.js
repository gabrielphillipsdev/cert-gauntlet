/* Cert Gauntlet — pure merge logic for synced state. No DOM, no storage; unit-tested in dev/tests/merge.test.mjs.

   State shape (v2):
   {
     v: 2,
     packs: {
       <packId>: {
         cards:    { <sid>: {seen,right,streak,level,due,ivl,u} },
         pbq:      { <id>:  {attempts,best,u} },
         exq:      { <id>:  {seen,right,last,u} },
         twins:    { <key>: {seen,right,u} },
         sprint:   { <kind>:{best,runs,u} },
         sims:     { <id>:  {attempts,best,u} },
         examHist: [ {id,t,...} ],          // union by id, sorted by t, capped
         readyLog: { <day>: {p,u} },
         days:     { <day>: n },            // max per key
         sessionsDone: n,                   // max
         examDate: {v,u}, studyHours: {v,u} // scalar-with-timestamp
       }
     },
     settings: { remind: {v:{on,hours},u}, lastStudy: n (max) }
   }
   Every record carries u = updatedAt (ms). Newer u wins; equal u → prefer the one with more "progress" (higher seen/attempts) so a retry never loses data. */

export const STATE_VERSION = 2;
export const EXAM_HIST_CAP = 60;

export function emptyPack() {
  return { cards: {}, pbq: {}, exq: {}, twins: {}, sprint: {}, sims: {}, examHist: [], readyLog: {}, days: {}, sessionsDone: 0, examDate: null, studyHours: null };
}
export function emptyState() {
  return { v: STATE_VERSION, packs: {}, settings: { remind: { v: { on: true, hours: 4 }, u: 0 }, lastStudy: 0 } };
}

function newer(a, b, progressKey) {
  if (!a) return b; if (!b) return a;
  const ua = a.u || 0, ub = b.u || 0;
  if (ua !== ub) return ua > ub ? a : b;
  if (progressKey) { const pa = a[progressKey] || 0, pb = b[progressKey] || 0; if (pa !== pb) return pa > pb ? a : b; }
  return a;
}
function mergeRecords(a = {}, b = {}, progressKey) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = newer(a[k], b[k], progressKey);
  return out;
}
function mergeMax(a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = Math.max(a[k] || 0, b[k] || 0);
  return out;
}
function mergeScalar(a, b) { return newer(a, b); }
export function mergeExamHist(a = [], b = []) {
  const by = {};
  for (const h of [...a, ...b]) { if (!h || !h.id) continue; if (!by[h.id] || (h.t || 0) > (by[h.id].t || 0)) by[h.id] = h; }
  const list = Object.values(by).sort((x, y) => (x.t || 0) - (y.t || 0));
  return list.length > EXAM_HIST_CAP ? list.slice(list.length - EXAM_HIST_CAP) : list;
}
export function mergePack(a, b) {
  a = a || emptyPack(); b = b || emptyPack();
  return {
    cards: mergeRecords(a.cards, b.cards, "seen"),
    pbq: mergeRecords(a.pbq, b.pbq, "attempts"),
    exq: mergeRecords(a.exq, b.exq, "seen"),
    twins: mergeRecords(a.twins, b.twins, "seen"),
    sprint: mergeRecords(a.sprint, b.sprint, "runs"),
    sims: mergeRecords(a.sims, b.sims, "attempts"),
    examHist: mergeExamHist(a.examHist, b.examHist),
    readyLog: mergeRecords(a.readyLog, b.readyLog),
    days: mergeMax(a.days, b.days),
    sessionsDone: Math.max(a.sessionsDone || 0, b.sessionsDone || 0),
    examDate: mergeScalar(a.examDate, b.examDate),
    studyHours: mergeScalar(a.studyHours, b.studyHours),
  };
}
export function mergeState(a, b) {
  a = a || emptyState(); b = b || emptyState();
  const packs = {};
  for (const k of new Set([...Object.keys(a.packs || {}), ...Object.keys(b.packs || {})])) packs[k] = mergePack((a.packs || {})[k], (b.packs || {})[k]);
  return {
    v: STATE_VERSION,
    packs,
    settings: {
      remind: mergeScalar(a.settings?.remind, b.settings?.remind) || { v: { on: true, hours: 4 }, u: 0 },
      lastStudy: Math.max(a.settings?.lastStudy || 0, b.settings?.lastStudy || 0),
    },
  };
}
/* Structural equality good enough to decide "do I need to push?" */
export function sameState(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* ---------- Legacy import: Sec+ Gym Cards / Net+ Gym Cards payloads ----------
   {stats,pbq,exq,examHist,studyHours,readyLog,sessionsDone,updatedAt,exam,days,twins,sprint,remindOn,remindHours,lastStudy}
   cardRename: optional map oldSid -> newSid (category moves). */
export function importLegacy(payload, packId, cardRename = {}) {
  const u = payload.updatedAt || 1;
  const p = emptyPack();
  for (const [sid, s] of Object.entries(payload.stats || {})) p.cards[cardRename[sid] || sid] = { ...s, u };
  for (const [id, s] of Object.entries(payload.pbq || {})) p.pbq[id] = { ...s, u };
  for (const [id, s] of Object.entries(payload.exq || {})) p.exq[id] = { ...s, u };
  for (const [k, s] of Object.entries(payload.twins || {})) p.twins[k] = { ...s, u };
  for (const [k, s] of Object.entries(payload.sprint || {})) p.sprint[k] = { ...s, u };
  p.examHist = (payload.examHist || []).map(h => ({ ...h, id: h.id || ("legacy-" + h.t) }));
  for (const [k, s] of Object.entries(payload.readyLog || {})) p.readyLog[k] = { ...s, u };
  p.days = { ...(payload.days || {}) };
  p.sessionsDone = payload.sessionsDone || 0;
  if (payload.exam) p.examDate = { v: payload.exam, u };
  if (+payload.studyHours > 0) p.studyHours = { v: +payload.studyHours, u };
  const st = emptyState();
  st.packs[packId] = p;
  st.settings.remind = { v: { on: !(payload.remindOn === false || payload.remindOn === "no"), hours: +payload.remindHours || 4 }, u };
  st.settings.lastStudy = payload.lastStudy ? (Date.parse(payload.lastStudy) || 0) : 0;
  return st;
}
