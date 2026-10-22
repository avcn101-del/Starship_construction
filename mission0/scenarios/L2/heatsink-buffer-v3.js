import { createWorld, addRoom, setActive, setDemand, step, roomTemperature } from '../../../js/rooms.js';
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
const capacityOf = (ctx, type, cells = cellsOf(type), edge = ctx.baseEdge) => cells * ctx.scaled(ctx.params.thermal[COUPLED[type]], edge) * factorOf(ctx, ROOMS[type].capacityFactor); // the room type's coupled heat capacity (#240 (1))

const LIMIT = 20000; // s
// An M reactor feeding one M beam bay: demand = the beam bay's draw / the reactor's power (both k = 2, so the
// same at every tier); its heat S = heatPerPower x that draw (L1).
function setupOf(ctx, c) {
  const p = ctx.params, edge = ctx.tiers[c.tier].edge;
  const draw = ctx.scaled(p.beam.power, edge) / p.beambay.efficiency.value, d = draw / ctx.scaled(p.reactor.power, edge);
  return {
    edge, d, S: p.reactor.heatPerPower.value * d * ctx.scaled(p.reactor.power, edge),
    Ca: capacityOf(ctx, 'reactor', cellsOf('reactor'), edge), Cb: capacityOf(ctx, c.neighbour, cellsOf(c.neighbour), edge),
    G: wallG(ctx, 'reactor', c.neighbour, 2 * edge, edge), over: p.thermal.plantOverheated.value, rest: ctx.fixed.restTemperature.value,
  };
}
// Two rooms, constant source S in the reactor (closed form): 1/tau_w = G (1/C_a + 1/C_b),
// Delta(t) = (S tau_w / C_a)(1 - exp(-t / tau_w)), T_a = ((C_a + C_b) T0 + S t + C_b Delta) / (C_a + C_b).
function overheatTime(x) {
  const tw = 1 / (x.G * (1 / x.Ca + 1 / x.Cb)), Ct = x.Ca + x.Cb;
  const Ta = (t) => (Ct * x.rest + x.S * t + x.Cb * ((x.S * tw) / x.Ca) * (1 - Math.exp(-t / tw))) / Ct;
  if (Ta(LIMIT) < x.over) return null;
  let lo = 0, hi = LIMIT;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (Ta(mid) >= x.over) hi = mid; else lo = mid; }
  return hi;
}

// The thermally coupled heat capacity per cell of each room type (#240 (1), DESIGN.md 13k.2), written out here, not read from ROOMS.
const COUPLED = { bridge: 'coupledCrewed', quarters: 'coupledCrewed', turret: 'coupledCrewed', missileBay: 'coupledCrewed', reactor: 'coupledReactor', engine: 'coupledEngine', beamBay: 'coupledBeamBay', shieldGenerator: 'coupledShieldGenerator', magazine: 'coupledMagazine', hold: 'coupledHold', heatSink: 'coupledHeatSink', railgun: 'coupledRailgun' };

export default {
  id: 'L2.heatsink.buffer.v3',
  level: 'L2',
  laws: ['a heat sink stores heat and buys time', 'heat moves fast along the coolant loop'],
  dependsOn: ['L2.heat.pair.v2', 'L1.reactor.power'],
  setup: 'in a cluster, an M reactor delivering 12.5 MW (demand = one M beam bay\'s draw / its power, on demand, L1) beside (a) an idle M beam bay (switched off: an ordinary coolant room) or (b) an M heat sink, sharing a coolant wall of 2 cell pairs (10 m at T1, 20 m at T3), no radiators; at T1 and T3; until the reactor overheats',
  measure: 'the time of the reactor\'s first overheated event',
  tolerance: '1e-3 relative',
  criterion: 'the two-room linear solution with a constant source (13d.1 coolant wall; the heat sink with heatsink.capacityFactor x the heat capacity and heatsink.conductivityFactor as its coolant factor) gives the reactor\'s overheat time as a root of the closed form, within 1e-3 relative; at each tier (b) overheats later than (a) (#198, #201, DESIGN.md 13d.2 row 13) Successor of L2.heatsink.buffer (#240, #243, 13k.4 S16): C = cells x the room type\'s thermally coupled heat capacity per cell (13k.2; a heat sink x heatsink.capacityFactor as before) in place of thermal.heatCapacityPerCell; every expected value is the same rule computed in the scenario. Successor of L2.heatsink.buffer.v2 (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the closed form\'s and the run\'s horizon rises from 2000 s to 20 000 s: with no radiator the reactor always overheats, but with the coupled heat capacities not within 2000 s at T3; nothing else changes.',
  tunable: ['heatsink.capacityFactor', 'heatsink.conductivityFactor', 'conduction.wall', 'thermal.coupledReactor', 'thermal.coupledBeamBay', 'thermal.coupledEngine', 'thermal.coupledShieldGenerator', 'thermal.coupledCrewed', 'thermal.coupledMagazine', 'thermal.coupledHold', 'thermal.coupledHeatSink', 'thermal.plantOverheated', 'reactor.heatPerPower'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const neighbour of ['beamBay', 'heatSink']) out.push({ tier, neighbour });
    return out;
  },
  expected(ctx, c) {
    const x = setupOf(ctx, c);
    return { overheat: overheatTime(x), d: x.d, S: x.S, G: x.G, Cb: x.Cb, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const x = setupOf(ctx, c);
    const world = createWorld({ params: ctx.params, edge: x.edge, dt: ctx.dt, grid: ctx.tiers[c.tier].grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 0] });
    const nb = addRoom(world, c.neighbour, { id: 'neighbour', cell: [2, 0] });
    if (c.neighbour === 'beamBay') setActive(world, nb, false);
    setDemand(world, reactor, x.d);
    const N = Math.round(LIMIT / ctx.dt);
    let over = null;
    while (world.step < N && over === null) {
      step(world);
      const e = world.log.events.find((v) => v.room === 'reactor' && v.type === 'overheated');
      if (e) over = e.t;
    }
    return { overheat: over, neighbourT: roomTemperature(nb), books: [heatBooks(reactor.heat), heatBooks(nb.heat)], eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = { 'overheat time': e.overheat !== null && close(e.overheat, a.overheat, e.tolerance) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const at = (tier, n) => rows.find((r) => r.case.tier === tier && r.case.neighbour === n);
    return [
      { name: 'beside a heat sink the reactor overheats later than beside an idle beam bay, at T1 and T3', ok: ['T1', 'T3'].every((t) => { const a = at(t, 'beamBay'), b = at(t, 'heatSink'); return !!a && !!b && b.actual.overheat !== null && a.actual.overheat !== null && b.actual.overheat > a.actual.overheat; }) },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null ? 'never' : `${t.toFixed(3)} s`);
    return {
      expected: `overheat at ${s(e.overheat)} (closed form; demand ${e.d}, S ${(e.S / 1e6).toFixed(3)} MW, G ${e.G.toFixed(1)} W/K, C_neighbour ${e.Cb.toExponential(3)} J/K)`,
      actual: `overheated at ${s(a.overheat)}; neighbour then ${a.neighbourT.toFixed(3)} K`,
    };
  },
};
