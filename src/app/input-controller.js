const inputRuntime={bound:false,panCount:0,pinchZoomCount:0,wheelZoomCount:0,lastGesture:"—"};
let navigationRenderTimer=0;
let zoomFxTimer=0,zoomCorrectionTimer=0,zoomCorrectionSerial=0;
let suppressClickUntil=0,lastWheelZoomAt=0;
let drag=null;
const touchPointers=new Map();
let pinch=null,pinchConsumed=false,lastPinchZoomAt=0;

function recordInputGesture(kind){inputRuntime.lastGesture=kind}
function scheduleNavigationRender(delay=34){
  clearTimeout(navigationRenderTimer);
  navigationRenderTimer=setTimeout(()=>{navigationRenderTimer=0;render()},delay);
}
function moveCenter(dx,dy,fraction=null){
  retroAudio.play(dx||dy?"button":"click");
  const z=currentZoom(),step=fraction??z.pan;
  const dLat=z.heightKm/111.32*step*dy;
  const dLon=z.widthKm/kmPerLon(state.center.lat)*step*dx;
  state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},z);
  recordInputGesture("navigation");scheduleNavigationRender();
}
function setDepthIndex(i){
  clearActiveRelation();
  const previous=state.depthIndex,next=clamp(i,0,CONFIG.depths.length-1);
  if(next===previous)return;
  state.depthIndex=next;
  retroAudio.play(next>previous?"depthDown":"depthUp");
  playDepthTransition(next>previous?"down":"up");
  recordInputGesture("profondeur");closeSelectionAssist();render();
}
function clearZoomTransition(){
  clearTimeout(zoomFxTimer);
  const overlay=els.zoomTransitionCanvas;
  if(overlay){overlay.className="zoom-transition-canvas";overlay.style.cssText=""}
  els.viewport?.classList.remove("zoom-feedback");
}
function beginZoomTransition(direction,clientPoint=null){
  if(!CANVAS_RENDERER||!els.zoomTransitionCanvas||!els.mapCanvas||matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
  const source=els.mapCanvas,overlay=els.zoomTransitionCanvas;
  if(!source.width||!source.height)return;
  clearZoomTransition();
  const vr=els.viewport.getBoundingClientRect(),sr=source.getBoundingClientRect();
  if(!sr.width||!sr.height)return;
  overlay.width=source.width;overlay.height=source.height;
  const ctx=overlay.getContext("2d",{alpha:false});
  ctx.clearRect(0,0,overlay.width,overlay.height);ctx.drawImage(source,0,0);
  const left=Math.round(sr.left-vr.left+(els.viewport.scrollLeft||0));
  const top=Math.round(sr.top-vr.top+(els.viewport.scrollTop||0));
  overlay.style.left=`${left}px`;overlay.style.top=`${top}px`;
  overlay.style.width=`${Math.round(sr.width)}px`;overlay.style.height=`${Math.round(sr.height)}px`;
  const cx=Number.isFinite(clientPoint?.clientX)?clientPoint.clientX:vr.left+vr.width/2;
  const cy=Number.isFinite(clientPoint?.clientY)?clientPoint.clientY:vr.top+vr.height/2;
  const ox=clamp((cx-sr.left)/Math.max(1,sr.width),0,1),oy=clamp((cy-sr.top)/Math.max(1,sr.height),0,1);
  overlay.style.transformOrigin=`${(ox*100).toFixed(2)}% ${(oy*100).toFixed(2)}%`;
  overlay.className=`zoom-transition-canvas active ${direction==="in"?"zoom-in":"zoom-out"}`;
  els.viewport.style.setProperty("--zoom-origin-x",`${clamp((cx-vr.left)/Math.max(1,vr.width),0,1)*100}%`);
  els.viewport.style.setProperty("--zoom-origin-y",`${clamp((cy-vr.top)/Math.max(1,vr.height),0,1)*100}%`);
  els.viewport.classList.remove("zoom-feedback");void els.viewport.offsetWidth;els.viewport.classList.add("zoom-feedback");
  zoomFxTimer=setTimeout(clearZoomTransition,360);
}
function scheduleZoomAnchorCorrection(focus,clientX,clientY){
  if(!focus||!Number.isFinite(clientX)||!Number.isFinite(clientY))return;
  const serial=++zoomCorrectionSerial;
  clearTimeout(zoomCorrectionTimer);
  zoomCorrectionTimer=setTimeout(()=>{
    if(serial!==zoomCorrectionSerial||!state.lastGrid)return;
    const mapped=mapPositionFromClient(clientX,clientY);if(!mapped)return;
    const dLat=focus.lat-mapped.coord.lat,dLon=focus.lon-mapped.coord.lon;
    if(Math.abs(dLat)<1e-8&&Math.abs(dLon)<1e-8)return;
    state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},currentZoom());
    render();
  },82);
}
function setZoomIndex(i,focus=null,screen=null,gesture="zoom"){
  const next=clamp(i,0,CONFIG.zooms.length-1);
  if(next===state.zoomIndex)return;
  const direction=next>state.zoomIndex?"in":"out";
  beginZoomTransition(direction,screen);
  retroAudio.play(direction==="in"?"zoomIn":"zoomOut");
  state.zoomIndex=next;
  if(focus&&screen){
    const z=currentZoom(),heightDeg=z.heightKm/111.32,widthDeg=z.widthKm/kmPerLon(focus.lat);
    state.center={lat:focus.lat+(screen.fy-.5)*heightDeg,lon:focus.lon-(screen.fx-.5)*widthDeg};
  }
  state.center=clampCenter(state.center,currentZoom());
  recordInputGesture(gesture);render();
  if(focus&&Number.isFinite(screen?.clientX)&&Number.isFinite(screen?.clientY))scheduleZoomAnchorCorrection(focus,screen.clientX,screen.clientY);
}
function viewportZoomAnchor(){
  const surface=activeMapSurface();
  if(!state.lastGrid||!els.viewport||!surface)return null;
  const vr=effectiveMapViewportRect()||els.viewport.getBoundingClientRect(),mr=surface.getBoundingClientRect();
  const clientX=clamp(vr.centerX??(vr.left+vr.width/2),mr.left+1,mr.right-1);
  const clientY=clamp(vr.centerY??(vr.top+vr.height/2),mr.top+1,mr.bottom-1);
  const pos=mapPositionFromClient(clientX,clientY);
  return pos?{...pos,clientX,clientY}:null;
}
function setZoomFromViewport(i){
  const anchor=viewportZoomAnchor();
  setZoomIndex(i,anchor?.coord,anchor?{fx:anchor.fx,fy:anchor.fy,clientX:anchor.clientX,clientY:anchor.clientY}:null);
}
function recenterOnHouse(reason="home"){
  clearActiveRelation();
  state.center=clampCenter({...CONFIG.house},currentZoom());
  state.selectedCavity=null;state.selectedCell=null;
  recordInputGesture("recentrage");render(reason);
}

