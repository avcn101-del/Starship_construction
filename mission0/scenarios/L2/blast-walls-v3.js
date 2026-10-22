import { createWorld, addRoom, loadMagazine, detonateMagazine, destroyedCells } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

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

// Geometries of 13d.2 row 7 at T1: M magazine 'magazine' and M bridges (ordinary rooms, crew 4 in 4 cells),
// every wall 2 cell pairs (10 m). (a) the magazine at the end of a row of three; (b) the same with an
// empty hold beside the magazine; (c) the magazine between two identical rooms.
const GEOMETRY = {
  row: { rooms: [['magazine', 'magazine', [0, 0]], ['B1', 'bridge', [2, 0]], ['B2', 'bridge', [4, 0]], ['B3', 'bridge', [6, 0]]], walls: [['magazine', 'B1'], ['B1', 'B2'], ['B2', 'B3']] },
  'row-hold': { rooms: [['magazine', 'magazine', [0, 0]], ['B1', 'bridge', [2, 0]], ['B2', 'bridge', [4, 0]], ['B3', 'bridge', [6, 0]], ['H', 'hold', [0, 2]]], walls: [['magazine', 'B1'], ['B1', 'B2'], ['B2', 'B3'], ['magazine', 'H']] },
  middle: { rooms: [['B1', 'bridge', [0, 0]], ['magazine', 'magazine', [2, 0]], ['B2', 'bridge', [4, 0]]], walls: [['B1', 'magazine'], ['magazine', 'B2']] },
};
// Loads: the two of 13d.2 (full HE, half full of AP) and two small HE loads (2 and 4 rounds, 5 and 10 MJ)
// that stay below the cluster's capacity, so the split by wall length is exercised before saturation.
const LOADS = { 'full-HE': { he: 1 }, 'half-AP': { ap: 0.5 }, 'HE-2': { heRounds: 2 }, 'HE-4': { heRounds: 4 } };
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
function loadOf(ctx, c) {
  const p = ctx.params, l = LOADS[c.load], m = p.kinetic.roundMass.value, cap = p.magazine.capacity.value;
  const apMass = (l.ap || 0) * cap, heMass = l.heRounds ? l.heRounds * m : (l.he || 0) * cap;
  const ap = Math.floor(apMass / m), he = Math.floor(heMass / m);
  return { apMass, heMass, E: ap * p.kinetic.chargeEnergy.value + he * (p.kinetic.chargeEnergy.value + p.he.blastEnergy.value) };
}
/**
 * The rule of 13d.1 on the scenario's own graph: the exploding room fills to B = cells x matter.blastPerKg x its
 * cell mass (#240 (6)); the excess goes to the unsaturated rooms sharing a wall with a saturated
 * one, split by wall length, each filling up to its B; repeated until nothing is left or no room can take more.
 */
function wave(ctx, g, E) {
  const qb = ctx.params.matter.blastPerKg.value, L = 2 * ctx.baseEdge;
  const cap = Object.fromEntries(g.rooms.map(([id, type]) => [id, cellsOf(type) * qb * massOf(ctx, type)]));
  const got = Object.fromEntries(g.rooms.map(([id]) => [id, 0])), full = new Set();
  const take = (id, e) => {
    const room = cap[id] - got[id];
    if (e >= room) { got[id] = cap[id]; full.add(id); return e - room; }
    got[id] += e;
    return 0;
  };
  let excess = take('magazine', E);
  while (excess > 0) {
    const w = {};
    for (const [a, b] of g.walls) for (const [x, y] of [[a, b], [b, a]]) if (full.has(x) && !full.has(y)) w[y] = (w[y] || 0) + L;
    const ids = Object.keys(w).sort();
    if (!ids.length) break;
    const total = ids.reduce((s, id) => s + w[id], 0);
    let left = 0;
    for (const id of ids) left += take(id, (excess * w[id]) / total);
    excess = left;
  }
  return { cap, absorbed: got, escaped: excess, full: [...full] };
}

