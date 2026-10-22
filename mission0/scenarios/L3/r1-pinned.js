import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, readout, step } from '../../../js/rooms.js';

// S20 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-4): R1 pinned to literals. The literals were printed by
// node tools/estimates/pass2.mjs (its section 8) from the kernel on data.js at this pass; any changed constant that
// moves R1 fails this scenario, not only the data hash.
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
const LITERAL = { mass: 950534.0573339704, g: 1.6091736089467397, turn90: 3.801519432783319, recoil: -0.049897725030413356 };

export default {
  id: 'L3.r1.pinned',
  level: 'L3',
  laws: ['inertia and moment of inertia (#208)', 'thrust and RCS move and turn the ship (13f.1)', 'recoil (Newton 3, #5)'],
  dependsOn: [],
  setup: 'R1 at T1 (13f.2), magazine full of HE, the turret\'s store full: the kernel\'s readout; then the turret, aimed +y (broadside), fires one M round in one step (13k.4 S20)',
  measure: 'the readout\'s mass, acceleration in g with the engine at full throttle and the 90 degree turn on the RCS couple; the change of angular velocity in the step of the shot (deg/s)',
  tolerance: '1e-6 relative against the literals (13k.4 S20)',
  criterion: 'mass 950 534.057 kg, acceleration 1.60917361 g, 90 degree turn 3.80151943 s, recoil -0.0498977250 deg/s per M round broadside, each within 1e-6 relative of the literal printed by tools/estimates/pass2.mjs section 8 (#208, #221, #243, #244)',
  tunable: ['structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'cellMass.shieldGenerator', 'engine.machineryMass', 'beambay.machineryMass', 'thermal.coupledHeatSink', 'heatsink.capacityFactor', 'radiator.mass', 'rcs.mass', 'rcs.force', 'engine.thrust', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'magazine.capacity'],
  locked: { date: '2026-10-22', hash: 'e364793c' },
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
