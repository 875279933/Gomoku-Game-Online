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
  window.addEventListener('resize',function(){if(window.innerWidth>760)close();});
})();

const c=document.getElementById('game'),x=c.getContext('2d');
const W=c.width,H=c.height,GROUND=H-60,SKY=H*.55;
const EGG={w:42,h:50,x:90,y:0,vy:0,on:false,run:0,squash:0};
const GRAV=.82,JUMP=-14.5,HOLD_JUMP=-11,JUMP_HOLD_FRAMES=9;
const DIFFICULTY={
  easy:  {speed0:3.2, speedMax:8.5,  ramp:2400, spawnMin:42, spawnRamp:380},
  normal:{speed0:5.0, speedMax:12.5, ramp:1400, spawnMin:32, spawnRamp:280},
  hard:  {speed0:7.0, speedMax:19,   ramp:800,  spawnMin:22, spawnRamp:200}
};
let diff=localStorage.getItem('ed_diff')||'normal';
if(!DIFFICULTY[diff])diff='normal';
let CFG=DIFFICULTY[diff];
let speed=CFG.speed0,dist=0,score=0,yolks=0,best=+localStorage.getItem('ed_best')||0;
let ob=[],yks=[],part=[],t=0,jumpHold=0,over=false,overT=0,hintHidden=false,firstJump=false,paused=false;
document.getElementById('best').textContent=best;

const RND=(a,b)=>Math.random()*(b-a)+a;
const CL=(v,a,b)=>v<a?a:v>b?b:v;
const HIT=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function spawnObs(){
  let type=Math.random();
  let o;
  if(type<.4){
    o={x:W+40,y:GROUND-26,w:30,h:26,type:'crate'};
  }else if(type<.7){
    o={x:W+40,y:GROUND-18,w:46,h:18,type:'pan'};
  }else if(type<.9){
    o={x:W+40,y:GROUND-62,w:24,h:62,type:'broom'};
  }else{
    o={x:W+40,y:GROUND-44,w:42,h:44,type:'hen'};
  }
  ob.push(o);
  if(Math.random()<.22){
    yks.push({x:W+20+RND(50,200),y:GROUND-RND(60,130),r:9,alive:true,bob:t});
  }
}

function spark(n,xc,yc,col){
  for(let i=0;i<n;i++){
    part.push({x:xc,y:yc,vx:RND(-4,4),vy:RND(-7,-2),g:.4,life:30,col:col});
  }
}

function reset(){
  ob=[];yks=[];part=[];t=0;speed=CFG.speed0;dist=0;score=0;yolks=0;
  EGG.y=GROUND-EGG.h;EGG.vy=0;EGG.on=true;EGG.run=0;EGG.squash=0;
  over=false;overT=0;jumpHold=0;paused=false;
  var pb=document.getElementById('pauseBtn');if(pb)pb.textContent='Pause';
  document.getElementById('score').textContent='0';
  document.getElementById('yolks').textContent='0';
  if(!hintHidden)setTimeout(()=>{var h=document.getElementById('touchHint');if(h)h.classList.add('hide');hintHidden=true;},1500);
}

function setDifficulty(name){
  if(!DIFFICULTY[name])return;
  diff=name;CFG=DIFFICULTY[name];
  localStorage.setItem('ed_diff',name);
  document.querySelectorAll('.diff-btn').forEach(b=>{b.classList.toggle('is-active',b.dataset.diff===name);});
  reset();
}

function togglePause(force){
  if(over)return;
  paused=(typeof force==='boolean')?force:!paused;
  var btn=document.getElementById('pauseBtn');
  if(btn)btn.textContent=paused?'Resume':'Pause';
}

function jump(){
  if(over){reset();return;}
  if(!firstJump){firstJump=true;var h=document.getElementById('touchHint');if(h)h.classList.add('hide');hintHidden=true;}
  if(EGG.on){EGG.vy=JUMP;EGG.on=false;EGG.squash=-6;jumpHold=JUMP_HOLD_FRAMES;spark(4,EGG.x+EGG.w/2,EGG.y+EGG.h,'#fef3c7');}
}

