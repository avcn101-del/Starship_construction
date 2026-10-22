// heat.js — per-room heat (#182, DESIGN.md 13c.1).
// A room stores heat Q (J); T = Q / C, absolute. Heat enters by generation
// (the room's own and any external source) and leaves only by radiators on
// the room's hull segments, by emissivity x sigma x area x T^4 (#143).
// Explicit Euler at the simulation step. The books keep
// generated = radiated + stored (stored = Q - Q0).
// In a cluster (L2, DESIGN.md 13d.1, #193, #200, #201) heat also flows
// through shared walls: G (T_a - T_b), G = per-metre conductance x live
// length x the harmonic mean of the two rooms' factors; a coolant wall (two
// coolant rooms) uses conduction.wall and the coolant factors, every other
// wall conduction.passive and the passive factors. Life support pumps heat
// from a crewed room or magazine into its coolant neighbours. Every flow is
// computed from the temperatures at the start of the step, so per room
// generated + conducted = radiated + vented + stored, where conducted is the
// net heat in through walls (life support's share of it is `pumped`), and
// the flows sum to 0 over the cluster. A destroyed heat sink cell vents its
// share of the heat above rest to space (#198).

export function createHeat(C, T0) {
  const Q = C * T0;
  return { C, Q, Q0: Q, generated: 0, radiated: 0, lastRadiatedPower: 0, isHot: false, isOverheated: false, isCritical: false };
}

// A heat sink whose last cell is destroyed holds no heat and no capacity (#198); it reads as the rest
// temperature it was vented to, so nothing downstream sees 0 / 0. Every other room has C > 0.
export const temperature = (h) => (h.C > 0 ? h.Q / h.C : h.emptyTemperature);

/** Power (W) radiated by n panels of `area` at temperature T. Also the IR brightness (#102, #143). */
export function radiatorPower(T, n, area, emissivity, sigma) {
  return n * emissivity * sigma * area * T * T * T * T;
}

/** Energy (J) put into the room from outside between steps (a beam's deposit, 13i.1): generated and stored at once. */
export function depositHeat(h, energy) {
  h.generated += energy;
  h.Q += energy;
}

/**
 * One Euler step: add `generated` (J), radiate at `radiated` (W) for dt and,
 * in a cluster, take `conducted` (J, net heat in through walls).
 */
export function heatStep(h, generated, radiatedPower, dt, conducted, pumped = 0) {
  const radiated = radiatedPower * dt;
  h.generated += generated;
  h.radiated += radiated;
  h.lastRadiatedPower = radiatedPower;
  if (conducted === undefined) { h.Q += generated - radiated; return; } // a room alone (L1), unchanged
  // conducted: net heat in through walls by conduction; pumped: net heat in by life support (#201).
  h.conducted += conducted + pumped;
  h.pumped += pumped;
  h.Q += generated + conducted + pumped - radiated;
}

/**
 * A destroyed heat sink cell (#198): of n cells, one cell's share C / n
 * leaves the room. Its heat above rest, (C / n)(T - T_rest), vents to space;
 * its heat at rest leaves the books with the cell (Q0 falls by (C / n)
 * T_rest), so stored = Q - Q0 falls by exactly the vented energy and T is
 * unchanged. `keep` (J/K) is capacity that is not the cells' (an armour
 * plate's steel, #258): the share is (C - keep) / n. Returns the vented
 * energy (J).
 */
export function ventCell(h, n, restTemperature, keep = 0) {
  const vented = ventCapacity(h, (h.C - keep) / n, restTemperature);
  if (n === 1 && keep === 0) { h.Q = 0; h.C = 0; h.emptyTemperature = restTemperature; } // the last cell: nothing left (float residue cleared)
  return vented;
}
/** Capacity `share` (J/K) leaves the room with its heat: the part above rest vents (ventCell's rule), T unchanged. Returns the vented energy (J). */
export function ventCapacity(h, share, restTemperature) {
  const T = h.Q / h.C, vented = share * (T - restTemperature);
  h.Q -= share * T;
  h.Q0 -= share * restTemperature;
  h.C -= share;
  h.vented += vented;
  return vented;
}
/** Capacity C (J/K) joins the room at its temperature (an armour plate's steel, #258): T unchanged, nothing generated. */
export function addCapacity(h, C) {
  const T = h.Q / h.C;
  h.C += C;
  h.Q += C * T;
  h.Q0 += C * T;
}

/** Conductance (W/K) of a wall of `length` (m) between rooms with factors fa, fb (#193): coolant or passive per metre (#201). */
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

/**
 * The books; a room in a cluster also reports `conducted` (net heat in
 * through walls, life support included), `pumped` (life support's part of
 * it, #201) and `vented` (heat a destroyed heat sink cell let out, #198):
 * generated + conducted = radiated + vented + stored.
 */
export function heatBooks(h) {
  const books = { generated: h.generated, radiated: h.radiated, stored: h.Q - h.Q0, initial: h.Q0 };
  if (h.conducted !== undefined) Object.assign(books, { conducted: h.conducted, pumped: h.pumped, vented: h.vented }); // L1 books keep their shape
  return books;
}
