// Questions: which type comes next, which grapheme to ask for, and the answers to choose from.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { seeded, SEEDS, pairs } = require('../helpers');
const { G, PLANS, clashes, questionType, pickGrapheme, otherGraphemes, letterAnswers, numberQuestion, gemsToCount } = require('../../js/learning.js');

describe('questionType', () => {
  it('goes round the mode\'s plan', () => {
    for (const [mode, plan] of Object.entries(PLANS)) {
      for (let i = 0; i < 9; i++) assert.equal(questionType(mode, i), plan[i % plan.length], `${mode} ${i}`);
    }
  });
});

describe('pickGrapheme', () => {
  it('picks from the chosen weeks, and not from the recent list', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const { grapheme } = pickGrapheme(['Autumn 1-0'], ['s', 'a', 't'], seeded(seed));
      assert.equal(grapheme, 'p');
    }
  });
  it('picks from them all when every one is recent', () => {
    const picked = new Set(SEEDS.slice(0, 50).map(seed => pickGrapheme(['Autumn 1-0'], ['s', 'a', 't', 'p'], seeded(seed)).grapheme));
    assert.deepEqual([...picked].sort(), ['a', 'p', 's', 't']);
  });
  it('adds the grapheme to the recent list, which keeps the last four', () => {
    const { grapheme, recent } = pickGrapheme(['Autumn 1-0', 'Autumn 1-1'], ['s', 'a', 't', 'p'], seeded(1));
    assert.deepEqual(recent, ['a', 't', 'p', grapheme]);
  });
  it('keeps fewer than the number chosen, so there is always one to pick', () => {
    assert.equal(pickGrapheme(['Autumn 1-0'], ['s', 'a', 't'], seeded(1)).recent.length, 3);
    assert.equal(pickGrapheme(['Spring 1-3'], ['air'], seeded(1)).recent.length, 1);
  });
  it('trims a recent list left long by a smaller choice of weeks', () => {
    assert.equal(pickGrapheme(['Spring 1-3'], ['s', 'a', 't', 'p'], seeded(1)).recent.length, 1);
  });
  it('leaves the recent list it was given unchanged', () => {
    const before = ['s', 'a'];
    pickGrapheme(['Autumn 1-0'], before, seeded(1));
    assert.deepEqual(before, ['s', 'a']);
  });
  it('gives the same grapheme for the same random numbers', () => {
    assert.deepEqual(pickGrapheme(['Autumn 2-1'], [], seeded(7)), pickGrapheme(['Autumn 2-1'], [], seeded(7)));
  });
});

describe('otherGraphemes', () => {
  const everyWeek = ['Autumn 1-0', 'Autumn 1-4', 'Autumn 2-2', 'Spring 1-1', 'Spring 1-3'];
  it('never includes the target, or anything that clashes with it or with each other', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const target of Object.keys(G)) {
        const others = otherGraphemes(target, everyWeek, 2, seeded(seed));
        assert.equal(others.length, 2, `${target}: ${others}`);
        for (const [a, b] of pairs([target, ...others])) assert.ok(!clashes(a).has(b), `${a} and ${b}`);
      }
    }
  });
  it('reaches beyond the weeks taught so far only when it must', () => {
    // the first week has four graphemes: asking for five others has to go further
    const others = otherGraphemes('s', ['Autumn 1-0'], 5, seeded(3));
    assert.equal(others.length, 5);
    assert.deepEqual(others.slice(0, 3).sort(), ['a', 'p', 't']);
  });
  it('gives up to as many as asked, and no duplicates', () => {
    const others = otherGraphemes('a', ['Autumn 1-0'], 3, seeded(2));
    assert.deepEqual([...others].sort(), ['p', 's', 't']);
  });
});

describe('letterAnswers', () => {
  it('puts the target in a different place from one question to the next', () => {
    const places = new Set(SEEDS.slice(0, 60).map(seed => letterAnswers('s', ['Autumn 1-0'], seeded(seed)).indexOf('s')));
    assert.deepEqual([...places].sort(), [0, 1, 2]);
  });
});

describe('numberQuestion', () => {
  it('puts the target in a different place from one question to the next', () => {
    const places = new Set(SEEDS.slice(0, 60).map(seed => { const q = numberQuestion(5, seeded(seed)); return q.answers.indexOf(q.target); }));
    assert.deepEqual([...places].sort(), [0, 1, 2]);
  });
  it('still offers two other numbers when the range is tiny', () => {
    const q = numberQuestion(1, seeded(1));
    assert.equal(q.target, 1);
    assert.equal(new Set(q.answers).size, 3);
  });
});

describe('gemsToCount', () => {
  it('uses the bottom and top of each range', () => {
    assert.equal(gemsToCount(5, () => 0), 2);
    assert.equal(gemsToCount(5, () => 0.9999), 5);
    assert.equal(gemsToCount(10, () => 0), 3);
    assert.equal(gemsToCount(10, () => 0.9999), 7);
  });
});
