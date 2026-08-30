const SNAPSHOT_SCHEMA_VERSION=3;
const SNAPSHOT_IMPORT_LIMIT_BYTES=64*1024*1024;
const SNAPSHOT_LAYER_KEYS=["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerHydrometry","layerBiodiversity","layerNatureAreas","layerIndustrialHistory","layerLandCover","layerGeology","layerObservations","layerPersonal","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerUserHypotheses","layerHydrology","layerLabels","layerHouse","ambientMotion"];
const snapshotRuntime={
  ready:true,bound:false,built:0,applied:0,imports:0,exports:0,standaloneExports:0,
  dbSaves:0,dbLoads:0,dbDeletes:0,dbLists:0,migrations:0,lastSchema:SNAPSHOT_SCHEMA_VERSION,lastSource:"—",lastError:"",pendingExport:null,pendingImport:null
};

function recordSnapshotError(error){
  snapshotRuntime.lastError=String(error?.message||error||"Erreur d’instantané");
  return error;
}

function validateAtlasSnapshot(snapshot){
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))throw recordSnapshotError(new Error("Format d’instantané non reconnu"));
  if(snapshot.format!=="atlas-karst-snapshot"||!snapshot.data||typeof snapshot.data!=="object"||Array.isArray(snapshot.data))throw recordSnapshotError(new Error("Format d’instantané non reconnu"));
  const schema=Number(snapshot.schema??1);
  if(!Number.isInteger(schema)||schema<1)throw recordSnapshotError(new Error("Version d’instantané invalide"));
  if(schema>SNAPSHOT_SCHEMA_VERSION)throw recordSnapshotError(new Error(`Cet instantané utilise le schéma ${schema}, plus récent que le schéma ${SNAPSHOT_SCHEMA_VERSION} pris en charge.`));
  snapshotRuntime.lastSchema=schema;snapshotRuntime.lastError="";
  return snapshot;
}

function downloadBlob(content,type,filename){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=filename;a.hidden=true;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},1500);
}

function nativeCarnetFiles(){
  return isNativeAndroidApp()?window.Capacitor?.Plugins?.CarnetFiles||null:null;
}

function buildAtlasSnapshot(){
  snapshotRuntime.built++;
  return {
    format:"atlas-karst-snapshot",schema:SNAPSHOT_SCHEMA_VERSION,appVersion:APP_VERSION,createdAt:new Date().toISOString(),
    territory:territorySnapshot(CONFIG.territory),
    house:{...CONFIG.house},
    view:{mode:"classic",renderMode:state.renderMode,zoomIndex:state.zoomIndex,depthIndex:state.depthIndex,center:{...state.center},scenario:state.scenario,layers:Object.fromEntries(SNAPSHOT_LAYER_KEYS.map(k=>[k,!!state[k]]))},
    data:{
      osm:state.osm||[],osmMeta:state.osmMeta||null,osmBaseCoverage:state.osmBaseCoverage||[],osmDetailCoverage:state.osmDetailCoverage||[],
      officialCavities:state.officialCavities||[],cartofriches:state.cartofriches||[],heritageItems:state.heritageItems||[],heritageEnabled:state.heritageEnabled||{},
      cadastreBuildings:state.cadastreBuildings||[],cadastreParcels:state.cadastreParcels||[],address:state.address||null,
      bss:state.bss||[],hydrometry:state.hydrometry||[],biodiversity:state.biodiversity||[],biodiversityEnabled:state.biodiversityEnabled||{},natureAreas:state.natureAreas||[],landCover:state.landCover||[],geology:state.geology||[],carnetProfile:state.carnetProfile||{},poiAnnotations:state.poiAnnotations||{},elevation:state.elevation||null,observations:state.observations||[],personalMarkers:state.personalMarkers||[],undergroundHypotheses:state.undergroundHypotheses||[],landscapeChanges:state.landscapeChanges||[],loreItems:state.loreItems||[],encounterCollection:state.encounterCollection||{},encounterEnabled:!!state.encounterEnabled
    }
  };
}

