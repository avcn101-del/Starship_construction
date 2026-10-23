import { createBattle, tick } from '../../../js/battle.js';
import { setScan } from '../../../js/sensors.js';
import { segmentKey } from '../../../js/layout.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// L4.target.plates (DESIGN.md 13n.4 H13, §17 item 45 (d), #289 (4), #301 (6)): a resolved zone reveals the plates on
// its cells' segments with their integrity at the scan's step (the case L5b could not have: R1 carries none), R1d
// scanned; the model keeps that integrity until a re-scan.
//
// Setup (T1): createBattle with knowledge on; R1-A (the antenna on its hold) against R1d on bearing -y at 900 m, both
// at rest, no plan (it never fires); its antenna scans R1d's zone 2 from t = 0; after it resolves, the plate on the
// segment between the magazine's cell (8, 2) and the beam bay's (9, 2) is set to integrity 0.5 (a case's input) and,
// ten steps later, zone 2 is re-scanned.
// Hand-worked (R1d's plates, mission0/targets.js R1C_PLATES and R1D_PLATES; zone 2 = [8, 11) x [0, 3) of R1d's box, its
// occupied cells (8, 0), (8, 1) (hold), (8, 2) (magazine), (9, 2), (10, 2) (beam bay)): the plates on those cells'
// segments are the magazine's (8, 2) +x (the wall to (9, 2)) and (8, 2) -y (the wall to (8, 1)), each seen from both of
// its cells: (8, 1) +y, (8, 2) +x, (8, 2) -y, (9, 2) -x, all at integrity 1, and no other plate (the magazine's (7, 2)
// and the turret's plates lie on cells of zones 1, 4 and 5). After the re-scan the plate between (8, 2) and (9, 2) reads
// 0.5 from both its cells; before it, 1.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const plates = (model) => [...model.cells.values()].flatMap((c) => c.plates.map((p) => ({ cell: `${c.cell[0]},${c.cell[1]}`, side: `${p.side[0]},${p.side[1]}`, integrity: p.integrity }))).sort((a, b) => (a.cell + a.side < b.cell + b.side ? -1 : 1));

export default {
  id: 'L4.target.plates',
  level: 'L4',
  laws: ['a resolved zone reveals the plates on its cells\' segments with their integrity at the scan\'s step, kept until a re-scan (#25, #289 (4), §17 item 45 (d))'],
  dependsOn: ['L4.target.known'],
  setup: 'T1: createBattle, knowledge on; R1-A against R1d on bearing -y at 900 m, at rest; R1d\'s zone 2 scanned, the (8, 2)-(9, 2) plate set to 0.5, zone 2 re-scanned (13n.4 H13)',
  measure: 'the plates the model holds (cell, side, integrity) after the first scan, before and after the re-scan',
  tolerance: 'exact',
  criterion: 'after the scan: exactly (8, 1) +y, (8, 2) +x, (8, 2) -y, (9, 2) -x at 1; before the re-scan the same; after it (8, 2) +x and (9, 2) -x at 0.5, the others at 1',
  tunable: ['sensor.scanTime', 'sensor.scanRange'],
  locked: null,
  cases() {
    return [{ zone: 2 }];
  },
  expected() {
    const set = (x) => [['8,1', '0,1', 1], ['8,2', '1,0', x], ['8,2', '0,-1', 1], ['9,2', '-1,0', x]].map(([cell, side, integrity]) => ({ cell, side, integrity })).sort((a, b) => (a.cell + a.side < b.cell + b.side ? -1 : 1));
    return { first: set(1), after: set(0.5) };
  },
  run(ctx) {
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1-A'], target: TARGETS.R1d, bearing: '-y', knowledge: true, scans: [{ side: 'A', antenna: 0, zone: 2, at: 0 }] });
    const m = b.attacker.model;
    while (!m.resolved.has(2) && b.step < 1200) tick(b);
    const first = plates(m), at = b.step;
    b.target.world.plates.get(segmentKey([8, 2], [1, 0])).integrity = 0.5;
    for (let k = 0; k < 10; k++) tick(b);
    const before = plates(m);
    setScan(b.attacker.world, 0, 2);
    const from = b.step;
    while (m.resolved.get(2) === at && b.step < 2400) tick(b);
    return { first, before, after: plates(m), at, again: m.resolved.get(2), from };
  },
  compare(e, a) {
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const checks = { 'after the scan: the four plate faces at 1': same(a.first, e.first), 'kept until the re-scan': same(a.before, e.first), 'after the re-scan: the (8, 2)-(9, 2) plate at 0.5': same(a.after, e.after) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const f = (x) => x.map((p) => `${p.cell}/${p.side}:${p.integrity}`).join(' ');
    return { expected: `${f(r.expected.first)} | then ${f(r.expected.after)}`, actual: `${f(r.actual.first)} (step ${r.actual.at}) | ${f(r.actual.before)} | ${f(r.actual.after)} (step ${r.actual.again})` };
  },
};
