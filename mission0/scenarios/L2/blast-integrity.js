import { createWorld, addRoom, loadMagazine, detonateMagazine, damageCell } from '../../../js/rooms.js';

// Checks shared by the L2 scenarios (13d.2), written out in this file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], explosion: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// The hold's integrity before the blast: every cell at 1, 2/3 or 1/3 (set by the kernel's damageCell, a loss of 1 - it).
const INTEGRITY = { full: 1, 'two thirds': 2 / 3, 'one third': 1 / 3 };

export default {
  id: 'L2.blast.integrity',
  level: 'L2',
  laws: ['blast capacity from remaining integrity: B = sum of remaining integrity x matter.blastPerKg x cell mass (#216 (3), 13l.1)', 'a damaged room absorbs less and passes more (13l.1)'],
  dependsOn: ['L2.blast.mass'],
  setup: 'a T1 cluster (30 x 14 grid, no ship): an M magazine at cell (0, 0) holding one S AP round (its charge 6 MJ x (2/3)^3 = 16/9 MJ, its own blast) and an M hold at (2, 0), sharing a 10 m wall; the hold\'s four cells first damaged by the kernel\'s damageCell to integrity 1, 2/3 or 1/3; then the magazine set off by detonateMagazine (13l.4 A1)',
  measure: 'world.blasts: the capacity and the energy absorbed per room, the energy escaped; each hold cell\'s integrity after; the events',
  tolerance: 'books absorbed + escaped = E within 1e-9 x E; capacities, absorbed energies and integrities against the hand-worked literals within 1e-12',
  criterion: 'hand-worked literals (structure.cellMass 3000 kg, matter.blastPerKg 100 J/kg, 4 cells): the magazine absorbs its capacity 4 x 100 x 3000 = 1.2 MJ and passes E - 1.2 MJ = 5.2/9 MJ (0.5778 MJ) to the hold; the hold\'s capacity is its remaining integrity x 1.2 MJ: 1.2, 0.8 and 0.4 MJ. Full: the hold absorbs 5.2/9 MJ, nothing escapes, each cell is left at 1 x (1 - (5.2/9) / 1.2) = 14/27; two thirds: absorbs 5.2/9 MJ, each cell left at (2/3)(1 - (5.2/9) / 0.8) = 5/27 (the absorbed share of each cell\'s remaining integrity, so no cell holds more than its own integrity x q_b x m); one third: absorbs its 0.4 MJ, every cell destroyed, and 16/9 - 1.6 = 1.6/9 MJ (0.1778 MJ) escapes to space. Books: absorbed + escaped = E within 1e-9 (#184, #216 (3), 13l.1)',
  tunable: ['matter.blastPerKg', 'structure.cellMass', 'kinetic.chargeEnergy'],
  locked: { date: '2026-10-22', hash: '377ce996' },
  cases() {
    return Object.keys(INTEGRITY).map((hold) => ({ hold }));
  },
  expected(ctx, c) {
    const E = 16e6 / 9, magCap = 1.2e6, holdCap = 1.2e6 * INTEGRITY[c.hold], passed = E - magCap;
    const absorbed = Math.min(passed, holdCap), escaped = passed - absorbed;
    const after = { full: 14 / 27, 'two thirds': 5 / 27, 'one third': 0 }[c.hold];
    return { E, magCap, holdCap, absorbed, escaped, after };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [0, 0] }), hold = addRoom(world, 'hold', { id: 'hold', cell: [2, 0] });
    const sMass = ctx.scaled(ctx.params.kinetic.roundMass, ctx.tiers.T1.edge) * ctx.fixed.sizeLinear.value.S ** 3;
    loadMagazine(world, mag, { size: 'S', apMass: sMass });
    if (INTEGRITY[c.hold] < 1) hold.cells.forEach((cell, i) => damageCell(world, hold, i, 1 - INTEGRITY[c.hold], 'fixture', 'kinetic'));
    const before = hold.cells.map((x) => x.integrity);
    detonateMagazine(world, mag, 'fixture');
    const b = world.blasts[0];
    return {
      E: b.energy, capacity: b.capacity, absorbed: b.absorbed, escaped: b.escaped, before,
      after: hold.cells.map((x) => (x.destroyed ? 0 : x.integrity)), destroyed: hold.cells.filter((x) => x.destroyed).length, eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const hold = a.absorbed.hold || 0, mag = a.absorbed.magazine || 0;
    const checks = {
      'blast energy 16/9 MJ (one S AP round)': close(e.E, a.E, 1e-12),
      'magazine capacity 1.2 MJ, absorbed': close(e.magCap, a.capacity.magazine, 1e-12) && close(e.magCap, mag, 1e-12),
      'hold capacity = remaining integrity x 1.2 MJ': close(e.holdCap, a.capacity.hold, 1e-12),
      'hold absorbs min(passed, capacity)': close(e.absorbed, hold, 1e-12),
      'escaped': e.escaped === 0 ? Math.abs(a.escaped) <= 1e-9 * e.E : close(e.escaped, a.escaped, 1e-9),
      'books: absorbed + escaped = E (1e-9)': Math.abs(mag + hold + a.escaped - a.E) <= 1e-9 * a.E,
      'each hold cell\'s integrity after (14/27, 5/27, destroyed)': e.after === 0 ? a.destroyed === 4 : a.after.every((x) => close(e.after, x, 1e-12)),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [{ name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) }];
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `hold cap ${(e.holdCap / 1e6).toFixed(6)} MJ, absorbs ${(e.absorbed / 1e6).toFixed(6)} MJ, escapes ${(e.escaped / 1e6).toFixed(6)} MJ, cells left ${e.after.toFixed(6)}`, actual: `hold cap ${((a.capacity.hold || 0) / 1e6).toFixed(6)} MJ, absorbs ${((a.absorbed.hold || 0) / 1e6).toFixed(6)} MJ, escapes ${(a.escaped / 1e6).toFixed(6)} MJ, cells left ${a.after.map((x) => x.toFixed(6)).join(' ')}` };
  },
};
