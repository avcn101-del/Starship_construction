import { createBattle, tick } from '../../../js/battle.js';
import { momentumOf } from '../../../js/body.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B3 of L4b (DESIGN.md 13l.4): split at a choke point (and cut the power walls: one mechanism in this kernel, 13l.2).
// The battle loop (js/battle.js, 13l.1): T-neck (13l.2) the static target at T1, the attacker R1d at rest 900 m away
// on bearing -y, bow-on. (split) its turret fires at the neck, the 2 x 2 hold [5, 7) x [2, 4), open from -y; (naive)
// it fires at the beam bay [11, 13) x [2, 4) instead, 120 s.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const len = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
/** The target ship's momentum books: bodies + debris + rounds + what left play, the gross magnitude, the external impulse (hits, RCS). */
function books(world) {
  const s = world.ship, m = momentumOf(s), left = s.left || { P: [0, 0] };
  let gross = len(left.P);
  for (const b of s.bodies) gross += b.M * len(b.v);
  for (const d of s.debris) gross += d.m * len(d.v);
  for (const r of s.rounds) gross += r.m * len(r.v);
  return { P: [m.P[0] + left.P[0], m.P[1] + left.P[1]], gross, J: [...s.external.J] };
}

export default {
  id: 'L4.route.split',
  level: 'L4',
  laws: ['a ship cut through its choke point splits into fragments with momentum conserved (13f.1)', 'power and control run over live walls: the half without a reactor has no power, the half without a bridge SCRAMs (#192, 13l.2)', 'Disabled after battle.disabledSeconds with no able weapon (#255, 13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target T-neck (mission0/targets.js), attacker R1d at rest 900 m from its centre of mass on bearing -y, bow-on; (split) its turret fires at the neck (the hold); (naive) at the beam bay; 120 s at most (13l.4 B3)',
  measure: 'the first step after which the target is in more than one body, and the number of bodies then; the target\'s momentum books at that step against the start (bodies + debris + rounds + what left play less the external impulse, the hits booked there); the step the battle ends; (naive) whether it ends in 120 s',
  tolerance: 'momentum 1e-9 x the gross (#220); step counts exact',
  criterion: '(split) the neck\'s cut splits the target into exactly two bodies; its momentum is conserved across the split with the impulse the hits gave it (|dP - dJ| <= 1e-9 x the gross + 1e-12); the forward half loses its power and the aft half its bridge in that step, so the target is Disabled exactly 600 steps (battle.disabledSeconds / dt) after the split step, and no explosion; (naive) the beam bay destroyed, the turret still able: neither Disabled nor destroyed in 120 s (13l.3: "the naive order is not Disabled in 120 s")',
  tunable: ['battle.disabledSeconds', 'kinetic.hitsToWreck'],
  locked: null,
  cases() {
    return [{ order: 'split', aim: 'hold' }, { order: 'naive', aim: 'beamBay' }];
  },
  expected(ctx, c) {
    return c.order === 'split' ? { bodies: 2, gap: Math.round(ctx.params.battle.disabledSeconds.value / ctx.dt) } : { limit: 120 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS['T-neck'], bearing: '-y', plan: { turret: [c.aim] } });
    const w = b.target.world, start = books(w);
    let split = null;
    while (!b.ended && b.step < Math.round(120 / b.dt)) {
      tick(b);
      if (!split && w.ship.bodies.length > 1) {
        const now = books(w), dP = [now.P[0] - start.P[0] - (now.J[0] - start.J[0]), now.P[1] - start.P[1] - (now.J[1] - start.J[1])];
        split = { step: b.step, bodies: w.ship.bodies.length, dP: len(dP), gross: Math.max(start.gross, now.gross, len([now.J[0] - start.J[0], now.J[1] - start.J[1]])) };
      }
    }
    return {
      split, ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, why: b.ended.why } : null,
      explosions: w.log.events.filter((e) => e.type === 'explosion').length, t: b.t,
    };
  },
  compare(e, a, c) {
    const checks = c.order === 'split' ? {
      'two bodies at the split': !!a.split && a.split.bodies === e.bodies,
      'momentum conserved with the hits': !!a.split && a.split.dP <= 1e-9 * a.split.gross + 1e-12,
      'Disabled 600 steps after the split, no explosion': !!a.split && !!a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.ended.step - a.split.step === e.gap && a.explosions === 0,
    } : {
      'not ended in 120 s': a.ended === null && a.t >= e.limit - 1e-9,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: r.case.order === 'split' ? `${r.expected.bodies} bodies; |dP - dJ| <= 1e-9 gross; Disabled ${r.expected.gap} steps after the split` : `no end in ${r.expected.limit} s`, actual: `${a.split ? `split at step ${a.split.step} into ${a.split.bodies} (|dP - dJ| ${a.split.dP.toExponential(3)} of gross ${a.split.gross.toExponential(3)})` : 'no split'}; ${a.ended ? `${a.ended.kind} ${a.ended.side} at step ${a.ended.step} (${a.ended.why})` : `no end by ${a.t.toFixed(3)} s`}` };
  },
};
