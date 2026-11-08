// What the questions must do, in the game's own words: what a child is asked, which answers they choose from, and
// how the grown-ups' settings change that. These were written before js/learning.js existed, from the outside in;
// the unit tests in tests/unit/ cover each rule on its own. The words used here are in docs/domain.md.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { seeded, SEEDS, allDifferentInRuns } = require('../helpers');
const learning = require('../../js/learning.js');

const graphemesOf = weekIds => learning.WEEKS.filter(w => weekIds.includes(w.id)).flatMap(w => w.g);
const AUTUMN_1 = ['Autumn 1-0', 'Autumn 1-1', 'Autumn 1-2', 'Autumn 1-3', 'Autumn 1-4'];

// Letter questions, asked one after another as the game asks them
function askLetters(weeks, count, random) {
  let recent = [];
  return Array.from({ length: count }, () => {
    const picked = learning.pickGrapheme(weeks, recent, random);
    recent = picked.recent;
    return { target: picked.grapheme, answers: learning.letterAnswers(picked.grapheme, weeks, random) };
  });
}

// Pairs a child must never choose between: they look alike, or they are two ways to write one sound.
// CLAUDE.md: "Distractors never pair lookalikes (b/d/p) or same-sound spellings (c/k/ck)".
const LOOK_ALIKE = [['b', 'd'], ['b', 'p'], ['d', 'p'], ['p', 'qu'], ['m', 'n'], ['m', 'w'], ['n', 'u'], ['n', 'h'], ['i', 'l'], ['i', 'j'], ['j', 'y']];
const SOUND_ALIKE = [['c', 'k'], ['c', 'ck'], ['k', 'ck'], ['f', 'ff'], ['l', 'll'], ['s', 'ss'], ['z', 'zz'], ['oo_l', 'oo_s'], ['x', 'ck'], ['qu', 'k']];
const NEVER_TOGETHER = [...LOOK_ALIKE, ...SOUND_ALIKE];

describe('A letter question', () => {
  it('asks for a letter or sound from the weeks the grown-up chose', () => {
    const weeks = ['Autumn 1-1', 'Autumn 2-3'];
    for (const seed of SEEDS.slice(0, 20)) {
      for (const q of askLetters(weeks, 30, seeded(seed))) assert.ok(graphemesOf(weeks).includes(q.target), `${q.target} isn't in the chosen weeks`);
    }
  });

  it('uses the first week (s, a, t, p) when no week is chosen', () => {
    const asked = new Set(askLetters([], 40, seeded(1)).map(q => q.target));
    assert.deepEqual([...asked].sort(), ['a', 'p', 's', 't']);
  });

  it("doesn't ask again for any of the last four letters it asked", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const targets = askLetters(AUTUMN_1, 200, seeded(seed)).map(q => q.target);
      assert.ok(allDifferentInRuns(targets, 5), `a letter came back within five questions: ${targets.join(' ')}`);
    }
  });

  it('with only four letters chosen, asks all four before any comes back', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const targets = askLetters(['Autumn 1-0'], 40, seeded(seed)).map(q => q.target);
      assert.ok(allDifferentInRuns(targets, 4), targets.join(' '));
    }
  });
});

describe('The answers to a letter question', () => {
  it('are three: the letter asked for and two others', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const q of askLetters(AUTUMN_1, 20, seeded(seed))) {
        assert.equal(q.answers.length, 3);
        assert.equal(new Set(q.answers).size, 3, `the same answer twice: ${q.answers}`);
        assert.ok(q.answers.includes(q.target));
      }
    }
  });

  it('never show two that look alike (b, d, p) or sound alike (c, k, ck)', () => {
    const everyWeek = learning.WEEKS.map(w => w.id);
    for (const seed of SEEDS) {
      for (const q of askLetters(everyWeek, 10, seeded(seed))) {
        for (const [a, b] of NEVER_TOGETHER) assert.ok(!(q.answers.includes(a) && q.answers.includes(b)), `${a} and ${b} shown together: ${q.answers}`);
      }
    }
  });

  it('come from the chosen weeks when those have enough', () => {
    // i n m d: m looks like n, so asking for n leaves exactly i and d
    for (const seed of SEEDS.slice(0, 50)) {
      assert.deepEqual([...learning.letterAnswers('n', ['Autumn 1-1'], seeded(seed))].sort(), ['d', 'i', 'n']);
    }
    for (const seed of SEEDS.slice(0, 50)) {
      for (const q of askLetters(['Autumn 1-0'], 8, seeded(seed))) assert.ok(q.answers.every(a => ['s', 'a', 't', 'p'].includes(a)), `${q.answers}`);
    }
  });

  it('fill up from the weeks taught before when the chosen weeks are short', () => {
    // the last Spring 1 week has only air and er
    const earlier = graphemesOf(learning.WEEKS.slice(0, -1).map(w => w.id));
    for (const seed of SEEDS.slice(0, 50)) {
      const answers = learning.letterAnswers('er', ['Spring 1-3'], seeded(seed));
      assert.ok(answers.includes('air'), `the other chosen sound comes first: ${answers}`);
      assert.ok(answers.filter(a => !['er', 'air'].includes(a)).every(a => earlier.includes(a)), `${answers}`);
    }
  });
});

describe('A number question', () => {
  for (const nums of [5, 10]) {
    it(`with numbers 1 to ${nums}, asks for each of them, and offers two other numbers in that range`, () => {
      const asked = new Set();
      for (const seed of SEEDS) {
        const q = learning.numberQuestion(nums, seeded(seed));
        asked.add(q.target);
        assert.equal(q.answers.length, 3);
        assert.equal(new Set(q.answers).size, 3, `the same number twice: ${q.answers}`);
        assert.ok(q.answers.includes(q.target));
        assert.ok(q.answers.every(n => Number.isInteger(n) && n >= 1 && n <= nums), `outside 1 to ${nums}: ${q.answers}`);
      }
      assert.equal(asked.size, nums, `asked only for ${[...asked].sort((a, b) => a - b)}`);
    });
  }
});

describe('A counting question', () => {
  const counts = nums => new Set(SEEDS.map(seed => learning.gemsToCount(nums, seeded(seed))));
  it('with numbers 1 to 5, asks for 2 to 5 gems', () => assert.deepEqual([...counts(5)].sort(), [2, 3, 4, 5]));
  it('with numbers 1 to 10, asks for 3 to 7 gems', () => assert.deepEqual([...counts(10)].sort(), [3, 4, 5, 6, 7]));
});

describe('The game mode sets the order of questions', () => {
  const firstSix = mode => Array.from({ length: 6 }, (_, i) => learning.questionType(mode, i));
  it('abc letters: letters only', () => assert.deepEqual(firstSix('literacy'), ['match', 'match', 'match', 'match', 'match', 'match']));
  it('123 numbers: a number, then counting, in turn', () => assert.deepEqual(firstSix('numeracy'), ['number', 'count', 'number', 'count', 'number', 'count']));
  it('a1 both: a letter, a number, then counting, in turn', () => assert.deepEqual(firstSix('both'), ['match', 'number', 'count', 'match', 'number', 'count']));
  it('a mode it doesn\'t know plays as both', () => assert.deepEqual(firstSix('nonsense'), firstSix('both')));
});

describe('Every pair the game keeps apart', () => {
  it('is a pair of real graphemes', () => {
    for (const [a, b] of NEVER_TOGETHER) assert.ok(a in learning.G && b in learning.G, `${a} or ${b}`);
  });
});
