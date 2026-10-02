// Subnet trainer UI. Standalone: no /core imports.
// TODO(engine): mount inside the engine's pack shell and swap stats.js for core stats/sync.

import { TYPES, TYPE_BY_ID, generate, grade } from './generators.js';
import { makeRng } from './rng.js';
import * as stats from './stats.js';

const $ = (id) => document.getElementById(id);
const BASIC_IDS = TYPES.filter((t) => t.basic).map((t) => t.id);
const V4_IDS = TYPES.filter((t) => t.family === 'v4').map((t) => t.id);
const ALL_IDS = TYPES.map((t) => t.id);

const MODES = [
  { id: 'mix-v4', label: 'IPv4 mix', ids: V4_IDS },
  { id: 'basics', label: 'Basics', ids: BASIC_IDS },
  { id: 'mix-all', label: 'Everything', ids: ALL_IDS },
  { id: 'mix-v6', label: 'IPv6 mix', ids: TYPES.filter((t) => t.family === 'v6').map((t) => t.id) },
  ...TYPES.map((t) => ({ id: t.id, label: t.short, ids: [t.id] })),
];

const seedParam = new URLSearchParams(location.search).get('seed');
const rng = makeRng(seedParam ? Number(seedParam) : undefined);

let mode = localStorage.getItem('cg.ccna.subnet.mode') || 'mix-v4';
if (!MODES.some((m) => m.id === mode)) mode = 'mix-v4';
let current = null; // {problem, startedAt, done}
let raf = 0;
let lastType = null;

// ---------- type chips ----------

function renderTypes() {
  const nav = $('types');
  nav.innerHTML = '';
  MODES.forEach((m, i) => {
    if (i === 4) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      nav.appendChild(sep);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.setAttribute('aria-pressed', String(m.id === mode));
    b.addEventListener('click', () => {
      mode = m.id;
      localStorage.setItem('cg.ccna.subnet.mode', mode);
      renderTypes();
      newProblem();
    });
    nav.appendChild(b);
  });
  const pressed = nav.querySelector('[aria-pressed="true"]');
  if (pressed) pressed.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function pickType() {
  const ids = MODES.find((m) => m.id === mode).ids;
  if (ids.length === 1) return ids[0];
  // avoid the same type twice in a row in a mix
  let id;
  do id = rng.pick(ids);
  while (id === lastType && ids.length > 1);
  return id;
}

// ---------- timer ----------

function timerTick() {
  if (!current || current.done) return;
  const t = (performance.now() - current.startedAt) / 1000;
  paintTimer(t);
  raf = requestAnimationFrame(timerTick);
}

function paintTimer(t) {
  const basic = TYPE_BY_ID[current.problem.type].basic;
  const scale = basic ? 40 : 120; // seconds for a full bar; target line sits at 50% = 20s for basics
  $('timerText').textContent = t < 100 ? t.toFixed(1) : Math.round(t);
  $('meterFill').style.width = `${Math.min(100, (t / scale) * 100)}%`;
  const over = basic && t > stats.TARGET_BASIC_SECONDS;
  $('timer').classList.toggle('over', over);
  $('meterFill').classList.toggle('over', over);
}

// ---------- problem rendering ----------

function fieldKindToInputMode(kind) {
  return kind === 'int' || kind === 'cidr' || kind === 'ip4' || kind === 'cidr4' ? 'decimal' : 'text';
}

function newProblem() {
  cancelAnimationFrame(raf);
  const type = pickType();
  lastType = type;
  const problem = generate(type, rng);
  current = { problem, startedAt: performance.now(), done: false };

  $('title').textContent = problem.title;
  $('prompt').textContent = problem.prompt || '';
  const given = $('given');
  given.innerHTML = '';
  for (const g of problem.given) {
    const dt = document.createElement('dt');
    dt.textContent = g.label;
    const dd = document.createElement('dd');
    dd.textContent = g.value;
    if (g.value.length > 22) dd.className = 'long';
    given.append(dt, dd);
  }
  const fields = $('fields');
  fields.innerHTML = '';
  fields.classList.toggle('single', problem.fields.length === 1);
  problem.fields.forEach((f, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.dataset.key = f.key;
    const label = document.createElement('label');
    label.textContent = f.label;
    label.htmlFor = `f-${f.key}`;
    const input = document.createElement('input');
    input.id = `f-${f.key}`;
    input.name = f.key;
    input.type = 'text';
    input.inputMode = fieldKindToInputMode(f.kind);
    input.autocapitalize = 'off';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = i === problem.fields.length - 1 ? 'done' : 'next';
    input.placeholder = f.placeholder || '';
    input.dataset.kind = f.kind;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        advance(input);
      }
    });
    input.addEventListener('focus', () => renderKeyrow(f.kind));
    const verdict = document.createElement('div');
    verdict.className = 'verdict';
    wrap.append(label, input, verdict);
    fields.appendChild(wrap);
  });
  $('result').hidden = true;
  $('result').className = 'result';
  $('check').textContent = 'Check';
  $('skip').hidden = false;
  $('timer').className = 'timer';
  $('timerGoal').textContent = TYPE_BY_ID[type].basic ? `target ${stats.TARGET_BASIC_SECONDS}s` : 'no time target';
  document.querySelector('.meter-target').style.display = TYPE_BY_ID[type].basic ? '' : 'none';
  paintTimer(0);
  renderKeyrow(problem.fields[0].kind);
  $('keyrow').hidden = false;
  syncKeyrowHeight();
  // focus without scrolling the page under the keyboard
  const first = fields.querySelector('input');
  first.focus({ preventScroll: true });
  raf = requestAnimationFrame(timerTick);
}

