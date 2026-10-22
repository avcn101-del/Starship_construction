import { createWorld, addRoom, addFitting, loadMagazine, magazineContents, fireRound, pathAlong, plateEntry, damageCell, step, survivingCells } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { depositHeat } from '../../../js/heat.js';
import { roundGeometry } from '../../../js/projectile.js';
import { TARGETS } from '../../targets.js';

// K2 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #273 (c), #278): a magazine with rounds detonates when a round enters
// one of its standing cells at magazine.detonationSpeed or more (the round rule's momentum on entering that cell over
// the round's mass, relative to the hull, whether it stops there or passes); a destroyed cell alone no longer
// detonates it; a magazine whose last cell is destroyed loses its rounds as debris, unexploded; cook-off at
// thermal.magazineCritical is unchanged.
//
// (shot cases) A cluster at T1: a screen room at [0, 0] (2 x 2) and an M magazine full of HE (150 rounds) at [2, 0]
// sharing its -x wall; a round along the row y = 0 (pathAlong over the grid cells (1, 0), (2, 0), (3, 0)) by the
// kernel's fireRound off a ship: through one hold cell (an M round), through one crewed cell (a bridge; an M and an L
// round), and through a hold cell and a 0.2 m plate on the magazine's -x wall (an M round). The threshold is swept
// 200 / 300 / 400 / 500 / 600 m/s (its range, run-time overrides).
// Hand-worked from the round rule (13i.1; c = 1545.364 m/s, rho_steel 7850, L = 4 D): an M round, m 6 kg, v 800 m/s,
// D = (4 m / (pi rho 4))^(1/3) = 0.06243 m, A0 = 3.0609e-3 m^2, S = c rho 4 D = 3.029e6 kg/(m s), p0 = 4800 N s. A hold
// cell (sigma 120 kg/m^2) resists r = c 120 = 185 443.7 kg/(m s) < s0 = p0 / A0 = 1.568e6: the round takes r A0 =
// 567.62 N s and enters the magazine with 4232.38 N s, 705.4 m/s. A crewed cell (sigma 592) resists 914 855.6, takes
// 2800.25 N s: 1999.75 N s, 333.3 m/s. An L round (m 6 x 1.5^3 = 20.25 kg, A = 2.25 A0 = 6.8870e-3 m^2, p0 16 200 N s)
// takes 914 855.6 x 6.8870e-3 = 6300.6 N s from a crewed cell: 9899.4 N s, 488.9 m/s. The plate (sigma 0.2 x 7850 =
// 1570, r 2.426e6 > s after the hold, 1.383e6) stops the round: it never enters the magazine. So at 200 / 300 / 400 /
// 500 / 600 m/s the hold shot detonates at every threshold, the crewed M shot at 200 and 300 only, the L shot up to
// 400, the plated shot at none. The entry speed is also re-stated by the scenario's own loop of the round rule (1e-12).
// (destroyed cell) The cluster's magazine, one cell destroyed by damageCell (loss 1): no explosion, 150 rounds left.
// (last cell) R1 at T1 (a ship): its magazine's four cells destroyed one by one by damageCell: no explosion; the rounds
// leave as debris, 150 x 6 kg = 900 kg (hand-worked) in the debris pieces of the magazine's contents (1e-12).
// (cook-off) A magazine alone in a cluster, 150 HE, heated by depositHeat to 1 MJ above C (T_crit - T_rest) =
// 4 x 6e5 J/K x (450 - 290) K = 3.84e8 J and stepped once: it cooks off, cause 'heat', energy 150 x (6 + 2) MJ =
// 1.2e9 J (hand-worked).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const SHOTS = { hold: { screen: 'hold', size: 'M', plate: false, speed: 705.4 }, crewed: { screen: 'bridge', size: 'M', plate: false, speed: 333.3 }, crewedL: { screen: 'bridge', size: 'L', plate: false, speed: 488.9 }, plate: { screen: 'hold', size: 'M', plate: true, speed: null } };
const THRESHOLDS = [200, 300, 400, 500, 600];
const withSpeed = (params, vd) => { const p = structuredClone(params); p.magazine.detonationSpeed.value = vd; return p; };

