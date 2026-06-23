(()=>{
(function(){
  var btn=document.getElementById('menuBtn');
  var nav=document.getElementById('navLinks');
  if(!btn||!nav)return;
  function close(){nav.classList.remove('open');btn.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');}
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=nav.classList.toggle('open');
    btn.classList.toggle('is-open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
    document.body.classList.toggle('nav-open',open);
  });
  nav.addEventListener('click',function(e){if(e.target.tagName==='A')close();});
  document.addEventListener('click',function(e){if(!nav.contains(e.target)&&!btn.contains(e.target))close();});
  window.addEventListener('resize',function(){if(window.innerWidth>640)close();});
})();
const c=document.getElementById('game'),x=c.getContext('2d');
const W=c.width,H=c.height,WALL=16,FLOOR=H-16,WARN=98;
const T=[
 {e:'🐭',r:16,p:1},{e:'🐹',r:22,p:3},{e:'🐰',r:28,p:6},{e:'🐱',r:34,p:10},
 {e:'🐶',r:40,p:15},{e:'🦊',r:46,p:21},{e:'🐻',r:52,p:28},{e:'🐼',r:58,p:36},
 {e:'🦁',r:64,p:45},{e:'🐯',r:70,p:55},{e:'🐲',r:78,p:78}
];
let balls=[],cx=W/2,ci=0,ni=0,score=0,best=+localStorage.getItem('dap_best')||0,cd=0,over=false,overT=0;
document.getElementById('best').textContent=best;
const rnd=()=>Math.random()*5|0;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function spawn(){ci=ni;ni=rnd();cx=W/2;cd=24;}
function drop(){
 if(over||cd>0)return;
 const t=T[ci];
 balls.push({x:cx,y:30,vx:0,vy:0,r:t.r,type:ci,settled:false});
 spawn();
}
function reset(){balls=[];score=0;over=false;overT=0;document.getElementById('score').textContent='0';spawn();}
function step(){
 if(over){overT++;return;}
 if(cd>0)cd--;
 for(const b of balls){b.vy+=.45;b.x+=b.vx;b.y+=b.vy;b.vx*=.98;
  if(b.x-b.r<WALL){b.x=WALL+b.r;b.vx*=-.4;}
  if(b.x+b.r>W-WALL){b.x=W-WALL-b.r;b.vx*=-.4;}
  if(b.y+b.r>FLOOR){b.y=FLOOR-b.r;b.vy*=-.32;if(Math.abs(b.vy)<.9)b.vy=0;b.settled=true;}else b.settled=false;
 }
 for(let i=0;i<balls.length;i++){
  for(let j=i+1;j<balls.length;j++){
   const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),mn=a.r+b.r;
   if(d<mn&&d>0){
    const nx=dx/d,ny=dy/d,ov=mn-d;
    a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
    const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(rv<0){const k=rv*.5;a.vx+=k*nx;a.vy+=k*ny;b.vx-=k*nx;b.vy-=k*ny;}
    if(a.type===b.type&&a.type<T.length-1){
     const nt=a.type+1,nr=T[nt].r,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
     balls.splice(j,1);a.x=mx;a.y=my;a.r=nr;a.type=nt;a.vx=0;a.vy=-3;
     score+=T[nt].p;
     document.getElementById('score').textContent=score;
     if(score>best){best=score;localStorage.setItem('dap_best',best);document.getElementById('best').textContent=best;}
     j=i;
    }
   }
  }
 }
 let above=false;
 for(const b of balls) if(b.settled&&b.y-b.r<WARN){above=true;break;}
 if(above){overT++;if(overT>60)over=true;}else overT=0;
}
function draw(){
 x.fillStyle='#fffaf2';x.fillRect(0,0,W,H);
 x.fillStyle='#ff8a6b';x.fillRect(0,0,WALL,H);x.fillRect(W-WALL,0,WALL,H);x.fillRect(0,FLOOR,W,14);
 x.strokeStyle='#f97316';x.setLineDash([6,6]);x.lineWidth=2;x.beginPath();x.moveTo(WALL,WARN);x.lineTo(W-WALL,WARN);x.stroke();x.setLineDash([]);
 x.textAlign='center';x.textBaseline='middle';
 for(const b of balls){x.font=(b.r*1.35|0)+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';x.fillText(T[b.type].e,b.x,b.y);}
 if(!over){
  const t=T[ci];
  x.globalAlpha=.7;x.font=(t.r*1.35|0)+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';x.fillText(t.e,cx,30);x.globalAlpha=1;
  x.font='13px sans-serif';x.fillStyle='#6b6760';x.fillText('Next: '+T[ni].e,W-52,30);x.fillStyle='#15131a';
 }
 if(over){
  x.fillStyle='rgba(21,19,26,.72)';x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textAlign='center';
  x.font='bold 34px -apple-system,sans-serif';x.fillText('Game Over',W/2,H/2-22);
  x.font='18px -apple-system,sans-serif';x.fillText('Score: '+score,W/2,H/2+14);
  x.font='14px -apple-system,sans-serif';x.fillStyle='#ffb627';x.fillText('Press Reset to play again',W/2,H/2+44);
 }
}
function loop(){step();draw();requestAnimationFrame(loop);}
function aim(clientX){
 const r=c.getBoundingClientRect(),sx=W/r.width;
 cx=clamp((clientX-r.left)*sx,WALL+T[ci].r,W-WALL-T[ci].r);
}
c.addEventListener('mousemove',e=>aim(e.clientX));
c.addEventListener('click',drop);
c.addEventListener('touchmove',e=>{e.preventDefault();aim(e.touches[0].clientX);},{passive:false});
c.addEventListener('touchstart',e=>{e.preventDefault();drop();},{passive:false});
document.getElementById('dropBtn').addEventListener('click',drop);
document.getElementById('resetBtn').addEventListener('click',reset);
document.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft')cx=clamp(cx-20,WALL+16,W-WALL-16);
 else if(e.key==='ArrowRight')cx=clamp(cx+20,WALL+16,W-WALL-16);
 else if(e.key===' '||e.key==='Enter'){e.preventDefault();drop();}
});
spawn();loop();
})();
