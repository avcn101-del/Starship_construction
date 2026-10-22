import { createBattle, runBattle } from '../../../js/battle.js';
import { isDestroyed } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B4 of L4b (DESIGN.md 13l.4): overheat. The battle loop (js/battle.js, 13l.1): T-gun (13l.2: R1 with its beam bay a
// hold, the turret its only weapon, a crewed room with low heat thresholds) the static target at T1, the attacker R1d
// at rest 900 m away on bearing +x (bow-on to T-gun's bow), its spinal beam held on the turret [8, 10) x [4, 6) (its
// RCS turns the axis onto the turret's first surviving cell, js/battle.js), nobody firing rounds.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.route.overheat',
  level: 'L4',
  laws: ['a crewed room shuts down when overheated (13c.1)', 'a shut-down weapon is not able (13l.1)', 'the beam deposits its energy along its path as heat and burn (13i.1, #240 (1))'],
  dependsOn: [],
  setup: 'the battle loop at T1: target T-gun (mission0/targets.js), attacker R1d at rest 900 m from its centre of mass on bearing +x, bow-on, its beam on T-gun\'s turret; 300 s at most (13l.4 B4)',
  measure: 'how the battle ends; why the last weapon (the turret) lost its ability and the event that took it; the turret\'s state when the target is Disabled',
  tolerance: 'exact (states and events)',
  criterion: 'the target is Disabled (no explosion); the turret lost its ability by being shut down: the Disabled event\'s parent is the turret\'s shutdown event, whose cause is heat, and the turret is not destroyed when the target is Disabled (13l.4: "by shutdown (cause heat), not destruction"); how much integrity is left is not a criterion (13l.6)',
  tunable: ['thermal.crewedOverheated', 'beam.power', 'battle.disabledSeconds'],
  locked: { date: '2026-10-22', hash: 'c7ac0360' },
  cases() {
    return [{ target: 'T-gun', bearing: '+x' }];
  },
  expected() {
    return { kind: 'disabled', why: 'heat', cause: 'heat' };
  },
  run(ctx, c) {
    const b = runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { beam: ['turret'] } }), 300);
    const w = b.target.world, t = b.target.room('turret'), ev = w.log.events, byId = new Map(ev.map((e) => [e.id, e]));
    const parent = b.ended ? byId.get(b.ended.parent) : null;
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, t: b.ended.t, why: b.ended.why } : null,
      parent: parent ? { type: parent.type, room: parent.room, cause: parent.cause } : null,
      turret: { destroyed: isDestroyed(t), shutdown: t.shutdown, integrity: t.cells.reduce((x, y) => x + (y.destroyed ? 0 : y.integrity), 0) / t.cells.length },
      explosions: ev.filter((e) => e.type === 'explosion').length,
    };
  },
  compare(e, a) {
    const checks = {
      'Disabled, the target, no explosion': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0,
      'lost by shutdown, cause heat': !!a.ended && a.ended.why === e.why && !!a.parent && a.parent.type === 'shutdown' && a.parent.room === 'turret' && a.parent.cause === e.cause,
      'the turret not destroyed': !a.turret.destroyed,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'Disabled; the turret shut down by heat, not destroyed', actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} at ${a.ended.t.toFixed(4)} s (${a.ended.why})` : 'no end'}; parent ${a.parent ? `${a.parent.type} ${a.parent.room} (${a.parent.cause})` : '-'}; turret destroyed ${a.turret.destroyed}, shut down ${a.turret.shutdown}, mean integrity ${a.turret.integrity.toFixed(3)}` };
  },
};
