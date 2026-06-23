(()=>{
const BAND=5;
const COLOR={
 white:{hex:'#f7f5ec',name:'White'},
 red:{hex:'#e8543d',name:'Red'},
 blue:{hex:'#3a7bd5',name:'Blue'},
 yellow:{hex:'#ffc94a',name:'Yellow'},
 green:{hex:'#5fb87a',name:'Green'},
 purple:{hex:'#8b5cf6',name:'Purple'}
};
const ZONE_NAME={all:'All',top:'Top',mid:'Middle',bot:'Bottom',stripes:'Stripes',gaps:'Gaps'};

const LEVELS=[
 {target:['red','red','red','red','red'],tools:[{type:'all',color:'red',count:3}]},
 {target:['red','red','white','red','red'],tools:[{type:'all',color:'red',count:2},{type:'mid',color:'white',count:1}]},
 {target:['blue','blue','blue','blue','blue'],tools:[{type:'all',color:'blue',count:3}]},
 {target:['yellow','yellow','blue','yellow','yellow'],tools:[{type:'all',color:'yellow',count:2},{type:'mid',color:'blue',count:1}]},
 {target:['red','white','red','white','red'],tools:[{type:'all',color:'red',count:3},{type:'gaps',color:'white',count:1}]},
 {target:['green','green','white','green','green'],tools:[{type:'all',color:'green',count:2},{type:'mid',color:'white',count:1}]},
 {target:['red','blue','red','blue','red'],tools:[{type:'stripes',color:'red',count:1},{type:'gaps',color:'blue',count:1}]},
 {target:['purple','yellow','purple','yellow','purple'],tools:[{type:'stripes',color:'purple',count:1},{type:'gaps',color:'yellow',count:1}]},
 {target:['red','red','yellow','green','green'],tools:[{type:'top',color:'red',count:1},{type:'mid',color:'yellow',count:1},{type:'bot',color:'green',count:1}]},
 {target:['blue','white','purple','white','blue'],tools:[{type:'stripes',color:'blue',count:1},{type:'stripes',color:'purple',count:1},{type:'gaps',color:'white',count:1}]}
];

let lv=0,moves=0,ball=Array(BAND).fill('white'),uses=[],unlocked=false;

const ballCv=document.getElementById('ball');
const tgtCv=document.getElementById('target');
const bx=ballCv.getContext('2d');
const tx=tgtCv.getContext('2d');
const toolsEl=document.getElementById('tools');
const levelEl=document.getElementById('level');
const movesEl=document.getElementById('moves');
const totalEl=document.getElementById('total');
const winEl=document.getElementById('win');

function zone(type,i){
 if(type==='all')return true;
 if(type==='top')return i<2;
 if(type==='bot')return i>=3;
 if(type==='mid')return i===2;
 if(type==='stripes')return i%2===0;
 if(type==='gaps')return i%2===1;
 return false;
}

function draw(cv,cx,bands,opts={}){
 const W=cv.width,H=cv.height;
 const r=Math.min(W,H)/2-4;
 const cxp=W/2,cyp=H/2;
 cx.save();
 cx.beginPath();cx.arc(cxp,cyp,r,0,Math.PI*2);cx.clip();
 const bh=(r*2)/BAND;
 for(let i=0;i<BAND;i++){
  cx.fillStyle=COLOR[bands[i]].hex;
  cx.fillRect(cxp-r,cyp-r+i*bh,r*2,bh+1);
 }
 cx.restore();
 cx.beginPath();cx.arc(cxp,cyp,r,0,Math.PI*2);
 cx.strokeStyle='#15131a';cx.lineWidth=3;cx.stroke();
 if(!opts.target){
  cx.beginPath();cx.arc(cxp-r/3,cyp-r/3,r/3.5,0,Math.PI*2);
  const g=cx.createRadialGradient(cxp-r/3,cyp-r/3,0,cxp-r/3,cyp-r/3,r/3.5);
  g.addColorStop(0,'rgba(255,255,255,.55)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  cx.fillStyle=g;cx.fill();
 }
}

function renderTools(){
 toolsEl.innerHTML='';
 const cur=LEVELS[lv];
 cur.tools.forEach((t,i)=>{
  const b=document.createElement('button');
  b.className='tool';
  b.type='button';
  b.disabled=uses[i]<=0;
  b.innerHTML=`<span class="swatch" style="background:${COLOR[t.color].hex}"></span><span class="info"><span class="name">${COLOR[t.color].name}</span><span class="zone">${ZONE_NAME[t.type]}</span></span><span class="count">${uses[i]}</span>`;
  b.addEventListener('click',()=>useTool(i));
  toolsEl.appendChild(b);
 });
}

function useTool(i){
 if(unlocked)return;
 if(uses[i]<=0)return;
 const t=LEVELS[lv].tools[i];
 for(let j=0;j<BAND;j++){
  if(zone(t.type,j))ball[j]=t.color;
 }
 uses[i]--;
 moves++;
 renderTools();
 draw(ballCv,bx,ball);
 check();
}

function check(){
 const t=LEVELS[lv].target;
 if(ball.every((c,i)=>c===t[i])){
  unlocked=true;
  winEl.classList.add('show');
  winEl.textContent=`Level ${lv+1} cleared in ${moves} move${moves===1?'':'s'}.`;
  setTimeout(()=>{
   if(lv<LEVELS.length-1){
    lv++;
    loadLevel();
   }else{
    winEl.textContent=`All ${LEVELS.length} levels cleared. Nice work.`;
   }
  },1100);
 }
}

function loadLevel(){
 unlocked=false;
 moves=0;
 ball=Array(BAND).fill('white');
 const cur=LEVELS[lv];
 uses=cur.tools.map(t=>t.count);
 levelEl.textContent=lv+1;
 totalEl.textContent=LEVELS.length;
 movesEl.textContent=0;
 winEl.classList.remove('show');
 draw(ballCv,bx,ball);
 draw(tgtCv,tx,cur.target,{target:true});
 renderTools();
}

function resetBall(){
 if(unlocked)return;
 ball=Array(BAND).fill('white');
 uses=LEVELS[lv].tools.map(t=>t.count);
 moves=0;
 movesEl.textContent=0;
 draw(ballCv,bx,ball);
 renderTools();
}

function nextLevel(){
 if(lv<LEVELS.length-1){lv++;loadLevel();}
}

function prevLevel(){
 if(lv>0){lv--;loadLevel();}
}

document.getElementById('reset').addEventListener('click',resetBall);
document.getElementById('next').addEventListener('click',nextLevel);
document.getElementById('prev').addEventListener('click',prevLevel);

loadLevel();
})();
