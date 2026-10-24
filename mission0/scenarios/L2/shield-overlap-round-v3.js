import { createWorld, addRoom, enableShip, shieldRound, shieldBuffer } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

// L5e1 (DESIGN.md 13n.8, §17 item 35): the successor of L2.shield.overlap.round.v2, every case and check kept but the
// impulse's point: each generator's share of the field's impulse acts on the round's line of action at the point the
// field takes it (the round's position), not at the generator, so the angular momentum change is p x J, p the round's
// point (world), J = m (v - v1) along +y, the shares summing to it. Its predecessor (13l.7, #271: TOL1): the impulse
// books at 1e-12 x the gross, where the residues on record are 0 to 8.2e-16 of it.
// Two M shield generators 50 m apart (cells (0, 0) and (10, 0): centres (5, 5) and (55, 5) at T1), joined by a
// bridge and three holds so both are controlled; a ship at rest. The round's point lies at r_A = R sqrt(1/0.6 - 1)
// from A and r_B = R sqrt(1/0.5 - 1) = R from B (R = shield.radius), so g_A = 0.6 and g_B = 0.5.
const ROOMS = [
  { id: 'genA', type: 'shieldGenerator', cell: [0, 0] }, { id: 'bridge', type: 'bridge', cell: [2, 0] },
  { id: 'hold1', type: 'hold', cell: [4, 0] }, { id: 'hold2', type: 'hold', cell: [6, 0] }, { id: 'hold3', type: 'hold', cell: [8, 0] },
  { id: 'genB', type: 'shieldGenerator', cell: [10, 0] },
];
// Buffers before the round (J): full (1e7 each, shield.buffer at T1 for an M generator); B nearly empty (1e3 J);
// A at 1e6 and B at 1e5, where A's share of the summed buffers (1.1 MJ, less than the round asks) exceeds its buffer.
const BUFFERS = { 'both full': null, 'B nearly empty': { genB: 1e3 }, 'A capped': { genA: 1e6, genB: 1e5 } };
const G = { genA: 0.6, genB: 0.5 };

function point(ctx) {
  const R = ctx.params.shield.radius.value, rA = R * Math.sqrt(1 / G.genA - 1), rB = R * Math.sqrt(1 / G.genB - 1), D = 50;
  const x = (D * D + rA * rA - rB * rB) / (2 * D), y = Math.sqrt(rA * rA - x * x);
  return [5 + x, 5 + y];
}

