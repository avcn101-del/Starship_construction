import { createWorld, addRoom, setDemand, setControl, step, roomTemperature } from '../../../js/rooms.js';
import { ROOMS } from '../../../js/data.js';

// S10 of physics pass 2 (DESIGN.md 13k.4): the SCRAM restart of #82 (13k.1), an automatic rule. An M reactor alone at
// T1 at demand 0.5 (10 MW) loses control at 1 s (it SCRAMs) and, depending on the case, gets it back.
const SCRAM_AT = 1; // s
const CASES = {
  cold: { T0: 290, back: [5], lost: [], external: 0 }, // back at 5 s, from rest
  never: { T0: 290, back: [], lost: [], external: 0 }, // control never comes back
  hot: { T0: 650, back: [5], lost: [], external: -5e6 }, // back at 5 s while above hot; a 5 MW heat sink (negative external power) cools it
  again: { T0: 290, back: [5, 40], lost: [30], external: 0 }, // back at 5 s, lost again at 30 s, back at 40 s
};
const LIMIT = 400; // s
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.reactor.restart',
  level: 'L1',
  laws: ['a SCRAMmed reactor restarts reactor.restartTime after control is back, once below hot (#82, 13k.1)', 'fail-safe reactors: losing control SCRAMs a reactor (#81)'],
  dependsOn: [],
  setup: 'an M reactor alone at T1 at demand 0.5, no radiator, control lost at 1 s (SCRAM); (cold) from rest, control back at 5 s; (never) control never back; (hot) from 650 K (above plant hot, 600 K) with -5 MW of external power from the start, control back at 5 s; (again) from rest, control back at 5 s, lost at 30 s, back at 40 s; 400 s (13k.4 S10)',
  measure: 'the reactor-restart events; the start of the first step after the SCRAM in which it delivers power again; its temperature then',
  tolerance: 'times one-sided in [t, t + dt) with the 1e-9 float slack of #185 (2); the hot case\'s crossing by the scenario\'s own bisection to 1e-9 s',
  criterion: 'it delivers nothing from the SCRAM until it restarts (not before); it restarts at the later of (the last time control came back + reactor.restartTime) and the first time its temperature falls below plant hot, one-sided, and delivers from then; never while control is lost; re-statement for (hot): T(t) = T0 + (h d P x 1 s + f h d P tau (1 - e^(-(t - 1 s) / tau)) - 5 MW x t) / C with C = 4 x thermal.coupledReactor, crossing 600 K by bisection; hand-worked literals: (cold) 5 + 60 = 65 s, (again) 40 + 60 = 100 s, (never) no restart (#81, #82, #243)',
  tunable: ['reactor.restartTime', 'reactor.power', 'reactor.decayFraction', 'reactor.decayTime', 'thermal.coupledReactor', 'thermal.plantHot'],
  locked: null,
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    const x = CASES[c.name], p = ctx.params, r = p.reactor;
    if (!x.back.length) return { restart: null, dt: ctx.dt };
    const backAt = x.back[x.back.length - 1] + r.restartTime.value;
    if (c.name === 'cold') return { restart: backAt, literal: 65, dt: ctx.dt };
    if (c.name === 'again') return { restart: backAt, literal: 100, dt: ctx.dt };
    const [w, h] = ROOMS.reactor.footprint.M, C = w * h * p.thermal.coupledReactor.value, P = 0.5 * r.power.value * r.heatPerPower.value, tau = r.decayTime.value, f = r.decayFraction.value;
    const T = (t) => x.T0 + (P * SCRAM_AT + f * P * tau * (1 - Math.exp(-(t - SCRAM_AT) / tau)) + x.external * t) / C;
    let lo = SCRAM_AT, hi = LIMIT;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (T(mid) >= p.thermal.plantHot.value) lo = mid; else hi = mid; }
    return { restart: Math.max(backAt, hi), dt: ctx.dt };
  },
  run(ctx, c) {
    const x = CASES[c.name], world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'reactor', { id: 'reactor', temperature: x.T0 });
    room.externalPower = x.external;
    setDemand(world, room, 0.5);
    const events = [...x.lost.map((t) => ({ t, on: false })), ...x.back.map((t) => ({ t, on: true })), { t: SCRAM_AT, on: false }].sort((a, b) => a.t - b.t);
    let k = 0, firstDelivery = null, deliveredWhileOff = false, T = null;
    while (world.t < LIMIT) {
      while (k < events.length && world.t >= events[k].t - 1e-9) { setControl(world, room, events[k].on, 'control-loss'); k++; }
      const t0 = world.t;
      step(world);
      const delivering = room.reactor.delivered > 0;
      if (t0 >= SCRAM_AT && delivering && firstDelivery === null) { firstDelivery = t0; T = roomTemperature(room); }
      if (t0 >= SCRAM_AT && delivering && !room.controlled) deliveredWhileOff = true;
    }
    const restarts = world.log.events.filter((e) => e.type === 'reactor-restart').map((e) => e.t);
    return { restarts, firstDelivery, deliveredWhileOff, T };
  },
  compare(e, a) {
    const checks = { 'never delivers while control is lost': !a.deliveredWhileOff };
    if (e.restart === null) Object.assign(checks, { 'no restart, no delivery': a.restarts.length === 0 && a.firstDelivery === null });
    else Object.assign(checks, {
      'one restart, one-sided': a.restarts.length === 1 && oneSided(e.restart, a.restarts[0], e.dt),
      'delivers again from the restart (not before)': a.firstDelivery !== null && a.firstDelivery === a.restarts[0],
      ...(e.literal ? { 'hand-worked literal, one-sided': oneSided(e.literal, a.restarts[0], e.dt) } : {}),
    });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const s = (t) => (t === null || t === undefined ? 'never' : `${t.toFixed(4)} s`);
    return { expected: `restart ${s(r.expected.restart)}`, actual: `restarts ${r.actual.restarts.map(s).join(', ') || 'none'}; delivers again from ${s(r.actual.firstDelivery)}${r.actual.T === null ? '' : ` at ${r.actual.T.toFixed(3)} K`}` };
  },
};