function snapshotCounts(s=buildAtlasSnapshot()){
  const d=s.data||{};
  return {osm:d.osm?.length||0,buildings:d.cadastreBuildings?.length||0,parcels:d.cadastreParcels?.length||0,cavities:d.officialCavities?.length||0,carto:d.cartofriches?.length||0,bss:d.bss?.length||0,hydrometry:d.hydrometry?.length||0,biodiversity:d.biodiversity?.length||0,biodiversitySpecies:biodiversityUniqueSpecies(d.biodiversity||[]),nature:d.natureAreas?.length||0,annotations:Object.keys(d.poiAnnotations||{}).length,observations:d.observations?.length||0,personal:d.personalMarkers?.length||0,underground:d.undergroundHypotheses?.length||0,lore:d.loreItems?.length||0,heritage:d.heritageItems?.length||0,codex:Object.values(d.encounterCollection||{}).filter(v=>encounterStatusRank(v?.status)>=2).length,elevation:d.elevation?"oui":"non"};
}

function updateCarnetExportSummary(){
  if(!els.carnetExportSummary)return;
  const c=snapshotCounts(),profile=state.carnetProfile||normalizeCarnetProfile();
  const personal=c.observations+c.personal+c.underground+c.lore+c.annotations;
  const sources=c.cavities+c.carto+c.heritage+c.bss+c.hydrometry+c.biodiversity+c.nature;
  const introduction=profile.intro||profile.focus?"présentation incluse":"sans texte d’ouverture";
  els.carnetExportSummary.textContent=`Prêt à partager : ${CONFIG.territory.label} · ${profile.author||"auteur non indiqué"} · ${introduction}. Le .atlas contiendra ${personal} contribution${personal>1?"s":""} de carnet et ${sources} repère${sources>1?"s":""} documentaire${sources>1?"s":""}. OSM, cadastre et relief restent hors du fichier.`;
}

function updateSnapshotUI(source=state.snapshotSource){
  if(!els.snapshotStatus)return;
  const c=snapshotCounts();
  els.snapshotStatus.innerHTML=`<span><strong>État actif :</strong> ${esc(source||"session courante")}</span><span>Territoire ${esc(CONFIG.territory.label)} · ${CONFIG.dataWidthKm} × ${CONFIG.dataHeightKm} km</span><span>OSM ${c.osm.toLocaleString("fr-FR")} · bâti ${c.buildings.toLocaleString("fr-FR")} · parcelles ${c.parcels.toLocaleString("fr-FR")}</span><span>Cavités ${c.cavities} · Cartofriches ${c.carto} · patrimoine ${c.heritage} · BSS ${c.bss.toLocaleString("fr-FR")} · hydro ${c.hydrometry}</span><span>Biodiversité ${c.biodiversitySpecies} espèces/${c.biodiversity} mailles · espaces naturels ${c.nature} · annotations ${c.annotations} · observations ${c.observations} · repères ${c.personal} · hypothèses ${c.underground} · mémoire locale ${c.lore} · relief ${c.elevation}</span>`;
  updateCarnetExportSummary();
}

function openSnapshotDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB indisponible"));return}
    const req=indexedDB.open(SNAPSHOT_DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(SNAPSHOT_DB_STORE))db.createObjectStore(SNAPSHOT_DB_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Ouverture IndexedDB impossible"));
  });
}

