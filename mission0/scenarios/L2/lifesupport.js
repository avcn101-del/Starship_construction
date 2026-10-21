import { createWorld, addRoom, setActive, setPower, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
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

const LIMIT = 900, PANELS = 4; // s; radiators on the beam bay
// Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js, 13c.1 and 13d.1 only.
// M quarters (no radiator: placed inside) heated by an enemy beam P (#138) and, while powered and not shut
// down, by its own draw; a passive 10 m wall to an idle M beam bay with PANELS radiators (eps sigma A T^4).
// Life support (13d.1), while powered: at the start of each step it takes E = min(capacity x dt, C (T - setpoint))
// from the quarters into the beam bay, spread evenly over the step (never below the setpoint within the step);
// it keeps running while the room is shut down (the kernel's reading, a question in the pull request). The
// quarters shut down (draw off) at the end of the step in which T >= crewed overheated and restart below hot;
// crossing times of the setpoint and of critical are interpolated within the sub-step.
function reference(ctx, c) {
  const p = ctx.params, th = p.thermal, dt = ctx.dt, h = dt / 10, setpoint = ctx.fixed.lifeSupportSetpoint.value;
  const C = [capacityOf(ctx, 'quarters'), capacityOf(ctx, 'beamBay')], G = wallG(ctx, 'quarters', 'beamBay', 2 * ctx.baseEdge);
  const rad = PANELS * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value;
  const draw = p.quarters.powerDraw.value, capacity = p.lifeSupport.capacityPerCell.value * cellsOf('quarters');
  const st = { shutdown: false, setpoint: null, critical: null, max: ctx.fixed.restTemperature.value, pumped: 0, shutdownAt: null };
  let pump = 0;
  const deriv = (T) => {
    const q = G * (T[0] - T[1]), own = c.powered && !st.shutdown ? draw : 0;
    return [(c.P + own - q - pump) / C[0], (q + pump - rad * T[1] ** 4) / C[1]];
  };
  let T = [ctx.fixed.restTemperature.value, ctx.fixed.restTemperature.value];
  for (let n = 0; n < Math.round(LIMIT / dt) && st.critical === null; n++) {
    pump = c.powered && T[0] > setpoint ? Math.min(capacity * dt, C[0] * (T[0] - setpoint)) / dt : 0;
    st.pumped += pump * dt;
    for (let s = 0; s < 10; s++) {
      const k1 = deriv(T), k2 = deriv(T.map((v, i) => v + (h / 2) * k1[i])), k3 = deriv(T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(T.map((v, i) => v + h * k3[i]));
      const next = T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])), t0 = n * dt + s * h;
      const cross = (level) => t0 + (h * (level - T[0])) / (next[0] - T[0]);
      if (st.setpoint === null && T[0] < setpoint && next[0] >= setpoint) st.setpoint = cross(setpoint);
      if (st.critical === null && T[0] < th.crewedCritical.value && next[0] >= th.crewedCritical.value) st.critical = cross(th.crewedCritical.value);
      T = next;
      st.max = Math.max(st.max, T[0]);
    }
    if (!st.shutdown && T[0] >= th.crewedOverheated.value) { st.shutdown = true; if (st.shutdownAt === null) st.shutdownAt = (n + 1) * dt; }
    else if (st.shutdown && T[0] < th.crewedHot.value) st.shutdown = false;
  }
  return st;
}
// The row's piecewise closed form (13d.2 row 16), shown beside the reference: it leaves out the passive wall and
// the shutdown of the quarters' draw at overheated. Setpoint at C (setpoint - 290 K) / (P + draw), then the rate
// (P + draw - capacity) / C up to critical.
function closedForm(ctx, c) {
  const p = ctx.params, C = capacityOf(ctx, 'quarters'), draw = c.powered ? p.quarters.powerDraw.value : 0;
  const capacity = c.powered ? p.lifeSupport.capacityPerCell.value * cellsOf('quarters') : 0, setpoint = ctx.fixed.lifeSupportSetpoint.value;
  const tSet = (C * (setpoint - ctx.fixed.restTemperature.value)) / (c.P + draw), rate = (c.P + draw - capacity) / C;
  const tCrit = rate > 0 ? tSet + (p.thermal.crewedCritical.value - setpoint) / rate : null;
  return { tSet, rate, tCrit: tCrit !== null && tCrit <= LIMIT ? tCrit : null };
}

