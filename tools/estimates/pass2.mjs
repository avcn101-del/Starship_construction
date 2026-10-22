// tools/estimates/pass2.mjs — the lead designer's estimates for physics pass 2
// (DESIGN.md 13k, #240, #241 (1)). Reads js/ only; changes nothing; never a
// canonical run. Every number quoted in 13k comes from here:
//   node tools/estimates/pass2.mjs
// Since the pass is built (m0/pass2), data.js no longer holds the constants the
// plan replaced: BEFORE keeps their values at 8392126 ("today" below), and the
// one-law constants are read from data.js. Section 8 prints R1 from the kernel
// (the literals of L3.r1.pinned, 13k.4 S20).
import { PARAMS as P, FIXED as F, TIERS, scaled } from '../../js/data.js';
import { csdaRange } from '../../js/damage.js';
import { stopRound } from '../../js/field.js';
import { roundGeometry } from '../../js/projectile.js';

const MEV = 1.602176634e-13, cp = 450; // J/(kg K), steel
// The plan's "today" (data.js at 8392126): the constants pass 2 removed or changed.
const BEFORE = { burnEnergy: 3e7, armourBlast: 1e6, roomBlast: 5e5, holdBlastFactor: 4, heatCapacityPerCell: 6e5, repairRate: 0.02, bufferSeconds: 1, cellMass: { engine: 6.1e3, beamBay: 5.5e3, reactor: 1.25e5 } };
const out = (...a) => console.log(...a);
const bethe = { protonRest: F.protonRestEnergy.value, electronRest: F.electronRestEnergy.value, K: F.betheK.value, ZA: F.ironZOverA.value, I: F.ironMeanExcitation.value, lambda: F.ironInteractionLength.value };

// 1. One law: J/kg of burn and blast today, and the proposed per-kg constants calibrated on L0's armour cell.
const masses = { armour: P.armour.cellMass.value, structure: P.structure.cellMass.value, ...Object.fromEntries(Object.entries(P.cellMass).map(([k, p]) => [k, p.value])), engine: P.structure.cellMass.value + P.engine.machineryMass.value, beamBay: P.structure.cellMass.value + P.beambay.machineryMass.value };
const burnPerKg = P.matter.burnEnergyPerKg.value, blastPerKg = P.matter.blastPerKg.value;
out('--- 1. burn and blast per kg today, and under one law (q_burn, q_blast calibrated on armour)');
out('q_burn J/kg', burnPerKg, ' q_blast J/kg', blastPerKg);
for (const [k, m] of Object.entries(masses)) {
  const blastNow = k === 'armour' ? BEFORE.armourBlast : BEFORE.roomBlast * (k === 'structure' ? BEFORE.holdBlastFactor : 1);
  out(`  ${k.padEnd(16)} mass ${String(m).padStart(7)} kg | today burn ${(BEFORE.burnEnergy / m).toFixed(0).padStart(6)} J/kg, cell ${(BEFORE.burnEnergy / 1e6).toFixed(1)} MJ -> one law ${(burnPerKg * m / 1e6).toFixed(2)} MJ (${(burnPerKg * m / 5e6).toFixed(1)} s of a 5 MW beam) | blast today ${(blastNow / 1e6).toFixed(2)} MJ -> ${(blastPerKg * m / 1e6).toFixed(2)} MJ`);
}

// 2. Heat capacity: today 0.6 MJ/K per cell for every type; proposed thermally coupled C per cell (estimates, 13k.2) and the races.
out('--- 2. heat capacity per cell and the one-room races (t = C dT / P)');
const C0 = BEFORE.heatCapacityPerCell;
const T = P.thermal, C = { reactor: T.coupledReactor.value, beamBay: T.coupledBeamBay.value, engine: T.coupledEngine.value, shieldGenerator: T.coupledShieldGenerator.value, crewed: T.coupledCrewed.value, magazine: T.coupledMagazine.value, hold: T.coupledHold.value, heatSink: T.coupledHeatSink.value, armour: T.coupledArmour.value };
const dTplant = P.thermal.plantOverheated.value - F.restTemperature.value, dThot = P.thermal.plantHot.value - F.restTemperature.value;
const races = [
  ['reactor alone, full power -> overheated', 'reactor', 4, P.reactor.power.value * P.reactor.heatPerPower.value, dTplant],
  ['beam bay firing -> hot', 'beamBay', 4, P.beam.power.value / P.beambay.efficiency.value - P.beam.power.value, dThot],
  ['engine full throttle -> hot', 'engine', 6, P.engine.powerDraw.value * P.engine.heatFraction.value, dThot],
  ['shield generator absorbing 6 MW + draw -> hot', 'shieldGenerator', 4, 6e6 + P.shield.powerDraw.value, dThot],
];
for (const [name, type, cells, Pw, dT] of races) out(`  ${name.padEnd(48)} P ${(Pw / 1e6).toFixed(1)} MW: today ${(cells * C0 * dT / Pw).toFixed(0)} s -> coupled C ${(C[type] / 1e6).toFixed(2)} MJ/K/cell: ${(cells * C[type] * dT / Pw).toFixed(0)} s (x${(C[type] / C0).toFixed(1)})`);
out('  (radiators and conduction scale every time constant by the same factor: a ship race of 9 min scales like its slowest room)');

