import { createWorld, addRoom, setDemand, destroyCell, step, runUntil, magazineCapacity, loadTurret } from '../../../js/rooms.js';
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

const FIRE_FOR = 10.25; // s of free fire (off the shot grid of both sizes: M every 2 s, L every 3 s)
// The size rule of 13d.1 (#185 (4), #187 (4)) from data.js: per-cell quantities scale with the cell count
// (L / M cells = 9 / 4), rate-like ones with the footprint (sizeLinear^2 = 9 / 4), per-round ones with the
// round (mass x sizeLinear^3, rate / sizeLinear, heat per shot x sizeLinear^3); crew rounded.
function rule(ctx, c) {
  const p = ctx.params, s = ctx.fixed.sizeLinear.value[c.size], fp = ROOMS[c.type].footprint, cells = fp[c.size][0] * fp[c.size][1];
  const ratio = cells / (fp.M[0] * fp.M[1]), area = s * s, C = cells * p.thermal.heatCapacityPerCell.value;
  if (c.type === 'reactor') return { cells, C, power: p.reactor.power.value * area, crew: Math.round(p.crewRequired.reactor.value * ratio), explosion: p.reactor.explosionEnergy.value * ratio };
  if (c.type === 'magazine') return { cells, C, capacity: p.magazine.capacity.value * ratio, ...(c.size === 'M' ? { crew: p.crewRequired.magazine.value } : {}) };
  if (c.type === 'turret') {
    const m = p.kinetic.roundMass.value * s ** 3, rate = p.turret.fireRate.value / s, shots = 1 + Math.floor(rate * FIRE_FOR);
    return { cells, C, crew: Math.round(p.crewRequired.turret.value * ratio), roundMass: m, shots, heatPerShot: p.turret.heatPerShot.value * s ** 3, draw: p.turret.powerDraw.value * area };
  }
  return { cells, C, crew: p.quarters.crewPerCell.value * cells }; // quarters: crew housed per cell
}

export default {
  id: 'L2.size.rule',
  level: 'L2',
  laws: ['the size rule: per-cell quantities by cell count, rates by footprint, per-round quantities by the round'],
  dependsOn: ['L1.reactor.breach', 'L1.magazine.cookoff', 'L1.turret.fire', 'L1.quarters.repair'],
  setup: 'in a cluster at T1, each room alone on the grid: an M and an L reactor at full demand, then every cell destroyed in one step; an M and an L magazine; an M and an L turret firing freely for 10.25 s with rounds to spare; M crew quarters (the L quarters has no footprint in ROOMS, a question in the pull request); the L magazine\'s crew (2 x 9/4 = 4.5) is a rounding tie and is not checked',
  measure: 'cells and heat capacity; the reactor\'s delivered power, crew and explosion energy; the magazine\'s capacity and crew; the turret\'s crew, round mass (impulse / shot / muzzle velocity), shots by 10.25 s, heat per shot and draw',
  tolerance: 'relative 1e-9; counts exact',
  criterion: 'the scaled quantities of 13d.1 exactly: heat capacity = cells x thermal.heatCapacityPerCell; L reactor power 9/4 of M and explosion energy 9/4 of M (450 MJ); L magazine capacity 9/4 of M; L turret round mass (3/2)^3 of M at 2/3 the rate (shots = 1 + floor(rate t)), heat per shot (3/2)^3 of M, draw 9/4 of M; crew 9/4 of M rounded (reactor 9, turret 7); quarters crew = crewPerCell x cells (#185 (4), (5), #187 (4), #193, #194)',
  tunable: ['reactor.power', 'reactor.explosionEnergy', 'magazine.capacity', 'kinetic.roundMass', 'turret.fireRate', 'turret.heatPerShot', 'turret.powerDraw', 'thermal.heatCapacityPerCell'],
  locked: null,
  cases() {
    const out = [];
    for (const type of ['reactor', 'magazine', 'turret']) for (const size of ['M', 'L']) out.push({ type, size });
    out.push({ type: 'quarters', size: 'M' });
    return out;
  },
  expected(ctx, c) {
    return rule(ctx, c);
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const room = addRoom(world, c.type, { id: c.type, size: c.size, cell: [0, 0] });
    const out = { cells: room.cells.length, C: room.heat.C, crew: room.crewTotal };
    if (c.type === 'reactor') {
      setDemand(world, room, 1);
      step(world);
      out.power = room.reactor.delivered;
      room.cells.forEach((_, k) => destroyCell(world, room, k, `hit-${k + 1}`));
      const ex = world.log.events.filter((e) => e.type === 'explosion');
      out.explosion = ex.length === 1 ? ex[0].energy : null;
    }
    if (c.type === 'magazine') out.capacity = magazineCapacity(world, room);
    if (c.type === 'turret') {
      loadTurret(room, 1000);
      runUntil(world, FIRE_FOR);
      const t = room.turret, v = ctx.params.kinetic.muzzleVelocity.value;
      Object.assign(out, { shots: t.shots, roundMass: t.impulse / t.shots / v, heatPerShot: room.heat.generated / t.shots, draw: t.energyDrawn / world.t });
    }
    return { ...out, books: [heatBooks(room.heat)], eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const keys = Object.keys(e);
    const counts = ['cells', 'crew', 'shots'];
    const checks = Object.fromEntries(keys.map((k) => [k, counts.includes(k) ? a[k] === e[k] : close(e[k], a[k], 1e-9)]));
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const get = (type, size) => rows.find((r) => r.case.type === type && r.case.size === size).actual;
    return [
      { name: 'L reactor explosion = 9/4 x M (450 MJ at the default)', ok: close((9 / 4) * get('reactor', 'M').explosion, get('reactor', 'L').explosion, 1e-9) },
      { name: 'L magazine capacity = 9/4 x M', ok: close((9 / 4) * get('magazine', 'M').capacity, get('magazine', 'L').capacity, 1e-9) },
      { name: 'L turret round mass = (3/2)^3 x M', ok: close(1.5 ** 3 * get('turret', 'M').roundMass, get('turret', 'L').roundMass, 1e-9) },
      ...common(rows),
    ];
  },
  display(r) {
    const f = (o) => Object.entries(o).filter(([k]) => !['books', 'eventsOk'].includes(k)).map(([k, v]) => `${k} ${typeof v === 'number' && !Number.isInteger(v) ? v.toPrecision(8) : v}`).join(', ');
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
