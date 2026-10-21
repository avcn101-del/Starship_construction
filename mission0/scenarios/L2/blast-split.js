import { createWorld, addRoom, loadMagazine, detonateMagazine, destroyedCells } from '../../../js/rooms.js';
import { sharedWalls } from '../../../js/layout.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster (#200, #201): generated + conducted = radiated + vented + stored in every room, 1e-9
// relative; conducted is the net heat in through walls, life support's pumped heat included.
const booksOk = (b) => {
  const c = b.conducted || 0, v = b.vented || 0;
  return Math.abs(b.generated + c - b.radiated - v - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(v), Math.abs(b.stored));
};
// Conduction and life support only move heat between rooms: each sums to 0 over the cluster (1e-9 of the heat moved).
const sumsToZero = (books, key) => {
  const sum = books.reduce((x, b) => x + (b[key] || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b[key] || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + vented + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction and life-support flows each sum to 0 over the cluster, every case', ok: rows.every((r) => sumsToZero(r.actual.books, 'conducted') && sumsToZero(r.actual.books, 'pumped')) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// Geometry of 13e.3 D6 at T1: an M magazine (2 x 2) at (2, 2); an M hold 'H' at (4, 2) shares two cell pairs
// (10 m) with it; the second neighbour 'N' at (0, 3) shares one cell pair (5 m) with it ((1, 3) | (2, 3)); H and N
// do not touch. (i) N is a second M hold; (ii) N is an M bridge (4 cells, crew 4).
const NEIGHBOUR = { i: 'hold', ii: 'bridge' };
const WALLS = [['magazine', 'H', 2], ['magazine', 'N', 1]]; // cell pairs
// One round in the magazine: HE (charge + warhead, 8 MJ) or AP (charge, 6 MJ); (ii) with AP only.
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
function loadOf(ctx, c) {
  const p = ctx.params, m = p.kinetic.roundMass.value;
  return c.round === 'HE'
    ? { apMass: 0, heMass: m, E: p.kinetic.chargeEnergy.value + p.he.blastEnergy.value }
    : { apMass: m, heMass: 0, E: p.kinetic.chargeEnergy.value };
}
/**
 * The rule of 13d.1 on the scenario's own graph, from data.js only (never the kernel): the magazine fills to
 * B = cells x room.blastResistance; the excess goes to the unsaturated rooms sharing a wall with a saturated one,
 * split by wall length, each filling up to its B (x hold.blastFactor for a hold); repeated until nothing is left
 * or no room can take more.
 */
function wave(ctx, types, E) {
  const R = ctx.params.room.blastResistance.value, edge = ctx.baseEdge;
  const cap = Object.fromEntries(Object.entries(types).map(([id, type]) => [id, cellsOf(type) * R * (type === 'hold' ? ctx.params.hold.blastFactor.value : 1)]));
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
    for (const [a, b, pairs] of WALLS) for (const [x, y] of [[a, b], [b, a]]) if (full.has(x) && !full.has(y)) w[y] = (w[y] || 0) + pairs * edge;
    const ids = Object.keys(w).sort();
    if (!ids.length) break;
    const total = ids.reduce((s, id) => s + w[id], 0);
    let left = 0;
    for (const id of ids) left += take(id, (excess * w[id]) / total);
    excess = left;
  }
  return { cap, absorbed: got, escaped: excess, full: [...full].sort() };
}

export default {
  id: 'L2.blast.split',
  level: 'L2',
  laws: ['explosions spread through shared walls, split by wall length', 'energy conservation', 'crew die in proportion to integrity lost (blast included)'],
  dependsOn: ['L2.blast.walls', 'L1.kinetic.damage'],
  setup: 'in a cluster at T1, an M magazine at (2, 2) holding one M round, HE (8 MJ: 6 MJ charge + 2 MJ warhead) or AP (6 MJ), set off; an M hold at (4, 2) shares 10 m with it, and (i) a second M hold or (ii) an M bridge (crew 4) at (0, 3) shares 5 m with it; the two neighbours do not touch; (ii) with AP only (13e.3 D6, #212)',
  measure: 'blast energy absorbed by each room and escaped to space; the shared walls of the layout; each neighbour\'s cells destroyed and their integrity; crew deaths in the bridge; cell-damaged events',
  tolerance: 'energies and integrity 1e-12 relative; the 2 : 1 split 1e-12 relative; counts exact',
  criterion: 'the layout has exactly the walls magazine | hold 10 m and magazine | neighbour 5 m; the magazine fills to its capacity B = cells x room.blastResistance (2 MJ); the excess splits 2 : 1 by wall length with no neighbour saturated and nothing escaping, by the rule of 13d.1 computed in the scenario from data.js: (i) HE 4 / 2 MJ, AP 2.667 / 1.333 MJ; (ii) AP hold 2.667 MJ, bridge 1.333 MJ; absorbed + escaped = E exactly (1e-12); a neighbour keeps every cell, each at integrity 1 - absorbed / B (the bridge at 1/3); bridge crew deaths by the D-pass floor rule floor(crew x (cells - sum of integrity) / cells) = 2 of 4 (blast follows the D-pass crew rule, #212 (3)); one cell-damaged event per neighbour cell, channel blast, carrying that integrity (#169, #184, #193, #206, #212)',
  tunable: ['room.blastResistance', 'hold.blastFactor', 'kinetic.chargeEnergy', 'he.blastEnergy', 'kinetic.roundMass'],
  locked: { date: '2026-10-21', hash: '0a800e30' },
  cases() {
    return [{ neighbour: 'i', round: 'HE' }, { neighbour: 'i', round: 'AP' }, { neighbour: 'ii', round: 'AP' }];
  },
  expected(ctx, c) {
    const types = { magazine: 'magazine', H: 'hold', N: NEIGHBOUR[c.neighbour] }, { E } = loadOf(ctx, c), w = wave(ctx, types, E);
    const rooms = {};
    for (const id of ['H', 'N']) {
      const type = types[id], destroyed = w.full.includes(id) ? cellsOf(type) : 0, integrity = destroyed ? 0 : 1 - w.absorbed[id] / w.cap[id];
      const crew = type === 'bridge' ? ctx.params.crewRequired.bridge.value : 0;
      rooms[id] = { absorbed: w.absorbed[id], destroyed, integrity, crew, deaths: Math.floor((crew * (cellsOf(type) - cellsOf(type) * integrity)) / cellsOf(type)) };
    }
    return { E, absorbed: w.absorbed, escaped: w.escaped, full: w.full, capMagazine: w.cap.magazine, rooms, walls: WALLS.map(([a, b, pairs]) => [a, b, pairs * ctx.baseEdge]) };
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
    const out = {};
    for (const r of [H, N]) {
      const ev = world.log.events.filter((e) => e.room === r.id);
      out[r.id] = {
        destroyed: destroyedCells(r), integrity: r.cells.map((x) => x.integrity), crewAboard: r.crew,
        deaths: ev.filter((e) => e.type === 'crew-died').reduce((n, e) => n + e.deaths, 0),
        damaged: ev.filter((e) => e.type === 'cell-damaged').map((e) => ({ cell: e.cell, channel: e.channel, integrity: e.integrity })),
      };
    }
    return {
      walls, energy: ex ? ex.energy : null, absorbed: b ? b.absorbed : null, escaped: b ? b.escaped : null, blasts: world.blasts.length, rooms: out,
      books: [mag, H, N].map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const got = (id) => (a.absorbed && id in a.absorbed ? a.absorbed[id] : 0);
    const sum = a.absorbed ? Object.values(a.absorbed).reduce((x, y) => x + y, 0) : NaN;
    const checks = {
      'walls as specified (10 m and 5 m, neighbours apart)': a.walls.length === e.walls.length && e.walls.every(([x, y, L]) => a.walls.some(([p, q, M]) => ((p === x && q === y) || (p === y && q === x)) && M === L)),
      'one blast of energy E': a.blasts === 1 && a.energy !== null && close(e.E, a.energy, 1e-12),
      'magazine fills to its capacity': close(e.capMagazine, got('magazine'), 1e-12) && e.absorbed.magazine === e.capMagazine,
      'absorbed per room': !!a.absorbed && Object.keys(e.absorbed).every((id) => close(e.absorbed[id], got(id), 1e-12)),
      'split 2 : 1 by wall length': close(2, got('H') / got('N'), 1e-12),
      'no neighbour saturated, nothing escapes': e.full.length === 1 && e.escaped === 0 && a.escaped === 0,
      'absorbed + escaped = E': close(e.E, sum + a.escaped, 1e-12),
      'cells kept, integrity 1 - absorbed / B': Object.entries(e.rooms).every(([id, x]) => a.rooms[id].destroyed === 0 && a.rooms[id].integrity.every((v) => close(x.integrity, v, 1e-12))),
      'crew deaths by the D-pass floor rule': Object.entries(e.rooms).every(([id, x]) => a.rooms[id].deaths === x.deaths && a.rooms[id].crewAboard === x.crew - x.deaths),
      'cell-damaged per cell, channel blast, with its integrity': Object.entries(e.rooms).every(([id, x]) => {
        const d = a.rooms[id].damaged;
        return d.length === a.rooms[id].integrity.length && d.every((v, i) => v.cell === i && v.channel === 'blast' && close(x.integrity, v.integrity, 1e-12));
      }),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, MJ = (x) => (x / 1e6).toFixed(4);
    const list = (o) => Object.entries(o || {}).map(([k, v]) => `${k} ${MJ(v)}`).join(', ');
    return {
      expected: `E ${MJ(e.E)} MJ: absorbed ${list(e.absorbed)}, escaped ${MJ(e.escaped)}; integrity ${Object.entries(e.rooms).map(([k, x]) => `${k} ${x.integrity.toFixed(6)}`).join(', ')}; deaths ${Object.entries(e.rooms).map(([k, x]) => `${k} ${x.deaths}/${x.crew}`).join(', ')}`,
      actual: `E ${a.energy === null ? '-' : MJ(a.energy)} MJ: absorbed ${list(a.absorbed)}, escaped ${a.escaped === null ? '-' : MJ(a.escaped)}; integrity ${Object.entries(a.rooms).map(([k, x]) => `${k} ${x.integrity.map((v) => v.toFixed(6)).join('/')}`).join(', ')}; deaths ${Object.entries(a.rooms).map(([k, x]) => `${k} ${x.deaths}`).join(', ')}; walls ${a.walls.map(([p, q, L]) => `${p}|${q} ${L} m`).join(', ')}`,
    };
  },
};
