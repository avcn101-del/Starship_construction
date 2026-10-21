import { createWorld, addRoom, damageCell, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster: generated + conducted = radiated + stored in every room, 1e-9 relative.
const booksOk = (b) => {
  const c = b.conducted || 0;
  return Math.abs(b.generated + c - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(b.stored));
};
// Conduction only moves heat between rooms: the flows sum to 0 over the cluster (1e-9 of the heat moved).
const flowsOk = (books) => {
  const sum = books.reduce((x, b) => x + (b.conducted || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b.conducted || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction flows sum to 0 over the cluster, every case', ok: rows.every((r) => flowsOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

const LOSS = 0.7123; // integrity a hit takes from each damaged hold cell (chosen so no repair ends on a whole step)
const LIMIT = 200; // s
// Quarters Q1 at the origin, the hold at r1 x repair.radius from it; in 'overlap' a second quarters Q2 at
// r2 x radius from the hold on the far side. Rooms stand at positions in metres: the repair field needs no wall.
function layoutOf(ctx, c) {
  const radius = ctx.params.repair.radius.value, hold = [c.r1 * radius, 0];
  const quarters = [{ id: 'Q1', at: [0, 0], r: c.r1 * radius }];
  if (c.part === 'overlap') quarters.push({ id: 'Q2', at: [hold[0] + c.r2 * radius, 0], r: c.r2 * radius });
  return { hold, quarters, cells: c.part === 'two-cells' ? [0, 1] : [0] };
}
/**
 * The sharing rule of 13d.1 from data.js: a quarters' budget R = repair.rate x surviving fraction (all 6 cells
 * here); a damaged cell j asks q_j = R g(r_j), g(r) = 1 / (1 + (r / repair.radius)^2); if sum q_j > R each ask is
 * scaled by R / sum q_j; overlapping quarters add, each paying its own budget.
 */
function rates(ctx, c) {
  const p = ctx.params, L = layoutOf(ctx, c), R = p.repair.rate.value * (6 / 6), n = ctx.fixed.repairFalloffExponent.value;
  const g = (r) => 1 / (1 + (r / p.repair.radius.value) ** n);
  const pays = L.quarters.map((q) => {
    const ask = R * g(q.r), sum = ask * L.cells.length;
    return { id: q.id, perCell: sum > R ? (ask * R) / sum : ask, budget: R };
  });
  const perCell = pays.reduce((s, x) => s + x.perCell, 0);
  return { pays: pays.map((x) => ({ ...x, paid: x.perCell * L.cells.length })), perCell, time: LOSS / perCell, l1: c.part === 'one-cell' ? p.repair.rate.value * g(c.r1 * p.repair.radius.value) : null };
}

export default {
  id: 'L2.repair.shared',
  level: 'L2',
  laws: ['repair is a field with a finite budget', 'overlapping fields add, each paying its own budget'],
  dependsOn: ['L1.quarters.repair'],
  setup: 'in a cluster at T1, crew quarters (all 6 cells, powered) and an empty hold with two cells damaged by 0.7123 each at r in {0.25, 1} x repair.radius (centre to centre); one damaged cell alone at the same distances; two quarters overlapping on one damaged cell at 0.25 and 1 x radius; until repaired or 200 s',
  measure: 'each cell\'s repair rate in the first step; the time of each cell-repaired event; what each quarters pays in every step against its budget',
  tolerance: 'rates relative 1e-9; repair times one-sided (expected <= actual < expected + dt)',
  criterion: 'rates by the rule of 13d.1 in closed form: ask q_j = R g(r_j), scaled by R / sum q_j when the asks exceed R; time to repair = 0.7123 / rate, one-sided; one cell alone is repaired at L1\'s rate repair.rate x g(r); with two quarters the rate is the sum of what each pays; the sum of a quarters\' payments never exceeds R, in any step (#99, #185 (6), #193, #194)',
  tunable: ['repair.rate', 'repair.radius'],
  locked: null,
  cases() {
    const out = [];
    for (const r1 of [0.25, 1]) out.push({ part: 'two-cells', r1 });
    for (const r1 of [0.25, 1]) out.push({ part: 'one-cell', r1 });
    out.push({ part: 'overlap', r1: 0.25, r2: 1 });
    return out;
  },
  expected(ctx, c) {
    const x = rates(ctx, c);
    return { perCell: x.perCell, time: x.time, pays: x.pays, l1: x.l1, dt: ctx.dt };
  },
  run(ctx, c) {
    const L = layoutOf(ctx, c);
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const qs = L.quarters.map((q) => addRoom(world, 'quarters', { id: q.id, position: q.at }));
    const hold = addRoom(world, 'hold', { id: 'hold', position: L.hold });
    for (const k of L.cells) damageCell(world, hold, k, LOSS, `hit-${k}`, 'kinetic');
    const before = L.cells.map((k) => hold.cells[k].integrity);
    step(world);
    const firstRates = L.cells.map((k, i) => (hold.cells[k].integrity - before[i]) / ctx.dt);
    const firstPaid = qs.map((q) => q.quarters.paid);
    let withinBudget = qs.every((q) => q.quarters.paid <= q.quarters.budget * (1 + 1e-12));
    const N = Math.round(LIMIT / ctx.dt);
    const repaired = () => world.log.events.filter((e) => e.type === 'cell-repaired' && e.room === 'hold');
    while (world.step < N && repaired().length < L.cells.length) {
      step(world);
      withinBudget = withinBudget && qs.every((q) => q.quarters.paid <= q.quarters.budget * (1 + 1e-12));
    }
    return {
      firstRates, firstPaid, withinBudget, repairedAt: L.cells.map((k) => (repaired().find((e) => e.cell === k) || { t: null }).t),
      books: [...qs, hold].map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const checks = {
      'rate of each cell': a.firstRates.every((x) => close(e.perCell, x, 1e-9)),
      'what each quarters pays': e.pays.every((x, i) => close(x.paid, a.firstPaid[i], 1e-9)),
      'payments within budget every step': a.withinBudget === true,
      'repair time': a.repairedAt.every((t) => t !== null && oneSided(e.time, t, e.dt)),
      ...(e.l1 !== null ? { 'one cell alone = L1': close(e.l1, e.perCell, 1e-12) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `rate ${e.perCell.toExponential(6)} /s per cell; repaired at ${e.time.toFixed(4)} s; paid ${e.pays.map((x) => `${x.id} ${x.paid.toExponential(6)} of ${x.budget}`).join(', ')}`,
      actual: `rates ${a.firstRates.map((x) => x.toExponential(6)).join(', ')} /s; repaired at ${a.repairedAt.map((t) => (t === null ? 'never' : t.toFixed(4))).join(', ')} s; paid ${a.firstPaid.map((x) => x.toExponential(6)).join(', ')}; within budget ${a.withinBudget ? 'yes' : 'NO'}`,
    };
  },
};
