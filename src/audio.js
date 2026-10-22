export class Sound {
  constructor(){
    this.enabled=false;this.ctx=null;this.master=null;
    this.track=new Audio('Sounds/main_menu_theme.mp3');this.track.loop=true;this.track.volume=.28;
    this.current='menu';this.lastHit=0;this.ducked=false;
    this.tracks=['lvl1_theme.mp3','lvl2_theme.mp3','lvl4_theme.mp3','lvl3_theme.mp3'];
    this.queue=[...this.tracks];this.lastTrack=null;
    this.track.addEventListener('ended',()=>{if(this.current!=='menu')this.nextTrack();});
  }
  unlock(){
    if(!this.ctx){const Context=window.AudioContext||window.webkitAudioContext;if(Context){this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=.32;this.master.connect(this.ctx.destination);}}
    if(this.ctx?.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  enable(){this.unlock();this.enabled=true;this.track.muted=false;this.track.play().catch(()=>{});if(this.master)this.master.gain.setTargetAtTime(.32,this.ctx.currentTime,.1);}
  disable(){this.enabled=false;this.track.pause();if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.05);}
  toggle(){if(this.enabled)this.disable();else this.enable();return this.enabled;}
  setScene(level=-1){
    const next=level<0?'menu':`level${level}`;if(this.current===next)return;
    this.current=next;
    if(level>=0){this.nextTrack();return;}
    this.track.pause();this.track.src='Sounds/main_menu_theme.mp3';this.track.loop=true;this.track.volume=this.ducked?.06:.28;
    if(this.enabled)this.track.play().catch(()=>{});
  }
  nextTrack(){
    if(this.current==='menu')return;
    if(!this.queue.length){
      this.queue=[...this.tracks];
      for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]];}
      if(this.queue[0]===this.lastTrack)[this.queue[0],this.queue[1]]=[this.queue[1],this.queue[0]];
    }
    this.lastTrack=this.queue.shift();this.track.pause();this.track.src=`Sounds/${this.lastTrack}`;this.track.loop=false;this.track.volume=this.ducked?.06:.22;
    if(this.enabled)this.track.play().catch(()=>{});
  }
  duck(ducked){this.ducked=ducked;this.track.volume=ducked?.06:this.current==='menu'?.28:.22;}
  tone(freq,seconds=.1,type='sine',volume=.2,end=0,pan=0){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);if(end)osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+seconds);gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.005);gain.gain.exponentialRampToValueAtTime(.001,now+seconds);
    osc.connect(gain);
    if(this.ctx.createStereoPanner){const panner=this.ctx.createStereoPanner();panner.pan.value=Math.max(-.7,Math.min(.7,pan));gain.connect(panner);panner.connect(this.master);osc.onended=()=>{osc.disconnect();gain.disconnect();panner.disconnect();};}else{gain.connect(this.master);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
    osc.start(now);osc.stop(now+seconds+.02);
  }
  noise(seconds=.2,volume=.25){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const length=Math.ceil(this.ctx.sampleRate*seconds),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length)**2;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2500;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  onEvent(e){
    const pan=((e.x||600)-600)/600;
    if(e.type==='destroy'){if(this.ctx&&this.ctx.currentTime-this.lastHit<.025)return;this.lastHit=this.ctx?.currentTime||0;const freq=310*Math.pow(2,(e.combo%12)/12);this.tone(freq,.12,'triangle',.22,freq*1.4,pan);this.tone(freq*2.5,.07,'sine',.08,0,pan);this.noise(.06,.07);}
    if(e.type==='hit')this.tone(520,.07,'triangle',.16,250,pan);
    if(e.type==='paddle')this.tone(150,.12,'sine',.32,65,pan);
    if(e.type==='wall')this.tone(700,.045,'sine',.05,400,pan);
    if(e.type==='explode'){this.noise(.36,.55);this.tone(95,.35,'sine',.6,25,pan);}
    if(e.type==='launch')this.tone(120,.22,'triangle',.2,520);
    if(e.type==='lost'){this.tone(210,.6,'sawtooth',.13,40);this.noise(.25,.2);}
    if(e.type==='power'||e.type==='shield'){[440,660,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.18,'sine',.17),i*65));}
    if(e.type==='overdrive'){this.noise(.65,.5);this.tone(60,.8,'sawtooth',.18,600);}
    if(e.type==='clear'){[261.63,329.63,392,523.25].forEach((f,i)=>setTimeout(()=>this.tone(f,.5,'triangle',.2),i*120));}
  }
}
