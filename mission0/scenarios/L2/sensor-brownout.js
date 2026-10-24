import { createWorld, addRoom, addFitting, enableShip, enablePowerRouting, setDemand, step } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan, antennas, sourcesOf } from '../../../js/sensors.js';
import { TARGETS } from '../../targets.js';

// L2.sensor.brownout (DESIGN.md 13n.4 H13, §17 item 45 (b), #193, #290 (3), #301 (6)): a scan under a browned-out
// host progresses and radiates at the host's power fraction f: each step's progress is f x dt / (sensor.scanTime x
// (d / sensor.scanRange)^4) and the antenna's EM brightness f x sensor.scanPower.
//
// Setup (T1, at rest): the target R1 at the origin heading 0 (buildShip, grid corner at the origin); the observer of
// L3.sensor.control's power case, heading 0 with its grid corner at (0, -900): a reactor at [0, 0], a bridge at [2, 0],
// a hold at [4, 0] in a row, power routed, an antenna on the -y edge of the hold's cell (5, 0) (grid (27.5, 0) m)
// scanning R1's zone 1 from the first step; the reactor at demand 1, or at demand 0.0025 (50 kW of its 20 MW, half the
// scan's 100 kW: the hold, the only consumer, gets f = 0.5).
// Hand-worked: d^2 = 2.5^2 + 907.5^2 = 823 562.5 m^2 from the antenna (27.5, -900) to zone 1's centre (30, 7.5) (S6),
// (d / 900)^4 = 1.0337680, so a step adds f x (1/60) / (4 x 1.0337680) = f x 0.00403056 of progress: at f = 1 the zone
// resolves after step ceil(248.10) = 249, at f = 0.5 after ceil(496.20) = 497; the antenna's EM source is 1e5 W x f
// (100 kW, 50 kW). f is the host's kernel power fraction (labelled), checked to be 1 and 0.5 within 1e-12.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

function observer(params, demand) {
  const w = createWorld({ params, edge: 5, dt: 1 / 60, grid: [30, 14] });
  addRoom(w, 'reactor', { id: 'reactor', cell: [0, 0] });
  addRoom(w, 'bridge', { id: 'bridge', cell: [2, 0] });
  addRoom(w, 'hold', { id: 'hold', cell: [4, 0] });
  addFitting(w, 'antenna', 'hold', [5, 0], [0, -1]);
  enablePowerRouting(w);
  setDemand(w, w.rooms[0], demand);
  enableShip(w, { origin: [0, -900], heading: 0 });
  return w;
}

export default {
  id: 'L2.sensor.brownout',
  level: 'L2',
  laws: ['a scan under a browned-out host progresses and radiates at the host\'s power fraction (#193, §17 item 45 (b), #301 (6))'],
  dependsOn: ['L1.sensor.active'],
  setup: 'T1, at rest: R1 at the origin; L3.sensor.control\'s power observer at (0, -900) scanning R1\'s zone 1, its reactor at demand 1 or 0.0025 (the host at f = 1 or 0.5) (13n.4 H13)',
  measure: 'the host\'s power fraction; each step\'s progress; the step zone 1 resolves; the antenna\'s EM source power',
  tolerance: 'f 1e-12; progress per step and the source 1e-12 relative; steps exact',
  criterion: 'f = 1: zone 1 after step 249, 100 kW; f = 0.5: after step 497, 50 kW; every step\'s progress f x 0.00403056 (the d^4 law at d^2 = 823 562.5 m^2) x f',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'sensor.scanPower'],
  locked: { date: '2026-10-23', hash: '0deb425b' },
  cases() {
    return [{ f: 1, demand: 1 }, { f: 0.5, demand: 0.0025 }];
  },
  expected(ctx, c) {
    const q = 823562.5 / (900 * 900), per = (1 / 60) / (4 * q * q);
    return { f: c.f, per: per * c.f, n: Math.ceil(1 / (per * c.f)), P: 1e5 * c.f };
  },
  run(ctx, c) {
    const T = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] }).world;
    const O = observer(ctx.params, c.demand), model = createKnowledge(O, T), pairs = [{ world: O, model }], host = O.rooms.find((r) => r.id === 'hold');
    sense(pairs, { scan: false });
    setScan(O, 0, 1);
    const f = antennas(O)[0];
    let n = null, worst = 0, fr = null, P = null, last = 0;
    while (n === null && O.step < 700) {
      step(O); step(T);
      const src = sourcesOf(O).find((s) => s.kind === 'antenna');
      if (O.step === 1) { fr = host.powerFraction; P = src ? src.P : null; }
      sense(pairs);
      if (f.scan) { worst = Math.max(worst, Math.abs(f.scan.progress - last - (1 / 60) / (4 * (823562.5 / 810000) ** 2) * c.f) / ((1 / 60) / 4)); last = f.scan.progress; }
      if (model.resolved.has(1)) n = O.step;
    }
    return { f: fr, n, P, worst };
  },
  compare(e, a) {
    const checks = {
      'the host\'s power fraction (kernel, 1e-12)': Math.abs(a.f - e.f) <= 1e-12,
      'zone 1 resolves after the hand-worked step': a.n === e.n,
      'every step\'s progress f x the d^4 law (1e-12)': a.worst <= 1e-12,
      'the antenna\'s EM source f x 100 kW (1e-12 relative)': a.P !== null && Math.abs(a.P - e.P) <= 1e-12 * e.P,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `f ${r.expected.f}, n ${r.expected.n}, P ${r.expected.P} W`, actual: `f ${a.f}, n ${a.n}, P ${a.P} W, progress off by ${a.worst.toExponential(1)}` };
  },
};
