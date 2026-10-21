// proto/config.js — every setting of the feel prototype (DESIGN.md 13h,
// #217, #224) that is not in js/data.js. Each one is a PROTOTYPE SETTING,
// NOT A GAME NUMBER: it shapes the throwaway page (geometry, the scripted
// enemy, presets, colours, layout) and is never read by the kernel. Every
// number that affects the physics comes from js/data.js; the loadout panel's
// shield budget and hits to wreck are run-time overrides of js/data.js
// constants (withOverrides), checked against their approved min-max.

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
// Prototype setting: the layouts the loadout panel offers.
export const LAYOUTS = {
  R1: { label: 'R1', rooms: R1_ROOMS, fittings: R1_FITTINGS, size: R1_SIZE },
  R1B: { label: 'R1-B', rooms: R1B_ROOMS, fittings: R1B_FITTINGS, size: R1B_SIZE },
};

// Prototype setting: the loadout panel (#223's ladder: constants within approved ranges, then layout and
// combinations of existing physics). One loadout applies to both ships alike. Each lever lists its options; the
// first is the default, and the defaults give the battle of the prototype without the panel (same event hash).
//  magazine: what the magazine holds, as a fraction of magazine.capacity by mass, loaded as rounds by the kernel's
//    loadMagazine (whole rounds of kinetic.roundMass).
//  armour: armour cells in front of each bow-facing row (a STAND-IN, see STAND_INS).
//  layout: a key of LAYOUTS.
//  shieldBudget / hitsToWreck: run-time overrides of shield.budget (W) and kinetic.hitsToWreck (withOverrides);
//    null keeps the js/data.js value. battle.js refuses a value outside the constant's approved min-max.
//  turrets: false holds both turrets (the beam-only probe).
export const LOADOUT = {
  magazine: { label: 'Magazine', options: [
    { value: 'heFull', label: 'HE full', he: 1, ap: 0 }, { value: 'apFull', label: 'AP full', he: 0, ap: 1 },
    { value: 'heHalf', label: 'HE half', he: 0.5, ap: 0 }, { value: 'apQuarter', label: 'AP quarter', he: 0, ap: 0.25 },
  ] },
  armour: { label: 'Bow armour', options: [{ value: 0, label: 'none' }, { value: 1, label: '1 cell' }, { value: 2, label: '2 cells' }] },
  layout: { label: 'Layout', options: [{ value: 'R1', label: 'R1' }, { value: 'R1B', label: 'R1-B' }] },
  shieldBudget: { label: 'Shield budget', override: 'shield.budget', options: [{ value: null, label: `${PARAMS.shield.budget.value / 1e6} MW` }, { value: 5e6, label: '5 MW' }, { value: 2e7, label: '20 MW' }] },
  hitsToWreck: { label: 'Hits to wreck', override: 'kinetic.hitsToWreck', options: [{ value: null, label: `${PARAMS.kinetic.hitsToWreck.value}` }, { value: 5, label: '5' }] },
  turrets: { label: 'Turrets', options: [{ value: true, label: 'on' }, { value: false, label: 'off' }] },
};
export const LOADOUT_ORDER = ['magazine', 'armour', 'layout', 'shieldBudget', 'hitsToWreck', 'turrets'];
/** The default loadout: every lever's first option. */
export const defaultLoadout = () => Object.fromEntries(LOADOUT_ORDER.map((k) => [k, LOADOUT[k].options[0].value]));
/** A short text of a loadout, for the corner of the battle view and the measure. */
export const loadoutText = (lo) => LOADOUT_ORDER.map((k) => `${LOADOUT[k].label}: ${LOADOUT[k].options.find((o) => o.value === lo[k]).label}`).join(' · ');

// Prototype setting: the two ships' stations (13h.2: 900 m apart, facing
// each other, within #54's 0.6-1.5 km). The player's centre of mass sits at
// the origin facing +x; the enemy's 900 m ahead facing -x.
export const SEPARATION = 900; // m
export const TIER = 'T1';

// Prototype setting: the battle's seed (the seeded RNG of js/util.js picks
// which row of the aimed room a round flies along).
export const SEED = 20261021;

