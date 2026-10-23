import { step } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// S8 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #273 (3), #289): sensor.scanRange has k = 1 and sensor.scanTime k = 0,
// so the same zone at the same distance in cells resolves in the same step at every tier. S2's setup (L1.sensor.active)
// at T1 (edge 5 m) and T3 (edge 10 m): R1 at the origin heading 0, R1d-A heading 0 with its grid's corner at (0, -D),
// D = 600 / 900 / 1500 m at T1 and twice that at T3 (the same distance in cells); R1d-A's antenna scans R1's zone 1
// from the first step.
// Hand-worked: at T3 every grid point and D double, so d doubles, sensor.scanRange doubles (900 x (10 / 5)^1 = 1800 m)
// and d / scanRange is unchanged: t = 0.831080 / 4.136578 / 31.490456 s at both tiers (S2's, d^2 = 12.5^2 + (D + 7.5)^2
// at T1), resolved after step 50 / 249 / 1890 at both.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const HAND = { 600: 50, 900: 249, 1500: 1890 };
const EDGE = { T1: 5, T3: 10 };

export default {
  id: 'L0.sensor.tier',
  level: 'L0',
  laws: ['a zone at the same distance in cells resolves in the same step at every tier: sensor.scanRange k = 1, sensor.scanTime k = 0 (#273 (3), 13n.1 (a))'],
  dependsOn: [],
  setup: 'S2 (L1.sensor.active) at T1 and T3: R1 at the origin heading 0, R1d-A heading 0 with its grid corner at (0, -D x edge / 5 m), D = 600 / 900 / 1500 m; its antenna scans R1\'s zone 1 from the first step (13n.4 S8)',
  measure: 'the step zone 1 resolves at each tier',
  tolerance: 'exact (steps)',
  criterion: 'zone 1 resolves after step 50 / 249 / 1890 at T1 and at T3 (hand-worked from S2\'s t = 0.831080 / 4.136578 / 31.490456 s, the same at both tiers)',
  tunable: ['sensor.scanTime', 'sensor.scanRange'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const D of [600, 900, 1500]) out.push({ tier, D });
    return out;
  },
  expected(ctx, c) {
    return { n: HAND[c.D] };
  },
  run(ctx, c) {
    const k = EDGE[c.tier] / 5;
    const T = buildShip(ctx.params, c.tier, TARGETS.R1, { prefix: 'T', origin: [0, 0] }).world;
    const O = buildShip(ctx.params, c.tier, SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -c.D * k] }).world;
    const model = createKnowledge(O, T), pairs = [{ world: O, model }];
    sense(pairs, { scan: false });
    setScan(O, 0, 1);
    let n = null;
    while (n === null && O.step < HAND[c.D] + 60) {
      step(O); step(T); sense(pairs);
      if (model.resolved.has(1)) n = O.step;
    }
    return { n, edge: O.edge, scanRange: ctx.scaled(ctx.params.sensor.scanRange, O.edge) };
  },
  compare(e, a) {
    const checks = { 'resolved after the hand-worked step': a.n === e.n };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
};
