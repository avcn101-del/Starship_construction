import { createWorld, addRoom, destroyCell, step, runUntil } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
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
const firstEvent = (world, type) => world.log.events.find((e) => e.type === type) || null;
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.quarters.repair',
  level: 'L1',
  laws: ['crew quarters set crew capacity', 'crew die per destroyed cell', 'repair field by surviving cells, with falloff'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'crew quarters (3 x 2 cells) at T1 with c in {6, 3, 1, 0} surviving cells (6 - c destroyed at t = 0); one target room (an empty hold) with one destroyed cell at r in {0, 0.5, 1, 2, 4} x repair.radius from the quarters; run until the cell is repaired (c = 0: 60 s)',
  measure: 'crew housed after the losses; deaths per destroyed quarters cell; repair rate in the first step; time to integrity 1',
  tolerance: 'counts exact; rate relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'housed crew = crewPerCell x c, deaths per destroyed cell = crewPerCell; repair rate = repair.rate x (c / 6) x g(r), g(r) = 1 / (1 + (r / radius)^2) (#99, as the shield); time to integrity 1 = 1 / rate one-sided; c = 0: no repair (#49, #51, #60, #181, #183)',
  tunable: ['quarters.crewPerCell', 'repair.rate', 'repair.radius'],
  locked: { date: '2026-10-21', hash: '2ad503bc' },
  cases() {
    const out = [];
    for (const c of [6, 3, 1, 0]) for (const x of [0, 0.5, 1, 2, 4]) out.push({ c, x });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, [w, h] = ROOMS.quarters.footprint.M, cells = w * h;
    const g = 1 / (1 + c.x ** ctx.fixed.repairFalloffExponent.value);
    const rate = p.repair.rate.value * (c.c / cells) * g;
    return { housed: p.quarters.crewPerCell.value * c.c, deathsPerCell: p.quarters.crewPerCell.value, lost: cells - c.c, rate, repaired: c.c > 0 ? 1 / rate : null, dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const q = addRoom(world, 'quarters', { id: 'quarters', position: [0, 0] });
    const target = addRoom(world, 'hold', { id: 'target', position: [c.x * ctx.params.repair.radius.value, 0] });
    destroyCell(world, target, 0, 'hit-target');
    for (let i = 0; i < q.cells.length - c.c; i++) destroyCell(world, q, i, `hit-q${i + 1}`);
    step(world);
    const rate = target.cells[0].integrity / ctx.dt;
    if (c.c > 0) while (!firstEvent(world, 'cell-repaired') && world.t < 10000) step(world);
    else runUntil(world, 60);
    const repaired = firstEvent(world, 'cell-repaired');
    const deaths = world.log.events.filter((e) => e.type === 'crew-died' && e.room === 'quarters').map((e) => e.deaths);
    return { housed: q.crew, deaths, rate, repaired: repaired ? repaired.t : null, integrity: target.cells[0].integrity, books: heatBooks(q.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c) {
    const checks = {
      housed: a.housed === e.housed, 'deaths per cell': a.deaths.length === e.lost && a.deaths.every((d) => d === e.deathsPerCell), rate: close(e.rate, a.rate, 1e-9),
      repaired: c.c > 0 ? oneSided(e.repaired, a.repaired, e.dt) && a.integrity === 1 : a.repaired === null && a.integrity === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `housed ${e.housed}, ${e.lost} cells lost x ${e.deathsPerCell} dead; rate ${e.rate.toExponential(6)} /s; repaired ${e.repaired === null ? 'never' : e.repaired.toFixed(4) + ' s'}`,
      actual: `housed ${a.housed}, deaths [${a.deaths.join(', ')}]; rate ${a.rate.toExponential(6)} /s; repaired ${a.repaired === null ? 'never' : a.repaired.toFixed(4) + ' s'}`,
    };
  },
};
