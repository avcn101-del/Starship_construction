// events.js — the simulation's event list (#156, DESIGN.md 13c.4).
// The kernel emits; presentation and audio subscribe later. Every event has
// t (s), type, room (id), cause (id of what caused it) and crew (crew aboard
// the room after the event, for sound); some types carry more (below).
// The cascade tree (#41, 13l.1, L4b): every event also gets an `id` (the log's
// prefix and its place in the log) and a `parent`: a root (a shot id, a beam
// id, 'heat', 'launch') or the id of an earlier event of the same log. The
// parent is the one the emitter names, else the innermost event the kernel is
// handling (log.context), else the event's cause. `cause` keeps its meaning
// (a reason or the root, as before L4b).

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
  detonation: ['cell', 'speed', 'channel'], // a round entered a standing cell of a magazine with rounds at magazine.detonationSpeed or more (speed: its entry speed relative to the hull, m/s; #273 (c), 13n.1 (b)); the explosion is its child
  unmanned: [], // a room that requires crew has none left while a cell stands: no function, as if shut down (13n.1 (b), #277 O3); its parent is the crew-died event
  shot: ['energy', 'channel'], // energy: muzzle energy (J)
  'cease-fire': [],
  'beam-stopped': [],
  'shield-down': [],
  'control-lost': [],
  'control-restored': [], // the bridge gives control again after a restart (#189 (3))
  'heat-vented': ['energy'], // a destroyed heat sink cell let its heat above rest out to space (J, #198)
  disabled: ['since'], // the battle (js/battle.js, 13l.1): no able weapon for battle.disabledSeconds since `since` (s); room: the last weapon to lose its ability
  destroyed: ['by'], // the battle: 'explosion' (a reactor's; a magazine's is a blast and ends nothing by itself, #274, 13n.1 (b)) or 'pieces' (the largest fragment under battle.wreckFraction of the undock mass)
};

/** An event log; `prefix` starts every event id (a battle gives each ship its own). */
export function createLog(prefix = 'e') {
  return { events: [], context: [], prefix };
}

/**
 * Append an event after checking it carries every field its type needs, with
 * its id and its parent (an explicit `parent`, else the innermost event of
 * log.context, else its cause).
 */
export function emit(log, event) {
  const need = EVENT_FIELDS[event.type];
  if (!need) throw new Error(`unknown event type ${event.type}`);
  for (const f of ['t', 'type', 'room', 'cause', 'crew', ...need]) {
    if (event[f] === undefined || event[f] === null) throw new Error(`event ${event.type} lacks ${f}`);
  }
  event.id = `${log.prefix}${log.events.length + 1}`;
  if (event.parent === undefined || event.parent === null) event.parent = log.context.length ? log.context[log.context.length - 1] : event.cause;
  log.events.push(event);
  return event;
}

/** Run fn with `event` as the parent of every event emitted inside it (13l.1). */
export function within(log, event, fn) {
  if (!event) return fn();
  log.context.push(event.id);
  try { return fn(); } finally { log.context.pop(); }
}

/** A root of the cascade tree (13l.1): a shot id, a beam id, 'heat' or 'launch'. */
export const isRoot = (cause) => cause === 'heat' || cause === 'launch' || /(^|:)(shot|beam)-\d+$/.test(String(cause));

/**
 * The cascade tree of a log (13l.1): roots in order of first use, each with its
 * events and theirs, depth first; `errors` lists every event whose parent is
 * neither a root nor the id of an earlier event of the log.
 */
export function cascadeTree(events) {
  const seen = new Set(), children = new Map(), roots = [], errors = [];
  for (const e of events) {
    if (seen.has(e.parent)) { children.get(e.parent).push(e); }
    else if (isRoot(e.parent)) { if (!children.has(e.parent)) { children.set(e.parent, []); roots.push(e.parent); } children.get(e.parent).push(e); }
    else errors.push(e);
    seen.add(e.id);
    children.set(e.id, []);
  }
  const node = (e) => ({ event: e, children: children.get(e.id).map(node) });
  return { roots: roots.map((r) => ({ root: r, children: children.get(r).map(node) })), errors };
}

/** The tree as indented lines: each root, then each event it caused, two spaces deeper per generation. */
export function treeLines(tree, format = (e) => `${e.id} ${e.type} ${e.room} (cause ${e.cause}) t=${e.t.toFixed(4)}`) {
  const out = [];
  const walk = (n, d) => { out.push(`${'  '.repeat(d)}${format(n.event)}`); for (const c of n.children) walk(c, d + 1); };
  for (const r of tree.roots) { out.push(r.root); for (const c of r.children) walk(c, 1); }
  for (const e of tree.errors) out.push(`ERROR ${format(e)}: parent ${e.parent} is neither a root nor an earlier event`);
  return out;
}
