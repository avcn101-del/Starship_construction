import { createWorld, addRoom } from '../../../js/rooms.js';
import { validateShip } from '../../../js/layout.js';
import { ROOMS } from '../../../js/data.js';

// S19 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-3): every placement and validation rule of 13d.1 and
// 13f.1 names itself, and a valid layout passes. Placement errors throw from the kernel's addRoom on a T1 cluster;
// validation rules are reported by the kernel's validateShip on blueprints of the T1 drydock grid built from R1.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
const bp = (rooms, fittings) => ({ grid: [30, 14], edge: 5, rooms: rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) });
const shift = (dx) => ({ rooms: R1_ROOMS.map((r) => ({ ...r, cell: [r.cell[0] + dx, r.cell[1]] })), fittings: R1_FITTINGS.map(([t, room, c, s]) => [t, room, [c[0] + dx, c[1]], s]) });
const S2 = shift(2);
// Blueprints, each breaking one rule (or none).
const BLUEPRINTS = {
  valid: bp(R1_ROOMS, R1_FITTINGS),
  grid: bp([...R1_ROOMS, { id: 'extra', type: 'hold', cell: [29, 0] }], R1_FITTINGS),
  overlap: bp([...R1_ROOMS, { id: 'extra', type: 'hold', cell: [8, 2] }], R1_FITTINGS),
  connected: bp([...R1_ROOMS, { id: 'extra', type: 'hold', cell: [20, 10] }], R1_FITTINGS),
  hull: bp([{ id: 'bridge', type: 'bridge', cell: [6, 2] }, { id: 'turret', type: 'turret', cell: [2, 2] }, { id: 'h1', type: 'hold', cell: [0, 2] }, { id: 'h2', type: 'hold', cell: [4, 2] }, { id: 'h3', type: 'hold', cell: [2, 0] }, { id: 'h4', type: 'hold', cell: [2, 4] }], []),
  exhaust: bp([...S2.rooms, { id: 'extra', type: 'hold', cell: [0, 2] }], S2.fittings),
  axis: bp(R1_ROOMS.map((r) => (r.id === 'beamBay' ? { ...r, cell: [9, 0] } : r)), R1_FITTINGS.filter(([, room]) => room !== 'beamBay')),
  bow: bp([...R1_ROOMS, { id: 'extra', type: 'hold', cell: [11, 2] }], R1_FITTINGS.filter(([, room, c, s]) => !(room === 'beamBay' && s[0] === 1))),
  'fitting-open-edge': bp(R1_ROOMS, [...R1_FITTINGS, ['radiator', 'engine', [1, 2], [0, 1]]]),
  'fitting-inside': bp(R1_ROOMS, [...R1_FITTINGS, ['radiator', 'bridge', [5, 2], [0, -1]]]),
  'fitting-exhaust': bp(R1_ROOMS, [...R1_FITTINGS, ['rcs', 'engine', [0, 2], [-1, 0]]]),
  'fitting-per-edge': bp(R1_ROOMS, [...R1_FITTINGS, ['radiator', 'beamBay', [10, 2], [1, 0]]]),
};
// Placements on a T1 cluster, each breaking one rule of placeRoom (13d.1), and the message each must carry.
const PLACEMENTS = {
  'place-overlap': { first: { type: 'hold', cell: [0, 0] }, second: { type: 'hold', cell: [1, 1] }, says: 'overlaps' },
  'place-grid': { first: null, second: { type: 'hold', cell: [29, 13] }, says: 'outside' },
  'place-rotation': { first: null, second: { type: 'hold', cell: [0, 0], rotation: 45 }, says: 'rotation' },
  'place-integer': { first: null, second: { type: 'hold', cell: [1.5, 0] }, says: 'integer' },
  'place-valid': { first: { type: 'hold', cell: [0, 0] }, second: { type: 'hold', cell: [2, 0] }, says: null },
};

export default {
  id: 'L2.layout.invalid',
  level: 'L2',
  laws: ['an invalid ship never undocks; each failure names its rule (#57, 13f.1)', 'rooms never overlap and sit on whole cells of the grid, rotated 0 or 90 degrees (13d.1)'],
  dependsOn: [],
  setup: 'on the T1 grid: (placements) the kernel\'s addRoom with an overlapping room, a room off the grid, a 45 degree rotation, a non-integer cell, and a valid pair; (blueprints) the kernel\'s validateShip on R1 (13f.2) and on R1 changed to break one rule each: grid, overlap, connected, hull (a turret walled in by holds), exhaust (a hold aft of the engine), axis (the beam bay off the axis rows), bow (a hold ahead of the bay), and the four fitting rules (13k.4 S19)',
  measure: 'whether addRoom throws and its message; validateShip\'s valid flag and the rules it names',
  tolerance: 'exact',
  criterion: 'each bad placement throws with its message (overlaps, outside, rotation, integer) and the valid pair does not; R1 is valid with no reason; each broken blueprint is invalid and names its rule, exactly once, and no other rule (#57, #192, #208, #234, #244)',
  tunable: [],
  locked: null,
  cases() {
    return [...Object.keys(PLACEMENTS).map((name) => ({ kind: 'place', name })), ...Object.keys(BLUEPRINTS).map((name) => ({ kind: 'validate', name }))];
  },
  expected(ctx, c) {
    if (c.kind === 'place') return { throws: PLACEMENTS[c.name].says !== null, says: PLACEMENTS[c.name].says };
    return { valid: c.name === 'valid', rules: c.name === 'valid' ? [] : [c.name] };
  },
  run(ctx, c) {
    if (c.kind === 'place') {
      const x = PLACEMENTS[c.name], world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
      try {
        if (x.first) addRoom(world, x.first.type, { id: 'first', cell: x.first.cell });
        addRoom(world, x.second.type, { id: 'second', cell: x.second.cell, rotation: x.second.rotation || 0 });
        return { threw: false, message: null };
      } catch (e) { return { threw: true, message: String(e.message) }; }
    }
    const v = validateShip(BLUEPRINTS[c.name], ROOMS);
    return { valid: v.valid, rules: v.reasons.map((r) => r.rule) };
  },
  compare(e, a, c) {
    const pass = c.kind === 'place'
      ? a.threw === e.throws && (!e.throws || a.message.includes(e.says))
      : a.valid === e.valid && a.rules.length === e.rules.length && e.rules.every((r) => a.rules.filter((x) => x === r).length === 1);
    return { pass, note: pass ? '' : 'rule not named as specified' };
  },
  display(r) {
    return r.case.kind === 'place'
      ? { expected: r.expected.throws ? `throws "${r.expected.says}"` : 'no throw', actual: r.actual.threw ? `throws: ${r.actual.message}` : 'no throw' }
      : { expected: r.expected.valid ? 'valid' : `invalid: ${r.expected.rules.join(', ')}`, actual: r.actual.valid ? 'valid' : `invalid: ${r.actual.rules.join(', ')}` };
  },
};
