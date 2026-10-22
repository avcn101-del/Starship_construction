import { createWorld, addRoom, setDemand, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// S3 of physics pass 2 (DESIGN.md 13k.4): heat capacity by thermally coupled mass (13k.1, #240 (1), F9). The one-room
// races of 13k.3, each an M room alone with no radiator (one-sided, as their L1 rows), at T1-T6.
const RACES = {
  reactor: { coupled: 'coupledReactor', threshold: 'Overheated', event: 'overheated' }, // full demand
  beamBay: { coupled: 'coupledBeamBay', threshold: 'Hot', event: 'hot' }, // firing at full, N = 2
  engine: { coupled: 'coupledEngine', threshold: 'Hot', event: 'hot' }, // full throttle
  shieldGenerator: { coupled: 'coupledShieldGenerator', threshold: 'Hot', event: 'hot' }, // absorbing 6 MW at T1 (x edge^2), plus its draw
};
const ABSORB = 6e6; // W at T1, the race of 13k.3; scaled with the tier like the budget (k = 2)
// Hand-worked T1 literals (13k.3): reactor 4 x 5.5e6 x (800 - 290) / 2e7 = 561 s; beam bay 4 x 1.0e6 x 310 / (5e6 / 0.4
// - 5e6) = 165.333 s; engine 6 x 1.4e6 x 310 / (1e7 x 0.3) = 868 s; shield generator 4 x 3.2e6 x 310 / (6e6 + 2e6) = 496 s.
const LITERAL_T1 = { reactor: 561, beamBay: 1240 / 7.5, engine: 868, shieldGenerator: 496 };
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.heat.coupled.v2',
  level: 'L1',
  laws: ['heat capacity by the room type\'s thermally coupled mass: C = cells x thermal.coupled<type> (#240 (1), 13k.1)', 'per-room heat thresholds (#182)', 'square-cube law'],
  dependsOn: [],
  setup: 'an M reactor at full demand, an M beam bay (N = 2) firing at full, an M engine at full throttle and an M shield generator absorbing 6 MW (x edge^2 / 25 m^2) of an incoming beam, each alone with no radiator, from rest, at T1-T6, until the reactor overheats or the others are hot (13k.4 S3)',
  measure: 'the time of the overheated (reactor) or hot (others) event; the heat rate of the first step',
  tolerance: 'time one-sided in [t, t + dt) with the 1e-9 float slack of #185 (2); heat rate 1e-9 relative (it is measured as the difference of the stored heat over one step, whose float resolution is |Q| x 2.2e-16 / (P dt), up to about 1e-11); the T1 literals one-sided in the same window',
  criterion: 're-statement: t = C (T_threshold - T_rest) / P with C = cells x thermal.coupled<type> at the tier (13k.2, k = 3) and P the room\'s heat rate at the tier (reactor reactor.heatPerPower x reactor.power; beam bay beam.power / beambay.efficiency - beam.power; engine engine.powerDraw x engine.heatFraction; shield generator shield.powerDraw + the absorbed 6 MW x edge^2 / 25 m^2), one-sided; the hand-worked T1 literals 561 s, 165.333 s, 868 s, 496 s (13k.3) in the same window; t grows with the edge (C k = 3 over P k = 2): t at T_n = t at T1 x edge / 5 m within dt / t. Successor of the race rows of L1.reactor.power, L1.beambay.heat, L1.engine.thrust and L1.shield.generator (#240, #243) Successor of L1.heat.coupled (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the heat rate of the first step is checked at 1e-9, not 1e-12: it is a difference of two stored heats of about 1e9-1e11 J over one step, not a closed form against the kernel\'s loop (the 13k.4 convention does not apply); nothing else changes.',
  tunable: ['thermal.coupledReactor', 'thermal.coupledBeamBay', 'thermal.coupledEngine', 'thermal.coupledShieldGenerator', 'reactor.power', 'reactor.heatPerPower', 'beam.power', 'beambay.efficiency', 'engine.powerDraw', 'engine.heatFraction', 'shield.powerDraw', 'thermal.plantHot', 'thermal.plantOverheated'],
  locked: { date: '2026-10-22', hash: 'a75e0d55' },
  cases(ctx) {
    const out = [];
    for (const tier of Object.keys(ctx.tiers)) for (const room of Object.keys(RACES)) out.push({ tier, room });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, edge = ctx.tiers[c.tier].edge, s = edge / ctx.baseEdge, v = (q) => ctx.scaled(q, edge), race = RACES[c.room];
    const [w, h] = ROOMS[c.room].footprint.M, C = w * h * v(p.thermal[race.coupled]);
    const P = { reactor: p.reactor.heatPerPower.value * v(p.reactor.power), beamBay: v(p.beam.power) / p.beambay.efficiency.value - v(p.beam.power), engine: v(p.engine.powerDraw) * p.engine.heatFraction.value, shieldGenerator: v(p.shield.powerDraw) + ABSORB * s * s }[c.room];
    const dT = p.thermal[`plant${race.threshold}`].value - ctx.fixed.restTemperature.value;
    return { time: (C * dT) / P, heatRate: P, dt: ctx.dt, literal: c.tier === 'T1' ? LITERAL_T1[c.room] : null };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, s = edge / ctx.baseEdge, world = createWorld({ params: ctx.params, edge, dt: ctx.dt });
    const room = addRoom(world, c.room, { id: c.room, ...(c.room === 'beamBay' ? { length: 2 } : {}) });
    if (c.room === 'reactor') setDemand(world, room, 1);
    if (c.room === 'beamBay') room.beamBay.firing = true;
    if (c.room === 'engine') room.engine.throttle = 1;
    if (c.room === 'shieldGenerator') room.shield.incoming = ABSORB * s * s;
    const Q0 = room.heat.Q;
    step(world);
    const heatRate = (room.heat.Q - Q0) / ctx.dt;
    const ev = () => world.log.events.find((e) => e.type === RACES[c.room].event && e.room === c.room);
    while (!ev() && world.t < 50000) step(world);
    return { time: ev() ? ev().t : null, heatRate, books: heatBooks(room.heat) };
  },
  compare(e, a) {
    const checks = {
      'time to the threshold, one-sided': oneSided(e.time, a.time, e.dt),
      'heat rate of the first step': close(e.heatRate, a.heatRate, 1e-9),
      ...(e.literal !== null ? { 'hand-worked T1 literal, one-sided': oneSided(e.literal, a.time, e.dt) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const scaleOk = rows.filter((r) => r.case.tier !== 'T1').every((r) => {
      const t1 = rows.find((q) => q.case.tier === 'T1' && q.case.room === r.case.room).actual.time, s = ctx.tiers[r.case.tier].edge / ctx.baseEdge;
      return Math.abs(r.actual.time - t1 * s) <= ctx.dt * s + 1e-9 * r.actual.time;
    });
    const booksOk = rows.every((r) => { const b = r.actual.books; return Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.stored)); });
    return [
      { name: 'the race time grows with the edge: t(T_n) = t(T1) x edge / 5 m within dt x edge / 5 m', ok: scaleOk },
      { name: 'consistency invariant (not counted for E3): heat books generated = radiated + stored', ok: booksOk },
    ];
  },
  display(r) {
    return { expected: `t = ${r.expected.time.toFixed(4)} s, heat rate ${(r.expected.heatRate / 1e6).toFixed(6)} MW${r.expected.literal !== null ? ` (literal ${r.expected.literal.toFixed(3)} s)` : ''}`, actual: `t = ${r.actual.time === null ? 'never' : r.actual.time.toFixed(4)} s, heat rate ${(r.actual.heatRate / 1e6).toFixed(6)} MW` };
  },
};
