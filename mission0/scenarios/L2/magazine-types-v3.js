import { createWorld, addRoom, loadMagazine, loadTurret, magazineContents, fireRound, pathAlong, step } from '../../../js/rooms.js';
import { weaponStates } from '../../../js/battle.js';
import { roundGeometry } from '../../../js/projectile.js';

// Successor of L2.magazine.types.v2 (withdrawn under #296 (1): its missile row said loadMagazine throws until L5c, a
// stated TODO that #278's missile magazine, built in L5c, overtook). Every case and check of .v2 kept; its missile row
// now tests the built rule (13n.1 (b) (c)): an M magazine loaded { type: 'missile', missileMass: 900 } holds
// floor(900 / missile.mass 200) = 4 missiles; magazineContents' energy is missile.warheadEnergy + 1/2 m (acceleration x
// burnTime)^2 per missile, 20 MJ + 1/2 x 200 x (30 x 20)^2 = 20 + 36 = 56 MJ each, 224 MJ in all (hand-worked); the
// same M round into its row from -x at 800 m/s detonates it, its explosion event carrying those 224 MJ, and leaves no
// missile aboard.
//
// .v2's header, kept: Successor of L2.magazine.types (withdrawn under #282 (7) (a), the reviewer's finding 1 on PR #73): every case and check
// of the original, plus a mixed case: a non-turret magazine holding turret-shaped rounds (loaded with AP turret rounds,
// then its type set to `railgun`) on a live wall with the turret, whose ready store is empty. The type guards of the
// feed (rooms.js feedTurrets) and of the able rule (battle.js weaponStates) are the rule 13n.1 (b) states, so the
// turret is not fed and not able (why 'dry'); without either guard it would be (mutations l5a.feed.anyType,
// l5a.feed.ableAnyType). The able rule is read before the first step (the feed has not run, so only the able rule's
// guard decides) and after 10 s (both guards).
//
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
// Comment slips noted under #282 (7) (d), in locked files of the same pass (left unchanged; no successor is made for a
// comment): L2.magazine.detonation (K2): "s after the hold, 1.383e6" divides by the pristine A0; with the flattening
// it is 1.298e6 (s after the hold over A0 / (1 - f)). L4.kill.v3 (K3): 604.64 N s is 604.63; R1d's two hold cells fall to shot-4
// (kernel-read), not to a no-repair count's shot-3, because R1d's quarters repair the damaged holds (about +0.13 per 2 s).
// L4.books.energy (B3): the work is the integrator's own change of kinetic energy; thrust is not independently checked.
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
  else if (type === 'mixed') { loadMagazine(world, mag, { apMass: 900 }); mag.magazine.type = 'railgun'; } // turret-shaped rounds in a railgun magazine
  else loadMagazine(world, mag, { heMass: 900 });
  return { world, turret, mag };
}

