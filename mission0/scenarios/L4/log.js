import { createBattle, runBattle, battleHash } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B9 of L4b (DESIGN.md 13l.4): the per-second log (#129) and E2 (same seed and inputs, same hash). B1's battle (R1,
// attacker R1d at rest 900 m away on bearing -y, its turret at the bridge) run twice from scratch with seed 1.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const once = (ctx) => runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', seed: 1, plan: { turret: ['bridge'] } }), 120);

export default {
  id: 'L4.log',
  level: 'L4',
  laws: ['one log line per whole second of battle time per ship (#129, 13l.1)', 'same seed and inputs give the same battle (E2, #7)'],
  dependsOn: [],
  setup: 'B1\'s battle at T1 (13l.4 B9), run twice in one process, each from a new battle with seed 1',
  measure: 'each run\'s per-second log: its lines per ship and the whole seconds they carry; the end line; the hash of each run\'s log (js/battle.js battleHash)',
  tolerance: 'exact',
  criterion: 'each ship has exactly one line for every whole second from 0 to floor(t_end), in order, and one end line (the battle ends off a whole second); the two runs\' logs and hashes are equal (E2)',
  tunable: [],
  locked: null,
  cases() {
    return [{ battle: 'B1' }];
  },
  expected() {
    return { ships: ['A', 'T'], equal: true };
  },
  run(ctx) {
    const a = once(ctx), b = once(ctx);
    const per = Object.fromEntries(['A', 'T'].map((s) => [s, a.lines.filter((l) => new RegExp(`^t=\\d+ ${s} `).test(l)).map((l) => Number(l.slice(2, l.indexOf(' '))))]));
    const ends = ['A', 'T'].map((s) => a.lines.filter((l) => l.startsWith('end ') && l.split(' ')[2] === s).length);
    return { tEnd: a.t, per, ends, hashes: [battleHash(a), battleHash(b)], same: a.lines.join('\n') === b.lines.join('\n'), lines: a.lines.length };
  },
  compare(e, a) {
    const n = Math.floor(a.tEnd + 1e-9) + 1;
    const checks = {
      'one line per whole second per ship': e.ships.every((s) => a.per[s].length === n && a.per[s].every((t, i) => t === i)),
      'one end line per ship': a.ends.every((x) => x === 1),
      'same log and hash twice (E2)': a.same && a.hashes[0] === a.hashes[1],
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'a line for each whole second per ship, one end line; equal hashes', actual: `t_end ${a.tEnd.toFixed(4)} s; lines A ${a.per.A.length}, T ${a.per.T.length}, end ${a.ends.join('/')}; hashes ${a.hashes.join(' / ')}` };
  },
};
