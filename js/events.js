// events.js — the simulation's event list (#156, DESIGN.md 13c.4).
// The kernel emits; presentation and audio subscribe later. Every event has
// t (s), type, room (id), cause (id of what caused it) and crew (crew aboard
// the room after the event, for sound); some types carry more (below).

/** Extra fields each event type must carry, beyond t, type, room, cause, crew. */
export const EVENT_FIELDS = {
  hot: [], // temperature reached the room's hot threshold
  overheated: [], // reached overheated
  critical: [], // reached critical
  shutdown: [], // the room shut itself down (overheated)
  restart: [], // cooled below hot after a shutdown
  'reactor-restart': [], // a SCRAMmed reactor restarts reactor.restartTime after control is back, below hot (#82, 13k.1)
  'crew-died': ['deaths'],
  'cell-damaged': ['channel', 'cell', 'integrity'], // a hit left the cell with integrity above 0 (#206)
  'cell-destroyed': ['channel', 'cell'],
  'cell-repaired': ['cell'],
  'plate-damaged': ['channel', 'plate', 'integrity'], // an armour plate on a wall segment (13l.1); room: the room it is mounted on
  'plate-destroyed': ['channel', 'plate'], // the plate is a hole; its mass leaves as debris
  scram: ['energy'], // energy: decay heat still to come (J)
  breach: [], // reactor containment breached: the countdown starts
  meltdown: [],
  'cook-off': [],
  explosion: ['energy', 'channel'],
  shot: ['energy', 'channel'], // energy: muzzle energy (J)
  'cease-fire': [],
  'beam-stopped': [],
  'shield-down': [],
  'control-lost': [],
  'control-restored': [], // the bridge gives control again after a restart (#189 (3))
  'heat-vented': ['energy'], // a destroyed heat sink cell let its heat above rest out to space (J, #198)
};

export function createLog() {
  return { events: [] };
}

/** Append an event after checking it carries every field its type needs. */
export function emit(log, event) {
  const need = EVENT_FIELDS[event.type];
  if (!need) throw new Error(`unknown event type ${event.type}`);
  for (const f of ['t', 'type', 'room', 'cause', 'crew', ...need]) {
    if (event[f] === undefined || event[f] === null) throw new Error(`event ${event.type} lacks ${f}`);
  }
  log.events.push(event);
  return event;
}
