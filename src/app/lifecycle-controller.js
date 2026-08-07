const LIFECYCLE_SYNC_SOUND_TARGETS={
  syncOsm:()=>[els.osmStatus],
  syncCultureHeritage:()=>[els.heritageStatus],
  syncWikipediaHeritage:()=>[els.heritageStatus],
  syncCartofriches:()=>[els.cartofrichesStatus],
  syncPiezo:()=>[els.bssStatus],
  retryData:()=>[els.osmStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
};
const LIFECYCLE_QUIET_BUTTON_IDS=new Set([
  "audioToggle","mapZoomOut","mapZoomIn","zoomOut","zoomIn","mapDepthUp","mapDepthDown","depthUp","depthDown",
  "selectionUp","selectionDown","selectionLeft","selectionRight","locateMe","mapLocate","debugToggle","runSelfCheck","exportDebugReport","guidedTourStart","guidedTourPrev","guidedTourNext","guidedTourRecenter","guidedTourStop","observeSurroundings","openCodex","encounterClose"
]);
const lifecycleControllerRuntime={ready:true,bound:false,unlockAttempts:0,visibilityChanges:0,focusChanges:0,motionPreferenceChanges:0,audioActions:0,statusObservers:0,lastEvent:"initialisation"};

function accountLifecycleEvent(event){lifecycleControllerRuntime.lastEvent=event}
function unlockAudioFromGesture(event){
  lifecycleControllerRuntime.unlockAttempts++;accountLifecycleEvent(`déverrouillage ${event?.type||"geste"}`);retroAudio.unlock();
}
function handleLifecycleVisibility(){
  lifecycleControllerRuntime.visibilityChanges++;
  if(document.hidden){accountLifecycleEvent("page masquée");if(typeof autosaveActiveTerritory==="function")autosaveActiveTerritory();suspendSessionResources("hidden")}
  else{accountLifecycleEvent("page visible");resumeSessionResources("visible")}
}
function handleLifecycleBlur(){lifecycleControllerRuntime.focusChanges++;accountLifecycleEvent("fenêtre inactive");setRenderFxActivity(false,"blur")}
function handleLifecycleFocus(){lifecycleControllerRuntime.focusChanges++;accountLifecycleEvent("fenêtre active");pulseRenderFxActivity(650,"focus")}
function handleMotionPreferenceChange(){
  lifecycleControllerRuntime.motionPreferenceChanges++;accountLifecycleEvent("préférence système d’animation");syncAmbientMotionState({pulse:false,reason:"system-preference"});
}
function playLifecycleAction(name,event){
  lifecycleControllerRuntime.audioActions++;accountLifecycleEvent(`son ${event||name}`);retroAudio.play(name);
}
function handleGlobalActionSound(event){
  const button=event.target.closest?.("button");
  if(!button||button.disabled||LIFECYCLE_QUIET_BUTTON_IDS.has(button.id)||button.dataset.audioQuiet!==undefined||button.dataset.zoom!==undefined||button.dataset.depth!==undefined||button.dataset.panX!==undefined)return;
  const syncTargets=LIFECYCLE_SYNC_SOUND_TARGETS[button.id]?.()||null;
  if(syncTargets){playLifecycleAction("sync",button.id);syncTargets.filter(Boolean).forEach(status=>armOperationSound(status));return}
  if(["mapHome","homeBtn","recenterSelected","selectionCenter"].includes(button.id)){playLifecycleAction("home",button.id);return}
  if(/export|download|openHistory|openBssDownload|openOsmQuery/i.test(button.id)){playLifecycleAction("export",button.id);return}
  if(/clear|remove|reset/i.test(button.id)){playLifecycleAction("delete",button.id);return}
  if(["sidebarToggle","sidebarClose","collapseCards","expandCards","infoToggle","selectionAssistClose"].includes(button.id)){playLifecycleAction("panel",button.id);return}
  playLifecycleAction("button",button.id||"bouton");
}
function handleGlobalControlSound(event){
  const control=event.target;
  if(control?.matches?.('input[type="checkbox"],select'))playLifecycleAction("toggle",control.id||"contrôle");
}
function bindLifecycleController(){
  if(lifecycleControllerRuntime.bound)return;
  lifecycleControllerRuntime.bound=true;
  document.addEventListener("pointerdown",unlockAudioFromGesture,{capture:true,passive:true});
  document.addEventListener("touchstart",unlockAudioFromGesture,{capture:true,passive:true});
  document.addEventListener("keydown",unlockAudioFromGesture,{capture:true});
  document.addEventListener("visibilitychange",handleLifecycleVisibility);
  window.addEventListener("blur",handleLifecycleBlur);
  window.addEventListener("focus",handleLifecycleFocus);
  window.addEventListener("pagehide",()=>{if(typeof autosaveActiveTerritory==="function")autosaveActiveTerritory()});
  reducedMotionQuery?.addEventListener?.("change",handleMotionPreferenceChange);
  document.addEventListener("toggle",event=>{
    if(event.target instanceof HTMLDetailsElement)playLifecycleAction(event.target.open?"panelOpen":"panelClose","panneau");
  },true);
  document.addEventListener("click",handleGlobalActionSound,true);
  document.addEventListener("change",handleGlobalControlSound);
  els.audioToggle.addEventListener("click",()=>{lifecycleControllerRuntime.audioActions++;accountLifecycleEvent("bascule audio");retroAudio.toggle()});
  const statuses=[els.osmStatus,els.heritageStatus,els.cartofrichesStatus,els.bssStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus].filter(Boolean);
  statuses.forEach(status=>operationStatusObserver.observe(status,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]}));
  lifecycleControllerRuntime.statusObservers=statuses.length;
  accountLifecycleEvent("contrôleur lié");
}
