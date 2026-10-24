import { createBattle, tick, battleEnergy, battleMomentum } from '../../../js/battle.js';
import { shieldBuffer } from '../../../js/rooms.js';
import { pointVelocity, worldPoint } from '../../../js/body.js';
import { TARGETS, missileShip } from '../../targets.js';

// Successor of L2.missile.field (J8 of L5e1, DESIGN.md 13n.8 "A missile's body and a charged field", §17 item 48,
// #306 (6)), the fix round of PR #101 (the checker's observation 2): J8 held the penetrator's entry speed into the hull
// only within the bound 2 m u / M (about 0.1 m/s, M a literal), which a wrong speed inside it would pass. Here the
// hull's recoil is derived from the books and the penetrator's speed checked against it.
// The law, as J8: the field's kinetic rule acts on a missile as on a round of the missile's mass and velocity, its
// cross-section from roundGeometry at steel density and the round's length-to-diameter (a stand-in: the hardest
// sectional momentum for the field; stated); the body (and a penetrator) go on at the speed the field leaves, the
// warhead acts as before.
//
// Setup (T1), as J8: createBattle with knowledge on; an R1-M missile (designated on the reactor, unscanned: it flies at
// the silhouette's centre) from -y at 900 m against R1 at rest, R1's shield on (its buffer charged) or off; HE and
// penetrator warheads; until the hit (at most 20 s), then one step more.
// Hand-worked, as J8: the missile's steel cylinder of 200 kg, 4 diameters long: D = cbrt(800 / 98 646.0) = 0.200911 m,
// A = pi D^2 / 4 = 0.0317027 m^2. At the hit its speed u relative to the hull and the entry point are kernel-read
// (labelled; about 228 m/s at (27.4, 10) m); the generator at (20, 5) m gives g = 1 / (1 + (r / shield.radius)^2) at
// the entry, so the field takes ds = min(s0, shield.kineticStop x g) of s0 = 200 u / A: v1 = u (s0 - ds) / s0, the
// energy 1/2 x 200 (u^2 - v1^2), unless the buffer holds less (then v1 = sqrt(u^2 - 2 B / 200)); the buffer falls by
// that energy; the books close across the hit (1e-9 of the gross); shield off: no field, the body joins at u.
// The penetrator (new): R1 is at rest before the hit (checked: v = 0, omega = 0), so its velocity relative to the hull
// is the missile's V, along n = V / u. The hull takes the field's reaction m (u - v1) n on the round's line and the
// body of m - mp joining at the missile's position X with v1 n: in all dP = (m u - mp v1) n, its moment about the
// origin X x dP (both act on the line through X). The joined hull has M' = M + m - mp, its centre c' = (M c + (m - mp)
// p) / M' (p where the body sits, kernel-read: the entry's point, ship.embedded), I' = I + M |c - c'|^2 + (m - mp) |p -
// c'|^2 (M, I, c the hull's before, kernel-read), v' = dP / M', omega' = ((X - c') x dP) / I'. The penetrator meets the
// hull (the speed the round rule takes, b.hits' toHull) at |v1 n - v'(Q)|, v'(Q) = v' + omega' x (Q - c'), Q the
// entry's point p projected on the line through X along the penetrator's velocity relative to the hull at Q (the line
// of action, solved by iteration); within 1e-9 x u. On R1 that recoil is about 0.05 m/s; it meets no field again (its
// speed after the field step equals its speed before it).
/**
 * The penetrator's speed into the hull from the books: the hull at rest takes dP = (m u - mp v1) n with moment X x dP
 * about the origin, and the body of m - mp joins at p; returns |v1 n - v'(Q)| at Q, the entry's point p projected on the
 * penetrator's line of action (through X along its velocity relative to the hull at Q, solved by iteration).
 */
