const AUDIO_PREF_KEY="atlas-karst-audio-v1";
const retroAudio=(()=>{
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  let enabled=true,ctx=null,bus=null;
  const ONE_SHOT_BOOST=1.55;
  let panLastAt=0,panLastX=0,panLastY=0,panActive=false,panVoice=null;
  let encounterThemeTimer=null,encounterThemeFamily="",encounterThemeStep=0;
  const lastPlayAt=new Map();
  const cooldownMs={button:42,click:42,toggle:70,panel:70,panelOpen:80,panelClose:80,zoomIn:90,zoomOut:90,depthDown:120,depthUp:120,select:55,poiCavity:220,poiBss:180,poiHeritage:220,poiMemory:210,poiIndustrial:210,poiNatural:180,poiHome:220,poiLocation:180,encounterStart:300,encounterTurn:120,encounterCorrect:180,encounterWrong:180,encounterWin:500,encounterFlee:300,codexOpen:160,codexPage:90,encounterReveal:220};
  try{enabled=localStorage.getItem(AUDIO_PREF_KEY)!=="off"}catch{}

  function updateButton(){
    if(!els.audioToggle)return;
    if(!AudioCtor){
      els.audioToggle.disabled=true;
      els.audioToggle.classList.add("audio-unavailable");
      els.audioToggle.textContent="♪ indisponible";
      els.audioToggle.title="Web Audio n’est pas disponible dans ce navigateur";
      els.audioToggle.setAttribute("aria-pressed","false");
      return;
    }
    els.audioToggle.disabled=false;
    els.audioToggle.classList.remove("audio-unavailable");
    els.audioToggle.setAttribute("aria-pressed",String(enabled));
    els.audioToggle.textContent=enabled?"♪ sons":"♪ coupés";
    els.audioToggle.title=enabled?"Couper les effets sonores":"Réactiver les effets sonores";
  }

  function unlock(){
    if(!enabled||!AudioCtor)return null;
    if(ctx?.state==="closed"){ctx=null;bus=null;panVoice=null}
    if(!ctx){
      try{
        ctx=new AudioCtor({latencyHint:"interactive"});
      }catch{ctx=new AudioCtor()}
      const filter=ctx.createBiquadFilter();
      filter.type="lowpass";filter.frequency.value=3900;filter.Q.value=.42;
      const master=ctx.createGain();master.gain.value=.46;
      const compressor=ctx.createDynamicsCompressor();
      compressor.threshold.value=-20;compressor.knee.value=12;compressor.ratio.value=4.5;
      compressor.attack.value=.003;compressor.release.value=.16;
      filter.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
      bus=filter;
    }
    if(ctx.state!=="running"){
      try{ctx.resume()?.catch?.(()=>{})}catch{}
    }
    return ctx;
  }

  function tone(c,freq,duration=.06,delay=0,{to=null,type="square",gain=.03,pan=0}={}){
    if(!c||!bus)return;
    const start=c.currentTime+Math.max(0,delay),end=start+Math.max(.018,duration);
    const osc=c.createOscillator(),amp=c.createGain();
    const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
    osc.type=type;osc.frequency.setValueAtTime(Math.max(35,freq),start);
    if(Number.isFinite(to))osc.frequency.exponentialRampToValueAtTime(Math.max(35,to),end);
    amp.gain.setValueAtTime(.0001,start);
    amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain*ONE_SHOT_BOOST),start+.005);
    amp.gain.exponentialRampToValueAtTime(.0001,end);
    if(panner){panner.pan.setValueAtTime(Math.max(-1,Math.min(1,pan)),start);osc.connect(amp);amp.connect(panner);panner.connect(bus)}
    else{osc.connect(amp);amp.connect(bus)}
    osc.onended=()=>{try{osc.disconnect();amp.disconnect();panner?.disconnect()}catch{}};
    osc.start(start);osc.stop(end+.025);
  }

  function noise(c,duration=.06,delay=0,{gain=.014,highpass=700,pan=0}={}){
    if(!c||!bus)return;
    const rate=c.sampleRate,length=Math.max(1,Math.floor(rate*duration));
    const buffer=c.createBuffer(1,length,rate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),amp=c.createGain();
    const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
    filter.type="highpass";filter.frequency.value=highpass;
    const start=c.currentTime+Math.max(0,delay),end=start+duration;
    amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain*ONE_SHOT_BOOST,start+.004);amp.gain.exponentialRampToValueAtTime(.0001,end);
    source.buffer=buffer;source.connect(filter);filter.connect(amp);
    if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));amp.connect(panner);panner.connect(bus)}else amp.connect(bus);
    source.onended=()=>{try{source.disconnect();filter.disconnect();amp.disconnect();panner?.disconnect()}catch{}};
    source.start(start);source.stop(end+.02);
  }

  function perform(c,name){
    switch(name){
      case "select":
      case "cellTerrain":
        tone(c,610,.05,0,{type:"triangle",gain:.032});tone(c,790,.055,.044,{type:"square",gain:.022});break;
      case "snapAccent":
        tone(c,980,.045,0,{type:"square",gain:.021});tone(c,1320,.055,.037,{type:"triangle",gain:.018});break;
      case "cellWater":
        tone(c,720,.055,0,{to:560,type:"triangle",gain:.028,pan:-.25});tone(c,510,.07,.045,{to:350,type:"triangle",gain:.025,pan:.25});tone(c,860,.035,.09,{type:"square",gain:.014});break;
      case "cellRoad":
        tone(c,300,.035,0,{type:"square",gain:.031,pan:-.25});tone(c,440,.035,.045,{type:"square",gain:.028,pan:.25});break;
      case "cellBuilding":
        tone(c,175,.06,0,{type:"square",gain:.037});tone(c,350,.045,.035,{type:"triangle",gain:.025});break;
      case "cellForest":
        noise(c,.055,0,{gain:.017,highpass:1150,pan:-.2});tone(c,260,.08,.012,{to:340,type:"triangle",gain:.024});tone(c,420,.04,.075,{type:"square",gain:.014,pan:.25});break;
      case "cellField":
        tone(c,470,.065,0,{type:"triangle",gain:.024});tone(c,590,.065,.055,{type:"triangle",gain:.021});break;
      case "cellQuarry":
        tone(c,190,.09,0,{to:125,type:"sawtooth",gain:.031});noise(c,.07,.045,{gain:.013,highpass:520});break;
      case "cellCavity":
        tone(c,430,.16,0,{to:105,type:"triangle",gain:.038});tone(c,215,.12,.085,{to:92,type:"square",gain:.018});tone(c,540,.035,.19,{type:"triangle",gain:.012});break;
      case "cellBss":
        tone(c,930,.04,0,{type:"square",gain:.025});tone(c,465,.07,.055,{type:"triangle",gain:.027});tone(c,230,.09,.13,{type:"triangle",gain:.021});break;
      case "cellHeritage":
        tone(c,523,.07,0,{type:"triangle",gain:.027});tone(c,659,.07,.068,{type:"triangle",gain:.026});tone(c,784,.1,.136,{type:"triangle",gain:.029});break;
      case "cellMemory":
        tone(c,392,.07,0,{type:"triangle",gain:.025});tone(c,523,.095,.065,{type:"triangle",gain:.027});tone(c,659,.05,.145,{type:"square",gain:.014});break;
      case "cellIndustrial":
        tone(c,165,.055,0,{type:"sawtooth",gain:.032});tone(c,220,.04,.052,{type:"square",gain:.021});noise(c,.05,.083,{gain:.012,highpass:800});break;
      case "cellHome":
        tone(c,330,.05,0,{type:"triangle",gain:.027});tone(c,495,.05,.045,{type:"triangle",gain:.026});tone(c,660,.085,.09,{type:"triangle",gain:.027});break;
      case "cellUnderground":
        tone(c,145,.13,0,{to:92,type:"triangle",gain:.034});tone(c,220,.06,.04,{type:"square",gain:.016});break;
      case "poiCavity":
        tone(c,680,.28,0,{to:150,type:"triangle",gain:.064,pan:-.28});
        tone(c,340,.32,.075,{to:82,type:"square",gain:.046,pan:.28});
        noise(c,.13,.035,{gain:.024,highpass:360});
        tone(c,920,.055,.29,{to:720,type:"triangle",gain:.032});break;
      case "poiBss":
        tone(c,1080,.055,0,{type:"square",gain:.058,pan:-.3});
        tone(c,540,.085,.065,{type:"triangle",gain:.052,pan:.3});
        tone(c,1320,.06,.155,{type:"square",gain:.056,pan:-.12});
        tone(c,330,.12,.21,{to:240,type:"triangle",gain:.038});break;
      case "poiHeritage":
        tone(c,392,.095,0,{type:"triangle",gain:.051,pan:-.3});
        tone(c,523,.095,.075,{type:"triangle",gain:.054,pan:-.1});
        tone(c,659,.105,.15,{type:"triangle",gain:.056,pan:.12});
        tone(c,784,.145,.225,{type:"square",gain:.049,pan:.3});break;
      case "poiMemory":
        tone(c,330,.12,0,{type:"triangle",gain:.048,pan:-.24});
        tone(c,440,.13,.085,{type:"triangle",gain:.052});
        tone(c,660,.15,.175,{to:570,type:"square",gain:.041,pan:.24});
        noise(c,.08,.12,{gain:.014,highpass:1250});break;
      case "poiIndustrial":
        tone(c,150,.16,0,{to:92,type:"sawtooth",gain:.064,pan:-.25});
        tone(c,300,.07,.06,{type:"square",gain:.052,pan:.25});
        noise(c,.13,.09,{gain:.029,highpass:480});
        tone(c,205,.11,.19,{to:135,type:"square",gain:.044});break;
      case "poiNatural":
        noise(c,.09,0,{gain:.019,highpass:1550,pan:-.25});
        tone(c,510,.15,.015,{to:920,type:"triangle",gain:.052,pan:-.18});
        tone(c,760,.12,.12,{to:1120,type:"triangle",gain:.046,pan:.22});
        tone(c,1240,.055,.245,{type:"square",gain:.038});break;
      case "poiHome":
        tone(c,330,.095,0,{type:"triangle",gain:.052,pan:-.3});
        tone(c,495,.095,.072,{type:"triangle",gain:.054,pan:-.1});
        tone(c,660,.105,.144,{type:"triangle",gain:.056,pan:.12});
        tone(c,990,.15,.216,{type:"triangle",gain:.052,pan:.3});break;
      case "poiLocation":
        tone(c,1260,.065,0,{to:920,type:"square",gain:.058});
        tone(c,630,.12,.075,{to:520,type:"triangle",gain:.048});
        tone(c,1260,.055,.19,{type:"square",gain:.052});break;
      case "poiConfirm":
        tone(c,880,.075,0,{type:"square",gain:.052});
        tone(c,1175,.11,.07,{type:"triangle",gain:.056});break;
      case "encounterStart":
        noise(c,.15,0,{gain:.032,highpass:520});tone(c,147,.11,0,{type:"square",gain:.06,pan:-.35});tone(c,220,.11,.075,{type:"square",gain:.062,pan:-.1});tone(c,294,.12,.15,{type:"square",gain:.064,pan:.12});tone(c,440,.19,.23,{type:"triangle",gain:.072,pan:.32});break;
      case "encounterFamilyFaune":
        tone(c,880,.045,0,{to:1175,type:"square",gain:.042,pan:-.32});tone(c,1320,.05,.055,{to:990,type:"triangle",gain:.045,pan:.28});noise(c,.045,.08,{gain:.012,highpass:2100});break;
      case "encounterFamilyFlore":
        tone(c,330,.09,0,{to:440,type:"triangle",gain:.038,pan:-.28});tone(c,494,.10,.07,{to:659,type:"triangle",gain:.043});tone(c,784,.11,.15,{type:"square",gain:.038,pan:.28});break;
      case "encounterFamilyGeologie":
        noise(c,.11,0,{gain:.018,highpass:280});tone(c,110,.18,0,{to:82,type:"sawtooth",gain:.045,pan:-.2});tone(c,165,.16,.08,{to:110,type:"triangle",gain:.04,pan:.22});break;
      case "encounterFamilyPatrimoine":
        tone(c,392,.09,0,{type:"triangle",gain:.042,pan:-.3});tone(c,523,.10,.075,{type:"triangle",gain:.046});tone(c,784,.16,.15,{type:"square",gain:.048,pan:.3});break;
      case "encounterReveal":
        tone(c,1046,.045,0,{type:"square",gain:.038,pan:-.35});tone(c,1318,.045,.055,{type:"square",gain:.04});tone(c,1568,.08,.11,{type:"triangle",gain:.045,pan:.35});break;
      case "encounterTurn":
        tone(c,330,.045,0,{type:"square",gain:.038,pan:-.25});tone(c,440,.045,.042,{type:"square",gain:.04});tone(c,550,.065,.084,{type:"triangle",gain:.044,pan:.25});break;
      case "encounterCorrect":
        noise(c,.055,0,{gain:.018,highpass:1800});tone(c,523,.075,0,{type:"square",gain:.068,pan:-.35});tone(c,659,.075,.06,{type:"square",gain:.07});tone(c,784,.085,.12,{type:"square",gain:.072,pan:.2});tone(c,1046,.14,.18,{type:"triangle",gain:.078,pan:.35});break;
      case "encounterWrong":
        noise(c,.10,0,{gain:.026,highpass:420});tone(c,330,.11,0,{to:190,type:"sawtooth",gain:.066,pan:-.2});tone(c,165,.17,.075,{to:82,type:"square",gain:.052,pan:.22});break;
      case "encounterWin":
        tone(c,392,.095,0,{type:"square",gain:.072,pan:-.35});tone(c,523,.095,.075,{type:"square",gain:.074,pan:-.15});tone(c,659,.105,.15,{type:"square",gain:.076,pan:.08});tone(c,784,.11,.23,{type:"square",gain:.078,pan:.25});tone(c,1046,.22,.31,{type:"triangle",gain:.084,pan:.38});noise(c,.16,.30,{gain:.022,highpass:1900});break;
      case "encounterFlee":
        tone(c,659,.11,0,{to:440,type:"triangle",gain:.058,pan:-.25});tone(c,392,.14,.08,{to:220,type:"square",gain:.052});tone(c,220,.21,.17,{to:82,type:"triangle",gain:.046,pan:.28});noise(c,.14,.15,{gain:.02,highpass:950});break;
      case "codexOpen":
        noise(c,.07,0,{gain:.018,highpass:1200,pan:-.3});tone(c,720,.06,.025,{type:"square",gain:.044});tone(c,960,.08,.082,{type:"triangle",gain:.05,pan:.25});break;
      case "codexPage":
        noise(c,.045,0,{gain:.014,highpass:1450,pan:-.22});tone(c,580,.04,.025,{type:"triangle",gain:.032});tone(c,760,.055,.06,{type:"square",gain:.035,pan:.2});break;
      case "zoomIn":tone(c,360,.12,0,{to:820,type:"square",gain:.031});break;
      case "zoomOut":tone(c,820,.12,0,{to:330,type:"square",gain:.03});break;
      case "depthDown":
        tone(c,300,.17,0,{to:90,type:"triangle",gain:.041});tone(c,145,.1,.065,{type:"square",gain:.019});break;
      case "depthUp":
        tone(c,115,.16,0,{to:470,type:"triangle",gain:.039});tone(c,560,.05,.12,{type:"square",gain:.021});break;
      case "sync":
        tone(c,260,.06,0,{type:"triangle",gain:.029});tone(c,390,.07,.072,{type:"triangle",gain:.03});break;
      case "success":
        tone(c,440,.07,0,{type:"square",gain:.025});tone(c,660,.07,.07,{type:"square",gain:.024});tone(c,880,.11,.14,{type:"triangle",gain:.031});break;
      case "error":
        tone(c,220,.17,0,{to:100,type:"sawtooth",gain:.032});tone(c,120,.13,.08,{type:"square",gain:.021});break;
      case "panelOpen":
        tone(c,420,.045,0,{type:"triangle",gain:.024});tone(c,610,.055,.038,{type:"square",gain:.021});break;
      case "panelClose":
        tone(c,610,.045,0,{type:"triangle",gain:.023});tone(c,390,.055,.038,{type:"square",gain:.02});break;
      case "panel":
        tone(c,470,.045,0,{type:"triangle",gain:.024});tone(c,610,.045,.036,{type:"triangle",gain:.02});break;
      case "home":
        tone(c,330,.05,0,{type:"triangle",gain:.027});tone(c,495,.05,.045,{type:"triangle",gain:.026});tone(c,660,.075,.09,{type:"triangle",gain:.025});break;
      case "export":tone(c,760,.06,0,{to:520,type:"triangle",gain:.028});tone(c,980,.065,.07,{type:"square",gain:.02});break;
      case "delete":tone(c,260,.075,0,{to:165,type:"square",gain:.026});break;
      case "toggle":tone(c,520,.04,0,{type:"square",gain:.021});tone(c,690,.03,.038,{type:"triangle",gain:.015});break;
      case "button":
      case "click":
        tone(c,390,.032,0,{type:"square",gain:.022});tone(c,520,.026,.025,{type:"triangle",gain:.015});break;
      case "panStart":
        tone(c,240,.04,0,{to:310,type:"square",gain:.019});break;
      case "panEnd":
        tone(c,330,.045,0,{to:250,type:"triangle",gain:.019});break;
      case "enable":
        tone(c,660,.055,0,{type:"square",gain:.024});tone(c,990,.09,.055,{type:"triangle",gain:.029});break;
      default:tone(c,430,.04,0,{type:"triangle",gain:.02});
    }
  }

  function play(name="button"){
    if(!enabled||!AudioCtor||document.hidden)return;
    const now=performance.now(),cooldown=cooldownMs[name]??28,last=lastPlayAt.get(name)||0;
    if(now-last<cooldown)return;
    lastPlayAt.set(name,now);
    const c=unlock();if(!c)return;
    const run=()=>{if(enabled&&c.state==="running"){try{perform(c,name)}catch{}}};
    if(c.state==="running")run();
    else{try{c.resume().then(run).catch(()=>{})}catch{}}
  }

  function stopPanVoice(c=ctx){
    const voice=panVoice;panVoice=null;
    if(!voice||!c)return;
    const t=c.currentTime;
    try{
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(Math.max(.0001,voice.gain.gain.value),t);
      voice.gain.gain.exponentialRampToValueAtTime(.0001,t+.075);
      voice.osc.stop(t+.085);
    }catch{}
  }
  function startPanVoice(c){
    if(!c||c.state!=="running"||panVoice)return;
    try{
      const osc=c.createOscillator(),gain=c.createGain();
      const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
      osc.type="square";osc.frequency.value=205;gain.gain.value=.0001;
      osc.connect(gain);if(panner){gain.connect(panner);panner.connect(bus)}else gain.connect(bus);
      osc.onended=()=>{try{osc.disconnect();gain.disconnect();panner?.disconnect()}catch{}};
      osc.start();gain.gain.exponentialRampToValueAtTime(.007,c.currentTime+.045);
      panVoice={osc,gain,panner};
    }catch{}
  }
  function panStart(){
    if(!enabled||panActive)return;
    panActive=true;panLastAt=0;panLastX=0;panLastY=0;
    const c=unlock();
    if(c?.state==="running")startPanVoice(c);else c?.resume?.().then(()=>startPanVoice(c)).catch(()=>{});
    play("panStart");
  }
  function panMove(dx,dy){
    if(!enabled||!panActive)return;
    const c=unlock();if(!c)return;
    const now=performance.now();if(now-panLastAt<42)return;
    if(c.state==="running"&&!panVoice)startPanVoice(c);
    const vx=dx-panLastX,vy=dy-panLastY,speed=Math.min(1,Math.hypot(vx,vy)/24);
    const horizontal=Math.max(-1,Math.min(1,vx/24)),base=175+speed*155+(Math.abs(Math.round(dx+dy))%3)*12;
    if(panVoice){
      const t=c.currentTime;
      try{
        panVoice.osc.frequency.setTargetAtTime(base*(vy<0?1.06:.96),t,.025);
        panVoice.gain.gain.setTargetAtTime(.004+speed*.009,t,.035);
        panVoice.panner?.pan.setTargetAtTime(horizontal,t,.035);
      }catch{}
    }
    panLastAt=now;panLastX=dx;panLastY=dy;
  }
  function panEnd(){
    if(!panActive)return;
    panActive=false;stopPanVoice();play("panEnd");
  }

  function stopEncounterTheme(){
    if(encounterThemeTimer){clearInterval(encounterThemeTimer);encounterThemeTimer=null}
    encounterThemeFamily="";encounterThemeStep=0;
  }
  function encounterThemePulse(){
    if(!enabled||document.hidden||!encounterThemeFamily)return;
    const c=unlock();if(!c||c.state!=="running")return;
    const patterns={
      faune:[[330,495],[392,587],[440,660],[294,440]],
      flore:[[262,392],[294,440],[330,494],[247,370]],
      geologie:[[110,165],[123,185],[98,147],[130,195]],
      patrimoine:[[392,523],[440,587],[494,659],[349,523]],
      codex:[[523,784],[587,880],[494,740],[659,988]]
    };
    const pattern=patterns[encounterThemeFamily]||patterns.codex,pair=pattern[encounterThemeStep++%pattern.length];
    tone(c,pair[0],.16,0,{type:"triangle",gain:.0065,pan:-.24});
    tone(c,pair[1],.12,.12,{type:"square",gain:.0048,pan:.24});
  }
  function startEncounterTheme(family="codex"){
    stopEncounterTheme();encounterThemeFamily=family||"codex";encounterThemeStep=0;
    encounterThemePulse();encounterThemeTimer=setInterval(encounterThemePulse,2350);
  }
  function silence(){stopPanVoice();stopEncounterTheme();panActive=false}
  function setEnabled(value,{chime=true}={}){
    enabled=!!value;
    if(!enabled)silence();
    try{localStorage.setItem(AUDIO_PREF_KEY,enabled?"on":"off")}catch{}
    updateButton();
    if(enabled&&chime)play("enable");
  }
  function toggle(){setEnabled(!enabled)}
  function init(){updateButton()}
  return {init,play,unlock,panStart,panMove,panEnd,silence,toggle,setEnabled,startEncounterTheme,stopEncounterTheme,get enabled(){return enabled}};
})();

const operationSoundWatches=new Map();
function armOperationSound(statusEl,timeoutMs=300000){
  if(!statusEl)return;
  operationSoundWatches.set(statusEl,{until:Date.now()+timeoutMs,last:text(statusEl.textContent).trim()});
}
function operationSoundOutcome(statusEl){
  const label=text(statusEl?.textContent).toLowerCase();
  if(statusEl?.classList.contains("bad")||/échec|erreur|refus|impossible/.test(label))return "error";
  if(statusEl?.classList.contains("ok")&&!/chargement|synchronisation|test|attente|tentative/.test(label))return "success";
  return "";
}
const operationStatusObserver=new MutationObserver(()=>{
  for(const [statusEl,watch] of [...operationSoundWatches]){
    if(Date.now()>watch.until){operationSoundWatches.delete(statusEl);continue}
    const current=text(statusEl.textContent).trim();
    if(current===watch.last)continue;
    watch.last=current;
    const outcome=operationSoundOutcome(statusEl);
    if(outcome){operationSoundWatches.delete(statusEl);retroAudio.play(outcome)}
  }
});
