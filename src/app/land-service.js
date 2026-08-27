const LAND_COVER_KEY="atlas-karst-land-cover-v1";
const LAND_COVER_WFS="https://data.geopf.fr/wfs/ows";
const LAND_COVER_TYPE="BDCARTO_V5:occupation_du_sol";
const LAND_COVER_CAP=70;
const landCoverRuntime={ready:true,syncs:0,received:0,lastError:""};

function landCoverAnchor(geometry,extent=largestExtent()){
  const pairs=[];const walk=value=>{if(!Array.isArray(value))return;if(value.length>=2&&Number.isFinite(+value[0])&&Number.isFinite(+value[1])){pairs.push([+value[0],+value[1]]);return}for(const child of value)walk(child)};walk(geometry?.coordinates);
  const usable=pairs.filter(([lon,lat])=>inExtent(lat,lon,extent));const points=usable.length?usable:pairs;if(!points.length)return {lat:(extent.south+extent.north)/2,lon:(extent.west+extent.east)/2};
  return {lat:clamp(points.reduce((sum,p)=>sum+p[1],0)/points.length,extent.south,extent.north),lon:clamp(points.reduce((sum,p)=>sum+p[0],0)/points.length,extent.west,extent.east)};
}
function normalizeLandCover(feature,extent=largestExtent(),syncedAt=new Date().toISOString()){
  const p=feature?.properties||{},nature=String(p.nature||p.NATURE||"Occupation du sol").trim(),id=String(feature?.id||p.cleabs||"").trim();if(!id||!feature?.geometry)return null;
  const anchor=landCoverAnchor(feature.geometry,extent);return {id:`OCS-${id}`,name:nature,kind:"occupation du sol",lat:anchor.lat,lon:anchor.lon,geometry:feature.geometry,syncedAt,source:"BD CARTO® · IGN",url:"https://geoservices.ign.fr/bdcarto"};
}
function saveLandCover(){try{localStorage.setItem(territoryStorageKey(LAND_COVER_KEY),JSON.stringify(state.landCover||[]))}catch{}}
function loadLandCover(){try{const saved=JSON.parse(localStorage.getItem(territoryStorageKey(LAND_COVER_KEY))||"[]");state.landCover=Array.isArray(saved)?saved.filter(item=>Number.isFinite(+item.lat)&&Number.isFinite(+item.lon)):[]}catch{state.landCover=[]}updateLandCoverUI()}
function updateLandCoverUI(message=""){
  const items=state.landCover||[],kinds=new Set(items.map(item=>item.name));if(els.landCoverCount)els.landCoverCount.textContent=String(items.length);if(els.landCoverSummary)els.landCoverSummary.textContent=message||(items.length?`${items.length} zones · ${kinds.size} occupations du sol distinguées`:"Aucun extrait d’occupation du sol synchronisé.");setStatus("landcover",items.length?"ok":"pending",items.length?`${items.length} zones documentées`:"à synchroniser");
}
function clearLandCover(){state.landCover=[];try{localStorage.removeItem(territoryStorageKey(LAND_COVER_KEY))}catch{}updateLandCoverUI("Extrait local d’occupation du sol vidé.");markSpatialIndexesDirty();render("land-cover-clear")}
async function syncLandCover(){
  const stamp=territoryRequestStamp(),extent=largestExtent(),syncedAt=new Date().toISOString(),bbox=[extent.west,extent.south,extent.east,extent.north].map(v=>Number(v).toFixed(6)).join(",");landCoverRuntime.syncs++;landCoverRuntime.lastError="";if(els.syncLandCover)els.syncLandCover.disabled=true;setStatus("landcover","pending","interrogation IGN…");
  try{const query=new URLSearchParams({SERVICE:"WFS",VERSION:"2.0.0",REQUEST:"GetFeature",TYPENAMES:LAND_COVER_TYPE,OUTPUTFORMAT:"application/json",SRSNAME:"EPSG:4326",COUNT:String(LAND_COVER_CAP),BBOX:`${bbox},EPSG:4326`}),response=await fetchWithTimeout(`${LAND_COVER_WFS}?${query}`,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},22000);if(!response.ok)throw new Error(`IGN HTTP ${response.status}`);const payload=await response.json();if(!territoryRequestIsCurrent(stamp))return null;const items=(payload.features||[]).map(feature=>normalizeLandCover(feature,extent,syncedAt)).filter(Boolean);state.landCover=items;landCoverRuntime.received=items.length;saveLandCover();updateLandCoverUI();if(els.landCoverHelp)els.landCoverHelp.textContent=items.length?`${items.length} zones IGN retenues dans l’emprise. Elles décrivent une occupation cartographiée, pas une observation instantanée ni un droit d’usage.`:"Aucune zone IGN retournée pour cette emprise.";markSpatialIndexesDirty();scheduleDataRender("land-cover-sync");return items;
  }catch(error){if(!territoryRequestIsCurrent(stamp))return null;landCoverRuntime.lastError=String(error?.message||error);setStatus("landcover",state.landCover.length?"ok":"bad",state.landCover.length?`${state.landCover.length} zones · anciennes`:"indisponible");if(els.landCoverHelp)els.landCoverHelp.textContent=`Le WFS IGN n’a pas répondu (${landCoverRuntime.lastError}). L’extrait déjà mémorisé reste disponible.`;return null}finally{if(els.syncLandCover)els.syncLandCover.disabled=false}
}
