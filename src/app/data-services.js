function queryOsmFeatures(extent){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.osmIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const results=candidates.filter(f=>coordsIntersectExtent(f,extent));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}
function queryCadastreFeatures(extent,kind){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.cadastreIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const results=candidates.filter(v=>(!kind||v.kind===kind)&&coordsIntersectExtent(v.feature,extent));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}


function setStatus(kind,status,label){
  state.load[kind]=status;
  const el={osm:els.osmStatus,address:els.addressStatus,cadastre:els.cadastreStatus,cavities:els.cavityStatus,cartofriches:els.cartofrichesStatus,heritage:els.heritageStatus,bss:els.bssStatus,elevation:els.elevationStatus}[kind];
  if(el){el.className=status==="ok"?"ok":status==="bad"?"bad":"pending";el.textContent=label}
  const core=["osm","address","cadastre","cavities","elevation"];
  const done=core.filter(k=>state.load[k]!=="pending").length;
  els.loadProgress.style.width=`${done/core.length*100}%`;
}

function cacheGet(key){
  try{
    const raw=localStorage.getItem(key); if(!raw)return null;
    const obj=JSON.parse(raw);
    if(Date.now()-obj.savedAt>CONFIG.cacheHours*3600e3){localStorage.removeItem(key);return null}
    return obj.value;
  }catch{return null}
}
function cacheSet(key,value){
  try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),value}));if(key.startsWith("atlas-karst-osm-v010d-"))scheduleSessionMaintenance("cache OSM")}catch{}
}