// 3. Repair per mass: today 1/3 of a cell in 1/(3 x rate) s for any cell; proposed a mass rate calibrated on armour.
out('--- 3. repair');
const rate = BEFORE.repairRate, kgPerS = P.repair.massRate.value;
out(`  today: 1/3 of any cell in ${(1 / (3 * rate)).toFixed(1)} s; proposed repair.massRate ${kgPerS} kg/s (= rate x armour cell):`);
for (const [k, m] of Object.entries(masses)) out(`    ${k.padEnd(16)} 1/3 of a cell in ${(m / 3 / kgPerS).toFixed(1)} s`);

// 4. Books: impulse of an M hit, shield-removed momentum, kinetic energy lost.
out('--- 4. books');
const edge = TIERS.T1.edge, mM = scaled(P.kinetic.roundMass, edge) * F.sizeLinear.value.M ** 3, v = P.kinetic.muzzleVelocity.value, { A } = roundGeometry(mM, F.steelDensity.value, F.roundLengthToDiameter.value);
out(`  M round: p ${mM * v} N s, E ${(0.5 * mM * v * v / 1e6).toFixed(2)} MJ; on R1 (850 t) 5.6 mm/s per hit; recoil already 0.050 deg/s per shot (#236)`);
const r = stopRound({ mass: mM, velocity: v, area: A }, P.shield.kineticStop.value, 1, Infinity);
out(`  shield at g=1: removes ${(mM * (v - r.velocity)).toFixed(0)} N s and ${(r.energy / 1e6).toFixed(2)} MJ per M round (to the generator's ship and its heat)`);

// 5. Tier: beam depth (#249: the kernel's beamEnergy solves the energy of T1's CSDA depth in armour cells) and the shield buffer.
out('--- 5. tier scaling');
const { createWorld: cw, addRoom: ar, beamEnergy } = await import('../../js/rooms.js');
const { beamDeposit } = await import('../../js/damage.js');
const { withOverrides: wo } = await import('../../js/data.js');
const sig = (t) => scaled(P.armour.cellMass, TIERS[t].edge) / TIERS[t].edge ** 2; // k=3 mass over edge^2
const depth1 = {};
for (const N of [2, 8]) {
  out(`  N = ${N} bay, 8 armour cells (beamEnergy at the tier; depth = csdaRange / sigma; F_1 and exit by beamDeposit, reported):`);
  for (const t of Object.keys(TIERS)) {
    const e = TIERS[t].edge, w = cw({ params: wo({}), edge: e, dt: F.simStep.value });
    const E = beamEnergy(w, ar(w, 'beamBay', { length: N })), depth = csdaRange(E, bethe) / sig(t), d = beamDeposit(E, new Array(8).fill(sig(t)), bethe);
    depth1[N] ??= depth;
    out(`    ${t} edge ${String(e).padStart(4)}: E ${(E / MEV).toFixed(3).padStart(9)} MeV (x${(E / (P.beam.gradient.value * N * edge)).toFixed(4)} the T1 energy), depth ${depth.toPrecision(13)} cells (${((depth / depth1[N] - 1)).toExponential(2)} from T1), F_1 ${d.fractions[0].toFixed(4)}, exit ${d.exit.toFixed(4)}`);
  }
}
for (const t of Object.keys(TIERS)) {
  const e = TIERS[t].edge;
  const m = scaled(P.kinetic.roundMass, e) * F.sizeLinear.value.M ** 3, { A: At } = roundGeometry(m, F.steelDensity.value, F.roundLengthToDiameter.value);
  const rt = stopRound({ mass: m, velocity: v, area: At }, scaled(P.shield.kineticStop, e), 1, Infinity);
  const bufNow = scaled(P.shield.budget, e) * BEFORE.bufferSeconds, bufK3 = scaled(P.shield.buffer, e);
  out(`  ${t}: M rounds per buffer today ${(bufNow / rt.energy).toFixed(2)}, buffer k=3 ${(bufK3 / rt.energy).toFixed(2)}`);
}

