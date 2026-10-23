// proto/export.js — the feel prototype's export (DESIGN.md 13h, 13j,
// 13n.1 (d); #217, #224, #237, #301 (5)): one line of JSON with the version,
// the seed, the run-time overrides, the player's inputs { t, verb, arg }, where
// the battle stands (step, time, its end line), the kernel's battle hash
// (js/battle.js battleHash), the shot books per side and the tools/duel.js
// replay line (proto/duel.js replayLine, its mirror). proto/replay.mjs replays
// it through tools/duel.js and must print the same hash and end. No DOM.
import { battleHash } from '../js/battle.js';
import { endLine, replayLine } from './duel.js';
import { shotStats } from './battle.js';
import { PROTO_VERSION } from './config.js';

/** The export of a battle as it stands. The replay's limit is the battle's time (step x dt), so it stops at the same step. */
export function buildExport(b) {
  const inputs = b.played.map(({ t, verb, arg }) => ({ t, verb, arg }));
  return {
    v: PROTO_VERSION, seed: b.seed, overrides: b.overrides, inputs,
    step: b.step, t: b.t, ended: !!b.ended, end: endLine(b), hash: battleHash(b), stats: shotStats(b),
    replay: replayLine({ player: 'R1d-A', enemy: 'R1d-A', seed: b.seed, range: null, limit: b.t, inputs, personality: null, overrides: b.overrides }),
  };
}

/** The export as one line of JSON. */
export const exportText = (b) => JSON.stringify(buildExport(b));
