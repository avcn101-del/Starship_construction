# Constants

Generated from `js/data.js` (commit `edcf0bd`) by `node tools/constants.mjs $(git log -1 --format=%h -- js/data.js) > CONSTANTS.md`. Do not edit by hand: change `js/data.js` (the integrator does) and regenerate. This is the only table of values and ranges (`DESIGN.md` §5.1); the history of each value is in `DECISIONS.md` and `HISTORY.md`.

A tunable constant is `value` at the T1 cell edge (5 m), scaled by (edge / 5 m)^k. `approved` is the flag in `data.js`.

## PARAMS (tunable)

| group.name | value | unit | min | max | k | approved | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kinetic.roundMass | 6 | kg | 2 | 20 | 3 | true | size M round at T1: 6 kg of solid steel, 62 mm, a light naval gun (#166, #203 D, #206) |
| kinetic.muzzleVelocity | 800 | m/s | 500 | 1000 | 0 | true | #166 |
| kinetic.chargeEnergy | 6000000 | J | 2000000 | 20000000 | 3 | true | propellant energy per M round (about 1.5 kg of propellant, x 12 with the round, #206); an AP magazine explodes by this alone, HE by this plus the warhead (#91, #183) |
| kinetic.hitsToWreck | 3 | hits | 1 | 8 | 0 | true | a round passing a room cell takes 1 / this of its integrity; the cell it stops in loses (sectional momentum left / R) / this (#203 D, #206) |
| armour.cellMass | 10000 | kg | 3000 | 30000 | 3 | true | one armour cell at T1: 5 cm of steel over 25 m^2, sigma 400 kg/m^2 (L0's armour cell, #235); armour fittings are plates on wall segments (armour.plateThickness, #255, #256) |
| armour.plateThickness | 0.2 | m | 0.01 | 0.4 | 1 | true | a steel plate on a hull edge or a shared wall segment (walls only, never decks): a path crossing it meets sigma = this x FIXED.steelDensity once (1570 kg/m^2 at 0.2 m); its mass, this x steel density x edge^2, joins its room; 0.2 m is a heavy cruiser's belt (an Iowa's 0.31 m); k = 1, a plate scales with the cell like the round; approved by the lead designer (#255, #256) |
| matter.kineticResistance | 1545.364227446998 | m/s | 750 | 3125 | 0 | true | c: sectional momentum a cell resists per kg/m^2 of its matter, 1545.4 m/s; a round is as strong per kg of steel (S = c rho L) (#232, #235) |
| matter.burnEnergyPerKg | 3000 | J/kg | 1000 | 10000 | 0 | true | q: beam energy that ruins a cell per kg of the cell; a cell loses P F_i dt / (q x cell mass) of its integrity per step; 30 MJ / 10 t on L0's armour cell; 1.2 MJ/kg melts steel, so ruin is 0.25 % of the cell melted along the channel (#240 (1), #243, F1) |
| matter.blastPerKg | 100 | J/kg | 30 | 300 | 0 | true | q_b: blast energy a cell absorbs per kg of the cell before it is destroyed; 1 MJ / 10 t on L0's armour cell; a hold cell absorbs 0.3 MJ, a reactor cell 15 MJ (#240 (1), (6), #243, F3) |
| he.blastEnergy | 2000000 | J | 500000 | 5000000 | 3 | true | size M HE warhead (#166) |
| he.coupling | 0.5 |  | 0.2 | 0.8 | 0 | true | fraction of a contact burst's energy that enters the hull; the rest vents to space at the open face (#169, #176) |
| beam.power | 5000000 | W | 1000000 | 20000000 | 2 | true | size M beam (#166) |
| beam.gradient | 1.6021766340000001e-12 | J/m | 8.010883170000001e-13 | 3.2043532680000003e-12 | 0 | true | 10 MeV/m (1.6022e-12 J/m) at T1, range 5-20 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV (ESS: about 6 MeV/m, cavities 16.7-20 MV/m; #234, #235). k = 0, its T1 meaning: at another tier a bay of N cells fires the energy whose CSDA range in iron, in armour cells of that tier, equals the T1 bay's (rooms.js beamEnergy solves it; #249, the power law k = -0.41 withdrawn, #248) |
| shield.budget | 10000000 | W | 2000000 | 40000000 | 2 | true | size M absorption rate (#166) |
| shield.radius | 40 | m | 20 | 80 | 1 | true | radius where the field is at half strength (#166) |
| shield.kineticStop | 1045455.6555066435 | kg/(m*s) | 522727.82775332173 | 2090911.311013287 | 1 | true | sectional momentum the field stops per round at full strength: one S round at T1, computed (#166, #171) |
| shield.buffer | 10000000 | J | 2000000 | 40000000 | 3 | true | energy buffer for impulses (rounds) of an M generator, x its footprint, surviving fraction and power fraction like the budget; k = 3 with the energy it pays, so 5.86 M rounds per buffer at every tier (#177, #240 (4), #243, F15) |
| shield.powerDraw | 2000000 | W | 500000 | 10000000 | 2 | true | size M generator while on; becomes heat, plus everything absorbed (#21, #183) |
| thermal.plantHot | 600 | K | 450 | 750 | 0 | true | reactor, beam bay, shield generator, engine: function degrades (#182, #183) |
| thermal.plantOverheated | 800 | K | 650 | 950 | 0 | true | plant rooms shut down; restart below hot (#182, #183) |
| thermal.plantCritical | 1000 | K | 850 | 1300 | 0 | true | plant rooms: crew at their stations die, a reactor melts down (#182, #183) |
| thermal.crewedHot | 330 | K | 320 | 350 | 0 | true | bridge, quarters, turret, missile bay, hold (#182, #183) |
| thermal.crewedOverheated | 350 | K | 340 | 380 | 0 | true | crewed rooms shut down; restart below hot (#182, #183) |
| thermal.crewedCritical | 380 | K | 360 | 420 | 0 | true | crewed rooms: the crew die (#18b, #182, #183) |
| thermal.magazineHot | 330 | K | 320 | 350 | 0 | true | magazine (#182, #183) |
| thermal.magazineOverheated | 350 | K | 340 | 380 | 0 | true | magazine (#182, #183) |
| thermal.magazineCritical | 450 | K | 400 | 500 | 0 | true | magazine cook-off (#91, #182, #183) |
| thermal.coupledReactor | 5500000 | J/K | 2000000 | 20000000 | 3 | true | per reactor cell: a 50 MW_th PWR's primary water (0.09 t/MW_th, 4.5 t, 19 MJ/K) and vessel steel (0.12 t/MW, 6 t, 2.7 MJ/K) over four cells; an estimate scaled from a 3400 MW_th plant (#243) |
| thermal.coupledBeamBay | 1000000 | J/K | 500000 | 3000000 | 3 | true | per beam bay cell: 2.5 t of accelerator at 400 J/(kg K) (#243) |
| thermal.coupledEngine | 1400000 | J/K | 500000 | 4000000 | 3 | true | per engine cell: 3.1 t of machinery at 450 J/(kg K) (#243) |
| thermal.coupledShieldGenerator | 3200000 | J/K | 1000000 | 6000000 | 3 | true | per shield generator cell: 7 t of machinery at 450 J/(kg K); no real analogue (#202, #243) |
| thermal.coupledCrewed | 600000 | J/K | 200000 | 2000000 | 3 | true | per bridge, quarters, turret or missile bay cell: the old value kept, air (0.15 MJ/K) and fittings; no source found (#243) |
| thermal.coupledMagazine | 600000 | J/K | 200000 | 2000000 | 3 | true | per magazine cell: 900 kg of rounds (0.4 MJ/K) and racks (#243) |
| thermal.coupledHold | 1350000 | J/K | 500000 | 3000000 | 3 | true | per hold cell: 3 t of structure, nothing else (#243) |
| thermal.coupledHeatSink | 1350000 | J/K | 500000 | 3000000 | 3 | true | per heat sink cell before its water: 3 t of structure; x heatsink.capacityFactor, the water adding as before (#198, #243) |
| thermal.coupledArmour | 4500000 | J/K | 2000000 | 8000000 | 3 | true | per armour cell: 10 t of steel (450 J/(kg K)); an armour plate (#256) adds its mass x this / armour.cellMass to its room's heat capacity (#258, #248 Q13) |
| thermal.coupledRailgun | 4500000 | J/K | 2000000 | 8000000 | 3 | true | per railgun cell: 10 t of steel; the railgun stays data only until L5 (#243) |
| structure.cellMass | 3000 | kg | 2000 | 6000 | 3 | true | structure only (frames, decks, bulkheads): hold, magazine and heat sink before contents, and the structure under an engine's or a beam bay's machinery (#243); 24 kg/m^3 at T1, an estimate without a found source (#221, #235) |
| cellMass.crewed | 14800 | kg | 11000 | 16500 | 3 | true | bridge, quarters, turret, missile bay: 118 kg/m^3, ISS Destiny (14.5 t in 8.5 m x 4.3 m), low end; ISS Harmony about 131 kg/m^3 (#234, #235) |
| cellMass.reactor | 150000 | kg | 100000 | 200000 | 3 | true | 1200 kg/m^3: US submarine reactor compartments, 1130 t / (pi 5^2 x 12 m), the cited low end (#234, #235, #243, F24) |
| cellMass.shieldGenerator | 10000 | kg | 5000 | 20000 | 3 | true | no real analogue (the shield is the premise, #202): the old average (#235) |
| cellMass.railgun | 10000 | kg | 5000 | 20000 | 3 | true | no real analogue yet: the old average (#235) |
| radiator.area | 25 | m^2 | 10 | 100 | 2 | true | one panel per hull segment; radiates emissivity x sigma x area x T^4 of its room (#143, #183) |
| radiator.mass | 250 | kg | 100 | 1000 | 2 | true | one panel, 10 kg/m^2 like an ISS radiator; at its edge's midpoint (#208, #210) |
| rcs.force | 1000000 | N | 300000 | 5000000 | 2 | true | one RCS fitting while fired, along its edge's inward normal at the edge's midpoint; re-tuned 100 kN -> 1 MN for ships of real density (#15, #208, #210, #221); R1 (about 950 t) turns 90 degrees in a few seconds on its two couples (13k.3) |
| rcs.powerDraw | 200000 | W | 50000 | 1000000 | 2 | true | while fired, from its host room; x engine.heatFraction is heat in the host (#208, #210) |
| rcs.mass | 200 | kg | 50 | 1000 | 2 | true | one RCS fitting, at its edge's midpoint; k = 2: a thruster scales with its force (#208, #210, #243, F11) |
| reactor.power | 20000000 | W | 5000000 | 50000000 | 2 | true | size M, electric, delivered on demand; k = 2 matches its consumers (#183) |
| reactor.heatPerPower | 1 |  | 0.5 | 3 | 0 | true | waste heat per delivered watt (#183) |
| reactor.decayFraction | 0.07 |  | 0.03 | 0.15 | 0 | true | decay heat at SCRAM as a fraction of the thermal power at SCRAM (#81, #183) |
| reactor.decayTime | 900 | s | 300 | 1800 | 0 | true | exponential decay time of the decay heat (#4, #81, #183) |
| reactor.breachFraction | 0.5 |  | 0.25 | 0.75 | 0 | true | destroyed cells / total that start the breach countdown (#81, #183) |
| reactor.breachCountdown | 10 | s | 3 | 30 | 0 | true | from breach to explosion (#81, #183) |
| reactor.explosionEnergy | 200000000 | J | 50000000 | 1000000000 | 3 | true | breach and meltdown explosion (#81, #183) |
| reactor.restartTime | 60 | s | 30 | 300 | 0 | true | a SCRAMmed reactor restarts this long after control is back, once below hot (an automatic rule); naval reactors restart in minutes, an estimate (big PWRs take hours for xenon) (#82, #243) |
| beambay.efficiency | 0.4 |  | 0.2 | 0.8 | 0 | true | draw = beam power / efficiency; the rest is heat (#183). A maser-era value (#202), kept for an accelerator plus neutraliser, whose real wall-plug efficiency is probably lower: a question for L5 (#243, F26) |
| beambay.machineryMass | 2500 | kg | 1000 | 6000 | 1 | true | accelerator per beam bay cell: 1 t per metre (#235's estimate); k = 1, per metre of length; a cell is structure.cellMass + this (#243, F11) |
| engine.thrust | 15000000 | N | 4000000 | 60000000 | 2 | true | one engine, a self-fuelled torch; re-tuned 2 -> 15 MN for ships of real density (#54, #183, #203 A, #210, #221); R1 (about 950 t) reaches about 1.6 g (13k.3) |
| engine.machineryMass | 2700 | kg | 1500 | 6000 | 2 | true | engine per cell: a 15 MN engine at the F-1's vacuum thrust per kg (7.77 MN / 8.4 t, 925 N/kg) over 6 cells; k = 2 with the thrust; a cell is structure.cellMass + this (#243, F11, F23) |
| engine.powerDraw | 10000000 | W | 2000000 | 40000000 | 2 | true | at full throttle; ships have no propellant (#140, #183) |
| engine.heatFraction | 0.3 |  | 0.1 | 1 | 0 | true | heat per watt drawn (#183) |
| turret.fireRate | 0.5 | 1/s | 0.2 | 2 | -1 | true | size M; big guns fire slower (#183) |
| turret.powerDraw | 200000 | W | 50000 | 1000000 | 2 | true | size M, while able to fire (#183) |
| turret.heatPerShot | 300000 | J | 100000 | 1000000 | 3 | true | size M (#183) |
| turret.machineryMass | 1975 | kg | 1750 | 2500 | 3 | true | mount per turret cell: the OTO Melara 76/62 Super Rapid without ammunition, 7.9 t (the manufacturer's brochure through a mirror; 7.62 t on navweaps) over an M turret's four cells; the Bofors 57 Mk3's 7.0 t the floor; a cell is structure.cellMass + this, as the engine's (#281 (2), #285; approved as the plan's, #272 (2)) |
| turret.readyRounds | 4 | rounds | 2 | 10 | 0 | true | rounds held in the turret, of its own size; it fires from this store and the magazine feed refills it (#193, #195) |
| magazine.capacity | 900 | kg | 300 | 3000 | 3 | true | ammunition mass a magazine holds: 150 M rounds (#91, #183, #206) |
| magazine.detonationSpeed | 400 | m/s | 200 | 600 | 0 | true | a magazine with rounds detonates when a round enters one of its cells at this speed or more (relative to the hull; the round rule's momentum on entering over the round's mass, whether it stops there or passes); a destroyed cell alone no longer detonates it: between an M round after one crewed cell (333 m/s) and after a shield generator cell (485 m/s), so a crewed screen protects against M rounds, not L; the first rung-1 lever of the L5 pace study (#273 (c), #278; approved as the plan's, #272 (2)) |
| quarters.crewPerCell | 4 | crew | 1 | 8 | 2 | true | crew housed per surviving cell: 24 in a T1 quarters, 6 m^2 of a 25 m^2 cell per sleeper (a warship's berthing); 3 -> 4 so R1's 20 crew have berths (validateShip's crew rule) (#60, #65, #183, #220 (5), #253) |
| quarters.powerDraw | 50000 | W | 10000 | 200000 | 2 | true | #183 |
| repair.massRate | 200 | kg/s | 50 | 1000 | 0 | true | cell mass a quarters restores per second with all cells surviving: a cell regains massRate / cell mass of integrity per second; the old 0.02/s on a 10 t cell (#51, #183, #240 (1), #243, F13) |
| repair.radius | 30 | m | 10 | 80 | 1 | true | half-strength radius of the repair field (#99, #183) |
| bridge.powerDraw | 100000 | W | 20000 | 500000 | 2 | true | from the backup supply when the reactor is cut; the backup has no limit (#147, #183) |
| conduction.wall | 4000 | W/(K*m) | 1000 | 20000 | 1 | true | coolant wall (between two coolant rooms, the machinery's coolant loop) per metre of live wall: G = this x L x harmonic mean of the two rooms' coolant factors; two M rooms over 10 m relax with tau = 30 s (#193, #195, #200, #201) |
| conduction.passive | 25 | W/(K*m) | 5 | 100 | 1 | true | passive wall (every wall with a crewed room, a magazine or a hold on either side) per metre of live wall: G = this x L x harmonic mean of the passive factors; a steel bulkhead with air on both sides, about 250 W/K for 10 m x 5 m (#200, #201) |
| conduction.holdFactor | 0.1 |  | 0.02 | 0.3 | 0 | true | passive factor of an empty hold (every other room 1), on passive walls since #201; a hold-room passive wall conducts 0.18 of an ordinary one (#18c, #193, #195, #201) |
| lifeSupport.capacityPerCell | 50000 | W | 10000 | 200000 | 2 | true | heat a powered crewed room or magazine above the setpoint pumps into its coolant neighbours, per surviving cell: bridge 200 kW, quarters 300 kW, magazine 200 kW (#201) |
| heatsink.capacityFactor | 5 |  | 2 | 10 | 0 | true | a heat sink's heat capacity per cell is thermal.coupledHeatSink x this; the extra (this - 1) is water (#198, #201, #243) |
| heatsink.conductivityFactor | 3 |  | 1 | 5 | 0 | true | a heat sink's coolant factor in the harmonic mean of coolant walls (#198, #201) |
| power.wallCapacity | 2000000 | W/m | 500000 | 5000000 | 1 | true | power a live shared wall carries per metre: 10 m carries 20 MW, a whole M reactor (#12, #193, #195) |
| ammo.wallFeed | 0.72 | kg/(s*m) | 0.24 | 3.6 | 1 | true | rounds a live wall between a magazine and a room it feeds carries per second per metre: 5 m feeds 3.6 kg/s, 0.6 M rounds/s (#18, #193, #195, #206) |
| battle.cullDistance | 3000 | m | 1000 | 10000 | 1 | true | a round or debris farther than this from every body leaves play, its momentum booked as left; twice the engagement band (#54, #222 (7), #243) |
| battle.openingRange | 900 | m | 500 | 2000 | 1 | true | the attacker's distance from the target's centre of mass when a battle opens (createBattle's default); #54's band; k = 1 so the dodge in one time of flight is the same number of cells at every tier (T2 of the L4 physics audit, §17 item 35, #269) |
| battle.disabledSeconds | 10 | s | 3 | 30 | 0 | true | no weapon able to fire for this long, whatever the engine does: Disabled (#82, #243, #255) |
| battle.wreckFraction | 0.5 |  | 0.3 | 0.8 | 0 | true | a ship whose largest fragment holds less than this fraction of its mass at undock has broken into too many pieces: destroyed (#83, #253) |
| crewRequired.bridge | 4 | crew | 4 | 12 | 2 | true | #183 |
| crewRequired.reactor | 4 | crew | 4 | 12 | 2 | true | #183 |
| crewRequired.engine | 2 | crew | 2 | 6 | 2 | true | #183 |
| crewRequired.magazine | 2 | crew | 2 | 6 | 2 | true | #183 |
| crewRequired.shieldGenerator | 2 | crew | 2 | 6 | 2 | true | #183 |
| crewRequired.beamBay | 3 | crew | 3 | 9 | 2 | true | #183 |
| crewRequired.turret | 3 | crew | 3 | 9 | 2 | true | #183 |
| crewRequired.railgun | 4 | crew | 4 | 12 | 2 | true | #183 |
| crewRequired.missileBay | 3 | crew | 3 | 9 | 2 | true | #183 |

## FIXED (real values and geometric choices, not tunable)

| name | value | unit | note |
| --- | --- | --- | --- |
| steelDensity | 7850 | kg/m^3 | real density of steel; kinetic rounds are steel |
| roundLengthToDiameter | 4 |  | shape of a kinetic round (a cylinder 4 diameters long) |
| sizeLinear | S: 0.6666666666666666, M: 1, L: 1.5 |  | linear size of S and L relative to M (mass scales with its cube) |
| shieldFalloffExponent | 2 |  | shield field strength g(r) = 1 / (1 + (r / radius)^n) |
| simStep | 0.016666666666666666 | s | simulation time step (#175) |
| burnTimeLimit | 3600 | s | a beam burn gives up after this long (#175) |
| stefanBoltzmann | 5.670374e-8 | W/(m^2*K^4) | real Stefan-Boltzmann constant (#143, #183) |
| restTemperature | 290 | K | rooms start here; space (3 K) is taken as 0 (#182, #183) |
| radiatorEmissivity | 0.9 |  | radiator.emissivity in DESIGN.md 13c.3: real, a dark panel (#182, #183) |
| repairFalloffExponent | 2 |  | repair field strength g(r) = 1 / (1 + (r / radius)^n), like the shield (#99, #183) |
| lifeSupportSetpoint | 295 | K | the air temperature life support holds in crewed rooms and magazines (#201) |
| waterSpecificHeat | 4186 | J/(kg*K) | real; a heat sink cell carries the water of its extra heat capacity (#208, #210) |
| standardGravity | 9.80665 | m/s^2 | standard gravity, for the readout's acceleration in g (#58, #210) |
| protonRestEnergy | 1.5032774747364482e-10 | J | 938.272 MeV (CODATA) |
| electronRestEnergy | 8.187105776885342e-14 | J | 0.51099895 MeV (CODATA) |
| betheK | 4.9198838988555e-18 | J*m^2/mol | K = 4 pi N_A r_e^2 m_e c^2 = 0.307075 MeV cm^2/mol (PDG); K x ironZOverA is in J m^2/kg |
| ironZOverA | 465.57 | mol/kg | Z/A of iron, 0.46557 mol/g (PDG); cell matter is iron-equivalent by mass (13i.1) |
| ironMeanExcitation | 4.5822251732400005e-17 | J | mean excitation energy I of iron, 286 eV (PDG) |
| ironInteractionLength | 1321 | kg/m^2 | nuclear interaction length lambda_I of iron, 132.1 g/cm^2 = 16.77 cm at 7.874 g/cm^3 (PDG) |
| waterZOverA | 555.0899999999999 | mol/kg | Z/A of liquid water, 0.55509 mol/g (PDG) |
| waterMeanExcitation | 1.2016324755e-17 | J | mean excitation energy I of liquid water, 75 eV (NIST PSTAR, PDG) |

## ROOMS

| type | footprints (cells) | placement | thermal class | loop | crew | draw / power | cell mass source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bridge | M 2×2 | inside | crewed | passive | crewRequired.bridge | bridge.powerDraw | cellMass.crewed |
| reactor | M 2×2, L 3×3 | inside | plant | coolant | crewRequired.reactor | reactor.power | cellMass.reactor |
| engine | M 2×3 | aft hull, exhaust clear | plant | coolant | crewRequired.engine | engine.powerDraw | structure.cellMass,engine.machineryMass |
| magazine | M 2×2, L 3×3 | inside | magazine | passive | crewRequired.magazine | - | structure.cellMass |
| shieldGenerator | M 2×2, L 3×3 | anywhere | plant | coolant | crewRequired.shieldGenerator | shield.powerDraw | cellMass.shieldGenerator |
| quarters | M 3×2 | inside | crewed | passive | housed | quarters.powerDraw | cellMass.crewed |
| beamBay | M 2×2, L 3×3 (spinal, N ≥ 2) | hull, axis, bow clear | plant | coolant | crewRequired.beamBay | beam.power / beambay.efficiency | structure.cellMass,beambay.machineryMass |
| turret | M 2×2, L 3×3 | hull | crewed | passive | crewRequired.turret | turret.powerDraw | structure.cellMass,turret.machineryMass |
| railgun | M 2×N | axis | plant | coolant | crewRequired.railgun | - | cellMass.railgun |
| missileBay | M 3×2 | hull | crewed | passive | crewRequired.missileBay | - | cellMass.crewed |
| hold | M 2×2 | anywhere | crewed | passive | - | - | structure.cellMass |
| heatSink | M 2×2, L 3×3 | anywhere | plant | coolant | - | - | structure.cellMass |

## TIERS

| tier | name | cell edge (m) | grid (cells) |
| --- | --- | --- | --- |
| T1 | Corvette | 5 | 30×14 |
| T2 | Frigate | 7.5 | 34×15 |
| T3 | Destroyer | 10 | 38×16 |
| T4 | Cruiser | 15 | 42×18 |
| T5 | Battleship | 20 | 46×20 |
| T6 | Capital | 30 | 50×22 |

