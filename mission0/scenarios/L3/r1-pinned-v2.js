import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, readout, step } from '../../../js/rooms.js';

// S20 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-4): R1 pinned to literals; any changed constant that
// moves R1 fails this scenario, not only the data hash.
// Successor of L3.r1.pinned (#285, DESIGN.md 13n.4 M1): the turret by its mount, its cells structure.cellMass +
// turret.machineryMass = 3000 + 1975 = 4975 kg at T1 in place of cellMass.crewed's 14 800 kg. The literals are
// hand-worked from the cell masses below (the original's were printed by tools/estimates/pass2.mjs), the same way
// reproducing the original's four literals to their last digits with the turret at 14 800 kg.
// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
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
// Hand-worked at T1 (edge 5 m), R1 full, x forward; a cell is a square of 5 m at its centre ((i + 0.5) 5, (j + 0.5) 5),
// I = sum m (a^2 / 6 + d^2), a = 5 m for a cell and 0 for a point mass.
//   cell masses (kg): engine 3000 + 2700 = 5700 (6 cells, [0, 3) x [2, 4)); reactor 150 000 (4, [3, 5) x [2, 4));
//   bridge 14 800 (4, [5, 7) x [2, 4)); magazine 3000 (4, [7, 9) x [2, 4)) + 900 kg of rounds at (40, 15);
//   beam bay 3000 + 2500 = 5500 (4, [9, 11) x [2, 4)); heat sink 3000 + 4 x 1.35e6 / 4186 = 4290.0143 (4, [3, 5) x [4, 6));
//   quarters 14 800 (6, [5, 8) x [4, 6)); turret 3000 + 1975 = 4975 (4, [8, 10) x [4, 6)) + 4 x 6 = 24 kg of rounds at
//   (45, 25); shield generator 10 000 (4, [3, 5) x [0, 2)); hold 3000 (4, [7, 9) x [0, 2)); 17 radiators of 250 kg and
//   4 RCS of 200 kg at their edges' midpoints (R1_FITTINGS).
//   M = 34 200 + 600 000 + 59 200 + 12 900 + 22 000 + 17 160.057 + 88 800 + 19 924 + 40 000 + 12 000 + 4250 + 800
//     = 911 234.0573 kg (39 300 kg = 4 x 9825 less than the original's 950 534.0573).
//   centre = sum m p / M = (23.235694, 15.803954) m; I = 9.33145522e7 kg m^2.
//   g = engine.thrust / (M g0) = 1.5e7 / (911 234.0573 x 9.80665) = 1.67857457.
//   turn: the four RCS give a couple of 1e6 N x 50 m = 5e7 N m each way whatever the centre (arms (cx - 2.5) and
//   (52.5 - cx)), alpha = 5e7 / I = 0.5358221, T = 2 sqrt((pi / 2) / alpha) = 3.42436162 s.
//   recoil: after the round has left (M - 6, the turret holding 3 rounds), centre (cx', cy') and I' by the same sums;
//   delta omega = (r x p) / I' with r = (45 - cx', 25 - cy') and p = (0, -6 x 800): (45 - cx') (-4800) / I' rad/s
//     = -0.0641472077 deg/s.
const LITERAL = { mass: 911234.0573339703, g: 1.6785745738499087, turn90: 3.4243616150902216, recoil: -0.0641472076627804 };

export default {
  id: 'L3.r1.pinned.v2',
  level: 'L3',
  laws: ['inertia and moment of inertia (#208)', 'thrust and RCS move and turn the ship (13f.1)', 'recoil (Newton 3, #5)'],
  dependsOn: [],
  setup: 'R1 at T1 (13f.2), magazine full of HE, the turret\'s store full: the kernel\'s readout; then the turret, aimed +y (broadside), fires one M round in one step (13k.4 S20)',
  measure: 'the readout\'s mass, acceleration in g with the engine at full throttle and the 90 degree turn on the RCS couple; the change of angular velocity in the step of the shot (deg/s)',
  tolerance: '1e-6 relative against the literals (13k.4 S20)',
  criterion: 'mass 911 234.057 kg, acceleration 1.67857457 g, 90 degree turn 3.42436162 s, recoil -0.0641472077 deg/s per M round broadside, each within 1e-6 relative of the literal hand-worked from the cell masses in the file\'s comments (#208, #221, #243, #244). Successor of L3.r1.pinned (#285, 13n.4 M1): the turret by its mount (4 x 4975 kg in place of 4 x 14 800 kg); every check of L3.r1.pinned kept',
  tunable: ['turret.machineryMass', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'cellMass.shieldGenerator', 'engine.machineryMass', 'beambay.machineryMass', 'thermal.coupledHeatSink', 'heatsink.capacityFactor', 'radiator.mass', 'rcs.mass', 'rcs.force', 'engine.thrust', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'magazine.capacity'],
  locked: { date: '2026-10-22', hash: '4240df1b' },
  cases() {
    return [{ ship: 'R1', tier: 'T1' }];
  },
  expected() {
    return LITERAL;
  },
  run(ctx) {
    const { world, room } = buildR1(ctx);
    const r = readout(world);
    room('turret').turret.aim = [0, 1]; room('turret').turret.hold = false;
    const w0 = world.ship.bodies[0].omega;
    step(world);
    return { mass: r.mass, g: r.accelerationG, turn90: r.rcs.turn90ccw, recoil: ((world.ship.bodies[0].omega - w0) * 180) / Math.PI };
  },
  compare(e, a) {
    const bad = Object.keys(e).filter((k) => !(Number.isFinite(a[k]) && Math.abs(a[k] - e[k]) <= 1e-6 * Math.abs(e[k])));
    return { pass: bad.length === 0, note: bad.join(', ') };
  },
  display(r) {
    const f = (x) => `mass ${x.mass.toFixed(3)} kg, ${x.g.toFixed(8)} g, turn ${x.turn90.toFixed(8)} s, recoil ${x.recoil.toFixed(10)} deg/s`;
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
