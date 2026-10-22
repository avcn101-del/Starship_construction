import { validateShip } from '../../../js/layout.js';
import { ROOMS, withOverrides } from '../../../js/data.js';

const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: 17 radiators, then 4 RCS (fitting ids 17-20).
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
const bp = (rooms) => ({ grid: [30, 14], edge: 5, rooms: rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: R1_FITTINGS.map(([type, room, cell, side]) => ({ type, room, cell, side })) });
// The cases: R1 at quarters.crewPerCell 3 (the value before #253) and 4 (#253), and R1 with its quarters removed
// (every other room still joined to the bridge: the heat sink through the reactor, the turret through the magazine).
const CASES = {
  'R1, 3 per cell': { rooms: R1_ROOMS, perCell: 3, valid: false, required: 20, berths: 18 },
  'R1, 4 per cell': { rooms: R1_ROOMS, perCell: 4, valid: true, required: 20, berths: 24 },
  'R1 without quarters': { rooms: R1_ROOMS.filter((r) => r.id !== 'quarters'), perCell: 4, valid: false, required: 20, berths: 0 },
};

export default {
  id: 'L4.crew.capacity',
  level: 'L4',
  laws: ['crew capacity: the crew the rooms require must have berths in the quarters, a build-time rule of validateShip (#60, #220 (5), 13l.1)'],
  dependsOn: ['L3.validation.v2'],
  setup: 'blueprints on the T1 drydock grid: R1 (13f.2) validated by the kernel\'s validateShip with quarters.crewPerCell 3 and 4 (run-time params), and R1 with its quarters removed (13l.4 A7)',
  measure: 'the validation\'s verdict, the rules it names and the crew and berths in its reason',
  tolerance: 'exact',
  criterion: 'hand-worked: R1\'s rooms require bridge 4 + reactor 4 + engine 2 + magazine 2 + shield generator 2 + beam bay 3 + turret 3 = 20 crew (crewRequired at T1); its quarters (6 cells) berth 18 at 3 per cell and 24 at 4. At 3: rejected with exactly one reason, crew (20 > 18); at 4: valid; without quarters: rejected with exactly one reason, crew (20 > 0) (#60, #253)',
  tunable: ['quarters.crewPerCell'],
  locked: null,
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    const k = CASES[c.name];
    return { valid: k.valid, rules: k.valid ? [] : ['crew'], detail: k.valid ? null : `the rooms require ${k.required} crew and the quarters have ${k.berths} berths` };
  },
  run(ctx, c) {
    const k = CASES[c.name];
    const params = withOverrides({ 'quarters.crewPerCell': k.perCell });
    const res = validateShip(bp(k.rooms), ROOMS, params);
    return { valid: res.valid, rules: res.reasons.map((r) => r.rule), details: res.reasons.map((r) => r.detail) };
  },
  compare(e, a) {
    const checks = {
      verdict: e.valid === a.valid,
      'exactly its rule\'s reason': a.rules.length === e.rules.length && e.rules.every((r, i) => a.rules[i] === r),
      'crew and berths in the reason (hand-worked)': e.detail === null || a.details[0] === e.detail,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: r.expected.valid ? 'valid' : `rejected: crew: ${r.expected.detail}`, actual: r.actual.valid ? 'valid' : `rejected: ${r.actual.rules.map((x, i) => `${x}: ${r.actual.details[i]}`).join('; ')}` };
  },
};
