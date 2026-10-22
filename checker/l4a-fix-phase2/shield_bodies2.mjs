// Phase-2 check: body A of L3.shield.bodies from the layout the scenario states (rooms 2x2 cells of 5 m; uniform plates)
const JA=3200*6/11, paidA=1706666.6666666667*6/11, JB=3200*5/11, paidB=1706666.6666666667*5/11;
function body(rooms){let M=0,sx=0,sy=0;for(const r of rooms){M+=r.m;sx+=r.m*r.x;sy+=r.m*r.y;}const cx=sx/M,cy=sy/M;let I=0;for(const r of rooms)I+=r.m*(100+100)/12+r.m*((r.x-cx)**2+(r.y-cy)**2);return{M,cx,cy,I};}
const A=body([{m:40000,x:5,y:5},{m:59200,x:15,y:5}]);
const B=body([{m:12000,x:35,y:5},{m:59200,x:45,y:5},{m:40000,x:55,y:5}]);
for(const [n,b,J,paid,qx] of [['A',A,JA,paidA,5],['B',B,JB,paidB,55]]){const dL=(qx-b.cx)*J;const g=J*J/(2*b.M)+dL*dL/(2*b.I);console.log(n,JSON.stringify(b),'dL',dL,'J2/2M',J*J/(2*b.M),'L2/2I',dL*dL/(2*b.I),'heat',paid-g);}
