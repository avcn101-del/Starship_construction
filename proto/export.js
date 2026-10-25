// proto/export.js — the feel prototype's export (DESIGN.md 13n.12, 13n.1 (d); #217, #224, #237, #301 (5), #366): one
// line of JSON with the version, the phases setup (builds, opening, aspect, seed, pause), the player's menu choices
// [{ step, entry }] and verbs [{ t, step, verb, arg }], where the battle stands (step, time, its end line), the
// kernel's battle hash (js/battle.js battleHash), the shot books per side and the replay command. proto/replay.mjs
// replays it through proto/phases.js and must print the same hash and end. No DOM.
import { battleHash } from '../js/battle.js';
import { endLine } from './duel.js';
import { shotStats } from './battle.js';
import { PROTO_VERSION } from './config.js';

/** The export of a battle as it stands. */
export function buildExport(b) {
  return {
    v: PROTO_VERSION, phases: b.phases.setup, choices: b.phases.choices.map(({ step, entry }) => ({ step, entry })),
    inputs: b.played.map(({ t, step, verb, arg }) => ({ t, step, verb, arg })),
    step: b.step, t: b.t, ended: !!b.ended, end: endLine(b), hash: battleHash(b), stats: shotStats(b),
    replay: 'node proto/replay.mjs <this file>',
  };
}

/** The export as one line of JSON. */
export const exportText = (b) => JSON.stringify(buildExport(b));