function advance(input) {
  const inputs = [...$('fields').querySelectorAll('input')];
  const i = inputs.indexOf(input);
  if (current.done) return newProblem();
  if (i < inputs.length - 1) inputs[i + 1].focus({ preventScroll: true });
  else submit();
}

function submit() {
  if (!current || current.done) return newProblem();
  cancelAnimationFrame(raf);
  current.done = true;
  const seconds = (performance.now() - current.startedAt) / 1000;
  const input = {};
  for (const el of $('fields').querySelectorAll('input')) input[el.name] = el.value;
  const res = grade(current.problem, input);

  for (const wrap of $('fields').querySelectorAll('.field')) {
    const part = res.parts[wrap.dataset.key];
    wrap.classList.add(part.ok ? 'ok' : 'bad');
    const v = wrap.querySelector('.verdict');
    v.textContent = '';
    if (part.ok) v.textContent = '✓';
    else {
      v.textContent = part.expected;
      if (part.note) {
        const em = document.createElement('em');
        em.textContent = `  ${part.note}`;
        v.appendChild(em);
      }
    }
  }
  const r = $('result');
  r.hidden = false;
  r.className = `result ${res.correct ? 'good' : 'poor'}`;
  const basic = TYPE_BY_ID[current.problem.type].basic;
  const verdict = res.correct ? 'Correct' : 'Not quite';
  const timeNote = res.correct && basic ? (seconds <= stats.TARGET_BASIC_SECONDS ? ' — under target' : ` — ${(seconds - stats.TARGET_BASIC_SECONDS).toFixed(1)}s over target`) : '';
  r.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = `${verdict} in ${seconds.toFixed(1)}s${timeNote}.`;
  r.appendChild(strong);
  if (res.note) r.append(` ${res.note}`);
  r.append(' Enter or Next for another.');

  $('timer').classList.add('stopped', res.correct ? 'ok' : 'bad');
  $('keyrow').hidden = true;
  $('check').textContent = 'Next';
  $('skip').hidden = true;
  stats.record({ type: current.problem.type, correct: res.correct, seconds });
  renderStats();
  // keep keyboard focus on something so Enter still works
  $('check').focus({ preventScroll: true });
}

// ---------- key row ----------

const KEYS_V4 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '/'];
const KEYS_V6 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f', ':', '::', '/'];
let keyrowKind = null;

function renderKeyrow(kind) {
  const v6 = kind === 'ip6' || kind === 'cidr6';
  const want = v6 ? 'v6' : 'v4';
  if (keyrowKind === want) return;
  keyrowKind = want;
  const row = $('keyrow');
  row.innerHTML = '';
  row.className = `keyrow ${want}`;
  const mk = (text, cls, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (cls) b.className = cls;
    // pointerdown + preventDefault keeps the input focused and the keyboard open
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fn();
    });
    row.appendChild(b);
  };
  for (const k of v6 ? KEYS_V6 : KEYS_V4) mk(k, k.length > 1 ? 'wide' : '', () => insert(k));
  syncKeyrowHeight();
  mk('⌫', 'wide', backspace);
  mk('Next', 'wide go', () => {
    const el = activeInput();
    if (el) advance(el);
    else submit();
  });
}

function activeInput() {
  const el = document.activeElement;
  return el && el.tagName === 'INPUT' && el.closest('#fields') ? el : $('fields').querySelector('input');
}

