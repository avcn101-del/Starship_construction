// mission0/probes/l5e1-j5.mjs — the engineer's first check for L5e1 (DESIGN.md 13n.8's open item): J5's clauses,
// read from #81 and 13d.1, run on the kernel as it stands. A ship that splits into an aft fragment holding a reactor,
// an engine, a shield generator, a turret, RCS and an antenna but no bridge, and a forward one with the bridge.
// Reads js/ and mission0/ only; changes nothing; never a canonical run:
//   node mission0/probes/l5e1-j5.mjs
import { PARAMS } from '../../js/data.js';
import { createBattle, tick } from '../../js/battle.js';
import { damageCell, setRcs } from '../../js/rooms.js';
import { setScan, sourcesOf } from '../../js/sensors.js';
import { T_NECK_ROOMS, T_NECK2_FITTINGS, SENSOR_SHIPS } from '../../mission0/targets.js';

// T-neck2 with its heat sink replaced by a turret (its four radiators on it) and an antenna in place of the shield
// generator's last radiator ((4, 1) +x): the aft section joined to the forward one only through the hold.
export const DARK = {
  rooms: T_NECK_ROOMS.map((r) => (r.id === 'heatSink' ? { id: 'aftTurret', type: 'turret', cell: [3, 4] } : r)),
  fittings: T_NECK2_FITTINGS.map(([t, room, cell, side]) => [t, room === 'heatSink' ? 'aftTurret' : room, cell, side]).map((f) => (f[1] === 'shield' && f[2][0] === 4 && f[2][1] === 1 && f[3][0] === 1 ? ['antenna', 'shield', [4, 1], [1, 0]] : f)),
};
if (import.meta.url === `file://${process.argv[1]}`) {
  const b = createBattle({ params: PARAMS, attacker: SENSOR_SHIPS['R1d-A'], target: DARK, distance: 2000, knowledge: true, shield: { target: true } });
  const T = b.target, w = T.world, room = T.room;
  const aft = ['engine', 'reactor', 'shield', 'aftTurret'];
  // Before: the aft weapon fires, the engine thrusts, the RCS fire, the antenna scans.
  room('aftTurret').turret.hold = false; room('aftTurret').turret.aim = [0, -1];
  setScan(w, w.fittings.findIndex((f) => f.type === 'antenna') >= 0 ? w.fittings.filter((f) => f.type === 'antenna').length - 1 : 0, 0);
  const engine = room('engine'), rcs = w.fittings.filter((f) => f.type === 'rcs' && f.room === 'engine').map((f) => f.id);
  const state = (label) => {
    const src = sourcesOf(w).filter((s) => s.band === 'em');
    console.log(`${label} step ${b.step}: bodies ${w.ship.bodies.map((x) => `${x.id} ${(x.M / 1e3).toFixed(1)} t`).join(', ')}; ` + aft.map((id) => `${id} body ${room(id).body} ctl ${room(id).controlled}`).join('; '));
    console.log(`   reactor scrammed ${room('reactor').reactor.scrammed} delivered ${room('reactor').reactor.delivered.toExponential(3)} restartStep ${room('reactor').reactor.restartStep}; engine thrust ${engine.engine.thrust.toExponential(3)}; turret shots ${room('aftTurret').turret.shots} ceased ${room('aftTurret').turret.ceased}; RCS fired ${rcs.map((id) => w.fittings[id].fired).join(',')}; antenna progress ${(w.fittings.find((f) => f.type === 'antenna').scan || {}).progress}; EM sources ${JSON.stringify(src.map((s) => [s.id, +s.P.toExponential(3)]))}; shield em ${room('shield').shield.em}`);
  };
  const drive = () => { engine.engine.throttle = 1; setRcs(w, rcs, true); };
  for (let i = 0; i < 30; i++) { drive(); tick(b); }
  state('before the split');
  const ev0 = w.log.events.length, s0 = b.step, shots0 = room('aftTurret').turret.shots;
  const hold = room('hold');
  for (let k = 0; k < hold.cells.length; k++) damageCell(w, hold, k, 1, 'test', 'kinetic');
  console.log(`   split between steps ${b.step} and ${b.step + 1} (t ${w.t}); events: ${w.log.events.slice(ev0).map((e) => `${e.type} ${e.room}${e.t !== undefined ? ' t=' + e.t.toFixed(4) : ''}`).join('; ')}`);
  drive(); tick(b);
  state('after one step');
  for (let i = 0; i < 6000; i++) { drive(); tick(b); if (b.ended) break; }
  state(`after ${b.step - s0} steps`);
  console.log(`   aft turret shots since the split ${room('aftTurret').turret.shots - shots0}; reactor-restart events ${w.log.events.filter((e) => e.type === 'reactor-restart').length}; control-restored after the split ${w.log.events.slice(ev0).filter((e) => e.type === 'control-restored').length}; ended ${b.ended ? b.ended.kind + ' ' + b.ended.side : 'no'}`);
}