export default {
  id: 'L2.magazine.detonation',
  level: 'L2',
  laws: ['a magazine detonates when a round enters one of its cells at magazine.detonationSpeed or more (#273 (c), 13n.1 (b))', 'a destroyed magazine cell alone does not detonate it; its last cell lost, its rounds leave as debris (13n.1 (b))', 'cook-off at thermal.magazineCritical (#91)'],
  dependsOn: [],
  setup: 'T1 clusters: a hold or a bridge at [0, 0] and an M magazine of 150 HE at [2, 0], a round along y = 0 through the screen (M, or L through the bridge; M through the hold and a 0.2 m plate on the magazine\'s -x wall), magazine.detonationSpeed 200 / 300 / 400 / 500 / 600 m/s; the cluster\'s magazine with one cell destroyed; R1\'s magazine with its four cells destroyed one by one; a magazine alone heated past critical (13n.4 K2)',
  measure: 'whether the magazine explodes and the event that set it off (its detonation event and entry speed); the rounds left; the debris of the magazine\'s contents; the cook-off\'s cause and energy',
  tolerance: 'detonation exact (yes or no); entry speed against the re-statement 1e-12, against the hand-worked literal 0.1 m/s; the debris mass 1e-12; the cook-off energy 1e-12',
  criterion: 'shot cases: the magazine detonates iff the entry speed >= the threshold (hand-worked entry speeds 705.4 / 333.3 / 488.9 m/s and none for the plate, so hold: all five; crewed M: 200, 300; crewed L: 200, 300, 400; plate: none), by a detonation event of cause the round whose speed is the entry speed, the explosion its child with the magazine\'s 1.2e9 J; destroyed cell: no explosion and 150 rounds aboard; last cell: no explosion, no rounds left, 900 kg of the magazine\'s contents in the debris; cook-off: one explosion, cause heat, 1.2e9 J',
  tunable: ['magazine.detonationSpeed', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'structure.cellMass', 'cellMass.crewed', 'armour.plateThickness', 'kinetic.chargeEnergy', 'he.blastEnergy', 'thermal.magazineCritical', 'thermal.coupledMagazine'],
  locked: { date: '2026-10-22', hash: 'b4fc16a7' },
  cases() {
    const out = [];
    for (const shot of Object.keys(SHOTS)) for (const vd of THRESHOLDS) out.push({ kind: 'shot', shot, vd });
    return [...out, { kind: 'destroyed-cell' }, { kind: 'last-cell' }, { kind: 'cook-off' }];
  },
  expected(ctx, c) {
    if (c.kind === 'destroyed-cell') return { explodes: false, rounds: 150 };
    if (c.kind === 'last-cell') return { explodes: false, rounds: 0, debris: 900 };
    if (c.kind === 'cook-off') return { explodes: true, cause: 'heat', energy: 1.2e9 };
    // re-statement of the round rule (13i.1) for the entry speed into the magazine
    const s = SHOTS[c.shot], p = ctx.params, fx = ctx.fixed, k = fx.sizeLinear.value[s.size];
    const m = p.kinetic.roundMass.value * k ** 3, v = p.kinetic.muzzleVelocity.value, cR = p.matter.kineticResistance.value;
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4, S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D;
    const sig = [s.screen === 'hold' ? p.structure.cellMass.value / 25 : p.cellMass.crewed.value / 25, ...(s.plate ? [p.armour.plateThickness.value * fx.steelDensity.value] : [])];
    let pm = m * v, f = 0, A = A0, enters = true;
    for (const sg of sig) {
      const r = cR * sg;
      if (pm / A > r && f + r / S < 1) { pm -= r * A; f += r / S; A = A0 / (1 - f); } else { enters = false; break; }
    }
    const speed = enters ? pm / m : null;
    return { speed, hand: s.speed, explodes: speed !== null && speed >= c.vd, energy: 1.2e9 };
  },
  run(ctx, c) {
    const p = c.kind === 'shot' ? withSpeed(ctx.params, c.vd) : ctx.params, fx = ctx.fixed;
    if (c.kind === 'last-cell') {
      const { world, room } = buildShip(p, 'T1', TARGETS.R1);
      const mag = room('magazine');
      for (let i = 0; i < 4; i++) damageCell(world, mag, i, 1, `test-${i + 1}`, 'kinetic');
      const contents = magazineContents(world, mag);
      return { explosions: world.log.events.filter((e) => e.type === 'explosion').length, rounds: contents.ap + contents.he, debris: world.ship.debris.filter((d) => d.from === 'magazine:contents').reduce((x, d) => x + d.m, 0), standing: survivingCells(mag) };
    }
    const world = createWorld({ params: p, edge: 5, dt: ctx.dt, grid: [8, 4] });
    if (c.kind === 'cook-off') {
      const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
      loadMagazine(world, mag, { heMass: 900 });
      depositHeat(mag.heat, 4 * 6e5 * (450 - 290) + 1e6);
      step(world);
      const ev = world.log.events.filter((e) => e.type === 'explosion');
      return { explosions: ev.length, cause: ev[0] ? ev[0].cause : null, energy: ev[0] ? ev[0].energy : null, cookOff: world.log.events.some((e) => e.type === 'cook-off') };
    }
    const s = c.kind === 'shot' ? SHOTS[c.shot] : SHOTS.hold;
    addRoom(world, s.screen, { id: 'screen', cell: [0, 0] });
    const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
    loadMagazine(world, mag, { heMass: 900 });
    if (s.plate) addFitting(world, 'armour', 'magazine', [2, 0], [-1, 0]);
    if (c.kind === 'destroyed-cell') {
      damageCell(world, mag, 0, 1, 'test-1', 'kinetic');
      const contents = magazineContents(world, mag);
      return { explosions: world.log.events.filter((e) => e.type === 'explosion').length, rounds: contents.ap + contents.he };
    }
    const k = fx.sizeLinear.value[s.size], m = p.kinetic.roundMass.value * k ** 3, { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
    const path = pathAlong(world, [[1, 0], [2, 0], [3, 0]]);
    const res = fireRound(world, { mass: m, velocity: p.kinetic.muzzleVelocity.value, area: A }, path, 'round-1');
    const magAt = path.findIndex((x) => !x.plate && x.room === mag);
    const det = world.log.events.find((e) => e.type === 'detonation'), boom = world.log.events.find((e) => e.type === 'explosion');
    return {
      plated: path.some((x) => x.plate) && !!plateEntry(world, [1, 0], [2, 0]),
      speed: magAt >= 0 && magAt < res.entry.length ? res.entry[magAt] / m : null,
      explosions: world.log.events.filter((e) => e.type === 'explosion').length,
      detonation: det ? { cause: det.cause, speed: det.speed, room: det.room } : null,
      boom: boom ? { room: boom.room, energy: boom.energy, childOf: det ? boom.parent === det.id : false } : null,
    };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    let checks;
    if (c.kind === 'destroyed-cell') checks = { 'no explosion': a.explosions === 0, '150 rounds aboard': a.rounds === e.rounds };
    else if (c.kind === 'last-cell') checks = { 'no explosion': a.explosions === 0, 'no rounds left': a.rounds === 0 && a.standing === 0, '900 kg of contents in the debris (1e-12)': close(e.debris, a.debris, 1e-12) };
    else if (c.kind === 'cook-off') checks = { 'one explosion by cook-off': a.explosions === 1 && a.cookOff, 'cause heat': a.cause === e.cause, '1.2e9 J (1e-12)': close(e.energy, a.energy, 1e-12) };
    else {
      checks = {
        'detonates iff the entry speed >= the threshold': (a.explosions === 1) === e.explodes && (a.detonation !== null) === e.explodes,
        'entry speed by the round rule (re-statement, 1e-12)': e.speed === null ? a.speed === null : close(e.speed, a.speed, 1e-12),
        'entry speed against the hand-worked literal (0.1 m/s)': e.hand === null ? a.speed === null : Math.abs(a.speed - e.hand) <= 0.1,
      };
      if (SHOTS[c.shot].plate) checks['the plate on the path'] = a.plated;
      if (e.explodes) checks['the detonation event: cause the round, its entry speed, the explosion its child with 1.2e9 J'] = !!a.detonation && a.detonation.cause === 'round-1' && a.detonation.room === 'magazine' && close(e.speed, a.detonation.speed, 1e-12) && !!a.boom && a.boom.childOf && close(e.energy, a.boom.energy, 1e-12);
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const e = r.expected, a = r.actual, c = r.case;
    if (c.kind !== 'shot') return { expected: JSON.stringify(e), actual: JSON.stringify(a) };
    return { expected: `entry ${e.speed === null ? 'none' : `${e.speed.toFixed(4)} m/s`} vs ${c.vd}: ${e.explodes ? 'detonates' : 'no detonation'}`, actual: `entry ${a.speed === null ? 'none' : `${a.speed.toFixed(4)} m/s`}; ${a.explosions} explosion(s)${a.detonation ? `, detonation by ${a.detonation.cause} at ${a.detonation.speed.toFixed(4)} m/s` : ''}` };
  },
};
