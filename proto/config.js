// proto/config.js — every setting of the feel prototype (DESIGN.md 13h,
// #217, #224) that is not in js/data.js. Each one is a PROTOTYPE SETTING,
// NOT A GAME NUMBER: it shapes the throwaway page (geometry, the scripted
// enemy, presets, colours, layout) and is never read by the kernel. Every
// number that affects the physics comes from js/data.js.

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
  destroyed: '#000000', cross: '#ff2020',
  // Temperature ramp against a room's own thresholds (rest, hot, overheated, critical).
  cold: [40, 70, 160], warm: [40, 150, 60], hot: [255, 190, 0], overheated: [255, 60, 0], critical: [255, 255, 255],
};

// Prototype setting: short room labels for the view.
export const LABELS = { engine: 'ENG', reactor: 'RCT', bridge: 'BRG', magazine: 'MAG', beamBay: 'BEAM', heatSink: 'SINK', quarters: 'QTR', turret: 'TUR', shield: 'SHLD', hold: 'HOLD' };

// What the prototype stands in for (13h.2), listed on screen and in the README.
export const STAND_INS = [
  'Rounds fly straight at the muzzle velocity from gun to the aimed room: no aiming error, no lead, no deflection. On arrival the shield slows them (kernel shieldRound) and the kernel\'s fireRound resolves them along the aimed row, entering from the bow.',
  'Beams: the shield absorbs at the aimed room (kernel setBeams); what passes, times the Gaussian fraction at this range, heats the aimed room and burns its cells one by one. Burn energy per cell: armour.burnEnergy (data.js has no room value).',
  'Both sides see the true layout: no scans.',
  'No point defence, no missiles, no railgun.',
  'No helm: both ships are held at their stations, 900 m apart. Engines and RCS still draw power and make heat in the kernel; the motion they cause is not shown or used.',
  'Disabled: no weapon able to fire and no thrust for 10 s (#82), judged from room state. Destroyed: a reactor or magazine explodes.',
];
