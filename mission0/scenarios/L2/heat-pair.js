import { createWorld, addRoom, setActive, runUntil, roomTemperature } from '../../../js/rooms.js';
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

// Closed form of two rooms exchanging heat through one wall (13d.1), from data.js only:
// C = cells x heatCapacityPerCell (k = 3), G = conduction.wall (k = 1) x L x 2 f_a f_b / (f_a + f_b),
// tau = C_a C_b / ((C_a + C_b) G), Delta T(t) = Delta T0 exp(-t / tau).
function pair(ctx, c) {
  const p = ctx.params, edge = ctx.tiers[c.tier].edge, [w, h] = ROOMS.beamBay.footprint.M, [wh, hh] = ROOMS.hold.footprint.M;
  const Ca = w * h * ctx.scaled(p.thermal.heatCapacityPerCell, edge);
  const Cb = (c.pair === 'hold' ? wh * hh : w * h) * ctx.scaled(p.thermal.heatCapacityPerCell, edge);
  const fb = c.pair === 'hold' ? p.conduction.holdFactor.value : 1;
  const L = c.pairs * edge, G = ctx.scaled(p.conduction.wall, edge) * L * ((2 * 1 * fb) / (1 + fb));
  const tau = (Ca * Cb) / ((Ca + Cb) * G);
  return { Ca, Cb, G, L, tau, duration: 4 * tau, dT0: c.Ta - ctx.fixed.restTemperature.value, edge };
}

export default {
  id: 'L2.heat.pair',
  level: 'L2',
  laws: ['heat conducts through shared walls', 'an empty hold insulates', 'energy conservation'],
  dependsOn: ['L1.radiator.cooling', 'L1.room.thresholds'],
  setup: 'two idle M rooms side by side in a cluster (a beam bay switched off at T_a in {400, 600, 1000 K}, beside a second beam bay switched off or an empty hold at 290 K), sharing a wall of 1 or 2 cell pairs (5 or 10 m at T1), no radiators, run 4 tau; T1, and T1-T6 for T_a = 1000 K over 2 pairs between two ordinary rooms',
  measure: 'T_a - T_b after every step against the closed form; C_a T_a + C_b T_b after every step; tau fitted at the end, -t / ln(Delta T / Delta T0)',
  tolerance: 'Delta T: 1e-3 of Delta T0 at every step; energy: 1e-12 relative; tau across tiers: 1e-3 relative',
  criterion: 'Delta T(t) = Delta T0 exp(-t / tau), tau = C_a C_b / ((C_a + C_b) G), G = conduction.wall x L x 2 f_a f_b / (f_a + f_b) (hold factor conduction.holdFactor), |Delta T - closed form| <= 1e-3 Delta T0 at every step; C_a T_a + C_b T_b constant to 1e-12 relative at every step; tau proportional to the edge across T1-T6 (the fitted tau over its T1 value = edge / 5 m within 1e-3) (#193, #194)',
  tunable: ['conduction.wall', 'conduction.holdFactor', 'thermal.heatCapacityPerCell'],
  locked: { date: '2026-10-21', hash: '9f0da2d3' },
  cases() {
    const out = [];
    for (const Ta of [400, 600, 1000]) for (const pairs of [1, 2]) for (const p of ['ordinary', 'hold']) out.push({ tier: 'T1', Ta, pairs, pair: p });
    for (const tier of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) out.push({ tier, Ta: 1000, pairs: 2, pair: 'ordinary', sweep: 'tier' });
    return out;
  },
  expected(ctx, c) {
    const x = pair(ctx, c);
    return { tau: x.tau, duration: x.duration, dT0: x.dT0, edgeRatio: x.edge / ctx.baseEdge, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const x = pair(ctx, c), edge = x.edge;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers[c.tier].grid });
    const a = addRoom(world, 'beamBay', { id: 'a', cell: [0, 0], temperature: c.Ta });
    const b = addRoom(world, c.pair === 'hold' ? 'hold' : 'beamBay', { id: 'b', cell: [2, c.pairs === 2 ? 0 : 1] });
    setActive(world, a, false);
    if (c.pair !== 'hold') setActive(world, b, false);
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
    const dT = roomTemperature(a) - roomTemperature(b);
    return {
      t: world.t, dT, maxDeviation, maxEnergy, tauFit: -world.t / Math.log(dT / x.dT0),
      books: [heatBooks(a.heat), heatBooks(b.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const checks = {
      'Delta T at every step': Number.isFinite(a.maxDeviation) && a.maxDeviation <= e.tolerance,
      'energy constant': Number.isFinite(a.maxEnergy) && a.maxEnergy <= 1e-12,
      'ran 4 tau': a.t >= e.duration - 1e-9 * e.duration,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const sweep = rows.filter((r) => r.case.sweep === 'tier');
    const t1 = sweep.find((r) => r.case.tier === 'T1');
    return [
      { name: 'tau proportional to the edge across T1-T6 (fitted tau / T1 fitted tau = edge / 5 m, 1e-3)', ok: sweep.length === 6 && !!t1 && sweep.every((r) => close(r.expected.edgeRatio, r.actual.tauFit / t1.actual.tauFit, 1e-3)) },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `tau ${e.tau.toFixed(4)} s, run ${e.duration.toFixed(3)} s; |dT - dT0 exp(-t/tau)| <= ${e.tolerance} x ${e.dT0} K; energy to 1e-12`,
      actual: `dT(${a.t.toFixed(3)} s) ${a.dT.toFixed(6)} K, max deviation ${a.maxDeviation.toExponential(2)} dT0; energy drift ${a.maxEnergy.toExponential(2)}; fitted tau ${a.tauFit.toFixed(4)} s`,
    };
  },
};
