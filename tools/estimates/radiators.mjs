// tools/estimates/radiators.mjs (#304): an estimate, never a canonical run; the design partner's radiator claim checked: R1 at full throttle, shield on, reactor at full demand, 1800 s.
import { PARAMS } from '../../js/data.js';
import { buildShip } from '../../js/battle.js';
import { step, setDemand, roomTemperature, isDestroyed } from '../../js/rooms.js';
import { temperatureClass } from '../../js/sensors.js';
import { TARGETS } from '../../mission0/targets.js';
for (const panels of [true, false]) {
  const bp = { rooms: TARGETS.R1.rooms, fittings: TARGETS.R1.fittings.filter((f) => panels || f[0] !== 'radiator') };
  const { world } = buildShip(PARAMS, 'T1', bp);
  const room = (id) => world.rooms.find((r) => r.id === id);
  room('engine').engine.throttle = 1; room('shield').shield.on = true; setDemand(world, room('reactor'), 1);
  let firstHot = null; const marks = {};
  while (world.t < 1800 - 1e-9) {
    room('engine').engine.throttle = 1;
    step(world);
    if (!firstHot) { const h = world.rooms.find((r) => temperatureClass(r) !== 'rest'); if (h) firstHot = `${h.id} at ${world.t.toFixed(1)} s`; }
    for (const s of [180, 360, 1800]) if (!marks[s] && world.t >= s - 1e-9) marks[s] = world.rooms.map((r) => `${r.id} ${roomTemperature(r).toFixed(0)}`).join(', ');
  }
  console.log(`${panels ? 'all 17 panels' : 'no panels'}: first room hot: ${firstHot}`);
  for (const s of [180, 360, 1800]) console.log(`  at ${s} s: ${marks[s]}`);
}
