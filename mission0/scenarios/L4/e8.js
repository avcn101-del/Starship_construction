import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createBattle, tick } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B12 of L4b (DESIGN.md 13l.4): E8 at T1 (#213): B1's battle (R1, attacker R1d at rest 900 m away on bearing -y, its
// turret at the bridge) to its end, timed in Node. The time itself varies from run to run and machine to machine, so
// run() prints it with the machine (stdout) and returns only whether it is under the budget (the record stays
// deterministic). T6 waits for L6.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.e8',
  level: 'L4',
  laws: ['E8: a 1v1 battle costs at most 1 ms per simulation step in Node (#164, #213)'],
  dependsOn: [],
  setup: 'B1\'s battle at T1 (13l.4 B12), run to its end in Node; the wall time of the loop only (js/battle.js tick), measured with performance.now',
  measure: 'the mean wall time per step (printed with the CPU model, the core count and the Node version); the number of steps',
  tolerance: 'the budget, 1 ms per step',
  criterion: 'the mean wall time per step of the whole battle is under 1 ms (E8 at T1; T6 at L6); the battle runs to its Disabled end (1987 steps at the time of the lock is not a criterion)',
  tunable: [],
  locked: null,
  cases() {
    return [{ tier: 'T1' }];
  },
  expected() {
    return { budget: 1 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, tier: c.tier, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const t0 = performance.now();
    while (!b.ended && b.step < 7200) tick(b);
    const ms = (performance.now() - t0) / b.step, cpu = os.cpus();
    console.log(`L4.e8: ${ms.toFixed(4)} ms per step over ${b.step} steps (${c.tier}); ${cpu.length} x ${cpu[0] ? cpu[0].model : 'unknown CPU'}, Node ${process.version}, ${os.platform()} ${os.arch()}`);
    return { under: ms < 1, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a) {
    const checks = { 'under 1 ms per step': a.under, 'ran to its end': a.ended === 'disabled' };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `under ${r.expected.budget} ms per step (the time is printed above with the machine)`, actual: `${r.actual.under ? 'under' : 'OVER'} the budget; end ${r.actual.ended}` };
  },
};