export default {
  id: 'L2.shield.overlap.round.v3',
  level: 'L2',
  laws: ['a round in overlapping fields meets the summed strength g = min(1, sum g_i) and the summed buffers (#205 (7), F18, 13l.1)', 'the energy removed is charged to each generator in proportion to its buffer x g_i; no generator pays past its buffer (13l.1, the beam rule of 13d.1, #170)', 'each generator\'s ship takes the impulse of its share, on the round\'s line of action at the field\'s surface (#240 (2), 13l.1, §17 item 35)'],
  dependsOn: ['L0.shield.kinetic.v4', 'L2.shield.overlap'],
  measure: 'the round\'s speed after; what each generator paid (its buffer before less after); the impulse the body took (its momentum and angular momentum change); the generators\' heat (shield.impulseHeat)',
  tolerance: 'closed forms 1e-12; impulse books 1e-12 x the gross (13l.7 TOL1)',
  criterion: 'as L2.shield.overlap.round.v2 (strength 1; v1 800 / 3 m/s; payments 6/11 and 5/11 of 1 706 666.67 J, or B nearly empty, or A capped at 1 MJ with B 84 615.38 J and v1 527.70 m/s; no generator past its buffer; the momentum change m (v - v1) along +y; heat shared by payment), with the angular momentum change p x J, p the round\'s point, J = m (v - v1) along +y (1e-12 of the gross |p x J|); no throw',
  setup: 'a T1 ship at rest: two M shield generators 50 m apart (cells (0, 0) and (10, 0)), joined by a bridge and three holds; an M round (kinetic.roundMass, kinetic.muzzleVelocity) at the point where g_A = 0.6 and g_B = 0.5, direction +y, through the kernel\'s shieldRound; buffers both full, B nearly empty (1e3 J), or A at 1e6 J and B at 1e5 J (13l.4 A2)',
  tunable: ['shield.kineticStop', 'shield.radius', 'shield.buffer', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return Object.keys(BUFFERS).map((buffers) => ({ buffers }));
  },
  expected(ctx, c) {
    const m = 6, v = 800, E = 0.5 * m * (v * v - (v / 3) * (v / 3));
    if (c.buffers === 'both full') return { v1: v / 3, paid: { genA: (E * 6) / 11, genB: (E * 5) / 11 }, literal: { E: 1706666.6666666667, genA: 930909.0909090909, genB: 775757.5757575758 } };
    if (c.buffers === 'B nearly empty') return { v1: v / 3, paid: { genA: (E * 6e6) / (6e6 + 500), genB: (E * 500) / (6e6 + 500) }, literal: { E: 1706666.6666666667 } };
    const paid = { genA: 1e6, genB: (1.1e6 * 5e4) / 6.5e5 }, total = paid.genA + paid.genB;
    return { v1: Math.sqrt(v * v - (2 * total) / m), paid, literal: { genB: 84615.38461538461, total: 1084615.3846153845, v1: 527.69455034 } };
  },
  run(ctx, c) {
    const edge = ctx.tiers.T1.edge, f = ctx.fixed;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    for (const r of ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell });
    enableShip(world);
    const room = (id) => world.rooms.find((r) => r.id === id), gens = ['genA', 'genB'].map(room);
    for (const g of gens) { g.shield.buffer = shieldBuffer(world, g); const set = BUFFERS[c.buffers]?.[g.id]; if (set !== undefined) g.shield.buffer = set; }
    const before = Object.fromEntries(gens.map((g) => [g.id, g.shield.buffer]));
    const m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const b = world.ship.bodies[0], P0 = [b.M * b.v[0], b.M * b.v[1]], L0 = b.I * b.omega + b.M * cross2(b.x, b.v);
    const sh = shieldRound(world, { position: point(ctx), mass: m, velocity: v, area: A, direction: [0, 1] });
    const P1 = [b.M * b.v[0], b.M * b.v[1]], L1 = b.I * b.omega + b.M * cross2(b.x, b.v);
    const paid = Object.fromEntries(gens.map((g) => [g.id, before[g.id] - g.shield.buffer]));
    // The round's point in the world (the frame at rest, heading 0: world = grid - c + x).
    const pt = point(ctx), q = [b.x[0] + pt[0] - b.c[0], b.x[1] + pt[1] - b.c[1]];
    return { v1: sh.velocity, before, paid, kernelPaid: sh.paid, strength: sh.strength, impulse: sh.impulse, heat: sh.heat, impulseHeat: Object.fromEntries(gens.map((g) => [g.id, g.shield.impulseHeat])), dP: [P1[0] - P0[0], P1[1] - P0[1]], dL: L1 - L0, q };
  },
  compare(e, a, c) {
    const total = a.paid.genA + a.paid.genB, J = 6 * (800 - a.v1);
    const dLexp = cross2(a.q, [0, J]), gross = Math.abs(dLexp);
    const checks = {
      'summed strength min(1, 1.1) = 1': a.strength === 1,
      'speed after the field': close(e.v1, a.v1, 1e-12),
      'each generator pays energy x B_i g_i / sum B_k g_k, or its buffer': ['genA', 'genB'].every((id) => close(e.paid[id], a.paid[id], 1e-12) && close(a.kernelPaid[id], a.paid[id], 1e-12)),
      'no generator pays more than its buffer': ['genA', 'genB'].every((id) => a.paid[id] <= a.before[id] * (1 + 1e-15)),
      'momentum change m (v - v1) along +y (1e-12)': Math.abs(a.dP[0]) <= 1e-12 * J && Math.abs(a.dP[1] - J) <= 1e-12 * J && close(J, a.impulse, 1e-12),
      'angular momentum change = p x J, p the round\'s point (1e-12 x gross)': Math.abs(a.dL - dLexp) <= 1e-12 * gross,
      'heat shared by payment (re-statement)': ['genA', 'genB'].every((id) => close((a.heat * a.paid[id]) / total, a.impulseHeat[id], 1e-12)),
    };
    const L = e.literal;
    if (L.E !== undefined) checks['hand-worked literal: energy 1 706 666.67 J paid in all'] = close(L.E, total, 1e-12);
    if (L.genA !== undefined) checks['hand-worked literals: 930 909.09 and 775 757.58 J'] = close(L.genA, a.paid.genA, 1e-12) && close(L.genB, a.paid.genB, 1e-12);
    if (L.total !== undefined) checks['hand-worked literals: B pays 84 615.38 J, 1 084 615.38 J in all, v1 527.70 m/s'] = close(L.genB, a.paid.genB, 1e-12) && close(L.total, total, 1e-12) && close(L.v1, a.v1, 1e-9);
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `v1 ${e.v1.toFixed(9)} m/s; A pays ${e.paid.genA.toFixed(3)} J, B ${e.paid.genB.toFixed(3)} J`, actual: `v1 ${a.v1.toFixed(9)} m/s; A pays ${a.paid.genA.toFixed(3)} J, B ${a.paid.genB.toFixed(3)} J; strength ${a.strength}; impulse ${a.impulse.toFixed(6)} N s; heat ${a.heat.toFixed(3)} J` };
  },
};
