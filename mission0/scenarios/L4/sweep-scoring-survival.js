import { outcomeOf, tally, bestTry, OUTCOMES } from '../../../tools/sweep.mjs';

// U3 of the tools pass's fix round (DESIGN.md 13n.11 "Fix round", #361; beside U1 L4.sweep.scoring, which stands):
// U1's tries cannot tell #338's second key, survival, from its third, crew alive (its survival-2 try also has the
// least crew), and it tallies side A only. (ranking) Three tries of four results each for side A, tied on wins (1.5
// each: a win and a draw), survival 3 / 2 / 3, crew alive 8 / 14 / 9, through tally and bestTry. (mirror) tally on
// a list of results and on the same list with A and T swapped in each result (outcome and crew): side T's tally of
// the swapped list equals side A's of the original, and side A's of the swapped equals side T's of the original.
// Hand-worked from the ranking (#338: wins, then survival, then crew alive; a full tie keeps the first): wins tie at
// 1.5; survival 3 beats 2, so try 1 (crew 14) is out despite the most crew; between tries 0 and 2 crew 9 beats 8:
// try 2. A ranking by wins then crew alone would pick try 1. The mirror: a side's tally reads only that side's
// outcome and crew, so swapping the sides swaps the tallies; the list is asymmetric (A: win, loss, escape, stalemate,
// crew 5 + 0 + 7 + 3 = 15; T: loss, win, let go, stalemate, crew 0 + 11 + 2 + 4 = 17), so a tally that read side A
// whatever its argument would give T A's counts and fail.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const END = (kind, side) => ({ kind, side, t: 1, step: 60 });
const WIN = END('destroyed', 'T'), LOSS = END('destroyed', 'A'), ESC = END('escaped', 'A'), LET = END('escaped', 'T');
const DRAW = { kind: 'draw', side: 'A,T', sides: ['A', 'T'], t: 1, step: 60 }, STALE = { kind: 'stalemate', side: 'A,T', t: 1, step: 60 };
/** A constructed result from a battle end and each side's crew alive (test inputs, no battle). */
const res = (end, crewA, crewT = 0) => ({ outcome: { A: outcomeOf(end, 'A'), T: outcomeOf(end, 'T') }, crew: { A: crewA, T: crewT } });
const TRIES = [
  [res(WIN, 2), res(DRAW, 2), res(ESC, 2), res(LET, 2)], // wins 1.5, survival 3 (win, escape, let go), crew 8
  [res(WIN, 5), res(DRAW, 5), res(LOSS, 0), res(ESC, 4)], // wins 1.5, survival 2 (win, escape), crew 14
  [res(WIN, 3), res(DRAW, 2), res(STALE, 2), res(null, 2)], // wins 1.5, survival 3 (win, stalemate, no end), crew 9
];
const LIST = [res(WIN, 5, 0), res(LOSS, 0, 11), res(ESC, 7, 2), res(STALE, 3, 4)];
const swap = (r) => ({ outcome: { A: r.outcome.T, T: r.outcome.A }, crew: { A: r.crew.T, T: r.crew.A } });
// The expected tallies of LIST, from the rule (not from a run).
const ZERO = Object.fromEntries(OUTCOMES.map((k) => [k, 0]));
const EXPECT_A = { wins: 1, survival: 3, crew: 15, outcomes: { ...ZERO, win: 1, loss: 1, escape: 1, stalemate: 1 } };
const EXPECT_T = { wins: 1, survival: 3, crew: 17, outcomes: { ...ZERO, win: 1, loss: 1, letGo: 1, stalemate: 1 } };
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

export default {
  id: 'L4.sweep.scoring.survival',
  level: 'L4',
  laws: ['the sweep\'s best response ranks by wins, then survival, then crew alive, survival before crew (#338), and a side\'s tally reads that side (#351, 13n.11 fix round, #361)'],
  dependsOn: [],
  setup: 'tools/sweep.mjs\'s exported outcomeOf, tally and bestTry on constructed results (test inputs, no battle): three tries of four results for side A tied on wins (1.5), survival 3 / 2 / 3, crew 8 / 14 / 9; a list of four asymmetric results tallied for A and T, and the same list with A and T swapped (13n.11 U3, #361)',
  measure: 'each try\'s tally (wins, survival, crew) and the index bestTry picks; the tallies of the list and of the swapped list for each side',
  tolerance: 'exact',
  criterion: 'the tallies 1.5 / 3 / 8, 1.5 / 2 / 14, 1.5 / 3 / 9 and the ranking picks the third try (index 2); the list\'s tally for A is wins 1, survival 3, crew 15 (win, loss, escape, stalemate 1 each) and for T wins 1, survival 3, crew 17 (win, loss, let go, stalemate 1 each); the swapped list\'s tally for T equals the list\'s for A, and for A the list\'s for T',
  tunable: [],
  locked: { date: '2026-10-25', hash: 'ec178589' },
  cases() {
    return [{ name: 'survival before crew' }, { name: 'side T mirrored' }];
  },
  expected(ctx, c) {
    if (c.name === 'survival before crew') return { tallies: [{ wins: 1.5, survival: 3, crew: 8 }, { wins: 1.5, survival: 2, crew: 14 }, { wins: 1.5, survival: 3, crew: 9 }], best: 2 };
    return { A: EXPECT_A, T: EXPECT_T };
  },
  run(ctx, c) {
    if (c.name === 'survival before crew') {
      const t = TRIES.map((r) => tally(r, 'A'));
      return { tallies: t.map(({ wins, survival, crew }) => ({ wins, survival, crew })), best: bestTry(t) };
    }
    const sw = LIST.map(swap);
    return { A: tally(LIST, 'A'), T: tally(LIST, 'T'), swappedA: tally(sw, 'A'), swappedT: tally(sw, 'T') };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'survival before crew') {
      checks = { 'the tallies (wins, survival, crew)': same(a.tallies, e.tallies), 'the ranking picks try 2 (survival before crew)': a.best === e.best };
    } else {
      checks = {
        'the list\'s tally for A': same(a.A, e.A),
        'the list\'s tally for T': same(a.T, e.T),
        'the swapped list\'s tally for T equals the list\'s for A': same(a.swappedT, a.A),
        'the swapped list\'s tally for A equals the list\'s for T': same(a.swappedA, a.T),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (a.tallies) return { expected: `try ${e.best} of ${JSON.stringify(e.tallies)}`, actual: `try ${a.best} of ${JSON.stringify(a.tallies)}` };
    const s = (x) => `wins ${x.wins}, survival ${x.survival}, crew ${x.crew}`;
    return { expected: `A ${s(e.A)}; T ${s(e.T)}; swapped T = A, swapped A = T`, actual: `A ${s(a.A)}; T ${s(a.T)}; swapped A ${s(a.swappedA)}; swapped T ${s(a.swappedT)}` };
  },
};
