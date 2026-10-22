// tools/estimates/l5.mjs — the lead designer's estimates for the L5 plan
// (DESIGN.md 13n: senses and the knowledge model, the kinetic-damage pass,
// missiles, point defence and the railgun, the helm and the enemy, ship
// versus ship; #241 (1), #265, #266, #268, #273, #274). Reads js/ and
// mission0/ only; changes nothing; never a canonical run:
//   node tools/estimates/l5.mjs [--set group.name=value ...] [--plan name=value ...]
// --set overrides a constant that exists in js/data.js; --plan overrides one
// of the PLANNED constants below (the plan's proposed values, which do not
// exist in data.js yet, #248: a plan's script carries its planned values).
// Every number is printed from the kernel at the current head where the kernel
// has the physics (masses, resistances, the round rule, the blast through
// walls, radiator power, the battle loop) and from the stated formula where it
// does not yet (the information law, missiles, point defence, the railgun);
// each line says which. Sections (1)–(8) are the lines the plan quotes.
import { PARAMS, FIXED, TIERS, ROOMS, withOverrides, scaled } from '../../js/data.js';
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, fireRound, irBrightness, detonateMagazine, magazineContents, isDestroyed, survivingCells, cellAt, pathAlong, readout, roomTemperature } from '../../js/rooms.js';
import { radiatorPower } from '../../js/heat.js';
import { penetrateRound } from '../../js/damage.js';
import { roundGeometry, sectionalMomentum } from '../../js/projectile.js';
import { shieldStrength } from '../../js/field.js';
import { buildShip, createBattle, runBattle, weaponStates, largestFraction } from '../../js/battle.js';
import { TARGETS, ATTACKER, R1_ROOMS, R1_FITTINGS } from '../../mission0/targets.js';

const args = process.argv.slice(2), overrides = {}, planOverrides = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') { const [k, v] = args[++i].split('='); overrides[k] = Number(v); }
  if (args[i] === '--plan') { const [k, v] = args[++i].split('='); planOverrides[k] = Number(v); }
}
const params = withOverrides(overrides);
const tier = TIERS.T1, edge = tier.edge, dt = FIXED.simStep.value, g0 = FIXED.standardGravity.value;
const line = (s) => console.log(s);
const f = (x, d = 3) => (Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(3) : x.toFixed(d));

