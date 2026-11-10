// Tracing: the shapes of the letters and numbers, how a trace is judged, what to trace next, and the snack bar.
// Written before js/trace.js existed. The words used here are in docs/domain.md.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { seeded, SEEDS } = require('../helpers');
const { G } = require('../../js/learning.js');
const T = require('../../js/trace.js');

const LETTERS = Object.keys(G).filter(id => id.length === 1);
const NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);
const letter = id => ({ kind: 'letter', id });
const number = n => ({ kind: 'number', n });
const ALL = [...LETTERS.map(letter), ...NUMBERS.map(number)];
const shapeOf = item => T.traceShape(item);
const first = stroke => stroke.pts[0];
const last = stroke => stroke.pts[stroke.pts.length - 1];
const near = (a, b, d) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= d;
const bounds = shape => {
  const pts = shape.strokes.flatMap(s => s.pts);
  return { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
};
// Where, as a share of the shape's own height (0 top, 1 bottom) and width (0 left, 1 right), a point lies
const share = (shape, p) => { const b = bounds(shape); return [(p[0] - b.x0) / ((b.x1 - b.x0) || 1), (p[1] - b.y0) / ((b.y1 - b.y0) || 1)]; };
const shareIn = (stroke, p) => {
  const xs = stroke.pts.map(q => q[0]), ys = stroke.pts.map(q => q[1]);
  return [(p[0] - Math.min(...xs)) / ((Math.max(...xs) - Math.min(...xs)) || 1), (p[1] - Math.min(...ys)) / ((Math.max(...ys) - Math.min(...ys)) || 1)];
};
// The point a little way along a stroke, to tell which way it sets off
const along = (stroke, fraction) => stroke.pts[Math.min(stroke.pts.length - 1, Math.round((stroke.pts.length - 1) * fraction))];

// A finger that follows each stroke of the shape: `step` apart (in the shape's own units), up to `jitter` to either side, and
// lifted between strokes. Returns one list of points for each stroke.
function finger(shape, { step = 0.02, jitter = 0, random = seeded(1), skip = 0 } = {}) {
  return shape.strokes.map(s => {
    const every = Math.max(1, Math.round(step / 0.02)), out = [];
    for (let i = 0; i < s.pts.length; i += every) out.push(s.pts[i]);
    if (out[out.length - 1] !== last(s)) out.push(last(s));
    return out.slice(skip).map(([x, y]) => [x + (random() * 2 - 1) * jitter, y + (random() * 2 - 1) * jitter]);
  });
}
// Plays finger strokes into a trace, as a child's touches would arrive, and returns the trace after the last lift
function play(shape, strokes, opts) {
  let t = T.newTrace(shape, opts);
  for (const pts of strokes) {
    t = T.traceDown(t, pts[0]);
    for (const p of pts.slice(1)) t = T.traceMove(t, p);
    t = T.traceUp(t);
  }
  return t;
}

describe('The shapes', () => {
  it('cover every single letter in the curriculum and the numbers 1 to 10', () => {
    for (const item of ALL) assert.ok(shapeOf(item), `${item.id || item.n} has no shape`);
  });

  it('are made only for single letters: no digraph (sh, igh, ck) and no two-way grapheme (oo_l)', () => {
    for (const id of Object.keys(G).filter(id => id.length !== 1)) assert.equal(shapeOf(letter(id)), null, `${id} should not be traced`);
    assert.equal(shapeOf(letter('q')), null, 'q is not in the curriculum on its own');
    assert.equal(shapeOf(number(11)), null);
    assert.equal(shapeOf(number(0)), null);
  });

  it('are scaled so the longest side is 1, with every point inside a box from 0 to 1', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), b = bounds(shape);
      assert.ok(Math.abs(Math.max(shape.w, shape.h) - 1) < 1e-9, `${item.id || item.n}: longest side is ${Math.max(shape.w, shape.h)}`);
      assert.ok(b.x0 >= -1e-9 && b.y0 >= -1e-9 && b.x1 <= shape.w + 1e-9 && b.y1 <= shape.h + 1e-9, `${item.id || item.n} leaves its box`);
    }
  });

  it('have strokes with a start, a length, and points close together', () => {
    for (const item of ALL) {
      for (const s of shapeOf(item).strokes) {
        assert.ok(s.pts.length >= 2 && s.len > 0.1, `${item.id || item.n}: a stroke is too short`);
        for (let i = 1; i < s.pts.length; i++) assert.ok(near(s.pts[i - 1], s.pts[i], 0.03), `${item.id || item.n}: a gap in a stroke`);
      }
    }
  });

  it('have at most four strokes, so a small child lifts their finger rarely', () => {
    for (const item of ALL) assert.ok(shapeOf(item).strokes.length <= 4, `${item.id || item.n}`);
  });

  it('write 10 as a 1 then a 0, side by side', () => {
    const ten = shapeOf(number(10)), one = shapeOf(number(1));
    assert.equal(ten.strokes.length, one.strokes.length + 1, 'the 1, then one stroke round the 0');
    assert.ok(ten.w > 0.5 * ten.h, 'two digits are wider than one');
    const lastStroke = ten.strokes[ten.strokes.length - 1];
    assert.ok(first(ten.strokes[0])[0] < first(lastStroke)[0], 'the 1 comes before the 0 along the line');
    assert.ok(Math.max(...ten.strokes[0].pts.map(p => p[0])) < Math.min(...lastStroke.pts.map(p => p[0])) + 0.05, 'the 1 sits to the left of the 0');
  });

  it('keep the dots of i and j apart from the strokes a child must trace', () => {
    assert.equal(shapeOf(letter('i')).dots.length, 1);
    assert.equal(shapeOf(letter('j')).dots.length, 1);
    assert.equal(shapeOf(letter('t')).dots.length, 0);
  });
});

