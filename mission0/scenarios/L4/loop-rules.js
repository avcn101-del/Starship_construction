import { buildShip, createBattle, tick, lineHit, battleMomentum, battleEnergy, battleAngular, battleTree } from '../../../js/battle.js';
import { damageCell } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H10 of the L5 plan (DESIGN.md 13n.4, §17 item 35, #267, #301): the loop rules no L4b scenario exercised, with both
// ships moving. (holes) a path of holes only is not a hit; (chord) the chord of an oblique line; (ids) one id space for
// shot events: each world's own cause of a launch (side:room:shot-k) names exactly one battle id (shot-n, missile-n),
// the hits and the other ship's cascade roots use those ids, and the battle's shot-n ids are not renamed; (books) the
// two-ship momentum, energy and angular-momentum books close with both ships moving, dodging and firing, shields
// down; (field) with both shields up the linear and energy books still close, and the angular book's residual moves
// only in steps where a charged field takes momentum from a round (a field's impulse acts at its generator, not on the
// round's line: the stand-in §17 item 35 keeps open, measured here, not closed: a question of the pull request).
//
// Setup (T1). (holes) R1 by buildShip at rest, grid corner at the origin, heading 0; the line from (12.5, -50) along
// +y (the column x = 2, the engine's cells (2, 2) and (2, 3)) tested with lineHit; then both cells destroyed
// (damageCell, loss 1) and the line tested again. (chord) the same R1; the ray from (2, 2) along (0.6, 0.8), which crosses
// no occupied cell until it enters the engine's cell (1, 2) at (8, 10) through its -y edge. (ids, books, field) createBattle with knowledge on:
// R1d-A against R1d-A on bearing -y at 900 m, both with a helm: facing broadside, dodging on, firing in range, throttle 1,
// auto-scan on, the shields off (heat discipline threshold 0, response shield) or on (field); 20 s.
// Hand-worked: (holes) before: a hit at the engine's cell (2, 2); after: no hit (the path holds only holes). (chord) in
// (1, 2) = [5, 10) x [10, 15) the ray from (8, 10) leaves x = 10 at s = 2 / 0.6 = 3.333 m before y = 15 at s = 5 / 0.8
// = 6.25 m: chord 3.333 / 5 = 0.6667 (2 / 3) of the edge; the next cell the engine's (2, 2) from (10, 12.667). (books) P - J, E and
// L - H fixed: residuals against 1e-9 x the largest gross (+ 1e-12 for L); (field) the same for P and E; L - H's
// residual changes from one step to the next only in steps with a hit whose speed the field reduced (afterShield <
// speed), at least one such step.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const DUEL = (shield) => ({ range: 'hold', position: 'flank', facing: 'broadside', dodging: 'on', openFire: 'inRange', autoScan: 'on', throttle: 1, heat: shield ? { threshold: 1, response: 'weapons' } : { threshold: 0, response: 'shield' } });

export default {
  id: 'L4.loop.rules',
  level: 'L4',
  laws: ['a path of holes only is not a hit (#267 N4)', 'a cell\'s chord is the length the line runs in it over the edge (#239, #267 N5)', 'one id space for shot events (§17 item 35)', 'the two-ship books close with both ships moving (13n.1 (b), #220)'],
  dependsOn: ['L4.route.escape'],
  setup: 'T1: R1 at rest (holes, chord: lineHit); createBattle, knowledge on, R1d-A against R1d-A at 900 m, both with helms broadside and dodging, firing, shields off or on, 20 s (13n.4 H10)',
  measure: 'the hits before and after the holes; the first entry\'s chord; the id table; the three books\' residuals each step',
  tolerance: 'chord 1e-12; books 1e-9 x gross (+ 1e-12 angular)',
  criterion: '(holes) a hit at engine:2 before, none after; (chord) 2/3 at the engine\'s cell (1, 2), then its cell (2, 2); (ids) every launch event\'s side:cause maps to one battle id, the map is one-to-one, every hit and every shot root of the other ship\'s tree is in it, ids are shot-n / missile-n; (books) P, E and L close every step; (field) P and E close, L\'s residual moves only in steps where a field slowed a round (at least one)',
  tunable: ['shield.kineticStop', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return [{ name: 'holes' }, { name: 'chord' }, { name: 'ids' }, { name: 'books' }, { name: 'field' }];
  },
  expected(ctx, c) {
    return { holes: { before: 'engine', after: null }, chord: { chord: 2 / 3, room: 'engine', next: 'engine' }, ids: { ok: true }, books: { close: true }, field: { close: true } }[c.name];
  },
  run(ctx, c) {
    if (c.name === 'holes' || c.name === 'chord') {
      const { world, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0] });
      const side = { world, room };
      if (c.name === 'chord') {
        const h = lineHit(side, [2, 2], null, [0.6, 0.8]);
        return { room: h.path[0].room.id, cell: h.path[0].cell, chord: h.path[0].chord, next: h.path[1].room.id, nextCell: h.path[1].cell };
      }
      const before = lineHit(side, [12.5, -50], null, [0, 1]);
      const engine = room('engine'), cells = world.layout.rooms.get('engine').cells, k = (x, y) => cells.findIndex((q) => q[0] === x && q[1] === y);
      damageCell(world, engine, k(2, 2), 1, 'test', 'kinetic');
      damageCell(world, engine, k(2, 3), 1, 'test', 'kinetic');
      const after = lineHit(side, [12.5, -50], null, [0, 1]);
      return { before: before ? before.path[0].room.id : null, beforePath: before ? before.path.map((x) => `${x.room.id}:${x.cell}`) : null, after: after ? after.path[0].room.id : null };
    }
    const shield = c.name === 'field';
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: SENSOR_SHIPS['R1d-A'], bearing: '-y', knowledge: true, orders: { A: DUEL(shield), T: DUEL(shield) } });
    const P0 = battleMomentum(b), E0 = battleEnergy(b), L0 = battleAngular(b);
    let worst = { P: 0, E: 0, L: 0 }, lastL = 0, offField = 0, fieldSteps = 0, hits = 0;
    while (b.step < 1200 && !b.ended) {
      const nh = b.hits.length;
      tick(b);
      const P = battleMomentum(b), E = battleEnergy(b), L = battleAngular(b);
      const rP = Math.hypot(P.P[0] - P.J[0] - (P0.P[0] - P0.J[0]), P.P[1] - P.J[1] - (P0.P[1] - P0.J[1])) / Math.max(P.gross, P0.gross);
      const rE = Math.abs(E.total - E0.total) / Math.max(E.gross, E0.gross);
      const rL = Math.abs(L.total - L0.total), gL = Math.max(L.gross, L0.gross);
      worst = { P: Math.max(worst.P, rP), E: Math.max(worst.E, rE), L: Math.max(worst.L, (rL - 1e-12) / gL) };
      const slowed = b.hits.slice(nh).some((h) => h.afterShield < h.speed);
      if (slowed) fieldSteps++;
      else if (Math.abs((L.total - L0.total) - lastL) > 1e-9 * gL + 1e-12) offField++;
      lastL = L.total - L0.total;
      hits = b.hits.length;
    }
    if (c.name === 'ids') {
      const pairs = [...b.ids.entries()], values = new Set(pairs.map(([, v]) => v));
      const launches = b.sides.flatMap((s) => s.world.log.events.filter((e) => e.type === 'shot' || e.type === 'slug' || e.type === 'missile-launched').map((e) => `${s.name}:${e.cause}`));
      const roots = b.sides.flatMap((s) => battleTree(b).find((t) => t.side === s.name).tree.roots.map((r) => r.root).filter((r) => /^(shot|missile)-\d+$/.test(r)));
      return {
        launches: launches.length, mapped: launches.every((k) => b.ids.has(k)), oneToOne: values.size === pairs.length, named: [...values].every((v) => /^(shot|missile)-\d+$/.test(v)),
        hitsIn: b.hits.every((h) => values.has(h.id)), rootsIn: roots.every((r) => values.has(r)), roots: roots.length, sides: new Set(pairs.map(([k]) => k[0])).size,
      };
    }
    return { worst, offField, fieldSteps, hits, steps: b.step };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'holes') checks = { 'a hit at the engine before': a.before === 'engine' && a.beforePath[0] === 'engine:' + a.beforePath[0].split(':')[1], 'no hit through holes only': a.after === null };
    else if (c.name === 'chord') checks = { 'the engine first, chord 2/3 (1e-12)': a.room === 'engine' && Math.abs(a.chord - e.chord) <= 1e-12, 'then the engine\'s next cell': a.next === 'engine' && a.nextCell !== a.cell };
    else if (c.name === 'ids') checks = { 'every launch maps to a battle id': a.mapped && a.launches > 0, 'one-to-one': a.oneToOne, 'shot-n / missile-n': a.named, 'every hit in the map': a.hitsIn, 'every shot root in the map': a.rootsIn && a.roots > 0, 'both sides fired': a.sides === 2 };
    else if (c.name === 'books') checks = { 'momentum closes (1e-9 x gross)': a.worst.P <= 1e-9, 'energy closes (1e-9 x gross)': a.worst.E <= 1e-9, 'angular momentum closes (1e-9 x gross + 1e-12)': a.worst.L <= 1e-9, 'rounds hit': a.hits > 0 };
    else checks = { 'momentum closes (1e-9 x gross)': a.worst.P <= 1e-9, 'energy closes (1e-9 x gross)': a.worst.E <= 1e-9, 'the angular residual moves only with a field\'s hit': a.offField === 0 && a.fieldSteps > 0 };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, n = r.case.name;
    if (n === 'holes') return { expected: 'engine, then no hit', actual: `${a.before} (${a.beforePath.join('>')}), then ${a.after}` };
    if (n === 'chord') return { expected: 'engine chord 0.666667', actual: `${a.room}:${a.cell} chord ${a.chord.toFixed(12)}, then ${a.next}:${a.nextCell}` };
    if (n === 'ids') return { expected: 'one id space', actual: `${a.launches} launches, mapped ${a.mapped}, one-to-one ${a.oneToOne}, hits ${a.hitsIn}, ${a.roots} roots ${a.rootsIn}` };
    return { expected: n === 'books' ? 'P, E, L close' : 'P, E close; L moves only with a field\'s hit', actual: `residuals P ${a.worst.P.toExponential(2)}, E ${a.worst.E.toExponential(2)}, L ${a.worst.L.toExponential(2)}; ${a.hits} hits; L moved off a field's step ${a.offField} times; field steps ${a.fieldSteps}` };
  },
};
