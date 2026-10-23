import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, damageCell, destroyCell } from '../../../js/rooms.js';

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
function buildR1(ctx, temperatures = {}) {
  const edge = ctx.tiers.T1.edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0, temperature: temperatures[r.id] ?? ctx.fixed.restTemperature.value });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  enableShip(world);
  return { world, room };
}
// Successor of L3.destroyed.mass (#285, DESIGN.md 13n.4 M1): the turret by its mount. R1 full at T1, hand-worked from
// the cell masses (L3.r1.pinned.v2's sums): engine 6 x (3000 + 2700) + reactor 4 x 150 000 + bridge 4 x 14 800 +
// magazine 4 x 3000 + 900 kg of rounds + beam bay 4 x (3000 + 2500) + heat sink 4 x (3000 + 4 x 1.35e6 / 4186) +
// quarters 6 x 14 800 + turret 4 x (3000 + 1975) + 24 kg of rounds + shield generator 4 x 10 000 + hold 4 x 3000 +
// 17 x 250 + 4 x 200 = 911 234.0573 kg.
const R1_MASS = 34200 + 600000 + 59200 + 12000 + 900 + 22000 + 4 * (3000 + (4 * 1.35e6) / 4186) + 88800 + 4 * (3000 + 1975) + 24 + 40000 + 12000 + 17 * 250 + 4 * 200;

export default {
  id: 'L3.destroyed.mass.v2',
  level: 'L3',
  laws: ['a damaged cell keeps its whole mass; a destroyed cell\'s mass leaves as debris (#212 (5), 13f.1)'],
  dependsOn: ['L3.mass.props.v6'],
  setup: 'R1 at T1 (13f.2), at rest: the kernel\'s damageCell takes 1/3 from the hold\'s cell 0 (and 0.9 from its cell 2), then destroyCell destroys the hold\'s cell 1, which rebuilds the ship\'s mass (13l.4 A8: survivor f1.dest.damagedLosesMass of mission0/mutations/2026-10-22-b7c4290.txt)',
  measure: 'the body\'s mass after; the debris',
  tolerance: '1e-12',
  criterion: 'hand-worked: the body holds R1\'s 911 234.057 kg (the turret by its mount, #285: the cell sums in the file\'s comments) less one hold cell (structure.cellMass, 3000 kg): 908 234.057 kg; one debris piece of 3000 kg; the damaged cells (2/3 and 0.1 left) keep their whole 3000 kg each (13f.1). Successor of L3.destroyed.mass (#285, 13n.4 M1): every check kept',
  tunable: ['structure.cellMass', 'turret.machineryMass'],
  locked: { date: '2026-10-22', hash: '2d2f16c8' },
  cases() {
    return [{ cell: 1 }];
  },
  expected() {
    return { M: R1_MASS - 3000, debris: 3000 };
  },
  run(ctx) {
    const { world, room } = buildR1(ctx), hold = room('hold');
    damageCell(world, hold, 0, 1 / 3, 'hit-1', 'kinetic');
    damageCell(world, hold, 2, 0.9, 'hit-2', 'kinetic');
    destroyCell(world, hold, 1, 'hit-3');
    return { M: world.ship.bodies.reduce((x, b) => x + b.M, 0), debris: world.ship.debris.map((d) => d.m), left: hold.cells.map((c) => c.integrity) };
  },
  compare(e, a) {
    const checks = {
      'the body keeps the damaged cells\' whole mass (hand-worked)': close(e.M, a.M, 1e-12),
      'one debris piece of one cell': a.debris.length === 1 && close(e.debris, a.debris[0], 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `M ${r.expected.M.toFixed(6)} kg, debris 3000 kg`, actual: `M ${r.actual.M.toFixed(6)} kg, debris ${r.actual.debris.join(', ')} kg; hold cells ${r.actual.left.map((x) => x.toFixed(4)).join(' ')}` };
  },
};
