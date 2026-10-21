// data.js — every number that affects the game.
// Units are SI (DESIGN.md §13, #163). A tunable constant is
//   { value, min, max, k, unit, approved, note }
// where value is the T1 base (cell edge 5 m) and k is the scaling exponent on
// the cell edge: scaled = value * (edge / BASE_EDGE) ** k  (DESIGN.md §5.1).
// approved: false marks a constant whose range the owner has not approved yet;
// agents may not tune it (CLAUDE.md, Agents).

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
  beamWaistPerHalfCell: { value: 1 / Math.SQRT2, unit: '', note: 'SUPERSEDED (#230/#232): kept only for proto/ and withdrawn scenarios until prototype v2; no kernel use. Was: the Gaussian maser\'s waist radius as a fraction of half a cell edge' },
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
    // An AP M round carries 1.568e6 kg/(m*s) of sectional momentum; 2.7e5 x
    // 12^(1/3) per cell lets it pass 2 cells and stop in the 3rd (#166: 2-3
    // cells). The factor keeps every depth of the 0.5 kg round with the 6 kg
    // one: sectional momentum grows as m^(1/3) at fixed shape and speed (#206).
    kineticResistance: P(2.7e5 * Math.cbrt(12), 3e5, 1.25e6, 1, 'kg/(m*s)', true, 'SUPERSEDED (#230/#232): kept only for proto/ and withdrawn scenarios until prototype v2; no kernel use. Was: sectional momentum one armour cell absorbs, replaced by matter.kineticResistance x sigma (#165, #166, #206, #235)'),
    blastResistance: P(1e6, 3e5, 3e6, 3, 'J', true, 'blast energy one armour cell absorbs before it is destroyed (#177)'),
    burnEnergy: P(3e7, 1e7, 1e8, 3, 'J', true, 'beam energy that ruins any cell along the beam\'s channel: a cell loses P F_i dt / this of its integrity per step (#177, #235; 30 MJ melts about 25 kg of steel, 13i.1)'),
    cellMass: P(1e4, 3e3, 3e4, 3, 'kg', true, 'one armour cell at T1: 5 cm of steel over 25 m^2, sigma 400 kg/m^2 (L0\'s armour cell; armour fittings come later, #15, #235)'),
  },
  room: {
    blastResistance: P(5e5, 2e5, 2e6, 3, 'J', true, 'blast energy one ordinary room cell absorbs before it is destroyed, half an armour cell; a room fills up to surviving cells x this before passing the excess on (#193, #195)'),
  },
  // Protection is the mass on the path (#232): a cell resists c x sigma of
  // sectional momentum, sigma = cell mass / edge^2. c is armour steel's, from
  // L0's calibration: 2.7e5 x 12^(1/3) kg/(m s) over 400 kg/m^2 (#166, #206).
  matter: {
    kineticResistance: P((2.7e5 * Math.cbrt(12)) / 400, 750, 3125, 0, 'm/s', true, 'c: sectional momentum a cell resists per kg/m^2 of its matter, 1545.4 m/s; a round is as strong per kg of steel (S = c rho L) (#232, #235)'),
  },
  he: {
    blastEnergy: P(2e6, 5e5, 5e6, 3, 'J', true, 'size M HE warhead (#166)'),
    coupling: P(0.5, 0.2, 0.8, 0, '', true, 'fraction of a contact burst\'s energy that enters the hull; the rest vents to space at the open face (#169, #176)'),
  },
  beam: {
    power: P(5e6, 1e6, 2e7, 2, 'W', true, 'size M beam (#166)'),
    focusRange: P(600, 300, 1500, 1, 'm', true, 'SUPERSEDED (#230/#232): kept only for proto/ and withdrawn scenarios until prototype v2; no kernel use. Was: the Rayleigh range of the Gaussian maser; no falloff at battle range (#165, #166, #235)'),
    // A neutral particle beam from a spinal accelerator (#229, #234): each
    // atom's kinetic energy is gradient x the bay's length (N cells x edge).
    gradient: P(10 * MEV, 5 * MEV, 20 * MEV, 0, 'J/m', true, '10 MeV/m (1.6022e-12 J/m), range 5-20 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV (ESS: about 6 MeV/m, cavities 16.7-20 MV/m; #234, #235)'),
  },
  shield: {
    budget: P(1e7, 2e6, 4e7, 2, 'W', true, 'size M absorption rate (#166)'),
    radius: P(40, 20, 80, 1, 'm', true, 'radius where the field is at half strength (#166)'),
    kineticStop: P(S_ROUND_STOP, 0.5 * S_ROUND_STOP, 2 * S_ROUND_STOP, 1, 'kg/(m*s)', true, 'sectional momentum the field stops per round at full strength: one S round at T1, computed (#166, #171)'),
    bufferSeconds: P(1, 0.2, 5, 0, 's', true, 'buffer for impulses (rounds, blasts) = budget x this; must show a measured effect by L2 or be cut (#177)'),
    powerDraw: P(2e6, 5e5, 1e7, 2, 'W', true, 'size M generator while on; becomes heat, plus everything absorbed (#21, #183)'),
  },
  // Per-room heat (#182, #183). The DESIGN.md names thermal.plant.hot etc.
  // are flattened to plantHot etc. because overrides are group.name.
  thermal: {
    heatCapacityPerCell: P(6e5, 2e5, 2e6, 3, 'J/K', true, 'C = cells x this; sets the pace of every heat race (#182, #183)'),
    plantHot: P(600, 450, 750, 0, 'K', true, 'reactor, beam bay, shield generator, engine: function degrades (#182, #183)'),
    plantOverheated: P(800, 650, 950, 0, 'K', true, 'plant rooms shut down; restart below hot (#182, #183)'),
    plantCritical: P(1000, 850, 1300, 0, 'K', true, 'plant rooms: crew at their stations die, a reactor melts down (#182, #183)'),
    crewedHot: P(330, 320, 350, 0, 'K', true, 'bridge, quarters, turret, missile bay, hold (#182, #183)'),
    crewedOverheated: P(350, 340, 380, 0, 'K', true, 'crewed rooms shut down; restart below hot (#182, #183)'),
    crewedCritical: P(380, 360, 420, 0, 'K', true, 'crewed rooms: the crew die (#18b, #182, #183)'),
    magazineHot: P(330, 320, 350, 0, 'K', true, 'magazine (#182, #183)'),
    magazineOverheated: P(350, 340, 380, 0, 'K', true, 'magazine (#182, #183)'),
    magazineCritical: P(450, 400, 500, 0, 'K', true, 'magazine cook-off (#91, #182, #183)'),
  },
  // Cell masses by room type (#221, #232, #234, #235): the low end of each
  // type's real range; ROOMS names each type's constant. Contents and a heat
  // sink's water are added as before.
  structure: {
    cellMass: P(3e3, 2e3, 6e3, 3, 'kg', true, 'structure only (frames, decks, bulkheads): hold, magazine and heat sink before contents; 24 kg/m^3 at T1, an estimate without a found source (#221, #235)'),
  },
  cellMass: {
    crewed: P(1.48e4, 1.1e4, 1.65e4, 3, 'kg', true, 'bridge, quarters, turret, missile bay: 118 kg/m^3, ISS Destiny (14.5 t in 8.5 m x 4.3 m), low end; ISS Harmony about 131 kg/m^3 (#234, #235)'),
    reactor: P(1.25e5, 1e5, 2e5, 3, 'kg', true, '1000 kg/m^3: US submarine reactor compartments, 1130-1680 t in about 10 m x 12 m, low end (#234, #235)'),
    engine: P(6.1e3, 4e3, 1.2e4, 3, 'kg', true, 'structure 3 t + a 15 MN engine at the Saturn F-1\'s thrust per tonne (8.4 t for 6.8 MN) over 6 cells, an estimate (#235)'),
    beamBay: P(5.5e3, 4e3, 1.2e4, 3, 'kg', true, 'structure 3 t + about 1 t of accelerator per metre over a 2-cell slice, an estimate (#235)'),
    shieldGenerator: P(1e4, 5e3, 2e4, 3, 'kg', true, 'no real analogue (the shield is the premise, #202): the old average (#235)'),
    railgun: P(1e4, 5e3, 2e4, 3, 'kg', true, 'no real analogue yet: the old average (#235)'),
  },
  radiator: {
    area: P(25, 10, 100, 2, 'm^2', true, 'one panel per hull segment; radiates emissivity x sigma x area x T^4 of its room (#143, #183)'),
    mass: P(250, 100, 1000, 2, 'kg', true, 'one panel, 10 kg/m^2 like an ISS radiator; at its edge\'s midpoint (#208, #210)'),
  },
  rcs: {
    force: P(1e6, 3e5, 5e6, 2, 'N', true, 'one RCS fitting while fired, along its edge\'s inward normal at the edge\'s midpoint; re-tuned 100 kN -> 1 MN for ships of real density: a 2500 t corvette turns 90 degrees in about 10 s on two couples 60 m out (#15, #208, #210, #221)'),
    powerDraw: P(2e5, 5e4, 1e6, 2, 'W', true, 'while fired, from its host room; x engine.heatFraction is heat in the host (#208, #210)'),
    mass: P(200, 50, 1000, 3, 'kg', true, 'one RCS fitting, at its edge\'s midpoint (#208, #210)'),
  },
  reactor: {
    power: P(2e7, 5e6, 5e7, 2, 'W', true, 'size M, electric, delivered on demand; k = 2 matches its consumers (#183)'),
    heatPerPower: P(1, 0.5, 3, 0, '', true, 'waste heat per delivered watt (#183)'),
    decayFraction: P(0.07, 0.03, 0.15, 0, '', true, 'decay heat at SCRAM as a fraction of the thermal power at SCRAM (#81, #183)'),
    decayTime: P(900, 300, 1800, 0, 's', true, 'exponential decay time of the decay heat (#4, #81, #183)'),
    breachFraction: P(0.5, 0.25, 0.75, 0, '', true, 'destroyed cells / total that start the breach countdown (#81, #183)'),
    breachCountdown: P(10, 3, 30, 0, 's', true, 'from breach to explosion (#81, #183)'),
    explosionEnergy: P(2e8, 5e7, 1e9, 3, 'J', true, 'breach and meltdown explosion (#81, #183)'),
  },
  beambay: {
    efficiency: P(0.4, 0.2, 0.8, 0, '', true, 'draw = beam power / efficiency; the rest is heat (#183)'),
  },
  engine: {
    thrust: P(1.5e7, 4e6, 6e7, 2, 'N', true, 'one engine, a self-fuelled torch; re-tuned 2 -> 15 MN for ships of real density: a 2500 t corvette with two reaches about 1.2 g (#54, #183, #203 A, #210, #221)'),
    powerDraw: P(1e7, 2e6, 4e7, 2, 'W', true, 'at full throttle; ships have no propellant (#140, #183)'),
    heatFraction: P(0.3, 0.1, 1, 0, '', true, 'heat per watt drawn (#183)'),
  },
  turret: {
    fireRate: P(0.5, 0.2, 2, -1, '1/s', true, 'size M; big guns fire slower (#183)'),
    powerDraw: P(2e5, 5e4, 1e6, 2, 'W', true, 'size M, while able to fire (#183)'),
    heatPerShot: P(3e5, 1e5, 1e6, 3, 'J', true, 'size M (#183)'),
    readyRounds: P(4, 2, 10, 0, 'rounds', true, 'rounds held in the turret, of its own size; it fires from this store and the magazine feed refills it (#193, #195)'),
  },
  magazine: {
    capacity: P(900, 300, 3000, 3, 'kg', true, 'ammunition mass a magazine holds: 150 M rounds (#91, #183, #206)'),
  },
  quarters: {
    crewPerCell: P(3, 1, 8, 2, 'crew', true, 'crew housed per surviving cell: 18 in a T1 quarters (#60, #65, #183)'),
    powerDraw: P(5e4, 1e4, 2e5, 2, 'W', true, '#183'),
  },
  repair: {
    rate: P(0.02, 0.005, 0.1, 0, '1/s', true, 'integrity per second at the quarters with all cells surviving (#51, #183)'),
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
    capacityFactor: P(5, 2, 10, 0, '', true, 'a heat sink\'s heat capacity per cell is thermal.heatCapacityPerCell x this; a water or phase-change store (#198, #201)'),
    conductivityFactor: P(3, 1, 5, 0, '', true, 'a heat sink\'s coolant factor in the harmonic mean of coolant walls (#198, #201)'),
  },
  power: {
    wallCapacity: P(2e6, 5e5, 5e6, 1, 'W/m', true, 'power a live shared wall carries per metre: 10 m carries 20 MW, a whole M reactor (#12, #193, #195)'),
  },
  ammo: {
    wallFeed: P(0.72, 0.24, 3.6, 1, 'kg/(s*m)', true, 'rounds a live wall between a magazine and a room it feeds carries per second per metre: 5 m feeds 3.6 kg/s, 0.6 M rounds/s (#18, #193, #195, #206)'),
  },
  hold: {
    blastFactor: P(4, 2, 10, 0, '', true, 'an empty hold absorbs this many times the blast of an ordinary room cell (#18c, #193, #195)'),
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
// conductivity and blast factors name their PARAMS constant; a room without
// one has factor 1 (#193). The L magazine (3x3) is the one L2.size.rule
// needs (DESIGN.md 13d.2 row 11): 9/4 of the M cells, as every other L room.
// loop (#200, #201): 'coolant' rooms (plant rooms and the heat sink) share
// the machinery's coolant loop through walls with each other; every other
// room is 'passive'. coolantFactor and passiveFactor name their PARAMS
// constant (default 1); capacityFactor multiplies the heat capacity per cell.
// lifeSupport marks the rooms whose air life support keeps cool (#201).
// A spinal room (the beam bay, #234) is N cells long along the ship's axis (x
// at rotation 0): N >= spinal.min, given when it is placed; its footprint
// below is its default length (the beam bay: M 2 x 2, L 3 x 3, its sizes
// before #234). cellMass names the PARAMS constant of one cell's mass (#235).
export const ROOMS = {
  bridge: { footprint: { M: [2, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.bridge', draw: 'bridge.powerDraw', cellMass: 'cellMass.crewed' },
  reactor: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.reactor', power: 'reactor.power', cellMass: 'cellMass.reactor' },
  engine: { footprint: { M: [2, 3] }, placement: 'aft hull, exhaust clear', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.engine', draw: 'engine.powerDraw', cellMass: 'cellMass.engine' },
  magazine: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'magazine', loop: 'passive', lifeSupport: true, crew: 'crewRequired.magazine', cellMass: 'structure.cellMass' },
  // A plant room that may carry fittings, placed anywhere (#219 (1), #222 (2)).
  shieldGenerator: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'anywhere', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.shieldGenerator', draw: 'shield.powerDraw', cellMass: 'cellMass.shieldGenerator' },
  quarters: { footprint: { M: [3, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'housed', draw: 'quarters.powerDraw', cellMass: 'cellMass.crewed' },
  beamBay: { footprint: { M: [2, 2], L: [3, 3] }, spinal: { min: 2 }, placement: 'hull, axis, bow clear', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.beamBay', draw: 'beam.power / beambay.efficiency', cellMass: 'cellMass.beamBay' },
  turret: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.turret', draw: 'turret.powerDraw', cellMass: 'cellMass.crewed' },
  railgun: { footprint: { M: [2, 'N'] }, placement: 'axis', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.railgun', cellMass: 'cellMass.railgun' },
  missileBay: { footprint: { M: [3, 2] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.missileBay', cellMass: 'cellMass.crewed' },
  hold: { footprint: { M: [2, 2] }, placement: 'anywhere', thermalClass: 'crewed', loop: 'passive', crew: null, passiveFactor: 'conduction.holdFactor', blastFactor: 'hold.blastFactor', cellMass: 'structure.cellMass' },
  heatSink: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'anywhere', thermalClass: 'plant', loop: 'coolant', crew: null, capacityFactor: 'heatsink.capacityFactor', coolantFactor: 'heatsink.conductivityFactor', cellMass: 'structure.cellMass' },
};

/** Value of a tunable constant at a cell edge. */
export function scaled(param, edge = BASE_EDGE) {
  return param.value * (edge / BASE_EDGE) ** param.k;
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
