import { createWorld, addRoom, loadMagazine, loadTurret, setRadiators, step, roomTemperature } from '../../../js/rooms.js';
import { depositHeat } from '../../../js/heat.js';
import { weaponStates } from '../../../js/battle.js';

// K5 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #277 O3, #278): a room that requires crew and has none left while its
// cells stand is unmanned: no function, as if shut down, for good (nobody comes back), and `unmanned` joins the able
// rule after `heat`, its parent the crew-died event; a new event 'unmanned' (its parent the same crew-died event).
// Until L5a a crewless turret kept firing once it cooled (nothing in rooms.js read room.crew for function).
// A T1 cluster: an M turret at [0, 0] with four radiators on its open edges, firing (not holding), its ready store 4
// and an M magazine of 150 HE at [2, 0] feeding it; an M reactor at [0, 2] (its power path, so the able rule reaches
// past power). At step 150 (2.5 s) a fixture deposits heat into the turret: (critical) 4 x 6e5 J/K x 100 K = 2.4e8 J,
// from about 290 K to about 390 K, past crewed critical (380 K): in that step it is hot, overheated (shut down) and
// critical (its 3 crew die); (overheated) 4 x 6e5 x 70 K = 1.68e8 J, to about 360 K, past overheated (350 K) and
// below critical: shut down, crew alive. The radiators cool it below crewed hot (330 K) in a few minutes, when the
// room restarts (the 'restart' event); 600 s are stepped. Hand-worked: shots at 0 and 2 s (turret.fireRate 0.5 /s from
// t = 0), so 2 shots before the deposit; the cells are never damaged. Events carry the time at the end of their step:
// those of the deposit's step read t = (150 + 1) dt.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const STEPS = 36000, AT = 150;

export default {
  id: 'L1.room.unmanned',
  level: 'L1',
  laws: ['a room that requires crew and has none is unmanned: no function, as if shut down (13n.1 (b), #277 O3)', 'unmanned joins the able rule after heat, its parent the crew-died event (13n.1 (b))', 'the crew of a crewed room die at critical heat (#18b)'],
  dependsOn: [],
  setup: 'a T1 cluster: an M turret at [0, 0] with 4 radiators, firing, ready store 4, fed by an M magazine of 150 HE at [2, 0]; an M reactor at [0, 2]; at step 150 the turret takes 2.4e8 J (critical) or 1.68e8 J (overheated) from a fixture; 600 s stepped (13n.4 K5)',
  measure: 'the turret\'s shots before and after the deposit; its crew; the hot, overheated, critical, crew-died, unmanned and restart events and their parents; the able rule\'s condition and parent at the end; its cells\' integrity',
  tolerance: 'counts and event order exact',
  criterion: '(critical) the crew die in the deposit\'s step, the unmanned event in that step with the crew-died event as its parent; the room restarts (cooled below hot) and fires no shot after the crew-died step; at the end the able rule names unmanned with the crew-died event as its parent; every cell intact; 2 shots before (hand-worked); (overheated, the control) no crew died, no unmanned event, it restarts and fires again after the restart (it may run its magazine dry by the end), the able rule not naming unmanned; 2 shots before',
  tunable: ['thermal.crewedOverheated', 'thermal.crewedCritical', 'thermal.crewedHot', 'thermal.coupledCrewed', 'turret.fireRate', 'radiator.area'],
  locked: { date: '2026-10-22', hash: 'c98483b5' },
  cases() {
    return [{ heat: 'critical', Q: 4 * 6e5 * 100 }, { heat: 'overheated', Q: 4 * 6e5 * 70 }];
  },
  expected(ctx, c) {
    return { before: 2, unmanned: c.heat === 'critical' };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [6, 6] });
    const turret = addRoom(world, 'turret', { id: 'turret', cell: [0, 0] }), mag = addRoom(world, 'magazine', { id: 'magazine', cell: [2, 0] });
    addRoom(world, 'reactor', { id: 'reactor', cell: [0, 2] });
    loadMagazine(world, mag, { heMass: 900 });
    loadTurret(turret, 4);
    setRadiators(turret, 4, world);
    let before = 0, T0 = null;
    for (let i = 0; i < STEPS; i++) {
      if (i === AT) { before = turret.turret.shots; T0 = roomTemperature(turret); depositHeat(turret.heat, c.Q); }
      step(world);
    }
    const ev = world.log.events.filter((e) => e.room === 'turret'), stepOf = (e) => Math.round(e.t / ctx.dt);
    const died = ev.find((e) => e.type === 'crew-died'), un = ev.find((e) => e.type === 'unmanned'), restart = ev.find((e) => e.type === 'restart');
    const crit = ev.find((e) => e.type === 'critical'), shots = ev.filter((e) => e.type === 'shot');
    const st = weaponStates(world).find((x) => x.room === turret);
    return {
      before, T0, crew: turret.crew, intact: turret.cells.every((x) => x.integrity === 1 && !x.destroyed),
      died: died ? { step: stepOf(died), id: died.id } : null, critical: crit ? stepOf(crit) : null,
      unmanned: un ? { step: stepOf(un), parent: un.parent } : null, restart: restart ? stepOf(restart) : null,
      after: died ? shots.filter((e) => stepOf(e) >= stepOf(died)).length : null,
      afterRestart: restart ? shots.filter((e) => stepOf(e) >= stepOf(restart)).length : null,
      able: { able: st.able, why: st.why, parent: st.parent },
    };
  },
  compare(e, a) {
    const checks = { '2 shots before the deposit (hand-worked)': a.before === e.before, 'cells intact': a.intact, 'it restarts (cooled below hot)': a.restart !== null };
    if (e.unmanned) {
      Object.assign(checks, {
        'the crew die in the deposit\'s step, at critical': !!a.died && a.died.step === AT + 1 && a.critical === AT + 1 && a.crew === 0,
        'unmanned in that step, its parent the crew-died event': !!a.unmanned && a.unmanned.step === a.died.step && a.unmanned.parent === a.died.id,
        'no shot after the crew-died step': a.after === 0,
        'the able rule: unmanned, its parent the crew-died event': a.able.able === false && a.able.why === 'unmanned' && a.able.parent === a.died.id,
      });
    } else {
      Object.assign(checks, { 'no crew died, not unmanned': a.died === null && a.unmanned === null && a.crew > 0, 'fires again after the restart': a.afterRestart > 0, 'the able rule does not name unmanned at the end': a.able.why !== 'unmanned' });
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