function expandExtentBox(e,factor=1.18){
  const cx=(e.west+e.east)/2,cy=(e.south+e.north)/2;
  const hw=(e.east-e.west)*factor/2,hh=(e.north-e.south)*factor/2;
  const bounds=largestExtent();
  return {
    west:Math.max(bounds.west,cx-hw),
    east:Math.min(bounds.east,cx+hw),
    south:Math.max(bounds.south,cy-hh),
    north:Math.min(bounds.north,cy+hh)
  };
}
function extentContains(outer,inner){
  return outer.west<=inner.west&&outer.east>=inner.east&&outer.south<=inner.south&&outer.north>=inner.north;
}
function osmCoverageHas(kind,e){
  const list=kind==="detail"?state.osmDetailCoverage:state.osmBaseCoverage;
  return list.some(c=>extentContains(c,e));
}
function osmCoverageAdd(kind,e){
  const list=kind==="detail"?state.osmDetailCoverage:state.osmBaseCoverage;
  list.push({...e});
  if(list.length>24)list.splice(0,list.length-24);
}
function osmExtentCacheKey(kind,e){
  const cx=((e.west+e.east)/2).toFixed(4),cy=((e.south+e.north)/2).toFixed(4);
  const w=(e.east-e.west).toFixed(4),h=(e.north-e.south).toFixed(4);
  return `atlas-karst-osm-v010d-${kind}-${cx}-${cy}-${w}-${h}`;
}
const OVERPASS_ENDPOINTS = [
  {id:"main",label:"FOSSGIS",url:"https://overpass-api.de/api/interpreter"},
  {id:"coffee",label:"Private.coffee",url:"https://overpass.private.coffee/api/interpreter"},
  {id:"vk",label:"VK Maps",url:"https://maps.mail.ru/osm/tools/overpass/api/interpreter"}
];
function overpassEndpointOrder(){
  // Private.coffee est placé en tête depuis file:// : le serveur principal exige plus
  // souvent un Referer identifiable, impossible à fabriquer depuis une page locale.
  return LOCAL_FILE_MODE
    ? [OVERPASS_ENDPOINTS[1],OVERPASS_ENDPOINTS[0],OVERPASS_ENDPOINTS[2]]
    : [...OVERPASS_ENDPOINTS];
}
function overpassBox(extent){
  return [extent.south,extent.west,extent.north,extent.east]
    .map(v=>Number(v).toFixed(7)).join(",");
}
function buildOverpassQuery(extent,kind="base"){
  const box=overpassBox(extent);
  if(kind==="detail"){
    return `[out:json][timeout:40][bbox:${box}];\nway["building"];\nout body geom(${box}) qt;`;
  }
  return `[out:json][timeout:45][bbox:${box}];
(
  way["highway"];
  way["waterway"];
  nwr["natural"~"^(water|wood|scrub|cliff|sinkhole|spring)$"];
  nwr["landuse"~"^(forest|meadow|farmland|residential|industrial|quarry|cemetery|orchard|vineyard|grass)$"];
  node["place"~"^(city|town|village|hamlet|locality)$"];
  node["natural"~"^(cave_entrance|spring|sinkhole)$"];
  node["man_made"~"^(adit|mineshaft)$"];
);
out body geom(${box}) qt;`;
}
function buildOverpassProbeQuery(center=state.center){
  const lat=Number(center.lat).toFixed(7),lon=Number(center.lon).toFixed(7);
  return `[out:json][timeout:12];\nnode(around:350,${lat},${lon})["place"];\nout tags center 1;`;
}
function osmFeatureKey(f){
  const first=f.coords?.[0],last=f.coords?.at?.(-1);
  return `${f.id}|${first?.[0]??""},${first?.[1]??""}|${last?.[0]??""},${last?.[1]??""}`;
}
function mergeOsmFeatures(features){
  const map=new Map((state.osm||[]).map(f=>[osmFeatureKey(f),f]));
  for(const f of features||[])map.set(osmFeatureKey(f),f);
  state.osm=[...map.values()];
  markMapDataRevision("osm");
  state.osmCavities=extractOsmCavities(state.osm);
  markSpatialIndexesDirty();
  refreshCavities();
}
function clearOsmCaches(){
  try{
    const doomed=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith("atlas-karst-osm-"))doomed.push(key);
    }
    doomed.forEach(key=>localStorage.removeItem(key));
  }catch{}
}
function conciseOverpassFailure(err){
  if(err?.name==="AbortError")return "délai dépassé";
  const msg=String(err?.message||err||"erreur inconnue").replace(/\s+/g," ").trim();
  if(err instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(msg))return "requête bloquée par le réseau ou CORS";
  return msg.slice(0,220);
}
function formatOsmElapsed(ms){
  const seconds=Math.max(0,Math.floor(ms/1000));
  return seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${String(seconds%60).padStart(2,"0")}s`;
}
let osmActivityTimer=0;
function updateOsmActivity(){
  if(!state.osmLoading||!state.osmActivityStarted)return;
  const elapsed=formatOsmElapsed(performance.now()-state.osmActivityStarted);
  const stage=state.osmAttemptLabel||"préparation";
  if(els.osmHelp)els.osmHelp.textContent=`OSM travaille · ${elapsed} · ${stage}. Le bouton de synchronisation permet d’annuler.`;
  setStatus("osm","pending",`${elapsed} · ${stage}`);
}
function cancelOsmSync(){
  if(!state.osmLoading)return false;
  state.osmAbortRequested=true;
  state.osmAttemptLabel="annulation…";
  state.osmAbortController?.abort();
  updateOsmActivity();
  return true;
}
async function overpassRequest(endpoint,query,method="POST",timeoutMs=50000,{trackAbort=false}={}){
  const controller=new AbortController();
  if(trackAbort)state.osmAbortController=controller;
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const options={
      method,
      signal:controller.signal,
      mode:"cors",
      credentials:"omit",
      cache:"no-store",
      headers:{Accept:"application/json"}
    };
    let url=endpoint;
    if(method==="POST"){
      options.body=new URLSearchParams({data:query});
    }else{
      url+=`${url.includes("?")?"&":"?"}data=${encodeURIComponent(query)}`;
    }
    const response=await fetch(url,options);
    const textBody=await response.text();
    if(!response.ok){
      const short=textBody.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,190);
      const retry=response.headers.get("retry-after");
      throw new Error(`HTTP ${response.status}${retry?` · réessayer dans ${retry}s`:""}${short?` · ${short}`:""}`);
    }
    let json;
    try{json=JSON.parse(textBody)}
    catch{throw new Error(`réponse non JSON${textBody?` · ${textBody.slice(0,100)}`:""}`)}
    if(!Array.isArray(json.elements))throw new Error("réponse Overpass incomplète");
    return json;
  }finally{
    clearTimeout(timer);
    if(trackAbort&&state.osmAbortController===controller)state.osmAbortController=null;
  }
}
async function queryOverpass(query,{probe=false,onAttempt=null}={}){
  const failures=[];
  for(const endpoint of overpassEndpointOrder()){
    const methods=query.length<1500?["POST","GET"]:["POST"];
    for(const method of methods){
      if(state.osmAbortRequested){const e=new Error("Synchronisation annulée");e.name="AbortError";throw e}
      try{
        onAttempt?.(endpoint,method);
        const json=await overpassRequest(endpoint.url,query,method,probe?16000:(method==="POST"?58000:42000),{trackAbort:!probe});
        return {json,endpoint:endpoint.url,endpointLabel:endpoint.label,method};
      }catch(err){
        if(state.osmAbortRequested){const e=new Error("Synchronisation annulée");e.name="AbortError";throw e}
        failures.push(`${endpoint.label} ${method} : ${conciseOverpassFailure(err)}`);
      }
    }
  }
  const error=new Error(failures.join(" | "));
  error.failures=failures;
  throw error;
}
async function loadOsmWindow(kind,extent,force=false){
  if(!force&&osmCoverageHas(kind,extent))return {cached:true,count:0};
  const cacheKey=osmExtentCacheKey(kind,extent);
  if(!force){
    const cached=cacheGet(cacheKey);
    if(cached?.data){
      mergeOsmFeatures(cached.data);
      osmCoverageAdd(kind,extent);
      return {cached:true,count:cached.data.length,endpoint:cached.meta?.endpoint};
    }
  }
  const query=buildOverpassQuery(extent,kind);
  const result=await queryOverpass(query,{onAttempt:(endpoint,method)=>{
    state.osmAttemptLabel=`${kind==="detail"?"bâtiments":"surface"} · ${endpoint.label} ${method}`;
    updateOsmActivity();
  }});
  const parsed=parseOsm(result.json);
  mergeOsmFeatures(parsed);
  osmCoverageAdd(kind,extent);
  cacheSet(cacheKey,{data:parsed,meta:{endpoint:result.endpoint,method:result.method,timestamp:result.json.osm3s?.timestamp_osm_base||null}});
  state.osmMeta={endpoint:result.endpoint,endpointLabel:result.endpointLabel,method:result.method,timestamp:result.json.osm3s?.timestamp_osm_base||null};
  return {cached:false,count:parsed.length,endpoint:result.endpoint};
}
async function ensureOsmForCurrentView(force=false){
  if((OFFLINE_TEST||!state.allowNetwork)&&!force)return;
  if(state.osmLoading){osmEnsurePending=true;return}
  const view=extentFor();
  const baseExtent=expandExtentBox(view,1.18);
  const needBase=force||!osmCoverageHas("base",view);
  const needDetail=state.zoomIndex>=3&&(force||!osmCoverageHas("detail",view));
  if(!needBase&&!needDetail)return;

  state.osmLoading=true;
  state.osmLastError="";
  state.osmParseStats={droppedPoints:0,droppedGeometries:0};
  state.osmAbortRequested=false;
  state.osmActivityStarted=performance.now();
  state.osmAttemptLabel=needBase?"préparation de la surface":"préparation du bâti";
  setStatus("osm","pending",needBase?"surface locale…":"bâti détaillé…");
  if(els.syncOsm){els.syncOsm.disabled=false;els.syncOsm.textContent="× annuler OSM"}
  clearInterval(osmActivityTimer);osmActivityTimer=setInterval(updateOsmActivity,1000);updateOsmActivity();
  try{
    let fromCache=0;
    if(needBase){
      state.osmAttemptLabel="recherche de la surface";updateOsmActivity();
      const r=await loadOsmWindow("base",baseExtent,force);
      if(r.cached)fromCache++;
      setStatus("osm","pending",`${state.osm?.length||0} objets · détails…`);
      scheduleDataRender("osm-base-refresh");
    }
    if(needDetail){
      state.osmAttemptLabel="recherche des bâtiments";updateOsmActivity();
      const detailExtent=expandExtentBox(view,1.08);
      const r=await loadOsmWindow("detail",detailExtent,force);
      if(r.cached)fromCache++;
    }
    const host=state.osmMeta?.endpoint?new URL(state.osmMeta.endpoint).hostname:"cache local";
    const skipped=state.osmParseStats.droppedPoints;
    const parseNote=skipped?` ${skipped} sommet${skipped>1?"s":""} incomplet${skipped>1?"s":""} ignoré${skipped>1?"s":""} sans interrompre le chargement.`:"";
    setStatus("osm","ok",`${state.osm?.length||0} objets${fromCache?" · cache":""}${skipped?` · ${skipped} trous ignorés`:""}`);
    els.osmHelp.textContent=`Synchronisation réussie via ${host}${state.osmMeta?.method?` (${state.osmMeta.method})`:""}. Les géométries sont limitées à la fenêtre visible pour alléger la réponse.${parseNote}`;
    els.sourceNote.textContent=`Surface OSM chargée par fenêtres locales via ${host}. Les bâtiments ne sont demandés qu’aux zooms Site, Parcelle et Détail.${parseNote}`;
    scheduleDataRender("osm-sync-complete");
    return true;
  }catch(err){
    const cancelled=err?.name==="AbortError"&&state.osmAbortRequested;
    state.osmLastError=err?.message||String(err);
    if(cancelled){
      if(state.osm?.length)setStatus("osm","ok",`${state.osm.length} objets · synchro annulée`);
      else setStatus("osm","pending","synchronisation annulée");
      els.osmHelp.textContent="Synchronisation OSM annulée. Les données déjà reçues restent disponibles.";
      scheduleDataRender("osm-sync-cancelled");return false;
    }
    if(state.osm?.length)setStatus("osm","ok",`${state.osm.length} objets · mise à jour échouée`);
    else setStatus("osm","bad","échec OSM · diagnostic disponible");
    const nullOrigin=/bloquée par le réseau ou CORS|HTTP 403|HTTP 406/i.test(state.osmLastError);
    const localHint=LOCAL_FILE_MODE&&nullOrigin
      ? " Cette copie est ouverte en file:// : le navigateur n’envoie pas de Referer web et certains serveurs Overpass refusent désormais ces requêtes. Héberge le même fichier en HTTPS, ou utilise l’import JSON proposé juste au-dessus."
      : "";
    els.osmHelp.innerHTML=`<strong>Échec OSM.</strong> ${esc(state.osmLastError)}${esc(localHint)}`;
    els.sourceNote.innerHTML=`OSM n’a pas répondu pour cette fenêtre. ${esc(localHint||"Le diagnostic des serveurs permet de distinguer surcharge, refus HTTP et blocage CORS.")}`;
    console.warn("OSM indisponible",err);
    scheduleDataRender("osm-sync-error");
    return false;
  }finally{
    clearInterval(osmActivityTimer);osmActivityTimer=0;
    state.osmLoading=false;state.osmActivityStarted=0;state.osmAbortController=null;state.osmAbortRequested=false;state.osmAttemptLabel="";
    if(els.syncOsm){els.syncOsm.disabled=false;els.syncOsm.textContent="↻ synchroniser OSM"}
    if(osmEnsurePending){osmEnsurePending=false;scheduleOsmEnsure(0)}
  }
}
let osmEnsureTimer=0,osmEnsurePending=false;
function scheduleOsmEnsure(delay=650){
  if(OFFLINE_TEST||!state.allowNetwork)return;
  if(state.osmLoading){osmEnsurePending=true;return}
  clearTimeout(osmEnsureTimer);
  osmEnsurePending=false;
  osmEnsureTimer=setTimeout(()=>{osmEnsureTimer=0;ensureOsmForCurrentView(false)},delay);
}
async function fetchOverpass(){
  if(!state.osmLegacyChecked){
    state.osmLegacyChecked=true;
    const legacy=cacheGet("atlas-karst-osm-v06");
    if(legacy?.data?.length){
      // L'ancien cache est conservé comme appoint, mais ne prétend plus couvrir toute
      // l'emprise : cette ancienne hypothèse empêchait toute vraie synchronisation.
      mergeOsmFeatures(legacy.data);
      state.osmMeta=legacy.meta||null;
      setStatus("osm","pending",`${state.osm.length} objets anciens · actualisation…`);
      scheduleDataRender("osm-legacy-cache");
    }
  }
  return ensureOsmForCurrentView(false);
}
async function syncOsmNow(){
  if(state.osmLoading)return cancelOsmSync();
  state.allowNetwork=true;
  state.osmBaseCoverage=[];
  state.osmDetailCoverage=[];
  state.osmLastError="";
  clearOsmCaches();
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  return ensureOsmForCurrentView(true);
}
async function testOsmServers(){
  if(state.osmLoading)return;
  state.allowNetwork=true;
  els.testOsm.disabled=true;
  setStatus("osm","pending","diagnostic…");
  const query=buildOverpassProbeQuery();
  const results=[];
  try{
    for(const endpoint of overpassEndpointOrder()){
      els.osmHelp.textContent=`Test de ${endpoint.label}…`;
      const started=performance.now();
      try{
        const json=await overpassRequest(endpoint.url,query,"POST",16000);
        results.push({ok:true,label:endpoint.label,ms:Math.round(performance.now()-started),count:json.elements.length});
      }catch(err){
        results.push({ok:false,label:endpoint.label,error:conciseOverpassFailure(err)});
      }
    }
    const successes=results.filter(r=>r.ok);
    const lines=results.map(r=>r.ok
      ? `<span><strong>${esc(r.label)}</strong> : OK · ${r.ms} ms · ${r.count} résultat${r.count>1?"s":""}</span>`
      : `<span><strong>${esc(r.label)}</strong> : ${esc(r.error)}</span>`).join("");
    els.osmHelp.innerHTML=`${lines}${LOCAL_FILE_MODE&&!successes.length?'<span><strong>Conclusion :</strong> blocage probablement lié à l’ouverture locale file://. Le même HTML hébergé en HTTPS fournira un Referer normal.</span>':""}`;
    setStatus("osm",successes.length?"ok":"bad",successes.length?`${successes.length}/${results.length} serveurs joignables`:"aucun serveur joignable");
  }finally{els.testOsm.disabled=false}
}
function openCurrentOverpassQuery(){
  const query=buildOverpassQuery(expandExtentBox(extentFor(),1.18),"base");
  const c=state.center;
  const url=`https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}&C=${encodeURIComponent(`${c.lat};${c.lon};14`)}&R`;
  const win=window.open(url,"_blank","noopener");
  if(!win)els.osmHelp.textContent="Le navigateur a bloqué l’ouverture d’Overpass Turbo. Autorise temporairement les fenêtres surgissantes pour cette page.";
  else els.osmHelp.textContent="La requête courante a été ouverte dans Overpass Turbo. Son onglet Export permet d’enregistrer les données brutes en JSON si la synchronisation directe est bloquée.";
}
async function importOsmJsonFile(file){
  if(!file)return;
  try{
    state.osmParseStats={droppedPoints:0,droppedGeometries:0};
    const json=JSON.parse(await file.text());
    if(!Array.isArray(json.elements))throw new Error("le fichier ne contient pas de tableau elements Overpass");
    const parsed=parseOsm(json);
    if(!parsed.length)throw new Error("aucune géométrie OSM exploitable");
    mergeOsmFeatures(parsed);
    const view=extentFor();
    osmCoverageAdd("base",view);
    if(parsed.some(f=>f.tags?.building))osmCoverageAdd("detail",view);
    state.osmMeta={endpoint:"import manuel",endpointLabel:"import JSON",method:"fichier",timestamp:json.osm3s?.timestamp_osm_base||null};
    setStatus("osm","ok",`${state.osm.length} objets · import JSON`);
    const skipped=state.osmParseStats.droppedPoints;
    els.osmHelp.textContent=`${parsed.length} géométries importées depuis ${file.name}.${skipped?` ${skipped} sommet${skipped>1?"s":""} incomplet${skipped>1?"s":""} ignoré${skipped>1?"s":""}.`:""} Elles seront incluses dans la prochaine sauvegarde ou copie autonome.`;
    render("osm-import");
  }catch(err){
    els.osmHelp.textContent=`Import OSM impossible : ${err?.message||"fichier invalide"}`;
  }finally{els.osmFile.value=""}
}

function osmCoordinateNumber(value){
  if(value===null||value===undefined||value==="")return NaN;
  const number=Number(value);
  return Number.isFinite(number)?number:NaN;
}
function osmGeometrySegments(rawGeometry,minPoints=2){
  if(!Array.isArray(rawGeometry))return [];
  const segments=[];
  let current=[];
  const flush=()=>{
    if(current.length>=minPoints)segments.push(current);
    else if(current.length)state.osmParseStats.droppedGeometries++;
    current=[];
  };
  for(const point of rawGeometry){
    const lon=osmCoordinateNumber(point?.lon),lat=osmCoordinateNumber(point?.lat);
    if(point&&Number.isFinite(lon)&&Number.isFinite(lat)){
      current.push([lon,lat]);
    }else{
      state.osmParseStats.droppedPoints++;
      flush();
    }
  }
  flush();
  return segments;
}
function geomFromElement(el){
  if(!el||typeof el!=="object"){
    state.osmParseStats.droppedGeometries++;
    return [];
  }
  if(Array.isArray(el.geometry)){
    const segments=osmGeometrySegments(el.geometry,2);
    if(segments.length)return segments;
  }
  if(Array.isArray(el.members)){
    const segments=[];
    for(const member of el.members){
      if(!member||!Array.isArray(member.geometry))continue;
      segments.push(...osmGeometrySegments(member.geometry,2));
    }
    if(segments.length)return segments;
  }
  const nodeLat=osmCoordinateNumber(el.lat),nodeLon=osmCoordinateNumber(el.lon);
  if(el.type==="node"&&Number.isFinite(nodeLat)&&Number.isFinite(nodeLon)){
    return [[[nodeLon,nodeLat]]];
  }
  const centerLat=osmCoordinateNumber(el.center?.lat),centerLon=osmCoordinateNumber(el.center?.lon);
  if(Number.isFinite(centerLat)&&Number.isFinite(centerLon)){
    return [[[centerLon,centerLat]]];
  }
  return [];
}
function parseOsm(json){
  const out=[];
  if(!json||!Array.isArray(json.elements))return out;
  for(const el of json.elements){
    const geoms=geomFromElement(el);
    for(const coords of geoms){
      if(!Array.isArray(coords)||!coords.length)continue;
      const validCoords=coords.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
      if(!validCoords.length)continue;
      const tags=el?.tags||{};
      const closed=validCoords.length>3&&validCoords[0][0]===validCoords.at(-1)[0]&&validCoords[0][1]===validCoords.at(-1)[1];
      const lons=validCoords.map(p=>p[0]),lats=validCoords.map(p=>p[1]);
      const bbox={west:Math.min(...lons),east:Math.max(...lons),south:Math.min(...lats),north:Math.max(...lats)};
      out.push({id:`${el?.type||"element"}/${el?.id||out.length}`,type:el?.type||"unknown",tags,coords:validCoords,closed,bbox});
    }
  }
  return out;
}


const OBSERVATION_KEY="atlas-karst-observations-v06";
function loadLocalCavities(){
  try{
    let v=JSON.parse(localStorage.getItem(territoryStorageKey(OBSERVATION_KEY))||"null");
    if(!Array.isArray(v)){
      const legacy=CONFIG.territory.id===LEGACY_TERRITORY_PROFILE.id?JSON.parse(localStorage.getItem("atlas-karst-local-cavities-v05")||"[]"):[];
      v=Array.isArray(legacy)?legacy.map(c=>({id:c.id||`OBS-${Date.now()}-${Math.random()}`,mode:"point",glyph:c.markerOverride||"?o",name:c.name||"Observation importée",lat:+c.lat,lon:+c.lon,confidence:"med",season:"",source:"Observation locale importée de la V0.5"})):[];
    }
    state.observations=v.filter(o=>Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)).map(o=>({...o,lat:+o.lat,lon:+o.lon,local:true}));
  }catch{state.observations=[]}
  refreshLocalCavitiesFromObservations();
}
function refreshLocalCavitiesFromObservations(){
  state.localCavities=state.observations.filter(o=>o.mode==="point").map(o=>{
    const def=localMarkerDefinition(o.glyph||"?o");
    return {id:o.id,name:o.name||def.detail,type:def.type,detail:def.detail,markerOverride:o.glyph||"?o",lat:o.lat,lon:o.lon,source:"Observation locale enregistrée dans cet atlas",local:true,observation:o};
  });
}
function saveLocalCavities(){
  try{localStorage.setItem(territoryStorageKey(OBSERVATION_KEY),JSON.stringify(state.observations))}catch{}
  refreshLocalCavitiesFromObservations();
}
function loadLoreItems(){
  try{
    const v=JSON.parse(localStorage.getItem(territoryStorageKey(LORE_KEY))||"[]");
    state.loreItems=Array.isArray(v)?v.filter(o=>Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)).map(o=>({...o,lat:+o.lat,lon:+o.lon,category:o.category||"anecdote"})):[];
  }catch{state.loreItems=[]}
}
function saveLoreItems(){
  try{localStorage.setItem(territoryStorageKey(LORE_KEY),JSON.stringify(state.loreItems))}catch{}
}

function normalizeLooseText(v){
  if(v==null)return "";
  if(Array.isArray(v))return v.filter(Boolean).join(" · ");
  if(typeof v==="object")return Object.values(v).filter(Boolean).join(" · ");
  const s=String(v).trim();
  if((s.startsWith("[")||s.startsWith("{"))&&s.length<1000){
    try{return normalizeLooseText(JSON.parse(s.replaceAll("'",'"')))}catch{}
  }
  return s==="{}"||s==="[]"?"":s;
}
function isMetropolitanFranceCoordinate(lat,lon){
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=41&&lat<=51.6&&lon>=-6.2&&lon<=10.3;
}
function cartofrichesCoordinateCandidates(a,b,origin="coordonnées"){
  const out=[];
  const push=(lat,lon,label,swapped)=>{
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
    const distance=distanceMeters(CONFIG.dataCenter,{lat,lon});
    const inFrance=isMetropolitanFranceCoordinate(lat,lon);
    out.push({lat,lon,label,swapped,distance,inFrance});
  };
  // Hypothèse 1 : premier nombre = latitude, second = longitude.
  push(a,b,`${origin} · latitude/longitude`,false);
  // Hypothèse 2 : ordre géospatial classique longitude/latitude.
  push(b,a,`${origin} · longitude/latitude corrigé`,true);
  return out;
}
function chooseCartofrichesCoordinate(candidates,insee=""){
  if(!candidates.length)return null;
  const departmentCode=CONFIG.territory.administration.departmentCode;
  const isCurrentDepartment=!!departmentCode&&String(insee||"").padStart(5,"0").startsWith(departmentCode);
  return candidates.slice().sort((a,b)=>{
    // Une coordonnée située en France métropolitaine est infiniment plus plausible
    // pour les codes INSEE métropolitains qu'un point valide mathématiquement,
    // mais posé à 5 000 km.
    const penaltyA=(a.inFrance?0:10_000_000)+(isCurrentDepartment&&a.distance>250_000?5_000_000:0);
    const penaltyB=(b.inFrance?0:10_000_000)+(isCurrentDepartment&&b.distance>250_000?5_000_000:0);
    return (penaltyA+a.distance)-(penaltyB+b.distance);
  })[0];
}
function parseWktPoint(value,insee=""){
  const s=normalizeLooseText(value);
  const m=s.match(/POINT(?:\s+Z|\s+ZM)?\s*\(\s*(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)(?:\s+-?\d+(?:[.,]\d+)?)?\s*\)/i);
  if(!m)return null;
  const a=Number(m[1].replace(",",".")),b=Number(m[2].replace(",","."));
  return chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(a,b,"geompoint WKT"),insee);
}
function parseWktSurfaceCentroid(value,insee=""){
  const s=normalizeLooseText(value);
  if(!/^(POLYGON|MULTIPOLYGON)/i.test(s))return null;
  const nums=[...s.matchAll(/(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)/g)]
    .slice(0,5000)
    .map(m=>[Number(m[1].replace(",",".")),Number(m[2].replace(",",".") )])
    .filter(p=>p.every(Number.isFinite));
  if(!nums.length)return null;
  const a=nums.reduce((sum,p)=>sum+p[0],0)/nums.length;
  const b=nums.reduce((sum,p)=>sum+p[1],0)/nums.length;
  return chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(a,b,"centroïde geomsurf"),insee);
}
function cartofrichesCoordinates(r){
  const insee=normalizeLooseText(r.comm_insee??r.code_insee);
  const rawLat=String(r.lat??r.latitude??r.LAT??"").trim();
  const rawLon=String(r.long??r.lon??r.longitude??r.LONG??"").trim();
  const explicitLat=Number(rawLat.replace(",","."));
  const explicitLon=Number(rawLon.replace(",","."));

  if(rawLat!==""&&rawLon!==""&&Number.isFinite(explicitLat)&&Number.isFinite(explicitLon)){
    const chosen=chooseCartofrichesCoordinate(
      cartofrichesCoordinateCandidates(explicitLat,explicitLon,"colonnes lat/long"),
      insee
    );
    if(chosen)return {
      ...chosen,
      coordinateSource:chosen.label,
      coordinateSwapped:chosen.swapped
    };
  }

  const point=parseWktPoint(r.geompoint??r.geom_point??r.geometry??r.geometrie,insee);
  if(point)return {
    ...point,
    coordinateSource:point.label,
    coordinateSwapped:point.swapped
  };

  const surface=parseWktSurfaceCentroid(r.geomsurf??r.geom_surf??r.surface_geom??r.geometry,insee);
  if(surface)return {
    ...surface,
    coordinateSource:surface.label,
    coordinateSwapped:surface.swapped
  };

  return null;
}

function normalizeCartofrichesRow(r){
  const coord=cartofrichesCoordinates(r);
  if(!coord)return null;
  const {lat,lon}=coord;
  return {
    id:normalizeLooseText(r.site_id??r.id??r.fid)||`CF-${lat}-${lon}`,
    name:normalizeLooseText(r.site_nom??r.nom_site??r.nom)||"Site Cartofriches sans nom",
    type:normalizeLooseText(r.site_type??r.type_site??r.type)||"inconnu",
    status:normalizeLooseText(r.site_statut??r.statut_site??r.statut)||"inconnu",
    address:normalizeLooseText(r.site_adresse??r.adresse),
    surface:Number(r.site_surface??r.unite_fonciere_surface??r.surface),
    occupation:normalizeLooseText(r.site_occupation??r.occupation),
    activity:normalizeLooseText(r.activite_libelle??r.activite),
    activityEnd:normalizeLooseText(r.activite_fin_annee??r.annee_fin),
    updated:normalizeLooseText(r.site_actu_date??r.date_maj),
    identified:normalizeLooseText(r.site_identif_date??r.date_identification),
    commune:normalizeLooseText(r.comm_nom??r.commune),
    insee:normalizeLooseText(r.comm_insee??r.code_insee),
    producer:normalizeLooseText(r.nom_prodcartofriches??r.source_producteur??r.source_nom??r.producteur),
    sourceNature:normalizeLooseText(r.source_nature),
    url:normalizeLooseText(r.site_url),
    security:normalizeLooseText(r.site_securite),
    pollution:normalizeLooseText(r.sol_pollution_existe??r.bati_pollution??r.pollution_statut??r.site_pollution??r.pollution),
    coordinateSource:coord.coordinateSource||coord.label||"",
    coordinateSwapped:!!coord.coordinateSwapped,
    lat,lon,
    raw:r
  };
}
function cartofrichesMarker(f){
  const t=(f.type||"").toLowerCase();
  let glyph="F?";
  if(t.includes("industri"))glyph="Fi";
  else if(t.includes("commerc"))glyph="Fc";
  else if(t.includes("habitat")||t.includes("résident"))glyph="Fh";
  else if(t.includes("tertiaire")||t.includes("bureau"))glyph="Ft";
  else if(t.includes("équipement")||t.includes("service public"))glyph="Fe";
  else if(t.includes("ferro")||t.includes("sncf"))glyph="Ff";
  else if(t.includes("militaire"))glyph="Fm";
  const s=(f.status||"").toLowerCase();
  let cls="c-carto-unknown",label="statut inconnu";
  if(s.includes("reconvert")){cls="c-carto-reconverted";label="site reconverti"}
  else if(s.includes("avec projet")){cls="c-carto-project";label="friche avec projet"}
  else if(s.includes("sans projet")){cls="c-carto-active";label="friche sans projet"}
  else if(s.includes("potentielle")){cls="c-carto-potential";label="friche potentielle"}
  return {glyph,cls,label};
}
function saveCartofriches(){
  try{
    localStorage.setItem(territoryStorageKey(CARTOFRICHES_KEY),JSON.stringify({
      savedAt:Date.now(),
      items:state.cartofriches,
      includeReconverted:state.cartofrichesIncludeReconverted
    }));
  }catch{}
}
function loadCartofriches(){
  try{
    const v=JSON.parse(localStorage.getItem(territoryStorageKey(CARTOFRICHES_KEY))||"null");
    if(v&&Array.isArray(v.items)){
      state.cartofriches=v.items.map(normalizeCartofrichesRow).filter(Boolean);
      state.cartofrichesIncludeReconverted=!!v.includeReconverted;
    }
  }catch{state.cartofriches=[]}
  updateCartofrichesUI();
}
function updateCartofrichesUI(message=""){
  if(!els.cartofrichesCount)return;
  const visible=state.cartofriches.filter(f=>state.cartofrichesIncludeReconverted||!f.status.toLowerCase().includes("reconvert"));
  els.cartofrichesCount.textContent=visible.length;
  els.cartofrichesReconverted.checked=state.cartofrichesIncludeReconverted;
  const communes=[...new Set(visible.map(f=>f.commune).filter(Boolean))];
  els.cartofrichesSummary.textContent=message||(visible.length
    ? `${communes.length} commune${communes.length>1?"s":""} · source mémorisée dans ce navigateur`
    : "Aucune donnée locale chargée.");
  if(els.cartofrichesStatus){
    els.cartofrichesStatus.textContent=visible.length?`${visible.length} sites`:"à charger";
    els.cartofrichesStatus.className=visible.length?"ok":"pending";
  }
}
function cartofrichesQueryExtent(){
  const e=largestExtent();
  return {west:e.west,east:e.east,south:e.south,north:e.north};
}
async function syncCartofriches(){
  const requestStamp=territoryRequestStamp();
  const e=cartofrichesQueryExtent();
  els.cartofrichesHelp.textContent="Connexion à l’API tabulaire officielle…";
  els.syncCartofriches.disabled=true;
  try{
    let page=1,all=[],total=Infinity;
    while(all.length<total&&page<=20){
      const q=new URLSearchParams({
        page:String(page),page_size:"50",
        long__greater:String(e.west),long__less:String(e.east),
        lat__greater:String(e.south),lat__less:String(e.north)
      });
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),20000);
      const r=await fetch(`${CARTOFRICHES_API}?${q}`,{signal:controller.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      if(!territoryRequestIsCurrent(requestStamp))return null;
      const rows=Array.isArray(j.data)?j.data:[];
      all.push(...rows);
      total=Number(j.meta?.total??all.length);
      if(!rows.length)break;
      page++;
    }
    if(!territoryRequestIsCurrent(requestStamp))return null;
    state.cartofriches=all.map(normalizeCartofrichesRow).filter(Boolean);
    saveCartofriches();updateCartofrichesUI(`Synchronisé depuis data.gouv.fr · ${state.cartofriches.length} lignes locales`);
    els.cartofrichesHelp.innerHTML=`Synchronisation terminée. Les données sont désormais conservées localement et la carte reste utilisable hors ligne.`;
    render();
  }catch(err){
    if(!territoryRequestIsCurrent(requestStamp))return null;
    console.warn("Cartofriches API indisponible",err);
    els.cartofrichesHelp.innerHTML=`L’API n’a pas répondu (${esc(err?.message||"erreur réseau")}). Utilise <strong>télécharger le CSV</strong>, puis <strong>importer le CSV</strong> : cette voie ne dépend pas de CORS.`;
    updateCartofrichesUI();
  }finally{els.syncCartofriches.disabled=false}
}
function detectDelimiter(line){
  let commas=0,semis=0,tabs=0,quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"')quoted=!quoted;
    else if(!quoted&&ch===",")commas++;
    else if(!quoted&&ch===";")semis++;
    else if(!quoted&&ch==="\t")tabs++;
  }
  return semis>=commas&&semis>=tabs?";":tabs>commas?"\t":",";
}
function parseCartofrichesCsv(textData){
  const firstBreak=textData.search(/\r?\n/);
  const delimiter=detectDelimiter(textData.slice(0,firstBreak<0?textData.length:firstBreak));
  let row=[],cell="",quoted=false,headers=null,items=[];
  const e=cartofrichesQueryExtent();
  const stats={
    delimiter:delimiter==="\t"?"tabulation":delimiter,
    rows:0,
    geolocated:0,
    inside:0,
    department:0,
    commune:0,
    nearest:null,
    swapped:0,
    coordinateSources:{},
    headers:[]
  };
  const finishCell=()=>{row.push(cell);cell=""};
  const finishRow=()=>{
    if(!headers){
      headers=row.map(v=>v.replace(/^\uFEFF/,"").trim());
      stats.headers=headers;
    }else if(row.some(v=>String(v).trim()!=="")){
      stats.rows++;
      const obj={};headers.forEach((h,i)=>obj[h]=row[i]??"");
      const normalized=normalizeCartofrichesRow(obj);
      if(normalized){
        stats.geolocated++;
        if(normalized.coordinateSwapped)stats.swapped++;
        stats.coordinateSources[normalized.coordinateSource]=(stats.coordinateSources[normalized.coordinateSource]||0)+1;
        if(normalized.insee===String(CONFIG.communeInsee))stats.commune++;
        if(String(normalized.insee).startsWith(CONFIG.territory.administration.departmentCode))stats.department++;
        const d=distanceMeters(CONFIG.dataCenter,normalized);
        if(!stats.nearest||d<stats.nearest.distance)stats.nearest={distance:d,item:normalized};
        if(inExtent(normalized.lat,normalized.lon,e)){
          stats.inside++;
          items.push(normalized);
        }
      }
    }
    row=[];
  };
  for(let i=0;i<textData.length;i++){
    const ch=textData[i];
    if(quoted){
      if(ch==='"'&&textData[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===delimiter)finishCell();
      else if(ch==="\n"){finishCell();finishRow()}
      else if(ch!=="\r")cell+=ch;
    }
  }
  if(cell.length||row.length){finishCell();finishRow()}
  return {items,stats};
}
async function importCartofrichesFile(file){
  if(!file)return;
  els.cartofrichesHelp.textContent=`Lecture de ${file.name}…`;
  try{
    const txt=await file.text();
    const result=parseCartofrichesCsv(txt),items=result.items,stats=result.stats;
    if(stats.rows>0&&stats.geolocated===0){
      throw new Error(`aucune coordonnée reconnue parmi ${stats.rows.toLocaleString("fr-FR")} lignes · colonnes vues : ${stats.headers.slice(0,12).join(", ")}`);
    }
    state.cartofriches=items;
    saveCartofriches();
    updateCartofrichesUI(`Import CSV · ${stats.inside} dans l’emprise · ${stats.geolocated.toLocaleString("fr-FR")} géolocalisées`);
    if(items.length){
      const communes=[...new Set(items.map(v=>v.commune).filter(Boolean))];
      els.cartofrichesHelp.innerHTML=
        `<strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues · `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées · `+
        `<strong>${stats.swapped.toLocaleString("fr-FR")}</strong> orientations corrigées · `+
        `<strong>${items.length}</strong> dans l’emprise de l’Atlas`+
        `${communes.length?` · communes : ${esc(communes.join(", "))}`:""}. `+
        `Le fichier national n’est pas conservé, seul l’extrait local est mémorisé.`;
    }else{
      const nearest=stats.nearest;
      const nearestText=nearest
        ? ` Le site le plus proche est <strong>${esc(nearest.item.name)}</strong>${nearest.item.commune?` à ${esc(nearest.item.commune)}`:""}, à environ <strong>${(nearest.distance/1000).toFixed(1)} km</strong> `+
          `(${nearest.item.lat.toFixed(5)}, ${nearest.item.lon.toFixed(5)} · ${esc(nearest.item.coordinateSource||"coordonnées non précisées")}).`
        : "";
      els.cartofrichesHelp.innerHTML=
        `Le fichier est bien compris : <strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues, `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées, `+
        `<strong>${stats.department}</strong> dans le département ${esc(CONFIG.territory.administration.departmentName)}, <strong>${stats.swapped.toLocaleString("fr-FR")}</strong> orientations corrigées, mais aucune dans l’emprise actuelle de ${CONFIG.dataWidthKm} × ${CONFIG.dataHeightKm} km.`+
        nearestText;
    }
    render();
  }catch(err){
    els.cartofrichesHelp.textContent=`Import impossible : ${err?.message||"format non reconnu"}`;
  }finally{els.cartofrichesFile.value=""}
}

function heritageField(fields,patterns,fallback=""){
  const entries=Object.entries(fields||{});
  for(const pattern of patterns){
    const re=pattern instanceof RegExp?pattern:new RegExp(pattern,"i");
    const found=entries.find(([k,v])=>v!=null&&String(v).trim()!==""&&re.test(k));
    if(found)return normalizeLooseText(found[1]);
  }
  return fallback;
}
function heritageCoordinates(record){
  const geometry=record?.geometry;
  if(geometry?.type==="Point"&&Array.isArray(geometry.coordinates)){
    const [lon,lat]=geometry.coordinates.map(Number);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
  }
  const f=record?.fields||record||{};
  const entries=Object.entries(f);
  const latitudeEntry=entries.find(([k,v])=>v!=null&&/(^|_)(lat|latitude)($|_)/i.test(k));
  const longitudeEntry=entries.find(([k,v])=>v!=null&&/(^|_)(lon|lng|longitude)($|_)/i.test(k));
  if(latitudeEntry&&longitudeEntry){
    const lat=Number(String(latitudeEntry[1]).replace(",","."));
    const lon=Number(String(longitudeEntry[1]).replace(",","."));
    if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return {lat,lon};
  }
  const named=[f.coordonnees_au_format_wgs84,f.coordonnees_finales,f.coordonnees_geographiques,f.coordonnees,f.geolocalisation,f.geo_point_2d,f.localisation,f.location,record?._atlasGeo];
  const candidates=[...named,...entries.map(([,v])=>v).filter(v=>v&&typeof v==="object")];
  for(const raw of candidates){
    if(raw&&typeof raw==="object"){
      if(raw.type==="Point"&&Array.isArray(raw.coordinates)){
        const [lon,lat]=raw.coordinates.map(Number);
        if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
      }
      const lat=Number(raw.lat??raw.latitude??raw[1]),lon=Number(raw.lon??raw.lng??raw.longitude??raw[0]);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }
    const textValue=normalizeLooseText(raw);
    const nums=(textValue.match(/-?\d+(?:[.,]\d+)?/g)||[]).slice(0,2).map(v=>Number(v.replace(",",".")));
    if(nums.length===2){
      const chosen=chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(nums[0],nums[1],"coordonnées patrimoniales"),"");
      if(chosen)return {lat:chosen.lat,lon:chosen.lon};
    }
  }
  return null;
}
function heritageMarkerDefinition(category){
  if(category==="wikipedia")return {glyph:"WI",cls:"c-heritage-wikipedia",label:"curiosité documentée par Wikipédia"};
  return CULTURE_DATASETS[category]||{glyph:"PA",cls:"c-heritage-monument",label:"lieu patrimonial"};
}
function normalizeCultureRecord(record,category){
  const coord=heritageCoordinates(record);if(!coord)return null;
  const f=record.fields||record;
  const ref=heritageField(f,[/^reference$/i,/^ref$/i,/identifiant.*origine/i,/identifiant/i],record.recordid||"");
  const name=heritageField(f,[/titre.*courant/i,/denomination.*edifice/i,/nom.*officiel/i,/^nomoff$/i,/^nom$/i,/appellation/i,/intitule/i],CULTURE_DATASETS[category]?.label||"Lieu patrimonial");
  const commune=heritageField(f,[/commune.*editoriale/i,/commune.*index/i,/^commune$/i,/^com$/i,/^ville/i]);
  const address=heritageField(f,[/adresse.*editoriale/i,/adresse.*index/i,/^adresse$/i,/^adrs/i]);
  const period=heritageField(f,[/siecle.*principal/i,/format.*siecle/i,/^scle/i,/datation/i,/annee.*creation/i]);
  const protection=heritageField(f,[/nature.*protection/i,/date.*typologie.*protection/i,/precision.*protection/i,/^ppro/i,/protection/i]);
  const description=heritageField(f,[/historique/i,/description.*edifice/i,/^description$/i,/^hist$/i,/atout/i,/interet/i,/presentation/i]);
  let url=heritageField(f,[/liens.*externes/i,/url/i,/lien.*pop/i]);
  if(category==="monument"&&ref&&!/^https?:/i.test(url))url=`https://pop.culture.gouv.fr/notice/merimee/${encodeURIComponent(ref)}`;
  const d=heritageMarkerDefinition(category);
  return {id:`CULTURE-${category}-${ref||record.recordid||record._atlasRecordId||coord.lat+":"+coord.lon}`,category,name,lat:coord.lat,lon:coord.lon,ref,commune,address,period,protection,description:description.slice(0,1200),url,source:`Ministère de la Culture · ${d.label}`,license:"Licence Ouverte 2.0",official:true,heritage:true,dataset:record._atlasDataset||"",apiVersion:record._atlasApiVersion||"2.1",syncedAt:record._atlasSyncedAt||new Date().toISOString()};
}
function normalizeHeritageItem(item){
  if(!item||!Number.isFinite(+item.lat)||!Number.isFinite(+item.lon))return null;
  return {...item,lat:+item.lat,lon:+item.lon,category:item.category||"wikipedia",heritage:true};
}
function heritageFingerprint(item){return `${item.category||""}|${String(item.id||item.name||"").toLowerCase()}`}
function mergeHeritageItems(items){
  const map=new Map((state.heritageItems||[]).map(v=>[heritageFingerprint(v),v]));
  for(const raw of items||[]){const item=normalizeHeritageItem(raw);if(item)map.set(heritageFingerprint(item),item)}
  const all=[...map.values()];
  // Fusionne les pages Wikipédia avec une notice officielle très proche plutôt que d'empiler deux symboles.
  const culture=all.filter(v=>v.category!=="wikipedia"),wiki=all.filter(v=>v.category==="wikipedia"),kept=[...culture];
  for(const w of wiki){
    const near=culture.find(c=>distanceMeters(c,w)<75&&(String(c.name).toLowerCase().includes(String(w.name).toLowerCase())||String(w.name).toLowerCase().includes(String(c.name).toLowerCase())||distanceMeters(c,w)<25));
    if(near){near.wikipediaDescription=near.wikipediaDescription||w.description;near.wikipediaUrl=near.wikipediaUrl||w.url;near.wikidata=near.wikidata||w.wikidata}
    else kept.push(w);
  }
  state.heritageItems=kept.sort((a,b)=>String(a.name).localeCompare(String(b.name),"fr"));
  saveHeritage();updateHeritageUI();render();
}
function saveHeritage(){
  try{localStorage.setItem(territoryStorageKey(HERITAGE_KEY),JSON.stringify({items:state.heritageItems,enabled:state.heritageEnabled,updatedAt:new Date().toISOString()}))}catch{}
}
function loadHeritage(){
  try{
    const saved=JSON.parse(localStorage.getItem(territoryStorageKey(HERITAGE_KEY))||"null");
    if(saved&&Array.isArray(saved.items))state.heritageItems=saved.items.map(normalizeHeritageItem).filter(Boolean);
    if(saved?.enabled)state.heritageEnabled={...state.heritageEnabled,...saved.enabled};
  }catch{state.heritageItems=[]}
  updateHeritageUI();
}
function enabledHeritageItems(){return state.heritageItems.filter(v=>state.heritageEnabled[v.category]!==false)}
function updateHeritageUI(message=""){
  if(!els.heritageCount)return;
  const visible=enabledHeritageItems();els.heritageCount.textContent=visible.length;
  const sourceCounts=visible.reduce((acc,v)=>(acc[v.category]=(acc[v.category]||0)+1,acc),{});
  const pills=Object.entries(sourceCounts).map(([k,n])=>`${heritageMarkerDefinition(k).glyph} ${n}`).join(" · ");
  els.heritageSummary.textContent=message||(visible.length?`${pills} · mémorisés dans ce navigateur`:"Aucune source patrimoniale synchronisée.");
  const bindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
  for(const [id,key] of Object.entries(bindings))if(els[id])els[id].checked=state.heritageEnabled[key]!==false;
  setStatus("heritage",visible.length?"ok":"pending",visible.length?`${visible.length} lieux`:"à synchroniser");
}
function heritageQueryRadius(){
  const e=largestExtent(),c=CONFIG.dataCenter;
  return Math.min(10000,Math.ceil(Math.max(distanceMeters(c,{lat:e.north,lon:e.west}),distanceMeters(c,{lat:e.south,lon:e.east}))+500));
}
function cultureFieldToken(name){
  const value=String(name||"");
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)?value:`\`${value.replaceAll("`","``")}\``;
}
function cultureKey(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
function cultureFieldScore(field,hints=[]){
  const hay=cultureKey(`${field?.name||""} ${field?.label||""}`);
  const isGeo=field?.type==="geo_point_2d"||field?.type==="geo_shape";
  if(!isGeo)return 0;
  let score=field.type==="geo_point_2d"?100:85;
  for(const [index,hint] of hints.entries())if(hay.includes(cultureKey(hint)))score+=40-index;
  if(/coord|geo|wgs|localisation/.test(hay))score+=8;
  return score;
}
function cultureFindGeoField(metadata,ds){
  const fields=metadata?.fields||[];
  const candidates=fields
    .map(field=>({field,score:cultureFieldScore(field,ds.geoHints||[])}))
    .filter(v=>v.score>0)
    .sort((a,b)=>b.score-a.score);
  return candidates[0]?.field||null;
}
function cultureFindDepartmentField(metadata){
  const candidates=(metadata?.fields||[]).map(field=>{
    const hay=cultureKey(`${field.name||""} ${field.label||""}`);
    let score=0;
    if(/code.*departement|departement.*code|dpt.*num|dep.*num/.test(hay))score=100;
    else if(/departement.*format.*numerique|^dpt$|^dep$/.test(hay))score=90;
    else if(/departement/.test(hay))score=60;
    return {field,score,hay};
  }).filter(v=>v.score).sort((a,b)=>b.score-a.score);
  return candidates[0]||null;
}
function cultureApiErrorMessage(response,body){
  let detail="";
  try{
    const parsed=JSON.parse(body);
    detail=parsed.message||parsed.error||parsed.error_code||"";
  }catch{detail=String(body||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
  return `HTTP ${response.status}${detail?` · ${detail.slice(0,260)}`:""}`;
}
async function cultureFetchJson(dataset,path="",params=null,timeoutMs=32000){
  const failures=[];
  for(const portal of CULTURE_API_PORTALS){
    const base=`${portal}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}${path}`;
    const url=params?`${base}?${params}`:base;
    try{
      const response=await fetchWithTimeout(url,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},timeoutMs);
      const body=await response.text();
      if(!response.ok)throw new Error(cultureApiErrorMessage(response,body));
      let json;
      try{json=JSON.parse(body)}catch{throw new Error("réponse JSON illisible")}
      return {json,portal,url};
    }catch(err){
      const message=err?.name==="AbortError"?"délai dépassé":err?.message||String(err);
      failures.push(`${new URL(portal).hostname}: ${message}`);
    }
  }
  throw new Error(failures.join(" | "));
}
async function cultureFetchMetadata(dataset){
  const {json,portal}=await cultureFetchJson(dataset,"",null,26000);
  return {...json,_atlasPortal:portal};
}

// L’API Explore v2.1 répond correctement depuis une page HTTPS, mais certains
// portails refusent l’origine opaque « null » d’un fichier ouvert en file://.
// L’API Search v1 conserve un mode JSONP officiel : un <script> externe n’est
// pas soumis à CORS et permet donc à l’Atlas portable de synchroniser Culture.
function cultureJsonp(url,timeoutMs=42000){
  return new Promise((resolve,reject)=>{
    const callback=`__atlasCulture_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement("script");
    let settled=false;
    const cleanup=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      script.remove();
      try{delete window[callback]}catch{window[callback]=undefined}
    };
    window[callback]=payload=>{cleanup();resolve(payload)};
    script.async=true;
    script.referrerPolicy="no-referrer";
    script.onerror=()=>{cleanup();reject(new Error("chargement JSONP refusé ou indisponible"))};
    const separator=url.includes("?")?"&":"?";
    script.src=`${url}${separator}format=jsonp&callback=${encodeURIComponent(callback)}`;
    const timer=setTimeout(()=>{cleanup();reject(new DOMException("Délai JSONP dépassé","AbortError"))},timeoutMs);
    document.head.appendChild(script);
  });
}

async function cultureFetchV1JsonpPage(portal,dataset,params,timeoutMs=42000){
  const query=new URLSearchParams(params||{});
  query.set("dataset",dataset);
  const url=`${portal}/api/records/1.0/search/?${query}`;
  const json=await cultureJsonp(url,timeoutMs);
  if(json?.error)throw new Error(json.error?.message||json.error||"erreur API JSONP");
  if(!Array.isArray(json?.records))throw new Error("réponse JSONP sans enregistrements");
  return {json,portal,url};
}

async function cultureFetchV1JsonpPages(dataset,params,maxRecords=1000){
  const failures=[];
  for(const portal of CULTURE_API_PORTALS){
    try{
      const out=[];
      let start=0,nhits=Infinity;
      while(start<nhits&&out.length<maxRecords){
        const pageSize=Math.min(500,maxRecords-out.length);
        const pageParams={...(params||{}),rows:String(pageSize),start:String(start)};
        const result=await cultureFetchV1JsonpPage(portal,dataset,pageParams);
        const rows=result.json.records||[];
        nhits=Number(result.json.nhits??rows.length);
        out.push(...rows);
        if(!rows.length||rows.length<pageSize)break;
        start+=rows.length;
      }
      return {rows:out,total:Number.isFinite(nhits)?nhits:out.length,portal};
    }catch(err){
      const message=err?.name==="AbortError"?"délai dépassé":err?.message||String(err);
      failures.push(`${new URL(portal).hostname}: ${message}`);
    }
  }
  throw new Error(failures.join(" | "));
}

async function fetchCultureFromDatasetJsonp(dataset,category,ds){
  const radius=heritageQueryRadius();
  const departmentName=CONFIG.territory.administration.departmentName;
  const attempts=[
    {label:"proximité JSONP",params:{"geofilter.distance":`${CONFIG.dataCenter.lat},${CONFIG.dataCenter.lon},${radius}`},cap:1000}
  ];
  // Le filtre plein texte sert de repli aux catalogues dont le champ spatial
  // n’est pas déclaré comme géographique par le portail.
  if(departmentName)attempts.push({label:`${departmentName} JSONP`,params:{q:departmentName},cap:Math.min(ds.fullScanCap||1800,3000)});
  if(ds.allowFullScan)attempts.push({label:"catalogue JSONP complet",params:{},cap:ds.fullScanCap||1800});
  const errors=[];
  for(const attempt of attempts){
    try{
      const fetched=await cultureFetchV1JsonpPages(dataset,attempt.params,attempt.cap);
      const syncedAt=new Date().toISOString();
      const items=fetched.rows.map((raw,index)=>normalizeCultureRecord({
        ...raw,
        _atlasDataset:dataset,
        _atlasApiVersion:"1.0 JSONP",
        _atlasSyncedAt:syncedAt,
        _atlasRecordId:raw.recordid||`${dataset}-${index}`
      },category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
      // Une recherche départementale peut légitimement renvoyer des éléments
      // hors fenêtre. On accepte la tentative si elle a reçu des lignes, même
      // si le filtre local n’en conserve aucune.
      if(fetched.rows.length||attempt.label.includes("proximité")){
        return {items,dataset,strategy:attempt.label,portal:fetched.portal,total:fetched.total,received:fetched.rows.length};
      }
    }catch(err){errors.push(`${attempt.label}: ${err?.message||err}`)}
  }
  throw new Error(errors.join(" · "));
}
function tabularHeaderList(profile){
  const raw=profile?.profile?.header??profile?.header??profile?.profile?.columns??profile?.columns??[];
  if(!Array.isArray(raw))return [];
  return raw.map(value=>typeof value==="string"?value:(value?.name??value?.label??"")).filter(Boolean);
}
function cultureDepartmentHeader(headers){
  const scored=headers.map(name=>{
    const key=cultureKey(name);let score=0;
    if(key==="departement_format_numerique")score=120;
    else if(key==="code_insee_departement")score=115;
    else if(key==="dpt")score=110;
    else if(key==="departement")score=100;
    else if(key.includes("departement")&&key.includes("code"))score=105;
    else if(key.includes("departement"))score=85;
    if(key.includes("region"))score-=60;
    return {name,key,score};
  }).filter(v=>v.score>0).sort((a,b)=>b.score-a.score);
  return scored[0]||null;
}
async function cultureTabularJson(rid,path,params=null,timeoutMs=32000){
  const query=params instanceof URLSearchParams?params:new URLSearchParams(params||{});
  const url=`${DATAGOUV_TABULAR_BASE}/${encodeURIComponent(rid)}/${path}${query.size?`?${query}`:""}`;
  const response=await fetchWithTimeout(url,{headers:{Accept:"application/json"}},timeoutMs);
  const body=await response.text();
  let json=null;try{json=body?JSON.parse(body):null}catch{}
  if(!response.ok){
    const detail=json?.detail||json?.message||body.slice(0,240)||`HTTP ${response.status}`;
    throw new Error(`data.gouv tabulaire · HTTP ${response.status} · ${detail}`);
  }
  return {json,url};
}
async function cultureTabularProfile(rid){
  return (await cultureTabularJson(rid,"profile/",null,30000)).json;
}
async function cultureTabularPages(rid,baseParams,maxRecords=1800){
  const out=[];let page=1;
  while(out.length<maxRecords){
    const params=new URLSearchParams(baseParams||{});
    params.set("page",String(page));
    params.set("page_size",String(Math.min(50,maxRecords-out.length)));
    const {json}=await cultureTabularJson(rid,"data/",params,36000);
    const rows=Array.isArray(json?.data)?json.data:(Array.isArray(json?.results)?json.results:[]);
    out.push(...rows);
    if(!rows.length||rows.length<Number(params.get("page_size")))break;
    page+=1;
  }
  return out;
}
async function fetchCultureFromDataGouv(category){
  const source=CULTURE_TABULAR_RESOURCES[category];
  const ds=CULTURE_DATASETS[category];
  if(!source||!ds)throw new Error("ressource data.gouv absente");
  const profile=await cultureTabularProfile(source.rid);
  const headers=tabularHeaderList(profile);
  const department=cultureDepartmentHeader(headers);
  const errors=[];let rows=[];let strategy="";

  if(department){
    const values=territoryDepartmentValues(CONFIG.territory,/code|numerique|^dpt$/.test(department.key));
    for(const value of values){
      try{
        rows=await cultureTabularPages(source.rid,{[`${department.name}__exact`]:value},Math.min(ds.fullScanCap||2200,3500));
        if(rows.length){strategy=`API tabulaire data.gouv · ${department.name}=${value}`;break}
      }catch(err){errors.push(`${department.name}=${value}: ${err?.message||err}`)}
    }
  }

  // Les catalogues de labels et Muséofile restent assez petits pour un
  // parcours complet. On évite en revanche de télécharger les ~100 Mo de
  // Mérimée si le filtre départemental n’est pas disponible.
  if(!rows.length&&category!=="monument"){
    try{
      rows=await cultureTabularPages(source.rid,{},ds.fullScanCap||3500);
      strategy="API tabulaire data.gouv · catalogue filtré localement";
    }catch(err){errors.push(`catalogue complet: ${err?.message||err}`)}
  }
  if(!rows.length)throw new Error(errors.join(" · ")||"aucune ligne reçue par l’API tabulaire data.gouv");

  const syncedAt=new Date().toISOString();
  const items=rows.map((raw,index)=>normalizeCultureRecord({
    ...raw,
    _atlasDataset:source.dataset,
    _atlasApiVersion:"data.gouv tabulaire",
    _atlasSyncedAt:syncedAt,
    _atlasRecordId:raw.__id||raw.recordid||raw.id||`${source.dataset}-${index}`
  },category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
  return {items,dataset:source.dataset,strategy,portal:"tabular-api.data.gouv.fr",total:rows.length,received:rows.length};
}

async function cultureFetchPages(dataset,baseParams,maxRecords=600){
  const out=[];let offset=0,total=Infinity,portal="";
  while(offset<total&&out.length<maxRecords){
    const params=new URLSearchParams(baseParams||{});
    params.set("limit",String(Math.min(100,maxRecords-out.length)));
    params.set("offset",String(offset));
    const result=await cultureFetchJson(dataset,"/records",params,36000);
    portal=result.portal;
    const rows=Array.isArray(result.json.results)?result.json.results:[];
    total=Number(result.json.total_count??rows.length);
    out.push(...rows);
    if(!rows.length||rows.length<Number(params.get("limit")))break;
    offset+=rows.length;
  }
  return {rows:out,total,portal};
}
function cultureSpatialParams(geoField){
  const e=largestExtent();
  return {where:`in_bbox(${cultureFieldToken(geoField.name)}, ${e.south}, ${e.west}, ${e.north}, ${e.east})`};
}
function cultureDepartmentParams(fieldInfo){
  if(!fieldInfo)return [];
  const token=cultureFieldToken(fieldInfo.field.name),numeric=/code|num|^dpt$|^dep$/.test(fieldInfo.hay);
  const values=territoryDepartmentValues(CONFIG.territory,numeric);
  return values.map(value=>({where:`${token} = "${value}"`}));
}
async function fetchCultureFromDataset(dataset,category,ds){
  const metadata=await cultureFetchMetadata(dataset);
  const geoField=cultureFindGeoField(metadata,ds);
  let fetched=null,strategy="",spatialError="";
  if(geoField){
    try{
      fetched=await cultureFetchPages(dataset,cultureSpatialParams(geoField),650);
      strategy=`emprise via ${geoField.name}`;
    }catch(err){spatialError=err?.message||String(err)}
  }
  if(!fetched){
    const department=cultureFindDepartmentField(metadata),departmentQueries=cultureDepartmentParams(department);
    for(const query of departmentQueries){
      try{
        const candidate=await cultureFetchPages(dataset,query,Math.min(ds.fullScanCap||2000,3500));
        if(candidate.rows.length){fetched=candidate;strategy=`département via ${department.field.name}`;break}
      }catch{}
    }
    const recordCount=Number(metadata?.metas?.default?.records_count??metadata?.records_count??Infinity);
    if(!fetched&&ds.allowFullScan&&recordCount<=(ds.fullScanCap||2000)){
      fetched=await cultureFetchPages(dataset,{},ds.fullScanCap||2000);
      strategy="catalogue complet filtré localement";
    }
  }
  if(!fetched)throw new Error(`${spatialError?`filtre spatial refusé : ${spatialError} · `:""}aucun repli départemental exploitable`);
  const syncedAt=new Date().toISOString();
  const items=fetched.rows.map((raw,index)=>normalizeCultureRecord({...raw,_atlasDataset:dataset,_atlasApiVersion:"2.1",_atlasSyncedAt:syncedAt,_atlasRecordId:raw.recordid||raw.id||`${dataset}-${index}`},category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
  return {items,dataset,strategy,portal:fetched.portal,total:fetched.total,received:fetched.rows.length};
}
async function fetchCultureDataset(category){
  const ds=CULTURE_DATASETS[category];if(!ds)return {items:[],dataset:"",strategy:""};
  const errors=[];

  // Chemin prioritaire, pensé pour fonctionner depuis un fichier HTML local.
  try{return await fetchCultureFromDataGouv(category)}
  catch(err){errors.push(`data.gouv tabulaire: ${err?.message||err}`)}

  const ids=[ds.id,ds.fallbackId].filter(Boolean);
  for(const dataset of ids){
    const methods=LOCAL_FILE_MODE
      ? [()=>fetchCultureFromDatasetJsonp(dataset,category,ds),()=>fetchCultureFromDataset(dataset,category,ds)]
      : [()=>fetchCultureFromDataset(dataset,category,ds),()=>fetchCultureFromDatasetJsonp(dataset,category,ds)];
    for(const method of methods){
      try{return await method()}
      catch(err){errors.push(`${dataset}: ${err?.message||err}`)}
    }
  }
  throw new Error(`${ds.label} · ${errors.join(" · ")}`);
}
async function syncCultureHeritage(){
  const requestStamp=territoryRequestStamp();
  const selected=["monument","garden","house","museum"].filter(k=>state.heritageEnabled[k]!==false);
  if(!selected.length){els.heritageHelp.textContent="Coche au moins une base du ministère de la Culture.";return}
  els.syncCultureHeritage.disabled=true;
  const items=[],reports=[],errors=[];
  try{
    for(let i=0;i<selected.length;i++){
      if(!territoryRequestIsCurrent(requestStamp))return null;
      const category=selected[i],label=CULTURE_DATASETS[category].label;
      els.heritageHelp.textContent=`Ministère de la Culture · ${i+1}/${selected.length} · ${label}…`;
      try{
        const result=await fetchCultureDataset(category);
        if(!territoryRequestIsCurrent(requestStamp))return null;
        items.push(...result.items);
        reports.push(`${label} ${result.items.length} · ${result.strategy}`);
      }catch(err){errors.push(err?.message||String(err))}
    }
    if(!territoryRequestIsCurrent(requestStamp))return null;
    if(items.length)mergeHeritageItems(items);else updateHeritageUI();
    const reportText=reports.length?` Sources reçues : ${reports.join(" ; ")}.`:"";
    const conciseErrors=errors.map(value=>String(value).length>900?`${String(value).slice(0,900)}…`:String(value));
    const errorText=conciseErrors.length?` Échecs : ${conciseErrors.join(" | ")}.`:"";
    els.heritageHelp.innerHTML=`<strong>${items.length}</strong> notices culturelles reçues et mémorisées.${esc(reportText)}${errorText?` <details><summary>Diagnostic des sources en échec</summary>${esc(errorText)}</details>`:""} Source prioritaire : API tabulaire officielle de data.gouv.fr. Les liens POP restent accessibles dans les détails documentaires.`;
  }finally{els.syncCultureHeritage.disabled=false}
}
async function wikipediaDetails(pageIds){
  const out=[];
  for(let i=0;i<pageIds.length;i+=40){
    const q=new URLSearchParams({action:"query",format:"json",origin:"*",pageids:pageIds.slice(i,i+40).join("|"),prop:"extracts|info|pageprops",inprop:"url",exintro:"1",explaintext:"1",exsentences:"4",redirects:"1"});
    const r=await fetchWithTimeout(`${WIKIPEDIA_API}?${q}`,{},25000);if(!r.ok)throw new Error(`Wikipédia détails · HTTP ${r.status}`);
    const j=await r.json();out.push(...Object.values(j.query?.pages||{}));
  }
  return out;
}
async function syncWikipediaHeritage(){
  const requestStamp=territoryRequestStamp();
  if(state.heritageEnabled.wikipedia===false){els.heritageHelp.textContent="La source Wikipédia est décochée.";return}
  els.syncWikipediaHeritage.disabled=true;els.heritageHelp.textContent="Recherche des pages géolocalisées autour de l’Atlas…";
  try{
    const q=new URLSearchParams({action:"query",format:"json",origin:"*",list:"geosearch",gscoord:`${CONFIG.dataCenter.lat}|${CONFIG.dataCenter.lon}`,gsradius:String(heritageQueryRadius()),gslimit:"100",gsnamespace:"0"});
    const r=await fetchWithTimeout(`${WIKIPEDIA_API}?${q}`,{},25000);if(!r.ok)throw new Error(`Wikipédia géolocalisation · HTTP ${r.status}`);
    const j=await r.json(),geo=j.query?.geosearch||[],details=await wikipediaDetails(geo.map(v=>v.pageid));
    if(!territoryRequestIsCurrent(requestStamp))return null;
    const byId=new Map(details.map(v=>[Number(v.pageid),v]));
    const items=geo.map(g=>{
      const d=byId.get(Number(g.pageid))||{},extract=String(d.extract||"").replace(/\s+/g," ").trim();
      return normalizeHeritageItem({id:`WIKI-${g.pageid}`,category:"wikipedia",name:g.title,lat:+g.lat,lon:+g.lon,description:extract.slice(0,900),url:d.fullurl||`https://fr.wikipedia.org/?curid=${g.pageid}`,wikidata:d.pageprops?.wikibase_item||"",source:"Wikipédia francophone · page géolocalisée",license:"CC BY-SA",heritage:true});
    }).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
    mergeHeritageItems(items);els.heritageHelp.innerHTML=`<strong>${items.length}</strong> pages géolocalisées trouvées. Les doublons proches d’une notice officielle ont été fusionnés pour enrichir son récit sans ajouter un second symbole.`;
  }catch(err){if(!territoryRequestIsCurrent(requestStamp))return null;els.heritageHelp.textContent=`Wikipédia n’a pas répondu : ${err?.message||err}`}
  finally{els.syncWikipediaHeritage.disabled=false}
}
function clearHeritage(){state.heritageItems=[];saveHeritage();updateHeritageUI();render();els.heritageHelp.textContent="Couche synchronisée vidée. Les repères saisis manuellement restent intacts."}

function loreMarkerDefinition(category){
  const defs={
    historic:{glyph:"HI",cls:"c-lore-heritage",label:"bâtiment historique / patrimoine"},
    ruin:{glyph:"RU",cls:"c-lore-ruin",label:"ruine / maison ruinée"},
    friche:{glyph:"FR",cls:"c-lore-friche",label:"friche industrielle ou artisanale"},
    abandoned:{glyph:"AB",cls:"c-lore-abandoned",label:"urbanisme abandonné / infrastructure oubliée"},
    anecdote:{glyph:"AN",cls:"c-lore-anecdote",label:"anecdote locale / récit"},
    mystery:{glyph:"MY",cls:"c-lore-mystery",label:"lieu mystérieux / ambiance étrange"},
    view:{glyph:"VP",cls:"c-lore-view",label:"curiosité paysagère / point de vue"}
  };
  return defs[category]||defs.anecdote;
}
function extractOsmCavities(features){
  if(!Array.isArray(features))return [];
  const out=[];
  for(const f of features){
    const t=f?.tags||{};
    let marker=null,type="indéterminé",detail="";
    if(t.natural==="cave_entrance"){marker="N>";type="naturelle";detail="entrée de cavité cartographiée dans OpenStreetMap"}
    else if(t.man_made==="adit"){marker="A>";type="galerie ou réseau de galeries";detail="entrée artificielle / adit cartographié dans OpenStreetMap"}
    else if(t.man_made==="mineshaft"){marker="Av";type="puits";detail="puits cartographié dans OpenStreetMap"}
    if(!marker)continue;
    const p=f.coords?.[0];if(!Array.isArray(p)||!Number.isFinite(+p[0])||!Number.isFinite(+p[1]))continue;
    out.push({id:`OSM-${f.id}`,name:t.name||t.description||"Entrée OSM sans nom",type,detail,markerOverride:marker,lat:+p[1],lon:+p[0],source:"OpenStreetMap, repère contributif",osm:true,tags:t});
  }
  return out;
}
function refreshCavities(){
  const official=Array.isArray(state.officialCavities)?state.officialCavities:[];
  const merged=[...official];
  for(const c of state.osmCavities||[]){
    const duplicate=merged.some(o=>Number.isFinite(o.lat)&&distanceMeters(o,c)<45);
    if(!duplicate)merged.push(c);
  }
  for(const c of state.localCavities||[])merged.push(c);
  state.cavities=merged;
  populateCavitySelect();
  if(state.load.cavities!=="pending"){
    const geoloc=official.filter(c=>Number.isFinite(c.lat)).length;
    const label=`${geoloc} BRGM + ${(state.osmCavities||[]).length} OSM + ${(state.localCavities||[]).length} locaux`;
    setStatus("cavities",geoloc||state.osmCavities.length||state.localCavities.length?"ok":"bad",label);
  }
}
function localMarkerDefinition(glyph){
  const map={
    "A>":{type:"carrière",detail:"entrée artificielle observée",cls:"c-doc-anthropic"},
    "N>":{type:"naturelle",detail:"entrée naturelle observée",cls:"c-doc-natural"},
    "Av":{type:"puits",detail:"ouverture verticale artificielle observée",cls:"c-doc-anthropic"},
    "Nv":{type:"naturelle",detail:"ouverture verticale naturelle observée",cls:"c-doc-natural"},
    "?o":{type:"indéterminé",detail:"ouverture d’origine indéterminée observée",cls:"c-doc-unknown"}
  };
  return map[glyph]||map["?o"];
}

async function fetchCavities(){
  const requestStamp=territoryRequestStamp();
  const cached=cacheGet(territoryStorageKey("atlas-karst-cavities-v06"));
  if(cached){
    state.officialCavities=Array.isArray(cached)?cached.map(normalizeCavityRecord).filter(Boolean):[];
    state.cavityInventoryOnly=false;
    state.load.cavities="ok";
    refreshCavities();
    scheduleDataRender("cavities-cache");
    return;
  }
  const base="https://services.arcgis.com/d3voDfTFbHOCRwVR/arcgis/rest/services/G%C3%A9orisques___inventaire_des_cavit%C3%A9s_souterraines__France_enti%C3%A8re_/FeatureServer/1/query";
  const e=largestExtent();
  const params=new URLSearchParams({
    where:"1=1",
    geometry:`${e.west},${e.south},${e.east},${e.north}`,
    geometryType:"esriGeometryEnvelope",
    inSR:"4326",
    spatialRel:"esriSpatialRelIntersects",
    outFields:"*",
    returnGeometry:"true",
    outSR:"4326",
    f:"geojson"
  });
  try{
    const r=await fetch(`${base}?${params.toString()}`);
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const geo=await r.json();
    if(!territoryRequestIsCurrent(requestStamp))return null;
    if(!Array.isArray(geo.features))throw new Error("GeoJSON cavités incomplet");
    const cavs=geo.features.map(normalizeCavity).filter(Boolean);
    if(!cavs.length)throw new Error("Aucune cavité géolocalisée dans l’emprise");
    state.officialCavities=cavs;
    state.cavityInventoryOnly=false;
    cacheSet(territoryStorageKey("atlas-karst-cavities-v06"),cavs);
    state.load.cavities="ok";
  }catch(err){
    if(!territoryRequestIsCurrent(requestStamp))return null;
    const inventory=territoryUsesEmbeddedData("cavityInventory",CONFIG.territory)?CAVITY_INVENTORY:[];
    state.officialCavities=inventory.map(c=>normalizeCavityRecord({...c,lat:null,lon:null,source:"inventaire local sans coordonnées"}));
    state.cavityInventoryOnly=true;
    state.load.cavities="bad";
    console.warn("Cavités géolocalisées indisponibles",err);
  }
  refreshCavities();
  scheduleDataRender("cavities-sync");
}
function normalizeCavityRecord(c){
  if(!c||typeof c!=="object")return null;
  return {...c,id:text(c.id||c.numCavite||""),name:cavityName(c),type:cavityType(c),detail:text(c.detail),nature:text(c.nature),source:text(c.source,"BDCavités / Géorisques")};
}
function normalizeCavity(feature){
  const a=feature.properties||{};
  const c=feature.geometry?.coordinates;
  if(!Array.isArray(c)||!Number.isFinite(+c[0])||!Number.isFinite(+c[1]))return null;
  return {
    id:a.numCavite||a.numcavite||String(a.OBJECTID||""),
    name:a.nomCavite||a.nomcavite||"Cavité sans nom",
    type:text(a.TYPE_CAV||a.typeCavite||a.typecavite||a.natureCavite,"indéterminé").toLowerCase(),
    detail:a.typeCaviteAppauvri||a.typecaviteappauvri||a.natureCavite||a.naturecavite||"",
    nature:a.natureCavite||a.naturecavite||"",
    position:a.positionnement||a.positionnementAppauvri||a.reperageGeographique||"",
    precision:Number(a.precisionXY||a.precisionxy)||null,
    altitude:Number(a.zOuvrage||a.zouvrage)||null,
    comments:a.commentaires||"",
    commune:a.COMM_ESRI||a.commune||"",
    lat:+c[1],lon:+c[0],
    source:"BDCavités / Géorisques, adaptation Esri France"
  };
}

async function fetchWithTimeout(url,options={},timeoutMs=25000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function fetchElevationIgn(points){
  const values=[];
  for(let i=0;i<points.length;i+=100){
    const batch=points.slice(i,i+100);
    const lon=batch.map(p=>p.lon).join("|");
    const lat=batch.map(p=>p.lat).join("|");
    const q=new URLSearchParams({
      lon,lat,
      resource:"ign_rge_alti_wld",
      delimiter:"|",
      indent:"false",
      measures:"false",
      zonly:"true"
    });
    const url=`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?${q}`;
    const r=await fetchWithTimeout(url,{},30000);
    if(!r.ok)throw new Error(`IGN HTTP ${r.status}`);
    const j=await r.json();
    const rows=Array.isArray(j.elevations)?j.elevations:null;
    if(!rows||rows.length!==batch.length)throw new Error(`IGN relief reçu : ${rows?.length||0}/${batch.length}`);
    const vals=rows.map(v=>Number(typeof v==="object"?v.z:v));
    if(vals.some(v=>!Number.isFinite(v)||v<=-99990))throw new Error("IGN a renvoyé une altitude invalide");
    values.push(...vals);
  }
  return values;
}
async function fetchElevationOpenMeteo(points){
  const values=[];
  for(let i=0;i<points.length;i+=80){
    const batch=points.slice(i,i+80);
    const q=new URLSearchParams({
      latitude:batch.map(p=>p.lat).join(","),
      longitude:batch.map(p=>p.lon).join(",")
    });
    const url=`https://api.open-meteo.com/v1/elevation?${q}`;
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        const r=await fetchWithTimeout(url,{},25000);
        if(!r.ok)throw new Error(`Open‑Meteo HTTP ${r.status}`);
        const j=await r.json();
        const vals=Array.isArray(j.elevation)?j.elevation.map(Number):null;
        if(!vals||vals.length!==batch.length||vals.some(v=>!Number.isFinite(v))){
          throw new Error(`Open‑Meteo relief reçu : ${vals?.length||0}/${batch.length}`);
        }
        values.push(...vals);
        lastError=null;
        break;
      }catch(err){
        lastError=err;
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,700));
      }
    }
    if(lastError)throw lastError;
  }
  return values;
}
async function fetchElevation(){
  const requestStamp=territoryRequestStamp();
  const cached=cacheGet(territoryStorageKey("atlas-karst-elevation-v09d"));
  if(cached){
    state.elevation=cached;
    setStatus("elevation","ok",`cache ${cached.source||"local"}`);
    scheduleDataRender("elevation-cache");
    return;
  }
  const e=largestExtent(),cols=23,rows=17,points=[];
  for(let y=0;y<rows;y++){
    const lat=e.north-(y/(rows-1))*(e.north-e.south);
    for(let x=0;x<cols;x++){
      const lon=e.west+(x/(cols-1))*(e.east-e.west);
      points.push({lat:lat.toFixed(5),lon:lon.toFixed(5)});
    }
  }
  let values=null,source="",ignError=null,openMeteoError=null;
  try{
    values=await fetchElevationIgn(points);
    source="IGN RGE ALTI";
  }catch(err){
    ignError=err;
    console.warn("Relief IGN indisponible, tentative Open-Meteo",err);
    try{
      values=await fetchElevationOpenMeteo(points);
      source="Open‑Meteo / Copernicus";
    }catch(fallbackErr){
      openMeteoError=fallbackErr;
    }
  }
  if(values&&values.length===points.length){
    if(!territoryRequestIsCurrent(requestStamp))return null;
    state.elevation={extent:e,cols,rows,values,source};
    cacheSet(territoryStorageKey("atlas-karst-elevation-v09d"),state.elevation);
    setStatus("elevation","ok",`${values.length} points · ${source}`);
  }else{
    if(!territoryRequestIsCurrent(requestStamp))return null;
    state.elevation=null;
    setStatus("elevation","bad","2 sources indisponibles");
    console.warn("Relief indisponible",{
      ign:ignError?.message||ignError,
      openMeteo:openMeteoError?.message||openMeteoError
    });
  }
  scheduleDataRender("elevation-sync");
}