function recoil(a, e, v1) {
  const u = Math.hypot(a.V[0], a.V[1]), n = [a.V[0] / u, a.V[1] / u], mp = e.mp, mb = a.m - mp, h = a.hull;
  const dP = [(a.m * u - mp * v1) * n[0], (a.m * u - mp * v1) * n[1]], M1 = h.M + mb;
  const c1 = [(h.M * h.x[0] + mb * a.joined[0]) / M1, (h.M * h.x[1] + mb * a.joined[1]) / M1];
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2, I1 = h.I + h.M * d2(h.x, c1) + mb * d2(a.joined, c1);
  const v = [dP[0] / M1, dP[1] / M1], r = [a.X[0] - c1[0], a.X[1] - c1[1]], w = (r[0] * dP[1] - r[1] * dP[0]) / I1;
  const at = (Q) => [v[0] - w * (Q[1] - c1[1]), v[1] + w * (Q[0] - c1[0])], U = [v1 * n[0], v1 * n[1]];
  let Q = a.joined;
  for (let k = 0; k < 50; k++) {
    const hv = at(Q), rv = [U[0] - hv[0], U[1] - hv[1]], l = Math.hypot(rv[0], rv[1]), D = [rv[0] / l, rv[1] / l];
    const s = (a.joined[0] - a.X[0]) * D[0] + (a.joined[1] - a.X[1]) * D[1];
    Q = [a.X[0] + D[0] * s, a.X[1] + D[1] * s];
  }
  const hv = at(Q);
  return Math.hypot(U[0] - hv[0], U[1] - hv[1]);
}
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));

