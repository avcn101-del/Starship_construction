import { createWorld, addRoom, setActive, fireBeam, beamEnergy } from '../../../js/rooms.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175).
// The kernel has no armour cells yet (armour fittings come later, #15): the target column is two M shield
// generators standing alone and switched off, crossed two cells deep (4 cells of sigma = cellMass.shieldGenerator /
// edge^2, 400 kg/m^2 at T1, the armour cell's), as in L0.beam.burn.v3.
const RANGES = [0, 600, 1500];

export default {
  id: 'L0.beam.range',
  level: 'L0',
  laws: ['no beam falloff at battle range (#230 (3))', 'energy conservation'],
  dependsOn: ['L0.beam.depth'],
  setup: 'an M beam (beam.power, 5 MW at T1) from an M beam bay 8 cells long (E = beam.gradient x 8 x edge, 400 MeV) for one step on a column of 4 cells (two switched-off M shield generators crossed two cells deep) at 0, 600 and 1500 m, T1, by the kernel\'s fireBeam (13i.4 P7)',
  measure: 'the power delivered; the energy left in the cells plus the energy that leaves, over the step; the fractions',
  tolerance: 'delivered power exact; the step\'s books relative 1e-12; fractions identical across ranges (exact)',
  criterion: 'delivered power = P exactly at every range (no falloff, #230); sum of the energies left in the cells + the energy that leaves = P dt within 1e-12 relative; the fractions do not depend on the range (#229, #230, #235)',
  tunable: ['beam.power', 'beam.gradient', 'cellMass.shieldGenerator'],
  locked: { date: '2026-10-21', hash: 'd12ff666' },
  cases() {
    return RANGES.map((range) => ({ range }));
  },
  expected(ctx) {
    return { delivered: ctx.params.beam.power.value, stepEnergy: ctx.params.beam.power.value * ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.baseEdge, dt: ctx.dt });
    const bay = addRoom(world, 'beamBay', { id: 'bay', length: 8 });
    const rooms = [addRoom(world, 'shieldGenerator', { id: 'gen-1' }), addRoom(world, 'shieldGenerator', { id: 'gen-2' })];
    for (const r of rooms) setActive(world, r, false);
    const path = [{ room: rooms[0], cell: 0 }, { room: rooms[0], cell: 1 }, { room: rooms[1], cell: 0 }, { room: rooms[1], cell: 1 }];
    const res = fireBeam(world, { power: ctx.scaled(ctx.params.beam.power), energy: beamEnergy(world, bay), range: c.range }, path, 'beam-1');
    return { delivered: res.delivered, booked: res.energies.reduce((x, y) => x + y, 0) + res.escaped, fractions: res.fractions, range: res.range };
  },
  compare(e, a) {
    const checks = { 'delivered = P exactly': a.delivered === e.delivered, 'energy left + energy leaving = P dt (1e-12)': Math.abs(a.booked - e.stepEnergy) <= 1e-12 * e.stepEnergy };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const ref = rows[0].actual.fractions;
    return [{ name: 'the fractions are identical at every range', ok: rows.every((r) => r.actual.fractions.length === ref.length && r.actual.fractions.every((x, i) => x === ref[i])) }];
  },
  display(r) {
    return { expected: `delivered ${(r.expected.delivered / 1e6).toFixed(6)} MW, ${(r.expected.stepEnergy / 1e3).toFixed(6)} kJ per step`, actual: `delivered ${(r.actual.delivered / 1e6).toFixed(6)} MW at ${r.actual.range} m, ${(r.actual.booked / 1e3).toFixed(6)} kJ; F [${r.actual.fractions.map((x) => x.toFixed(4)).join(' ')}]` };
  },
};
