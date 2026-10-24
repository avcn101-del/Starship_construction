import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, shieldRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: 17 radiators, then 4 RCS (fitting ids 17-20).
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
/** Build R1 in the kernel at `tier`: magazine full of HE, the turret's ready store full and holding fire; `setup(world, room)` before enableShip. */
function buildR1(ctx, { tier = 'T1', velocity = [0, 0], omega = 0, heading = 0, routing = null, setup = null } = {}) {
  const edge = ctx.tiers[tier].edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  if (routing) enablePowerRouting(world, routing);
  if (setup) setup(world, room);
  enableShip(world, { velocity, omega, heading });
  return { world, room };
}
// L5e1 (DESIGN.md 13n.8, §17 item 35): the successor of L3.shield.energy.v2, every case and check kept but the impulse's
// point: the field's impulse acts on the round's line of action at the point the field takes it, so dL = (x_p - x_c) J
// with x_p the round's point (the generator's centre at g = 1, unchanged; 32.66 m beside it at g = 0.6, where the gain
// is (1920^2 / 2M) + ((52.66 - 23.2357) x 1920)^2 / 2I, about 2.02 + 17.10 J). Its predecessor: successor of
// L3.shield.energy (#285, DESIGN.md 13n.4 M1): the turret by its mount. R1's mass properties at T1,
// hand-worked inputs of the expected heat, from the cell masses as L3.r1.pinned.v2 writes them out: the turret's four
// cells 3000 + 1975 = 4975 kg in place of 14 800 kg; M = 911 234.0573 kg, centre = sum m p / M = (23.235694, 15.803954) m,
// I = sum m (a^2 / 6 + d^2) = 9.33145522e7 kg m^2 (the original's 950 534.057 kg, (24.1355, 16.1842) m and 1.15002e8 kg m^2
// were printed by tools/estimates/l4.mjs; the same sums with 14 800 kg give them to their last digits).
const R1 = { M: 911234.0573339703, c: [23.235694469790186, 15.803954338013957], I: 93314552.23439068 };
// Where the round meets the field: at the generator's centre (g = 1) or at r = R sqrt(1/0.6 - 1) beside it, +x (g = 0.6).
const POINTS = { 'g = 1': 0, 'g = 0.6': Math.sqrt(1 / 0.6 - 1) };

export default {
  id: 'L3.shield.energy.v3',
  level: 'L3',
  laws: ['one energy rule for the field and the hull: the heat is the round\'s lost kinetic energy less the ship\'s kinetic-energy gain (§17 item 25, 13l.1)', 'the field\'s removed momentum pushes the generator\'s ship, on the round\'s line of action at the field\'s surface (#240 (2), F16, §17 item 35)'],
  dependsOn: ['L3.hit.books'],
  setup: 'R1 at T1 (13f.2), free, at rest, shield on, its buffer full; an M round (kinetic.roundMass, kinetic.muzzleVelocity) through the kernel\'s shieldRound at the generator\'s centre (20, 5) m (g = 1) or 32.66 m beside it along +x (g = 0.6), direction +y in R1\'s grid frame (13l.4 A3; 13n.8)',
  measure: 'the generator\'s heat from the round (shieldRound\'s heat and the generator\'s shield.impulseHeat); the round\'s speed after',
  tolerance: 'the heat within 1e-12 relative of the hand-worked value',
  criterion: 'hand-worked: at g = 1 the field removes kineticStop (2/3 of an M round\'s sectional momentum), v1 = 800/3 m/s, the round loses 1/2 x 6 x (800^2 - (800/3)^2) = 1 706 666.67 J and the ship takes J = 6 x (800 - 800/3) = 3200 N s along +y at the round\'s point (20, 5) m; at g = 0.6, v1 = 480 m/s, 1 228 800 J lost, J = 1920 N s at the round\'s point (52.66, 5) m. The ship\'s kinetic-energy gain is J^2 / 2M + (dL)^2 / 2I with dL = (x_p - x_c) J, x_p the round\'s point (R1 at rest: M 911 234.057 kg, centre (23.2357, 15.8040) m, I 9.33146e7 kg m^2, hand-worked from the cell masses in the file\'s comments): 5.6188 + 0.5745 J at g = 1, about 2.0227 + 17.10 J at g = 0.6. Generator heat = lost kinetic energy - the gain within 1e-12 relative (§17 item 25: J^2 / 2M was omitted before L4a, about 4e-6 of the energy). Successor of L3.shield.energy.v2 (13n.8, §17 item 35): the impulse on the round\'s line; every check of L3.shield.energy.v2 kept',
  tunable: ['turret.machineryMass', 'structure.cellMass', 'shield.kineticStop', 'shield.radius', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return Object.keys(POINTS).map((at) => ({ at }));
  },
  expected(ctx, c) {
    const m = 6, v = 800, v1 = c.at === 'g = 1' ? 800 / 3 : 480, J = m * (v - v1), x = 20 + 40 * POINTS[c.at];
    const lost = 0.5 * m * (v * v - v1 * v1), dL = (x - R1.c[0]) * J; // at the round's point x (§17 item 35)
    return { v1, J, x, lost, gain: (J * J) / (2 * R1.M) + (dL * dL) / (2 * R1.I), heat: lost - (J * J) / (2 * R1.M) - (dL * dL) / (2 * R1.I) };
  },
  run(ctx, c) {
    const edge = ctx.tiers.T1.edge, f = ctx.fixed;
    const { world, room } = buildR1(ctx);
    const gen = room('shield'), m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const position = [gen.position[0] + ctx.params.shield.radius.value * POINTS[c.at], gen.position[1]];
    const b = world.ship.bodies[0], K0 = 0.5 * b.M * (b.v[0] ** 2 + b.v[1] ** 2) + 0.5 * b.I * b.omega ** 2;
    const sh = shieldRound(world, { position, mass: m, velocity: v, area: A, direction: [0, 1] });
    const K1 = 0.5 * b.M * (b.v[0] ** 2 + b.v[1] ** 2) + 0.5 * b.I * b.omega ** 2;
    return { v1: sh.velocity, impulse: sh.impulse, heat: sh.heat, impulseHeat: gen.shield.impulseHeat, energy: sh.energy, gain: K1 - K0, M: b.M, c: b.c, I: b.I };
  },
  compare(e, a) {
    const checks = {
      'speed after the field (hand-worked)': close(e.v1, a.v1, 1e-12),
      'impulse J (hand-worked)': close(e.J, a.impulse, 1e-12),
      'generator heat = lost kinetic energy - the ship\'s gain (hand-worked, 1e-12)': close(e.heat, a.heat, 1e-12) && close(e.heat, a.impulseHeat, 1e-12),
      'R1 as quoted (mass, centre, inertia)': close(R1.M, a.M, 1e-12) && close(R1.c[0], a.c[0], 1e-12) && close(R1.c[1], a.c[1], 1e-12) && close(R1.I, a.I, 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `heat ${e.heat.toFixed(6)} J (lost ${e.lost.toFixed(6)} J - gain ${e.gain.toFixed(6)} J)`, actual: `heat ${a.heat.toFixed(6)} J (impulseHeat ${a.impulseHeat.toFixed(6)} J; buffer paid ${a.energy.toFixed(6)} J; ship gained ${a.gain.toFixed(6)} J)` };
  },
};
