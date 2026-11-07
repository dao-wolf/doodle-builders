// Grown-up settings: stored on this device, plus the settings dialog.
'use strict';

// ------------------------------------------------------------------ settings
const DIFF = {
  easy: { name: 'Easy', speed: 55, behind: 0, steal: null, nibble: 0, leave: 6, returnP: 0, askSpawn: 0,
    help: 'A few slow Nibblers. They block the path but never take pieces, and they wander off if left alone.' },
  medium: { name: 'Medium', speed: 72, behind: 0.3, steal: 'later', nibble: 1.7, leave: 12, returnP: 0.25, askSpawn: 0,
    help: 'More Nibblers. If they reach your hero they can nibble away a piece. Lost pieces are won back at the building site.' },
  hard: { name: 'Hard', speed: 92, behind: 0.5, steal: 'gone', nibble: 1.2, leave: 0, returnP: 0.5, askSpawn: 14,
    help: 'Lots of persistent Nibblers that come back for more. Stolen pieces are gone for good, so the outpost is built with whatever you keep.' },
};
const DEFAULTS = { mode: 'both', weeks: WEEKS.filter(w => w.term === 'Autumn 1').map(w => w.id), letterCase: 'lower', nums: 5, voice: 'natural', myVoice: true, move: 'manual', music: true, diff: 'easy', char: 'bob', unlocked: 1, seasons: 'auto', seasonOff: '' };
let S = Object.assign({}, DEFAULTS);
try { const saved = JSON.parse(localStorage.getItem('bobs-outpost-settings') || 'null'); if (saved) S = Object.assign(S, saved); } catch (e) { /* storage unavailable */ }
if (!DIFF[S.diff]) S.diff = 'easy';
function saveSettings() { try { localStorage.setItem('bobs-outpost-settings', JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function pool() { let ids = WEEKS.filter(w => S.weeks.includes(w.id)).flatMap(w => w.g); if (!ids.length) ids = TERMS[0][1][0].slice(); return ids; }
function taughtSoFar() { const last = Math.max(0, ...WEEKS.map((w, i) => S.weeks.includes(w.id) ? i : 0)); return WEEKS.slice(0, last + 1).flatMap(w => w.g); }
function showG(id) {
  const g = G[id][0];
  if (S.letterCase === 'upper') return [g.toUpperCase()];
  if (S.letterCase === 'both') return [g[0].toUpperCase() + g.slice(1), g];
  return [g];
}
function buildSettingsUI() {
  $('terms').innerHTML = TERMS.map(([t, ws]) => `
    <div class="term"><div class="termhead"><i>${t}</i><button type="button" data-term="${t}">All of ${t}</button></div>
    <div class="weeks">${ws.map((g, i) => `<label class="wk"><input type="checkbox" id="wk-${t.replace(' ', '')}-${i}" data-week="${t}-${i}"><span>${g.map(x => G[x][0]).join(' ')}</span></label>`).join('')}</div></div>`).join('');
  $('terms').querySelectorAll('[data-term]').forEach(b => b.addEventListener('click', () => {
    const boxes = [...$('terms').querySelectorAll(`[data-week^="${b.dataset.term}-"]`)];
    const allOn = boxes.every(x => x.checked); boxes.forEach(x => { x.checked = !allOn; }); readSettings();
  }));
  $('settings').addEventListener('change', readSettings);
  $('unlockAll').addEventListener('click', () => { S.unlocked = LEVELS.length; saveSettings(); $('unlockAll').textContent = 'All outposts unlocked'; });
  $('resetProg').addEventListener('click', () => { S.unlocked = 1; saveSettings(); $('resetProg').textContent = 'Back to outpost 1'; });
  buildGateUI();
}
// the dialog's radio groups: input name -> setting in S
const RADIOS = { mode: 'mode', case: 'letterCase', nums: 'nums', voice: 'voice', diff: 'diff', move: 'move', seasons: 'seasons' };
function fillSettingsUI() {
  const set = (n, v) => { const el = $('settings').querySelector(`input[name=${n}][value="${v}"]`); if (el) el.checked = true; };
  Object.entries(RADIOS).forEach(([n, k]) => set(n, S[k]));
  $('vMine').checked = S.myVoice !== false;
  $('terms').querySelectorAll('[data-week]').forEach(x => { x.checked = S.weeks.includes(x.dataset.week); });
  $('diffHelp').textContent = DIFF[S.diff].help;
  $('unlockAll').textContent = 'Unlock all outposts'; $('resetProg').textContent = 'Start again from outpost 1';
}
function readSettings() {
  Object.entries(RADIOS).forEach(([n, k]) => { const el = $('settings').querySelector(`input[name=${n}]:checked`); if (el) S[k] = k === 'nums' ? +el.value : el.value; });
  S.myVoice = $('vMine').checked;
  S.weeks = [...$('terms').querySelectorAll('[data-week]:checked')].map(x => x.dataset.week);
  $('diffHelp').textContent = DIFF[S.diff].help;
  saveSettings(); syncModeButtons(); if (typeof applyControls === 'function') { applyControls(); applySeason(); }
}
function syncModeButtons() { document.querySelectorAll('.mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode ? 'true' : 'false')); }

// ------------------------------------------------------------------ grown-ups check
// Holding the Grown-ups or gear button opens this check, then the settings. A grown-up types a number shown only in
// words, such as "forty-seven": young children can't read it, and it is never spoken. Each check has a new number, and
// three wrong answers in a row lock it for a minute, so tapping at random doesn't get in.
const GATE_TRIES = 3, GATE_LOCK_MS = 60000;
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const gate = { answer: '', typed: '', misses: 0, lockedUntil: 0, pass: null };
const numberWords = n => `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}`;
const gateLocked = () => Date.now() < gate.lockedUntil;
function newGateNumber() {
  let n;
  do { n = 21 + Math.floor(Math.random() * 79); } while (n % 10 === 0 || String(n) === gate.answer); // 21 to 99, always two words
  gate.answer = String(n); gate.typed = '';
  $('gateWords').textContent = numberWords(n); showGateEntry();
}
function showGateEntry() { $('gateEntry').textContent = (gate.typed + '__').slice(0, 2).split('').join(' '); }
function showGate() {
  const locked = gateLocked();
  $('gateAsk').textContent = locked ? 'Three wrong answers, so this is locked for a minute.' : 'To open the settings, type this number:';
  ['gateWords', 'gateEntry', 'gateKeys'].forEach(id => { $(id).hidden = locked; });
  $('gate').hidden = false;
  (locked ? $('gateBack') : $('gateKeys').querySelector('button')).focus();
}
function askGrownUp(pass) {
  gate.pass = pass; gate.misses = 0; $('gateMsg').textContent = '';
  if (!gateLocked()) newGateNumber();
  showGate();
}
function closeGate() { $('gate').hidden = true; gate.typed = ''; }
function gateKey(k) {
  if (gateLocked()) return;
  gate.typed = k === 'del' ? gate.typed.slice(0, -1) : gate.typed + k; showGateEntry();
  if (gate.typed.length < 2) return;
  if (gate.typed === gate.answer) { closeGate(); gate.pass(); return; }
  if (++gate.misses >= GATE_TRIES) { gate.lockedUntil = Date.now() + GATE_LOCK_MS; showGate(); return; }
  $('gateMsg').textContent = 'Not quite. Here is a new one.'; newGateNumber();
}
function buildGateUI() {
  $('gateKeys').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0']
    .map(k => k === 'del' ? '<button type="button" class="del" data-key="del">Delete</button>' : `<button type="button" data-key="${k}">${k}</button>`).join('');
  $('gateKeys').addEventListener('click', e => { const b = e.target.closest('button'); if (b) gateKey(b.dataset.key); });
  $('gateBack').addEventListener('click', closeGate);
  $('gate').addEventListener('keydown', e => {
    if (/^[0-9]$/.test(e.key)) gateKey(e.key);
    else if (e.key === 'Backspace') gateKey('del');
    else if (e.key === 'Escape') closeGate();
    else return;
    e.preventDefault();
  });
}
