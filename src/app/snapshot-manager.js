const SNAPSHOT_SCHEMA_VERSION=3;
const SNAPSHOT_IMPORT_LIMIT_BYTES=64*1024*1024;
const SNAPSHOT_LAYER_KEYS=["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"];
const snapshotRuntime={
  ready:true,bound:false,built:0,applied:0,imports:0,exports:0,standaloneExports:0,
  dbSaves:0,dbLoads:0,dbDeletes:0,lastSchema:SNAPSHOT_SCHEMA_VERSION,lastSource:"—",lastError:""
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
      bss:state.bss||[],elevation:state.elevation||null,observations:state.observations||[],loreItems:state.loreItems||[],encounterCollection:state.encounterCollection||{},encounterEnabled:!!state.encounterEnabled
    }
  };
}

function snapshotCounts(s=buildAtlasSnapshot()){
  const d=s.data||{};
  return {osm:d.osm?.length||0,buildings:d.cadastreBuildings?.length||0,parcels:d.cadastreParcels?.length||0,cavities:d.officialCavities?.length||0,carto:d.cartofriches?.length||0,bss:d.bss?.length||0,observations:d.observations?.length||0,lore:d.loreItems?.length||0,heritage:d.heritageItems?.length||0,codex:Object.values(d.encounterCollection||{}).filter(v=>encounterStatusRank(v?.status)>=2).length,elevation:d.elevation?"oui":"non"};
}

function updateSnapshotUI(source=state.snapshotSource){
  if(!els.snapshotStatus)return;
  const c=snapshotCounts();
  els.snapshotStatus.innerHTML=`<span><strong>État actif :</strong> ${esc(source||"session courante")}</span><span>Territoire ${esc(CONFIG.territory.label)} · ${CONFIG.dataWidthKm} × ${CONFIG.dataHeightKm} km</span><span>OSM ${c.osm.toLocaleString("fr-FR")} · bâti ${c.buildings.toLocaleString("fr-FR")} · parcelles ${c.parcels.toLocaleString("fr-FR")}</span><span>Cavités ${c.cavities} · Cartofriches ${c.carto} · patrimoine ${c.heritage} · BSS ${c.bss.toLocaleString("fr-FR")}</span><span>Observations ${c.observations} · mémoire locale ${c.lore} · codex ${c.codex}/${LOCAL_ENCOUNTERS.length} · relief ${c.elevation}</span>`;
}

function openSnapshotDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB indisponible"));return}
    const req=indexedDB.open(SNAPSHOT_DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(SNAPSHOT_DB_STORE))db.createObjectStore(SNAPSHOT_DB_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Ouverture IndexedDB impossible"));
  });
}

async function saveSnapshotToDb(snapshot){
  validateAtlasSnapshot(snapshot);
  const db=await openSnapshotDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");
    tx.objectStore(SNAPSHOT_DB_STORE).put(snapshot,SNAPSHOT_DB_KEY);
    tx.oncomplete=()=>{db.close();snapshotRuntime.dbSaves++;resolve()};
    tx.onerror=()=>{const error=tx.error||new Error("Sauvegarde IndexedDB impossible");db.close();recordSnapshotError(error);reject(error)};
  });
}

async function loadSnapshotFromDb(){
  try{
    const db=await openSnapshotDb();
    const snapshot=await new Promise((resolve,reject)=>{
      const tx=db.transaction(SNAPSHOT_DB_STORE,"readonly"),req=tx.objectStore(SNAPSHOT_DB_STORE).get(SNAPSHOT_DB_KEY);
      req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
    });
    if(snapshot){validateAtlasSnapshot(snapshot);snapshotRuntime.dbLoads++}
    return snapshot;
  }catch(error){recordSnapshotError(error);return null}
}