export default {
  id: 'L2.magazine.types.v3',
  level: 'L2',
  laws: ['one magazine per weapon type: a weapon is fed only by a magazine of its type sharing a live wall (13n.1 (b), #267 (2))', 'a railgun\'s magazine holds steel slugs and does not explode (13n.1 (b))', 'a missile magazine holds whole missiles and explodes by their warheads and fuel, missile.warheadEnergy + 1/2 m (acceleration x burnTime)^2 each (13n.1 (b) (c), #296 (1))'],
  dependsOn: [],
  setup: 'a T1 cluster: an M turret at [0, 0] (ready store empty, holding fire), an M magazine at [2, 0] loaded with 900 kg of HE turret rounds or 900 kg of railgun slugs, an M reactor at [0, 2]; 10 s stepped; an M round into the magazine\'s row from -x; a missile magazine loaded { type: missile, missileMass: 900 } and shot the same way (13n.4 K4, #296 (1)); (mixed) the magazine loaded with 900 kg of AP turret rounds, then its type set to railgun (#282 (7) (a))',
  measure: 'the turret\'s ready store and the rounds left after 10 s; the able rule for the turret; magazineContents\' energy per type; whether the round sets the magazine off (its own explosion: the blast may set off the reactor next to it); the missile magazine\'s missiles, its contents\' energy, its explosion\'s energy and the missiles left after the shot',
  tolerance: 'counts exact; energies 1e-12',
  criterion: '(turret magazine) the store full, 4 rounds, 146 left, the turret able; contents 1.2e9 J (hand-worked); the shot detonates it; (railgun magazine) nothing fed, the store empty, the turret not able (why dry), 900 kg of slugs still aboard; contents 0 J; the shot does not set it off (no explosion); (missile magazine) it loads, 4 missiles aboard; contents 4 x (20 + 36) MJ = 224 MJ (hand-worked, 1e-12); the shot detonates it, its explosion 224 MJ (1e-12), no missile left; (mixed) 150 AP rounds aboard a railgun-typed magazine: before the first step and after 10 s the turret is not able (why dry), nothing fed, the store empty, 150 rounds still aboard',
  tunable: ['ammo.wallFeed', 'turret.readyRounds', 'magazine.capacity', 'kinetic.chargeEnergy', 'he.blastEnergy', 'magazine.detonationSpeed', 'missile.mass', 'missile.warheadEnergy', 'missile.acceleration', 'missile.burnTime'],
  locked: null,
  cases() {
    return [{ type: 'turret', part: 'feed' }, { type: 'railgun', part: 'feed' }, { type: 'turret', part: 'shot' }, { type: 'railgun', part: 'shot' }, { type: 'missile', part: 'shot' }, { type: 'mixed', part: 'feed' }];
  },
  expected(ctx, c) {
    if (c.type === 'missile') return { missiles: 4, energy: 4 * (20e6 + 0.5 * 200 * (30 * 20) ** 2), explodes: true, left: 0 };
    if (c.type === 'mixed') return { store: 0, left: 150, able: false, why: 'dry' };
    if (c.part === 'shot') return { explodes: c.type === 'turret', energy: c.type === 'turret' ? 1.2e9 : 0 };
    return c.type === 'turret' ? { store: 4, left: 146, able: true, why: null, energy: 1.2e9 } : { store: 0, slugMass: 900, able: false, why: 'dry', energy: 0 };
  },
  run(ctx, c) {
    if (c.type === 'missile') {
      const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [6, 6] }), mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
      let thrown = null;
      try { loadMagazine(world, mag, { type: 'missile', missileMass: 900 }); } catch (e) { thrown = String(e.message); }
      if (thrown) return { thrown };
      const contents = magazineContents(world, mag), p = ctx.params, fx = ctx.fixed, m = p.kinetic.roundMass.value, { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
      const res = fireRound(world, { mass: m, velocity: p.kinetic.muzzleVelocity.value, area: A }, pathAlong(world, [[2, 1], [3, 1]]), 'round-1');
      const ex = world.log.events.filter((e) => e.type === 'explosion' && e.room === 'magazine');
      return { thrown: null, missiles: contents.missiles, energy: contents.energy, entry: res.entry[0] / m, explosions: ex.map((e) => e.energy), left: mag.magazine.missiles };
    }
    const { world, turret, mag } = cluster(ctx, c.type);
    if (c.type === 'mixed') {
      const s0 = weaponStates(world).find((x) => x.room === turret);
      for (let i = 0; i < 600; i++) step(world);
      const st = weaponStates(world).find((x) => x.room === turret);
      return { able0: s0.able, why0: s0.why, store: turret.turret.ammo, left: mag.magazine.ap + mag.magazine.he, able: st.able, why: st.why };
    }
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
    if (c.type === 'mixed') checks = { 'not able before the first step (why dry)': a.able0 === e.able && a.why0 === e.why, 'nothing fed: the ready store empty': a.store === e.store, '150 rounds still aboard': a.left === e.left, 'not able after 10 s (why dry)': a.able === e.able && a.why === e.why };
    else if (c.type === 'missile') checks = { 'loads (no throw)': a.thrown === null, '4 missiles aboard': a.missiles === e.missiles, 'magazineContents energy 224 MJ (1e-12)': close(e.energy, a.energy, 1e-12), 'entered above the threshold\'s top (600 m/s)': a.entry >= TOP, 'detonates once, its explosion 224 MJ (1e-12)': !!a.explosions && a.explosions.length === 1 && close(e.energy, a.explosions[0], 1e-12), 'no missile left': a.left === e.left };
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