function insert(text) {
  const el = activeInput();
  if (!el || current.done) return;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  const s = el.selectionStart ?? el.value.length;
  const e = el.selectionEnd ?? el.value.length;
  el.setRangeText(text, s, e, 'end');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspace() {
  const el = activeInput();
  if (!el || current.done) return;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  const s = el.selectionStart ?? el.value.length;
  const e = el.selectionEnd ?? el.value.length;
  if (s !== e) el.setRangeText('', s, e, 'end');
  else if (s > 0) el.setRangeText('', s - 1, s, 'end');
}

function syncKeyrowHeight() {
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--keyrow-h', `${$('keyrow').offsetHeight}px`);
  });
}

// Keep the key row glued to the top of the on-screen keyboard (iOS Safari).
function trackKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb-offset', `${offset}px`);
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}

// ---------- stats panel ----------

function fmtS(x) {
  return x == null ? '–' : `${x.toFixed(1)}s`;
}

function renderStats() {
  const g = stats.groupRolling(BASIC_IDS);
  const goal = $('goal');
  goal.innerHTML = '';
  const big = document.createElement('div');
  big.className = 'big ' + (g.avg == null ? '' : g.avg <= stats.TARGET_BASIC_SECONDS ? 'hit' : 'miss');
  big.textContent = g.avg == null ? '–' : `${g.avg.toFixed(1)}s`;
  const what = document.createElement('div');
  what.className = 'what';
  what.textContent = 'IPv4 basics, rolling average';
  const how = document.createElement('div');
  how.className = 'how';
  how.textContent =
    g.n === 0
      ? `Target ${stats.TARGET_BASIC_SECONDS}s. Solve a few to start the clock.`
      : g.avg <= stats.TARGET_BASIC_SECONDS
        ? `Under the ${stats.TARGET_BASIC_SECONDS}s target over your last ${g.n} correct${g.n < g.window ? ` (window fills at ${g.window})` : ''}.`
        : `${(g.avg - stats.TARGET_BASIC_SECONDS).toFixed(1)}s over the ${stats.TARGET_BASIC_SECONDS}s target, last ${g.n} correct. ${stats.todayCount()} today.`;
  goal.append(big, what, how);

  const s = stats.summary(ALL_IDS);
  const tbody = $('statTable').querySelector('tbody');
  tbody.innerHTML = '';
  for (const t of TYPES) {
    const row = s[t.id];
    const tr = document.createElement('tr');
    const cells = [
      [t.short, ''],
      [fmtS(row.rolling), t.basic && row.rolling != null ? (row.rolling <= stats.TARGET_BASIC_SECONDS ? 'hit' : 'miss') : ''],
      [fmtS(row.best), 'dim'],
      [row.accuracy == null ? '–' : `${Math.round(row.accuracy * 100)}%`, ''],
      [String(row.attempts), 'dim'],
    ];
    for (const [text, cls] of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  const recent = $('recent');
  recent.innerHTML = '';
  for (const a of stats.lastAttempts(12)) {
    const sp = document.createElement('span');
    sp.className = a.correct ? 'ok' : 'bad';
    sp.title = TYPE_BY_ID[a.type]?.name || a.type;
    sp.textContent = `${a.seconds.toFixed(1)}s`;
    recent.appendChild(sp);
  }
}

// ---------- wiring ----------

$('problem').addEventListener('submit', (e) => {
  e.preventDefault();
  submit();
});
$('skip').addEventListener('click', () => {
  if (!current || current.done) return;
  // a skip counts as a miss so the accuracy number stays honest
  stats.record({ type: current.problem.type, correct: false, seconds: (performance.now() - current.startedAt) / 1000 });
  renderStats();
  newProblem();
});
$('statsBtn').addEventListener('click', () => {
  const panel = $('statsPanel');
  panel.hidden = !panel.hidden;
  $('statsBtn').setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('exportBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(stats.exportJson());
    $('exportBtn').textContent = 'Copied';
    setTimeout(() => ($('exportBtn').textContent = 'Copy stats JSON'), 1500);
  } catch {
    prompt('Stats JSON', stats.exportJson());
  }
});
$('resetBtn').addEventListener('click', () => {
  if ($('resetBtn').dataset.armed) {
    stats.reset();
    renderStats();
    $('resetBtn').textContent = 'Reset stats';
    delete $('resetBtn').dataset.armed;
  } else {
    $('resetBtn').dataset.armed = '1';
    $('resetBtn').textContent = 'Tap again to reset';
    setTimeout(() => {
      delete $('resetBtn').dataset.armed;
      $('resetBtn').textContent = 'Reset stats';
    }, 3000);
  }
});
document.addEventListener('keydown', (e) => {
  // Enter anywhere after grading -> next problem
  if (e.key === 'Enter' && current && current.done) {
    e.preventDefault();
    newProblem();
  }
});

renderTypes();
renderStats();
trackKeyboard();
newProblem();
