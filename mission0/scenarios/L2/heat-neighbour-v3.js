import { createWorld, addRoom, setDemand, setPower, loadMagazine, step, roomTemperature } from '../../../js/rooms.js';
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

const LIMIT = 900; // s
const SETPOINT_SLACK = 0.01; // K, life support on: the neighbour never exceeds the setpoint + this (row 3b)
function setupOf(ctx, c) {
  const p = ctx.params, th = p.thermal, cls = ROOMS[c.neighbour].thermalClass;
  return {
    Ca: capacityOf(ctx, 'reactor'), Cb: capacityOf(ctx, c.neighbour), G: wallG(ctx, 'reactor', c.neighbour, 2 * ctx.baseEdge),
    S: p.reactor.heatPerPower.value * c.d * p.reactor.power.value, // the reactor's heat at demand d (L1)
    crit: th[`${cls}Critical`].value, over: th.plantOverheated.value, hot: th.plantHot.value,
    f: p.reactor.decayFraction.value, tau: p.reactor.decayTime.value, rest: ctx.fixed.restTemperature.value,
  };
}
// Reference integrator (13d.2) for life support off: RK4 at dt / 10 inside each step of dt, from data.js and
// 13d.1 only. Reactor | passive wall | neighbour (unpowered: no draw, no life support, no radiators); the
// reactor's heat h d P while running; it shuts down at the end of the step in which T >= overheated (decay heat
// f h d P exp(-(t - t_s) / tau) from then, L1) and restarts at the end of the step in which T < hot.
function reference(ctx, x) {
  const C = [x.Ca, x.Cb], dt = ctx.dt, h = dt / 10, N = Math.round(LIMIT / dt);
  const state = { on: true, decay: [], overheat: null, max: x.rest, maxReactor: x.rest };
  const power = (t) => {
    let P = state.on ? x.S : 0;
    for (const d of state.decay) P += d.P0 * Math.exp(-(t - d.start) / x.tau);
    return P;
  };
  const deriv = (t, T) => { const q = x.G * (T[0] - T[1]); return [(power(t) - q) / C[0], q / C[1]]; };
  let T = [x.rest, x.rest];
  for (let n = 0; n < N; n++) {
    for (let s = 0; s < 10; s++) {
      const t = n * dt + s * h;
      const k1 = deriv(t, T), k2 = deriv(t + h / 2, T.map((v, i) => v + (h / 2) * k1[i]));
      const k3 = deriv(t + h / 2, T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(t + h, T.map((v, i) => v + h * k3[i]));
      T = T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    const t = (n + 1) * dt;
    state.max = Math.max(state.max, T[1]);
    state.maxReactor = Math.max(state.maxReactor, T[0]);
    if (state.on && T[0] >= x.over) { state.on = false; state.decay.push({ start: t, P0: x.f * x.S }); if (state.overheat === null) state.overheat = t; }
    else if (!state.on && T[0] < x.hot) state.on = true;
  }
  return { ...state, T };
}

// The thermally coupled heat capacity per cell of each room type (#240 (1), DESIGN.md 13k.2), written out here, not read from ROOMS.
const COUPLED = { bridge: 'coupledCrewed', quarters: 'coupledCrewed', turret: 'coupledCrewed', missileBay: 'coupledCrewed', reactor: 'coupledReactor', engine: 'coupledEngine', beamBay: 'coupledBeamBay', shieldGenerator: 'coupledShieldGenerator', magazine: 'coupledMagazine', hold: 'coupledHold', heatSink: 'coupledHeatSink', railgun: 'coupledRailgun' };

export default {
  id: 'L2.heat.neighbour.v3',
  level: 'L2',
  laws: ['a passive bulkhead leaks little', 'life support keeps crewed rooms and magazines cool', 'a magazine cooks off', 'crew die at critical heat'],
  dependsOn: ['L2.heat.pair.v2', 'L1.room.thresholds', 'L1.magazine.cookoff'],
  setup: 'in a cluster at T1, an M reactor at demand d in {0.25, 0.5} (delivered on demand, L1) beside an M magazine full of M HE rounds or M crew quarters over a 10 m passive wall (2 cell pairs), no radiators; life support on (the neighbour powered; the quarters then also draw their 50 kW as heat) or off (unpowered: no draw, no life support); 900 s (replaces L2.heat.neighbour under #200, #201)',
  measure: 'the neighbour\'s highest temperature after every step, its critical event (magazine cook-off; quarters crew deaths) if any; the reactor\'s first overheated event and its highest temperature',
  tolerance: 'life support on: setpoint + 0.01 K; life support off: highest temperature 1e-3 K absolute',
  criterion: 'life support on: the neighbour never exceeds FIXED.lifeSupportSetpoint + 0.01 K; life support off: the neighbour\'s highest temperature over 900 s matches the reference integrator (RK4 at dt / 10, passive wall of 13d.1, the shutdown, decay heat and restart of L1 on the step grid) within 1e-3 K, and it stays below its critical through 900 s (no cook-off, no crew deaths) (#200, #201, DESIGN.md 13d.2 row 3b) Successor of L2.heat.neighbour.v2 (#240, #243, 13k.4 S16): C = cells x the room type\'s thermally coupled heat capacity per cell (13k.2; a heat sink x heatsink.capacityFactor as before) in place of thermal.heatCapacityPerCell; every expected value is the same rule computed in the scenario.',
  tunable: ['conduction.passive', 'lifeSupport.capacityPerCell', 'thermal.coupledReactor', 'thermal.coupledBeamBay', 'thermal.coupledEngine', 'thermal.coupledShieldGenerator', 'thermal.coupledCrewed', 'thermal.coupledMagazine', 'thermal.coupledHold', 'thermal.coupledHeatSink', 'reactor.power', 'reactor.heatPerPower', 'thermal.magazineCritical', 'thermal.crewedCritical', 'thermal.plantOverheated'],
  locked: null,
  cases() {
    const out = [];
    for (const neighbour of ['magazine', 'quarters']) for (const d of [0.25, 0.5]) for (const lifeSupport of ['on', 'off']) out.push({ neighbour, d, lifeSupport });
    return out;
  },
  expected(ctx, c) {
    const x = setupOf(ctx, c);
    if (c.lifeSupport === 'on') return { max: ctx.fixed.lifeSupportSetpoint.value + SETPOINT_SLACK, crit: x.crit };
    const r = reference(ctx, x);
    return { max: r.max, crit: x.crit, overheat: r.overheat, maxReactor: r.maxReactor, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 0] });
    const nb = addRoom(world, c.neighbour, { id: 'neighbour', cell: [2, 0], rotation: c.neighbour === 'quarters' ? 90 : 0 });
    if (c.neighbour === 'magazine') loadMagazine(world, nb, { size: 'M', heMass: ctx.params.magazine.capacity.value });
    if (c.lifeSupport === 'off') setPower(world, nb, false);
    setDemand(world, reactor, c.d);
    const N = Math.round(LIMIT / ctx.dt);
    let max = roomTemperature(nb), maxReactor = roomTemperature(reactor);
    while (world.step < N) {
      step(world);
      max = Math.max(max, roomTemperature(nb));
      maxReactor = Math.max(maxReactor, roomTemperature(reactor));
    }
    const find = (room, type) => world.log.events.find((e) => e.room === room && e.type === type) || null;
    const crit = find('neighbour', 'critical'), over = find('reactor', 'overheated'), cook = find('neighbour', 'cook-off');
    return {
      t: world.t, max, end: roomTemperature(nb), critical: crit ? crit.t : null, cookOff: cook ? cook.t : null,
      deaths: world.log.events.filter((e) => e.room === 'neighbour' && e.type === 'crew-died').reduce((n, e) => n + e.deaths, 0),
      overheat: over ? over.t : null, maxReactor, meltdown: !!find('reactor', 'meltdown'), pumped: heatBooks(nb.heat).pumped,
      books: [heatBooks(reactor.heat), heatBooks(nb.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const checks = c.lifeSupport === 'on'
      ? { 'never above the setpoint + 0.01 K': Number.isFinite(a.max) && a.max <= e.max }
      : {
        'highest temperature': Number.isFinite(a.max) && Math.abs(a.max - e.max) <= e.tolerance,
        'below critical through 900 s': a.critical === null && a.cookOff === null && a.deaths === 0 && a.max < e.crit,
      };
    checks['ran 900 s'] = a.t >= LIMIT - 1e-9 * LIMIT;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null || t === undefined ? 'never' : `${t.toFixed(3)} s`);
    const tail = `reactor overheated ${s(a.overheat)}, highest ${a.maxReactor.toFixed(2)} K, meltdown ${a.meltdown ? 'yes' : 'no'}; pumped ${(a.pumped / 1e6).toFixed(3)} MJ`;
    if (r.case.lifeSupport === 'on') return { expected: `neighbour <= ${e.max.toFixed(2)} K through 900 s`, actual: `neighbour highest ${a.max.toFixed(5)} K, end ${a.end.toFixed(5)} K; ${tail}` };
    return {
      expected: `neighbour highest ${e.max.toFixed(4)} K (reference), below ${e.crit} K; reference reactor overheat ${s(e.overheat)}, highest ${e.maxReactor.toFixed(2)} K`,
      actual: `neighbour highest ${a.max.toFixed(4)} K, end ${a.end.toFixed(4)} K, critical ${s(a.critical)}; ${tail}`,
    };
  },
};
