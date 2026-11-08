// The learning rules: what the game teaches (curriculum) and what it asks (questions). This file never touches the
// page, the canvas or sound, so the unit tests run it in Node (tests/). The words it uses are in docs/domain.md.
// Anything random takes a `random` function (default Math.random), so the tests can repeat a run exactly.
'use strict';

// ------------------------------------------------------------------ curriculum
// Little Wandle Letters and Sounds Revised, Reception: new graphemes week by week.
// Each grapheme: [how it's written, a word that has it, how to say its sound].
const G = {
  s: ['s', 'sun', 'sss'], a: ['a', 'ant', 'a'], t: ['t', 'tiger', 't'], p: ['p', 'pig', 'p'],
  i: ['i', 'insect', 'i'], n: ['n', 'nose', 'nnn'], m: ['m', 'moon', 'mmm'], d: ['d', 'dog', 'd'],
  g: ['g', 'goat', 'g'], o: ['o', 'octopus', 'o'], c: ['c', 'cake', 'c'], k: ['k', 'kite', 'k'],
  ck: ['ck', 'duck', 'ck'], e: ['e', 'egg', 'e'], u: ['u', 'umbrella', 'u'], r: ['r', 'rocket', 'rrr'],
  h: ['h', 'house', 'h'], b: ['b', 'bus', 'b'], f: ['f', 'fish', 'fff'], l: ['l', 'lion', 'lll'],
  ff: ['ff', 'cliff', 'fff'], ll: ['ll', 'bell', 'lll'], ss: ['ss', 'dress', 'sss'], j: ['j', 'juice', 'j'],
  v: ['v', 'volcano', 'vvv'], w: ['w', 'web', 'w'], x: ['x', 'fox', 'ks'], y: ['y', 'yellow', 'y'],
  z: ['z', 'zebra', 'zzz'], zz: ['zz', 'buzz', 'zzz'], qu: ['qu', 'queen', 'kw'], ch: ['ch', 'chick', 'ch'],
  sh: ['sh', 'ship', 'shh'], th: ['th', 'think', 'th'], ng: ['ng', 'ring', 'ng'], nk: ['nk', 'wink', 'nk'],
  ai: ['ai', 'rain', 'ay'], ee: ['ee', 'tree', 'ee'], igh: ['igh', 'light', 'eye'], oa: ['oa', 'boat', 'oh'],
  oo_l: ['oo', 'boot', 'oo'], oo_s: ['oo', 'book', 'uh'], ar: ['ar', 'car', 'ar'], or: ['or', 'fork', 'or'],
  ur: ['ur', 'turtle', 'ur'], ow: ['ow', 'cow', 'ow'], oi: ['oi', 'coin', 'oy'], ear: ['ear', 'ear', 'ear'],
  air: ['air', 'chair', 'air'], er: ['er', 'hammer', 'er'],
};
const TERMS = [
  ['Autumn 1', [['s', 'a', 't', 'p'], ['i', 'n', 'm', 'd'], ['g', 'o', 'c', 'k'], ['ck', 'e', 'u', 'r'], ['h', 'b', 'f', 'l']]],
  ['Autumn 2', [['ff', 'll', 'ss', 'j'], ['v', 'w', 'x', 'y'], ['z', 'zz', 'qu', 'ch'], ['sh', 'th', 'ng', 'nk']]],
  ['Spring 1', [['ai', 'ee', 'igh', 'oa'], ['oo_l', 'oo_s', 'ar', 'or'], ['ur', 'ow', 'oi', 'ear'], ['air', 'er']]],
];
const WEEKS = TERMS.flatMap(([t, ws]) => ws.map((g, i) => ({ id: `${t}-${i}`, term: t, g })));
// Graphemes a child must never choose between: two ways to write one sound, and letters that look alike
const SAME = [['c', 'k', 'ck'], ['f', 'ff'], ['l', 'll'], ['s', 'ss'], ['z', 'zz'], ['oo_l', 'oo_s'], ['x', 'ck'], ['qu', 'k']];
const LOOKALIKE = { b: 'd p', d: 'b p', p: 'b d qu', qu: 'p', m: 'n w', n: 'm h u', u: 'n', w: 'm', i: 'l j', l: 'i', j: 'i y', y: 'j', h: 'n' };
// The grapheme itself and every grapheme that clashes with it
function clashes(a) {
  const out = new Set([a]);
  SAME.forEach(g => { if (g.includes(a)) g.forEach(x => out.add(x)); });
  (LOOKALIKE[a] || '').split(' ').filter(Boolean).forEach(x => out.add(x));
  return out;
}
// The graphemes of the weeks a grown-up chose, in teaching order; the first week if none is chosen
function chosenGraphemes(weeks) {
  const ids = WEEKS.filter(w => weeks.includes(w.id)).flatMap(w => w.g);
  return ids.length ? ids : WEEKS[0].g.slice();
}
// Every grapheme taught up to the last chosen week, ticked or not
function taughtUpTo(weeks) {
  const last = Math.max(0, ...WEEKS.map((w, i) => weeks.includes(w.id) ? i : 0));
  return WEEKS.slice(0, last + 1).flatMap(w => w.g);
}

