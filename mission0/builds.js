// mission0/builds.js — the builds of ship versus ship (DESIGN.md 13n.1 (e), 13n.8; #297, #305, #315, #316), as data
// read by L4.builds.valid, tools/sweep.mjs and the pace study. Each is a blueprint { rooms, fittings } on the T1
// drydock grid as mission0/targets.js's (x forward, cells [x0, x1) x [y0, y1), every room size M unless it says),
// validated by the kernel's validateShip when js/battle.js buildShip undocks it.
//
// The reference four on R1d's budget +- 5 % (price ∝ mass at undock, #279): R2 (R1d with an antenna and one point
// defence fitting: the gunboat), Lance (an N = 4 spinal railgun for the beam bay and turret, a slug magazine), Swarm
// (two missile bays, a missile magazine, two point-defence fittings, no turret), Furnace (an N = 6 beam bay, two
// shield generators, no turret). The degenerate six on R2's budget +- 5 %: Brick (plates on every wall, one S
// turret), Glass (a railgun and a reactor, the least quarters, no plates), Porcupine (four S turrets, two magazines),
// Fortress (three shield generators, one turret), Engine boat (two engines, one turret: the plume its weapon), Cold
// Brick (R1d's hull and plates with no radiator panel). Every build carries an antenna (HOLD_ANTENNA's edge where its
// room allows): the standard enemy's patience holds its weapons until it has resolved three zones (13n.1 (d)).
// The layouts are the engineer's; the lead designer locks them before the pace study (13n.8). Plates fill a build
// to its budget (39.25 t each at T1): where a layout drops R1d's turret plates it carries plates on its new rooms'
// hull edges instead.
//
//   node mission0/builds.js     prints each build's mass, acceleration and budget check (the kernel's readout)
import { R1_ROOMS, R1_FITTINGS, R1C_PLATES, R1D_PLATES, HOLD_ANTENNA, TARGETS } from './targets.js';
import { ROOMS, TIERS } from '../js/data.js';
import { createLayout, placeRoom, roomFootprint, plateProblem } from '../js/layout.js';

const without = (rooms, ...ids) => rooms.filter((r) => !ids.includes(r.id));
const swap = (rooms, id, room) => rooms.map((r) => (r.id === id ? room : r));
const plate = (room, cell, side) => ['armour', room, cell, side];
// R1's fittings by host: 0-3 the engine's radiators, 4-7 the heat sink's, 8-13 the shield generator's, 14-16 the beam
// bay's, 17-18 the engine's RCS, 19-20 the beam bay's RCS.
const AFT = R1_FITTINGS.slice(0, 14), ENGINE_RCS = [R1_FITTINGS[17], R1_FITTINGS[18]];
/** The beam bay's three radiators and two RCS on a bow room whose bow face is column x (rows 2 and 3). */
const bowFittings = (room, x, xBelow = 9) => [
  ['radiator', room, [x, 2], [1, 0]], ['radiator', room, [x, 3], [1, 0]], ['radiator', room, [xBelow, 2], [0, -1]],
  ['rcs', room, [x, 3], [0, 1]], ['rcs', room, [x, 2], [0, -1]],
];
const PD_HOLD = ['pd', 'hold', [8, 1], [1, 0]]; // the hold's bow edge of cell (8, 1)

// ---------- the reference four (R1d's budget) ----------
// R2: R1d-A (R1d with the hold's antenna) and one kinetic point-defence fitting on the hold's bow edge.
export const R2 = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, ...R1C_PLATES, ...R1D_PLATES, HOLD_ANTENNA, PD_HOLD] };

// Lance: an N = 4 railgun ([9, 13) x [2, 4)) in the beam bay's place, a hold (aftHold) in the turret's (it keeps the
// magazine inside), no turret; the magazine full of slugs (it shares the railgun's wall); R1c's eight magazine plates
// and four on the railgun's long hull edges for R1d's turret plates.
export const LANCE = {
  rooms: [...swap(without(R1_ROOMS, 'beamBay'), 'turret', { id: 'aftHold', type: 'hold', cell: [8, 4] }).map((r) => (r.id === 'magazine' ? { ...r, load: { type: 'railgun' } } : r)), { id: 'railgun', type: 'railgun', cell: [9, 2], length: 4 }],
  fittings: [...AFT, ...bowFittings('railgun', 12), ...ENGINE_RCS, ...R1C_PLATES, HOLD_ANTENNA,
    plate('railgun', [10, 2], [0, -1]), plate('railgun', [11, 2], [0, -1]), plate('railgun', [10, 3], [0, 1]), plate('railgun', [11, 3], [0, 1])],
};

