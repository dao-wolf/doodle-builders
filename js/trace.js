// Tracing: the shapes of the letters and numbers a child traces, how a trace is judged, what to trace next and the snack bar.
// This file never touches the page, the canvas or sound, so the unit tests run it in Node (tests/unit/trace.test.js), and
// the level's build step could use it later. The words it uses are in docs/domain.md.
// Everything is in "shape units": each shape is scaled so its longest side is 1, with its top left corner at (0, 0).
// A caller turns a finger position into shape units, and shape units into pixels.
'use strict';

// In Node this file needs the learning rules; in the browser js/learning.js has already loaded and shares its names.
const traceLearning = typeof module === 'object' && module.exports ? require('./learning.js') : { G, PLANS, chosenGraphemes, taughtUpTo };

// ------------------------------------------------------------------ the rules
const TRACE_RULES = {
  tolerance: 0.12, // how far a finger may stray from the path and still count (in shape units, so about 30 px on a phone): generous, for small fingers
  reach: 0.2,      // how far ahead along the path one touch can jump: the start of a stroke, and a fast finger
  cover: 0.85,     // the share of a stroke a finger must follow for the stroke to count
  step: 0.02,      // how close together the points of a path are
};
const SNACKS_PER_BAR = 3;
const KEEP_RECENT_ITEMS = 3; // an item isn't asked again within this many of its own kind, if there are enough to choose from

