# IDEAS — the idea registry

Ideas that are **not built**. An idea is built only when it passes the four
gates (`DESIGN.md` §2: serves a core law, opens or strengthens an underdog
path, readable on screen, reuses an existing model) and has an owner in the
coverage table (`DESIGN.md` §8). Moving an idea out of this file is a
decision: log it in `DECISIONS.md` and reflect it in `DESIGN.md`.

| Idea | Why it is interesting | Gate risk | Status |
|---|---|---|---|
| Named crew with veterancy | Attachment to people beyond their names | A new system (crew XP); bridge-sim cut crew manning | waiting |
| Escape pods | Crew flee before a breach; drama with a cause | Needs crew movement, which the owner rejected | waiting |
| Surrendered enemy crew join yours | Replacements with a story | A new system; touches the economy of replacements | waiting |
| Beam modes (focused / wide) | Beams gain a choice like ammunition | Beams already have an identity (no ammunition) | waiting |
| Battery / capacitor room | Store power for a burst: a time window | Proposed in a rejected early room list, never approved | waiting |
| Cofferdam (a 1×N empty hold) | Real ships' void space between machinery and crew | Its heat role vanished under the coolant-loop model (#200); a blast buffer only, which the 2×2 hold already is | deferred (#201) |
| Heat sink room | Store heat for a while, then vent: a time window | Passed the four gates (throughput law; time-window path; glows as it fills; the heat model with two constants) | adopted (#197, built at L2) |
| Sound carried through the hull | Only your own ship is heard | Adopted as a principle in `DESIGN.md` §11; the audio itself waits for Mission 0 | adopted (principle) |
| Rescuing crew on dark fragments | A different ending to a fragment's last words | — | adopted (#88) |
| Blast resistance from mass | Blast, like rounds and beams, would then follow the mass of a cell (#232) | Not in the path model; needs its own estimate | waiting (#232, `DESIGN.md` §13i.1) |
| Tumble and sloped armour (#6) | A round hitting obliquely is turned by the off-centre contact force and presents more area; angling the ship becomes a lever, as with real tank armour | Needs a facing the player controls (prototype v2's helm) and an estimate of the effect | waiting (#230) |
| Plasma toroid gun (MARAUDER) | An energy 'bullet': a magnetically self-confined plasma ring that bursts on contact (#228) | Few public numbers; lifetime and range at 0.6–1.5 km unverified; a surface effect, not penetration; the beam role went to the particle beam (#229) | waiting |
| Tractor beam and mines | Deferred when ramming and boarding were cut (#20) | Not yet checked against the four gates | deferred (#20) |
| Reactor shield mass from the layout (from the owner's discussion, 2026-10-22) | A reactor's shield mass would follow how far its crewed rooms are: a 4π shield for crew beside it, a shadow cone for crew far behind it, so keeping the crew away buys a lighter, faster ship with an exposed reactor. Sources (#281; quotes gathered by another AI, checked for consistency by the design partner): an SP-100-class shadow shield on a 70 m boom 12–20 t against a 4π shield at 3 m 35–45 t (NASA TM-101403, Table III); a 10 MWe NEP system with a shadow shield at 9.9 kg/kWe (NASA TM-105212) against the M reactor's 30 kg/kWe (600 t for 20 MWe). Gates claimed, not yet measured: dependency and throughput (the crew's safety hangs on distance or on mass, and mass costs acceleration: R1 911 t with the reactor at 66 %, #281); an underdog path (a long, light ship against a compact, heavy one); readable in the shipyard (shield mass and crew distance on the readout); reuses the falloff field (exponent 2, #99) attenuated by the mass on the path (#230) | No radiation or dose in the kernel yet: a field from the reactor and a dose per crewed room is new behaviour; no source splits a 20 MWe plant into core and shield (#281); it changes R1's mass and so its pinned scenarios | waiting (#281) |