// ------------------------------------------------------------------ questions
// The order of question types for each game mode: match (find a letter or sound), number (find a number) and count
const PLANS = { literacy: ['match'], numeracy: ['number', 'count'], both: ['match', 'number', 'count'] };
const KEEP_RECENT = 4;   // a grapheme isn't asked again within this many questions, if there are enough to choose from
const OTHER_ANSWERS = 2; // answers besides the right one

const pickWith = (list, random) => list[Math.floor(random() * list.length)];
function shuffleWith(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const questionType = (mode, asked) => { const plan = PLANS[mode] || PLANS.both; return plan[asked % plan.length]; };
// The grapheme to ask for next, and the recent list to pass next time (a new list: the one given is left alone)
function pickGrapheme(weeks, recent = [], random = Math.random) {
  const chosen = chosenGraphemes(weeks), fresh = chosen.filter(g => !recent.includes(g));
  const grapheme = pickWith(fresh.length ? fresh : chosen, random);
  const keep = Math.min(KEEP_RECENT, chosen.length - 1);
  return { grapheme, recent: keep > 0 ? [...recent, grapheme].slice(-keep) : [] };
}
// Up to n graphemes to offer besides the target, nearest first: the chosen weeks, then every week taught so far,
// then any. None clashes with the target or with another.
function otherGraphemes(target, weeks, n = OTHER_ANSWERS, random = Math.random) {
  const nearestFirst = [chosenGraphemes(weeks), taughtUpTo(weeks), Object.keys(G)]
    .flatMap(group => shuffleWith(group, random))
    .filter((g, i, all) => all.indexOf(g) === i && !clashes(target).has(g));
  const out = [];
  for (const g of nearestFirst) {
    if (out.length === n) break;
    if (out.every(o => !clashes(o).has(g))) out.push(g);
  }
  return out;
}
const letterAnswers = (target, weeks, random = Math.random) => shuffleWith([target, ...otherGraphemes(target, weeks, OTHER_ANSWERS, random)], random);
// A number from 1 to nums, and the answers: it and two other numbers in that range (at least 1 to 3)
function numberQuestion(nums, random = Math.random) {
  const target = 1 + Math.floor(random() * nums);
  const range = Array.from({ length: Math.max(nums, OTHER_ANSWERS + 1) }, (_, i) => i + 1);
  const others = shuffleWith(range.filter(x => x !== target), random).slice(0, OTHER_ANSWERS);
  return { target, answers: shuffleWith([target, ...others], random) };
}
// How many gems to count: 2 to 5 with numbers to 5, 3 to 7 with numbers to 10
const gemsToCount = (nums, random = Math.random) => nums === 10 ? 3 + Math.floor(random() * 5) : 2 + Math.floor(random() * 4);

// Node loads this file for the unit tests; the browser loads it as a plain script and skips this.
if (typeof module === 'object' && module.exports) {
  module.exports = { G, TERMS, WEEKS, SAME, LOOKALIKE, clashes, chosenGraphemes, taughtUpTo,
    PLANS, questionType, pickGrapheme, otherGraphemes, letterAnswers, numberQuestion, gemsToCount };
}
