import { createWorld, addRoom, setActive, setDemand, enablePowerRouting, step, roomTemperature } from '../../../js/rooms.js';
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
function wallG(ctx, typeA, typeB, length) {
  const A = ROOMS[typeA], B = ROOMS[typeB];
  if (A.loop === 'coolant' && B.loop === 'coolant') return ctx.params.conduction.wall.value * length * hmean(factorOf(ctx, A.coolantFactor), factorOf(ctx, B.coolantFactor));
  return ctx.params.conduction.passive.value * length * hmean(factorOf(ctx, A.passiveFactor), factorOf(ctx, B.passiveFactor));
}
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
/** Heat capacity (J/K) of an M room of `type` at T1 (13c.1; the heat sink x capacityFactor, #198). */
const capacityOf = (ctx, type) => cellsOf(type) * ctx.params.thermal.heatCapacityPerCell.value * factorOf(ctx, ROOMS[type].capacityFactor);
const rk4 = (T, deriv, h) => {
  const k1 = deriv(T), k2 = deriv(T.map((v, i) => v + (h / 2) * k1[i])), k3 = deriv(T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(T.map((v, i) => v + h * k3[i]));
  return T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
};

const A_RUN = 600, B_RUN = 900; // s
const A_START = 320; // K: the quarters in (a)
const WITHIN = 1e-3; // K: "within 1 mK of the setpoint"
const DEMAND = 0.25; // the reactor's demand in (b)
// (a) T1 grid: quarters (3 x 2) at (2, 2); an idle M reactor at (0, 3) shares one cell pair (5 m) with it; an M
// heat sink at (5, 2) shares two (10 m); reactor and sink do not touch. (b) quarters rotated 90 degrees at (0, 0)
// (2 x 3 cells), an M reactor at (2, 0) sharing two cell pairs (10 m); no radiators anywhere.
const WALL_A = { reactor: 1, sink: 2 }; // cell pairs

/**
 * Reference integrator for (a) (13d.2: RK4 at dt / 10 inside each step, from data.js and the rules of 13d.1):
 * quarters (draw quarters.powerDraw while powered and active; no routing), passive walls to the reactor (5 m) and
 * the sink (10 m). Life support at the start of each step takes E = min(capacityPerCell x cells x dt, C (T -
 * setpoint)) out of the quarters and puts it into the two coolant neighbours by live wall length, spread evenly
 * over the step. The idle reactor (demand 0) and the sink generate nothing.
 */
function referenceA(ctx) {
  const p = ctx.params, dt = ctx.dt, h = dt / 10, set = ctx.fixed.lifeSupportSetpoint.value, edge = ctx.baseEdge;
  const C = [capacityOf(ctx, 'quarters'), capacityOf(ctx, 'reactor'), capacityOf(ctx, 'heatSink')];
  const G = [wallG(ctx, 'quarters', 'reactor', WALL_A.reactor * edge), wallG(ctx, 'quarters', 'heatSink', WALL_A.sink * edge)];
  const share = [WALL_A.reactor / (WALL_A.reactor + WALL_A.sink), WALL_A.sink / (WALL_A.reactor + WALL_A.sink)];
  const cap = p.lifeSupport.capacityPerCell.value * cellsOf('quarters'), draw = p.quarters.powerDraw.value;
  let T = [A_START, ctx.fixed.restTemperature.value, ctx.fixed.restTemperature.value], pump = 0, within = null, min = Infinity;
  const pumped = [0, 0];
  const deriv = (x) => {
    const qr = G[0] * (x[0] - x[1]), qs = G[1] * (x[0] - x[2]);
    return [(draw - qr - qs - pump) / C[0], (qr + pump * share[0]) / C[1], (qs + pump * share[1]) / C[2]];
  };
  for (let n = 0; n < Math.round(A_RUN / dt); n++) {
    pump = T[0] > set ? Math.min(cap * dt, C[0] * (T[0] - set)) / dt : 0;
    pumped[0] += pump * share[0] * dt; pumped[1] += pump * share[1] * dt;
    for (let s = 0; s < 10; s++) T = rk4(T, deriv, h);
    min = Math.min(min, T[0]);
    if (within === null && T[0] - set <= WITHIN) within = (n + 1) * dt;
  }
  return { within, pumped, end: T[0], min };
}

/**
 * Reference integrator for (b) (13d.2: RK4 at dt / 10 inside each step): quarters and reactor over a 10 m
 * passive wall, power routing on. The quarters are supplied (13d.1, #207) while the reactor is able to produce
 * (switched on, demand above 0, not shut down: it stays far below its thresholds here, checked); then life
 * support runs whatever the quarters' own request. The quarters draw quarters.powerDraw (heat) while active,
 * supplied and not shut down; the reactor delivers what is routed, so it heats by heatPerPower x that draw; it
 * also takes the pumped heat. External P on the quarters. Shutdown at the end of the step in which T >= crewed
 * overheated, restart below hot (L1); crossings of hot and critical interpolated within the sub-step.
 */
function referenceB(ctx, c) {
  const p = ctx.params, th = p.thermal, dt = ctx.dt, h = dt / 10, set = ctx.fixed.lifeSupportSetpoint.value;
  const C = [capacityOf(ctx, 'quarters'), capacityOf(ctx, 'reactor')], G = wallG(ctx, 'quarters', 'reactor', 2 * ctx.baseEdge);
  const cap = p.lifeSupport.capacityPerCell.value * cellsOf('quarters'), draw = p.quarters.powerDraw.value;
  const supplied = c.mode !== 'no supply' && DEMAND > 0;
  const st = { shutdown: false, hot: null, critical: null, max: ctx.fixed.restTemperature.value, reactorMax: ctx.fixed.restTemperature.value, pumped: 0, perSecond: [] };
  let T = [ctx.fixed.restTemperature.value, ctx.fixed.restTemperature.value], pump = 0, own = 0;
  const deriv = (x) => {
    const q = G * (x[0] - x[1]);
    return [(c.P + own - q - pump) / C[0], (p.reactor.heatPerPower.value * own + q + pump) / C[1]];
  };
  const N = Math.round(B_RUN / dt), perSecond = Math.round(1 / dt);
  for (let n = 0; n < N && st.critical === null; n++) {
    own = c.mode === 'active' && supplied && !st.shutdown ? draw : 0;
    pump = supplied && T[0] > set ? Math.min(cap * dt, C[0] * (T[0] - set)) / dt : 0;
    st.pumped += pump * dt;
    for (let s = 0; s < 10; s++) {
      const next = rk4(T, deriv, h), t0 = n * dt + s * h;
      const cross = (level) => t0 + (h * (level - T[0])) / (next[0] - T[0]);
      if (st.hot === null && T[0] < th.crewedHot.value && next[0] >= th.crewedHot.value) st.hot = cross(th.crewedHot.value);
      if (st.critical === null && T[0] < th.crewedCritical.value && next[0] >= th.crewedCritical.value) st.critical = cross(th.crewedCritical.value);
      T = next;
      st.max = Math.max(st.max, T[0]); st.reactorMax = Math.max(st.reactorMax, T[1]);
    }
    if (st.critical === null && (n + 1) % perSecond === 0) st.perSecond.push(T[0]);
    if (!st.shutdown && T[0] >= th.crewedOverheated.value) st.shutdown = true;
    else if (st.shutdown && T[0] < th.crewedHot.value) st.shutdown = false;
  }
  return st;
}

export default {
  id: 'L2.lifesupport.routed.v2',
  level: 'L2',
  laws: ['life support keeps crewed rooms cool', 'life support is ship service: it runs while the room is joined to a live reactor, whatever its own request', 'a heat pump splits its heat by live wall length', 'crew die at critical heat'],
  dependsOn: ['L2.lifesupport', 'L2.power.flow', 'L2.heat.pair.v2'],
  setup: 'in a cluster at T1, no radiators. (a) M crew quarters at 320 K, powered and active (its 50 kW draw is heat), at (2, 2); an idle M reactor (demand 0) at (0, 3) sharing 5 m with it and an M heat sink at (5, 2) sharing 10 m, not with each other; both at 290 K; no power routing; 600 s. (b) power routing on: M crew quarters (rotated 90 degrees) at (0, 0) beside an M reactor at demand 0.25 at (2, 0) over 10 m, both at 290 K; an external 0.2 MW or 1 MW on the quarters for 900 s or until the crew die; the quarters active, switched off, or the reactor switched off (no supply) (13e.3 D5b, #207, #212)',
  measure: '(a) life support\'s heat into each neighbour in every step; the quarters\' lowest temperature; the first step at whose end the quarters are within 1 mK of the setpoint; heat pumped into each neighbour. (b) the quarters\' temperature at every whole second; its peak; the times of its hot and critical events and the crew deaths; heat pumped; the reactor\'s peak temperature',
  tolerance: '(a) split 1e-9 relative every step; lowest temperature >= setpoint - 1e-9 K; time to 1 mK and heat pumped 1e-3 relative. (b) temperature 1e-6 relative at every whole second (|kernel - reference| <= 1e-6 x the smaller of the two, so it holds in both directions); peak <= setpoint + 0.01 K at 0.2 MW when supplied; crossing times one-sided (reference <= kernel < reference + dt, 1e-9 relative float slack)',
  criterion: '(a) heat pumped into the reactor and the sink in the ratio of their live wall lengths (1 : 2) within 1e-9 at every step; the quarters never below FIXED.lifeSupportSetpoint - 1e-9 K; time to within 1 mK of the setpoint and the heat pumped into each neighbour against the reference integrator within 1e-3 (estimate 353 s; 39.6 and 79.1 MJ). (b) the quarters\' temperature against the reference integrator (RK4 at dt / 10, the walls and life support of 13d.1, routed life support of #207, L1 shutdown on the step grid) within 1e-6 relative at every whole second (both directions; D5\'s 1e-6 K was under the kernel Euler error, #212); at 0.2 MW active and switched off the peak stays <= setpoint + 0.01 K (estimates 295.0013 / 295.0010 K) and the crew live; with the reactor switched off nothing is pumped, the hot event is one-sided against the reference (about 738 s) and the crew live (338.5 K); at 1 MW the crew die one-sided against the reference (about 438 s active, 458 s switched off, 328 s no supply), all of them; the heat pumped out of the quarters arrives in the reactor; the reactor stays below its hot threshold (#201, #205 (3), #207, #212)',
  tunable: ['lifeSupport.capacityPerCell', 'conduction.passive', 'thermal.heatCapacityPerCell', 'thermal.crewedHot', 'thermal.crewedOverheated', 'thermal.crewedCritical', 'quarters.powerDraw', 'heatsink.capacityFactor', 'reactor.heatPerPower'],
  locked: { date: '2026-10-21', hash: '9eebc863' },
  cases() {
    const out = [{ part: 'a' }];
    for (const P of [2e5, 1e6]) for (const mode of ['active', 'switched off', 'no supply']) out.push({ part: 'b', P, mode });
    return out;
  },
  expected(ctx, c) {
    if (c.part === 'a') {
      const r = referenceA(ctx);
      return { within: r.within, pumped: r.pumped, end: r.end, ratio: WALL_A.sink / WALL_A.reactor, floor: ctx.fixed.lifeSupportSetpoint.value - 1e-9 };
    }
    const r = referenceB(ctx, c);
    return {
      perSecond: r.perSecond, max: r.max, hot: r.hot, critical: r.critical, pumped: r.pumped, reactorMax: r.reactorMax, supplied: c.mode !== 'no supply',
      crew: ctx.params.quarters.crewPerCell.value * cellsOf('quarters'), slack: ctx.fixed.lifeSupportSetpoint.value + 0.01, reactorHot: ctx.params.thermal.plantHot.value,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const set = ctx.fixed.lifeSupportSetpoint.value;
    if (c.part === 'a') {
      const q = addRoom(world, 'quarters', { id: 'quarters', cell: [2, 2], temperature: A_START });
      const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 3] });
      const sink = addRoom(world, 'heatSink', { id: 'sink', cell: [5, 2] });
      setDemand(world, reactor, 0);
      let worstSplit = 0, min = Infinity, within = null, steps = 0;
      while (world.step < Math.round(A_RUN / ctx.dt)) {
        const pr = reactor.heat.pumped, ps = sink.heat.pumped;
        step(world);
        const dr = reactor.heat.pumped - pr, ds = sink.heat.pumped - ps;
        if (dr > 0 || ds > 0) { steps++; worstSplit = Math.max(worstSplit, Math.abs(ds / dr - WALL_A.sink / WALL_A.reactor) / (WALL_A.sink / WALL_A.reactor)); }
        min = Math.min(min, roomTemperature(q));
        if (within === null && roomTemperature(q) - set <= WITHIN) within = world.t;
      }
      return {
        within, pumped: [reactor.heat.pumped, sink.heat.pumped], pumpedOut: -q.heat.pumped, worstSplit, pumpingSteps: steps, min, end: roomTemperature(q),
        books: [heatBooks(q.heat), heatBooks(reactor.heat), heatBooks(sink.heat)], eventsOk: eventsOk(world.log.events),
      };
    }
    const q = addRoom(world, 'quarters', { id: 'quarters', cell: [0, 0], rotation: 90 });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [2, 0] });
    enablePowerRouting(world, ['quarters']);
    setDemand(world, reactor, DEMAND);
    if (c.mode === 'switched off') setActive(world, q, false);
    if (c.mode === 'no supply') setActive(world, reactor, false);
    q.externalPower = c.P;
    const perSecond = [], N = Math.round(B_RUN / ctx.dt), every = Math.round(1 / ctx.dt);
    let max = roomTemperature(q), reactorMax = roomTemperature(reactor);
    const critical = () => world.log.events.find((e) => e.room === 'quarters' && e.type === 'critical') || null;
    while (world.step < N && !critical()) {
      step(world);
      max = Math.max(max, roomTemperature(q)); reactorMax = Math.max(reactorMax, roomTemperature(reactor));
      if (!critical() && world.step % every === 0) perSecond.push(roomTemperature(q));
    }
    const ev = world.log.events.filter((e) => e.room === 'quarters');
    const hot = ev.find((e) => e.type === 'hot'), crit = critical(), died = ev.filter((e) => e.type === 'crew-died');
    return {
      perSecond, max, reactorMax, hot: hot ? hot.t : null, critical: crit ? crit.t : null,
      deaths: died.reduce((n, e) => n + e.deaths, 0), diedAt: died.length ? died[0].t : null,
      pumpedOut: -q.heat.pumped, pumpedIn: reactor.heat.pumped,
      books: [heatBooks(q.heat), heatBooks(reactor.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c, ctx) {
    const dt = ctx.dt, checks = {};
    if (c.part === 'a') {
      checks['split 1 : 2 by live wall length, every step'] = a.pumpingSteps > 0 && a.worstSplit <= 1e-9;
      checks['never below the setpoint'] = a.min >= e.floor;
      checks['time to within 1 mK'] = e.within !== null && close(e.within, a.within, 1e-3);
      checks['heat pumped into each neighbour'] = a.pumped.every((x, i) => close(e.pumped[i], x, 1e-3)) && close(a.pumpedOut, a.pumped[0] + a.pumped[1], 1e-9);
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    const n = Math.min(e.perSecond.length, a.perSecond.length);
    checks['temperature every second, 1e-6 relative'] = n > 0 && e.perSecond.length === a.perSecond.length && e.perSecond.every((T, i) => Number.isFinite(a.perSecond[i]) && Math.abs(T - a.perSecond[i]) <= 1e-6 * Math.min(Math.abs(T), Math.abs(a.perSecond[i])));
    if (e.critical !== null) {
      checks['crew die (one-sided)'] = oneSided(e.critical, a.critical, dt);
      checks['all crew die at critical'] = a.deaths === e.crew && a.diedAt === a.critical;
    } else {
      checks['crew live'] = a.critical === null && a.deaths === 0;
      if (e.supplied) checks['peak <= setpoint + 0.01 K'] = a.max <= e.slack;
      else checks['hot (one-sided)'] = e.hot !== null && oneSided(e.hot, a.hot, dt);
    }
    checks['pumped heat arrives in the reactor'] = e.supplied ? a.pumpedOut > 0 && Math.abs(a.pumpedIn - a.pumpedOut) <= 1e-9 * a.pumpedOut : a.pumpedOut === 0 && a.pumpedIn === 0;
    checks['reactor below its hot threshold'] = a.reactorMax < e.reactorHot && e.reactorMax < e.reactorHot;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null || t === undefined ? 'never' : `${t.toFixed(3)} s`), mj = (x) => (x / 1e6).toFixed(3);
    if (r.case.part === 'a') {
      return {
        expected: `within 1 mK at ${s(e.within)}; pumped into reactor ${mj(e.pumped[0])} MJ, sink ${mj(e.pumped[1])} MJ (ratio ${e.ratio}); end ${e.end.toFixed(6)} K (reference)`,
        actual: `within 1 mK at ${s(a.within)}; pumped into reactor ${mj(a.pumped[0])} MJ, sink ${mj(a.pumped[1])} MJ; worst split error ${a.worstSplit.toExponential(2)} over ${a.pumpingSteps} steps; lowest ${a.min.toFixed(6)} K, end ${a.end.toFixed(6)} K`,
      };
    }
    const n = Math.min(e.perSecond.length, a.perSecond.length);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(e.perSecond[i] - a.perSecond[i]));
    return {
      expected: `peak ${e.max.toFixed(5)} K, hot ${s(e.hot)}, critical ${s(e.critical)}, pumped ${mj(e.pumped)} MJ, reactor peak ${e.reactorMax.toFixed(2)} K (reference; ${e.perSecond.length} samples)`,
      actual: `peak ${a.max.toFixed(5)} K, hot ${s(a.hot)}, critical ${s(a.critical)} (${a.deaths} crew died), pumped ${mj(a.pumpedOut)} MJ into reactor ${mj(a.pumpedIn)} MJ, reactor peak ${a.reactorMax.toFixed(2)} K; ${a.perSecond.length} samples, largest |kernel - reference| ${worst.toExponential(3)} K`,
    };
  },
};