export default {
  id: 'L2.missile.field.v2',
  level: 'L2',
  laws: ['a charged field acts on a missile\'s body as on a round of its mass and speed, its cross-section a steel cylinder of that mass at FIXED.roundLengthToDiameter (a stand-in); the body and a penetrator go on at the speed it leaves; the warhead acts as before (§17 item 48, 13n.8)'],
  dependsOn: ['L2.missile.warheads.v2', 'L2.shield.overlap.round.v3'],
  setup: 'T1: createBattle, knowledge on; an R1-M missile (designated on the reactor, unscanned) from -y at 900 m against R1, its shield on or off; HE and penetrator; to the hit and one step more (the fix round of L5e1, successor of 13n.8 J8)',
  measure: 'at the hit: the speed relative to the hull and the entry (kernel-read), the field\'s payment and the speed after (x.hit.field), the buffer before and after, the penetrator\'s speed into the hull (the speed the round rule takes, at its line of action) and at the field (none met); the hull\'s mass, centre, inertia and motion before the hit step, the missile\'s position and velocity at the hit, where its body joined (ship.embedded); the battle\'s energy and momentum books before and after',
  tolerance: 'the field rule 1e-12 relative; the cross-section literal 1e-5; books 1e-9 of the gross; the penetrator\'s entry speed 1e-9 x u',
  criterion: 'shield on: the speed after and the payment are the field rule\'s on a 200 kg steel round of A = 0.0317027 m^2 at the kernel-read speed and the strength at the entry; the buffer falls by the payment; the hull at rest before the hit; the penetrator enters the hull at the field\'s speed less the hull\'s recoil at its line of action, derived from the books (within 1e-9 x u), and meets no field again; books close; shield off: no field (no payment), the body joins at its speed',
  tunable: ['missile.mass', 'shield.kineticStop', 'shield.radius', 'shield.buffer'],
  locked: null,
  cases() {
    return [{ warhead: 'he', shield: true }, { warhead: 'penetrator', shield: true }, { warhead: 'he', shield: false }];
  },
  expected(ctx) {
    const m = ctx.params.missile.mass.value, rho = ctx.fixed.steelDensity.value, k = ctx.fixed.roundLengthToDiameter.value;
    const D = Math.cbrt((4 * m) / (Math.PI * rho * k)), A = (Math.PI * D * D) / 4;
    return { m, mp: ctx.params.missile.penetratorMass.value, A, literal: { D: 0.200911, A: 0.0317027 }, stop: ctx.params.shield.kineticStop.value, radius: ctx.params.shield.radius.value };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: missileShip('designated', c.warhead), target: TARGETS.R1, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true, shield: { target: c.shield } });
    const T = b.target, gen = T.world.rooms.find((r) => r.type === 'shieldGenerator'), flying = new Set(), hb = T.world.ship.bodies[0];
    let hit = null, before = null, E0 = null, P0 = null, hull = null;
    while (b.step < 1200 && !hit) {
      for (const x of b.missiles) flying.add(x);
      const buf = shieldBuffer(T.world, gen), e = battleEnergy(b), p = battleMomentum(b);
      const h = { M: hb.M, I: hb.I, c: [...hb.c], x: [...hb.x], v: [...hb.v], omega: hb.omega, theta: hb.theta, bodies: T.world.ship.bodies.length };
      tick(b);
      const x = [...flying].find((y) => y.hit);
      if (x) { hit = x; before = buf; E0 = e; P0 = p; hull = h; }
    }
    if (!hit) return { hit: false };
    const after = shieldBuffer(T.world, gen);
    tick(b);
    const E1 = battleEnergy(b), P1 = battleMomentum(b), round = b.hits.find((h) => h.id === hit.id);
    const joined = T.world.ship.embedded.find((y) => Math.abs(y.m - (hit.m - (c.warhead === 'penetrator' ? ctx.params.missile.penetratorMass.value : 0))) < 1e-9);
    // The hull before the hit step, in the world (it is at rest: its pose then is its pose at the hit).
    const p = joined ? worldPoint(hull, joined.p) : null;
    return {
      hit: true, entry: [...hit.hit.entry], field: hit.hit.field || null, bufferBefore: before, bufferAfter: after,
      hull, X: [...hit.x], V: [...hit.v], m: hit.m, joined: p, embeddedCount: T.world.ship.embedded.length,
      penetrator: round ? { speed: round.speed, afterShield: round.afterShield, toHull: round.toHull } : null,
      energy: { d: E1.total - E0.total, gross: Math.max(E0.gross, E1.gross) },
      momentum: { d: Math.hypot(P1.P[0] - P1.J[0] - (P0.P[0] - P0.J[0]), P1.P[1] - P1.J[1] - (P0.P[1] - P0.J[1])), gross: Math.max(P0.gross, P1.gross) },
    };
  },
  compare(e, a, c) {
    if (!a.hit) return { pass: false, note: 'no hit' };
    const checks = {
      'the cross-section literal (1e-5)': close(e.literal.A, e.A, 1e-5),
      'the energy book closes across the hit (1e-9 of the gross)': Math.abs(a.energy.d) <= 1e-9 * a.energy.gross,
      'the momentum book closes across the hit (1e-9 of the gross)': a.momentum.d <= 1e-9 * a.momentum.gross,
    };
    if (!c.shield) checks['no field: no payment'] = a.field === null && a.bufferBefore === a.bufferAfter;
    else {
      const f = a.field, u = f ? f.speed : NaN, r = Math.hypot(a.entry[0] - 20, a.entry[1] - 5), g = 1 / (1 + (r / e.radius) ** 2);
      const s0 = (e.m * u) / e.A, ds = Math.min(s0, e.stop * Math.min(1, g));
      let v1 = (u * (s0 - ds)) / s0, E = 0.5 * e.m * (u * u - v1 * v1);
      if (E > a.bufferBefore) { v1 = Math.sqrt(u * u - (2 * a.bufferBefore) / e.m); E = a.bufferBefore; }
      checks['the field met the body'] = !!f && f.energy > 0;
      checks['the speed after: the field rule on the stated round (1e-12)'] = !!f && close(v1, f.after, 1e-12);
      checks['the payment: the field rule (1e-12)'] = !!f && close(E, f.energy, 1e-12);
      checks['the buffer falls by the payment (1e-12)'] = !!f && close(f.energy, a.bufferBefore - a.bufferAfter, 1e-12);
      checks['the hull at rest before the hit, one body'] = a.hull.v[0] === 0 && a.hull.v[1] === 0 && a.hull.omega === 0 && a.hull.bodies === 1;
      if (c.warhead === 'penetrator') {
        const w = recoil(a, e, v1);
        checks['the penetrator meets the hull at v1 less the hull\'s recoil on its line (1e-9 x u), no field again'] = !!a.penetrator && Number.isFinite(w) && Math.abs(w - a.penetrator.toHull) <= 1e-9 * u && a.penetrator.afterShield === a.penetrator.speed;
      }
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (!a.hit) return { expected: 'a hit', actual: 'no hit' };
    return { expected: `A ${r.expected.A.toPrecision(6)} m^2 (D ${(Math.cbrt((4 * r.expected.m) / (Math.PI * 7850 * 4))).toPrecision(6)} m); the field rule at the kernel-read speed`, actual: `entry (${a.entry.map((x) => x.toFixed(2)).join(', ')}); ${a.field ? `${a.field.speed.toFixed(3)} -> ${a.field.after.toFixed(3)} m/s, paid ${a.field.energy.toFixed(1)} J` : 'no field'}; buffer ${a.bufferBefore.toFixed(1)} -> ${a.bufferAfter.toFixed(1)} J${a.penetrator ? `; penetrator at the entry ${a.penetrator.speed.toFixed(6)} m/s, into the hull ${a.penetrator.toHull.toFixed(9)} m/s` : ''}; books dE ${a.energy.d.toExponential(2)} of ${a.energy.gross.toExponential(2)}, dP ${a.momentum.d.toExponential(2)} of ${a.momentum.gross.toExponential(2)}` };
  },
};
