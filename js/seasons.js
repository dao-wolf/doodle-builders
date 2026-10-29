// Seasonal themes (Halloween, Christmas): when each one shows, and how it changes the lands, outposts and start screen.
// Costumes are drawn in art.js and seasonal scenery in render.js; game.js switches the look on and off.
'use strict';

// ------------------------------------------------------------------ registry
// Each season shows from `from` to `to` (month-day, both days included). A window may cross the new year.
const along = (r, c0, c1, v) => { const o = {}; for (let c = c0; c <= c1; c++) o[`${c},${r}`] = v; return o; };
const LEAVES = { n: 24, size: [3, 6], speed: [16, 32], cols: ['#e8772e', '#c8501e', '#f2b134', '#9a5a2a'] };
const SEASONS = {
  halloween: {
    name: 'Halloween', from: '10-15', to: '11-03',
    party: ['#ff8a1f', '#ffd23f', '#a26bfa', '#7ee07a', '#ffffff'],
    card: { sky: '#4b3a7e', ground: '#4f7a3a', lip: '#6b9a4a', prop: 'pumpkin', dots: '#fff6cf' },
    lands: {
      all: { light: 'moon', stars: true, bats: true, cloud: 'rgba(196,172,228,.4)', fall: LEAVES },
      meadow: { sky: ['#2e2160', '#7a4f9e', '#f2a066'], far: [96, 74, 136], near: [66, 108, 76], top: [106, 156, 64], lip: [90, 138, 52], dirt: [104, 72, 50], leaf: [226, 124, 44], small: ['pumpkin', 'pumpkin', 'ghost', 'flower'] },
      forest: { sky: ['#291c58', '#6c4794', '#e8925e'], far: [78, 64, 118], near: [52, 92, 70], top: [92, 142, 58], lip: [78, 124, 48], dirt: [96, 68, 46], leaf: [214, 104, 40], trees: ['oak', 'oak', 'pine'], small: ['pumpkin', 'mushroom', 'ghost'] },
      beach: { sky: ['#2c2468', '#7458a6', '#f4ac70'], far: [74, 96, 168], near: [196, 170, 132], top: [226, 196, 140], lip: [208, 178, 120], dirt: [190, 154, 98], leaf: [210, 128, 52], small: ['pumpkin', 'shell', 'ghost'] },
      snow: { sky: ['#30285e', '#6e5a9c', '#d8a6b8'], far: [150, 150, 196], near: [196, 200, 230], fall: null, small: ['pumpkin', 'snowman', 'ghost'] },
    },
    skins: { // the outposts keep their shapes; only how some blocks look changes
      types: { roof: 'hroof', iceroof: 'hroof', flag: 'hflag', window: 'jackwin', leaf: 'aleaf', red: 'orange' },
      outposts: [ // in LEVELS order, by block 'column,row': swap draws a different block, over draws on top
        { swap: { '-3,0': 'pumpkin', '3,0': 'pumpkin' }, over: { '-3,3': 'web', '3,3': 'web' } },
        { swap: { '-4,5': 'pumpkin', '4,5': 'pumpkin' }, over: { '-3,7': 'web', '3,7': 'web' } },
        { swap: { '-3,0': 'pumpkin', '3,0': 'pumpkin', '0,7': 'ghostwin' }, over: { '-1,9': 'web' } },
        { swap: { '-5,0': 'pumpkin', '5,0': 'pumpkin' }, over: { '-5,6': 'web', '5,6': 'web' } },
      ],
    },
  },
  christmas: {
    name: 'Christmas', from: '12-01', to: '01-06',
    party: ['#e23b3b', '#3fae5a', '#ffd23f', '#ffffff', '#7cc8ff'],
    card: { sky: '#bcd8f4', ground: '#f6faff', lip: '#d6e4f4', prop: 'present', dots: '#ffffff', fall: true },
    lands: {
      all: { snow: true },
      meadow: { sky: ['#6f9be0', '#b4d2f4', '#eef5ff'], far: [178, 198, 228], near: [214, 228, 246], top: [246, 250, 255], lip: [222, 232, 246], dirt: [134, 100, 74], leaf: [52, 128, 70], trees: ['xtree', 'snowpine', 'snowpine'], small: ['present', 'xsnowman', 'present', 'rock'] },
      forest: { sky: ['#5a86cc', '#a4c6ec', '#e8f0fa'], far: [150, 176, 210], near: [196, 214, 238], top: [244, 248, 255], lip: [218, 228, 244], dirt: [116, 86, 62], leaf: [44, 116, 64], trees: ['snowpine', 'xtree', 'snowpine'], small: ['present', 'xsnowman', 'mushroom'] },
      beach: { trees: ['palm', 'xtree'], small: ['present', 'shell', 'xsnowman'] },
      snow: { trees: ['xtree', 'snowpine'], small: ['present', 'xsnowman'] },
    },
    skins: {
      types: { roof: 'snowy', iceroof: 'snowy', leaf: 'snowy', brick: 'snowy', doortop: 'wreathtop', window: 'xwindow', flag: 'xflag' },
      outposts: [
        { swap: { '-3,0': 'present', '3,0': 'present' }, over: along(4, -4, 4, 'lights') },
        { swap: {}, over: along(5, -4, 4, 'lights') },
        { swap: { '-3,0': 'present', '3,0': 'present' }, over: along(10, -2, 2, 'lights') },
        { swap: { '-5,0': 'present', '5,0': 'present' }, over: along(3, -3, 3, 'lights') },
      ],
    },
  },
};
Object.entries(SEASONS).forEach(([id, s]) => { s.id = id; });
let SEASON = null;     // the season being shown, or null for the normal look
let seasonOpen = null; // { id, key } of the season whose window is open (its picture button shows), or null