describe('How the shapes are formed (UK print, as phonics lessons teach them)', () => {
  const START_AT_TOP_RIGHT_GOING_LEFT = ['a', 'c', 'd', 'g', 'o', 's'];
  const STEM_DOWN_FIRST = ['b', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 'i', 'j', 't', 'u'];

  it('letters of the "round the circle" family start at the top, on the right, and go anticlockwise (set off to the left)', () => {
    for (const id of START_AT_TOP_RIGHT_GOING_LEFT) {
      const s = shapeOf(letter(id)).strokes[0], [sx, sy] = shareIn(s, first(s));
      const [mx] = along(s, 0.08);
      assert.ok(sy < 0.5, `${id} should start in the top half of its first stroke`);
      assert.ok(mx < first(s)[0], `${id} should set off to the left`);
      assert.ok(sx > 0.4, `${id} should start towards the right`);
    }
  });

  it('letters with a stem start at the top of the stem and go straight down it', () => {
    for (const id of STEM_DOWN_FIRST) {
      const s = shapeOf(letter(id)).strokes[0], a = first(s), b = along(s, 0.15);
      assert.ok(b[1] > a[1] + 0.01, `${id}: the first stroke should go down`);
      assert.ok(Math.abs(b[0] - a[0]) < 0.02, `${id}: the first stroke should be straight down`);
    }
  });

  it('b, d, p and q lookalikes are traced differently: b and p start on the left, d at the top right', () => {
    const left = id => share(shapeOf(letter(id)), first(shapeOf(letter(id)).strokes[0]))[0];
    assert.ok(left('b') < 0.2 && left('p') < 0.2 && left('d') > 0.4);
  });

  it('tall letters (b, d, h, k, l, f, t) and letters with a tail (g, j, p, y) are taller than they are wide; short round ones are not', () => {
    for (const id of ['b', 'd', 'h', 'k', 'l', 'f', 't', 'g', 'j', 'p', 'y']) assert.ok(Math.abs(shapeOf(letter(id)).h - 1) < 1e-9, `${id} should be the tall side`);
    for (const id of ['a', 'o', 'e', 'm', 'w']) assert.ok(shapeOf(letter(id)).w >= 0.85, `${id} should be as wide as it is tall, or wider`);
  });

  it('the cross of t and f and the arms of x and k come after their stems', () => {
    for (const id of ['t', 'f']) {
      const [stem, bar] = shapeOf(letter(id)).strokes;
      assert.ok(Math.abs(last(stem)[1] - first(stem)[1]) > 0.4, `${id}: the stem is long`);
      assert.ok(Math.abs(last(bar)[1] - first(bar)[1]) < 0.05, `${id}: the cross is flat`);
      assert.ok(last(bar)[0] > first(bar)[0], `${id}: the cross is drawn left to right`);
    }
    const x = shapeOf(letter('x')).strokes;
    assert.equal(x.length, 2);
    assert.ok(first(x[0])[0] < last(x[0])[0] && first(x[1])[0] > last(x[1])[0], 'x: down to the right, then down to the left');
  });

  it('v, w and z are one stroke each, and set off from the top left (v, w) or along the top (z)', () => {
    for (const id of ['v', 'w', 'z']) assert.equal(shapeOf(letter(id)).strokes.length, 1, id);
    const z = shapeOf(letter('z')).strokes[0], top = along(z, 0.1);
    assert.ok(Math.abs(top[1] - first(z)[1]) < 0.02 && top[0] > first(z)[0], 'z starts along the top');
  });

  it('numbers start near the top and read left to right: 7 sets off along the top, 0 goes anticlockwise', () => {
    for (const n of NUMBERS.filter(n => n !== 10)) {
      const shape = shapeOf(number(n)), [, sy] = share(shape, first(shape.strokes[0]));
      assert.ok(sy < 0.45, `${n} should start in the top part`);
    }
    const seven = shapeOf(number(7)).strokes[0];
    assert.ok(along(seven, 0.1)[0] > first(seven)[0] && Math.abs(along(seven, 0.1)[1] - first(seven)[1]) < 0.02);
    const one = shapeOf(number(1)).strokes[0];
    assert.ok(last(one)[1] - first(one)[1] > 0.5, '1 goes down');
  });
});

