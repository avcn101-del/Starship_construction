// tools/estimates/pass2.mjs — the lead designer's estimates for physics pass 2
// (DESIGN.md 13k, #240, #241 (1)). Reads js/ only; changes nothing; never a
// canonical run. Every number quoted in 13k comes from here:
//   node tools/estimates/pass2.mjs
import { PARAMS as P, FIXED as F, TIERS, scaled } from '../../js/data.js';
import { csdaRange } from '../../js/damage.js';
import { stopRound } from '../../js/field.js';
import { roundGeometry } from '../../js/projectile.js';

const MEV = 1.602176634e-13, cp = 450; // J/(kg K), steel
const out = (...a) => console.log(...a);
const bethe = { protonRest: F.protonRestEnergy.value, electronRest: F.electronRestEnergy.value, K: F.betheK.value, ZA: F.ironZOverA.value, I: F.ironMeanExcitation.value, lambda: F.ironInteractionLength.value };

// 1. One law: J/kg of burn and blast today, and the proposed per-kg constants calibrated on L0's armour cell.
const masses = { armour: P.armour.cellMass.value, structure: P.structure.cellMass.value, ...Object.fromEntries(Object.entries(P.cellMass).map(([k, p]) => [k, p.value])) };
const burnPerKg = P.armour.burnEnergy.value / masses.armour, blastPerKg = P.armour.blastResistance.value / masses.armour;
out('--- 1. burn and blast per kg today, and under one law (q_burn, q_blast calibrated on armour)');
out('q_burn J/kg', burnPerKg, ' q_blast J/kg', blastPerKg);
for (const [k, m] of Object.entries(masses)) {
  const blastNow = k === 'armour' ? P.armour.blastResistance.value : P.room.blastResistance.value * (k === 'structure' ? P.hold.blastFactor.value : 1);
  out(`  ${k.padEnd(16)} mass ${String(m).padStart(7)} kg | today burn ${(P.armour.burnEnergy.value / m).toFixed(0).padStart(6)} J/kg, cell ${(P.armour.burnEnergy.value / 1e6).toFixed(1)} MJ -> one law ${(burnPerKg * m / 1e6).toFixed(2)} MJ (${(burnPerKg * m / 5e6).toFixed(1)} s of a 5 MW beam) | blast today ${(blastNow / 1e6).toFixed(2)} MJ -> ${(blastPerKg * m / 1e6).toFixed(2)} MJ`);
}

// 2. Heat capacity: today 0.6 MJ/K per cell for every type; proposed thermally coupled C per cell (estimates, 13k.2) and the races.
out('--- 2. heat capacity per cell and the one-room races (t = C dT / P)');
const C0 = P.thermal.heatCapacityPerCell.value;
const C = { reactor: 5.5e6, beamBay: 1.0e6, engine: 1.4e6, shieldGenerator: 3.2e6, crewed: 0.6e6, magazine: 0.6e6, hold: 1.35e6, heatSink: 1.35e6, armour: 4.5e6 };
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
const rate = P.repair.rate.value, kgPerS = rate * masses.armour;
out(`  today: 1/3 of any cell in ${(1 / (3 * rate)).toFixed(1)} s; proposed repair.massRate ${kgPerS} kg/s (= rate x armour cell):`);
for (const [k, m] of Object.entries(masses)) out(`    ${k.padEnd(16)} 1/3 of a cell in ${(m / 3 / kgPerS).toFixed(1)} s`);

// 4. Books: impulse of an M hit, shield-removed momentum, kinetic energy lost.
out('--- 4. books');
const edge = TIERS.T1.edge, mM = scaled(P.kinetic.roundMass, edge) * F.sizeLinear.value.M ** 3, v = P.kinetic.muzzleVelocity.value, { A } = roundGeometry(mM, F.steelDensity.value, F.roundLengthToDiameter.value);
out(`  M round: p ${mM * v} N s, E ${(0.5 * mM * v * v / 1e6).toFixed(2)} MJ; on R1 (850 t) 5.6 mm/s per hit; recoil already 0.050 deg/s per shot (#236)`);
const r = stopRound({ mass: mM, velocity: v, area: A }, P.shield.kineticStop.value, 1, Infinity);
out(`  shield at g=1: removes ${(mM * (v - r.velocity)).toFixed(0)} N s and ${(r.energy / 1e6).toFixed(2)} MJ per M round (to the generator's ship and its heat)`);