// Swarm: two missile bays (bayT in the turret's place, rotated 90 degrees: [8, 10) x [4, 7), as R1-M's; bayB in the
// beam bay's place, [9, 12) x [2, 4), as R1-M3's), the magazine full of missiles on both bays' walls, two kinetic
// point-defence fittings on the hold's bow edges, no turret, no beam bay; plates: R1c's and four on bayT's hull edges
// (not its launch face (9, 4) +x).
const SWARM_LOAD = { seeker: 'designated', warhead: 'he' };
export const SWARM = {
  rooms: [...without(R1_ROOMS, 'turret', 'beamBay').map((r) => (r.id === 'magazine' ? { ...r, load: { type: 'missile', ...SWARM_LOAD } } : r)),
    { id: 'bayT', type: 'missileBay', cell: [8, 4], rotation: 90, load: SWARM_LOAD }, { id: 'bayB', type: 'missileBay', cell: [9, 2], load: SWARM_LOAD }],
  fittings: [...AFT, ...bowFittings('bayB', 11, 10), ...ENGINE_RCS, ...R1C_PLATES, HOLD_ANTENNA, PD_HOLD, ['pd', 'hold', [8, 0], [1, 0]],
    plate('bayT', [8, 6], [0, 1]), plate('bayT', [9, 6], [0, 1]), plate('bayT', [9, 5], [1, 0]), plate('bayT', [9, 6], [1, 0])],
};

// Furnace: an N = 6 beam bay ([9, 15) x [2, 4)), a second shield generator (shield2) in the hold's place carrying the
// antenna, an S quarters (quarters2, [8, 10) x [4, 5)) in the turret's for the second generator's crew, no turret;
// plates: R1c's and four on shield2's hull edges.
export const FURNACE = {
  rooms: [...swap(without(R1_ROOMS, 'turret', 'beamBay'), 'hold', { id: 'shield2', type: 'shieldGenerator', cell: [7, 0] }), { id: 'beamBay', type: 'beamBay', cell: [9, 2], length: 6 }, { id: 'quarters2', type: 'quarters', cell: [8, 4], size: 'S' }],
  fittings: [...AFT, ...bowFittings('beamBay', 14), ...ENGINE_RCS, ...R1C_PLATES, ['antenna', 'shield2', [8, 0], [0, -1]],
    plate('shield2', [7, 0], [0, -1]), plate('shield2', [7, 0], [-1, 0]), plate('shield2', [8, 0], [1, 0]), plate('shield2', [8, 1], [1, 0])],
};

// ---------- the degenerate six (R2's budget) ----------
// Brick: a block of S rooms (6 x 3 cells less the corner (5, 2)) with a plate on every wall segment a plate may take
// (plateProblem: every shared wall and every hull edge of a room not placed inside, less the edges its fittings hold),
// one S turret on the bow: the engine S ([0, 2) x [1, 2), its exhaust at x = 0), reactor, bridge and magazine (S rounds) S in a row ahead
// of it, the turret S at (5, 1); the quarters S ([2, 4) x [2, 3)) and nine holds S around them; 31 plates.
const BRICK_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 1], rotation: 90, size: 'S' },
  { id: 'reactor', type: 'reactor', cell: [2, 1], size: 'S' },
  { id: 'bridge', type: 'bridge', cell: [3, 1], size: 'S' },
  { id: 'magazine', type: 'magazine', cell: [4, 1], size: 'S', load: { size: 'S' } },
  { id: 'turret', type: 'turret', cell: [5, 1], size: 'S' },
  { id: 'quarters', type: 'quarters', cell: [2, 2], size: 'S' },
  ...[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 2], [1, 2], [4, 2]].map((cell, i) => ({ id: `hold${i + 1}`, type: 'hold', cell, size: 'S' })),
];
const BRICK_FITTINGS = [['antenna', 'hold4', [3, 0], [0, -1]], ['radiator', 'hold2', [1, 0], [0, -1]], ['radiator', 'hold8', [1, 2], [0, 1]],
  ['rcs', 'hold1', [0, 0], [0, -1]], ['rcs', 'hold7', [0, 2], [0, 1]], ['rcs', 'hold6', [5, 0], [0, -1]], ['rcs', 'turret', [5, 1], [0, 1]]];