function elevationAt(lat,lon){
  const d=state.elevation;if(!d)return null;
  const fx=(lon-d.extent.west)/(d.extent.east-d.extent.west)*(d.cols-1);
  const fy=(d.extent.north-lat)/(d.extent.north-d.extent.south)*(d.rows-1);
  if(fx<0||fy<0||fx>d.cols-1||fy>d.rows-1)return null;
  const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(d.cols-1,x0+1),y1=Math.min(d.rows-1,y0+1);
  const tx=fx-x0,ty=fy-y0;
  const v=(x,y)=>d.values[y*d.cols+x];
  return v(x0,y0)*(1-tx)*(1-ty)+v(x1,y0)*tx*(1-ty)+v(x0,y1)*(1-tx)*ty+v(x1,y1)*tx*ty;
}


async function fetchJsonMaybeGzip(url){
  const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const buf=await r.arrayBuffer();
  const bytes=new Uint8Array(buf);
  let textData="";
  if(bytes[0]===0x1f&&bytes[1]===0x8b){
    if(!("DecompressionStream" in window))throw new Error("Décompression gzip non prise en charge par ce navigateur");
    const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    textData=await new Response(stream).text();
  }else textData=new TextDecoder().decode(bytes);
  return JSON.parse(textData);
}
function geometryRings(geometry){
  if(!geometry)return [];
  if(geometry.type==="Polygon")return geometry.coordinates?.length?[geometry.coordinates[0]]:[];
  if(geometry.type==="MultiPolygon")return (geometry.coordinates||[]).map(p=>p[0]).filter(Boolean);
  return [];
}
function normalizeCadastre(fc,kind){
  const out=[];
  for(const f of fc?.features||[]){
    for(const coords of geometryRings(f.geometry)){
      if(!coords?.length)continue;
      const lons=coords.map(p=>+p[0]),lats=coords.map(p=>+p[1]);
      if(!lons.every(Number.isFinite)||!lats.every(Number.isFinite))continue;
      out.push({id:f.id||f.properties?.id||"",kind,properties:f.properties||{},coords:coords.map(p=>[+p[0],+p[1]]),bbox:{west:Math.min(...lons),east:Math.max(...lons),south:Math.min(...lats),north:Math.max(...lats)}});
    }
  }
  return out;
}
async function fetchCadastre(){
  const requestStamp=territoryRequestStamp();
  const cacheKey=territoryStorageKey("atlas-karst-cadastre-v06");
  const commune=CONFIG.territory.administration.communeInsee||CONFIG.communeInsee;
  const department=CONFIG.territory.administration.departmentCode;
  if(!commune||!department){state.cadastreBuildings=[];state.cadastreParcels=[];setStatus("cadastre","bad","commune non déterminée");return null}
  const cached=cacheGet(cacheKey);
  if(cached){state.cadastreBuildings=cached.buildings||[];state.cadastreParcels=cached.parcels||[];setStatus("cadastre","ok",`cache · ${state.cadastreBuildings.length} bât.`);autoSnapHouse();scheduleDataRender("cadastre-cache");return}
  const root=`https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${encodeURIComponent(department)}/${encodeURIComponent(commune)}`;
  try{
    const [buildingsFc,parcelsFc]=await Promise.all([
      fetchJsonMaybeGzip(`${root}/cadastre-${encodeURIComponent(commune)}-batiments.json.gz`),
      fetchJsonMaybeGzip(`${root}/cadastre-${encodeURIComponent(commune)}-parcelles.json.gz`)
    ]);
    if(!territoryRequestIsCurrent(requestStamp))return null;
    state.cadastreBuildings=normalizeCadastre(buildingsFc,"building");
    state.cadastreParcels=normalizeCadastre(parcelsFc,"parcel");
    cacheSet(cacheKey,{buildings:state.cadastreBuildings,parcels:state.cadastreParcels});
    setStatus("cadastre","ok",`${state.cadastreBuildings.length} bât. · ${state.cadastreParcels.length} parc.`);
    autoSnapHouse();
  }catch(err){if(!territoryRequestIsCurrent(requestStamp))return null;setStatus("cadastre","bad","indisponible");console.warn("Cadastre indisponible",err)}
  scheduleDataRender("cadastre-sync");
}
function polygonCentroid(coords){
  let x=0,y=0,a=0;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const f=coords[j][0]*coords[i][1]-coords[i][0]*coords[j][1];a+=f;x+=(coords[j][0]+coords[i][0])*f;y+=(coords[j][1]+coords[i][1])*f;
  }
  if(Math.abs(a)<1e-12){return {lon:coords.reduce((s,p)=>s+p[0],0)/coords.length,lat:coords.reduce((s,p)=>s+p[1],0)/coords.length}}
  return {lon:x/(3*a),lat:y/(3*a)};
}
function pointInLonLat(point,coords){
  let inside=false;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const xi=coords[i][0],yi=coords[i][1],xj=coords[j][0],yj=coords[j][1];
    const hit=((yi>point.lat)!==(yj>point.lat))&&(point.lon<(xj-xi)*(point.lat-yi)/(yj-yi+1e-15)+xi);if(hit)inside=!inside;
  }
  return inside;
}
function nearestCadastreBuilding(point){
  let best=null;
  for(const b of state.cadastreBuildings){
    if(pointInLonLat(point,b.coords))return {...b,centroid:polygonCentroid(b.coords),distance:0};
    const c=polygonCentroid(b.coords),d=distanceMeters(point,{lat:c.lat,lon:c.lon});
    if(!best||d<best.distance)best={...b,centroid:c,distance:d};
  }
  return best&&best.distance<180?best:null;
}
function snapHouseToBuilding(persist=true){
  if(!state.cadastreBuildings.length){els.houseHelp.innerHTML='<span class="house-placement-note">Le cadastre n’est pas chargé.</span>';return false}
  const b=nearestCadastreBuilding(state.address||CONFIG.house);
  if(!b){els.houseHelp.innerHTML='<span class="house-placement-note">Aucun bâtiment cadastral suffisamment proche.</span>';return false}
  state.houseBuilding=b;
  saveHousePosition({lat:b.centroid.lat,lon:b.centroid.lon},`centre du bâtiment cadastral le plus proche (${Math.round(b.distance)} m du point de référence)`,persist);
  return true;
}
function autoSnapHouse(){
  if(!HOUSE_WAS_SAVED&&state.address&&state.cadastreBuildings.length)snapHouseToBuilding(false);
}
async function fetchAddress(force=false,{moveHouse=force||!HOUSE_WAS_SAVED}={}){
  const requestStamp=territoryRequestStamp();
  const cacheKey=territoryStorageKey("atlas-karst-address-v06");
  const cached=!force&&cacheGet(cacheKey);
  if(cached){state.address=cached;setStatus("address","ok",`cache · score ${Math.round((cached.score||0)*100)} %`);if(moveHouse){CONFIG.house={lat:cached.lat,lon:cached.lon};autoSnapHouse();scheduleDataRender("address-cache")}return cached}
  const target=CONFIG.house||CONFIG.dataCenter;
  const query=new URLSearchParams({lon:Number(target.lon).toFixed(7),lat:Number(target.lat).toFixed(7),index:"address",limit:"1"});
  const url=`https://data.geopf.fr/geocodage/reverse?${query}`;
  try{
    const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();
    if(!territoryRequestIsCurrent(requestStamp))return null;
    const f=j.features?.[0],properties=f?.properties||{},c=f?.geometry?.coordinates;if(!Array.isArray(c)||!Number.isFinite(+c[0])||!Number.isFinite(+c[1]))throw new Error("Adresse non trouvée");
    state.address={lon:+c[0],lat:+c[1],label:properties.label||properties.name||"Adresse la plus proche",score:+properties.score||0,id:properties.id||"",citycode:properties.citycode||"",city:properties.city||"",postcode:properties.postcode||"",context:properties.context||"",district:properties.district||"",source:"Géoplateforme / Base Adresse Nationale"};
    cacheSet(cacheKey,state.address);setStatus("address","ok",`score ${Math.round(state.address.score*100)} %`);
    if(moveHouse){CONFIG.house={lat:state.address.lat,lon:state.address.lon};if(force)HOUSE_WAS_SAVED=false;autoSnapHouse();scheduleDataRender("address-sync")}
    return state.address;
  }catch(err){if(!territoryRequestIsCurrent(requestStamp))return null;setStatus("address","bad","non trouvée");console.warn("Adresse officielle indisponible",err);return null}
}