function territorySnapshotDbKey(id){return `${TERRITORY_SNAPSHOT_PREFIX}${String(id||"").trim()}`}
function normalizeTerritoryRegistry(value){
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const entries=[],seen=new Set();
  for(const item of Array.isArray(raw.entries)?raw.entries:[]){
    const profile=normalizeTerritoryProfile(item?.profile||item,LEGACY_TERRITORY_PROFILE);
    if(!profile.id||seen.has(profile.id))continue;seen.add(profile.id);
    entries.push({
      id:profile.id,label:profile.label,profile:territorySnapshot(profile),
      createdAt:String(item.createdAt||item.updatedAt||new Date().toISOString()),
      updatedAt:String(item.updatedAt||item.createdAt||new Date().toISOString()),
      lastOpenedAt:String(item.lastOpenedAt||item.updatedAt||item.createdAt||new Date().toISOString())
    });
  }
  return {schema:1,activeId:seen.has(raw.activeId)?raw.activeId:(entries[0]?.id||""),entries};
}
function territoryRecordFromSnapshot(snapshot,previous=null,{opened=false}={}){
  const now=new Date().toISOString(),profile=normalizeTerritoryProfile(snapshot.territory,LEGACY_TERRITORY_PROFILE);
  return {
    id:profile.id,label:profile.label,profile:territorySnapshot(profile),
    createdAt:String(previous?.createdAt||snapshot.createdAt||now),updatedAt:now,
    lastOpenedAt:opened?now:String(previous?.lastOpenedAt||previous?.updatedAt||now)
  };
}
async function readSnapshotDbValue(key){
  const db=await openSnapshotDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(SNAPSHOT_DB_STORE,"readonly"),req=tx.objectStore(SNAPSHOT_DB_STORE).get(key);
    req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);
    tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
  });
}
async function writeSnapshotDbValues(values,deletes=[]){
  const db=await openSnapshotDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite"),store=tx.objectStore(SNAPSHOT_DB_STORE);
    for(const [key,value] of values)store.put(value,key);
    for(const key of deletes)store.delete(key);
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{const error=tx.error||new Error("Écriture IndexedDB impossible");db.close();reject(error)};
    tx.onabort=()=>{const error=tx.error||new Error("Transaction IndexedDB interrompue");db.close();reject(error)};
  });
}
async function loadTerritoryRegistryFromDb(){
  try{return normalizeTerritoryRegistry(await readSnapshotDbValue(TERRITORY_REGISTRY_KEY))}
  catch(error){recordSnapshotError(error);return normalizeTerritoryRegistry(null)}
}
async function saveTerritoryRegistryToDb(registry){
  const normalized=normalizeTerritoryRegistry(registry);
  await writeSnapshotDbValues([[TERRITORY_REGISTRY_KEY,normalized]]);return normalized;
}
async function listTerritoriesFromDb(){
  const registry=await loadTerritoryRegistryFromDb();snapshotRuntime.dbLists++;
  return registry.entries.slice().sort((a,b)=>String(b.lastOpenedAt).localeCompare(String(a.lastOpenedAt)));
}
async function saveSnapshotToDb(snapshot,{setActive=true}={}){
  validateAtlasSnapshot(snapshot);
  try{
    const registry=await loadTerritoryRegistryFromDb(),id=normalizeTerritoryProfile(snapshot.territory,LEGACY_TERRITORY_PROFILE).id;
    const previous=registry.entries.find(entry=>entry.id===id)||null,record=territoryRecordFromSnapshot(snapshot,previous,{opened:setActive});
    registry.entries=registry.entries.filter(entry=>entry.id!==id);registry.entries.push(record);
    if(setActive||!registry.activeId)registry.activeId=id;
    await writeSnapshotDbValues([
      [territorySnapshotDbKey(id),{...snapshot,savedAt:record.updatedAt}],
      [TERRITORY_REGISTRY_KEY,normalizeTerritoryRegistry(registry)]
    ],[SNAPSHOT_DB_KEY]);
    snapshotRuntime.dbSaves++;snapshotRuntime.lastError="";return record;
  }catch(error){recordSnapshotError(error);throw error}
}
async function loadTerritorySnapshotFromDb(id){
  try{
    const snapshot=await readSnapshotDbValue(territorySnapshotDbKey(id));
    if(snapshot){validateAtlasSnapshot(snapshot);snapshotRuntime.dbLoads++}
    return snapshot||null;
  }catch(error){recordSnapshotError(error);return null}
}
async function setActiveTerritoryInDb(id){
  const registry=await loadTerritoryRegistryFromDb(),entry=registry.entries.find(item=>item.id===id);
  if(!entry)return false;
  entry.lastOpenedAt=new Date().toISOString();registry.activeId=id;
  await saveTerritoryRegistryToDb(registry);return true;
}
async function loadSnapshotFromDb(){
  try{
    const registry=await loadTerritoryRegistryFromDb();
    const candidates=[registry.activeId,...registry.entries.map(entry=>entry.id)].filter((id,index,list)=>id&&list.indexOf(id)===index);
    for(const id of candidates){
      const snapshot=await loadTerritorySnapshotFromDb(id);
      if(snapshot){if(registry.activeId!==id)await setActiveTerritoryInDb(id);return snapshot}
    }
    const legacy=await readSnapshotDbValue(SNAPSHOT_DB_KEY);
    if(legacy){
      validateAtlasSnapshot(legacy);await saveSnapshotToDb(legacy,{setActive:true});snapshotRuntime.migrations++;snapshotRuntime.lastSource="migration de l’instantané actif";return legacy;
    }
    return null;
  }catch(error){recordSnapshotError(error);return null}
}
async function deleteSnapshotFromDb(id=""){
  try{
    const registry=await loadTerritoryRegistryFromDb(),target=String(id||registry.activeId||CONFIG.territory?.id||"");
    registry.entries=registry.entries.filter(entry=>entry.id!==target);
    if(registry.activeId===target)registry.activeId=registry.entries.slice().sort((a,b)=>String(b.lastOpenedAt).localeCompare(String(a.lastOpenedAt)))[0]?.id||"";
    await writeSnapshotDbValues([[TERRITORY_REGISTRY_KEY,normalizeTerritoryRegistry(registry)]],[territorySnapshotDbKey(target),SNAPSHOT_DB_KEY]);
    snapshotRuntime.dbDeletes++;snapshotRuntime.lastError="";return {deletedId:target,activeId:registry.activeId,entries:registry.entries};
  }catch(error){recordSnapshotError(error);return {deletedId:"",activeId:"",entries:[]}}
}
async function clearTerritoryLibraryFromDb(){
  try{
    const db=await openSnapshotDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite"),store=tx.objectStore(SNAPSHOT_DB_STORE),req=store.getAllKeys();
      req.onsuccess=()=>{for(const key of req.result||[])if(key===SNAPSHOT_DB_KEY||key===TERRITORY_REGISTRY_KEY||String(key).startsWith(TERRITORY_SNAPSHOT_PREFIX))store.delete(key)};
      req.onerror=()=>reject(req.error);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Nettoyage IndexedDB interrompu"));
    });
    db.close();snapshotRuntime.dbDeletes++;snapshotRuntime.lastError="";
  }catch(error){recordSnapshotError(error)}
}

