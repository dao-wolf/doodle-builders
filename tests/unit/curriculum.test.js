// Curriculum: the graphemes, the weeks they are taught in, and which ones clash.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pairs } = require('../helpers');
const { G, TERMS, WEEKS, SAME, LOOKALIKE, clashes, chosenGraphemes, taughtUpTo } = require('../../js/learning.js');

describe('The weeks', () => {
  it('follow the Little Wandle Reception terms in order', () => {
    assert.deepEqual(TERMS.map(([term]) => term), ['Autumn 1', 'Autumn 2', 'Spring 1']);
    assert.deepEqual(WEEKS.map(w => w.id), ['Autumn 1-0', 'Autumn 1-1', 'Autumn 1-2', 'Autumn 1-3', 'Autumn 1-4',
      'Autumn 2-0', 'Autumn 2-1', 'Autumn 2-2', 'Autumn 2-3', 'Spring 1-0', 'Spring 1-1', 'Spring 1-2', 'Spring 1-3']);
    assert.deepEqual(WEEKS[0].g, ['s', 'a', 't', 'p']);
  });

  it('teach every grapheme once, and only graphemes the game can show and say', () => {
    const taught = WEEKS.flatMap(w => w.g);
    assert.equal(new Set(taught).size, taught.length, 'a grapheme is taught twice');
    assert.deepEqual([...taught].sort(), Object.keys(G).sort());
    for (const [id, [shown, word, sound]] of Object.entries(G)) assert.ok(shown && word && sound, id);
  });
});

describe('clashes', () => {
  it('includes the grapheme itself', () => {
    for (const g of Object.keys(G)) assert.ok(clashes(g).has(g), g);
  });
  it('includes the other ways to write the same sound', () => {
    assert.deepEqual([...clashes('c')].sort(), ['c', 'ck', 'k']);
    assert.ok(clashes('ck').has('x'));
    assert.ok(clashes('oo_l').has('oo_s'));
  });
  it('includes the graphemes that look alike', () => {
    assert.deepEqual([...clashes('b')].sort(), ['b', 'd', 'p']);
    assert.ok(clashes('p').has('qu'));
  });
  it('is only the grapheme itself when nothing looks or sounds like it', () => {
    assert.deepEqual([...clashes('a')], ['a']);
  });
  it('works both ways: if a clashes with b, b clashes with a', () => {
    for (const [a, b] of pairs(Object.keys(G))) assert.equal(clashes(a).has(b), clashes(b).has(a), `${a} and ${b}`);
  });
  it('only names graphemes the game has', () => {
    for (const g of [...SAME.flat(), ...Object.keys(LOOKALIKE), ...Object.values(LOOKALIKE).flatMap(v => v.split(' '))]) assert.ok(g in G, g);
  });
});

describe('chosenGraphemes', () => {
  it('lists the graphemes of the chosen weeks, in teaching order', () => {
    assert.deepEqual(chosenGraphemes(['Autumn 1-1', 'Autumn 1-0']), ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']);
  });
  it('ignores weeks it doesn\'t know', () => {
    assert.deepEqual(chosenGraphemes(['Summer 9-9', 'Spring 1-3']), ['air', 'er']);
  });
  it('falls back to the first week when none is chosen, as a copy the caller can change', () => {
    const first = chosenGraphemes([]);
    assert.deepEqual(first, ['s', 'a', 't', 'p']);
    first.push('zz');
    assert.deepEqual(WEEKS[0].g, ['s', 'a', 't', 'p']);
  });
});

describe('taughtUpTo', () => {
  it('lists every week up to the last chosen one, including weeks not ticked', () => {
    assert.deepEqual(taughtUpTo(['Autumn 1-2']), ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k']);
  });
  it('is the first week when none is chosen', () => {
    assert.deepEqual(taughtUpTo([]), ['s', 'a', 't', 'p']);
  });
});
