const E=5, cell={crewed:14800,reactor:150000,engine:3000+2700,magazine:3000,shield:10000,beam:3000+2500,hold:3000,sink:3000+4*1.35e6/4186};
const rooms=(list)=>list.flatMap(([t,x0,x1,y0,y1,extra=0])=>{const o=[];for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)o.push({t,x:(x+.5)*E,y:(y+.5)*E,m:cell[t]+extra});return o;});
function props(items){let M=0,X=0,Y=0;for(const i of items){M+=i.m;X+=i.m*i.x;Y+=i.m*i.y;}const cx=X/M,cy=Y/M;let I=0;for(const i of items){I+=i.m*((i.a??E*E/6)+(i.x-cx)**2+(i.y-cy)**2);}return{M,cx,cy,I};}
const R1rooms=[['engine',0,3,2,4],['sink',3,5,4,6],['reactor',3,5,2,4],['crewed',5,8,4,6],['crewed',5,7,2,4],['crewed',8,10,4,6],['magazine',7,9,2,4,0],['shield',3,5,0,2],['beam',9,11,2,4],['hold',7,9,0,2]];
const rad=[[1.5,4],[2.5,4],[1.5,2],[2.5,2],[3.5,6],[4.5,6],[3,4.5],[3,5.5],[3.5,0],[4.5,0],[3,.5],[3,1.5],[5,.5],[5,1.5],[11,2.5],[11,3.5],[9.5,2]].map(([x,y])=>({x:x*E,y:y*E,m:250,a:0}));
const rcs=[[.5,4],[.5,2],[10.5,4],[10.5,2]].map(([x,y])=>({x:x*E,y:y*E,m:200,a:0}));
const cont=[{x:40,y:15,m:900,a:0},{x:45,y:25,m:24,a:0}];
const R1=[...rooms(R1rooms),...rad,...rcs,...cont];
console.log('R1',props(R1));
// plates 39250 kg at segment midpoints
const pm=0.2*7850*E*E;
const plR1c=[[7,2,'-y'],[8,2,'-y'],[7,3,'+y'],[8,3,'+y'],[7,2,'-x'],[7,3,'-x'],[8,2,'+x'],[8,3,'+x']];
const plD=[[8,5,'+y'],[9,5,'+y'],[9,4,'+x'],[9,5,'+x'],[9,4,'-y']];
const mid=([x,y,s])=>s=='-y'?[(x+.5)*E,y*E]:s=='+y'?[(x+.5)*E,(y+1)*E]:s=='-x'?[x*E,(y+.5)*E]:[(x+1)*E,(y+.5)*E];
// wall to beam bay (9,4)-y: turret cell (9,4) bottom edge shared with (9,3) beam bay
const plates=[...plR1c,...plD].map(p=>{const[q,r]=mid(p);return{x:q,y:r,m:pm,a:0}});
const D=[...R1,...plates];console.log('R1d',props(D),'mass doc 1460784.06');
const tn=[['engine',0,3,2,4],['reactor',3,5,2,4],['shield',3,5,0,2],['sink',3,5,4,6],['hold',5,7,2,4],['crewed',7,9,2,4],['magazine',9,11,2,4],['beam',11,13,2,4],['crewed',7,10,4,6],['crewed',10,12,4,6]];
const TN=rooms(tn);console.log('Tneck (no fittings, no contents)',props(TN));
const TNc=[...TN,{x:50,y:15,m:900,a:0},{x:55,y:25,m:24,a:0}]; console.log('Tneck +contents',props(TNc));
