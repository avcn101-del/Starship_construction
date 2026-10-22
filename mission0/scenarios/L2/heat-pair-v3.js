import { createWorld, addRoom, setActive, setPower, runUntil, roomTemperature } from '../../../js/rooms.js';
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

const PASSIVE_RUN = 3600; // s, part (b)
// Closed form of two rooms exchanging heat through one wall (13d.1), from data.js only:
// tau = C_a C_b / ((C_a + C_b) G), G by the wall type, Delta T(t) = Delta T0 exp(-t / tau).
function pair(ctx, c) {
  const edge = ctx.tiers[c.tier].edge, L = c.pairs * edge;
  const Ca = capacityOf(ctx, 'beamBay', cellsOf('beamBay'), edge), Cb = capacityOf(ctx, c.b, cellsOf(c.b), edge);
  const G = wallG(ctx, 'beamBay', c.b, L, edge), tau = (Ca * Cb) / ((Ca + Cb) * G);
  return { Ca, Cb, G, L, tau, duration: c.part === 'a' ? 4 * tau : PASSIVE_RUN, dT0: c.Ta - ctx.fixed.restTemperature.value, edge };
}

// The thermally coupled heat capacity per cell of each room type (#240 (1), DESIGN.md 13k.2), written out here, not read from ROOMS.
const COUPLED = { bridge: 'coupledCrewed', quarters: 'coupledCrewed', turret: 'coupledCrewed', missileBay: 'coupledCrewed', reactor: 'coupledReactor', engine: 'coupledEngine', beamBay: 'coupledBeamBay', shieldGenerator: 'coupledShieldGenerator', magazine: 'coupledMagazine', hold: 'coupledHold', heatSink: 'coupledHeatSink', railgun: 'coupledRailgun' };

export default {
  id: 'L2.heat.pair.v3',
  level: 'L2',
  laws: ['heat moves fast along the coolant loop', 'a passive bulkhead leaks little', 'an empty hold insulates', 'energy conservation'],
  dependsOn: ['L1.radiator.cooling', 'L1.room.thresholds'],
  setup: 'two idle M rooms side by side in a cluster, sharing a wall of 1 or 2 cell pairs (5 or 10 m at T1), no radiators: (a) two coolant rooms (beam bays switched off), the first at T_a in {400, 600, 1000 K}, the second at 290 K, run 4 tau, at T1, and T1-T6 for T_a = 1000 K over 2 pairs; (b) a coolant room (a beam bay switched off) at 600 K beside an empty hold or an unpowered empty M magazine (no life support) at 290 K, run 3600 s, T1 (replaces L2.heat.pair under #200, #201)',
  measure: 'T_a - T_b after every step against the closed form; C_a T_a + C_b T_b after every step',
  tolerance: 'Delta T: 1e-3 of Delta T0 at every step; energy: 1e-12 relative at every step',
  criterion: 'Delta T(t) = Delta T0 exp(-t / tau), tau = C_a C_b / ((C_a + C_b) G), G by the wall type of 13d.1 (coolant wall between two coolant rooms: conduction.wall x L x harmonic mean of the coolant factors; otherwise a passive wall: conduction.passive x L x harmonic mean of the passive factors, the hold conduction.holdFactor), |Delta T - closed form| <= 1e-3 Delta T0 at every step; C_a T_a + C_b T_b constant to 1e-12 relative at every step (#200, #201, DESIGN.md 13d.2 row 1b) Successor of L2.heat.pair.v2 (#240, #243, 13k.4 S16): C = cells x the room type\'s thermally coupled heat capacity per cell (13k.2; a heat sink x heatsink.capacityFactor as before) in place of thermal.heatCapacityPerCell; every expected value is the same rule computed in the scenario.',
  tunable: ['conduction.wall', 'conduction.passive', 'conduction.holdFactor', 'thermal.coupledReactor', 'thermal.coupledBeamBay', 'thermal.coupledEngine', 'thermal.coupledShieldGenerator', 'thermal.coupledCrewed', 'thermal.coupledMagazine', 'thermal.coupledHold', 'thermal.coupledHeatSink'],
  locked: null,
  cases() {
    const out = [];
    for (const Ta of [400, 600, 1000]) for (const pairs of [1, 2]) out.push({ part: 'a', tier: 'T1', Ta, pairs, b: 'beamBay' });
    for (const tier of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) out.push({ part: 'a', tier, Ta: 1000, pairs: 2, b: 'beamBay', sweep: 'tier' });
    for (const b of ['hold', 'magazine']) for (const pairs of [1, 2]) out.push({ part: 'b', tier: 'T1', Ta: 600, pairs, b });
    return out;
  },
  expected(ctx, c) {
    const x = pair(ctx, c);
    return { G: x.G, tau: x.tau, duration: x.duration, dT0: x.dT0, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const x = pair(ctx, c);
    const world = createWorld({ params: ctx.params, edge: x.edge, dt: ctx.dt, grid: ctx.tiers[c.tier].grid });
    const a = addRoom(world, 'beamBay', { id: 'a', cell: [0, 0], temperature: c.Ta });
    const b = addRoom(world, c.b, { id: 'b', cell: [2, c.pairs === 2 ? 0 : 1] });
    setActive(world, a, false);
    if (c.b === 'beamBay') setActive(world, b, false);
    if (c.b === 'magazine') setPower(world, b, false); // no life support (#201)
    const Q0 = a.heat.Q + b.heat.Q;
    let maxDeviation = 0, maxEnergy = 0, first = true;
    const watch = () => {
      if (!first) {
        const dT = roomTemperature(a) - roomTemperature(b);
        maxDeviation = Math.max(maxDeviation, Math.abs(dT - x.dT0 * Math.exp(-world.t / x.tau)) / x.dT0);
        maxEnergy = Math.max(maxEnergy, Math.abs(a.heat.Q + b.heat.Q - Q0) / Q0);
      }
      first = false;
    };
    runUntil(world, x.duration, watch);
    watch();
    return {
      t: world.t, dT: roomTemperature(a) - roomTemperature(b), Tb: roomTemperature(b), maxDeviation, maxEnergy,
      books: [heatBooks(a.heat), heatBooks(b.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const checks = {
      'Delta T at every step': Number.isFinite(a.maxDeviation) && a.maxDeviation <= e.tolerance,
      'energy constant': Number.isFinite(a.maxEnergy) && a.maxEnergy <= 1e-12,
      'ran the whole run': a.t >= e.duration - 1e-9 * e.duration,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `G ${e.G.toFixed(4)} W/K, tau ${e.tau.toFixed(4)} s, run ${e.duration.toFixed(3)} s; |dT - dT0 exp(-t/tau)| <= ${e.tolerance} x ${e.dT0} K; energy to 1e-12`,
      actual: `dT(${a.t.toFixed(3)} s) ${a.dT.toFixed(6)} K (T_b ${a.Tb.toFixed(4)} K), max deviation ${a.maxDeviation.toExponential(2)} dT0; energy drift ${a.maxEnergy.toExponential(2)}`,
    };
  },
};
