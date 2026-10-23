// data.js — every number that affects the game.
// Units are SI (DESIGN.md §13, #163). A tunable constant is
//   { value, min, max, k, unit, approved, note }
// where value is the T1 base (cell edge 5 m) and k is the scaling exponent on
// the cell edge: scaled = value * (edge / BASE_EDGE)^k  (DESIGN.md §5.1),
// computed by util.js's deterministic power (#239 Q6, 13k.1).
// approved: false marks a constant whose range the owner has not approved yet;
// agents may not tune it (CLAUDE.md, Agents).

import { pow } from './util.js';

export const BASE_EDGE = 5; // m, the T1 cell

export const TIERS = {
  T1: { name: 'Corvette', edge: 5, grid: [30, 14] },
  T2: { name: 'Frigate', edge: 7.5, grid: [34, 15] },
  T3: { name: 'Destroyer', edge: 10, grid: [38, 16] },
  T4: { name: 'Cruiser', edge: 15, grid: [42, 18] },
  T5: { name: 'Battleship', edge: 20, grid: [46, 20] },
  T6: { name: 'Capital', edge: 30, grid: [50, 22] },
};

const P = (value, min, max, k, unit, approved, note) => ({ value, min, max, k, unit, approved, note });
// One MeV in joules (exact since the 2019 SI): the path model quotes particle
// energies in MeV and stores them in J (DESIGN.md 13i.2, #163).
const MEV = 1.602176634e-13;

// Fixed constants: real physical values or geometric choices, not tunable.
export const FIXED = {
  steelDensity: { value: 7850, unit: 'kg/m^3', note: 'real density of steel; kinetic rounds are steel' },
  roundLengthToDiameter: { value: 4, unit: '', note: 'shape of a kinetic round (a cylinder 4 diameters long)' },
  sizeLinear: { value: { S: 2 / 3, M: 1, L: 3 / 2 }, unit: '', note: 'linear size of S and L relative to M (mass scales with its cube)' },
  shieldFalloffExponent: { value: 2, unit: '', note: 'shield field strength g(r) = 1 / (1 + (r / radius)^n)' },
  simStep: { value: 1 / 60, unit: 's', note: 'simulation time step (#175)' },
  burnTimeLimit: { value: 3600, unit: 's', note: 'a beam burn gives up after this long (#175)' },
  stefanBoltzmann: { value: 5.670374e-8, unit: 'W/(m^2*K^4)', note: 'real Stefan-Boltzmann constant (#143, #183)' },
  restTemperature: { value: 290, unit: 'K', note: 'rooms start here; space (3 K) is taken as 0 (#182, #183)' },
  radiatorEmissivity: { value: 0.9, unit: '', note: 'radiator.emissivity in DESIGN.md 13c.3: real, a dark panel (#182, #183)' },
  repairFalloffExponent: { value: 2, unit: '', note: 'repair field strength g(r) = 1 / (1 + (r / radius)^n), like the shield (#99, #183)' },
  lifeSupportSetpoint: { value: 295, unit: 'K', note: 'the air temperature life support holds in crewed rooms and magazines (#201)' },
  waterSpecificHeat: { value: 4186, unit: 'J/(kg*K)', note: 'real; a heat sink cell carries the water of its extra heat capacity (#208, #210)' },
  standardGravity: { value: 9.80665, unit: 'm/s^2', note: 'standard gravity, for the readout\'s acceleration in g (#58, #210)' },
  // The path model's beam (DESIGN.md 13i.1, 13i.2, #229, #235): a proton in
  // iron-equivalent matter by the Bethe formula and the nuclear interaction
  // length. Real values, stored in SI; the notes give the usual units.
  protonRestEnergy: { value: 938.272 * MEV, unit: 'J', note: '938.272 MeV (CODATA)' },
  electronRestEnergy: { value: 0.51099895 * MEV, unit: 'J', note: '0.51099895 MeV (CODATA)' },
  betheK: { value: 0.307075 * MEV * 1e-4, unit: 'J*m^2/mol', note: 'K = 4 pi N_A r_e^2 m_e c^2 = 0.307075 MeV cm^2/mol (PDG); K x ironZOverA is in J m^2/kg' },
  ironZOverA: { value: 0.46557 * 1e3, unit: 'mol/kg', note: 'Z/A of iron, 0.46557 mol/g (PDG); cell matter is iron-equivalent by mass (13i.1)' },
  ironMeanExcitation: { value: 286e-6 * MEV, unit: 'J', note: 'mean excitation energy I of iron, 286 eV (PDG)' },
  ironInteractionLength: { value: 1321, unit: 'kg/m^2', note: 'nuclear interaction length lambda_I of iron, 132.1 g/cm^2 = 16.77 cm at 7.874 g/cm^3 (PDG)' },
  // Water, so csdaRange can be checked against NIST PSTAR (13k.1, #236, L0.beam.pstar).
  waterZOverA: { value: 0.55509 * 1e3, unit: 'mol/kg', note: 'Z/A of liquid water, 0.55509 mol/g (PDG)' },
  waterMeanExcitation: { value: 75e-6 * MEV, unit: 'J', note: 'mean excitation energy I of liquid water, 75 eV (NIST PSTAR, PDG)' },
};

