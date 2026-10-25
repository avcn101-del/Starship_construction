import { outcomeOf, scoreOf, survives, tally, bestTry } from '../../../tools/sweep.mjs';

// U1 of the tools pass (DESIGN.md 13n.11, #336, #338, #351): the sweep's one outcome function and its best-response
// ranking, on constructed results (test inputs, no battle). A battle's outcome for each side is one of win (the other
// side ends destroyed, Disabled or surrendered), loss (this side does), escape (this side escaped), let go (the other
// escaped), draw (both end in one step, #315), stalemate (ended.kind 'stalemate', #337 (D)), no end (none by the
// limit). E5's score: a win 1, a draw 1/2, everything else 0 (#336: an escape is no win). Survival: every outcome but
// a loss and a draw (#351 (1)). The ranking (#338): wins, then survival, then crew alive; a full tie keeps the first
// try (the current set, then slot order).
//
// Setup: (ends) one battle end of each kind for each side: destroyed, disabled, surrender and escaped by A and by T;
// a draw; a stalemate; no end (null); each side's outcomeOf, scoreOf and survives. (ranking) three tries of four
// results each for side A, tied on wins (1.5 each: win + draw), survival 2 / 3 / 3, crew alive 10 / 8 / 12 (summed
// over the four), through tally and bestTry; (crew equal) the same with the second try's crew 12.
// Hand-worked from the rule above: an end by side X is X's loss and the other's win when its kind is destroyed,
// disabled or surrender; X's escape and the other's let go when escaped; both sides' draw, stalemate or no end
// otherwise. Score 1 for win, 1/2 for draw, 0 else; survival false for loss and draw only. Ranking: wins tie (1.5),
// survival 3 beats 2, so tries 1 and 2 remain; crew 12 beats 8: try 2. With crew 12 and 12, the first: try 1.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const END = (kind, side) => ({ kind, side, t: 1, step: 60 });
const ENDS = [
  ['destroyed by A', END('destroyed', 'A')], ['disabled by A', END('disabled', 'A')], ['surrender by A', END('surrender', 'A')], ['escaped by A', END('escaped', 'A')],
  ['destroyed by T', END('destroyed', 'T')], ['disabled by T', END('disabled', 'T')], ['surrender by T', END('surrender', 'T')], ['escaped by T', END('escaped', 'T')],
  ['draw', { kind: 'draw', side: 'A,T', sides: ['A', 'T'], t: 1, step: 60 }], ['stalemate', { kind: 'stalemate', side: 'A,T', t: 1, step: 60 }], ['no end', null],
];
// The expected outcomes [A, T] per end, from the rule (not from a run).
const EXPECT = {
  'destroyed by A': ['loss', 'win'], 'disabled by A': ['loss', 'win'], 'surrender by A': ['loss', 'win'], 'escaped by A': ['escape', 'letGo'],
  'destroyed by T': ['win', 'loss'], 'disabled by T': ['win', 'loss'], 'surrender by T': ['win', 'loss'], 'escaped by T': ['letGo', 'escape'],
  draw: ['draw', 'draw'], stalemate: ['stalemate', 'stalemate'], 'no end': ['noEnd', 'noEnd'],
};
const SCORE = { win: 1, loss: 0, escape: 0, letGo: 0, draw: 0.5, stalemate: 0, noEnd: 0 };
const SURVIVES = { win: true, loss: false, escape: true, letGo: true, draw: false, stalemate: true, noEnd: true };
/** A constructed result: side A's outcome and crew alive (side T's mirrored from the same end). */
const res = (end, crewA) => ({ outcome: { A: outcomeOf(end, 'A'), T: outcomeOf(end, 'T') }, crew: { A: crewA, T: 0 } });
const WIN = END('destroyed', 'T'), LOSS = END('destroyed', 'A'), ESC = END('escaped', 'A'), LET = END('escaped', 'T'), DRAW = ENDS[8][1], STALE = ENDS[9][1];
const tries = (crew1) => [
  [res(WIN, 4), res(DRAW, 2), res(LOSS, 0), res(ESC, 4)], // wins 1.5, survival 2 (win, escape), crew 10
  [res(WIN, 2), res(DRAW, 2), res(ESC, 2), res(LET, crew1 - 6)], // wins 1.5, survival 3 (win, escape, let go), crew 8 or 12
  [res(WIN, 3), res(DRAW, 3), res(STALE, 3), res(null, 3)], // wins 1.5, survival 3 (win, stalemate, no end), crew 12
];

