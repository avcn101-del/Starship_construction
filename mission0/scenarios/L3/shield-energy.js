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
// R1's mass properties at T1 as tools/estimates/l4.mjs prints them (the kernel's readout of R1 at 0a119ff and
// L3.r1.pinned's mass): hand-worked inputs of the expected heat.
const R1 = { M: 950534.0573339704, c: [24.135543560664708, 16.184166484783013], I: 115001780.87470937 };
// Where the round meets the field: at the generator's centre (g = 1) or at r = R sqrt(1/0.6 - 1) beside it, +x (g = 0.6).
const POINTS = { 'g = 1': 0, 'g = 0.6': Math.sqrt(1 / 0.6 - 1) };

export default {
  id: 'L3.shield.energy',
  level: 'L3',
  laws: ['one energy rule for the field and the hull: the heat is the round\'s lost kinetic energy less the ship\'s kinetic-energy gain (§17 item 25, 13l.1)', 'the field\'s removed momentum pushes the generator\'s ship (#240 (2), F16)'],
  dependsOn: ['L3.hit.books'],
  setup: 'R1 at T1 (13f.2), free, at rest, shield on, its buffer full; an M round (kinetic.roundMass, kinetic.muzzleVelocity) through the kernel\'s shieldRound at the generator\'s centre (20, 5) m (g = 1) or 32.66 m beside it along +x (g = 0.6), direction +y in R1\'s grid frame (13l.4 A3)',
  measure: 'the generator\'s heat from the round (shieldRound\'s heat and the generator\'s shield.impulseHeat); the round\'s speed after',
  tolerance: 'the heat within 1e-12 relative of the hand-worked value',
  criterion: 'hand-worked: at g = 1 the field removes kineticStop (2/3 of an M round\'s sectional momentum), v1 = 800/3 m/s, the round loses 1/2 x 6 x (800^2 - (800/3)^2) = 1 706 666.67 J and the ship takes J = 6 x (800 - 800/3) = 3200 N s along +y at (20, 5) m; at g = 0.6, v1 = 480 m/s, 1 228 800 J lost, J = 1920 N s at (52.66, 5) m. The ship\'s kinetic-energy gain is J^2 / 2M + (dL)^2 / 2I with dL = (x_gen - x_c) J (R1 at rest: M 950 534.057 kg, centre (24.1355, 16.1842) m, I 1.15002e8 kg m^2, from tools/estimates/l4.mjs): 5.3864 + 0.7614 J at g = 1. Generator heat = lost kinetic energy - the gain within 1e-12 relative (§17 item 25: J^2 / 2M was omitted before L4a, about 4e-6 of the energy)',
  tunable: ['shield.kineticStop', 'shield.radius', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return Object.keys(POINTS).map((at) => ({ at }));
  },
  expected(ctx, c) {
    const m = 6, v = 800, v1 = c.at === 'g = 1' ? 800 / 3 : 480, J = m * (v - v1), x = 20 + 40 * POINTS[c.at];
    const lost = 0.5 * m * (v * v - v1 * v1), dL = (20 - R1.c[0]) * J;
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
