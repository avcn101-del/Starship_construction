import { createWorld, addRoom, step, beamEnergy } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { validateShip } from '../../../js/layout.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// R1 (13f.2) on the T1 drydock grid, x forward: rooms and one fitting per open edge, as tools/perf.js.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
// Two bad bays, everything else valid: 'off axis' moves the bay to rows 0-1 beside the hold (its fittings moved
// with it to the same open edges); 'bow closed' puts a hold ahead of the bay in its rows (the two bow radiators,
// whose edges it closes, dropped).
const VARIANTS = {
  R1: { rule: null, rooms: R1_ROOMS, fittings: R1_FITTINGS },
  'off axis': {
    rule: 'axis',
    rooms: R1_ROOMS.map((r) => (r.id === 'beamBay' ? { ...r, cell: [9, 0] } : r)),
    fittings: [...R1_FITTINGS.filter((f) => f[1] !== 'beamBay'), ['radiator', 'beamBay', [10, 0], [1, 0]], ['radiator', 'beamBay', [10, 1], [1, 0]], ['radiator', 'beamBay', [9, 0], [0, -1]], ['rcs', 'beamBay', [10, 1], [0, 1]], ['rcs', 'beamBay', [10, 0], [0, -1]]],
  },
  'bow closed': { rule: 'bow', rooms: [...R1_ROOMS, { id: 'hold-2', type: 'hold', cell: [11, 2] }], fittings: R1_FITTINGS.filter((f) => !(f[1] === 'beamBay' && f[3][0] === 1)) },
};

export default {
  id: 'L1.beambay.length.v2',
  level: 'L1',
  laws: ['the beam bay is a spinal accelerator: E = gradient x length (#234)', 'beam efficiency: the rest is heat', 'validation: a spinal room lies on the axis rows with its bow face clear (#57, #234)'],
  dependsOn: ['L1.beambay.heat'],
  setup: 'an M and an L beam bay alone, N = 2, 4 and 8 cells long, firing at full, powered, T1 and T3 (one step); and three blueprints on the T1 drydock grid: R1 (13f.2), R1 with its bay moved off the axis rows to (9, 0), R1 with a hold ahead of the bay at (11, 2) (13i.4 P9)',
  measure: 'the particle energy beamEnergy; beam power, draw and heat rate in the first step; the validation verdict and its reasons',
  tolerance: 'E exact (the same arithmetic: gradient x N x edge); power, draw and heat rate relative 1e-9 and identical across N (exact); validation exact',
  criterion: 'E = beam.gradient (scaled to the tier, k = -0.41) x N x edge exactly (#234, #240 (4)); beam = beam.power x sizeLinear^2 (k = 2), draw = beam / beambay.efficiency, heat rate = draw - beam, as L1.beambay.heat, the same for every N; R1 valid; the off-axis bay rejected with exactly one reason, \'axis\'; the bay with a hold ahead rejected with exactly one reason, \'bow\' (#183, #234, #235) Successor of L1.beambay.length (#240, #243, 13k.4 S16): beam.gradient is taken at its tier (k = -0.41, 13k.2: x 2^-0.41 = 0.7527 at T3) in place of its T1 value; nothing else changes.',
  tunable: ['beam.gradient', 'beam.power', 'beambay.efficiency'],
  locked: { date: '2026-10-22', hash: 'a9bf8e7d' },
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const size of ['M', 'L']) for (const N of [2, 4, 8]) out.push({ tier, size, N });
    for (const variant of Object.keys(VARIANTS)) out.push({ variant });
    return out;
  },
  expected(ctx, c) {
    if (c.variant) return { rule: VARIANTS[c.variant].rule };
    const p = ctx.params, edge = ctx.tiers[c.tier].edge, k = ctx.fixed.sizeLinear.value[c.size];
    const beam = ctx.scaled(p.beam.power, edge) * k * k, draw = beam / p.beambay.efficiency.value;
    return { E: ctx.scaled(p.beam.gradient, edge) * c.N * edge, beam, draw, heatRate: draw - beam }; // gradient at its tier, k = -0.41 (#240 (4))
  },
  run(ctx, c) {
    if (c.variant) {
      const v = VARIANTS[c.variant];
      const res = validateShip({ grid: ctx.tiers.T1.grid, edge: ctx.baseEdge, rooms: v.rooms, fittings: v.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) }, ROOMS);
      return { valid: res.valid, reasons: res.reasons.map((r) => ({ rule: r.rule, room: r.room, detail: r.detail })) };
    }
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'beamBay', { size: c.size, length: c.N }), b = room.beamBay;
    b.firing = true;
    const Q = room.heat.Q;
    step(world);
    return { cells: room.cells.length, E: beamEnergy(world, room), beam: b.beam, draw: b.draw, heatRate: (room.heat.Q - Q) / ctx.dt, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c) {
    if (c.variant) {
      const ok = e.rule === null ? a.valid && a.reasons.length === 0 : !a.valid && a.reasons.length === 1 && a.reasons[0].rule === e.rule && a.reasons[0].room === 'beamBay';
      return { pass: ok, note: ok ? '' : 'validation' };
    }
    const checks = {
      'cells = N x width': a.cells === c.N * ROOMS.beamBay.footprint[c.size][1],
      'E = gradient x N x edge exactly': a.E === e.E,
      beam: close(e.beam, a.beam, 1e-9), draw: close(e.draw, a.draw, 1e-9), 'heat rate': close(e.heatRate, a.heatRate, 1e-9),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const bays = rows.filter((r) => !r.case.variant);
    return [
      { name: 'beam, draw and heat rate identical for every N (exact), each tier and size', ok: bays.every((r) => { const ref = bays.find((q) => q.case.tier === r.case.tier && q.case.size === r.case.size && q.case.N === 2).actual; return r.actual.beam === ref.beam && r.actual.draw === ref.draw && r.actual.heatRate === ref.heatRate; }) },
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: bays.every((r) => booksOk(r.actual.books)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: bays.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    if (r.case.variant) return { expected: r.expected.rule === null ? 'valid' : `rejected: ${r.expected.rule}`, actual: r.actual.valid ? 'valid' : `rejected: ${r.actual.reasons.map((x) => `${x.rule}: ${x.detail}`).join('; ')}` };
    const f = (x) => `beam ${(x.beam / 1e6).toFixed(4)}, draw ${(x.draw / 1e6).toFixed(4)}, heat ${(x.heatRate / 1e6).toFixed(4)} MW`;
    return { expected: `E ${(r.expected.E / 1.602176634e-13).toFixed(3)} MeV; ${f(r.expected)}`, actual: `E ${(r.actual.E / 1.602176634e-13).toFixed(3)} MeV (${r.actual.cells} cells); ${f(r.actual)}` };
  },
};
