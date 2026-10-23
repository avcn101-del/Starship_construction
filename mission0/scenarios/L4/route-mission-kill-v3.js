import { createBattle, tick, weaponStates } from '../../../js/battle.js';
import { isDestroyed, survivingCells } from '../../../js/rooms.js';
import { liveWalls } from '../../../js/graph.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.route.missionKill.v2 (withdrawn under #286): the mission kill (#255) shown on R1d. With the turret by
// its mount (#285, 4975 kg a cell, sigma 199 kg/m^2) a round passes R1's light turret and enters the magazine below it
// above magazine.detonationSpeed, so R1 from +y is destroyed, not Disabled (#286 (1)); R1d's turret plates stop every
// round before the citadel. The battle loop (js/battle.js, 13l.1): the attacker R1d at rest 900 m away on bearing +y,
// bow-on; its turret fires at the beam bay, then at the turret, each until it is destroyed.
// (route) target R1d: Disabled with the engine working, every check of .v2 re-pointed to R1d.
// (R1) target R1, the same plan: destroyed by the magazine. Hand-worked (L0.turret.mount's arithmetic, 13i.1): an M
//   round (m 6 kg) through two turret cells at chord 1, r = c sigma = 1545.364 x 199 = 307 527.5 kg/(m s), A0 =
//   3.060866e-3 m^2, r / S = 0.1015187, loses r A0 (1 + 1 / (1 - r / S)) / m = 941.300 x 2.112989 / 6 = 331.493 m/s
//   (800 - 468.507), whatever its speed, so it enters the magazine at v_rel - 331.493: about 469 m/s from 800 m/s,
//   >= magazine.detonationSpeed 400. v_rel is the round's speed relative to the hull, a kernel reading (the hull drifts
//   after the earlier hits, a few cm/s), so the speed is checked against v_rel - 331.493 at 1e-3 m/s and against the
//   literal 468.507 at 0.5 m/s.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const LIMIT = 300; // s
const LOSS = 331.493; // m/s, hand-worked above

