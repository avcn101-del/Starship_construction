import { createWorld, addRoom, damageCell, destroyCell, step, runUntil } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them;
// 'cell-damaged' (#206) carries channel, cell and integrity.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: rows.every((r) => booksOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

const LOSS = 0.7123; // integrity the hit takes from the damaged target cell (13e.3 D2)
const WATCH = 600; // s: the destroyed cell is watched at least this long
// (c, r) pairs whose repair time lands on a whole number of steps are left out (#177, #185 (2)): with
// LOSS = 0.7123, c = 3 and c = 1 at 2 radii take 356.15 s and 1068.45 s, exactly 21369 and 64107 steps.
const ON_GRID = [[3, 2], [1, 2]];

export default {
  id: 'L1.quarters.repair.v3',
  level: 'L1',
  laws: ['crew quarters set crew capacity', 'crew die in proportion to the integrity lost', 'repair field by surviving cells, with falloff', 'repair restores damaged cells only; a destroyed cell waits for the drydock'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'the setup of L1.quarters.repair (#206, 13e.3 D2): crew quarters (3 x 2 cells) at T1 with c in {6, 3, 1, 0} surviving cells (6 - c destroyed at t = 0); one target room (an empty hold) at r in {0, 0.5, 1, 2, 4} x repair.radius from the quarters, its cell 0 damaged by 0.7123 (not destroyed) and its cell 1 destroyed at t = 0; run until cell 0 is repaired and at least 600 s; the pairs (c, r) = (3, 2) and (1, 2) are left out, their repair time is a whole number of steps',
  measure: 'crew housed after the losses and the deaths of each destroyed quarters cell; the repair rate of cell 0 in the first step; the time of its cell-repaired event; the integrity of the destroyed cell 1 at the end and any cell-repaired event for it',
  tolerance: 'counts exact; rate relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'housed crew = crewPerCell x c, deaths per destroyed quarters cell = crewPerCell (floor(crew x integrity lost / cells) with whole cells); repair rate of the damaged cell = repair.massRate / the hold cell\'s mass (structure.cellMass) x (c / 6) x g(r), g(r) = 1 / (1 + (r / radius)^2); time to integrity 1 = 0.7123 / rate, one-sided; c = 0: no repair; the destroyed cell stays at integrity 0 through the run and never raises cell-repaired (#51 as amended by #203 D, #99, #206) Successor of L1.quarters.repair.v2 (#240, #243, 13k.4 S16): the repair rate is repair.massRate / the hold cell\'s mass (200 / 3000 = 0.0667 per second at T1, 0.02 before) in place of the removed repair.rate; the two pairs left out stay left out (with the new rate no pair lands on a whole number of steps).',
  tunable: ['quarters.crewPerCell', 'repair.massRate', 'structure.cellMass', 'repair.radius'],
  locked: { date: '2026-10-22', hash: 'ee090ddf' },
  cases() {
    const out = [];
    for (const c of [6, 3, 1, 0]) for (const x of [0, 0.5, 1, 2, 4]) if (!ON_GRID.some(([cc, xx]) => cc === c && xx === x)) out.push({ c, x });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, [w, h] = ROOMS.quarters.footprint.M, cells = w * h;
    const g = 1 / (1 + c.x ** ctx.fixed.repairFalloffExponent.value);
    const rate = (p.repair.massRate.value / p.structure.cellMass.value) * (c.c / cells) * g; // a hold cell: massRate / its mass (#240 (1))
    return { housed: p.quarters.crewPerCell.value * c.c, deathsPerCell: p.quarters.crewPerCell.value, lost: cells - c.c, rate, repaired: c.c > 0 ? LOSS / rate : null, dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const q = addRoom(world, 'quarters', { id: 'quarters', position: [0, 0] });
    const target = addRoom(world, 'hold', { id: 'target', position: [c.x * ctx.params.repair.radius.value, 0] });
    damageCell(world, target, 0, LOSS, 'hit-target', 'kinetic');
    destroyCell(world, target, 1, 'hit-wreck');
    for (let i = 0; i < q.cells.length - c.c; i++) destroyCell(world, q, i, `hit-q${i + 1}`);
    const before = target.cells[0].integrity;
    step(world);
    const rate = (target.cells[0].integrity - before) / ctx.dt;
    const repairedOf = (k) => world.log.events.find((e) => e.type === 'cell-repaired' && e.room === 'target' && e.cell === k) || null;
    if (c.c > 0) while (!repairedOf(0) && world.t < 10000) step(world);
    runUntil(world, Math.max(WATCH, world.t));
    const repaired = repairedOf(0);
    const deaths = world.log.events.filter((e) => e.type === 'crew-died' && e.room === 'quarters').map((e) => e.deaths);
    return {
      housed: q.crew, deaths, rate, repaired: repaired ? repaired.t : null, integrity: target.cells[0].integrity,
      wreck: target.cells[1].integrity, wreckRepaired: repairedOf(1) !== null, t: world.t, books: heatBooks(q.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const checks = {
      housed: a.housed === e.housed, 'deaths per cell': a.deaths.length === e.lost && a.deaths.every((d) => d === e.deathsPerCell), rate: c.c > 0 ? close(e.rate, a.rate, 1e-9) : a.rate === 0,
      repaired: c.c > 0 ? oneSided(e.repaired, a.repaired, e.dt) && a.integrity === 1 : a.repaired === null && close(1 - LOSS, a.integrity, 1e-12),
      'destroyed cell stays destroyed': a.wreck === 0 && !a.wreckRepaired && a.t >= WATCH,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `housed ${e.housed}, ${e.lost} cells lost x ${e.deathsPerCell} dead; rate ${e.rate.toExponential(6)} /s; repaired ${e.repaired === null ? 'never' : e.repaired.toFixed(4) + ' s'}; destroyed cell 0`,
      actual: `housed ${a.housed}, deaths [${a.deaths.join(', ')}]; rate ${a.rate.toExponential(6)} /s; repaired ${a.repaired === null ? 'never' : a.repaired.toFixed(4) + ' s'}; destroyed cell ${a.wreck}${a.wreckRepaired ? ' (repaired!)' : ''} at ${a.t.toFixed(2)} s`,
    };
  },
};
