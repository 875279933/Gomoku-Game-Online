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
const DEVIL={w:46,h:54,x:90,y:0,vy:0,on:false,run:0};
const GRAV=.85,JUMP=-15,HOLD_JUMP=-12,JUMP_HOLD_FRAMES=8;
const DIFFICULTY={
  easy:  {speed0:3.5, speedMax:9,  ramp:2400, spawnMin:42, spawnRamp:380},
  normal:{speed0:5.5, speedMax:13, ramp:1400, spawnMin:32, spawnRamp:280},
  hard:  {speed0:7.5, speedMax:20, ramp:800,  spawnMin:22, spawnRamp:200}
};
let diff=localStorage.getItem('dd_diff')||'normal';
if(!DIFFICULTY[diff])diff='normal';
let CFG=DIFFICULTY[diff];
let speed=CFG.speed0,dist=0,score=0,best=+localStorage.getItem('dd_best')||0;
let ob=[],orbs=[],part=[],t=0,jumpHold=0,over=false,overT=0,hintHidden=false,firstJump=false,paused=false;
document.getElementById('best').textContent=best;

const RND=(a,b)=>Math.random()*(b-a)+a;
const CL=(v,a,b)=>v<a?a:v>b?b:v;
const HIT=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function spawnObs(){
  let type=Math.random();
  let o;
  if(type<.45){
    o={x:W+40,y:GROUND-22,w:28,h:22,type:'spike'};
  }else if(type<.75){
    o={x:W+40,y:GROUND-58,w:30,h:58,type:'wall'};
  }else{
    o={x:W+40,y:GROUND-110,w:30,h:30,type:'flame'};
  }
  ob.push(o);
  if(Math.random()<.18){
    orbs.push({x:W+20+RND(40,180),y:GROUND-RND(60,130),r:9,alive:true});
  }
}

function spark(n,x,y,col){
  for(let i=0;i<n;i++){
    part.push({x:x,y:y,vx:RND(-4,4),vy:RND(-7,-2),g:.4,life:30,col:col});
  }
}

function reset(){
  ob=[];orbs=[];part=[];t=0;speed=CFG.speed0;dist=0;score=0;
  DEVIL.y=GROUND-DEVIL.h;DEVIL.vy=0;DEVIL.on=true;DEVIL.run=0;
  over=false;overT=0;jumpHold=0;paused=false;
  var pb=document.getElementById('pauseBtn');if(pb)pb.textContent='Pause';
  document.getElementById('score').textContent='0';
  if(!hintHidden)setTimeout(()=>{var h=document.getElementById('touchHint');if(h)h.classList.add('hide');hintHidden=true;},1500);
}

function setDifficulty(name){
  if(!DIFFICULTY[name])return;
  diff=name;CFG=DIFFICULTY[name];
  localStorage.setItem('dd_diff',name);
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
  if(DEVIL.on){DEVIL.vy=JUMP;DEVIL.on=false;jumpHold=JUMP_HOLD_FRAMES;spark(4,DEVIL.x+DEVIL.w/2,DEVIL.y+DEVIL.h,'#f59e0b');}
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
  if(score>best){best=score;localStorage.setItem('dd_best',best);document.getElementById('best').textContent=best;}

  for(const o of ob){o.x-=speed;}
  for(const o of orbs)o.x-=speed;
  ob=ob.filter(o=>o.x+o.w>-20);
  orbs=orbs.filter(o=>o.x+o.r>-20&&o.alive);

  DEVIL.run+=speed;
  if(!DEVIL.on){
    if(jumpHold>0&&DEVIL.vy<0){DEVIL.vy+=HOLD_JUMP*0.04;jumpHold--;}
    DEVIL.vy+=GRAV;
    DEVIL.y+=DEVIL.vy;
    if(DEVIL.y+DEVIL.h>=GROUND){DEVIL.y=GROUND-DEVIL.h;DEVIL.vy=0;DEVIL.on=true;spark(3,DEVIL.x+DEVIL.w/2,DEVIL.y+DEVIL.h,'#dc2626');}
  }

  for(const o of ob){
    if(HIT(DEVIL,o)){over=true;spark(18,DEVIL.x+DEVIL.w/2,DEVIL.y+DEVIL.h/2,'#ef4444');break;}
  }
  for(const o of orbs){
    if(o.alive&&HIT(DEVIL,{x:o.x-o.r,y:o.y-o.r,w:o.r*2,h:o.r*2})){
      o.alive=false;score+=25;document.getElementById('score').textContent=score;
      if(score>best){best=score;localStorage.setItem('dd_best',best);document.getElementById('best').textContent=best;}
      spark(8,o.x,o.y,'#fbbf24');
    }
  }
  for(const p of part){p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.life--;}
  part=part.filter(p=>p.life>0);
}

