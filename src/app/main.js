function render(reason="direct"){
  accountDataRender(reason);
  const renderStarted=performance.now();
  let phaseStarted=renderStarted;
  hideHover();
  if(debugState.enabled)debugState.lastReason=reason;
  if(!drag)clearPanPreview();
  const responsiveMain=uiShellMain||document.querySelector("main");
  if(responsiveMain)applyResponsiveGridProfile(responsiveMain);
  const z=currentZoom(),depth=currentDepth(),extent=extentFor();
  phaseStarted=performance.now();const layoutMs=phaseStarted-renderStarted;
  spatialRuntime.lastQueryCandidates=0;spatialRuntime.lastQueryResults=0;ensureSpatialIndexes();
  const indexMs=performance.now()-phaseStarted;
  const composed=composeMapGrid(extent,depth),g=composed.grid;
  document.body.dataset.depthBand=depth===0?"surface":depth>=-5?"shallow":depth>=-15?"middle":"deep";
  if(depth<0)applyUndergroundVisualContract(depth);
  state.lastGrid=g;
  const outputStarted=performance.now();
  const visiblePoiCount=drawCanvasMap(g,reason);
  const outputMs=performance.now()-outputStarted;
  const interfaceStarted=performance.now();
  syncSelectionDom();
  if(pendingPoiFeedback)requestAnimationFrame(applyPendingPoiSelectionFeedback);
  updateSelectionAssist();
  scheduleOsmEnsure();
  if(els.locationBadge){
    const loc=state.userLocation;
    els.locationBadge.textContent=state.locationLoading?"recherche…":loc?`± ${Math.round(loc.accuracy||0)} m`:"non localisée";
  }
  els.mapTip.textContent=coarsePointer()?"pause 0,3 s = détail · toucher = sélectionner · glisser = déplacement · ⌖ = position · Canvas":"pause 0,3 s = détail · clic = sélectionner · glisser = déplacement · molette = zoom · Canvas";
  els.zoomLabel.textContent=z.label;
  els.depthLabel.textContent=depthSliceLabel(depth);
  const cellX=z.widthKm*1000/CONFIG.gridW,cellY=z.heightKm*1000/CONFIG.gridH;
  els.cellSizeLabel.textContent=`≈ ${Math.round((cellX+cellY)/2)} m`;
  els.centerLabel.textContent=`${state.center.lat.toFixed(5)} / ${state.center.lon.toFixed(5)}`;
  updateRenderModeControls();
  const renderSuffix=effectiveRenderMode()==="symbolic"?" · symbolique":" · ASCII";
  els.truthBadge.textContent=(depth===0?(state.cadastreBuildings.length&&semanticZoom().cadastreBuildings?"surface OSM + cadastre":state.osm?"surface OSM vectorielle":state.zoomIndex===3?(OFFLINE_TEST?"surface locale embarquée":"surface de secours V0.1"):"surface en attente"):`coupe interprétative · ${depthSliceMeta(depth).range}`)+renderSuffix;
  els.zoomHelp.textContent=`Fenêtre ≈ ${z.widthKm.toLocaleString("fr-FR")} × ${z.heightKm.toLocaleString("fr-FR")} km · une case ≈ ${Math.round(cellX)} × ${Math.round(cellY)} m · détail affiché : ${semanticZoom().summary}.`;
  document.querySelectorAll("[data-zoom]").forEach(b=>b.classList.toggle("active",+b.dataset.zoom===state.zoomIndex));
  document.querySelectorAll("[data-depth]").forEach(b=>b.classList.toggle("active",+b.dataset.depth===depth));
  els.zoomOut.disabled=state.zoomIndex===0;els.zoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.mapZoomOut.disabled=state.zoomIndex===0;els.mapZoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.depthUp.disabled=state.depthIndex===0;els.depthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  els.mapDepthUp.disabled=state.depthIndex===0;els.mapDepthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  updateSnapshotUI();
  requestAnimationFrame(()=>{alignRenderedCenterToVisibleViewport();syncSelectionDom();updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker()});
  updateSidebarClusterStatus();
  updateAroundMe();
  updateGuidedTourUI();
  scheduleFrameFit();
  const interfaceMs=performance.now()-interfaceStarted;
  const renderElapsed=performance.now()-renderStarted;
  debugState.lastRenderPhases={layout:layoutMs,index:indexMs,grid:composed.gridMs,layers:composed.layersMs,output:outputMs,interface:interfaceMs};
  debugState.renderCount++;debugState.lastRenderMs=renderElapsed;debugState.totalRenderMs+=renderElapsed;
  debugState.maxRenderMs=Math.max(debugState.maxRenderMs,renderElapsed);debugState.lastPoiCount=visiblePoiCount;
  updateDebugPanel();
  if(debugState.enabled&&String(reason).startsWith("data-batch:"))requestAnimationFrame(runAtlasSelfCheck);
}


bindInputController();
bindSnapshotManager();
bindUiShell();
bindFieldworkController();
bindSourceController();
bindExperienceController();