// 6. Machinery masses: engine (vacuum F-1), reactor low end, and the k split.
out('--- 6. masses');
const f1 = 7.77e6 / 8.4e3; out(`  F-1 vacuum thrust per kg ${f1.toFixed(0)} N/kg -> 15 MN engine ${(1.5e7 / f1 / 1e3).toFixed(2)} t over 6 cells = ${(1.5e7 / f1 / 6).toFixed(0)} kg machinery per cell (+ 3000 structure = ${(3000 + 1.5e7 / f1 / 6).toFixed(0)}; today ${masses.engine})`);
out(`  reactor compartment 1130 t in a 10 m x 12 m cylinder = ${(1130e3 / (Math.PI * 25 * 12)).toFixed(0)} kg/m^3 -> ${(1130e3 / (Math.PI * 25 * 12) * 125 / 1e3).toFixed(0)} t per 125 m^3 cell (today ${BEFORE.cellMass.reactor / 1e3} t; data.js now ${masses.reactor / 1e3} t)`);
for (const t of ['T1', 'T3', 'T6']) { const e = TIERS[t].edge; out(`  ${t}: engine cell today ${(BEFORE.cellMass.engine * (e / edge) ** 3 / 1e3).toFixed(0)} t (k=3) -> split ${(scaled(P.structure.cellMass, e) / 1e3).toFixed(0)} t structure (k=3) + ${(scaled(P.engine.machineryMass, e) / 1e3).toFixed(0)} t machinery (k=${P.engine.machineryMass.k}); thrust/machinery ${(scaled(P.engine.thrust, e) / (scaled(P.engine.machineryMass, e) * 6)).toFixed(0)} N/kg`); }

// 7. SCRAM restart, culling, disabled.
out('--- 7. new constants (proposed): reactor.restartTime 60 s (30-300, k=0); battle.cullDistance 3000 m (1000-10000, k=1); battle.disabledSeconds 10 s (3-30, k=0)');

// 8. R1 from the kernel on the data as it stands (the literals of L3.r1.pinned, 13k.4 S20): the readout's mass,
// acceleration and 90 degree turn, and the turn rate one M round fired broadside (+y) gives it.
const { createWorld, addRoom, addFitting, loadMagazine, loadTurret, readout, enableShip, step } = await import('../../js/rooms.js');
const { withOverrides } = await import('../../js/data.js');
const R1_ROOMS = [['engine', 'engine', [0, 2], 90], ['reactor', 'reactor', [3, 2]], ['bridge', 'bridge', [5, 2]], ['magazine', 'magazine', [7, 2]], ['beamBay', 'beamBay', [9, 2]], ['heatSink', 'heatSink', [3, 4]], ['quarters', 'quarters', [5, 4]], ['turret', 'turret', [8, 4]], ['shield', 'shieldGenerator', [3, 0]], ['hold', 'hold', [7, 0]]];
const R1_FITTINGS = [[1, 3, 'engine', 0, 1], [2, 3, 'engine', 0, 1], [1, 2, 'engine', 0, -1], [2, 2, 'engine', 0, -1], [3, 5, 'heatSink', 0, 1], [4, 5, 'heatSink', 0, 1], [3, 4, 'heatSink', -1, 0], [3, 5, 'heatSink', -1, 0], [3, 0, 'shield', 0, -1], [4, 0, 'shield', 0, -1], [3, 0, 'shield', -1, 0], [3, 1, 'shield', -1, 0], [4, 0, 'shield', 1, 0], [4, 1, 'shield', 1, 0], [10, 2, 'beamBay', 1, 0], [10, 3, 'beamBay', 1, 0], [9, 2, 'beamBay', 0, -1]];
const R1_RCS = [[0, 3, 'engine', 0, 1], [0, 2, 'engine', 0, -1], [10, 3, 'beamBay', 0, 1], [10, 2, 'beamBay', 0, -1]];
const params = withOverrides({}), w = createWorld({ params, edge, grid: TIERS.T1.grid });
for (const [id, type, cell, rot] of R1_ROOMS) addRoom(w, type, { id, cell, rotation: rot || 0 });
for (const [x, y, room, sx, sy] of R1_FITTINGS) addFitting(w, 'radiator', room, [x, y], [sx, sy]);
for (const [x, y, room, sx, sy] of R1_RCS) addFitting(w, 'rcs', room, [x, y], [sx, sy]);
const rm = (id) => w.rooms.find((r) => r.id === id);
loadMagazine(w, rm('magazine'), { heMass: scaled(params.magazine.capacity, edge) }); loadTurret(rm('turret'), params.turret.readyRounds.value); rm('turret').turret.hold = true;
enableShip(w);
const ro = readout(w);
rm('turret').turret.aim = [0, 1]; rm('turret').turret.hold = false;
const w0 = w.ship.bodies[0].omega; step(w);
out('--- 8. R1 at T1 from the kernel (L3.r1.pinned)');
out(`  mass ${ro.mass} kg, acceleration ${ro.accelerationG} g, 90 degree turn ${ro.rcs.turn90ccw} s, recoil of one M round broadside ${(w.ship.bodies[0].omega - w0) * 180 / Math.PI} deg/s`);
