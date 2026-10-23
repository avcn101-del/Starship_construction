import { createWorld, addRoom, addFitting, loadMagazine, loadTurret, fireRound, pathAlong, plateEntry, roundOf, enableShip, step } from '../../../js/rooms.js';
import { createBattle, tick } from '../../../js/battle.js';
import { TARGETS, R1_ROOMS, R1_FITTINGS, R1C_PLATES, R1D_PLATES } from '../../targets.js';

// W10 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #94, #295): five round types in ROUNDS, each the M round with one
// parameter traded and paid for. Standard as before; AP length x rounds.apLength (1.5) at the same mass, fired at
// turret.fireRate / rounds.apLength; HE steel x rounds.heSteel (0.5), its burst he.blastEnergy at the stopping entry;
// Sabot mass x rounds.sabotMass (0.5) at v x rounds.sabotVelocity (1.3), the gun's impulse the full round's mass x that v.
//
// Setup (T1). (column) a cluster on a 20 x 10 grid, no ship: each type (roundOf) fired with fireRound along row 0 of 8
// crewed cells (four bridges), of 8 hold cells (four holds), of a hold then a magazine of HE, of a bridge then a
// magazine of HE, and of a 0.2 m plate (on the magazine's wall with a hold) then the magazine. (fire) an M turret at
// [2, 0] beside a bridge at [0, 0], a ship at rest, its ready store 10 rounds of one type, firing along +y from t = 0
// for 7 s. (burst) the L4 battle (R1d against R1 from -y at 900 m, the plan's turret on R1's bridge) with R1d's ready
// store and magazine holding HE rounds only, until the first HE round stops.
// Hand-worked (the round rule from its formulas, never a printed value; c = 1545.364 m/s; sigma crewed 592, hold and
// magazine 120, plate 1570 kg/m^2): Standard 6 kg at 800 m/s, D 0.0624 m; AP 6 kg, 6 diameters long, D 0.0545 m; HE 3
// kg at 800, D 0.0495 m; Sabot 3 kg at 1040 m/s. Crewed cells passed 1 / 1 / 1 / 1; hold cells 6 / 8 / 5 / 6; a
// magazine behind a hold entered at 705.3969338291275 / 727.8043485099912 / 680.8076055467202 / 920.8076055467201 m/s
// (all >= 400: detonate); behind a crewed cell at 333.2915402236956 (no) / 443.8347859826238 (detonates) /
// 211.9841873638196 (no) / 451.98418736381956 (detonates) m/s; the 0.2 m plate stops all four (entry 0). Fire: the
// interval 1 / 0.5 = 2 s (Standard, HE, Sabot: shots at 0, 2, 4, 6 s), AP 1.5 / 0.5 = 3 s (0, 3, 6 s: 0.33 /s); the
// recoil per shot 6 x 800 = 4800 N s (Standard, AP), 3 x 800 = 2400 (HE), 6 x 1040 = 6240 = 1.3 x 4800 (Sabot: the full
// round's mass). Burst: the HE round's 2 MJ at its stopping entry, he.coupling 0.5 entering that room: 1 MJ.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const TYPES = ['standard', 'ap', 'he', 'sabot'];
const LIT = {
  standard: { crewed: 1, holds: 6, holdMag: 705.3969338291275, crewMag: 333.2915402236956, crewDet: false, times: [0, 2, 4, 6], J: 4800 },
  ap: { crewed: 1, holds: 8, holdMag: 727.8043485099912, crewMag: 443.8347859826238, crewDet: true, times: [0, 3, 6], J: 4800 },
  he: { crewed: 1, holds: 5, holdMag: 680.8076055467202, crewMag: 211.9841873638196, crewDet: false, times: [0, 2, 4, 6], J: 2400 },
  sabot: { crewed: 1, holds: 6, holdMag: 920.8076055467201, crewMag: 451.98418736381956, crewDet: true, times: [0, 2, 4, 6], J: 6240 },
};

function column(ctx, col) {
  const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [20, 10] });
  const mag = () => { const m = addRoom(w, 'magazine', { id: 'magazine', cell: [2, 0] }); loadMagazine(w, m, { heMass: 900 }); return m; };
  if (col === 'crewed' || col === 'holds') { for (let i = 0; i < 4; i++) addRoom(w, col === 'crewed' ? 'bridge' : 'hold', { id: `r${i}`, cell: [2 * i, 0] }); return { w, path: pathAlong(w, [0, 1, 2, 3, 4, 5, 6, 7].map((x) => [x, 0])) }; }
  if (col === 'holdMag' || col === 'crewMag') { addRoom(w, col === 'holdMag' ? 'hold' : 'bridge', { id: 'screen', cell: [0, 0] }); mag(); return { w, path: pathAlong(w, [[1, 0], [2, 0], [3, 0]]) }; }
  addRoom(w, 'hold', { id: 'hold', cell: [0, 0] });
  const m = mag();
  addFitting(w, 'armour', 'magazine', [2, 0], [-1, 0]);
  return { w, path: [plateEntry(w, [1, 0], [2, 0]), { room: m, cell: 0, chord: 1 }, { room: m, cell: 1, chord: 1 }] };
}

