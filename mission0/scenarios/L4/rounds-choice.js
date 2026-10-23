import { createBattle, tick } from '../../../js/battle.js';
import { loadTurret } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// W11 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #95): the shot's type is chosen automatically against a resolved
// target: HE on a room on the hull face, AP on a room behind at least one cell, Standard otherwise and on a zone.
//
// Setup (T1): createBattle with knowledge on, the attacker R1d-A (R1d with the antenna on its hold) from -y at 900 m
// against R1, its turret's ready store 30 typed rounds (10 Standard, 10 AP, 10 HE: every type held throughout), up to
// 20 s. (hull) the plan's turret on R1's bridge, zone 1 scanned from t = 0 (it holds the bridge's cells (5, 2), (6, 2));
// (deep) on R1's heat sink, zone 4 scanned (it holds the heat sink's (4, 4), (4, 5)); (zone) on R1's magazine, nothing
// scanned, the plan naming zone 1 (the shot goes to the zone's centre).
// Hand-worked (grid of R1): from -y the line to the bridge's first known cell (5, 2) crosses no standing cell before it
// (column 5 holds nothing below row 2): the hull face: HE. The line to the heat sink's first known cell (4, 4) crosses
// the shield generator's (4, 0), (4, 1) and the reactor's (4, 2), (4, 3) first: behind four cells: AP. The magazine is
// never known: a zone: Standard. Before its zone resolves every target is a zone: Standard.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const CASES = { hull: { room: 'bridge', zone: 1, want: 'he' }, deep: { room: 'heatSink', zone: 4, want: 'ap' }, zone: { room: 'magazine', zone: null, want: 'standard' } };

export default {
  id: 'L4.rounds.choice',
  level: 'L4',
  laws: ['the shot\'s type is chosen against a resolved target: HE on a room on the hull face, AP on a room behind at least one cell, Standard otherwise and on a zone (#95, 13n.1 (c))'],
  dependsOn: ['L0.rounds.types', 'L4.target.known'],
  setup: 'T1: createBattle, knowledge on, R1d-A from -y at 900 m against R1, its ready store 10 Standard, 10 AP, 10 HE; the turret on the bridge (zone 1 scanned), the heat sink (zone 4 scanned), the magazine (no scan, plan.zone 1); 20 s (13n.4 W11)',
  measure: 'each shot\'s roundType and whether the attacker\'s model knew the plan room before the tick that fired it',
  tolerance: 'exact',
  criterion: 'hull: every shot fired while the bridge is known is HE, at least one; deep: every shot while the heat sink is known AP, at least one; zone: every shot Standard and the magazine never known; every shot fired before its room is known Standard',
  tunable: ['sensor.scanTime', 'turret.fireRate'],
  locked: { date: '2026-10-23', hash: 'a80e6c54' },
  cases() {
    return [{ target: 'hull' }, { target: 'deep' }, { target: 'zone' }];
  },
  expected(ctx, c) {
    return { want: CASES[c.target].want };
  },
  run(ctx, c) {
    const k = CASES[c.target];
    const b = createBattle({ params: ctx.params, attacker: SENSOR_SHIPS['R1d-A'], target: TARGETS.R1, bearing: '-y', plan: { turret: [k.room], zone: 1 }, knowledge: true, scans: k.zone === null ? [] : [{ side: 'A', antenna: 0, zone: k.zone, at: 0 }], setup: { attacker: (w, room) => loadTurret(room('turret'), 30, { standard: 10, ap: 10, he: 10 }) } });
    const shots = [];
    let seen = 0;
    while (b.step < 1200 && !b.ended) {
      const known = b.attacker.model.rooms.has(k.room);
      tick(b);
      const ev = b.attacker.world.log.events;
      for (; seen < ev.length; seen++) if (ev[seen].type === 'shot') shots.push({ t: ev[seen].t, type: ev[seen].roundType, known });
    }
    return { shots, known: b.attacker.model.rooms.has(k.room) };
  },
  compare(e, a, c) {
    const known = a.shots.filter((s) => s.known), unknown = a.shots.filter((s) => !s.known);
    const checks = {
      'every shot before its room is known: Standard': unknown.every((s) => s.type === 'standard'),
    };
    if (c.target === 'zone') checks['never known; every shot Standard'] = !a.known && known.length === 0 && a.shots.length > 0;
    else checks[`every shot while known: ${e.want}, at least one`] = known.length > 0 && known.every((s) => s.type === e.want);
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify({ known: r.actual.known, shots: r.actual.shots.map((s) => `${s.t.toFixed(2)}:${s.type}${s.known ? '*' : ''}`).join(' ') }) };
  },
};
