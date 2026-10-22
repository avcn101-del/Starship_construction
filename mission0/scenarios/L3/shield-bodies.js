import { createWorld, addRoom, enableShip, shieldRound, shieldBuffer, fireRound, destroyCell } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

// L2.shield.overlap.round's two M shield generators 50 m apart (cells (0, 0) and (10, 0): centres (5, 5) and (55, 5)
// at T1), each with its own bridge, and between them a hold whose four cells are destroyed before the ship is made:
// two bodies, A (genA, bridgeA, holdA) and B (holdB, bridgeB, genB), both controlled by their own bridge. The round's
// point is where g_A = 0.6 and g_B = 0.5 (as in L2.shield.overlap.round). Case 'kicked': before the field round,
// an M round through holdB's cell 0 along +y (fireRound) sets B moving and turning while A stays at rest, so the
// two bodies' hull velocities at the round's point differ.
const ROOMS = [
  { id: 'genA', type: 'shieldGenerator', cell: [0, 0] }, { id: 'bridgeA', type: 'bridge', cell: [2, 0] },
  { id: 'gap', type: 'hold', cell: [4, 0] }, { id: 'holdB', type: 'hold', cell: [6, 0] },
  { id: 'bridgeB', type: 'bridge', cell: [8, 0] }, { id: 'genB', type: 'shieldGenerator', cell: [10, 0] },
];
const G = { genA: 0.6, genB: 0.5 };

function point(ctx) {
  const R = ctx.params.shield.radius.value, rA = R * Math.sqrt(1 / G.genA - 1), rB = R * Math.sqrt(1 / G.genB - 1), D = 50;
  const x = (D * D + rA * rA - rB * rB) / (2 * D), y = Math.sqrt(rA * rA - x * x);
  return [5 + x, 5 + y];
}
const state = (b) => ({ id: b.id, M: b.M, I: b.I, x: [...b.x], c: [...b.c], v: [...b.v], omega: b.omega, theta: b.theta });