function applyAtlasSnapshot(snapshot,{source="instantané",renderNow=true}={}){
  validateAtlasSnapshot(snapshot);
  const d=snapshot.data,v=snapshot.view||{};
  ACTIVE_TERRITORY=applyTerritoryProfileToConfig(CONFIG,normalizeTerritoryProfile(snapshot.territory,CONFIG.territory));
  HOUSE_ESTIMATE={...ACTIVE_TERRITORY.center};updateTerritoryIdentityUI();
  if(typeof populateTerritoryControls==="function")populateTerritoryControls(ACTIVE_TERRITORY);
  if(snapshot.house&&Number.isFinite(+snapshot.house.lat)&&Number.isFinite(+snapshot.house.lon)){
    CONFIG.house={lat:+snapshot.house.lat,lon:+snapshot.house.lon};HOUSE_WAS_SAVED=true;markSpatialIndexesDirty();
    els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  }
  state.osm=Array.isArray(d.osm)?d.osm:[];markMapDataRevision("osm");state.osmMeta=d.osmMeta||null;
  state.osmBaseCoverage=Array.isArray(d.osmBaseCoverage)?d.osmBaseCoverage:[];state.osmDetailCoverage=Array.isArray(d.osmDetailCoverage)?d.osmDetailCoverage:[];
  state.osmCavities=extractOsmCavities(state.osm);
  state.officialCavities=Array.isArray(d.officialCavities)?d.officialCavities:[];
  state.cartofriches=Array.isArray(d.cartofriches)?d.cartofriches:[];state.heritageItems=Array.isArray(d.heritageItems)?d.heritageItems.map(normalizeHeritageItem).filter(Boolean):[];state.heritageEnabled={...state.heritageEnabled,...(d.heritageEnabled||{})};
  state.cadastreBuildings=Array.isArray(d.cadastreBuildings)?d.cadastreBuildings:[];state.cadastreParcels=Array.isArray(d.cadastreParcels)?d.cadastreParcels:[];
  state.address=d.address||null;state.bss=Array.isArray(d.bss)&&d.bss.length?d.bss:mergeBssItems(territoryUsesEmbeddedData("bss",CONFIG.territory)?BSS_EMBEDDED_LOCAL:[]);state.hydrometry=Array.isArray(d.hydrometry)?d.hydrometry:[];state.biodiversity=Array.isArray(d.biodiversity)?d.biodiversity:[];state.biodiversityEnabled={...state.biodiversityEnabled,...(d.biodiversityEnabled||{})};state.natureAreas=Array.isArray(d.natureAreas)?d.natureAreas:[];saveNatureAreas();state.landCover=Array.isArray(d.landCover)?d.landCover:[];saveLandCover();state.geology=Array.isArray(d.geology)?d.geology:[];saveGeology();state.carnetProfile=normalizeCarnetProfile(d.carnetProfile);try{localStorage.setItem(territoryStorageKey(CARNET_PROFILE_KEY),JSON.stringify(state.carnetProfile))}catch{}updateCarnetProfileUI();state.elevation=d.elevation||null;
  if(d.poiAnnotations&&typeof d.poiAnnotations==="object"&&!Array.isArray(d.poiAnnotations)){state.poiAnnotations=normalizePoiAnnotations(d.poiAnnotations);persistPoiAnnotations()}else loadPoiAnnotations();
  state.observations=Array.isArray(d.observations)?d.observations:[];state.personalMarkers=Array.isArray(d.personalMarkers)?d.personalMarkers:[];state.undergroundHypotheses=Array.isArray(d.undergroundHypotheses)?d.undergroundHypotheses:[];state.landscapeChanges=Array.isArray(d.landscapeChanges)?d.landscapeChanges:[];state.loreItems=Array.isArray(d.loreItems)?d.loreItems:[];savePersonalMarkers();saveUndergroundHypotheses();saveLandscapeChanges();state.encounterCollection=d.encounterCollection&&typeof d.encounterCollection==="object"&&!Array.isArray(d.encounterCollection)?d.encounterCollection:state.encounterCollection;state.encounterEnabled=d.encounterEnabled!==undefined?!!d.encounterEnabled:state.encounterEnabled;saveEncounterCollection();
  state.zoomIndex=clamp(Number(v.zoomIndex??state.zoomIndex),0,CONFIG.zooms.length-1);state.depthIndex=clamp(Number(v.depthIndex??state.depthIndex),0,CONFIG.depths.length-1);
  state.center=v.center&&Number.isFinite(+v.center.lat)&&Number.isFinite(+v.center.lon)?clampCenter({lat:+v.center.lat,lon:+v.center.lon},CONFIG.zooms[state.zoomIndex]):{...CONFIG.house};
  state.scenario=v.scenario||state.scenario;els.scenario.value=state.scenario;
  state.renderMode=v.renderMode==="ascii"?"ascii":v.renderMode==="symbolic"?"symbolic":state.renderMode;
  if(v.layers&&typeof v.layers==="object")for(const [k,value] of Object.entries(v.layers)){if(SNAPSHOT_LAYER_KEYS.includes(k)&&k in state){state[k]=!!value;if(els[k])els[k].checked=!!value}}
  state.allowNetwork=FORCE_ONLINE;state.snapshotSource=source;state.selectedCell=null;state.selectionAssistVisible=false;state.guidedTourActive=false;state.guidedTourStep=0;
  refreshCavities();updateBssUI();updateHydrometryUI();updateBiodiversityUI();updateNatureAreasUI();updateLandCoverUI();updateCartofrichesUI();updateHeritageUI();populateCavitySelect();
  if(typeof renderFieldworkLedger==="function")renderFieldworkLedger();if(typeof renderUndergroundHypothesisList==="function")renderUndergroundHypothesisList();if(typeof updateLandscapeChangesUI==="function")updateLandscapeChangesUI();
  setStatus("osm","ok",state.osm.length?`${state.osm.length} objets · instantané`:"instantané sans OSM");
  setStatus("address",state.address?"ok":"bad",state.address?"instantané":"non embarqué");
  const cadastreEmbedded=state.cadastreBuildings.length||state.cadastreParcels.length;
  setStatus("cadastre",cadastreEmbedded?"ok":"bad",cadastreEmbedded?`${state.cadastreBuildings.length} bât. · ${state.cadastreParcels.length} parc. · instantané`:"absent de cette sauvegarde");
  setStatus("cavities",state.officialCavities.length?"ok":"bad",state.officialCavities.length?`${state.officialCavities.length} · instantané`:"repères locaux seulement");
  setStatus("heritage",state.heritageItems.length?"ok":"pending",state.heritageItems.length?`${state.heritageItems.length} · instantané`:"non embarqué");
  setStatus("nature",state.natureAreas.length?"ok":"pending",state.natureAreas.length?`${state.natureAreas.length} · instantané`:"non embarqué");
  setStatus("elevation",state.elevation?"ok":"bad",state.elevation?"instantané":"non embarqué");
  if(els.offlineNotice)els.offlineNotice.style.display="block";
  els.retryData.textContent="↻ actualiser les sources en ligne";
  els.sourceNote.innerHTML=`Atlas chargé depuis un <strong>${esc(source)}</strong>. Aucune requête réseau automatique n’est effectuée ; le bouton d’actualisation réactive volontairement les services distants.`;
  snapshotRuntime.applied++;snapshotRuntime.lastSource=source;snapshotRuntime.lastError="";
  updateSnapshotUI(source);updateEncounterUI();
  if(renderNow)render("snapshot-apply");
}

