import { createBattle, tick, toGrid, mainBody } from '../../../js/battle.js';
import { survivingCells } from '../../../js/rooms.js';
import { rotate } from '../../../js/body.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B1 of L4b (DESIGN.md 13l.4): decapitation. The battle loop (js/battle.js, 13l.1): R1 (13f.2) the static target at
// T1, the attacker R1d (#261) at rest 900 m from R1's centre of mass on bearing -y, bow-on, its turret aimed at the
// bridge (the centre of its first surviving cell, js/battle.js aimPoint). The bridge [5, 7) x [2, 4) is open from -y.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const LIMIT = 120; // s
const FACE = 10; // m: the bridge's face toward -y in R1's grid (row 2's lower edge); columns 5 and 6 are empty below it

export default {
  id: 'L4.route.decapitate',
  level: 'L4',
  laws: ['Disabled: no able weapon for battle.disabledSeconds, whatever the engine does (#82, #255, 13l.1)', 'a weapon room is able only while controlled from a bridge (13f.1, 13l.1)', 'rounds fly with a time of flight and hit along their segment (13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (mission0/targets.js), attacker R1d at rest 900 m from R1\'s centre of mass on bearing -y, bow-on; the attacker\'s turret fires at the bridge; nobody else fires; 120 s at most (13l.4 B1)',
  measure: 'the step in which the bridge\'s last cell is destroyed and the shot that destroyed it; the step the battle ends and how; for every shot the scenario\'s own arrival step at the bridge\'s face from the round\'s launch point, launch time and velocity; the explosions; the root of the Disabled event\'s cause chain',
  tolerance: 'step counts exact',
  criterion: 'the target is Disabled (not destroyed, no explosion) exactly battle.disabledSeconds / dt = 600 steps after the step in which the bridge\'s last cell is destroyed; that step is the arrival step of the shot whose id the cell-destroyed event carries, by the scenario\'s own count: a round launched at t0 from x0 with velocity v (both in R1\'s grid frame at launch) reaches the face y = 10 m at t0 + (10 - y0) / v_y, and arrives in the first step k with k dt >= that time (its segment of step k crosses the face); every shot launched has hit when it arrives, so the number of hits by that step is the number of shots that have arrived by it; hand-worked literal: the first round leaves R1d\'s turret 14.315 m ahead of its centre of mass, about 879.5 m from the face, and arrives in step 66 (1.0994 s / dt = 65.96); the Disabled event\'s chain of parents ends at a shot id (13l.1)',
  tunable: ['battle.disabledSeconds', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck'],
  locked: { date: '2026-10-22', hash: 'f9b416ea' },
  cases() {
    return [{ target: 'R1', bearing: '-y' }];
  },
  expected(ctx) {
    return { gap: Math.round(ctx.params.battle.disabledSeconds.value / ctx.dt), firstArrival: 66 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { turret: ['bridge'] } });
    const dt = b.dt, T = b.target, seen = new Map();
    let lastBridge = null;
    while (!b.ended && b.step < Math.round(LIMIT / dt)) {
      tick(b);
      for (const r of b.rounds) {
        if (seen.has(r.id)) continue;
        const pose = mainBody(T), p = toGrid(pose, r.ref.x0), v = rotate(r.ref.v, -pose.theta), w = rotate(pose.v, -pose.theta);
        const arrive = r.t0 + (FACE - p[1]) / (v[1] - w[1]);
        const k = Math.ceil(arrive / dt - 1e-9);
        seen.set(r.id, { t0: r.t0, arrive, step: k });
      }
      if (!lastBridge && survivingCells(T.room('bridge')) === 0) lastBridge = [...T.world.log.events].reverse().find((e) => e.type === 'cell-destroyed' && e.room === 'bridge');
    }
    const ev = T.world.log.events, byId = new Map(ev.map((e) => [e.id, e]));
    let root = b.ended ? b.ended.parent : null;
    while (root && byId.has(root)) root = byId.get(root).parent;
    const stepOf = (t) => Math.round(t / dt);
    const bridgeStep = lastBridge ? stepOf(lastBridge.t) : null;
    const shot = lastBridge ? seen.get(lastBridge.cause) : null;
    const hitsBy = new Set(b.hits.filter((h) => stepOf(h.t) <= bridgeStep).map((h) => h.id)).size;
    const arrivedBy = [...seen.values()].filter((s) => s.step <= bridgeStep).length;
    const first = seen.get('shot-1'), firstHit = b.hits.find((h) => h.id === 'shot-1');
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null,
      explosions: ev.filter((e) => e.type === 'explosion').length,
      bridgeStep, bridgeCause: lastBridge ? lastBridge.cause : null, ownArrival: shot ? shot.step : null,
      hitsBy, arrivedBy, firstArrival: first.step, firstHitStep: firstHit ? stepOf(firstHit.t) : null, root, shots: b.shots,
    };
  },
  compare(e, a) {
    const checks = {
      'Disabled, the target, no explosion': !!a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.explosions === 0,
      '600 steps after the bridge\'s last cell': a.bridgeStep !== null && a.ended.step - a.bridgeStep === e.gap,
      'that step is its shot\'s own arrival step': a.ownArrival !== null && a.ownArrival === a.bridgeStep,
      'hits by then = shots arrived by then': a.hitsBy === a.arrivedBy,
      'first arrival step 66 (hand-worked) and the kernel\'s first hit': a.firstArrival === e.firstArrival && a.firstHitStep === e.firstArrival,
      'the chain ends at a shot': /^shot-\d+$/.test(String(a.root)),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `Disabled ${r.expected.gap} steps after the bridge's last cell, in its shot's own arrival step; first arrival step ${r.expected.firstArrival}`, actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} at step ${a.ended.step}` : 'no end'}; bridge gone at step ${a.bridgeStep} by ${a.bridgeCause} (own arrival ${a.ownArrival}); hits ${a.hitsBy}, arrived ${a.arrivedBy}; first ${a.firstArrival}/${a.firstHitStep}; root ${a.root}; ${a.shots} shots` };
  },
};
