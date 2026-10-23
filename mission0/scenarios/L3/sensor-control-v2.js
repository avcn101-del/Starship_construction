import { createWorld, addRoom, addFitting, enableShip, enablePowerRouting, setDemand, setActive, step } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS } from '../../targets.js';

// Successor of L3.sensor.control (S6, withdrawn under #301 (6), §17 item 45 (e): the L5b checker's gap): every case and
// check of S6 kept, plus the gap: in control-reset the scan's draw stops while control is lost: the heat generated in
// hold A is 1e5 W x 1/60 s = 1666.67 J in step 100 (controlled, scanning) and 0 in steps 102-150 (control lost at the end
// of step 101; scanRequest asks nothing of an uncontrolled host). S6's header, kept:
// S6 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #24, #289): a scan needs its host room controlled (a control path to
// the bridge) and powered; passive needs only the antenna's cell standing. A scan draws sensor.scanPower from its host
// while it scans, all of it heat in the host, and resets when the antenna changes zone or loses power or control.
//
// Setup (T1): the target R1 at the origin heading 0, at rest (buildShip, its grid corner at the origin). The observers
// are built here, heading 0 with their grid corner at (0, -900), at rest:
// (control) a bridge at [0, 0], hold A at [2, 0] (sharing its wall), hold B at [6, 0] (no wall with either: a fragment of
// its own, never controlled), no power routing (every room powered); an antenna on the -y edge of hold A's cell (3, 0)
// (grid (17.5, 0) m) or of hold B's cell (7, 0) (grid (37.5, 0) m), as the case says.
// (power) a reactor at [0, 0], a bridge at [2, 0], a hold at [4, 0] in a row, power routed, the reactor at demand 1; an
// antenna on the -y edge of the hold's cell (5, 0) (grid (27.5, 0) m).
// Cases: connected (A scans R1's zone 1 from the first step); cut (B scans zone 1); control-reset (A scans zone 1, the
// bridge switched off before step 101 and on again before step 151); zone-change (A scans zone 1, then zone 5 from
// step 101); power-reset (the hold scans zone 1, the reactor at demand 0 before step 101 and 1 again before step 151).
// Hand-worked: R1's zone 1 centre grid (30, 7.5) m, zone 5 (bow, high: [8, 11) x [3, 6)) centre (47.5, 22.5) m. Hold A
// to zone 1: d^2 = 12.5^2 + 907.5^2 = 823 712.5 m^2, t = 4.136578 s, 248.19 steps: n = 249. Hold A to zone 5: d^2 =
// 30^2 + 922.5^2 = 851 906.25 m^2, t = 4 (851 906.25 / 810 000)^2 = 4.424595 s, 265.48 steps: n = 266. The power
// observer's hold to zone 1: d^2 = 2.5^2 + 907.5^2 = 823 562.5 m^2, t = 4.135072 s, 248.10 steps: n = 249. A scan that
// loses control or power in step 101 (control: lost at the end of that step; power: none routed in it) counts steps
// 1-100 and then nothing; it starts again in step 151 and resolves after 150 + 249 = 399 (without the reset it would
// resolve after 150 + 149 = 299). The zone change at step 101 resolves zone 5 after 100 + 266 = 366, and zone 1 never.
// The scan's draw: the hold receives sensor.scanPower = 1e5 W in step 1, and the heat generated in it in that step is
// 1e5 W x 1/60 s = 1666.67 J (the hold's own heat: nothing else heats a hold).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const CASES = {
  connected: { n: 249, scans: 1 },
  cut: { n: null, scans: 0 },
  'control-reset': { n: 399, scans: 2 },
  'zone-change': { n: 366, zone: 5, scans: 2 },
  'power-reset': { n: 399, scans: 2, draw: 1e5, heat: 1666.6666666666667 },
};

function observer(params, kind, on) {
  const w = createWorld({ params, edge: 5, dt: 1 / 60, grid: [30, 14] });
  if (kind === 'power') {
    addRoom(w, 'reactor', { id: 'reactor', cell: [0, 0] });
    addRoom(w, 'bridge', { id: 'bridge', cell: [2, 0] });
    addRoom(w, 'hold', { id: 'hold', cell: [4, 0] });
    addFitting(w, 'antenna', 'hold', [5, 0], [0, -1]);
    enablePowerRouting(w);
    setDemand(w, w.rooms[0], 1);
  } else {
    addRoom(w, 'bridge', { id: 'bridge', cell: [0, 0] });
    addRoom(w, 'hold', { id: 'holdA', cell: [2, 0] });
    addRoom(w, 'hold', { id: 'holdB', cell: [6, 0] });
    if (on === 'A') addFitting(w, 'antenna', 'holdA', [3, 0], [0, -1]);
    else addFitting(w, 'antenna', 'holdB', [7, 0], [0, -1]);
  }
  enableShip(w, { origin: [0, -900], heading: 0 });
  return w;
}

