import { createBattle, tick, battleAngular, battleMomentum, mainBody } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// J9 of L5e1 (DESIGN.md 13n.8 "A shield's impulse on the line of action", §17 item 35, #282 (9)): the field's impulse
// on a round acts on the round's line of action at the field's surface (the hull entry point where shieldRound takes
// it), as B2 does for a hull hit, so the two-ship angular momentum book closes with shields up (until L5e1 the field's
// impulse acted at its generator and the book closed only with shields down); one id space for shot events (each
// side's own shot cause names one battle id, shot-n, unique across both sides); the two-ship book case with a charged
// field stopping rounds (the survivor l4x.books.missingTerm since B4, #284: battle.spent's momentum).
//
// Setup (T1): the battle loop; target R1 (centre of mass at the origin, heading 0), attacker R1d at rest 900 m on bearing
// -y, bow-on, its turret at the bridge (B1); both shields on (charged), the target's turret firing back at the attacker's
// centre of mass (targetFire, its direction set at undock); case still: R1 at rest; case spin: R1 given omega 0.05 rad/s and v (20, 0) m/s before the first
// step; until the end or 60 s.
// Not a closed form (a conservation check of the kernel's state against its ledgers, as L4.books.angular.v2): L - H
// and P - J of battleAngular / battleMomentum fixed, checked after every step in which a round hits and at the end
// against 1e-9 x the largest gross + 1e-12; every hit or field impulse booked (rooms.js receive) on the struck round's
// line, within 1e-9 x the cell edge; rounds the fields slowed on both sides (still; the spinning target's aim, fixed in
// its frame, turns away, so only its own field is met); and the ids.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.books.field',
  level: 'L4',
  laws: ['a field\'s impulse on a round acts on the round\'s line of action at the field\'s surface, so the two-ship angular book closes with shields up (§17 item 35, 13n.8)', 'one id space for shot events: each side\'s own shot cause names one battle id (§17 item 35)'],
  dependsOn: ['L4.books.angular.v2', 'L2.shield.overlap.round.v3', 'L3.shield.bodies.v3'],
  setup: 'T1: the battle loop; R1 the target, R1d the attacker 900 m on bearing -y, its turret at the bridge, the target firing back; both shields on; still, or R1 spinning at 0.05 rad/s and moving at 20 m/s; to the end or 60 s (13n.8 J9)',
  measure: 'battleAngular and battleMomentum before the first step, after every step with a hit and at the end; every impulse booked (its distance off the struck round\'s line); the hits each field slowed, by side; the battle ids of the shots and the causes of the damage events',
  tolerance: 'books 1e-9 x gross + 1e-12 (#220); the impulse point on the line 1e-9 x the cell edge',
  criterion: 'the largest angular and momentum residuals <= 1e-9 x the largest gross + 1e-12 with both shields up; at least one round slowed by a field on each ship (on the target in the spin case, where the target\'s fixed aim turns with it), and some field-slowed round spent or embedded (battle.spent or an embedded round); every impulse point within 1e-9 x the cell edge of the struck round\'s line of action; battle.ids maps each side\'s shot cause to a distinct shot-n, as many as the shots, and every damage event\'s shot cause in each log is one of them',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'still', omega: 0, v: [0, 0] }, { name: 'spin', omega: 0.05, v: [20, 0] }];
  },
  expected() {
    return { tol: 1e-9, abs: 1e-12, line: 1e-9 };
  },
  run(ctx, c) {
    // The target's turret fires back at the attacker's centre of mass from its own centre (its frame: heading 0, so the
    // world's), set before the first step.
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] }, targetFire: { aim: [0, -1] }, shield: { attacker: true, target: true } });
    const tt = b.target.world.rooms.find((r) => r.type === 'turret'), tb = mainBody(b.target), ab = mainBody(b.attacker);
    const at = [tb.x[0] + tt.position[0] - tb.c[0], tb.x[1] + tt.position[1] - tb.c[1]], to = [ab.x[0] - at[0], ab.x[1] - at[1]], L = Math.hypot(to[0], to[1]);
    b.targetFire.aim = [to[0] / L, to[1] / L];
    tb.omega = c.omega; tb.v = [...c.v];
    // Observe each impulse rooms.js receive books (J into external.J, h = q x J into exchange.H, in that order).
    const impulses = [];
    for (const sd of b.sides) {
      const sh = sd.world.ship, last = [0, 0];
      sh.external.J = new Proxy(sh.external.J, { set(t, k, val) { if (k === '0' || k === '1') last[+k] = val - t[k]; t[k] = val; return true; } });
      let H = sh.exchange.H;
      Object.defineProperty(sh.exchange, 'H', { get: () => H, set: (val) => { const h = val - H; H = val; impulses.push({ h, J: [...last], X: b.rounds.filter((r) => !r.done && !r.over).map((r) => [...r.ref.x]) }); }, enumerable: true });
    }
    const a0 = battleAngular(b), p0 = battleMomentum(b), d0 = [p0.P[0] - p0.J[0], p0.P[1] - p0.J[1]];
    let worst = 0, worstP = 0, gross = a0.gross, grossP = p0.gross, seen = 0;
    const check = () => {
      const a = battleAngular(b), p = battleMomentum(b);
      worst = Math.max(worst, Math.abs(a.L - a0.L - (a.H - a0.H))); gross = Math.max(gross, a.gross);
      worstP = Math.max(worstP, Math.hypot(p.P[0] - p.J[0] - d0[0], p.P[1] - p.J[1] - d0[1])); grossP = Math.max(grossP, p.gross);
    };
    while (!b.ended && b.step < 3600) { tick(b); if (b.hits.length > seen) { seen = b.hits.length; check(); } }
    check();
    let off = 0, booked = 0;
    for (const x of impulses) {
      const j = Math.hypot(x.J[0], x.J[1]);
      if (!(j > 0)) continue;
      const D = [x.J[0] / j, x.J[1] / j];
      off = Math.max(off, x.X.length ? Math.min(...x.X.map((X) => Math.abs(x.h / j - (X[0] * D[1] - X[1] * D[0])))) : Infinity);
      booked++;
    }
    const slowed = { A: b.hits.filter((h) => h.side === 'A' && h.afterShield < h.speed).length, T: b.hits.filter((h) => h.side === 'T' && h.afterShield < h.speed).length };
    const ids = [...b.ids.values()], causes = b.sides.flatMap((s) => s.world.log.events.filter((e) => /^(cell|plate)-/.test(e.type) && /^shot-\d+$/.test(String(e.cause))).map((e) => e.cause));
    return { worst, gross, worstP, grossP, off, booked, edge: b.target.world.edge, hits: b.hits.length, slowed, spent: b.spent.rounds, embedded: b.embedded, ids: { n: ids.length, distinct: new Set(ids).size, shots: b.shots, causes: causes.length, unknown: causes.filter((x) => !ids.includes(x)).length }, ended: b.ended ? b.ended.kind : null, t: b.t };
  },
  compare(e, a, c) {
    const checks = {
      'angular books close with shields up (1e-9 x gross + 1e-12)': a.worst <= e.tol * a.gross + e.abs,
      'momentum books close (1e-9 x gross + 1e-12)': a.worstP <= e.tol * a.grossP + e.abs,
      'a round slowed by a field on each ship (still), on the target (spin: its fixed aim turns with it)': a.slowed.T > 0 && (c.name === 'spin' || a.slowed.A > 0),
      'some round spent or embedded': a.spent + a.embedded > 0,
      'every impulse point on the struck round\'s line (1e-9 x edge)': a.booked > 0 && Number.isFinite(a.off) && a.off <= e.line * a.edge,
      'one id space: a distinct shot-n per shot, every damage cause among them': a.ids.n === a.ids.shots && a.ids.distinct === a.ids.n && a.ids.causes > 0 && a.ids.unknown === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'books closed with shields up; impulses on the line; one id space', actual: `angular residual ${a.worst.toExponential(3)} of gross ${a.gross.toExponential(3)}; momentum ${a.worstP.toExponential(3)} of ${a.grossP.toExponential(3)}; ${a.hits} hits, slowed by a field A ${a.slowed.A} / T ${a.slowed.T}, spent ${a.spent}, embedded ${a.embedded}; ${a.booked} impulses, the farthest ${a.off.toExponential(2)} m off the line; ids ${a.ids.n} for ${a.ids.shots} shots, ${a.ids.causes} damage causes (${a.ids.unknown} unknown); end ${a.ended || 'none'} at ${a.t.toFixed(2)} s` };
  },
};
