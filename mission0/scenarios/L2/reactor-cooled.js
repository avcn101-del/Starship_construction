import { createWorld, addRoom, setActive, setDemand, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
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

const LIMIT = 3600; // s
const PANELS = 4; // radiators on each hull room
// Neighbour cells around a reactor at [2, 2], each sharing 2 cell pairs (10 m); n = 1 takes the first.
const SIDES = [[4, 2], [0, 2], [2, 0], [2, 4]];
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
// Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js and 13d.1 only.
// A reactor at full demand (heat h P) with n hull rooms on 10 m walls, each radiating PANELS x eps sigma A T^4;
// the reactor shuts down at the end of the step in which T >= overheated (decay heat f h P exp(-(t - t_s) / tau)
// from then, L1), restarts at the end of the step in which T < hot, and melts down at critical (the run ends).
function reference(ctx, n) {
  const p = ctx.params, dt = ctx.dt, h = dt / 10, N = Math.round(LIMIT / dt), cell = p.thermal.heatCapacityPerCell.value;
  const C = [cellsOf('reactor') * cell, ...Array(n).fill(cellsOf('beamBay') * cell)];
  const G = p.conduction.wall.value * 2 * ctx.baseEdge, S = p.reactor.heatPerPower.value * p.reactor.power.value;
  const rad = PANELS * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value;
  const tau = p.reactor.decayTime.value, f = p.reactor.decayFraction.value, th = p.thermal;
  const state = { on: true, decay: [], overheat: null, Ts: null, peak: ctx.fixed.restTemperature.value, meltdown: null, shutdowns: 0 };
  const power = (t) => {
    let P = state.on ? S : 0;
    for (const d of state.decay) P += d.P0 * Math.exp(-(t - d.start) / tau);
    return P;
  };
  const deriv = (t, T) => {
    const d = T.map(() => 0);
    d[0] = power(t);
    for (let k = 1; k < T.length; k++) { const q = G * (T[0] - T[k]); d[0] -= q; d[k] = q - rad * T[k] ** 4; }
    return d.map((x, k) => x / C[k]);
  };
  let T = C.map(() => ctx.fixed.restTemperature.value);
  for (let i = 0; i < N; i++) {
    for (let s = 0; s < 10; s++) {
      const t = i * dt + s * h;
      const k1 = deriv(t, T), k2 = deriv(t + h / 2, T.map((v, j) => v + (h / 2) * k1[j]));
      const k3 = deriv(t + h / 2, T.map((v, j) => v + (h / 2) * k2[j])), k4 = deriv(t + h, T.map((v, j) => v + h * k3[j]));
      T = T.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
    const t = (i + 1) * dt;
    state.peak = Math.max(state.peak, T[0]);
    if (state.on && T[0] >= th.plantOverheated.value) {
      state.on = false; state.shutdowns++;
      state.decay.push({ start: t, P0: f * S });
      if (state.overheat === null) { state.overheat = t; state.Ts = T[0]; }
    } else if (!state.on && T[0] < th.plantHot.value) state.on = true;
    if (T[0] >= th.plantCritical.value) { state.meltdown = t; break; }
  }
  // L1.reactor.scram's closed form from the shutdown: t = -tau ln(1 - C (T_crit - T_s) / (f h P tau)) (n = 0 only).
  const x = (C[0] * (th.plantCritical.value - state.Ts)) / (f * S * tau);
  state.l1Meltdown = n === 0 && x < 1 ? state.overheat - tau * Math.log(1 - x) : null;
  return state;
}

export default {
  id: 'L2.reactor.cooled',
  level: 'L2',
  laws: ['heat conducts through shared walls', 'radiators follow Stefan-Boltzmann', 'fail-safe reactors: decay heat after a shutdown', 'a reactor melts down at critical'],
  dependsOn: ['L2.heat.pair', 'L1.reactor.scram', 'L1.reactor.power', 'L1.radiator.cooling'],
  setup: 'in a cluster at T1, an M reactor at full demand with n in {0, 1, 2, 4} M hull rooms (beam bays switched off) sharing a 10 m wall each, every hull room with 4 radiators; it overheats, shuts down (decay heat), restarts below hot (L1); 3600 s or until it melts down',
  measure: 'the reactor\'s first overheated event (the battle clock of one reactor at full power), its highest temperature, its meltdown event',
  tolerance: 'overheat time, peak temperature and the n = 0 meltdown time 1e-3 relative',
  criterion: 'the reference integrator (RK4 at dt / 10, the shutdown, decay heat and restart of L1 on the step grid) gives the overheat time and the peak reactor temperature within 1e-3 relative; n = 0 melts down at the reference time within 1e-3 relative (L1.reactor.scram\'s closed form from the shutdown); n >= 1 does not melt down in 3600 s (#187 (5), #193, #194)',
  tunable: ['conduction.wall', 'radiator.area', 'thermal.heatCapacityPerCell', 'reactor.power', 'reactor.heatPerPower', 'reactor.decayFraction', 'reactor.decayTime', 'thermal.plantHot', 'thermal.plantOverheated', 'thermal.plantCritical'],
  locked: { date: '2026-10-21', hash: '6c5139ec' },
  cases() {
    return [0, 1, 2, 4].map((n) => ({ n }));
  },
  expected(ctx, c) {
    const r = reference(ctx, c.n);
    return { overheat: r.overheat, peak: r.peak, meltdown: c.n === 0, meltdownAt: r.meltdown, l1Meltdown: r.l1Meltdown, referenceShutdowns: r.shutdowns, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [2, 2] });
    const hull = SIDES.slice(0, c.n).map((cell, k) => addRoom(world, 'beamBay', { id: `hull-${k + 1}`, cell }));
    for (const r of hull) { setActive(world, r, false); setRadiators(r, PANELS, world); }
    setDemand(world, reactor, 1);
    const N = Math.round(LIMIT / ctx.dt);
    let peak = roomTemperature(reactor);
    while (world.step < N && !reactor.exploded) { step(world); peak = Math.max(peak, roomTemperature(reactor)); }
    const mine = (type) => world.log.events.filter((e) => e.room === 'reactor' && e.type === type);
    const over = mine('overheated'), melt = mine('meltdown');
    return {
      overheat: over.length ? over[0].t : null, peak, meltdown: melt.length ? melt[0].t : null, shutdowns: mine('shutdown').length,
      end: world.t, books: [reactor, ...hull].map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const checks = {
      'overheat time': e.overheat !== null && close(e.overheat, a.overheat, e.tolerance),
      'peak temperature': close(e.peak, a.peak, e.tolerance),
      ...(e.meltdown
        ? { 'melts down at the reference time': e.meltdownAt !== null && a.meltdown !== null && close(e.meltdownAt, a.meltdown, e.tolerance) }
        : { 'no meltdown in 3600 s': a.meltdown === null && e.meltdownAt === null }),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null ? 'none' : `${t.toFixed(3)} s`);
    return {
      expected: `overheat ${s(e.overheat)}; peak ${e.peak.toFixed(3)} K; meltdown ${e.meltdown ? `${s(e.meltdownAt)} (L1 closed form ${s(e.l1Meltdown)})` : 'none'}; reference shutdowns ${e.referenceShutdowns}`,
      actual: `overheat ${s(a.overheat)}; peak ${a.peak.toFixed(3)} K; meltdown ${s(a.meltdown)}; shutdowns ${a.shutdowns}; ran to ${a.end.toFixed(1)} s`,
    };
  },
};