// ---------- the plan's proposed constants (13n.2; T1 values; k in the plan) ----------
const PLANNED = {
  // senses (13n.1 (a))
  'sensor.area': 4, // m^2, k = 2: one antenna fitting's aperture
  'sensor.sensitivity': 1e-3, // W, k = 2 (with the aperture): the least received power an antenna resolves, IR and EM alike
  'sensor.scanPower': 1e5, // W, k = 2: the antenna's radiated power while scanning (EM-bright)
  'sensor.scanTime': 4, // s, k = 0: one zone at sensor.scanRange
  'sensor.scanRange': 900, // m, k = 1: the range at which a zone takes sensor.scanTime (the same battle in cells, #273 (3))
  'engine.exhaustVelocity': 1e4, // m/s, k = 0: a fusion torch's jet; jet power = thrust x v_e / 2 is its IR brightness
  // the kinetic pass (13n.1 (b))
  'magazine.detonationSpeed': 400, // m/s, k = 0: a round entering a magazine cell at or above this detonates it (#273 (c))
  // the railgun (13n.1 (c))
  'railgun.roundMass': 10, // kg, k = 3: one slug (the US Navy prototype's 10 kg at 32 MJ)
  'railgun.muzzleVelocity': 2000, // m/s, k = 0, for a 2-cell barrel; x sqrt(N / 2) for N cells (constant acceleration)
  'railgun.fireRate': 0.1, // 1/s, k = -1
  'railgun.efficiency': 0.3, // draw = muzzle energy / this; the rest is heat
  // missiles (13n.1 (c))
  'missile.mass': 200, // kg, k = 3
  'missile.acceleration': 30, // m/s^2, k = 0: about 3 g, so a 900 m flight takes 7.7 s (#54: 8-15 s)
  'missile.burnTime': 20, // s, k = 0
  'missile.warheadEnergy': 2e7, // J, k = 3: the HE warhead (10 M HE rounds); the penetrator's mass below
  'missile.empEnergy': 1e7, // J, k = 3: the EMP warhead's field budget (#99): one charged M shield buffer at g = 1
  'missile.penetratorMass': 50, // kg, k = 3: a steel rod, roundLengthToDiameter long
  'emp.radius': 40, // m, k = 1: half-strength radius of the burst's field (the shield's shape, #99)
  'emp.scramDose': 1e6, // J, k = 2: a reactor that receives at least this SCRAMs (the control electronics, not the vessel)
  // point defence (13n.1 (c))
  'pd.fireRate': 2, // 1/s, k = -1: the kinetic fitting, M flak rounds
  'pd.ammo': 40, // rounds, k = 0: its own store (#93)
  'flak.radius': 10, // m, k = 1: half-strength radius of a flak burst (the field rule)
  'pdLaser.power': 1e6, // W, k = 2: the laser fitting, no falloff (#230), heat at beambay.efficiency
  // missiles' hp follow the one law: matter.burnEnergyPerKg x missile.mass (no constant)
};
for (const [k, v] of Object.entries(planOverrides)) { if (!(k in PLANNED)) throw new Error(`unknown planned constant ${k}`); PLANNED[k] = v; }
const Pn = (k) => PLANNED[k];

// ---------- helpers on the kernel ----------
const c = params.matter.kineticResistance.value, rho = FIXED.steelDensity.value, LD = FIXED.roundLengthToDiameter.value;
const sigmaOf = (type) => { const def = ROOMS[type]; const names = Array.isArray(def.cellMass) ? def.cellMass : [def.cellMass]; return names.reduce((s, n) => { const [g, p] = n.split('.'); return s + scaled(params[g][p], edge); }, 0) / (edge * edge); };
const sigmaHeatSink = (scaled(params.structure.cellMass, edge) + ((params.heatsink.capacityFactor.value - 1) * scaled(params.thermal.coupledHeatSink, edge)) / FIXED.waterSpecificHeat.value) / (edge * edge);
const plateSigma = scaled(params.armour.plateThickness, edge) * rho;
const SIG = { hold: sigmaOf('hold'), magazine: sigmaOf('magazine'), heatSink: sigmaHeatSink, beamBay: sigmaOf('beamBay'), engine: sigmaOf('engine'), shieldGenerator: sigmaOf('shieldGenerator'), crewed: sigmaOf('bridge'), armourCell: scaled(params.armour.cellMass, edge) / (edge * edge), plate: plateSigma, reactor: sigmaOf('reactor') };
function roundOf(mass, v, ld = LD) {
  const { D, A } = roundGeometry(mass, rho, ld);
  return { mass, v, D, A, s0: sectionalMomentum(mass, v, A), S: c * rho * (D * ld), p: mass * v };
}
const mRound = roundOf(scaled(params.kinetic.roundMass, edge), params.kinetic.muzzleVelocity.value);
const sRound = roundOf(scaled(params.kinetic.roundMass, edge) * FIXED.sizeLinear.value.S ** 3, params.kinetic.muzzleVelocity.value);
const lRound = roundOf(scaled(params.kinetic.roundMass, edge) * FIXED.sizeLinear.value.L ** 3, params.kinetic.muzzleVelocity.value);
/** The round rule (js/damage.js penetrateRound, the kernel's own function) through a column of areal densities; the speed on entering each cell. */
function through(round, sigmas) {
  const r = sigmas.map((s) => c * s), res = penetrateRound({ momentum: round.p, area: round.A, strength: round.S }, r);
  const enter = []; let p = round.p;
  for (let i = 0; i < sigmas.length; i++) { enter.push(p / round.mass); if (i < res.passed) p -= res.impulse[i]; else break; }
  return { res, enter, exit: res.stoppedIn < 0 ? res.momentum / round.mass : 0 };
}

