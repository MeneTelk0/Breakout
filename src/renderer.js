import {WIDTH,HEIGHT,LEVELS,POWERS,makeLevel,clamp} from './game.mjs';
const TAU=Math.PI*2;
const random=(a,b)=>a+Math.random()*(b-a);
export class Renderer {
  constructor(canvas,atmosphere){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.atmosphere=atmosphere;this.sky=atmosphere.getContext('2d',{alpha:true});
    this.particles=[];this.rings=[];this.labels=[];this.flashes=[];this.sprites=new Map();this.time=0;this.shake=0;this.flash=0;this.flashColor='#99eaff';this.pointer={x:0,y:0};
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.snow=Array.from({length:this.reduced?70:230},()=>({x:Math.random(),y:Math.random(),z:random(.2,1),phase:random(0,TAU)}));
    this.demo=makeLevel(2);this.demoClock=0;this.demoHit=1.4;this.demoBall={x:600,y:550,trail:[]};this.mode='menu';this.resize();
  }
  resize(){const rect=this.canvas.getBoundingClientRect();this.w=rect.width;this.h=rect.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.atmosphere.width=Math.round(innerWidth*this.dpr);this.atmosphere.height=Math.round(innerHeight*this.dpr);this.scale=Math.min(this.w/WIDTH,this.h/HEIGHT);this.ox=(this.w-WIDTH*this.scale)/2;this.oy=(this.h-HEIGHT*this.scale)/2;}
  worldPoint(clientX,clientY){const r=this.canvas.getBoundingClientRect();return{x:(clientX-r.left-this.ox)/this.scale,y:(clientY-r.top-this.oy)/this.scale};}
  glow(color){if(this.sprites.has(color))return this.sprites.get(color);const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color+'b0');g.addColorStop(.12,color+'70');g.addColorStop(.42,color+'22');g.addColorStop(1,color+'00');x.fillStyle=g;x.fillRect(0,0,128,128);this.sprites.set(color,c);return c;}
  light(x,y,size,color,alpha=1){const c=this.ctx;c.globalAlpha=alpha;c.drawImage(this.glow(color),x-size/2,y-size/2,size,size);c.globalAlpha=1;}
  burst(x,y,color,count=30,power=1){
    const budget=this.reduced?Math.ceil(count*.35):count;
    for(let i=0;i<budget;i++){
      const angle=random(0,TAU),speed=random(60,330)*power;
      this.particles.push({x,y,px:x,py:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-50,life:random(.3,1.05),maxLife:1,angle:random(0,TAU),spin:random(-10,10),size:random(1.2,5.5)*power,color,kind:i%3===0?'shard':'spark'});
    }
    if(this.particles.length>900)this.particles.splice(0,this.particles.length-900);
  }
  ring(x,y,color,size=100,life=.65){this.rings.push({x,y,color,size,life,max:life});}
  onEvent(e){
    if(e.type==='destroy'){
      this.burst(e.x,e.y,e.color,e.chain?20:34,e.chain?1.1:1);
      this.ring(e.x,e.y,e.color,e.chain?85:66,.42);
      this.flashes.push({x:e.x,y:e.y,color:e.color,life:.2,size:e.chain?200:140});
      this.labels.push({x:e.x,y:e.y-12,text:`+${e.points}`,life:.9,color:e.color});
      this.shake=Math.max(this.shake,e.chain?5:2.7);
    }
    if(e.type==='explode'){this.burst(e.x,e.y,'#ffb8a0',75,1.8);this.ring(e.x,e.y,'#ffa6ab',270,.85);this.ring(e.x,e.y,'#d5f9ff',175,.5);this.shake=11;this.flash=Math.max(this.flash,.15);this.flashColor='#ff969c';}
    if(e.type==='hit'){this.burst(e.x,e.y,e.color,13,.6);this.shake=1.8;}
    if(e.type==='paddle'){this.burst(e.x,e.y,'#a8f4ff',12,.5);this.ring(e.x,e.y,'#a8f4ff',60,.3);}
    if(e.type==='wall')this.burst(e.x,e.y,'#bfefff',6,.4);
    if(e.type==='collect'){this.burst(e.x,e.y,e.color,35,1.2);this.ring(e.x,e.y,e.color,150,.5);}
    if(e.type==='lost'){this.burst(e.x,e.y,'#ff8b9f',70,1.7);this.shake=12;this.flash=.18;this.flashColor='#ff7493';}
    if(e.type==='shield'){this.burst(e.x,e.y,'#86bbff',50,1.4);this.ring(e.x,e.y,'#86bbff',300,.7);this.shake=5;}
    if(e.type==='launch')this.burst(e.x,e.y,'#b1f5ff',20,.65);
    if(e.type==='overdrive'){this.burst(e.x,e.y,'#ffc48d',110,2.3);this.ring(e.x,e.y,'#ffc48d',850,1.2);this.shake=14;this.flash=.2;this.flashColor='#ffc48d';}
    if(e.type==='clear'){this.shake=12;this.flash=.3;this.flashColor='#bbf6ff';this.ring(600,350,'#bbf6ff',1100,1.7);for(let i=0;i<7;i++)this.burst(random(150,1050),random(200,500),['#a5f3ff','#baadff','#ffbca0'][i%3],45,2);}
    if(e.type==='level'){this.particles=[];this.rings=[];this.labels=[];}
  }
  update(dt){
    this.time+=dt;this.shake*=Math.exp(-dt*13);this.flash*=Math.exp(-dt*7);
    for(const p of this.particles){p.life-=dt;p.px=p.x;p.py=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;p.vx*=Math.exp(-dt*.8);p.angle+=p.spin*dt;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const ring of this.rings)ring.life-=dt;this.rings=this.rings.filter(r=>r.life>0);
    for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);
    for(const l of this.labels){l.life-=dt;l.y-=27*dt;}this.labels=this.labels.filter(l=>l.life>0);
  }
  drawAtmosphere(dt){
    const c=this.sky,w=innerWidth,h=innerHeight;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    c.globalCompositeOperation='screen';
    const aurora=c.createRadialGradient(w*.73,h*.34,0,w*.73,h*.34,w*.5);aurora.addColorStop(0,'#397ab014');aurora.addColorStop(.5,'#28568d08');aurora.addColorStop(1,'#08203e00');c.fillStyle=aurora;c.fillRect(0,0,w,h);
    for(const s of this.snow){
      s.x+=(.002+s.z*.008+Math.sin(this.time*.25+s.phase)*.005)*dt;s.y+=(.015+s.z*.04)*dt;
      if(s.y>1.03){s.y=-.03;s.x=Math.random();}if(s.x>1.03)s.x=-.03;
      const x=s.x*w+Math.sin(this.time*.65+s.phase)*s.z*17-this.pointer.x*s.z*4,y=s.y*h;
      c.globalAlpha=.16+s.z*.48;c.fillStyle='#c1e6f6';
      if(s.z>.85){c.beginPath();c.ellipse(x,y,1.2*s.z,2.4*s.z,.4,0,TAU);c.fill();}else{c.beginPath();c.arc(x,y,.35+s.z*1.3,0,TAU);c.fill();}
    }
    c.globalAlpha=1;c.globalCompositeOperation='source-over';
    if(this.flash>.008&&!this.reduced){c.fillStyle=this.flashColor;c.globalAlpha=this.flash*.35;c.fillRect(0,0,w,h);c.globalAlpha=1;}
  }
  draw(game,dt){
    this.update(dt);this.drawAtmosphere(dt);const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
    if(game.state==='menu'){this.drawDemo(dt);return;}
    c.save();c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
    if(!this.reduced&&this.shake>.1)c.translate(random(-this.shake,this.shake),random(-this.shake,this.shake));
    this.drawArena(game);
    for(const b of game.bricks)if(b.alive)this.drawBrick(b,game.elapsed);
    this.drawDrops(game.drops);this.drawPaddle(game.paddle,game.fiery,game.elapsed);
    for(const ball of game.balls)this.drawBall(ball,game.fiery,game.state==='ready');
    this.drawEffects();
    if(game.state==='ready')this.drawAim(game);
    c.restore();
  }
  drawArena(game){
    const c=this.ctx,color=LEVELS[game.level].color;
    c.save();c.strokeStyle='#9bd1f01d';c.lineWidth=1;c.beginPath();c.moveTo(30,185);c.lineTo(30,690);c.moveTo(1170,185);c.lineTo(1170,690);c.stroke();
    c.strokeStyle=color+'66';c.lineWidth=1.2;for(const [x,y,sx,sy] of [[30,112,1,1],[1170,112,-1,1],[30,748,1,-1],[1170,748,-1,-1]]){c.beginPath();c.moveTo(x+sx*25,y);c.lineTo(x,y);c.lineTo(x,y+sy*25);c.stroke();}
    for(let y=160;y<730;y+=40){c.fillStyle='#a8d8ed29';c.fillRect(26,y,3,1);c.fillRect(1171,y,3,1);}
    const floor=c.createLinearGradient(40,0,1160,0);floor.addColorStop(0,'#84dfff00');floor.addColorStop(.5,game.shield>0?'#84bbffbb':'#84dfff22');floor.addColorStop(1,'#84dfff00');c.fillStyle=floor;c.fillRect(40,750,1120,1);
    if(game.shield>0){c.globalCompositeOperation='lighter';this.light(600,751,900,'#74b8ff',.15+Math.sin(this.time*2)*.03);c.strokeStyle='#93c5ff77';c.beginPath();for(let x=40;x<1160;x+=4){const y=746+Math.sin(x*.03+this.time*4)*3;if(x===40)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
    if(game.overdrive>0){c.strokeStyle='#ffb36a55';c.lineWidth=2;c.strokeRect(29,111,1142,638);c.globalCompositeOperation='lighter';this.light(600,700,700,'#ffb36a',.12);}
    c.restore();
  }
  drawBrick(b,time=0){
    const c=this.ctx,x=b.x,y=b.y,w=b.w,h=b.h,col=b.color;
    c.save();
    const pulse=.55+Math.sin(time*2+b.seed)*.15;
    c.shadowColor=col;c.shadowBlur=b.type==='reactor'?18:9;
    c.fillStyle=col+'35';c.beginPath();c.roundRect(x,y,w,h,3);c.fill();c.shadowBlur=0;
    const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,col+'83');g.addColorStop(.13,col+'48');g.addColorStop(.7,'#0c1e35e0');g.addColorStop(1,col+'37');c.fillStyle=g;c.fill();
    c.strokeStyle=col+'aa';c.lineWidth=.85;c.stroke();
    c.fillStyle=col;c.globalAlpha=pulse;c.fillRect(x+5,y+2,w-10,1);c.globalAlpha=1;
    c.fillStyle='#e2fbff66';c.fillRect(x+4,y+4,4,1);c.fillRect(x+w-8,y+h-5,4,1);
    c.fillStyle=col+'1a';c.fillRect(x+10,y+8,w-20,h-15);
    if(b.maxHp>1){for(let j=0;j<b.hp;j++){c.fillStyle=col+'cc';c.fillRect(x+w/2+(j-(b.hp-1)/2)*7-1,y+h/2-1,2,2);}}
    if(b.hp<b.maxHp){c.strokeStyle='#defaffbb';c.lineWidth=.7;c.beginPath();c.moveTo(x+w*.35,y+1);c.lineTo(x+w*.45,y+h*.4);c.lineTo(x+w*.38,y+h*.7);c.lineTo(x+w*.55,y+h);c.moveTo(x+w*.45,y+h*.4);c.lineTo(x+w*.68,y+h*.24);c.stroke();}
    if(b.type==='reactor'){c.strokeStyle='#ffd7dd';c.lineWidth=1.1;c.beginPath();c.moveTo(x+w/2+3,y+5);c.lineTo(x+w/2-4,y+h/2+1);c.lineTo(x+w/2+2,y+h/2);c.lineTo(x+w/2-3,y+h-5);c.stroke();c.fillStyle=col;c.globalAlpha=.5+Math.sin(time*4+b.seed)*.35;c.fillRect(x+8,y+h/2-1,2,2);c.fillRect(x+w-10,y+h/2-1,2,2);c.globalAlpha=1;}
    if(b.type==='prism'){c.strokeStyle='#f0dcff';c.beginPath();c.moveTo(x+w/2,y+5);c.lineTo(x+w/2+5,y+h/2);c.lineTo(x+w/2,y+h-5);c.lineTo(x+w/2-5,y+h/2);c.closePath();c.stroke();}
    if(b.flash>0){c.globalAlpha=b.flash*.85;c.fillStyle='#eeffff';c.fillRect(x,y,w,h);}
    c.restore();
  }
  drawPaddle(p,fire=false,time=0){
    const c=this.ctx,x=p.x-p.width/2,y=p.y,w=p.width,col=fire?'#ffc28e':'#9cf3ff';
    c.save();c.globalCompositeOperation='lighter';this.light(p.x,y+7,w*1.8,col,.28);
    c.globalCompositeOperation='source-over';
    c.shadowColor=col;c.shadowBlur=13;c.fillStyle='#091b2c';c.strokeStyle=col;c.lineWidth=1.3;c.beginPath();c.moveTo(x+9,y-5);c.lineTo(x+w-9,y-5);c.lineTo(x+w,y+2);c.lineTo(x+w-7,y+10);c.lineTo(x+7,y+10);c.lineTo(x,y+2);c.closePath();c.fill();c.stroke();c.shadowBlur=0;
    c.fillStyle=col;c.fillRect(x+13,y-5,w-26,2);c.fillRect(x+5,y-1,8,5);c.fillRect(x+w-13,y-1,8,5);
    c.fillStyle=col+'44';c.fillRect(x+18,y+1,w-36,3);
    for(let i=0;i<5;i++){c.fillStyle=col+((i===2)?'cc':'55');c.fillRect(p.x-13+i*6,y+5,2,2);}
    c.globalCompositeOperation='lighter';this.light(x+8,y+3,40,col,.7);this.light(x+w-8,y+3,40,col,.7);c.restore();
  }
  drawBall(ball,fire=false,ready=false){
    const c=this.ctx,col=fire?'#ffad74':'#95f4ff';c.save();c.globalCompositeOperation='lighter';
    for(let i=1;i<ball.trail.length;i++){
      const a=i/ball.trail.length,p=ball.trail[i],prev=ball.trail[i-1];c.strokeStyle=col;c.globalAlpha=a*a*.65;c.lineWidth=Math.max(1,ball.r*1.6*a);c.lineCap='round';c.beginPath();c.moveTo(prev.x,prev.y);c.lineTo(p.x,p.y);c.stroke();
    }
    c.globalAlpha=1;this.light(ball.x,ball.y,fire?140:100,col,fire?.9:.6);this.light(ball.x,ball.y,40,col,1);
    c.fillStyle='#f1ffff';c.shadowColor=col;c.shadowBlur=12;c.beginPath();c.arc(ball.x,ball.y,ball.r*(fire?1.12:.85),0,TAU);c.fill();c.shadowBlur=0;
    if(ready){c.strokeStyle='#9ff5ff55';c.lineWidth=1;c.beginPath();c.arc(ball.x,ball.y,15+Math.sin(this.time*3)*2,0,TAU);c.stroke();}
    c.restore();
  }
  drawDrops(drops){const c=this.ctx;for(const d of drops){const power=POWERS[d.type],s=13+Math.sin(d.age*4)*1.3;c.save();c.translate(d.x,d.y);c.globalCompositeOperation='lighter';this.light(0,0,70,power.color,.45);c.globalCompositeOperation='source-over';c.fillStyle='#061626ee';c.strokeStyle=power.color;c.lineWidth=1;c.beginPath();c.roundRect(-s,-s,s*2,s*2,4);c.fill();c.stroke();c.fillStyle=power.color;c.font='18px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(power.icon,0,1);c.restore();}}
  drawAim(game){const c=this.ctx,p=game.paddle;c.save();c.setLineDash([3,9]);c.lineDashOffset=-this.time*12;c.strokeStyle='#a5f1ff35';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y-36);c.lineTo(p.x,p.y-155);c.stroke();c.restore();}
  drawEffects(){
    const c=this.ctx;c.save();c.globalCompositeOperation='lighter';
    for(const f of this.flashes)this.light(f.x,f.y,f.size,f.color,f.life*4);
    for(const ring of this.rings){const t=1-ring.life/ring.max,rad=ring.size*(1-(1-t)**3);c.globalAlpha=(1-t)**2;c.strokeStyle=ring.color;c.lineWidth=2*(1-t)+.2;c.beginPath();c.ellipse(ring.x,ring.y,rad,rad*.7,0,0,TAU);c.stroke();if(t<.4){c.strokeStyle='#ecffff';c.lineWidth=.5;c.beginPath();c.ellipse(ring.x,ring.y,rad*.88,rad*.62,0,0,TAU);c.stroke();}}
    for(const p of this.particles){c.globalAlpha=Math.min(1,p.life*2);c.fillStyle=p.color;c.strokeStyle=p.color;
      if(p.kind==='shard'){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.beginPath();c.moveTo(-p.size,-p.size*.4);c.lineTo(p.size*.8,0);c.lineTo(0,p.size*.8);c.closePath();c.fill();c.restore();}
      else{c.lineWidth=p.size*.45;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.028,p.y-p.vy*.028);c.stroke();}
    }
    c.globalAlpha=1;for(const label of this.labels){c.globalAlpha=Math.min(1,label.life*2);c.fillStyle=label.color;c.font='11px ui-monospace, monospace';c.textAlign='center';c.fillText(label.text,label.x,label.y);}
    c.restore();
  }
  drawDemo(dt){
    const c=this.ctx;this.demoClock+=dt;this.demoHit-=dt;
    const mobile=this.w<650;
    const scale=mobile?this.w/1200*.62:Math.min(this.w*.53/1100,this.h*.85/640);
    const centerX=mobile?this.w*.64:this.w*.73,centerY=mobile?this.h*.2:this.h*.46;
    c.save();c.translate(centerX,centerY);c.scale(scale,scale);c.translate(-600,-380);
    for(const b of this.demo){if(!b.alive&&this.time-b.deadAt>3.2)b.alive=true;if(b.alive){const offset=Math.sin(this.time*.8+b.seed*.09)*5;this.drawBrick({...b,y:b.y+offset,flash:Math.max(0,(b.lastHit||0)+.18-this.time)*5},this.time);}}
    const ball=this.demoBall;ball.x=600+Math.sin(this.time*1.8)*370;ball.y=450+Math.cos(this.time*2.2)*150;ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>26)ball.trail.shift();
    if(this.demoHit<0&&!this.reduced){const alive=this.demo.filter(b=>b.alive);if(alive.length){const b=alive[Math.floor(Math.random()*alive.length)];b.alive=false;b.deadAt=this.time;b.lastHit=this.time;this.burst(b.x+b.w/2,b.y+b.h/2,b.color,34,.7);this.ring(b.x+b.w/2,b.y+b.h/2,b.color,95,.6);}this.demoHit=random(.8,1.6);}
    this.drawPaddle({x:600+Math.sin(this.time*1.2)*240,y:648,width:148},false,this.time);this.drawBall(ball,false);this.drawEffects();
    c.globalCompositeOperation='lighter';this.light(600,350,800,'#65c9f9',.1);c.restore();
  }
}
