// field.js — falloff fields: the Gaussian beam's delivered power and the
// shield field (finite budget, falloff, #99).
import { simpson, powi, exp } from './util.js';

/**
 * Fraction of a Gaussian beam's power that lands inside a circular aperture
 * of radius `aperture` (half a cell edge) at distance d (#165).
 * waist = beam waist radius; focusRange = Rayleigh range.
 * Integrated numerically over the aperture (the closed form is the check).
 */
export function beamDeliveredFraction(d, focusRange, aperture, waist) {
  const w = waist * Math.sqrt(1 + (d / focusRange) ** 2);
  // intensity / power = (2 / (pi w^2)) exp(-2 r^2 / w^2); ring area 2 pi r dr
  const density = (r) => ((4 * r) / (w * w)) * exp((-2 * r * r) / (w * w));
  return simpson(density, 0, aperture, 2000);
}

/** Shield field strength at distance r from its generator, in [0, 1]. */
export function shieldStrength(r, radius, exponent) {
  return 1 / (1 + powi(r / radius, exponent));
}

/**
 * One step of a continuous beam against the field: the field absorbs up to
 * budget * strength (W); the rest passes. Absorbed energy becomes heat (#21).
 * Continuous beams meet the rate only; the buffer catches impulses.
 */
export function absorbBeamStep(power, dt, budget, strength) {
  const rate = Math.min(power, budget * strength);
  return { absorbed: rate * dt, passed: (power - rate) * dt, heat: rate * dt };
}

/**
 * A kinetic round through the field (#21, #139): the field removes up to
 * stop * strength of sectional momentum, paying the kinetic energy it
 * removes from its impulse buffer; that energy becomes heat.
 */
export function stopRound({ mass, velocity, area }, stop, strength, buffer) {
  const s0 = (mass * velocity) / area;
  let ds = Math.min(s0, stop * strength);
  let v1 = (velocity * (s0 - ds)) / s0;
  let energy = 0.5 * mass * (velocity * velocity - v1 * v1);
  if (energy > buffer) {
    // The buffer runs out first: remove only what it can pay for.
    v1 = Math.sqrt(velocity * velocity - (2 * buffer) / mass);
    ds = s0 - (mass * v1) / area;
    energy = buffer;
  }
  return { s0, s1: s0 - ds, velocity: v1, energy, heat: energy };
}