async function deleteSnapshotFromDb(){
  try{
    const db=await openSnapshotDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");
      tx.objectStore(SNAPSHOT_DB_STORE).delete(SNAPSHOT_DB_KEY);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
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
  state.address=d.address||null;state.bss=Array.isArray(d.bss)&&d.bss.length?d.bss:mergeBssItems(territoryUsesEmbeddedData("bss",CONFIG.territory)?BSS_EMBEDDED_LOCAL:[]);state.elevation=d.elevation||null;
  state.observations=Array.isArray(d.observations)?d.observations:[];state.loreItems=Array.isArray(d.loreItems)?d.loreItems:[];state.encounterCollection=d.encounterCollection&&typeof d.encounterCollection==="object"&&!Array.isArray(d.encounterCollection)?d.encounterCollection:state.encounterCollection;state.encounterEnabled=d.encounterEnabled!==undefined?!!d.encounterEnabled:state.encounterEnabled;saveEncounterCollection();
  state.zoomIndex=clamp(Number(v.zoomIndex??state.zoomIndex),0,CONFIG.zooms.length-1);state.depthIndex=clamp(Number(v.depthIndex??state.depthIndex),0,CONFIG.depths.length-1);
  state.center=v.center&&Number.isFinite(+v.center.lat)&&Number.isFinite(+v.center.lon)?clampCenter({lat:+v.center.lat,lon:+v.center.lon},CONFIG.zooms[state.zoomIndex]):{...CONFIG.house};
  state.scenario=v.scenario||state.scenario;els.scenario.value=state.scenario;
  state.renderMode=v.renderMode==="ascii"?"ascii":v.renderMode==="symbolic"?"symbolic":state.renderMode;
  if(v.layers&&typeof v.layers==="object")for(const [k,value] of Object.entries(v.layers)){if(SNAPSHOT_LAYER_KEYS.includes(k)&&k in state){state[k]=!!value;if(els[k])els[k].checked=!!value}}
  state.allowNetwork=FORCE_ONLINE;state.snapshotSource=source;state.selectedCell=null;state.selectionAssistVisible=false;state.guidedTourActive=false;state.guidedTourStep=0;
  refreshCavities();updateBssUI();updateCartofrichesUI();updateHeritageUI();populateCavitySelect();
  setStatus("osm","ok",state.osm.length?`${state.osm.length} objets · instantané`:"instantané sans OSM");
  setStatus("address",state.address?"ok":"bad",state.address?"instantané":"non embarqué");
  setStatus("cadastre",state.cadastreBuildings.length?"ok":"bad",state.cadastreBuildings.length?`${state.cadastreBuildings.length} bât. · instantané`:"non embarqué");
  setStatus("cavities",state.officialCavities.length?"ok":"bad",state.officialCavities.length?`${state.officialCavities.length} · instantané`:"repères locaux seulement");
  setStatus("heritage",state.heritageItems.length?"ok":"pending",state.heritageItems.length?`${state.heritageItems.length} · instantané`:"non embarqué");
  setStatus("elevation",state.elevation?"ok":"bad",state.elevation?"instantané":"non embarqué");
  if(els.offlineNotice)els.offlineNotice.style.display="block";
  els.retryData.textContent="↻ actualiser les sources en ligne";
  els.sourceNote.innerHTML=`Atlas chargé depuis un <strong>${esc(source)}</strong>. Aucune requête réseau automatique n’est effectuée ; le bouton d’actualisation réactive volontairement les services distants.`;
  snapshotRuntime.applied++;snapshotRuntime.lastSource=source;snapshotRuntime.lastError="";
  updateSnapshotUI(source);updateEncounterUI();
  if(renderNow)render("snapshot-apply");
}

function exportSnapshotJson(){
  const snapshot=buildAtlasSnapshot();
  downloadBlob(JSON.stringify(snapshot,null,2),"application/json;charset=utf-8",`atlas-karst-${new Date().toISOString().slice(0,10)}.atlas.json`);
  snapshotRuntime.exports++;snapshotRuntime.lastSource="export JSON";
  els.snapshotHelp.textContent="Sauvegarde JSON exportée. Elle peut être chargée dans cette version ou une version ultérieure compatible.";
}

async function importSnapshotFile(file){
  if(!file)return;
  try{
    if(Number(file.size)>SNAPSHOT_IMPORT_LIMIT_BYTES)throw new Error("Ce fichier dépasse la limite de 64 Mo prévue pour un instantané local.");
    const snapshot=validateAtlasSnapshot(JSON.parse(await file.text()));
    applyAtlasSnapshot(snapshot,{source:`sauvegarde importée · ${file.name}`});
    await saveSnapshotToDb(snapshot);
    snapshotRuntime.imports++;snapshotRuntime.lastSource=file.name;
    els.snapshotHelp.textContent="Sauvegarde chargée et mémorisée dans ce navigateur pour le prochain démarrage.";
  }catch(error){
    recordSnapshotError(error);
    els.snapshotHelp.textContent=`Import impossible : ${error?.message||"fichier invalide"}`;
  }
  els.snapshotFile.value="";
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
  els.importSnapshotJson.addEventListener("click",()=>els.snapshotFile.click());
  els.snapshotFile.addEventListener("change",event=>importSnapshotFile(event.target.files?.[0]));
  els.exportStandaloneHtml.addEventListener("click",exportStandaloneHtml);
  els.clearSavedSnapshot.addEventListener("click",async()=>{
    await deleteSnapshotFromDb();
    els.snapshotHelp.textContent="La sauvegarde locale a été oubliée. Les données restent visibles jusqu’à la fermeture de cette session.";
    state.snapshotSource="session courante";updateSnapshotUI();
  });
}