// ------------------------------------------------------------------ drawing the shapes
// Lower case letters in the print style UK phonics lessons teach, and numbers 1 to 10. Each is drawn in a box where x goes
// left to right, y goes down, the top of a short letter is 0 and its bottom (the line it sits on) is 1; tall letters reach up
// to -0.8 and letters with a tail down to 1.6. Each stroke is one touch, then the finger lifts.
// An angle of 0 points right and 90 points down, so a bigger angle turns clockwise: round letters turn the other way.
const arc = (cx, cy, rx, ry, from, to) => {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 8));
  return Array.from({ length: n + 1 }, (_, i) => { const a = (from + (to - from) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
};
const line = (...pts) => pts;
const curve = (a, c, b) => Array.from({ length: 13 }, (_, i) => { const t = i / 12, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
const bowl = (from, to) => arc(0.45, 0.5, 0.45, 0.5, from, to);           // the round part of a, d, g, o and c
const archOf = (cx, rx) => arc(cx, 0.5, rx, 0.5, 180, 360);                  // the hump of n, m and h
const DOT = [0.5, -0.45];
const LETTER_STROKES = {
  a: { strokes: [bowl(-45, -405), line([0.9, 0], [0.9, 1])] },
  b: { strokes: [line([0.1, -0.8], [0.1, 1]), arc(0.5, 0.5, 0.4, 0.5, 180, 540)] },
  c: { strokes: [bowl(-40, -320)] },
  d: { strokes: [bowl(-45, -405), line([0.9, -0.8], [0.9, 1])] },
  e: { strokes: [[...line([0, 0.5], [0.9, 0.5]), ...arc(0.45, 0.5, 0.45, 0.5, 0, -320)]] },
  f: { strokes: [[...arc(0.6, -0.4, 0.3, 0.3, -15, -180), ...line([0.3, 1])], line([0, 0], [0.65, 0])] },
  g: { strokes: [bowl(-45, -405), [...line([0.9, 0], [0.9, 1.05]), ...arc(0.45, 1.05, 0.45, 0.45, 0, 150)]] },
  h: { strokes: [line([0.1, -0.8], [0.1, 1]), [...archOf(0.475, 0.375), ...line([0.85, 1])]] },
  i: { strokes: [line([0.5, 0], [0.5, 1])], dots: [DOT] },
  j: { strokes: [[...line([0.5, 0], [0.5, 1.15]), ...arc(0.1, 1.15, 0.4, 0.4, 0, 110)]], dots: [DOT] },
  k: { strokes: [line([0.1, -0.8], [0.1, 1]), line([0.85, 0], [0.1, 0.65]), line([0.4, 0.4], [0.9, 1])] },
  l: { strokes: [line([0.5, -0.8], [0.5, 1])] },
  m: { strokes: [line([0.1, 0], [0.1, 1]), [...archOf(0.4, 0.3), ...line([0.7, 1])], [...archOf(1.0, 0.3), ...line([1.3, 1])]] },
  n: { strokes: [line([0.1, 0], [0.1, 1]), [...archOf(0.475, 0.375), ...line([0.85, 1])]] },
  o: { strokes: [bowl(-45, -405)] },
  p: { strokes: [line([0.1, 0], [0.1, 1.6]), arc(0.5, 0.5, 0.4, 0.5, 180, 540)] },
  r: { strokes: [line([0.1, 0], [0.1, 1]), arc(0.5, 0.5, 0.4, 0.5, 180, 285)] },
  s: { strokes: [[...arc(0.5, 0.25, 0.38, 0.25, -35, -270), ...arc(0.5, 0.75, 0.42, 0.25, -90, 145)]] },
  t: { strokes: [[...line([0.35, -0.45], [0.35, 0.7]), ...arc(0.7, 0.7, 0.35, 0.3, 180, 50)], line([0, 0.05], [0.7, 0.05])] },
  u: { strokes: [[...line([0.1, 0], [0.1, 0.5]), ...arc(0.475, 0.5, 0.375, 0.5, 180, 0), ...line([0.85, 0])], line([0.85, 0], [0.85, 1])] },
  v: { strokes: [line([0, 0], [0.5, 1], [1, 0])] },
  w: { strokes: [line([0, 0], [0.25, 1], [0.5, 0.35], [0.75, 1], [1, 0])] },
  x: { strokes: [line([0, 0], [1, 1]), line([1, 0], [0, 1])] },
  y: { strokes: [line([0, 0], [0.62, 0.8]), line([1, 0], [0.25, 1.6])] },
  z: { strokes: [line([0, 0], [0.9, 0], [0, 1], [0.9, 1])] },
};
const NUMBER_STROKES = {
  1: { strokes: [line([0, 0.3], [0.35, 0], [0.35, 1])] },
  2: { strokes: [[...arc(0.35, 0.3, 0.3, 0.3, 180, 400), ...line([0, 1], [0.7, 1])]] },
  3: { strokes: [[...arc(0.33, 0.25, 0.28, 0.25, -160, 90), ...arc(0.33, 0.75, 0.33, 0.25, -90, 160)]] },
  4: { strokes: [line([0.55, 0], [0, 0.7], [0.75, 0.7]), line([0.55, 0], [0.55, 1])] },
  5: { strokes: [[...line([0.62, 0], [0.12, 0], [0.05, 0.48]), ...arc(0.33, 0.68, 0.33, 0.32, -145, 150)]] },
  6: { strokes: [[...curve([0.6, 0], [0.05, 0.15], [0.02, 0.68]), ...arc(0.35, 0.68, 0.33, 0.32, 180, -180)]] },
  7: { strokes: [line([0, 0], [0.65, 0], [0.25, 1])] },
  8: { strokes: [[...arc(0.35, 0.25, 0.27, 0.25, -90, -270), ...arc(0.35, 0.75, 0.33, 0.25, -90, 270), ...arc(0.35, 0.25, 0.27, 0.25, 90, -90)]] },
  9: { strokes: [[...arc(0.35, 0.3, 0.33, 0.3, 0, -360), ...curve([0.68, 0.3], [0.7, 0.85], [0.3, 1])]] },
  0: { strokes: [arc(0.35, 0.5, 0.33, 0.5, -90, -450)] },
};
const TEN_GAP = 0.55; // how far right the 0 of 10 starts, from the left of the 1

// The drawing of an item before it is scaled: { strokes: [points], dots: [points] }, or null for anything that can't be traced
function rawShape(item) {
  if (item && item.kind === 'letter') return traceLearning.G[item.id] && LETTER_STROKES[item.id] ? { dots: [], ...LETTER_STROKES[item.id] } : null;
  if (!item || item.kind !== 'number') return null;
  if (item.n >= 1 && item.n <= 9) return { dots: [], ...NUMBER_STROKES[item.n] };
  if (item.n !== 10) return null;
  const zero = NUMBER_STROKES[0].strokes.map(s => s.map(([x, y]) => [x + TEN_GAP, y]));
  return { dots: [], strokes: [...NUMBER_STROKES[1].strokes, ...zero] };
}
// Points spaced `step` apart along the given points, ending exactly on the last one
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
    let at = step - carry;
    for (; at <= d; at += step) out.push([ax + (bx - ax) * at / d, ay + (by - ay) * at / d]);
    carry = d - (at - step);
  }
  const end = pts[pts.length - 1], tail = out[out.length - 1];
  if (Math.hypot(end[0] - tail[0], end[1] - tail[1]) > 1e-9) out.push(end);
  return out;
}
const strokeOf = pts => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
// The shape of a letter or number to trace: { item, w, h, strokes: [{ pts, cum, len }], dots }, scaled so the longest side
// is 1. Null for what can't be traced: digraphs such as sh and igh, and anything that isn't a letter or a number 1 to 10.
function traceShape(item) {
  const raw = rawShape(item);
  if (!raw) return null;
  const all = [...raw.strokes.flat(), ...raw.dots];
  const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0])), y0 = Math.min(...all.map(p => p[1])), y1 = Math.max(...all.map(p => p[1]));
  const k = 1 / Math.max(x1 - x0, y1 - y0), fit = ([x, y]) => [(x - x0) * k, (y - y0) * k];
  return { item, w: (x1 - x0) * k, h: (y1 - y0) * k, dots: raw.dots.map(fit),
    strokes: raw.strokes.map(s => strokeOf(resample(s.map(fit), TRACE_RULES.step))) };
}

