import { createBattle, runBattle } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B5 of L4b (DESIGN.md 13l.4): run it dry (#91). The battle loop (js/battle.js, 13l.1): T-gun the target at T1, its
// turret ordered to fire broadside (+y of its own frame) into empty space until its ready store and its magazine are
// empty; the attacker R1d at rest 900 m away on bearing -y holds its fire (nobody shooting at T-gun).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.route.dry',
  level: 'L4',
  laws: ['a turret fires at turret.fireRate from its ready store, refilled by the magazine over a live wall (#18, #193)', 'a turret with no round in its store and no fed magazine is not able (13l.1)', 'Disabled after battle.disabledSeconds (#255)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target T-gun (mission0/targets.js), its magazine full of HE and its ready store full, its turret firing broadside along +y of its frame from t = 0; attacker R1d at rest 900 m from it on bearing -y, holding fire; 400 s at most (13l.4 B5)',
  measure: 'the step in which the target is Disabled; its turret\'s shots; what is left in its store and magazine; why its last weapon lost its ability',
  tolerance: 'exact: a count of steps (discrete by nature, 13l.4)',
  criterion: 'Disabled in step (n - 1) / (rate dt) + 1 + disabledSeconds / dt exactly, n = ready + magazine rounds = turret.readyRounds + floor(magazine.capacity / kinetic.roundMass) (shot k at k / rate from t = 0, the last in step (n - 1) / (rate dt); the store is empty at the end of that step; Disabled 600 steps later); hand-worked literal at T1: n = 4 + 900 / 6 = 154, step 153 x 120 + 1 + 600 = 18961, t = 316.0167 s (13l.3\'s 316.02 s); n shots fired, nothing left; the last ability lost because the turret ran dry (13l.1)',
  tunable: ['turret.fireRate', 'turret.readyRounds', 'magazine.capacity', 'kinetic.roundMass', 'ammo.wallFeed', 'battle.disabledSeconds'],
  locked: { date: '2026-10-22', hash: 'f172b965' },
  cases() {
    return [{ target: 'T-gun' }];
  },
  expected(ctx) {
    const p = ctx.params, n = p.turret.readyRounds.value + Math.floor(p.magazine.capacity.value / p.kinetic.roundMass.value);
    const steps = Math.round((n - 1) / (p.turret.fireRate.value * ctx.dt)) + 1 + Math.round(p.battle.disabledSeconds.value / ctx.dt);
    return { n, step: steps, literal: { n: 154, step: 18961 } };
  },
  run(ctx, c) {
    const b = runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: '-y', targetFire: { aim: [0, 1] } }), 400);
    const t = b.target.room('turret'), m = b.target.room('magazine');
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, t: b.ended.t, why: b.ended.why } : null,
      shots: t.turret.shots, left: t.turret.ammo + m.magazine.ap + m.magazine.he,
    };
  },
  compare(e, a) {
    const checks = {
      'formula = hand-worked literal': e.n === e.literal.n && e.step === e.literal.step,
      'Disabled in that step': !!a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.ended.step === e.step,
      'n shots, nothing left, ran dry': a.shots === e.n && a.left === 0 && !!a.ended && a.ended.why === 'dry',
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `Disabled in step ${r.expected.step} (n ${r.expected.n})`, actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} in step ${a.ended.step} (${a.ended.t.toFixed(4)} s, ${a.ended.why})` : 'no end'}; ${a.shots} shots, ${a.left} left` };
  },
};