function step(){
  if(over){overT++;return;}
  if(paused)return;
  t++;
  if(t%Math.max(CFG.spawnMin,CFG.spawnRamp-Math.floor(dist/CFG.spawnRamp))===0)spawnObs();
  speed=Math.min(CFG.speedMax,CFG.speed0+dist/CFG.ramp);
  dist+=speed/8;
  score=Math.floor(dist);
  document.getElementById('score').textContent=score;
  if(score>best){best=score;localStorage.setItem('ed_best',best);document.getElementById('best').textContent=best;}

  for(const o of ob){o.x-=speed;}
  for(const y of yks){y.x-=speed;y.bob++;}
  ob=ob.filter(o=>o.x+o.w>-20);
  yks=yks.filter(y=>y.x+y.r>-20&&y.alive);

  EGG.run+=speed;
  if(EGG.squash<0)EGG.squash+=1;
  else if(EGG.squash>0)EGG.squash-=1;
  if(!EGG.on){
    if(jumpHold>0&&EGG.vy<0){EGG.vy+=HOLD_JUMP*0.04;jumpHold--;}
    EGG.vy+=GRAV;
    EGG.y+=EGG.vy;
    if(EGG.y+EGG.h>=GROUND){EGG.y=GROUND-EGG.h;EGG.vy=0;EGG.on=true;EGG.squash=4;spark(3,EGG.x+EGG.w/2,EGG.y+EGG.h,'#d6c39a');}
  }

  for(const o of ob){
    if(HIT(EGG,o)){over=true;spark(18,EGG.x+EGG.w/2,EGG.y+EGG.h/2,'#fef3c7');break;}
  }
  for(const y of yks){
    if(y.alive&&HIT(EGG,{x:y.x-y.r,y:y.r-y.r,w:y.r*2,h:y.r*2})){
      y.alive=false;yolks++;score+=15;
      document.getElementById('yolks').textContent=yolks;
      document.getElementById('score').textContent=score;
      if(score>best){best=score;localStorage.setItem('ed_best',best);document.getElementById('best').textContent=best;}
      spark(8,y.x,y.y,'#fbbf24');
    }
  }
  for(const p of part){p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.life--;}
  part=part.filter(p=>p.life>0);
}

