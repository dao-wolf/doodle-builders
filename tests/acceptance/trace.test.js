// What the hero's house must do, in the game's own words: a child is given a letter or number to trace, a right trace feeds the hero
// and fills a part of the snack bar, three fill the bar and the hero dances, and nothing a child does takes anything away.
// Written from the outside in, with only the functions the house calls; tests/unit/trace.test.js covers each rule on its own.
// The words used here are in docs/domain.md.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { seeded, SEEDS } = require('../helpers');
const T = require('../../js/trace.js');

const AUTUMN_1 = ['Autumn 1-0', 'Autumn 1-1', 'Autumn 1-2', 'Autumn 1-3', 'Autumn 1-4'];

// A child's finger on a shape: follows every stroke, optionally wandering away from the path part of the way along the first
// one (to a corner of the screen) and coming back to where they left it.
function playRound(item, { wander = false } = {}) {
  const shape = T.traceShape(item);
  let trace = T.newTrace(shape);
  const events = [];
  const touch = (fn, p) => { trace = fn(trace, p); events.push(trace.event); };
  shape.strokes.forEach((stroke, i) => {
    const pts = stroke.pts.filter((_, k) => k % 2 === 0 || k === stroke.pts.length - 1);
    touch(T.traceDown, pts[0]);
    const detourAt = wander && i === 0 ? Math.floor(pts.length / 3) : -1;
    pts.slice(1).forEach((p, k) => {
      if (k === detourAt) {
        const before = trace.progress[0];
        touch(T.traceMove, [3, 3]);
        assert.ok(trace.progress[0] >= before, 'wandering off the path lost progress');
        const kept = trace.progress[0];
        touch(T.traceMove, [-2, 4]);
        assert.equal(trace.progress[0], kept, 'progress changed while the finger was off the path');
        assert.ok(events.includes('off'), 'the house is told when a finger is off the path (the dots glow, the voice speaks)');
      }
      touch(T.traceMove, p);
    });
    touch(T.traceUp, null);
  });
  return { trace, events };
}

// A child's visit to the house: `rounds` letters or numbers, each traced right, the bar kept as the house keeps it
function visit(settings, rounds, random, { wander = false } = {}) {
  let bar = T.newBar(), recent = [];
  const log = [];
  for (let asked = 0; asked < rounds; asked++) {
    const picked = T.pickTraceItem(settings, recent, asked, random);
    recent = picked.recent;
    const { trace, events } = playRound(picked.item, { wander });
    const before = bar.filled;
    if (T.traceDone(trace)) bar = T.addSnack(bar);
    log.push({ item: picked.item, done: T.traceDone(trace), events, before, after: bar.filled, full: bar.full });
    if (bar.full) bar = T.danced(bar); // the hero dances, and the bar starts again
  }
  return log;
}

describe('A child in the hero\'s house', () => {
  it('is given letters from the weeks the grown-up chose, one letter at a time, and numbers up to the number range', () => {
    const SO_FAR = [...'satpinmdgockeurhbfljvwxyz']; // every single letter taught up to Autumn 2, week 4, when that week holds only digraphs
    const cases = [
      [AUTUMN_1, 'both', 5, [...'satpinmdgockeurhbfl']],
      [['Autumn 1-3'], 'literacy', 5, [...'eur']],
      [[], 'numeracy', 10, []],
      [[], 'literacy', 5, [...'satp']],
      [['Autumn 2-3'], 'both', 5, SO_FAR],
    ];
    for (const [weeks, mode, nums, letters] of cases) {
      for (const seed of SEEDS.slice(0, 10)) {
        for (const { item } of visit({ weeks, mode, nums }, 24, seeded(seed))) {
          if (item.kind === 'letter') assert.ok(letters.includes(item.id), `${item.id} was not one of the chosen single letters`);
          else assert.ok(item.n >= 1 && item.n <= nums, `${item.n} is outside the number range`);
          assert.ok(mode !== 'literacy' || item.kind === 'letter', 'a number in letters mode');
          assert.ok(mode !== 'numeracy' || item.kind === 'number', 'a letter in numbers mode');
        }
      }
    }
  });

  it('feeds the hero with every right trace, in every game mode', () => {
    for (const mode of ['literacy', 'numeracy', 'both']) {
      for (const seed of SEEDS.slice(0, 5)) {
        for (const round of visit({ weeks: AUTUMN_1, mode, nums: 10 }, 20, seeded(seed))) assert.equal(round.done, true, `${round.item.id || round.item.n} (${mode}) was not accepted`);
      }
    }
  });

  it('fills one part of the snack bar for each right trace, and the third fills it and brings the dance', () => {
    const log = visit({ weeks: AUTUMN_1, mode: 'both', nums: 5 }, 9, seeded(7));
    assert.deepEqual(log.map(r => r.after), [1, 2, 3, 1, 2, 3, 1, 2, 3]);
    assert.deepEqual(log.map(r => r.full), [false, false, true, false, false, true, false, false, true]);
  });

  it('never has the bar go down by itself: it goes up one at a time, and starts again only after the dance', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const round of visit({ weeks: AUTUMN_1, mode: 'both', nums: 5 }, 30, seeded(seed))) {
        assert.ok(round.after === round.before + 1, 'a right trace fills exactly one part');
        assert.ok(round.after <= 3);
      }
    }
  });

  it('loses nothing by wandering off the path: the trace still finishes and still feeds the hero', () => {
    for (const mode of ['literacy', 'numeracy']) {
      for (const seed of SEEDS.slice(0, 4)) {
        for (const round of visit({ weeks: AUTUMN_1, mode, nums: 10 }, 15, seeded(seed), { wander: true })) {
          assert.equal(round.done, true, `${round.item.id || round.item.n}: a trace that wandered off the path and came back was lost`);
          assert.ok(round.events.includes('off'));
        }
      }
    }
  });

  it('gets nothing from scribbling, and loses nothing either', () => {
    let bar = T.addSnack(T.newBar());
    const shape = T.traceShape({ kind: 'letter', id: 's' });
    let trace = T.traceDown(T.newTrace(shape), [0.5, 0.5]);
    for (const p of [[0.1, 0.9], [0.9, 0.1], [0.2, 0.3], [0.8, 0.8]]) trace = T.traceMove(trace, p);
    trace = T.traceUp(trace);
    assert.equal(T.traceDone(trace), false, 'a scribble fed the hero');
    assert.equal(bar.filled, 1, 'a scribble took a snack away');
    bar = T.addSnack(bar);
    assert.equal(bar.filled, 2);
  });
});