const KINETIC = {
  roundMass: P(6, 2, 20, 3, 'kg', true, 'size M round at T1: 6 kg of solid steel, 62 mm, a light naval gun (#166, #203 D, #206)'),
  muzzleVelocity: P(800, 500, 1000, 0, 'm/s', true, '#166'),
  chargeEnergy: P(6e6, 2e6, 2e7, 3, 'J', true, 'propellant energy per M round (about 1.5 kg of propellant, x 12 with the round, #206); an AP magazine explodes by this alone, HE by this plus the warhead (#91, #183)'),
  hitsToWreck: P(3, 1, 8, 0, 'hits', true, 'a round passing a room cell takes 1 / this of its integrity; the cell it stops in loses (sectional momentum left / R) / this (#203 D, #206)'),
};

// One S round's sectional momentum (#171), with the same arithmetic as
// roundGeometry and sectionalMomentum in projectile.js, so the field stops an
// S round at full strength exactly. withOverrides derives it again from the
// overridden round, so a kinetic override reaches it (#184).
function sRoundStop(kinetic) {
  const mass = kinetic.roundMass.value * FIXED.sizeLinear.value.S ** 3;
  const D = Math.cbrt((4 * mass) / (Math.PI * FIXED.steelDensity.value * FIXED.roundLengthToDiameter.value));
  const A = (Math.PI * D * D) / 4;
  return (mass * kinetic.muzzleVelocity.value) / A;
}
const S_ROUND_STOP = sRoundStop(KINETIC);

