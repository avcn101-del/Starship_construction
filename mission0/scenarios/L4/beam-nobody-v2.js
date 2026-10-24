import { createBattle, tick, battleEnergy } from '../../../js/battle.js';
import { BUILDS } from '../../builds.js';
import { TARGETS } from '../../targets.js';

// Successor of L4.beam.nobody (§17 item 55's pass, DESIGN.md 13n.9 K4, #245, #327): the predecessor pinned step 9524
// of one battle between two helms (R2 against the Lance, 600 m bow), which any helm change moves (#335's laws end that
// battle with the attacker destroyed at step 4388). This one is constructed with no helm, so the helm cannot move it.
// §17 item 53: a beam into a ship with no body. In the step in which the target's reactor explosion destroys every cell
// of it, the attacker's beam was laid on its hull before the step (beamsIn) and passed power; after the step (beamsOut)
// the target has no body. The rule: a ship with no body is destroyed by the explosion that took its last cell
// (checkEnd: a reactor's 'explosion' ends its side as 'destroyed', by 'explosion', at the step of the explosion, the
// event its parent); the beam meets no matter, deposits nothing, and all it passed leaves play as fireBeam's `escaped`
// (passed x dt, the book of a beam that leaves the ship).
// Setup: R2 the static attacker on its plan (a case's test input: the beam and the turret on R1's reactor; knowledge off), R1 the
// static target (heading 0, no shield up), 600 m on bearing -y, seed 1; to the end or 600 s. The rounds and the beam break into the
// reactor until its breach countdown ends in the explosion that takes every cell. The step 4364 is kernel-read (the
// engineer's search on the head of #335's laws, labelled as such, as the predecessor's 9524), not hand-worked.
// The energy book is checked as L4.books.energy checks it (battleEnergy after every step with a hit and at the end;
// the largest |total - total0| against 1e-9 x the largest gross, #220).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.beam.nobody.v2',
  level: 'L4',
  laws: ['a beam whose target has no matter left deposits nothing; what it passed leaves play as fireBeam\'s escaped (§17 item 53)', 'a ship with no body is destroyed by the explosion that took its last cell (checkEnd)'],
  dependsOn: ['L4.books.energy'],
  setup: 'the battle loop at T1: R2 (A) static on its plan, the beam and the turret on R1\'s reactor (a test input, knowledge off); R1 (T) static at heading 0, no shield up; 600 m, bearing -y, seed 1; to the end or 600 s (13n.9 K4, constructed: no helm)',
  measure: 'a throw; the end (kind, side, by, step) and the target\'s reactor explosion that is its parent; the target\'s bodies at the end; the attacker\'s beam in the last step (passed, escaped, deposits); battleEnergy after every step with a hit and at the end',
  tolerance: 'steps exact; books 1e-9 x gross (#220, as L4.books.energy); the beam\'s escaped = passed x dt at 1e-12 relative',
  criterion: '(1) no throw; (2) the end is destroyed for T, by explosion, at step 4364 (kernel-read), its parent T\'s reactor explosion at that step, T with no body; (3) the largest energy residual <= 1e-9 x the largest gross; the beam in the last step passed power, deposited nothing and booked passed x dt as escaped (consistency invariant)',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'r1-600-minus-y-beam-reactor' }];
  },
  expected() {
    return { kind: 'destroyed', side: 'T', by: 'explosion', step: 4364, tol: 1e-9 };
  },
  run(ctx) {
    const b = createBattle({ params: ctx.params, attacker: BUILDS.R2, target: TARGETS.R1, distance: 600, seed: 1, bearing: '-y', plan: { beam: ['reactor'], turret: ['reactor'] } });
    const e0 = battleEnergy(b);
    let worst = 0, gross = e0.gross, seen = 0, error = null;
    const check = () => { const e = battleEnergy(b); worst = Math.max(worst, Math.abs(e.total - e0.total)); gross = Math.max(gross, e.gross); };
    try {
      while (!b.ended && b.step < 36000) { tick(b); if (b.hits.length > seen) { seen = b.hits.length; check(); } }
      check();
    } catch (x) { error = `step ${b.step}: ${x && x.message ? x.message : x}`; }
    const T = b.target, end = b.ended, ev = end && T.world.log.events.find((x) => x.id === end.parent);
    const beam = b.attacker.beam, res = beam && beam.result;
    return {
      error, kind: end ? end.kind : null, side: end ? end.side : null, by: end ? end.by : null, step: end ? end.step : null, t: end ? end.t : null,
      parent: ev ? { type: ev.type, room: T.room(ev.room) ? T.room(ev.room).type : ev.room, step: Math.round(ev.t / b.dt) } : null,
      bodies: T.world.ship.bodies.length,
      beam: res ? { power: res.power, escaped: res.escaped, deposited: res.energies.reduce((x, y) => x + y, 0), entries: res.energies.length, dt: b.dt } : null,
      worst, gross, hits: b.hits.length,
    };
  },
  compare(e, a) {
    const checks = {
      '(1) no throw': a.error === null,
      '(2) destroyed, side T, by explosion': a.kind === e.kind && a.side === e.side && a.by === e.by,
      '(2) at step 4364': a.step === e.step,
      '(2) its parent T\'s reactor explosion at that step': !!a.parent && a.parent.type === 'explosion' && a.parent.room === 'reactor' && a.parent.step === e.step,
      '(2) T has no body': a.bodies === 0,
      '(3) energy books close at 1e-9 x gross': Number.isFinite(a.worst) && a.worst <= e.tol * a.gross,
      'the last step\'s beam passed power and deposited nothing': !!a.beam && a.beam.power > 0 && a.beam.deposited === 0,
      'escaped = passed x dt (consistency invariant, 1e-12)': !!a.beam && Math.abs(a.beam.escaped - a.beam.power * a.beam.dt) <= 1e-12 * a.beam.power * a.beam.dt,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, x = r.expected;
    return {
      expected: `${x.kind} ${x.side} by ${x.by} at step ${x.step}; residual <= ${x.tol} x gross; beam escaped = passed x dt`,
      actual: a.error ? `THROW ${a.error}` : `${a.kind} ${a.side} by ${a.by} at step ${a.step} (${a.t !== null ? a.t.toFixed(4) : '-'} s), parent ${a.parent ? `${a.parent.type} ${a.parent.room} step ${a.parent.step}` : '-'}; T bodies ${a.bodies}; residual ${a.worst.toExponential(3)} J of gross ${a.gross.toExponential(4)}; ${a.hits} hits; beam ${a.beam ? `passed ${a.beam.power.toExponential(4)} W, escaped ${a.beam.escaped.toExponential(4)} J, deposited ${a.beam.deposited} J` : 'none'}`,
    };
  },
};