// ------------------------------------------------------------------ when
const pad2 = n => String(n).padStart(2, '0');
function inWindow(md, from, to) {
  const afterStart = md >= from, beforeEnd = md <= to;
  return from <= to ? afterStart && beforeEnd : afterStart || beforeEnd;
}
// The season whose window holds this date, as { id, key }, or null. The key names that year's window
// (Christmas 2026 runs into January 2027), so a child switching the look off lasts one window only. Pure.
function seasonOn(date, seasons = SEASONS) {
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const id = Object.keys(seasons).find(k => inWindow(md, seasons[k].from, seasons[k].to));
  if (!id) return null;
  const startedLastYear = seasons[id].from > md;
  return { id, key: `${id}-${date.getFullYear() - (startedLastYear ? 1 : 0)}` };
}
// ?date=YYYY-MM-DD pretends it is that day, for testing
function today(q) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('date') || '');
  return m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date();
}
// The season whose window is open now. ?season=halloween|christmas|none forces one, ignoring the date and settings.
function seasonWindow() {
  const q = new URLSearchParams(location.search), forced = q.get('season');
  if (forced) return SEASONS[forced] ? { id: forced, key: `${forced}-test` } : null;
  return S.seasons === 'off' ? null : seasonOn(today(q));
}

// ------------------------------------------------------------------ how
// A land's look: its THEMES entry with the showing season's changes
function landTheme(key) {
  const L = SEASON && SEASON.lands;
  return L ? Object.assign({}, THEMES[key], L.all, L[key]) : THEMES[key];
}
// blocks with nothing on top of them can wear snow
LEVELS.forEach(L => {
  const taken = new Set(L.pieces.flatMap(p => p.blocks.map(b => `${b.c},${b.r}`)));
  L.pieces.forEach(p => p.blocks.forEach(b => { b.open = !taken.has(`${b.c},${b.r + 1}`); }));
});
// Re-skins the outposts' blocks for a season (or back to normal with null). Shapes and pieces stay the same.
function skinOutposts(season) {
  const sk = season ? season.skins : { types: {}, outposts: [] };
  LEVELS.forEach((L, i) => {
    const { swap = {}, over = {} } = sk.outposts[i] || {};
    L.pieces.forEach(p => {
      p.icon = null;
      p.blocks.forEach(b => { const k = `${b.c},${b.r}`; b.skin = swap[k] || sk.types[b.t]; b.over = over[k]; });
    });
  });
}
