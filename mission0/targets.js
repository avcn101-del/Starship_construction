// mission0/targets.js — the targets of L4 (DESIGN.md 13l.2), as data read by
// the L4b scenarios, tools/battle.js and tools/estimates/l4.mjs. Each is a
// blueprint { rooms: [{ id, type, cell, rotation }], fittings: [[type, room,
// cell, side]] } on the T1 drydock grid, x forward, cells [x0, x1) x [y0, y1);
// every room is size M. js/battle.js buildShip validates each with the
// kernel's validateShip (the crew rule included) before it undocks.

// R1, the reference ship (13f.2): the engine (2 x 3) rotated 90 degrees spans [0, 3) x [2, 4), its exhaust at x = 0.
export const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: 17 radiators, then 4 RCS (fitting ids 17-20).
export const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
// R1c (#256): R1 with a plate of armour.plateThickness on the 8 wall segments around its magazine [7, 9) x [2, 4).
export const R1C_PLATES = [
  ['armour', 'magazine', [7, 2], [-1, 0]], ['armour', 'magazine', [7, 3], [-1, 0]], ['armour', 'magazine', [8, 2], [1, 0]], ['armour', 'magazine', [8, 3], [1, 0]],
  ['armour', 'magazine', [7, 2], [0, -1]], ['armour', 'magazine', [8, 2], [0, -1]], ['armour', 'magazine', [7, 3], [0, 1]], ['armour', 'magazine', [8, 3], [0, 1]],
];
// R1d (#261): R1c plus five plates around its turret [8, 10) x [4, 6): its four hull segments (8,5)+y, (9,5)+y, (9,4)+x,
// (9,5)+x and its wall to the beam bay (9,4)-y.
export const R1D_PLATES = [
  ['armour', 'turret', [8, 5], [0, 1]], ['armour', 'turret', [9, 5], [0, 1]], ['armour', 'turret', [9, 4], [1, 0]], ['armour', 'turret', [9, 5], [1, 0]], ['armour', 'turret', [9, 4], [0, -1]],
];
// T-neck (13l.2): an aft section (engine, reactor, shield generator, heat sink) joined to a forward section (bridge,
// magazine, beam bay, quarters, turret) only through a 2 x 2 hold, open from -y and +y; no fittings (as the estimate).
export const T_NECK_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'hold', type: 'hold', cell: [5, 2] },
  { id: 'bridge', type: 'bridge', cell: [7, 2] }, { id: 'magazine', type: 'magazine', cell: [9, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [11, 2] }, { id: 'quarters', type: 'quarters', cell: [7, 4] },
  { id: 'turret', type: 'turret', cell: [10, 4] },
];
// T-gun (13l.2): R1 with its beam bay replaced by a hold, the turret its only weapon; no fittings (as the estimate).
export const T_GUN_ROOMS = R1_ROOMS.map((r) => (r.id === 'beamBay' ? { id: 'bowHold', type: 'hold', cell: [9, 2] } : r));

// T-neck2 and T-gun2 (13n.1 (b), §17 item 36): the L4 layouts with the radiators R1 carries and its four RCS, room by
// room where their rooms allow, for L5's cases that hold a heading or fire for long; T-neck and T-gun stay as locked
// (their records read them). T-gun2: R1's 21 fittings with the beam bay's on the bow hold in its place (a hold may carry
// fittings). T-neck2: R1's fittings on the same rooms; the engine, heat sink and shield generator sit where R1's do,
// the beam bay's three radiators and two RCS move with it two cells forward ([11, 13) x [2, 4)).
export const T_NECK2_FITTINGS = [
  ...R1_FITTINGS.slice(0, 14),
  ['radiator', 'beamBay', [12, 2], [1, 0]], ['radiator', 'beamBay', [12, 3], [1, 0]], ['radiator', 'beamBay', [11, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [12, 3], [0, 1]], ['rcs', 'beamBay', [12, 2], [0, -1]],
];
export const T_GUN2_FITTINGS = R1_FITTINGS.map(([type, room, cell, side]) => [type, room === 'beamBay' ? 'bowHold' : room, cell, side]);

export const TARGETS = {
  R1: { rooms: R1_ROOMS, fittings: R1_FITTINGS },
  R1c: { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, ...R1C_PLATES] },
  R1d: { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, ...R1C_PLATES, ...R1D_PLATES] },
  'T-neck': { rooms: T_NECK_ROOMS, fittings: [] },
  'T-gun': { rooms: T_GUN_ROOMS, fittings: [] },
  'T-neck2': { rooms: T_NECK_ROOMS, fittings: T_NECK2_FITTINGS },
  'T-gun2': { rooms: T_GUN_ROOMS, fittings: T_GUN2_FITTINGS },
};
// The attacker of every L4b battle: R1d, the reference ship of L4b (#261).
export const ATTACKER = TARGETS.R1d;