function carnetFilename(){
  const slug=territorySafeId(CONFIG.territory?.label||CONFIG.territory?.id||"carnet");
  return `${slug}-${new Date().toISOString().slice(0,10)}.atlas`;
}
function carnetReviewHtml(snapshot,{name="Carnet actuel",mode="export"}={}){
  const c=snapshotCounts(snapshot),profile=normalizeCarnetProfile(snapshot.data?.carnetProfile||state.carnetProfile),territory=normalizeTerritoryProfile(snapshot.territory,CONFIG.territory),notes=c.annotations+c.personal+c.lore;
  const rows=mode==="export"?[["Territoire",`${territory.label} · ${territory.widthKm||CONFIG.dataWidthKm} × ${territory.heightKm||CONFIG.dataHeightKm} km`],["Auteur",profile.author||"non renseigné"],["Notes et repères",String(notes)],["Observations",String(c.observations)],["Hypothèses de sous-sol",String(c.underground)]]:[["Fichier",name],["Territoire",territory.label],["Auteur",profile.author||"non renseigné"],["Contributions",`${notes} note${notes>1?"s":""} · ${c.observations} observation${c.observations>1?"s":""} · ${c.underground} hypothèse${c.underground>1?"s":""}`]];
  return rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
}
function openCarnetDialog(dialog){try{dialog?.showModal();return !!dialog}catch{return false}}
async function exportSnapshotJson({confirmed=false}={}){
  try{
    const carnet=await buildAtlasCarnet(),json=JSON.stringify(carnet,null,2),bytes=new Blob([json]).size;
    if(bytes>ATLAS_CARNET_IMPORT_LIMIT_BYTES)throw new Error("Ce carnet dépasse 16 Mo. Retire des extraits documentaires avant de l’exporter.");
    if(!confirmed){snapshotRuntime.pendingExport={json,bytes,filename:carnetFilename(),snapshot:buildAtlasSnapshot()};if(els.carnetExportReview)els.carnetExportReview.innerHTML=carnetReviewHtml(snapshotRuntime.pendingExport.snapshot);if(openCarnetDialog(els.carnetExportDialog))return}
    const pending=snapshotRuntime.pendingExport,exportJson=pending?.json||json,exportBytes=pending?.bytes||bytes,filename=pending?.filename||carnetFilename(),nativeFiles=nativeCarnetFiles();
    if(nativeFiles?.save)await nativeFiles.save({content:exportJson,filename});else downloadBlob(exportJson,"application/vnd.atlas+carnet+json;charset=utf-8",filename);
    snapshotRuntime.pendingExport=null;snapshotRuntime.exports++;carnetRuntime.exports++;carnetRuntime.lastBytes=exportBytes;snapshotRuntime.lastSource="export .atlas";
    els.snapshotHelp.textContent=exportBytes>ATLAS_CARNET_RECOMMENDED_BYTES
      ? `Carnet exporté (${debugFormatBytes(exportBytes)}). Il dépasse le budget conseillé de 4 Mo, mais reste valide.`
      : `Carnet portable exporté (${debugFormatBytes(exportBytes)}). Les caches cartographiques lourds ont été laissés de côté.`;
  }catch(error){recordSnapshotError(error);carnetRecordError(error);els.snapshotHelp.textContent=`Export impossible : ${error?.message||"erreur inconnue"}`}
}
function importedTerritoryCopy(snapshot,entries,fileName,{forceCopy=false}={}){
  const profile=normalizeTerritoryProfile(snapshot.territory,LEGACY_TERRITORY_PROFILE);
  if(!forceCopy&&!entries.some(entry=>entry.id===profile.id))return {snapshot,copied:false};
  const ids=new Set(entries.map(entry=>entry.id)),base=`${territorySafeId(profile.id)}-import`,stamp=Date.now().toString(36);let id=`${base}-${stamp}`,suffix=1;
  while(ids.has(id))id=`${base}-${stamp}-${suffix++}`;
  const copy=carnetJsonClone(snapshot);copy.createdAt=new Date().toISOString();copy.territory=territorySnapshot({...profile,id,label:`${profile.label} — import`,provenance:`import de ${fileName||profile.label}`});
  return {snapshot:copy,copied:true};
}

