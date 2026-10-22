import { createBattle, tick, weaponStates } from '../../../js/battle.js';
import { isDestroyed } from '../../../js/rooms.js';
import { momentumOf } from '../../../js/body.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.route.split.v2 (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but for
// its id; its record moves because a round stopped in the hull now joins the body (B4) with its momentum, so the
// target's own books (not the two-ship book) take the stopped rounds' momentum: in the naive order its unchecked
// residual reads 1.06 N s of 19 203 (the rounds' m u at the hull's speed); the split's check (1e-12 x gross) is
// unchanged and holds.
// B3 of L4b (DESIGN.md 13l.4), successor of L4.route.split (13l.7, #271: U1, C2, TOL1): split at a choke point (and cut the power walls: one mechanism in this kernel, 13l.2).
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
  id: 'L4.route.split.v3',
  level: 'L4',
  laws: ['a ship cut through its choke point splits into fragments with momentum conserved (13f.1)', 'power and control run over live walls: the half without a reactor has no power, the half without a bridge SCRAMs (#192, 13l.2)', 'Disabled after battle.disabledSeconds with no able weapon (#255, 13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target T-neck (mission0/targets.js), attacker R1d at rest 900 m from its centre of mass on bearing -y, bow-on; (split) its turret fires at the neck (the hold); (naive) at the beam bay; 120 s at most (13l.4 B3)',
  measure: 'the first step after which the target is in more than one body, and the number of bodies then; the target\'s momentum books at that step against the start (bodies + debris + rounds + what left play less the external impulse, the hits booked there); the step the battle ends; (split) the shot whose cell-destroyed event split it, the shots launched and the hits made by that step; (naive) whether it ends in 120 s, whether the beam bay is destroyed and the turret able at 120 s',
  tolerance: 'momentum 1e-12 x the gross (13l.7 TOL1: the residues on record are 7.6e-18 and 8.3e-16 of the gross); step counts exact',
  criterion: '(split) the neck\'s cut splits the target into exactly two bodies; its momentum is conserved across the split with the impulse the hits gave it (|dP - dJ| <= 1e-12 x the gross + 1e-12, 13l.7 TOL1); the forward half loses its power and the aft half its bridge in that step, so the target is Disabled exactly 600 steps (battle.disabledSeconds / dt) after the split step, and no explosion; (split, 13l.7 U1) kernel-read literal, pinned as a regression (tools/estimates/hygiene.mjs (1); the blind checker re-derived 4 at L4b, #267 (11)): the split is made by shot-4, with 4 shots launched and 4 hits by that step; (N2) the gap is the literal 600 steps (10 s / (1/60) s); (naive) the beam bay destroyed, the turret still able: neither Disabled nor destroyed in 120 s (13l.3: "the naive order is not Disabled in 120 s"), and at 120 s the beam bay is destroyed and the turret is able (13l.1\'s rule, js/battle.js weaponStates) (13l.7 C2)',
  tunable: ['battle.disabledSeconds'],
  locked: { date: '2026-10-22', hash: 'b6859789' },
  cases() {
    return [{ order: 'split', aim: 'hold' }, { order: 'naive', aim: 'beamBay' }];
  },
  expected(ctx, c) {
    return c.order === 'split' ? { bodies: 2, gap: 600, shot: 'shot-4', launched: 4, hits: 4 } : { limit: 120 }; // 600 hand-worked; shot-4, 4, 4 kernel-read
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS['T-neck'], bearing: '-y', plan: { turret: [c.aim] } });
    const w = b.target.world, start = books(w);
    let split = null;
    while (!b.ended && b.step < Math.round(120 / b.dt)) {
      tick(b);
      if (!split && w.ship.bodies.length > 1) {
        const now = books(w), dP = [now.P[0] - start.P[0] - (now.J[0] - start.J[0]), now.P[1] - start.P[1] - (now.J[1] - start.J[1])];
        const cut = [...w.log.events].reverse().find((e) => e.type === 'cell-destroyed');
        split = { step: b.step, bodies: w.ship.bodies.length, dP: len(dP), gross: Math.max(start.gross, now.gross, len([now.J[0] - start.J[0], now.J[1] - start.J[1]])), cause: cut ? cut.cause : null, launched: b.shots, hits: new Set(b.hits.filter((h) => Math.round(h.t / b.dt) <= b.step).map((h) => h.id)).size };
      }
    }
    return {
      split, ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, why: b.ended.why } : null,
      explosions: w.log.events.filter((e) => e.type === 'explosion').length, t: b.t,
      beamBayDestroyed: isDestroyed(b.target.room('beamBay')), turretAble: weaponStates(w).some((x) => x.room.id === 'turret' && x.able),
    };
  },
  compare(e, a, c) {
    const checks = c.order === 'split' ? {
      'two bodies at the split': !!a.split && a.split.bodies === e.bodies,
      'momentum conserved with the hits (1e-12 x gross)': !!a.split && a.split.dP <= 1e-12 * a.split.gross + 1e-12,
      'Disabled 600 steps after the split, no explosion': !!a.split && !!a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.ended.step - a.split.step === e.gap && a.explosions === 0,
      'split by shot-4, 4 launched, 4 hits (kernel-read)': !!a.split && a.split.cause === e.shot && a.split.launched === e.launched && a.split.hits === e.hits,
    } : {
      'not ended in 120 s': a.ended === null && a.t >= e.limit - 1e-9,
      'the beam bay destroyed, the turret able at 120 s': a.beamBayDestroyed && a.turretAble,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: r.case.order === 'split' ? `${r.expected.bodies} bodies by ${r.expected.shot}; |dP - dJ| <= 1e-12 gross; Disabled ${r.expected.gap} steps after the split` : `no end in ${r.expected.limit} s; beam bay destroyed, turret able`, actual: `${a.split ? `split at step ${a.split.step} into ${a.split.bodies} by ${a.split.cause} (${a.split.launched} launched, ${a.split.hits} hits; |dP - dJ| ${a.split.dP.toExponential(3)} of gross ${a.split.gross.toExponential(3)})` : 'no split'}; beam bay destroyed ${a.beamBayDestroyed}, turret able ${a.turretAble}; ${a.ended ? `${a.ended.kind} ${a.ended.side} at step ${a.ended.step} (${a.ended.why})` : `no end by ${a.t.toFixed(3)} s`}` };
  },
};
