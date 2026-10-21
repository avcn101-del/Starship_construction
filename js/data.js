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

// Fixed constants: real physical values or geometric choices, not tunable.
export const FIXED = {
  steelDensity: { value: 7850, unit: 'kg/m^3', note: 'real density of steel; kinetic rounds are steel' },
  roundLengthToDiameter: { value: 4, unit: '', note: 'shape of a kinetic round (a cylinder 4 diameters long)' },
  sizeLinear: { value: { S: 2 / 3, M: 1, L: 3 / 2 }, unit: '', note: 'linear size of S and L relative to M (mass scales with its cube)' },
  beamWaistPerHalfCell: { value: 1 / Math.SQRT2, unit: '', note: 'beam waist radius as a fraction of the target aperture radius (half a cell edge)' },
  shieldFalloffExponent: { value: 2, unit: '', note: 'shield field strength g(r) = 1 / (1 + (r / radius)^n)' },
  simStep: { value: 1 / 60, unit: 's', note: 'simulation time step (#175)' },
  burnTimeLimit: { value: 3600, unit: 's', note: 'a beam burn gives up after this long (#175)' },
  stefanBoltzmann: { value: 5.670374e-8, unit: 'W/(m^2*K^4)', note: 'real Stefan-Boltzmann constant (#143, #183)' },
  restTemperature: { value: 290, unit: 'K', note: 'rooms start here; space (3 K) is taken as 0 (#182, #183)' },
  radiatorEmissivity: { value: 0.9, unit: '', note: 'radiator.emissivity in DESIGN.md 13c.3: real, a dark panel (#182, #183)' },
  repairFalloffExponent: { value: 2, unit: '', note: 'repair field strength g(r) = 1 / (1 + (r / radius)^n), like the shield (#99, #183)' },
  lifeSupportSetpoint: { value: 295, unit: 'K', note: 'the air temperature life support holds in crewed rooms and magazines (#201)' },
};

const KINETIC = {
  roundMass: P(0.5, 0.2, 2, 3, 'kg', true, 'size M round at T1 (#166)'),
  muzzleVelocity: P(800, 500, 1000, 0, 'm/s', true, '#166'),
  chargeEnergy: P(5e5, 2e5, 2e6, 3, 'J', true, 'propellant energy per M round; an AP magazine explodes by this alone, HE by this plus the warhead (#91, #183)'),
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
    // An AP M round carries 6.85e5 kg/(m*s) of sectional momentum; 2.7e5 per
    // cell lets it pass 2 cells and stop in the 3rd (#166: 2-3 cells).
    kineticResistance: P(2.7e5, 1.35e5, 5.4e5, 1, 'kg/(m*s)', true, 'sectional momentum one armour cell absorbs (#165, #166)'),
    blastResistance: P(1e6, 3e5, 3e6, 3, 'J', true, 'blast energy one armour cell absorbs before it is destroyed (#177)'),
    burnEnergy: P(3e7, 1e7, 1e8, 3, 'J', true, 'beam energy that burns through one armour cell (#177)'),
  },
  room: {
    kineticResistance: P(6.75e4, 3e4, 1.4e5, 1, 'kg/(m*s)', true, 'sectional momentum one ordinary room cell absorbs, a quarter of armour (#177)'),
    blastResistance: P(5e5, 2e5, 2e6, 3, 'J', true, 'blast energy one ordinary room cell absorbs before it is destroyed, half an armour cell; a room fills up to surviving cells x this before passing the excess on (#193, #195)'),
  },
  he: {
    blastEnergy: P(2e6, 5e5, 5e6, 3, 'J', true, 'size M HE warhead (#166)'),
    coupling: P(0.5, 0.2, 0.8, 0, '', true, 'fraction of a contact burst\'s energy that enters the hull; the rest vents to space at the open face (#169, #176)'),
  },
  beam: {
    power: P(5e6, 1e6, 2e7, 2, 'W', true, 'size M beam (#166)'),
    focusRange: P(600, 300, 1500, 1, 'm', true, 'Rayleigh range of the Gaussian beam (#165, #166)'),
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
  radiator: {
    area: P(25, 10, 100, 2, 'm^2', true, 'one panel per hull segment; radiates emissivity x sigma x area x T^4 of its room (#143, #183)'),
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
    thrust: P(8e6, 2e6, 3e7, 2, 'N', true, 'one engine; k = 2 makes big ships sluggish (#54, #183)'),
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
    capacity: P(75, 25, 250, 3, 'kg', true, 'ammunition mass a magazine holds: 150 M rounds (#91, #183)'),
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
    wallFeed: P(0.06, 0.02, 0.3, 1, 'kg/(s*m)', true, 'rounds a live wall between a magazine and a room it feeds carries per second per metre: 5 m feeds 0.3 kg/s (#18, #193, #195)'),
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
export const ROOMS = {
  bridge: { footprint: { M: [2, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.bridge', draw: 'bridge.powerDraw' },
  reactor: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.reactor', power: 'reactor.power' },
  engine: { footprint: { M: [2, 3] }, placement: 'aft hull, exhaust clear', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.engine', draw: 'engine.powerDraw' },
  magazine: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'magazine', loop: 'passive', lifeSupport: true, crew: 'crewRequired.magazine' },
  shieldGenerator: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'inside', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.shieldGenerator', draw: 'shield.powerDraw' },
  quarters: { footprint: { M: [3, 2] }, placement: 'inside', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'housed', draw: 'quarters.powerDraw' },
  beamBay: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'hull', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.beamBay', draw: 'beam.power / beambay.efficiency' },
  turret: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.turret', draw: 'turret.powerDraw' },
  railgun: { footprint: { M: [2, 'N'] }, placement: 'axis', thermalClass: 'plant', loop: 'coolant', crew: 'crewRequired.railgun' },
  missileBay: { footprint: { M: [3, 2] }, placement: 'hull', thermalClass: 'crewed', loop: 'passive', lifeSupport: true, crew: 'crewRequired.missileBay' },
  hold: { footprint: { M: [2, 2] }, placement: 'anywhere', thermalClass: 'crewed', loop: 'passive', crew: null, passiveFactor: 'conduction.holdFactor', blastFactor: 'hold.blastFactor' },
  heatSink: { footprint: { M: [2, 2], L: [3, 3] }, placement: 'anywhere', thermalClass: 'plant', loop: 'coolant', crew: null, capacityFactor: 'heatsink.capacityFactor', coolantFactor: 'heatsink.conductivityFactor' },
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
