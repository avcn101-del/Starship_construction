// proto/config.js — every setting of the feel prototype (DESIGN.md 13j,
// 13n.1 (d); #217, #237, #301 (5)) that is not in js/data.js. Each one is a
// PROTOTYPE SETTING, NOT A GAME NUMBER: it shapes the throwaway page (time
// controls, colours, labels, the panel) and is never read by the kernel. The
// battle is the kernel's own loop (proto/duel.js, js/battle.js): every number
// that affects it comes from js/data.js; the loadout panel's shield budget and
// hits to wreck are run-time overrides of js/data.js constants (withOverrides),
// checked against their approved min-max.

import { PARAMS } from '../js/data.js';

// Prototype setting: the run-time overrides the loadout panel offers (both ships alike, as withOverrides applies to
// the whole battle). Each lever lists its options; the first (null) keeps the js/data.js value.
export const LOADOUT = {
  shieldBudget: { label: 'Shield budget', override: 'shield.budget', options: [{ value: null, label: `${PARAMS.shield.budget.value / 1e6} MW` }, { value: 5e6, label: '5 MW' }, { value: 2e7, label: '20 MW' }] },
  hitsToWreck: { label: 'Hits to wreck', override: 'kinetic.hitsToWreck', options: [{ value: null, label: `${PARAMS.kinetic.hitsToWreck.value}` }, { value: 5, label: '5' }] },
};
export const LOADOUT_ORDER = ['shieldBudget', 'hitsToWreck'];
/** The default loadout: every lever's first option. */
export const defaultLoadout = () => Object.fromEntries(LOADOUT_ORDER.map((k) => [k, LOADOUT[k].options[0].value]));
/** A loadout's run-time overrides ({ 'group.name': value }), each checked against its approved range. */
export function overridesOf(lo) {
  const out = {};
  for (const k of LOADOUT_ORDER) {
    if (lo[k] === null || lo[k] === undefined) continue;
    const name = LOADOUT[k].override, [g, n] = name.split('.'), p = PARAMS[g][n];
    if (!(lo[k] >= p.min && lo[k] <= p.max)) throw new Error(`${name} = ${lo[k]} is outside its approved range ${p.min}..${p.max}`);
    out[name] = lo[k];
  }
  return out;
}
/** A short text of a loadout. */
export const loadoutText = (lo) => LOADOUT_ORDER.map((k) => `${LOADOUT[k].label}: ${LOADOUT[k].options.find((o) => o.value === lo[k]).label}`).join(' · ');

// Prototype setting: the first battle's seed (the seeded RNG of js/util.js draws the enemy's dodge intervals). The
// panel shows it, Restart adds 1, the player may type another; the export writes it.
export const SEED = 1;

// Prototype setting: the version written in an export (proto/export.js). There is no build step to stamp a git hash,
// so it is a constant: change it whenever proto/ or js/ changes what a battle does, so proto/replay.mjs can tell an
// export of another version. feel-6: the L5d kernel's symmetric loop (#301 (5)).
export const PROTO_VERSION = 'feel-6';

// Prototype setting: the three presets of js/data.js PRESETS, in the bar's order, with their button labels.
export const PRESET_ORDER = ['fire', 'cool', 'evade'];
export const PRESET_LABELS = { fire: 'Fire', cool: 'Cool', evade: 'Evade' };

// Prototype setting: time controls and the cap on steps per frame.
export const SPEEDS = [1, 2, 4];
export const MAX_STEPS_PER_FRAME = 60;

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
export const LABELS = { engine: 'ENG', reactor: 'RCT', bridge: 'BRG', magazine: 'MAG', beamBay: 'BEAM', heatSink: 'SINK', quarters: 'QTR', turret: 'TUR', shield: 'SHLD', shieldGenerator: 'SHLD', hold: 'HOLD' };

// What the prototype still stands in for, listed on screen and in the README.
export const STAND_INS = [
  'The battle is the kernel\'s (js/battle.js, L5d): both ships R1d-A; you are side A on the kernel\'s helm, the enemy is js/enemy.js at personality 0.5 each. Nothing here flies, aims or decides for either ship.',
  'Your verbs are the kernel\'s inputs: scan a zone, target a known room, switch preset (Fire / Cool / Evade, js/data.js PRESETS). Time and pause are the page\'s.',
  'The enemy is drawn from your knowledge model only: its silhouette, the zones you resolved, the rooms they revealed with the state at the scan, and the IR class of their panels. Its rounds in flight and its orders are not shown.',
  `The end: destroyed (a reactor explodes, or the largest piece is under ${PARAMS.battle.wreckFraction.value} of the ship), Disabled (no able weapon for ${PARAMS.battle.disabledSeconds.value} s), the enemy's surrender or escape (js/battle.js). The cascade tree is the debrief, shown only after the end.`,
  'Layout C of the battle screen (IDEAS.md) is a later presentation; this is the rough one.',
];
