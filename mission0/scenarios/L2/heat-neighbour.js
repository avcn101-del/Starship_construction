import { createWorld, addRoom, setDemand, setPower, loadMagazine, step, roomTemperature } from '../../../js/rooms.js';
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

const LIMIT = 900; // s
const hmean = (a, b) => (2 * a * b) / (a + b);
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
function setupOf(ctx, c) {
  const p = ctx.params, th = p.thermal, cls = ROOMS[c.neighbour].thermalClass;
  const cell = p.thermal.heatCapacityPerCell.value, L = c.pairs * ctx.baseEdge;
  return {
    Ca: cellsOf('reactor') * cell, Ch: cellsOf('hold') * cell, Cb: cellsOf(c.neighbour) * cell,
    S: p.reactor.heatPerPower.value * c.d * p.reactor.power.value, // the reactor's heat at demand d (L1)
    G: p.conduction.wall.value * L, Gh: p.conduction.wall.value * L * hmean(1, p.conduction.holdFactor.value),
    crit: th[`${cls}Critical`].value, over: th.plantOverheated.value, hot: th.plantHot.value, critA: th.plantCritical.value,
    f: p.reactor.decayFraction.value, tau: p.reactor.decayTime.value, rest: ctx.fixed.restTemperature.value,
  };
}
// (a, b) Two rooms, constant source S in the reactor (closed form): 1/tau_w = G (1/C_a + 1/C_b),
// Delta(t) = (S tau_w / C_a)(1 - exp(-t / tau_w)), Q(t) = (C_a + C_b) T0 + S t,
// T_a = (Q + C_b Delta) / (C_a + C_b), T_b = (Q - C_a Delta) / (C_a + C_b).
function twoRoom(x) {
  const tw = 1 / (x.G * (1 / x.Ca + 1 / x.Cb)), Ct = x.Ca + x.Cb;
  const D = (t) => ((x.S * tw) / x.Ca) * (1 - Math.exp(-t / tw)), Q = (t) => Ct * x.rest + x.S * t;
  return { Ta: (t) => (Q(t) + x.Cb * D(t)) / Ct, Tb: (t) => (Q(t) - x.Ca * D(t)) / Ct };
}
/** Root of an increasing f(t) = target on [0, hi] by bisection, or null. */
function root(f, target, hi) {
  if (f(hi) < target) return null;
  let lo = 0;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(mid) >= target) hi = mid; else lo = mid; }
  return hi;
}
// (c) Reference integrator (13d.2): RK4 at dt / 10 inside each step of dt, from data.js and 13d.1 only.
// Reactor | hold | neighbour; the reactor's heat h d P while running; it shuts down at the end of the
// step in which T >= overheated (decay heat f h d P exp(-(t - t_s) / tau) from then, L1) and restarts at
// the end of the step in which T < hot; the run stops when the neighbour reaches its critical.
function reference(ctx, x) {
  const C = [x.Ca, x.Ch, x.Cb], dt = ctx.dt, h = dt / 10, N = Math.round(LIMIT / dt);
  const state = { on: true, decay: [], overheat: null, max: x.rest, critical: null, meltdown: null };
  const power = (t) => {
    let P = state.on ? x.S : 0;
    for (const d of state.decay) P += d.P0 * Math.exp(-(t - d.start) / x.tau);
    return P;
  };
  const deriv = (t, T) => {
    const q1 = x.Gh * (T[0] - T[1]), q2 = x.Gh * (T[1] - T[2]);
    return [(power(t) - q1) / C[0], (q1 - q2) / C[1], q2 / C[2]];
  };
  let T = [x.rest, x.rest, x.rest];
  for (let n = 0; n < N; n++) {
    for (let s = 0; s < 10; s++) {
      const t = n * dt + s * h;
      const k1 = deriv(t, T), k2 = deriv(t + h / 2, T.map((v, i) => v + (h / 2) * k1[i]));
      const k3 = deriv(t + h / 2, T.map((v, i) => v + (h / 2) * k2[i])), k4 = deriv(t + h, T.map((v, i) => v + h * k3[i]));
      T = T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    const t = (n + 1) * dt;
    state.max = Math.max(state.max, T[2]);
    if (state.on && T[0] >= x.over) { state.on = false; state.decay.push({ start: t, P0: x.f * x.S }); if (state.overheat === null) state.overheat = t; }
    else if (!state.on && T[0] < x.hot) state.on = true;
    if (T[0] >= x.critA && state.meltdown === null) state.meltdown = t;
    if (T[2] >= x.crit) { state.critical = t; break; }
  }
  return { ...state, T };
}

export default {
  id: 'L2.heat.neighbour',
  level: 'L2',
  laws: ['heat conducts through shared walls', 'a magazine cooks off', 'crew die at critical heat', 'an empty hold insulates'],
  dependsOn: ['L2.heat.pair', 'L1.room.thresholds', 'L1.magazine.cookoff'],
  setup: 'in a cluster at T1, an M reactor at demand d in {0.25, 0.5} (delivered on demand, L1) beside (a) an M magazine full of M HE rounds or (b) M crew quarters, unpowered (its own 50 kW draw would be a second source), sharing a wall of 1 or 2 cell pairs (5 or 10 m); (c) the same with an M empty hold between them, both walls 1 or 2 pairs; no radiators; until the neighbour reaches its critical, the reactor overheats ((a, b) only) or 900 s',
  measure: '(a, b) the time and kind of the first of: the neighbour\'s critical event (magazine cook-off; quarters crew deaths), the reactor\'s overheated event; (c) the reactor\'s first overheated event, the neighbour\'s highest temperature and its temperature at the end, whether it reached its critical',
  tolerance: '(a, b) time 1e-3 relative; (c) overheat time 1e-3 relative, neighbour temperatures 1e-3 K',
  criterion: '(a, b) the linear two-room solution with a constant source h d P in the reactor gives the time the neighbour reaches its critical (magazine 450 K: cook-off; quarters 380 K: all its crew die) as a root of the closed form, within 1e-3 relative, and it comes before the reactor\'s overheated; (c) the reactor overheats first and the neighbour stays below its critical through 900 s; the overheat time, the neighbour\'s highest and final temperatures match the reference integrator (RK4 at dt / 10, the shutdown, decay heat and restart of L1 on the step grid) within 1e-3 relative and 1e-3 K (#182, #193, #194)',
  tunable: ['conduction.wall', 'conduction.holdFactor', 'thermal.heatCapacityPerCell', 'reactor.power', 'reactor.heatPerPower', 'thermal.magazineCritical', 'thermal.crewedCritical', 'thermal.plantOverheated'],
  locked: { date: '2026-10-21', hash: 'a28270cd' },
  cases() {
    const out = [];
    for (const neighbour of ['magazine', 'quarters']) for (const d of [0.25, 0.5]) for (const between of ['wall', 'hold']) for (const pairs of [1, 2]) out.push({ neighbour, d, between, pairs });
    return out;
  },
  expected(ctx, c) {
    const x = setupOf(ctx, c);
    if (c.between === 'wall') {
      const s = twoRoom(x), tb = root(s.Tb, x.crit, LIMIT), ta = root(s.Ta, x.over, LIMIT);
      const first = tb !== null && (ta === null || tb < ta) ? 'neighbour' : ta !== null ? 'reactor' : 'none';
      return { first: 'neighbour', closedFormFirst: first, time: tb, reactorOverheat: ta, crit: x.crit, crew: c.neighbour === 'quarters' ? ctx.params.quarters.crewPerCell.value * cellsOf('quarters') : null, tolerance: 1e-3 };
    }
    const r = reference(ctx, x);
    return { first: 'reactor', belowCritical: true, overheat: r.overheat, max: r.max, end: r.T[2], referenceCritical: r.critical, crit: x.crit, tolerance: 1e-3 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 0] });
    const y = c.pairs === 2 ? 0 : 1;
    const rooms = [reactor];
    let at = [2, y];
    if (c.between === 'hold') { rooms.push(addRoom(world, 'hold', { id: 'hold', cell: at })); at = [4, y + (c.pairs === 2 ? 0 : 1)]; }
    const nb = addRoom(world, c.neighbour, { id: 'neighbour', cell: at, rotation: c.neighbour === 'quarters' ? 90 : 0 });
    rooms.push(nb);
    if (c.neighbour === 'magazine') loadMagazine(world, nb, { size: 'M', heMass: ctx.params.magazine.capacity.value });
    else setPower(world, nb, false);
    setDemand(world, reactor, c.d);
    const N = Math.round(LIMIT / ctx.dt);
    const find = (room, type) => world.log.events.find((e) => e.room === room && e.type === type) || null;
    let max = roomTemperature(nb);
    while (world.step < N) {
      step(world);
      max = Math.max(max, roomTemperature(nb));
      if (find('neighbour', 'critical')) break;
      if (c.between === 'wall' && find('reactor', 'overheated')) break;
    }
    const crit = find('neighbour', 'critical'), over = find('reactor', 'overheated');
    const cook = find('neighbour', 'cook-off'), died = world.log.events.filter((e) => e.room === 'neighbour' && e.type === 'crew-died' && e.cause === 'heat');
    const first = crit && (!over || crit.t <= over.t) ? 'neighbour' : over ? 'reactor' : 'none';
    return {
      first, t: world.t, critical: crit ? crit.t : null, overheat: over ? over.t : null, max, end: roomTemperature(nb),
      cookOff: cook ? cook.t : null, deaths: died.reduce((n, e) => n + e.deaths, 0),
      books: rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.between === 'wall') {
      checks = {
        'neighbour critical first': e.closedFormFirst === 'neighbour' && a.first === 'neighbour',
        'time of the neighbour\'s critical': e.time !== null && close(e.time, a.critical, e.tolerance),
        ...(c.neighbour === 'magazine' ? { 'cook-off at critical': a.cookOff !== null && a.cookOff === a.critical } : { 'all crew die at critical': a.deaths === e.crew }),
      };
    } else {
      checks = {
        'reactor overheats first': a.overheat !== null && (a.critical === null || a.overheat < a.critical),
        'overheat time': e.overheat !== null && close(e.overheat, a.overheat, e.tolerance),
        'neighbour below critical through 900 s': a.critical === null && a.max < e.crit,
        'neighbour highest temperature': Math.abs(a.max - e.max) <= e.tolerance,
        'neighbour final temperature': Math.abs(a.end - e.end) <= e.tolerance,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, s = (t) => (t === null ? 'never' : `${t.toFixed(3)} s`);
    if (r.case.between === 'wall') return {
      expected: `neighbour critical (${e.crit} K) at ${s(e.time)} (closed form; reactor overheat ${s(e.reactorOverheat)}, first: ${e.closedFormFirst})`,
      actual: `first ${a.first}: neighbour critical ${s(a.critical)}, reactor overheated ${s(a.overheat)}; ${r.case.neighbour === 'magazine' ? `cook-off ${s(a.cookOff)}` : `crew deaths ${a.deaths}`}`,
    };
    return {
      expected: `reactor overheats at ${s(e.overheat)}; neighbour below ${e.crit} K through 900 s (reference: highest ${e.max.toFixed(4)} K, end ${e.end.toFixed(4)} K, critical ${s(e.referenceCritical)})`,
      actual: `reactor overheated ${s(a.overheat)}; neighbour highest ${a.max.toFixed(4)} K, at ${a.t.toFixed(3)} s ${a.end.toFixed(4)} K, critical ${s(a.critical)}`,
    };
  },
};