/** Every wall segment of a layout's rooms that a plate may take after `fittings` (js/layout.js plateProblem), once each. */
export function everyWall(rooms, fittings, grid = TIERS.T1.grid) {
  const layout = createLayout({ edge: 1, grid });
  for (const r of rooms) {
    placeRoom(layout, r.id, roomFootprint(ROOMS[r.type], r.type, r.size || 'M', r.length ?? null), r.cell, r.rotation || 0, r.type);
  }
  const placed = fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })), out = [];
  for (const r of rooms) {
    for (const c of layout.rooms.get(r.id).cells) {
      for (const side of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const f = { type: 'armour', room: r.id, cell: [...c], side };
        if (plateProblem(layout, ROOMS, f, placed)) continue;
        placed.push(f);
        out.push(plate(r.id, [...c], side));
      }
    }
  }
  return out;
}
export const BRICK = { rooms: BRICK_ROOMS, fittings: [...BRICK_FITTINGS, ...everyWall(BRICK_ROOMS, BRICK_FITTINGS)] };

// Glass: an L reactor (3 x 3, [3, 6) x [1, 4)), an N = 2 railgun on the axis at its bow, a slug magazine S beside it,
// the bridge S, the engine S and the least quarters that house the crew (two S quarters, 16 berths); no plates.
export const GLASS = {
  rooms: [
    { id: 'engine', type: 'engine', cell: [1, 2], rotation: 90, size: 'S' }, // [1, 3) x [2, 3)
    { id: 'reactor', type: 'reactor', cell: [3, 1], size: 'L' },
    { id: 'bridge', type: 'bridge', cell: [6, 2], size: 'S' },
    { id: 'magazine', type: 'magazine', cell: [6, 1], size: 'S', load: { type: 'railgun' } },
    { id: 'railgun', type: 'railgun', cell: [7, 1], length: 2 }, // [7, 9) x [1, 3)
    { id: 'quarters', type: 'quarters', cell: [3, 4], size: 'S' }, // [3, 5) x [4, 5)
    { id: 'quarters2', type: 'quarters', cell: [5, 4], size: 'S' }, // [5, 7) x [4, 5)
    { id: 'hold', type: 'hold', cell: [6, 3], size: 'S' },
  ],
  fittings: [['radiator', 'engine', [2, 2], [0, 1]], ['radiator', 'engine', [2, 2], [0, -1]], ['radiator', 'railgun', [8, 1], [1, 0]], ['radiator', 'railgun', [8, 2], [1, 0]],
    ['antenna', 'hold', [6, 3], [1, 0]], ['rcs', 'engine', [1, 2], [0, 1]], ['rcs', 'engine', [1, 2], [0, -1]], ['rcs', 'railgun', [8, 2], [0, 1]], ['rcs', 'railgun', [8, 1], [0, -1]]],
};

// Porcupine: four S turrets fed by two magazines of S rounds: the magazine at R1's place and magazine2 in the beam
// bay's; t1 (8, 4) and t2 (9, 4) below them in the turret's place, t3 (11, 2) and t4 (11, 3) at the bow; R1d's
// magazine plates, plates on the S turrets' hull edges and walls for R1d's turret plates.
export const PORCUPINE = {
  rooms: [...without(R1_ROOMS, 'turret', 'beamBay').map((r) => (r.id === 'magazine' ? { ...r, load: { size: 'S' } } : r)),
    { id: 'magazine2', type: 'magazine', cell: [9, 2], load: { size: 'S' } },
    { id: 't1', type: 'turret', cell: [8, 4], size: 'S' }, { id: 't2', type: 'turret', cell: [9, 4], size: 'S' },
    { id: 't3', type: 'turret', cell: [11, 2], size: 'S' }, { id: 't4', type: 'turret', cell: [11, 3], size: 'S' }],
  fittings: [...AFT, ['radiator', 't3', [11, 2], [1, 0]], ['radiator', 't4', [11, 3], [1, 0]], ['radiator', 't2', [9, 4], [1, 0]],
    ...ENGINE_RCS, ['rcs', 't4', [11, 3], [0, 1]], ['rcs', 't3', [11, 2], [0, -1]], ...R1C_PLATES, HOLD_ANTENNA,
    plate('t1', [8, 4], [0, 1]), plate('t2', [9, 4], [0, 1]), plate('t3', [11, 2], [-1, 0]), plate('t4', [11, 3], [-1, 0]), plate('t2', [9, 4], [0, -1])],
};