function normalizeHeaderName(s){
  return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
function firstRowValue(row, candidates){
  const normalized={};
  for(const [k,v] of Object.entries(row))normalized[normalizeHeaderName(k)]=v;
  for(const c of candidates){
    const v=normalized[normalizeHeaderName(c)];
    if(v!=null&&String(v).trim()!=="")return v;
  }
  return "";
}
function numericLoose(v){
  if(typeof v==="number")return v;
  const s=String(v??"").trim().replace(/\s/g,"").replace(",",".");
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function inverseIsoLatitude(L,e){
  let lat=2*Math.atan(Math.exp(L))-Math.PI/2;
  for(let i=0;i<15;i++){
    const next=2*Math.atan(
      Math.pow((1+e*Math.sin(lat))/(1-e*Math.sin(lat)),e/2)*Math.exp(L)
    )-Math.PI/2;
    if(Math.abs(next-lat)<1e-13)return next;
    lat=next;
  }
  return lat;
}
function inverseLambertConformal(x,y,params){
  const dx=x-params.xs,dy=y-params.ys;
  const R=Math.hypot(dx,dy);
  const gamma=Math.atan2(dx,params.ys-y);
  const lon=params.lon0+gamma/params.n;
  const L=-Math.log(Math.abs(R/params.c))/params.n;
  const lat=inverseIsoLatitude(L,params.e);
  return {lat,lon};
}
function geodeticToCartesian(lat,lon,h,a,e2){
  const sin=Math.sin(lat),cos=Math.cos(lat);
  const N=a/Math.sqrt(1-e2*sin*sin);
  return {
    x:(N+h)*cos*Math.cos(lon),
    y:(N+h)*cos*Math.sin(lon),
    z:(N*(1-e2)+h)*sin
  };
}
function cartesianToGeodetic(x,y,z,a,e2){
  const lon=Math.atan2(y,x),p=Math.hypot(x,y);
  let lat=Math.atan2(z,p*(1-e2)),h=0;
  for(let i=0;i<15;i++){
    const sin=Math.sin(lat),N=a/Math.sqrt(1-e2*sin*sin);
    h=p/Math.cos(lat)-N;
    const next=Math.atan2(z,p*(1-e2*N/(N+h)));
    if(Math.abs(next-lat)<1e-13){lat=next;break}
    lat=next;
  }
  return {lat,lon,h};
}
function lambert93ToWgs84(x,y){
  const p={
    n:0.7256077650532670,
    c:11754255.426096,
    xs:700000,
    ys:12655612.049876,
    lon0:3*Math.PI/180,
    e:0.0818191910428158
  };
  const g=inverseLambertConformal(x,y,p);
  return {lat:g.lat*180/Math.PI,lon:g.lon*180/Math.PI,coordinateSource:"Lambert‑93 converti"};
}
function lambert2ExtendedToWgs84(x,y){
  const aNtf=6378249.2,bNtf=6356515.0;
  const e2Ntf=1-(bNtf/aNtf)**2,eNtf=Math.sqrt(e2Ntf);
  const p={
    n:0.7289686274,
    c:11745793.39,
    xs:600000,
    ys:8199695.768,
    lon0:0.04079234433198,
    e:eNtf
  };
  const ntf=inverseLambertConformal(x,y,p);
  const cart=geodeticToCartesian(ntf.lat,ntf.lon,0,aNtf,e2Ntf);
  // Transformation NTF vers WGS84, translation géocentrique en mètres.
  const shifted={x:cart.x-168,y:cart.y-60,z:cart.z+320};
  const aWgs=6378137,f=1/298.257223563,e2Wgs=f*(2-f);
  const wgs=cartesianToGeodetic(shifted.x,shifted.y,shifted.z,aWgs,e2Wgs);
  return {lat:wgs.lat*180/Math.PI,lon:wgs.lon*180/Math.PI,coordinateSource:"Lambert II étendu converti"};
}
function plausibleFranceCoordinate(p){
  return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&
    p.lat>=41&&p.lat<=52&&p.lon>=-7&&p.lon<=11;
}
function parseGoogleMapsCoordinate(value){
  const raw=String(value??"").trim();
  if(!raw)return null;
  let decoded=raw;
  try{decoded=decodeURIComponent(raw)}catch{}
  const patterns=[
    /@(-?\d{1,2}(?:[.,]\d+)?),\s*(-?\d{1,3}(?:[.,]\d+)?)/,
    /(?:query|q|ll|center)=(-?\d{1,2}(?:[.,]\d+)?)[,%20+\s]+(-?\d{1,3}(?:[.,]\d+)?)/i,
    /maps\/place\/[^/]*\/@(-?\d{1,2}(?:[.,]\d+)?),\s*(-?\d{1,3}(?:[.,]\d+)?)/i,
    /(-?\d{1,2}\.\d{4,})\s*[,;]\s*(-?\d{1,3}\.\d{4,})/
  ];
  for(const pattern of patterns){
    const m=decoded.match(pattern);
    if(!m)continue;
    const a=Number(m[1].replace(",",".")),b=Number(m[2].replace(",","."));
    const candidates=[
      {lat:a,lon:b},
      {lat:b,lon:a}
    ].filter(plausibleFranceCoordinate);
    if(candidates.length){
      candidates.sort((u,v)=>distanceMeters(CONFIG.dataCenter,u)-distanceMeters(CONFIG.dataCenter,v));
      return {...candidates[0],coordinateSource:"coordonnées du lien Google Maps"};
    }
  }
  return null;
}
function coordinateFromProjectedXY(x,y,projectionLabel,sourceLabel){
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const projection=normalizeHeaderName(projectionLabel||"");

  // The export may carry decimal WGS84 coordinates even in X/Y-labelled fields.
  if(Math.abs(x)<=180&&Math.abs(y)<=90){
    const direct={lat:y,lon:x,coordinateSource:`${sourceLabel} · WGS84 X/Y`};
    if(plausibleFranceCoordinate(direct))return direct;
  }
  if(Math.abs(y)<=180&&Math.abs(x)<=90){
    const swapped={lat:x,lon:y,coordinateSource:`${sourceLabel} · WGS84 Y/X`};
    if(plausibleFranceCoordinate(swapped))return swapped;
  }

  if(
    projection.includes("2154") ||
    projection.includes("lambert_93") ||
    projection.includes("lambert93") ||
    projection==="l93"
  ){
    const p=lambert93ToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert‑93 converti`};
  }

  if(
    projection.includes("27572") ||
    projection.includes("lambert_ii_etendu") ||
    projection.includes("lambert_2_etendu") ||
    projection.includes("lambert2etendu") ||
    projection.includes("l2e")
  ){
    const p=lambert2ExtendedToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert II étendu converti`};
  }

  // REF06 data are frequently delivered in a national metric reference.
  // Use numeric ranges only after explicit projection labels have been tested.
  if(y>5_500_000&&y<7_500_000&&x>-200_000&&x<1_500_000){
    const p=lambert93ToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert‑93 détecté`};
  }
  if(y>1_500_000&&y<3_000_000&&x>-200_000&&x<1_500_000){
    const p=lambert2ExtendedToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert II étendu détecté`};
  }
  return null;
}
function bssCoordinateFromRow(row){
  // 1. Explicit geographic coordinates when an export includes them.
  let lat=numericLoose(firstRowValue(row,[
    "latitude","lat","latitude_wgs84","lat_wgs84","y_wgs84","coord_y_wgs84",
    "coordonnee_y_wgs84","latitude_decimale","y_wgs_84"
  ]));
  let lon=numericLoose(firstRowValue(row,[
    "longitude","lon","long","longitude_wgs84","lon_wgs84","x_wgs84","coord_x_wgs84",
    "coordonnee_x_wgs84","longitude_decimale","x_wgs_84"
  ]));
  if(Number.isFinite(lat)&&Number.isFinite(lon)){
    if(Math.abs(lat)<20&&Math.abs(lon)>20)[lat,lon]=[lon,lat];
    const p={lat,lon,coordinateSource:"WGS84 du CSV"};
    if(plausibleFranceCoordinate(p))return p;
  }

  // 2. Exact BRGM fields: coordinates as originally entered.
  const xSaisie=numericLoose(firstRowValue(row,["x_saisie"]));
  const ySaisie=numericLoose(firstRowValue(row,["y_saisie"]));
  const projectionSaisie=firstRowValue(row,[
    "lex_projection_saisie","projection_saisie","srs_saisie"
  ]);
  const saisie=coordinateFromProjectedXY(
    xSaisie,ySaisie,projectionSaisie,"coordonnées BRGM saisies"
  );
  if(saisie)return saisie;

  // 3. Exact BRGM fields: standardized/reference coordinates.
  const xRef06=numericLoose(firstRowValue(row,["x_ref06","x_ref_06"]));
  const yRef06=numericLoose(firstRowValue(row,["y_ref06","y_ref_06"]));
  const projectionRef06=firstRowValue(row,[
    "lex_projection_ref06","projection_ref06","projection_ref_06","srs_ref06"
  ]);
  const ref06=coordinateFromProjectedXY(
    xRef06,yRef06,projectionRef06,"coordonnées BRGM de référence"
  );
  if(ref06)return ref06;

  // 4. Explicit Lambert column variants used by other BRGM exports.
  const x93=numericLoose(firstRowValue(row,[
    "x_l93","xl93","x_lambert93","x_lambert_93","coord_x_l93","coordonnee_x_l93",
    "lambert93_x","x_2154","coord_x_lambert93"
  ]));
  const y93=numericLoose(firstRowValue(row,[
    "y_l93","yl93","y_lambert93","y_lambert_93","coord_y_l93","coordonnee_y_l93",
    "lambert93_y","y_2154","coord_y_lambert93"
  ]));
  const explicit93=coordinateFromProjectedXY(x93,y93,"EPSG:2154","colonnes Lambert‑93");
  if(explicit93)return explicit93;

  const x2e=numericLoose(firstRowValue(row,[
    "x_l2e","xl2e","x_lambert2e","x_lambert_2_etendu","coord_x_l2e",
    "coordonnee_x_l2e","lambert2etendu_x","x_27572"
  ]));
  const y2e=numericLoose(firstRowValue(row,[
    "y_l2e","yl2e","y_lambert2e","y_lambert_2_etendu","coord_y_l2e",
    "coordonnee_y_l2e","lambert2etendu_y","y_27572"
  ]));
  const explicit2e=coordinateFromProjectedXY(x2e,y2e,"EPSG:27572","colonnes Lambert II étendu");
  if(explicit2e)return explicit2e;

  // 5. Generic X/Y fields.
  const x=numericLoose(firstRowValue(row,[
    "x","coord_x","coordonnee_x","x_coord","abscisse","coordx"
  ]));
  const y=numericLoose(firstRowValue(row,[
    "y","coord_y","coordonnee_y","y_coord","ordonnee","coordy"
  ]));
  const projection=firstRowValue(row,[
    "projection","systeme_coordonnees","srs","epsg","referentiel","systeme"
  ]);
  const generic=coordinateFromProjectedXY(x,y,projection,"colonnes X/Y");
  if(generic)return generic;

  // 6. The export shown by the user includes a Google Maps URL.
  const google=parseGoogleMapsCoordinate(firstRowValue(row,[
    "google_maps","google_map","lien_google_maps","url_google_maps"
  ]));
  if(google)return google;

  return null;
}
function normalizeBssCsvRow(row){
  const coord=bssCoordinateFromRow(row);
  if(!coord)return null;
  const {lat,lon}=coord;
  const depth=numericLoose(firstRowValue(row,[
    "profondeur","profondeur_investigation","profondeur_finale","profondeur_totale",
    "prof_fin","prof_finale","prof_max","profondeur_maximale","profondeur_atteinte","prof_investigation","prof_accessible"
  ]));
  const altitude=numericLoose(firstRowValue(row,[
    "altitude","altitude_sol","cote_sol","z","z_sol","altitude_ngf","z_bdalti"
  ]));
  const id=String(firstRowValue(row,[
    "code_bss","bss_id","identifiant_bss","code_national","numero_bss","num_dossier",
    "indice_bss","nouveau_code_bss","ancien_code_bss","id_bss","indice"
  ])||"BSS importé");
  const nature=String(firstRowValue(row,[
    "nature","type_ouvrage","nature_ouvrage","type","objet","usage","designation","lex_nature",
    "lex_nature","nature_point"
  ])||"ouvrage de la Banque du sous-sol");
  const name=String(firstRowValue(row,[
    "nom","libelle","nom_ouvrage","denomination","designation","nom_abrege","lieu_dit","lex_nom_commune","commune","nom_local",
    "adresse_lieu_dit"
  ])||id);
  return {
    id,name,lat,lon,
    depth:Number.isFinite(depth)?depth:null,
    altitude:Number.isFinite(altitude)?altitude:null,
    nature,coordinateSource:coord.coordinateSource,
    properties:row,source:"BRGM · BSS, import CSV départemental",imported:true
  };
}