function contributionKey(item,index){return item&&typeof item==="object"?String(item.id||item.uid||item.poiId||item.key||`${item.name||item.title||"entrée"}:${item.lat??item.latitude??""}:${item.lon??item.longitude??""}`):`${String(item)}:${index}`}
function mergeContributionList(current,incoming){const base=Array.isArray(current)?current:[],seen=new Set(base.map(contributionKey));return [...base,...(Array.isArray(incoming)?incoming:[]).filter((item,index)=>{const key=contributionKey(item,index);if(seen.has(key))return false;seen.add(key);return true})]}
function mergeImportedCarnet(snapshot){const current=buildAtlasSnapshot(),incoming=snapshot.data||{},data=current.data;for(const key of ["observations","personalMarkers","undergroundHypotheses","landscapeChanges","loreItems"])data[key]=mergeContributionList(data[key],incoming[key]);data.poiAnnotations={...(incoming.poiAnnotations||{}),...(data.poiAnnotations||{})};current.createdAt=new Date().toISOString();return current}
function presentSnapshotImport(snapshot,{name,isCarnet}={}){
  const sameTerritory=normalizeTerritoryProfile(snapshot.territory,LEGACY_TERRITORY_PROFILE).id===CONFIG.territory?.id;snapshotRuntime.pendingImport={snapshot,name,isCarnet,sameTerritory};
  if(els.carnetImportReview)els.carnetImportReview.innerHTML=carnetReviewHtml(snapshot,{name,mode:"import"});
  if(els.carnetImportMergeNote)els.carnetImportMergeNote.textContent=sameTerritory?"Fusion contrôlée : seules les notes, observations, repères, annotations et hypothèses du fichier seront ajoutés. Les données cartographiques du carnet courant restent en place.":"La fusion est réservée au même territoire. Ouvre ce carnet comme une copie indépendante pour préserver ses repères et ses données.";
  if(els.confirmCarnetImportMerge){els.confirmCarnetImportMerge.disabled=!sameTerritory;els.confirmCarnetImportMerge.hidden=!sameTerritory}openCarnetDialog(els.carnetImportDialog);
}
async function completeSnapshotImport(mode="copy"){
  const pending=snapshotRuntime.pendingImport;if(!pending)return;
  try{
    let snapshot=pending.snapshot,merged=false;if(mode==="merge"){if(!pending.sameTerritory)throw new Error("La fusion est possible uniquement avec le territoire actif.");snapshot=mergeImportedCarnet(snapshot);merged=true}else snapshot=importedTerritoryCopy(snapshot,await listTerritoriesFromDb(),pending.name,{forceCopy:true}).snapshot;
    if(typeof persistActiveTerritory==="function"&&territoryControllerRuntime?.managerReady&&!territorySessionDetached){const saved=await persistActiveTerritory({automatic:true,refresh:false});if(!saved)throw new Error("Le territoire actif n’a pas pu être sauvegardé avant l’import")}
    applyAtlasSnapshot(snapshot,{source:`${pending.isCarnet?"carnet":"sauvegarde historique"} ${merged?"fusionné":"importé"} · ${pending.name}`});await saveSnapshotToDb(snapshot);if(typeof refreshTerritoryLibraryUI==="function")await refreshTerritoryLibraryUI(snapshot.territory?.id);
    snapshotRuntime.pendingImport=null;snapshotRuntime.imports++;if(pending.isCarnet)carnetRuntime.imports++;snapshotRuntime.lastSource=pending.name;els.snapshotHelp.textContent=merged?"Contributions fusionnées dans le carnet courant ; ses couches cartographiques n’ont pas été remplacées.":"Carnet ouvert comme une copie indépendante dans la bibliothèque locale.";
  }catch(error){recordSnapshotError(error);els.snapshotHelp.textContent=`Import impossible : ${error?.message||"fichier invalide"}`}
}