// ------------------------------------------------------------------ judging a trace
// A trace is a small value: { shape, tol, stroke, progress, finger, at, event }. `stroke` is the stroke being traced,
// `progress[i]` how far along stroke i the finger has got (its length once finished), `finger` is null (not touching), 'on' or
// 'off' the path, or 'lost' (a touch that landed away from the path: it counts for nothing until the finger lifts and tries
// again, so a trace starts at the start dot), and `event` says what the last touch did: 'on', 'off', 'still-off', 'stroke' (a stroke is finished), 'done' (the
// shape is finished), 'finished' (a touch after that) or 'up'. Each function gives back a new trace and leaves the old one alone.
const newTrace = (shape, opts = {}) => ({ shape, tol: opts.tolerance || TRACE_RULES.tolerance, stroke: 0, progress: shape.strokes.map(() => 0), finger: null, at: null, event: 'idle' });
const traceDone = trace => trace.stroke >= trace.shape.strokes.length;
// Where the next stroke starts, or null when the shape is finished
const traceStart = trace => traceDone(trace) ? null : trace.shape.strokes[trace.stroke].pts[0];

// How far along the stroke this point is: the nearest place on the path within the tolerance, looking no further ahead than the
// progress so far plus `reach`. Anything beyond that isn't "following the path": it is a shortcut, or another part of the shape
// that passes close by (the crossing of an 8, say). Null when the point is off the path.
function placeOnStroke(stroke, progress, p, tol) {
  const limit = progress + TRACE_RULES.reach;
  let best = null, nearest = tol;
  for (let i = 0; i < stroke.pts.length && stroke.cum[i] <= limit; i++) {
    const d = Math.hypot(stroke.pts[i][0] - p[0], stroke.pts[i][1] - p[1]);
    if (d <= nearest) { nearest = d; best = stroke.cum[i]; } // equally near: the later place
  }
  return best;
}
function touch(trace, p, was) { // one finger position, `was` being whether the finger was on, off, lost or not down just before
  if (traceDone(trace)) return { ...trace, finger: 'on', at: p, event: 'finished' };
  if (was === 'lost') return { ...trace, at: p, event: 'still-off' };
  const stroke = trace.shape.strokes[trace.stroke], done = trace.progress[trace.stroke];
  const where = placeOnStroke(stroke, done, p, trace.tol);
  if (where === null) return { ...trace, finger: was === null ? 'lost' : 'off', at: p, event: was === 'off' ? 'still-off' : 'off' };
  const progress = trace.progress.slice(), reached = Math.max(done, where);
  progress[trace.stroke] = reached;
  if (reached < stroke.len * TRACE_RULES.cover) return { ...trace, progress, finger: 'on', at: p, event: 'on' };
  progress[trace.stroke] = stroke.len; // a finished stroke shows in full
  const next = trace.stroke + 1;
  return { ...trace, progress, stroke: next, finger: 'on', at: p, event: next >= trace.shape.strokes.length ? 'done' : 'stroke' };
}
const traceDown = (trace, p) => touch({ ...trace, finger: null, at: null }, p, null);
function traceMove(trace, p) { // the finger moved: judge the points along the way too, so a quick swipe can't skip the path (nor cut a corner)
  if (!trace.at) return traceDown(trace, p);
  const from = trace.at, steps = Math.max(1, Math.ceil(Math.hypot(p[0] - from[0], p[1] - from[1]) / (trace.tol / 4)));
  let t = trace;
  for (let i = 1; i <= steps; i++) t = touch(t, [from[0] + (p[0] - from[0]) * i / steps, from[1] + (p[1] - from[1]) * i / steps], t.finger);
  return eventAcross(trace, t);
}
// What the whole move did, given the trace before it and after it (a stroke finishing, or the shape, outranks on and off)
function eventAcross(before, after) {
  if (traceDone(before)) return { ...after, event: 'finished' };
  if (after.stroke > before.stroke) return { ...after, event: traceDone(after) ? 'done' : 'stroke' };
  if (after.finger === 'off' || after.finger === 'lost') return { ...after, event: before.finger === 'off' || before.finger === 'lost' ? 'still-off' : 'off' };
  return { ...after, event: 'on' };
}
// The finger lifted: what was traced stays traced, and the next touch can start again or carry on
const traceUp = trace => ({ ...trace, finger: null, at: null, event: traceDone(trace) ? trace.event : 'up' });
// The parts of the strokes traced so far, as lists of points to draw in colour
function traceDrawn(trace) {
  return trace.shape.strokes.flatMap((s, i) => {
    const reached = trace.progress[i];
    if (!(reached > 0)) return [];
    const pts = s.pts.filter((_, j) => s.cum[j] <= reached);
    return pts.length > 1 ? [pts] : [];
  });
}

