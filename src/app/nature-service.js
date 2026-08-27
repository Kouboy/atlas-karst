const NATURE_API="https://apicarto.ign.fr/api/nature";
const NATURE_AREA_CAP=80;
const NATURE_ENDPOINTS=Object.freeze([
  {id:"natura-habitat",label:"Natura 2000 · habitats",kind:"Natura 2000 · habitats"},
  {id:"natura-oiseaux",label:"Natura 2000 · oiseaux",kind:"Natura 2000 · oiseaux"},
  {id:"rnn",label:"Réserve naturelle",kind:"Réserve naturelle"},
  {id:"znieff1",label:"ZNIEFF de type I",kind:"ZNIEFF de type I"},
  {id:"znieff2",label:"ZNIEFF de type II",kind:"ZNIEFF de type II"},
  {id:"pn",label:"Parc national",kind:"Parc national"},
  {id:"pnr",label:"Parc naturel régional",kind:"Parc naturel régional"}
]);
const natureAreasRuntime={ready:true,syncs:0,requests:0,received:0,lastError:""};

function natureGeometry(extent=largestExtent()){
  const coordinates=[[extent.west,extent.south],[extent.east,extent.south],[extent.east,extent.north],[extent.west,extent.north],[extent.west,extent.south]].map(pair=>pair.map(value=>Number(value.toFixed(6))));
  return JSON.stringify({type:"Polygon",coordinates:[coordinates]});
}
function natureCoordinatePairs(geometry){
  const out=[];const walk=value=>{if(!Array.isArray(value))return;if(value.length>=2&&Number.isFinite(+value[0])&&Number.isFinite(+value[1])){out.push([+value[0],+value[1]]);return}for(const item of value)walk(item)};walk(geometry?.coordinates);return out;
}
function natureAreaAnchor(geometry,extent=largestExtent()){
  const points=natureCoordinatePairs(geometry);if(!points.length)return {lat:(extent.south+extent.north)/2,lon:(extent.west+extent.east)/2};
  const inside=points.filter(([lon,lat])=>inExtent(lat,lon,extent)),usable=inside.length?inside:points;
  const lon=usable.reduce((sum,point)=>sum+point[0],0)/usable.length,lat=usable.reduce((sum,point)=>sum+point[1],0)/usable.length;
  return {lat:clamp(lat,extent.south,extent.north),lon:clamp(lon,extent.west,extent.east)};
}
function normalizeNatureArea(feature,endpoint,extent=largestExtent(),syncedAt=new Date().toISOString()){
  const properties=feature?.properties||{},id=String(feature?.id||properties.id_mnhn||properties.sitecode||properties.id_local||"").trim();if(!id||!feature?.geometry)return null;
  const anchor=natureAreaAnchor(feature.geometry,extent),name=String(properties.sitename||properties.nom||properties.nom_site||endpoint.label).trim();
  return {id:`NAT-${endpoint.id}-${id}`,sourceId:endpoint.id,kind:endpoint.kind,name,lat:anchor.lat,lon:anchor.lon,reference:id,url:String(properties.url||properties.url_fiche||""),areaHa:Number(properties.surf_off||properties.area_sig||0)||null,geometry:feature.geometry,syncedAt,source:"API Carto Nature · IGN / INPN"};
}
function saveNatureAreas(){try{localStorage.setItem(territoryStorageKey(NATURE_AREAS_KEY),JSON.stringify(state.natureAreas||[]))}catch{}}
function updateNatureAreasUI(message=""){
  const items=state.natureAreas||[],byKind=Object.values(items.reduce((acc,item)=>{acc[item.kind]=(acc[item.kind]||0)+1;return acc},{}));
  if(els.natureAreasCount)els.natureAreasCount.textContent=String(items.length);
  if(els.natureAreasSummary)els.natureAreasSummary.textContent=message||(items.length?`${items.length} zone${items.length>1?"s":""} · ${byKind.length} statut${byKind.length>1?"s":""} de protection ou d’inventaire`:"Aucun espace naturel remarquable synchronisé.");
  setStatus("nature",items.length?"ok":"pending",items.length?`${items.length} zone${items.length>1?"s":""} documentée${items.length>1?"s":""}`:"à synchroniser");
}
function loadNatureAreas(){try{const saved=JSON.parse(localStorage.getItem(territoryStorageKey(NATURE_AREAS_KEY))||"[]");state.natureAreas=Array.isArray(saved)?saved.filter(item=>Number.isFinite(+item.lat)&&Number.isFinite(+item.lon)):[]}catch{state.natureAreas=[]}updateNatureAreasUI()}
function clearNatureAreas(){state.natureAreas=[];try{localStorage.removeItem(territoryStorageKey(NATURE_AREAS_KEY))}catch{}updateNatureAreasUI("Extrait local des espaces naturels vidé.");markSpatialIndexesDirty();render("nature-areas-clear")}
async function fetchNatureEndpoint(endpoint,geometry){natureAreasRuntime.requests++;const query=new URLSearchParams({geom:geometry,_limit:String(NATURE_AREA_CAP)}),response=await fetchWithTimeout(`${NATURE_API}/${endpoint.id}?${query}`,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},22000);if(!response.ok)throw new Error(`${endpoint.label} HTTP ${response.status}`);return response.json()}
async function syncNatureAreas(){
  const stamp=territoryRequestStamp(),extent=largestExtent(),geometry=natureGeometry(extent),syncedAt=new Date().toISOString();natureAreasRuntime.syncs++;natureAreasRuntime.lastError="";if(els.syncNatureAreas)els.syncNatureAreas.disabled=true;setStatus("nature","pending","interrogation API Carto Nature…");if(els.natureAreasHelp)els.natureAreasHelp.textContent="Recherche des protections et inventaires naturels qui recoupent exactement le Territoire…";
  try{
    const settled=await Promise.allSettled(NATURE_ENDPOINTS.map(endpoint=>fetchNatureEndpoint(endpoint,geometry).then(payload=>({endpoint,payload}))));if(!territoryRequestIsCurrent(stamp))return null;
    const successful=settled.filter(result=>result.status==="fulfilled").map(result=>result.value),errors=settled.filter(result=>result.status==="rejected"),deduped=new Map();
    for(const {endpoint,payload} of successful)for(const feature of payload?.features||[]){const item=normalizeNatureArea(feature,endpoint,extent,syncedAt);if(item)deduped.set(item.id,item)}
    const items=[...deduped.values()].sort((a,b)=>a.kind.localeCompare(b.kind,"fr")||a.name.localeCompare(b.name,"fr"));natureAreasRuntime.received=items.length;if(!successful.length)throw new Error(errors[0]?.reason?.message||"aucun service n’a répondu");
    state.natureAreas=items;saveNatureAreas();updateNatureAreasUI();if(els.natureAreasHelp)els.natureAreasHelp.textContent=items.length?`${items.length} zone${items.length>1?"s":""} retenue${items.length>1?"s":""} dans l’emprise. Natura 2000, ZNIEFF, réserves et parcs sont des statuts ou inventaires : ils ne prouvent pas la présence d’une espèce précise à cet endroit.${errors.length?` ${errors.length} catégorie${errors.length>1?"s n’ont":" n’a"} pas répondu.`:""}`:"Aucune zone de protection ou d’inventaire retournée pour cette emprise. Cela ne signifie pas l’absence d’intérêt écologique local.";markSpatialIndexesDirty();scheduleDataRender("nature-areas-sync");return items;
  }catch(error){if(!territoryRequestIsCurrent(stamp))return null;natureAreasRuntime.lastError=String(error?.message||error);setStatus("nature",state.natureAreas.length?"ok":"bad",state.natureAreas.length?`${state.natureAreas.length} zones · anciennes`:"indisponible");if(els.natureAreasHelp)els.natureAreasHelp.textContent=`API Carto Nature n’a pas répondu (${natureAreasRuntime.lastError}). L’extrait déjà mémorisé reste disponible.`;return null}finally{if(els.syncNatureAreas)els.syncNatureAreas.disabled=false}
}
