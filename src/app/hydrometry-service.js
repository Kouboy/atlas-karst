const HYDROMETRY_KEY="atlas-karst-hydrometry-v1";
const HYDROMETRY_API="https://hubeau.eaufrance.fr/api/v2/hydrometrie";
const HYDROMETRY_STATION_CAP=48;
const HYDROMETRY_OBSERVATION_CONCURRENCY=4;
const hydrometryRuntime={ready:true,syncs:0,stationRequests:0,observationRequests:0,loaded:0,measured:0,lastApiVersion:"—",lastError:""};

function normalizeHydrometryStation(raw){
  const lat=Number(raw?.latitude_station),lon=Number(raw?.longitude_station),code=String(raw?.code_station||"").trim();
  if(!code||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  return {
    id:`HYDRO-${code}`,code,name:String(raw.libelle_station||raw.libelle_site||`Station ${code}`),
    river:String(raw.libelle_site||""),commune:String(raw.libelle_commune||""),lat,lon,
    stationType:String(raw.type_station||""),heightM:null,flowM3s:null,observedAt:"",syncedAt:"",
    source:"Hub’Eau · Hydrométrie / PHyC",license:"Licence Ouverte 2.0",
    url:`${HYDROMETRY_API}/observations_tr?code_entite=${encodeURIComponent(code)}&sort=desc&size=20`
  };
}
function mergeHydrometryObservations(station,rows,syncedAt){
  const latest={};
  for(const row of rows||[]){
    const kind=String(row?.grandeur_hydro||"");
    if((kind!=="H"&&kind!=="Q")||latest[kind])continue;
    latest[kind]=row;
  }
  const height=latest.H?Number(latest.H.resultat_obs):NaN;
  const flow=latest.Q?Number(latest.Q.resultat_obs):NaN;
  return {...station,heightM:Number.isFinite(height)?height/1000:null,flowM3s:Number.isFinite(flow)?flow/1000:null,observedAt:String(latest.H?.date_obs||latest.Q?.date_obs||""),syncedAt};
}
function hydrometryExtentBbox(extent=largestExtent()){
  return [extent.west,extent.south,extent.east,extent.north].map(value=>Number(value).toFixed(6)).join(",");
}
async function fetchHydrometryObservation(station,syncedAt){
  const query=new URLSearchParams({code_entite:station.code,size:"6",sort:"desc",fields:"code_station,grandeur_hydro,date_obs,resultat_obs,libelle_qualification_obs"});
  hydrometryRuntime.observationRequests++;
  try{
    const response=await fetchWithTimeout(`${HYDROMETRY_API}/observations_tr?${query}`,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},18000);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    return mergeHydrometryObservations(station,payload.data,syncedAt);
  }catch{return {...station,syncedAt}}
}
async function mapHydrometryLimited(items,mapper,limit=HYDROMETRY_OBSERVATION_CONCURRENCY){
  const results=new Array(items.length);let cursor=0;
  const worker=async()=>{while(cursor<items.length){const index=cursor++;results[index]=await mapper(items[index],index)}};
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return results;
}
function saveHydrometry(){
  try{localStorage.setItem(territoryStorageKey(HYDROMETRY_KEY),JSON.stringify({items:state.hydrometry,savedAt:new Date().toISOString()}))}catch{}
}
function updateHydrometryUI(message=""){
  const items=Array.isArray(state.hydrometry)?state.hydrometry:[];
  const measured=items.filter(item=>Number.isFinite(item.heightM)||Number.isFinite(item.flowM3s)).length;
  if(els.hydrometryCount)els.hydrometryCount.textContent=String(items.length);
  if(els.hydrometrySummary)els.hydrometrySummary.textContent=message||(items.length?`${items.length} stations · ${measured} avec mesure récente`:`Aucune station synchronisée pour ce territoire.`);
  setStatus("hydrometry",items.length?"ok":"pending",items.length?`${items.length} stations · ${measured} mesurées`:"à synchroniser");
}
function loadHydrometry(){
  try{
    const saved=JSON.parse(localStorage.getItem(territoryStorageKey(HYDROMETRY_KEY))||"null");
    state.hydrometry=Array.isArray(saved?.items)?saved.items.map(item=>({...item,lat:Number(item.lat),lon:Number(item.lon)})).filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lon)):[];
  }catch{state.hydrometry=[]}
  updateHydrometryUI();
}
function clearHydrometry(){
  state.hydrometry=[];
  try{localStorage.removeItem(territoryStorageKey(HYDROMETRY_KEY))}catch{}
  hydrometryRuntime.loaded=0;hydrometryRuntime.measured=0;
  updateHydrometryUI("Couche hydrométrique locale vidée.");markSpatialIndexesDirty();render("hydrometry-clear");
}
async function syncHydrometry(){
  const country=String(CONFIG.territory?.administration?.countryCode||"").toUpperCase();
  if(country&&country!=="FR"){
    setStatus("hydrometry","bad","hors couverture française");
    if(els.hydrometryHelp)els.hydrometryHelp.textContent="Hub’Eau Hydrométrie couvre les territoires français.";
    return null;
  }
  const stamp=territoryRequestStamp(),syncedAt=new Date().toISOString(),bbox=hydrometryExtentBbox();
  hydrometryRuntime.syncs++;hydrometryRuntime.stationRequests++;hydrometryRuntime.lastError="";
  if(els.syncHydrometry)els.syncHydrometry.disabled=true;
  setStatus("hydrometry","pending","recherche des stations…");
  if(els.hydrometryHelp)els.hydrometryHelp.textContent="Recherche des stations Hub’Eau dans l’emprise du carnet…";
  try{
    const query=new URLSearchParams({bbox,size:String(HYDROMETRY_STATION_CAP),format:"json"});
    const response=await fetchWithTimeout(`${HYDROMETRY_API}/referentiel/stations?${query}`,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},22000);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    if(!territoryRequestIsCurrent(stamp))return null;
    const stations=(payload.data||[]).map(normalizeHydrometryStation).filter(Boolean).filter(item=>inExtent(item.lat,item.lon,largestExtent())).slice(0,HYDROMETRY_STATION_CAP);
    setStatus("hydrometry","pending",`${stations.length} stations · mesures…`);
    const measured=await mapHydrometryLimited(stations,station=>fetchHydrometryObservation(station,syncedAt));
    if(!territoryRequestIsCurrent(stamp))return null;
    state.hydrometry=measured;saveHydrometry();
    hydrometryRuntime.loaded=measured.length;
    hydrometryRuntime.measured=measured.filter(item=>Number.isFinite(item.heightM)||Number.isFinite(item.flowM3s)).length;
    hydrometryRuntime.lastApiVersion=String(payload.api_version||"—");
    updateHydrometryUI();
    if(els.hydrometryHelp)els.hydrometryHelp.textContent=measured.length?`${measured.length} stations mémorisées dans ce carnet, dont ${hydrometryRuntime.measured} avec une hauteur ou un débit récent. Les mesures restent indicatives et ne constituent pas une alerte de crue.`:"Aucune station hydrométrique dans cette emprise.";
    markSpatialIndexesDirty();scheduleDataRender("hydrometry-sync");return measured;
  }catch(error){
    if(!territoryRequestIsCurrent(stamp))return null;
    hydrometryRuntime.lastError=String(error?.message||error);
    setStatus("hydrometry",state.hydrometry.length?"ok":"bad",state.hydrometry.length?`${state.hydrometry.length} stations · anciennes`:"indisponible");
    if(els.hydrometryHelp)els.hydrometryHelp.textContent=`Hub’Eau Hydrométrie n’a pas répondu (${hydrometryRuntime.lastError}). Les données déjà mémorisées restent disponibles.`;
    return null;
  }finally{if(els.syncHydrometry)els.syncHydrometry.disabled=false}
}
