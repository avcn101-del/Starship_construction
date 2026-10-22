// L2.shield.overlap.round: first-principles numbers (M round 6 kg, 800 m/s; kineticStop*A0 = 3200 N s at g=1)
const m=6,v0=800,KE0=0.5*m*v0*v0,Jfull=3200,gA=0.6,gB=0.5;
const Efull=KE0-0.5*m*((m*v0-Jfull)/m)**2;
function cases(bA,bB){
  const wA=bA*gA,wB=bB*gB,sA=wA/(wA+wB),sB=1-sA;
  const tot=bA+bB; // summed buffers
  const Eask=Math.min(Efull,tot);            // what the summed buffers can pay
  // reading 2: shares of the energy the summed buffer can pay, cap each, pay the sum
  let pA=Math.min(Eask*sA,bA),pB=Math.min(Eask*sB,bB); let paid2=pA+pB;
  // reading 1: shares of the full-stop energy, cap each
  let qA=Math.min(Efull*sA,bA),qB=Math.min(Efull*sB,bB); let paid1=qA+qB;
  const out=(label,paid,a,b)=>{const KE=KE0-paid;const v=Math.sqrt(2*KE/m);const J=m*(v0-v);
    console.log(label,'paid A',a.toFixed(3),'B',b.toFixed(3),'total',paid.toFixed(3),'v after',v.toFixed(4),'J',J.toFixed(4),'J_A',(J*a/paid).toFixed(4),'J_B',(J*b/paid).toFixed(4),'buffers after A',(bA-a).toFixed(1),'B',(bB-b).toFixed(1));};
  console.log(`buffers A=${bA} B=${bB} shares A=${sA.toFixed(6)} B=${sB.toFixed(6)} Efull=${Efull.toFixed(3)}`);
  out('  reading2 (shares of summed-buffer energy)',paid2,pA,pB);
  out('  reading1 (shares of full-stop energy)    ',paid1,qA,qB);
}
cases(1e7,1e7);cases(1e7,1e3);cases(1e6,1e5);
