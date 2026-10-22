import { createBattle, tick, aimPoint, mainBody } from '../../../js/battle.js';
import { worldPoint } from '../../../js/body.js';
import { penetrateRound } from '../../../js/damage.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B10 of L4b (DESIGN.md 13l.4), successor of L4.relative (13l.7, #271: T1): the round's velocity relative to the hull (#242). R1 the target at T1, the attacker
// R1d at rest 900 m from it on bearing -y, bow-on, its turret at the bridge; before the first step R1 is set drifting
// away at 100 m/s along the turret's line of fire (the unit vector d from the turret to its aim point), so the line
// stays on the aim point and the round meets the hull at 800 d - 100 d relative to it. Until the first hit.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));

export default {
  id: 'L4.relative.v2',
  level: 'L4',
  laws: ['fireRound takes the round\'s velocity relative to the hull it hits (#242, 13l.1)', 'the round rule of 13i.1 at that speed'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 drifting at 100 m/s along the attacker\'s line of fire (away from it), not turning; attacker R1d at rest 900 m from R1 on bearing -y, its turret at the bridge; to the first hit (13l.4 B10)',
  measure: 'the speed the battle passes to fireRound (after the shield, which is off); the hit\'s path, the path\'s resistances r and fireRound\'s result (cells passed, the cell it stops in, f, the momentum on exit or at the stop)',
  tolerance: 'closed forms 1e-12 relative (13k.4); the literals of 13l.7 to the digits they are quoted to (r 1e-8 relative: 914 855.62 is rounded to the cent, 5.5e-9 of it; f 1e-10 absolute)',
  criterion: 'the speed is 700 m/s (|800 d - 100 d|, 1e-12); re-statement: the round rule (the pure penetrateRound of js/damage.js) on fireRound\'s own r with momentum 6 kg x 700 m/s gives the same cells passed, the same stop, f and momentum (1e-12); hand-worked literal: the sectional momentum at 700 m/s is 700 / 800 x 1 568 183.48 = 1 372 160.548 kg/(m s) (1e-9), D = 62.43 mm, A = 3.0609e-3 m^2; (13l.7 T1) literals for the 700 m/s round, independent of the kernel\'s own penetrateRound: on the path bridge:0 > bridge:2 > quarters:0 > quarters:3 (kernel-read) with r 914 855.62 kg/(m s) per entry (a light cell at chord 1, as B1) and s0 1 372 160.548, the round passes 1 entry and stops in entry 1 with f 0.4073762457 and momentum left 0 (the round rule of 13i.1 worked by hand; the blind checker derives f)',
  tunable: ['kinetic.muzzleVelocity', 'kinetic.roundMass'],
  locked: null,
  cases() {
    return [{ drift: 100 }];
  },
  expected(ctx, c) {
    return { speed: ctx.params.kinetic.muzzleVelocity.value - c.drift, s0: 1372160.548, path: ['bridge:0', 'bridge:2', 'quarters:0', 'quarters:3'], r: 914855.62, passed: 1, stoppedIn: 1, f: 0.4073762457, momentum: 0 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const A = b.attacker, turret = A.room('turret'), tb = mainBody(b.target);
    const S = worldPoint(mainBody(A), turret.position), P = aimPoint(b.target, b.target.room('bridge')), D = [P[0] - S[0], P[1] - S[1]], L = Math.sqrt(D[0] * D[0] + D[1] * D[1]);
    tb.v = [c.drift * D[0] / L, c.drift * D[1] / L];
    while (!b.hits.length && b.step < 600) tick(b);
    const h = b.hits[0], m = b.round.mass, area = b.round.area;
    const own = penetrateRound({ momentum: m * h.afterShield, area, strength: ctx.params.matter.kineticResistance.value * (m / area) }, h.r);
    return { speed: h.speed, afterShield: h.afterShield, s0: (m * h.speed) / area, path: h.path, r: h.r, kernel: { passed: h.passed, stoppedIn: h.stoppedIn, f: h.f, momentum: h.momentum }, own: { passed: own.passed, stoppedIn: own.stoppedIn, f: own.f, momentum: own.momentum } };
  },
  compare(e, a) {
    const checks = {
      'speed 700 m/s relative to the hull': close(e.speed, a.speed, 1e-12) && a.afterShield === a.speed,
      'sectional momentum (hand-worked)': close(e.s0, a.s0, 1e-9),
      'the round rule at 700 m/s': a.kernel.passed === a.own.passed && a.kernel.stoppedIn === a.own.stoppedIn && close(a.own.f, a.kernel.f, 1e-12) && (a.own.momentum === a.kernel.momentum || close(a.own.momentum, a.kernel.momentum, 1e-12)),
      'the path (kernel-read), r 914 855.62 per entry': JSON.stringify(a.path) === JSON.stringify(e.path) && a.r.length === e.path.length && a.r.every((x) => close(e.r, x, 1e-8)),
      'literals: passed 1, stopped in entry 1, f 0.4073762457, momentum left 0': a.kernel.passed === e.passed && a.kernel.stoppedIn === e.stoppedIn && Math.abs(a.kernel.f - e.f) <= 1e-10 && a.kernel.momentum === e.momentum,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `${r.expected.speed} m/s; s0 ${r.expected.s0}; passed ${r.expected.passed} stop ${r.expected.stoppedIn} f ${r.expected.f} momentum ${r.expected.momentum}`, actual: `${a.speed.toPrecision(16)} m/s; s0 ${a.s0.toPrecision(12)}; kernel passed ${a.kernel.passed} stop ${a.kernel.stoppedIn} f ${a.kernel.f.toPrecision(8)}; own passed ${a.own.passed} stop ${a.own.stoppedIn} f ${a.own.f.toPrecision(8)}` };
  },
};
