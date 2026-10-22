import {Game,LEVELS,POWERS,clamp} from './game.mjs';
import {Renderer} from './renderer.js';
import {Sound} from './audio.js';
const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['app','stage','menu','demoCaption','hud','score','combo','sector','levelName','levelProgress','lives','launchHint','launchTitle','launchDescription','announcement','powerups','overdriveButton','overdriveText','overdriveFill','footerStatus','modalBackdrop','soundButton','resultScore','resultTitle','resultEyebrow','resultLevel','resultCombo','resultDestroyed','newRecord','playerName','saveStatus','saveScoreButton','scoreForm','leaderboardList','leaderboardStatus','personalBest'].map(id=>[id,$(id)]));
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
const renderer=new Renderer($('gameCanvas'),$('atmosphere')),sound=new Sound();
let previousFocus=null,modal=null,modalPause=false,lastResult=null,runId='',savedRun=false,announceTimer=null,hudClock=0,best=storage.get('nocturne.best',0),soundPreference=storage.get('nocturne.sound',true),lastFrame=performance.now(),accumulator=0;
let powerMarkup='',shownLives=-1;
function syncSound(){ui.soundButton.setAttribute('aria-pressed',String(sound.enabled));ui.soundButton.setAttribute('aria-label',sound.enabled?'Выключить звук':'Включить звук');}
function enableSound(){if(soundPreference&&!sound.enabled){sound.enable();syncSound();}}
function announce(title,subtitle=''){clearTimeout(announceTimer);ui.announcement.replaceChildren();ui.announcement.append(document.createTextNode(title));if(subtitle){const small=document.createElement('small');small.textContent=subtitle;ui.announcement.append(small);}ui.announcement.classList.remove('show');void ui.announcement.offsetWidth;ui.announcement.classList.add('show');announceTimer=setTimeout(()=>ui.announcement.classList.remove('show'),2100);}
const game=new Game(e=>{
  renderer.onEvent(e);sound.onEvent(e);
  if(e.type==='level'){sound.setScene(e.index);ui.launchTitle.textContent=LEVELS[e.index].subtitle;ui.launchDescription.textContent='ПРОБЕЛ ИЛИ КЛИК — ЗАПУСК';ui.footerStatus.textContent=`РАЙОН ${String(e.index+1).padStart(2,'0')} · ${LEVELS[e.index].name.toUpperCase()}`;}
  if(e.type==='power')announce(POWERS[e.power].label,e.power==='multi'?'БОЛЬШЕ ШАРОВ. БОЛЬШЕ ХАОСА.':'ГОРОД НА ТВОЕЙ СТОРОНЕ');
  if(e.type==='overdrive')announce('ПЕРЕГРУЗКА','8 СЕКУНД ЧИСТОЙ ЭНЕРГИИ');
  if(e.type==='combo')announce(e.combo===8?'ЦЕПНАЯ РЕАКЦИЯ':e.combo===16?'ГОРОД В ОГНЕ':'АБСОЛЮТНЫЙ ХАОС',`СЕРИЯ ${e.combo} · МНОЖИТЕЛЬ ×${game.multiplier}`);
  if(e.type==='clear')announce(e.final?'НОЧЬ ПОБЕЖДЕНА':'РАЙОН ЗАЧИЩЕН',e.final?'ТЫ ВКЛЮЧИЛ РАССВЕТ':`+${1500*(game.level+1)} · СЛЕДУЮЩАЯ ОСТАНОВКА: ${LEVELS[game.level+1].name.toUpperCase()}`);
  if(e.type==='lost'&&e.lives>0){ui.launchTitle.textContent=e.lives===1?'ПОСЛЕДНИЙ ШАНС':'ЕЩЁ НЕ КОНЕЦ';ui.launchDescription.textContent='ПРОБЕЛ ИЛИ КЛИК — ВЕРНУТЬСЯ В ИГРУ';}
  if(e.type==='end')showResult(e);
});
function startGame(){closeModal(false);clearTimeout(announceTimer);ui.announcement.classList.remove('show');enableSound();runId=globalThis.crypto?.randomUUID?.()||String(Date.now());savedRun=false;lastResult=null;document.body.classList.add('playing');ui.menu.hidden=true;ui.demoCaption.hidden=true;$('nextTrackButton').hidden=false;ui.hud.hidden=false;ui.overdriveButton.hidden=false;ui.powerups.hidden=false;shownLives=-1;game.start();sound.duck(false);requestAnimationFrame(()=>renderer.resize());updateHud();}
function goHome(){closeModal(false);game.state='menu';game.keyboard=0;renderer.particles=[];renderer.rings=[];renderer.labels=[];renderer.flashes=[];document.body.classList.remove('playing');ui.menu.hidden=false;ui.demoCaption.hidden=false;$('nextTrackButton').hidden=true;ui.hud.hidden=true;ui.overdriveButton.hidden=true;ui.powerups.hidden=true;ui.launchHint.hidden=true;ui.announcement.classList.remove('show');ui.footerStatus.textContent='НОЧЬ ТОЛЬКО НАЧИНАЕТСЯ';sound.setScene(-1);sound.duck(false);requestAnimationFrame(()=>renderer.resize());}
function showModal(id){
  if(modal)$(modal).hidden=true;
  else{previousFocus=document.activeElement;modalPause=game.pause();}
  modal=id;ui.modalBackdrop.hidden=false;$(id).hidden=false;ui.app.inert=true;sound.duck(true);
  requestAnimationFrame(()=>$(id).querySelector('button,input')?.focus());
}
function closeModal(resume=true){
  if(modal)$(modal).hidden=true;modal=null;ui.modalBackdrop.hidden=true;ui.app.inert=false;
  if(resume&&modalPause)game.resume();modalPause=false;sound.duck(false);previousFocus?.focus?.();
}
function pauseGame(){if(game.state==='playing'||game.state==='ready')showModal('pauseModal');}
function updateHud(){
  ui.score.textContent=String(game.score).padStart(6,'0');ui.combo.textContent=`×${game.multiplier}`;ui.combo.classList.toggle('hot',game.multiplier>=3);ui.sector.textContent=`РАЙОН ${String(game.level+1).padStart(2,'0')} / 06`;ui.levelName.textContent=LEVELS[game.level].name;ui.levelProgress.style.width=`${100*(1-game.remaining/(game.totalBricks||1))}%`;
  if(shownLives!==game.lives){shownLives=game.lives;ui.lives.replaceChildren();for(let i=0;i<3;i++){const span=document.createElement('span');span.textContent='◆';if(i>=game.lives)span.className='lost';ui.lives.append(span);}ui.lives.setAttribute('aria-label',`${game.lives} жизни`);}
  ui.launchHint.hidden=game.state!=='ready';
  const active=game.overdrive>0,ready=game.charge>=100;
  ui.overdriveButton.disabled=!(ready&&game.state==='playing');ui.overdriveButton.classList.toggle('ready',ready&&!active);ui.overdriveButton.classList.toggle('active',active);
  ui.overdriveFill.style.width=`${active?game.overdrive/8*100:game.charge}%`;
  ui.overdriveText.textContent=active?`${game.overdrive.toFixed(1)} СЕК · ПЛАЗМЕННЫЙ ШТОРМ`:ready?'ПРОБЕЛ — ВЫСВОБОДИТЬ ЭНЕРГИЮ':`${Math.floor(game.charge)}% · ЗАРЯДИ РАЗРУШЕНИЕМ`;
  const powers=Object.entries(game.powers).map(([type,time])=>({type,text:`${POWERS[type].icon} ${POWERS[type].label} ${Math.ceil(time)}с`}));if(game.shield)powers.push({type:'shield',text:`◇ ЩИТ ×${game.shield}`});
  const key=powers.map(p=>p.text).join('|');if(key!==powerMarkup){powerMarkup=key;ui.powerups.replaceChildren();for(const p of powers){const el=document.createElement('span');el.className='power-chip';el.style.color=POWERS[p.type].color;el.textContent=p.text;ui.powerups.append(el);}}
}
function showResult(result){
  lastResult=result;ui.resultScore.textContent=result.score.toLocaleString('ru-RU');ui.resultTitle.textContent=result.won?'Ты зажёг рассвет.':'Ночь запомнит.';ui.resultEyebrow.textContent=result.won?'ВСЕ РАЙОНЫ ОСВОБОЖДЕНЫ':'СИГНАЛ ПОТЕРЯН';ui.resultLevel.textContent=`${String(result.level+1).padStart(2,'0')} / 06`;ui.resultCombo.textContent=`${result.maxCombo} УДАРОВ`;ui.resultDestroyed.textContent=result.destroyed;ui.newRecord.hidden=result.score<=best;if(result.score>best){best=result.score;storage.set('nocturne.best',best);}ui.playerName.value=storage.get('nocturne.name','');ui.saveScoreButton.disabled=false;ui.saveStatus.textContent='';showModal('resultModal');
}
async function getJSON(url,options={}){const response=await fetch(url,{...options,signal:AbortSignal.timeout(6000)});const json=await response.json();if(!response.ok||json.error)throw new Error(json.error||'Сервер недоступен');return json;}
async function openLeaderboard(){
  showModal('leaderboardModal');ui.leaderboardStatus.textContent='Подключаемся к городской сети…';ui.leaderboardList.replaceChildren();ui.personalBest.textContent=best.toLocaleString('ru-RU');
  let rows=[];try{const data=await getJSON('cgi-bin/scores.py');rows=data.scores;ui.leaderboardStatus.textContent='Городская таблица рекордов · лучшие 20 забегов';}catch{rows=storage.get('nocturne.scores',[]);ui.leaderboardStatus.textContent='Городская сеть недоступна. Рекорды этого браузера.';}
  if(modal!=='leaderboardModal')return;
  if(!rows.length){const empty=document.createElement('li');empty.className='empty-records';empty.textContent='Здесь пока тихо. Стань первой легендой этой ночи.';ui.leaderboardList.append(empty);}
  rows.slice(0,20).forEach((row,index)=>{const li=document.createElement('li');for(const value of [String(index+1).padStart(2,'0'),row.name]){const span=document.createElement('span');span.textContent=value;li.append(span);}const score=document.createElement('strong');score.textContent=Number(row.score).toLocaleString('ru-RU');li.append(score);ui.leaderboardList.append(li);});
}
ui.scoreForm.addEventListener('submit',async e=>{
  e.preventDefault();if(!lastResult||savedRun)return;const name=ui.playerName.value.trim().slice(0,20);if(!name){ui.playerName.focus();return;}savedRun=true;ui.saveScoreButton.disabled=true;storage.set('nocturne.name',name);
  const entry={name,score:lastResult.score,date:new Date().toISOString().slice(0,10),runId};const scores=storage.get('nocturne.scores',[]);scores.push(entry);scores.sort((a,b)=>b.score-a.score);storage.set('nocturne.scores',scores.slice(0,20));ui.saveStatus.textContent='Сохраняем сигнал…';
  try{await getJSON('cgi-bin/scores.py',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,score:lastResult.score})});ui.saveStatus.textContent='Твой позывной сохранён в истории города.';}catch{ui.saveStatus.textContent='Сохранено в этом браузере. Городская сеть недоступна.';}
});
$('startButton').addEventListener('click',startGame);$('helpStart').addEventListener('click',startGame);$('playAgainButton').addEventListener('click',startGame);$('restartButton').addEventListener('click',startGame);
$('helpButton').addEventListener('click',()=>{enableSound();showModal('helpModal');});$('leaderboardButton').addEventListener('click',()=>{enableSound();openLeaderboard();});
$('pauseButton').addEventListener('click',pauseGame);$('resumeButton').addEventListener('click',()=>closeModal());$('quitButton').addEventListener('click',goHome);$('resultHomeButton').addEventListener('click',goHome);
$('homeButton').addEventListener('click',()=>{if(game.state==='playing'||game.state==='ready')pauseGame();else if(game.state==='menu')return;else goHome();});
ui.overdriveButton.addEventListener('click',()=>{enableSound();game.activateOverdrive();});
ui.soundButton.addEventListener('click',()=>{sound.toggle();soundPreference=sound.enabled;storage.set('nocturne.sound',sound.enabled);syncSound();});
$('nextTrackButton').addEventListener('click',()=>{enableSound();sound.nextTrack();});
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН','ИГРА ПРОДОЛЖАЕТСЯ В ОКНЕ');}});
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>closeModal());
ui.modalBackdrop.addEventListener('click',e=>{if(e.target===ui.modalBackdrop&&['helpModal','leaderboardModal'].includes(modal))closeModal();});
function primaryAction(){if(game.state==='ready')game.launch();else if(game.state==='playing')game.activateOverdrive();}
$('gameCanvas').addEventListener('pointermove',e=>{const p=renderer.worldPoint(e.clientX,e.clientY);game.setPointer(p.x);});
$('gameCanvas').addEventListener('pointerdown',e=>{if(game.state==='menu')return;e.preventDefault();enableSound();const p=renderer.worldPoint(e.clientX,e.clientY);game.setPointer(p.x);if(e.pointerType==='touch')$('gameCanvas').setPointerCapture(e.pointerId);primaryAction();});
window.addEventListener('pointermove',e=>{renderer.pointer.x=e.clientX/innerWidth-.5;renderer.pointer.y=e.clientY/innerHeight-.5;});
window.addEventListener('keydown',e=>{
  if(modal){
    if(e.key==='Tab'){const items=[...$(modal).querySelectorAll('button:not(:disabled),input:not(:disabled)')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(e.key==='Escape'){e.preventDefault();if(modal==='pauseModal'||modal==='helpModal'||modal==='leaderboardModal')closeModal();}return;
  }
  if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD','KeyP','Escape'].includes(e.code))e.preventDefault();
  if(e.code==='ArrowLeft'||e.code==='KeyA')game.keyboard=-1;
  if(e.code==='ArrowRight'||e.code==='KeyD')game.keyboard=1;
  if(e.repeat)return;
  if(e.code==='Space'){enableSound();if(game.state==='menu')startGame();else primaryAction();}
  if(e.code==='KeyP'||e.code==='Escape')pauseGame();
});
window.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))game.keyboard=0;});
window.addEventListener('blur',()=>{game.keyboard=0;pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.keyboard=0;pauseGame();sound.duck(true);}lastFrame=performance.now();accumulator=0;});
new ResizeObserver(()=>renderer.resize()).observe(ui.stage);
function frame(now){
  const dt=clamp((now-lastFrame)/1000,0,.05);lastFrame=now;
  accumulator+=dt;const step=1/120;let iterations=0;while(accumulator>=step&&iterations<8){game.update(step);accumulator-=step;iterations++;}
  renderer.draw(game,game.state==='paused'?0:dt);hudClock+=dt;if(hudClock>.06){hudClock=0;if(game.state!=='menu')updateHud();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);syncSound();
if(new URLSearchParams(location.search).has('play'))startGame();
