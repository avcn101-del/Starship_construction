import { createBattle, tick, battleEnergy, battleMomentum } from '../../../js/battle.js';
import { shieldBuffer } from '../../../js/rooms.js';
import { TARGETS, missileShip } from '../../targets.js';

// J8 of L5e1 (DESIGN.md 13n.8 "A missile's body and a charged field", §17 item 48, #306 (6)): the field's kinetic rule
// acts on a missile as on a round of the missile's mass and velocity, its cross-section from roundGeometry at steel
// density and the round's length-to-diameter (a stand-in: the hardest sectional momentum for the field; stated); the
// body (and a penetrator) go on at the speed the field leaves, the warhead acts as before.
//
// Setup (T1): createBattle with knowledge on; an R1-M missile (designated on the reactor, unscanned: it flies at the
// silhouette's centre) from -y at 900 m against R1 at rest, R1's shield on (its buffer charged) or off; HE and
// penetrator warheads; until the hit (at most 20 s), then one step more.
// Hand-worked: the missile's steel cylinder of 200 kg, 4 diameters long: D = cbrt(4 x 200 / (pi x 7850 x 4)) = cbrt(800 /
// 98 646.0) = cbrt(0.0081098) = 0.200911 m, A = pi D^2 / 4 = 0.0317027 m^2. At the hit its speed u relative to the hull and the entry point are kernel-read
// (labelled; about 228 m/s at (27.5, 10) m, L2.missile.warheads.v2); the generator at (20, 5) m gives g = 1 / (1 + (r /
// shield.radius)^2) at the entry, so the field takes ds = min(s0, shield.kineticStop x g) of s0 = 200 u / A: v1 = u (s0 -
// ds) / s0, the energy 1/2 x 200 (u^2 - v1^2), unless the buffer holds less (then v1 = sqrt(u^2 - 2 B / 200)), the
// field rule of js/field.js re-stated. The buffer falls by that energy (the HE warhead pays nothing to a field); the
// penetrator then meets the hull at v1 less the hull's own change of velocity at the entry from the field's impulse and
// the joined body (at most m u / M at the centre and as much again by the spin: 2 x 200 x 228.5 / 911 234 = 0.10 m/s on
// R1, a bound), and meets no field again; the battle's energy and momentum books close across the
// hit (1e-9 of the gross: the field's heat booked). Shield off: no field, the body joins at u.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));

export default {
  id: 'L2.missile.field',
  level: 'L2',
  laws: ['a charged field acts on a missile\'s body as on a round of its mass and speed, its cross-section a steel cylinder of that mass at FIXED.roundLengthToDiameter (a stand-in); the body and a penetrator go on at the speed it leaves; the warhead acts as before (§17 item 48, 13n.8)'],
  dependsOn: ['L2.missile.warheads.v2', 'L2.shield.overlap.round.v3'],
  setup: 'T1: createBattle, knowledge on; an R1-M missile (designated on the reactor, unscanned) from -y at 900 m against R1, its shield on or off; HE and penetrator; to the hit and one step more (13n.8 J8)',
  measure: 'at the hit: the speed relative to the hull and the entry (kernel-read), the field\'s payment and the speed after (x.hit.field), the buffer before and after, the penetrator\'s entry speed into the hull; the battle\'s energy and momentum books before and after',
  tolerance: 'the field rule 1e-12 relative; the cross-section literal 1e-5; books 1e-9 of the gross',
  criterion: 'shield on: the speed after and the payment are the field rule\'s on a 200 kg steel round of A = 0.0317027 m^2 at the kernel-read speed and the strength at the entry; the buffer falls by the payment; the penetrator enters the hull at that speed within 2 m u / M (the hull\'s own recoil, a bound) and meets no field again; books close; shield off: no field (no payment), the body joins at its speed',
  tunable: ['missile.mass', 'shield.kineticStop', 'shield.radius', 'shield.buffer'],
  locked: { date: '2026-10-24', hash: 'e78614fb' },
  cases() {
    return [{ warhead: 'he', shield: true }, { warhead: 'penetrator', shield: true }, { warhead: 'he', shield: false }];
  },
  expected(ctx) {
    const m = ctx.params.missile.mass.value, rho = ctx.fixed.steelDensity.value, k = ctx.fixed.roundLengthToDiameter.value;
    const D = Math.cbrt((4 * m) / (Math.PI * rho * k)), A = (Math.PI * D * D) / 4;
    return { m, A, literal: { D: 0.200911, A: 0.0317027 }, stop: ctx.params.shield.kineticStop.value, radius: ctx.params.shield.radius.value };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: missileShip('designated', c.warhead), target: TARGETS.R1, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true, shield: { target: c.shield } });
    const T = b.target, gen = T.world.rooms.find((r) => r.type === 'shieldGenerator'), flying = new Set();
    let hit = null, before = null, E0 = null, P0 = null;
    while (b.step < 1200 && !hit) {
      for (const x of b.missiles) flying.add(x);
      const buf = shieldBuffer(T.world, gen), e = battleEnergy(b), p = battleMomentum(b);
      tick(b);
      const x = [...flying].find((y) => y.hit);
      if (x) { hit = x; before = buf; E0 = e; P0 = p; }
    }
    if (!hit) return { hit: false };
    const after = shieldBuffer(T.world, gen);
    tick(b);
    const E1 = battleEnergy(b), P1 = battleMomentum(b), round = b.hits.find((h) => h.id === hit.id);
    return {
      hit: true, entry: [...hit.hit.entry], field: hit.hit.field || null, bufferBefore: before, bufferAfter: after,
      penetrator: round ? { speed: round.speed, afterShield: round.afterShield } : null,
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
      if (c.warhead === 'penetrator') checks['the penetrator meets the hull at the field\'s speed (within 2 m u / M), no field again'] = !!a.penetrator && Math.abs(f.after - a.penetrator.speed) <= (2 * e.m * u) / 911234.0573339703 && a.penetrator.afterShield === a.penetrator.speed;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (!a.hit) return { expected: 'a hit', actual: 'no hit' };
    return { expected: `A ${r.expected.A.toPrecision(6)} m^2 (D ${(Math.cbrt((4 * r.expected.m) / (Math.PI * 7850 * 4))).toPrecision(6)} m); the field rule at the kernel-read speed`, actual: `entry (${a.entry.map((x) => x.toFixed(2)).join(', ')}); ${a.field ? `${a.field.speed.toFixed(3)} -> ${a.field.after.toFixed(3)} m/s, paid ${a.field.energy.toFixed(1)} J` : 'no field'}; buffer ${a.bufferBefore.toFixed(1)} -> ${a.bufferAfter.toFixed(1)} J${a.penetrator ? `; penetrator in at ${a.penetrator.speed.toFixed(3)} m/s` : ''}; books dE ${a.energy.d.toExponential(2)} of ${a.energy.gross.toExponential(2)}, dP ${a.momentum.d.toExponential(2)} of ${a.momentum.gross.toExponential(2)}` };
  },
};
