const applicationControllerRuntime={ready:true,bound:false,bootStarts:0,bootCompleted:false,bootMode:"pending",bootMs:0,documentActions:0,lastAction:"initialisation",lastError:""};
let atlasBootPromise=null;

function accountApplicationAction(action){applicationControllerRuntime.documentActions++;applicationControllerRuntime.lastAction=action}
function handleDocumentNavigation(event){
  const focus=event.target.closest?.("[data-poi-focus]");
  if(focus){event.preventDefault();accountApplicationAction("ouverture d’un point d’intérêt");focusNormalizedPoi(focus.dataset.poiFocus);return}
  const relation=event.target.closest?.("[data-relation-from][data-relation-to]");
  if(relation){event.preventDefault();accountApplicationAction("cadrage d’une relation");framePoiRelation(relation.dataset.relationFrom,relation.dataset.relationTo,relation.dataset.relationLabel||"relation")}
}
function bindApplicationController(){
  if(applicationControllerRuntime.bound)return;
  applicationControllerRuntime.bound=true;
  bindInputController();
  bindSnapshotManager();
  bindUiShell();
  bindTerritoryController();
  bindFieldworkController();
  bindSourceController();
  bindExperienceController();
  bindViewController();
  bindPoiAnnotations();
  bindLifecycleController();
  bindSessionHealth();
  els.readoutSheetHandle.addEventListener("click",()=>{accountApplicationAction("bascule de la fiche");cycleReadoutSheet()});
  document.addEventListener("click",handleDocumentNavigation);
  els.exportBtn.addEventListener("click",()=>{accountApplicationAction("export texte");exportTxt()});
  applicationControllerRuntime.lastAction="contrôleurs liés";
}

async function bootAtlas(){
  const started=performance.now();
  applicationControllerRuntime.bootStarts++;
  try{
    retroAudio.init();
    if(els.appVersionLabel)els.appVersionLabel.textContent=`V${APP_VERSION}`;
    updateTerritoryIdentityUI();
    setDebugEnabled(DEBUG_REQUESTED,{reveal:false});
    if(!CANVAS_RENDERER){
      applicationControllerRuntime.bootMode="canvas-indisponible";
      if(els.canvasUnsupported)els.canvasUnsupported.hidden=false;
      if(els.viewport)els.viewport.hidden=true;
      return;
    }
    try{state.ambientMotion=localStorage.getItem(AMBIENT_PREF_KEY)!=="off"}catch{}
    try{const savedMode=localStorage.getItem(RENDER_MODE_PREF_KEY);if(savedMode==="ascii"||savedMode==="symbolic")state.renderMode=savedMode}catch{}
    if(els.ambientMotion)els.ambientMotion.checked=state.ambientMotion;
    if(els.aroundRadius)els.aroundRadius.value=String(state.aroundRadius);
    prepareSidebarCards();
    bindNativeSidebarShell();
    initializeSourceRegistryUI();
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
    loadPersonalMarkers();
    loadUndergroundHypotheses();
    loadNatureAreas();
    loadHeritage();
    loadCartofriches();
    loadBssLocal();
    loadHydrometry();
    loadBiodiversity();
    loadPoiAnnotations();
    loadEncounterCollection();
    if(typeof renderFieldworkLedger==="function")renderFieldworkLedger();
    els.layerBss.checked=true;state.layerBss=true;
    els.layerHydrometry.checked=true;state.layerHydrometry=true;
    els.layerBiodiversity.checked=true;state.layerBiodiversity=true;
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
      catch(error){console.warn("Instantané ignoré",error);state.allowNetwork=true}
    }
    if(savedSnapshot){
      applicationControllerRuntime.bootMode="instantané";
      populateCavitySelect();
      render("boot-snapshot");
      scheduleFrameFit();updateSnapshotUI();
      if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
      return;
    }
    if(OFFLINE_TEST){
      applicationControllerRuntime.bootMode="hors-ligne";
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
      updateHydrometryUI();
      updateBiodiversityUI();
      updateNatureAreasUI();
      setStatus("elevation","bad","non embarqué");
      els.sourceNote.innerHTML="Mode de démonstration hors ligne. Exporte une sauvegarde ou un HTML autonome après synchronisation pour conserver un état plus complet.";
      populateCavitySelect();
      render("boot-offline");
    }else{
      applicationControllerRuntime.bootMode="en-ligne";
      if(els.offlineNotice)els.offlineNotice.style.display="none";
      render("boot-online");
      runStartupDataLoad();
    }
    scheduleFrameFit();updateSnapshotUI();
    if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
  }catch(error){
    applicationControllerRuntime.lastError=String(error?.message||error);throw error;
  }finally{
    applicationControllerRuntime.bootCompleted=true;
    applicationControllerRuntime.bootMs=performance.now()-started;
    if(!applicationControllerRuntime.lastError)applicationControllerRuntime.lastAction=`démarrage ${applicationControllerRuntime.bootMode}`;
  }
}
function startAtlasApplication(){
  bindApplicationController();
  if(!atlasBootPromise)atlasBootPromise=bootAtlas().then(async()=>{
    if(typeof initializeTerritoryManager==="function")await initializeTerritoryManager();
  });
  return atlasBootPromise;
}

startAtlasApplication().catch(error=>console.error("Échec du démarrage de l’Atlas",error));