describe('Judging a trace', () => {
  it('is right for a finger that follows every shape exactly, stroke by stroke', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), t = play(shape, finger(shape));
      assert.equal(T.traceDone(t), true, `${item.id || item.n}: a perfect trace was not accepted`);
    }
  });

  it('is right for a wobbly finger that stays within what a small child can manage', () => {
    for (const item of ALL) {
      for (const seed of SEEDS.slice(0, 8)) {
        const shape = shapeOf(item), t = play(shape, finger(shape, { jitter: T.RULES.tolerance * 0.6, random: seeded(seed) }));
        assert.equal(T.traceDone(t), true, `${item.id || item.n} (seed ${seed}): a wobbly trace was not accepted`);
      }
    }
  });

  it('is right for a fast finger that jumps far between touch events', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), t = play(shape, finger(shape, { step: 0.1 }));
      assert.equal(T.traceDone(t), true, `${item.id || item.n}: a fast trace was not accepted`);
    }
  });

  it('is right when a child stops a little short of the end of each stroke', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), cut = finger(shape).map(pts => pts.slice(0, Math.floor(pts.length * 0.92)));
      assert.equal(T.traceDone(play(shape, cut)), true, `${item.id || item.n}: stopping a little short should be enough`);
    }
  });

  it('is not right until every stroke has been traced, in order', () => {
    for (const item of ALL.filter(i => shapeOf(i).strokes.length > 1)) {
      const shape = shapeOf(item), all = finger(shape);
      assert.equal(T.traceDone(play(shape, all.slice(0, -1))), false, `${item.id || item.n}: the last stroke is missing`);
      assert.equal(T.traceDone(play(shape, [...all].reverse())), false, `${item.id || item.n}: the strokes were traced in the wrong order`);
    }
  });

  it('is not right for half a stroke', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), half = finger(shape).map(pts => pts.slice(0, Math.floor(pts.length * 0.5)));
      assert.equal(T.traceDone(play(shape, half)), false, `${item.id || item.n}: half a trace was accepted`);
    }
  });

  it('is not right when the finger starts away from the start dot', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), cut = finger(shape), away = Math.ceil((T.RULES.reach + 2 * T.RULES.tolerance) / 0.02);
      if (shape.strokes[0].len < 0.7) continue; // a stroke this short is all "near the start": there is no far end to begin at
      cut[0] = cut[0].slice(away); // sets off from well along the first stroke
      const t = play(shape, cut);
      assert.equal(T.traceDone(t), false, `${item.id || item.n}: starting late was accepted`);
    }
  });

  it('is not right for a trace that goes the wrong way round', () => {
    for (const item of ALL) {
      const shape = shapeOf(item), back = finger(shape).map(pts => pts.slice().reverse()).reverse();
      assert.equal(T.traceDone(play(shape, back)), false, `${item.id || item.n}: tracing backwards was accepted`);
    }
  });

  it('is not right for a scribble across the shape', () => {
    for (const item of ALL) {
      const shape = shapeOf(item);
      const w = Math.max(shape.w, 0.6); // i and l are a line: scribble over a wider box than that
      const scribble = [[[0.0, 0.0], [w, shape.h], [0.0, shape.h], [w, 0.0], [w / 2, shape.h / 2]]];
      assert.equal(T.traceDone(play(shape, scribble)), false, `${item.id || item.n}: a scribble was accepted`);
    }
  });

  it('is not right for a straight line down the middle (it would be right only for a 1 or an l)', () => {
    for (const item of ALL.filter(i => !['1', 'l', 'i'].includes(String(i.id || i.n)))) {
      const shape = shapeOf(item), line = [[shape.w / 2, 0], [shape.w / 2, shape.h]];
      assert.equal(T.traceDone(play(shape, [line.map(p => p)])), false, `${item.id || item.n}: a line down the middle was accepted`);
    }
  });

  it('is not right when a clearly different shape is traced: l for o, o for l, 1 for 7, 8 for 1', () => {
    const pairs = [[letter('l'), letter('o')], [letter('o'), letter('l')], [number(1), number(7)], [number(8), number(1)], [letter('x'), letter('o')], [letter('t'), letter('s')]];
    for (const [traced, asked] of pairs) {
      const asking = shapeOf(asked), tracing = shapeOf(traced);
      const t = play(asking, finger(tracing));
      assert.equal(T.traceDone(t), false, `tracing ${traced.id || traced.n} was accepted for ${asked.id || asked.n}`);
    }
  });

  it('accepts a bit more wobble on a small screen, when the caller widens the tolerance', () => {
    const shape = shapeOf(letter('x')), away = T.RULES.tolerance * 1.6; // a finger kept the same distance to one side of two straight strokes
    const strokes = shape.strokes.map(s => {
      const [ax, ay] = s.pts[0], [bx, by] = s.pts[s.pts.length - 1], d = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / d, ny = (bx - ax) / d;
      return s.pts.map(([x, y]) => [x + nx * away, y + ny * away]);
    });
    assert.equal(T.traceDone(play(shape, strokes)), false, 'too far to the side for the normal tolerance');
    assert.equal(T.traceDone(play(shape, strokes, { tolerance: T.RULES.tolerance * 2 })), true, 'a wider tolerance accepts it');
  });
});

