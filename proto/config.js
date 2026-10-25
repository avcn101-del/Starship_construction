// proto/config.js — every setting of the feel prototype (DESIGN.md 13j,
// 13n.1 (d); #217, #237, #301 (5)) that is not in js/data.js. Each one is a
// PROTOTYPE SETTING, NOT A GAME NUMBER: it shapes the throwaway page (time
// controls, colours, labels, the panel) and is never read by the kernel. The
// battle is the kernel's own loop (proto/duel.js, js/battle.js): every number
// that affects it comes from js/data.js; the loadout panel's shield budget and
// hits to wreck are run-time overrides of js/data.js constants (withOverrides),
// checked against their approved min-max.

import { PARAMS } from '../js/data.js';
import { PAIR_BUILDS, openingDistance } from './phases.js';

// Prototype setting: the battle panel's choices (DESIGN.md 13n.12, #366): the player's build and the enemy's among the
// locked reference builds, the opening distance among js/data.js helm values, the aspect, and whether a decision point
// pauses the battle. Each lever lists its options; the first is the default. The labels of the openings come from
// js/data.js.
export const LOADOUT = {
  player: { label: 'Your build', options: PAIR_BUILDS.map((b) => ({ value: b, label: b })) },
  enemy: { label: 'Enemy build', options: PAIR_BUILDS.map((b) => ({ value: b, label: b })) },
  opening: { label: 'Opening distance', options: ['rangeOpen', 'rangeHold'].map((k) => ({ value: k, label: `${openingDistance(k)} m` })) },
  aspect: { label: 'Aspect', options: [{ value: 'bow', label: 'Bow on' }, { value: 'broadside', label: 'Broadside' }] },
  pause: { label: 'Decision points', options: [{ value: true, label: 'Pause' }, { value: false, label: 'Auto, no pause' }] },
};
export const LOADOUT_ORDER = ['player', 'enemy', 'opening', 'aspect', 'pause'];
/** The default loadout: every lever's first option. */
export const defaultLoadout = () => Object.fromEntries(LOADOUT_ORDER.map((k) => [k, LOADOUT[k].options[0].value]));
/** A loadout's label for a lever. */
export const optionLabel = (k, lo) => LOADOUT[k].options.find((o) => o.value === lo[k]).label;

// Prototype setting: the first battle's seed (the seeded RNG of js/util.js draws the enemy's dodge intervals). The
// panel shows it, Restart adds 1, the player may type another; the export writes it.
export const SEED = 1;

// Prototype setting: the version written in an export (proto/export.js). There is no build step to stamp a git hash,
// so it is a constant: change it whenever proto/ or js/ changes what a battle does, so proto/replay.mjs can tell an
// export of another version. feel-6: the L5d kernel's symmetric loop (#301 (5)). phases-1: the phases feel prototype
// (13n.12, #366, #367): the locked builds, both sides flown by js/enemy.js, menu entries and decision points.
export const PROTO_VERSION = 'phases-1';

// Prototype setting: the captain's presets (js/data.js PRESETS) as the readout names them (no preset buttons, #367 (2)).
export const PRESET_LABELS = { fire: 'Fire', cool: 'Cool', evade: 'Evade' };

// Prototype setting: time controls and the cap on steps per frame.
export const SPEEDS = [1, 2, 4];
export const MAX_STEPS_PER_FRAME = 60;

// Prototype setting: how long (battle seconds) the note of an automatic decision stays on screen without the pause.
export const DECISION_NOTE_SECONDS = 6;
// Prototype setting: the phase names the readout shows (proto/phases.js phaseOf) and why a contact ended.
export const PHASE_LABELS = { contact: 'Contact', 'stand-off': 'Stand-off', 'break-off': 'Break-off', position: 'Position', finish: 'Finish', 'decision 1': 'Decision 1', 'decision 2': 'Decision 2 (reversal)' };
export const EXIT_LABELS = { zones: 'every zone resolved', antenna: 'no antenna standing', damage: 'your ship was hit', choice: 'you left Stand off' };

// Prototype setting: the log keeps this many lines on screen.
export const LOG_LINES = 120;

// Prototype setting: colours, high contrast for a phone in sunlight.
export const COLOURS = {
  background: '#000000', text: '#ffffff', dim: '#a8a8a8', grid: '#3a3a3a',
  player: '#38e8ff', enemy: '#ff5a3c', target: '#ffff00', scan: '#38ff8a',
  round: '#ffffff', beam: '#ff3cff', beamAbsorbed: '#38e8ff', shield: '#38e8ff', miss: '#a8a8a8',
  destroyed: '#000000', cross: '#ff2020', unknown: '#4a4a4a', zone: '#7a7a7a',
  // Temperature ramp against a room's own thresholds (rest, hot, overheated, critical).
  cold: [40, 70, 160], warm: [40, 150, 60], hot: [255, 190, 0], overheated: [255, 60, 0], critical: [255, 255, 255],
  // The IR class the model holds of a known enemy room (js/sensors.js temperatureClass).
  ir: { rest: [40, 70, 160], hot: [255, 190, 0], overheated: [255, 60, 0], critical: [255, 255, 255] },
};

// Prototype setting: short labels for the view, by room id (the player's own ship) and by room type (the enemy's
// rooms as the model knows them: id and type).
export const LABELS = { engine: 'ENG', reactor: 'RCT', bridge: 'BRG', magazine: 'MAG', beamBay: 'BEAM', heatSink: 'SINK', quarters: 'QTR', turret: 'TUR', shield: 'SHLD', shieldGenerator: 'SHLD', hold: 'HOLD', railgun: 'RAIL', missileBay: 'MSL' };

// What the prototype still stands in for, listed on screen and in the README.
export const STAND_INS = [
  'The battle is the kernel\'s (js/battle.js): the locked builds of mission0/builds.js. Both ships are flown by js/enemy.js at the standard personality (0.5 each); it picks Fire, Cool or Evade itself every second. You choose menu entries over it, scan zones and target rooms.',
  'The phases are emulated by the page between ticks (proto/phases.js, DESIGN.md 13n.12): contact on Stand off with weapons held until every zone is resolved, no antenna stands or your ship is hit; then decision point 1; a hit while on an attack entry is a reversal, decision point 2. The enemy runs the same phases with the automatic choices.',
  'The enemy is drawn from your knowledge model only: its silhouette, the zones you resolved, the rooms they revealed with the state at the scan, and the IR class of their panels. Its phase, its menu entry, its rounds in flight and its orders are not shown.',
  `The end: destroyed (a reactor explodes, or the largest piece is under ${PARAMS.battle.wreckFraction.value} of the ship), Disabled (no able weapon for ${PARAMS.battle.disabledSeconds.value} s), the enemy's surrender or escape (js/battle.js). The cascade tree is the debrief, shown only after the end.`,
  'A feel prototype (#217, #365): it proves nothing; the menu is the first hand-designed one.',
];