function drawBg(){
  let g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1a0a08');g.addColorStop(1,'#3a0f0a');
  x.fillStyle=g;x.fillRect(0,0,W,H);

  for(let i=0;i<20;i++){
    let s=((t*0.3+i*47)%W);
    x.fillStyle=`rgba(255,150,80,${.12+Math.sin(t*0.05+i)*.05})`;
    x.fillRect(s,SKY-40+i*3,2,1);
  }

  x.fillStyle='#1f0a07';x.beginPath();x.moveTo(0,GROUND);x.lineTo(W,GROUND);x.lineTo(W,GROUND+6);x.lineTo(0,GROUND+8);x.fill();
  x.fillStyle='rgba(220,38,38,.5)';
  for(let i=0;i<W;i+=20){
    let f=Math.sin(t*0.2+i)*1.5;
    x.fillRect(i,GROUND-2+f,10,2);
  }
  x.fillStyle='#dc2626';
  for(let i=0;i<W;i+=60){
    let f=Math.sin(t*0.15+i)*3+3;
    x.beginPath();
    x.moveTo(i,GROUND);
    x.lineTo(i+8,GROUND-12-f);
    x.lineTo(i+16,GROUND);
    x.fill();
  }
}

function drawDevil(){
  let d=DEVIL;
  let dx=Math.round(d.x),dy=Math.round(d.y);
  x.fillStyle='#dc2626';
  x.beginPath();x.arc(dx+d.w/2,dy+d.h/2,d.w/2,0,Math.PI*2);x.fill();
  x.fillStyle='#7f1d1d';
  x.beginPath();x.moveTo(dx+6,dy+2);x.lineTo(dx+d.w/2-4,dy-12);x.lineTo(dx+d.w-6,dy+2);x.fill();
  x.beginPath();x.moveTo(dx+d.w-6,dy+2);x.lineTo(dx+d.w/2+4,dy-12);x.lineTo(dx+6,dy+2);x.fill();
  x.fillStyle='#fde047';
  x.fillRect(dx+12,dy+14,6,4);x.fillRect(dx+28,dy+14,6,4);
  x.fillStyle='#0f0a08';
  x.beginPath();x.arc(dx+15,dy+16,2,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(dx+31,dy+16,2,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';
  x.beginPath();x.arc(dx+16,dy+16,1,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(dx+32,dy+16,1,0,Math.PI*2);x.fill();
  x.fillStyle='#7f1d1d';
  x.beginPath();x.moveTo(dx+18,dy+24);x.lineTo(dx+30,dy+24);x.lineTo(dx+24,dy+30);x.fill();
  x.fillStyle='#fde047';
  x.beginPath();x.moveTo(dx-4,dy+20);x.lineTo(dx+2,dy+d.h/2);x.lineTo(dx+8,dy+20);x.fill();
  x.beginPath();x.moveTo(dx+d.w-8,dy+20);x.lineTo(dx+d.w-2,dy+d.h/2);x.lineTo(dx+d.w+4,dy+20);x.fill();
  x.lineWidth=2;x.strokeStyle='#1f1410';
  x.beginPath();
  x.moveTo(dx+8,dy+d.h-2);x.lineTo(dx+8,dy+d.h+8);
  x.moveTo(dx+d.w-8,dy+d.h-2);x.lineTo(dx+d.w-8,dy+d.h+8);
  x.stroke();
  x.strokeStyle='#9ca3af';x.lineWidth=3;
  x.beginPath();x.moveTo(dx+d.w-2,dy+10);x.lineTo(dx+d.w+18,dy-4);x.stroke();
  x.fillStyle='#9ca3af';
  x.beginPath();x.moveTo(dx+d.w+18,dy-4);x.lineTo(dx+d.w+22,dy+2);x.lineTo(dx+d.w+14,dy+2);x.fill();
}

function drawObs(o){
  if(o.type==='spike'){
    x.fillStyle='#9ca3af';
    x.beginPath();x.moveTo(o.x,o.y+o.h);x.lineTo(o.x+o.w/2,o.y);x.lineTo(o.x+o.w,o.y+o.h);x.fill();
    x.fillStyle='#6b7280';
    x.beginPath();x.moveTo(o.x+4,o.y+o.h);x.lineTo(o.x+o.w/2,o.y+8);x.lineTo(o.x+o.w-4,o.y+o.h);x.fill();
  }else if(o.type==='wall'){
    x.fillStyle='#7f1d1d';
    x.fillRect(o.x,o.y,o.w,o.h);
    x.fillStyle='#fde047';
    x.fillRect(o.x+4,o.y+4,o.w-8,4);
    x.fillStyle='#f59e0b';
    x.beginPath();
    for(let i=0;i<3;i++){
      let fx=o.x+8+i*7,fy=o.y-4-Math.sin(t*0.2+i)*2;
      x.moveTo(fx,fy+8);x.lineTo(fx+3,fy);x.lineTo(fx+6,fy+8);
    }
    x.fill();
  }else{
    x.fillStyle='rgba(239,68,68,.4)';
    x.beginPath();x.arc(o.x+o.w/2,o.y+o.h/2,o.w,0,Math.PI*2);x.fill();
    x.fillStyle='#f59e0b';
    x.beginPath();x.arc(o.x+o.w/2,o.y+o.h/2,o.w*.6,0,Math.PI*2);x.fill();
    x.fillStyle='#fbbf24';
    x.beginPath();x.arc(o.x+o.w/2,o.y+o.h/2,o.w*.3,0,Math.PI*2);x.fill();
    x.fillStyle='#dc2626';
    x.beginPath();x.moveTo(o.x+o.w/2-4,o.y+4);x.lineTo(o.x+o.w/2+4,o.y+4);x.lineTo(o.x+o.w/2,o.y-6);x.fill();
  }
}

function drawOrb(o){
  x.fillStyle='rgba(251,191,36,.25)';
  x.beginPath();x.arc(o.x,o.y,o.r+3,0,Math.PI*2);x.fill();
  x.fillStyle='#fbbf24';
  x.beginPath();x.arc(o.x,o.y,o.r,0,Math.PI*2);x.fill();
  x.fillStyle='#fef3c7';
  x.beginPath();x.arc(o.x-2,o.y-2,o.r*.4,0,Math.PI*2);x.fill();
}

function drawPart(){
  for(const p of part){
    x.globalAlpha=p.life/30;x.fillStyle=p.col;
    x.fillRect(p.x,p.y,3,3);
  }
  x.globalAlpha=1;
}

function drawHud(){
  x.fillStyle='rgba(255,255,255,.05)';
  x.fillRect(0,SKY-30,W,2);
}

function drawOver(){
  x.fillStyle='rgba(15,8,8,.78)';x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textAlign='center';
  x.font='bold 44px -apple-system,sans-serif';x.fillText('Run Over',W/2,H/2-30);
  x.font='bold 22px -apple-system,sans-serif';x.fillStyle='#fde047';
  x.fillText('Score: '+score,W/2,H/2+12);
  x.font='15px -apple-system,sans-serif';x.fillStyle='#fff';
  x.fillText('Best: '+best,W/2,H/2+40);
  x.font='14px -apple-system,sans-serif';x.fillStyle='#fbbf24';
  x.fillText('Press Reset or Space to run again',W/2,H/2+74);
}

function drawPaused(){
  x.fillStyle='rgba(15,8,8,.72)';x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textAlign='center';
  x.font='bold 46px -apple-system,sans-serif';x.fillText('Paused',W/2,H/2-16);
  x.font='15px -apple-system,sans-serif';x.fillStyle='#fbbf24';
  x.fillText('Press P or the Pause button to resume',W/2,H/2+22);
}

function draw(){
  x.clearRect(0,0,W,H);
  drawBg();
  drawHud();
  for(const o of orbs)if(o.alive)drawOrb(o);
  for(const o of ob)drawObs(o);
  drawDevil();
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