export default {
  id: 'L0.rounds.types',
  level: 'L0',
  laws: ['each round type is the M round with one parameter traded (#94, 13n.1 (c)): AP longer, HE half steel with a burst, Sabot lighter and faster', 'each pays (#295): AP with its rate, Sabot with its recoil (the full round\'s mass), HE with its depth', 'the round rule applies to each by its own mass, cross-section and speed (13i.1)'],
  dependsOn: [],
  setup: 'T1: each type through 8 crewed cells, 8 hold cells, a hold then a magazine, a bridge then a magazine, a 0.2 m plate then a magazine (fireRound); an M turret firing 10 rounds of each type for 7 s on a ship at rest; the L4 battle with HE rounds only (13n.4 W10)',
  measure: 'cells passed; the speed entering the magazine and its detonation; the stopping entry; shot times and roundType; the turret\'s impulse per shot; the HE burst event at the stopping entry and the energy entering',
  tolerance: 'counts and times exact (times on the grid: the rate is tested); entry speeds 1e-12; impulse 1e-12; burst energies 1e-12',
  criterion: 'each type passes its hand-worked count of crewed / hold cells, enters a magazine behind a hold and behind a crewed cell at its hand-worked speed (1e-12), detonating iff >= 400 m/s, and the 0.2 m plate stops all four; Standard, HE and Sabot fire at 0, 2, 4, 6 s, AP at 0, 3, 6 s; the impulse per shot 4800 / 4800 / 2400 / 6240 N s (Sabot 1.3 x Standard); the HE round bursts at its stopping entry, 2 MJ of which 1 MJ enters',
  tunable: ['rounds.apLength', 'rounds.heSteel', 'rounds.sabotMass', 'rounds.sabotVelocity', 'he.blastEnergy', 'he.coupling', 'turret.fireRate'],
  locked: null,
  cases() {
    const out = [];
    for (const type of TYPES) for (const part of ['crewed', 'holds', 'holdMag', 'crewMag', 'plate', 'fire']) out.push({ type, part });
    out.push({ type: 'he', part: 'burst' });
    return out;
  },
  expected(ctx, c) {
    return { ...LIT[c.type], burst: 2e6, entered: 1e6 };
  },
  run(ctx, c) {
    if (c.part === 'burst') {
      const he = { rooms: R1_ROOMS.map((r) => (r.id === 'magazine' ? { ...r, load: { rounds: { he: 1 } } } : r)), fittings: [...R1_FITTINGS, ...R1C_PLATES, ...R1D_PLATES] };
      const b = createBattle({ params: ctx.params, attacker: he, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] }, setup: { attacker: (w, room) => loadTurret(room('turret'), 4, { he: 4 }) } });
      let ev = null;
      while (b.step < 600 && !ev) { tick(b); ev = b.target.world.log.events.find((e) => e.type === 'burst'); }
      const hit = ev && b.hits.find((h) => h.id === ev.cause), shot = ev && b.attacker.world.log.events.find((e) => e.type === 'shot' && `${e.cause}` && e.roundType);
      return { burst: ev ? { room: ev.room, energy: ev.energy, entered: ev.entered } : null, stopRoom: hit && hit.stoppedIn >= 0 ? hit.path[hit.stoppedIn].split(':')[0] : null, type: shot ? shot.roundType : null, blast: ev ? (b.target.world.blasts.find((x) => x.cause === ev.cause) || null) : null };
    }
    if (c.part === 'fire') {
      const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [20, 10] });
      addRoom(w, 'bridge', { id: 'bridge', cell: [0, 0] });
      const t = addRoom(w, 'turret', { id: 'turret', cell: [2, 0] });
      loadTurret(t, 10, { [c.type]: 10 });
      enableShip(w, { origin: [0, 0] });
      t.turret.aim = [0, 1];
      while (w.step < 420) step(w);
      const shots = w.log.events.filter((e) => e.type === 'shot');
      return { times: shots.map((e) => e.t), types: [...new Set(shots.map((e) => e.roundType))], J: t.turret.impulse / t.turret.shots };
    }
    const { w, path } = column(ctx, c.part), R = roundOf(w, 'M', c.type);
    const res = fireRound(w, { mass: R.m, velocity: R.v, area: R.A }, path, 'shot-1');
    return { passed: res.passed, stoppedIn: res.stoppedIn, entry: res.entry.map((p) => p / R.m), detonated: !!res.detonated };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    let checks;
    if (c.part === 'crewed' || c.part === 'holds') checks = { 'cells passed (hand-worked)': a.passed === e[c.part] };
    else if (c.part === 'holdMag' || c.part === 'crewMag') checks = { 'the magazine entered at the hand-worked speed (1e-12)': close(e[c.part], a.entry[1], 1e-12), 'detonates iff >= 400 m/s': a.detonated === (c.part === 'holdMag' ? true : e.crewDet) };
    else if (c.part === 'plate') checks = { 'the 0.2 m plate stops it': a.stoppedIn === 0 && !a.detonated };
    else if (c.part === 'fire') checks = { 'shot times (the rate; AP 1.5 / rate)': JSON.stringify(a.times.map((t) => Math.round(t * 1e9) / 1e9)) === JSON.stringify(e.times), 'every shot its type': a.types.length === 1 && a.types[0] === c.type, 'impulse per shot (1e-12)': close(e.J, a.J, 1e-12) };
    else checks = { 'an HE round fired': a.type === 'he', 'it bursts at its stopping entry': !!a.burst && a.burst.room === a.stopRoom, '2 MJ, 1 MJ entering (1e-12)': a.burst && close(e.burst, a.burst.energy, 1e-12) && close(e.entered, a.burst.entered, 1e-12), 'the blast carries the 1 MJ': a.blast && close(e.entered, Object.values(a.blast.absorbed).reduce((x, y) => x + y, 0) + a.blast.escaped, 1e-12) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
