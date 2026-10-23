import { step, damageCell, roomTemperature } from '../../../js/rooms.js';
import { depositHeat } from '../../../js/heat.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// Successor of L2.sensor.memory (S4, withdrawn under #301 (6), §17 item 45 (e): the L5b checker's gaps): every check
// of S4 kept on a longer ladder, plus the gaps: the shield room's IR class in the order of its thresholds and its rest
// -> hot transition seen passively: after the scan (step 249, no class from the scan) the next sensing gives 'rest'
// (step 250), then the room is set to 650 K (hot), 850 K (overheated: plant 800 K) and 1050 K (critical: plant 1000 K)
// one step apart and the class follows rest -> hot -> overheated -> critical at steps 251, 252, 253, the panels' classes
// with it; then its cell (3, 1) is destroyed and zone 0 re-scanned after step 253: the model keeps (3, 1) at 1 in steps
// 254-501 and the re-scan resolves after step 253 + 249 = 502; the destroyed cell's panel keeps its last position, last
// resolved at step 253. S4's header, kept:
// S4 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #25, #289): positions are remembered, state is not: a resolved zone's
// cells keep the integrity they had at the scan's step until a re-scan, and the temperature of a known room comes only
// from passive IR on its panels (its temperature class by its own thresholds), never from the scan.
//
// Setup (T1, at rest, power routed): R1 at the origin heading 0 (its shield generator off, as buildShip leaves it);
// R1d-A (an antenna on its hold's -y edge of cell (8, 0), grid (42.5, 0) m) heading 0 with its grid corner at
// (0, -900); R1d-A's model of R1, sensed after every step. R1d-A scans R1's zone 0 from the first step. After the step
// it resolves, R1's shield generator room is heated (depositHeat) to 650 K; after the next step its cell (3, 1) (the
// room's cell 2) is destroyed (damageCell, loss 1) and the antenna re-scans zone 0.
// Hand-worked: zone 0 (stern, low) = [0, 4) x [0, 3) of R1's box: cells (3, 0), (3, 1) (shield), (0, 2), (1, 2), (2, 2)
// (engine), (3, 2) (reactor); centre grid (10, 7.5) m. From the antenna d^2 = 32.5^2 + 907.5^2 = 824 612.5 m^2, t = 4
// (824 612.5 / 900^2)^2 = 4.145623 s, 248.74 steps: resolved after step 249 = n0. The re-scan starts at step n0 + 2
// (its first progress) and resolves after step 2 n0 + 1 = 499 (the ship has not moved: the cell leaves as debris at the
// velocity of its point, 0). 650 K is at or above the plant hot threshold (600 K) and under overheated (800 K): 'hot'
// one step later (the room cools by radiation and conduction only a fraction of a kelvin in a step).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.sensor.memory.v2',
  level: 'L2',
  laws: ['a resolved zone\'s state is remembered from the scan\'s step until a re-scan (#25, 13n.1 (a))', 'a known room\'s temperature comes from passive IR on its panels, by its temperature class in the order of its thresholds (#25, #289)'],
  dependsOn: ['L1.sensor.active'],
  setup: 'T1, at rest: R1 at the origin, R1d-A heading 0 with its grid corner at (0, -900); R1d-A scans R1\'s zone 0; after it resolves one step of passive sensing, then R1\'s shield room set to 650, 850 and 1050 K one step apart; then its cell (3, 1) destroyed and zone 0 re-scanned (13n.4 H13, S4\'s successor)',
  measure: 'the model\'s shield cells (integrity, destroyed) and the shield room\'s IR class at each stage and its panels\' classes; the steps the scans resolve',
  tolerance: 'steps exact; integrities exact',
  criterion: 'zone 0 resolves after step 249 with (3, 0) and (3, 1) at 1 and no IR class; the class rest at step 250, hot at 251, overheated at 252, critical at 253, its panels\' classes the same at each; the model keeps (3, 1) at 1 in steps 254-501 while R1\'s cell is destroyed; the re-scan resolves after step 502 with (3, 1) destroyed at 0 and (3, 0) at 1; the destroyed cell\'s panel not resolved, its last position (15, 7.5) kept, last resolved at step 253',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'thermal.plantHot', 'thermal.plantOverheated', 'thermal.plantCritical'],
  locked: null,
  cases() {
    return [{ zone: 0 }];
  },
  expected() {
    return { n0: 249, ladder: [[250, 'rest'], [251, 'hot'], [252, 'overheated'], [253, 'critical']], rescan: 502, last: 253 };
  },
  run(ctx) {
    const { world: T, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] });
    const O = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -900] }).world;
    const model = createKnowledge(O, T), pairs = [{ world: O, model }], shield = room('shield');
    const cellOf = (k) => { const x = model.cells.get(k); return x ? { integrity: x.integrity, destroyed: x.destroyed } : null; };
    const panel = (cell, side) => [...model.sources.values()].find((s) => s.kind === 'panel' && s.cell[0] === cell[0] && s.cell[1] === cell[1] && s.side[0] === side[0] && s.side[1] === side[1]);
    const heat = (K) => depositHeat(shield.heat, shield.heat.C * K - shield.heat.Q);
    sense(pairs, { scan: false });
    setScan(O, 0, 0);
    const out = { resolved: [], ladder: [], after: null };
    let n0 = null;
    while (O.step < 560) {
      step(O); step(T); sense(pairs);
      const n = O.step;
      if (model.resolved.get(0) === n) out.resolved.push(n);
      if (n0 === null && out.resolved.length === 1) { n0 = n; out.scan = { a: cellOf('3,0'), b: cellOf('3,1'), ir: model.rooms.get('shield').ir }; continue; }
      if (n0 !== null && n >= n0 + 1 && n <= n0 + 4) {
        const ir = model.rooms.get('shield').ir;
        out.ladder.push({ step: n, cls: ir ? ir.class : null, irStep: ir ? ir.step : null, panels: [...model.sources.values()].filter((s) => s.kind === 'panel' && s.now && s.cell[0] >= 3 && s.cell[0] <= 4 && s.cell[1] <= 1).map((s) => s.class), a: cellOf('3,0'), b: cellOf('3,1') });
        if (n === n0 + 1) heat(650); else if (n === n0 + 2) heat(850); else if (n === n0 + 3) heat(1050);
        else { damageCell(T, shield, 2, 1, 'test-1', 'kinetic'); setScan(O, 0, 0); }
        continue;
      }
      if (n0 !== null && out.resolved.length === 1 && n > n0 + 4) {
        const b = cellOf('3,1');
        if (!out.after) out.after = { first: n, ok: true };
        out.after.last = n;
        out.after.ok = out.after.ok && b.integrity === 1 && !b.destroyed && shield.cells[2].destroyed;
      }
      if (out.resolved.length === 2) {
        const p = panel([3, 1], [-1, 0]);
        out.rescan = { step: n, a: cellOf('3,0'), b: cellOf('3,1'), panel: p ? { now: p.now, position: p.position, step: p.step } : null };
        break;
      }
    }
    return out;
  },
  compare(e, a) {
    const p = a.rescan && a.rescan.panel;
    const checks = {
      'zone 0 resolves after step 249': a.resolved[0] === e.n0,
      'at the scan: (3, 0) and (3, 1) at 1; no IR class from the scan': !!a.scan && a.scan.a.integrity === 1 && a.scan.b.integrity === 1 && a.scan.ir === null,
      'the class ladder rest -> hot -> overheated -> critical at steps 250-253, by passive IR at each step': a.ladder.length === 4 && e.ladder.every(([n, cls], i) => a.ladder[i].step === n && a.ladder[i].cls === cls && a.ladder[i].irStep === n),
      'the panels\' classes with the room\'s': a.ladder.every((x) => x.panels.length > 0 && x.panels.every((c) => c === x.cls)),
      'its cells still 1 through the ladder': a.ladder.every((x) => x.a.integrity === 1 && x.b.integrity === 1),
      'steps 254-501: the model keeps (3, 1) at 1 while it is destroyed': !!a.after && a.after.first === e.last + 1 && a.after.last === e.rescan - 1 && a.after.ok,
      'the re-scan resolves after step 502': a.resolved[1] === e.rescan,
      'then (3, 1) destroyed at 0, (3, 0) at 1': !!a.rescan && a.rescan.b.destroyed === true && a.rescan.b.integrity === 0 && a.rescan.a.integrity === 1 && !a.rescan.a.destroyed,
      'the destroyed cell\'s panel: not resolved, last position (15, 7.5) kept, last at step 253': !!p && p.now === false && Math.abs(p.position[0] - 15) <= 1e-9 && Math.abs(p.position[1] - 7.5) <= 1e-9 && p.step === e.last,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify({ resolved: r.actual.resolved, ladder: r.actual.ladder.map((x) => [x.step, x.cls]), rescan: r.actual.rescan && r.actual.rescan.b }) };
  },
};