export default {
  id: 'L4.sweep.scoring',
  level: 'L4',
  laws: ['the sweep counts each side\'s outcome apart, scores E5 as a win 1, a draw 1/2, else 0, and ranks a best response by wins, then survival, then crew alive (#336, #338, #351, 13n.11)'],
  dependsOn: [],
  setup: 'tools/sweep.mjs\'s exported outcomeOf, scoreOf, survives, tally and bestTry on constructed results (test inputs, no battle): one end of each kind for each side; three tries of four results for side A tied on wins (1.5), survival 2 / 3 / 3, crew 10 / 8 / 12, and again with the second try\'s crew 12 (13n.11 U1)',
  measure: 'each side\'s outcome, score and survival per end; each try\'s tally (wins, survival, crew); the index bestTry picks',
  tolerance: 'exact',
  criterion: 'each side\'s outcome as the rule (destroyed, disabled, surrender: loss for the side, win for the other; escaped: escape and let go; draw, stalemate, no end for both); score win 1, draw 1/2, else 0; survival false only for loss and draw; the ranking picks the third try (index 2) with crew 10 / 8 / 12 and the second (index 1) with crew 10 / 12 / 12',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'ends' }, { name: 'ranking' }, { name: 'crew equal' }];
  },
  expected(ctx, c) {
    if (c.name === 'ends') return { outcomes: EXPECT, score: SCORE, survives: SURVIVES };
    return { tallies: [{ wins: 1.5, survival: 2, crew: 10 }, { wins: 1.5, survival: 3, crew: c.name === 'ranking' ? 8 : 12 }, { wins: 1.5, survival: 3, crew: 12 }], best: c.name === 'ranking' ? 2 : 1 };
  },
  run(ctx, c) {
    if (c.name === 'ends') {
      const rows = ENDS.map(([name, e]) => {
        const o = [outcomeOf(e, 'A'), outcomeOf(e, 'T')];
        return { name, outcomes: o, score: o.map(scoreOf), survives: o.map(survives) };
      });
      return { rows };
    }
    const t = tries(c.name === 'ranking' ? 8 : 12).map((r) => tally(r, 'A'));
    return { tallies: t.map(({ wins, survival, crew }) => ({ wins, survival, crew })), best: bestTry(t) };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'ends') {
      checks = {
        'each side\'s outcome as the rule': a.rows.length === ENDS.length && a.rows.every((r) => JSON.stringify(r.outcomes) === JSON.stringify(e.outcomes[r.name])),
        'score win 1, draw 1/2, else 0': a.rows.every((r) => r.outcomes.every((o, k) => r.score[k] === e.score[o])),
        'survival false only for loss and draw': a.rows.every((r) => r.outcomes.every((o, k) => r.survives[k] === e.survives[o])),
      };
    } else {
      checks = {
        'the tallies (wins, survival, crew)': JSON.stringify(a.tallies) === JSON.stringify(e.tallies),
        [`the ranking picks try ${e.best}`]: a.best === e.best,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (a.rows) return { expected: 'outcomes, scores and survival as the rule, per end and side', actual: a.rows.map((x) => `${x.name}: ${x.outcomes.join('/')}`).join('; ') };
    return { expected: `try ${e.best} of ${JSON.stringify(e.tallies)}`, actual: `try ${a.best} of ${JSON.stringify(a.tallies)}` };
  },
};