function applyPanPreview(dx,dy){
  const surface=activeMapSurface();if(!surface)return;
  const safeX=clamp(Number(dx)||0,-window.innerWidth*1.5,window.innerWidth*1.5);
  const safeY=clamp(Number(dy)||0,-window.innerHeight*1.5,window.innerHeight*1.5);
  const transform=`translate3d(${safeX.toFixed(2)}px,${safeY.toFixed(2)}px,0)`;
  surface.style.transform=transform;
  if(CANVAS_RENDERER&&els.renderFxLayer)els.renderFxLayer.style.transform=transform;
}
function clearPanPreview(){
  const surface=activeMapSurface();if(surface)surface.style.transform="";
  if(els.renderFxLayer)els.renderFxLayer.style.transform="translateZ(0)";
}
function panGeographicPixelSpan(){
  if(CANVAS_RENDERER){
    const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas?.getBoundingClientRect();
    if(!m||!r)return {width:1,height:1};
    const scaleX=m.width?Math.abs(r.width/m.width):1,scaleY=m.height?Math.abs(r.height/m.height):1;
    return {width:Math.max(1,(CONFIG.gridW-1)*m.cellW*scaleX),height:Math.max(1,(CONFIG.gridH-1)*m.cellH*scaleY)};
  }
  const m=mapGridMetrics();
  return m?{width:Math.max(1,(CONFIG.gridW-1)*m.pitchX),height:Math.max(1,(CONFIG.gridH-1)*m.pitchY)}:{width:1,height:1};
}
function isPanPointer(ev){return ev.isPrimary!==false&&(ev.pointerType!=="mouse"||ev.button===0)}
function pointerDistance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function beginPinch(){
  if(touchPointers.size<2||state.placingHouse)return false;
  const pair=[...touchPointers.entries()].slice(0,2),a=pair[0][1],b=pair[1][1];
  const distance=pointerDistance(a,b);if(distance<14)return false;
  if(drag){drag=null;clearPanPreview();activeMapSurface()?.classList.remove("dragging")}
  pinch={ids:[pair[0][0],pair[1][0]],distance};
  pinchConsumed=true;suppressClickUntil=Date.now()+900;
  activeMapSurface()?.classList.add("pinching");els.viewport.classList.add("panning");
  return true;
}
function handlePinchMove(ev){
  if(!pinch)return false;
  const a=touchPointers.get(pinch.ids[0]),b=touchPointers.get(pinch.ids[1]);
  if(!a||!b)return false;
  const distance=pointerDistance(a,b);if(!Number.isFinite(distance)||distance<8)return true;
  const ratio=distance/pinch.distance,now=performance.now();
  if(now-lastPinchZoomAt<130)return true;
  const dir=ratio>=1.20?1:ratio<=.84?-1:0;if(!dir)return true;
  const next=clamp(state.zoomIndex+dir,0,CONFIG.zooms.length-1);
  pinch.distance=distance;lastPinchZoomAt=now;
  if(next===state.zoomIndex)return true;
  const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,pos=mapPositionFromClient(midX,midY);
  if(pos){inputRuntime.pinchZoomCount++;setZoomIndex(next,pos.coord,{fx:pos.fx,fy:pos.fy,clientX:midX,clientY:midY},"pincement")}
  return true;
}
function handleMapClick(ev){
  if(Date.now()<suppressClickUntil)return;
  if(state.placingHouse){const pos=eventMapPosition(ev);if(pos)saveHousePosition(pos.coord,"placement manuel sur la grille");return}
  const pos=eventMapPosition(ev);if(!pos||!state.lastGrid)return;
  if(effectiveRenderMode()==="symbolic"){
    const hit=symbolicPoiHitFromClient(ev.clientX,ev.clientY,1.18);if(hit&&selectSymbolicPoi(hit.poi))return;
  }
  const radius=[1,1,1,2,2,3][state.zoomIndex]||1;
  selectGridCell(pos.x,pos.y,{assist:effectiveRenderMode()==="symbolic",assistRadius:radius,note:"Sélection directe",showAssist:false});
}
function handleMapDoubleClick(ev){
  ev.preventDefault();if(state.placingHouse)return;
  const pos=eventMapPosition(ev);if(!pos)return;
  state.center=clampCenter(pos.coord,currentZoom());
  if(state.zoomIndex<CONFIG.zooms.length-1){beginZoomTransition("in",{clientX:ev.clientX,clientY:ev.clientY});retroAudio.play("zoomIn");state.zoomIndex++}
  state.center=clampCenter(state.center,currentZoom());recordInputGesture("double-clic");render();
}
function handleMapWheel(ev){
  if(Math.abs(ev.deltaY)<2)return;
  ev.preventDefault();
  const now=performance.now();if(now-lastWheelZoomAt<120)return;
  lastWheelZoomAt=now;
  const pos=eventMapPosition(ev);if(!pos)return;
  inputRuntime.wheelZoomCount++;
  setZoomIndex(state.zoomIndex+(ev.deltaY<0?1:-1),pos.coord,{fx:pos.fx,fy:pos.fy,clientX:ev.clientX,clientY:ev.clientY},"molette");
}
function handleMapPointerDown(ev){
  if(ev.pointerType==="touch"){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size>=2&&beginPinch()){ev.preventDefault();return}
    if(state.placingHouse)return;
  }
  if(!isPanPointer(ev)||state.placingHouse||drag||pinch)return;
  const rect=els.viewport.getBoundingClientRect(),panSpan=panGeographicPixelSpan();
  drag={pointerId:ev.pointerId,pointerType:ev.pointerType||"mouse",x:ev.clientX,y:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,center:{...state.center},extent:extentFor(),rect:{width:rect.width,height:rect.height},panSpan,moved:false,dx:0,dy:0};
  try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
  activeMapSurface()?.classList.add("dragging");els.viewport.classList.add("panning");
  if(ev.pointerType!=="mouse")ev.preventDefault();
}
function handleMapPointerMove(ev){
  if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId)){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(handlePinchMove(ev)){ev.preventDefault();return}
  }
  if(CANVAS_RENDERER&&ev.pointerType==="mouse"&&!drag&&!pinch&&!state.placingHouse){const pos=mapPositionFromClient(ev.clientX,ev.clientY);if(pos)scheduleCanvasHover(pos,ev)}
  if(!drag||ev.pointerId!==drag.pointerId)return;
  drag.lastX=ev.clientX;drag.lastY=ev.clientY;
  const dx=drag.lastX-drag.x,dy=drag.lastY-drag.y,threshold=drag.pointerType==="touch"?8:4;
  if(!drag.moved&&Math.hypot(dx,dy)<=threshold)return;
  if(!drag.moved)retroAudio.panStart();
  drag.moved=true;drag.dx=dx;drag.dy=dy;retroAudio.panMove(dx,dy);
  if(state.selectionAssistVisible)closeSelectionAssist();
  hideHover();ev.preventDefault();applyPanPreview(dx,dy);
}
function endDrag(ev){
  if(!drag||ev.pointerId!==drag.pointerId)return;
  const current=drag,moved=current.moved;drag=null;
  if(moved){retroAudio.panEnd();suppressClickUntil=Date.now()+700;ev.preventDefault()}
  else if(current.pointerType!=="mouse"&&!state.placingHouse){
    const pos=eventMapPosition(ev);
    if(pos){suppressClickUntil=Date.now()+700;selectGridCell(pos.x,pos.y,{assist:true,assistRadius:state.zoomIndex===CONFIG.zooms.length-1?2:null,note:"Sélection tactile",showAssist:true,confirmIfSame:true});ev.preventDefault()}
  }
  try{activeMapSurface()?.releasePointerCapture?.(current.pointerId)}catch{}
  if(moved&&current.panSpan?.width>0&&current.panSpan?.height>0){
    const finalX=Number.isFinite(current.lastX)?current.lastX:current.x+current.dx;
    const finalY=Number.isFinite(current.lastY)?current.lastY:current.y+current.dy;
    const dx=finalX-current.x,dy=finalY-current.y;
    const latSpan=current.extent.north-current.extent.south,lonSpan=current.extent.east-current.extent.west;
    const candidate={lat:current.center.lat+(dy/current.panSpan.height)*latSpan,lon:current.center.lon-(dx/current.panSpan.width)*lonSpan};
    if(Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lon)){
      state.center=clampCenter(candidate,currentZoom());inputRuntime.panCount++;recordInputGesture("déplacement");render("pan-release");
    }
  }
  clearPanPreview();activeMapSurface()?.classList.remove("dragging");els.viewport.classList.remove("panning");
  if(CANVAS_RENDERER){syncSelectionDom();updateWorldBoundaryFrame()}
}
function finishMapPointer(ev){
  if(ev.pointerType==="touch")touchPointers.delete(ev.pointerId);
  if(pinch||pinchConsumed){
    suppressClickUntil=Date.now()+900;if(ev.cancelable)ev.preventDefault();
    if(pinch&&(!touchPointers.has(pinch.ids[0])||!touchPointers.has(pinch.ids[1]))){pinch=null;activeMapSurface()?.classList.remove("pinching");if(!drag)els.viewport.classList.remove("panning")}
    try{activeMapSurface()?.releasePointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size===0)pinchConsumed=false;
    return;
  }
  endDrag(ev);
}
function handleNavigationKeydown(e){
  const tag=e.target?.tagName?.toLowerCase();
  if(["input","select","textarea","button","a"].includes(tag)||e.target?.isContentEditable)return;
  const k=e.key.toLowerCase(),controlled=["arrowleft","arrowright","arrowup","arrowdown","q","d","z","s","+","-","[","]","h"];
  if(controlled.includes(k)||e.key==="=")e.preventDefault();
  if(k==="arrowleft"||k==="q")moveCenter(-1,0);
  else if(k==="arrowright"||k==="d")moveCenter(1,0);
  else if(k==="arrowup"||k==="z")moveCenter(0,1);
  else if(k==="arrowdown"||k==="s")moveCenter(0,-1);
  else if(e.key==="+"||e.key==="=")setZoomFromViewport(state.zoomIndex+1);
  else if(e.key==="-")setZoomFromViewport(state.zoomIndex-1);
  else if(e.key==="[")setDepthIndex(state.depthIndex-1);
  else if(e.key==="]")setDepthIndex(state.depthIndex+1);
  else if(k==="h"){state.layerHypothesis=!state.layerHypothesis;els.layerHypothesis.checked=state.layerHypothesis;render()}
}
function syncViewportInputOverlays(){
  if(!CANVAS_RENDERER)return;
  syncRenderFxGeometry(canvasRuntime.metrics);syncSelectionDom();
  if(hoverCandidate){
    if(hoverCandidate.poiUid){const poi=normalizedPoiByUid(hoverCandidate.poiUid);if(poi&&state.lastGrid){const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);positionCanvasMarker(els.canvasHoverMarker,p.x,p.y,true)}}
    else{const [x,y]=hoverCandidate.key.split(":").map(Number);positionCanvasMarker(els.canvasHoverMarker,x,y,true)}
  }
  updateWorldBoundaryFrame();
}
function bindInputController(){
  if(inputRuntime.bound)return;
  const surface=activeMapSurface();if(!surface)throw new Error("Surface cartographique indisponible");
  inputRuntime.bound=true;
  surface.addEventListener("click",handleMapClick);
  surface.addEventListener("dblclick",handleMapDoubleClick);
  els.viewport.addEventListener("wheel",handleMapWheel,{passive:false});
  surface.addEventListener("pointerdown",handleMapPointerDown);
  surface.addEventListener("pointerover",ev=>{if(CANVAS_RENDERER||ev.pointerType!=="mouse"||drag||pinch||state.placingHouse)return;const target=ev.target?.closest?.(".cell");if(target&&els.map.contains(target))scheduleHover(target,ev)});
  surface.addEventListener("pointerout",ev=>{if(CANVAS_RENDERER||ev.pointerType!=="mouse")return;const from=ev.target?.closest?.(".cell"),to=ev.relatedTarget?.closest?.(".cell");if(from&&from!==to)hideHover()});
  surface.addEventListener("pointermove",handleMapPointerMove);
  surface.addEventListener("pointerleave",ev=>{if(!drag&&ev.pointerType==="mouse")hideHover()});
  surface.addEventListener("pointerup",finishMapPointer);
  surface.addEventListener("pointercancel",finishMapPointer);
  surface.addEventListener("lostpointercapture",ev=>{if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId))touchPointers.delete(ev.pointerId);if(pinchConsumed)return;if(drag&&ev.pointerId===drag.pointerId)endDrag(ev)});
  els.viewport.addEventListener("scroll",syncViewportInputOverlays,{passive:true});
  els.selectionUp.addEventListener("click",()=>moveSelection(0,-1));
  els.selectionDown.addEventListener("click",()=>moveSelection(0,1));
  els.selectionLeft.addEventListener("click",()=>moveSelection(-1,0));
  els.selectionRight.addEventListener("click",()=>moveSelection(1,0));
  els.selectionCenter.addEventListener("click",()=>{if(state.selectedCell){state.center=clampCenter({...state.selectedCell.coord},currentZoom());render();closeSelectionAssist()}});
  els.selectionAssistClose.addEventListener("click",closeSelectionAssist);
  els.mapDepthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
  els.mapDepthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
  els.mapZoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
  els.mapZoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
  els.zoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
  els.zoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
  els.depthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
  els.depthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
  document.querySelectorAll("[data-pan-x]").forEach(button=>button.addEventListener("click",()=>moveCenter(+button.dataset.panX,+button.dataset.panY)));
  els.mapHome.addEventListener("click",()=>recenterOnHouse("map-home"));
  els.homeBtn.addEventListener("click",()=>recenterOnHouse("panel-home"));
  window.addEventListener("keydown",handleNavigationKeydown);
}
