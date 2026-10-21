import { createWorld, addRoom, setActive, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
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

const PANELS = 4, LIMIT = 5000, AFTER = 10; // radiators on the hull room; s
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
// Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js and 13d.1 only. An M bridge
// (its own draw bridge.powerDraw is heat while it runs, L1) heated by an external P until the end of the step
// in which it reaches crewed overheated (it shuts down and the source goes off), cooling through a 10 m wall
// into an M hull room that radiates PANELS x eps sigma A T^4; it restarts at the end of the step in which T < hot.
function reference(ctx, c) {
  const p = ctx.params, th = p.thermal, dt = ctx.dt, h = dt / 10, cell = p.thermal.heatCapacityPerCell.value;
  const C = [cellsOf('bridge') * cell, cellsOf('beamBay') * cell], G = p.conduction.wall.value * 2 * ctx.baseEdge;
  const rad = PANELS * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value;
  const draw = p.bridge.powerDraw.value, st = { shutdown: false, external: true, overheat: null, restart: null };
  const deriv = (T) => {
    const q = G * (T[0] - T[1]), P = (st.external ? c.P : 0) + (st.shutdown ? 0 : draw);
    return [(P - q) / C[0], (q - rad * T[1] ** 4) / C[1]];
  };
  let T = [ctx.fixed.restTemperature.value, ctx.fixed.restTemperature.value];
  for (let n = 0; n < Math.round(LIMIT / dt) && st.restart === null; n++) {
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
  id: 'L2.bridge.conduction',
  level: 'L2',
  laws: ['heat conducts through shared walls', 'an overheated room shuts itself down and restarts below hot', 'heat can decapitate: an overheated bridge gives no control'],
  dependsOn: ['L2.heat.pair', 'L1.room.restart', 'L1.bridge.control'],
  setup: 'in a cluster at T1, an M bridge (no radiator: it is placed inside) beside an M hull room (a beam bay switched off) with 4 radiators over a 10 m wall; an external 1.1 MW heats the bridge until its overheated event, then the source is off; run until its restart and 10 s more (replaces the radiator fixture of #190 (2))',
  measure: 'the overheated, control-lost, restart and control-restored events; control in every step; crew deaths; whether the bridge can take a radiator',
  tolerance: 'overheat and restart times 1e-3 relative; events and control exact',
  criterion: 'control lost at overheat (control-lost, cause overheat, at the overheated step) and restored at the restart (control-restored, cause restart); control false in every step from the overheat to the restart, true before and after; overheat time and restart time after the overheat by the reference integrator (RK4 at dt / 10, the L1 shutdown and restart on the step grid) within 1e-3 relative; no radiator on the bridge (setting one is refused); no crew deaths (#185 (6), #190 (2), #193, #194)',
  tunable: ['conduction.wall', 'radiator.area', 'thermal.heatCapacityPerCell', 'thermal.crewedHot', 'thermal.crewedOverheated', 'bridge.powerDraw'],
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
    const hull = addRoom(world, 'beamBay', { id: 'hull', cell: [2, 0] });
    setActive(world, hull, false);
    setRadiators(hull, PANELS, world);
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
    return {
      overheated, restart, controlOk, controlAtEnd: bridge.bridge.control, lost: pick('control-lost'), restored: pick('control-restored'),
      radiators: bridge.radiators, refused, end: [roomTemperature(bridge), roomTemperature(hull)],
      deaths: world.log.events.filter((e) => e.type === 'crew-died').reduce((n, e) => n + e.deaths, 0),
      books: [heatBooks(bridge.heat), heatBooks(hull.heat)], eventsOk: eventsOk(world.log.events),
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
      actual: `overheated ${s(a.overheated)}, restart ${a.restart === null ? 'never' : s(a.restart - a.overheated)} later; control-lost ${a.lost.map((x) => `${x.t.toFixed(3)} s ${x.cause}`).join(', ') || 'none'}; restored ${a.restored.map((x) => `${x.t.toFixed(3)} s ${x.cause}`).join(', ') || 'none'}; control every step ${a.controlOk ? 'ok' : 'NO'}; radiators ${a.radiators} (refused ${a.refused ? 'yes' : 'no'}); deaths ${a.deaths}`,
    };
  },
};
