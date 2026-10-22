export const WIDTH = 1200;
export const HEIGHT = 800;
export const PALETTE = ['#73e7f5', '#78baff', '#a49bff', '#ed9de7', '#ffb076'];
export const LEVELS = [
  {name:'Спящий квартал', subtitle:'РАЗБУДИ ГОРОД', color:'#83effa', rows:6},
  {name:'Последний экспресс', subtitle:'СЛЕДУЙ ЗА СВЕТОМ', color:'#80baff', rows:7},
  {name:'Неоновый разлом', subtitle:'НЕ СБАВЛЯЙ ТЕМП', color:'#ba9cff', rows:8},
  {name:'Сердце города', subtitle:'ПУСТЬ ОНО БЬЁТСЯ', color:'#f29bd8', rows:8},
  {name:'Ледяная цитадель', subtitle:'ЛЁД НЕ ВЕЧЕН', color:'#a2e9ff', rows:8},
  {name:'Реактор ночи', subtitle:'ВКЛЮЧИ РАССВЕТ', color:'#ffbb88', rows:9},
];
export const POWERS = {
  multi:{label:'МУЛЬТИШАР', icon:'✦',color:'#77f5ff',duration:0},
  wide:{label:'РАСШИРЕНИЕ', icon:'↔',color:'#b9a0ff',duration:16},
  fire:{label:'ПЛАЗМА', icon:'ϟ',color:'#ffb36a',duration:10},
  slow:{label:'ВРЕМЯ ЗАМЕДЛЕНО', icon:'◷',color:'#8ef2bf',duration:12},
  shield:{label:'ЩИТ', icon:'◇',color:'#74b8ff',duration:0}
};
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function makeLevel(index) {
  const bricks=[]; const cols=12, rows=LEVELS[index].rows, w=78, h=25, gap=9;
  let id=0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const dx=Math.abs(c-5.5);
    let include=true;
    if(index===0)include=!(r<2&&(c<2-r||c>9+r)) && !(r===5&&(c===0||c===5||c===6||c===11));
    if(index===1)include=(r%3!==1||c%4===0||c%4===3);
    if(index===2)include=dx+Math.abs(r-3.5)*.8<6.3 && !(dx<1&&r>1&&r<6);
    if(index===3)include=(r===0?(c>1&&c<5)||(c>6&&c<10):r<3?dx<5.6:dx<8-r);
    if(index===4)include=r%2===0||c%3!==1;
    if(index===5)include=(dx<1.6||Math.abs(r-4)<1.3||Math.abs(dx-Math.abs(r-4))<1.2);
    if(!include)continue;
    const explosive=(index===0?(r===2&&(c===3||c===8)):(c*3+r*5+index)%13===0);
    const prism=!explosive&&(c+3*r+index)%17===0;
    const maxHp=explosive?1:1+((index>0&&(r+c)%4===0)?1:0)+((index>3&&r<3)?1:0);
    bricks.push({id:id++,x:82+c*(w+gap),y:142+r*(h+gap),w,h,hp:maxHp,maxHp,
      type:explosive?'reactor':prism?'prism':'ice',color:explosive?'#ff8e91':prism?'#c9a1ff':PALETTE[(r+Math.floor(index/2))%PALETTE.length],flash:0,alive:true,seed:(c*7+r*13)%19});
  }
  return bricks;
}
export class Game {
  constructor(onEvent=()=>{},random=Math.random){this.onEvent=onEvent;this.random=random;this.state='menu';this.paddle={x:600,target:600,y:700,width:140};this.balls=[];this.bricks=[];this.drops=[];this.powers={};this.score=0;this.combo=0;this.maxCombo=0;this.destroyed=0;this.charge=0;this.overdrive=0;this.lives=3;this.level=0;this.elapsed=0;this.transition=0;this.shield=0;this.keyboard=0;this.events=[];this.hitstop=0;}
  emit(type,data={}){this.onEvent({type,...data});}
  start(){this.score=0;this.combo=0;this.maxCombo=0;this.destroyed=0;this.charge=0;this.lives=3;this.level=0;this.elapsed=0;this.loadLevel(0);}
  loadLevel(index){this.level=index;this.bricks=makeLevel(index);this.totalBricks=this.bricks.length;this.drops=[];this.powers={};this.overdrive=0;this.shield=0;this.paddle.width=140;this.paddle.x=this.paddle.target=600;this.state='ready';this.combo=0;this.attachBall();this.emit('level',{index});}
  newBall(x,y,angle=-Math.PI/2,speed=440+this.level*35){return{x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,speed,r:7,trail:[],lastBrick:-1,contact:0};}
  attachBall(){this.balls=[this.newBall(this.paddle.x,this.paddle.y-17)];}
  launch(){if(this.state!=='ready')return;this.state='playing';const ball=this.balls[0];ball.vx=ball.speed*.18*(this.random()<.5?-1:1);ball.vy=-Math.sqrt(ball.speed**2-ball.vx**2);this.emit('launch',{x:ball.x,y:ball.y});}
  pause(){if(this.state==='playing'||this.state==='ready'){this.beforePause=this.state;this.state='paused';this.emit('pause');return true;}return false;}
  resume(){if(this.state==='paused'){this.state=this.beforePause||'ready';this.emit('resume');}}
  activateOverdrive(){if(this.state!=='playing'||this.charge<100||this.overdrive>0)return false;this.charge=0;this.overdrive=8;this.emit('overdrive',{x:this.paddle.x,y:this.paddle.y});return true;}
  get multiplier(){return Math.min(8,1+Math.floor(this.combo/4));}
  get remaining(){return this.bricks.reduce((n,b)=>n+(b.alive?1:0),0);}
  get fiery(){return this.overdrive>0||this.powers.fire>0;}
  setPointer(x){this.paddle.target=clamp(x,60,WIDTH-60);}
  update(dt){
    if(!['playing','ready','transition'].includes(this.state))return;
    dt=Math.min(dt,.05);this.elapsed+=dt;
    for(const b of this.bricks)b.flash=Math.max(0,b.flash-dt*5);
    if(this.state==='transition'){this.transition-=dt;if(this.transition<=0){if(this.level===LEVELS.length-1)this.finish(true);else this.loadLevel(this.level+1);}return;}
    if(this.keyboard)this.paddle.target+=this.keyboard*850*dt;
    this.paddle.width+=(this.powers.wide>0?220-this.paddle.width:140-this.paddle.width)*Math.min(1,dt*8);
    this.paddle.target=clamp(this.paddle.target,30+this.paddle.width/2,WIDTH-30-this.paddle.width/2);
    this.paddle.x+=(this.paddle.target-this.paddle.x)*(1-Math.exp(-dt*24));
    if(this.state==='ready'){this.balls[0].x=this.paddle.x;this.balls[0].y=this.paddle.y-17;return;}
    for(const type of Object.keys(this.powers)){this.powers[type]-=dt;if(this.powers[type]<=0)delete this.powers[type];}
    this.overdrive=Math.max(0,this.overdrive-dt);
    if(this.hitstop>0){this.hitstop-=dt;return;}
    let gameDt=dt*(this.powers.slow>0?.68:1);
    const steps=Math.max(1,Math.ceil(gameDt*1000/7));
    for(let i=0;i<steps&&this.state==='playing';i++)this.step(gameDt/steps);
    for(const ball of this.balls){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>23)ball.trail.shift();}
    for(const drop of this.drops){drop.y+=115*dt;drop.age+=dt;if(Math.abs(drop.x-this.paddle.x)<this.paddle.width/2+15&&Math.abs(drop.y-this.paddle.y)<24){drop.dead=true;this.collect(drop.type);this.emit('collect',{x:drop.x,y:drop.y,color:POWERS[drop.type].color});}}
    this.drops=this.drops.filter(d=>!d.dead&&d.y<HEIGHT+30);
    if(this.remaining===0&&this.state==='playing'){this.state='transition';this.transition=2.8;this.balls=[];this.drops=[];this.score+=1500*(this.level+1);this.emit('clear',{x:WIDTH/2,y:300,final:this.level===LEVELS.length-1});}
  }
  step(dt){
    for(const ball of this.balls){
      const oldX=ball.x,oldY=ball.y;
      ball.contact=Math.max(0,ball.contact-dt);
      ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      if(ball.x<30+ball.r){ball.x=30+ball.r;ball.vx=Math.abs(ball.vx);this.emit('wall',{x:30,y:ball.y});}
      if(ball.x>WIDTH-30-ball.r){ball.x=WIDTH-30-ball.r;ball.vx=-Math.abs(ball.vx);this.emit('wall',{x:WIDTH-30,y:ball.y});}
      if(ball.y<112+ball.r){ball.y=112+ball.r;ball.vy=Math.abs(ball.vy);this.emit('wall',{x:ball.x,y:112});}
      const p=this.paddle;
      if(ball.vy>0&&ball.y+ball.r>=p.y-5&&oldY+ball.r<=p.y+9&&Math.abs(ball.x-p.x)<p.width/2+ball.r){
        const offset=clamp((ball.x-p.x)/(p.width/2),-.95,.95);
        const angle=offset*1.05;
        ball.speed=Math.min(760,ball.speed+4);
        ball.vx=Math.sin(angle)*ball.speed;ball.vy=-Math.cos(angle)*ball.speed;
        if(Math.abs(ball.vx)<60)ball.vx=(offset>=0?1:-1)*60;
        ball.y=p.y-6-ball.r;this.combo=0;this.emit('paddle',{x:ball.x,y:p.y,offset});
      }
      if(this.shield>0&&ball.vy>0&&ball.y>741){ball.y=741;ball.vy=-Math.abs(ball.vy);this.shield--;this.emit('shield',{x:ball.x,y:750});}
      for(const b of this.bricks){
        if(!b.alive||(ball.lastBrick===b.id&&ball.contact>0))continue;
        const nearX=clamp(ball.x,b.x,b.x+b.w),nearY=clamp(ball.y,b.y,b.y+b.h);
        if((ball.x-nearX)**2+(ball.y-nearY)**2>ball.r**2)continue;
        ball.lastBrick=b.id;ball.contact=.055;
        if(!this.fiery){
          if(oldY+ball.r<=b.y){ball.vy=-Math.abs(ball.vy);ball.y=b.y-ball.r-.1;}
          else if(oldY-ball.r>=b.y+b.h){ball.vy=Math.abs(ball.vy);ball.y=b.y+b.h+ball.r+.1;}
          else if(oldX<b.x){ball.vx=-Math.abs(ball.vx);ball.x=b.x-ball.r-.1;}
          else{ball.vx=Math.abs(ball.vx);ball.x=b.x+b.w+ball.r+.1;}
        }
        this.hit(b,this.fiery?3:1);
        if(!this.fiery)break;
      }
    }
    this.balls=this.balls.filter(b=>b.y<HEIGHT+40);
    if(this.balls.length===0){this.lives--;this.combo=0;this.powers={};this.overdrive=0;this.drops=[];this.emit('lost',{x:this.paddle.x,y:760,lives:this.lives});if(this.lives<=0)this.finish(false);else{this.state='ready';this.attachBall();}}
  }
  hit(brick,damage=1,chain=false){
    if(!brick.alive)return;
    brick.hp-=damage;brick.flash=1;
    if(brick.hp>0){this.emit('hit',{x:brick.x+brick.w/2,y:brick.y+brick.h/2,color:brick.color});return;}
    brick.alive=false;this.destroyed++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const points=(brick.type==='reactor'?180:100)*this.multiplier;
    this.score+=points;if(this.overdrive===0)this.charge=Math.min(100,this.charge+4);
    this.emit('destroy',{brick:{...brick},x:brick.x+brick.w/2,y:brick.y+brick.h/2,color:brick.color,points,combo:this.combo,chain});
    if(!chain)this.hitstop=.018;
    if(brick.type==='reactor'){
      this.emit('explode',{x:brick.x+brick.w/2,y:brick.y+brick.h/2,color:brick.color});
      for(const nearby of this.bricks){if(nearby.alive&&Math.hypot((nearby.x-brick.x)*.7,nearby.y-brick.y)<120)this.hit(nearby,3,true);}
    }
    if(brick.type==='prism'||(!chain&&this.random()<.13)){
      const types=Object.keys(POWERS);const type=brick.type==='prism'?'multi':types[Math.floor(this.random()*types.length)];
      this.drops.push({x:brick.x+brick.w/2,y:brick.y,type,age:0});
    }
    if(this.combo===8||this.combo===16||this.combo===24)this.emit('combo',{combo:this.combo});
  }
  collect(type){
    if(type==='multi'){
      const source=this.balls[0];if(!source)return;
      const angle=Math.atan2(source.vy,source.vx);
      for(const offset of [-.4,.4])if(this.balls.length<7)this.balls.push(this.newBall(source.x,source.y,angle+offset,source.speed));
    }else if(type==='shield')this.shield=Math.min(3,this.shield+1);
    else this.powers[type]=POWERS[type].duration;
    this.emit('power',{power:type});
  }
  finish(won){if(this.state==='ended')return;this.state='ended';this.balls=[];this.emit('end',{won,score:this.score,level:this.level,maxCombo:this.maxCombo,destroyed:this.destroyed});}
}