export const PARAMS = {
  kinetic: KINETIC,
  armour: {
    cellMass: P(1e4, 3e3, 3e4, 3, 'kg', true, 'one armour cell at T1: 5 cm of steel over 25 m^2, sigma 400 kg/m^2 (L0\'s armour cell, #235); armour fittings are plates on wall segments (armour.plateThickness, #255, #256)'),
    plateThickness: P(0.2, 0.01, 0.4, 1, 'm', true, 'a steel plate on a hull edge or a shared wall segment (walls only, never decks): a path crossing it meets sigma = this x FIXED.steelDensity once (1570 kg/m^2 at 0.2 m); its mass, this x steel density x edge^2, joins its room; 0.2 m is a heavy cruiser\'s belt (an Iowa\'s 0.31 m); k = 1, a plate scales with the cell like the round; approved by the lead designer (#255, #256)'),
  },
  // Protection is the mass on the path (#232): a cell resists c x sigma of
  // sectional momentum, sigma = cell mass / edge^2. c is armour steel's, from
  // L0's calibration: 2.7e5 x 12^(1/3) kg/(m s) over 400 kg/m^2 (#166, #206).
  // Everything that resists follows the cell's mass (#240 (1), 13k.1): burn and
  // blast per kilogram, both calibrated on L0's armour cell (30 MJ and 1 MJ over 10 t).
  matter: {
    kineticResistance: P((2.7e5 * Math.cbrt(12)) / 400, 750, 3125, 0, 'm/s', true, 'c: sectional momentum a cell resists per kg/m^2 of its matter, 1545.4 m/s; a round is as strong per kg of steel (S = c rho L) (#232, #235)'),
    burnEnergyPerKg: P(3000, 1000, 1e4, 0, 'J/kg', true, 'q: beam energy that ruins a cell per kg of the cell; a cell loses P F_i dt / (q x cell mass) of its integrity per step; 30 MJ / 10 t on L0\'s armour cell; 1.2 MJ/kg melts steel, so ruin is 0.25 % of the cell melted along the channel (#240 (1), #243, F1)'),
    blastPerKg: P(100, 30, 300, 0, 'J/kg', true, 'q_b: blast energy a cell absorbs per kg of the cell before it is destroyed; 1 MJ / 10 t on L0\'s armour cell; a hold cell absorbs 0.3 MJ, a reactor cell 15 MJ (#240 (1), (6), #243, F3)'),
  },
  he: {
    blastEnergy: P(2e6, 5e5, 5e6, 3, 'J', true, 'size M HE warhead (#166)'),
    coupling: P(0.5, 0.2, 0.8, 0, '', true, 'fraction of a contact burst\'s energy that enters the hull; the rest vents to space at the open face (#169, #176)'),
  },
  beam: {
    power: P(5e6, 1e6, 2e7, 2, 'W', true, 'size M beam (#166)'),
    // A neutral particle beam from a spinal accelerator (#229, #234): each
    // atom's kinetic energy is gradient x the bay's length (N cells x edge) at
    // T1; at another tier the energy of the same depth in armour cells (#249).
    gradient: P(10 * MEV, 5 * MEV, 20 * MEV, 0, 'J/m', true, '10 MeV/m (1.6022e-12 J/m) at T1, range 5-20 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV (ESS: about 6 MeV/m, cavities 16.7-20 MV/m; #234, #235). k = 0, its T1 meaning: at another tier a bay of N cells fires the energy whose CSDA range in iron, in armour cells of that tier, equals the T1 bay\'s (rooms.js beamEnergy solves it; #249, the power law k = -0.41 withdrawn, #248)'),
  },
  shield: {
    budget: P(1e7, 2e6, 4e7, 2, 'W', true, 'size M absorption rate (#166)'),
    radius: P(40, 20, 80, 1, 'm', true, 'radius where the field is at half strength (#166)'),
    kineticStop: P(S_ROUND_STOP, 0.5 * S_ROUND_STOP, 2 * S_ROUND_STOP, 1, 'kg/(m*s)', true, 'sectional momentum the field stops per round at full strength: one S round at T1, computed (#166, #171)'),
    buffer: P(1e7, 2e6, 4e7, 3, 'J', true, 'energy buffer for impulses (rounds) of an M generator, x its footprint, surviving fraction and power fraction like the budget; k = 3 with the energy it pays, so 5.86 M rounds per buffer at every tier (#177, #240 (4), #243, F15)'),
    powerDraw: P(2e6, 5e5, 1e7, 2, 'W', true, 'size M generator while on; becomes heat, plus everything absorbed (#21, #183)'),
  },
  // Per-room heat (#182, #183). The DESIGN.md names thermal.plant.hot etc.
  // are flattened to plantHot etc. because overrides are group.name.
  thermal: {
    plantHot: P(600, 450, 750, 0, 'K', true, 'reactor, beam bay, shield generator, engine: function degrades (#182, #183)'),
    plantOverheated: P(800, 650, 950, 0, 'K', true, 'plant rooms shut down; restart below hot (#182, #183)'),
    plantCritical: P(1000, 850, 1300, 0, 'K', true, 'plant rooms: crew at their stations die, a reactor melts down (#182, #183)'),
    crewedHot: P(330, 320, 350, 0, 'K', true, 'bridge, quarters, turret, missile bay, hold (#182, #183)'),
    crewedOverheated: P(350, 340, 380, 0, 'K', true, 'crewed rooms shut down; restart below hot (#182, #183)'),
    crewedCritical: P(380, 360, 420, 0, 'K', true, 'crewed rooms: the crew die (#18b, #182, #183)'),
    magazineHot: P(330, 320, 350, 0, 'K', true, 'magazine (#182, #183)'),
    magazineOverheated: P(350, 340, 380, 0, 'K', true, 'magazine (#182, #183)'),
    magazineCritical: P(450, 400, 500, 0, 'K', true, 'magazine cook-off (#91, #182, #183)'),
    // Heat capacity by thermally coupled mass (#240 (1), #243, 13k.2): C = cells x the room
    // type's constant (ROOMS names it), the part that heats on a race's timescale.
    coupledReactor: P(5.5e6, 2e6, 2e7, 3, 'J/K', true, 'per reactor cell: a 50 MW_th PWR\'s primary water (0.09 t/MW_th, 4.5 t, 19 MJ/K) and vessel steel (0.12 t/MW, 6 t, 2.7 MJ/K) over four cells; an estimate scaled from a 3400 MW_th plant (#243)'),
    coupledBeamBay: P(1.0e6, 5e5, 3e6, 3, 'J/K', true, 'per beam bay cell: 2.5 t of accelerator at 400 J/(kg K) (#243)'),
    coupledEngine: P(1.4e6, 5e5, 4e6, 3, 'J/K', true, 'per engine cell: 3.1 t of machinery at 450 J/(kg K) (#243)'),
    coupledShieldGenerator: P(3.2e6, 1e6, 6e6, 3, 'J/K', true, 'per shield generator cell: 7 t of machinery at 450 J/(kg K); no real analogue (#202, #243)'),
    coupledCrewed: P(6e5, 2e5, 2e6, 3, 'J/K', true, 'per bridge, quarters, turret or missile bay cell: the old value kept, air (0.15 MJ/K) and fittings; no source found (#243)'),
    coupledMagazine: P(6e5, 2e5, 2e6, 3, 'J/K', true, 'per magazine cell: 900 kg of rounds (0.4 MJ/K) and racks (#243)'),
    coupledHold: P(1.35e6, 5e5, 3e6, 3, 'J/K', true, 'per hold cell: 3 t of structure, nothing else (#243)'),
    coupledHeatSink: P(1.35e6, 5e5, 3e6, 3, 'J/K', true, 'per heat sink cell before its water: 3 t of structure; x heatsink.capacityFactor, the water adding as before (#198, #243)'),
    coupledArmour: P(4.5e6, 2e6, 8e6, 3, 'J/K', true, 'per armour cell: 10 t of steel (450 J/(kg K)); an armour plate (#256) adds its mass x this / armour.cellMass to its room\'s heat capacity (#258, #248 Q13)'),
    coupledRailgun: P(4.5e6, 2e6, 8e6, 3, 'J/K', true, 'per railgun cell: 10 t of steel; the railgun stays data only until L5 (#243)'),
  },
  // Cell masses by room type (#221, #232, #234, #235): the low end of each
  // type's real range; ROOMS names each type's constant. Contents and a heat
  // sink's water are added as before.
  structure: {
    cellMass: P(3e3, 2e3, 6e3, 3, 'kg', true, 'structure only (frames, decks, bulkheads): hold, magazine and heat sink before contents, and the structure under an engine\'s or a beam bay\'s machinery (#243); 24 kg/m^3 at T1, an estimate without a found source (#221, #235)'),
  },
  cellMass: {
    crewed: P(1.48e4, 1.1e4, 1.65e4, 3, 'kg', true, 'bridge, quarters, missile bay (the turret is structure.cellMass + turret.machineryMass, #285): 118 kg/m^3, ISS Destiny (14.5 t in 8.5 m x 4.3 m), low end; ISS Harmony about 131 kg/m^3 (#234, #235)'),
    reactor: P(1.5e5, 1e5, 2e5, 3, 'kg', true, '1200 kg/m^3: US submarine reactor compartments, 1130 t / (pi 5^2 x 12 m), the cited low end (#234, #235, #243, F24); the 1130 t compartment is a secondary source, contested (650 t for the S5W elsewhere, #281 (1))'),
    shieldGenerator: P(1e4, 5e3, 2e4, 3, 'kg', true, 'no real analogue (the shield is the premise, #202): the old average (#235)'),
    railgun: P(1e4, 5e3, 2e4, 3, 'kg', true, 'no real analogue yet: the old average (#235)'),
  },
  radiator: {
    area: P(25, 10, 100, 2, 'm^2', true, 'one panel per hull segment; radiates emissivity x sigma x area x T^4 of its room (#143, #183)'),
    mass: P(250, 100, 1000, 2, 'kg', true, 'one panel, 10 kg/m^2 like an ISS radiator; at its edge\'s midpoint (#208, #210)'),
  },
  rcs: {
    force: P(1e6, 3e5, 5e6, 2, 'N', true, 'one RCS fitting while fired, along its edge\'s inward normal at the edge\'s midpoint; re-tuned 100 kN -> 1 MN for ships of real density (#15, #208, #210, #221); R1 (about 950 t) turns 90 degrees in a few seconds on its two couples (13k.3)'),
    powerDraw: P(2e5, 5e4, 1e6, 2, 'W', true, 'while fired, from its host room; x engine.heatFraction is heat in the host (#208, #210)'),
    mass: P(200, 50, 1000, 2, 'kg', true, 'one RCS fitting, at its edge\'s midpoint; k = 2: a thruster scales with its force (#208, #210, #243, F11)'),
  },
  reactor: {
    power: P(2e7, 5e6, 5e7, 2, 'W', true, 'size M, electric, delivered on demand; k = 2 matches its consumers (#183)'),
    heatPerPower: P(1, 0.5, 3, 0, '', true, 'waste heat per delivered watt (#183)'),
    decayFraction: P(0.07, 0.03, 0.15, 0, '', true, 'decay heat at SCRAM as a fraction of the thermal power at SCRAM (#81, #183)'),
    decayTime: P(900, 300, 1800, 0, 's', true, 'exponential decay time of the decay heat (#4, #81, #183)'),
    breachFraction: P(0.5, 0.25, 0.75, 0, '', true, 'destroyed cells / total that start the breach countdown (#81, #183)'),
    breachCountdown: P(10, 3, 30, 0, 's', true, 'from breach to explosion (#81, #183)'),
    explosionEnergy: P(2e8, 5e7, 1e9, 3, 'J', true, 'breach and meltdown explosion (#81, #183)'),
    restartTime: P(60, 30, 300, 0, 's', true, 'a SCRAMmed reactor restarts this long after control is back, once below hot (an automatic rule); naval reactors restart in minutes, an estimate (big PWRs take hours for xenon) (#82, #243)'),
  },
  beambay: {
    efficiency: P(0.4, 0.2, 0.8, 0, '', true, 'draw = beam power / efficiency; the rest is heat (#183). A maser-era value (#202), kept for an accelerator plus neutraliser, whose real wall-plug efficiency is probably lower: a question for L5 (#243, F26)'),
    machineryMass: P(2.5e3, 1e3, 6e3, 1, 'kg', true, 'accelerator per beam bay cell: 1 t per metre (#235\'s estimate); k = 1, per metre of length; a cell is structure.cellMass + this (#243, F11)'),
  },
  engine: {
    thrust: P(1.5e7, 4e6, 6e7, 2, 'N', true, 'one engine, a self-fuelled torch; re-tuned 2 -> 15 MN for ships of real density (#54, #183, #203 A, #210, #221); R1 (about 950 t) reaches about 1.6 g (13k.3)'),
    machineryMass: P(2.7e3, 1.5e3, 6e3, 2, 'kg', true, 'engine per cell: a 15 MN engine at the F-1\'s vacuum thrust per kg (7.77 MN / 8.4 t, 925 N/kg) over 6 cells; k = 2 with the thrust; a cell is structure.cellMass + this (#243, F11, F23)'),
    powerDraw: P(1e7, 2e6, 4e7, 2, 'W', true, 'at full throttle; ships have no propellant (#140, #183)'),
    heatFraction: P(0.3, 0.1, 1, 0, '', true, 'heat per watt drawn (#183)'),
    exhaustVelocity: P(1e4, 3e3, 3e4, 0, 'm/s', true, 'a fusion torch\'s jet (chemical 4.5, nuclear-thermal 9, fusion 10-100+ km/s); its jet power, thrust x this / 2 (75 GW at T1 at full thrust), is the exhaust\'s IR brightness, a point at the exhaust face\'s centre (13n.1 (a), #203 A, #278, #289; approved as the plan\'s, #272 (2))'),
  },
  // Senses (L5b, js/sensors.js, DESIGN.md 13n.1 (a), #278, #289): passive at d^-2 against the sensitivity, active by
  // zone at d^4. Approved as the plan's (#272 (2)).
  sensor: {
    area: P(4, 1, 16, 2, 'm^2', true, 'one antenna fitting\'s aperture, a phone-sized fitting on a 5 m segment: an estimate; it receives P x this / (4 pi d^2) from a source of power P at d (13n.1 (a), #278, #289; approved as the plan\'s, #272 (2))'),
    sensitivity: P(1e-3, 1e-4, 1e-2, 2, 'W', true, 'the least received power an antenna resolves, IR and EM alike; chosen so a panel at rest fades at 1.7 km (the band\'s top) and one at plant hot holds to 7.3 km; no source beyond the chosen band (13n.1 (a), #278, #289; approved as the plan\'s, #272 (2))'),
    scanPower: P(1e5, 2e4, 5e5, 2, 'W', true, 'an antenna\'s draw from its host while it scans (heat in the host), and its EM brightness: a ship radar\'s peak at a tenth (13n.1 (a), #278, #289; approved as the plan\'s, #272 (2))'),
    scanTime: P(4, 2, 10, 0, 's', true, 'one zone at sensor.scanRange; at d a zone takes this x (d / scanRange)^4, the radar law (13n.1 (a), #278, #289; approved as the plan\'s, #272 (2))'),
    scanRange: P(900, 500, 2000, 1, 'm', true, 'the reference range, battle.openingRange\'s band; k = 1 so a zone at the same distance in cells takes the same time at every tier (#273 (3), 13n.1 (a), #278, #289; approved as the plan\'s, #272 (2))'),
    mass: P(1e3, 250, 4e3, 2, 'kg', true, 'one antenna fitting at its edge\'s midpoint, 250 kg/m^2 of aperture: an estimate, no source (#289; approved as the plan\'s, #272 (2))'),
  },
  turret: {
    fireRate: P(0.5, 0.2, 2, -1, '1/s', true, 'size M; big guns fire slower (#183)'),
    powerDraw: P(2e5, 5e4, 1e6, 2, 'W', true, 'size M, while able to fire (#183)'),
    heatPerShot: P(3e5, 1e5, 1e6, 3, 'J', true, 'size M (#183)'),
    machineryMass: P(1975, 1750, 2500, 3, 'kg', true, 'mount per turret cell: the OTO Melara 76/62 Super Rapid without ammunition, 7.9 t (the manufacturer\'s brochure through a mirror; 7.62 t on navweaps) over an M turret\'s four cells; the Bofors 57 Mk3\'s 7.0 t the floor; a cell is structure.cellMass + this, as the engine\'s (#281 (2), #285; approved as the plan\'s, #272 (2))'),
    readyRounds: P(4, 2, 10, 0, 'rounds', true, 'rounds held in the turret, of its own size; it fires from this store and the magazine feed refills it (#193, #195)'),
  },
  magazine: {
    capacity: P(900, 300, 3000, 3, 'kg', true, 'ammunition mass a magazine holds: 150 M rounds (#91, #183, #206)'),
    detonationSpeed: P(400, 200, 600, 0, 'm/s', true, 'a magazine with rounds detonates when a round enters one of its cells at this speed or more (relative to the hull; the round rule\'s momentum on entering over the round\'s mass, whether it stops there or passes); a destroyed cell alone no longer detonates it: between an M round after one crewed cell (333 m/s) and after a shield generator cell (485 m/s), so a crewed screen protects against M rounds, not L; the first rung-1 lever of the L5 pace study (#273 (c), #278; approved as the plan\'s, #272 (2))'),
  },
  quarters: {
    crewPerCell: P(4, 1, 8, 2, 'crew', true, 'crew housed per surviving cell: 24 in a T1 quarters, 6 m^2 of a 25 m^2 cell per sleeper (a warship\'s berthing); 3 -> 4 so R1\'s 20 crew have berths (validateShip\'s crew rule) (#60, #65, #183, #220 (5), #253)'),
    powerDraw: P(5e4, 1e4, 2e5, 2, 'W', true, '#183'),
  },
  repair: {
    massRate: P(200, 50, 1000, 0, 'kg/s', true, 'cell mass a quarters restores per second with all cells surviving: a cell regains massRate / cell mass of integrity per second; the old 0.02/s on a 10 t cell (#51, #183, #240 (1), #243, F13)'),
    radius: P(30, 10, 80, 1, 'm', true, 'half-strength radius of the repair field (#99, #183)'),
  },
  bridge: {
    powerDraw: P(1e5, 2e4, 5e5, 2, 'W', true, 'from the backup supply when the reactor is cut; the backup has no limit (#147, #183)'),
  },
  // Flows through shared walls (L2, DESIGN.md 13d.1, #192, #193, #195).
  conduction: {
    wall: P(4e3, 1e3, 2e4, 1, 'W/(K*m)', true, 'coolant wall (between two coolant rooms, the machinery\'s coolant loop) per metre of live wall: G = this x L x harmonic mean of the two rooms\' coolant factors; two M rooms over 10 m relax with tau = 30 s (#193, #195, #200, #201)'),
    passive: P(25, 5, 100, 1, 'W/(K*m)', true, 'passive wall (every wall with a crewed room, a magazine or a hold on either side) per metre of live wall: G = this x L x harmonic mean of the passive factors; a steel bulkhead with air on both sides, about 250 W/K for 10 m x 5 m (#200, #201)'),
    holdFactor: P(0.1, 0.02, 0.3, 0, '', true, 'passive factor of an empty hold (every other room 1), on passive walls since #201; a hold-room passive wall conducts 0.18 of an ordinary one (#18c, #193, #195, #201)'),
  },
  lifeSupport: {
    capacityPerCell: P(5e4, 1e4, 2e5, 2, 'W', true, 'heat a powered crewed room or magazine above the setpoint pumps into its coolant neighbours, per surviving cell: bridge 200 kW, quarters 300 kW, magazine 200 kW (#201)'),
  },
  heatsink: {
    capacityFactor: P(5, 2, 10, 0, '', true, 'a heat sink\'s heat capacity per cell is thermal.coupledHeatSink x this; the extra (this - 1) is water (#198, #201, #243)'),
    conductivityFactor: P(3, 1, 5, 0, '', true, 'a heat sink\'s coolant factor in the harmonic mean of coolant walls (#198, #201)'),
  },
  power: {
    wallCapacity: P(2e6, 5e5, 5e6, 1, 'W/m', true, 'power a live shared wall carries per metre: 10 m carries 20 MW, a whole M reactor (#12, #193, #195)'),
  },
  ammo: {
    wallFeed: P(0.72, 0.24, 3.6, 1, 'kg/(s*m)', true, 'rounds a live wall between a magazine and a room it feeds carries per second per metre: 5 m feeds 3.6 kg/s, 0.6 M rounds/s (#18, #193, #195, #206)'),
  },
  // Battle-level rules (#82, #83, #222 (7), #243, #253): the battle loop (js/battle.js, 13l.1).
  battle: {
    cullDistance: P(3000, 1000, 1e4, 1, 'm', true, 'a round or debris farther than this from every body leaves play, its momentum booked as left; twice the engagement band (#54, #222 (7), #243)'),
    openingRange: P(900, 500, 2000, 1, 'm', true, 'the attacker\'s distance from the target\'s centre of mass when a battle opens (createBattle\'s default); #54\'s band; k = 1 so the dodge in one time of flight is the same number of cells at every tier (T2 of the L4 physics audit, §17 item 35, #270 (9))'),
    disabledSeconds: P(10, 3, 30, 0, 's', true, 'no weapon able to fire for this long, whatever the engine does: Disabled (#82, #243, #255)'),
    wreckFraction: P(0.5, 0.3, 0.8, 0, '', true, 'a ship whose largest fragment holds less than this fraction of its mass at undock has broken into too many pieces: destroyed (#83, #253)'),
  },
  // Crew a room needs to be placed (#60, #183): measured at L3. Range 1-3x.
  crewRequired: {
    bridge: P(4, 4, 12, 2, 'crew', true, '#183'),
    reactor: P(4, 4, 12, 2, 'crew', true, '#183'),
    engine: P(2, 2, 6, 2, 'crew', true, '#183'),
    magazine: P(2, 2, 6, 2, 'crew', true, '#183'),
    shieldGenerator: P(2, 2, 6, 2, 'crew', true, '#183'),
    beamBay: P(3, 3, 9, 2, 'crew', true, '#183'),
    turret: P(3, 3, 9, 2, 'crew', true, '#183'),
    railgun: P(4, 4, 12, 2, 'crew', true, '#183'),
    missileBay: P(3, 3, 9, 2, 'crew', true, '#183'),
  },
};

