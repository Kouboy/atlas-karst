const territoryControllerRuntime={ready:true,bound:false,created:0,locationCopies:0,resets:0,syncs:0,lastAction:"initialisation",lastError:""};

function setTerritorySetupStatus(message,bad=false){
  if(!els?.territorySetupStatus)return;
  if(bad)els.territorySetupStatus.innerHTML=`<span class="location-warning">${esc(message)}</span>`;
  else els.territorySetupStatus.textContent=String(message);
}
function populateTerritoryControls(profile=CONFIG.territory){
  if(els?.territoryName)els.territoryName.value=profile.label||"Mon territoire";
  if(els?.territoryLat)els.territoryLat.value=Number(profile.center.lat).toFixed(7);
  if(els?.territoryLon)els.territoryLon.value=Number(profile.center.lon).toFixed(7);
}
function resetTerritoryRuntimeData(){
  if(state.osmLoading)cancelOsmSync();
  state.osm=[];state.osmMeta=null;state.osmBaseCoverage=[];state.osmDetailCoverage=[];state.osmCavities=[];markMapDataRevision("osm");
  state.officialCavities=[];state.cartofriches=[];state.heritageItems=[];state.cadastreBuildings=[];state.cadastreParcels=[];
  state.address=null;state.bss=[];state.elevation=null;state.selectedCavity=null;state.selectedCell=null;state.houseBuilding=null;
  state.selectionAssistVisible=false;state.guidedTourActive=false;state.guidedTourStep=0;state.osmLastError="";
  loadLocalCavities();loadLoreItems();loadCartofriches();loadHeritage();loadBssLocal();
  refreshCavities();populateCavitySelect();markSpatialIndexesDirty();hypothesisModelCache.clear();descriptionRuntime.cache.clear();
  for(const kind of ["osm","address","cadastre","cavities","elevation"])setStatus(kind,"pending","à synchroniser");
  setStatus("cartofriches",state.cartofriches.length?"ok":"pending",state.cartofriches.length?`${state.cartofriches.length} sites locaux`:"à charger");
  setStatus("heritage",state.heritageItems.length?"ok":"pending",state.heritageItems.length?`${state.heritageItems.length} notices locales`:"à synchroniser");
}
function applyRuntimeTerritoryProfile(profile){
  const normalized=applyTerritoryProfileToConfig(CONFIG,profile);
  ACTIVE_TERRITORY=normalized;HOUSE_ESTIMATE={...normalized.center};
  CONFIG.house={...normalized.center};HOUSE_WAS_SAVED=true;
  try{localStorage.setItem(territoryStorageKey("atlas-karst-house-v06",normalized),JSON.stringify(CONFIG.house))}catch{}
  state.center={...normalized.center};state.zoomIndex=0;state.depthIndex=0;state.snapshotSource=`territoire · ${normalized.label}`;
  updateTerritoryIdentityUI();populateTerritoryControls(normalized);
  if(els?.houseLat){els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7)}
  if(els?.houseHelp)els.houseHelp.innerHTML=`Repère de départ : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong> · centre du territoire actif.`;
  return normalized;
}
async function persistActiveTerritory(){
  try{await saveSnapshotToDb(buildAtlasSnapshot());updateSnapshotUI(state.snapshotSource)}catch(error){console.warn("Sauvegarde du territoire indisponible",error)}
}
async function waitForTerritoryOsmIdle(){
  for(let attempt=0;state.osmLoading&&attempt<50;attempt++)await new Promise(resolve=>setTimeout(resolve,40));
}
async function syncCoreTerritorySources({persist=true}={}){
  territoryControllerRuntime.syncs++;territoryControllerRuntime.lastAction="synchronisation du territoire";
  setTerritorySetupStatus("Territoire créé. Identification de la commune et chargement des sources principales…");
  const osmPromise=fetchOverpass();
  const address=await fetchAddress(true,{moveHouse:false});
  if(address?.citycode){
    const enriched=enrichTerritoryAdministration(CONFIG.territory,address);
    applyTerritoryProfileToConfig(CONFIG,enriched);ACTIVE_TERRITORY=CONFIG.territory;updateTerritoryIdentityUI();
  }
  const results=await Promise.allSettled([osmPromise,fetchCadastre(),fetchCavities(),fetchElevation()]);
  const rejected=results.filter(result=>result.status==="rejected").length;
  const failures=Math.max(rejected,["osm","address","cadastre","cavities","elevation"].filter(kind=>state.load[kind]==="bad").length);
  updateSnapshotUI(state.snapshotSource);updateDebugPanel(true);
  if(persist)await persistActiveTerritory();
  setTerritorySetupStatus(`${CONFIG.territory.label} est actif sur 16 × 16 km${address?.city?` · ${address.city}`:""}. ${failures?`${failures} source${failures>1?"s":""} reste${failures>1?"nt":""} indisponible${failures>1?"s":""}.`:"Les sources principales ont répondu."}`);
}
async function activateTerritory(profile,{sync=true,persist=true}={}){
  territoryControllerRuntime.lastError="";territoryControllerRuntime.lastAction="création du territoire";
  try{
    beginTerritoryDataRevision();
    if(state.osmLoading)cancelOsmSync();
    const normalized=applyRuntimeTerritoryProfile(normalizeTerritoryProfile(profile,profile));
    territoryControllerRuntime.created++;territoryControllerRuntime.resets++;
    resetTerritoryRuntimeData();state.allowNetwork=!!sync;
    updateLocationUI();updateSnapshotUI(state.snapshotSource);render("territory-change");scheduleFrameFit();
    if(persist)await persistActiveTerritory();
    if(sync){await waitForTerritoryOsmIdle();await syncCoreTerritorySources({persist})}
    else setTerritorySetupStatus(`${normalized.label} est actif sur 16 × 16 km. Les sources réseau n’ont pas été sollicitées.`);
    return normalized;
  }catch(error){
    territoryControllerRuntime.lastError=String(error?.message||error);setTerritorySetupStatus(`Création impossible : ${territoryControllerRuntime.lastError}`,true);throw error;
  }
}
async function useLocationForTerritory(){
  if(!state.userLocation)await locateUser();
  if(!state.userLocation){setTerritorySetupStatus("La position n’a pas pu être obtenue. Tu peux saisir les coordonnées manuellement.",true);return}
  territoryControllerRuntime.locationCopies++;territoryControllerRuntime.lastAction="position copiée";
  els.territoryLat.value=state.userLocation.lat.toFixed(7);els.territoryLon.value=state.userLocation.lon.toFixed(7);
  setTerritorySetupStatus(`Point de départ repris depuis la position ponctuelle · précision ± ${Math.round(state.userLocation.accuracy||0)} m.`);
}
async function createTerritoryFromControls(){
  const lat=Number(els.territoryLat.value),lon=Number(els.territoryLon.value),label=els.territoryName.value.trim()||"Mon territoire";
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -85||lat > 85||lon < -180||lon > 180){setTerritorySetupStatus("Coordonnées invalides : latitude entre −85 et 85, longitude entre −180 et 180.",true);return}
  els.territoryCreate.disabled=true;els.territoryUseLocation.disabled=true;
  try{await activateTerritory(createUserTerritoryProfile({label,center:{lat,lon}}),{sync:true,persist:true})}
  finally{els.territoryCreate.disabled=false;els.territoryUseLocation.disabled=false}
}
function bindTerritoryController(){
  if(territoryControllerRuntime.bound)return;
  territoryControllerRuntime.bound=true;populateTerritoryControls();
  els.territoryUseLocation?.addEventListener("click",useLocationForTerritory);
  els.territoryCreate?.addEventListener("click",createTerritoryFromControls);
  territoryControllerRuntime.lastAction="contrôleur lié";
}