async function importSnapshotPayload({name="carnet.atlas",size=0,text}={}){
  try{
    const content=typeof text==="function"?await text():String(text||""),bytes=Number(size)||new Blob([content]).size;
    if(bytes>SNAPSHOT_IMPORT_LIMIT_BYTES)throw new Error("Ce fichier dépasse la limite de 64 Mo prévue pour un instantané local.");
    const document=JSON.parse(content),isCarnet=document?.format===ATLAS_CARNET_FORMAT;
    if(isCarnet&&bytes>ATLAS_CARNET_IMPORT_LIMIT_BYTES)throw new Error("Ce carnet dépasse la limite portable de 16 Mo.");
    let snapshot=isCarnet?await atlasCarnetToSnapshot(document):validateAtlasSnapshot(document);
    if(!isCarnet)carnetRuntime.migrations++;
    presentSnapshotImport(snapshot,{name,isCarnet});
  }catch(error){
    recordSnapshotError(error);if(error?.message?.includes("carnet")||error?.message?.includes("intégrité"))carnetRecordError(error);
    els.snapshotHelp.textContent=`Import impossible : ${error?.message||"fichier invalide"}`;
  }
}
async function importSnapshotFile(file){
  if(!file)return;
  await importSnapshotPayload({name:file.name,size:file.size,text:()=>file.text()});
  els.snapshotFile.value="";
}
async function importSnapshotFromNative(){
  const nativeFiles=nativeCarnetFiles();
  if(!nativeFiles?.pick){els.snapshotFile.click();return}
  try{
    const file=await nativeFiles.pick({maxBytes:SNAPSHOT_IMPORT_LIMIT_BYTES});
    await importSnapshotPayload(file);
  }catch(error){
    if(!String(error?.message||error).toLowerCase().includes("annul")){
      recordSnapshotError(error);els.snapshotHelp.textContent=`Import impossible : ${error?.message||"fichier invalide"}`;
    }
  }
}