export default {
  id: 'L4.route.missionKill.v3',
  level: 'L4',
  laws: ['Disabled: no able weapon for battle.disabledSeconds, whatever the engine does (#255, 13l.1)', 'a destroyed weapon room is not able (13l.1)', 'a magazine with rounds detonates when a round enters a standing cell of it at magazine.detonationSpeed or more (13n.1 (b))'],
  dependsOn: [],
  setup: 'the battle loop at T1, attacker R1d at rest 900 m from the target\'s centre of mass on bearing +y, bow-on; its turret fires at the target\'s beam bay, then at its turret; 300 s at most: (route) target R1d (mission0/targets.js); (R1) target R1 (#286 (1), 13l.2 "From L5m")',
  measure: 'how the battle ends and in which step; (route) the shot that destroys the turret\'s last cell and the shots launched by that step; the engine\'s state at the end (destroyed, controlled, shut down, active, joined through live walls to a reactor that can produce); the rooms destroyed; the rooms on the paths of every hit; (R1) the detonation event (its shot, its speed) and that shot\'s hit (its path, its speed relative to the hull)',
  tolerance: 'exact (states, sets, events, step counts); (R1) the entry speed against v_rel - 331.493 m/s 1e-3 m/s, against the literal 468.507 m/s 0.5 m/s',
  criterion: '(route) the target R1d is Disabled (no explosion) while its engine works: not destroyed, controlled, not shut down, active and joined through live walls to a reactor that can produce (#255: thrust does not count); the rooms destroyed are the beam bay and the turret and otherwise only rooms some hit\'s path crossed; the last weapon lost its ability by destruction (13l.1); kernel-read literals, pinned as regressions (read off the kernel, not derived; #286\'s probe: 61.1 s): the turret\'s last cell is destroyed by shot-26 with 26 shots launched by that step, and the target is Disabled in step 3666, the literal 600 steps (battle.disabledSeconds / dt) after the step of that cell (hand-worked gap). (R1) the target R1 is destroyed, not Disabled: a detonation of the magazine caused by a shot whose path enters the turret\'s two cells and then the magazine, at an entry speed relative to the hull >= magazine.detonationSpeed 400 m/s, equal to v_rel - 331.493 m/s (hand-worked from sigma 199 kg/m^2, the file\'s comments) and about 469 m/s (468.507 from 800 m/s); kernel-read, pinned: the detonating shot is shot-9 and the end is in step 1026 (#286 (1): 17.1 s)',
  tunable: ['battle.disabledSeconds', 'kinetic.hitsToWreck', 'magazine.detonationSpeed'],
  locked: { date: '2026-10-23', hash: 'a139c27d' },
  cases() {
    return [{ target: 'R1d', bearing: '+y' }, { target: 'R1', bearing: '+y' }];
  },
  expected(ctx, c) {
    if (c.target === 'R1') return { kind: 'destroyed', threshold: 400, loss: LOSS, literal: 468.507, shot: 'shot-9', step: 1026 }; // 400, 331.493, 468.507 hand-worked; shot-9, 1026 kernel-read
    return { kind: 'disabled', must: ['beamBay', 'turret'], why: 'destroyed', shot: 'shot-26', launched: 26, step: 3666, gap: 600 }; // shot-26, 26 and 3666 kernel-read; 600 hand-worked
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { turret: ['beamBay', 'turret'] } });
    let last = null, launchedBy = null;
    while (!b.ended && b.step < Math.round(LIMIT / b.dt)) {
      tick(b);
      if (!last && survivingCells(b.target.room('turret')) === 0) { last = [...b.target.world.log.events].reverse().find((e) => e.type === 'cell-destroyed' && e.room === 'turret'); launchedBy = b.shots; }
    }
    const w = b.target.world, room = b.target.room, engine = room('engine');
    const ended = b.ended ? { kind: b.ended.kind, side: b.ended.side, t: b.ended.t, step: b.ended.step, why: b.ended.why, by: b.ended.by } : null;
    if (c.target === 'R1') {
      const d = w.log.events.find((e) => e.type === 'detonation');
      const h = d ? b.hits.find((x) => x.id === d.cause) : null;
      return {
        ended, detonation: d ? { room: d.room, cause: d.cause, speed: d.speed } : null,
        hit: h ? { path: h.path.map((x) => x.split(':')[0]), passed: h.passed, toHull: h.toHull } : null,
      };
    }
    const walls = liveWalls(w).filter((x) => x.live > 0);
    const producing = w.rooms.filter((r) => r.type === 'reactor' && !isDestroyed(r) && r.controlled && !r.reactor.scrammed && !r.shutdown);
    const seen = new Set(producing), q = [...producing];
    for (let i = 0; i < q.length; i++) for (const x of walls) { const o = x.a === q[i] ? x.b : x.b === q[i] ? x.a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } }
    return {
      ended,
      turretCell: last ? { cause: last.cause, step: Math.round(last.t / b.dt) } : null, launchedBy,
      explosions: w.log.events.filter((e) => e.type === 'explosion').length,
      engine: { destroyed: isDestroyed(engine), controlled: engine.controlled, shutdown: engine.shutdown, active: engine.active, powered: seen.has(engine) },
      destroyed: w.rooms.filter((r) => isDestroyed(r)).map((r) => r.id),
      crossed: [...new Set(b.hits.flatMap((h) => h.path.filter((x) => !x.startsWith('plate:')).map((x) => x.split(':')[0])))].sort(),
      able: weaponStates(w).filter((x) => x.able).map((x) => x.room.id),
    };
  },
  compare(e, a, c) {
    if (c.target === 'R1') {
      const d = a.detonation, h = a.hit;
      const r1 = {
        'destroyed, the target, not Disabled': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T',
        'a magazine detonation by a shot through the turret\'s two cells into the magazine': !!d && d.room === 'magazine' && !!h && h.passed >= 2 && h.path.slice(0, 3).join(' ') === 'turret turret magazine',
        'entry speed >= magazine.detonationSpeed 400 m/s': !!d && d.speed >= e.threshold,
        'entry speed = v_rel - 331.493 m/s (hand-worked) within 1e-3': !!d && !!h && Math.abs(d.speed - (h.toHull - e.loss)) <= 1e-3,
        'entry speed about 469 m/s (468.507 hand-worked) within 0.5': !!d && Math.abs(d.speed - e.literal) <= 0.5,
        'by shot-9, the end in step 1026 (kernel-read)': !!d && d.cause === e.shot && !!a.ended && a.ended.step === e.step,
      };
      return { pass: Object.values(r1).every(Boolean), note: notes(r1) };
    }
    const g = a.engine;
    const checks = {
      'Disabled, the target, no explosion': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0,
      'the engine works': !g.destroyed && g.controlled && !g.shutdown && g.active && g.powered,
      'beam bay and turret destroyed': e.must.every((id) => a.destroyed.includes(id)),
      'nothing else destroyed but rooms on the paths': a.destroyed.every((id) => e.must.includes(id) || a.crossed.includes(id)),
      'the last ability lost by destruction': !!a.ended && a.ended.why === e.why && a.able.length === 0,
      'the turret\'s last cell by shot-26, 26 launched (kernel-read)': !!a.turretCell && a.turretCell.cause === e.shot && a.launchedBy === e.launched,
      'Disabled in step 3666 (kernel-read), 600 steps after that cell': !!a.ended && a.ended.step === e.step && !!a.turretCell && a.ended.step - a.turretCell.step === e.gap,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    const end = a.ended ? `${a.ended.kind} ${a.ended.side} at ${a.ended.t.toFixed(4)} s, step ${a.ended.step} (${a.ended.why || a.ended.by})` : 'no end';
    if (r.case.target === 'R1') return { expected: `destroyed in step ${e.step}; the magazine detonated by ${e.shot} at v_rel - ${e.loss} m/s (about ${e.literal}) >= ${e.threshold} m/s`, actual: `${end}; detonation ${a.detonation ? `${a.detonation.room} by ${a.detonation.cause} at ${a.detonation.speed.toFixed(4)} m/s` : '-'}; its hit ${a.hit ? `path [${a.hit.path}], passed ${a.hit.passed}, v_rel ${a.hit.toHull.toFixed(4)} m/s` : '-'}` };
    return { expected: `Disabled with the engine working in step ${e.step}; destroyed: beam bay, turret (+ rooms on the paths); turret's last cell by ${e.shot}`, actual: `${end}; turret's last cell ${a.turretCell ? `by ${a.turretCell.cause} in step ${a.turretCell.step}` : '-'}, ${a.launchedBy} launched; engine ${JSON.stringify(a.engine)}; destroyed [${a.destroyed}]; paths crossed [${a.crossed}]` };
  },
};