// ---------- (1) the information law: sources, ranges, scan times (formula; the radiator power is the kernel's) ----------
line('# (1) Information law at T1 (13n.1 (a)): IR and EM sources, passive ranges by d^-2, active scan times by d^4');
{
  const area = scaled(params.radiator.area, edge), eps = FIXED.radiatorEmissivity.value, sb = FIXED.stefanBoltzmann.value;
  const panel = (T) => radiatorPower(T, 1, area, eps, sb); // js/heat.js, the number irBrightness reports (#102)
  const T0 = FIXED.restTemperature.value, Th = params.thermal.plantHot.value, Tc = params.thermal.crewedHot.value;
  const thrust = scaled(params.engine.thrust, edge), jet = (thrust * Pn('engine.exhaustVelocity')) / 2;
  const sources = [['one radiator panel at rest (290 K)', panel(T0)], ['one panel at crewed hot (330 K)', panel(Tc)], ['one panel at plant hot (600 K)', panel(Th)], ['the shield absorbing a 5 MW beam (EM = absorbed, rooms.js s.em)', scaled(params.beam.power, edge)], ['an antenna scanning (EM, sensor.scanPower)', Pn('sensor.scanPower')], ['the engine at full thrust (IR: jet power thrust x v_e / 2)', jet]];
  const A = Pn('sensor.area'), S = Pn('sensor.sensitivity');
  const received = (P, d) => (P * A) / (4 * Math.PI * d * d), range = (P) => Math.sqrt((P * A) / (4 * Math.PI * S));
  line(`  antenna aperture ${A} m^2, sensitivity ${S} W: received = P A / (4 pi d^2); detected at d <= sqrt(P A / (4 pi S))`);
  for (const [name, P] of sources) line(`  ${name.padEnd(66)} P ${f(P, 2)} W: at 600 / 900 / 1500 m ${[600, 900, 1500].map((d) => f(received(P, d), 2)).join(' / ')} W; seen to ${f(range(P), 0)} m`);
  const ts = Pn('sensor.scanTime'), rs = Pn('sensor.scanRange');
  line(`  active scan: one zone takes sensor.scanTime x (d / sensor.scanRange)^4 = ${ts} s x (d / ${rs} m)^4: at 600 / 900 / 1500 m ${[600, 900, 1500].map((d) => f(ts * (d / rs) ** 4, 2)).join(' / ')} s`);
  // Zones: the target's occupied bounding box split 3 along x and 2 along y (13n.1 (a)); R1's box is 11 x 6 cells.
  const { world } = buildShip(params, 'T1', TARGETS.R1d);
  const cells = [...world.layout.rooms.values()].flatMap((r) => r.cells);
  const xs = cells.map((q) => q[0]), ys = cells.map((q) => q[1]);
  const W = Math.max(...xs) - Math.min(...xs) + 1, H = Math.max(...ys) - Math.min(...ys) + 1;
  line(`  R1d's occupied box ${W} x ${H} cells -> 3 x 2 = 6 zones of about ${Math.ceil(W / 3)} x ${Math.ceil(H / 2)} cells; the whole ship at 600 / 900 / 1500 m: ${[600, 900, 1500].map((d) => f(6 * ts * (d / rs) ** 4, 1)).join(' / ')} s`);
  line(`  the scanner is seen passively at d^-2 while it scans: its EM is detected to ${f(range(Pn('sensor.scanPower')), 0)} m, so at every battle range the target knows the scanner's antenna before the scan resolves a zone (the design's asymmetry, #24)`);
  // IR at rest: every hull cell radiates as a 290 K surface? No: only radiators radiate in the kernel (irBrightness); hull cells do not.
  let rad = 0; for (const r of world.rooms) rad += irBrightness(world, r);
  line(`  R1d at rest, every room 290 K: the kernel's irBrightness over its 17 panels ${f(rad, 2)} W (${f(rad / 17, 2)} W each); hull faces radiate nothing in the kernel's heat books (L1-L4: radiators only), so IR sees radiator panels and the exhaust, each at its room's temperature (13n.1 (a)): rooms without a panel are IR-dark`);
  const tof = (d) => d / params.kinetic.muzzleVelocity.value;
  line(`  time of flight of an M round at 600 / 900 / 1500 m: ${[600, 900, 1500].map((d) => f(tof(d), 3)).join(' / ')} s; scanning one zone at 900 m is ${f(ts / tof(900), 1)} times of flight`);
}

