import { step, damageCell, roomTemperature } from '../../../js/rooms.js';
import { depositHeat } from '../../../js/heat.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

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
  id: 'L2.sensor.memory',
  level: 'L2',
  laws: ['a resolved zone\'s state is remembered from the scan\'s step until a re-scan (#25, 13n.1 (a))', 'a known room\'s temperature comes from passive IR on its panels, by its temperature class (#25, #289)'],
  dependsOn: ['L1.sensor.active'],
  setup: 'T1, at rest: R1 at the origin, R1d-A heading 0 with its grid corner at (0, -900); R1d-A scans R1\'s zone 0; after it resolves, R1\'s shield room heated to 650 K; a step later its cell (3, 1) destroyed and zone 0 re-scanned (13n.4 S4)',
  measure: 'the model\'s shield cells (integrity, destroyed) and the shield room\'s IR class at each stage; the steps the scans resolve',
  tolerance: 'steps exact; integrities exact',
  criterion: 'zone 0 resolves after step 249 with (3, 0) and (3, 1) at integrity 1 and no IR class for the shield room (the scan gives none); after step 250 (heated) the shield room\'s IR class and its panels\' class are hot, its cells still 1; after the destruction (steps 251-498) the model still holds (3, 1) at integrity 1, not destroyed, while R1\'s own cell is destroyed; the re-scan resolves after step 499 and the model then holds (3, 1) destroyed at integrity 0 and (3, 0) at 1; the destroyed cell\'s panel (on its -x edge) is no longer resolved and keeps its last known position',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'thermal.plantHot', 'thermal.plantOverheated'],
  locked: null,
  cases() {
    return [{ zone: 0 }];
  },
  expected() {
    return { n0: 249, heated: 250, rescan: 499, hot: 'hot' };
  },
  run(ctx) {
    const { world: T, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] });
    const O = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -900] }).world;
    const model = createKnowledge(O, T), pairs = [{ world: O, model }], shield = room('shield');
    const cellOf = (k) => { const x = model.cells.get(k); return x ? { integrity: x.integrity, destroyed: x.destroyed } : null; };
    const panel = (cell, side) => [...model.sources.values()].find((s) => s.kind === 'panel' && s.cell[0] === cell[0] && s.cell[1] === cell[1] && s.side[0] === side[0] && s.side[1] === side[1]);
    sense(pairs, { scan: false });
    setScan(O, 0, 0);
    const out = { resolved: [], stages: {} };
    while (O.step < 520) {
      step(O); step(T); sense(pairs);
      const n = O.step;
      if (model.resolved.get(0) === n) out.resolved.push(n);
      if (n === out.resolved[0]) {
        out.stages.scan = { a: cellOf('3,0'), b: cellOf('3,1'), ir: model.rooms.get('shield').ir };
        depositHeat(shield.heat, shield.heat.C * 650 - shield.heat.Q);
      } else if (out.resolved.length === 1 && n === out.resolved[0] + 1) {
        out.stages.heated = { step: n, T: roomTemperature(shield), a: cellOf('3,0'), b: cellOf('3,1'), ir: model.rooms.get('shield').ir, panels: [...model.sources.values()].filter((s) => s.kind === 'panel' && s.now && s.cell[0] >= 3 && s.cell[0] <= 4 && s.cell[1] <= 1).map((s) => s.class) };
        damageCell(T, shield, 2, 1, 'test-1', 'kinetic');
        setScan(O, 0, 0);
      } else if (out.resolved.length === 1 && n > out.resolved[0] + 1) {
        const b = cellOf('3,1');
        if (!out.stages.after) out.stages.after = { first: n, ok: true };
        out.stages.after.last = n;
        out.stages.after.ok = out.stages.after.ok && b.integrity === 1 && !b.destroyed && shield.cells[2].destroyed;
      }
      if (out.resolved.length === 2) {
        const p = panel([3, 1], [-1, 0]);
        out.stages.rescan = { step: n, a: cellOf('3,0'), b: cellOf('3,1'), panel: p ? { now: p.now, position: p.position, step: p.step } : null };
        break;
      }
    }
    return out;
  },
  compare(e, a) {
    const s = a.stages, p = s.rescan && s.rescan.panel;
    const checks = {
      'zone 0 resolves after step 249': a.resolved[0] === e.n0,
      'at the scan: (3, 0) and (3, 1) at 1; no IR class from the scan': !!s.scan && s.scan.a.integrity === 1 && s.scan.b.integrity === 1 && s.scan.ir === null,
      'after step 250: the shield room and its panels hot, its cells still 1': !!s.heated && s.heated.step === e.heated && s.heated.ir && s.heated.ir.class === e.hot && s.heated.panels.length > 0 && s.heated.panels.every((x) => x === e.hot) && s.heated.a.integrity === 1 && s.heated.b.integrity === 1,
      'steps 251-498: the model keeps (3, 1) at 1 while it is destroyed': !!s.after && s.after.first === e.heated + 1 && s.after.last === e.rescan - 1 && s.after.ok,
      'the re-scan resolves after step 499': a.resolved[1] === e.rescan,
      'then (3, 1) destroyed at 0, (3, 0) at 1': !!s.rescan && s.rescan.b.destroyed === true && s.rescan.b.integrity === 0 && s.rescan.a.integrity === 1 && !s.rescan.a.destroyed,
      'the destroyed cell\'s panel: not resolved, last position (15, 7.5) kept': !!p && p.now === false && Math.abs(p.position[0] - 15) <= 1e-9 && Math.abs(p.position[1] - 7.5) <= 1e-9 && p.step === e.heated,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify({ resolved: r.actual.resolved, heated: r.actual.stages.heated && r.actual.stages.heated.ir, rescan: r.actual.stages.rescan && r.actual.stages.rescan.b }) };
  },
};
