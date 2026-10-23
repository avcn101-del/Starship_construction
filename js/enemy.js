// enemy.js — the enemy (DESIGN.md 9, 13n.1 (d), L5d; #111-#117, #85, #86,
// #120, #273 (5), #293, #301). The same automatic layer and standing orders as
// the player (js/helm.js runs them every step), plus a decision each
// enemy.decisionInterval from its own side's knowledge model and its own ship:
// which zone to scan (the auto-scan rule), which room to target (the priority
// order, from its model), which preset (a when -> do table on its own state:
// heat above its caution threshold -> Cool; buffer below it -> Evade; else
// Fire). Personality (#117), four numbers in [0, 1]: aggression sets the range
// order (>= 2/3 close, >= 1/3 hold, else open) and the open-fire rule (>= 1/2
// in range, else sure hit); patience the zones resolved before its first shot,
// floor(6 x patience); caution the thresholds (Cool when the heat fraction of
// js/helm.js is above 1 - caution, Evade when the buffers' fraction is below
// caution); resolve the surrender rule (js/battle.js: it strikes its colours
// battle.disabledSeconds x (1 - resolve) after its last weapon) and escape: at
// resolve < 0.5, when its heat or its buffer crosses its caution threshold while
// it still has thrust, it orders `disengage` (#293) and keeps that order.
// Deterministic, no learning: its only draws are its dodge intervals (js/helm.js)
// and, with `wildcard`, its personality once at battle start (#120: the
// mechanism, no content), both on the battle's seeded stream.
// No DOM, no Math.random.
import { scaled } from './data.js';
import { createHelm, heatFraction, bufferFraction, shipDynamics, chooseTarget, autoScan, ordersOf } from './helm.js';

const KEYS = ['aggression', 'patience', 'caution', 'resolve'];

/** A personality: the four numbers (each in [0, 1]); `wildcard` draws all four on the battle's stream instead (#120). */
export function personalityOf(battle, x = {}) {
  if (x.wildcard) return Object.fromEntries([...KEYS.map((k) => [k, battle.rng()]), ['wildcard', true]]);
  const out = {};
  for (const k of KEYS) {
    const v = x[k] ?? 0.5;
    if (!(v >= 0 && v <= 1)) throw new Error(`personality ${k} = ${v}: each is in [0, 1] (#117)`);
    out[k] = v;
  }
  return out;
}

/** The enemy for a side: a helm on the seeded dodge stream, its personality, its decision clock. */
export function createEnemy(battle, side, personality = {}) {
  const pers = personalityOf(battle, personality);
  side.helm = createHelm(battle, side, 'fire', { dodge: 'seeded' });
  side.helm.autoScan = false; // the enemy scans at its decisions
  side.enemy = { personality: pers, every: Math.max(1, Math.round(scaled(battle.params.enemy.decisionInterval, battle.edge) / battle.dt)), decisions: [], preset: 'fire', patience: Math.floor(6 * pers.patience) };
  side.helm.hold = side.enemy.patience > 0;
  overrides(side);
  return side.enemy;
}
/** The slots its personality sets over every preset: the range and the open-fire rule (aggression). */
function overrides(side) {
  const p = side.enemy.personality;
  side.helm.override = { range: p.aggression >= 2 / 3 ? 'close' : p.aggression >= 1 / 3 ? 'hold' : 'open', openFire: p.aggression >= 0.5 ? 'inRange' : 'sureHit' };
}

/** Before the helm's step: on the decision clock (step 0 and every enemy.decisionInterval), the enemy's decision. */
export function enemyStep(battle, side) {
  const e = side.enemy, h = side.helm;
  // Patience holds the first shot until floor(6 x patience) zones are resolved (counted every step: the model is its own).
  if (h.hold && side.model.resolved.size >= e.patience) h.hold = false;
  if (battle.step % e.every !== 0) return;
  const p = e.personality, heat = heatFraction(side.world), buffer = bufferFraction(battle, side.world);
  const hot = heat > 1 - p.caution, low = buffer < p.caution;
  const preset = hot ? 'cool' : low ? 'evade' : 'fire';
  if (p.resolve < 0.5 && (hot || low) && shipDynamics(battle, side).a > 0 && !h.disengage) { h.disengage = true; h.disengageStep = battle.step; }
  if (preset !== e.preset || h.orders.name !== preset) { e.preset = preset; h.orders = ordersOf(preset); }
  h.verbTarget = chooseTarget(side, h.orders.target).room; // its targeted room, from its model
  if (h.orders.emission !== 'cold') autoScan(side, h.orders.emission === 'full');
  e.decisions.push({ step: battle.step, t: battle.t, preset, heat, buffer, target: h.verbTarget, zones: side.model.resolved.size, disengage: h.disengage });
}