// ---------- (2) the kinetic pass: residual speeds and the detonation threshold (the kernel's round rule) ----------
line('\n# (2) Kinetic pass (13n.1 (b), #273 (b) (c), #274): the speed an M round keeps after each cell type (penetrateRound); magazine.detonationSpeed');
{
  const vd = Pn('magazine.detonationSpeed');
  line(`  M round ${mRound.mass} kg at ${mRound.v} m/s: D ${f(mRound.D, 4)} m, A ${f(mRound.A, 5)} m^2, s0 ${f(mRound.s0, 0)} kg/(m s), S ${f(mRound.S, 0)}; sigma: hold/magazine ${f(SIG.hold, 0)}, heat sink ${f(SIG.heatSink, 0)}, beam bay ${f(SIG.beamBay, 0)}, engine ${f(SIG.engine, 0)}, shield gen ${f(SIG.shieldGenerator, 0)}, crewed ${f(SIG.crewed, 0)}, plate ${f(SIG.plate, 0)}, reactor ${f(SIG.reactor, 0)} kg/m^2`);
  const magLine = (name, rd, col, k) => {
    const t = through(rd, col), ve = t.enter[k];
    line(`  ${name.padEnd(52)} enters each cell at ${t.enter.map((v) => f(v, 0)).join(' / ')} m/s; ${t.res.stoppedIn < 0 ? `exits at ${f(t.exit, 0)} m/s` : `stops in entry ${t.res.stoppedIn}`}; the magazine (entry ${k}) entered at ${ve === undefined ? 'no speed (never reached)' : `${f(ve, 0)} m/s`}: ${ve !== undefined && ve >= vd ? 'DETONATES' : 'no detonation'} at threshold ${vd} m/s`);
  };
  magLine('hold -> magazine (R1 from -y, column 8)', mRound, [SIG.hold, SIG.magazine, SIG.magazine], 1);
  magLine('two holds -> magazine', mRound, [SIG.hold, SIG.hold, SIG.magazine], 2);
  magLine('crewed -> magazine (a bridge or quarters screen)', mRound, [SIG.crewed, SIG.magazine, SIG.magazine], 1);
  magLine('shield generator -> magazine', mRound, [SIG.shieldGenerator, SIG.magazine], 1);
  magLine('beam bay (2 cells) -> magazine (R1 bow-on, row 2)', mRound, [SIG.beamBay, SIG.beamBay, SIG.magazine, SIG.magazine], 2);
  magLine('plate -> magazine (R1d, the plate intact)', mRound, [SIG.plate, SIG.magazine], 1);
  magLine('hold -> plate -> magazine (R1d, column 8)', mRound, [SIG.hold, SIG.plate, SIG.magazine], 2);
  magLine('hold -> magazine, S round', sRound, [SIG.hold, SIG.magazine], 1);
  magLine('hold -> magazine, L round', lRound, [SIG.hold, SIG.magazine], 1);
  magLine('crewed -> magazine, L round', lRound, [SIG.crewed, SIG.magazine], 1);
  // A stopped M round costs a 0.2 m plate (taken / r) / hitsToWreck (13l.1): shots to a hole.
  const hits = params.kinetic.hitsToWreck.value, lossPlate = Math.min(mRound.s0, c * SIG.plate) / (c * SIG.plate) / hits;
  line(`  a stopped M round costs a 0.2 m plate ${f(lossPlate, 4)} of its integrity: ${Math.ceil(1 / lossPlate - 1e-9)} shots open it (today's rule, unchanged by the pass: the plate stops the round, chord 1)`);
  line(`  chord-scaled loss (#273 (b)): a passed cell loses chord / hitsToWreck: chord 0.9774 (L4.hit.oblique) ${f(0.9774 / hits, 4)} instead of ${f(1 / hits, 4)}; a graze at chord 0.05 ${f(0.05 / hits, 4)} (today ${f(1 / hits, 4)}: §17 item 41's L3)`);
  // #274: the magazine's blast on R1 and R1d, the kernel's own blast through walls (rooms.js detonateMagazine), the ship not ended by it.
  for (const name of ['R1', 'R1d']) {
    const { world, room } = buildShip(params, 'T1', TARGETS[name]);
    const undock = world.ship.bodies.reduce((m, b) => m + b.M, 0), crew0 = world.rooms.reduce((x, r) => x + r.crew, 0);
    const E = magazineContents(world, room('magazine')).energy;
    detonateMagazine(world, room('magazine'), 'est-blast');
    for (let i = 0; i < 60; i++) step(world); // one second: the blast's damage, the cascade, the fragments
    const b = world.blasts[0];
    const wrecked = world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id), hurt = world.rooms.filter((r) => !isDestroyed(r) && r.cells.some((q) => q.integrity < 1)).map((r) => `${r.id} ${f(r.cells.reduce((x, q) => x + q.integrity, 0) / r.cells.length, 2)}`);
    const crew = world.rooms.reduce((x, r) => x + r.crew, 0), states = weaponStates(world);
    line(`  ${name}: the full magazine (150 HE) blasts ${f(E, 3)} J (kinetic.chargeEnergy + he.blastEnergy per round); escaped ${f(b.escaped, 3)} J; wrecked [${wrecked.join(', ')}]; damaged ${hurt.join(', ') || '-'}; crew ${crew}/${crew0}; largest fragment ${f(largestFraction(world, undock), 3)} of ${f(undock, 0)} kg (wreckFraction ${params.battle.wreckFraction.value}); able weapons ${states.filter((s) => s.able).map((s) => s.room.id).join(', ') || 'none'} -> ${largestFraction(world, undock) < params.battle.wreckFraction.value ? 'DESTROYED (pieces)' : states.some((s) => s.able) ? 'fights on' : 'Disabled in 10 s'} under #274; today's kernel: destroyed by the explosion`);
  }
}

