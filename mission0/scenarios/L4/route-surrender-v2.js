import { createBattle, tick, battleTree } from '../../../js/battle.js';
import { setActive, isDestroyed } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// Successor of L4.route.surrender (withdrawn under #303: the surrender timer's formula was the plan's wording error,
// battle.disabledSeconds x (1 - resolve), against its gloss and H8's "resolve 1: Disabled at 10 s"). H8 of the L5 plan
// (DESIGN.md 13n.4, 13n.1 (d), #85, #86, #273 (5), #252, #303): the surrender route. An enemy with no able weapon
// strikes its colours battle.disabledSeconds x resolve after losing its last, counted in steps like the Disabled timer
// (stepsAtLeast); the event 'surrender' ends the battle as a capture (the same loot as Disabled, #83) with its own end
// kind; at resolve 1 the two timers coincide and Disabled ends the battle (the ship never strikes).
//
// Setup (T1): createBattle with knowledge on; the enemy R1-A (T; aggression, patience, caution 0.5) at resolve 0, 0.5
// and 1 against R1d (A, static, an empty plan: it never fires) on bearing -y at 900 m, both at rest; after the 150th
// step every weapon of the enemy (its turret and its beam bay) is switched off (setActive, a case's input): the able
// rule's 'off'; until the end or 20 s.
// Hand-worked: the loss is registered at the end of the next step, step 151 (since = 151 dt); the surrender comes at
// step 151 + stepsAtLeast(10 x resolve / dt): 151 (resolve 0, at once) and 151 + 300 = 451 (resolve 0.5, 5.0 s after),
// so t - since is 0 and 5.0 s, one-sided in [T, T + dt); at resolve 1 the surrender's 10 s equal the Disabled timer,
// which is checked first: Disabled at 151 + 600 = 751 (10.0 s after). Each end on the enemy's side, a capture (none of
// its rooms destroyed: the loot is the ship as it stands, all 10 rooms), its parent the event that took the last weapon
// ('launch' for a switch).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.route.surrender.v2',
  level: 'L4',
  laws: ['an enemy with no able weapon strikes its colours battle.disabledSeconds x resolve after losing its last: a capture with its own end kind (#85, #86, #273 (5), 13n.1 (d), #303)'],
  dependsOn: ['L4.enemy.decide'],
  setup: 'T1: createBattle, knowledge on; the enemy R1-A at resolve 0 / 0.5 / 1 against a static R1d on bearing -y at 900 m; after step 150 its turret and beam bay switched off; to the end or 20 s (13n.4 H8, #303)',
  measure: 'the end: kind, side, step, t - since, parent; the enemy\'s rooms standing',
  tolerance: 'steps exact; t - since one-sided [T, T + dt)',
  criterion: 'resolve 0: surrender at step 151 (t - since 0); 0.5: surrender at step 451 (5.0 s); 1: disabled at step 751 (10.0 s, the surrender\'s timer equal to it); each on side T, a capture with all 10 rooms standing, parent launch',
  tunable: ['battle.disabledSeconds'],
  locked: { date: '2026-10-23', hash: '8840bd1c' },
  cases() {
    return [{ resolve: 0 }, { resolve: 0.5 }, { resolve: 1 }];
  },
  expected(ctx, c) {
    const T = 10 * c.resolve, steps = Math.round(T * 60);
    return c.resolve === 1 ? { kind: 'disabled', step: 751, after: 10 } : { kind: 'surrender', step: 151 + steps, after: T };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS.R1d, target: SENSOR_SHIPS['R1-A'], bearing: '-y', knowledge: true, enemy: { T: { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: c.resolve } } });
    const T = b.target;
    while (!b.ended && b.step < 1200) {
      if (b.step === 150) for (const r of T.world.rooms) if (r.type === 'turret' || r.type === 'beamBay') setActive(T.world, r, false);
      tick(b);
    }
    const e = b.ended, ev = e && T.world.log.events.find((x) => x.id === e.event);
    return { kind: e ? e.kind : null, side: e ? e.side : null, step: e ? e.step : null, after: e && ev ? e.t - ev.since : null, parent: e ? e.parent : null, standing: T.world.rooms.filter((r) => !isDestroyed(r)).length, treeErrors: battleTree(b).reduce((x, s) => x + s.errors.length, 0) };
  },
  compare(e, a) {
    const dt = 1 / 60;
    const checks = {
      'the end kind': a.kind === e.kind,
      'on the enemy\'s side': a.side === 'T',
      'at the step': a.step === e.step,
      't - since one-sided in [T, T + dt)': a.after !== null && a.after >= e.after - 1e-9 && a.after < e.after + dt,
      'a capture: all 10 rooms standing': a.standing === 10,
      'its parent the switch (launch)': a.parent === 'launch',
      'the cascade tree has no error': a.treeErrors === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `${r.expected.kind} at step ${r.expected.step} (${r.expected.after} s after)`, actual: `${a.kind} ${a.side} at step ${a.step} (${a.after === null ? '-' : a.after.toFixed(4)} s after), parent ${a.parent}, ${a.standing} rooms standing` };
  },
};
