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


function geolocationErrorLabel(err,context={}){
  const localFile=location.protocol==="file:";
  if(err?.code===1){
    if(!window.isSecureContext)return "Le navigateur bloque la géolocalisation dans ce contexte non sécurisé. Aucune fenêtre d’autorisation ne peut s’afficher ici.";
    if(context.permissionState==="denied")return localFile?"La géolocalisation est bloquée pour ce fichier local. Le navigateur peut refuser sans afficher de demande ; ouvre l’Atlas depuis une adresse HTTPS.":"La localisation est déjà bloquée pour ce site ou pour le navigateur. Réactive-la dans les réglages de permissions.";
    return localFile?"Le navigateur mobile a refusé la géolocalisation du fichier local sans afficher de demande. Une copie servie en HTTPS est nécessaire.":"Permission de localisation refusée ou bloquée par le navigateur.";
  }
  if(err?.code===2)return "Position indisponible. Vérifie que la localisation du téléphone est activée pour le navigateur.";
  if(err?.code===3)return "La recherche de position a dépassé le délai prévu.";
  return String(err?.message||"Impossible d’obtenir la position.");
}
async function geolocationPermissionState(){
  try{
    if(navigator.permissions?.query){
      const status=await navigator.permissions.query({name:"geolocation"});
      return status?.state||"unknown";
    }
  }catch{}
  return "unknown";
}
function geolocationContextHint(){
  if(!window.isSecureContext)return '<br><span class="location-warning">Cette page n’est pas dans un contexte sécurisé. Le même fichier doit être servi en HTTPS pour que le navigateur puisse demander la position.</span>';
  if(location.protocol==="file:")return '<br><span class="location-warning">Certains navigateurs mobiles bloquent la localisation des fichiers <code>file://</code> sans afficher de boîte de dialogue. Héberger ce même HTML en HTTPS contourne cette limite.</span>';
  return "";
}
function updateLocationUI(message=""){
  const loc=state.userLocation,inside=loc&&inExtent(loc.lat,loc.lon,largestExtent());
  if(els.locateMe){els.locateMe.disabled=state.locationLoading;els.locateMe.textContent=state.locationLoading?"⌖ vérification…":"⌖ me localiser"}
  if(els.mapLocate){els.mapLocate.disabled=state.locationLoading;els.mapLocate.classList.toggle("active",!!loc)}
  if(els.clearLocation)els.clearLocation.disabled=!loc;
  if(els.locationBadge)els.locationBadge.textContent=state.locationLoading?"vérification…":loc?(inside?`± ${Math.round(loc.accuracy||0)} m`:"hors emprise"):"non localisée";
  if(els.locationHelp){
    if(message)els.locationHelp.innerHTML=message;
    else if(loc)els.locationHelp.innerHTML=`Dernière mesure : <strong>${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}</strong> · précision ± ${Math.round(loc.accuracy||0)} m · ${new Date(loc.timestamp).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}. Position temporaire, non sauvegardée.`;
  }
  updateAroundMe();
  updateEncounterUI();
}
async function locateUser(){
  if(state.locationLoading)return;
  if(!navigator.geolocation){updateLocationUI('<span class="location-warning">La géolocalisation n’est pas disponible dans ce navigateur.</span>');retroAudio.play("error");return}
  state.locationLoading=true;updateLocationUI("Vérification du contexte et des permissions…");
  const permissionState=await geolocationPermissionState();
  if(!window.isSecureContext){
    state.locationLoading=false;
    updateLocationUI('<span class="location-warning">Le navigateur ne peut pas demander ta position depuis cette page : le contexte n’est pas sécurisé.</span>'+geolocationContextHint());
    retroAudio.play("error");render();return;
  }
  if(permissionState==="denied"){
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel({code:1},{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();return;
  }
  updateLocationUI(permissionState==="prompt"?"Le navigateur devrait maintenant afficher sa demande d’autorisation…":"Recherche ponctuelle de la position…");
  navigator.geolocation.getCurrentPosition(pos=>{
    state.locationLoading=false;
    const c=pos.coords;
    state.userLocation={lat:Number(c.latitude),lon:Number(c.longitude),accuracy:Number(c.accuracy)||0,altitude:Number.isFinite(c.altitude)?c.altitude:null,heading:Number.isFinite(c.heading)?c.heading:null,speed:Number.isFinite(c.speed)?c.speed:null,timestamp:pos.timestamp||Date.now()};
    const inside=inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent());
    if(inside&&state.centerOnLocation){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom())}
    updateLocationUI(inside?"":'<span class="location-warning">Position obtenue, mais elle se trouve hors de l’emprise actuelle de l’Atlas.</span>');
    retroAudio.play("success");render();
  },err=>{
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel(err,{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();
  },{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
}
function clearUserLocation(){state.userLocation=null;updateLocationUI("Position masquée. Elle n’était pas enregistrée dans l’Atlas.");render()}


function saveHousePosition(coord,sourceLabel="placement manuel",persist=true){
  CONFIG.house={lat:+coord.lat,lon:+coord.lon};markSpatialIndexesDirty();
  if(els.houseLat){els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7)}
  if(persist){HOUSE_WAS_SAVED=true;try{localStorage.setItem("atlas-karst-house-v06",JSON.stringify(CONFIG.house));localStorage.removeItem("atlas-karst-house-v05")}catch{}}
  state.placingHouse=false;activeMapSurface()?.classList.remove("placing-house");
  els.placeHouse.classList.remove("active");
  els.houseHelp.innerHTML=`Repère enregistré : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong> · ${sourceLabel}.`;
  hideHover();render();
}
function setHousePlacement(active){
  state.placingHouse=active;els.placeHouse.classList.toggle("active",active);activeMapSurface()?.classList.toggle("placing-house",active);
  hideHover();
  els.houseHelp.innerHTML=active?'<span class="house-placement-note">Clique maintenant l’emplacement de la maison sur la carte. Le glisser-déposer est temporairement désactivé.</span>':`Repère actuel : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong>.`;
}

bindInputController();
bindSnapshotManager();
bindUiShell();

els.syncOsm.addEventListener("click",syncOsmNow);
els.testOsm.addEventListener("click",testOsmServers);
els.openOsmQuery.addEventListener("click",openCurrentOverpassQuery);
els.importOsmJson.addEventListener("click",()=>els.osmFile.click());
els.osmFile.addEventListener("change",e=>importOsmJsonFile(e.target.files?.[0]));

els.syncPiezo.addEventListener("click",syncHubeauPiezo);
els.openBssDownload.addEventListener("click",()=>window.open(BSS_DOWNLOAD_URL,"_blank","noopener"));
els.importBss.addEventListener("click",()=>els.bssFile.click());
els.bssFile.addEventListener("change",e=>importBssFile(e.target.files?.[0]));
els.clearBss.addEventListener("click",()=>{
  try{localStorage.removeItem(BSS_LOCAL_KEY);localStorage.removeItem("atlas-karst-bss-v09b")}catch{}
  state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL);
  updateBssUI("Couche réinitialisée sur les 736 ouvrages BRGM embarqués.");
  els.layerBss.checked=true;state.layerBss=true;
  render();
});
els.syncCartofriches.addEventListener("click",syncCartofriches);
els.downloadCartofriches.addEventListener("click",()=>window.open(CARTOFRICHES_DOWNLOAD,"_blank","noopener"));
els.importCartofriches.addEventListener("click",()=>els.cartofrichesFile.click());
els.cartofrichesFile.addEventListener("change",e=>importCartofrichesFile(e.target.files?.[0]));
els.clearCartofriches.addEventListener("click",()=>{
  state.cartofriches=[];
  try{localStorage.removeItem(CARTOFRICHES_KEY)}catch{}
  updateCartofrichesUI("Couche locale vidée.");
  render();
});
els.cartofrichesReconverted.addEventListener("change",e=>{
  state.cartofrichesIncludeReconverted=e.target.checked;
  saveCartofriches();updateCartofrichesUI();render();
});
els.readoutSheetHandle.addEventListener("click",cycleReadoutSheet);
els.mapLocate.addEventListener("click",locateUser);
els.locateMe.addEventListener("click",locateUser);
els.clearLocation.addEventListener("click",clearUserLocation);
els.centerOnLocation.addEventListener("change",e=>{state.centerOnLocation=e.target.checked;if(e.target.checked&&state.userLocation&&inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent())){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());render()}});
els.placeHouse.addEventListener("click",()=>{
  if(!state.selectedCell){els.houseHelp.innerHTML='<span class="house-placement-note">Clique d’abord une case : elle sera entourée en jaune.</span>';return}
  saveHousePosition(state.selectedCell.coord,"case sélectionnée");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.resetHouse.addEventListener("click",()=>{
  saveHousePosition({...HOUSE_ESTIMATE},"coordonnées précises fournies par l’utilisateur");
  recenterOnHouse("reset-home");
});
els.geocodeHouse.addEventListener("click",async()=>{
  const a=await fetchAddress(true);if(!a)return;
  if(state.cadastreBuildings.length){
    CONFIG.house={lat:a.lat,lon:a.lon};markSpatialIndexesDirty();
    state.address=a;
    snapHouseToBuilding(true);
  }else{
    saveHousePosition({lat:a.lat,lon:a.lon},`adresse officielle : ${a.label}`,true);
  }
  state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.snapHouseBuilding.addEventListener("click",()=>{if(snapHouseToBuilding(true)){state.center=clampCenter({...CONFIG.house},currentZoom());render()}});
els.openHistory.addEventListener("click",()=>{window.open(`https://remonterletemps.ign.fr/comparer/?lat=${CONFIG.house.lat}&lon=${CONFIG.house.lon}&z=16&mode=split-h`,"_blank","noopener")});
els.applyHouseCoords.addEventListener("click",()=>{
  const lat=Number(els.houseLat.value),lon=Number(els.houseLon.value);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)){els.houseHelp.innerHTML='<span class="house-placement-note">Coordonnées invalides.</span>';return}
  const e=largestExtent();
  if(!inExtent(lat,lon,e)){els.houseHelp.innerHTML='<span class="house-placement-note">Ces coordonnées sont hors de l’emprise chargée.</span>';return}
  saveHousePosition({lat,lon},"saisie numérique");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.addLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const mode=els.observationMode.value,glyph=els.localType.value,def=localMarkerDefinition(glyph),name=els.localName.value.trim()||def.detail;
  const target=state.selectedCell.coord,confidence=els.observationConfidence.value,season=els.observationSeason.value.trim();
  const o={id:`OBS-${Date.now()}`,mode,glyph,name,lat:target.lat,lon:target.lon,confidence,season,radius:clamp(Number(els.observationRadius.value)||80,10,1000),source:"Observation locale enregistrée dans cet atlas"};
  if(mode==="sight"){o.origin={...CONFIG.house};o.distance=distanceMeters(CONFIG.house,target);o.bearing=bearingDegrees(CONFIG.house,target)}
  state.observations.push(o);markSpatialIndexesDirty();saveLocalCavities();refreshCavities();render();
  els.localHelp.innerHTML=mode==="sight"?`Visée <strong>${o.bearing.toFixed(0)}°</strong> sur environ <strong>${Math.round(o.distance)} m</strong> enregistrée.`:`Observation <strong>${esc(name)}</strong> enregistrée avec une confiance ${confidenceLabel(confidence)}.`;
  els.localName.value="";
});
els.removeLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.textContent="Sélectionne d’abord l’observation à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.observation?f.record?.id:f?.record?.observation?.id||null;
  if(!id){
    const nearby=state.observations.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.localHelp.textContent="Aucune observation locale suffisamment proche de la sélection.";return}
  state.observations=state.observations.filter(o=>o.id!==id);saveLocalCavities();refreshCavities();render();els.localHelp.textContent="Observation locale supprimée.";
});

