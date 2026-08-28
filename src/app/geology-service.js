const GEOLOGY_KEY="atlas-karst-geology-v1";
const GEOLOGY_WMS="https://geoservices.brgm.fr/geologie";
const GEOLOGY_LAYER="LITHO_1M_SIMPLIFIEE";
const geologyRuntime={ready:true,syncs:0,requests:0,received:0,lastError:""};

function geologySamples(extent=largestExtent()){
  const midLat=(extent.south+extent.north)/2,midLon=(extent.west+extent.east)/2;return [[midLat,midLon],[extent.south+(extent.north-extent.south)*.27,extent.west+(extent.east-extent.west)*.27],[extent.south+(extent.north-extent.south)*.73,extent.west+(extent.east-extent.west)*.73],[extent.south+(extent.north-extent.south)*.27,extent.west+(extent.east-extent.west)*.73],[extent.south+(extent.north-extent.south)*.73,extent.west+(extent.east-extent.west)*.27]];
}
function geologyParse(text,lat,lon,syncedAt){
  const value=name=>String(text.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`))?.[1]||"").trim(),description=value("DESCR"),type=value("TYPE"),code=value("CODE_GEOL");if(!description)return null;
  return {id:`GEO-${code||description}-${lat.toFixed(5)}-${lon.toFixed(5)}`,name:description,kind:type||"formation géologique",code,lat,lon,syncedAt,source:"Carte géologique simplifiée au millionième · BRGM",url:"https://geoservices.brgm.fr/geologie"};
}
function saveGeology(){try{localStorage.setItem(territoryStorageKey(GEOLOGY_KEY),JSON.stringify(state.geology||[]))}catch{}}
function loadGeology(){try{const saved=JSON.parse(localStorage.getItem(territoryStorageKey(GEOLOGY_KEY))||"[]");state.geology=Array.isArray(saved)?saved.filter(item=>Number.isFinite(+item.lat)&&Number.isFinite(+item.lon)):[]}catch{state.geology=[]}updateGeologyUI()}
function updateGeologyUI(message=""){
  const items=state.geology||[],formations=[...new Set(items.map(item=>item.name))];if(els.geologyCount)els.geologyCount.textContent=String(formations.length);if(els.geologySummary)els.geologySummary.textContent=message||(formations.length?formations.join(" · "):"Aucun extrait géologique synchronisé.");setStatus("geology",items.length?"ok":"pending",items.length?`${formations.length} formation${formations.length>1?"s":""} lue${formations.length>1?"s":""}`:"à synchroniser");
}
function clearGeology(){state.geology=[];try{localStorage.removeItem(territoryStorageKey(GEOLOGY_KEY))}catch{}updateGeologyUI("Extrait géologique vidé.");markSpatialIndexesDirty();render("geology-clear")}
async function geologyRequest(lat,lon){
  const span=.012,query=new URLSearchParams({SERVICE:"WMS",VERSION:"1.1.1",REQUEST:"GetFeatureInfo",LAYERS:GEOLOGY_LAYER,QUERY_LAYERS:GEOLOGY_LAYER,INFO_FORMAT:"text/plain",SRS:"EPSG:4326",BBOX:`${lon-span},${lat-span},${lon+span},${lat+span}`,WIDTH:"101",HEIGHT:"101",X:"50",Y:"50"});geologyRuntime.requests++;const response=await fetchWithTimeout(`${GEOLOGY_WMS}?${query}`,{mode:"cors",credentials:"omit",cache:"no-store"},18000);if(!response.ok)throw new Error(`BRGM HTTP ${response.status}`);return response.text();
}
async function syncGeology(){
  const stamp=territoryRequestStamp(),syncedAt=new Date().toISOString();geologyRuntime.syncs++;geologyRuntime.lastError="";if(els.syncGeology)els.syncGeology.disabled=true;setStatus("geology","pending","lecture BRGM…");
  try{const settled=await Promise.allSettled(geologySamples().map(async([lat,lon])=>geologyParse(await geologyRequest(lat,lon),lat,lon,syncedAt)));if(!territoryRequestIsCurrent(stamp))return null;const items=[...new Map(settled.filter(result=>result.status==="fulfilled").map(result=>result.value).filter(Boolean).map(item=>[item.name,item])).values()];if(!items.length)throw new Error("aucune formation lisible");state.geology=items;geologyRuntime.received=items.length;saveGeology();updateGeologyUI();if(els.geologyHelp)els.geologyHelp.textContent=`${items.length} formation${items.length>1?"s":""} lue${items.length>1?"s":""} à partir de cinq points d’échantillonnage BRGM. Cette carte au 1:1 000 000 donne un contexte régional, pas une coupe locale.`;markSpatialIndexesDirty();scheduleDataRender("geology-sync");return items;
  }catch(error){if(!territoryRequestIsCurrent(stamp))return null;geologyRuntime.lastError=String(error?.message||error);setStatus("geology",state.geology.length?"ok":"bad",state.geology.length?`${state.geology.length} formation${state.geology.length>1?"s":""} · anciennes`:"indisponible");if(els.geologyHelp)els.geologyHelp.textContent=`Le service BRGM n’a pas répondu (${geologyRuntime.lastError}). L’extrait déjà mémorisé reste disponible.`;return null}finally{if(els.syncGeology)els.syncGeology.disabled=false}
}
