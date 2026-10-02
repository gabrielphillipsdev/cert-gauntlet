/* Cert Gauntlet — card leveling + spaced repetition (ported from Gym Cards, pack-agnostic).
   Level 1: 3-option MC · Level 2: 4-option MC · Level 3: full recall (flip). Two straight rights climb a level;
   at level 3, two straight rights = mastered and the card goes on a doubling interval (2 → 4 → 7 days). */
import { rec, touch, bumpDay, pack } from "./store.js";
import { shuffle } from "./util.js";

const INIT = { seen: 0, right: 0, streak: 0, level: 1, due: 0, ivl: 0 };
export function stat(packId, cd) { return rec(packId, "cards", cd.sid, INIT); }
export function peek(packId, cd) { return pack(packId).cards[cd.sid] || null; }
export function mastered(packId, cd) { const s = peek(packId, cd); return !!s && s.level >= 3 && s.streak >= 2; }
export const isWeak = (packId, cd) => !mastered(packId, cd);
export function isDue(packId, cd) { return mastered(packId, cd) && (peek(packId, cd).due || 0) <= Date.now(); }

/* answer(): returns a toast message or null. */
export function answer(packId, cd, right) {
  const s = touch(stat(packId, cd));
  s.seen++;
  let msg = null;
  if (right) {
    s.right++; s.streak++;
    if (s.level < 3) { if (s.streak >= 2) { s.level++; s.streak = 0; msg = s.level === 3 ? "Level up — full recall" : "Level up — harder choices"; } }
    else if (s.streak >= 2) { s.ivl = s.ivl ? Math.min(s.ivl * 2, 7) : 2; s.due = Date.now() + s.ivl * 86400000; msg = (s.streak === 2 ? "Mastered" : "Still solid") + " — back in " + s.ivl + " day" + (s.ivl > 1 ? "s" : ""); }
  } else {
    s.streak = 0;
    if (s.level === 3 && s.ivl) { s.level = 2; s.ivl = 0; s.due = 0; }
  }
  bumpDay(packId, 1);
  return msg;
}

/* Multiple-choice distractors: same group g, else same category without g. */
export function options(cards, cd, nOpts) {
  const pool = cards.filter(x => x.sid !== cd.sid && x.short !== cd.short && (cd.g ? x.g === cd.g : (x.c === cd.c && !x.g)));
  const seen = new Set([cd.short]); const distractors = [];
  for (const x of shuffle([...pool])) { if (distractors.length >= nOpts - 1) break; if (seen.has(x.short)) continue; seen.add(x.short); distractors.push(x.short); }
  return shuffle([{ t: cd.short, right: true }, ...distractors.map(t => ({ t, right: false }))]);
}
export function pickDeck(packId, cards, k, n = 20) {
  let pool;
  if (k === "all") pool = [...cards];
  else if (k === "weak") { pool = cards.filter(c => isWeak(packId, c)); if (!pool.length) pool = [...cards]; }
  else pool = cards.filter(c => c.c === k);
  return shuffle(pool).slice(0, n);
}