export default {
  id: 'L2.lifesupport',
  level: 'L2',
  laws: ['life support keeps crewed rooms cool', 'a heat pump works against the gradient', 'enemy beams heat what they hit', 'crew die at critical heat'],
  dependsOn: ['L2.heat.pair.v2', 'L1.room.thresholds', 'L1.quarters.repair'],
  setup: 'in a cluster at T1, M crew quarters (rotated 90 degrees, no radiator) beside an idle M beam bay (switched off) with 4 radiators over a 10 m passive wall; an enemy beam heats the quarters directly (#138) at P in {0.2, 1, 5 MW} for 900 s; the quarters powered (life support on, its 50 kW draw is heat) or unpowered (no draw, no life support); run until the crew die or 900 s',
  measure: 'the first step at whose end the quarters reach the setpoint and their critical (crew-died events); the quarters\' highest temperature; the heat life support moved (books: pumped out of the quarters, into the beam bay)',
  tolerance: 'crossing times one-sided: reference <= kernel < reference + dt (1e-9 relative float slack); powered at 0.2 MW: peak <= setpoint + 0.01 K; unpowered at 0.2 MW: peak 1e-3 K absolute',
  criterion: 'times to the setpoint (powered) and to critical one-sided against the reference integrator (RK4 at dt / 10, the walls and life support of 13d.1, the shutdown and restart of L1 on the step grid); at 0.2 MW powered the crew never die and the peak stays <= FIXED.lifeSupportSetpoint + 0.01 K; unpowered at 0.2 MW they never die within 900 s and the peak matches the reference within 1e-3 K; all the crew die at critical; the heat pumped out of the quarters arrives in the beam bay (pumped books opposite, > 0 when powered, 0 when unpowered). The row\'s piecewise closed form (setpoint at C 5 K / (P + draw), then P + draw - capacity) is shown beside the reference, not checked: it leaves out the passive wall and the draw stopping at overheated (#138, #201, DESIGN.md 13d.2 row 16)',
  tunable: ['lifeSupport.capacityPerCell', 'conduction.passive', 'thermal.heatCapacityPerCell', 'thermal.crewedCritical', 'thermal.crewedOverheated', 'quarters.powerDraw', 'radiator.area'],
  locked: null,
  cases() {
    const out = [];
    for (const powered of [true, false]) for (const P of [2e5, 1e6, 5e6]) out.push({ P, powered });
    return out;
  },
  expected(ctx, c) {
    const r = reference(ctx, c);
    return {
      setpoint: c.powered ? r.setpoint : null, critical: r.critical, max: r.max, shutdownAt: r.shutdownAt, pumped: r.pumped,
      crew: ctx.params.quarters.crewPerCell.value * cellsOf('quarters'), slack: ctx.fixed.lifeSupportSetpoint.value + 0.01, tolerance: 1e-3, row: closedForm(ctx, c),
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const q = addRoom(world, 'quarters', { id: 'quarters', cell: [0, 0], rotation: 90 });
    const bay = addRoom(world, 'beamBay', { id: 'bay', cell: [2, 0] });
    setActive(world, bay, false);
    setRadiators(bay, PANELS, world);
    if (!c.powered) setPower(world, q, false);
    q.externalPower = c.P;
    const setpoint = ctx.fixed.lifeSupportSetpoint.value, N = Math.round(LIMIT / ctx.dt);
    let reached = null, max = roomTemperature(q);
    while (world.step < N) {
      step(world);
      max = Math.max(max, roomTemperature(q));
      if (reached === null && roomTemperature(q) >= setpoint) reached = world.t;
      if (world.log.events.some((e) => e.room === 'quarters' && e.type === 'critical')) break;
    }
    const crit = world.log.events.find((e) => e.room === 'quarters' && e.type === 'critical');
    const died = world.log.events.filter((e) => e.room === 'quarters' && e.type === 'crew-died');
    const bq = heatBooks(q.heat), bb = heatBooks(bay.heat);
    return {
      t: world.t, setpoint: reached, critical: crit ? crit.t : null, max, deaths: died.reduce((n, e) => n + e.deaths, 0), diedAt: died.length ? died[0].t : null,
      pumpedOut: -bq.pumped, pumpedIn: bb.pumped, bay: roomTemperature(bay),
      books: [bq, bb], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c, ctx) {
    const dt = ctx.dt, checks = {};
    if (c.powered) checks['time to the setpoint'] = e.setpoint !== null && oneSided(e.setpoint, a.setpoint, dt);
    if (e.critical !== null) {
      checks['time to critical'] = oneSided(e.critical, a.critical, dt);
      checks['all crew die at critical'] = a.deaths === e.crew && a.diedAt === a.critical;
    } else {
      checks['crew never die in 900 s'] = a.critical === null && a.deaths === 0;
      checks['peak'] = c.powered ? a.max <= e.slack : Math.abs(a.max - e.max) <= e.tolerance;
    }
    checks['pumped heat arrives in the beam bay'] = c.powered ? a.pumpedOut > 0 && Math.abs(a.pumpedIn - a.pumpedOut) <= 1e-9 * a.pumpedOut : a.pumpedOut === 0 && a.pumpedIn === 0;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null || t === undefined ? 'never' : `${t.toFixed(3)} s`);
    return {
      expected: `setpoint ${s(e.setpoint)}, critical ${s(e.critical)}, peak ${e.max.toFixed(4)} K, pumped ${(e.pumped / 1e6).toFixed(3)} MJ (reference); row closed form: setpoint ${s(e.row.tSet)}, rate ${e.row.rate.toFixed(5)} K/s, critical ${s(e.row.tCrit)}`,
      actual: `setpoint ${s(a.setpoint)}, critical ${s(a.critical)} (${a.deaths} crew died), peak ${a.max.toFixed(4)} K; pumped out ${(a.pumpedOut / 1e6).toFixed(3)} MJ, into the bay ${(a.pumpedIn / 1e6).toFixed(3)} MJ; bay ${a.bay.toFixed(2)} K`,
    };
  },
};