els.addLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const category=els.loreCategory.value,def=loreMarkerDefinition(category),target=state.selectedCell.coord;
  const item={
    id:`LOR-${Date.now()}`,
    category,
    name:els.loreName.value.trim()||def.label,
    period:els.lorePeriod.value.trim(),
    source:els.loreSource.value.trim()||"Repère local enregistré dans cet atlas",
    note:els.loreNote.value.trim(),
    lat:target.lat,
    lon:target.lon
  };
  state.loreItems.push(item);markSpatialIndexesDirty();saveLoreItems();render();
  els.loreHelp.innerHTML=`Repère <strong>${esc(item.name)}</strong> enregistré en catégorie <strong>${def.glyph}</strong>.`;
  els.loreName.value=""; els.lorePeriod.value=""; els.loreSource.value=""; els.loreNote.value="";
});
els.removeLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.lore?f.record?.id:null;
  if(!id){
    const nearby=state.loreItems.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];
    if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.loreHelp.textContent="Aucun repère patrimoine / mystère suffisamment proche de la sélection.";return}
  state.loreItems=state.loreItems.filter(o=>o.id!==id);saveLoreItems();render();els.loreHelp.textContent="Repère patrimoine / mystère supprimé.";
});



els.aroundRadius.addEventListener("change",e=>{state.aroundRadius=Number(e.target.value)||500;updateAroundMe();retroAudio.play("toggle")});
els.refreshAround.addEventListener("click",locateUser);
document.addEventListener("click",e=>{
  const focus=e.target.closest?.("[data-poi-focus]");
  if(focus){e.preventDefault();focusNormalizedPoi(focus.dataset.poiFocus);return}
  const relation=e.target.closest?.("[data-relation-from][data-relation-to]");
  if(relation){e.preventDefault();framePoiRelation(relation.dataset.relationFrom,relation.dataset.relationTo,relation.dataset.relationLabel||"relation")}
});


