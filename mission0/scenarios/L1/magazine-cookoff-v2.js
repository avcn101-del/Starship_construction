import { createWorld, addRoom, loadMagazine, destroyCell, step, runUntil } from '../../../js/rooms.js';
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

// External test source at T1 (W), scaled by the tier with the heat capacity
// (k = 3) so the cook-off time is the same at every tier; not on a step.
const P_EXT = 1.1e6;

export default {
  id: 'L1.magazine.cookoff.v2',
  level: 'L1',
  laws: ['a magazine explodes by the ammunition left in it', 'HE far more than AP', 'magazines cook off'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an M magazine loaded by mass (fractions of magazine.capacity): all AP, all HE, half and half, half full; M, S and L rounds; heated by an external 1.1 MW x (edge / 5 m)^3 with no radiator, or destroyed by a hit (hit-1, at 1 s); T1, and half and half at T2-T6',
  measure: 'rounds aboard after loading; time, energy and cause of the explosion',
  tolerance: 'counts exact; energy relative 1e-9; cook-off time one-sided (expected <= actual < expected + dt); hit time relative 1e-9',
  criterion: 'counts = floor(mass / round mass of the size) (full: 150 M, 506 S, 44 L at T1); explosion energy = n_AP x charge + n_HE x (charge + he.blastEnergy), with kinetic.chargeEnergy and he.blastEnergy scaled by (2/3)^3 and (3/2)^3 for S and L, exact; cook-off at t = C (T_crit - T_rest) / P one-sided with cause \'heat\'; a hit that destroys a cell sets it off at once, cause the hit; one explosion (#91, #181, #183) Successor of L1.magazine.cookoff (#240, #243, 13k.4 S16): C = cells x thermal.coupledMagazine (0.6 MJ/K per cell, the old value, 13k.2) in place of thermal.heatCapacityPerCell; the times do not change.',
  tunable: ['magazine.capacity', 'kinetic.chargeEnergy', 'he.blastEnergy', 'kinetic.roundMass', 'thermal.coupledMagazine', 'thermal.magazineCritical'],
  locked: { date: '2026-10-22', hash: '69e8b4dc' },
  cases() {
    const out = [];
    for (const [size, ap, he] of [['M', 1, 0], ['M', 0, 1], ['M', 0.5, 0.5], ['M', 0, 0.5], ['S', 1, 0], ['S', 0, 1], ['L', 1, 0], ['L', 0, 1]]) out.push({ tier: 'T1', size, ap, he, by: 'heat' });
    for (const [size, ap, he] of [['M', 0, 1], ['M', 0.5, 0.5], ['S', 1, 0]]) out.push({ tier: 'T1', size, ap, he, by: 'hit' });
    for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) out.push({ tier, size: 'M', ap: 0.5, he: 0.5, by: 'heat' });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, p = ctx.params;
    const s3 = ctx.fixed.sizeLinear.value[c.size] ** 3, cap = v(p.magazine.capacity), m = v(p.kinetic.roundMass) * s3;
    const ap = Math.floor((c.ap * cap) / m), he = Math.floor((c.he * cap) / m);
    const charge = v(p.kinetic.chargeEnergy) * s3, warhead = v(p.he.blastEnergy) * s3;
    const [w, h] = ROOMS.magazine.footprint.M, C = w * h * v(p.thermal.coupledMagazine);
    const t = c.by === 'heat' ? (C * (p.thermal.magazineCritical.value - ctx.fixed.restTemperature.value)) / (P_EXT * s ** 3) : 1;
    return { ap, he, energy: ap * charge + he * (charge + warhead), t, cause: c.by === 'heat' ? 'heat' : 'hit-1', dt: ctx.dt };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, s = edge / ctx.baseEdge;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt });
    const room = addRoom(world, 'magazine');
    const cap = ctx.scaled(ctx.params.magazine.capacity, edge);
    const loaded = { ...loadMagazine(world, room, { size: c.size, apMass: c.ap * cap, heMass: c.he * cap }) };
    if (c.by === 'heat') {
      room.externalPower = P_EXT * s ** 3;
      while (!firstEvent(world, 'explosion') && world.t < 2000) step(world);
      runUntil(world, world.t + 1);
    } else {
      runUntil(world, 1);
      destroyCell(world, room, 0, 'hit-1');
      runUntil(world, 2);
    }
    const explosions = world.log.events.filter((e) => e.type === 'explosion');
    return {
      ap: loaded.ap, he: loaded.he, explosions: explosions.map((e) => ({ t: e.t, energy: e.energy, cause: e.cause })),
      cookOff: !!firstEvent(world, 'cook-off'), books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const x = a.explosions[0];
    const checks = {
      counts: a.ap === e.ap && a.he === e.he, 'one explosion': a.explosions.length === 1,
      energy: !!x && close(e.energy, x.energy, 1e-9), cause: !!x && x.cause === e.cause,
      time: !!x && (c.by === 'heat' ? oneSided(e.t, x.t, e.dt) : close(e.t, x.t, 1e-9)),
      'cook-off event': a.cookOff === (c.by === 'heat'),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const full = (size) => rows.find((r) => r.case.tier === 'T1' && r.case.size === size && r.case.ap === 1 && r.case.by === 'heat').actual.ap;
    return [{ name: 'full AP magazines at T1 hold 150 M, 506 S, 44 L rounds', ok: full('M') === 150 && full('S') === 506 && full('L') === 44 }, ...common(rows)];
  },
  display(r) {
    const e = r.expected, a = r.actual, mj = (x) => (x / 1e6).toFixed(3) + ' MJ';
    return {
      expected: `${e.ap} AP + ${e.he} HE; ${mj(e.energy)} at ${e.t.toFixed(4)} s, cause ${e.cause}`,
      actual: `${a.ap} AP + ${a.he} HE; ${a.explosions.map((x) => `${mj(x.energy)} at ${x.t.toFixed(4)} s, cause ${x.cause}`).join('; ') || 'no explosion'}`,
    };
  },
};