describe('Going off the path loses nothing', () => {
  const shape = shapeOf(letter('s')), stroke = shape.strokes[0];
  const at = fraction => along(stroke, fraction);
  const away = fraction => { const [x, y] = at(fraction); return [x + T.RULES.tolerance * 3, y + T.RULES.tolerance * 3]; };

  it('says "off" once, when the finger leaves the path, and "on" again when it comes back', () => {
    let t = T.newTrace(shape);
    t = T.traceDown(t, at(0)); assert.equal(t.event, 'on');
    t = T.traceMove(t, at(0.1)); assert.equal(t.event, 'on');
    t = T.traceMove(t, away(0.12)); assert.equal(t.event, 'off');
    t = T.traceMove(t, away(0.14)); assert.equal(t.event, 'still-off', 'staying off the path says nothing new');
    t = T.traceMove(t, at(0.12)); assert.equal(t.event, 'on');
  });

  it('keeps the progress made before leaving the path, and carries on from there', () => {
    let t = T.newTrace(shape);
    t = T.traceDown(t, at(0));
    for (let i = 1; i <= 20; i++) t = T.traceMove(t, at(i * 0.02));
    assert.ok(t.progress[0] > 0.3 * stroke.len);
    t = T.traceMove(t, away(0.45));
    const before = t.progress[0];
    t = T.traceMove(t, away(0.8));
    t = T.traceMove(t, away(0.9));
    assert.equal(t.progress[0], before, 'progress changed while off the path');
    t = T.traceMove(t, at(0.42));
    for (let i = 22; i <= 50; i++) t = T.traceMove(t, at(i * 0.02));
    t = T.traceUp(t);
    assert.equal(T.traceDone(t), true, 'the trace should finish after coming back');
  });

  it('keeps the progress when the finger is lifted, and a new touch can carry on or start again', () => {
    let t = T.newTrace(shape);
    t = T.traceDown(t, at(0));
    for (let i = 1; i <= 25; i++) t = T.traceMove(t, at(i * 0.02));
    t = T.traceUp(t);
    assert.ok(t.progress[0] > 0.4 * stroke.len);
    const kept = t.progress[0];
    t = T.traceDown(t, at(0)); assert.equal(t.event, 'on', 'starting again from the start dot');
    t = T.traceUp(t);
    t = T.traceDown(t, at(0.5)); assert.equal(t.event, 'on', 'carrying on from where the finger stopped');
    assert.ok(Math.abs(t.progress[0] - kept) < 0.02, 'the progress was kept');
  });

  it('says "off" for a touch that lands away from the start dot, and counts no progress', () => {
    let t = T.newTrace(shape);
    t = T.traceDown(t, at(0.5));
    assert.equal(t.event, 'off');
    assert.equal(t.progress[0], 0);
    t = T.traceMove(t, at(0.55));
    assert.equal(t.progress[0], 0, 'moving along the path from the middle gave progress');
  });

  it('never goes backwards or loses a finished stroke', () => {
    const x = shapeOf(letter('x'));
    let t = T.newTrace(x);
    const [a, b] = finger(x);
    t = T.traceDown(t, a[0]); a.slice(1).forEach(p => { t = T.traceMove(t, p); }); t = T.traceUp(t);
    assert.equal(t.stroke, 1, 'the first stroke of x is finished');
    t = T.traceDown(t, [5, 5]); t = T.traceMove(t, [6, 6]); t = T.traceUp(t);
    assert.equal(t.stroke, 1, 'a stray touch did not undo the first stroke');
    assert.equal(T.traceDrawn(t).length, 1);
    t = T.traceDown(t, b[0]); b.slice(1).forEach(p => { t = T.traceMove(t, p); }); t = T.traceUp(t);
    assert.equal(T.traceDone(t), true);
  });
});

