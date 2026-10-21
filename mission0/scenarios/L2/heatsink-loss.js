import { createWorld, addRoom, setDemand, destroyCell, runUntil, step, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
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
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + vented + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction and life-support flows each sum to 0 over the cluster, every case', ok: rows.every((r) => sumsToZero(r.actual.books, 'conducted') && sumsToZero(r.actual.books, 'pumped')) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
// Wall conductance by the rule of 13d.1 (#200, #201), from data.js only: a wall between two coolant rooms
// (ROOMS loop) is a coolant wall, conduction.wall x L x harmonic mean of the coolant factors; every other wall
// is passive, conduction.passive x L x harmonic mean of the passive factors. A factor names a PARAMS constant or is 1.
const hmean = (a, b) => (2 * a * b) / (a + b);
const factorOf = (ctx, name) => (name ? ctx.params[name.split('.')[0]][name.split('.')[1]].value : 1);
function wallG(ctx, typeA, typeB, length, edge = ctx.baseEdge) {
  const A = ROOMS[typeA], B = ROOMS[typeB];
  if (A.loop === 'coolant' && B.loop === 'coolant') return ctx.scaled(ctx.params.conduction.wall, edge) * length * hmean(factorOf(ctx, A.coolantFactor), factorOf(ctx, B.coolantFactor));
  return ctx.scaled(ctx.params.conduction.passive, edge) * length * hmean(factorOf(ctx, A.passiveFactor), factorOf(ctx, B.passiveFactor));
}
const cellsOf = (type, size = 'M') => ROOMS[type].footprint[size][0] * ROOMS[type].footprint[size][1];
/** Heat capacity (J/K) of a room of `type` with `cells` cells at `edge` (13c.1; the heat sink x capacityFactor, #198). */
const capacityOf = (ctx, type, cells = cellsOf(type), edge = ctx.baseEdge) => cells * ctx.scaled(ctx.params.thermal.heatCapacityPerCell, edge) * factorOf(ctx, ROOMS[type].capacityFactor);

const T_SINK = 600, LIMIT = 1000; // K; s after the reactor starts
// The sink sits at cell [2, 0], the reactor (added after the losses) at [0, 0]: the sink's local cells 0 and 2
// (column x = 2) form the 10 m wall, cells 1 and 3 the far column. Cells are lost far column first, one per
// second, so k = 1, 2 lose capacity only and k = 3 also halves the live wall; k = 4 leaves no sink.
const ORDER = [1, 3, 0, 2];
function setupOf(ctx, c) {
  const p = ctx.params, perCell = capacityOf(ctx, 'heatSink') / cellsOf('heatSink');
  const lost = new Set(ORDER.slice(0, c.k)), wallCells = [0, 2].filter((i) => !lost.has(i)).length;
  return {
    perCell, Cs: perCell * (cellsOf('heatSink') - c.k), Ca: capacityOf(ctx, 'reactor'), live: wallCells * ctx.baseEdge,
    G: wallG(ctx, 'reactor', 'heatSink', wallCells * ctx.baseEdge),
    d: p.beam.power.value / p.beambay.efficiency.value / p.reactor.power.value,
    S: (p.reactor.heatPerPower.value * p.beam.power.value) / p.beambay.efficiency.value,
    over: p.thermal.plantOverheated.value, rest: ctx.fixed.restTemperature.value,
  };
}
// Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js and 13d.1 only, from the
// reactor's start: reactor (290 K, constant source S) | coolant wall G over the live length | the damaged sink
// (C_s = surviving cells x per-cell capacity, at T_SINK); the overheat at the end of the step in which T >= overheated.
function reference(ctx, x) {
  const dt = ctx.dt, h = dt / 10;
  const deriv = (T) => { const q = x.Cs > 0 ? x.G * (T[0] - T[1]) : 0; return [(x.S - q) / x.Ca, x.Cs > 0 ? q / x.Cs : 0]; };
  let T = [x.rest, T_SINK];
  for (let n = 0; n < Math.round(LIMIT / dt); n++) {
    for (let s = 0; s < 10; s++) {
      const k1 = deriv(T), k2 = deriv(T.map((v, i) => v + (h / 2) * k1[i])), k3 = deriv(T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(T.map((v, i) => v + h * k3[i]));
      T = T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    if (T[0] >= x.over) return (n + 1) * dt;
  }
  return null;
}

export default {
  id: 'L2.heatsink.loss',
  level: 'L2',
  laws: ['a destroyed heat sink cell vents its heat to space', 'losing a cooling neighbour shortens the battle clock (dependency)'],
  dependsOn: ['L2.heatsink.buffer'],
  setup: 'in a cluster at T1, an M heat sink at 600 K alone on the grid; k in {0, 1, 2, 3, 4} of its cells destroyed, one per second at t = 1..k s (far column first: the 3rd loss also halves the wall to come); then at t = k + 1 s an M reactor at 290 K is placed beside it (2 cell pairs) delivering 12.5 MW (one M beam bay\'s draw, on demand, L1); no radiators; until the reactor overheats or 1000 s',
  measure: 'at each loss: the heat-vented event\'s energy, the sink\'s temperature, capacity and stored heat just before and after, its vented books; then the reactor\'s overheat time from its start',
  tolerance: 'vented energy, capacity and heat 1e-12 relative; temperature unchanged 1e-12 relative; overheat time 1e-3 relative',
  criterion: 'each destroyed cell vents exactly (C / n)(T - T_rest) to space (heat-vented event and vented books), T unchanged while a cell survives, C and Q each fall by one cell\'s share (C / n, Q / n); the heat books include the vented energy; the reactor\'s overheat time from its start matches the reference integrator (RK4 at dt / 10) within 1e-3 relative, and it is shorter for every additional cell lost (#198, DESIGN.md 13d.2 row 14)',
  tunable: ['heatsink.capacityFactor', 'heatsink.conductivityFactor', 'conduction.wall', 'thermal.heatCapacityPerCell', 'thermal.plantOverheated'],
  locked: { date: '2026-10-21', hash: '8f98a73b' },
  cases() {
    return [0, 1, 2, 3, 4].map((k) => ({ k }));
  },
  expected(ctx, c) {
    const x = setupOf(ctx, c);
    return { vented: x.perCell * (T_SINK - x.rest), perCell: x.perCell, heatPerCell: x.perCell * T_SINK, overheat: reference(ctx, x), live: x.live, d: x.d, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const x = setupOf(ctx, c);
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const sink = addRoom(world, 'heatSink', { id: 'sink', cell: [2, 0], temperature: T_SINK });
    const losses = [];
    for (let j = 1; j <= c.k; j++) {
      runUntil(world, j);
      const before = { T: roomTemperature(sink), C: sink.heat.C, Q: sink.heat.Q, vented: heatBooks(sink.heat).vented };
      const from = world.log.events.length;
      destroyCell(world, sink, ORDER[j - 1], `test:loss-${j}`);
      const ev = world.log.events.slice(from).find((e) => e.type === 'heat-vented');
      losses.push({ before, after: { T: roomTemperature(sink), C: sink.heat.C, Q: sink.heat.Q, vented: heatBooks(sink.heat).vented }, event: ev ? ev.energy : null, last: j === cellsOf('heatSink') });
    }
    runUntil(world, c.k + 1);
    const start = world.t;
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 0] });
    setDemand(world, reactor, x.d);
    let over = null;
    while (world.t < start + LIMIT && over === null) {
      step(world);
      const e = world.log.events.find((v) => v.room === 'reactor' && v.type === 'overheated');
      if (e) over = e.t - start;
    }
    return { losses, overheat: over, sinkT: roomTemperature(sink), books: [heatBooks(sink.heat), heatBooks(reactor.heat)], eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c) {
    const rel = (u, v) => Number.isFinite(u) && Number.isFinite(v) && Math.abs(u - v) <= 1e-12 * Math.max(Math.abs(u), Math.abs(v), 1);
    const checks = {
      'one loss per destroyed cell': a.losses.length === c.k,
      'vented (C / n)(T - T_rest), event and books': a.losses.every((l) => rel(l.event, e.vented) && rel(l.after.vented - l.before.vented, e.vented)),
      'T unchanged while a cell survives': a.losses.every((l) => l.last || rel(l.after.T, l.before.T)),
      'C and Q fall by one cell\'s share': a.losses.every((l) => rel(l.before.C - l.after.C, e.perCell) && rel(l.before.Q - l.after.Q, e.heatPerCell)),
      'reactor overheat time': e.overheat !== null && close(e.overheat, a.overheat, e.tolerance),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const t = [0, 1, 2, 3, 4].map((k) => rows.find((r) => r.case.k === k)).map((r) => (r ? r.actual.overheat : null));
    return [
      { name: 'the reactor overheats sooner for every additional cell lost (k = 0..4)', ok: t.every((v) => v !== null) && t.every((v, i) => i === 0 || v < t[i - 1]), detail: t.map((v) => (v === null ? 'never' : v.toFixed(3))).join(' > ') },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null ? 'never' : `${t.toFixed(3)} s`);
    return {
      expected: `each loss vents ${(e.vented / 1e6).toFixed(3)} MJ, C -${e.perCell.toExponential(3)} J/K, Q -${(e.heatPerCell / 1e6).toFixed(3)} MJ, T unchanged; reactor (wall ${e.live} m) overheats ${s(e.overheat)} after its start (reference)`,
      actual: `losses ${a.losses.map((l) => `${(l.event / 1e6).toFixed(3)} MJ (T ${l.before.T.toFixed(6)} -> ${l.after.T.toFixed(6)} K)`).join('; ') || 'none'}; reactor overheated ${s(a.overheat)} after its start; sink then ${a.sinkT.toFixed(3)} K`,
    };
  },
};
