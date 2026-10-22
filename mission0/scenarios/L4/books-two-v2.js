import { createBattle, tick, battleMomentum, mainBody } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.books.two (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but for its
// id; its record moves because a round stopped in a hull now joins its body (B4) and acts on its line of action (B2):
// the spin case's hits and misses (12 and 16 then, 10 and 18 now) and every residual and gross; the check (the linear
// book at 1e-9 x gross) is unchanged and its gross now includes the stopped rounds' momentum in the body.
// B16 (the L4 fix round, #269; finding B1 of audit/2026-10-22-l4-physics.md): the two-ship linear momentum book of
// the battle loop. B1's battle (R1 the static target at T1, its centre of mass at the origin; the attacker R1d at rest
// 900 m from it on bearing -y, bow-on, its turret at the bridge), and the same with R1 given, before the first step, a
// spin of 0.05 rad/s and a drift of 20 m/s across the line of fire (+x; the line runs along +y), so the hull's frame
// turns between the poses a round's segment is tested on and some rounds pass through it.
//
// What is summed (js/battle.js battleMomentum): P = over both ships, bodies (M v) + debris (m v) + rounds in flight
// (m v) + what left play (cull's ship.left) + the rounds spent in a hull or a field (battle.spent); J = over both
// ships, ship.external less ship.received (the hits) and ship.received.field (the fields): the impulse of thrust and
// RCS only. The recoil is inside P already (the turret's impulse on its body and the round's momentum cancel; it is
// booked nowhere) and a hit or a field moves momentum between a round and a hull. So P - J is fixed: the residual
// |(P - P0) - (J - J0)| is checked after every step in which a round hits, and at the end. This is a conservation
// check of the kernel's state against its own ledgers (left, spent, received, external), not a closed form; it
// carries no hand-worked literal beyond B1's 12 hits (the blind checker's count, #267 N8).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const len = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

export default {
  id: 'L4.books.two.v2',
  level: 'L4',
  laws: ['momentum is conserved across both ships of a battle: the round\'s momentum exchange runs along its velocity relative to the hull (#242, B1 of the L4 physics audit, #269)', 'the books close with what left play and what was spent (#220)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (centre of mass at the origin), attacker R1d at rest 900 m from it on bearing -y, bow-on, its turret at the bridge (B1); case "still": R1 at rest; case "spin": R1 given omega 0.05 rad/s and v (20, 0) m/s before the first step; until the battle ends or 60 s',
  measure: 'battleMomentum (P, J, gross) before the first step, after every step in which a round hits and at the end; the largest residual |(P - P0) - (J - J0)| and the largest gross; the hits, the rounds that passed, the target\'s largest |omega| at a hit',
  tolerance: 'books 1e-9 x gross (#220), gross the largest over the run',
  criterion: 'in both cases the largest residual <= 1e-9 x the largest gross; case still: 12 hits (B1\'s count, #267 N8); case spin: at least one hit, at least one round passes the hull, and |omega| >= 1e-3 rad/s at some hit (the frame turns)',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'still', omega: 0, v: [0, 0] }, { name: 'spin', omega: 0.05, v: [20, 0] }];
  },
  expected(ctx, c) {
    return { tol: 1e-9, hits: c.name === 'still' ? 12 : null };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const tb = mainBody(b.target);
    tb.omega = c.omega; tb.v = [...c.v];
    const m0 = battleMomentum(b);
    let worst = 0, gross = m0.gross, seen = 0, omega = 0;
    const check = () => {
      const m = battleMomentum(b), r = len([m.P[0] - m0.P[0] - (m.J[0] - m0.J[0]), m.P[1] - m0.P[1] - (m.J[1] - m0.J[1])]);
      worst = Math.max(worst, r); gross = Math.max(gross, m.gross);
    };
    while (!b.ended && b.step < 3600) {
      tick(b);
      if (b.hits.length > seen) { seen = b.hits.length; omega = Math.max(omega, Math.abs(mainBody(b.target).omega)); check(); }
    }
    check();
    return { worst, gross, hits: b.hits.length, passed: b.hits.filter((h) => !h.stopped).length, misses: b.misses.length, omega, t: b.t, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a) {
    const checks = {
      'books close at 1e-9 x gross': Number.isFinite(a.worst) && a.worst <= e.tol * a.gross,
      ...(e.hits !== null ? { 'B1\'s 12 hits': a.hits === e.hits } : { 'a hit, a round passes, the frame turns': a.hits > 0 && a.passed > 0 && a.omega >= 1e-3 }),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `residual <= ${r.expected.tol} x gross${r.expected.hits !== null ? `; ${r.expected.hits} hits` : '; a hit passes; |omega| >= 1e-3'}`, actual: `largest residual ${a.worst.toExponential(3)} N s of gross ${a.gross.toExponential(4)} (${(a.worst / a.gross).toExponential(2)}); ${a.hits} hits, ${a.passed} passed, ${a.misses} misses; |omega| ${a.omega.toExponential(3)} rad/s; ${a.ended || 'running'} at ${a.t.toFixed(4)} s` };
  },
};