// ---------- (3) the railgun (formula on the kernel's round rule) ----------
line('\n# (3) The spinal railgun (13n.1 (c)): slug, penetration, recoil on R1d, power and heat');
{
  const m = Pn('railgun.roundMass'), v2 = Pn('railgun.muzzleVelocity'), rate = Pn('railgun.fireRate'), eff = Pn('railgun.efficiency');
  const { world } = buildShip(params, 'T1', TARGETS.R1d);
  const M = world.ship.bodies[0].M;
  for (const N of [2, 4, 6]) {
    const v = v2 * Math.sqrt(N / 2), slug = roundOf(m, v), E = 0.5 * m * v * v;
    const crew = through(slug, Array(8).fill(SIG.crewed)), bridgeMag = through(slug, [SIG.crewed, SIG.crewed, SIG.magazine]), plate = through(slug, [SIG.plate, SIG.magazine]), reac = through(slug, [SIG.reactor]);
    line(`  N = ${N} (${N * edge} m): v ${f(v, 0)} m/s, s0 ${f(slug.s0, 0)} kg/(m s) (${f(slug.s0 / mRound.s0, 2)} x M), E ${f(E / 1e6, 1)} MJ, draw per shot ${f(E / eff / 1e6, 1)} MJ, mean draw at ${rate}/s ${f((E / eff) * rate / 1e6, 2)} MW, heat ${f(((E / eff) * (1 - eff) * rate) / 1e6, 2)} MW; crewed cells passed ${crew.res.passed}; through a bridge (2 cells) into a magazine: enters at ${f(bridgeMag.enter[2] || 0, 0)} m/s ${(bridgeMag.enter[2] || 0) >= Pn('magazine.detonationSpeed') ? 'DETONATES' : 'no detonation'}; through a 0.2 m plate: ${plate.res.stoppedIn < 0 || plate.res.stoppedIn > 0 ? `passes, enters the magazine at ${f(plate.enter[1] || 0, 0)} m/s` : 'stopped by the plate'}; a reactor cell: ${reac.res.stoppedIn < 0 ? 'passed' : 'stops it'}; recoil on R1d (${f(M, 0)} kg) ${f((m * v) / M, 4)} m/s per shot`);
  }
  const C = 4 * scaled(params.thermal.coupledRailgun, edge), v = v2, E = 0.5 * m * v * v, heat = (E / eff) * (1 - eff) * rate;
  line(`  heat race of an N = 2 railgun alone (4 cells, C ${f(C, 3)} J/K, no radiators): to plant hot ${f((C * (params.thermal.plantHot.value - FIXED.restTemperature.value)) / heat, 0)} s at ${f(heat / 1e6, 2)} MW of heat`);
}

