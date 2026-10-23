import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createBattle, tick } from '../../../js/battle.js';
import { R1_ROOMS, R1_FITTINGS, missileShip } from '../../targets.js';

// W14 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), E8, #213): the battle loop with six missiles and two point-defence
// fittings costs under 1 ms per step in Node. As L4.e8.v2 (13l.7 C3), the time varies from run to run, so run() prints
// it with the machine and returns only whether it is under the budget; the time is kept in the row's note, not hashed.
//
// Setup (T1): createBattle, knowledge on, the attacker R1-M (designated HE missiles; its ready store set to six
// before undock, missilebay.readyMissiles' top) from -y at 900 m, its beam on R1's reactor and plan.missile { rooms:
// ['reactor'], count: 6 } (one launch per 2 s: six missiles in flight over 10 s); the target R1 with a kinetic fitting
// on its hold's -y edge of (7, 0) and a laser on (8, 0); 1800 steps (30 s) or the end, timed on the loop alone.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.e8.weapons',
  level: 'L4',
  laws: ['E8: a 1v1 battle costs at most 1 ms per simulation step in Node (#164, #213), with missiles and point defence (13n.1 (c))'],
  dependsOn: ['L1.pd.kinetic', 'L1.pd.laser'],
  setup: 'T1: R1-M (six missiles ready, its beam on the reactor, six launched) against R1 with a kinetic and a laser point-defence fitting on its hold, knowledge on, 30 s or the end; the loop timed with performance.now (13n.4 W14)',
  measure: 'the mean wall time per step (printed with the machine, kept in the row\'s note); the missiles launched',
  tolerance: 'the budget, 1 ms per step',
  criterion: 'six missiles launched and the point defence engaging (a flak round or a laser kill); the mean wall time per step under 1 ms',
  tunable: [],
  locked: null,
  cases() {
    return [{ tier: 'T1' }];
  },
  expected() {
    return { budget: 1 };
  },
  run(ctx, c) {
    const target = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, ['pd', 'hold', [7, 0], [0, -1]], ['pdLaser', 'hold', [8, 0], [0, -1]]] };
    const six = (w, room) => { room('bay').missileBay.ready = Array.from({ length: 6 }, () => ({ seeker: 'designated', warhead: 'he' })); };
    const b = createBattle({ params: ctx.params, tier: c.tier, attacker: missileShip('designated', 'he'), target, bearing: '-y', plan: { beam: ['reactor'], missile: { rooms: ['reactor'], count: 6 } }, knowledge: true, setup: { attacker: six } });
    const t0 = performance.now();
    while (!b.ended && b.step < 1800) tick(b);
    const ms = (performance.now() - t0) / b.step, cpu = os.cpus();
    const measured = `${ms.toFixed(4)} ms per step over ${b.step} steps (${c.tier}); ${cpu.length} x ${cpu[0] ? cpu[0].model : 'unknown CPU'}, Node ${process.version}, ${os.platform()} ${os.arch()}`;
    console.log(`L4.e8.weapons: ${measured}`);
    ctx.measured = measured;
    const ev = b.target.world.log.events;
    return { under: ms < 1, launched: b.missileShots, engaged: ev.some((e) => e.type === 'flak' || e.type === 'missile-killed') };
  },
  compare(e, a, c, ctx) {
    const checks = { 'six missiles launched': a.launched === 6, 'point defence engaged': a.engaged, 'under 1 ms per step': a.under };
    const failed = notes(checks);
    return { pass: Object.values(checks).every(Boolean), note: `${failed ? `${failed}; ` : ''}measured ${ctx && ctx.measured ? ctx.measured : 'not available'}` };
  },
  display(r) {
    return { expected: `under ${r.expected.budget} ms per step (the time is printed above with the machine)`, actual: `${r.actual.under ? 'under' : 'OVER'} the budget; launched ${r.actual.launched}; engaged ${r.actual.engaged}` };
  },
};