export default {
  id: 'L3.shield.bodies',
  level: 'L3',
  laws: ['a round in the fields of generators on different bodies: each body keeps the impulse and energy books of its own generators\' share, at its own hull velocity and in its own frame (#258 (11), reviewer N5 on PR #58; 13l.1, #240 (2))'],
  dependsOn: ['L2.shield.overlap.round', 'L3.shield.energy'],
  setup: 'a T1 ship: shield generators A (cell (0, 0)) and B (cell (10, 0)), 50 m apart, each with a bridge beside it; between them a hold destroyed cell by cell before enableShip, so the ship is two bodies, A\'s and B\'s; buffers full; an M round (kinetic.roundMass, kinetic.muzzleVelocity) along +y through the kernel\'s shieldRound at the point where g_A = 0.6 and g_B = 0.5; case at rest, or kicked: first an M round through holdB\'s cell 0 along +y by fireRound, which sets B moving (13l.4, #258 (11))',
  measure: 'each body\'s state before the field round (mass, inertia, centre, velocity, spin); after it, each body\'s momentum and angular momentum change, what each generator paid, the round\'s speed, shieldRound\'s heat and each generator\'s shield.impulseHeat',
  tolerance: 'closed forms 1e-12; impulse and energy books 1e-9 x the gross',
  criterion: 'two bodies, each holding one generator; the summed strength min(1, 1.1) = 1, the round slowed to 800 / 3 m/s and the payments 6/11 and 5/11 of 1 706 666.67 J (L2.shield.overlap.round\'s literals); each body\'s momentum changes by J_i = m (v - v1) x paid_i / paid along +y, and its angular momentum about its own centre by (q_i - x_i) x J_i, q_i the generator\'s centre (1e-9); each generator\'s heat is its body\'s books (re-statement): heat_i = 1/2 m s_i (|u_i|^2 - |u_i - (v - v1) y|^2) - dK_i, with s_i = paid_i / paid, u_i = the velocity of body i\'s hull at the round\'s point + v y, and dK_i body i\'s kinetic energy gain (translation and spin) from J_i, 1e-9 of the round\'s energy; shieldRound\'s heat is their sum (1e-12); kicked: the two hull velocities at the round\'s point differ, so the books in one body\'s frame would differ from these by more than 1e-6 of the heat',
  tunable: ['shield.kineticStop', 'shield.radius', 'shield.buffer', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance'],
  locked: { date: '2026-10-22', hash: 'c206ee95' },
  cases() {
    return [{ kick: false }, { kick: true }];
  },
  expected(ctx, c) {
    const m = 6, v = 800, E = 0.5 * m * (v * v - (v / 3) * (v / 3));
    return { v1: v / 3, paid: { genA: (E * 6) / 11, genB: (E * 5) / 11 }, literal: { E: 1706666.6666666667, genA: 930909.0909090909, genB: 775757.5757575758 } };
  },
  run(ctx, c) {
    const edge = ctx.tiers.T1.edge, f = ctx.fixed;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    for (const r of ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell });
    const room = (id) => world.rooms.find((r) => r.id === id);
    for (let k = 0; k < 4; k++) destroyCell(world, room('gap'), k, 'test');
    enableShip(world);
    const gens = ['genA', 'genB'].map(room);
    const m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    if (c.kick) fireRound(world, { mass: m, velocity: v, area: A, direction: [0, 1] }, [{ room: room('holdB'), cell: 0 }], 'kick');
    for (const g of gens) g.shield.buffer = shieldBuffer(world, g);
    const body = (g) => world.ship.bodies.find((b) => b.id === g.body);
    const before = Object.fromEntries(gens.map((g) => [g.id, state(body(g))])), buffers = Object.fromEntries(gens.map((g) => [g.id, g.shield.buffer])), heat0 = Object.fromEntries(gens.map((g) => [g.id, g.shield.impulseHeat]));
    const sh = shieldRound(world, { position: point(ctx), mass: m, velocity: v, area: A, direction: [0, 1] });
    const after = Object.fromEntries(gens.map((g) => [g.id, state(body(g))]));
    return {
      bodies: world.ship.bodies.length, bodyOf: Object.fromEntries(gens.map((g) => [g.id, g.body])), before, after,
      q: Object.fromEntries(gens.map((g) => [g.id, [...g.position]])), p: point(ctx), m, v, v1: sh.velocity, impulse: sh.impulse, heat: sh.heat, strength: sh.strength,
      paid: Object.fromEntries(gens.map((g) => [g.id, buffers[g.id] - g.shield.buffer])), impulseHeat: Object.fromEntries(gens.map((g) => [g.id, g.shield.impulseHeat - heat0[g.id]])),
    };
  },
  compare(e, a, c) {
    const ids = ['genA', 'genB'], total = a.paid.genA + a.paid.genB, dv = a.v - a.v1;
    // Body i's books (the criterion's formula), from the recorded states before the field round; heading 0, so the
    // grid frame is the world frame shifted: world point = x + (p - c).
    const books = (id, frame) => {
      const b = a.before[id], f = a.before[frame], s = a.paid[id] / total, J = [0, a.m * dv * s];
      const p = [f.x[0] + a.p[0] - f.c[0], f.x[1] + a.p[1] - f.c[1]], hull = [f.v[0] - f.omega * (p[1] - f.x[1]), f.v[1] + f.omega * (p[0] - f.x[0])];
      const u = [hull[0], hull[1] + a.v], u1 = [u[0], u[1] - dv];
      const q = [b.x[0] + a.q[id][0] - b.c[0], b.x[1] + a.q[id][1] - b.c[1]], dL = cross2([q[0] - b.x[0], q[1] - b.x[1]], J);
      const v2 = [b.v[0] + J[0] / b.M, b.v[1] + J[1] / b.M], w2 = b.omega + dL / b.I;
      const dK = 0.5 * b.M * (v2[0] * v2[0] + v2[1] * v2[1] - b.v[0] * b.v[0] - b.v[1] * b.v[1]) + 0.5 * b.I * (w2 * w2 - b.omega * b.omega);
      return { J, dL, heat: 0.5 * a.m * s * (u[0] * u[0] + u[1] * u[1] - u1[0] * u1[0] - u1[1] * u1[1]) - dK, hull };
    };
    const own = Object.fromEntries(ids.map((id) => [id, books(id, id)]));
    const E = 0.5 * a.m * a.v * a.v;
    const momentum = (b) => [b.M * b.v[0], b.M * b.v[1]], spin = (b) => b.I * b.omega + b.M * cross2(b.x, b.v);
    const checks = {
      'two bodies, one generator on each': a.bodies === 2 && a.bodyOf.genA !== a.bodyOf.genB,
      'summed strength 1, speed after 800 / 3 (literal)': a.strength === 1 && close(e.v1, a.v1, 1e-12),
      'payments 6/11 and 5/11 of 1 706 666.67 J (literals)': ids.every((id) => close(e.paid[id], a.paid[id], 1e-12) && close(e.literal[id], a.paid[id], 1e-12)),
      'each body\'s momentum changes by its own share J_i, at the generator': ids.every((id) => { const P0 = momentum(a.before[id]), P1 = momentum(a.after[id]); return Math.abs(P1[0] - P0[0] - own[id].J[0]) <= 1e-9 * a.impulse && Math.abs(P1[1] - P0[1] - own[id].J[1]) <= 1e-9 * a.impulse; }),
      'each body\'s angular momentum changes by (q_i - x_i) x J_i about its centre': ids.every((id) => { const b0 = a.before[id], b1 = a.after[id], h0 = b0.I * b0.omega, h1 = b1.I * b1.omega; return Math.abs(h1 - h0 - own[id].dL) <= 1e-9 * (Math.abs(own[id].dL) + 1) && Math.abs(spin(b1) - spin(b0) - cross2(b0.x, own[id].J) - own[id].dL) <= 1e-9 * (Math.abs(cross2(b0.x, own[id].J)) + Math.abs(own[id].dL) + 1); }),
      'each generator\'s heat is its body\'s books (re-statement)': ids.every((id) => Math.abs(own[id].heat - a.impulseHeat[id]) <= 1e-9 * E),
      'shieldRound\'s heat is their sum': close(a.impulseHeat.genA + a.impulseHeat.genB, a.heat, 1e-12),
    };
    if (c.kick) {
      const oneFrame = ids.reduce((x, id) => x + books(id, 'genA').heat, 0);
      checks['kicked: the hulls move differently at the round\'s point; one frame\'s books would differ by more than 1e-6 of the heat'] = (own.genA.hull[0] !== own.genB.hull[0] || own.genA.hull[1] !== own.genB.hull[1]) && Math.abs(oneFrame - a.heat) > 1e-6 * Math.abs(a.heat);
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (a.error) return { expected: 'books per body', actual: `error ${a.error}` };
    return { expected: `v1 ${r.expected.v1.toPrecision(12)}; paid A ${r.expected.paid.genA.toFixed(3)}, B ${r.expected.paid.genB.toFixed(3)} J`, actual: `bodies ${a.bodies}; v1 ${a.v1.toPrecision(12)}; heat A ${a.impulseHeat.genA.toFixed(6)}, B ${a.impulseHeat.genB.toFixed(6)} J; B's v (${a.before.genB.v.map((x) => x.toExponential(4)).join(', ')}) m/s` };
  },
};