function mergeBssItems(...groups){
  const merged=new Map();
  for(const group of groups){
    for(const raw of group||[]){
      if(!raw||!Number.isFinite(+raw.lat)||!Number.isFinite(+raw.lon))continue;
      const item={...raw,lat:+raw.lat,lon:+raw.lon};
      const id=String(item.id||`${item.lat.toFixed(6)}:${item.lon.toFixed(6)}`);
      const previous=merged.get(id);
      // Later sources enrich the embedded record. A Hub'Eau record keeps the
      // official BSS identity while adding its piézometric role.
      merged.set(id,previous?{...previous,...item,id}:{...item,id});
    }
  }
  return [...merged.values()];
}
function saveBssLocal(){
  try{
    // Embedded BRGM rows are already in the HTML. Only save additions or richer
    // Hub'Eau/imported records to avoid duplicating 736 rows in localStorage.
    const additions=state.bss.filter(p=>!p.embedded||p.piezo);
    localStorage.setItem(territoryStorageKey(BSS_LOCAL_KEY),JSON.stringify({savedAt:Date.now(),items:additions}));
  }catch{}
}
function loadBssLocal(){
  let additions=[];
  try{
    const v=JSON.parse(localStorage.getItem(territoryStorageKey(BSS_LOCAL_KEY))||"null");
    if(v&&Array.isArray(v.items))additions=v.items;
  }catch{}
  const embedded=territoryUsesEmbeddedData("bss",CONFIG.territory)?BSS_EMBEDDED_LOCAL:[];
  state.bss=mergeBssItems(embedded,additions);
  updateBssUI();
}
function updateBssUI(message=""){
  const embedded=state.bss.filter(p=>p.embedded).length;
  const piezo=state.bss.filter(p=>p.piezo).length;
  const additions=state.bss.filter(p=>!p.embedded&&!p.piezo).length;
  if(els.bssCount)els.bssCount.textContent=state.bss.length;
  if(els.bssSummary){
    els.bssSummary.textContent=message||`${embedded} BSS embarqués · ${piezo} piézomètres${additions?` · ${additions} ajouts`:""}`;
  }
  setStatus("bss","ok",`${state.bss.length} points locaux`);
}