// A room type's cell mass (DESIGN.md 13i.2, 13k.2), written out here, not read from ROOMS: the hold, magazine and
// heat sink are structure only (a heat sink cell adds the water of its extra heat capacity), the engine and the beam
// bay structure + machinery, each constant at its own exponent (#243).
const MASS = { bridge: ['cellMass.crewed'], quarters: ['cellMass.crewed'], turret: ['cellMass.crewed'], missileBay: ['cellMass.crewed'], reactor: ['cellMass.reactor'], shieldGenerator: ['cellMass.shieldGenerator'], railgun: ['cellMass.railgun'], engine: ['structure.cellMass', 'engine.machineryMass'], beamBay: ['structure.cellMass', 'beambay.machineryMass'], hold: ['structure.cellMass'], magazine: ['structure.cellMass'], heatSink: ['structure.cellMass'] };
function massOf(ctx, type, edge = ctx.baseEdge) {
  const p = ctx.params, at = (path) => { const [g, n] = path.split('.'); return ctx.scaled(p[g][n], edge); };
  const m = MASS[type].reduce((x, path) => x + at(path), 0);
  return type === 'heatSink' ? m + ((p.heatsink.capacityFactor.value - 1) * ctx.scaled(p.thermal.coupledHeatSink, edge)) / ctx.fixed.waterSpecificHeat.value : m;
}

// Crew deaths by the D-pass rule (#206, #212 (3)): floor(crew x (cells - sum of integrity) / cells), a quotient within
// 1e-9 of a whole number counting as that number; blast lowers every cell of a room by absorbed / B.
const deathsOf = (crew, N, lost) => { const share = (crew * lost) / N, whole = Math.round(share); return Math.min(crew, Math.abs(share - whole) <= 1e-9 * Math.max(1, share) ? whole : Math.floor(share)); };

