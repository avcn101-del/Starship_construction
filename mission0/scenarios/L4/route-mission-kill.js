import { createBattle, runBattle, weaponStates } from '../../../js/battle.js';
import { isDestroyed } from '../../../js/rooms.js';
import { liveWalls } from '../../../js/graph.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B2 of L4b (DESIGN.md 13l.4): the mission kill (#255). The battle loop (js/battle.js, 13l.1): R1 the static target at
// T1, the attacker R1d at rest 900 m away on bearing +y (R1's quarters-and-turret side), bow-on; its turret fires at
// the beam bay, then at the turret, each until it is destroyed (the bay's column 9 runs through the turret from +y).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const LIMIT = 300; // s

export default {
  id: 'L4.route.missionKill',
  level: 'L4',
  laws: ['Disabled: no able weapon for battle.disabledSeconds, whatever the engine does (#255, 13l.1)', 'a destroyed weapon room is not able (13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (mission0/targets.js), attacker R1d at rest 900 m from R1\'s centre of mass on bearing +y, bow-on; its turret fires at R1\'s beam bay, then at its turret; 300 s at most (13l.4 B2)',
  measure: 'how the battle ends; the engine\'s state at the end (destroyed, controlled, shut down, active, joined through live walls to a reactor that can produce); the rooms destroyed; the rooms on the paths of every hit',
  tolerance: 'exact (states and sets)',
  criterion: 'the target is Disabled (no explosion) while its engine works: not destroyed, controlled, not shut down, active and joined through live walls to a reactor that can produce (#255: thrust does not count); the rooms destroyed are the beam bay and the turret and otherwise only rooms some hit\'s path crossed; the last weapon lost its ability by destruction (13l.1)',
  tunable: ['battle.disabledSeconds', 'kinetic.hitsToWreck'],
  locked: null,
  cases() {
    return [{ target: 'R1', bearing: '+y' }];
  },
  expected() {
    return { kind: 'disabled', must: ['beamBay', 'turret'], why: 'destroyed' };
  },
  run(ctx, c) {
    const b = runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { turret: ['beamBay', 'turret'] } }), LIMIT);
    const w = b.target.world, room = b.target.room, engine = room('engine');
    const walls = liveWalls(w).filter((x) => x.live > 0);
    const producing = w.rooms.filter((r) => r.type === 'reactor' && !isDestroyed(r) && r.controlled && !r.reactor.scrammed && !r.shutdown);
    const seen = new Set(producing), q = [...producing];
    for (let i = 0; i < q.length; i++) for (const x of walls) { const o = x.a === q[i] ? x.b : x.b === q[i] ? x.a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } }
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, t: b.ended.t, why: b.ended.why } : null,
      explosions: w.log.events.filter((e) => e.type === 'explosion').length,
      engine: { destroyed: isDestroyed(engine), controlled: engine.controlled, shutdown: engine.shutdown, active: engine.active, powered: seen.has(engine) },
      destroyed: w.rooms.filter((r) => isDestroyed(r)).map((r) => r.id),
      crossed: [...new Set(b.hits.flatMap((h) => h.path.filter((x) => !x.startsWith('plate:')).map((x) => x.split(':')[0])))].sort(),
      able: weaponStates(w).filter((x) => x.able).map((x) => x.room.id),
    };
  },
  compare(e, a) {
    const g = a.engine;
    const checks = {
      'Disabled, the target, no explosion': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0,
      'the engine works': !g.destroyed && g.controlled && !g.shutdown && g.active && g.powered,
      'beam bay and turret destroyed': e.must.every((id) => a.destroyed.includes(id)),
      'nothing else destroyed but rooms on the paths': a.destroyed.every((id) => e.must.includes(id) || a.crossed.includes(id)),
      'the last ability lost by destruction': !!a.ended && a.ended.why === e.why && a.able.length === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'Disabled with the engine working; destroyed: beam bay, turret (+ rooms on the paths)', actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} at ${a.ended.t.toFixed(4)} s (${a.ended.why})` : 'no end'}; engine ${JSON.stringify(a.engine)}; destroyed [${a.destroyed}]; paths crossed [${a.crossed}]` };
  },
};