// Prototype setting: the three presets (13h.2). Fire: beam and turret on
// the target, shield on, engine half. Cool: weapons off, shield off, engine
// off. Evade: engine full, RCS turning, weapons hold; 13h.2 does not say
// what the shield does in Evade: it stays on here (a question in the PR).
// rcs: fitting ids fired (a stern-top / bow-bottom couple turns the ship).
export const PRESETS = {
  fire: { label: 'Fire', beam: true, turret: true, shield: true, throttle: 0.5, rcs: [] },
  cool: { label: 'Cool', beam: false, turret: false, shield: false, throttle: 0, rcs: [] },
  evade: { label: 'Evade', beam: false, turret: false, shield: true, throttle: 1, rcs: [17, 20] },
};
export const PRESET_ORDER = ['fire', 'cool', 'evade'];

// Prototype setting: the enemy's fixed script (13h.2): Fire 60 s, Cool 30 s,
// repeat; aiming at the player's beam bay, then turret, then engine (each
// until it is wrecked: a reading of "then", a question in the PR).
export const SCRIPT = { phases: [{ preset: 'fire', seconds: 60 }, { preset: 'cool', seconds: 30 }], targets: ['beamBay', 'turret', 'engine'] };

// Prototype setting: Disabled (#82): no weapon able to fire and no thrust
// for about 10 s. #82 says "~10 s"; no constant in js/data.js holds it yet.
export const DISABLED_SECONDS = 10;

// Prototype setting: time controls (13h.2) and the cap on steps per frame.
export const SPEEDS = [1, 2, 4];
export const MAX_STEPS_PER_FRAME = 60;

// Prototype setting: the log keeps this many lines on screen.
export const LOG_LINES = 120;

// Prototype setting: colours, high contrast for a phone in sunlight.
export const COLOURS = {
  background: '#000000', text: '#ffffff', dim: '#a8a8a8', grid: '#3a3a3a',
  player: '#38e8ff', enemy: '#ff5a3c', target: '#ffff00',
  round: '#ffffff', beam: '#ff3cff', beamAbsorbed: '#38e8ff', shield: '#38e8ff',
  destroyed: '#000000', cross: '#ff2020', armour: [150, 150, 170],
  // Temperature ramp against a room's own thresholds (rest, hot, overheated, critical).
  cold: [40, 70, 160], warm: [40, 150, 60], hot: [255, 190, 0], overheated: [255, 60, 0], critical: [255, 255, 255],
};

// Prototype setting: short room labels for the view.
export const LABELS = { armour: 'ARM', engine: 'ENG', reactor: 'RCT', bridge: 'BRG', magazine: 'MAG', beamBay: 'BEAM', heatSink: 'SINK', quarters: 'QTR', turret: 'TUR', shield: 'SHLD', hold: 'HOLD' };

// What the prototype stands in for (13h.2), listed on screen and in the README.
export const STAND_INS = [
  'Rounds fly straight at the muzzle velocity from gun to the aimed room: no aiming error, no lead, no deflection. On arrival the shield slows them (kernel shieldRound) and the kernel\'s fireRound resolves them along the aimed row, entering from the bow.',
  'Beams: the shield absorbs at the aimed room (kernel setBeams); what passes, times the Gaussian fraction at this range, heats the aimed room and burns its cells one by one. Burn energy per cell: armour.burnEnergy (data.js has no room value).',
  'Both sides see the true layout: no scans.',
  'No point defence, no missiles, no railgun.',
  'No helm: both ships are held at their stations, 900 m apart. Engines and RCS still draw power and make heat in the kernel; the motion they cause is not shown or used.',
  'Disabled: no weapon able to fire and no thrust for 10 s (#82), judged from room state. Destroyed: a reactor or magazine explodes.',
  'Bow armour (loadout): armour fittings (#15) are not built in the kernel. N armour cells stand in front of each bow-facing row. A round arriving there first passes them by L0\'s rule (kernel penetrate, armour.kineticResistance per cell) and goes on into the row with what is left; a beam first burns them (armour.burnEnergy each), and that energy does not heat the room behind. Armour cells are wrecked like room cells (1 / kinetic.hitsToWreck per pass). Their mass and heat are ignored (ships are held at station).',
];