// Rooms (DESIGN.md 5.2, 13c). Footprints in cells per size (rate-like
// constants of an L room are sizeLinear.L^2 = 9/4 of M, #183); placement;
// threshold class (#182); crew: the crewRequired constant, or 'housed' for
// the quarters; draws and powers name their PARAMS constant. A room's
// conductivity factors name their PARAMS constant; a room without one has
// factor 1 (#193). The L magazine (3x3) is the one L2.size.rule
// needs (DESIGN.md 13d.2 row 11): 9/4 of the M cells, as every other L room.
// loop (#200, #201): 'coolant' rooms (plant rooms and the heat sink) share
// the machinery's coolant loop through walls with each other; every other
// room is 'passive'. coolantFactor and passiveFactor name their PARAMS
// constant (default 1); capacityFactor multiplies the heat capacity per cell.
// Blast resistance follows the cell's mass (matter.blastPerKg, #240 (6)): a hold's
// blast buffering of #18c is gone (no physics for a free-volume buffer was written).
// lifeSupport marks the rooms whose air life support keeps cool (#201).
// A spinal room (the beam bay, #234) is N cells long along the ship's axis (x
// at rotation 0): N >= spinal.min, given when it is placed; its footprint
// below is its default length (the beam bay: M 2 x 2, L 3 x 3, its sizes
// before #234). cellMass names the PARAMS constant of one cell's mass (#235), or
// a list of constants that add (structure + machinery, #243); heatCapacity names
// the room type's thermally coupled heat capacity per cell (#240 (1), #243).
export const ROOMS = {
  bridge: { footprint: { M: [2, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.bridge', draw: 'bridge.powerDraw', cellMass: 'cellMass.crewed', heatCapacity: 'thermal.coupledCrewed' },
  reactor: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.reactor', power: 'reactor.power', cellMass: 'cellMass.reactor', heatCapacity: 'thermal.coupledReactor' },
  engine: { footprint: { M: [2, 3] }, placement: 'aft hull, exhaust clear', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.engine', draw: 'engine.powerDraw', cellMass: ['structure.cellMass', 'engine.machineryMass'], heatCapacity: 'thermal.coupledEngine' },
  magazine: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'magazine', loop: 'passive', lifeSupport: true, crew: 'crewRequired.magazine', cellMass: 'structure.cellMass', heatCapacity: 'thermal.coupledMagazine' },
  // A plant room that may carry fittings, placed anywhere (#219 (1), #222 (2)).
  shieldGenerator: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'anywhere', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.shieldGenerator', draw: 'shield.powerDraw', cellMass: 'cellMass.shieldGenerator', heatCapacity: 'thermal.coupledShieldGenerator' },
  quarters: { footprint: { M: [3, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'housed', draw: 'quarters.powerDraw', cellMass: 'cellMass.crewed', heatCapacity: 'thermal.coupledCrewed' },
  beamBay: { footprint: { M: [2, 2], L: [3, 3] }, spinal: { min: 2 }, placement: 'hull, axis, bow clear', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.beamBay', draw: 'beam.power / beambay.efficiency', cellMass: ['structure.cellMass', 'beambay.machineryMass'], heatCapacity: 'thermal.coupledBeamBay' },
  turret: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.turret', draw: 'turret.powerDraw', cellMass: ['structure.cellMass', 'turret.machineryMass'], heatCapacity: 'thermal.coupledCrewed' },
  railgun: { footprint: { M: [2, 'N'] }, placement: 'axis', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.railgun', cellMass: 'cellMass.railgun', heatCapacity: 'thermal.coupledRailgun' },
  missileBay: { footprint: { M: [3, 2] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.missileBay', cellMass: 'cellMass.crewed', heatCapacity: 'thermal.coupledCrewed' },
  hold: { footprint: { M: [2, 2] }, placement: 'anywhere', thermalClass: 'crewed', loop: 'passive', crew: null, passiveFactor: 'conduction.holdFactor', cellMass: 'structure.cellMass', heatCapacity: 'thermal.coupledHold' },
  heatSink: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'anywhere', thermalClass: 'plant', loop: 'coolant', crew: null, capacityFactor: 'heatsink.capacityFactor', coolantFactor: 'heatsink.conductivityFactor', cellMass: 'structure.cellMass', heatCapacity: 'thermal.coupledHeatSink' },
};

/** Value of a tunable constant at a cell edge. */
export function scaled(param, edge = BASE_EDGE) {
  return param.value * pow(edge / BASE_EDGE, param.k);
}

/**
 * A deep copy of PARAMS with run-time overrides { 'beam.power': 8e6 } applied.
 * shield.kineticStop is derived from the (overridden) round unless it is
 * overridden itself (#171, #184).
 */
export function withOverrides(overrides = {}) {
  const params = JSON.parse(JSON.stringify(PARAMS));
  for (const [path, value] of Object.entries(overrides)) {
    const [group, name] = path.split('.');
    const p = params[group] && params[group][name];
    if (!p) throw new Error(`unknown constant ${path}`);
    p.value = value;
  }
  if (!('shield.kineticStop' in overrides)) {
    const stop = sRoundStop(params.kinetic), p = params.shield.kineticStop;
    Object.assign(p, { value: stop, min: 0.5 * stop, max: 2 * stop });
  }
  return params;
}

// Player-facing text lives here too (none yet: Mission 0 is text-only tooling).
export const TEXT = {};
