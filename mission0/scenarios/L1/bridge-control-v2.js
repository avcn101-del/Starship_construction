import { createWorld, addRoom, setPower, destroyCell, step, runUntil } from '../../../js/rooms.js';
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

export default {
  id: 'L1.bridge.control.v2',
  level: 'L1',
  laws: ['the bridge provides control', 'its own backup supply', 'decapitation only by destruction'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'a bridge alone at T1, no radiator: "powered" (reactor power on) and "cut" (power cut at t = 0) run until hot; "destroyed": cells destroyed one per second by hit-1 ... hit-4 at t = 1 ... 4 s',
  measure: 'control; heat rate in the first step and the supply that fed it; time of the hot event; control after each hit and the control-lost event',
  tolerance: 'relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'control = true while any cell survives; power cut -> still true (backup supply, #147), drawn from the backup; heat rate = bridge.powerDraw; time to hot t = C (T_hot - T_rest) / draw one-sided; destroyed -> false at the last cell, event control-lost with the destroying hit (hit-4) as cause, at its time (#82, #147, #181, #183) Successor of L1.bridge.control (#240, #243, 13k.4 S16): C = cells x thermal.coupledCrewed (0.6 MJ/K per cell, the old value, 13k.2) in place of thermal.heatCapacityPerCell; the times do not change.',
  tunable: ['bridge.powerDraw', 'thermal.coupledCrewed', 'thermal.crewedHot'],
  locked: { date: '2026-10-22', hash: '89553ba4' },
  cases() {
    return [{ mode: 'powered' }, { mode: 'cut' }, { mode: 'destroyed' }];
  },
  expected(ctx, c) {
    const [w, h] = ROOMS.bridge.footprint.M, cells = w * h, draw = ctx.params.bridge.powerDraw.value;
    const C = cells * ctx.params.thermal.coupledCrewed.value;
    if (c.mode === 'destroyed') return { controlAfterHits: Array.from({ length: cells }, (_, i) => i < cells - 1), lost: { t: cells, cause: `hit-${cells}` } };
    return { control: true, heatRate: draw, backup: c.mode === 'cut', hot: (C * (ctx.params.thermal.crewedHot.value - ctx.fixed.restTemperature.value)) / draw, dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'bridge'), b = room.bridge;
    if (c.mode === 'destroyed') {
      const controlAfterHits = [];
      for (let j = 1; j <= room.cells.length; j++) {
        runUntil(world, j);
        destroyCell(world, room, j - 1, `hit-${j}`);
        controlAfterHits.push(b.control);
      }
      runUntil(world, world.t + 1);
      const lost = world.log.events.filter((e) => e.type === 'control-lost').map((e) => ({ t: e.t, cause: e.cause }));
      return { controlAfterHits, lost, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
    }
    if (c.mode === 'cut') setPower(world, room, false);
    const Q = room.heat.Q;
    step(world);
    const heatRate = (room.heat.Q - Q) / ctx.dt;
    while (!firstEvent(world, 'hot') && world.t < 5000) step(world);
    const hot = firstEvent(world, 'hot');
    return {
      control: b.control, heatRate, fromBackup: b.fromBackup, fromReactor: b.fromReactor, hot: hot ? hot.t : null,
      lost: world.log.events.filter((e) => e.type === 'control-lost').length, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.mode === 'destroyed') checks = {
      'control after each hit': a.controlAfterHits.length === e.controlAfterHits.length && a.controlAfterHits.every((x, i) => x === e.controlAfterHits[i]),
      'control-lost': a.lost.length === 1 && a.lost[0].cause === e.lost.cause && close(e.lost.t, a.lost[0].t, 1e-9),
    };
    else checks = {
      control: a.control === true && a.lost === 0, 'heat rate': close(e.heatRate, a.heatRate, 1e-9),
      supply: e.backup ? a.fromBackup > 0 && a.fromReactor === 0 : a.fromReactor > 0 && a.fromBackup === 0, hot: oneSided(e.hot, a.hot, e.dt),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    if (r.case.mode === 'destroyed') return {
      expected: `control after hits [${e.controlAfterHits.join(', ')}]; control-lost at ${e.lost.t} s by ${e.lost.cause}`,
      actual: `control after hits [${a.controlAfterHits.join(', ')}]; ${a.lost.map((x) => `control-lost at ${x.t.toFixed(4)} s by ${x.cause}`).join(', ') || 'no control-lost'}`,
    };
    return {
      expected: `control yes; heat ${(e.heatRate / 1e3).toFixed(3)} kW from the ${e.backup ? 'backup' : 'reactor'}; hot ${e.hot.toFixed(4)} s`,
      actual: `control ${a.control ? 'yes' : 'no'}; heat ${(a.heatRate / 1e3).toFixed(3)} kW (reactor ${(a.fromReactor / 1e6).toFixed(3)} MJ, backup ${(a.fromBackup / 1e6).toFixed(3)} MJ); hot ${a.hot === null ? 'never' : a.hot.toFixed(4) + ' s'}`,
    };
  },
};
