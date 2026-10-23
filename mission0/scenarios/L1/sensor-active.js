import { step } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// S2 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #278, #289): an active scan by zone at d^4. The other ship's occupied
// box at undock is split into 3 x 2 zones (column bounds x0 + ceil(i W / 3), row bounds y0 + ceil(j H / 2), zone 3 j + i);
// an antenna whose host is controlled and powered scanning zone z progresses by dt / (sensor.scanTime (d /
// sensor.scanRange)^4) a step, d from the antenna's edge midpoint to the zone's centre, and resolves at 1. A resolved
// zone reveals its own cells (room id and type, integrity, plates) and nothing of other zones; the silhouette (standing
// cells, hull segments, the pose) is in the model at every range before any scan (#23).
//
// Setup (T1): the target R1 (TARGETS.R1) with its grid's corner at the origin, heading 0; the observer R1d-A (R1d with
// an antenna on the -y edge of its hold's cell (8, 0), grid (42.5, 0) m) heading 0 with its grid's corner at (0, -D),
// D = 600 / 900 / 1500 m, both built by buildShip with that frame origin, at rest, power routed (the antenna draws from
// the hold). The observer's model is made and sensed once (no scan) at undock; then its antenna scans zone 1 from the
// first step, both ships stepped, the model sensed after each step.
// Hand-worked from the cells (13f.2): R1's occupied box is x 0-10, y 0-5 (W 11, H 6): columns 0 | 4 | 8 | 11, rows
// 0 | 3 | 6. Zone 1 (middle, low) = [4, 8) x [0, 3): its occupied cells (4, 0), (4, 1) (shield), (7, 0), (7, 1) (hold),
// (4, 2) (reactor), (5, 2), (6, 2) (bridge), (7, 2) (magazine): 8 cells of 5 rooms; its centre grid (30, 7.5) m. The
// antenna is at (42.5, -D), so d^2 = 12.5^2 + (D + 7.5)^2: d = 607.6286 / 907.5861 / 1507.5518 m, t = 4 s (d / 900)^4
// = 0.831080 / 4.136578 / 31.490456 s, 49.86 / 248.19 / 1889.43 steps: resolved after step 50 / 249 / 1890 (t = n / 60
// s in [t, t + dt)). The silhouette: R1's 44 cells (rows 4-5 x 3-9, rows 2-3 x 0-10, rows 0-1 x 3-4 and 7-8) and 38
// hull segments (vertical: 2 per run, rows 4, 5, 2, 3 one run each and rows 0, 1 two: 16; horizontal: 2 per column,
// columns 0-10: 22), body-0 at the target's pose. R1 has no plates.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const HAND = {
  600: { t: 0.831080, n: 50 },
  900: { t: 4.136578, n: 249 },
  1500: { t: 31.490456, n: 1890 },
};
const ZONE1 = ['4,0', '4,1', '7,0', '7,1', '4,2', '5,2', '6,2', '7,2'];
const ROOMS1 = ['bridge', 'hold', 'magazine', 'reactor', 'shield'];

