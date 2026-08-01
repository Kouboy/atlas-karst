const SESSION_CACHE_LIMITS={canvasStyles:192,hypotheses:480,relations:240,osmStorage:18};
const sessionHealthRuntime={ready:true,bound:false,maintenanceRuns:0,scheduledRuns:0,cacheEvictions:0,storageEvictions:0,suspensions:0,resumes:0,transientClears:0,lastReason:"initialisation",lastRunAt:0};
let sessionMaintenanceHandle=0,sessionMaintenanceKind="";

function trimSessionMap(map,limit){
  let removed=0;
  while(map.size>limit){const oldest=map.keys().next().value;map.delete(oldest);removed++}
  return removed;
}
function pruneOsmStorage(limit=SESSION_CACHE_LIMITS.osmStorage){
  const entries=[];let removed=0;
  try{
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index);
      if(!key?.startsWith("atlas-karst-osm-v010d-"))continue;
      let savedAt=0;
      try{savedAt=Number(JSON.parse(localStorage.getItem(key)||"{}").savedAt)||0}catch{}
      entries.push({key,savedAt});
    }
    entries.sort((a,b)=>b.savedAt-a.savedAt);
    for(const entry of entries.slice(limit)){localStorage.removeItem(entry.key);removed++}
  }catch{}
  return removed;
}
function pruneOperationSoundWatches(now=Date.now()){
  let removed=0;
  for(const [status,watch] of operationSoundWatches){if(!status.isConnected||now>watch.until){operationSoundWatches.delete(status);removed++}}
  return removed;
}
function runSessionMaintenance(reason="manual"){
  if(sessionMaintenanceHandle){
    if(sessionMaintenanceKind==="idle"&&typeof cancelIdleCallback==="function")cancelIdleCallback(sessionMaintenanceHandle);else clearTimeout(sessionMaintenanceHandle);
    sessionMaintenanceHandle=0;sessionMaintenanceKind="";
  }
  const cacheEvictions=trimSessionMap(canvasRuntime.styleCache,SESSION_CACHE_LIMITS.canvasStyles)
    +trimSessionMap(hypothesisModelCache,SESSION_CACHE_LIMITS.hypotheses)
    +trimSessionMap(relationRuntime.cache,SESSION_CACHE_LIMITS.relations)
    +pruneOperationSoundWatches();
  const storageEvictions=pruneOsmStorage();
  sessionHealthRuntime.maintenanceRuns++;sessionHealthRuntime.cacheEvictions+=cacheEvictions;sessionHealthRuntime.storageEvictions+=storageEvictions;
  sessionHealthRuntime.lastReason=reason;sessionHealthRuntime.lastRunAt=performance.now();
  return {cacheEvictions,storageEvictions};
}
function scheduleSessionMaintenance(reason="activity"){
  if(sessionMaintenanceHandle||performance.now()-sessionHealthRuntime.lastRunAt<30000)return;
  sessionHealthRuntime.scheduledRuns++;sessionHealthRuntime.lastReason=`planifié : ${reason}`;
  const run=()=>{sessionMaintenanceHandle=0;sessionMaintenanceKind="";runSessionMaintenance(reason)};
  if(typeof requestIdleCallback==="function"){sessionMaintenanceKind="idle";sessionMaintenanceHandle=requestIdleCallback(run,{timeout:1800})}
  else{sessionMaintenanceKind="timer";sessionMaintenanceHandle=setTimeout(run,900)}
}
function clearTransientSessionResources(){
  clearTimeout(osmEnsureTimer);osmEnsureTimer=0;
  clearTimeout(navigationRenderTimer);navigationRenderTimer=0;
  clearZoomTransition();zoomFxTimer=0;
  clearTimeout(zoomCorrectionTimer);zoomCorrectionTimer=0;
  hideHover();hoverDwellTimer=0;
  clearTimeout(poiFeedbackTimer);poiFeedbackTimer=0;pendingPoiFeedback=null;
  clearTimeout(readoutFitTimer);readoutFitTimer=0;
  clearTimeout(frameFitTimer);frameFitTimer=0;
  clearTimeout(depthTransitionTimer);depthTransitionTimer=0;if(els.depthTransition)els.depthTransition.className="depth-transition";
  clearTimeout(renderFxIdleTimer);renderFxIdleTimer=0;
  clearTimeout(dataRenderRuntime.timer);dataRenderRuntime.timer=0;
  dataRenderRuntime.reasons.clear();dataRenderRuntime.pendingRequests=0;dataRenderRuntime.batchStarted=0;
  clearTimeout(relationRuntime.timer);relationRuntime.timer=0;state.activeRelation=null;
  if(frameFitRaf){cancelAnimationFrame(frameFitRaf);frameFitRaf=0}
  if(scheduledRenderFrame){cancelAnimationFrame(scheduledRenderFrame);scheduledRenderFrame=0;scheduledRenderReason=""}
  clearPanPreview();activeMapSurface()?.classList.remove("dragging","pinching");els.viewport?.classList.remove("panning");
  touchPointers.clear();drag=null;pinch=null;pinchConsumed=false;osmEnsurePending=false;
  state.osmAbortController?.abort();
  sessionHealthRuntime.transientClears++;
}
function suspendSessionResources(reason="hidden",{release=false}={}){
  sessionHealthRuntime.suspensions++;sessionHealthRuntime.lastReason=reason;
  retroAudio.suspend();setRenderFxActivity(false,reason);runSessionMaintenance(reason);
  if(release)clearTransientSessionResources();
}
function resumeSessionResources(reason="visible",{restore=false}={}){
  sessionHealthRuntime.resumes++;sessionHealthRuntime.lastReason=reason;
  if(restore){render("session-restore");scheduleOsmEnsure(120)}
  else pulseRenderFxActivity(650,reason);
}
function bindSessionHealth(){
  if(sessionHealthRuntime.bound)return;
  sessionHealthRuntime.bound=true;
  window.addEventListener("pagehide",event=>suspendSessionResources("pagehide",{release:true,persisted:!!event.persisted}));
  window.addEventListener("pageshow",event=>{if(event.persisted)resumeSessionResources("pageshow",{restore:true})});
}
