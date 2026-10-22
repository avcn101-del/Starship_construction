import { createBattle, tick, battleAngular, mainBody } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// K6 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b) B2; §17 item 35; #278): a hit's impulse acts on the round's line of
// action (each entry's point the midpoint of the round's chord through the cell, the plate's crossing point, on the
// line through the round along its velocity relative to the hull), so the two-ship angular momentum book closes like
// the linear one (#220). Until L5a the impulse acted at the cell's centre and a hit did not conserve angular momentum.
// B1's battle (R1 the static target, its centre of mass at the origin; the attacker R1d at rest 900 m on bearing -y,
// bow-on, its turret at the bridge), and the same with R1 given omega 0.05 rad/s and v (20, 0) m/s before the first
// step (as L4.books.two: the hull's frame turns between the poses a round's segment is tested on, and some rounds pass
// through it). What is summed (js/battle.js battleAngular): over both ships, the angular momentum about the world
// origin of bodies (with I omega), debris (with its spin), rounds in flight, what left play, and the rounds spent
// against a field (none here: both shields are off, as battles build ships; a field's impulse acts at its generator,
// 13l.1, and stays outside this book); H = the external angular impulse less the hits' part (rooms.js receive books
// that part apart: it moves angular momentum between a round and a hull). L - H is fixed: the residual is checked
// after every step in which a round hits and at the end against 1e-9 x the largest gross + 1e-12 (the gross: the
// magnitudes of every term and the external books' own gross). A conservation check of the kernel's state against its
// ledgers, not a closed form; no hand-worked literal beyond B1's 12 hits (#267 N8).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.books.angular',
  level: 'L4',
  laws: ['angular momentum is conserved across both ships of a battle: a hit\'s impulse acts on the round\'s line of action (B2, 13n.1 (b), #220)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (centre of mass at the origin), attacker R1d at rest 900 m from it on bearing -y, bow-on, its turret at the bridge (B1); case still: R1 at rest; case spin: R1 given omega 0.05 rad/s and v (20, 0) m/s before the first step; until the battle ends or 60 s (13n.4 K6)',
  measure: 'battleAngular (L, H, gross) before the first step, after every step in which a round hits and at the end; the largest residual |(L - L0) - (H - H0)| and the largest gross; the hits, the rounds that passed, the target\'s largest |omega| at a hit',
  tolerance: 'books 1e-9 x gross + 1e-12 (#220)',
  criterion: 'in both cases the largest residual <= 1e-9 x the largest gross + 1e-12; still: 12 hits (B1\'s count, #267 N8); spin: at least one hit, at least one round passes the hull, and |omega| >= 1e-3 rad/s at some hit',
  tunable: [],
  locked: { date: '2026-10-22', hash: '9aa05745' },
  cases() {
    return [{ name: 'still', omega: 0, v: [0, 0] }, { name: 'spin', omega: 0.05, v: [20, 0] }];
  },
  expected(ctx, c) {
    return { tol: 1e-9, abs: 1e-12, hits: c.name === 'still' ? 12 : null };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const tb = mainBody(b.target);
    tb.omega = c.omega; tb.v = [...c.v];
    const a0 = battleAngular(b);
    let worst = 0, gross = a0.gross, seen = 0, omega = 0;
    const check = () => { const a = battleAngular(b); worst = Math.max(worst, Math.abs(a.L - a0.L - (a.H - a0.H))); gross = Math.max(gross, a.gross); };
    while (!b.ended && b.step < 3600) {
      tick(b);
      if (b.hits.length > seen) { seen = b.hits.length; omega = Math.max(omega, Math.abs(mainBody(b.target).omega)); check(); }
    }
    check();
    return { worst, gross, hits: b.hits.length, passed: b.hits.filter((h) => !h.stopped).length, omega, t: b.t, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a) {
    const checks = {
      'angular books close at 1e-9 x gross + 1e-12': Number.isFinite(a.worst) && a.worst <= e.tol * a.gross + e.abs,
      ...(e.hits !== null ? { 'B1\'s 12 hits': a.hits === e.hits } : { 'a hit, a round passes, the frame turns': a.hits > 0 && a.passed > 0 && a.omega >= 1e-3 }),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `residual <= ${r.expected.tol} x gross + ${r.expected.abs}${r.expected.hits !== null ? `; ${r.expected.hits} hits` : '; a hit passes; |omega| >= 1e-3'}`, actual: `largest residual ${a.worst.toExponential(3)} kg m^2/s of gross ${a.gross.toExponential(4)} (${(a.worst / a.gross).toExponential(2)}); ${a.hits} hits, ${a.passed} passed; |omega| ${a.omega.toExponential(3)} rad/s; ${a.ended || 'running'} at ${a.t.toFixed(4)} s` };
  },
};