// ---------- (4) missiles, warheads, EMP, point defence (formula on the kernel's constants) ----------
line('\n# (4) Missiles (13n.1 (c)): flight, warheads against cell capacities, EMP dose, point defence');
{
  const m = Pn('missile.mass'), a = Pn('missile.acceleration'), tb = Pn('missile.burnTime'), hp = params.matter.burnEnergyPerKg.value * m;
  line(`  missile ${m} kg at ${a} m/s^2 (${f(a / g0, 2)} g) for ${tb} s; hp by the one law q x m = ${f(hp, 0)} J`);
  for (const d of [600, 900, 1500]) { const t = Math.sqrt((2 * d) / a); line(`    ${d} m from rest: ${f(t, 2)} s of flight, ${f(a * t, 0)} m/s at impact (#54: 8-15 s)`); }
  const qb = params.matter.blastPerKg.value, cap = (type) => qb * sigmaOf(type) * edge * edge, coupling = params.he.coupling.value, Ew = Pn('missile.warheadEnergy');
  line(`  HE warhead ${f(Ew / 1e6, 0)} MJ x he.coupling ${coupling} = ${f((Ew * coupling) / 1e6, 1)} MJ into the hull at the hit cell (13d.1's blast through walls from there); a cell absorbs q_b x mass: hold ${f(cap('hold') / 1e6, 2)}, crewed ${f(cap('bridge') / 1e6, 2)}, engine ${f(cap('engine') / 1e6, 2)}, shield gen ${f(cap('shieldGenerator') / 1e6, 2)}, reactor ${f(cap('reactor') / 1e6, 1)} MJ; an M HE round carries ${f(scaled(params.he.blastEnergy, edge) / 1e6, 1)} MJ`);
  const pen = roundOf(Pn('missile.penetratorMass'), Math.sqrt(2 * 900 * a));
  const t = through(pen, [SIG.crewed, SIG.crewed, SIG.crewed]);
  line(`  penetrator ${pen.mass} kg at ${f(pen.v, 0)} m/s (a 900 m flight): s0 ${f(pen.s0, 0)} (${f(pen.s0 / mRound.s0, 2)} x M): crewed cells passed ${t.res.passed}${t.res.stoppedIn >= 0 ? `, stops in entry ${t.res.stoppedIn}` : ''}`);
  const R = Pn('emp.radius'), dose = Pn('emp.scramDose'), buffer = scaled(params.shield.buffer, edge), Ee = Pn('missile.empEnergy');
  const reach = (E) => (E > dose ? R * Math.sqrt(E / dose - 1) : 0);
  line(`  EMP burst of ${f(Ee / 1e6, 0)} MJ at the hull: a reactor at r receives E g(r), g = 1 / (1 + (r / ${R} m)^2) (#99, the shield's shape): SCRAMs (dose >= ${f(dose / 1e6, 1)} MJ) within ${f(reach(Ee), 0)} m of the burst (R1 is ${11 * edge} m long: every reactor); a charged shield buffer (${f(buffer / 1e6, 0)} MJ at g = 1) takes min(E, buffer x g) first: at g = 1 the whole burst, at g = 0.5 (40 m from the generator) half, leaving ${f((Ee - 0.5 * buffer) / 1e6, 0)} MJ that reaches ${f(reach(Ee - 0.5 * buffer), 0)} m; shields down (running cold, or a drained buffer) let it all through: the EMP route is the counter to a ship that runs cold`);
  const rate = Pn('pd.fireRate'), ammo = Pn('pd.ammo'), fr = Pn('flak.radius'), Ef = scaled(params.he.blastEnergy, edge);
  const kill = fr * Math.sqrt(Ef / hp - 1);
  line(`  kinetic point defence: M flak (${f(Ef / 1e6, 1)} MJ) bursts at closest approach; the missile dies when E g(r) >= its hp: within ${f(kill, 1)} m; ${rate} rounds/s from a store of ${ammo} (#93): ${ammo / rate} s of fire; a missile accelerating at ${a} m/s^2 moves ${f(0.5 * a * 0.5 * 0.5, 2)} m across the line in a 0.5 s flak flight: the flak's miss is physical only at the last seconds`);
  const Pl = Pn('pdLaser.power');
  line(`  laser point defence ${f(Pl / 1e6, 1)} MW, no falloff (#230): a missile dies in hp / P = ${f(hp / Pl, 2)} s in its arc; six missiles arriving over the last ${f(600 / Math.sqrt(2 * 900 * a), 1)} s (600 m at the impact speed): one laser kills ${Math.floor(600 / Math.sqrt(2 * 900 * a) / (hp / Pl))}, one kinetic fitting ${Math.floor((600 / Math.sqrt(2 * 900 * a)) * rate)} (the Swarm law: munitions against point-defence throughput)`);
}

