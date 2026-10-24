import { createBattle, tick, battleAngular, battleMomentum, mainBody } from '../../../js/battle.js';
import { rotate, worldPoint, pointVelocity } from '../../../js/body.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.books.field (J9 of L5e1, DESIGN.md 13n.8 "A shield's impulse on the line of action", §17 item 35,
// #282 (9)), the fix round of PR #101 (the checker's observations 3 and 4): J9 took an impulse's distance off the line
// of the nearest round in flight, so an impulse on another round's line would pass; and in its spin case the target's
// aim, fixed in its frame, turned away, so the attacker's field never slowed a round. Here each impulse is held to the
// line of the round being struck when it is booked, and the spinning target re-aims every step.
// The law, as J9: the field's impulse on a round acts on the round's line of action at the field's surface, as B2 does
// for a hull hit, so the two-ship angular momentum book closes with shields up; one id space for shot events.
//
// Setup (T1), as J9: the battle loop; target R1 (centre of mass at the origin, heading 0), attacker R1d at rest 900 m
// on bearing -y, bow-on, its turret at the bridge (B1); both shields on (charged), the target's turret firing back at
// the attacker's centre of mass (targetFire, in its own frame: before every step the direction that sends a round from
// the turret toward the attacker's centre of mass, leading the turret point's own velocity, turned into the target's
// frame); case still: R1 at rest; case spin: R1 given omega 0.05
// rad/s and v (20, 0) m/s before the first step; until the end or 60 s.
// Not a closed form (a conservation check of the kernel's state against its ledgers, as L4.books.angular.v2): L - H
// and P - J of battleAngular / battleMomentum fixed, checked after every step in which a round hits and at the end
// against 1e-9 x the largest gross + 1e-12; every impulse booked (rooms.js receive) while a round is struck (between
// two entries of battle.hits: the strike appends its round's entry after its impulses) on that round's line, through
// its position when booked along the impulse, within 1e-9 x the cell edge; rounds the fields slowed on both ships in
// both cases; and the ids.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.books.field.v2',
  level: 'L4',
  laws: ['a field\'s impulse on a round acts on the round\'s line of action at the field\'s surface, so the two-ship angular book closes with shields up (§17 item 35, 13n.8)', 'one id space for shot events: each side\'s own shot cause names one battle id (§17 item 35)'],
  dependsOn: ['L4.books.angular.v2', 'L2.shield.overlap.round.v3', 'L3.shield.bodies.v3'],
  setup: 'T1: the battle loop; R1 the target, R1d the attacker 900 m on bearing -y, its turret at the bridge, the target firing back, re-aimed at the attacker\'s centre of mass before every step (leading its own motion); both shields on; still, or R1 spinning at 0.05 rad/s and moving at 20 m/s; to the end or 60 s (the fix round of L5e1, successor of 13n.8 J9)',
  measure: 'battleAngular and battleMomentum before the first step, after every step with a hit and at the end; every impulse booked and the round being struck (its distance off that round\'s line); the hits each field slowed, by side; the battle ids of the shots and the causes of the damage events',
  tolerance: 'books 1e-9 x gross + 1e-12 (#220); the impulse point on the line 1e-9 x the cell edge',
  criterion: 'the largest angular and momentum residuals <= 1e-9 x the largest gross + 1e-12 with both shields up; at least one round slowed by a field on each ship in both cases, and some round spent or embedded (battle.spent or an embedded round); every impulse booked while a round is struck within 1e-9 x the cell edge of that round\'s line of action (its position along the impulse), every impulse matched to a round; battle.ids maps each side\'s shot cause to a distinct shot-n, as many as the shots, and every damage event\'s shot cause in each log is one of them',
  tunable: [],
  locked: { date: '2026-10-24', hash: '210f8ebd' },
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
    // The aim leads the turret's own motion: a round leaves at w + u a (w the turret point's velocity, u the muzzle
    // speed), so a = (sqrt(u^2 - |w_perp|^2) n - w_perp) / u sends it along n, toward the attacker's centre of mass.
    const u = ctx.params.kinetic.muzzleVelocity.value;
    const aim = () => {
      const at = worldPoint(tb, tt.position), to = [ab.x[0] - at[0], ab.x[1] - at[1]], L = Math.hypot(to[0], to[1]), n = [to[0] / L, to[1] / L];
      const w = pointVelocity(tb, at), wn = w[0] * n[0] + w[1] * n[1], wp = [w[0] - wn * n[0], w[1] - wn * n[1]], k = Math.sqrt(u * u - wp[0] * wp[0] - wp[1] * wp[1]);
      b.targetFire.aim = rotate([(k * n[0] - wp[0]) / u, (k * n[1] - wp[1]) / u], -tb.theta);
    };
    aim();
    tb.omega = c.omega; tb.v = [...c.v];
    // Observe each impulse rooms.js receive books (J into external.J, h = q x J into exchange.H, in that order).
    const impulses = [];
    for (const sd of b.sides) {
      const sh = sd.world.ship, last = [0, 0];
      sh.external.J = new Proxy(sh.external.J, { set(t, k, val) { if (k === '0' || k === '1') last[+k] = val - t[k]; t[k] = val; return true; } });
      let H = sh.exchange.H;
      // The round being struck is the one whose battle.hits entry comes next (strike appends it after its impulses).
      Object.defineProperty(sh.exchange, 'H', { get: () => H, set: (val) => { const h = val - H; H = val; impulses.push({ h, J: [...last], k: b.hits.length, X: new Map(b.rounds.map((r) => [r.id, [...r.ref.x]])) }); }, enumerable: true });
    }
    const a0 = battleAngular(b), p0 = battleMomentum(b), d0 = [p0.P[0] - p0.J[0], p0.P[1] - p0.J[1]];
    let worst = 0, worstP = 0, gross = a0.gross, grossP = p0.gross, seen = 0;
    const check = () => {
      const a = battleAngular(b), p = battleMomentum(b);
      worst = Math.max(worst, Math.abs(a.L - a0.L - (a.H - a0.H))); gross = Math.max(gross, a.gross);
      worstP = Math.max(worstP, Math.hypot(p.P[0] - p.J[0] - d0[0], p.P[1] - p.J[1] - d0[1])); grossP = Math.max(grossP, p.gross);
    };
    while (!b.ended && b.step < 3600) { aim(); tick(b); if (b.hits.length > seen) { seen = b.hits.length; check(); } }
    check();
    let off = 0, booked = 0, unmatched = 0;
    for (const x of impulses) {
      const j = Math.hypot(x.J[0], x.J[1]);
      if (!(j > 0)) continue;
      const D = [x.J[0] / j, x.J[1] / j], hit = b.hits[x.k], X = hit && x.X.get(hit.id);
      if (!X) { unmatched++; continue; }
      off = Math.max(off, Math.abs(x.h / j - (X[0] * D[1] - X[1] * D[0])));
      booked++;
    }
    const slowed = { A: b.hits.filter((h) => h.side === 'A' && h.afterShield < h.speed).length, T: b.hits.filter((h) => h.side === 'T' && h.afterShield < h.speed).length };
    const ids = [...b.ids.values()], causes = b.sides.flatMap((s) => s.world.log.events.filter((e) => /^(cell|plate)-/.test(e.type) && /^shot-\d+$/.test(String(e.cause))).map((e) => e.cause));
    return { worst, gross, worstP, grossP, off, booked, unmatched, edge: b.target.world.edge, hits: b.hits.length, slowed, spent: b.spent.rounds, embedded: b.embedded, ids: { n: ids.length, distinct: new Set(ids).size, shots: b.shots, causes: causes.length, unknown: causes.filter((x) => !ids.includes(x)).length }, ended: b.ended ? b.ended.kind : null, t: b.t };
  },
  compare(e, a) {
    const checks = {
      'angular books close with shields up (1e-9 x gross + 1e-12)': a.worst <= e.tol * a.gross + e.abs,
      'momentum books close (1e-9 x gross + 1e-12)': a.worstP <= e.tol * a.grossP + e.abs,
      'a round slowed by a field on each ship': a.slowed.T > 0 && a.slowed.A > 0,
      'some round spent or embedded': a.spent + a.embedded > 0,
      'every impulse on the line of the round being struck (1e-9 x edge), each matched to it': a.booked > 0 && a.unmatched === 0 && Number.isFinite(a.off) && a.off <= e.line * a.edge,
      'one id space: a distinct shot-n per shot, every damage cause among them': a.ids.n === a.ids.shots && a.ids.distinct === a.ids.n && a.ids.causes > 0 && a.ids.unknown === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'books closed with shields up; impulses on the line; one id space', actual: `angular residual ${a.worst.toExponential(3)} of gross ${a.gross.toExponential(3)}; momentum ${a.worstP.toExponential(3)} of ${a.grossP.toExponential(3)}; ${a.hits} hits, slowed by a field A ${a.slowed.A} / T ${a.slowed.T}, spent ${a.spent}, embedded ${a.embedded}; ${a.booked} impulses (${a.unmatched} unmatched), the farthest ${a.off.toExponential(2)} m off the line; ids ${a.ids.n} for ${a.ids.shots} shots, ${a.ids.causes} damage causes (${a.ids.unknown} unknown); end ${a.ended || 'none'} at ${a.t.toFixed(2)} s` };
  },
};
