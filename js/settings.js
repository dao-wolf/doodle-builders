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
const DEFAULTS = { mode: 'both', weeks: WEEKS.filter(w => w.term === 'Autumn 1').map(w => w.id), letterCase: 'lower', nums: 5, voice: 'natural', myVoice: true, move: 'manual', music: true, diff: 'easy', char: 'bob', unlocked: 1 };
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
}
function fillSettingsUI() {
  const set = (n, v) => { const el = $('settings').querySelector(`input[name=${n}][value="${v}"]`); if (el) el.checked = true; };
  set('mode', S.mode); set('case', S.letterCase); set('nums', S.nums); set('voice', S.voice); set('diff', S.diff); set('move', S.move);
  $('vMine').checked = S.myVoice !== false;
  $('terms').querySelectorAll('[data-week]').forEach(x => { x.checked = S.weeks.includes(x.dataset.week); });
  $('diffHelp').textContent = DIFF[S.diff].help;
  $('unlockAll').textContent = 'Unlock all outposts'; $('resetProg').textContent = 'Start again from outpost 1';
}
function readSettings() {
  const v = n => ($('settings').querySelector(`input[name=${n}]:checked`) || {}).value;
  S.mode = v('mode') || S.mode; S.letterCase = v('case') || S.letterCase; S.nums = +(v('nums') || S.nums); S.voice = v('voice') || S.voice; S.diff = v('diff') || S.diff; S.move = v('move') || S.move;
  S.myVoice = $('vMine').checked;
  S.weeks = [...$('terms').querySelectorAll('[data-week]:checked')].map(x => x.dataset.week);
  $('diffHelp').textContent = DIFF[S.diff].help;
  saveSettings(); syncModeButtons(); if (typeof applyControls === 'function') applyControls();
}
function syncModeButtons() { document.querySelectorAll('.mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode ? 'true' : 'false')); }
