import { createBattle, tick } from '../../../js/battle.js';
import { isDestroyed, survivingCells } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B4 of L4b (DESIGN.md 13l.4), successor of L4.route.overheat (13l.7, #271: U3, N3): overheat. The battle loop (js/battle.js, 13l.1): T-gun (13l.2: R1 with its beam bay a
// hold, the turret its only weapon, a crewed room with low heat thresholds) the static target at T1, the attacker R1d
// at rest 900 m away on bearing +x (bow-on to T-gun's bow), its spinal beam held on the turret [8, 10) x [4, 6) (its
// RCS turns the axis onto the turret's first surviving cell, js/battle.js). The target's turret fires broadside (+y of
// its own frame, away from the attacker, js/battle.js targetFire) from t = 0, fed by its magazine (13l.7: the firing
// gate of turret(), the survivor c1.thr.turretWorksShutdown); the attacker fires no rounds.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.route.overheat.v2',
  level: 'L4',
  laws: ['a crewed room shuts down when overheated (13c.1)', 'a shut-down weapon is not able (13l.1) and a shut-down turret fires no shot (13c.1, js/rooms.js turret())', 'the beam deposits its energy along its path as heat and burn (13i.1, #240 (1))'],
  dependsOn: [],
  setup: 'the battle loop at T1: target T-gun (mission0/targets.js), attacker R1d at rest 900 m from its centre of mass on bearing +x, bow-on, its beam on T-gun\'s turret; T-gun\'s turret firing broadside (+y of its frame) from t = 0; 300 s at most (13l.4 B4, 13l.7)',
  measure: 'how the battle ends; why the last weapon (the turret) lost its ability and the event that took it; the turret\'s state when the target is Disabled; the turret\'s shutdown event (time, step), the cells it has left then and its heat capacity then; the step of every shot of the target\'s turret',
  tolerance: 'exact (states, events, step counts); the shutdown time one-sided against its lower bound (1e-9 relative slack, #185 (2)); the bound\'s literal 1e-3 s',
  criterion: 'the target is Disabled (no explosion); the turret lost its ability by being shut down: the Disabled event\'s parent is the turret\'s shutdown event, whose cause is heat, and the turret is not destroyed when the target is Disabled (13l.4: "by shutdown (cause heat), not destruction"); how much integrity is left is not a criterion (13l.6); (13l.7 U3) the target\'s turret fires no shot in a step after its shutdown step (it fired before it); (13l.7 N3) the shutdown time t satisfies the hand-worked one-sided bound t >= C_surv dT / (P_beam + P_own): the turret\'s temperature rises at most at (P_beam + P_own) / C(t), and C(t) >= C_surv, the heat capacity of the cells that survive to the shutdown (a cell destroyed by the burn takes its share of the capacity and of the heat away, so the temperature does not jump), with C_surv = 2 cells x thermal.coupledCrewed 600 000 J/K = 1.2e6 J/K (the 2 surviving cells a kernel reading, pinned), dT = 350 - 290 = 60 K (thermal.crewedOverheated from the rest temperature), P_beam = 5 MW (beam.power: the beam\'s whole deposit, fraction 1, lands in the turret, so it is the most the turret can take), P_own = turret.heatPerShot x turret.fireRate = 300 000 J x 0.5 /s = 150 kW: 1.2e6 x 60 / 5.15e6 = 13.98 s (with all 4 cells, 27.96 s, would be above the kernel\'s time: hence the survivors); kernel-read, pinned as a regression (read off the kernel at the lock): the shutdown in step 1344 with the target firing (1373 without it, tools/estimates/hygiene.mjs (2))',
  tunable: ['thermal.crewedOverheated', 'beam.power', 'battle.disabledSeconds'],
  locked: null,
  cases() {
    return [{ target: 'T-gun', bearing: '+x' }];
  },
  expected() {
    const cells = 2, perCell = 600000, dT = 350 - 290, beam = 5e6, own = 300000 * 0.5; // hand-worked (13l.7); 2 cells kernel-read
    return { kind: 'disabled', why: 'heat', cause: 'heat', surviving: cells, C: cells * perCell, bound: (cells * perCell * dT) / (beam + own), literal: 13.98, step: 1344 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { beam: ['turret'] }, targetFire: { aim: [0, 1] } });
    const w = b.target.world, t = b.target.room('turret');
    let shutdown = null;
    while (!b.ended && b.step < Math.round(300 / b.dt)) {
      tick(b);
      if (!shutdown) { const e = w.log.events.find((x) => x.type === 'shutdown' && x.room === 'turret'); if (e) shutdown = { t: e.t, step: Math.round(e.t / b.dt), surviving: survivingCells(t), C: t.heat.C }; }
    }
    const ev = w.log.events, byId = new Map(ev.map((e) => [e.id, e]));
    const parent = b.ended ? byId.get(b.ended.parent) : null;
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, t: b.ended.t, why: b.ended.why } : null,
      parent: parent ? { type: parent.type, room: parent.room, cause: parent.cause } : null,
      turret: { destroyed: isDestroyed(t), shutdown: t.shutdown, integrity: t.cells.reduce((x, y) => x + (y.destroyed ? 0 : y.integrity), 0) / t.cells.length },
      explosions: ev.filter((e) => e.type === 'explosion').length,
      shutdown, shots: ev.filter((e) => e.type === 'shot' && e.room === 'turret').map((e) => Math.round(e.t / b.dt)),
    };
  },
  compare(e, a) {
    const checks = {
      'Disabled, the target, no explosion': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0,
      'lost by shutdown, cause heat': !!a.ended && a.ended.why === e.why && !!a.parent && a.parent.type === 'shutdown' && a.parent.room === 'turret' && a.parent.cause === e.cause,
      'the turret not destroyed': !a.turret.destroyed,
      'it fired before its shutdown, and no shot after its shutdown step': !!a.shutdown && a.shots.length > 0 && a.shots.every((k) => k <= a.shutdown.step),
      'bound 13.98 s (hand-worked literal)': Math.abs(e.bound - e.literal) <= 1e-3,
      'shutdown at t >= C_surv dT / (P_beam + P_own)': !!a.shutdown && a.shutdown.t >= e.bound * (1 - 1e-9),
      '2 cells surviving at the shutdown, C 1.2e6 J/K (kernel-read)': !!a.shutdown && a.shutdown.surviving === e.surviving && a.shutdown.C === e.C,
      'shutdown in step 1344 (kernel-read)': !!a.shutdown && a.shutdown.step === e.step,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `Disabled; the turret shut down by heat, not destroyed, at t >= ${r.expected.bound.toFixed(4)} s in step ${r.expected.step}; no shot after it`, actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} at ${a.ended.t.toFixed(4)} s (${a.ended.why})` : 'no end'}; parent ${a.parent ? `${a.parent.type} ${a.parent.room} (${a.parent.cause})` : '-'}; turret destroyed ${a.turret.destroyed}, shut down ${a.turret.shutdown}, mean integrity ${a.turret.integrity.toFixed(3)}; shutdown ${a.shutdown ? `${a.shutdown.t.toFixed(4)} s step ${a.shutdown.step}, ${a.shutdown.surviving} cells, C ${a.shutdown.C}` : '-'}; shots in steps [${a.shots}]` };
  },
};