els.readoutSheetHandle.addEventListener("click",cycleReadoutSheet);
document.addEventListener("click",e=>{
  const focus=e.target.closest?.("[data-poi-focus]");
  if(focus){e.preventDefault();focusNormalizedPoi(focus.dataset.poiFocus);return}
  const relation=e.target.closest?.("[data-relation-from][data-relation-to]");
  if(relation){e.preventDefault();framePoiRelation(relation.dataset.relationFrom,relation.dataset.relationTo,relation.dataset.relationLabel||"relation")}
});

els.recenterSelected.addEventListener("click",()=>{
  if(!state.selectedCell){setReadoutContent("<strong>Aucune case mémorisée.</strong><br>Clique d’abord un point de la carte.",{title:"Aucune sélection",sheet:"peek"});return}
  state.center=clampCenter(state.selectedCell.coord,currentZoom());render();
});
els.exportBtn.addEventListener("click",exportTxt);
els.scenario.addEventListener("change",e=>{state.scenario=e.target.value;hypothesisModelCache.clear();render()});
els.renderModeSymbolic?.addEventListener("click",()=>setRenderMode("symbolic"));
els.renderModeAscii?.addEventListener("click",()=>setRenderMode("ascii"));
["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"].forEach(id=>{
  els[id].addEventListener("change",e=>{
    state[id]=e.target.checked;
    if(id==="layerHydrology")hypothesisModelCache.clear();
    if(id==="ambientMotion"){
      try{localStorage.setItem(AMBIENT_PREF_KEY,state.ambientMotion?"on":"off")}catch{}
      syncAmbientMotionState({pulse:state.ambientMotion,reason:"preference"});
    }
    render();
  });
});
els.cavitySelect.addEventListener("change",e=>{
  const c=state.cavities.find(v=>v.id===e.target.value);
  if(!c||!Number.isFinite(c.lat))return;
  state.zoomIndex=2;state.center=clampCenter({lat:c.lat,lon:c.lon},currentZoom());state.selectedCavity=c.id;render();
  setReadoutContent(`<strong>${esc(cavityName(c))}</strong><br>${esc(cavityMarker(c).label)} · ${esc(c.id)}${c.commune?` · ${esc(c.commune)}`:""}<br>La carte est recentrée sur le point inventorié. Descends à −8 m ou −14 m pour voir les scénarios, sans confondre leur dessin avec une topographie réelle.`,{title:cavityName(c),sheet:"full"});
});
if(els.debugToggle)els.debugToggle.addEventListener("click",()=>setDebugEnabled(!debugState.enabled));
if(els.runSelfCheck)els.runSelfCheck.addEventListener("click",runAtlasSelfCheck);
if(els.exportDebugReport)els.exportDebugReport.addEventListener("click",exportDebugReport);
window.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="d"){
    e.preventDefault();setDebugEnabled(!debugState.enabled);
  }
});

