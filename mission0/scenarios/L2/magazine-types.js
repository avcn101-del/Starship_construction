import { createWorld, addRoom, loadMagazine, loadTurret, magazineContents, fireRound, pathAlong, step } from '../../../js/rooms.js';
import { weaponStates } from '../../../js/battle.js';
import { roundGeometry } from '../../../js/projectile.js';

// K4 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #274's lever, #278): one magazine per weapon type. loadMagazine takes a
// weapon type: `turret` rounds (as before), `railgun` slugs (steel, no propellant: magazineContents' energy 0, the
// magazine does not explode), `missile`s (their energy is missile.warheadEnergy + 1/2 m v_burnout^2 per missile, whose
// constants L5c adds: until then loading one throws, a stated TODO of L5a). A weapon is fed only by a magazine of its
// type sharing a live wall with it (feedAmmo, #267 (2)), and the able rule reads the same (js/battle.js weaponStates).
// A T1 cluster: an M turret at [0, 0], an M magazine at [2, 0] (one shared wall, 10 m), an M reactor at [0, 2] (the
// turret's power, so the able rule reaches its ammunition condition). The turret's ready store starts empty and holds
// its fire; the magazine is loaded with 900 kg of HE turret rounds (150) or 900 kg of railgun slugs; 10 s are stepped.
// Hand-worked: the feed carries ammo.wallFeed 0.72 kg/(s m) x 10 m = 7.2 kg/s, one 6 kg round per 0.833 s, so the
// ready store (turret.readyRounds 4) is full after 3.33 s and the turret magazine holds 146 rounds at 10 s; from the
// slug magazine nothing moves: the turret stays empty and is not able (why 'dry'). magazineContents: 150 HE x (6 + 2)
// MJ = 1.2e9 J; slugs 0 J. (shot) An M round into the magazine's row from -x at 800 m/s (it enters the slug magazine at
// 800 m/s, far above magazine.detonationSpeed): the turret magazine detonates, the slug magazine does not.
const TOP = 600; // magazine.detonationSpeed's range top: the shot enters at 800 m/s, above any threshold
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

function cluster(ctx, type) {
  const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [6, 6] });
  const turret = addRoom(world, 'turret', { id: 'turret', cell: [0, 0] });
  const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
  addRoom(world, 'reactor', { id: 'reactor', cell: [0, 2] });
  loadTurret(turret, 0);
  turret.turret.hold = true;
  if (type === 'railgun') loadMagazine(world, mag, { type: 'railgun', slugMass: 900 });
  else loadMagazine(world, mag, { heMass: 900 });
  return { world, turret, mag };
}

export default {
  id: 'L2.magazine.types',
  level: 'L2',
  laws: ['one magazine per weapon type: a weapon is fed only by a magazine of its type sharing a live wall (13n.1 (b), #267 (2))', 'a railgun\'s magazine holds steel slugs and does not explode (13n.1 (b))', 'a missile magazine explodes by its missiles\' warheads and fuel (13n.1 (b); its constants are L5c\'s)'],
  dependsOn: [],
  setup: 'a T1 cluster: an M turret at [0, 0] (ready store empty, holding fire), an M magazine at [2, 0] loaded with 900 kg of HE turret rounds or 900 kg of railgun slugs, an M reactor at [0, 2]; 10 s stepped; an M round into the magazine\'s row from -x; a missile magazine loaded (13n.4 K4)',
  measure: 'the turret\'s ready store and the rounds left after 10 s; the able rule for the turret; magazineContents\' energy per type; whether the round sets the magazine off (its own explosion: the blast may set off the reactor next to it); whether loading a missile magazine throws',
  tolerance: 'counts exact; energies 1e-12',
  criterion: '(turret magazine) the store full, 4 rounds, 146 left, the turret able; contents 1.2e9 J (hand-worked); the shot detonates it; (railgun magazine) nothing fed, the store empty, the turret not able (why dry), 900 kg of slugs still aboard; contents 0 J; the shot does not set it off (no explosion); (missile magazine) loadMagazine throws, naming L5c (a stated TODO, labelled)',
  tunable: ['ammo.wallFeed', 'turret.readyRounds', 'magazine.capacity', 'kinetic.chargeEnergy', 'he.blastEnergy', 'magazine.detonationSpeed'],
  locked: null,
  cases() {
    return [{ type: 'turret', part: 'feed' }, { type: 'railgun', part: 'feed' }, { type: 'turret', part: 'shot' }, { type: 'railgun', part: 'shot' }, { type: 'missile', part: 'load' }];
  },
  expected(ctx, c) {
    if (c.type === 'missile') return { throws: true };
    if (c.part === 'shot') return { explodes: c.type === 'turret', energy: c.type === 'turret' ? 1.2e9 : 0 };
    return c.type === 'turret' ? { store: 4, left: 146, able: true, why: null, energy: 1.2e9 } : { store: 0, slugMass: 900, able: false, why: 'dry', energy: 0 };
  },
  run(ctx, c) {
    if (c.type === 'missile') {
      const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [6, 6] }), mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
      try { loadMagazine(world, mag, { type: 'missile' }); return { throws: false, message: null }; } catch (e) { return { throws: true, message: String(e.message) }; }
    }
    const { world, turret, mag } = cluster(ctx, c.type);
    const energy = magazineContents(world, mag).energy;
    if (c.part === 'shot') {
      const p = ctx.params, fx = ctx.fixed, m = p.kinetic.roundMass.value, { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
      const path = pathAlong(world, [[2, 1], [3, 1]]);
      const res = fireRound(world, { mass: m, velocity: p.kinetic.muzzleVelocity.value, area: A }, path, 'round-1');
      return { energy, entry: res.entry[0] / m, explosions: world.log.events.filter((e) => e.type === 'explosion' && e.room === 'magazine').length };
    }
    for (let i = 0; i < 600; i++) step(world);
    const st = weaponStates(world).find((x) => x.room === turret);
    return { energy, store: turret.turret.ammo, left: mag.magazine.ap + mag.magazine.he, slugMass: mag.magazine.slugMass ?? null, able: st.able, why: st.why };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y), 1e-300);
    let checks;
    if (c.type === 'missile') checks = { 'loading a missile magazine throws, naming L5c (TODO, labelled)': a.throws === true && /L5c/.test(a.message) };
    else if (c.part === 'shot') checks = { 'magazineContents energy (1e-12; 0 for slugs)': c.type === 'railgun' ? a.energy === 0 : close(e.energy, a.energy, 1e-12), 'entered above the threshold\'s top (600 m/s)': a.entry >= TOP, [e.explodes ? 'detonates' : 'does not explode']: (a.explosions === 1) === e.explodes };
    else {
      checks = { 'magazineContents energy (1e-12; 0 for slugs)': c.type === 'railgun' ? a.energy === 0 : close(e.energy, a.energy, 1e-12), 'the ready store': a.store === e.store, 'the able rule': a.able === e.able && a.why === e.why };
      if (c.type === 'turret') checks['146 rounds left'] = a.left === e.left;
      else checks['900 kg of slugs aboard, nothing fed'] = a.slugMass === e.slugMass && a.left === 0;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
