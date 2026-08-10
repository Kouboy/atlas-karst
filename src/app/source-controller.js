const sourceControllerRuntime={ready:true,bound:false,operations:0,imports:0,clears:0,retries:0,filterChanges:0,lastAction:"initialisation"};

function accountSourceAction(action){
  sourceControllerRuntime.operations++;
  sourceControllerRuntime.lastAction=action;
}
function openSourceFilePicker(input,source){
  accountSourceAction(`sélection ${source}`);
  input.click();
}
async function importSourceFile(file,source,importer){
  if(!file)return;
  accountSourceAction(`import ${source}`);
  sourceControllerRuntime.imports++;
  await importer(file);
}
function resetBssSource(){
  accountSourceAction("réinitialisation BSS");sourceControllerRuntime.clears++;
  try{localStorage.removeItem(territoryStorageKey(BSS_LOCAL_KEY));if(CONFIG.territory.id===LEGACY_TERRITORY_PROFILE.id)localStorage.removeItem("atlas-karst-bss-v09b")}catch{}
  const embedded=territoryUsesEmbeddedData("bss",CONFIG.territory)?BSS_EMBEDDED_LOCAL:[];
  state.bss=mergeBssItems(embedded);
  updateBssUI(embedded.length?"Couche réinitialisée sur les ouvrages BRGM embarqués.":"Couche locale vidée pour ce territoire.");
  els.layerBss.checked=true;state.layerBss=true;
  render("bss-reset");
}
function clearCartofrichesSource(){
  accountSourceAction("effacement Cartofriches");sourceControllerRuntime.clears++;
  state.cartofriches=[];
  try{localStorage.removeItem(territoryStorageKey(CARTOFRICHES_KEY))}catch{}
  updateCartofrichesUI("Couche locale vidée.");
  render("cartofriches-clear");
}
async function retryAllDataSources(){
  accountSourceAction("relance générale");sourceControllerRuntime.retries++;
  state.allowNetwork=true;
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  els.retryData.textContent="↻ recharger toutes les données";
  try{
    ["atlas-karst-address-v06","atlas-karst-cadastre-v06","atlas-karst-cadastre-v07","atlas-karst-cavities-v06","atlas-karst-elevation-v06","atlas-karst-elevation-v09d"]
      .forEach(key=>localStorage.removeItem(territoryStorageKey(key)));
  }catch{}
  await syncOsmNow();
  Promise.allSettled([fetchAddress(true),fetchCadastre(),fetchCavities(),fetchElevation()]);
}
function bindSourceAction(element,eventName,action,handler){
  element.addEventListener(eventName,event=>{
    accountSourceAction(action);
    return handler(event);
  });
}
function bindSourceController(){
  if(sourceControllerRuntime.bound)return;
  sourceControllerRuntime.bound=true;

  bindSourceAction(els.syncOsm,"click","synchronisation OSM",syncOsmNow);
  bindSourceAction(els.testOsm,"click","test OSM",testOsmServers);
  bindSourceAction(els.openOsmQuery,"click","ouverture Overpass",openCurrentOverpassQuery);
  els.importOsmJson.addEventListener("click",()=>openSourceFilePicker(els.osmFile,"OSM"));
  els.osmFile.addEventListener("change",event=>importSourceFile(event.target.files?.[0],"OSM",importOsmJsonFile));

  bindSourceAction(els.syncPiezo,"click","synchronisation BSS",syncHubeauPiezo);
  bindSourceAction(els.openBssDownload,"click","téléchargement BSS",()=>window.open(BSS_DOWNLOAD_URL,"_blank","noopener"));
  els.importBss.addEventListener("click",()=>openSourceFilePicker(els.bssFile,"BSS"));
  els.bssFile.addEventListener("change",event=>importSourceFile(event.target.files?.[0],"BSS",importBssFile));
  els.clearBss.addEventListener("click",resetBssSource);
  bindSourceAction(els.syncHydrometry,"click","synchronisation hydrométrique",syncHydrometry);
  els.clearHydrometry.addEventListener("click",()=>{accountSourceAction("effacement hydrométrie");sourceControllerRuntime.clears++;clearHydrometry()});

  bindSourceAction(els.syncCartofriches,"click","synchronisation Cartofriches",syncCartofriches);
  bindSourceAction(els.downloadCartofriches,"click","téléchargement Cartofriches",()=>window.open(CARTOFRICHES_DOWNLOAD,"_blank","noopener"));
  els.importCartofriches.addEventListener("click",()=>openSourceFilePicker(els.cartofrichesFile,"Cartofriches"));
  els.cartofrichesFile.addEventListener("change",event=>importSourceFile(event.target.files?.[0],"Cartofriches",importCartofrichesFile));
  els.clearCartofriches.addEventListener("click",clearCartofrichesSource);
  els.cartofrichesReconverted.addEventListener("change",event=>{
    accountSourceAction("filtre Cartofriches");sourceControllerRuntime.filterChanges++;
    state.cartofrichesIncludeReconverted=event.target.checked;
    saveCartofriches();updateCartofrichesUI();render("cartofriches-filter");
  });

  const heritageToggleBindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
  for(const [id,key] of Object.entries(heritageToggleBindings))els[id].addEventListener("change",event=>{
    accountSourceAction(`filtre patrimoine ${key}`);sourceControllerRuntime.filterChanges++;
    state.heritageEnabled[key]=event.target.checked;saveHeritage();updateHeritageUI();render("heritage-filter");
  });
  bindSourceAction(els.syncCultureHeritage,"click","synchronisation patrimoine",syncCultureHeritage);
  bindSourceAction(els.syncWikipediaHeritage,"click","synchronisation Wikipédia",syncWikipediaHeritage);
  bindSourceAction(els.clearHeritage,"click","effacement patrimoine",()=>{sourceControllerRuntime.clears++;clearHeritage()});
  els.retryData.addEventListener("click",retryAllDataSources);
}