// Les navigateurs mobiles n’autorisent Web Audio qu’après un geste explicite.
// On arme donc le moteur dès le premier contact, avant les gestionnaires métier.
document.addEventListener("pointerdown",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){retroAudio.silence();setRenderFxActivity(false,"hidden")}
  else pulseRenderFxActivity(650,"visible");
});
window.addEventListener("blur",()=>setRenderFxActivity(false,"blur"));
window.addEventListener("focus",()=>pulseRenderFxActivity(650,"focus"));
reducedMotionQuery?.addEventListener?.("change",()=>syncAmbientMotionState({pulse:false,reason:"system-preference"}));
document.addEventListener("touchstart",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("keydown",()=>retroAudio.unlock(),{capture:true});
document.addEventListener("toggle",ev=>{
  if(ev.target instanceof HTMLDetailsElement)retroAudio.play(ev.target.open?"panelOpen":"panelClose");
},true);

const syncSoundTargets={
  syncOsm:()=>[els.osmStatus],
  syncCultureHeritage:()=>[els.heritageStatus],
  syncWikipediaHeritage:()=>[els.heritageStatus],
  syncCartofriches:()=>[els.cartofrichesStatus],
  syncPiezo:()=>[els.bssStatus],
  retryData:()=>[els.osmStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
};
const quietButtonIds=new Set([
  "audioToggle","mapZoomOut","mapZoomIn","zoomOut","zoomIn","mapDepthUp","mapDepthDown","depthUp","depthDown",
  "selectionUp","selectionDown","selectionLeft","selectionRight","locateMe","mapLocate","debugToggle","runSelfCheck","exportDebugReport","guidedTourStart","guidedTourPrev","guidedTourNext","guidedTourRecenter","guidedTourStop","observeSurroundings","openCodex","encounterClose"
]);
document.addEventListener("click",ev=>{
  const button=ev.target.closest?.("button");
  if(!button||button.disabled||quietButtonIds.has(button.id)||button.dataset.audioQuiet!==undefined||button.dataset.zoom!==undefined||button.dataset.depth!==undefined||button.dataset.panX!==undefined)return;
  const syncTargets=syncSoundTargets[button.id]?.()||null;
  if(syncTargets){retroAudio.play("sync");syncTargets.forEach(status=>armOperationSound(status));return}
  if(["mapHome","homeBtn","recenterSelected","selectionCenter"].includes(button.id)){retroAudio.play("home");return}
  if(/export|download|openHistory|openBssDownload|openOsmQuery/i.test(button.id)){retroAudio.play("export");return}
  if(/clear|remove|reset/i.test(button.id)){retroAudio.play("delete");return}
  if(["sidebarToggle","sidebarClose","collapseCards","expandCards","infoToggle","selectionAssistClose"].includes(button.id)){retroAudio.play("panel");return}
  retroAudio.play("button");
},true);
document.addEventListener("change",ev=>{
  const control=ev.target;
  if(control?.matches?.('input[type="checkbox"],select'))retroAudio.play("toggle");
});
els.audioToggle.addEventListener("click",()=>retroAudio.toggle());
[els.osmStatus,els.heritageStatus,els.cartofrichesStatus,els.bssStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
  .filter(Boolean).forEach(status=>operationStatusObserver.observe(status,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]}));

async function bootAtlas(){
  retroAudio.init();
  setDebugEnabled(DEBUG_REQUESTED);
  if(!CANVAS_RENDERER){
    if(els.canvasUnsupported)els.canvasUnsupported.hidden=false;
    if(els.viewport)els.viewport.hidden=true;
    return;
  }
  try{state.ambientMotion=localStorage.getItem(AMBIENT_PREF_KEY)!=="off"}catch{}
  try{const savedMode=localStorage.getItem(RENDER_MODE_PREF_KEY);if(savedMode==="ascii"||savedMode==="symbolic")state.renderMode=savedMode}catch{}
  if(els.ambientMotion)els.ambientMotion.checked=state.ambientMotion;
  if(els.aroundRadius)els.aroundRadius.value=String(state.aroundRadius);
prepareSidebarCards();
  buildSidebarClusters();
  if(mobileSidebarMode()){
    setSidebarOpen(false);
    setInfoVisible(false);
  }else{
    setSidebarOpen(true);
    setInfoVisible(true);
    setReadoutSheetState("peek");
  }
  loadLocalCavities();
  loadLoreItems();
  loadHeritage();
  loadCartofriches();
  loadBssLocal();
  loadEncounterCollection();
  els.layerBss.checked=true;state.layerBss=true;
  updateLocationUI();
  updateEncounterUI();
  populateControls();
  refreshCavities();
  els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  els.houseHelp.innerHTML=`Repère actuel : <strong>${CONFIG.house.lat.toFixed(7)}, ${CONFIG.house.lon.toFixed(7)}</strong>. Cette version peut exporter cet état en sauvegarde réimportable ou en HTML autonome.`;
  if(els.osmHelp){
    els.osmHelp.innerHTML=LOCAL_FILE_MODE
      ? "Cette copie est ouverte en <code>file://</code>. Les requêtes sont valides, mais les serveurs Overpass peuvent refuser l’origine locale faute de Referer. Utilise <strong>tester les serveurs</strong> pour obtenir un diagnostic précis."
      : "Cette copie est ouverte depuis une origine web. OSM peut utiliser le Referer du site et synchroniser directement les fenêtres visibles.";
  }

  const savedSnapshot=EMBEDDED_SNAPSHOT||await loadSnapshotFromDb();
  if(savedSnapshot){
    try{applyAtlasSnapshot(savedSnapshot,{source:EMBEDDED_SNAPSHOT?"instantané embarqué":"sauvegarde locale",renderNow:false})}
    catch(err){console.warn("Instantané ignoré",err);state.allowNetwork=true}
  }
  if(savedSnapshot){
    populateCavitySelect();
    render("boot-snapshot");
    scheduleFrameFit();updateSnapshotUI();
    if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
    return;
  }
  if(OFFLINE_TEST){
    state.zoomIndex=3;
    state.center={...CONFIG.house};
    state.layerBss=false;
    els.layerBss.checked=false;
    els.offlineNotice.style.display="block";
    els.retryData.textContent="↻ tenter les services en ligne";
    setStatus("osm","ok","instantané embarqué minimal");
    setStatus("address","ok","coordonnées locales");
    setStatus("cadastre","bad","non embarqué");
    setStatus("cavities","bad","repères locaux seulement");
    updateCartofrichesUI();
    updateHeritageUI();
    updateBssUI();
    setStatus("elevation","bad","non embarqué");
    els.sourceNote.innerHTML="Mode de démonstration hors ligne. Exporte une sauvegarde ou un HTML autonome après synchronisation pour conserver un état plus complet.";
    populateCavitySelect();
    render("boot-offline");
  }else{
    if(els.offlineNotice)els.offlineNotice.style.display="none";
    render("boot-online");
    runStartupDataLoad();
  }
  scheduleFrameFit();updateSnapshotUI();
  if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
}
bootAtlas();