function drawBg(){
  let g=x.createLinearGradient(0,0,0,GROUND);
  g.addColorStop(0,'#fef3c7');g.addColorStop(0.5,'#fde68a');g.addColorStop(1,'#fcd34d');
  x.fillStyle=g;x.fillRect(0,0,W,GROUND);

  x.fillStyle='rgba(255,255,255,.85)';
  for(let i=0;i<3;i++){
    let cx=((t*0.4+i*240)%(W+200))-100;
    let cy=40+i*30;
    x.beginPath();x.arc(cx,cy,18,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(cx+18,cy-4,14,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(cx-18,cy-2,14,0,Math.PI*2);x.fill();
  }

  x.fillStyle='#fbbf24';
  x.beginPath();x.arc(W-70,55,28,0,Math.PI*2);x.fill();
  x.fillStyle='#fde68a';
  x.beginPath();x.arc(W-70,55,22,0,Math.PI*2);x.fill();

  for(let i=0;i<6;i++){
    let bx=((t*0.6+i*180)%(W+120))-60;
    let by=SKY-30+i*6;
    x.fillStyle='rgba(34,197,94,.18)';
    x.beginPath();x.moveTo(bx,by+8);x.lineTo(bx+6,by);x.lineTo(bx+12,by+8);x.fill();
  }

  x.fillStyle='#4ade80';x.fillRect(0,GROUND,W,2);
  let gg=x.createLinearGradient(0,GROUND,0,H);
  gg.addColorStop(0,'#4ade80');gg.addColorStop(1,'#16a34a');
  x.fillStyle=gg;x.fillRect(0,GROUND+2,W,H-GROUND-2);
  x.fillStyle='#86efac';
  for(let i=0;i<W;i+=12){
    x.fillRect(i,GROUND+2,2,4);
  }
}

function drawEgg(){
  let e=EGG;
  let dx=Math.round(e.x),dy=Math.round(e.y);
  let sw=Math.round(e.squash);
  let ex=dx-Math.round(sw/2),ey=dy+sw,ew=e.w+sw,eh=e.h-sw;

  x.fillStyle='#fde68a';
  x.beginPath();x.ellipse(ex+ew/2,ey+eh-2,ew/2+1,4,0,0,Math.PI*2);x.fill();

  x.fillStyle='#ffffff';
  x.strokeStyle='#e5d4a1';x.lineWidth=2;
  x.beginPath();x.ellipse(ex+ew/2,ey+eh/2,ew/2,eh/2,0,0,Math.PI*2);x.fill();x.stroke();

  x.fillStyle='rgba(255,255,255,.6)';
  x.beginPath();x.ellipse(ex+ew/2-6,ey+eh/2-8,6,9,-.3,0,Math.PI*2);x.fill();

  x.fillStyle='#1a1410';
  x.beginPath();x.arc(ex+ew/2-6,ey+eh/2+2,2.2,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(ex+ew/2+6,ey+eh/2+2,2.2,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';
  x.beginPath();x.arc(ex+ew/2-5,ey+eh/2+1,0.8,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(ex+ew/2+7,ey+eh/2+1,0.8,0,Math.PI*2);x.fill();

  x.fillStyle='#ec4899';
  x.beginPath();x.arc(ex+ew/2,ey+eh/2+9,1.6,0,Math.PI*2);x.fill();

  x.strokeStyle='#b45309';x.lineWidth=2;
  let legSwing=Math.sin(e.run*0.18)*3;
  x.beginPath();x.moveTo(ex+ew/2-6,ey+eh);x.lineTo(ex+ew/2-8+legSwing,ey+eh+8);x.stroke();
  x.beginPath();x.moveTo(ex+ew/2+6,ey+eh);x.lineTo(ex+ew/2+8-legSwing,ey+eh+8);x.stroke();
  x.fillStyle='#b45309';
  x.beginPath();x.arc(ex+ew/2-8+legSwing,ey+eh+8,2,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(ex+ew/2+8-legSwing,ey+eh+8,2,0,Math.PI*2);x.fill();
}

function drawObs(o){
  if(o.type==='crate'){
    x.fillStyle='#a16207';
    x.fillRect(o.x,o.y,o.w,o.h);
    x.strokeStyle='#78350f';x.lineWidth=2;
    x.strokeRect(o.x,o.y,o.w,o.h);
    x.beginPath();x.moveTo(o.x,o.y);x.lineTo(o.x+o.w,o.y+o.h);x.stroke();
    x.beginPath();x.moveTo(o.x+o.w,o.y);x.lineTo(o.x,o.y+o.h);x.stroke();
  }else if(o.type==='pan'){
    x.fillStyle='#1f2937';
    x.beginPath();x.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);x.fill();
    x.fillStyle='#374151';
    x.beginPath();x.ellipse(o.x+o.w/2-2,o.y+o.h/2,o.w/2-4,o.h/2-2,0,0,Math.PI*2);x.fill();
    x.fillStyle='#78350f';
    x.fillRect(o.x+o.w-2,o.y+o.h/2-2,18,4);
    x.fillStyle='#451a03';
    x.fillRect(o.x+o.w+14,o.y+o.h/2-3,4,6);
  }else if(o.type==='broom'){
    x.fillStyle='#92400e';
    x.fillRect(o.x+o.w/2-3,o.y,6,o.h-22);
    x.fillStyle='#451a03';
    x.fillRect(o.x+o.w/2-2,o.y+2,4,o.h-24);
    x.fillStyle='#fde68a';
    x.beginPath();x.moveTo(o.x+o.w/2-8,o.y+o.h-22);x.lineTo(o.x+o.w/2+8,o.y+o.h-22);x.lineTo(o.x+o.w/2+5,o.y+o.h);x.lineTo(o.x+o.w/2-5,o.y+o.h);x.fill();
    x.strokeStyle='#b45309';x.lineWidth=1;
    for(let i=0;i<5;i++){
      let fx=o.x+o.w/2-6+i*3;
      x.beginPath();x.moveTo(fx,o.y+o.h-22);x.lineTo(fx+1,o.y+o.h);x.stroke();
    }
  }else{
    let bob=Math.sin(t*0.2)*1.5|0;
    let hx=o.x,hy=o.y+bob;
    x.fillStyle='#f3f4f6';
    x.beginPath();x.ellipse(hx+o.w/2,hy+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);x.fill();
    x.fillStyle='#ffffff';
    x.beginPath();x.ellipse(hx+o.w/2-4,hy+o.h/2-6,o.w/4,o.h/4,-.2,0,Math.PI*2);x.fill();
    x.fillStyle='#dc2626';
    x.beginPath();x.moveTo(hx+o.w/2-7,hy+2);x.lineTo(hx+o.w/2,hy-6);x.lineTo(hx+o.w/2+7,hy+2);x.fill();
    x.fillStyle='#fbbf24';
    x.beginPath();x.moveTo(hx+o.w/2-4,hy-5);x.lineTo(hx+o.w/2-1,hy-9);x.lineTo(hx+o.w/2+1,hy-9);x.lineTo(hx+o.w/2+4,hy-5);x.fill();
    x.fillStyle='#1a1410';
    x.beginPath();x.arc(hx+o.w/2-5,hy+o.h/2-2,2,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(hx+o.w/2+5,hy+o.h/2-2,2,0,Math.PI*2);x.fill();
    x.fillStyle='#f59e0b';
    x.beginPath();x.moveTo(hx+o.w/2-3,hy+o.h/2+3);x.lineTo(hx+o.w/2+3,hy+o.h/2+3);x.lineTo(hx+o.w/2,hy+o.h/2+6);x.fill();
  }
}

function drawYolk(y){
  let by=Math.round(y.y+Math.sin(y.bob*0.15)*3);
  x.fillStyle='rgba(251,191,36,.3)';
  x.beginPath();x.arc(y.x,by,y.r+4,0,Math.PI*2);x.fill();
  x.fillStyle='#fbbf24';
  x.beginPath();x.arc(y.x,by,y.r,0,Math.PI*2);x.fill();
  x.fillStyle='#fde68a';
  x.beginPath();x.arc(y.x-2,by-2,y.r*.4,0,Math.PI*2);x.fill();
}

function drawPart(){
  for(const p of part){
    x.globalAlpha=p.life/30;x.fillStyle=p.col;
    x.fillRect(Math.round(p.x),Math.round(p.y),3,3);
  }
  x.globalAlpha=1;
}

function drawHud(){
  x.fillStyle='rgba(26,20,16,.06)';
  x.fillRect(0,SKY-30,W,2);
}

function drawOver(){
  x.fillStyle='rgba(26,20,16,.78)';x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textAlign='center';
  x.font='bold 44px -apple-system,sans-serif';x.fillText('Run Over',W/2,H/2-40);
  x.font='bold 22px -apple-system,sans-serif';x.fillStyle='#fbbf24';
  x.fillText('Score: '+score,W/2,H/2);
  x.fillText('Yolks: '+yolks,W/2,H/2+26);
  x.font='15px -apple-system,sans-serif';x.fillStyle='#fff';
  x.fillText('Best: '+best,W/2,H/2+58);
  x.font='14px -apple-system,sans-serif';x.fillStyle='#fde68a';
  x.fillText('Press Reset or Space to roll again',W/2,H/2+92);
}

function drawPaused(){
  x.fillStyle='rgba(26,20,16,.72)';x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textAlign='center';
  x.font='bold 46px -apple-system,sans-serif';x.fillText('Paused',W/2,H/2-16);
  x.font='15px -apple-system,sans-serif';x.fillStyle='#fde68a';
  x.fillText('Press P or the Pause button to resume',W/2,H/2+22);
}

function draw(){
  x.clearRect(0,0,W,H);
  drawBg();
  drawHud();
  for(const y of yks)if(y.alive)drawYolk(y);
  for(const o of ob)drawObs(o);
  drawEgg();
  drawPart();
  if(over)drawOver();
  else if(paused)drawPaused();
}

function loop(){step();draw();requestAnimationFrame(loop);}

c.addEventListener('mousedown',function(e){
  if(paused){togglePause(false);return;}
  jump();
});
c.addEventListener('touchstart',function(e){e.preventDefault();if(paused){togglePause(false);return;}jump();},{passive:false});
document.getElementById('jumpBtn').addEventListener('click',function(e){e.stopPropagation();if(paused){togglePause(false);return;}jump();});
document.getElementById('resetBtn').addEventListener('click',function(e){e.stopPropagation();reset();});
document.getElementById('pauseBtn').addEventListener('click',function(e){e.stopPropagation();togglePause();});
document.querySelectorAll('.diff-btn').forEach(b=>{b.addEventListener('click',function(e){e.stopPropagation();setDifficulty(b.dataset.diff);});});
setDifficulty(diff);
document.addEventListener('keydown',function(e){
  if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){e.preventDefault();if(paused){togglePause(false);return;}jump();}
  else if(e.key==='r'||e.key==='R'){reset();}
  else if(e.key==='p'||e.key==='P'||e.key==='Escape'){togglePause();}
  else if(e.key==='1')setDifficulty('easy');
  else if(e.key==='2')setDifficulty('normal');
  else if(e.key==='3')setDifficulty('hard');
});

loop();
})();