describe('Showing what has been traced', () => {
  it('gives the part of each stroke traced so far, to draw in colour', () => {
    const shape = shapeOf(letter('t')), [stem] = shape.strokes;
    let t = T.newTrace(shape);
    assert.deepEqual(T.traceDrawn(t), []);
    t = T.traceDown(t, first(stem));
    for (let i = 1; i < stem.pts.length / 2; i++) t = T.traceMove(t, stem.pts[i]);
    const [drawn] = T.traceDrawn(t);
    assert.ok(drawn.length > 5 && drawn.length < stem.pts.length);
    assert.deepEqual(drawn[0], first(stem));
  });

  it('says where the next stroke starts, until the shape is done', () => {
    const shape = shapeOf(letter('x'));
    let t = T.newTrace(shape);
    assert.deepEqual(T.traceStart(t), first(shape.strokes[0]));
    const [a, b] = finger(shape);
    t = T.traceDown(t, a[0]); a.slice(1).forEach(p => { t = T.traceMove(t, p); }); t = T.traceUp(t);
    assert.deepEqual(T.traceStart(t), first(shape.strokes[1]));
    t = T.traceDown(t, b[0]); b.slice(1).forEach(p => { t = T.traceMove(t, p); }); t = T.traceUp(t);
    assert.equal(T.traceStart(t), null);
  });

  it('turns events into "done" once, at the stroke that finishes the shape', () => {
    const shape = shapeOf(letter('o')), [pts] = finger(shape);
    let t = T.newTrace(shape);
    const events = [];
    t = T.traceDown(t, pts[0]); events.push(t.event);
    for (const p of pts.slice(1)) { t = T.traceMove(t, p); events.push(t.event); }
    assert.equal(events.filter(e => e === 'done').length, 1, 'done is said once, when the shape is finished');
    assert.equal(events[events.length - 1], 'finished', 'after that, the finger moving on says nothing new');
    t = T.traceMove(t, [0, 0]);
    assert.equal(T.traceDone(t), true);
  });
});