els.encounterEnabled.addEventListener("change",e=>{state.encounterEnabled=e.target.checked;saveEncounterCollection();updateEncounterUI();retroAudio.play("toggle")});
els.observeSurroundings.addEventListener("click",()=>startLocalEncounter());
els.testEncounter.addEventListener("click",()=>startLocalEncounter({testMode:true}));
els.openCodex.addEventListener("click",()=>openCodex());
els.encounterClose.addEventListener("click",closeEncounterOverlay);
els.encounterBody.addEventListener("click",handleEncounterClick);
els.encounterOverlay.addEventListener("click",e=>{if(e.target===els.encounterOverlay)closeEncounterOverlay()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&els.encounterOverlay.classList.contains("active")){e.preventDefault();closeEncounterOverlay()}});

els.guidedTourSelect.addEventListener("change",e=>{
  state.guidedTourId=e.target.value;state.guidedTourStep=0;
  if(state.guidedTourActive)focusGuidedTourStep(0);else updateGuidedTourUI();
  retroAudio.play("toggle");
});
els.guidedTourStart.addEventListener("click",startGuidedTour);
els.guidedTourPrev.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep-1));
els.guidedTourNext.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep+1));
els.guidedTourRecenter.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep,{announce:false}));
els.guidedTourStop.addEventListener("click",stopGuidedTour);

const heritageToggleBindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
for(const [id,key] of Object.entries(heritageToggleBindings))els[id].addEventListener("change",e=>{state.heritageEnabled[key]=e.target.checked;saveHeritage();updateHeritageUI();render()});
els.syncCultureHeritage.addEventListener("click",syncCultureHeritage);
els.syncWikipediaHeritage.addEventListener("click",syncWikipediaHeritage);
els.clearHeritage.addEventListener("click",clearHeritage);

els.recenterSelected.addEventListener("click",()=>{
  if(!state.selectedCell){setReadoutContent("<strong>Aucune case mémorisée.</strong><br>Clique d’abord un point de la carte.",{title:"Aucune sélection",sheet:"peek"});return}
  state.center=clampCenter(state.selectedCell.coord,currentZoom());render();
});
els.exportBtn.addEventListener("click",exportTxt);
els.retryData.addEventListener("click",async()=>{
  state.allowNetwork=true;
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  els.retryData.textContent="↻ recharger toutes les données";
  try{
    ["atlas-karst-address-v06","atlas-karst-cadastre-v06","atlas-karst-cavities-v06","atlas-karst-elevation-v06","atlas-karst-elevation-v09d"]
      .forEach(k=>localStorage.removeItem(k));
  }catch{}
  await syncOsmNow();
  Promise.allSettled([fetchAddress(true),fetchCadastre(),fetchCavities(),fetchElevation()]);
});
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
    Promise.allSettled([fetchOverpass(),fetchAddress(),fetchCadastre(),fetchCavities(),fetchElevation()]).then(()=>updateSnapshotUI());
  }
  scheduleFrameFit();updateSnapshotUI();
  if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
}
bootAtlas();
