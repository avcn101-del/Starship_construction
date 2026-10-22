// proto/config.js — every setting of the feel prototype v2 (DESIGN.md 13j,
// #217, #237) that is not in js/data.js. Each one is a PROTOTYPE SETTING,
// NOT A GAME NUMBER: it shapes the throwaway page (geometry, the scripted
// enemy, presets, the stand-in autopilot's gains, colours, layout) and is
// never read by the kernel. Every number that affects the physics comes from
// js/data.js; the loadout panel's shield budget and hits to wreck are
// run-time overrides of js/data.js constants (withOverrides), checked against
// their approved min-max.

import { PARAMS } from '../js/data.js';

// Prototype setting: the reference ship R1 (DESIGN.md 13f.2), copied from
// the L3 scenarios. x forward, cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees spans [0, 3) x [2, 4) with its exhaust at x = 0.
export const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// Prototype setting: R1's fittings (13f.2): 17 radiators, then 4 RCS (fitting ids 17-20).
export const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
// Prototype setting: R1's footprint on its grid (cells), for drawing.
export const R1_SIZE = [11, 6];

// Prototype setting: R1-B, a lever of the loadout panel (#223's ladder, layout rung): R1 with the hold moved from
// [7, 9) x [0, 2) to [9, 11) x [2, 4) and the beam bay from [9, 11) x [2, 4) to [11, 13) x [2, 4), so the hold
// stands between the beam bay and the magazine. 17 radiators (the beam bay's three on its free edges: two on its
// bow face, one underneath) and the same 4 RCS (fitting ids 17-20, the bow pair moved with the beam bay).
// Checked with the kernel's validateShip (js/layout.js) every time a ship is built.
const moved = { hold: [9, 2], beamBay: [11, 2] };
export const R1B_ROOMS = R1_ROOMS.map((r) => (moved[r.id] ? { ...r, cell: moved[r.id] } : r));
export const R1B_FITTINGS = [
  ...R1_FITTINGS.slice(0, 14),
  ['radiator', 'beamBay', [12, 2], [1, 0]], ['radiator', 'beamBay', [12, 3], [1, 0]], ['radiator', 'beamBay', [11, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [12, 3], [0, 1]], ['rcs', 'beamBay', [12, 2], [0, -1]],
];
export const R1B_SIZE = [13, 6];
// Prototype setting: R1c (DESIGN.md 13l.2, #255, #256), a lever of the loadout panel: R1 with an armour plate of
// armour.plateThickness (js/data.js) on each of the 8 wall segments around its magazine [7, 9) x [2, 4) (a
// citadel): the walls to the bridge (x = 7), the beam bay (x = 9), the hold (y = 2) and the quarters and turret
// (y = 4). The plates follow R1's 21 fittings (ids 21-28), so the RCS keep ids 17-20.
export const R1C_FITTINGS = [
  ...R1_FITTINGS,
  ['armour', 'magazine', [7, 2], [-1, 0]], ['armour', 'magazine', [7, 3], [-1, 0]], ['armour', 'magazine', [8, 2], [1, 0]], ['armour', 'magazine', [8, 3], [1, 0]],
  ['armour', 'magazine', [7, 2], [0, -1]], ['armour', 'magazine', [8, 2], [0, -1]], ['armour', 'magazine', [7, 3], [0, 1]], ['armour', 'magazine', [8, 3], [0, 1]],
];
// Prototype setting: R1d (DESIGN.md 13l.2, #261, #264), the default layout since L4b: R1c plus five plates around its
// turret [8, 10) x [4, 6): its four hull segments and its wall to the beam bay (fitting ids 29-33).
export const R1D_FITTINGS = [
  ...R1C_FITTINGS,
  ['armour', 'turret', [8, 5], [0, 1]], ['armour', 'turret', [9, 5], [0, 1]], ['armour', 'turret', [9, 4], [1, 0]], ['armour', 'turret', [9, 5], [1, 0]], ['armour', 'turret', [9, 4], [0, -1]],
];
// Prototype setting: the layouts the loadout panel offers.
export const LAYOUTS = {
  R1D: { label: 'R1d', rooms: R1_ROOMS, fittings: R1D_FITTINGS, size: R1_SIZE },
  R1: { label: 'R1', rooms: R1_ROOMS, fittings: R1_FITTINGS, size: R1_SIZE },
  R1B: { label: 'R1-B', rooms: R1B_ROOMS, fittings: R1B_FITTINGS, size: R1B_SIZE },
  R1C: { label: 'R1c', rooms: R1_ROOMS, fittings: R1C_FITTINGS, size: R1_SIZE },
};

// Prototype setting: the loadout panel (#223's ladder: constants within approved ranges, then layout and
// combinations of existing physics; DESIGN.md 13j.2). Magazine, layout, shield budget, hits to wreck and turrets
// apply to both ships alike; the three standing orders (range, facing, dodge; DESIGN.md 8) are the player's: the
// enemy keeps its script's (SCRIPT.orders). Each lever lists its options; the first is the default.
//  magazine: what the magazine holds, as a fraction of magazine.capacity by mass, loaded as rounds by the kernel's
//    loadMagazine (whole rounds of kinetic.roundMass).
//  layout: a key of LAYOUTS.
//  shieldBudget / hitsToWreck: run-time overrides of shield.budget (W) and kinetic.hitsToWreck (withOverrides);
//    null keeps the js/data.js value. battle.js refuses a value outside the constant's approved min-max.
//  turrets: false holds both turrets (the beam-only probe).
//  range / facing / dodge: the player's standing orders (RANGES, FACINGS); Fire flies them as set.
export const LOADOUT = {
  magazine: { label: 'Magazine', options: [
    { value: 'heFull', label: 'HE full', he: 1, ap: 0 }, { value: 'apFull', label: 'AP full', he: 0, ap: 1 },
    { value: 'heHalf', label: 'HE half', he: 0.5, ap: 0 }, { value: 'apQuarter', label: 'AP quarter', he: 0, ap: 0.25 },
  ] },
  layout: { label: 'Layout', options: [{ value: 'R1D', label: 'R1d' }, { value: 'R1', label: 'R1' }, { value: 'R1B', label: 'R1-B' }, { value: 'R1C', label: 'R1c' }] },
  shieldBudget: { label: 'Shield budget', override: 'shield.budget', options: [{ value: null, label: `${PARAMS.shield.budget.value / 1e6} MW` }, { value: 5e6, label: '5 MW' }, { value: 2e7, label: '20 MW' }] },
  hitsToWreck: { label: 'Hits to wreck', override: 'kinetic.hitsToWreck', options: [{ value: null, label: `${PARAMS.kinetic.hitsToWreck.value}` }, { value: 5, label: '5' }] },
  turrets: { label: 'Turrets', options: [{ value: true, label: 'on' }, { value: false, label: 'off' }] },
  range: { label: 'Range order', options: [{ value: 'hold', label: 'hold 900' }, { value: 'close', label: 'close 600' }, { value: 'open', label: 'open 1500' }] },
  facing: { label: 'Facing order', options: [{ value: 'bow', label: 'bow-on' }, { value: 'broadside', label: 'broadside' }] },
  dodge: { label: 'Dodge order', options: [{ value: false, label: 'off' }, { value: true, label: 'on' }] },
};
export const LOADOUT_ORDER = ['magazine', 'layout', 'shieldBudget', 'hitsToWreck', 'turrets', 'range', 'facing', 'dodge'];
/** The default loadout: every lever's first option. */
export const defaultLoadout = () => Object.fromEntries(LOADOUT_ORDER.map((k) => [k, LOADOUT[k].options[0].value]));
/** A short text of a loadout, for the corner of the battle view and the measure. */
export const loadoutText = (lo) => LOADOUT_ORDER.map((k) => `${LOADOUT[k].label}: ${LOADOUT[k].options.find((o) => o.value === lo[k]).label}`).join(' · ');

// Prototype setting: the range order's distances (DESIGN.md 13j.2, #54's band 0.6-1.5 km), centre of mass to
// centre of mass.
export const RANGES = { close: 600, hold: 900, open: 1500 }; // m

// Prototype setting: where the ships start (13j.2): the hold distance apart, facing each other, at rest. The
// player's centre of mass sits at the origin facing +x; the enemy's at (START_SEPARATION, 0) facing -x.
export const START_SEPARATION = RANGES.hold; // m
export const TIER = 'T1';

// Prototype setting: the first battle's seed (the seeded RNG of js/util.js times each ship's dodge). The panel
// shows it, Restart adds 1, the player may type another; the export writes it.
export const SEED = 1;

// Prototype setting: the version written in an export (proto/export.js). There is no build step to stamp a git hash,
// so it is a constant: change it whenever proto/ or js/ changes what a battle does, so proto/replay.mjs can tell an
// export of another version.
export const PROTO_VERSION = 'feel-5';

// Prototype setting: the three presets (13j.2). throttle: the most the autopilot may open the engine (a stand-in
// number, listed on screen, #233); orders: which standing orders the preset overrides (null: the ship's own).
//  Fire: weapons on the target, shield on, the standing orders as set (engine up to half, as v1's Fire).
//  Cool: weapons off, shield off, engine off: the ship coasts, the RCS holds the facing order's heading, no dodge.
//  Evade: weapons hold, shield on, broadside and dodge on at full thrust (the range order still comes first, #40).
export const PRESETS = {
  fire: { label: 'Fire', beam: true, turret: true, shield: true, throttle: 0.5, orders: null },
  cool: { label: 'Cool', beam: false, turret: false, shield: false, throttle: 0, orders: { dodge: false } },
  evade: { label: 'Evade', beam: false, turret: false, shield: true, throttle: 1, orders: { facing: 'broadside', dodge: true } },
};
export const PRESET_ORDER = ['fire', 'cool', 'evade'];

// Prototype setting: the enemy's fixed script (13j.2, v1's): Fire 60 s, Cool 30 s, repeat; aiming at the player's
// beam bay, then turret, then engine (each until it is wrecked), with the standing orders hold 900, bow-on, dodge on.
export const SCRIPT = {
  phases: [{ preset: 'fire', seconds: 60 }, { preset: 'cool', seconds: 30 }],
  targets: ['beamBay', 'turret', 'engine'],
  orders: { range: 'hold', facing: 'bow', dodge: true },
};

// STAND-IN autopilot (for L4's helm.js; DESIGN.md 13j.2). Every number below is a PROTOTYPE SETTING, NOT A GAME
// NUMBER: gains and thresholds of a controller that flies the kernel's engine and RCS fittings; none enters the
// physics (thrust, RCS force, masses and inertia come from js/data.js through the kernel).
export const AUTOPILOT = {
  // Range (first, #40): out of the dead band, or drifting too fast, the ship thrusts to fly the wanted closing speed
  // with no drift across the line of sight. PROTOTYPE SETTING, NOT A GAME NUMBER.
  rangeDeadBand: 100, // m: |range - order| inside this leaves the range alone
  rangeGain: 0.05, // 1/s: wanted closing speed = gain x range error, PROTOTYPE SETTING, NOT A GAME NUMBER
  maxClosingSpeed: 40, // m/s: cap on that wanted speed, PROTOTYPE SETTING, NOT A GAME NUMBER
  speedTolerance: 2, // m/s: a relative velocity error inside this needs no thrust, PROTOTYPE SETTING, NOT A GAME NUMBER
  driftLimit: 50, // m/s: relative velocity off the wanted one (dodging drift) beyond this calls the range order too, PROTOTYPE SETTING, NOT A GAME NUMBER
  // Heading (facing, second): a time-optimal turn toward the wanted heading, held by the RCS fittings against
  // the thrust torque. PROTOTYPE SETTING, NOT A GAME NUMBER.
  turnAuthority: 0.7, // fraction of the RCS couple's angular acceleration a turn plans on, PROTOTYPE SETTING, NOT A GAME NUMBER
  turnRateTime: 0.25, // s: time constant of the turn-rate loop, PROTOTYPE SETTING, NOT A GAME NUMBER
  aimTolerance: 10 * Math.PI / 180, // rad: the engine opens only within this of the wanted heading, PROTOTYPE SETTING, NOT A GAME NUMBER
  // Dodge (third): the sign of the thrust across the line of sight flips at seeded random intervals. Broadside
  // that is a turn to the other broadside (the engine pushes only forward); bow-on the RCS pushes sideways.
  dodgeMin: 6, // s, PROTOTYPE SETTING, NOT A GAME NUMBER
  dodgeMax: 14, // s, PROTOTYPE SETTING, NOT A GAME NUMBER
};

// Culling and Disabled are constants of js/data.js since physics pass 2 (battle.cullDistance,
// battle.disabledSeconds, 13k.2); battle.js reads them there.

// Prototype setting: time controls (13j.2) and the cap on steps per frame.
export const SPEEDS = [1, 2, 4];
export const MAX_STEPS_PER_FRAME = 60;

// Prototype setting: the log keeps this many lines on screen.
export const LOG_LINES = 120;

// Prototype setting: colours, high contrast for a phone in sunlight.
export const COLOURS = {
  background: '#000000', text: '#ffffff', dim: '#a8a8a8', grid: '#3a3a3a',
  player: '#38e8ff', enemy: '#ff5a3c', target: '#ffff00',
  round: '#ffffff', beam: '#ff3cff', beamAbsorbed: '#38e8ff', shield: '#38e8ff', miss: '#a8a8a8',
  destroyed: '#000000', cross: '#ff2020',
  // Temperature ramp against a room's own thresholds (rest, hot, overheated, critical).
  cold: [40, 70, 160], warm: [40, 150, 60], hot: [255, 190, 0], overheated: [255, 60, 0], critical: [255, 255, 255],
};

// Prototype setting: short room labels for the view.
export const LABELS = { engine: 'ENG', reactor: 'RCT', bridge: 'BRG', magazine: 'MAG', beamBay: 'BEAM', heatSink: 'SINK', quarters: 'QTR', turret: 'TUR', shield: 'SHLD', hold: 'HOLD' };

const pct = (x) => `${Math.round(x * 100)} %`;
// What the prototype stands in for (13j.2), listed on screen and in the README (#233: the enemy's script and
// every preset's throttle among them).
export const STAND_INS = [
  'Autopilot (for L4\'s helm): three standing orders. Range first: out of a 100 m dead band (or drifting over 50 m/s) it thrusts to fly a closing speed with no sideways drift. Facing next: bow-on or broadside, heading held by the RCS against the thrust torque, turned by the bow-stern couple. Dodge last: the thrust\'s sign across the line of sight flips every 6-14 s (seeded); broadside that means turning to the other broadside, bow-on only the RCS pushes sideways.',
  `Presets: Fire = weapons on the target, shield on, orders as set, engine up to ${pct(PRESETS.fire.throttle)}. Cool = weapons off, shield off, engine off (coasting, RCS holds heading, no dodge). Evade = weapons hold, shield on, broadside and dodge, engine up to ${pct(PRESETS.evade.throttle)}.`,
  `Enemy script: Fire 60 s, Cool 30 s, repeat; targets your beam bay, then turret, then engine, each until wrecked; orders hold 900 m, bow-on, dodge on.`,
  'Turret: free aim in any direction at the lead point (target room extrapolated at its ship\'s velocity over the time of flight): no traverse arc, no slew, no dispersion; its rounds never hit their own ship.',
  'A cell the line clips at a corner counts as crossed whole: the kernel has the chord rule (13k.1), the prototype passes no chord yet.',
  'Both sides see the true layout: no scans.',
  'No point defence, no missiles, no railgun.',
  `Disabled: no weapon able to fire for ${PARAMS.battle.disabledSeconds.value} s, whatever the engine does (the kernel's rule, js/battle.js weaponStates, #255). Destroyed: a reactor or magazine explodes, or the largest piece is under ${PARAMS.battle.wreckFraction.value} of the ship (#83).`,
];
