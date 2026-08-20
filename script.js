const marker=document.querySelector('#marker'),trackWrap=document.querySelector('#trackWrap'),trainer=document.querySelector('#trainer');
const positionEl=document.querySelector('#position'),speedEl=document.querySelector('#speed'),phaseEl=document.querySelector('#phase'),statusEl=document.querySelector('#status');
const startBtn=document.querySelector('#startBtn'),pauseBtn=document.querySelector('#pauseBtn'),resetBtn=document.querySelector('#resetBtn'),orientation=document.querySelector('#orientation');
const scaleStart=document.querySelector('#scaleStart'),scaleEnd=document.querySelector('#scaleEnd');
const settings={minSpeed:document.querySelector('#minSpeed'),maxSpeed:document.querySelector('#maxSpeed'),minPause:document.querySelector('#minPause'),maxPause:document.querySelector('#maxPause'),pauseChance:document.querySelector('#pauseChance'),variation:document.querySelector('#variation')};
const outputs={minSpeed:document.querySelector('#minSpeedValue'),maxSpeed:document.querySelector('#maxSpeedValue'),minPause:document.querySelector('#minPauseValue'),maxPause:document.querySelector('#maxPauseValue'),pauseChance:document.querySelector('#pauseChanceValue'),variation:document.querySelector('#variationValue')};
const STORAGE_KEY='rhythm-flow-settings-v1';
const defaults={orientation:'vertical',minSpeed:'0.6',maxSpeed:'1.8',minPause:'0.5',maxPause:'2.5',pauseChance:'28',variation:'25'};
let pos=.5,target=.5,speed=120,targetSpeed=120,running=false,paused=false,pauseUntil=0,lastTime=0,nextSpeedChange=0,pauseAfterArrival=false;
const random=(a,b)=>a+Math.random()*(b-a);
function readSettings(){return{minSpeed:+settings.minSpeed.value,maxSpeed:+settings.maxSpeed.value,minPause:+settings.minPause.value,maxPause:+settings.maxPause.value,pauseChance:+settings.pauseChance.value/100};}
function isHorizontal(){return orientation.value==='horizontal';}
function trackLength(){return Math.max(1,isHorizontal()?trackWrap.clientWidth:trackWrap.clientHeight);}
function applyOrientation(){
  trainer.classList.toggle('horizontal',isHorizontal());
  scaleStart.textContent=isHorizontal()?'0%':'0%'; scaleEnd.textContent='100%';
  const len=trackLength(); pos=Math.max(0,Math.min(len,pos*len))/len; target=Math.max(0,Math.min(1,target));
  render();
}
function render(){
  const len=trackLength();
  const p=Math.max(0,Math.min(1,pos));
  if(isHorizontal()) marker.style.transform=`translate3d(${p*len}px,-50%,0)`;
  else marker.style.transform=`translate3d(-50%,${p*len}px,0)`;
  positionEl.textContent=`${Math.round(p*100)}%`;
  speedEl.textContent=`${(speed/120).toFixed(2)}×`;
}
function chooseSpeed(now){const s=readSettings();targetSpeed=random(Math.min(s.minSpeed,s.maxSpeed),Math.max(s.minSpeed,s.maxSpeed))*120;nextSpeedChange=now+random(1800,4500);}
function chooseDestination(){
  const p=pos, roll=Math.random();
  if(roll<.2) target=0; else if(roll<.4) target=1; else target=random(.05,.95);
  if(Math.abs(target-p)<.08) target=p<.5?random(.6,.95):random(.05,.4);
  pauseAfterArrival=Math.random()<=readSettings().pauseChance;
  phaseEl.textContent=target>p?'MOVING DOWN':'MOVING UP';
}
function beginPause(now){const s=readSettings();pauseUntil=now+random(Math.min(s.minPause,s.maxPause),Math.max(s.minPause,s.maxPause))*1000;paused=true;marker.classList.add('paused');phaseEl.textContent='PAUSED';}
function frame(now){
  if(!lastTime)lastTime=now;const dt=Math.min(50,Math.max(0,now-lastTime))/1000;lastTime=now;
  if(running&&!paused){
    if(now>=nextSpeedChange)chooseSpeed(now); speed+=(targetSpeed-speed)*(1-Math.exp(-dt/.8));
    const distance=target-pos,step=speed*dt/trackLength();
    if(Math.abs(distance)>.000001)pos+=Math.sign(distance)*Math.min(Math.abs(distance),step);
    if(Math.abs(target-pos)<=.000001){pos=target;if(pauseAfterArrival)beginPause(now);else chooseDestination();}
  }
  if(running&&paused&&now>=pauseUntil){paused=false;marker.classList.remove('paused');chooseDestination();}
  render();requestAnimationFrame(frame);
}
function saveSettings(){localStorage.setItem(STORAGE_KEY,JSON.stringify({orientation:orientation.value,...Object.fromEntries(Object.entries(settings).map(([k,v])=>[k,v.value]))}));}
function loadSettings(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');const data={...defaults,...(saved||{})};orientation.value=data.orientation;Object.entries(settings).forEach(([k,v])=>{if(data[k]!=null)v.value=data[k];});}catch{Object.assign({},defaults);}}
function updateOutputs(){outputs.minSpeed.textContent=`${(+settings.minSpeed.value).toFixed(2)}×`;outputs.maxSpeed.textContent=`${(+settings.maxSpeed.value).toFixed(2)}×`;outputs.minPause.textContent=`${(+settings.minPause.value).toFixed(1)} s`;outputs.maxPause.textContent=`${(+settings.maxPause.value).toFixed(1)} s`;outputs.pauseChance.textContent=`${settings.pauseChance.value}%`;outputs.variation.textContent=`${settings.variation.value}%`;saveSettings();}
function start(){running=true;paused=false;marker.classList.remove('paused');const now=performance.now();lastTime=now;chooseSpeed(now);speed=targetSpeed;chooseDestination();statusEl.textContent='RUNNING';startBtn.disabled=true;pauseBtn.disabled=false;pauseBtn.textContent='PAUSE';}
function togglePause(){if(!running)return;paused=!paused;if(paused){pauseUntil=Infinity;marker.classList.add('paused');phaseEl.textContent='PAUSED';pauseBtn.textContent='RESUME';statusEl.textContent='PAUSED';}else{paused=false;marker.classList.remove('paused');lastTime=performance.now();phaseEl.textContent=target>pos?'MOVING DOWN':'MOVING UP';pauseBtn.textContent='PAUSE';statusEl.textContent='RUNNING';}}
function reset(){localStorage.removeItem(STORAGE_KEY);Object.entries(defaults).forEach(([k,v])=>{if(k==='orientation')orientation.value=v;else settings[k].value=v;});updateOutputs();trainer.classList.remove('horizontal');running=false;paused=false;pos=.5;target=.5;speed=120;targetSpeed=120;marker.classList.remove('paused');statusEl.textContent='READY';phaseEl.textContent='READY';startBtn.disabled=false;pauseBtn.disabled=true;pauseBtn.textContent='PAUSE';render();}
Object.values(settings).forEach(i=>i.addEventListener('input',updateOutputs));orientation.addEventListener('change',()=>{applyOrientation();saveSettings();});startBtn.addEventListener('click',start);pauseBtn.addEventListener('click',togglePause);resetBtn.addEventListener('click',reset);
window.addEventListener('resize',render);
loadSettings();applyOrientation();updateOutputs();render();requestAnimationFrame(frame);
