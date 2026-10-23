import { runBattle, battleHash } from '../../../js/battle.js';
import { playSync } from '../../../tools/play.mjs';
import { createDuel } from '../../../tools/duel.js';

// H14 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #42, #277, #301 (6)): the play harness. A battle played through
// tools/play.mjs (the player R1d-A on the preset Fire, the enemy R1d-A at personality 0.5, the standard enemy) with a
// fixed script of verbs is replayed by tools/duel.js from the inputs play.mjs records (its replay line): the same
// battle hash and the same end. The knowledge model's text the player reads holds nothing of the other world beyond
// what its model resolved: every room it names ('room <id> (<type>)') is a room the model knows, with the model's type,
// and the sources it lists are exactly the model's sources resolved that step.
//
// Setup (T1): tools/play.mjs's createPlay (playSync) with seed 1, the player on the enemy's bow at
// battle.openingRange, a prompt every 5 s, 90 s; the script, one line per prompt: 'scan 1', '', 'scan 4', 'target
// reactor', 'preset evade', '', 'preset fire', 'target turret', 'scan 2', then nothing. Then createDuel with the same
// seed and the recorded inputs, run to the same limit.
// Hand-worked: the hashes and the ends are the kernel's (equal is the criterion); the inputs recorded are the
// script's verbs at the prompt times t = 5 k s (k the prompt's index): scan 1 at 0, scan 4 at 10, target reactor at 15,
// preset evade at 20, preset fire at 30, target turret at 35, scan 2 at 40 (unless the battle ends before a prompt).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const SCRIPT = ['scan 1', '', 'scan 4', 'target reactor', 'preset evade', '', 'preset fire', 'target turret', 'scan 2'];

export default {
  id: 'L4.play.replay',
  level: 'L4',
  laws: ['a played battle replays from its seed and inputs: the same hash and end (E2, #277)', 'the player reads only its side\'s knowledge model (#42)'],
  dependsOn: ['L4.enemy.decide'],
  setup: 'T1: tools/play.mjs (playSync) R1d-A against the standard enemy R1d-A, seed 1, a prompt every 5 s, 90 s, a fixed script of verbs; then tools/duel.js\'s createDuel with the recorded inputs (13n.4 H14)',
  measure: 'the recorded inputs; the two battles\' hashes and ends; every prompt\'s text against the model at that prompt',
  tolerance: 'exact',
  criterion: 'the inputs are the script\'s verbs at t = 5 k s; the replay\'s hash and end equal the played battle\'s; every room named in a text is known to the model with its type; every text\'s sources are the model\'s resolved that step, as many',
  tunable: [],
  locked: null,
  cases() {
    return [{ seed: 1 }];
  },
  expected() {
    const at = SCRIPT.map((l, k) => [l, 5 * k]).filter(([l]) => l);
    return { inputs: at.map(([l, t]) => ({ t, verb: l.split(' ')[0], arg: l.split(' ')[0] === 'scan' ? Number(l.split(' ')[1]) : l.split(' ')[1] })) };
  },
  run(ctx, c) {
    const opts = { player: 'R1d-A', enemy: 'R1d-A', seed: c.seed, range: null, limit: 90, every: 5, inputs: [], personality: null, overrides: {} };
    let k = 0, leaks = 0, sourceMismatch = 0;
    const next = (text, b) => {
      const m = b.attacker.model;
      for (const x of text.matchAll(/room (\S+) \((\w+)\)/g)) { const r = m.rooms.get(x[1]); if (!r || r.type !== x[2]) leaks++; }
      const listed = (text.match(/sources resolved now: (.*)/) || [])[1], n = listed === 'none' ? 0 : listed.split('; ').length;
      if (n !== [...m.sources.values()].filter((s) => s.now).length) sourceMismatch++;
      return SCRIPT[k++] || '';
    };
    const played = playSync(opts, next), pb = played.battle;
    const rb = createDuel({ ...opts, inputs: played.inputs });
    runBattle(rb, 90);
    const endOf = (b) => (b.ended ? `${b.ended.kind} ${b.ended.side} ${b.ended.step}` : `none ${b.step}`);
    return { inputs: played.inputs.map(({ t, verb, arg }) => ({ t, verb, arg })), hash: battleHash(pb), replayHash: battleHash(rb), end: endOf(pb), replayEnd: endOf(rb), prompts: k, leaks, sourceMismatch, replay: played.replay };
  },
  compare(e, a) {
    const want = e.inputs.filter((x) => x.t <= (a.prompts - 1) * 5);
    const checks = {
      'the inputs are the script\'s at its prompts': JSON.stringify(a.inputs.map((x) => ({ ...x, t: Math.round(x.t * 1e9) / 1e9 }))) === JSON.stringify(want),
      'the replay\'s hash equals the played battle\'s': a.hash === a.replayHash,
      'the replay\'s end equals the played battle\'s': a.end === a.replayEnd,
      'no room named that the model does not know': a.leaks === 0,
      'the sources listed are the model\'s resolved ones': a.sourceMismatch === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `${r.expected.inputs.length} inputs; replay = played`, actual: `${a.inputs.length} inputs over ${a.prompts} prompts; played ${a.hash} ${a.end}, replayed ${a.replayHash} ${a.replayEnd}; leaks ${a.leaks}, source mismatches ${a.sourceMismatch}; ${a.replay}` };
  },
};
