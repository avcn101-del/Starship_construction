import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint, rotate } from '../../../js/body.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// S7 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #95, #289): with the battle setting `knowledge` on, the attacker's plan
// aims at what its own model knows: a plan room the model does not know at the centre of the zone the case names (a
// physical shot at whatever is there), a known room at its first known standing cell's centre. With it off the plan
// aims at the room itself (L4b).
//
// Setup (T1): the L4 battle (createBattle) with the attacker R1d-A (R1d with an antenna on its hold's -y edge of cell
// (8, 0)) against R1 from -y at battle.openingRange (900 m), the plan's turret on R1's magazine, battle seed 1, up to
// 20 s or the battle's end. (knowledge) `knowledge: true`, the case naming zone 1 (plan.zone), the attacker's antenna
// scanning zone 1 from t = 0. (L4b) `knowledge` off, the same plan.
// Hand-worked (grid of R1, m): zone 1 = [4, 8) x [0, 3), its centre (30, 7.5); it holds the magazine's cell (7, 2), the
// magazine's cell 0 (its others, (8, 2), (7, 3), (8, 3), lie in zones 2, 4 and 5), whose centre is (37.5, 12.5). So
// before zone 1 resolves the turret is laid on (30, 7.5), after it on (37.5, 12.5); with knowledge off on (37.5, 12.5)
// from the first shot. Kernel-read (labelled): R1's pose (each point mapped on its body at the tick), the turret's
// world position and the attacker's heading at each tick, the step zone 1 resolves (the attacker's antenna-to-zone
// distance depends on both ships' centres of mass), and every hit's path.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const ZONE_CENTRE = [30, 7.5], MAG_CELL = [37.5, 12.5];

