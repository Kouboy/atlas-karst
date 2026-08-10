const BIODIVERSITY_KEY="atlas-karst-biodiversity-v1";
const BIODIVERSITY_API="https://api.gbif.org/v1";
const BIODIVERSITY_RECORD_CAP_PER_GROUP=120;
const BIODIVERSITY_SPECIES_CAP_PER_CELL=32;
const BIODIVERSITY_NAME_CAP=16;
const BIODIVERSITY_GROUPS=Object.freeze([
  {id:"animals",label:"faune",taxonKey:1},
  {id:"plants",label:"flore",taxonKey:6},
  {id:"fungi",label:"champignons",taxonKey:5}
]);
const biodiversityRuntime={ready:true,syncs:0,occurrenceRequests:0,nameRequests:0,rawReceived:0,cells:0,species:0,totalAvailable:0,lastError:""};

function biodiversityGeometry(extent=largestExtent()){
  const west=Number(extent.west).toFixed(6),east=Number(extent.east).toFixed(6),south=Number(extent.south).toFixed(6),north=Number(extent.north).toFixed(6);
  return `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
}
function biodiversityGridPosition(lat,lon,extent=largestExtent()){
  const cols=Math.max(1,Math.round(CONFIG.dataWidthKm||16)),rows=Math.max(1,Math.round(CONFIG.dataHeightKm||16));
  const x=clamp(Math.floor((lon-extent.west)/Math.max(1e-9,extent.east-extent.west)*cols),0,cols-1);
  const y=clamp(Math.floor((lat-extent.south)/Math.max(1e-9,extent.north-extent.south)*rows),0,rows-1);
  return {x,y,cols,rows,lat:extent.south+(y+.5)/rows*(extent.north-extent.south),lon:extent.west+(x+.5)/cols*(extent.east-extent.west)};
}
function biodiversityRecord(raw,group,extent=largestExtent()){
  const lat=Number(raw?.decimalLatitude),lon=Number(raw?.decimalLongitude),speciesKey=String(raw?.speciesKey||"").trim(),scientificName=String(raw?.species||raw?.scientificName||"").trim();
  if(!speciesKey||!scientificName||!Number.isFinite(lat)||!Number.isFinite(lon)||!inExtent(lat,lon,extent))return null;
  const grid=biodiversityGridPosition(lat,lon,extent),uncertainty=Number(raw.coordinateUncertaintyInMeters),year=Number(raw.year),eventDate=String(raw.eventDate||raw.lastInterpreted||"");
  return {
    speciesKey,scientificName,vernacularName:String(raw.vernacularName||"").trim(),group:group.id,kingdom:String(raw.kingdom||group.label),family:String(raw.family||""),
    eventDate,year:Number.isFinite(year)?year:null,uncertaintyM:Math.max(1000,Number.isFinite(uncertainty)?uncertainty:1000),
    dataset:String(raw.datasetTitle||raw.datasetName||raw.publishingOrgKey||"Jeu diffusé par GBIF"),license:String(raw.license||"licence du jeu source"),
    occurrenceKey:String(raw.key||""),cellX:grid.x,cellY:grid.y,cellLat:grid.lat,cellLon:grid.lon,cellCols:grid.cols,cellRows:grid.rows
  };
}
function aggregateBiodiversityRecords(records,syncedAt){
  const cells=new Map();
  for(const record of records){
    const cellKey=`${record.cellX}:${record.cellY}`,cell=cells.get(cellKey)||{id:`BIO-${record.cellX}-${record.cellY}`,cellCode:`${record.cellX+1}-${record.cellY+1}`,lat:record.cellLat,lon:record.cellLon,species:new Map(),sampledRecords:0,datasets:new Set(),licenses:new Set(),syncedAt};
    cell.sampledRecords++;cell.datasets.add(record.dataset);cell.licenses.add(record.license);
    const species=cell.species.get(record.speciesKey)||{speciesKey:record.speciesKey,scientificName:record.scientificName,vernacularName:record.vernacularName,group:record.group,kingdom:record.kingdom,family:record.family,sampledRecords:0,latestDate:"",earliestDate:"",uncertaintyM:record.uncertaintyM,occurrenceKey:record.occurrenceKey};
    species.sampledRecords++;if(!species.vernacularName&&record.vernacularName)species.vernacularName=record.vernacularName;
    if(record.eventDate&&(!species.latestDate||record.eventDate>species.latestDate)){species.latestDate=record.eventDate;species.occurrenceKey=record.occurrenceKey}
    if(record.eventDate&&(!species.earliestDate||record.eventDate<species.earliestDate))species.earliestDate=record.eventDate;
    species.uncertaintyM=Math.max(species.uncertaintyM,record.uncertaintyM);cell.species.set(record.speciesKey,species);cells.set(cellKey,cell);
  }
  return [...cells.values()].map(cell=>{
    const species=[...cell.species.values()].sort((a,b)=>String(b.latestDate).localeCompare(String(a.latestDate))||b.sampledRecords-a.sampledRecords).slice(0,BIODIVERSITY_SPECIES_CAP_PER_CELL);
    const groupCounts=Object.fromEntries(BIODIVERSITY_GROUPS.map(group=>[group.id,species.filter(item=>item.group===group.id).length]));
    return {id:cell.id,cellCode:cell.cellCode,name:`Maille biodiversité ${cell.cellCode}`,lat:cell.lat,lon:cell.lon,species,speciesCount:species.length,sampledRecords:cell.sampledRecords,groupCounts,datasets:[...cell.datasets].slice(0,8),licenses:[...cell.licenses].slice(0,8),syncedAt,source:"GBIF · occurrences publiées",url:"https://www.gbif.org/occurrence/search"};
  }).sort((a,b)=>a.cellCode.localeCompare(b.cellCode,undefined,{numeric:true}));
}
function biodiversityVisibleSpecies(cell){return (cell?.species||[]).filter(species=>state.biodiversityEnabled?.[species.group]!==false)}
function biodiversityUniqueSpecies(items=state.biodiversity){return new Set((items||[]).flatMap(cell=>(cell.species||[]).map(species=>species.speciesKey))).size}
function biodiversityFeatureInfo(poi){
  const cell=poi.raw||{},species=biodiversityVisibleSpecies(cell),latest=species.map(item=>item.latestDate).filter(Boolean).sort().at(-1)||"",oldest=species.map(item=>item.earliestDate).filter(Boolean).sort()[0]||"";
  return poiFeatureInfo(poi,{kind:"maille de biodiversité documentée",biodiversity:true,cellCode:cell.cellCode,speciesCount:species.length,sampledRecords:species.reduce((sum,item)=>sum+Number(item.sampledRecords||0),0),species,latestDate:latest,earliestDate:oldest,datasets:cell.datasets||[],licenses:cell.licenses||[],url:cell.url,precisionM:1000});
}
async function biodiversityFrenchName(species){
  biodiversityRuntime.nameRequests++;
  try{
    const response=await fetchWithTimeout(`${BIODIVERSITY_API}/species/${encodeURIComponent(species.speciesKey)}/vernacularNames`,{mode:"cors",credentials:"omit",cache:"force-cache",headers:{Accept:"application/json"}},10000);
    if(!response.ok)return "";const payload=await response.json();
    const french=(payload.results||[]).find(item=>/^(fr|fra|fre|french|français)$/i.test(String(item.language||"")));
    return String(french?.vernacularName||"").trim();
  }catch{return ""}
}
async function enrichBiodiversityNames(cells){
  const byKey=new Map();
  for(const cell of cells)for(const species of cell.species)if(!species.vernacularName){const item=byKey.get(species.speciesKey)||{speciesKey:species.speciesKey,score:0,refs:[]};item.score+=species.sampledRecords;item.refs.push(species);byKey.set(species.speciesKey,item)}
  const candidates=[...byKey.values()].sort((a,b)=>b.score-a.score).slice(0,BIODIVERSITY_NAME_CAP);let cursor=0;
  const worker=async()=>{while(cursor<candidates.length){const item=candidates[cursor++],name=await biodiversityFrenchName(item);if(name)for(const ref of item.refs)ref.vernacularName=name}};
  await Promise.all(Array.from({length:Math.min(4,candidates.length)},worker));return cells;
}
function saveBiodiversity(){try{localStorage.setItem(territoryStorageKey(BIODIVERSITY_KEY),JSON.stringify({items:state.biodiversity,enabled:state.biodiversityEnabled,savedAt:new Date().toISOString()}))}catch{}}
function updateBiodiversityUI(message=""){
  const cells=state.biodiversity||[],species=biodiversityUniqueSpecies(cells),visible=cells.filter(cell=>biodiversityVisibleSpecies(cell).length).length;
  for(const group of BIODIVERSITY_GROUPS){const id=`biodiversity${group.id[0].toUpperCase()}${group.id.slice(1)}`;if(els[id])els[id].checked=state.biodiversityEnabled[group.id]!==false}
  if(els.biodiversityCount)els.biodiversityCount.textContent=String(species);
  if(els.biodiversitySummary)els.biodiversitySummary.textContent=message||(cells.length?`${species} espèces · ${visible} mailles visibles`:`Aucun extrait de biodiversité synchronisé.`);
  setStatus("biodiversity",cells.length?"ok":"pending",cells.length?`${species} espèces · ${cells.length} mailles`:"à synchroniser");
}
function loadBiodiversity(){
  try{const saved=JSON.parse(localStorage.getItem(territoryStorageKey(BIODIVERSITY_KEY))||"null");state.biodiversity=Array.isArray(saved?.items)?saved.items:[];state.biodiversityEnabled={...state.biodiversityEnabled,...(saved?.enabled||{})}}catch{state.biodiversity=[]}
  updateBiodiversityUI();
}
function clearBiodiversity(){state.biodiversity=[];try{localStorage.removeItem(territoryStorageKey(BIODIVERSITY_KEY))}catch{}biodiversityRuntime.cells=0;biodiversityRuntime.species=0;updateBiodiversityUI("Extrait local de biodiversité vidé.");markSpatialIndexesDirty();render("biodiversity-clear")}
async function fetchBiodiversityGroup(group,geometry,yearRange){
  const query=new URLSearchParams({geometry,hasCoordinate:"true",hasGeospatialIssue:"false",occurrenceStatus:"PRESENT",year:yearRange,taxonKey:String(group.taxonKey),limit:String(BIODIVERSITY_RECORD_CAP_PER_GROUP)});
  biodiversityRuntime.occurrenceRequests++;
  const response=await fetchWithTimeout(`${BIODIVERSITY_API}/occurrence/search?${query}`,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},22000);
  if(!response.ok)throw new Error(`${group.label} HTTP ${response.status}`);const payload=await response.json();return {group,payload};
}
async function syncBiodiversity(){
  const stamp=territoryRequestStamp(),syncedAt=new Date().toISOString(),extent=largestExtent(),geometry=biodiversityGeometry(extent),yearRange=`2000,${new Date().getFullYear()}`;
  biodiversityRuntime.syncs++;biodiversityRuntime.lastError="";if(els.syncBiodiversity)els.syncBiodiversity.disabled=true;setStatus("biodiversity","pending","échantillonnage GBIF…");if(els.biodiversityHelp)els.biodiversityHelp.textContent="Trois échantillons bornés sont recherchés, puis immédiatement agrégés en mailles d’environ 1 km…";
  try{
    const settled=await Promise.allSettled(BIODIVERSITY_GROUPS.map(group=>fetchBiodiversityGroup(group,geometry,yearRange)));if(!territoryRequestIsCurrent(stamp))return null;
    const successful=settled.filter(result=>result.status==="fulfilled").map(result=>result.value),errors=settled.filter(result=>result.status==="rejected");
    const records=successful.flatMap(({group,payload})=>(payload.results||[]).map(raw=>biodiversityRecord(raw,group,extent)).filter(Boolean));
    if(!records.length)throw new Error(errors[0]?.reason?.message||"aucune occurrence exploitable");
    biodiversityRuntime.rawReceived=records.length;biodiversityRuntime.totalAvailable=successful.reduce((sum,item)=>sum+Number(item.payload.count||0),0);
    const cells=await enrichBiodiversityNames(aggregateBiodiversityRecords(records,syncedAt));if(!territoryRequestIsCurrent(stamp))return null;
    state.biodiversity=cells;saveBiodiversity();biodiversityRuntime.cells=cells.length;biodiversityRuntime.species=biodiversityUniqueSpecies(cells);updateBiodiversityUI();
    if(els.biodiversityHelp)els.biodiversityHelp.textContent=`Échantillon : ${records.length} occurrences publiées réduites à ${cells.length} mailles et ${biodiversityRuntime.species} espèces. L’Atlas ne conserve pas les coordonnées brutes et ne présente ni un inventaire exhaustif, ni une position actuelle garantie.${errors.length?` ${errors.length} groupe n’a pas répondu.`:""}`;
    markSpatialIndexesDirty();scheduleDataRender("biodiversity-sync");return cells;
  }catch(error){
    if(!territoryRequestIsCurrent(stamp))return null;biodiversityRuntime.lastError=String(error?.message||error);setStatus("biodiversity",state.biodiversity.length?"ok":"bad",state.biodiversity.length?`${biodiversityUniqueSpecies()} espèces · anciennes`:"indisponible");if(els.biodiversityHelp)els.biodiversityHelp.textContent=`GBIF n’a pas répondu (${biodiversityRuntime.lastError}). L’extrait déjà mémorisé reste disponible.`;return null;
  }finally{if(els.syncBiodiversity)els.syncBiodiversity.disabled=false}
}