// ---------- (5) the helm and the enemy: what the kernel says about dodging and cadence ----------
line('\n# (5) Helm and enemy (13n.1 (d)): dodge over a time of flight, R1 against R1d (kernel masses)');
{
  for (const name of ['R1', 'R1d']) {
    const { world } = buildShip(params, 'T1', TARGETS[name]), r = readout(world), acc = r.accelerationG * g0;
    line(`  ${name}: ${f(r.mass, 0)} kg, ${f(r.accelerationG, 3)} g; across the line of fire in one time of flight (1/2 a t^2) at 600 / 900 / 1500 m: ${[600, 900, 1500].map((d) => f(0.5 * acc * (d / params.kinetic.muzzleVelocity.value) ** 2, 1)).join(' / ')} m (a cell is ${edge} m); 90 deg on the RCS couple ${f(r.rcs.turn90ccw, 2)} s`);
  }
  const ts = Pn('sensor.scanTime');
  line(`  an enemy that scans before it targets (patience) spends ${ts} s per zone at 900 m; R1d bow-on duels at 900 m lasted about 102 s (13l.3): six zones are a quarter of the battle, one zone a twenty-fifth`);
}

// ---------- (6) room size S (§17 item 30): footprints, masses, the 60 % budget by mass ----------
line('\n# (6) Room size S (13n.1 (e)): one-cell rooms by the kernel\'s size rule; budgets by mass at undock');
{
  const crewed = scaled(params.cellMass.crewed, edge), reactor = scaled(params.cellMass.reactor, edge);
  line(`  S = one cell for the 2 x 2 rooms (cellRatio 1/4: power, crew, capacity, rate x 1/4): S reactor ${f(reactor / 1e3, 0)} t and ${f(scaled(params.reactor.power, edge) / 4 / 1e6, 0)} MW; S turret ${f(crewed / 1e3, 1)} t firing S rounds (${f(sRound.mass, 2)} kg, s0 ${f(sRound.s0, 0)} = shield.kineticStop, so a full-strength field stops it) at ${f(scaled(params.turret.fireRate, edge) / FIXED.sizeLinear.value.S, 3)} /s (rooms.js turret(): fireRate / sizeLinear[size]; the munition's size is sizeLinear's, the room's is its cell count, #259 (1)): throughput per cell S ${f((scaled(params.turret.fireRate, edge) / FIXED.sizeLinear.value.S) * sRound.mass, 2)}, M ${f((scaled(params.turret.fireRate, edge) * mRound.mass) / 4, 2)}, L ${f((scaled(params.turret.fireRate, edge) / FIXED.sizeLinear.value.L) * lRound.mass / 9, 2)} kg/s per cell`);
  const { world: w1 } = buildShip(params, 'T1', TARGETS.R1), { world: wd } = buildShip(params, 'T1', TARGETS.R1d);
  const M1 = readout(w1).mass, Md = readout(wd).mass;
  line(`  masses at undock: R1 ${f(M1 / 1e3, 1)} t (reactor ${f((4 * reactor) / 1e3, 0)} t = ${f((400 * reactor) / M1, 0)} %), R1d ${f(Md / 1e3, 1)} t; 60 % of R1d = ${f((0.6 * Md) / 1e3, 1)} t, 60 % of R1 = ${f((0.6 * M1) / 1e3, 1)} t: an R1 with an S reactor weighs ${f((M1 - 3 * reactor) / 1e3, 1)} t (${f(scaled(params.engine.thrust, edge) / (M1 - 3 * reactor) / g0, 2)} g at 15 MN) on 5 MW: the 60 %-budget ship of E6 exists only with S rooms`);
}

