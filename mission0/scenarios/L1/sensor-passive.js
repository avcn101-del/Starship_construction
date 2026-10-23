import { createWorld, addRoom, addFitting, enableShip, step } from '../../../js/rooms.js';
import { createKnowledge, sense, sourcesOf } from '../../../js/sensors.js';

// S1 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #278, #289): passive sensing at d^-2. An antenna fitting receives
// P x sensor.area / (4 pi d^2) from a source of power P at distance d and resolves it when that is at least
// sensor.sensitivity: resolved iff d <= sqrt(P A / (4 pi S)).
//
// Setup (T1, every ship heading 0, built in the scenario with enableShip's frame origin so every world point is the
// origin plus a grid point): the observer is one hold at [0, 0] with an antenna on the -x edge of cell (0, 0), its edge
// midpoint at grid (0, 2.5) m. The sources: (panel 290 K) a hold at [0, 0] at rest with one radiator on the +x edge of
// cell (1, 0), grid (10, 2.5) m; (panel 600 K) a heat sink at [0, 0] made at 600 K with one radiator on the same edge;
// (exhaust) an engine at [0, 0] (2 x 3, its exhaust face x = 0, centre grid (0, 7.5) m) beside a bridge at [2, 0], at
// throttle 1, stepped once (no power routing: it delivers its full 15 MN). The observer sits on the line through the
// source, its antenna d from it (the panels: observer origin (10 + d, 0); the exhaust: (-d, 5)). The panels are sensed
// without a step, at exactly their temperature; the exhaust after its one step (kernel-read d, labelled).
// Hand-worked (13n.2; sigma 5.670374e-8, emissivity 0.9, radiator.area 25 m^2, A 4 m^2, S 1e-3 W): a panel at 290 K
// radiates 0.9 x 5.670374e-8 x 25 x 290^4 = 9023.73 W and is resolved to sqrt(9023.73 x 4 / (4 pi 1e-3)) = 1694.8 m; at
// 600 K 0.9 x 5.670374e-8 x 25 x 600^4 = 165 348.1 W, to 7254.8 m; the exhaust 1.5e7 N x 1e4 m/s / 2 = 7.5e10 W, to
// 4.886e6 m. So at 600 / 900 / 1500 m every source is resolved; the 290 K panel at 1650 m, not at 1750 m; the 600 K
// panel at 7200 m, not at 7300 m; the exhaust at 4.8e6 m, not at 5.0e6 m.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
// The hand-worked ranges (m) and powers (W).
const RANGE = { panel290: 1694.8, panel600: 7254.8, exhaust: 4.886e6 };
const POWER = { panel290: 9023.73, panel600: 165348.1, exhaust: 7.5e10 };
const DISTANCES = { panel290: [600, 900, 1500, 1650, 1750], panel600: [600, 900, 1500, 7200, 7300], exhaust: [600, 900, 1500, 4.8e6, 5.0e6] };

function observer(params, origin) {
  const w = createWorld({ params, edge: 5, dt: 1 / 60, grid: [30, 14] });
  addRoom(w, 'hold', { id: 'hold', cell: [0, 0] });
  addFitting(w, 'antenna', 'hold', [0, 0], [-1, 0]);
  enableShip(w, { origin, heading: 0 });
  return w;
}
function source(params, kind) {
  const w = createWorld({ params, edge: 5, dt: 1 / 60, grid: [30, 14] });
  if (kind === 'exhaust') {
    const e = addRoom(w, 'engine', { id: 'engine', cell: [0, 0] });
    addRoom(w, 'bridge', { id: 'bridge', cell: [2, 0] });
    enableShip(w, { origin: [0, 0], heading: 0 });
    e.engine.throttle = 1;
    return w;
  }
  addRoom(w, kind === 'panel290' ? 'hold' : 'heatSink', { id: 'room', cell: [0, 0], temperature: kind === 'panel290' ? 290 : 600 });
  addFitting(w, 'radiator', 'room', [1, 0], [1, 0]);
  enableShip(w, { origin: [0, 0], heading: 0 });
  return w;
}

