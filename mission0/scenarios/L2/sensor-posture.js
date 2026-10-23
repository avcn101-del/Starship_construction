import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint } from '../../../js/body.js';
import { SENSOR_SHIPS } from '../../targets.js';

// S9 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #38, #103, #289): the emission posture. A ship running cold (engine
// off, shield off, no scan) shows only its radiator panels; a ship at full (engine at throttle 1, shield on, scanning)
// shows its panels, its exhaust (jet power), its antenna while it scans and its shield in the steps the shield absorbs
// (a shield is an EM source only while it absorbs, #103).
//
// Setup (T1): createBattle with `knowledge: true`, battle seed 1, 360 steps (6 s). The full ship is the attacker
// R1d-A (R1d with an antenna on its hold's -y edge of cell (8, 0)) from -y at 900 m: its engine at throttle 1 (setup),
// its shield on, its antenna scanning the cold ship's zone 1 from t = 0. The cold ship is the target R1-A (R1 with the
// same antenna, which only listens): engine off, shield off (buildShip's), its turret firing (targetFire) along the
// line from its turret to the full ship's shield generator cell (3, 1) (grid (17.5, 7.5) m) as the ships stand at
// undock, so its rounds enter the full ship's hull inside its field (kernel-read aim, from a first build of the same
// battle).
// Expected: the cold ship's model resolves the full ship's panels, its exhaust in every step from the first (75 GW at
// throttle 1, seen to 4.9e6 m), its antenna in every step the antenna scans (100 kW, seen to 5642 m) and none after its
// zone resolves, and its shield exactly in the steps the full ship's shield absorbs (s.em plus the rounds' payment,
// kernel-read and labelled: a consistency check), at least one; the full ship's model resolves only panels.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const STEPS = 360;

function battleWith(params, aim) {
  return createBattle({
    params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: SENSOR_SHIPS['R1-A'], bearing: '-y', knowledge: true,
    scans: [{ side: 'A', antenna: 0, zone: 1, at: 0 }], shield: { attacker: true }, targetFire: aim ? { aim } : null,
    setup: { attacker: (w, room) => { room('engine').engine.throttle = 1; } },
  });
}

export default {
  id: 'L2.sensor.posture',
  level: 'L2',
  laws: ['running cold (engine off, shield off, no scan) leaves only the radiator panels to be seen (#38, 13n.1 (a))', 'an exhaust is an IR source of its jet power; a scanning antenna and an absorbing shield are EM sources (#24, #103, 13n.1 (a), #289)'],
  dependsOn: ['L1.sensor.passive', 'L2.sensor.shield'],
  setup: 'T1, createBattle with knowledge on: R1d-A at full (engine throttle 1, shield on, scanning R1-A\'s zone 1 from t = 0) from -y at 900 m against R1-A running cold, whose turret fires at the full ship\'s shield generator cell; 360 steps (13n.4 S9)',
  measure: 'each step: the kinds of source each model holds resolved now; the full ship\'s antenna scanning; the full ship\'s shield absorbing (s.em + roundEm, kernel-read)',
  tolerance: 'exact (sets of steps and kinds)',
  criterion: 'the cold ship\'s model: the full ship\'s panels and exhaust resolved in every step 1-360; its antenna in exactly the steps the antenna scans (from step 1 to its zone\'s resolution, then none); its shield in exactly the steps it absorbs (kernel-read), at least one; the full ship\'s model: panels only (no exhaust, antenna or shield) in every step',
  tunable: ['sensor.area', 'sensor.sensitivity', 'sensor.scanPower', 'engine.exhaustVelocity'],
  locked: { date: '2026-10-23', hash: '270543b8' },
  cases() {
    return [{ steps: STEPS }];
  },
  expected() {
    return { coldKinds: ['panel'] };
  },
  run(ctx) {
    // The aim: from the cold ship's turret to the full ship's shield cell (3, 1), as they stand at undock (kernel-read).
    const probe = battleWith(ctx.params, null);
    const t = probe.target.world.rooms.find((r) => r.type === 'turret'), S = worldPoint(mainBody(probe.target), t.position);
    const P = worldPoint(mainBody(probe.attacker), [17.5, 7.5]), d = [P[0] - S[0], P[1] - S[1]], L = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
    const battle = battleWith(ctx.params, [d[0] / L, d[1] / L]);
    const A = battle.attacker, T = battle.target, g = A.world.rooms.find((r) => r.type === 'shieldGenerator'), ant = A.world.fittings.find((f) => f.type === 'antenna');
    const rows = [];
    while (!battle.ended && battle.step < STEPS) {
      const scanning = !!ant.scan; // the antenna has a zone in this step if it had one before the tick, or (step 1) by the command at t = 0, applied inside the first tick
      tick(battle);
      const kinds = (m) => [...new Set([...m.sources.values()].filter((s) => s.now).map((s) => s.kind))].sort();
      rows.push({ step: battle.step, cold: kinds(T.model), full: kinds(A.model), scanning: scanning || battle.step === 1, absorbing: g.shield.em + g.shield.roundEm > 0, hits: battle.hits.length });
    }
    return {
      steps: rows.length, ended: battle.ended ? battle.ended.kind : null,
      exhaustAll: rows.every((r) => r.cold.includes('exhaust')), panelsAll: rows.every((r) => r.cold.includes('panel')),
      antennaSteps: rows.filter((r) => r.cold.includes('antenna')).map((r) => r.step), scanSteps: rows.filter((r) => r.scanning).map((r) => r.step),
      shieldSteps: rows.filter((r) => r.cold.includes('shield')).map((r) => r.step), absorbSteps: rows.filter((r) => r.absorbing).map((r) => r.step),
      fullKinds: [...new Set(rows.flatMap((r) => r.full))].sort(), fullPanelsAll: rows.every((r) => r.full.includes('panel')),
      zoneResolved: A.model.resolved.get(1) ?? null, hits: battle.hits.filter((h) => h.side === 'A').length,
    };
  },
  compare(e, a) {
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const checks = {
      'ran 360 steps': a.steps === STEPS,
      'the cold model: the full ship\'s panels and exhaust in every step': a.panelsAll && a.exhaustAll,
      'its antenna in exactly the steps it scans, from step 1 to its zone\'s resolution': a.zoneResolved !== null && a.antennaSteps[0] === 1 && a.antennaSteps[a.antennaSteps.length - 1] === a.zoneResolved && a.antennaSteps.length === a.zoneResolved && same(a.antennaSteps, a.scanSteps.filter((s) => s <= a.zoneResolved)),
      'its shield in exactly the steps the shield absorbs (kernel-read), at least one': a.absorbSteps.length > 0 && same(a.shieldSteps, a.absorbSteps),
      'the full model: panels only, every step': same(a.fullKinds, e.coldKinds) && a.fullPanelsAll,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'cold sees panels + exhaust always, antenna while scanning, shield while absorbing; full sees panels only', actual: `antenna steps ${a.antennaSteps[0]}-${a.antennaSteps[a.antennaSteps.length - 1]} (${a.antennaSteps.length}), zone after ${a.zoneResolved}; shield steps [${a.shieldSteps.join(', ')}], absorbing [${a.absorbSteps.join(', ')}]; hits on the full ship ${a.hits}; full sees ${a.fullKinds.join(', ')}` };
  },
};