// ---------- (7) the stand-ins of §17 item 35 and the loop with two moving ships: what L4's loop already prints ----------
line('\n# (7) The loop today (js/battle.js, kernel): B1 on R1 and R1d as a reference for L5\'s moving loop');
{
  for (const [name, target, bearing, plan] of [['B1 decapitate R1', 'R1', '-y', { turret: ['bridge'] }], ['R1d magazine', 'R1d', '-y', { turret: ['magazine'] }]]) {
    const b = runBattle(createBattle({ params, attacker: ATTACKER, target: TARGETS[target], bearing, plan }), 300);
    line(`  ${name.padEnd(18)} ${b.ended ? `${b.ended.kind} at ${b.ended.t.toFixed(3)} s (step ${b.ended.step})` : 'none by 300 s'}; shots ${b.shots}, hits ${b.hits.length}, misses ${b.misses.length}`);
  }
}

// ---------- (8) E8: a step's cost today, as a bound for the moving loop ----------
line('\n# (8) E8: wall time per step of the L4 loop (two ships, rounds in flight), this machine');
{
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS.R1d, bearing: '-y', plan: { turret: ['magazine'] } });
  const t0 = process.hrtime.bigint(); let n = 0;
  while (!b.ended && n < 1800) { runBattle(b, (n + 1) * dt); n++; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  line(`  ${f(ms, 3)} ms per step over ${n} steps (budget 1 ms, #213); L5 adds per step: the knowledge models, up to a few missiles' guidance and line tests, point-defence lines`);
}
