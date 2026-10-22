const e=5;
const water=1.35e6*4/4186;
const M={engine:5700,reactor:150000,bridge:14800,magazine:3000,beamBay:5500,heatSink:3000+water,quarters:14800,turret:14800,shield:10000,hold:3000};
const rooms=[['engine',0,3,2,4],['reactor',3,5,2,4],['bridge',5,7,2,4],['magazine',7,9,2,4],['beamBay',9,11,2,4],['heatSink',3,5,4,6],['quarters',5,8,4,6],['turret',8,10,4,6],['shield',3,5,0,2],['hold',7,9,0,2]];
function build(plates,opts={}){
 const pm=[];// point masses [m,x,y]
 const cells=[];
 for(const [n,x0,x1,y0,y1] of rooms) for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++){ if(opts.skipCell&&opts.skipCell(n,x,y))continue; cells.push([M[n],(x+.5)*e,(y+.5)*e,n]);}
 // contents at room centre
 pm.push([900,(7+1)*e,(2+1)*e]); pm.push([24,9*e,5*e]);
 // radiators
 const rad=[[7.5,20],[12.5,20],[7.5,10],[12.5,10],[17.5,30],[22.5,30],[15,22.5],[15,27.5],[17.5,0],[22.5,0],[15,2.5],[15,7.5],[25,2.5],[25,7.5],[55,12.5],[55,17.5],[47.5,10]];
 for(const [x,y] of rad) pm.push([250,x,y]);
 for(const [x,y] of [[2.5,20],[2.5,10],[52.5,20],[52.5,10]]) pm.push([200,x,y]);
 for(const p of plates) pm.push(p);
 return {cells,pm};}
function props(b){let Mt=0,mx=0,my=0;for(const [m,x,y] of b.cells){Mt+=m;mx+=m*x;my+=m*y;}for(const [m,x,y] of b.pm){Mt+=m;mx+=m*x;my+=m*y;}
 const cx=mx/Mt,cy=my/Mt;let I=0;for(const [m,x,y] of b.cells){I+=m*(e*e/6+(x-cx)**2+(y-cy)**2);}for(const [m,x,y] of b.pm){I+=m*((x-cx)**2+(y-cy)**2);}
 return {M:Mt,cx,cy,I};}
const pmass=0.2*7850*e*e;
const platePts=[[35,12.5],[35,17.5],[45,12.5],[45,17.5],[37.5,10],[42.5,10],[37.5,20],[42.5,20]].map(([x,y])=>[pmass,x,y]);
const r1=props(build([]));console.log('R1',r1);
const r1c=props(build(platePts));console.log('R1c',r1c, 'accel g',15e6/r1c.M/9.80665);
console.log('R1 accel g',15e6/r1.M/9.80665);
// wrecked plate under magazine cell (7,2): bottom wall segment x in[35,40], mid (37.5,10)
const w=props(build(platePts.filter(p=>!(p[1]==37.5&&p[2]==10))));console.log('R1c wrecked',w, 'dM',r1c.M-w.M);
// contents-position sensitivity: spread magazine contents over cells vs centre
// shield energy
const J=3200;
for(const [g,x] of [[1,20],[0.6,20+32.66]]){
 const Jg=g*3200;const KEl=1.92e6-0.5*6*((4800-Jg)/6)**2;
 const arm=x-r1.cx; const L=arm*Jg; // r x J_y = (x-cx)*Jy - (y-cy)*Jx
 const tr=Jg*Jg/(2*r1.M), rot=L*L/(2*r1.I);
 console.log(`g=${g}: removal ${Jg} v after ${(4800-Jg)/6} lostKE ${KEl} trans gain ${tr} rot gain ${rot} heat(trans only) ${KEl-tr} heat(full) ${KEl-tr-rot} arm ${arm} L ${L}`);}
console.log('r_g06',40*Math.sqrt(1/0.6-1));
