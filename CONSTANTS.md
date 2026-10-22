# Constants

Generated from `js/data.js` (commit `f7bf5c6`) by `node tools/constants.mjs $(git log -1 --format=%h -- js/data.js) > CONSTANTS.md`. Do not edit by hand: change `js/data.js` (the integrator does) and regenerate. This is the only table of values and ranges (`DESIGN.md` §5.1); the history of each value is in `DECISIONS.md` and `HISTORY.md`.

A tunable constant is `value` at the T1 cell edge (5 m), scaled by (edge / 5 m)^k. `approved` is the flag in `data.js`.

## PARAMS (tunable)

| group.name | value | unit | min | max | k | approved | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kinetic.roundMass | 6 | kg | 2 | 20 | 3 | true | size M round at T1: 6 kg of solid steel, 62 mm, a light naval gun (#166, #203 D, #206) |
| kinetic.muzzleVelocity | 800 | m/s | 500 | 1000 | 0 | true | #166 |
| kinetic.chargeEnergy | 6000000 | J | 2000000 | 20000000 | 3 | true | propellant energy per M round (about 1.5 kg of propellant, x 12 with the round, #206); an AP magazine explodes by this alone, HE by this plus the warhead (#91, #183) |
| kinetic.hitsToWreck | 3 | hits | 1 | 8 | 0 | true | a round passing a room cell takes 1 / this of its integrity; the cell it stops in loses (sectional momentum left / R) / this (#203 D, #206) |
| armour.blastResistance | 1000000 | J | 300000 | 3000000 | 3 | true | blast energy one armour cell absorbs before it is destroyed (#177) |
| armour.burnEnergy | 30000000 | J | 10000000 | 100000000 | 3 | true | beam energy that ruins any cell along the beam's channel: a cell loses P F_i dt / this of its integrity per step (#177, #235; 30 MJ melts about 25 kg of steel, 13i.1) |
| armour.cellMass | 10000 | kg | 3000 | 30000 | 3 | true | one armour cell at T1: 5 cm of steel over 25 m^2, sigma 400 kg/m^2 (L0's armour cell; armour fittings come later, #15, #235) |
| room.blastResistance | 500000 | J | 200000 | 2000000 | 3 | true | blast energy one ordinary room cell absorbs before it is destroyed, half an armour cell; a room fills up to surviving cells x this before passing the excess on (#193, #195) |
| matter.kineticResistance | 1545.36 | m/s | 750 | 3125 | 0 | true | c: sectional momentum a cell resists per kg/m^2 of its matter, 1545.4 m/s; a round is as strong per kg of steel (S = c rho L) (#232, #235) |
| he.blastEnergy | 2000000 | J | 500000 | 5000000 | 3 | true | size M HE warhead (#166) |
| he.coupling | 0.5 |  | 0.2 | 0.8 | 0 | true | fraction of a contact burst's energy that enters the hull; the rest vents to space at the open face (#169, #176) |
| beam.power | 5000000 | W | 1000000 | 20000000 | 2 | true | size M beam (#166) |
| beam.gradient | 1.60218e-12 | J/m | 8.01088e-13 | 3.20435e-12 | 0 | true | 10 MeV/m (1.6022e-12 J/m), range 5-20 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV (ESS: about 6 MeV/m, cavities 16.7-20 MV/m; #234, #235) |
| shield.budget | 10000000 | W | 2000000 | 40000000 | 2 | true | size M absorption rate (#166) |
| shield.radius | 40 | m | 20 | 80 | 1 | true | radius where the field is at half strength (#166) |
| shield.kineticStop | 1045460 | kg/(m*s) | 522728 | 2090910 | 1 | true | sectional momentum the field stops per round at full strength: one S round at T1, computed (#166, #171) |
| shield.bufferSeconds | 1 | s | 0.2 | 5 | 0 | true | buffer for impulses (rounds, blasts) = budget x this; must show a measured effect by L2 or be cut (#177) |
| shield.powerDraw | 2000000 | W | 500000 | 10000000 | 2 | true | size M generator while on; becomes heat, plus everything absorbed (#21, #183) |
| thermal.heatCapacityPerCell | 600000 | J/K | 200000 | 2000000 | 3 | true | C = cells x this; sets the pace of every heat race (#182, #183) |
| thermal.plantHot | 600 | K | 450 | 750 | 0 | true | reactor, beam bay, shield generator, engine: function degrades (#182, #183) |
| thermal.plantOverheated | 800 | K | 650 | 950 | 0 | true | plant rooms shut down; restart below hot (#182, #183) |
| thermal.plantCritical | 1000 | K | 850 | 1300 | 0 | true | plant rooms: crew at their stations die, a reactor melts down (#182, #183) |
| thermal.crewedHot | 330 | K | 320 | 350 | 0 | true | bridge, quarters, turret, missile bay, hold (#182, #183) |
| thermal.crewedOverheated | 350 | K | 340 | 380 | 0 | true | crewed rooms shut down; restart below hot (#182, #183) |
| thermal.crewedCritical | 380 | K | 360 | 420 | 0 | true | crewed rooms: the crew die (#18b, #182, #183) |
| thermal.magazineHot | 330 | K | 320 | 350 | 0 | true | magazine (#182, #183) |
| thermal.magazineOverheated | 350 | K | 340 | 380 | 0 | true | magazine (#182, #183) |
| thermal.magazineCritical | 450 | K | 400 | 500 | 0 | true | magazine cook-off (#91, #182, #183) |
| structure.cellMass | 3000 | kg | 2000 | 6000 | 3 | true | structure only (frames, decks, bulkheads): hold, magazine and heat sink before contents; 24 kg/m^3 at T1, an estimate without a found source (#221, #235) |
| cellMass.crewed | 14800 | kg | 11000 | 16500 | 3 | true | bridge, quarters, turret, missile bay: 118 kg/m^3, ISS Destiny (14.5 t in 8.5 m x 4.3 m), low end; ISS Harmony about 131 kg/m^3 (#234, #235) |
| cellMass.reactor | 125000 | kg | 100000 | 200000 | 3 | true | 1000 kg/m^3: US submarine reactor compartments, 1130-1680 t in about 10 m x 12 m, low end (#234, #235) |
| cellMass.engine | 6100 | kg | 4000 | 12000 | 3 | true | structure 3 t + a 15 MN engine at the Saturn F-1's thrust per tonne (8.4 t for 6.8 MN) over 6 cells, an estimate (#235) |
| cellMass.beamBay | 5500 | kg | 4000 | 12000 | 3 | true | structure 3 t + about 1 t of accelerator per metre over a 2-cell slice, an estimate (#235) |
| cellMass.shieldGenerator | 10000 | kg | 5000 | 20000 | 3 | true | no real analogue (the shield is the premise, #202): the old average (#235) |
| cellMass.railgun | 10000 | kg | 5000 | 20000 | 3 | true | no real analogue yet: the old average (#235) |
| radiator.area | 25 | m^2 | 10 | 100 | 2 | true | one panel per hull segment; radiates emissivity x sigma x area x T^4 of its room (#143, #183) |
| radiator.mass | 250 | kg | 100 | 1000 | 2 | true | one panel, 10 kg/m^2 like an ISS radiator; at its edge's midpoint (#208, #210) |
| rcs.force | 1000000 | N | 300000 | 5000000 | 2 | true | one RCS fitting while fired, along its edge's inward normal at the edge's midpoint; re-tuned 100 kN -> 1 MN for ships of real density: a 2500 t corvette turns 90 degrees in about 10 s on two couples 60 m out (#15, #208, #210, #221) |
| rcs.powerDraw | 200000 | W | 50000 | 1000000 | 2 | true | while fired, from its host room; x engine.heatFraction is heat in the host (#208, #210) |
| rcs.mass | 200 | kg | 50 | 1000 | 3 | true | one RCS fitting, at its edge's midpoint (#208, #210) |
| reactor.power | 20000000 | W | 5000000 | 50000000 | 2 | true | size M, electric, delivered on demand; k = 2 matches its consumers (#183) |
| reactor.heatPerPower | 1 |  | 0.5 | 3 | 0 | true | waste heat per delivered watt (#183) |
| reactor.decayFraction | 0.07 |  | 0.03 | 0.15 | 0 | true | decay heat at SCRAM as a fraction of the thermal power at SCRAM (#81, #183) |
| reactor.decayTime | 900 | s | 300 | 1800 | 0 | true | exponential decay time of the decay heat (#4, #81, #183) |
| reactor.breachFraction | 0.5 |  | 0.25 | 0.75 | 0 | true | destroyed cells / total that start the breach countdown (#81, #183) |
| reactor.breachCountdown | 10 | s | 3 | 30 | 0 | true | from breach to explosion (#81, #183) |
| reactor.explosionEnergy | 200000000 | J | 50000000 | 1000000000 | 3 | true | breach and meltdown explosion (#81, #183) |
| beambay.efficiency | 0.4 |  | 0.2 | 0.8 | 0 | true | draw = beam power / efficiency; the rest is heat (#183) |
| engine.thrust | 15000000 | N | 4000000 | 60000000 | 2 | true | one engine, a self-fuelled torch; re-tuned 2 -> 15 MN for ships of real density: a 2500 t corvette with two reaches about 1.2 g (#54, #183, #203 A, #210, #221) |
| engine.powerDraw | 10000000 | W | 2000000 | 40000000 | 2 | true | at full throttle; ships have no propellant (#140, #183) |
| engine.heatFraction | 0.3 |  | 0.1 | 1 | 0 | true | heat per watt drawn (#183) |
| turret.fireRate | 0.5 | 1/s | 0.2 | 2 | -1 | true | size M; big guns fire slower (#183) |
| turret.powerDraw | 200000 | W | 50000 | 1000000 | 2 | true | size M, while able to fire (#183) |
| turret.heatPerShot | 300000 | J | 100000 | 1000000 | 3 | true | size M (#183) |
| turret.readyRounds | 4 | rounds | 2 | 10 | 0 | true | rounds held in the turret, of its own size; it fires from this store and the magazine feed refills it (#193, #195) |
| magazine.capacity | 900 | kg | 300 | 3000 | 3 | true | ammunition mass a magazine holds: 150 M rounds (#91, #183, #206) |
| quarters.crewPerCell | 3 | crew | 1 | 8 | 2 | true | crew housed per surviving cell: 18 in a T1 quarters (#60, #65, #183) |
| quarters.powerDraw | 50000 | W | 10000 | 200000 | 2 | true | #183 |
| repair.rate | 0.02 | 1/s | 0.005 | 0.1 | 0 | true | integrity per second at the quarters with all cells surviving (#51, #183) |
| repair.radius | 30 | m | 10 | 80 | 1 | true | half-strength radius of the repair field (#99, #183) |
| bridge.powerDraw | 100000 | W | 20000 | 500000 | 2 | true | from the backup supply when the reactor is cut; the backup has no limit (#147, #183) |
| conduction.wall | 4000 | W/(K*m) | 1000 | 20000 | 1 | true | coolant wall (between two coolant rooms, the machinery's coolant loop) per metre of live wall: G = this x L x harmonic mean of the two rooms' coolant factors; two M rooms over 10 m relax with tau = 30 s (#193, #195, #200, #201) |
| conduction.passive | 25 | W/(K*m) | 5 | 100 | 1 | true | passive wall (every wall with a crewed room, a magazine or a hold on either side) per metre of live wall: G = this x L x harmonic mean of the passive factors; a steel bulkhead with air on both sides, about 250 W/K for 10 m x 5 m (#200, #201) |
| conduction.holdFactor | 0.1 |  | 0.02 | 0.3 | 0 | true | passive factor of an empty hold (every other room 1), on passive walls since #201; a hold-room passive wall conducts 0.18 of an ordinary one (#18c, #193, #195, #201) |
| lifeSupport.capacityPerCell | 50000 | W | 10000 | 200000 | 2 | true | heat a powered crewed room or magazine above the setpoint pumps into its coolant neighbours, per surviving cell: bridge 200 kW, quarters 300 kW, magazine 200 kW (#201) |
| heatsink.capacityFactor | 5 |  | 2 | 10 | 0 | true | a heat sink's heat capacity per cell is thermal.heatCapacityPerCell x this; a water or phase-change store (#198, #201) |
| heatsink.conductivityFactor | 3 |  | 1 | 5 | 0 | true | a heat sink's coolant factor in the harmonic mean of coolant walls (#198, #201) |
| power.wallCapacity | 2000000 | W/m | 500000 | 5000000 | 1 | true | power a live shared wall carries per metre: 10 m carries 20 MW, a whole M reactor (#12, #193, #195) |
| ammo.wallFeed | 0.72 | kg/(s*m) | 0.24 | 3.6 | 1 | true | rounds a live wall between a magazine and a room it feeds carries per second per metre: 5 m feeds 3.6 kg/s, 0.6 M rounds/s (#18, #193, #195, #206) |
| hold.blastFactor | 4 |  | 2 | 10 | 0 | true | an empty hold absorbs this many times the blast of an ordinary room cell (#18c, #193, #195) |
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
| sizeLinear | S: 0.666667, M: 1, L: 1.5 |  | linear size of S and L relative to M (mass scales with its cube) |
| shieldFalloffExponent | 2 |  | shield field strength g(r) = 1 / (1 + (r / radius)^n) |
| simStep | 0.0166667 | s | simulation time step (#175) |
| burnTimeLimit | 3600 | s | a beam burn gives up after this long (#175) |
| stefanBoltzmann | 5.67037e-8 | W/(m^2*K^4) | real Stefan-Boltzmann constant (#143, #183) |
| restTemperature | 290 | K | rooms start here; space (3 K) is taken as 0 (#182, #183) |
| radiatorEmissivity | 0.9 |  | radiator.emissivity in DESIGN.md 13c.3: real, a dark panel (#182, #183) |
| repairFalloffExponent | 2 |  | repair field strength g(r) = 1 / (1 + (r / radius)^n), like the shield (#99, #183) |
| lifeSupportSetpoint | 295 | K | the air temperature life support holds in crewed rooms and magazines (#201) |
| waterSpecificHeat | 4186 | J/(kg*K) | real; a heat sink cell carries the water of its extra heat capacity (#208, #210) |
| standardGravity | 9.80665 | m/s^2 | standard gravity, for the readout's acceleration in g (#58, #210) |
| protonRestEnergy | 1.50328e-10 | J | 938.272 MeV (CODATA) |
| electronRestEnergy | 8.18711e-14 | J | 0.51099895 MeV (CODATA) |
| betheK | 4.91988e-18 | J*m^2/mol | K = 4 pi N_A r_e^2 m_e c^2 = 0.307075 MeV cm^2/mol (PDG); K x ironZOverA is in J m^2/kg |
| ironZOverA | 465.57 | mol/kg | Z/A of iron, 0.46557 mol/g (PDG); cell matter is iron-equivalent by mass (13i.1) |
| ironMeanExcitation | 4.58223e-17 | J | mean excitation energy I of iron, 286 eV (PDG) |
| ironInteractionLength | 1321 | kg/m^2 | nuclear interaction length lambda_I of iron, 132.1 g/cm^2 = 16.77 cm at 7.874 g/cm^3 (PDG) |

## ROOMS

| type | footprints (cells) | placement | thermal class | loop | crew | draw / power | cell mass source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bridge | M 2×2 | inside | crewed | passive | crewRequired.bridge | bridge.powerDraw | cellMass.crewed |
| reactor | M 2×2, L 3×3 | inside | plant | coolant | crewRequired.reactor | reactor.power | cellMass.reactor |
| engine | M 2×3 | aft hull, exhaust clear | plant | coolant | crewRequired.engine | engine.powerDraw | cellMass.engine |
| magazine | M 2×2, L 3×3 | inside | magazine | passive | crewRequired.magazine | - | structure.cellMass |
| shieldGenerator | M 2×2, L 3×3 | anywhere | plant | coolant | crewRequired.shieldGenerator | shield.powerDraw | cellMass.shieldGenerator |
| quarters | M 3×2 | inside | crewed | passive | housed | quarters.powerDraw | cellMass.crewed |
| beamBay | M 2×2, L 3×3 (spinal, N ≥ 2) | hull, axis, bow clear | plant | coolant | crewRequired.beamBay | beam.power / beambay.efficiency | cellMass.beamBay |
| turret | M 2×2, L 3×3 | hull | crewed | passive | crewRequired.turret | turret.powerDraw | cellMass.crewed |
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

