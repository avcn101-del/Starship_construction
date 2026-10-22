// L3.shield.bodies illustrative numbers. node shield_bodies.mjs
const m=6,v=800,p=4800,J=3200,B=1e7,gA=0.6,gB=0.5;
const wA=B*gA,wB=B*gB,W=wA+wB;
const JA=J*wA/W,JB=J*wB/W; const vAfter=v-J/m; const lost=0.5*m*(v*v-vAfter*vAfter);
const pA=lost*wA/W,pB=lost*wB/W;
console.log({JA,JB,vAfter,lost,pA,pB,sum:pA+pB});
for(const [nm,MA,MB] of [['assume gen 4x10000 + bridge 4x14800 (both)',99200,99200]]){
 const gA_=JA*JA/(2*MA),gB_=JB*JB/(2*MB);console.log(nm,'J^2/2M A',gA_,'B',gB_,'heat A',pA-gA_,'heat B',pB-gB_,'shieldRound heat',lost-gA_-gB_,'dv A',JA/MA,'dv B',JB/MB);
 // kicked: B moving by dv = kick/MB ; cross term J_B * dV
 for(const kick of [4800,3000]){const V=kick/MB;console.log(' kick',kick,'V_B',V,'cross term J_B*V_B',JB*V,'; relative speed of round to B',v-V,'speed change vs A frame',V/v);} }