export default {
  id: 'L2.blast.walls.v3',
  level: 'L2',
  laws: ['explosions spread through shared walls', 'an empty hold absorbs blast', 'energy conservation', 'crew die per destroyed cell'],
  dependsOn: ['L0.blast.surface.v2', 'L1.magazine.cookoff'],
  setup: 'in a cluster at T1, an M magazine set off (full of M HE rounds; half full of M AP; and 2 and 4 M HE rounds, 5 and 10 MJ, below the cluster\'s capacity) in (a) a row with three M bridges, (b) the same with an M empty hold beside the magazine, (c) between two M bridges; every wall 10 m',
  measure: 'blast energy absorbed by each room and escaped to space; cells destroyed, their integrity and crew deaths in each room',
  tolerance: 'energies 1e-12 relative; counts exact',
  criterion: 'absorbed per room by the rule of 13d.1 (fill own capacity B = surviving cells x matter.blastPerKg x its cell mass; pass the excess on by shared wall length as a wave front), computed in the scenario for these geometries; absorbed + escaped = E (1e-12); absorbed = min(E, sum B) and escaped = max(0, E - sum B) when every room is reached; equal shares in (c); a saturated hold absorbs (its cell mass / a bridge cell\'s mass) times a saturated bridge; a room that fills its capacity loses every cell, one that does not keeps them at integrity 1 - absorbed / B; crew die in proportion to the integrity lost (the D-pass rule), floor(crew x (cells - sum of integrity) / cells) (#141, #169, #184, #193, #194) Successor of L2.blast.walls (#240, #243, 13k.4 S16): capacity B = cells x matter.blastPerKg x the room type\'s cell mass (13k.1) in place of room.blastResistance and hold.blastFactor (removed, #240 (6)): an M bridge takes 5.92 MJ, a hold or the magazine 1.2 MJ; the hold\'s factor becomes its mass ratio to a bridge (0.203); everything else is computed by the same rule. Successor of L2.blast.walls.v2 (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): crew deaths by the D-pass rule floor(crew x (cells - sum of integrity) / cells) (#206, #212 (3)) in place of floor(k crew / N) for k destroyed cells, which the kernel has not used since the D pass: with blast by mass a bridge is now partly damaged by a 16 MJ blast (B3 at integrity 0.5 loses 2 of 4 crew); nothing else changes.',
  tunable: ['matter.blastPerKg', 'structure.cellMass', 'cellMass.crewed', 'kinetic.chargeEnergy', 'he.blastEnergy', 'magazine.capacity'],
  locked: { date: '2026-10-22', hash: 'b105d295' },
  cases() {
    const out = [];
    for (const geometry of Object.keys(GEOMETRY)) for (const load of Object.keys(LOADS)) out.push({ geometry, load });
    return out;
  },
  expected(ctx, c) {
    const g = GEOMETRY[c.geometry], { E } = loadOf(ctx, c), w = wave(ctx, g, E);
    const sumB = Object.values(w.cap).reduce((x, y) => x + y, 0), reachedAll = Object.values(w.absorbed).every((x) => x > 0);
    const crew = ctx.params.crewRequired.bridge.value, N = cellsOf('bridge');
    const rooms = {};
    for (const [id, type] of g.rooms) {
      if (id === 'magazine') continue;
      const destroyed = w.full.includes(id) ? cellsOf(type) : 0;
      rooms[id] = { absorbed: w.absorbed[id], destroyed, integrity: destroyed ? 0 : 1 - w.absorbed[id] / w.cap[id], deaths: type === 'bridge' ? deathsOf(crew, N, destroyed ? N : (N * w.absorbed[id]) / w.cap[id]) : 0 };
    }
    return { E, absorbed: w.absorbed, escaped: w.escaped, sumB, reachedAll, full: w.full, rooms, factor: massOf(ctx, 'hold') / massOf(ctx, 'bridge') };
  },
  run(ctx, c) {
    const g = GEOMETRY[c.geometry], { apMass, heMass } = loadOf(ctx, c);
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const rooms = g.rooms.map(([id, type, cell]) => addRoom(world, type, { id, cell }));
    const mag = rooms.find((r) => r.id === 'magazine');
    loadMagazine(world, mag, { size: 'M', apMass, heMass });
    detonateMagazine(world, mag, 'detonation');
    const b = world.blasts[0] || null, ex = world.log.events.find((e) => e.type === 'explosion' && e.room === 'magazine');
    const out = {};
    for (const r of rooms) {
      if (r.id === 'magazine') continue;
      const deaths = world.log.events.filter((e) => e.type === 'crew-died' && e.room === r.id).reduce((n, e) => n + e.deaths, 0);
      out[r.id] = { destroyed: destroyedCells(r), integrity: r.cells.map((x) => x.integrity), deaths };
    }
    return {
      energy: ex ? ex.energy : null, absorbed: b ? b.absorbed : null, escaped: b ? b.escaped : null, blasts: world.blasts.length, rooms: out,
      books: rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const ids = Object.keys(e.absorbed);
    const got = (id) => (a.absorbed && id in a.absorbed ? a.absorbed[id] : 0);
    const sum = a.absorbed ? Object.values(a.absorbed).reduce((x, y) => x + y, 0) : NaN;
    const eq = (x, y) => (x === 0 ? y === 0 : close(x, y, 1e-12));
    const checks = {
      'one blast of energy E': a.blasts === 1 && a.energy !== null && close(e.E, a.energy, 1e-12),
      'absorbed per room': !!a.absorbed && ids.every((id) => eq(e.absorbed[id], got(id))),
      'escaped': a.escaped !== null && eq(e.escaped, a.escaped),
      'absorbed + escaped = E': close(e.E, sum + a.escaped, 1e-12),
      ...(e.reachedAll ? { 'min(E, sum B) and max(0, E - sum B)': close(Math.min(e.E, e.sumB), sum, 1e-12) && eq(Math.max(0, e.E - e.sumB), a.escaped) } : {}),
      ...(c.geometry === 'middle' ? { 'equal shares': eq(got('B1'), got('B2')) } : {}),
      ...(e.full.includes('H') && e.full.includes('B1') ? { 'a saturated hold absorbs its cell mass / a bridge cell\'s mass x a saturated bridge': close(e.factor * got('B1'), got('H'), 1e-12) } : {}),
      'cells destroyed per room': Object.entries(e.rooms).every(([id, x]) => a.rooms[id].destroyed === x.destroyed),
      'integrity of cells kept': Object.entries(e.rooms).every(([id, x]) => x.destroyed > 0 || a.rooms[id].integrity.every((v) => close(x.integrity, v, 1e-12))),
      'crew deaths per destroyed cell': Object.entries(e.rooms).every(([id, x]) => a.rooms[id].deaths === x.deaths),
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
      expected: `E ${MJ(e.E)} MJ: absorbed ${list(e.absorbed)}, escaped ${MJ(e.escaped)} (sum B ${MJ(e.sumB)}); destroyed ${Object.entries(e.rooms).map(([k, x]) => `${k} ${x.destroyed}`).join(', ')}; deaths ${Object.entries(e.rooms).map(([k, x]) => `${k} ${x.deaths}`).join(', ')}`,
      actual: `E ${a.energy === null ? '-' : MJ(a.energy)} MJ: absorbed ${list(a.absorbed)}, escaped ${a.escaped === null ? '-' : MJ(a.escaped)}; destroyed ${Object.entries(a.rooms).map(([k, x]) => `${k} ${x.destroyed}`).join(', ')}; deaths ${Object.entries(a.rooms).map(([k, x]) => `${k} ${x.deaths}`).join(', ')}`,
    };
  },
};
