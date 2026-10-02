// Timing + accuracy stats for the subnetting trainer. localStorage only for now.
//
// TODO(engine): when /dev/ENGINE.md lands, replace this with the engine's
// per-record store so results carry `updatedAt` and merge through Gist sync.
// Shape to migrate: one record per attempt
//   { id, type, correct, seconds, at }   (at = epoch ms)
// plus derived rolling stats computed on read, never stored.

const KEY = 'cg.ccna.subnet.stats.v1';
const WINDOW = 20; // rolling average window (correct solves)
export const TARGET_BASIC_SECONDS = 20;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.attempts)) return s;
    }
  } catch {
    /* private mode / blocked storage: run in memory */
  }
  return { attempts: [] };
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function record({ type, correct, seconds }) {
  state.attempts.push({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type,
    correct: !!correct,
    seconds: Math.round(seconds * 10) / 10,
    at: Date.now(),
  });
  if (state.attempts.length > 2000) state.attempts = state.attempts.slice(-2000);
  save();
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// Per-type summary: attempts, accuracy, rolling avg of last N correct solves, best.
export function summary(typeIds) {
  const out = {};
  for (const id of typeIds) {
    const all = state.attempts.filter((a) => a.type === id);
    const correct = all.filter((a) => a.correct);
    const recent = correct.slice(-WINDOW).map((a) => a.seconds);
    out[id] = {
      attempts: all.length,
      correct: correct.length,
      accuracy: all.length ? correct.length / all.length : null,
      rolling: mean(recent),
      best: correct.length ? Math.min(...correct.map((a) => a.seconds)) : null,
      today: all.filter((a) => a.at > Date.now() - 86400e3).length,
    };
  }
  return out;
}

// Rolling average over the last N correct solves across a set of types (IPv4 basics goal).
export function groupRolling(typeIds) {
  const set = new Set(typeIds);
  const recent = state.attempts.filter((a) => a.correct && set.has(a.type)).slice(-WINDOW);
  return { avg: mean(recent.map((a) => a.seconds)), n: recent.length, window: WINDOW };
}

export function todayCount() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return state.attempts.filter((a) => a.at >= since.getTime()).length;
}

export function lastAttempts(n = 10) {
  return state.attempts.slice(-n).reverse();
}

export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function reset() {
  state = { attempts: [] };
  save();
}
