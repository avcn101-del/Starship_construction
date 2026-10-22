import { createBattle, tick, battleAngular, mainBody } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.books.angular (withdrawn under #282 (7) (c), the reviewer's finding 5 on PR #73): every case and check
// of the original, plus a fast-spinning target (R1 given omega 1 rad/s and v (20, 0) m/s: the hull turns about 0.017
// rad per step, so the chord midpoints lineHit gives lie off the line through the round, by up to centimetres) and, in
// every case, a check that every hit's impulse point lies on the round's line of action. The kernel's hit impulses
// are observed where rooms.js receive books them: each adds J to world.ship.external.J and h = q x J (q the impulse
// point, world frame, about the origin) to world.ship.exchange.H; the scenario wraps both (an observation only: no
// value is changed). J runs along the round's velocity relative to the hull, D = J / |J|, so q lies on the line
// through the round's position X along D when q x D = X x D; the distance off that line is |h / |J| - X x D|, checked
// against 1e-9 x the cell edge, X the position of the round being struck (a round in flight, not yet done, when the
// impulse is booked; the smallest distance over those, as several may be in flight). Without the projection
// (mutation l5a.line.noProjection) the midpoints stay where lineHit put them.
//
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
// Comment slips noted under #282 (7) (d), in locked files of the same pass (left unchanged; no successor is made for a
// comment): L2.magazine.detonation (K2): "s after the hold, 1.383e6" divides by the pristine A0; with the flattening
// it is 1.298e6 (s after the hold over A0 / (1 - f)). L4.kill.v3 (K3): 604.64 N s is 604.63; R1d's two hold cells fall to shot-4
// (kernel-read), not to a no-repair count's shot-3, because R1d's quarters repair the damaged holds (about +0.13 per 2 s).
// L4.books.energy (B3): the work is the integrator's own change of kinetic energy; thrust is not independently checked.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.books.angular.v2',
  level: 'L4',
  laws: ['angular momentum is conserved across both ships of a battle: a hit\'s impulse acts on the round\'s line of action (B2, 13n.1 (b), #220)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (centre of mass at the origin), attacker R1d at rest 900 m from it on bearing -y, bow-on, its turret at the bridge (B1); case still: R1 at rest; case spin: R1 given omega 0.05 rad/s and v (20, 0) m/s before the first step; case fast: R1 given omega 1 rad/s and v (20, 0) m/s; until the battle ends or 60 s (13n.4 K6, #282 (7) (c))',
  measure: 'battleAngular (L, H, gross) before the first step, after every step in which a round hits and at the end; the largest residual |(L - L0) - (H - H0)| and the largest gross; the hits, the rounds that passed, the target\'s largest |omega| at a hit; each hit impulse booked (rooms.js receive): its distance off the line through the struck round along the impulse, |h / |J| - X x D|',
  tolerance: 'books 1e-9 x gross + 1e-12 (#220); the impulse point on the line 1e-9 x the cell edge (#282 (7) (c))',
  criterion: 'in both cases the largest residual <= 1e-9 x the largest gross + 1e-12; still: 12 hits (B1\'s count, #267 N8); spin: at least one hit, at least one round passes the hull, and |omega| >= 1e-3 rad/s at some hit; fast: at least one hit, |omega| >= 0.5 rad/s at some hit; in every case at least one impulse booked and every impulse point within 1e-9 x the cell edge of the round\'s line of action',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'still', omega: 0, v: [0, 0] }, { name: 'spin', omega: 0.05, v: [20, 0] }, { name: 'fast', omega: 1, v: [20, 0] }];
  },
  expected(ctx, c) {
    return { tol: 1e-9, abs: 1e-12, hits: c.name === 'still' ? 12 : null, line: 1e-9, omega: c.name === 'fast' ? 0.5 : c.name === 'spin' ? 1e-3 : null };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const tb = mainBody(b.target);
    tb.omega = c.omega; tb.v = [...c.v];
    // Observe each hit impulse rooms.js receive books (J into external.J, h = q x J into exchange.H, in that order).
    const impulses = [];
    for (const sd of b.sides) {
      const sh = sd.world.ship, last = [0, 0];
      sh.external.J = new Proxy(sh.external.J, { set(t, k, val) { if (k === '0' || k === '1') last[+k] = val - t[k]; t[k] = val; return true; } });
      let H = sh.exchange.H;
      Object.defineProperty(sh.exchange, 'H', { get: () => H, set: (val) => { const h = val - H; H = val; impulses.push({ h, J: [...last], X: b.rounds.filter((r) => !r.done && !r.over).map((r) => [...r.ref.x]) }); }, enumerable: true });
    }
    const a0 = battleAngular(b);
    let worst = 0, gross = a0.gross, seen = 0, omega = 0;
    const check = () => { const a = battleAngular(b); worst = Math.max(worst, Math.abs(a.L - a0.L - (a.H - a0.H))); gross = Math.max(gross, a.gross); };
    while (!b.ended && b.step < 3600) {
      tick(b);
      if (b.hits.length > seen) { seen = b.hits.length; omega = Math.max(omega, Math.abs(mainBody(b.target).omega)); check(); }
    }
    check();
    let off = 0, booked = 0;
    for (const x of impulses) {
      const j = Math.hypot(x.J[0], x.J[1]);
      if (!(j > 0)) continue;
      const D = [x.J[0] / j, x.J[1] / j];
      off = Math.max(off, x.X.length ? Math.min(...x.X.map((X) => Math.abs(x.h / j - (X[0] * D[1] - X[1] * D[0])))) : Infinity);
      booked++;
    }
    return { off, booked, edge: b.target.world.edge, worst, gross, hits: b.hits.length, passed: b.hits.filter((h) => !h.stopped).length, omega, t: b.t, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a) {
    const checks = {
      'angular books close at 1e-9 x gross + 1e-12': Number.isFinite(a.worst) && a.worst <= e.tol * a.gross + e.abs,
      ...(e.hits !== null ? { 'B1\'s 12 hits': a.hits === e.hits } : e.omega === 1e-3 ? { 'a hit, a round passes, the frame turns': a.hits > 0 && a.passed > 0 && a.omega >= 1e-3 } : { 'a hit, the frame turns fast (|omega| >= 0.5)': a.hits > 0 && a.omega >= e.omega }),
      'every impulse point on the round\'s line of action (1e-9 x edge)': a.booked > 0 && Number.isFinite(a.off) && a.off <= e.line * a.edge,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `residual <= ${r.expected.tol} x gross + ${r.expected.abs}${r.expected.hits !== null ? `; ${r.expected.hits} hits` : r.expected.omega === 1e-3 ? '; a hit passes; |omega| >= 1e-3' : '; a hit; |omega| >= 0.5'}; impulse points within ${r.expected.line} x edge of the line`, actual: `${a.booked} impulses, largest distance off the line ${a.off.toExponential(3)} m; largest residual ${a.worst.toExponential(3)} kg m^2/s of gross ${a.gross.toExponential(4)} (${(a.worst / a.gross).toExponential(2)}); ${a.hits} hits, ${a.passed} passed; |omega| ${a.omega.toExponential(3)} rad/s; ${a.ended || 'running'} at ${a.t.toFixed(4)} s` };
  },
};