export default {
  id: 'L1.sensor.active',
  level: 'L1',
  laws: ['an active scan resolves a zone after sensor.scanTime x (d / sensor.scanRange)^4 of scanning (#24, 13n.1 (a), #289)', 'a resolved zone reveals its own cells and nothing of other zones (#25, #289 (4))', 'the silhouette is free at every range (#23)'],
  dependsOn: [],
  setup: 'T1: R1 at the origin, heading 0; R1d-A (an antenna on its hold\'s -y edge of cell (8, 0)) heading 0 with its grid corner at (0, -D), D = 600 / 900 / 1500 m, at rest, power routed; its model sensed at undock, then its antenna scans R1\'s zone 1 from the first step (13n.4 S2)',
  measure: 'the step the zone resolves (its zone-resolved event); the cells and rooms in the model and their integrity and plates; the silhouette before any scan',
  tolerance: 'the resolving step exact; its time one-sided in [t, t + dt) against the hand-worked t; the cells and rooms exact; integrities exact against the target\'s own at that step and against 1',
  criterion: 'zone 1 resolves after step 50 / 249 / 1890 (hand-worked t = 0.831080 / 4.136578 / 31.490456 s, t <= n dt < t + dt), its zone-resolved event (rooms bridge, hold, magazine, reactor, shield) the child of its scan-started event (root scan-1); the model then holds exactly the 8 cells (4, 0), (4, 1), (7, 0), (7, 1), (4, 2), (5, 2), (6, 2), (7, 2) with their rooms and types, integrity 1 (the target\'s own at that step), no plates, and exactly those 5 rooms, the reactor with only (4, 2) and the magazine with only (7, 2) (nothing of other zones); before any scan the model holds no cell and the silhouette: 44 standing cells, 38 hull segments, the target\'s pose',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'sensor.scanPower'],
  locked: null,
  cases() {
    return [600, 900, 1500].map((D) => ({ D }));
  },
  expected(ctx, c) {
    return { ...HAND[c.D], dt: ctx.dt, cells: ZONE1, rooms: ROOMS1 };
  },
  run(ctx, c) {
    const T = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] }).world;
    const O = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -c.D] }).world;
    const model = createKnowledge(O, T), pairs = [{ world: O, model }];
    sense(pairs, { scan: false });
    const tb = T.ship.bodies[0], pose = model.silhouette.bodies[0];
    const before = { cells: model.cells.size, silhouetteCells: model.silhouette.cells.length, segments: model.silhouette.segments.length, pose: pose.id === tb.id && pose.x[0] === tb.x[0] && pose.x[1] === tb.x[1] && pose.theta === tb.theta };
    setScan(O, 0, 1);
    let resolvedAt = null;
    while (resolvedAt === null && O.step < HAND[c.D].n + 60) {
      step(O); step(T); sense(pairs);
      if (O.log.events.some((e) => e.type === 'zone-resolved')) resolvedAt = O.step;
    }
    const ev = O.log.events.find((e) => e.type === 'zone-resolved') || null, start = O.log.events.find((e) => e.type === 'scan-started') || null;
    const cells = [...model.cells.values()].map((x) => {
      const truth = T.rooms.find((r) => r.id === x.room).cells[x.k];
      return { cell: `${x.cell[0]},${x.cell[1]}`, room: x.room, type: x.type, integrity: x.integrity, truth: truth.destroyed ? 0 : truth.integrity, plates: x.plates.length };
    });
    return {
      before, resolvedAt, t: resolvedAt === null ? null : O.t, cells,
      rooms: [...model.rooms.values()].map((r) => ({ id: r.id, cells: [...r.cells].sort() })).sort((a, b) => (a.id < b.id ? -1 : 1)),
      event: ev ? { zone: ev.zone, rooms: [...ev.rooms].sort(), parent: ev.parent, cause: ev.cause } : null,
      start: start ? { id: start.id, zone: start.zone, cause: start.cause, parent: start.parent } : null,
    };
  },
  compare(e, a) {
    const checks = {
      'silhouette before any scan: 44 cells, 38 segments, the target\'s pose; no cell known': a.before.cells === 0 && a.before.silhouetteCells === 44 && a.before.segments === 38 && a.before.pose,
      'resolved after the hand-worked step': a.resolvedAt === e.n,
      'one-sided: t <= n dt < t + dt': a.t !== null && a.t >= e.t && a.t < e.t + e.dt,
      'zone-resolved: zone 1, its five rooms, child of scan-started (root scan-1)': !!a.event && !!a.start && a.event.zone === 1 && a.start.zone === 1 && JSON.stringify(a.event.rooms) === JSON.stringify(e.rooms) && a.event.parent === a.start.id && a.start.cause === 'scan-1' && a.start.parent === 'scan-1' && a.event.cause === 'scan-1',
      'exactly the zone\'s 8 cells': a.cells.length === 8 && e.cells.every((k) => a.cells.some((x) => x.cell === k)),
      'integrity 1, the target\'s own at that step; no plates': a.cells.every((x) => x.integrity === 1 && x.integrity === x.truth && x.plates === 0),
      'exactly the 5 rooms, the reactor with (4, 2) only, the magazine with (7, 2) only': JSON.stringify(a.rooms.map((r) => r.id)) === JSON.stringify(e.rooms) && JSON.stringify(a.rooms.find((r) => r.id === 'reactor').cells) === '["4,2"]' && JSON.stringify(a.rooms.find((r) => r.id === 'magazine').cells) === '["7,2"]',
      'cell rooms and types': a.cells.every((x) => ({ '4,0': 'shieldGenerator', '4,1': 'shieldGenerator', '7,0': 'hold', '7,1': 'hold', '4,2': 'reactor', '5,2': 'bridge', '6,2': 'bridge', '7,2': 'magazine' })[x.cell] === x.type),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return { expected: `resolved after step ${e.n} (t ${e.t} s); 8 cells of 5 rooms; silhouette 44 / 38`, actual: `resolved after step ${a.resolvedAt} (${a.t === null ? '-' : a.t.toFixed(6)} s); ${a.cells.length} cells of ${a.rooms.length} rooms; silhouette ${a.before.silhouetteCells} / ${a.before.segments}` };
  },
};
