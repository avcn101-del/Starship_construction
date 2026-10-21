// heat.js — per-room heat (#182, DESIGN.md 13c.1).
// A room stores heat Q (J); T = Q / C, absolute. Heat enters by generation
// (the room's own and any external source) and leaves only by radiators on
// the room's hull segments, by emissivity x sigma x area x T^4 (#143).
// Explicit Euler at the simulation step. The books keep
// generated = radiated + stored (stored = Q - Q0).

export function createHeat(C, T0) {
  const Q = C * T0;
  return { C, Q, Q0: Q, generated: 0, radiated: 0, lastRadiatedPower: 0, isHot: false, isOverheated: false, isCritical: false };
}

export const temperature = (h) => h.Q / h.C;

/** Power (W) radiated by n panels of `area` at temperature T. Also the IR brightness (#102, #143). */
export function radiatorPower(T, n, area, emissivity, sigma) {
  return n * emissivity * sigma * area * T * T * T * T;
}

/** One Euler step: add `generated` (J), radiate at `radiated` (W) for dt. */
export function heatStep(h, generated, radiatedPower, dt) {
  const radiated = radiatedPower * dt;
  h.generated += generated;
  h.radiated += radiated;
  h.lastRadiatedPower = radiatedPower;
  h.Q += generated - radiated;
}

/**
 * Threshold crossings since the last call, in order, given the room class's
 * { hot, overheated, critical } (K): 'hot', 'overheated', 'critical' when
 * reached; 'cooled' when T falls below hot after it was hot. Critical
 * happens once per room.
 */
export function crossings(h, th) {
  const T = temperature(h), out = [];
  if (!h.isHot && T >= th.hot) { h.isHot = true; out.push('hot'); }
  if (!h.isOverheated && T >= th.overheated) { h.isOverheated = true; out.push('overheated'); }
  if (!h.isCritical && T >= th.critical) { h.isCritical = true; out.push('critical'); }
  if (h.isHot && T < th.hot) { h.isHot = false; h.isOverheated = false; out.push('cooled'); }
  return out;
}

export function heatBooks(h) {
  return { generated: h.generated, radiated: h.radiated, stored: h.Q - h.Q0, initial: h.Q0 };
}
