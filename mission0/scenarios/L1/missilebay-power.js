import { buildShip, weaponStates } from '../../../js/battle.js';
import { step, setActive, empBurst, roomTemperature } from '../../../js/rooms.js';
import { depositHeat } from '../../../js/heat.js';
import { missileShip } from '../../targets.js';

// H12 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), §17 item 46, #296, #299 (4), #301 (6)): the missile bay draws power
// as the turret does (turret.powerDraw x its footprint factor x its surviving fraction x its power fraction, while it
// could launch: controlled, up, a missile in its store, power reaching it), launches only when joined to a producing
// reactor, cooks off at thermal.magazineCritical by its store (its missiles' warheads and fuel) as a magazine does, and
// so is a powered room an EMP shuts down.
//
// Setup (T1): R1-M by buildShip at rest (origin [0, 0], heading 0; routed, its reactor at full demand), its bay ('bay',
// M, 3 x 2) holding missilebay.readyMissiles = 2 designated HE missiles, its missile magazine on the bay's wall.
// (joined) the bay ordered to launch; 3 s. (cut) its reactor switched off (setActive) before the first step, the bay
// ordered to launch; 3 s. (hot-460, hot-440) the bay's heat set to 460 K or 440 K (depositHeat) before one step, not
// launching. (emp) an EMP burst of missile.empEnergy at the bay's centre (empBurst, t = 0) before the first step, the bay
// ordered to launch; 7 s.
// Hand-worked: (joined) launches at t = 0 and t = 2 s (missilebay.launchInterval), 2 in 3 s; its draw over the first
// second, its store holding a missile throughout (2, then 1: the magazine's feed takes 200 kg / 3.6 kg/s = 56 s a
// missile), 200 kW x 1 (M footprint) x 1 x 1 x 1 s = 200 000 J (1e-9 relative). (cut) no producing reactor: no launch
// and no draw in 3 s; the able rule reads it 'no-power'. (hot-460) at or above 450 K after the step: a cook-off, its
// explosion releasing the store's 2 x (missile.warheadEnergy 20 MJ + 1/2 x 200 kg x (30 m/s^2 x 20 s)^2 = 36 MJ) = 112 MJ
// (1e-9 relative); (hot-440) below 450 K: none (one step moves the room's temperature by far less than 10 K, kernel-read).
// (emp) the bay at r = 0 receives the whole 2 MJ >= emp.scramDose 1.47 MJ: an outage to t = 5.0 s; no launch before
// it ends and the first launch at t = 5.0 s (the outage ends at the boundary of step 300, the bay works from that step).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.missilebay.power',
  level: 'L1',
  laws: ['the missile bay draws power as the turret does and launches only when joined to a producing reactor (§17 item 46, #301 (6))', 'its store cooks off at thermal.magazineCritical by its warheads and fuel (#148, #301 (6))', 'it is a powered room: an EMP dose >= emp.scramDose shuts it for emp.outageTime (#292)'],
  dependsOn: [],
  setup: 'T1: R1-M by buildShip at rest, routed; its bay launching (joined), with its reactor switched off (cut), heated to 460 / 440 K for one step (hot), or under an EMP burst at its centre at t = 0 (emp) (13n.4 H12)',
  measure: 'launch times; the bay\'s energy drawn; the able rule; the cook-off and its explosion\'s energy; the outage and the first launch after it',
  tolerance: 'energies 1e-9 relative; times exact (whole steps)',
  criterion: '(joined) launches at 0 and 2 s, 200 000 J drawn in the first second; (cut) no launch, no draw, no-power; (hot-460) a cook-off of 112 MJ; (hot-440) none; (emp) an outage until 5.0 s, the first launch at 5.0 s',
  tunable: ['turret.powerDraw', 'missilebay.launchInterval', 'thermal.magazineCritical', 'missile.warheadEnergy', 'emp.scramDose', 'emp.outageTime'],
  locked: null,
  cases() {
    return [{ name: 'joined' }, { name: 'cut' }, { name: 'hot-460', T: 460 }, { name: 'hot-440', T: 440 }, { name: 'emp' }];
  },
  expected(ctx, c) {
    const p = ctx.params, vb = p.missile.acceleration.value * p.missile.burnTime.value;
    return {
      joined: { launches: [0, 2], drawn: p.turret.powerDraw.value * 1 },
      cut: { launches: [], drawn: 0, why: 'no-power' },
      'hot-460': { cookOff: true, energy: 2 * (p.missile.warheadEnergy.value + 0.5 * p.missile.mass.value * vb * vb) },
      'hot-440': { cookOff: false },
      emp: { outage: 5, first: 5 },
    }[c.name];
  },
  run(ctx, c) {
    const { world, room } = buildShip(ctx.params, 'T1', missileShip('designated', 'he'), { prefix: 'M', origin: [0, 0] });
    const bay = room('bay'), dt = world.dt;
    if (c.T) {
      depositHeat(bay.heat, bay.heat.C * c.T - bay.heat.Q);
      step(world);
      const ev = world.log.events, cook = ev.find((e) => e.type === 'cook-off' && e.room === 'bay'), boom = ev.find((e) => e.type === 'explosion' && e.room === 'bay');
      return { cookOff: !!cook, energy: boom ? boom.energy : null, T: roomTemperature(bay) };
    }
    if (c.name === 'cut') setActive(world, room('reactor'), false);
    if (c.name === 'emp') empBurst(world, [...bay.position], ctx.params.missile.empEnergy.value, 'test-emp', 0);
    bay.missileBay.launching = true;
    const steps = Math.round((c.name === 'emp' ? 7 : 3) / dt);
    let drawn1 = null;
    for (let n = 0; n < steps; n++) { step(world); if (world.step === 60) drawn1 = bay.missileBay.energyDrawn || 0; }
    const ev = world.log.events, launches = ev.filter((e) => e.type === 'missile-launched').map((e) => e.t);
    const outage = ev.find((e) => e.type === 'outage' && e.room === 'bay'), ended = ev.find((e) => e.type === 'outage-ended' && e.room === 'bay');
    return { launches, drawn: drawn1, why: weaponStates(world).find((x) => x.room === bay).why, outage: outage ? outage.until : null, ended: ended ? ended.t : null };
  },
  compare(e, a, c) {
    const rel = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y));
    let checks;
    if (c.name === 'joined') checks = { 'launches at 0 and 2 s': a.launches.length === 2 && rel(a.launches[0], 0) && Math.abs(a.launches[1] - 2) <= 1e-9, 'its draw in the first second (1e-9)': rel(a.drawn, e.drawn) };
    else if (c.name === 'cut') checks = { 'no launch': a.launches.length === 0, 'no draw': a.drawn === 0, 'the able rule: no-power': a.why === e.why };
    else if (c.T) checks = { 'a cook-off iff at or above 450 K': a.cookOff === e.cookOff, 'its explosion\'s energy (1e-9)': !e.cookOff || rel(a.energy, e.energy) };
    else checks = { 'an outage to 5.0 s': a.outage !== null && Math.abs(a.outage - e.outage) <= 1e-12 && a.ended !== null && Math.abs(a.ended - e.outage) <= 1e-9, 'no launch before it ends, the first at 5.0 s': a.launches.length > 0 && Math.abs(a.launches[0] - e.first) <= 1e-9 };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, c = r.case;
    if (c.T) return { expected: r.expected.cookOff ? `cook-off ${(r.expected.energy / 1e6).toFixed(3)} MJ` : 'no cook-off', actual: `${a.cookOff ? `cook-off ${(a.energy / 1e6).toFixed(3)} MJ` : 'no cook-off'} at ${a.T.toFixed(3)} K (kernel-read)` };
    return { expected: JSON.stringify(r.expected), actual: `launches ${a.launches.map((t) => t.toFixed(4)).join(', ') || 'none'}; drawn in 1 s ${a.drawn === null ? '-' : a.drawn.toFixed(3)} J; able ${a.why || 'yes'}; outage to ${a.outage === null ? '-' : a.outage}, ended ${a.ended === null ? '-' : a.ended.toFixed(4)}` };
  },
};
