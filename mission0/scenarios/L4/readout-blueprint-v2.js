import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, readout } from '../../../js/rooms.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
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
// R1c (13l.2, #256): R1 with an armour plate on each of the 8 wall segments around its magazine [7, 9) x [2, 4).
const R1C_PLATES = [
  ['armour', 'magazine', [7, 2], [-1, 0]], ['armour', 'magazine', [7, 3], [-1, 0]], ['armour', 'magazine', [8, 2], [1, 0]], ['armour', 'magazine', [8, 3], [1, 0]],
  ['armour', 'magazine', [7, 2], [0, -1]], ['armour', 'magazine', [8, 2], [0, -1]], ['armour', 'magazine', [7, 3], [0, 1]], ['armour', 'magazine', [8, 3], [0, 1]],
];
const SHIPS = { R1: R1_FITTINGS, R1c: [...R1_FITTINGS, ...R1C_PLATES] };
// Successor of L4.readout.blueprint (#285, DESIGN.md 13n.4 M1): the turret by its mount. Hand-worked literals: R1 full
// at T1 from the cell masses: engine 6 x (3000 + 2700) + reactor 4 x 150 000 + bridge 4 x 14 800 + magazine 4 x 3000 +
// 900 kg of rounds + beam bay 4 x (3000 + 2500) + heat sink 4 x (3000 + 4 x 1.35e6 / 4186) + quarters 6 x 14 800 +
// turret 4 x (3000 + 1975) + 24 kg of rounds + shield generator 4 x 10 000 + hold 4 x 3000 + 17 x 250 + 4 x 200
// = 911 234.0573 kg; R1c's, + 8 x 0.2 x 7850 x 25 = 314 000 kg.
const R1_MASS = 34200 + 600000 + 59200 + 12000 + 900 + 22000 + 4 * (3000 + (4 * 1.35e6) / 4186) + 88800 + 4 * (3000 + 1975) + 24 + 40000 + 12000 + 17 * 250 + 4 * 200;
const MASS = { R1: R1_MASS, R1c: R1_MASS + 8 * 0.2 * 7850 * 25 };

export default {
  id: 'L4.readout.blueprint.v2',
  level: 'L4',
  laws: ['the shipyard\'s readout on a blueprint before enableShip is the readout of the ship after it (#58, #222 (4), #225 (5), §17 item 10)'],
  dependsOn: ['L3.mass.props.v6'],
  setup: 'R1 (13f.2) and R1c (13l.2: R1 with 8 armour plates of armour.plateThickness around its magazine) built in the kernel at T1 (magazine full of HE, the turret\'s ready store full); the kernel\'s readout before enableShip and after it (13l.4 A6)',
  measure: 'readout\'s mass, centre of mass and moment of inertia, before and after',
  tolerance: 'before = after within 1e-12 relative; the mass literals within 1e-12',
  criterion: 'mass, both centre coordinates and the inertia equal before and after enableShip within 1e-12 (#225 (5)); hand-worked mass literals R1 911 234.057 kg and R1c 1 225 234.057 kg (R1 + 314 000 kg of plates, #256) within 1e-12, from the cell masses in the file\'s comments. Successor of L4.readout.blueprint (#285, 13n.4 M1): the turret by its mount (4 x 4975 kg in place of 4 x 14 800 kg); every check kept',
  tunable: ['armour.plateThickness', 'structure.cellMass', 'turret.machineryMass'],
  locked: { date: '2026-10-22', hash: 'b510ef6c' },
  cases() {
    return Object.keys(SHIPS).map((ship) => ({ ship }));
  },
  expected(ctx, c) {
    return { mass: MASS[c.ship] };
  },
  run(ctx, c) {
    const edge = ctx.tiers.T1.edge;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
    for (const [type, room, cell, side] of SHIPS[c.ship]) addFitting(world, type, room, cell, side);
    const room = (id) => world.rooms.find((r) => r.id === id);
    loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
    loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
    const before = readout(world);
    enableShip(world);
    const after = readout(world);
    const pick = (r) => ({ mass: r.mass, centre: r.centre, inertia: r.inertia, accelerationG: r.accelerationG });
    return { before: pick(before), after: pick(after) };
  },
  compare(e, a) {
    const same = (k) => close(a.before[k], a.after[k], 1e-12);
    const checks = {
      'mass before = after': same('mass'),
      'centre before = after': close(a.before.centre[0], a.after.centre[0], 1e-12) && close(a.before.centre[1], a.after.centre[1], 1e-12),
      'inertia before = after': same('inertia'),
      'hand-worked mass literal': close(e.mass, a.after.mass, 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const f = (x) => `M ${x.mass.toFixed(6)} kg, c (${x.centre.map((v) => v.toFixed(9)).join(', ')}) m, I ${x.inertia.toExponential(12)} kg m^2, ${x.accelerationG.toFixed(6)} g`;
    return { expected: `before = after; M ${r.expected.mass.toFixed(6)} kg`, actual: `before ${f(r.actual.before)}; after ${f(r.actual.after)}` };
  },
};
