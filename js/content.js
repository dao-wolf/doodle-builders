// Learning content (Little Wandle Reception graphemes, numbers, spoken lines) and the outpost levels and themes.
'use strict';

// ------------------------------------------------------------------ phonics + numbers content
// Little Wandle Letters and Sounds Revised, Reception: new graphemes week by week.
const G = {
  s: ['s', 'sun', '☀️', 'sss'], a: ['a', 'ant', '🐜', 'a'], t: ['t', 'tiger', '🐯', 't'], p: ['p', 'pig', '🐷', 'p'],
  i: ['i', 'insect', '🐞', 'i'], n: ['n', 'nose', '👃', 'nnn'], m: ['m', 'moon', '🌙', 'mmm'], d: ['d', 'dog', '🐶', 'd'],
  g: ['g', 'goat', '🐐', 'g'], o: ['o', 'octopus', '🐙', 'o'], c: ['c', 'cake', '🎂', 'c'], k: ['k', 'kite', '🪁', 'k'],
  ck: ['ck', 'duck', '🦆', 'ck'], e: ['e', 'egg', '🥚', 'e'], u: ['u', 'umbrella', '☂️', 'u'], r: ['r', 'rocket', '🚀', 'rrr'],
  h: ['h', 'house', '🏠', 'h'], b: ['b', 'bus', '🚌', 'b'], f: ['f', 'fish', '🐟', 'fff'], l: ['l', 'lion', '🦁', 'lll'],
  ff: ['ff', 'cliff', '⛰️', 'fff'], ll: ['ll', 'bell', '🔔', 'lll'], ss: ['ss', 'dress', '👗', 'sss'], j: ['j', 'juice', '🧃', 'j'],
  v: ['v', 'volcano', '🌋', 'vvv'], w: ['w', 'web', '🕸️', 'w'], x: ['x', 'fox', '🦊', 'ks'], y: ['y', 'yellow', '💛', 'y'],
  z: ['z', 'zebra', '🦓', 'zzz'], zz: ['zz', 'buzz', '🐝', 'zzz'], qu: ['qu', 'queen', '👑', 'kw'], ch: ['ch', 'chick', '🐤', 'ch'],
  sh: ['sh', 'ship', '🚢', 'shh'], th: ['th', 'think', '🤔', 'th'], ng: ['ng', 'ring', '💍', 'ng'], nk: ['nk', 'wink', '😉', 'nk'],
  ai: ['ai', 'rain', '🌧️', 'ay'], ee: ['ee', 'tree', '🌳', 'ee'], igh: ['igh', 'light', '💡', 'eye'], oa: ['oa', 'boat', '⛵', 'oh'],
  oo_l: ['oo', 'boot', '👢', 'oo'], oo_s: ['oo', 'book', '📖', 'uh'], ar: ['ar', 'car', '🚗', 'ar'], or: ['or', 'fork', '🍴', 'or'],
  ur: ['ur', 'turtle', '🐢', 'ur'], ow: ['ow', 'cow', '🐮', 'ow'], oi: ['oi', 'coin', '🪙', 'oy'], ear: ['ear', 'ear', '👂', 'ear'],
  air: ['air', 'chair', '🪑', 'air'], er: ['er', 'hammer', '🔨', 'er'],
};
const TERMS = [
  ['Autumn 1', [['s', 'a', 't', 'p'], ['i', 'n', 'm', 'd'], ['g', 'o', 'c', 'k'], ['ck', 'e', 'u', 'r'], ['h', 'b', 'f', 'l']]],
  ['Autumn 2', [['ff', 'll', 'ss', 'j'], ['v', 'w', 'x', 'y'], ['z', 'zz', 'qu', 'ch'], ['sh', 'th', 'ng', 'nk']]],
  ['Spring 1', [['ai', 'ee', 'igh', 'oa'], ['oo_l', 'oo_s', 'ar', 'or'], ['ur', 'ow', 'oi', 'ear'], ['air', 'er']]],
];
const WEEKS = TERMS.flatMap(([t, ws]) => ws.map((g, i) => ({ id: `${t}-${i}`, term: t, g })));
const SAME = [['c', 'k', 'ck'], ['f', 'ff'], ['l', 'll'], ['s', 'ss'], ['z', 'zz'], ['oo_l', 'oo_s'], ['x', 'ck'], ['qu', 'k']];
const LOOKALIKE = { b: 'd p', d: 'b p', p: 'b d qu', qu: 'p', m: 'n w', n: 'm h u', u: 'n', w: 'm', i: 'l j', l: 'i', j: 'i y', y: 'j', h: 'n' };
function clashes(a) {
  const out = new Set([a]);
  SAME.forEach(g => { if (g.includes(a)) g.forEach(x => out.add(x)); });
  (LOOKALIKE[a] || '').split(' ').filter(Boolean).forEach(x => out.add(x));
  return out;
}
const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const BLOCK_COLS = [[255, 120, 110], [255, 172, 82], [255, 214, 70], [116, 222, 128], [90, 178, 248], [160, 124, 250], [246, 136, 176]];
const PLANS = { literacy: ['match', 'listen'], numeracy: ['number', 'count'], both: ['match', 'number', 'listen', 'count'] };