export default {
  id: 'L4.target.known',
  level: 'L4',
  laws: ['with the knowledge model a plan room is aimed at as the side\'s own model knows it: an unknown room at the named zone\'s centre, a known one at its first known standing cell (#26, #95, 13n.1 (a), #289)', 'with knowledge off the battle aims at the room itself (13l.1)'],
  dependsOn: ['L1.sensor.active'],
  setup: 'T1: createBattle, R1d-A against R1 from -y at 900 m, the plan\'s turret on R1\'s magazine; knowledge on with plan.zone 1 and the antenna scanning zone 1 from t = 0, or knowledge off; up to 20 s or the end (13n.4 S7)',
  measure: 'for every shot: the turret\'s aim (its ship-frame direction at launch) against the direction from the turret to the expected point on R1\'s pose; whether zone 1 had resolved; each hit\'s path',
  tolerance: 'the aim direction 1e-12 (each component); the switch exact (the step zone 1 resolved, kernel-read)',
  criterion: 'knowledge on: every shot launched before zone 1 resolves is laid on the zone\'s centre, grid (30, 7.5) m on R1\'s pose, every shot after it on the magazine\'s cell (7, 2), grid (37.5, 12.5) m; at least one shot each way; the hit paths before and after differ, an after-shot\'s path holds magazine:0 and no before-shot\'s does (kernel-read, labelled); the shooter\'s model records its hits; knowledge off: every shot on (37.5, 12.5) from the first, and the battle has no model',
  tunable: ['sensor.scanTime', 'sensor.scanRange', 'turret.fireRate'],
  locked: { date: '2026-10-23', hash: '0e1bdad2' },
  cases() {
    return [{ knowledge: true }, { knowledge: false }];
  },
  expected(ctx, c) {
    return { zone: ZONE_CENTRE, room: MAG_CELL, knowledge: c.knowledge };
  },
  run(ctx, c) {
    const battle = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: TARGETS.R1, bearing: '-y', plan: { turret: ['magazine'], ...(c.knowledge ? { zone: 1 } : {}) }, knowledge: c.knowledge, scans: c.knowledge ? [{ side: 'A', antenna: 0, zone: 1, at: 0 }] : [] });
    const A = battle.attacker, T = battle.target, turret = A.world.rooms.find((r) => r.type === 'turret');
    const shots = [];
    let seen = 0, resolvedAt = null;
    while (!battle.ended && battle.step < 1200) {
      // The pose and the model's state before the tick, which its aim reads (kernel-read).
      const known = c.knowledge && A.model.resolved.has(1);
      const tb = mainBody(T), ab = A.world.ship.bodies.find((b) => b.id === turret.body);
      const S = worldPoint(ab, turret.position), theta = ab.theta;
      const want = (grid) => { const P = worldPoint(tb, grid), d = [P[0] - S[0], P[1] - S[1]], L = Math.sqrt(d[0] * d[0] + d[1] * d[1]); return rotate([d[0] / L, d[1] / L], -theta); };
      const wantZone = want(ZONE_CENTRE), wantRoom = want(MAG_CELL);
      tick(battle);
      if (resolvedAt === null && c.knowledge && A.model.resolved.has(1)) resolvedAt = battle.step;
      const fresh = A.world.log.events.slice(seen).filter((e) => e.type === 'shot');
      seen = A.world.log.events.length;
      for (const e of fresh) {
        const id = battle.rounds.find((r) => r.event === e.id)?.id || `shot-${battle.shots}`;
        const err = (w) => Math.max(Math.abs(turret.turret.aim[0] - w[0]), Math.abs(turret.turret.aim[1] - w[1]));
        shots.push({ id, step: battle.step, known, zoneErr: err(wantZone), roomErr: err(wantRoom) });
      }
    }
    for (const s of shots) { const h = battle.hits.find((x) => x.id === s.id); s.path = h ? h.path : null; }
    return { shots, resolvedAt, ended: battle.ended ? battle.ended.kind : null, hasModel: !!A.model, modelHits: A.model ? A.model.hits.length : 0 };
  },
  compare(e, a, c) {
    const tol = 1e-12, before = a.shots.filter((s) => !s.known), after = a.shots.filter((s) => s.known);
    let checks;
    if (c.knowledge) {
      const afterPaths = after.filter((s) => s.path).map((s) => s.path.join(' ')), beforePaths = before.filter((s) => s.path).map((s) => s.path.join(' '));
      checks = {
        'zone 1 resolved (kernel-read step)': a.resolvedAt !== null,
        'at least one shot before and one after': before.length > 0 && after.length > 0,
        'before: laid on the zone\'s centre (30, 7.5) (1e-12)': before.every((s) => s.zoneErr <= tol),
        'after: laid on the magazine\'s cell (37.5, 12.5) (1e-12)': after.every((s) => s.roomErr <= tol),
        'the shots before resolve only before its step, after only after (kernel-read)': before.every((s) => s.step <= a.resolvedAt) && after.every((s) => s.step > a.resolvedAt),
        'the paths differ: an after-shot holds magazine:0, no before-shot does (kernel-read)': afterPaths.some((p) => p.split(' ').includes('magazine:0')) && beforePaths.every((p) => !p.split(' ').includes('magazine:0')) && !afterPaths.some((p) => beforePaths.includes(p)),
        'the shooter\'s model records its hits': a.modelHits === a.shots.filter((s) => s.path).length && a.modelHits > 0,
      };
    } else {
      checks = {
        'every shot on the magazine\'s cell (37.5, 12.5) (1e-12)': a.shots.length > 0 && a.shots.every((s) => s.roomErr <= tol),
        'no model with knowledge off': a.hasModel === false,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `knowledge ${r.expected.knowledge ? 'on: zone (30, 7.5) then room (37.5, 12.5)' : 'off: room (37.5, 12.5)'}`, actual: `resolved after step ${a.resolvedAt}; shots ${a.shots.map((s) => `${s.id}@${s.step} ${s.known ? 'room' : 'zone'} ${(s.known ? s.roomErr : s.zoneErr).toExponential(1)} ${s.path ? s.path.slice(0, 4).join('>') : 'miss'}`).join('; ')}; end ${a.ended}` };
  },
};
