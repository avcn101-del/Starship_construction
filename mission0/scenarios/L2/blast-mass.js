import { createWorld, addRoom, loadMagazine, detonateMagazine, destroyedCells } from '../../../js/rooms.js';
import { sharedWalls } from '../../../js/layout.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// S2 of physics pass 2 (DESIGN.md 13k.4): blast by mass (13k.1, #240 (6), F3). The geometry of L2.blast.split (13e.3
// D6) at T1: an M magazine (2 x 2) at (2, 2); an M hold 'H' at (4, 2) shares two cell pairs (10 m) with it; the
// second neighbour 'N' at (0, 3) shares one cell pair (5 m); H and N do not touch. N is (i) a second M hold or
// (ii) an M reactor (switched off, demand 0).
const NEIGHBOUR = { hold: 'hold', reactor: 'reactor' };
const WALLS = [['magazine', 'H', 2], ['magazine', 'N', 1]]; // cell pairs
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
// The cell mass of each type here, written out (13i.2, 13k.2): the hold and the magazine are structure only.
const MASS = { hold: 'structure', magazine: 'structure', reactor: 'reactor' };
const massOf = (ctx, type) => (MASS[type] === 'structure' ? ctx.params.structure.cellMass.value : ctx.params.cellMass.reactor.value);
// The magazine's load: 1 AP round (6 MJ: the charge) or 1 HE + 2 AP rounds (20 MJ: 3 charges + 1 warhead).
function loadOf(ctx, c) {
  const p = ctx.params, m = p.kinetic.roundMass.value, ch = p.kinetic.chargeEnergy.value, he = p.he.blastEnergy.value;
  return c.load === '6 MJ' ? { apMass: m, heMass: 0, E: ch } : { apMass: 2 * m, heMass: m, E: 3 * ch + he };
}
/**
 * Re-statement of the rule of 13d.1 with 13k.1's capacities, on the scenario's own graph: each room absorbs up to
 * B = surviving cells x matter.blastPerKg x its cell mass; the magazine fills first; the excess goes to the
 * unsaturated rooms sharing a wall with a saturated one, split by wall length; repeated until nothing is left or no
 * room can take more (the rest escapes).
 */
