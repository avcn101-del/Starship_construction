import { createBattle, runBattle } from '../../../js/battle.js';
import { createDuel } from '../../../tools/duel.js';
import { SENSOR_SHIPS } from '../../targets.js';

// J7 of L5e1 (DESIGN.md 13n.8 "A simultaneous end", #315): when both sides meet an end condition in the same step the
// battle ends as a draw, both sides named; it replaces the kernel's processing order (side A first), which no decision
// chose, as the end's tie-break. In E5's win rates a draw counts half a win for each, in E6 none (tools/sweep.mjs).
//
// Setup (T1): (mirror) the exact mirror of tools/estimates/l5e1.mjs (4): createBattle with knowledge on, R1d-A against
// R1d-A, bearing +x (each on the other's bow) at 900 m, seed 1, both sides the standard enemy (personality 0.5 each),
// run to the end or 300 s; (one-sided) tools/duel.js's default duel (Fire against the standard enemy), whose end is one
// side's (destroyed T at 25.08 s, #312's measure).
// Hand-worked: identical ships, identical orders and a symmetric opening make every step of A the mirror of T's, so
// whatever ends one ends the other in the same step: the plan's step 1613 (26.88 s: both reactors and magazines
// explode then, 13n.8 (4)); the draw is each side's own end kept (s.ended) and a 'draw' event in each log, its parent
// that side's own end event.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

export default {
  id: 'L4.end.simultaneous',
  level: 'L4',
  laws: ['a simultaneous end: both sides meeting an end condition in the same step end the battle as a draw, both named (#315, 13n.8)'],
  dependsOn: ['L4.enemy.decide', 'L4.play.replay'],
  setup: 'T1: createBattle, knowledge on, R1d-A against R1d-A on each other\'s bow at 900 m, seed 1, both the standard enemy, to the end or 300 s (mirror); tools/duel.js\'s default duel (one-sided) (13n.8 J7)',
  measure: 'battle.ended (kind, step, sides, each side\'s own end); each side\'s ended; the draw events and their parents',
  tolerance: 'exact (the step)',
  criterion: '(mirror) a draw at step 1613: battle.ended.kind draw, sides A and T, each side\'s own end at step 1613, a draw event in each log whose parent is that side\'s own end event; (one-sided) no draw: one side ended, the other not',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'mirror' }, { name: 'one-sided' }];
  },
  expected(ctx, c) {
    return c.name === 'mirror' ? { kind: 'draw', step: 1613 } : { kind: 'not a draw' };
  },
  run(ctx, c) {
    const b = c.name === 'mirror'
      ? createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: SENSOR_SHIPS['R1d-A'], bearing: '+x', distance: 900, seed: 1, knowledge: true, enemy: { A: STD, T: STD } })
      : createDuel({});
    runBattle(b, 300);
    const e = b.ended, draws = b.sides.map((s) => s.world.log.events.filter((x) => x.type === 'draw').map((x) => ({ parent: x.parent, other: x.other })));
    return {
      ended: e ? { kind: e.kind, step: e.step, side: e.side, sides: e.sides || null, ends: e.ends || null } : null,
      sides: b.sides.map((s) => (s.ended ? { kind: s.ended.kind, step: s.ended.step, event: s.ended.event } : null)), draws,
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'mirror') {
      const [A, T] = a.sides;
      checks = {
        'a draw at step 1613': !!a.ended && a.ended.kind === 'draw' && a.ended.step === e.step,
        'both sides named': !!a.ended && JSON.stringify(a.ended.sides) === '["A","T"]',
        'each side\'s own end at that step': !!A && !!T && A.step === e.step && T.step === e.step,
        'a draw event in each log, its parent the side\'s own end, naming the other\'s': a.draws[0].length === 1 && a.draws[1].length === 1 && a.draws[0][0].parent === A.event && a.draws[1][0].parent === T.event && a.draws[0][0].other === T.kind && a.draws[1][0].other === A.kind,
      };
    } else {
      checks = { 'one side ended, the other not, no draw': !!a.ended && a.ended.kind !== 'draw' && a.sides.filter(Boolean).length === 1 && a.draws.every((d) => d.length === 0) };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: r.expected.kind === 'draw' ? `draw at step ${r.expected.step}, both named` : 'one side ends, no draw', actual: a.ended ? `${a.ended.kind} ${a.ended.side} at step ${a.ended.step}; sides ${a.sides.map((s) => (s ? `${s.kind}@${s.step}` : '-')).join(' / ')}` : 'no end' };
  },
};