export default {
  id: 'L1.sensor.passive',
  level: 'L1',
  laws: ['passive sensing at d^-2: an antenna resolves a source when P sensor.area / (4 pi d^2) >= sensor.sensitivity (#24, 13n.1 (a), #289)', 'a radiator panel radiates its room\'s irBrightness; an engine\'s exhaust its jet power thrust x engine.exhaustVelocity / 2 (#102, #203 A, 13n.1 (a))'],
  dependsOn: [],
  setup: 'T1: an observer hold with one antenna on the line through one source, its antenna at d from it: a 290 K panel and a 600 K panel (sensed without a step) at 600 / 900 / 1500 m and just inside and outside their ranges; an engine at throttle 1 (one step) at 600 / 900 / 1500 m, 4.8e6 and 5.0e6 m (13n.4 S1)',
  measure: 'whether the observer\'s model resolves the source, the power it received and the source\'s position; the source-resolved event',
  tolerance: 'resolution exact (yes or no); received power against the closed form 1e-12; the source power against the hand-worked literal 1e-6; the position 1e-9 m',
  criterion: 'resolved iff d <= the hand-worked range (panel 290 K 1694.8 m, panel 600 K 7254.8 m, exhaust 4.886e6 m): every source at 600 / 900 / 1500 m, the 290 K panel at 1650 m and not 1750 m, the 600 K panel at 7200 m and not 7300 m, the exhaust at 4.8e6 m and not 5.0e6 m; when resolved, received = P A / (4 pi d^2) (re-statement, 1e-12) with P from the kernel\'s source (panel: irBrightness, the hand-worked 9023.73 / 165 348.1 W; exhaust: 7.5e10 W, each 1e-6), at the source\'s point (grid (10, 2.5) m, the exhaust face\'s centre (0, 7.5) m mapped on its body), with one source-resolved event of that kind, root sense, room the antenna\'s host; not resolved: no source in the model and no event',
  tunable: ['sensor.area', 'sensor.sensitivity', 'engine.exhaustVelocity', 'engine.thrust', 'radiator.area'],
  locked: { date: '2026-10-23', hash: 'ed7e1e69' },
  cases() {
    const out = [];
    for (const [kind, ds] of Object.entries(DISTANCES)) for (const d of ds) out.push({ kind, d });
    return out;
  },
  expected(ctx, c) {
    return { resolved: c.d <= RANGE[c.kind], power: POWER[c.kind], A: ctx.params.sensor.area.value, S: ctx.params.sensor.sensitivity.value };
  },
  run(ctx, c) {
    const T = source(ctx.params, c.kind);
    const O = observer(ctx.params, c.kind === 'exhaust' ? [-c.d, 5] : [10 + c.d, 0]);
    if (c.kind === 'exhaust') { step(T); step(O); }
    const src = sourcesOf(T).find((s) => s.kind === (c.kind === 'exhaust' ? 'exhaust' : 'panel'));
    const model = createKnowledge(O, T);
    sense([{ world: O, model }], { scan: false });
    const got = [...model.sources.values()].find((s) => s.kind === src.kind) || null;
    const ant = O.fittings.find((f) => f.type === 'antenna'), b = O.ship.bodies[0];
    const at = [b.x[0] + (ant.p[0] - b.c[0]), b.x[1] + (ant.p[1] - b.c[1])];
    const ev = O.log.events.filter((e) => e.type === 'source-resolved');
    return {
      sourceP: src.P, sourceAt: src.position, d: Math.sqrt((at[0] - src.position[0]) ** 2 + (at[1] - src.position[1]) ** 2), // d kernel-read (the exhaust's ship moved in its step)
      resolved: !!got, received: got ? got.received : null, position: got ? got.position : null,
      events: ev.map((e) => ({ kind: e.kind, parent: e.parent, cause: e.cause, room: e.room })),
    };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    const kind = c.kind === 'exhaust' ? 'exhaust' : 'panel';
    const point = c.kind === 'exhaust' ? null : [10, 2.5];
    const checks = {
      'resolved iff d <= the hand-worked range': a.resolved === e.resolved,
      'the source power against the hand-worked literal (1e-6)': close(e.power, a.sourceP, 1e-6),
    };
    if (e.resolved) {
      checks['received = P A / (4 pi d^2) (re-statement, 1e-12)'] = close((a.sourceP * e.A) / (4 * Math.PI * a.d * a.d), a.received, 1e-12);
      checks['at the source\'s point'] = point ? Math.abs(a.position[0] - point[0]) <= 1e-9 && Math.abs(a.position[1] - point[1]) <= 1e-9 : Math.abs(a.position[0] - a.sourceAt[0]) <= 1e-9 && Math.abs(a.position[1] - a.sourceAt[1]) <= 1e-9;
      checks['one source-resolved event, root sense, room the host'] = a.events.length === 1 && a.events[0].kind === kind && a.events[0].parent === 'sense' && a.events[0].cause === 'sense' && a.events[0].room === 'hold';
    } else checks['no source and no event'] = a.received === null && a.events.length === 0;
    if (!e.resolved) checks['received below the sensitivity (re-statement)'] = (a.sourceP * e.A) / (4 * Math.PI * a.d * a.d) < e.S;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return { expected: `${e.resolved ? 'resolved' : 'not resolved'} (P ${e.power} W)`, actual: `${a.resolved ? `resolved, ${a.received.toExponential(6)} W` : 'not resolved'} (P ${a.sourceP.toExponential(6)} W, d ${a.d.toFixed(4)} m)` };
  },
};