function wave(ctx, types, E) {
  const qb = ctx.params.matter.blastPerKg.value, L = ctx.baseEdge;
  const cap = Object.fromEntries(Object.entries(types).map(([id, type]) => [id, cellsOf(type) * qb * massOf(ctx, type)]));
  const got = Object.fromEntries(Object.keys(types).map((id) => [id, 0])), full = new Set();
  const take = (id, e) => {
    const room = cap[id] - got[id];
    if (e >= room) { got[id] = cap[id]; full.add(id); return e - room; }
    got[id] += e;
    return 0;
  };
  let excess = take('magazine', E);
  while (excess > 0) {
    const w = {};
    for (const [a, b, pairs] of WALLS) for (const [x, y] of [[a, b], [b, a]]) if (full.has(x) && !full.has(y)) w[y] = (w[y] || 0) + pairs * L;
    const ids = Object.keys(w).sort();
    if (!ids.length) break;
    const total = ids.reduce((s, id) => s + w[id], 0);
    let left = 0;
    for (const id of ids) left += take(id, (excess * w[id]) / total);
    excess = left;
  }
  return { cap, absorbed: got, escaped: excess, full: [...full] };
}
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.blast.mass',
  level: 'L2',
  laws: ['blast capacity follows the cell\'s mass: B = cells x matter.blastPerKg x cell mass (#240 (6), 13k.1)', 'explosions spread through shared walls, split by wall length', 'energy conservation'],
  dependsOn: ['L2.blast.walls.v2'],
  setup: 'in a cluster at T1, an M magazine at (2, 2) set off holding 1 M AP round (6 MJ) or 1 M HE and 2 M AP rounds (20 MJ); an M hold at (4, 2) shares 10 m with it and a neighbour at (0, 3) shares 5 m: (i) a second M hold, (ii) an M reactor (switched off); the neighbours do not touch (13k.4 S2)',
  measure: 'the blast\'s energy, what each room absorbed and what escaped to space; each room\'s cells destroyed and the integrity of the others; the heat books',
  tolerance: 'energies and integrity 1e-12 relative (a closed form against the kernel\'s fill, 13k.4 conventions); counts exact',
  criterion: 're-statement: absorbed per room by the scenario\'s own fill of 13d.1 with B = cells x matter.blastPerKg x cell mass (13k.1), 1e-12; absorbed + escaped = E within 1e-12; no cell absorbs more than matter.blastPerKg x its mass (each room\'s absorbed / its cells <= q_b m); a saturated room loses every cell, an unsaturated one keeps them at 1 - absorbed / B. Hand-worked literals at T1: magazine and hold B = 4 x 100 x 3000 = 1.2 MJ, reactor B = 4 x 100 x 150 000 = 60 MJ; 6 MJ with a reactor neighbour: the magazine takes 1.2 MJ, the 4.8 MJ excess splits 2 : 1, the hold saturates at 1.2 MJ and passes 2.0 MJ on to the reactor, which holds 1.6 + 2.0 = 3.6 MJ; nothing escapes (#169, #240 (6), #243)',
  tunable: ['matter.blastPerKg', 'structure.cellMass', 'cellMass.reactor', 'kinetic.chargeEnergy', 'he.blastEnergy', 'kinetic.roundMass'],
  locked: null,
  cases() {
    const out = [];
    for (const neighbour of Object.keys(NEIGHBOUR)) for (const load of ['6 MJ', '20 MJ']) out.push({ neighbour, load });
    return out;
  },
  expected(ctx, c) {
    const types = { magazine: 'magazine', H: 'hold', N: NEIGHBOUR[c.neighbour] }, { E } = loadOf(ctx, c), w = wave(ctx, types, E);
    const rooms = {};
    for (const id of ['H', 'N']) {
      const type = types[id], destroyed = w.full.includes(id) ? cellsOf(type) : 0;
      rooms[id] = { destroyed, integrity: destroyed ? 0 : 1 - w.absorbed[id] / w.cap[id], perCellCap: ctx.params.matter.blastPerKg.value * massOf(ctx, type), cells: cellsOf(type) };
    }
    const literal = c.neighbour === 'reactor' && c.load === '6 MJ' ? { magazine: 1.2e6, H: 1.2e6, N: 3.6e6, escaped: 0 } : null;
    return { E, absorbed: w.absorbed, escaped: w.escaped, rooms, literal };
  },
  run(ctx, c) {
    const { apMass, heMass } = loadOf(ctx, c);
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 2] });
    const H = addRoom(world, 'hold', { id: 'H', cell: [4, 2] });
    const N = addRoom(world, NEIGHBOUR[c.neighbour], { id: 'N', cell: [0, 3] });
    const walls = sharedWalls(world.layout).map((w) => [w.a, w.b, w.length]);
    loadMagazine(world, mag, { size: 'M', apMass, heMass });
    detonateMagazine(world, mag, 'detonation');
    const b = world.blasts[0] || null, ex = world.log.events.find((e) => e.type === 'explosion' && e.room === 'magazine');
    const rooms = {};
    for (const r of [H, N]) rooms[r.id] = { destroyed: destroyedCells(r), integrity: r.cells.map((x) => x.integrity) };
    return { walls, energy: ex ? ex.energy : null, absorbed: b ? b.absorbed : null, escaped: b ? b.escaped : null, blasts: world.blasts.length, rooms, books: [mag, H, N].map((r) => heatBooks(r.heat)) };
  },
  compare(e, a) {
    const got = (id) => (a.absorbed && id in a.absorbed ? a.absorbed[id] : 0);
    const sum = a.absorbed ? Object.values(a.absorbed).reduce((x, y) => x + y, 0) : NaN;
    const eq = (x, y) => (x === 0 ? y === 0 : close(x, y, 1e-12));
    const checks = {
      'walls 10 m and 5 m': a.walls.length === 2 && WALLS.every(([x, y, pairs]) => a.walls.some(([p, q, L]) => ((p === x && q === y) || (p === y && q === x)) && L === pairs * 5)),
      'one blast of energy E': a.blasts === 1 && a.energy !== null && close(e.E, a.energy, 1e-12),
      'absorbed per room (own fill)': !!a.absorbed && Object.keys(e.absorbed).every((id) => eq(e.absorbed[id], got(id))),
      'escaped': a.escaped !== null && eq(e.escaped, a.escaped),
      'absorbed + escaped = E': close(e.E, sum + a.escaped, 1e-12),
      'no cell above q_b m': Object.entries(e.rooms).every(([id, x]) => got(id) / x.cells <= x.perCellCap * (1 + 1e-12)),
      'cells destroyed and integrity': Object.entries(e.rooms).every(([id, x]) => a.rooms[id].destroyed === x.destroyed && (x.destroyed > 0 || a.rooms[id].integrity.every((v) => close(x.integrity, v, 1e-12)))),
      ...(e.literal ? { 'hand-worked literal: magazine 1.2, hold 1.2, reactor 3.6 MJ, nothing escapes': ['magazine', 'H', 'N'].every((id) => close(e.literal[id], got(id), 1e-12)) && a.escaped === 0 } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const booksOk = (b) => Math.abs(b.generated + (b.conducted || 0) - b.radiated - (b.vented || 0) - b.stored) <= Math.max(1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored)), 1e-10 * Math.abs(b.initial));
    return [{ name: 'consistency invariant (not counted for E3): heat books of every room', ok: rows.every((r) => r.actual.books.every(booksOk)) }];
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(6);
    const f = (abs) => (abs ? Object.entries(abs).map(([id, x]) => `${id} ${mj(x)}`).join(', ') : 'none');
    return { expected: `E ${mj(r.expected.E)} MJ; ${f(r.expected.absorbed)}; escaped ${mj(r.expected.escaped)} MJ`, actual: `${f(r.actual.absorbed)}; escaped ${r.actual.escaped === null ? '-' : mj(r.actual.escaped)} MJ; destroyed H ${r.actual.rooms.H.destroyed}, N ${r.actual.rooms.N.destroyed}` };
  },
};
