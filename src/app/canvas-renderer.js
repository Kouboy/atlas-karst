function activeMapSurface(){return els.mapCanvas}
const canvasRuntime={metrics:null,layoutSignature:"",styleCache:new Map(),probe:null,lastGrid:null,dpr:1,ctx:null,measureCanvas:null,measureCtx:null,signalCanvas:null,signalCtx:null};
const renderPipelineRuntime={
  frame:0,dataRevision:0,osmRevision:0,fxRevision:0,lastFxOsmRevision:-1,
  lastMode:"",lastReason:"",lastStages:[],lastFinalizedFrame:0,lastFinalizedAt:0
};
function markMapDataRevision(source="data"){
  renderPipelineRuntime.dataRevision++;
  if(source==="osm")renderPipelineRuntime.osmRevision++;
}
function beginCanvasPipeline(mode,reason="direct"){
  renderPipelineRuntime.frame++;renderPipelineRuntime.lastMode=mode;renderPipelineRuntime.lastReason=reason;
  renderPipelineRuntime.lastStages=["canvas-size","map-data"];
  return renderPipelineRuntime.frame;
}
function recordCanvasStage(stage){renderPipelineRuntime.lastStages.push(stage)}

function cssNumber(name,fallback){
  const main=document.querySelector("main");
  const value=parseFloat(getComputedStyle(main).getPropertyValue(name));
  return Number.isFinite(value)?value:fallback;
}
function canvasFontFamily(){return 'ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace'}
function canvasMeasureContext(){
  if(canvasRuntime.measureCtx)return canvasRuntime.measureCtx;
  canvasRuntime.measureCanvas=document.createElement("canvas");
  canvasRuntime.measureCtx=canvasRuntime.measureCanvas.getContext("2d");
  return canvasRuntime.measureCtx;
}
function canvasContext(){
  if(canvasRuntime.ctx)return canvasRuntime.ctx;
  // Un Canvas opaque évite le blanchiment de la couche lors des transforms GPU,
  // particulièrement visible dans Firefox pendant un glisser-déposer.
  canvasRuntime.ctx=els.mapCanvas.getContext("2d",{alpha:false});
  return canvasRuntime.ctx;
}
function measureCanvasLayout(fontSize=cssNumber("--map-font-size",12),padding=cssNumber("--map-padding",17)){
  const ctx=canvasMeasureContext();
  ctx.font=`${fontSize}px ${canvasFontFamily()}`;
  const cellW=Math.max(3,ctx.measureText("M").width);
  const cellH=Math.max(4,fontSize*1.04);
  return {fontSize,padding,cellW,cellH,width:padding*2+CONFIG.gridW*cellW,height:padding*2+CONFIG.gridH*cellH};
}

function desiredCanvasDisplayScale(){
  // V0.16q : la grille responsive est l'unique autorité de dimensionnement.
  // Le bitmap n'est plus agrandi une seconde fois après son calcul.
  return 1;
}

function syncCanvasSize(){
  if(!CANVAS_RENDERER||!els.mapCanvas)return null;
  const m=measureCanvasLayout();
  const compact=matchMedia("(max-width:700px)").matches;
  const dpr=adaptiveCanvasDpr(m.width,m.height,compact);
  const displayScale=1,displayWidth=Math.round(m.width),displayHeight=Math.round(m.height);
  const pixelW=Math.max(1,Math.round(m.width*dpr)),pixelH=Math.max(1,Math.round(m.height*dpr));
  performanceRuntime.canvasPixels=pixelW*pixelH;
  const bitmapChanged=els.mapCanvas.width!==pixelW||els.mapCanvas.height!==pixelH;
  const cssChanged=els.mapCanvas.style.width!==`${displayWidth}px`||els.mapCanvas.style.height!==`${displayHeight}px`;
  if(els.mapCanvas.width!==pixelW)els.mapCanvas.width=pixelW;
  if(els.mapCanvas.height!==pixelH)els.mapCanvas.height=pixelH;
  els.mapCanvas.style.width=`${displayWidth}px`;els.mapCanvas.style.height=`${displayHeight}px`;
  const layoutSignature=[m.fontSize,m.padding,CONFIG.gridW,CONFIG.gridH,dpr,displayWidth,displayHeight].join("|");
  canvasRuntime.metrics={...m,dpr,displayScale,displayWidth,displayHeight,bitmapChanged,cssChanged,layoutSignature};
  canvasRuntime.layoutSignature=layoutSignature;canvasRuntime.dpr=dpr;
  return canvasRuntime.metrics;
}

function canvasStyleProbe(){
  if(canvasRuntime.probe?.isConnected)return canvasRuntime.probe;
  const probe=document.createElement("span");probe.className="cell canvas-style-probe";probe.textContent="M";document.body.appendChild(probe);canvasRuntime.probe=probe;return probe;
}
function transparentColor(value){return !value||value==="transparent"||/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(value)}
function canvasVisualFor(classes){
  const band=document.body.dataset.depthBand||"surface",depth=currentDepth(),key=`${band}|${depth}|${classes}`;
  const cached=canvasRuntime.styleCache.get(key);if(cached)return cached;
  const probe=canvasStyleProbe();probe.className=`cell canvas-style-probe ${classes}`;
  const cs=getComputedStyle(probe);
  const visual={color:cs.color||"#dce9e1",background:cs.backgroundColor||"transparent",fontWeight:cs.fontWeight||"400",opacity:Number.parseFloat(cs.opacity)||1};
  canvasRuntime.styleCache.set(key,visual);return visual;
}
function globalSignalSurface(){
  if(!canvasRuntime.signalCanvas){
    canvasRuntime.signalCanvas=document.createElement("canvas");
    canvasRuntime.signalCtx=canvasRuntime.signalCanvas.getContext("2d",{alpha:true});
  }
  const c=canvasRuntime.signalCanvas;
  if(c.width!==els.mapCanvas.width)c.width=els.mapCanvas.width;
  if(c.height!==els.mapCanvas.height)c.height=els.mapCanvas.height;
  return {canvas:c,ctx:canvasRuntime.signalCtx};
}
function drawGlobalSignalPass(ctx,m,mode){
  if(!els.mapCanvas||!m)return;
  const compact=matchMedia("(max-width:700px)").matches;
  const moving=!!els.viewport?.classList.contains("panning")||!!activeMapSurface()?.classList.contains("pinching");
  const symbolic=mode==="symbolic";
  if(currentDepth()<0){
    const palette=symbolicUndergroundPalette();ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalCompositeOperation="screen";
    const wash=ctx.createLinearGradient(0,0,m.width,m.height);wash.addColorStop(0,`${palette.water}10`);wash.addColorStop(.48,"rgba(196,184,226,.025)");wash.addColorStop(1,`${palette.edge}0d`);
    ctx.fillStyle=wash;ctx.fillRect(0,0,m.width,m.height);ctx.restore();return;
  }
  if(explorationsMapStyle())return;
  const {canvas:scratch,ctx:sctx}=globalSignalSurface();
  if(!sctx)return;

  // Extraction emissive globale : les tons sombres restent presque noirs, tandis
  // que routes, eau, bâtiments, glyphes et contours nourrissent réellement le halo.
  sctx.save();
  sctx.setTransform(1,0,0,1,0,0);
  sctx.globalCompositeOperation="copy";
  sctx.globalAlpha=1;
  sctx.filter=symbolic?"brightness(1.56) contrast(1.72) saturate(1.42)":"brightness(1.78) contrast(1.95) saturate(1.28)";
  sctx.drawImage(els.mapCanvas,0,0);
  sctx.restore();

  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation="screen";
  if(symbolic){
    ctx.globalAlpha=compact?.18:.31;
    ctx.filter=(!compact&&!moving)?"blur(2.6px)":"none";
    ctx.drawImage(scratch,0,0);
    ctx.filter="none";
    ctx.globalAlpha=compact?.11:.18;
    ctx.drawImage(scratch,-1,0);ctx.drawImage(scratch,1,0);
  }else{
    // ASCII : pas de blur coûteux. Trois copies très légèrement décalées donnent
    // une persistance cathodique sur toute la carte, sans travail par glyphe.
    ctx.filter="none";
    ctx.globalAlpha=compact?.10:.16;ctx.drawImage(scratch,-1,0);
    ctx.globalAlpha=compact?.10:.16;ctx.drawImage(scratch,1,0);
    ctx.globalAlpha=compact?.12:.21;ctx.drawImage(scratch,0,1);
  }
  ctx.restore();

  ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalCompositeOperation="screen";
  const wash=ctx.createLinearGradient(0,0,m.width,m.height);
  if(symbolic){
    wash.addColorStop(0,"rgba(83,255,178,.145)");
    wash.addColorStop(.48,"rgba(188,255,222,.055)");
    wash.addColorStop(1,"rgba(72,216,255,.12)");
  }else{
    wash.addColorStop(0,"rgba(80,255,132,.085)");
    wash.addColorStop(.5,"rgba(188,255,204,.042)");
    wash.addColorStop(1,"rgba(66,213,118,.073)");
  }
  ctx.fillStyle=wash;ctx.fillRect(0,0,m.width,m.height);ctx.restore();
}
function drawCanvasModeFinish(ctx,m,mode){
  // Post-traitement statique réellement inclus dans le bitmap final.
  // Il est recalculé après chaque redraw, y compris après fusion de données OSM.
  const symbolic=mode==="symbolic",underground=currentDepth()<0;
  if(explorationsMapStyle()){
    ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);const vignette=ctx.createRadialGradient(m.width*.5,m.height*.45,Math.min(m.width,m.height)*.25,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.74);vignette.addColorStop(.72,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(30,68,79,.12)");ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);ctx.restore();return;
  }
  ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalCompositeOperation="screen";
  if(underground){
    const palette=symbolicUndergroundPalette();ctx.globalAlpha=.34;ctx.strokeStyle=palette.grid;ctx.lineWidth=.5;ctx.beginPath();
    const stepX=Math.max(32,Math.round(m.cellW*10)),stepY=Math.max(28,Math.round(m.cellH*7));
    for(let x=m.padding;x<m.width-m.padding;x+=stepX){ctx.moveTo(x,m.padding);ctx.lineTo(x,m.height-m.padding)}
    for(let y=m.padding;y<m.height-m.padding;y+=stepY){ctx.moveTo(m.padding,y);ctx.lineTo(m.width-m.padding,y)}
    ctx.stroke();
  }else if(symbolic){
    ctx.globalAlpha=.075;ctx.strokeStyle="#8fffd0";ctx.lineWidth=.5;ctx.beginPath();
    const stepX=Math.max(24,Math.round(m.cellW*12)),stepY=Math.max(22,Math.round(m.cellH*8));
    for(let x=m.padding;x<m.width-m.padding;x+=stepX){ctx.moveTo(x,m.padding);ctx.lineTo(x,m.height-m.padding)}
    for(let y=m.padding;y<m.height-m.padding;y+=stepY){ctx.moveTo(m.padding,y);ctx.lineTo(m.width-m.padding,y)}
    ctx.stroke();
  }else{
    ctx.globalAlpha=.065;ctx.fillStyle="#caffd7";
    for(let y=1;y<m.height;y+=3)ctx.fillRect(0,y,m.width,.55);
    ctx.globalAlpha=.025;ctx.fillStyle="#5dff9b";
    for(let x=2;x<m.width;x+=6)ctx.fillRect(x,0,.45,m.height);
  }
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  const vignette=ctx.createRadialGradient(m.width*.5,m.height*.47,Math.min(m.width,m.height)*.18,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.72);
  vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.72,"rgba(0,0,0,.025)");vignette.addColorStop(1,underground?"rgba(1,3,9,.27)":symbolic?"rgba(0,8,5,.24)":"rgba(0,5,2,.30)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);ctx.restore();
}
function syncRenderFxGeometry(m=canvasRuntime.metrics){
  const fx=els.renderFxLayer,canvas=els.mapCanvas;if(!fx||!canvas||!m)return;
  // offsetLeft/Top suivent le contenu scrollable : les FX restent collés au
  // bitmap pendant le pan, au lieu de flotter sur tout le viewport.
  fx.style.left=`${canvas.offsetLeft}px`;fx.style.top=`${canvas.offsetTop}px`;
  fx.style.width=`${canvas.offsetWidth||m.displayWidth}px`;fx.style.height=`${canvas.offsetHeight||m.displayHeight}px`;
}
function restartRenderFxAnimations(){
  const fx=els.renderFxLayer;if(!fx)return;
  fx.classList.add("fx-restart");void fx.offsetWidth;fx.classList.remove("fx-restart");
}
function finalizeCanvasFrame(ctx,m,mode,reason="direct",frame=renderPipelineRuntime.frame){
  recordCanvasStage("signal-pass");drawGlobalSignalPass(ctx,m,mode);
  recordCanvasStage("mode-finish");drawCanvasModeFinish(ctx,m,mode);
  recordCanvasStage("fx-final");
  renderPipelineRuntime.fxRevision++;renderPipelineRuntime.lastFinalizedFrame=frame;renderPipelineRuntime.lastFinalizedAt=performance.now();
  syncRenderFxGeometry(m);
  const fxNeedsRestart=renderPipelineRuntime.lastFxOsmRevision!==renderPipelineRuntime.osmRevision||
    els.renderFxLayer?.dataset.mode!==mode||reason==="render-mode";
  if(els.renderFxLayer){
    els.renderFxLayer.dataset.mode=mode;els.renderFxLayer.dataset.canvasFrame=String(frame);
    els.renderFxLayer.dataset.osmRevision=String(renderPipelineRuntime.osmRevision);
  }
  if(fxNeedsRestart){restartRenderFxAnimations();renderPipelineRuntime.lastFxOsmRevision=renderPipelineRuntime.osmRevision}
  pulseRenderFxActivity(reason==="boot"?1200:900,reason);
}

