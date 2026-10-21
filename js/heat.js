// heat.js — per-room heat (#182, DESIGN.md 13c.1).
// A room stores heat Q (J); T = Q / C, absolute. Heat enters by generation
// (the room's own and any external source) and leaves only by radiators on
// the room's hull segments, by emissivity x sigma x area x T^4 (#143).
// Explicit Euler at the simulation step. The books keep
// generated = radiated + stored (stored = Q - Q0).
// In a cluster (L2, DESIGN.md 13d.1, #193) heat also flows through shared
// walls: G (T_a - T_b), with G = conduction.wall x live length x the
// harmonic mean of the two rooms' conductivity factors; every flow is
// computed from the temperatures at the start of the step, so per room
// generated + conducted = radiated + stored and the flows sum to 0.

export function createHeat(C, T0) {
  const Q = C * T0;
  return { C, Q, Q0: Q, generated: 0, radiated: 0, lastRadiatedPower: 0, isHot: false, isOverheated: false, isCritical: false };
}

export const temperature = (h) => h.Q / h.C;

/** Power (W) radiated by n panels of `area` at temperature T. Also the IR brightness (#102, #143). */
export function radiatorPower(T, n, area, emissivity, sigma) {
  return n * emissivity * sigma * area * T * T * T * T;
}

/**
 * One Euler step: add `generated` (J), radiate at `radiated` (W) for dt and,
 * in a cluster, take `conducted` (J, net heat in through walls).
 */
export function heatStep(h, generated, radiatedPower, dt, conducted) {
  const radiated = radiatedPower * dt;
  h.generated += generated;
  h.radiated += radiated;
  h.lastRadiatedPower = radiatedPower;
  if (conducted === undefined) { h.Q += generated - radiated; return; } // a room alone (L1), unchanged
  h.conducted += conducted;
  h.Q += generated + conducted - radiated;
}

/** Conductance (W/K) of a wall of `length` (m) between rooms with conductivity factors fa, fb (#193). */
export function wallConductance(perMetre, length, fa, fb) {
  return perMetre * length * ((2 * fa * fb) / (fa + fb));
}

/**
 * Heat (J) through each wall { a, b, G } in one step, from a to b, at the
 * temperatures of the start of the step (#193).
 */
export function conductionFlows(walls, dt) {
  return walls.map((w) => w.G * (temperature(w.a) - temperature(w.b)) * dt);
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

/** The books; a room in a cluster also reports `conducted` (net heat in through walls). */
export function heatBooks(h) {
  const books = { generated: h.generated, radiated: h.radiated, stored: h.Q - h.Q0, initial: h.Q0 };
  if (h.conducted !== undefined) books.conducted = h.conducted; // L1 books keep their shape
  return books;
}
