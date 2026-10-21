import { createWorld, addRoom, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: rows.every((r) => booksOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const firstEvent = (world, type) => world.log.events.find((e) => e.type === type) || null;
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// Radiative cooling from T_s to T_hot with no generation (L1.radiator.cooling's closed form, solved for t).
const coolingTime = (e, Ts) => (e.hot ** -3 - Ts ** -3) / ((3 * e.n * e.emissivity * e.sigma * e.area) / e.C);

export default {
  id: 'L1.room.restart',
  level: 'L1',
  laws: ['an overheated room shuts itself down', 'it restarts when it cools below hot', 'heat can decapitate: an overheated bridge gives no control'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling', 'L1.engine.thrust', 'L1.bridge.control'],
  setup: '(a) "engine": an M engine at full throttle with 2 radiators, powered and controlled, T1, run 6000 s; (b) "bridge": an M bridge with 2 radiators (DESIGN.md 13c.2 row 15, a test rig like the external source: placement is a layout rule) heated by an external 1.1 MW until its overheated event, then the source is off, run until its restart and 10 s more (#189 (3))',
  measure: '(a) shutdown and restart events, the temperature at each shutdown step (T_s) and restart step, thrust and draw in the step after each; (b) the overheated, control-lost, restart and control-restored events, control in every step, T_s, crew deaths',
  tolerance: 'restart time relative 1e-4; thrust relative 1e-9; events and control exact',
  criterion: 'restart time after a shutdown at T_s (the temperature recorded at the shutdown step, the initial condition) t = (T_hot^-3 - T_s^-3) / (3 n emissivity sigma A / C) within 1e-4 relative (about 1259 s from 800 K for the engine, 1412 s from 350 K for the bridge); (a) at overheated the engine shuts down: thrust 0 and draw 0 from the next step; it restarts at the first step with T < hot (T at the step before >= hot) and has full thrust engine.thrust in the next step; shutdown and restart events alternate, at least 2 shutdowns; (b) control false from the overheated step with control-lost cause overheat at that step, false in every step until the restart, true again at the restart step with control-restored, true at the end; no crew deaths (#185 (6), #189 (3))',
  tunable: ['thermal.heatCapacityPerCell', 'thermal.plantHot', 'thermal.plantOverheated', 'thermal.crewedHot', 'thermal.crewedOverheated', 'radiator.area', 'engine.powerDraw', 'engine.heatFraction'],
  locked: null,
  cases() {
    return [{ part: 'engine', n: 2, duration: 6000 }, { part: 'bridge', n: 2, P: 1.1e6, after: 10 }];
  },
  expected(ctx, c) {
    const p = ctx.params, type = c.part, [w, h] = ROOMS[type].footprint.M, cls = ROOMS[type].thermalClass;
    return {
      hot: p.thermal[`${cls}Hot`].value, n: c.n, emissivity: ctx.fixed.radiatorEmissivity.value, sigma: ctx.fixed.stefanBoltzmann.value,
      area: p.radiator.area.value, C: w * h * p.thermal.heatCapacityPerCell.value, tolerance: 1e-4,
      ...(type === 'engine' ? { thrust: p.engine.thrust.value, minShutdowns: 2 } : { lostCause: 'overheat', deaths: 0 }),
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, c.part, { id: c.part });
    const mine = (from) => world.log.events.slice(from).filter((e) => e.room === c.part);
    if (c.part === 'engine') {
      setRadiators(room, c.n);
      room.engine.throttle = 1;
      const cycles = [], order = [];
      let prevT = roomTemperature(room), offAfter = true, onAfter = [], expectOff = false, expectOn = false;
      while (world.t < c.duration) {
        const from = world.log.events.length;
        step(world);
        const T = roomTemperature(room);
        if (expectOff) { offAfter = offAfter && room.engine.thrust === 0 && room.engine.draw === 0; expectOff = false; }
        if (expectOn) { onAfter.push(room.engine.thrust); expectOn = false; }
        for (const e of mine(from)) {
          if (e.type === 'shutdown') { order.push('shutdown'); cycles.push({ shutdown: e.t, Ts: T, restart: null }); expectOff = true; }
          if (e.type === 'restart') { order.push('restart'); Object.assign(cycles[cycles.length - 1] || {}, { restart: e.t, Tr: T, Tbefore: prevT }); expectOn = true; }
        }
        prevT = T;
      }
      return { cycles, order, offAfter, onAfter, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
    }
    room.radiators = c.n; // row 15 (b): a bridge with 2 radiators (setRadiators refuses an inside room: a layout rule, L2/L3)
    room.externalPower = c.P;
    let overheated = null, restart = null, Ts = null, Tr = null, stopAt = Infinity, controlOk = true;
    while (world.t < stopAt && world.t < 10000) {
      const from = world.log.events.length;
      step(world);
      for (const e of mine(from)) {
        if (e.type === 'overheated' && !overheated) { overheated = e.t; Ts = roomTemperature(room); room.externalPower = 0; }
        if (e.type === 'restart' && !restart) { restart = e.t; Tr = roomTemperature(room); stopAt = world.t + c.after; }
      }
      // Control in every step: true before overheated, false from it until the restart, true from the restart on.
      const want = overheated === null || restart !== null;
      controlOk = controlOk && room.bridge.control === want;
    }
    const pick = (type) => world.log.events.filter((e) => e.type === type).map((e) => ({ t: e.t, cause: e.cause }));
    return {
      overheated, restart, Ts, Tr, controlOk, controlAtEnd: room.bridge.control, lost: pick('control-lost'), restored: pick('control-restored'),
      deaths: world.log.events.filter((e) => e.type === 'crew-died').reduce((n, e) => n + e.deaths, 0), books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.part === 'engine') {
      const done = a.cycles.filter((x) => x.restart !== null);
      checks = {
        'events alternate': a.order.every((x, i) => x === (i % 2 ? 'restart' : 'shutdown')),
        'at least 2 shutdowns': a.cycles.length >= e.minShutdowns && done.length >= e.minShutdowns - 1,
        'thrust and draw 0 after shutdown': a.offAfter,
        'restart at the first step below hot': done.every((x) => x.Tr < e.hot && x.Tbefore >= e.hot),
        'full thrust after restart': a.onAfter.length === done.length && a.onAfter.every((f) => close(e.thrust, f, 1e-9)),
        'restart time': done.every((x) => close(coolingTime(e, x.Ts), x.restart - x.shutdown, e.tolerance)),
      };
    } else checks = {
      'control-lost at overheated, cause overheat': a.lost.length === 1 && a.lost[0].t === a.overheated && a.lost[0].cause === e.lostCause,
      'control-restored at restart': a.restored.length === 1 && a.restored[0].t === a.restart,
      'control every step': a.controlOk && a.controlAtEnd === true,
      'restart below hot': a.restart !== null && a.Tr < e.hot,
      'restart time': a.restart !== null && close(coolingTime(e, a.Ts), a.restart - a.overheated, e.tolerance),
      'no crew deaths': a.deaths === e.deaths,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    if (r.case.part === 'engine') {
      const done = a.cycles.filter((x) => x.restart !== null);
      return {
        expected: `>= ${e.minShutdowns} shutdowns, alternating; restart times ${done.map((x) => coolingTime(e, x.Ts).toFixed(3)).join(', ')} s (from T_s ${done.map((x) => x.Ts.toFixed(3)).join(', ')} K); thrust ${(e.thrust / 1e6).toFixed(1)} MN after restart`,
        actual: `${a.cycles.length} shutdowns, ${done.length} restarts [${a.order.join(' ')}]; restart times ${done.map((x) => (x.restart - x.shutdown).toFixed(3)).join(', ')} s; thrust after restart ${a.onAfter.map((f) => (f / 1e6).toFixed(1)).join(', ')} MN; off after shutdown ${a.offAfter ? 'yes' : 'no'}`,
      };
    }
    return {
      expected: `control-lost (${e.lostCause}) at overheated; restart after ${a.Ts === null ? '-' : coolingTime(e, a.Ts).toFixed(3)} s (T_s ${a.Ts === null ? '-' : a.Ts.toFixed(4)} K) with control-restored; no deaths`,
      actual: `overheated ${a.overheated === null ? 'never' : a.overheated.toFixed(4) + ' s'}; control-lost ${a.lost.map((x) => `${x.t.toFixed(4)} s ${x.cause}`).join(', ') || 'none'}; restart ${a.restart === null ? 'never' : a.restart.toFixed(4) + ' s'} (after ${a.restart === null ? '-' : (a.restart - a.overheated).toFixed(3)} s); control-restored ${a.restored.map((x) => `${x.t.toFixed(4)} s ${x.cause}`).join(', ') || 'none'}; control every step ${a.controlOk ? 'ok' : 'NO'}; deaths ${a.deaths}`,
    };
  },
};