function parseGenericCsv(textData, onRow){
  const firstBreak=textData.search(/\r?\n/);
  const delimiter=detectDelimiter(textData.slice(0,firstBreak<0?textData.length:firstBreak));
  let row=[],cell="",quoted=false,headers=null;
  const finishCell=()=>{row.push(cell);cell=""};
  const finishRow=()=>{
    if(!headers)headers=row.map(v=>v.replace(/^\uFEFF/,"").trim());
    else if(row.some(v=>String(v).trim()!=="")){
      const obj={};headers.forEach((h,i)=>obj[h]=row[i]??"");onRow(obj);
    }
    row=[];
  };
  for(let i=0;i<textData.length;i++){
    const ch=textData[i];
    if(quoted){
      if(ch==='"'&&textData[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===delimiter)finishCell();
      else if(ch==="\n"){finishCell();finishRow()}
      else if(ch!=="\r")cell+=ch;
    }
  }
  if(cell.length||row.length){finishCell();finishRow()}
}
async function importBssFile(file){
  if(!file)return;
  els.bssHelp.textContent=`Lecture de ${file.name}…`;
  try{
    const txt=await file.text(),items=[],e=largestExtent();
    const stats={rows:0,geolocated:0,inside:0,lambert93:0,lambert2e:0,wgs84:0,googleMaps:0,saisie:0,ref06:0,nearest:null,headers:[]};
    parseGenericCsv(txt,row=>{
      stats.rows++;
      if(!stats.headers.length)stats.headers=Object.keys(row);
      const p=normalizeBssCsvRow(row);
      if(!p)return;
      stats.geolocated++;
      if(p.coordinateSource.includes("Google Maps"))stats.googleMaps++;
      if(p.coordinateSource.includes("saisies"))stats.saisie++;
      if(p.coordinateSource.includes("référence"))stats.ref06++;
      if(p.coordinateSource.includes("Lambert‑93"))stats.lambert93++;
      else if(p.coordinateSource.includes("Lambert II"))stats.lambert2e++;
      else if(!p.coordinateSource.includes("Google Maps"))stats.wgs84++;
      const d=distanceMeters(CONFIG.dataCenter,p);
      if(!stats.nearest||d<stats.nearest.distance)stats.nearest={distance:d,item:p};
      if(inExtent(p.lat,p.lon,e)){items.push(p);stats.inside++}
    });

    if(stats.rows&&stats.geolocated===0){
      throw new Error(
        `aucune coordonnée reconnue parmi ${stats.rows.toLocaleString("fr-FR")} lignes · `+
        `colonnes vues : ${stats.headers.join(", ")}`
      );
    }

    const existingPiezo=state.bss.filter(p=>p.piezo);
    state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL,items,existingPiezo);
    saveBssLocal();
    updateBssUI(`Import BSS · ${items.length} ouvrages locaux · ${stats.geolocated.toLocaleString("fr-FR")} géolocalisés`);
    els.layerBss.checked=true;state.layerBss=true;

    if(items.length){
      els.bssHelp.innerHTML=
        `<strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues · `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées · `+
        `<strong>${stats.saisie}</strong> coordonnées saisies · `+
        `<strong>${stats.ref06}</strong> coordonnées de référence · `+
        `<strong>${stats.googleMaps}</strong> liens Google Maps · `+
        `<strong>${items.length}</strong> dans l’emprise locale.`;
    }else{
      const nearest=stats.nearest;
      const nearestText=nearest
        ? ` Le point le plus proche est <strong>${esc(nearest.item.name)}</strong>, à environ `+
          `<strong>${(nearest.distance/1000).toFixed(1)} km</strong> `+
          `(${nearest.item.lat.toFixed(5)}, ${nearest.item.lon.toFixed(5)} · ${esc(nearest.item.coordinateSource)}).`
        : "";
      els.bssHelp.innerHTML=
        `Le fichier est compris : <strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues, `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées `+
        `(${stats.saisie} saisies BRGM, ${stats.ref06} références BRGM, ${stats.googleMaps} liens Google Maps), `+
        `mais aucune dans l’emprise actuelle.${nearestText}`;
    }
    render();
  }catch(err){
    els.bssHelp.textContent=`Import impossible : ${err?.message||"format non reconnu"}`;
  }finally{els.bssFile.value=""}
}