// 5. Tier: beam depth and the shield buffer.
out('--- 5. tier scaling');
const sig = (t) => P.armour.cellMass.value * (TIERS[t].edge / edge) ** 3 / TIERS[t].edge ** 2; // k=3 mass over edge^2
for (const t of Object.keys(TIERS)) {
  const e = TIERS[t].edge, E2 = P.beam.gradient.value * 2 * e;
  const depth = csdaRange(E2, bethe) / sig(t);
  // gradient factor so that the N=2 bay reaches T1's depth: solve csdaRange(g G 2 e) = depth1 x sigma(t) by bisection
  const target = csdaRange(P.beam.gradient.value * 2 * edge, bethe) / sig('T1') * sig(t);
  let lo = 0.05, hi = 5; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (csdaRange(mid * E2, bethe) < target ? (lo = mid) : (hi = mid)); }
  const g = (lo + hi) / 2;
  const m = scaled(P.kinetic.roundMass, e) * F.sizeLinear.value.M ** 3, { A: At } = roundGeometry(m, F.steelDensity.value, F.roundLengthToDiameter.value);
  const rt = stopRound({ mass: m, velocity: v, area: At }, scaled(P.shield.kineticStop, e), 1, Infinity);
  const bufNow = scaled(P.shield.budget, e) * P.shield.bufferSeconds.value, bufK3 = scaled(P.shield.budget, edge) * P.shield.bufferSeconds.value * (e / edge) ** 3;
  out(`  ${t} edge ${e}: N=2 depth ${depth.toFixed(3)} armour cells (E ${(E2 / MEV).toFixed(0)} MeV); gradient factor for T1's depth ${g.toFixed(3)} (E ${(g * E2 / MEV).toFixed(0)} MeV); M rounds per buffer today ${(bufNow / rt.energy).toFixed(2)}, buffer k=3 ${(bufK3 / rt.energy).toFixed(2)}`);
}

// 6. Machinery masses: engine (vacuum F-1), reactor low end, and the k split.
out('--- 6. masses');
const f1 = 7.77e6 / 8.4e3; out(`  F-1 vacuum thrust per kg ${f1.toFixed(0)} N/kg -> 15 MN engine ${(1.5e7 / f1 / 1e3).toFixed(2)} t over 6 cells = ${(1.5e7 / f1 / 6).toFixed(0)} kg machinery per cell (+ 3000 structure = ${(3000 + 1.5e7 / f1 / 6).toFixed(0)}; today ${masses.engine})`);
out(`  reactor compartment 1130 t in a 10 m x 12 m cylinder = ${(1130e3 / (Math.PI * 25 * 12)).toFixed(0)} kg/m^3 -> ${(1130e3 / (Math.PI * 25 * 12) * 125 / 1e3).toFixed(0)} t per 125 m^3 cell (today ${masses.reactor / 1e3} t)`);
for (const t of ['T1', 'T3', 'T6']) { const e = TIERS[t].edge; out(`  ${t}: engine cell today ${(scaled(P.cellMass.engine, e) / 1e3).toFixed(0)} t (k=3) -> split ${(scaled(P.structure.cellMass, e) / 1e3).toFixed(0)} t structure (k=3) + ${(2700 * (e / edge) ** 2 / 1e3).toFixed(0)} t machinery (k=2); thrust/machinery ${(scaled(P.engine.thrust, e) / (2700 * (e / edge) ** 2 * 6)).toFixed(0)} N/kg`); }

// 7. SCRAM restart, culling, disabled.
out('--- 7. new constants (proposed): reactor.restartTime 60 s (30-300, k=0); battle.cullDistance 3000 m (1000-10000, k=1); battle.disabledSeconds 10 s (3-30, k=0)');
