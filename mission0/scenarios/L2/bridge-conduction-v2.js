import { createWorld, addRoom, setActive, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
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

const PANELS = 4, LIMIT = 5000, AFTER = 10; // radiators on the beam bay; s
// Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js, 13c.1 and 13d.1 only. An M
// bridge (its draw bridge.powerDraw is heat while it runs, L1; no radiator) heated by an external P until the end
// of the step in which it reaches crewed overheated (it shuts down and the source goes off), beside an idle M beam
// bay with PANELS radiators (eps sigma A T^4) over a 10 m passive wall. Life support on the bridge's backup (13d.1):
// at the start of each step it takes E = min(capacity x dt, C (T - setpoint)) from the bridge into the beam bay,
// spread evenly over the step; it keeps running while the bridge is shut down (the kernel's reading, a question in
// the pull request). The bridge restarts at the end of the step in which T < crewed hot.
function reference(ctx, c) {
  const p = ctx.params, th = p.thermal, dt = ctx.dt, h = dt / 10, setpoint = ctx.fixed.lifeSupportSetpoint.value;
  const C = [capacityOf(ctx, 'bridge'), capacityOf(ctx, 'beamBay')], G = wallG(ctx, 'bridge', 'beamBay', 2 * ctx.baseEdge);
  const rad = PANELS * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value;
  const draw = p.bridge.powerDraw.value, capacity = p.lifeSupport.capacityPerCell.value * cellsOf('bridge');
  const st = { shutdown: false, external: true, overheat: null, restart: null };
  let pump = 0;
  const deriv = (T) => {
    const q = G * (T[0] - T[1]), P = (st.external ? c.P : 0) + (st.shutdown ? 0 : draw);
    return [(P - q - pump) / C[0], (q + pump - rad * T[1] ** 4) / C[1]];
  };
  let T = [ctx.fixed.restTemperature.value, ctx.fixed.restTemperature.value];
  for (let n = 0; n < Math.round(LIMIT / dt) && st.restart === null; n++) {
    pump = T[0] > setpoint ? Math.min(capacity * dt, C[0] * (T[0] - setpoint)) / dt : 0;
    for (let s = 0; s < 10; s++) {
      const k1 = deriv(T), k2 = deriv(T.map((v, i) => v + (h / 2) * k1[i])), k3 = deriv(T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(T.map((v, i) => v + h * k3[i]));
      T = T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    const t = (n + 1) * dt;
    if (!st.shutdown && T[0] >= th.crewedOverheated.value) { st.shutdown = true; st.external = false; if (st.overheat === null) st.overheat = t; }
    else if (st.shutdown && T[0] < th.crewedHot.value) { st.shutdown = false; st.restart = t; }
  }
  return st;
}

export default {
  id: 'L2.bridge.conduction.v2',
  level: 'L2',
  laws: ['life support keeps crewed rooms cool', 'an overheated room shuts itself down and restarts below hot', 'heat can decapitate: an overheated bridge gives no control'],
  dependsOn: ['L2.heat.pair.v2', 'L1.room.restart', 'L1.bridge.control'],
  setup: 'in a cluster at T1, an M bridge (placed inside: no radiator; life support on its backup supply, #147) beside an idle M beam bay (switched off) with 4 radiators over a 10 m passive wall; an external 1.1 MW heats the bridge until its overheated event, then the source is off; run until its restart and 10 s more (replaces L2.bridge.conduction under #200, #201)',
  measure: 'the overheated, control-lost, restart and control-restored events; control in every step; crew deaths; whether the bridge can take a radiator; the heat life support moved',
  tolerance: 'overheat and restart times 1e-3 relative; events and control exact',
  criterion: 'control lost at overheat (control-lost, cause overheat, at the overheated step) and restored at the restart (control-restored, cause restart); control false in every step from the overheat to the restart, true before and after; overheat time and restart time after the overheat by the reference integrator (RK4 at dt / 10, the passive wall and life support of 13d.1, the L1 shutdown and restart on the step grid) within 1e-3 relative; no radiator on the bridge (setting one is refused); no crew deaths; the heat pumped out of the bridge arrives in the beam bay (#190 (2), #201, DESIGN.md 13d.2 row 12b)',
  tunable: ['lifeSupport.capacityPerCell', 'conduction.passive', 'radiator.area', 'thermal.heatCapacityPerCell', 'thermal.crewedHot', 'thermal.crewedOverheated', 'bridge.powerDraw'],
  locked: null,
  cases() {
    return [{ P: 1.1e6 }];
  },
  expected(ctx, c) {
    const r = reference(ctx, c);
    return { overheat: r.overheat, restartAfter: r.restart === null ? null : r.restart - r.overheat, lostCause: 'overheat', restoredCause: 'restart', deaths: 0, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const bridge = addRoom(world, 'bridge', { id: 'bridge', cell: [0, 0] });
    const bay = addRoom(world, 'beamBay', { id: 'bay', cell: [2, 0] });
    setActive(world, bay, false);
    setRadiators(bay, PANELS, world);
    let refused = false;
    try { setRadiators(bridge, 1, world); } catch { refused = true; }
    bridge.externalPower = c.P;
    let overheated = null, restart = null, stopAt = Infinity, controlOk = true;
    const N = Math.round(LIMIT / ctx.dt);
    while (world.step < N && world.t < stopAt) {
      const from = world.log.events.length;
      step(world);
      for (const e of world.log.events.slice(from)) {
        if (e.room !== 'bridge') continue;
        if (e.type === 'overheated' && overheated === null) { overheated = e.t; bridge.externalPower = 0; }
        if (e.type === 'restart' && restart === null) { restart = e.t; stopAt = world.t + AFTER; }
      }
      controlOk = controlOk && bridge.bridge.control === (overheated === null || restart !== null);
    }
    const pick = (type) => world.log.events.filter((e) => e.type === type && e.room === 'bridge').map((e) => ({ t: e.t, cause: e.cause }));
    const bb = heatBooks(bridge.heat), by = heatBooks(bay.heat);
    return {
      overheated, restart, controlOk, controlAtEnd: bridge.bridge.control, lost: pick('control-lost'), restored: pick('control-restored'),
      radiators: bridge.radiators, refused, end: [roomTemperature(bridge), roomTemperature(bay)], pumpedOut: -bb.pumped, pumpedIn: by.pumped,
      deaths: world.log.events.filter((e) => e.type === 'crew-died').reduce((n, e) => n + e.deaths, 0),
      books: [bb, by], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const checks = {
      'control-lost at overheat, cause overheat': a.lost.length === 1 && a.lost[0].t === a.overheated && a.lost[0].cause === e.lostCause,
      'control-restored at restart, cause restart': a.restored.length === 1 && a.restored[0].t === a.restart && a.restored[0].cause === e.restoredCause,
      'control every step': a.controlOk && a.controlAtEnd === true,
      'overheat time': e.overheat !== null && close(e.overheat, a.overheated, e.tolerance),
      'restart time after the overheat': e.restartAfter !== null && a.restart !== null && close(e.restartAfter, a.restart - a.overheated, e.tolerance),
      'no radiator on the bridge': a.radiators === 0 && a.refused === true,
      'no crew deaths': a.deaths === e.deaths,
      'pumped heat arrives in the beam bay': a.pumpedOut > 0 && Math.abs(a.pumpedIn - a.pumpedOut) <= 1e-9 * a.pumpedOut,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null ? 'never' : `${t.toFixed(3)} s`);
    return {
      expected: `overheat at ${s(e.overheat)}, restart ${s(e.restartAfter)} later (reference); control-lost (${e.lostCause}), control-restored (${e.restoredCause}); no deaths`,
      actual: `overheated ${s(a.overheated)}, restart ${a.restart === null ? 'never' : s(a.restart - a.overheated)} later; control-lost ${a.lost.map((x) => `${x.t.toFixed(3)} s ${x.cause}`).join(', ') || 'none'}; restored ${a.restored.map((x) => `${x.t.toFixed(3)} s ${x.cause}`).join(', ') || 'none'}; control every step ${a.controlOk ? 'ok' : 'NO'}; radiators ${a.radiators} (refused ${a.refused ? 'yes' : 'no'}); deaths ${a.deaths}; pumped ${(a.pumpedOut / 1e6).toFixed(3)} MJ out, ${(a.pumpedIn / 1e6).toFixed(3)} MJ into the bay`,
    };
  },
};
