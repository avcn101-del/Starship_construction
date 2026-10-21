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
};

const KINETIC = {
  roundMass: P(0.5, 0.2, 2, 3, 'kg', true, 'size M round at T1 (#166)'),
  muzzleVelocity: P(800, 500, 1000, 0, 'm/s', true, '#166'),
};

// One S round's sectional momentum at T1 (#171), with the same arithmetic as
// roundGeometry and sectionalMomentum in projectile.js, so the field stops an
// S round at full strength exactly.
const S_ROUND_STOP = (() => {
  const mass = KINETIC.roundMass.value * FIXED.sizeLinear.value.S ** 3;
  const D = Math.cbrt((4 * mass) / (Math.PI * FIXED.steelDensity.value * FIXED.roundLengthToDiameter.value));
  const A = (Math.PI * D * D) / 4;
  return (mass * KINETIC.muzzleVelocity.value) / A;
})();

export const PARAMS = {
  kinetic: KINETIC,
  armour: {
    // An AP M round carries 6.85e5 kg/(m*s) of sectional momentum; 2.7e5 per
    // cell lets it pass 2 cells and stop in the 3rd (#166: 2-3 cells).
    kineticResistance: P(2.7e5, 1.35e5, 5.4e5, 1, 'kg/(m*s)', true, 'sectional momentum one armour cell absorbs (#165, #166)'),
    blastResistance: P(1e6, 3e5, 3e6, 3, 'J', false, 'blast energy one armour cell absorbs before it is destroyed (provisional)'),
    burnEnergy: P(3e7, 1e7, 1e8, 3, 'J', false, 'beam energy that burns through one armour cell (provisional)'),
  },
  room: {
    kineticResistance: P(6.75e4, 3e4, 1.4e5, 1, 'kg/(m*s)', false, 'sectional momentum one ordinary room cell absorbs (provisional, a quarter of armour)'),
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
    bufferSeconds: P(1, 0.2, 5, 0, 's', false, 'buffer for impulses (rounds, blasts) = budget x this (provisional)'),
  },
};

/** Value of a tunable constant at a cell edge. */
export function scaled(param, edge = BASE_EDGE) {
  return param.value * (edge / BASE_EDGE) ** param.k;
}

/** A deep copy of PARAMS with run-time overrides { 'beam.power': 8e6 } applied. */
export function withOverrides(overrides = {}) {
  const params = JSON.parse(JSON.stringify(PARAMS));
  for (const [path, value] of Object.entries(overrides)) {
    const [group, name] = path.split('.');
    const p = params[group] && params[group][name];
    if (!p) throw new Error(`unknown constant ${path}`);
    p.value = value;
  }
  return params;
}

// Player-facing text lives here too (none yet: Mission 0 is text-only tooling).
export const TEXT = {};
