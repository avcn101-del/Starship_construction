import { step } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { SENSOR_SHIPS } from '../../targets.js';

// S3 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #24, #289): a scanning antenna is EM-bright (sensor.scanPower) and the
// other side resolves it passively at d^-2 long before the scan resolves a zone at d^4: the design's asymmetry.
//
// Setup (T1, at rest, power routed): the scanner R1d-A (an antenna on its hold's -y edge of cell (8, 0)) heading 0 with
// its grid's corner at (0, -900); the scanned R1-A (R1 with the same antenna) heading 0 at the origin; each ship's
// model about the other, sensed after every step. (passive) The scanner's antenna scans the target's zone 1 from the
// first step; the target only listens. (back) Both antennas scan the other ship's zone 1 from the first step.
// Hand-worked: the antennas are at grid (42.5, 0) m of each ship, so at world (42.5, -900) and (42.5, 0), 900 m apart:
// each receives 1e5 W x 4 m^2 / (4 pi 900^2) = 0.03930 W >= 1e-3 W while the other scans (seen to sqrt(1e5 x 4 / (4 pi
// 1e-3)) = 5642 m): resolved after step 1, the first step of the scan. The scanner's scan of the target's zone 1 (centre
// (30, 7.5) m): d^2 = 12.5^2 + 907.5^2, t = 4.136578 s, after step 249 (S2's). The target's scan of the scanner's zone 1
// (R1d's box is R1's, its zone 1 centre grid (30, 7.5) m, world (30, -892.5)): d^2 = 12.5^2 + 892.5^2 = 796 712.5 m^2,
// t = 4 (796 712.5 / 900^2)^2 = 3.869842 s, 232.19 steps: after step 233.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.sensor.reveal',
  level: 'L2',
  laws: ['a scanning antenna is an EM source of sensor.scanPower, resolved passively at d^-2 (#24, 13n.1 (a))', 'so the scanned side resolves the scanner\'s antenna before the scan resolves a zone (#24, #289)'],
  dependsOn: ['L1.sensor.passive', 'L1.sensor.active'],
  setup: 'T1, at rest, power routed: R1d-A heading 0 with its grid corner at (0, -900), R1-A at the origin heading 0, each with a model of the other; R1d-A scans R1-A\'s zone 1 from the first step, R1-A listens (passive) or scans R1d-A\'s zone 1 too (back) (13n.4 S3)',
  measure: 'the step each side first resolves the other\'s antenna (its source-resolved event of kind antenna) and its position and received power; the step each scan resolves its zone',
  tolerance: 'steps exact; the position 1e-9 m; the received power against the hand-worked literal 1e-4',
  criterion: 'the scanned side resolves the scanner\'s antenna after step 1 (hand-worked 0.03930 W at 900 m), at world (42.5, -900) m, by a source-resolved event of kind antenna, root sense, room its hold; the scanner\'s zone resolves after step 249, so the antenna is resolved first; (back) likewise the scanner resolves the target\'s antenna after step 1 at (42.5, 0) m, and the target\'s scan of the scanner\'s zone 1 resolves after step 233 (hand-worked t = 3.869842 s); (passive) the scanner resolves no antenna of the target',
  tunable: ['sensor.scanPower', 'sensor.area', 'sensor.sensitivity', 'sensor.scanTime', 'sensor.scanRange'],
  locked: { date: '2026-10-23', hash: 'a28db7f1' },
  cases() {
    return [{ mode: 'passive' }, { mode: 'back' }];
  },
  expected(ctx, c) {
    return { seenAt: 1, received: 0.03930, scannerAt: [42.5, -900], targetAt: [42.5, 0], scannerZone: 249, targetZone: c.mode === 'back' ? 233 : null };
  },
  run(ctx, c) {
    const A = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -900] }).world;
    const T = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1-A'], { prefix: 'T', origin: [0, 0] }).world;
    const mA = createKnowledge(A, T), mT = createKnowledge(T, A), pairs = [{ world: A, model: mA }, { world: T, model: mT }];
    sense(pairs, { scan: false });
    setScan(A, 0, 1);
    if (c.mode === 'back') setScan(T, 0, 1);
    const out = { A: { antennaAt: null, zoneAt: null }, T: { antennaAt: null, zoneAt: null } };
    while (A.step < 300) {
      step(A); step(T); sense(pairs);
      for (const [name, w, m] of [['A', A, mA], ['T', T, mT]]) {
        const s = out[name], src = [...m.sources.values()].find((x) => x.kind === 'antenna');
        if (s.antennaAt === null && src) Object.assign(s, { antennaAt: w.step, position: src.position, received: src.received });
        if (s.zoneAt === null && m.resolved.has(1)) s.zoneAt = w.step;
      }
    }
    for (const [name, w] of [['A', A], ['T', T]]) {
      const ev = w.log.events.find((e) => e.type === 'source-resolved' && e.kind === 'antenna');
      out[name].event = ev ? { step: Math.round(ev.t / w.dt), parent: ev.parent, cause: ev.cause, room: ev.room } : null;
    }
    return out;
  },
  compare(e, a, c) {
    const at = (p, q) => !!p && Math.abs(p[0] - q[0]) <= 1e-9 && Math.abs(p[1] - q[1]) <= 1e-9;
    const checks = {
      'the target resolves the scanner\'s antenna after step 1': a.T.antennaAt === e.seenAt,
      'at the scanner\'s antenna (42.5, -900)': at(a.T.position, e.scannerAt),
      'received 0.03930 W (1e-4)': Math.abs(a.T.received - e.received) <= 1e-4 * e.received,
      'its source-resolved event: step 1, root sense, room hold': !!a.T.event && a.T.event.step === 1 && a.T.event.parent === 'sense' && a.T.event.cause === 'sense' && a.T.event.room === 'hold',
      'the scanner\'s zone resolves after step 249, after the antenna is seen': a.A.zoneAt === e.scannerZone && a.T.antennaAt < a.A.zoneAt,
    };
    if (c.mode === 'back') {
      checks['the scanner resolves the target\'s antenna after step 1 at (42.5, 0)'] = a.A.antennaAt === e.seenAt && at(a.A.position, e.targetAt) && !!a.A.event && a.A.event.parent === 'sense';
      checks['the target\'s scan resolves after step 233'] = a.T.zoneAt === e.targetZone;
    } else checks['the scanner resolves no antenna of the target; the target resolves no zone'] = a.A.antennaAt === null && a.T.zoneAt === null;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: JSON.stringify(r.expected), actual: `target sees the antenna after step ${a.T.antennaAt}, scanner's zone after ${a.A.zoneAt}; scanner sees an antenna after ${a.A.antennaAt}, target's zone after ${a.T.zoneAt}` };
  },
};
