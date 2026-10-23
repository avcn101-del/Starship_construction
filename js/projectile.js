// projectile.js — munitions: geometry and momentum of kinetic rounds.
// (Trajectories, guidance and time of flight arrive with L3+.)
import { cbrt } from './util.js';

/**
 * A kinetic round is a steel cylinder `lengthToDiameter` diameters long.
 * Returns its diameter D (m) and cross-section A (m^2).
 */
export function roundGeometry(mass, density, lengthToDiameter) {
  // m = rho * (pi/4) D^2 * (LD * D)  =>  D = cbrt(4 m / (pi rho LD))
  const D = cbrt((4 * mass) / (Math.PI * density * lengthToDiameter));
  return { D, A: (Math.PI * D * D) / 4 };
}

/** Sectional momentum p / A, the quantity armour resists (#165). */
export function sectionalMomentum(mass, velocity, area) {
  return (mass * velocity) / area;
}