function drawAsciiCanvasMap(grid=state.lastGrid,reason="direct"){
  if(!CANVAS_RENDERER||!grid||!els.mapCanvas)return 0;
  const m=syncCanvasSize();if(!m)return 0;
  const frame=beginCanvasPipeline("ascii",reason);canvasRuntime.lastGrid=grid;
  const ctx=canvasContext();
  ctx.setTransform(m.dpr,0,0,m.dpr,0,0);
  // Le bitmap est explicitement opaque. Les fonds semi-transparents des cellules
  // sont ainsi composités ici, et non par le navigateur au moment du drag.
  const mapCore=getComputedStyle(document.body).getPropertyValue("--map-core").trim()||"#06110c";
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle=mapCore;ctx.fillRect(0,0,m.width,m.height);
  ctx.textBaseline="top";ctx.textAlign="left";ctx.fontKerning="none";
  const underground=currentDepth()<0;let visiblePoiCount=0;
  // Fonds de relief, groupés horizontalement pour limiter les appels de dessin.
  if(underground){
    ctx.fillStyle=symbolicUndergroundPalette().ground;ctx.fillRect(m.padding,m.padding,CONFIG.gridW*m.cellW,CONFIG.gridH*m.cellH);
  }else{
    for(let y=0;y<CONFIG.gridH;y++){
      let runStart=0,runBg=null;
      const flushBg=x=>{if(runBg&&!transparentColor(runBg))ctx.fillRect(m.padding+runStart*m.cellW,m.padding+y*m.cellH,(x-runStart)*m.cellW,m.cellH)};
      for(let x=0;x<=CONFIG.gridW;x++){
        const c=x<CONFIG.gridW?grid.grid[y][x]:null;
        const shade=c&&state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
        const visual=c?canvasVisualFor(`${c.cls||""}${shade}`):null;
        const bg=visual?.background||null;
        if(x===0){runBg=bg;runStart=0}else if(bg!==runBg){flushBg(x);runStart=x;runBg=bg}
      }
    }
  }
  // Glyphes, groupés par style. Les POI sont dessinés seuls avec un léger halo statique.
  for(let y=0;y<CONFIG.gridH;y++){
    let text="",startX=0,lastKey="",lastVisual=null;
    const flush=()=>{if(!text||!lastVisual)return;ctx.globalAlpha=lastVisual.opacity;ctx.fillStyle=lastVisual.color;ctx.shadowBlur=0;ctx.font=`${lastVisual.fontWeight} ${m.fontSize}px ${canvasFontFamily()}`;ctx.fillText(text,m.padding+startX*m.cellW,m.padding+y*m.cellH);text=""};
    for(let x=0;x<CONFIG.gridW;x++){
      const c=grid.grid[y][x],shade=state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
      const poi=poiEffectKind(c);
      if(c.ch===" "&&!poi){flush();lastKey="";lastVisual=null;startX=x+1;continue}
      const visual=canvasVisualFor(`${c.cls||""}${shade}`),key=`${visual.color}|${visual.fontWeight}|${visual.opacity}`;
      if(poi){
        flush();visiblePoiCount++;ctx.globalAlpha=visual.opacity;ctx.fillStyle=visual.color;ctx.font=`${visual.fontWeight} ${m.fontSize}px ${canvasFontFamily()}`;ctx.shadowColor=visual.color;ctx.shadowBlur=Math.max(2,m.fontSize*.34);ctx.fillText(c.ch,m.padding+x*m.cellW,m.padding+y*m.cellH);ctx.shadowBlur=0;lastKey="";lastVisual=null;startX=x+1;continue;
      }
      if(!text){text=c.ch;startX=x;lastKey=key;lastVisual=visual}
      else if(key===lastKey){text+=c.ch}
      else{flush();text=c.ch;startX=x;lastKey=key;lastVisual=visual}
    }
    flush();
  }
  finalizeCanvasFrame(ctx,m,"ascii",reason,frame);
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  return visiblePoiCount;
}
function effectiveRenderMode(){
  return state.renderMode==="symbolic"?"symbolic":"ascii";
}
function explorationsMapStyle(){return EXPLORATIONS_EDITION&&currentDepth()===0}
function symbolicTerrainStyle(cell){
  const cls=String(cell?.cls||"");
  if(explorationsMapStyle()){
    if(cls.includes("c-water"))return {fill:"#92d8ed",kind:"water"};
    if(cls.includes("c-forest"))return {fill:"#8fbd73",kind:"forest"};
    if(cls.includes("c-meadow"))return {fill:"#bdd985",kind:"meadow"};
    if(cls.includes("c-field"))return {fill:"#e4c982",kind:"field"};
    if(cls.includes("c-scrub"))return {fill:"#abc286",kind:"scrub"};
    if(cls.includes("c-quarry"))return {fill:"#ca9f78",kind:"quarry"};
    if(cls.includes("c-residential")||cls.includes("c-clearing"))return {fill:"#e7d1ae",kind:"settled"};
    if(cls.includes("c-rock"))return {fill:"#bbb09c",kind:"rock"};
    if(cls.includes("c-soil"))return {fill:"#c99570",kind:"soil"};
    return {fill:"#d8d4a9",kind:"plain"};
  }
  if(cls.includes("c-water"))return {fill:"#0f414b",kind:"water"};
  if(cls.includes("c-forest"))return {fill:"#16472a",kind:"forest"};
  if(cls.includes("c-meadow"))return {fill:"#295538",kind:"meadow"};
  if(cls.includes("c-field"))return {fill:"#4b4324",kind:"field"};
  if(cls.includes("c-scrub"))return {fill:"#2b4931",kind:"scrub"};
  if(cls.includes("c-quarry"))return {fill:"#5b4932",kind:"quarry"};
  if(cls.includes("c-residential")||cls.includes("c-clearing"))return {fill:"#253b35",kind:"settled"};
  if(cls.includes("c-rock"))return {fill:"#354741",kind:"rock"};
  if(cls.includes("c-soil"))return {fill:"#4a3325",kind:"soil"};
  return {fill:"#0d2418",kind:"plain"};
}
function symbolicOsmLandStyle(tags={}){
  const lu=tags.landuse,n=tags.natural;
  if(explorationsMapStyle()){
    if(lu==="forest"||n==="wood")return {fill:"#8fbd73",stroke:"#5f9362",kind:"forest"};
    if(lu==="meadow"||lu==="grass")return {fill:"#bdd985",stroke:"#86ad68",kind:"meadow"};
    if(["farmland","orchard","vineyard"].includes(lu))return {fill:"#e4c982",stroke:"#bd9b55",kind:"field"};
    if(lu==="quarry")return {fill:"#ca9f78",stroke:"#a7725c",kind:"quarry"};
    if(lu==="residential"||lu==="industrial")return {fill:"#e7d1ae",stroke:"#b79772",kind:"settled"};
    if(n==="scrub")return {fill:"#abc286",stroke:"#759863",kind:"scrub"};
    if(n==="water")return {fill:"#92d8ed",stroke:"#4da8c5",kind:"water"};
    if(lu==="cemetery")return {fill:"#b9c99d",stroke:"#82976f",kind:"settled"};
    return null;
  }
  if(lu==="forest"||n==="wood")return {fill:"#174b2c",stroke:"#3d8b58",kind:"forest"};
  if(lu==="meadow"||lu==="grass")return {fill:"#2b5837",stroke:"#62a56e",kind:"meadow"};
  if(["farmland","orchard","vineyard"].includes(lu))return {fill:"#504725",stroke:"#a08b43",kind:"field"};
  if(lu==="quarry")return {fill:"#604d35",stroke:"#c08f5d",kind:"quarry"};
  if(lu==="residential"||lu==="industrial")return {fill:"#293f38",stroke:"#66877a",kind:"settled"};
  if(n==="scrub")return {fill:"#315036",stroke:"#6b9b68",kind:"scrub"};
  if(n==="water")return {fill:"#105361",stroke:"#62dff2",kind:"water"};
  if(lu==="cemetery")return {fill:"#314238",stroke:"#78967f",kind:"settled"};
  return null;
}
function symbolicProject(lon,lat,extent,m){
  return {
    x:m.padding+((lon-extent.west)/(extent.east-extent.west))*Math.max(1,CONFIG.gridW-1)*m.cellW+m.cellW/2,
    y:m.padding+((extent.north-lat)/(extent.north-extent.south))*Math.max(1,CONFIG.gridH-1)*m.cellH+m.cellH/2
  };
}
function symbolicTraceCoords(ctx,coords,extent,m,close=false){
  if(!coords?.length)return false;
  ctx.beginPath();let started=false;
  for(const pair of coords){
    const lon=+pair[0],lat=+pair[1];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    const p=symbolicProject(lon,lat,extent,m);
    if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y);
  }
  if(close&&started)ctx.closePath();
  return started;
}
function symbolicDrawPatterns(ctx,grid,m){
  if(explorationsMapStyle()){
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const c=grid.grid[y][x],s=symbolicTerrainStyle(c),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH,seed=(x*17+y*29)%11;
      if(s.kind==="forest"&&seed<4){const r=Math.max(1.4,Math.min(m.cellW,m.cellH)*.22);ctx.fillStyle=seed%2?"#568c59":"#6fa567";ctx.beginPath();ctx.arc(cx,cy-r*.18,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#4e7d50";ctx.lineWidth=Math.max(.5,m.fontSize*.035);ctx.stroke();ctx.strokeStyle="#7a5b3a";ctx.beginPath();ctx.moveTo(cx,cy+r*.55);ctx.lineTo(cx,cy+r*1.05);ctx.stroke();
      }else if(s.kind==="field"&&(seed<4||state.zoomIndex>=3)){ctx.strokeStyle="rgba(160,119,62,.42)";ctx.lineWidth=Math.max(.45,m.fontSize*.032);ctx.beginPath();ctx.moveTo(cx-m.cellW*.38,cy+m.cellH*.25);ctx.lineTo(cx+m.cellW*.38,cy-m.cellH*.25);ctx.stroke();
      }else if(s.kind==="meadow"&&seed<3){ctx.fillStyle="#f3dd71";ctx.beginPath();ctx.arc(cx,cy,Math.max(.65,m.fontSize*.045),0,Math.PI*2);ctx.fill();
      }else if(s.kind==="water"&&seed<3){ctx.strokeStyle="rgba(42,131,168,.46)";ctx.lineWidth=Math.max(.45,m.fontSize*.035);ctx.beginPath();ctx.arc(cx,cy,m.cellW*.20,0,Math.PI);ctx.stroke();
      }else if(s.kind==="quarry"&&seed<4){ctx.strokeStyle="rgba(123,79,58,.46)";ctx.lineWidth=Math.max(.55,m.fontSize*.04);ctx.beginPath();ctx.moveTo(cx-m.cellW*.32,cy+m.cellH*.20);ctx.lineTo(cx,cy-m.cellH*.20);ctx.lineTo(cx+m.cellW*.32,cy+m.cellH*.10);ctx.stroke()}
    }
    ctx.restore();return;
  }
  const close=state.zoomIndex>=3;
  ctx.lineWidth=Math.max(.55,m.fontSize*.045);ctx.lineCap="round";
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],s=symbolicTerrainStyle(c),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;
    const seed=(x*17+y*29)%11;
    if(s.kind==="forest"&&seed<3){
      ctx.fillStyle="rgba(112,220,139,.43)";ctx.beginPath();ctx.moveTo(cx,cy-m.cellH*.28);ctx.lineTo(cx-m.cellW*.25,cy+m.cellH*.22);ctx.lineTo(cx+m.cellW*.25,cy+m.cellH*.22);ctx.closePath();ctx.fill();
    }else if(s.kind==="field"&&(seed<4||close)){
      ctx.strokeStyle="rgba(236,210,112,.31)";ctx.beginPath();ctx.moveTo(cx-m.cellW*.42,cy+m.cellH*.24);ctx.lineTo(cx+m.cellW*.42,cy-m.cellH*.24);ctx.stroke();
    }else if(s.kind==="meadow"&&seed<2){
      ctx.fillStyle="rgba(179,235,164,.38)";ctx.beginPath();ctx.arc(cx,cy,Math.max(.55,m.fontSize*.045),0,Math.PI*2);ctx.fill();
    }else if(s.kind==="scrub"&&seed<2){
      ctx.strokeStyle="rgba(157,221,153,.33)";ctx.beginPath();ctx.moveTo(cx-2,cy-2);ctx.lineTo(cx+2,cy+2);ctx.moveTo(cx+2,cy-2);ctx.lineTo(cx-2,cy+2);ctx.stroke();
    }else if(s.kind==="quarry"&&seed<4){
      ctx.strokeStyle="rgba(245,201,133,.36)";ctx.beginPath();ctx.moveTo(cx-m.cellW*.35,cy+m.cellH*.18);ctx.lineTo(cx,cy-m.cellH*.18);ctx.lineTo(cx+m.cellW*.35,cy+m.cellH*.08);ctx.stroke();
    }
  }
}
function symbolicDrawOsmPolygons(ctx,grid,m){
  if(!state.osm)return;
  const features=queryOsmFeatures(grid.extent);
  for(const f of features){
    const t=f.tags||{};if(!f.closed||t.building)continue;
    const style=symbolicOsmLandStyle(t);if(!style)continue;
    if(!symbolicTraceCoords(ctx,f.coords,grid.extent,m,true))continue;
    ctx.save();
    // Remplissage un peu plus translucide : le fond phosphore reste perceptible.
    ctx.globalAlpha=.73;ctx.fillStyle=style.fill;ctx.fill();
    // Aura de contour peu coûteuse, sans shadowBlur.
    ctx.globalAlpha=.18;ctx.strokeStyle=style.stroke;ctx.lineWidth=Math.max(2.2,m.fontSize*.19);ctx.stroke();
    ctx.globalAlpha=.98;ctx.strokeStyle=style.stroke;ctx.lineWidth=Math.max(.75,m.fontSize*.068);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
/* V0.16b — réseaux vectoriels stables.
   Les routes et cours d'eau ne sont plus reconstruits à partir du voisinage
   des cellules. Cette ancienne méthode créait des diagonales opportunistes,
   des triangles et des motifs différents après chaque déplacement. On dessine
   maintenant directement les géométries OSM complètes, simplifiées de façon
   déterministe par niveau de zoom. */
function symbolicNetworkKind(tags={}){
  const waterway=String(tags.waterway||"").toLowerCase();
  if(waterway){
    if(waterway==="river"||waterway==="canal")return "water-major";
    if(waterway==="stream")return "water";
    if(waterway==="ditch"||waterway==="drain")return "water-minor";
    return "water";
  }
  const highway=String(tags.highway||"").toLowerCase();
  if(!highway)return "";
  if(["motorway","trunk","primary","secondary"].includes(highway))return "road-major";
  if(["tertiary","unclassified","residential"].includes(highway))return "road";
  if(["service","living_street"].includes(highway))return "road-minor";
  if(["track","path","footway","cycleway","bridleway","steps"].includes(highway))return "path";
  return "road-minor";
}
function symbolicNetworkToleranceMeters(kind){
  const road=[95,58,30,14,6,2.5],water=[72,42,22,10,4.5,2],minor=[120,78,42,20,9,4];
  const table=kind==="water-major"||kind==="water"?water:kind==="water-minor"||kind==="path"||kind==="road-minor"?minor:road;
  return table[clamp(state.zoomIndex,0,table.length-1)];
}
function symbolicPointDistanceSq(a,b){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function symbolicPointSegmentDistanceSq(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(dx===0&&dy===0)return symbolicPointDistanceSq(p,a);
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);
  const q={x:a.x+t*dx,y:a.y+t*dy};return symbolicPointDistanceSq(p,q);
}
function symbolicSimplifyProjected(points,tolerance){
  if(points.length<=2)return points.slice();
  const tol2=tolerance*tolerance,keep=new Uint8Array(points.length);keep[0]=1;keep[points.length-1]=1;
  const stack=[[0,points.length-1]];
  while(stack.length){
    const [first,last]=stack.pop();let index=-1,max=tol2;
    for(let i=first+1;i<last;i++){
      const d=symbolicPointSegmentDistanceSq(points[i],points[first],points[last]);
      if(d>max){index=i;max=d}
    }
    if(index>0){keep[index]=1;stack.push([first,index],[index,last])}
  }
  return points.filter((_,i)=>keep[i]);
}
function symbolicFeatureMeters(coords,lat0){
  const kx=kmPerLon(lat0)*1000,ky=111320;
  const out=[];let previous=null;
  for(const pair of coords||[]){
    const lon=+pair[0],lat=+pair[1];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    const p={x:lon*kx,y:lat*ky,lon,lat};
    if(previous&&symbolicPointDistanceSq(p,previous)<.04)continue;
    out.push(p);previous=p;
  }
  return out;
}
function symbolicNetworkStyleLabDraft(kind,m){
  const fs=m.fontSize;
  if(kind==="water-major")return {color:"#63ddff",outer:"rgba(4,18,27,.94)",width:Math.max(2.9,fs*.285),casing:Math.max(1.95,fs*.19),dash:[],glow:"rgba(100,225,255,.18)",glowBlur:10};
  if(kind==="water")return {color:"#58d1f2",outer:"rgba(3,18,24,.88)",width:Math.max(2.0,fs*.205),casing:Math.max(1.25,fs*.135),dash:[],glow:"rgba(83,214,244,.12)",glowBlur:7};
  if(kind==="water-minor")return {color:"rgba(108,211,232,.9)",outer:null,width:Math.max(1.05,fs*.105),casing:0,dash:[5,3],glow:null,glowBlur:0};
  if(kind==="road-major")return {color:"#e7d192",outer:"rgba(27,20,8,.94)",width:Math.max(2.45,fs*.24),casing:Math.max(1.8,fs*.17),dash:[],glow:"rgba(245,222,148,.10)",glowBlur:8};
  if(kind==="road")return {color:"#ccb87f",outer:"rgba(24,19,10,.86)",width:Math.max(1.62,fs*.155),casing:Math.max(1.15,fs*.105),dash:[],glow:"rgba(218,197,132,.07)",glowBlur:5};
  if(kind==="road-minor")return {color:"rgba(197,180,127,.9)",outer:"rgba(20,17,10,.68)",width:Math.max(1.08,fs*.102),casing:Math.max(.72,fs*.058),dash:[],glow:null,glowBlur:0};
  return {color:"rgba(185,166,118,.82)",outer:null,width:Math.max(.9,fs*.078),casing:0,dash:[4,4],glow:null,glowBlur:0};
}
function symbolicCornerRadius(kind,m){
  const fs=m.fontSize;
  if(kind==="water-major")return Math.max(4,fs*.72);
  if(kind==="water")return Math.max(3,fs*.55);
  if(kind==="road-major")return Math.max(3.4,fs*.60);
  if(kind==="road")return Math.max(2.5,fs*.42);
  if(kind==="road-minor")return Math.max(1.8,fs*.30);
  return Math.max(1.4,fs*.22);
}
function symbolicTraceNetworkPath(ctx,coords,extent,m,kind="road"){
  if(!coords?.length)return false;
  const pts=[];
  for(const [lon,lat] of coords){
    const p=symbolicProject(lon,lat,extent,m);
    if(!pts.length||Math.hypot(p.x-pts[pts.length-1].x,p.y-pts[pts.length-1].y)>.35)pts.push(p);
  }
  if(pts.length<2)return false;
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);
  // Précision d'abord : on suit la polyline simplifiée exacte, sans arrondir les
  // sommets. Le côté "écran vectoriel" provient du casing et du glow, pas d'une
  // interpolation qui réinterprète la topologie des carrefours.
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  return true;
}
function symbolicDrawOsmNetworksLabDraft(ctx,grid,m){
  if(!state.osm)return 0;
  const groups=new Map();let count=0;
  for(const feature of queryOsmFeatures(grid.extent)){
    const kind=symbolicNetworkKind(feature.tags||{});if(!kind||!symbolicNetworkVisible(kind))continue;
    const coords=symbolicSimplifiedCoords(feature,kind);if(coords.length<2)continue;
    if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(coords);count++;
  }
  const order=["water-minor","water","water-major","path","road-minor","road","road-major"];
  for(const kind of order){
    const paths=groups.get(kind);if(!paths?.length)continue;
    const style=symbolicNetworkStyleLabDraft(kind,m);ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    if(style.glow&&style.glowBlur>0){
      ctx.save();ctx.strokeStyle=style.glow;ctx.lineWidth=style.width+style.casing*2.8;ctx.setLineDash([]);ctx.shadowColor=style.glow;ctx.shadowBlur=style.glowBlur;
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
      ctx.restore();
    }
    if(style.outer){
      ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+style.casing*2;ctx.setLineDash([]);
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);
    for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    // cœur clair, discret : rappelle le balayage lumineux des écrans vectoriels.
    if(!style.dash?.length&&style.width>=1.4){
      ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=Math.max(.6,style.width*.22);ctx.setLineDash([]);
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.restore();
  }
  return count;
}

function symbolicLineClass(cell){
  const cls=String(cell?.cls||"");
  if(cls.includes("c-water"))return "water";
  if(cls.includes("c-road-major"))return "major";
  if(cls.includes("c-road"))return "road";
  if(cls.includes("c-path"))return "path";
  if(cls.includes("c-parcel"))return "parcel";
  if(cls.includes("c-contour"))return "contour";
  return "";
}
function symbolicCompatibleLine(a,b){return a&&b&&(a===b||(a==="major"&&b==="road")||(a==="road"&&b==="major"));}
function symbolicLineStyle(kind,m){
  if(kind==="water")return {color:"#57cbe3",outer:"rgba(4,18,22,.75)",width:Math.max(1.35,m.cellH*.22),dash:[]};
  if(kind==="major")return {color:"#dbc986",outer:"rgba(20,16,8,.8)",width:Math.max(1.5,m.cellH*.20),dash:[]};
  if(kind==="road")return {color:"#b8a874",outer:"rgba(20,16,8,.7)",width:Math.max(.95,m.cellH*.13),dash:[]};
  if(kind==="path")return {color:"#a79572",outer:null,width:Math.max(.75,m.cellH*.08),dash:[2.5,3]};
  if(kind==="parcel")return {color:"rgba(170,191,178,.28)",outer:null,width:.65,dash:[3,3]};
  return {color:"rgba(145,166,154,.25)",outer:null,width:.65,dash:[]};
}
function symbolicDrawFallbackGridLines(ctx,grid,m){
  const dirs=[[1,0],[0,1]];
  const center=(x,y)=>({x:m.padding+(x+.5)*m.cellW,y:m.padding+(y+.5)*m.cellH});
  for(const kind of ["contour","parcel","path","road","major","water"]){
    const style=symbolicLineStyle(kind,m),segments=[];
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      if(symbolicLineClass(grid.grid[y][x])!==kind)continue;
      const a=center(x,y);let linked=false;
      for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;const nk=symbolicLineClass(grid.grid[ny][nx]);if(!symbolicCompatibleLine(kind,nk))continue;segments.push([a,center(nx,ny)]);linked=true}
      if(!linked)segments.push([{x:a.x-m.cellW*.18,y:a.y},{x:a.x+m.cellW*.18,y:a.y}]);
    }
    if(!segments.length)continue;
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    if(style.outer){ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+Math.max(1.2,m.fontSize*.09);ctx.setLineDash([]);ctx.beginPath();for(const [a,b] of segments){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke()}
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);ctx.beginPath();for(const [a,b] of segments){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();ctx.restore();
  }
}
function symbolicPoiColor(kind){
  const exploratory={location:"#267cba",home:"#d95f5f",bss:"#a77a46",hydrology:"#278fc0",biodiversity:"#5a9e57","biodiversity-animals":"#d17d3f","biodiversity-plants":"#4d9b5e","biodiversity-fungi":"#9a67ad",heritage:"#96643d",industrial:"#a6674a",memory:"#c25c83",cavity:"#766bb7",natural:"#4f996a"};
  const instrument={location:"#82f4c1",home:"#ff7f8a",bss:"#f2c75c",hydrology:"#70d6ff",biodiversity:"#9dde72","biodiversity-animals":"#e6c86f","biodiversity-plants":"#9dde72","biodiversity-fungi":"#c79ad8",heritage:"#eadcaa",industrial:"#f2a35d",memory:"#df8bd4",cavity:"#71dbca",natural:"#76d7c4"};
  return (explorationsMapStyle()?exploratory:instrument)[kind]|| (explorationsMapStyle()?"#38586b":"#dce9e1");
}
function symbolicPoiCode(kind){return ({location:"GPS",home:"MAI",bss:"BSS",hydrology:"HYD",biodiversity:"BIO","biodiversity-animals":"FAU","biodiversity-plants":"FLO","biodiversity-fungi":"FUN",heritage:"PAT",industrial:"FRI",memory:"OBS",cavity:"CAV",natural:"NAT"})[kind]||"POI"}
function symbolicPoiHash(value){
  let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
}
function symbolicPoiLayerEnabled(poi){
  if(!poi)return false;
  if(poi.sourceType==="bss")return !!state.layerBss;
  if(poi.sourceType==="underground")return !!state.layerUserHypotheses&&currentDepth()===Number(poi.raw?.depth);
  if(poi.sourceType==="hydrometry")return !!state.layerHydrometry&&currentDepth()===0;
  if(poi.sourceType==="biodiversity")return !!state.layerBiodiversity&&currentDepth()===0&&biodiversityVisibleSpecies(poi.raw).length>0;
  if(poi.sourceType==="nature")return !!state.layerNatureAreas&&currentDepth()===0;
  if(poi.sourceType==="landscape-change")return !!state.layerIndustrialHistory&&currentDepth()===0;
  if(poi.sourceType==="landcover")return !!state.layerLandCover&&currentDepth()===0;
  if(poi.sourceType==="geology")return !!state.layerGeology&&currentDepth()===0;
  if(poi.sourceType==="cavity"||poi.sourceType==="osm-natural")return !!state.layerCavities;
  if(poi.sourceType==="heritage")return !!state.layerHeritage&&state.heritageEnabled[poi.raw?.category]!==false;
  if(poi.sourceType==="observation")return !!state.layerObservations;
  if(poi.sourceType==="personal")return !!state.layerPersonal;
  if(poi.sourceType==="lore"||poi.sourceType==="demo")return !!state.layerLore;
  if(poi.sourceType==="cartofriches")return !!state.layerCartofriches&&(state.cartofrichesIncludeReconverted||!String(poi.raw?.status||"").toLowerCase().includes("reconvert"));
  if(poi.sourceType==="house")return !!state.layerHouse;
  if(poi.sourceType==="location")return !!state.userLocation;
  return true;
}
function symbolicPoiDepthAlpha(poi){
  if(currentDepth()===0)return 1;
  if(["cavity","bss","memory","home","location","natural"].includes(poi.category))return 1;
  return state.layerSurface ? .28 : 0;
}
function symbolicPoiDensityVisible(poi){
  const z=state.zoomIndex,h=symbolicPoiHash(poi.uid);
  if(poi.category==="bss"){
    const modulo=z===0?8:z===1?4:z===2?2:1;
    if(modulo>1&&h%modulo!==0&&!poi.raw?.piezo)return false;
  }
  if(poi.category==="natural"&&z<2&&h%(z===0?4:2)!==0)return false;
  if(String(poi.category).startsWith("biodiversity-")&&z<2&&h%(z===0?4:2)!==0)return false;
  return true;
}
function symbolicVisiblePois(grid){
  return queryNormalizedPois(grid.extent).filter(p=>symbolicPoiLayerEnabled(p)&&symbolicPoiDepthAlpha(p)>0&&symbolicPoiDensityVisible(p)).sort((a,b)=>b.priority-a.priority||symbolicPoiHash(a.uid)-symbolicPoiHash(b.uid));
}
function symbolicPoiScale(){return [0.78,0.88,0.99,1.10,1.22,1.38][state.zoomIndex]||1}
function symbolicRoundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function explorationsDrawPoiIcon(ctx,kind,cx,cy,size,alpha=1){
  const color=symbolicPoiColor(kind),r=Math.max(5,size*.44);ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=alpha;ctx.lineCap="round";ctx.lineJoin="round";
  ctx.fillStyle="#fff9df";ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.25,size*.08);ctx.beginPath();ctx.arc(0,0,r*1.20,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(kind==="home"){ctx.fillStyle="#e37a62";ctx.beginPath();ctx.moveTo(-r*.68,-r*.05);ctx.lineTo(0,-r*.70);ctx.lineTo(r*.68,-r*.05);ctx.lineTo(r*.52,-r*.05);ctx.lineTo(r*.52,r*.58);ctx.lineTo(-r*.52,r*.58);ctx.lineTo(-r*.52,-r*.05);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(kind==="location"){ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-r*.14,r*.34,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,r*.74);ctx.lineTo(-r*.43,0);ctx.arc(0,-r*.02,r*.43,Math.PI,0);ctx.closePath();ctx.stroke();}
  else if(kind==="heritage"){ctx.fillStyle="#e5bb6b";ctx.fillRect(-r*.62,-r*.10,r*1.24,r*.68);ctx.beginPath();ctx.moveTo(-r*.75,-r*.12);ctx.lineTo(0,-r*.68);ctx.lineTo(r*.75,-r*.12);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#96643d";ctx.beginPath();ctx.moveTo(-r*.28,r*.48);ctx.lineTo(-r*.28,0);ctx.moveTo(r*.28,r*.48);ctx.lineTo(r*.28,0);ctx.stroke();}
  else if(kind==="hydrology"){ctx.fillStyle="#61c9e4";ctx.beginPath();ctx.moveTo(0,-r*.72);ctx.bezierCurveTo(r*.66,-r*.08,r*.54,r*.66,0,r*.70);ctx.bezierCurveTo(-r*.54,r*.66,-r*.66,-r*.08,0,-r*.72);ctx.fill();ctx.stroke();}
  else if(kind==="biodiversity-animals"){ctx.fillStyle="#d17d3f";ctx.beginPath();ctx.arc(0,r*.28,r*.30,0,Math.PI*2);ctx.fill();for(const [x,y] of [[-.45,-.22],[.45,-.22],[-.24,-.55],[.24,-.55]]){ctx.beginPath();ctx.arc(x*r*1.25,y*r*1.25,r*.17,0,Math.PI*2);ctx.fill();}}
  else if(kind==="biodiversity-fungi"){ctx.fillStyle="#a56fb5";ctx.fillRect(-r*.14,0,r*.28,r*.58);ctx.beginPath();ctx.arc(0,0,r*.66,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(kind==="biodiversity"||kind==="biodiversity-plants"||kind==="natural"){ctx.fillStyle="#67aa63";ctx.beginPath();ctx.moveTo(0,r*.66);ctx.bezierCurveTo(-r*.92,r*.27,-r*.68,-r*.60,0,-r*.54);ctx.bezierCurveTo(r*.68,-r*.60,r*.92,r*.27,0,r*.66);ctx.fill();ctx.stroke();ctx.strokeStyle="#f4ffe2";ctx.beginPath();ctx.moveTo(0,r*.46);ctx.lineTo(0,-r*.35);ctx.stroke();}
  else if(kind==="industrial"){ctx.fillStyle="#bb7958";ctx.fillRect(-r*.65,-r*.12,r*1.3,r*.66);ctx.beginPath();ctx.moveTo(-r*.65,-r*.12);ctx.lineTo(-r*.32,-r*.45);ctx.lineTo(0,-r*.12);ctx.lineTo(r*.30,-r*.45);ctx.lineTo(r*.65,-r*.12);ctx.stroke();}
  else if(kind==="memory"){ctx.fillStyle="#d57398";ctx.beginPath();ctx.ellipse(0,0,r*.72,r*.44,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff9df";ctx.beginPath();ctx.arc(0,0,r*.18,0,Math.PI*2);ctx.fill();}
  else if(kind==="cavity"){ctx.fillStyle="#8374b8";ctx.beginPath();ctx.arc(0,r*.30,r*.66,Math.PI,0);ctx.lineTo(r*.66,r*.58);ctx.lineTo(-r*.66,r*.58);ctx.closePath();ctx.fill();ctx.stroke();}
  else {ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(0,-r*.72);ctx.lineTo(0,r*.72);ctx.moveTo(-r*.55,0);ctx.lineTo(r*.55,0);ctx.stroke();}
  ctx.restore();
}
function symbolicDrawPoiIcon(ctx,kind,cx,cy,size,alpha=1){
  if(explorationsMapStyle()){explorationsDrawPoiIcon(ctx,kind,cx,cy,size,alpha);return}
  const color=symbolicPoiColor(kind),r=Math.max(3.5,size*.39);ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=alpha;
  // Balise d'arpentage commune : un noyau sombre, une couronne colorée et un
  // petit cran cardinal. Les familles changent de glyphe, jamais de position.
  ctx.shadowColor=color;ctx.shadowBlur=Math.max(2,size*.22);
  ctx.fillStyle="rgba(4,12,8,.94)";ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,size*.075);
  ctx.beginPath();ctx.arc(0,0,r*1.24,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.globalAlpha=alpha*.72;ctx.beginPath();ctx.moveTo(0,-r*1.52);ctx.lineTo(0,-r*1.18);ctx.stroke();ctx.globalAlpha=alpha;
  ctx.shadowBlur=Math.max(1,size*.12);ctx.lineWidth=Math.max(1,size*.085);
  if(kind==="home"){
    ctx.beginPath();ctx.moveTo(-r*.72,0);ctx.lineTo(0,-r*.68);ctx.lineTo(r*.72,0);ctx.lineTo(r*.55,0);ctx.lineTo(r*.55,r*.60);ctx.lineTo(-r*.55,r*.60);ctx.lineTo(-r*.55,0);ctx.closePath();ctx.stroke();
  }else if(kind==="location"){
    ctx.beginPath();ctx.arc(0,0,r*.38,0,Math.PI*2);ctx.moveTo(-r*.75,0);ctx.lineTo(-r*.42,0);ctx.moveTo(r*.42,0);ctx.lineTo(r*.75,0);ctx.moveTo(0,-r*.75);ctx.lineTo(0,-r*.42);ctx.moveTo(0,r*.42);ctx.lineTo(0,r*.75);ctx.stroke();
  }else if(kind==="heritage"){
    ctx.beginPath();ctx.moveTo(0,-r*.78);ctx.lineTo(r*.72,0);ctx.lineTo(0,r*.78);ctx.lineTo(-r*.72,0);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.35,r*.12);ctx.lineTo(0,-r*.26);ctx.lineTo(r*.35,r*.12);ctx.stroke();
  }else if(kind==="bss"){
    ctx.beginPath();ctx.moveTo(0,-r*.70);ctx.lineTo(0,r*.72);ctx.moveTo(-r*.34,-r*.20);ctx.lineTo(r*.34,-r*.20);ctx.moveTo(-r*.24,r*.34);ctx.lineTo(r*.24,r*.34);ctx.stroke();
  }else if(kind==="industrial"){
    ctx.beginPath();ctx.rect(-r*.66,-r*.50,r*1.32,r);ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.66,-r*.05);ctx.lineTo(-r*.25,-r*.42);ctx.lineTo(r*.02,-r*.05);ctx.lineTo(r*.46,-r*.42);ctx.stroke();
  }else if(kind==="memory"){
    ctx.beginPath();ctx.ellipse(0,0,r*.76,r*.43,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.20,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }else if(kind==="cavity"){
    ctx.beginPath();ctx.arc(0,r*.18,r*.65,Math.PI,0);ctx.lineTo(r*.65,r*.55);ctx.moveTo(-r*.65,r*.55);ctx.lineTo(-r*.65,r*.18);ctx.stroke();ctx.beginPath();ctx.arc(0,r*.20,r*.24,Math.PI,0);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(0,-r*.62);ctx.bezierCurveTo(r*.56,-r*.34,r*.58,r*.40,0,r*.66);ctx.bezierCurveTo(-r*.58,r*.40,-r*.56,-r*.34,0,-r*.62);ctx.stroke();
  }
  ctx.restore();
}
function symbolicPoiLabelAllowed(poi){
  if(!state.layerLabels||!poi.title)return false;
  const z=state.zoomIndex;
  if(String(poi.category).startsWith("biodiversity-"))return z>=5;
  if(z===0)return poi.category==="home"||poi.category==="location";
  if(z===1)return ["home","location","heritage","industrial"].includes(poi.category)&&poi.priority>=20;
  if(z===2)return poi.category!=="bss"&&poi.category!=="natural";
  if(z===3)return poi.category!=="bss"||!!poi.raw?.piezo;
  if(z===4)return poi.category!=="bss"||!!poi.raw?.piezo||!!poi.raw?.indice;
  return true;
}
function symbolicTruncateLabel(text,max){const s=String(text||"").replace(/\s+/g," ").trim();return s.length>max?s.slice(0,max-1).trimEnd()+"…":s}
function symbolicRectsOverlap(a,b,pad=2){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y)}
function symbolicDrawNonPoiLabels(ctx,grid,m,occupied=[]){
  ctx.save();ctx.textBaseline="top";ctx.textAlign="left";ctx.font=`700 ${Math.max(8,m.fontSize*.76)}px ${explorationsMapStyle()?"Trebuchet MS,Arial,sans-serif":canvasFontFamily()}`;ctx.fillStyle=explorationsMapStyle()?"rgba(44,71,69,.84)":"rgba(238,230,204,.82)";ctx.shadowColor=explorationsMapStyle()?"rgba(255,250,226,.92)":"rgba(0,0,0,.95)";ctx.shadowBlur=explorationsMapStyle()?1.5:3;
  for(let y=0;y<CONFIG.gridH;y++){
    let text="",start=0,poiLabel=false;
    const flush=()=>{if(!text)return; if(!poiLabel){const x=m.padding+start*m.cellW,yy=m.padding+y*m.cellH+m.cellH*.08,w=ctx.measureText(text).width,h=Math.max(9,m.fontSize*.82),rect={x,y:yy,w,h};if(!occupied.some(r=>symbolicRectsOverlap(r,rect,1))){ctx.fillText(text,x,yy);occupied.push(rect)}} text="";poiLabel=false};
    for(let x=0;x<=CONFIG.gridW;x++){
      const c=x<CONFIG.gridW?grid.grid[y][x]:null,isLabel=!!c&&String(c.cls||"").includes("c-label");
      if(isLabel){if(!text)start=x;text+=c.ch;poiLabel=poiLabel||!!c.feature?.poi||!!c.feature?.poiId||!!c.feature?.normalizedPoi}else flush();
    }
  }
  ctx.restore();return occupied;
}
function symbolicDrawPoiLabels(ctx,entries,m,occupied=[]){
  const z=state.zoomIndex,maxChars=[13,16,20,25,31,38][z]||26;
  ctx.save();ctx.textBaseline="middle";ctx.lineJoin="round";
  for(const entry of entries){
    const {poi,cx,cy,size,alpha}=entry;if(alpha<.55||!symbolicPoiLabelAllowed(poi))continue;
    const title=symbolicTruncateLabel(poi.title,maxChars),code=symbolicPoiCode(poi.category),color=symbolicPoiColor(poi.category),hash=symbolicPoiHash(poi.uid);
    const family=explorationsMapStyle()?"Trebuchet MS,Arial,sans-serif":canvasFontFamily(),fontSize=Math.max(8,m.fontSize*(z>=4?.78:.70));ctx.font=`700 ${fontSize}px ${family}`;
    const codeSize=Math.max(7,fontSize*.72),codeW=Math.max(20,code.length*codeSize*.62+8),textW=ctx.measureText(title).width;
    const h=Math.ceil(fontSize+8),w=Math.ceil(codeW+textW+10),side=(hash&1)?1:-1,dy=((hash>>>1)%3-1)*Math.max(3,size*.22),gap=size*.72+5;
    const x=side>0?cx+gap:cx-gap-w,y=cy-h/2+dy,rect={x,y,w,h};
    if(x<3||x+w>m.width-3||y<3||y+h>m.height-3||occupied.some(r=>symbolicRectsOverlap(r,rect,2)))continue;
    const leaderX=side>0?x:x+w,leaderStart=cx+side*size*.48;
    ctx.globalAlpha=alpha*.82;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(leaderStart,cy);ctx.lineTo(leaderX,cy+dy);ctx.stroke();
    symbolicRoundRect(ctx,x,y,w,h,explorationsMapStyle()?7:3);ctx.fillStyle=explorationsMapStyle()?"rgba(255,249,223,.94)":"rgba(4,12,8,.92)";ctx.fill();ctx.strokeStyle=`${color}aa`;ctx.stroke();
    ctx.fillStyle=`${color}28`;ctx.fillRect(x+1,y+1,codeW-1,h-2);ctx.fillStyle=color;ctx.font=`800 ${codeSize}px ${family}`;ctx.textAlign="center";ctx.fillText(code,x+codeW/2,y+h/2+.3);
    ctx.fillStyle=explorationsMapStyle()?"#244453":"#eee6cc";ctx.font=`700 ${fontSize}px ${family}`;ctx.textAlign="left";ctx.fillText(title,x+codeW+5,y+h/2+.3);
    occupied.push(rect);
  }
  ctx.restore();
}
function symbolicDrawPoisAndLabels(ctx,grid,m){
  const pois=symbolicVisiblePois(grid),scale=symbolicPoiScale(),entries=[];canvasRuntime.symbolicPoiHitRegions=[];
  for(const poi of pois){
    const p=symbolicProject(poi.lon,poi.lat,grid.extent,m);if(!p||p.x<m.padding-2||p.x>m.width-m.padding+2||p.y<m.padding-2||p.y>m.height-m.padding+2)continue;
    const alpha=symbolicPoiDepthAlpha(poi),baseSize=Math.max(9,m.fontSize*.92)*scale,size=explorationsMapStyle()?baseSize*1.62:baseSize;entries.push({poi,cx:p.x,cy:p.y,size,alpha});
    symbolicDrawPoiIcon(ctx,poi.category,p.x,p.y,size,alpha);
    canvasRuntime.symbolicPoiHitRegions.push({poi,cx:p.x,cy:p.y,size,alpha});
  }
  const occupied=entries.map(e=>({x:e.cx-e.size*.62,y:e.cy-e.size*.62,w:e.size*1.24,h:e.size*1.24}));
  symbolicDrawNonPoiLabels(ctx,grid,m,occupied);
  symbolicDrawPoiLabels(ctx,entries,m,occupied);
  return entries.length;
}

function symbolicPoiFeatureInfo(poi){
  const r=poi?.raw||{};
  if(!poi)return null;
  if(poi.sourceType==="cavity")return poiFeatureInfo(poi,cavityInfo(r,cavityMarker(r)));
  if(poi.sourceType==="heritage")return poiFeatureInfo(poi,heritageFeatureInfo(r));
  if(poi.sourceType==="bss")return poiFeatureInfo(poi,{kind:r.piezo?"station piézométrique":"forage ou ouvrage BSS",depth:r.depth,nature:r.nature,altitude:r.altitude,commune:r.commune,indice:r.indice,place:r.place,bss:true,piezo:!!r.piezo});
  if(poi.sourceType==="hydrometry")return poiFeatureInfo(poi,{kind:"station hydrométrique",hydrometry:true,river:r.river,commune:r.commune,code:r.code,heightM:r.heightM,flowM3s:r.flowM3s,observedAt:r.observedAt,url:r.url,license:r.license});
  if(poi.sourceType==="biodiversity")return biodiversityFeatureInfo(poi);
  if(poi.sourceType==="landscape-change")return poiFeatureInfo(poi,{memory:true,landscapeChange:true,period:poi.raw?.period||"",before:poi.raw?.before||"",after:poi.raw?.after||"",note:poi.raw?.note||""});
  if(poi.sourceType==="landcover")return poiFeatureInfo(poi,{landCover:true,occupation:poi.raw?.name||"",url:poi.raw?.url||"",source:poi.raw?.source||"BD CARTO® · IGN"});
  if(poi.sourceType==="geology")return poiFeatureInfo(poi,{geology:true,code:poi.raw?.code||"",url:poi.raw?.url||"",source:poi.raw?.source||"BRGM"});
  if(poi.sourceType==="cartofriches")return poiFeatureInfo(poi,{kind:poi.kind,cartofriches:true,siteType:r.type,siteStatus:r.status,address:r.address,surface:r.surface,occupation:r.occupation,activity:r.activity,activityEnd:r.activityEnd,commune:r.commune,url:r.url});
  return poiFeatureInfo(poi,{kind:poi.kind,note:r.note||poi.description||"",description:r.description||poi.description||"",period:r.period||r.date||"",observation:poi.sourceType==="observation",lore:poi.sourceType==="lore",personal:poi.sourceType==="personal",nature:poi.sourceType==="nature",reference:poi.sourceType==="nature"?r.reference:"",areaHa:poi.sourceType==="nature"?r.areaHa:null,url:r.url||"",userHypothesis:poi.sourceType==="underground",hypothesis:poi.sourceType==="underground",depth:poi.sourceType==="underground"?r.depth:undefined,confidenceLabel:r.confidence?confidenceLabel(r.confidence):"",heritage:poi.sourceType==="heritage"});
}
function symbolicPoiRegionClientRect(region){
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas?.getBoundingClientRect();if(!m||!r||!region)return null;
  const sx=r.width/Math.max(1,m.width),sy=r.height/Math.max(1,m.height),radius=region.size*.68;
  return {left:r.left+(region.cx-radius)*sx,top:r.top+(region.cy-radius)*sy,right:r.left+(region.cx+radius)*sx,bottom:r.top+(region.cy+radius)*sy,width:radius*2*sx,height:radius*2*sy};
}
function symbolicPoiHitFromClient(clientX,clientY,multiplier=1){
  if(effectiveRenderMode()!=="symbolic"||!CANVAS_RENDERER||!canvasRuntime.symbolicPoiHitRegions?.length)return null;
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas.getBoundingClientRect();if(!m||!r.width||!r.height)return null;
  const x=(clientX-r.left)*(m.width/r.width),y=(clientY-r.top)*(m.height/r.height),coarse=coarsePointer();let best=null;
  const extra=[4,5,6,7,9,12][state.zoomIndex]||6;
  for(const region of canvasRuntime.symbolicPoiHitRegions){
    const radius=(region.size*.62+extra+(coarse?5:0))*multiplier,d=Math.hypot(x-region.cx,y-region.cy);
    if(d<=radius&&(!best||d<best.distance))best={...region,distance:d};
  }
  return best;
}
/* V0.16c — profondeur symbolique cohérente.
   Les tranches utilisent la même grammaire visuelle que la surface, mais les
   couleurs distinguent clairement donnée documentée et volume interprétatif.
   La géométrie reste celle du modèle maître commun aux profondeurs. */
function symbolicUndergroundPalette(depth=currentDepth()){
  return undergroundVisualContract(depth);
}
function symbolicUndergroundConfidence(cell){
  const cls=String(cell?.cls||"");
  if(cls.includes("c-hyp-high"))return "high";
  if(cls.includes("c-hyp-med"))return "med";
  if(cls.includes("c-hyp-low"))return "low";
  return "";
}
function symbolicUndergroundHasClass(cell,name){return String(cell?.cls||"").includes(name)}
function symbolicUndergroundFeatureKey(cell){
  const feature=cell?.feature||{};
  return String(feature.hypothesisModel||feature.poiId||feature.id||feature.name||feature.kind||"");
}
function symbolicDrawUndergroundBase(ctx,grid,m){
  const palette=symbolicUndergroundPalette();
  ctx.fillStyle=palette.base;ctx.fillRect(0,0,m.width,m.height);
  // Fond rocheux continu, avec une trame régulière stable plutôt qu'un bruit
  // aléatoire qui changerait de lecture entre les profondeurs.
  ctx.fillStyle=palette.rock;ctx.fillRect(m.padding,m.padding,CONFIG.gridW*m.cellW,CONFIG.gridH*m.cellH);
  ctx.strokeStyle=palette.grid;ctx.lineWidth=.55;ctx.beginPath();
  const stepX=Math.max(4,Math.round(48/Math.max(1,m.cellW))),stepY=Math.max(4,Math.round(48/Math.max(1,m.cellH)));
  for(let x=0;x<=CONFIG.gridW;x+=stepX){const px=m.padding+x*m.cellW;ctx.moveTo(px,m.padding);ctx.lineTo(px,m.padding+CONFIG.gridH*m.cellH)}
  for(let y=0;y<=CONFIG.gridH;y+=stepY){const py=m.padding+y*m.cellH;ctx.moveTo(m.padding,py);ctx.lineTo(m.padding+CONFIG.gridW*m.cellW,py)}
  ctx.stroke();
  // Fractures schématiques : traits très courts, orientation déterministe.
  ctx.strokeStyle=palette.fracture;ctx.lineWidth=Math.max(.55,m.fontSize*.04);ctx.beginPath();
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],cls=String(c?.cls||"");if(!cls.includes("c-fracture"))continue;
    const cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH,flip=(x*13+y*7)%2;
    ctx.moveTo(cx-m.cellW*.28,cy+(flip?-.18:.18)*m.cellH);ctx.lineTo(cx+m.cellW*.28,cy+(flip?.18:-.18)*m.cellH);
  }
  ctx.stroke();
}
function symbolicDrawUndergroundVolumes(ctx,grid,m){
  const palette=symbolicUndergroundPalette(),fills={high:palette.high,med:palette.med,low:palette.low};
  // Les volumes contigus sont remplis par bandes horizontales. Le résultat est
  // identique cellule par cellule, avec beaucoup moins d'appels Canvas.
  for(let y=0;y<CONFIG.gridH;y++){
    let start=0,last="";
    const flush=x=>{if(last){ctx.fillStyle=fills[last];ctx.fillRect(m.padding+start*m.cellW-.35,m.padding+y*m.cellH-.35,(x-start)*m.cellW+.7,m.cellH+.7)}};
    for(let x=0;x<=CONFIG.gridW;x++){
      const cell=x<CONFIG.gridW?grid.grid[y][x]:null;
      const conf=cell&&symbolicUndergroundHasClass(cell,"c-underground-volume")?symbolicUndergroundConfidence(cell):"";
      if(x===0){last=conf;start=0}else if(conf!==last){flush(x);last=conf;start=x}
    }
  }
  // Un contour discret entoure les remplissages ; les murs réels sont redessinés
  // séparément afin de ne plus disparaître en mode symbolique.
  ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle=palette.edge;ctx.lineWidth=Math.max(.55,m.fontSize*.045);ctx.beginPath();
  const isVolume=(x,y)=>x>=0&&y>=0&&x<CONFIG.gridW&&y<CONFIG.gridH&&symbolicUndergroundHasClass(grid.grid[y][x],"c-underground-volume");
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(!isVolume(x,y))continue;
    const l=m.padding+x*m.cellW,t=m.padding+y*m.cellH,r=l+m.cellW,b=t+m.cellH;
    if(!isVolume(x,y-1)){ctx.moveTo(l,t);ctx.lineTo(r,t)}
    if(!isVolume(x+1,y)){ctx.moveTo(r,t);ctx.lineTo(r,b)}
    if(!isVolume(x,y+1)){ctx.moveTo(r,b);ctx.lineTo(l,b)}
    if(!isVolume(x-1,y)){ctx.moveTo(l,b);ctx.lineTo(l,t)}
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawUndergroundNetwork(ctx,grid,m,className,{colors,lineWidth,dashed=false,requireDashed=null}={}){
  const neighbors=[[1,0],[0,1],[1,1],[-1,1]];
  for(const confidence of ["low","med","high"]){
    ctx.save();ctx.strokeStyle=colors?.[confidence]||colors?.default||"#c7b5e7";ctx.lineWidth=lineWidth;ctx.lineCap="round";ctx.lineJoin="round";ctx.setLineDash(dashed?[2.2,3.4]:[]);ctx.beginPath();
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const cell=grid.grid[y][x];
      const cellDashed=symbolicUndergroundHasClass(cell,"c-underground-dashed");
      if(!symbolicUndergroundHasClass(cell,className)||symbolicUndergroundConfidence(cell)!==confidence||(requireDashed!==null&&cellDashed!==requireDashed))continue;
      const key=symbolicUndergroundFeatureKey(cell),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;let linked=false;
      for(const [dx,dy] of neighbors){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;
        const next=grid.grid[ny][nx],nextDashed=symbolicUndergroundHasClass(next,"c-underground-dashed");if(!symbolicUndergroundHasClass(next,className)||(requireDashed!==null&&nextDashed!==requireDashed))continue;
        const nextKey=symbolicUndergroundFeatureKey(next);if(key&&nextKey&&key!==nextKey)continue;
        ctx.moveTo(cx,cy);ctx.lineTo(m.padding+(nx+.5)*m.cellW,m.padding+(ny+.5)*m.cellH);linked=true;
      }
      if(!linked){ctx.moveTo(cx-.6,cy);ctx.lineTo(cx+.6,cy)}
    }
    ctx.stroke();ctx.restore();
  }
}
function symbolicDrawUndergroundLinesAndEdges(ctx,grid,m){
  const palette=symbolicUndergroundPalette(),confidenceColors={high:palette.highText,med:palette.medText,low:palette.lowText};
  symbolicDrawUndergroundNetwork(ctx,grid,m,"c-underground-line",{colors:confidenceColors,lineWidth:Math.max(1.1,m.fontSize*.085),requireDashed:false});
  symbolicDrawUndergroundNetwork(ctx,grid,m,"c-underground-line",{colors:confidenceColors,lineWidth:Math.max(1,m.fontSize*.075),dashed:true,requireDashed:true});
  ctx.save();ctx.strokeStyle=palette.edge;ctx.lineWidth=Math.max(.85,m.fontSize*.065);ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();
  const neighbors=[[1,0],[0,1],[1,1],[-1,1]];
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const cell=grid.grid[y][x];if(!symbolicUndergroundHasClass(cell,"c-underground-edge"))continue;
    const key=symbolicUndergroundFeatureKey(cell),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;let linked=false;
    for(const [dx,dy] of neighbors){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;const next=grid.grid[ny][nx];if(!symbolicUndergroundHasClass(next,"c-underground-edge"))continue;const nextKey=symbolicUndergroundFeatureKey(next);if(key&&nextKey&&key!==nextKey)continue;ctx.moveTo(cx,cy);ctx.lineTo(m.padding+(nx+.5)*m.cellW,m.padding+(ny+.5)*m.cellH);linked=true}
    if(!linked){ctx.moveTo(cx-.5,cy);ctx.lineTo(cx+.5,cy)}
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawUndergroundWater(ctx,grid,m){
  const palette=symbolicUndergroundPalette(),isWater=(x,y)=>x>=0&&y>=0&&x<CONFIG.gridW&&y<CONFIG.gridH&&String(grid.grid[y][x]?.cls||"").includes("c-water-underground");
  ctx.save();ctx.strokeStyle=palette.water;ctx.fillStyle=palette.water;ctx.shadowColor=palette.water;ctx.shadowBlur=Math.max(2,m.fontSize*.22);ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=Math.max(1.2,m.cellH*.16);ctx.beginPath();
  const center=(x,y)=>({x:m.padding+(x+.5)*m.cellW,y:m.padding+(y+.5)*m.cellH});
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(!isWater(x,y))continue;const a=center(x,y);let linked=false;
    for(const [dx,dy] of [[1,0],[0,1]])if(isWater(x+dx,y+dy)){const b=center(x+dx,y+dy);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);linked=true}
    if(!linked){ctx.moveTo(a.x-.5,a.y);ctx.lineTo(a.x+.5,a.y)}
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawUndergroundPillarsAndGhosts(ctx,grid,m){
  const palette=symbolicUndergroundPalette();ctx.save();
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],cls=String(c?.cls||""),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;
    if(cls.includes("c-pillar")){
      const r=Math.max(2,Math.min(m.cellW,m.cellH)*.28);ctx.fillStyle="rgba(18,13,8,.9)";ctx.strokeStyle=palette.pillar;ctx.lineWidth=Math.max(1,m.fontSize*.07);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(cls.includes("c-underground-locator")){
      const r=Math.max(2.2,Math.min(m.cellW,m.cellH)*.34);ctx.fillStyle=palette.low;ctx.strokeStyle=palette.edge;ctx.lineWidth=Math.max(.8,m.fontSize*.055);ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(cls.includes("c-ghost")&&((x+y)%3===0)){
      ctx.fillStyle=palette.ghost;ctx.fillRect(cx-.6,cy-.6,1.2,1.2);
    }
  }
  ctx.restore();
}
function drawSymbolicUndergroundMap(grid,m,ctx){
  symbolicDrawUndergroundBase(ctx,grid,m);
  symbolicDrawUndergroundVolumes(ctx,grid,m);
  symbolicDrawUndergroundLinesAndEdges(ctx,grid,m);
  symbolicDrawUndergroundWater(ctx,grid,m);
  symbolicDrawUndergroundPillarsAndGhosts(ctx,grid,m);
  symbolicDrawInstrumentFrame(ctx,m);
  return symbolicDrawPoisAndLabels(ctx,grid,m);
}

/* V0.16e — réseaux nettoyés et direction artistique renforcée.
   Cette passe n'altère aucune donnée. Elle déduplique les fragments OSM au
   moment du dessin, élimine les aires routières prises pour des axes, masque
   les branchements utilitaires trop courts aux zooms où ils n'apportent rien
   et conserve une simplification indépendante du cadrage. */
function symbolicNetworkVisible(kind){
  const detail=semanticZoom(),z=state.zoomIndex;
  if(kind==="path")return !!detail.paths&&z>=3;
  if(kind==="road-minor")return !!detail.minorRoads&&z>=4;
  if(kind==="water-minor")return !!detail.minorWater&&z>=5;
  if(kind==="water")return z>=1||!!detail.minorWater;
  return true;
}
function symbolicNetworkFeatureAllowed(feature,kind,length=0){
  const t=feature?.tags||{},z=state.zoomIndex,highway=String(t.highway||"").toLowerCase();
  const name=String(t.name||t.ref||"").trim();
  const access=String(t.access||"").toLowerCase();
  const service=String(t.service||"").toLowerCase();
  if(t.area==="yes")return false;
  if(feature?.closed&&String(t.junction||"").toLowerCase()!=="roundabout")return false;
  if(["no","private","customers"].includes(access))return false;

  // Les voies de parking, accès de maison et bretelles techniques sont utiles
  // dans la base, mais illisibles dans une carte synthétique. Même au zoom max,
  // elles ne sont pas affichées par défaut.
  if(highway==="service"){
    if(["driveway","parking_aisle","emergency_access","drive-through"].includes(service))return false;
    if(z<5)return false;
    if(!name&&length<90)return false;
  }
  if(highway==="living_street"){
    if(z<5)return false;
    if(!name&&length<75)return false;
  }

  // Les chemins sont réservés aux deux niveaux les plus proches. À l'échelle
  // Site, seuls les itinéraires nommés ou réellement continus restent visibles.
  if(["footway","path","cycleway","bridleway","steps"].includes(highway)){
    if(z<4)return false;
    if(z===4&&!name)return false;
    if(!name&&length<80)return false;
  }
  if(highway==="track"){
    if(z<4)return false;
    if(z===4&&!name&&length<180)return false;
  }

  // Généralisation des rues locales. On garde toutes les données, mais pas tous
  // les fragments à toutes les échelles.
  if(["residential","unclassified"].includes(highway)){
    if(z<=2&&!name)return false;
    if(z===3&&!name&&length<220)return false;
    if(z===4&&!name&&length<85)return false;
    if(z===5&&!name&&length<45)return false;
  }
  if(kind==="road-minor"&&z<5)return false;
  if(kind==="water-minor"&&z<5)return false;
  return true;
}
function symbolicNetworkLengthMeters(coords){
  let total=0;
  for(let i=1;i<(coords?.length||0);i++){
    const a={lon:+coords[i-1][0],lat:+coords[i-1][1]},b={lon:+coords[i][0],lat:+coords[i][1]};
    if(Number.isFinite(a.lon)&&Number.isFinite(a.lat)&&Number.isFinite(b.lon)&&Number.isFinite(b.lat))total+=distanceMeters(a,b);
  }
  return total;
}
function symbolicNetworkEndpointKey(pair){
  const lon=Number(pair?.[0]),lat=Number(pair?.[1]);
  return Number.isFinite(lon)&&Number.isFinite(lat)?`${lon.toFixed(5)},${lat.toFixed(5)}`:"";
}
function symbolicNetworkGeometryKey(feature,kind){
  const coords=feature?.coords||[];if(coords.length<2)return "";
  const sample=coords.length>14?coords.filter((_,i)=>i===0||i===coords.length-1||i%Math.ceil(coords.length/12)===0):coords;
  const direct=sample.map(p=>`${Number(p[0]).toFixed(5)},${Number(p[1]).toFixed(5)}`).join("|");
  const reverse=sample.slice().reverse().map(p=>`${Number(p[0]).toFixed(5)},${Number(p[1]).toFixed(5)}`).join("|");
  return `${kind}|${direct<reverse?direct:reverse}`;
}
function symbolicNetworkCandidates(extent){
  const byId=new Map(),byGeometry=new Map();
  for(const feature of queryOsmFeatures(extent)){
    const kind=symbolicNetworkKind(feature.tags||{});if(!kind||!symbolicNetworkVisible(kind))continue;
    const length=symbolicNetworkLengthMeters(feature.coords);
    if(!symbolicNetworkFeatureAllowed(feature,kind,length))continue;
    const item={feature,kind,length};
    const idKey=feature.type==="way"&&feature.id?`way:${feature.id}`:"";
    if(idKey){
      const previous=byId.get(idKey);
      if(!previous||length>previous.length||(length===previous.length&&(feature.coords?.length||0)>(previous.feature.coords?.length||0)))byId.set(idKey,item);
    }else{
      const geometryKey=symbolicNetworkGeometryKey(feature,kind);if(!geometryKey)continue;
      const previous=byGeometry.get(geometryKey);
      if(!previous||length>previous.length)byGeometry.set(geometryKey,item);
    }
  }
  const items=[...byId.values(),...byGeometry.values()];
  // Comptage des extrémités pour repérer les petits rameaux orphelins. Cela ne
  // supprime jamais un axe nommé ou majeur, uniquement du bruit cartographique.
  const endpointUse=new Map();
  for(const item of items){
    const coords=item.feature.coords||[],a=symbolicNetworkEndpointKey(coords[0]),b=symbolicNetworkEndpointKey(coords.at(-1));
    if(a)endpointUse.set(a,(endpointUse.get(a)||0)+1);if(b)endpointUse.set(b,(endpointUse.get(b)||0)+1);
  }
  return items.filter(item=>{
    const t=item.feature.tags||{},name=String(t.name||t.ref||"").trim();
    if(name||["road-major","water-major"].includes(item.kind))return true;
    const coords=item.feature.coords||[],a=symbolicNetworkEndpointKey(coords[0]),b=symbolicNetworkEndpointKey(coords.at(-1));
    const dangling=(endpointUse.get(a)||0)<=1||(endpointUse.get(b)||0)<=1;
    const threshold=item.kind==="road"?(state.zoomIndex>=5?55:state.zoomIndex===4?95:180):item.kind==="road-minor"?120:item.kind==="path"?140:item.kind==="water-minor"?80:0;
    return !(dangling&&item.length<threshold);
  });
}
function symbolicSimplifiedCoords(feature,kind){
  const coords=feature?.coords||[];if(coords.length<=2)return coords;
  // Projection fixe à l'échelle de l'Atlas : un même way produit exactement
  // les mêmes sommets simplifiés quel que soit le centre de la fenêtre.
  const meters=symbolicFeatureMeters(coords,CONFIG.dataCenter.lat);
  const simple=symbolicSimplifyProjected(meters,symbolicNetworkToleranceMeters(kind));
  return simple.map(p=>[p.lon,p.lat]);
}
function symbolicSegmentVisibleLengthPx(coords,extent,m){
  let total=0,inside=0;
  const left=m.padding,right=m.padding+(CONFIG.gridW-1)*m.cellW+m.cellW,top=m.padding,bottom=m.padding+(CONFIG.gridH-1)*m.cellH+m.cellH;
  for(let i=1;i<(coords?.length||0);i++){
    const a=symbolicProject(coords[i-1][0],coords[i-1][1],extent,m),b=symbolicProject(coords[i][0],coords[i][1],extent,m);
    const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);
    if(maxX<left||minX>right||maxY<top||minY>bottom)continue;
    const len=Math.hypot(b.x-a.x,b.y-a.y);total+=len;
    if((a.x>left&&a.x<right&&a.y>top&&a.y<bottom)||(b.x>left&&b.x<right&&b.y>top&&b.y<bottom))inside+=len;
  }
  return {total,inside};
}
function symbolicNetworkUseful(feature,kind,coords,extent,m){
  const t=feature?.tags||{},name=String(t.name||t.ref||"").trim(),measure=symbolicSegmentVisibleLengthPx(coords,extent,m);
  if(measure.total<=0)return false;
  const base=kind==="path"?24:kind==="road-minor"?28:kind==="water-minor"?18:kind==="road"||kind==="water"?8:5;
  if(measure.total<base)return false;
  // Une courte branche interne, sans nom ni référence, est souvent une allée,
  // un tronçon partiel ou un drain qui brouille la lecture à cette échelle.
  if(!name&&measure.inside>0&&measure.inside<base*1.8&&["path","road-minor","water-minor"].includes(kind))return false;
  return true;
}
function symbolicNetworkStyle(kind,m){
  const fs=m.fontSize;
  if(explorationsMapStyle()){
    if(kind==="water-major")return {aura:"rgba(104,204,232,.24)",auraWidth:Math.max(5,fs*.50),color:"#359fc3",outer:"rgba(244,251,242,.90)",width:Math.max(2.5,fs*.25),casing:Math.max(1.25,fs*.11),highlight:"rgba(237,253,255,.7)",highlightWidth:Math.max(.6,fs*.05),dash:[]};
    if(kind==="water")return {aura:null,auraWidth:0,color:"#4daece",outer:"rgba(244,251,242,.80)",width:Math.max(1.7,fs*.17),casing:Math.max(.9,fs*.08),highlight:"rgba(237,253,255,.55)",highlightWidth:Math.max(.45,fs*.035),dash:[]};
    if(kind==="water-minor")return {aura:null,auraWidth:0,color:"rgba(67,155,190,.82)",outer:null,width:Math.max(.85,fs*.07),casing:0,highlight:null,dash:[]};
    if(kind==="road-major")return {aura:null,auraWidth:0,color:"#c07d4e",outer:"rgba(255,248,220,.96)",width:Math.max(2.25,fs*.21),casing:Math.max(1.5,fs*.14),highlight:"rgba(255,236,185,.55)",highlightWidth:Math.max(.48,fs*.04),dash:[]};
    if(kind==="road")return {aura:null,auraWidth:0,color:"#d19c61",outer:"rgba(255,248,220,.92)",width:Math.max(1.45,fs*.14),casing:Math.max(.9,fs*.08),highlight:"rgba(255,242,204,.45)",highlightWidth:Math.max(.35,fs*.03),dash:[]};
    if(kind==="road-minor")return {aura:null,auraWidth:0,color:"rgba(167,126,82,.78)",outer:null,width:Math.max(.75,fs*.06),casing:0,highlight:null,dash:[3,3]};
    return {aura:null,auraWidth:0,color:"rgba(132,105,70,.72)",outer:null,width:Math.max(.68,fs*.055),casing:0,highlight:null,dash:[2,5]};
  }
  if(kind==="water-major")return {aura:"rgba(70,218,245,.16)",auraWidth:Math.max(6.0,fs*.56),color:"#64e3f8",outer:"rgba(1,18,24,.97)",width:Math.max(2.5,fs*.255),casing:Math.max(2.0,fs*.19),highlight:"rgba(219,252,255,.52)",highlightWidth:Math.max(.58,fs*.048),dash:[]};
  if(kind==="water")return {aura:"rgba(64,201,229,.10)",auraWidth:Math.max(4.2,fs*.40),color:"#50cde4",outer:"rgba(1,18,24,.93)",width:Math.max(1.7,fs*.175),casing:Math.max(1.35,fs*.13),highlight:"rgba(197,247,252,.32)",highlightWidth:Math.max(.46,fs*.038),dash:[]};
  if(kind==="water-minor")return {aura:null,auraWidth:0,color:"rgba(96,196,216,.74)",outer:null,width:Math.max(.86,fs*.076),casing:0,highlight:null,dash:[]};
  if(kind==="road-major")return {aura:"rgba(240,211,116,.085)",auraWidth:Math.max(5.0,fs*.46),color:"#e8cf86",outer:"rgba(19,15,7,.98)",width:Math.max(2.2,fs*.22),casing:Math.max(1.8,fs*.175),highlight:"rgba(255,246,206,.34)",highlightWidth:Math.max(.48,fs*.042),dash:[]};
  if(kind==="road")return {aura:"rgba(220,192,102,.045)",auraWidth:Math.max(3.2,fs*.29),color:"#cbb474",outer:"rgba(18,15,8,.94)",width:Math.max(1.45,fs*.14),casing:Math.max(1.05,fs*.095),highlight:"rgba(255,239,181,.20)",highlightWidth:Math.max(.35,fs*.03),dash:[]};
  if(kind==="road-minor")return {aura:null,auraWidth:0,color:"rgba(180,163,113,.52)",outer:null,width:Math.max(.73,fs*.061),casing:0,highlight:null,dash:[3,3]};
  return {aura:null,auraWidth:0,color:"rgba(164,153,115,.49)",outer:null,width:Math.max(.63,fs*.053),casing:0,highlight:null,dash:[2,5]};
}
function symbolicDrawOsmNetworks(ctx,grid,m){
  if(!state.osm)return 0;
  const groups=new Map();let count=0;
  for(const item of symbolicNetworkCandidates(grid.extent)){
    const {feature,kind}=item,coords=symbolicSimplifiedCoords(feature,kind);
    if(coords.length<2||!symbolicNetworkUseful(feature,kind,coords,grid.extent,m))continue;
    if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push({coords,feature});count++;
  }
  const order=["water-minor","water","water-major","path","road-minor","road","road-major"];
  for(const kind of order){
    const paths=groups.get(kind);if(!paths?.length)continue;
    const style=symbolicNetworkStyle(kind,m);ctx.save();ctx.lineCap=kind==="path"?"butt":"round";ctx.lineJoin="round";
    if(style.aura){
      ctx.strokeStyle=style.aura;ctx.lineWidth=style.auraWidth;ctx.setLineDash([]);ctx.lineDashOffset=0;
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    if(style.outer){
      ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+style.casing*2;ctx.setLineDash([]);
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);
    for(const item of paths){
      // Phase stable par identifiant : les pointillés ne changent plus de motif
      // à chaque mouvement de la fenêtre.
      ctx.lineDashOffset=style.dash.length?-(symbolicPoiHash(item.feature.id||"")%17):0;
      if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke();
    }
    if(style.highlight){
      ctx.strokeStyle=style.highlight;ctx.lineWidth=style.highlightWidth;ctx.setLineDash([]);ctx.lineDashOffset=0;
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.restore();
  }
  return count;
}

function symbolicDrawGridTerrain(ctx,grid,m){
  for(let y=0;y<CONFIG.gridH;y++){
    let start=0,last="";
    const flush=x=>{if(last)ctx.fillRect(m.padding+start*m.cellW,m.padding+y*m.cellH,(x-start)*m.cellW+.5,m.cellH+.5)};
    for(let x=0;x<=CONFIG.gridW;x++){
      const style=x<CONFIG.gridW?symbolicTerrainStyle(grid.grid[y][x]):null,fill=style?.fill||"";
      if(x===0){last=fill;start=0;ctx.fillStyle=fill}else if(fill!==last){flush(x);last=fill;start=x;ctx.fillStyle=fill}
    }
  }
  if(state.layerRelief){
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const c=grid.grid[y][x],shade=Number(c?.shade||0);if(!Number.isFinite(c?.elev)||Math.abs(shade)<.02)continue;
      const a=Math.min(.19,Math.abs(shade)*.018);
      ctx.fillStyle=shade>0?`rgba(210,231,211,${a})`:`rgba(0,8,4,${a*.82})`;
      ctx.fillRect(m.padding+x*m.cellW,m.padding+y*m.cellH,m.cellW+.4,m.cellH+.4);
    }
  }
  // Trame d'arpentage indépendante des cellules de terrain.
  ctx.save();ctx.strokeStyle="rgba(178,202,183,.045)";ctx.lineWidth=.5;ctx.beginPath();
  const stepX=Math.max(6,Math.round(CONFIG.gridW/12)),stepY=Math.max(6,Math.round(CONFIG.gridH/10));
  for(let x=stepX;x<CONFIG.gridW;x+=stepX){const px=m.padding+x*m.cellW;ctx.moveTo(px,m.padding);ctx.lineTo(px,m.height-m.padding)}
  for(let y=stepY;y<CONFIG.gridH;y+=stepY){const py=m.padding+y*m.cellH;ctx.moveTo(m.padding,py);ctx.lineTo(m.width-m.padding,py)}
  ctx.stroke();ctx.restore();
}
function symbolicDrawCadastre(ctx,grid,m){
  const detail=semanticZoom();
  if(state.layerParcels&&detail.parcels){
    ctx.save();ctx.strokeStyle="rgba(183,197,183,.19)";ctx.lineWidth=Math.max(.45,m.fontSize*.035);ctx.setLineDash([3,4]);
    for(const indexed of queryCadastreFeatures(grid.extent,"parcel")){if(symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))ctx.stroke()}
    ctx.restore();
  }
  const cadastre=queryCadastreFeatures(grid.extent,"building"),useCadastre=state.layerCadastreBuildings&&detail.cadastreBuildings&&cadastre.length;
  if(useCadastre){
    ctx.save();ctx.translate(Math.max(.8,m.fontSize*.055),Math.max(1,m.fontSize*.07));ctx.fillStyle="rgba(1,8,5,.42)";
    for(const indexed of cadastre){if(symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))ctx.fill()}ctx.restore();
    ctx.save();ctx.fillStyle=explorationsMapStyle()?"#f5e8cf":"#e4dcc2";ctx.strokeStyle=explorationsMapStyle()?"#b88f70":"#a69d7f";ctx.lineWidth=Math.max(.55,m.fontSize*.045);
    for(const indexed of cadastre){if(!symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))continue;ctx.fill();ctx.stroke()}ctx.restore();
  }
  // Évite le double contour OSM + cadastre, particulièrement brouillon dans les
  // lotissements. OSM ne sert de repli que si le cadastre n'est pas disponible.
  if(!useCadastre&&state.osm&&detail.osmBuildings){
    ctx.save();ctx.fillStyle=explorationsMapStyle()?"rgba(245,232,207,.94)":"rgba(229,220,194,.88)";ctx.strokeStyle=explorationsMapStyle()?"rgba(184,143,112,.94)":"rgba(157,148,116,.94)";ctx.lineWidth=Math.max(.5,m.fontSize*.04);
    for(const f of queryOsmFeatures(grid.extent)){if(!f.tags?.building||!f.closed)continue;if(!symbolicTraceCoords(ctx,f.coords,grid.extent,m,true))continue;ctx.fill();ctx.stroke()}ctx.restore();
  }
}
function symbolicDrawInstrumentFrame(ctx,m){
  const x=m.padding-.5,y=m.padding-.5,w=Math.max(1,CONFIG.gridW*m.cellW+1),h=Math.max(1,CONFIG.gridH*m.cellH+1);
  if(explorationsMapStyle()){
    ctx.save();ctx.strokeStyle="rgba(255,248,218,.96)";ctx.lineWidth=Math.max(1.2,m.fontSize*.085);symbolicRoundRect(ctx,x,y,w,h,Math.max(5,m.fontSize*.55));ctx.stroke();
    const r=Math.max(8,m.fontSize*.72),cx=x+w-10,cy=y+10;ctx.fillStyle="rgba(255,249,223,.90)";ctx.strokeStyle="#3d7183";ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#d45f52";ctx.beginPath();ctx.moveTo(cx,cy-r*.72);ctx.lineTo(cx-r*.22,cy+r*.16);ctx.lineTo(cx+r*.22,cy+r*.16);ctx.closePath();ctx.fill();ctx.fillStyle="#3c7890";ctx.beginPath();ctx.moveTo(cx,cy+r*.72);ctx.lineTo(cx-r*.22,cy-r*.16);ctx.lineTo(cx+r*.22,cy-r*.16);ctx.closePath();ctx.fill();ctx.restore();return;
  }
  ctx.save();ctx.strokeStyle="rgba(222,207,154,.32)";ctx.lineWidth=.8;ctx.strokeRect(x,y,w,h);ctx.strokeStyle="rgba(121,226,171,.13)";ctx.setLineDash([1,5]);ctx.strokeRect(x+3,y+3,Math.max(1,w-6),Math.max(1,h-6));ctx.setLineDash([]);
  const len=Math.max(8,m.fontSize*.78);ctx.strokeStyle="rgba(236,221,169,.56)";ctx.lineWidth=1.1;ctx.beginPath();
  for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){ctx.moveTo(cx,cy+sy*len);ctx.lineTo(cx,cy);ctx.lineTo(cx+sx*len,cy)}ctx.stroke();
  // Petits repères d'arpentage réguliers, sans ajout d'information fictive.
  ctx.strokeStyle="rgba(222,207,154,.22)";ctx.lineWidth=.7;ctx.beginPath();
  for(let i=1;i<10;i++){
    const px=x+w*i/10,py=y+h*i/10,t=i===5?5:3;
    ctx.moveTo(px,y);ctx.lineTo(px,y+t);ctx.moveTo(px,y+h);ctx.lineTo(px,y+h-t);
    ctx.moveTo(x,py);ctx.lineTo(x+t,py);ctx.moveTo(x+w,py);ctx.lineTo(x+w-t,py);
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawCartographicFinish(ctx,m){
  ctx.save();
  if(explorationsMapStyle()){
    const paper=ctx.createLinearGradient(0,0,m.width,m.height);paper.addColorStop(0,"rgba(255,248,217,.09)");paper.addColorStop(.55,"rgba(255,255,255,.015)");paper.addColorStop(1,"rgba(65,126,150,.075)");ctx.fillStyle=paper;ctx.fillRect(0,0,m.width,m.height);
    // Grain fixe : il donne un peu de matière au carnet sans animation, image ou
    // recalcul coûteux. La graine dépend uniquement de la maille et du niveau.
    let seed=((CONFIG.gridW*73856093)^(CONFIG.gridH*19349663)^(state.zoomIndex*83492791))>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    const specks=Math.min(260,Math.max(70,Math.round((m.width*m.height)/1800)));
    ctx.fillStyle="rgba(83,111,91,.055)";
    for(let i=0;i<specks;i++){const x=random()*m.width,y=random()*m.height,r=random()<.82?.42:.8;ctx.fillRect(x,y,r,r)}
    ctx.strokeStyle="rgba(112,83,49,.035)";ctx.lineWidth=.5;
    for(let i=0;i<18;i++){const x=random()*m.width,y=random()*m.height,len=3+random()*9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y+(random()-.5)*1.8);ctx.stroke()}
    const vignette=ctx.createRadialGradient(m.width*.5,m.height*.46,Math.min(m.width,m.height)*.28,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.74);vignette.addColorStop(.7,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(29,75,86,.18)");ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);ctx.restore();return;
  }
  const vignette=ctx.createRadialGradient(m.width*.48,m.height*.44,Math.min(m.width,m.height)*.14,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.72);
  vignette.addColorStop(0,"rgba(92,255,184,.022)");vignette.addColorStop(.66,"rgba(0,0,0,.03)");vignette.addColorStop(1,"rgba(0,5,3,.25)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);
  const wash=ctx.createLinearGradient(0,0,m.width,m.height);
  wash.addColorStop(0,"rgba(91,255,190,.024)");wash.addColorStop(.5,"rgba(255,223,135,.010)");wash.addColorStop(1,"rgba(65,205,255,.020)");
  ctx.fillStyle=wash;ctx.fillRect(0,0,m.width,m.height);
  ctx.restore();
}
function drawSymbolicCanvasMap(grid=state.lastGrid,reason="direct"){
  if(!CANVAS_RENDERER||!grid||!els.mapCanvas)return 0;
  const m=syncCanvasSize();if(!m)return 0;const frame=beginCanvasPipeline("symbolic",reason);canvasRuntime.lastGrid=grid;
  const ctx=canvasContext();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;
  if(currentDepth()<0){
    const count=drawSymbolicUndergroundMap(grid,m,ctx);symbolicDrawCartographicFinish(ctx,m);finalizeCanvasFrame(ctx,m,"symbolic",reason,frame);ctx.globalAlpha=1;ctx.shadowBlur=0;return count
  }
  const mapCore=getComputedStyle(document.body).getPropertyValue("--map-core").trim()||"#06110c";ctx.fillStyle=mapCore;ctx.fillRect(0,0,m.width,m.height);
  symbolicDrawGridTerrain(ctx,grid,m);symbolicDrawOsmPolygons(ctx,grid,m);symbolicDrawPatterns(ctx,grid,m);symbolicDrawCadastre(ctx,grid,m);
  const networkCount=symbolicDrawOsmNetworks(ctx,grid,m);if(!networkCount)symbolicDrawFallbackGridLines(ctx,grid,m);
  symbolicDrawInstrumentFrame(ctx,m);const count=symbolicDrawPoisAndLabels(ctx,grid,m);symbolicDrawCartographicFinish(ctx,m);finalizeCanvasFrame(ctx,m,"symbolic",reason,frame);
  ctx.globalAlpha=1;ctx.shadowBlur=0;return count;
}

function drawCanvasMap(grid=state.lastGrid,reason="direct"){
  document.body.dataset.effectiveRender=effectiveRenderMode();
  return effectiveRenderMode()==="symbolic"?drawSymbolicCanvasMap(grid,reason):drawAsciiCanvasMap(grid,reason);
}
function updateRenderModeControls(){
  const symbolic=state.renderMode==="symbolic",underground=currentDepth()!==0;
  document.body.dataset.effectiveRender=effectiveRenderMode();
  els.renderModeSymbolic?.classList.toggle("active",symbolic);els.renderModeAscii?.classList.toggle("active",!symbolic);
  els.renderModeSymbolic?.setAttribute("aria-pressed",String(symbolic));els.renderModeAscii?.setAttribute("aria-pressed",String(!symbolic));
  els.renderModeSymbolic?.setAttribute("aria-disabled","false");
  if(els.renderModeHelp)els.renderModeHelp.textContent=EXPLORATIONS_EDITION?(symbolic?(underground?"Coupe du sous-sol : les tracés clairs sont documentés ou supposés selon leur couleur et leur niveau de confiance.":"Carte illustrée : les couleurs et pictogrammes aident à repérer les lieux, l’eau, le vivant et les traces humaines."):(underground?"Mode repères : une lecture plus sobre de la coupe, avec les mêmes informations.":"Mode repères : la carte s’écrit avec des signes compacts, utiles pour observer les détails.")):(symbolic?(underground?"Coupe symbolique active : volumes, conduits, murs, piliers et eau supposée suivent le même contrat de profondeur et de confiance que l’ASCII.":"Surface symbolique active : les repères utilisent des balises géographiques stables, une seule icône par lieu et des cartouches documentaires séparés. Routes et cours d’eau utilisent une hiérarchie nettoyée : doublons, aires routières et branchements utilitaires parasites sont filtrés au rendu."):(underground?"Coupe ASCII active : fond minéral calme, surface fantôme simplifiée et mêmes niveaux de confiance que le mode symbolique.":"Rendu ASCII historique actif en surface."));
}
function setRenderMode(mode){
  state.renderMode=mode==="ascii"?"ascii":"symbolic";try{localStorage.setItem(RENDER_MODE_PREF_KEY,state.renderMode)}catch{};canvasRuntime.styleCache.clear();render("render-mode");
}
function canvasDisplayMetrics(){
  if(!CANVAS_RENDERER||!els.mapCanvas)return null;
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas.getBoundingClientRect();
  if(!m||!r.width||!r.height)return null;
  // Le bitmap peut être redimensionné par la mise en page, le zoom navigateur ou
  // une transformation temporaire. Tous les calculs interactifs doivent employer
  // la même géométrie réellement affichée, jamais les dimensions théoriques seules.
  const scaleX=m.width?Math.abs(r.width/m.width):1;
  const scaleY=m.height?Math.abs(r.height/m.height):1;
  return {
    m,r,scaleX,scaleY,
    paddingX:m.padding*scaleX,paddingY:m.padding*scaleY,
    cellW:m.cellW*scaleX,cellH:m.cellH*scaleY
  };
}
function canvasCellRect(x,y){
  const d=canvasDisplayMetrics();if(!d)return null;
  const left=d.r.left+d.paddingX+x*d.cellW,top=d.r.top+d.paddingY+y*d.cellH;
  return {left,top,width:d.cellW,height:d.cellH,right:left+d.cellW,bottom:top+d.cellH};
}
function positionCanvasMarker(marker,x,y,visible=true){
  if(!marker||!CANVAS_RENDERER||!els.viewport){return}
  if(!visible){marker.classList.remove("visible");return}
  const r=canvasCellRect(x,y),vr=els.viewport.getBoundingClientRect();if(!r){marker.classList.remove("visible");return}
  marker.style.left=`${r.left-vr.left+els.viewport.scrollLeft}px`;marker.style.top=`${r.top-vr.top+els.viewport.scrollTop}px`;
  marker.style.width=`${r.width}px`;marker.style.height=`${r.height}px`;marker.classList.add("visible");
}