describe('What to trace', () => {
  const AUTUMN_1 = ['Autumn 1-0', 'Autumn 1-1', 'Autumn 1-2', 'Autumn 1-3', 'Autumn 1-4'];
  const ids = items => items.map(i => i.id || i.n);

  it('is letters from the chosen weeks, single letters only', () => {
    const items = T.traceItems({ weeks: ['Autumn 1-3'], mode: 'literacy', nums: 5 });
    assert.deepEqual(ids(items), ['e', 'u', 'r'], 'ck is a digraph, so it is left out');
  });

  it('uses the single letters taught so far when the chosen weeks hold only digraphs (sh th ng nk), so there is always something to trace', () => {
    const items = T.traceItems({ weeks: ['Autumn 2-3'], mode: 'literacy', nums: 5 });
    assert.ok(items.length > 0);
    assert.ok(items.every(i => i.kind === 'letter' && i.id.length === 1 && shapeOf(i)));
    assert.deepEqual(ids(items), ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'e', 'u', 'r', 'h', 'b', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z']);
  });

  it('falls back to the first week (s a t p) when no week is chosen', () => {
    assert.deepEqual(ids(T.traceItems({ weeks: [], mode: 'literacy', nums: 5 })), ['s', 'a', 't', 'p']);
  });

  it('is numbers 1 to the number range when the game mode has numbers', () => {
    assert.deepEqual(ids(T.traceItems({ weeks: AUTUMN_1, mode: 'numeracy', nums: 5 })), [1, 2, 3, 4, 5]);
    assert.deepEqual(ids(T.traceItems({ weeks: AUTUMN_1, mode: 'numeracy', nums: 10 })), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('still has numbers to trace when the saved number range is missing or silly', () => {
    for (const nums of [undefined, null, NaN, 0, -3, 'x']) assert.ok(T.traceItems({ weeks: AUTUMN_1, mode: 'numeracy', nums }).length > 0, `nums ${nums}`);
    assert.deepEqual(ids(T.traceItems({ weeks: AUTUMN_1, mode: 'numeracy', nums: 0 })), [1]);
    assert.deepEqual(ids(T.traceItems({ weeks: AUTUMN_1, mode: 'numeracy', nums: 99 })), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('is both letters and numbers in game mode both, and an unknown mode counts as both', () => {
    const both = T.traceItems({ weeks: ['Autumn 1-0'], mode: 'both', nums: 5 });
    assert.deepEqual(ids(both), ['s', 'a', 't', 'p', 1, 2, 3, 4, 5]);
    assert.deepEqual(T.traceItems({ weeks: ['Autumn 1-0'], mode: 'nonsense', nums: 5 }), both);
  });

  it('picks items from the list, alternating letters and numbers in game mode both', () => {
    const settings = { weeks: AUTUMN_1, mode: 'both', nums: 5 };
    for (const seed of SEEDS.slice(0, 20)) {
      const random = seeded(seed); let recent = [], kinds = [];
      for (let asked = 0; asked < 12; asked++) {
        const p = T.pickTraceItem(settings, recent, asked, random);
        recent = p.recent; kinds.push(p.item.kind);
        assert.ok(shapeOf(p.item), 'a picked item can be traced');
      }
      assert.deepEqual(kinds, kinds.map((_, i) => i % 2 ? 'number' : 'letter'));
    }
  });

  it('does not repeat the last few items while there are enough to choose from', () => {
    const settings = { weeks: AUTUMN_1, mode: 'literacy', nums: 5 };
    for (const seed of SEEDS.slice(0, 20)) {
      const random = seeded(seed); let recent = [];
      const keys = [];
      for (let asked = 0; asked < 40; asked++) { const p = T.pickTraceItem(settings, recent, asked, random); recent = p.recent; keys.push(T.traceKey(p.item)); }
      for (let i = 0; i + 4 <= keys.length; i++) assert.equal(new Set(keys.slice(i, i + 4)).size, 4, `a repeat within 4 at ${i}: ${keys.slice(i, i + 4)}`);
    }
  });

  it('still picks something when there is only one item to trace', () => {
    const settings = { weeks: [], mode: 'numeracy', nums: 1 };
    const p = T.pickTraceItem(settings, [], 0, seeded(3));
    assert.equal(p.item.n, 1);
    const q = T.pickTraceItem(settings, p.recent, 1, seeded(4));
    assert.equal(q.item.n, 1);
  });

  it('names an item for the voice: a letter by its grapheme, a number by its value', () => {
    assert.equal(T.traceKey(letter('s')), 's');
    assert.equal(T.traceKey(number(7)), '7');
    assert.notEqual(T.traceKey(letter('s')), T.traceKey(number(5)));
  });
});

describe('The snack bar', () => {
  it('has three parts, and each right trace fills one', () => {
    assert.equal(T.SNACKS_PER_BAR, 3);
    let bar = T.newBar();
    assert.deepEqual([bar.filled, bar.full], [0, false]);
    bar = T.addSnack(bar); assert.deepEqual([bar.filled, bar.full], [1, false]);
    bar = T.addSnack(bar); assert.deepEqual([bar.filled, bar.full], [2, false]);
    bar = T.addSnack(bar); assert.deepEqual([bar.filled, bar.full], [3, true]);
  });

  it('is full after three snacks, and a fourth does not overfill it', () => {
    let bar = T.newBar();
    for (let i = 0; i < 6; i++) bar = T.addSnack(bar);
    assert.equal(bar.filled, 3);
  });

  it('only empties when the hero has danced: nothing else takes a snack back', () => {
    const bar = T.addSnack(T.addSnack(T.newBar()));
    assert.equal(bar.filled, 2);
    assert.equal(T.danced(bar).filled, 0, 'after the dance the bar starts again');
    assert.equal(T.danced(T.newBar()).filled, 0);
  });

  it('is never changed in place: the bar a caller holds stays as it was', () => {
    const bar = Object.freeze(T.newBar());
    const next = T.addSnack(bar);
    assert.equal(bar.filled, 0);
    assert.equal(next.filled, 1);
  });
});