async function syncHubeauPiezo(){
  const requestStamp=territoryRequestStamp();
  const department=CONFIG.territory.administration;
  if(!department.departmentCode){els.bssHelp.textContent="Le département n’a pas pu être déterminé pour ce territoire ; Hub’Eau reste disponible après identification de la commune.";return}
  els.syncPiezo.disabled=true;els.bssHelp.textContent=`Recherche des stations piézométriques Hub’Eau en ${department.departmentName}…`;
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    const q=new URLSearchParams({code_departement:department.departmentCode,format:"json",size:"200"});
    const r=await fetch(`${HUBEAU_PIEZO_URL}?${q}`,{signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const j=await r.json(),e=largestExtent(),points=[];
    if(!territoryRequestIsCurrent(requestStamp))return null;
    for(const s of j.data||[]){
      const lon=Number(s.x??s.geometry?.coordinates?.[0]),lat=Number(s.y??s.geometry?.coordinates?.[1]);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||!inExtent(lat,lon,e))continue;
      const depth=Number(s.profondeur_investigation);
      points.push({
        id:String(s.bss_id||s.code_bss||"Piézomètre"),
        name:String(s.nom_station||s.libelle_pe||s.nom_commune||"Piézomètre"),
        lat,lon,depth:Number.isFinite(depth)?depth:null,
        altitude:Number.isFinite(Number(s.altitude_station))?Number(s.altitude_station):null,
        nature:String(s.nature_point_eau||"piézomètre"),
        source:"Hub’Eau Piézométrie / ADES",piezo:true,properties:s
      });
    }
    const existing=state.bss.filter(p=>!p.piezo);
    state.bss=mergeBssItems(existing,points);
    saveBssLocal();updateBssUI(`Hub’Eau · ${points.length} stations dans l’emprise locale`);
    els.layerBss.checked=true;state.layerBss=true;
    els.bssHelp.innerHTML=points.length
      ? `${points.length} station${points.length>1?"s":""} piézométrique${points.length>1?"s":""} chargée${points.length>1?"s":""}. Cette source ne remplace pas l’inventaire BSS complet.`
      : `Hub’Eau a répondu, mais aucune station piézométrique suivie ne se trouve dans l’emprise actuelle.`;
    render();
  }catch(err){
    if(!territoryRequestIsCurrent(requestStamp))return null;
    els.bssHelp.innerHTML=`Hub’Eau n’a pas répondu (${esc(err?.message||"erreur réseau")}). La carte reste utilisable ; l’import CSV BSS demeure disponible.`;
    updateBssUI();
  }finally{els.syncPiezo.disabled=false}
}
function normalizeBssGeoJSON(j){
  const out=[];
  for(const f of j?.features||[]){
    let c=f.geometry?.coordinates;if(!Array.isArray(c))continue;if(Array.isArray(c[0]))c=c[0];
    let lon=+c[0],lat=+c[1];if(Math.abs(lon)>20&&Math.abs(lat)<20)[lon,lat]=[lat,lon];
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    const a=f.properties||{};
    const first=(...keys)=>{for(const k of keys)if(a[k]!=null&&a[k]!=="")return a[k];return ""};
    const depth=Number(first("PROFONDEUR","PROF_TOTALE","PROF_FINAL","PROFONDEU","profondeur"));
    out.push({id:String(first("CODE_BSS","ID_BSS","BSS_ID","NUMERO","code_bss",f.id)||f.id||"BSS"),name:String(first("NOM","LIBELLE","LABEL","LIEU_DIT","nom")||"Ouvrage BSS"),lat,lon,depth:Number.isFinite(depth)?depth:null,nature:String(first("NATURE","TYPE_OUVRAGE","TYPE","nature")||"ouvrage de la Banque du sous-sol"),properties:a,source:"BRGM · Banque du sous-sol (WFS InfoTerre)"});
  }
  return out;
}
async function fetchBss(){
  loadBssLocal();
  if(!state.bss.length)setStatus("bss","pending","non chargé · optionnel");
  return state.bss;
}