// Fortress: R1d-A with three shield generators (shield2 in the beam bay's place, shield3 in the hold's, carrying the
// antenna) and its one turret.
export const FORTRESS = {
  rooms: [...swap(swap(R1_ROOMS, 'beamBay', { id: 'shield2', type: 'shieldGenerator', cell: [9, 2] }), 'hold', { id: 'shield3', type: 'shieldGenerator', cell: [7, 0] })],
  fittings: [...AFT, ...bowFittings('shield2', 10), ...ENGINE_RCS, ...R1C_PLATES, ...R1D_PLATES, ['antenna', 'shield3', [8, 0], [0, -1]]],
};

// Engine boat: R1d-A with a second engine (engine2, [0, 3) x [4, 6), its exhaust at x = 0) and a hold (bowHold) in the
// beam bay's place: two engines, one turret; the plume its weapon (#297). The fittings engine2 covers (the engine's
// two +y radiators and +y RCS, the heat sink's two -x radiators) go; engine2 carries two radiators and the +y RCS.
export const ENGINE_BOAT = {
  rooms: [...swap(R1_ROOMS, 'beamBay', { id: 'bowHold', type: 'hold', cell: [9, 2] }), { id: 'engine2', type: 'engine', cell: [0, 4], rotation: 90 }],
  fittings: [...AFT.filter((f, i) => i !== 0 && i !== 1 && i !== 6 && i !== 7), ...bowFittings('bowHold', 10), ['radiator', 'engine2', [1, 5], [0, 1]], ['radiator', 'engine2', [2, 5], [0, 1]],
    R1_FITTINGS[18], ['rcs', 'engine2', [0, 5], [0, 1]], ...R1C_PLATES, ...R1D_PLATES, HOLD_ANTENNA],
};

// Cold Brick (#305): R1d-A with no radiator panel: R1d's hull, plates and four RCS, the hold's antenna.
export const COLD_BRICK = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS.filter(([t]) => t !== 'radiator'), ...R1C_PLATES, ...R1D_PLATES, HOLD_ANTENNA] };

export const REFERENCE = { R2, Lance: LANCE, Swarm: SWARM, Furnace: FURNACE };
export const DEGENERATE = { Brick: BRICK, Glass: GLASS, Porcupine: PORCUPINE, Fortress: FORTRESS, 'Engine boat': ENGINE_BOAT, 'Cold Brick': COLD_BRICK };
export const BUILDS = { ...REFERENCE, ...DEGENERATE };
/** The budget each build is on (13n.1 (e)): the reference four on R1d's, the degenerate six on R2's; +- 5 %. */
export const BUDGET = { reference: { ship: 'R1d', blueprint: TARGETS.R1d }, degenerate: { ship: 'R2', blueprint: R2 }, tolerance: 0.05 };
export const budgetOf = (name) => (REFERENCE[name] ? BUDGET.reference : BUDGET.degenerate);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { PARAMS } = await import('../js/data.js');
  const { buildShip } = await import('../js/battle.js');
  const { readout } = await import('../js/rooms.js');
  const mass = (bp) => readout(buildShip(PARAMS, 'T1', bp).world);
  const base = { R1d: mass(TARGETS.R1d).mass, R2: mass(R2).mass };
  console.log(`budgets (mass at undock, the readout's, T1): R1d ${(base.R1d / 1e3).toFixed(1)} t, R2 ${(base.R2 / 1e3).toFixed(1)} t; each build within +- ${BUDGET.tolerance * 100} % of its own`);
  for (const [name, bp] of Object.entries(BUILDS)) {
    const b = budgetOf(name), r = mass(bp), B = base[b.ship], ratio = r.mass / B;
    console.log(`${name.padEnd(11)} ${(r.mass / 1e3).toFixed(1).padStart(7)} t  ${r.accelerationG.toFixed(3)} g  ${(ratio * 100).toFixed(1)} % of ${b.ship}  ${Math.abs(ratio - 1) <= BUDGET.tolerance ? 'within' : 'OUTSIDE'} the budget; ${bp.rooms.length} rooms, ${bp.fittings.filter((f) => f[0] === 'armour').length} plates, ${bp.fittings.filter((f) => f[0] !== 'armour').length} fittings`);
  }
}