export default {
  id: 'L3.sensor.control.v2',
  level: 'L3',
  laws: ['a scan needs its host controlled (a control path to the bridge) and powered; passive needs only the antenna\'s cell standing (#24, #289 (2))', 'a scan resets when the antenna changes zone or loses power or control (#289 (2))', 'a scan draws sensor.scanPower from its host, as heat in the host (#289 (2))'],
  dependsOn: ['L1.sensor.active'],
  setup: 'T1, at rest: R1 at the origin; an observer at (0, -900): a bridge, hold A on its wall and a hold B cut off (control), or a reactor, a bridge and a hold in a row with power routed (power); an antenna scanning R1\'s zone 1; control lost in steps 101-150, power lost in steps 101-150, or the zone changed to 5 at step 101 (13n.4 S6)',
  measure: 'whether and when the zone resolves; the scan-started events; the panels the cut antenna resolves; the host\'s delivered power and heat in the first step and while unpowered',
  tolerance: 'steps exact; the draw and the heat against the hand-worked literals 1e-12',
  criterion: 'connected: zone 1 after step 249, one scan; cut: no scan-started and no zone resolved by step 600 (hold B never controlled), yet all 17 of R1\'s panels resolved passively; control-reset and power-reset: zone 1 after step 399 (the scan restarts in step 151: a second scan-started, scan-2, the zone-resolved its child); zone-change: zone 5 after step 366 (a second scan, scan-2), zone 1 never; power-reset: the hold receives 1e5 W and its heat grows by 1666.67 J in step 1, receives 0 W while the reactor is at demand 0; control-reset: 1666.67 J of scan heat in hold A in step 100 and 0 in steps 102-150 (no draw while control is lost)',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'sensor.scanPower'],
  locked: null,
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    return CASES[c.name];
  },
  run(ctx, c) {
    const T = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] }).world;
    const O = observer(ctx.params, c.name === 'power-reset' ? 'power' : 'control', c.name === 'cut' ? 'B' : 'A');
    const model = createKnowledge(O, T), pairs = [{ world: O, model }];
    const host = O.rooms.find((r) => r.id === (c.name === 'power-reset' ? 'hold' : c.name === 'cut' ? 'holdB' : 'holdA'));
    const bridge = O.rooms.find((r) => r.id === 'bridge'), reactor = O.rooms.find((r) => r.id === 'reactor');
    sense(pairs, { scan: false });
    setScan(O, 0, 1);
    const out = { resolved: {}, first: null, unpowered: [], controlledEver: false, lostHeat: [], heat100: null };
    while (O.step < 600) {
      const next = O.step + 1;
      if (c.name === 'control-reset' && next === 101) setActive(O, bridge, false);
      if (c.name === 'control-reset' && next === 151) setActive(O, bridge, true);
      if (c.name === 'power-reset' && next === 101) setDemand(O, reactor, 0);
      if (c.name === 'power-reset' && next === 151) setDemand(O, reactor, 1);
      if (c.name === 'zone-change' && next === 101) setScan(O, 0, 5);
      const G = host.heat.generated;
      step(O); step(T); sense(pairs);
      if (host.controlled) out.controlledEver = true;
      if (c.name === 'control-reset' && O.step === 100) out.heat100 = host.heat.generated - G;
      if (c.name === 'control-reset' && O.step >= 102 && O.step <= 150) out.lostHeat.push(host.heat.generated - G);
      if (O.step === 1) out.first = { delivered: host.powerDelivered ?? null, heat: host.heat.generated - G }; // the heat generated in the host (Q at 290 K holds it only to its float resolution)
      if (c.name === 'power-reset' && O.step > 100 && O.step <= 150) out.unpowered.push(host.powerDelivered);
      for (const [z, n] of model.resolved) if (out.resolved[z] === undefined) out.resolved[z] = n;
    }
    const starts = O.log.events.filter((e) => e.type === 'scan-started'), res = O.log.events.filter((e) => e.type === 'zone-resolved');
    return {
      ...out, starts: starts.map((e) => ({ id: e.id, cause: e.cause, zone: e.zone })), zoneEvents: res.map((e) => ({ zone: e.zone, parent: e.parent, cause: e.cause })),
      panels: [...model.sources.values()].filter((s) => s.kind === 'panel' && s.now).length,
    };
  },
  compare(e, a, c) {
    const z = e.zone ?? 1, last = a.starts[a.starts.length - 1];
    const checks = {};
    if (e.n === null) {
      checks['no scan-started, no zone resolved'] = a.starts.length === 0 && Object.keys(a.resolved).length === 0 && a.zoneEvents.length === 0;
      checks['hold B never controlled'] = a.controlledEver === false;
      checks['all 17 of R1\'s panels resolved passively'] = a.panels === 17;
    } else {
      checks['the zone resolves after the hand-worked step'] = a.resolved[z] === e.n;
      checks['scans started: as many as the case\'s, the last scan-<n>'] = a.starts.length === e.scans && last.cause === `scan-${e.scans}`;
      checks['its zone-resolved event the child of the last scan-started'] = a.zoneEvents.length === 1 && a.zoneEvents[0].zone === z && a.zoneEvents[0].parent === last.id;
      if (c.name === 'zone-change') checks['zone 1 never resolved'] = a.resolved[1] === undefined && a.starts[0].zone === 1 && last.zone === 5;
    }
    if (c.name === 'control-reset') {
      checks['the host\'s scan heat in step 100: 1666.67 J (1e-12)'] = Math.abs(a.heat100 - 1e5 / 60) <= 1e-12 * (1e5 / 60);
      checks['no draw while control is lost (steps 102-150: 0 J)'] = a.lostHeat.length === 49 && a.lostHeat.every((x) => x === 0);
    }
    if (e.draw) {
      checks['the draw in step 1: 1e5 W (1e-12)'] = Math.abs(a.first.delivered - e.draw) <= 1e-12 * e.draw;
      checks['the heat in the host in step 1: 1666.67 J (1e-12)'] = Math.abs(a.first.heat - e.heat) <= 1e-12 * e.heat;
      checks['0 W while the reactor is at demand 0'] = a.unpowered.length === 50 && a.unpowered.every((x) => x === 0);
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify({ resolved: r.actual.resolved, starts: r.actual.starts.length, panels: r.actual.panels, first: r.actual.first }) };
  },
};
