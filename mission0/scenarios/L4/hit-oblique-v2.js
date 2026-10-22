import { createBattle, tick, toGrid, mainBody } from '../../../js/battle.js';
import { rotate, worldPoint } from '../../../js/body.js';
import { destroyCell } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.hit.oblique (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but for the
// oblique battle's end and the residue of §17 item 39 (b). Under 13n.1 (b) a magazine detonates when a round enters a
// standing cell of it at magazine.detonationSpeed (400 m/s) or more, and the oblique line to the bridge's later cells
// crosses R1's hold and then a magazine cell: shot-11 enters it fast enough, the blast wrecks the reactor and the battle
// ends destroyed in step 1266 after 11 hits (kernel-read, labelled; 13 hits and Disabled in step 2106 before). Item 39
// (b): the r arithmetic reads 914 856 x 0.977357 = 894 141 (the own chord to six digits; 0.9774 is its four-digit
// literal, and 914 856 x 0.9774 is 894 180, #276 (3)).
// U2 of the L4 scenario audit (DESIGN.md 13l.7, #271): the battle loop's hit test off the axes. Every L4b battle fires
// along an axis through cell centres, so the chord on the loop's paths is always 1 and no shot meets a path of holes
// only (the survivors l4b.hit.chordOne and l4b.hit.holesHit). (oblique) B1's battle (R1 the static target at T1, the
// attacker R1d at rest 900 m from R1's centre of mass, bow-on, its turret at the bridge) with the attacker on the
// numeric bearing [sin 20 deg, -cos 20 deg] of R1's frame: the round's line crosses the bridge's cell (5, 3) (index
// 2, [25, 30) x [15, 20) m at T1) at a slant. (holes) B1's battle on bearing -y with the bridge and the quarters
// destroyed cell by cell after the battle is made, the turret aimed at the bridge's centre as a world point
// (plan.turretPoint): its line crosses only holes (the bridge's and the quarters' cells) and nothing beyond.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const DEG = Math.PI / 180;
const CELL = [[25, 30], [15, 20]]; // bridge cell 2 = grid cell (5, 3) at T1 (edge 5 m), m
const EDGE = 5;
/** The scenario's own chord (hand-worked geometry, not the kernel's crossedCells): the length the line p + v t runs inside an axis-aligned cell, over the edge. */
function chordThrough(p, v, cell) {
  const slab = (k) => { const t1 = (cell[k][0] - p[k]) / v[k], t2 = (cell[k][1] - p[k]) / v[k]; return [Math.min(t1, t2), Math.max(t1, t2)]; };
  const [x0, x1] = slab(0), [y0, y1] = slab(1), t0 = Math.max(x0, y0), t1 = Math.min(x1, y1);
  return t1 > t0 ? ((t1 - t0) * Math.hypot(v[0], v[1])) / EDGE : 0;
}

export default {
  id: 'L4.hit.oblique.v2',
  level: 'L4',
  laws: ['a round\'s path is the cells its line crosses in order, each with its chord: the length it runs in the cell over the edge, at most 1 (#239, 13l.1)', 'a cell resists a round as r = c sigma chord (13i.1, #239)', 'a line that meets only holes is no hit: the round flies on and leaves play (13l.1, js/battle.js lineHit; #212 (5))'],
  dependsOn: [],
  setup: 'the battle loop at T1, target R1, attacker R1d at rest 900 m from R1\'s centre of mass, bow-on, its turret at the bridge: (oblique) on bearing [sin 20 deg, -cos 20 deg] of R1\'s frame, to the end, 120 s at most; (holes) on bearing -y, the bridge and the quarters destroyed (destroyCell, cause launch) after the battle is made, the turret aimed at the bridge\'s centre (30, 15) m as a world point, to the end, 20 s at most (13l.7 U2)',
  measure: '(oblique) the first round\'s launch point and velocity in R1\'s grid frame (read off the kernel at launch); the first hit\'s path, its resistances r per entry, the cells passed and the cell it stops in; the hits, the misses and the step the battle ends; (holes) the shots launched, the hits, the misses with each miss\'s step, each round\'s launch time, launch distance from R1\'s centre of mass and speed; the step the battle ends',
  tolerance: 'the chord: the scenario\'s own geometry against the kernel\'s r ratio 1e-9 relative, the literal 0.9774 to 5e-5 (four digits); r literals 1e-6 relative (they are quoted to the unit); counts and steps exact',
  criterion: '(oblique) kernel-read: the first hit\'s path is bridge:0 > bridge:2 > reactor:3 > heatSink:1 > heatSink:3, the round passes one entry and stops in the second (passed 1, stopped in 1); hand-worked: the line from the round\'s launch point along its velocity crosses cell (5, 3) = [25, 30) x [15, 20) m at a slant, a chord of 0.9774 (the scenario\'s own slab geometry, the line\'s inputs read off the kernel at launch; literal 0.9774 from 13l.7), so the second entry resists r = 914 856 x 0.977357 = 894 141 kg/(m s) (the own chord to six digits; 914 856 x 0.9774 is 894 180, §17 item 39 (b)) against 914 856 at chord 1 (r = c sigma chord: the kernel\'s r[1] / r[0] equals the own chord, 1e-9); the first entry\'s chord is 1 (r[0] = 914 856); kernel-read: 11 hits and 0 misses, shot-11 crossing the hold into a magazine cell and detonating it (13n.1 (b)), the battle ending destroyed in step 1266 (the magazine\'s blast wrecks the reactor; L4.kill.v3); (holes) no hit: 0 hits; hand-worked: the turret fires at turret.fireRate 0.5 /s from t = 0, shots at 0, 2, ..., 10 s, so 6 shots by the Disabled step 601 (= 1 + 600: the bridge is lost before step 1, Disabled battle.disabledSeconds / dt = 600 steps later, t = 10.017 s); a round that meets nothing leaves play once it is farther than battle.cullDistance 3000 m from every body: launched at t0 a distance d0 from R1\'s centre of mass (about 884 m) at speed v (800 m/s), it is culled in the first step after t0 + (3000 + d0) / v (about 4.86 s; within 1 m of the line\'s offset from the centre: [t0 + (3000 + d0 - 1) / v, t0 + (3000 + d0 + 1) / v + dt]), so the shots of 0, 2 and 4 s are culled by 8.9 s and the shot of 6 s not before 10.86 s: 3 misses by step 601 (the survivor l4b.hit.holesHit counts a path of holes as a hit)',
  tunable: [],
  locked: null,
  cases() {
    return [{ line: 'oblique' }, { line: 'holes' }];
  },
  expected(ctx, c) {
    if (c.line === 'oblique') return { path: ['bridge:0', 'bridge:2', 'reactor:3', 'heatSink:1', 'heatSink:3'], passed: 1, stoppedIn: 1, chord: 0.9774, r: [914856, 894141], hits: 11, misses: 0, step: 1266, detonation: 'shot-11' }; // path, passed, stop, hits, misses, step, the detonating shot kernel-read
    const rate = 0.5, gap = 600, end = 1 + gap, tEnd = end / 60, shots = Math.floor(tEnd * rate) + 1; // hand-worked
    return { shots, hits: 0, misses: 3, step: end, cull: 3000, tEnd };
  },
  run(ctx, c) {
    if (c.line === 'oblique') {
      const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: [Math.sin(20 * DEG), -Math.cos(20 * DEG)], plan: { turret: ['bridge'] } });
      let first = null;
      while (!b.ended && b.step < Math.round(120 / b.dt)) {
        tick(b);
        if (!first && b.rounds.length) { const r = b.rounds[0], pose = mainBody(b.target); first = { id: r.id, x0: toGrid(pose, r.ref.x0), v: rotate(r.ref.v, -pose.theta) }; }
      }
      const h = b.hits.find((x) => x.id === first.id);
      return {
        first, hit: h ? { path: h.path, r: h.r, passed: h.passed, stoppedIn: h.stoppedIn } : null, own: chordThrough(first.x0, first.v, CELL),
        hits: b.hits.length, misses: b.misses.length, ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null,
        detonation: (b.target.world.log.events.find((e) => e.type === 'detonation') || {}).cause || null,
      };
    }
    const b0 = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const centre = worldPoint(mainBody(b0.target), b0.target.room('bridge').position);
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turretPoint: centre, turret: [] } });
    for (const id of ['bridge', 'quarters']) { const r = b.target.room(id); for (let i = 0; i < r.cells.length; i++) destroyCell(b.target.world, r, i, 'launch'); }
    const X = [...mainBody(b.target).x], launched = new Map();
    while (!b.ended && b.step < Math.round(20 / b.dt)) {
      tick(b);
      for (const r of b.rounds) if (!launched.has(r.id)) launched.set(r.id, { t0: r.t0, d0: Math.hypot(r.ref.x0[0] - X[0], r.ref.x0[1] - X[1]), v: Math.hypot(r.ref.v[0], r.ref.v[1]) });
    }
    return {
      centre, gridCentre: b.target.room('bridge').position, shots: b.shots, hits: b.hits.length,
      misses: b.misses.map((m) => ({ id: m.id, t: m.t, ...launched.get(m.id) })), ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null,
    };
  },
  compare(e, a, c, ctx) {
    let checks;
    if (c.line === 'oblique') {
      const h = a.hit;
      checks = {
        'the first hit\'s path (kernel-read)': !!h && JSON.stringify(h.path) === JSON.stringify(e.path),
        'passes one entry, stops in the second (kernel-read)': !!h && h.passed === e.passed && h.stoppedIn === e.stoppedIn,
        'own chord through cell (5, 3) = 0.9774 (hand-worked)': Math.abs(a.own - e.chord) <= 5e-5 && a.own < 1,
        'the kernel\'s r[1] / r[0] = the own chord (r = c sigma chord)': !!h && close(a.own, h.r[1] / h.r[0], 1e-9),
        'r 914 856 at chord 1, 894 141 at the second entry': !!h && close(e.r[0], h.r[0], 1e-6) && close(e.r[1], h.r[1], 1e-6),
        '11 hits, 0 misses, destroyed in step 1266 by shot-11\'s detonation (kernel-read)': a.hits === e.hits && a.misses === e.misses && !!a.ended && a.ended.kind === 'destroyed' && a.ended.side === 'T' && a.ended.step === e.step && a.detonation === e.detonation,
      };
    } else {
      const dt = ctx ? ctx.dt : 1 / 60;
      checks = {
        'aimed at the bridge\'s centre (30, 15) m': a.gridCentre[0] === 30 && a.gridCentre[1] === 15,
        'no hit through holes': a.hits === e.hits,
        '6 shots by step 601 (hand-worked)': a.shots === e.shots,
        'Disabled in step 601 (hand-worked)': !!a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.ended.step === e.step,
        '3 misses, the first three shots (hand-worked)': a.misses.length === e.misses && a.misses.every((m, i) => m.id === `shot-${i + 1}`),
        'each culled in its time-of-flight window': a.misses.every((m) => m.t >= m.t0 + (e.cull + m.d0 - 1) / m.v - 1e-9 && m.t <= m.t0 + (e.cull + m.d0 + 1) / m.v + dt + 1e-9),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (r.case.line === 'oblique') return { expected: `path ${e.path.join(' > ')}; chord ${e.chord}; r ${e.r.join(', ')}; ${e.hits} hits, ${e.misses} misses, destroyed step ${e.step} (${e.detonation})`, actual: `${a.hit ? `path ${a.hit.path.join(' > ')}; passed ${a.hit.passed} stop ${a.hit.stoppedIn}; r ${a.hit.r.slice(0, 2).map((x) => x.toFixed(2)).join(', ')}` : 'no hit'}; own chord ${a.own.toPrecision(12)}; ${a.hits} hits, ${a.misses} misses; ${a.ended ? `${a.ended.kind} step ${a.ended.step}` : 'no end'}${a.detonation ? `, detonation by ${a.detonation}` : ''}` };
    return { expected: `${e.shots} shots, ${e.hits} hits, ${e.misses} misses, Disabled step ${e.step}`, actual: `${a.shots} shots, ${a.hits} hits, misses ${a.misses.map((m) => `${m.id} at ${m.t.toFixed(4)} s (t0 ${m.t0}, d0 ${m.d0.toFixed(2)} m)`).join(', ')}; ${a.ended ? `${a.ended.kind} step ${a.ended.step}` : 'no end'}` };
  },
};