const TEXT = {
  find: 'Can you find this one?', which: 'Which one says', yes1: 'Yes!', yes2: 'Brilliant!', yes3: 'Well done!', yes4: 'Super!',
  thatone: 'That one says', letsfind: "Let's find", numfind: 'Find the number', thats: "That's", canyou: 'Can you find', count: "Let's count!",
  collect: 'Collect', gems: 'gems!', gemsdone: 'gems! Brilliant counting!', again: "Let's build again!", place: 'Now tap the glowing shape, to build!',
  hi_bob: "Hi! I'm Bob!", hi_henry: "Hello! I'm Mr Henry!", go_1: "Let's find the pieces for the hilltop hut!", go_2: "Let's find the pieces for the treehouse!",
  go_3: "Let's find the pieces for the lighthouse!", go_4: "Let's find the pieces for the snow castle!", found: 'You found', took: 'Oh no! A Nibbler took',
  later: "Don't worry, we can get it back later.", gone: 'Quick! Keep the other pieces safe!', gotback: 'Hooray! You got it back!',
  nib_bob: 'Oh no, Nibblers! Press the big sneeze button, to blow them away!', nib_henry: 'Oh no, Nibblers! Do a big trump, to blow them away!',
  pardon: 'Oops! Pardon me!', arrive: "We made it! Now let's build!", recover: "Let's get back", build: "Let's build",
  kept: 'We built it with the pieces we kept. Well done!', done: "Hooray! It's finished! Brilliant building!",
  pc_floor: 'the floor!', pc_walls: 'the wooden walls!', pc_doorwin: 'the door and the windows!', pc_roof: 'the roof!', pc_chimney: 'the chimney!',
  pc_flag: 'the flag!', pc_trunk: 'the tree trunk!', pc_ladder: 'the ladder!', pc_platform: 'the platform!', pc_hut: 'the little house!',
  pc_leaves: 'the leafy roof!', pc_rocks: 'the rocks!', pc_tower: 'the tower!', pc_door: 'the front door!', pc_balcony: 'the balcony!',
  pc_lamp: 'the big lamp!', pc_cap: 'the top!', pc_gate: 'the castle gate!', pc_towers: 'the two towers!', pc_top: 'the castle top!',
  pc_flags: 'the flags!', pc_snowwalls: 'the snowy walls!',
};
NUMWORD.forEach((w, i) => { if (i) TEXT['n' + i] = w + '!'; });
Object.keys(G).forEach(k => { TEXT['s_' + k] = G[k][3] + '…'; TEXT['w_' + k] = 'like ' + G[k][1] + '!'; });