function exportStandaloneHtml(){
  const snapshot=buildAtlasSnapshot(),clone=document.documentElement.cloneNode(true);
    const tip=clone.querySelector("#hoverTip");if(tip)tip.textContent="";
  const assist=clone.querySelector("#selectionAssist");if(assist)assist.setAttribute("hidden","");
  const snapTag=clone.querySelector("#atlas-snapshot");
  snapTag.textContent=JSON.stringify(snapshot).replace(/</g,"\\u003c");
  const title=clone.querySelector("title");if(title)title.textContent=`Atlas Karst ASCII ${APP_VERSION} · instantané autonome`;
  downloadBlob("<!doctype html>\n"+clone.outerHTML,"text/html;charset=utf-8",`atlas-karst-autonome-${new Date().toISOString().slice(0,10)}.html`);
  snapshotRuntime.standaloneExports++;snapshotRuntime.lastSource="export HTML autonome";
  els.snapshotHelp.textContent="HTML autonome généré. Il contient les données actuellement chargées et démarrera hors ligne par défaut.";
}

function exportTxt(){
  if(!state.lastGrid)return;
  const lines=[];
  for(let y=0;y<CONFIG.gridH;y++)lines.push(state.lastGrid.grid[y].map(c=>c.ch).join(""));
  const z=currentZoom(),d=currentDepth();
  const header=[
    `ATLAS KARST ASCII v${APP_VERSION} · moteur Canvas et index spatial`,
    `Échelle : ${z.label} (${z.widthKm} × ${z.heightKm} km)`,
    `Centre : ${state.center.lat}, ${state.center.lon}`,
    `Coupe : ${depthSliceLabel(d)}${d===0?"":` (${depthSliceMeta(d).range})`}`,
    `Scénario : ${state.scenario}`,
    "ATTENTION : coupes souterraines extrapolées. Les profondeurs précédées de ≈ ne sont pas des mesures locales sauf mention explicite.",
    ""
  ].join("\n");
  downloadBlob(header+lines.join("\n"),"text/plain;charset=utf-8",`atlas-karst-${z.id}-${d}m.txt`);
}

function bindSnapshotManager(){
  if(snapshotRuntime.bound)return;
  snapshotRuntime.bound=true;
  els.exportSnapshotJson.addEventListener("click",exportSnapshotJson);
  els.confirmCarnetExport?.addEventListener("click",()=>{els.carnetExportDialog?.close();exportSnapshotJson({confirmed:true})});
  els.saveCarnetProfile?.addEventListener("click",saveCarnetProfile);
  els.importSnapshotJson.addEventListener("click",importSnapshotFromNative);
  els.confirmCarnetImportCopy?.addEventListener("click",()=>{els.carnetImportDialog?.close();completeSnapshotImport("copy")});
  els.confirmCarnetImportMerge?.addEventListener("click",()=>{els.carnetImportDialog?.close();completeSnapshotImport("merge")});
  els.snapshotFile.addEventListener("change",event=>importSnapshotFile(event.target.files?.[0]));
  els.exportStandaloneHtml.addEventListener("click",exportStandaloneHtml);
  els.clearSavedSnapshot.addEventListener("click",async()=>{
    if(typeof deleteStoredTerritory==="function"){
      const deleted=await deleteStoredTerritory(CONFIG.territory?.id);
      if(deleted)els.snapshotHelp.textContent="Le territoire actif a été supprimé de la bibliothèque locale.";
      return;
    }
    await deleteSnapshotFromDb();state.snapshotSource="session courante";updateSnapshotUI();
  });
}