// ------------------------------------------------------------------ what to trace
const traceKey = item => item.kind === 'letter' ? item.id : String(item.n);
// The items a child can be asked to trace, from the grown-ups' settings ({ weeks, mode, nums }): single letters from the chosen
// weeks (digraphs such as sh can't be traced in one go, so when the chosen weeks hold none, the single letters taught so far),
// and numbers from 1 to the number range. Letters when the game mode asks for letters, numbers when it asks for numbers.
function traceItems({ weeks, mode, nums }) {
  const kinds = (traceLearning.PLANS[mode] || traceLearning.PLANS.both).map(type => type === 'match' ? 'letter' : 'number');
  const single = ids => ids.filter(id => LETTER_STROKES[id] && traceLearning.G[id]).map(id => ({ kind: 'letter', id }));
  const chosen = single(traceLearning.chosenGraphemes(weeks));
  const letters = kinds.includes('letter') ? (chosen.length ? chosen : single(traceLearning.taughtUpTo(weeks))) : [];
  const count = Number.isFinite(nums) ? Math.min(10, Math.max(1, Math.floor(nums))) : 5; // a saved range that isn't a number must not leave nothing to trace
  const numbers = kinds.includes('number') ? Array.from({ length: count }, (_, i) => ({ kind: 'number', n: i + 1 })) : [];
  return [...letters, ...numbers];
}
// The next item to trace, and the recent list to pass next time. Letters and numbers take turns when both are on offer;
// an item isn't repeated within a few of its own kind.
function pickTraceItem(settings, recent = [], asked = 0, random = Math.random) {
  const items = traceItems(settings), kinds = ['letter', 'number'].filter(k => items.some(i => i.kind === k));
  const pool = items.filter(i => i.kind === kinds[asked % kinds.length]);
  const keep = Math.min(KEEP_RECENT_ITEMS, pool.length - 1);
  const avoid = keep > 0 ? recent.filter(k => pool.some(i => traceKey(i) === k)).slice(-keep) : [];
  const fresh = pool.filter(i => !avoid.includes(traceKey(i))), choices = fresh.length ? fresh : pool;
  const item = choices[Math.floor(random() * choices.length)];
  return { item, recent: [...recent, traceKey(item)].slice(-2 * KEEP_RECENT_ITEMS) };
}

// ------------------------------------------------------------------ the snack bar
// Three parts. Each right trace fills one. It only empties when the hero has done their happy dance: nothing else takes a snack back.
const newBar = () => ({ filled: 0, full: false });
const addSnack = bar => { const filled = Math.min(SNACKS_PER_BAR, bar.filled + 1); return { filled, full: filled >= SNACKS_PER_BAR }; };
const danced = () => newBar();

// Node loads this file for the unit tests; the browser loads it as a plain script and skips this.
if (typeof module === 'object' && module.exports) {
  module.exports = { RULES: TRACE_RULES, SNACKS_PER_BAR, traceShape, newTrace, traceDown, traceMove, traceUp, traceDone, traceStart, traceDrawn,
    traceKey, traceItems, pickTraceItem, newBar, addSnack, danced };
}