// ------------------------------------------------------------------ outposts (levels)
const row = (r, c0, c1, t) => { const o = []; for (let c = c0; c <= c1; c++) o.push({ c, r, t }); return o; };
function rect(r0, r1, c0, c1, t, skip = []) {
  const o = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!skip.some(([sc, sr]) => sc === c && sr === r)) o.push({ c, r, t: typeof t === 'function' ? t(c, r) : t });
  return o;
}
const LEVELS = [
  { name: 'Hilltop Hut', go: 'go_1', theme: 'meadow', pieces: [
    { clip: 'pc_floor', blocks: row(0, -3, 3, 'stone') },
    { clip: 'pc_walls', blocks: rect(1, 3, -3, 3, c => Math.abs(c) === 3 ? 'log' : 'plank', [[0, 1], [0, 2], [-2, 2], [2, 2]]) },
    { clip: 'pc_doorwin', blocks: [{ c: 0, r: 1, t: 'door' }, { c: 0, r: 2, t: 'doortop' }, { c: -2, r: 2, t: 'window' }, { c: 2, r: 2, t: 'window' }] },
    { clip: 'pc_roof', blocks: [...row(4, -4, 4, 'roof'), ...row(5, -3, 3, 'roof'), ...row(6, -2, 2, 'roof'), ...row(7, -1, 1, 'roof'), ...row(8, 0, 0, 'roof')] },
    { clip: 'pc_chimney', blocks: [{ c: 2, r: 6, t: 'brick' }, { c: 2, r: 7, t: 'brick' }], smoke: true },
    { clip: 'pc_flag', blocks: [{ c: 0, r: 9, t: 'pole' }, { c: 0, r: 10, t: 'pole' }, { c: 0, r: 11, t: 'pole' }, { c: 1, r: 11, t: 'flag' }, { c: 2, r: 11, t: 'flag' }, { c: 1, r: 10, t: 'flag' }, { c: 2, r: 10, t: 'flag' }] },
  ] },
  { name: 'Treehouse', go: 'go_2', theme: 'forest', pieces: [
    { clip: 'pc_trunk', blocks: [...rect(0, 4, -0.5, 0.5, 'log'), { c: 1.5, r: 0, t: 'log' }] },
    { clip: 'pc_ladder', blocks: rect(0, 4, -1.5, -1.5, 'ladder') },
    { clip: 'pc_platform', blocks: row(5, -4, 4, 'plank') },
    { clip: 'pc_hut', blocks: rect(6, 7, -3, 3, (c, r) => (r === 7 && Math.abs(c) === 2) ? 'window' : (c === 0 && r === 6) ? 'door' : 'plank') },
    { clip: 'pc_leaves', blocks: [...row(8, -4, 4, 'leaf'), ...row(9, -3, 3, 'leaf'), ...row(10, -2, 2, 'leaf')] },
    { clip: 'pc_flag', blocks: [{ c: 0, r: 11, t: 'pole' }, { c: 0, r: 12, t: 'pole' }, { c: 1, r: 12, t: 'flag' }, { c: 2, r: 12, t: 'flag' }] },
  ] },
  { name: 'Lighthouse', go: 'go_3', theme: 'beach', pieces: [
    { clip: 'pc_rocks', blocks: [...row(0, -3, 3, 'rock'), ...row(1, -2, 2, 'rock')] },
    { clip: 'pc_tower', blocks: rect(2, 9, -1, 1, (c, r) => (c === 0 && r === 7) ? 'window' : (Math.floor((r - 2) / 2) % 2 ? 'white' : 'red'), [[0, 2], [0, 3]]) },
    { clip: 'pc_door', blocks: [{ c: 0, r: 2, t: 'door' }, { c: 0, r: 3, t: 'doortop' }] },
    { clip: 'pc_balcony', blocks: row(10, -2, 2, 'plank') },
    { clip: 'pc_lamp', blocks: row(11, -1, 1, 'glass'), beam: true },
    { clip: 'pc_cap', blocks: [...row(12, -1, 1, 'roof')] },
  ] },
  { name: 'Snow Castle', go: 'go_4', theme: 'snow', pieces: [
    { clip: 'pc_floor', blocks: row(0, -5, 5, 'stone') },
    { clip: 'pc_snowwalls', blocks: rect(1, 3, -3, 3, 'snow', [[0, 1], [0, 2]]) },
    { clip: 'pc_gate', blocks: [{ c: 0, r: 1, t: 'door' }, { c: 0, r: 2, t: 'doortop' }] },
    { clip: 'pc_towers', blocks: [...rect(1, 6, -5, -4, (c, r) => r === 4 && c === -4 ? 'window' : 'stone'), ...rect(1, 6, 4, 5, (c, r) => r === 4 && c === 4 ? 'window' : 'stone')] },
    { clip: 'pc_top', blocks: [{ c: -3, r: 4, t: 'snow' }, { c: -1, r: 4, t: 'snow' }, { c: 1, r: 4, t: 'snow' }, { c: 3, r: 4, t: 'snow' }, ...row(7, -5, -4, 'iceroof'), ...row(7, 4, 5, 'iceroof')] },
    { clip: 'pc_flags', blocks: [{ c: -4.5, r: 8, t: 'pole' }, { c: -4.5, r: 9, t: 'pole' }, { c: -3.5, r: 9, t: 'flag' }, { c: 4.5, r: 8, t: 'pole' }, { c: 4.5, r: 9, t: 'pole' }, { c: 3.5, r: 9, t: 'flag' }] },
  ] },
];
function extentOf(blocks) {
  let c0 = 1e9, c1 = -1e9, r0 = 1e9, r1 = -1e9;
  blocks.forEach(b => { c0 = Math.min(c0, b.c); c1 = Math.max(c1, b.c); r0 = Math.min(r0, b.r); r1 = Math.max(r1, b.r); });
  return { c0, c1, r0, r1, w: (c1 - c0 + 1) * BS, h: (r1 - r0 + 1) * BS };
}
LEVELS.forEach(L => { L.pieces.forEach(p => { p.ext = extentOf(p.blocks); }); L.ext = extentOf(L.pieces.flatMap(p => p.blocks)); });

const THEMES = {
  meadow: { sky: ['#5aa6f7', '#a7d4ff', '#ffd9b0'], far: [150, 190, 170], near: [104, 168, 112], top: [110, 196, 70], lip: [96, 182, 58], dirt: [134, 94, 62], leaf: [70, 165, 55], trees: ['oak', 'oak', 'pine'], small: ['flower', 'flower', 'rock'] },
  forest: { sky: ['#4b93d1', '#9bd0e4', '#f1e6c2'], far: [88, 136, 116], near: [58, 116, 72], top: [84, 168, 62], lip: [70, 148, 50], dirt: [108, 78, 52], leaf: [52, 138, 58], trees: ['pine', 'pine', 'oak'], small: ['mushroom', 'flower', 'rock'] },
  beach: { sky: ['#3a9df0', '#93d6ff', '#fff1cc'], far: [86, 168, 226], near: [226, 206, 150], top: [242, 218, 150], lip: [228, 202, 130], dirt: [214, 178, 112], leaf: [74, 170, 70], trees: ['palm'], small: ['shell', 'shell', 'rock'], sea: true },
  snow: { sky: ['#7fa9d8', '#c9def2', '#f3eef8'], far: [196, 212, 232], near: [222, 232, 246], top: [246, 250, 255], lip: [226, 234, 246], dirt: [146, 166, 194], leaf: [60, 120, 90], trees: ['snowpine'], small: ['snowman', 'rock'], snow: true },
};
