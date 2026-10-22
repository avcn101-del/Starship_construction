import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, damageCell, fireBeam, beamEnergy } from '../../../js/rooms.js';

// Successor of L3.beam.deposit (DESIGN.md 13l.7, #271: TOL2): the vented check keeps a stated tolerance, 1e-11, with
// its reason: the vented heat is a small difference of two large heat terms (residue on record 1.05e-12 relative).
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

export default {
  id: 'L3.beam.deposit.v2',
  level: 'L3',
  laws: ['a beam deposits its energy, then damages: a cell destroyed in that step takes its share of the room\'s heat, the deposit included, with it (F21, 13k.1; #214 (9))'],
  dependsOn: ['L3.ship.heat.v3'],
  setup: 'R1 at T1 (13f.2), at rest, every room at 290 K: the kernel\'s damageCell leaves the hold\'s cell 0 at integrity 1e-6; one step of a 5 MW beam of an N = 2 bay\'s energy (100 MeV) by fireBeam on a path of that cell alone (13l.4 A8: survivor k1.deposit.damageFirst of mission0/mutations/2026-10-22-b7c4290.txt)',
  measure: 'the hold\'s heat Q and its vented heat after the step\'s deposit; whether the cell is destroyed',
  tolerance: '1e-12; the vented heat 1e-11 relative (13l.7 TOL2: the vent is the departing cell\'s share of the hold\'s heat less that share at 290 K, a difference of two terms of about 4e8 J for a result of 2.1e4 J, so its float residue is of the order of 1e-12 of it, 1.05e-12 on record: 1e-12 would fail on the float, not on the law)',
  criterion: 'hand-worked: the beam stops in the cell (120 kg/m^2 beyond the 112.6 kg/m^2 CSDA range of 100 MeV in iron), so it deposits E = 5e6 / 60 = 83 333.33 J, which destroys the cell (E / (3000 J/kg x 3000 kg) = 0.0093 > 1e-6); the cell leaves with a quarter of the room\'s heat capacity and of its heat after the deposit, so the hold keeps Q = 3/4 (C x 290 + E) and vents (C / 4)(T - 290) = E / 4 = 20 833.33 J (C = 4 x thermal.coupledHold = 5.4e6 J/K) (F21, #214 (9))',
  tunable: ['beam.power', 'matter.burnEnergyPerKg', 'thermal.coupledHold'],
  locked: null,
  cases() {
    return [{ cell: 0 }];
  },
  expected() {
    const E = 5e6 / 60, C = 5.4e6;
    return { E, Q: 0.75 * (C * 290 + E), vented: E / 4 };
  },
  run(ctx) {
    const { world, room } = buildR1(ctx), hold = room('hold');
    damageCell(world, hold, 0, 1 - 1e-6, 'fixture', 'kinetic');
    const v0 = hold.heat.vented;
    const res = fireBeam(world, { power: 5e6, energy: beamEnergy(world, { length: 2 }) }, [{ room: hold, cell: 0 }], 'beam');
    return { E: res.energies[0], Q: hold.heat.Q, vented: hold.heat.vented - v0, destroyed: hold.cells[0].destroyed, C: hold.heat.C };
  },
  compare(e, a) {
    const checks = {
      'deposit E = P dt (hand-worked)': close(e.E, a.E, 1e-12),
      'the cell is destroyed': a.destroyed,
      'the hold keeps 3/4 of its heat after the deposit (hand-worked)': close(e.Q, a.Q, 1e-12),
      'it vents E / 4 (hand-worked; 1e-11, the float residue of a difference of sums, 13l.7 TOL2)': close(e.vented, a.vented, 1e-11),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `Q ${r.expected.Q.toFixed(3)} J, vented ${r.expected.vented.toFixed(6)} J`, actual: `Q ${r.actual.Q.toFixed(3)} J, vented ${r.actual.vented.toFixed(6)} J, destroyed ${r.actual.destroyed}, C ${r.actual.C}` };
  },
};
