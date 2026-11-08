// Shared by the unit tests. Run them all with: node --test "tests/**/*.test.js"
'use strict';

// The same repeatable random numbers for the same seed, so a failing test fails the same way every time.
function seeded(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Enough seeds to reach every case a child could meet, quickly.
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
// True when no run of `size` in a row has the same item twice
const allDifferentInRuns = (list, size) => list.every((_, i) => i + size > list.length || new Set(list.slice(i, i + size)).size === size);

module.exports = { seeded, SEEDS, pairs, allDifferentInRuns };
