const territoryControllerRuntime={
  ready:true,bound:false,managerReady:false,created:0,locationCopies:0,resets:0,syncs:0,
  saves:0,loads:0,renames:0,duplicates:0,deletes:0,autosaves:0,librarySize:0,
  lastAction:"initialisation",lastError:""
};
const TERRITORY_LOCAL_STORAGE_BASES=[
  "atlas-karst-house-v06",OBSERVATION_KEY,LORE_KEY,PERSONAL_MARKER_KEY,UNDERGROUND_HYPOTHESIS_KEY,NATURE_AREAS_KEY,CARTOFRICHES_KEY,HERITAGE_KEY,BSS_LOCAL_KEY,HYDROMETRY_KEY,BIODIVERSITY_KEY,POI_ANNOTATIONS_KEY,
  ENCOUNTER_COLLECTION_KEY,"atlas-karst-cavities-v06","atlas-karst-elevation-v09d","atlas-karst-cadastre-v06","atlas-karst-cadastre-v07","atlas-karst-address-v06"
];
let territoryAutosavePromise=null;
let territorySessionDetached=false;

function setTerritorySetupStatus(message,bad=false){
  if(!els?.territorySetupStatus)return;
  if(bad)els.territorySetupStatus.innerHTML=`<span class="location-warning">${esc(message)}</span>`;
  else els.territorySetupStatus.textContent=String(message);
}
function setTerritoryLibraryStatus(message,bad=false){
  if(!els?.territoryLibraryStatus)return;
  if(bad)els.territoryLibraryStatus.innerHTML=`<span class="location-warning">${esc(message)}</span>`;
  else els.territoryLibraryStatus.textContent=String(message);
}
function populateTerritoryControls(profile=CONFIG.territory){
  if(els?.territoryName)els.territoryName.value=profile.label||"Mon territoire";
  if(els?.territoryLat)els.territoryLat.value=Number(profile.center.lat).toFixed(7);
  if(els?.territoryLon)els.territoryLon.value=Number(profile.center.lon).toFixed(7);
}
function selectedTerritoryId(){return String(els?.territoryLibrarySelect?.value||"")}
function territoryLibraryDate(value){
  const date=new Date(value);return Number.isNaN(date.getTime())?"date inconnue":date.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"});
}
function setTerritoryLibraryControlsDisabled(disabled){
  for(const control of [els?.territoryLoad,els?.territoryRename,els?.territoryDuplicate,els?.territoryDelete,els?.territoryRenameName])if(control)control.disabled=disabled;
}
async function refreshTerritoryLibraryUI(preferredId=""){
  if(!els?.territoryLibrarySelect)return [];
  const entries=await listTerritoriesFromDb(),selected=preferredId||selectedTerritoryId()||CONFIG.territory?.id;
  territoryControllerRuntime.librarySize=entries.length;
  els.territoryLibrarySelect.replaceChildren();
  if(!entries.length){
    const option=document.createElement("option");option.value="";option.textContent="Aucun territoire enregistré";els.territoryLibrarySelect.append(option);
    setTerritoryLibraryControlsDisabled(true);if(els.territorySave)els.territorySave.disabled=false;
    setTerritoryLibraryStatus("La bibliothèque locale est vide. Sauvegarde le territoire actif ou crée-en un nouveau.");return entries;
  }
  for(const entry of entries){
    const option=document.createElement("option");option.value=entry.id;option.textContent=`${entry.label}${entry.id===CONFIG.territory?.id?" · actif":""}`;els.territoryLibrarySelect.append(option);
  }
  const target=entries.some(entry=>entry.id===selected)?selected:(entries.find(entry=>entry.id===CONFIG.territory?.id)?.id||entries[0].id);
  els.territoryLibrarySelect.value=target;setTerritoryLibraryControlsDisabled(false);if(els.territorySave)els.territorySave.disabled=false;
  updateTerritoryLibrarySelection(entries);return entries;
}
function updateTerritoryLibrarySelection(entries=null){
  const id=selectedTerritoryId(),entry=(entries||[]).find(item=>item.id===id);
  if(entry){
    if(els?.territoryRenameName)els.territoryRenameName.value=entry.label;
    setTerritoryLibraryStatus(`${entry.id===CONFIG.territory?.id?"Territoire actif":"Territoire enregistré"} · dernière sauvegarde ${territoryLibraryDate(entry.updatedAt)}. L’ouverture reste hors ligne.`);
  }else if(id){
    listTerritoriesFromDb().then(items=>updateTerritoryLibrarySelection(items));
  }
}
function resetTerritoryRuntimeData(){
  if(state.osmLoading)cancelOsmSync();
  state.osm=[];state.osmMeta=null;state.osmBaseCoverage=[];state.osmDetailCoverage=[];state.osmCavities=[];markMapDataRevision("osm");
  state.officialCavities=[];state.cartofriches=[];state.heritageItems=[];state.cadastreBuildings=[];state.cadastreParcels=[];
  state.address=null;state.bss=[];state.hydrometry=[];state.biodiversity=[];state.elevation=null;state.selectedCavity=null;state.selectedCell=null;state.houseBuilding=null;
  state.selectionAssistVisible=false;state.guidedTourActive=false;state.guidedTourStep=0;state.osmLastError="";
  loadLocalCavities();loadLoreItems();loadPersonalMarkers();loadUndergroundHypotheses();loadLandscapeChanges();loadNatureAreas();loadCartofriches();loadHeritage();loadBssLocal();loadHydrometry();loadBiodiversity();loadPoiAnnotations();loadEncounterCollection();updateEncounterUI();
  refreshCavities();populateCavitySelect();markSpatialIndexesDirty();hypothesisModelCache.clear();descriptionRuntime.cache.clear();
  if(typeof renderFieldworkLedger==="function")renderFieldworkLedger();if(typeof renderUndergroundHypothesisList==="function")renderUndergroundHypothesisList();if(typeof updateLandscapeChangesUI==="function")updateLandscapeChangesUI();
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
async function persistActiveTerritory({automatic=false,refresh=true}={}){
  try{
    const record=await saveSnapshotToDb(buildAtlasSnapshot(),{setActive:true});
    territorySessionDetached=false;
    territoryControllerRuntime.saves++;if(automatic)territoryControllerRuntime.autosaves++;
    territoryControllerRuntime.lastAction=automatic?"sauvegarde automatique":"sauvegarde du territoire";
    updateSnapshotUI(state.snapshotSource);if(refresh)await refreshTerritoryLibraryUI(record.id);
    return record;
  }catch(error){
    territoryControllerRuntime.lastError=String(error?.message||error);console.warn("Sauvegarde du territoire indisponible",error);
    setTerritoryLibraryStatus(`Sauvegarde impossible : ${territoryControllerRuntime.lastError}`,true);return null;
  }
}
function autosaveActiveTerritory(){
  if(!territoryControllerRuntime.managerReady||territorySessionDetached||EMBEDDED_SNAPSHOT)return Promise.resolve(null);
  if(!territoryAutosavePromise)territoryAutosavePromise=persistActiveTerritory({automatic:true,refresh:false}).finally(()=>{territoryAutosavePromise=null});
  return territoryAutosavePromise;
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
async function activateTerritory(profile,{sync=true,persist=true,saveCurrent=true}={}){
  territoryControllerRuntime.lastError="";territoryControllerRuntime.lastAction="création du territoire";
  try{
    const incoming=normalizeTerritoryProfile(profile,profile);
    if(saveCurrent&&territoryControllerRuntime.managerReady&&!territorySessionDetached&&CONFIG.territory?.id!==incoming.id){
      const saved=await persistActiveTerritory({automatic:true,refresh:false});if(!saved)throw new Error("Le territoire actif n’a pas pu être sauvegardé avant la création");
    }
    beginTerritoryDataRevision();if(state.osmLoading)cancelOsmSync();await waitForTerritoryOsmIdle();
    const normalized=applyRuntimeTerritoryProfile(incoming);
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
async function openStoredTerritory(id,{saveCurrent=true}={}){
  const target=String(id||"");if(!target)return null;
  if(target===CONFIG.territory?.id){setTerritoryLibraryStatus(`${CONFIG.territory.label} est déjà actif.`);return CONFIG.territory}
  territoryControllerRuntime.lastError="";territoryControllerRuntime.lastAction="ouverture d’un territoire";
  try{
    if(saveCurrent&&territoryControllerRuntime.managerReady&&!territorySessionDetached){
      const saved=await persistActiveTerritory({automatic:true,refresh:false});if(!saved)throw new Error("Le territoire actif n’a pas pu être sauvegardé avant l’ouverture");
    }
    beginTerritoryDataRevision();if(state.osmLoading)cancelOsmSync();await waitForTerritoryOsmIdle();
    const snapshot=await loadTerritorySnapshotFromDb(target);if(!snapshot)throw new Error("Sauvegarde introuvable");
    applyAtlasSnapshot(snapshot,{source:`territoire enregistré · ${snapshot.territory?.label||target}`,renderNow:true});
    await setActiveTerritoryInDb(target);territorySessionDetached=false;state.allowNetwork=false;territoryControllerRuntime.loads++;
    territoryControllerRuntime.lastAction="territoire ouvert hors ligne";scheduleFrameFit();await refreshTerritoryLibraryUI(target);updateDebugPanel(true);
    setTerritoryLibraryStatus(`${CONFIG.territory.label} est ouvert depuis sa sauvegarde locale. Aucune source réseau n’a été sollicitée.`);
    return CONFIG.territory;
  }catch(error){
    territoryControllerRuntime.lastError=String(error?.message||error);setTerritoryLibraryStatus(`Ouverture impossible : ${territoryControllerRuntime.lastError}`,true);throw error;
  }
}
async function renameStoredTerritory(id,label){
  const target=String(id||""),newLabel=String(label||"").trim();if(!target||!newLabel)throw new Error("Le nom du territoire ne peut pas être vide");
  let snapshot;
  if(target===CONFIG.territory?.id){snapshot=buildAtlasSnapshot();snapshot.territory=territorySnapshot({...CONFIG.territory,label:newLabel});applyTerritoryProfileToConfig(CONFIG,snapshot.territory);ACTIVE_TERRITORY=CONFIG.territory;updateTerritoryIdentityUI();populateTerritoryControls()}
  else snapshot=await loadTerritorySnapshotFromDb(target);
  if(!snapshot)throw new Error("Sauvegarde introuvable");
  snapshot={...snapshot,territory:territorySnapshot({...snapshot.territory,label:newLabel})};
  await saveSnapshotToDb(snapshot,{setActive:target===CONFIG.territory?.id});territoryControllerRuntime.renames++;territoryControllerRuntime.lastAction="territoire renommé";
  await refreshTerritoryLibraryUI(target);return snapshot.territory;
}
async function duplicateStoredTerritory(id,label=""){
  const target=String(id||""),snapshot=await loadTerritorySnapshotFromDb(target);if(!snapshot)throw new Error("Sauvegarde introuvable");
  const entries=await listTerritoriesFromDb(),ids=new Set(entries.map(entry=>entry.id));
  let copyId=`${territorySafeId(snapshot.territory.id)}-copie-${Date.now().toString(36)}`,suffix=1;
  while(ids.has(copyId))copyId=`${territorySafeId(snapshot.territory.id)}-copie-${Date.now().toString(36)}-${suffix++}`;
  const copyLabel=String(label||"").trim()||`${snapshot.territory.label} — copie`,copy=JSON.parse(JSON.stringify(snapshot));
  copy.createdAt=new Date().toISOString();copy.territory=territorySnapshot({...snapshot.territory,id:copyId,label:copyLabel,provenance:`copie de ${snapshot.territory.label}`});
  await saveSnapshotToDb(copy,{setActive:false});territoryControllerRuntime.duplicates++;territoryControllerRuntime.lastAction="territoire dupliqué";
  await refreshTerritoryLibraryUI(copyId);setTerritoryLibraryStatus(`${copyLabel} a été dupliqué. La copie n’est pas ouverte.`);return copy.territory;
}
function removeTerritoryScopedLocalData(profile){
  for(const base of TERRITORY_LOCAL_STORAGE_BASES){try{localStorage.removeItem(territoryStorageKey(base,profile))}catch{}}
}
async function deleteStoredTerritory(id,{confirmUser=true}={}){
  const target=String(id||""),entries=await listTerritoriesFromDb(),entry=entries.find(item=>item.id===target);if(!entry)return false;
  if(confirmUser&&!confirm(`Supprimer « ${entry.label} » de la bibliothèque locale ? Cette action efface sa sauvegarde et ses notes locales sur cet appareil.`))return false;
  const wasActive=target===CONFIG.territory?.id,result=await deleteSnapshotFromDb(target);removeTerritoryScopedLocalData(entry.profile);
  territoryControllerRuntime.deletes++;territoryControllerRuntime.lastAction="territoire supprimé";
  if(wasActive&&!result.activeId)territorySessionDetached=true;
  if(wasActive&&result.activeId)await openStoredTerritory(result.activeId,{saveCurrent:false});
  else await refreshTerritoryLibraryUI(result.activeId||"");
  setTerritoryLibraryStatus(wasActive&&!result.activeId?"Le dernier territoire a été retiré de la bibliothèque. La session courante reste visible mais n’est plus sauvegardée.":`${entry.label} a été supprimé de cet appareil.`);
  return true;
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
  try{
    let profile=createUserTerritoryProfile({label,center:{lat,lon}});const ids=new Set((await listTerritoriesFromDb()).map(entry=>entry.id));
    if(ids.has(profile.id))profile=normalizeTerritoryProfile({...profile,id:`${profile.id}-${Date.now().toString(36)}`},profile);
    await activateTerritory(profile,{sync:true,persist:true,saveCurrent:true});
  }finally{els.territoryCreate.disabled=false;els.territoryUseLocation.disabled=false}
}
async function saveCurrentTerritoryFromControl(){
  if(els?.territorySave)els.territorySave.disabled=true;
  const record=await persistActiveTerritory();if(record)setTerritoryLibraryStatus(`${record.label} a été sauvegardé sur cet appareil.`);
  if(els?.territorySave)els.territorySave.disabled=false;
}
async function loadTerritoryFromControl(){try{await openStoredTerritory(selectedTerritoryId())}catch{}}
async function renameTerritoryFromControl(){
  try{const profile=await renameStoredTerritory(selectedTerritoryId(),els.territoryRenameName.value);setTerritoryLibraryStatus(`${profile.label} a été renommé.`)}
  catch(error){territoryControllerRuntime.lastError=String(error?.message||error);setTerritoryLibraryStatus(`Renommage impossible : ${territoryControllerRuntime.lastError}`,true)}
}
async function duplicateTerritoryFromControl(){
  try{await duplicateStoredTerritory(selectedTerritoryId())}
  catch(error){territoryControllerRuntime.lastError=String(error?.message||error);setTerritoryLibraryStatus(`Duplication impossible : ${territoryControllerRuntime.lastError}`,true)}
}
async function deleteTerritoryFromControl(){try{await deleteStoredTerritory(selectedTerritoryId())}catch(error){territoryControllerRuntime.lastError=String(error?.message||error);setTerritoryLibraryStatus(`Suppression impossible : ${territoryControllerRuntime.lastError}`,true)}}
async function initializeTerritoryManager(){
  try{
    let entries=await listTerritoriesFromDb();
    if(!entries.length&&!EMBEDDED_SNAPSHOT){await persistActiveTerritory({automatic:true,refresh:false});entries=await listTerritoriesFromDb()}
    territoryControllerRuntime.managerReady=true;territoryControllerRuntime.librarySize=entries.length;
    await refreshTerritoryLibraryUI(CONFIG.territory?.id);territoryControllerRuntime.lastAction="gestionnaire prêt";
  }catch(error){territoryControllerRuntime.lastError=String(error?.message||error);setTerritoryLibraryStatus(`Bibliothèque indisponible : ${territoryControllerRuntime.lastError}`,true)}
}
function bindTerritoryController(){
  if(territoryControllerRuntime.bound)return;
  territoryControllerRuntime.bound=true;populateTerritoryControls();
  els.territoryUseLocation?.addEventListener("click",useLocationForTerritory);
  els.territoryCreate?.addEventListener("click",createTerritoryFromControls);
  els.territoryLibrarySelect?.addEventListener("change",()=>listTerritoriesFromDb().then(updateTerritoryLibrarySelection));
  els.territoryLoad?.addEventListener("click",loadTerritoryFromControl);
  els.territorySave?.addEventListener("click",saveCurrentTerritoryFromControl);
  els.territoryRename?.addEventListener("click",renameTerritoryFromControl);
  els.territoryDuplicate?.addEventListener("click",duplicateTerritoryFromControl);
  els.territoryDelete?.addEventListener("click",deleteTerritoryFromControl);
  territoryControllerRuntime.lastAction="contrôleur lié";
}
