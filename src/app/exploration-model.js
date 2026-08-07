function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function escAttr(s){return esc(s).replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function safeExternalUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:""}catch{return ""}}
function text(v,fallback=""){return typeof v==="string"?v:(v==null?fallback:String(v))}
function cavityType(c){return text(c?.type||c?.TYPE_CAV||c?.nature||c?.detail,"indéterminé").trim().toLowerCase()||"indéterminé"}
function cavityName(c){return text(c?.name||c?.nomCavite||c?.id,"Cavité sans nom")}
function distanceMeters(a,b){
  const lat1=rad(a.lat),lat2=rad(b.lat),dlat=lat2-lat1,dlon=rad(b.lon-a.lon);
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

// Compatibilité avec les anciens instantanés : l’ancien mode Explorateur a été
// retiré de l’interface. Tous les repères documentés sont désormais visibles.
function explorerMarkerState(){return "known"}
function explorerFeatureId(feature,prefix="feature"){
  return `${prefix}:${feature?.id||feature?.name||feature?.kind||"unknown"}`;
}
function explorerMarkDiscovered(){return false}
function renderExplorerJournal(){}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rad(v){return v*Math.PI/180}
function kmPerLon(lat){return 111.32*Math.cos(rad(lat))}
function currentZoom(){
  const base=CONFIG.zooms[state.zoomIndex];
  // L'emprise adopte désormais le ratio visuel réel de la grille sur desktop
  // comme sur mobile. L'aire nominale du niveau est préservée : on gagne du
  // panorama, sans étirer la géographie ni modifier la quantité de territoire.
  try{
    const metrics=measureCanvasLayout();
    const visualRatio=(CONFIG.gridW*Math.max(1,metrics.cellW))/(CONFIG.gridH*Math.max(1,metrics.cellH));
    const area=Math.max(1e-6,base.widthKm*base.heightKm);
    const widthKm=Math.sqrt(area*Math.max(.24,visualRatio));
    const heightKm=area/Math.max(.001,widthKm);
    return {...base,widthKm,heightKm};
  }catch{return base}
}
function currentDepth(){return CONFIG.depths[state.depthIndex]}
function depthSliceMeta(depth=currentDepth()){
  if(depth===0)return {label:"surface",range:"surface",approx:false};
  const ranges={"-3":"environ 0 à 5 m","-8":"environ 5 à 11 m","-14":"environ 11 à 18 m","-22":"environ 18 à 29 m","-35":"environ 29 à 45 m"};
  return {label:`≈ ${depth} m`,range:ranges[String(depth)]||"profondeur interprétative",approx:true};
}
function depthSliceLabel(depth=currentDepth()){return depthSliceMeta(depth).label}
function documentedCavityDepth(c){
  const values=[c?.depth,c?.profondeur,c?.profondeur_m,c?.depth_m,c?.prof_m,c?.z];
  for(const raw of values){
    const n=Number(String(raw??"").replace(",","."));
    if(Number.isFinite(n)&&Math.abs(n)>.25)return -Math.abs(n);
  }
  return null;
}

// Le zoom ne grossit pas seulement la carte : il ouvre progressivement ses couches de lecture.
// Les quotas évitent qu'une vue très dense se transforme en brouillard typographique.
const SEMANTIC_ZOOM_LEVELS = [
  {
    summary:"grandes structures, relief, eau et axes majeurs · repères sous forme d’icônes",
    placeTypes:new Set(["city","town"]), placeLabel:18, placeMax:4,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:false, minorRoads:false, paths:false, minorWater:false,
    osmBuildings:false, cadastreBuildings:false, parcels:false, observationGeometry:false
  },
  {
    summary:"villages, routes locales et emprises paysagères · points d’intérêt encore sans nom",
    placeTypes:new Set(["city","town","village"]), placeLabel:20, placeMax:8,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:false, minorWater:true,
    osmBuildings:false, cadastreBuildings:false, parcels:false, observationGeometry:false
  },
  {
    summary:"hameaux, chemins, bâtiments OSM et repères documentaires · noms des POI encore masqués",
    placeTypes:new Set(["city","town","village","hamlet","suburb","neighbourhood"]), placeLabel:22, placeMax:12,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:false, parcels:false, observationGeometry:true
  },
  {
    summary:"noms courts des cavités, friches et repères · bâti cadastral et géométries locales",
    placeTypes:null, placeLabel:24, placeMax:14,
    poiLabel:18, poiMax:12, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:false, observationGeometry:true
  },
  {
    summary:"noms étendus, limites de parcelles activables et premiers identifiants BSS",
    placeTypes:null, placeLabel:28, placeMax:16,
    poiLabel:24, poiMax:20, bssLabel:15, bssMax:8,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:true, observationGeometry:true
  },
  {
    summary:"lecture complète : noms longs, identifiants BSS et détails de proximité",
    placeTypes:null, placeLabel:34, placeMax:20,
    poiLabel:32, poiMax:30, bssLabel:26, bssMax:16,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:true, observationGeometry:true
  }
];
function semanticZoom(){return SEMANTIC_ZOOM_LEVELS[state.zoomIndex]||SEMANTIC_ZOOM_LEVELS.at(-1)}
function extentFor(center=state.center,z=currentZoom()){
  const dLat=(z.heightKm/111.32)/2;
  const dLon=(z.widthKm/kmPerLon(center.lat))/2;
  return {west:center.lon-dLon,east:center.lon+dLon,south:center.lat-dLat,north:center.lat+dLat};
}
function largestExtent(){
  return extentFor(CONFIG.dataCenter,{widthKm:CONFIG.dataWidthKm,heightKm:CONFIG.dataHeightKm});
}
function visibleWorldBoundaries(extent=state.lastGrid?.extent){
  if(!extent)return {north:false,east:false,south:false,west:false};
  const world=largestExtent();
  const epsLon=Math.max(1e-8,(extent.east-extent.west)/Math.max(1,CONFIG.gridW-1)*.35);
  const epsLat=Math.max(1e-8,(extent.north-extent.south)/Math.max(1,CONFIG.gridH-1)*.35);
  return {
    north:Math.abs(extent.north-world.north)<=epsLat,
    east:Math.abs(extent.east-world.east)<=epsLon,
    south:Math.abs(extent.south-world.south)<=epsLat,
    west:Math.abs(extent.west-world.west)<=epsLon
  };
}
function updateWorldBoundaryFrame(){
  const frame=els.worldBoundaryFrame,surface=activeMapSurface();
  if(!frame||!state.lastGrid||!surface||!els.viewport){frame?.classList.remove("visible");return}
  const flags=visibleWorldBoundaries(state.lastGrid.extent),active=Object.values(flags).some(Boolean);
  frame.classList.toggle("visible",active);
  for(const side of ["north","east","south","west"])frame.querySelector(`.edge-${side}`)?.classList.toggle("active",!!flags[side]);
  if(!active)return;

  const vr=els.viewport.getBoundingClientRect();
  const first=canvasCellRect(0,0),last=canvasCellRect(CONFIG.gridW-1,CONFIG.gridH-1);
  if(!first||!last){frame.classList.remove("visible");return}

  // La fiche mobile peut recouvrir le bas du viewport. Le cadre est alors
  // rabattu juste au-dessus de la fiche, au lieu de disparaître dessous.
  let visibleBottom=vr.bottom;
  if(mobileReadoutMode()&&els.readout&&!document.body.classList.contains("info-collapsed")){
    const rr=els.readout.getBoundingClientRect();
    const overlaps=rr.left<vr.right&&rr.right>vr.left&&rr.top<vr.bottom&&rr.bottom>vr.top;
    if(overlaps)visibleBottom=Math.max(vr.top+8,Math.min(visibleBottom,rr.top-4));
  }

  const mapLeft=first.left,mapTop=first.top,mapRight=last.right,mapBottom=last.bottom;
  const left=Math.max(vr.left,Math.min(mapLeft,vr.right-1));
  const right=Math.min(vr.right,Math.max(mapRight,vr.left+1));
  const top=Math.max(vr.top,Math.min(mapTop,visibleBottom-1));
  const bottom=Math.min(visibleBottom,Math.max(mapBottom,vr.top+1));
  if(right<=left||bottom<=top){frame.classList.remove("visible");return}

  frame.style.left=`${left-vr.left+els.viewport.scrollLeft}px`;
  frame.style.top=`${top-vr.top+els.viewport.scrollTop}px`;
  frame.style.width=`${Math.max(1,right-left)}px`;
  frame.style.height=`${Math.max(1,bottom-top)}px`;
  frame.dataset.southClamped=String(flags.south&&mapBottom>visibleBottom+1);
}
function clampCenter(center,z=currentZoom()){
  const b=largestExtent();
  const halfLat=(z.heightKm/111.32)/2;
  const halfLon=(z.widthKm/kmPerLon(center.lat))/2;
  const minLat=b.south+halfLat,maxLat=b.north-halfLat;
  const minLon=b.west+halfLon,maxLon=b.east-halfLon;
  return {
    lat:minLat<=maxLat?clamp(center.lat,minLat,maxLat):CONFIG.dataCenter.lat,
    lon:minLon<=maxLon?clamp(center.lon,minLon,maxLon):CONFIG.dataCenter.lon
  };
}
function coordToGrid(lat,lon,extent){
  const x=Math.round((lon-extent.west)/(extent.east-extent.west)*(CONFIG.gridW-1));
  const y=Math.round((extent.north-lat)/(extent.north-extent.south)*(CONFIG.gridH-1));
  return {x,y};
}
function gridToCoord(x,y,extent){
  return {
    lon:extent.west+(x/(CONFIG.gridW-1))*(extent.east-extent.west),
    lat:extent.north-(y/(CONFIG.gridH-1))*(extent.north-extent.south)
  };
}
function inExtent(lat,lon,e){return lat>=e.south&&lat<=e.north&&lon>=e.west&&lon<=e.east}

/* V0.12d — socle commun des points d’intérêt et indexation spatiale.
   Les sources conservent leurs données brutes, mais le moteur ne les parcourt
   plus toutes à chaque rendu. Un index géographique léger fournit uniquement
   les objets présents dans l’emprise courante. */
class SpatialHashIndex{
  constructor(cellDegrees=.012){this.cellDegrees=cellDegrees;this.buckets=new Map();this.overflow=[];this.count=0}
  clear(){this.buckets.clear();this.overflow=[];this.count=0}
  key(ix,iy){return `${ix}:${iy}`}
  range(bounds){
    const s=this.cellDegrees;
    return {
      x1:Math.floor(bounds.west/s),x2:Math.floor(bounds.east/s),
      y1:Math.floor(bounds.south/s),y2:Math.floor(bounds.north/s)
    };
  }
  insert(item,bounds){
    if(!bounds||![bounds.west,bounds.east,bounds.south,bounds.north].every(Number.isFinite))return;
    const r=this.range(bounds);this.count++;
    const cells=(r.x2-r.x1+1)*(r.y2-r.y1+1);
    if(cells>2048){this.overflow.push(item);return}
    for(let iy=r.y1;iy<=r.y2;iy++)for(let ix=r.x1;ix<=r.x2;ix++){
      const k=this.key(ix,iy),bucket=this.buckets.get(k);
      if(bucket)bucket.push(item);else this.buckets.set(k,[item]);
    }
  }
  insertPoint(item,lat,lon){
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    this.insert(item,{west:lon,east:lon,south:lat,north:lat});
  }
  query(extent){
    if(!extent)return[];
    const r=this.range(extent),seen=new Set(),out=[];
    for(const item of this.overflow){seen.add(item);out.push(item)}
    for(let iy=r.y1;iy<=r.y2;iy++)for(let ix=r.x1;ix<=r.x2;ix++){
      const bucket=this.buckets.get(this.key(ix,iy));if(!bucket)continue;
      for(const item of bucket)if(!seen.has(item)){seen.add(item);out.push(item)}
    }
    return out;
  }
}
const spatialRuntime={
  dirty:true,refs:new Map(),normalizedPois:[],poiByRaw:new WeakMap(),
  poiIndex:new SpatialHashIndex(.012),osmIndex:new SpatialHashIndex(.012),cadastreIndex:new SpatialHashIndex(.006),
  rebuilds:0,lastBuildMs:0,lastQueryCandidates:0,lastQueryResults:0
};
const descriptionRuntime={
  revision:0,cache:new Map(),selectionToken:0,hits:0,misses:0,maxEntries:320,lastKey:""
};
const relationRuntime={cache:new Map(),timer:0};
const guidedTourRuntime={revision:-1,count:-1,tours:[],byId:new Map()};
function invalidateDescriptionCache(){
  descriptionRuntime.revision++;
  descriptionRuntime.cache.clear();
  descriptionRuntime.lastKey="";
  relationRuntime.cache.clear();
  guidedTourRuntime.revision=-1;
}
function markSpatialIndexesDirty(){spatialRuntime.dirty=true;invalidateDescriptionCache()}
function boundsFromCoords(coords){
  if(!Array.isArray(coords)||!coords.length)return null;
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const pair of coords){
    const lon=Number(pair?.[0]),lat=Number(pair?.[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
  }
  return Number.isFinite(west)?{west,east,south,north}:null;
}
function featureBounds(feature){
  const b=feature?.bbox;
  if(b&&[b.west,b.east,b.south,b.north].every(Number.isFinite))return b;
  return boundsFromCoords(feature?.coords);
}
function normalizedPoiCategory(sourceType,raw){
  if(sourceType==="bss")return "bss";
  if(sourceType==="cavity")return "cavity";
  if(sourceType==="heritage")return "heritage";
  if(sourceType==="observation"||sourceType==="lore")return "memory";
  if(sourceType==="cartofriches")return "industrial";
  if(sourceType==="house")return "home";
  if(sourceType==="location")return "location";
  return "natural";
}
function makeNormalizedPoi(sourceType,raw,overrides={}){
  const lat=Number(overrides.lat??raw?.lat),lon=Number(overrides.lon??raw?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const id=String(overrides.id??raw?.id??raw?.indice??`${sourceType}:${lat.toFixed(6)}:${lon.toFixed(6)}`);
  const title=String(overrides.title??raw?.name??raw?.designation??raw?.nomCavite??overrides.kind??sourceType);
  return {
    uid:`${sourceType}:${id}`,id,sourceType,
    category:overrides.category||normalizedPoiCategory(sourceType,raw),
    subtype:String(overrides.subtype??raw?.category??raw?.type??raw?.nature??""),
    title,kind:String(overrides.kind??raw?.kind??raw?.type??sourceType),
    description:String(overrides.description??raw?.description??raw?.note??""),
    source:String(overrides.source??raw?.source??""),
    lat,lon,priority:Number(overrides.priority??0),raw,
    tags:overrides.tags||raw?.tags||null
  };
}
function poiFeatureInfo(poi,extra={}){
  return {
    id:poi.id,name:poi.title,kind:poi.kind,source:poi.source,lat:poi.lat,lon:poi.lon,
    poi:true,poiId:poi.uid,poiCategory:poi.category,poiSourceType:poi.sourceType,
    normalizedPoi:poi,record:poi.raw,...extra
  };
}
function spatialSourceChanged(name,value){
  const previous=spatialRuntime.refs.get(name);
  const length=Array.isArray(value)?value.length:-1;
  if(!previous||previous.ref!==value||previous.length!==length){
    spatialRuntime.refs.set(name,{ref:value,length});return true;
  }
  return false;
}
function ensureSpatialIndexes(){
  let changed=spatialRuntime.dirty;
  const sources={
    osm:state.osm,cadastreBuildings:state.cadastreBuildings,cadastreParcels:state.cadastreParcels,
    bss:state.bss,cavities:state.cavities,observations:state.observations,heritage:state.heritageItems,
    lore:state.loreItems,cartofriches:state.cartofriches,userLocation:state.userLocation
  };
  for(const [name,value] of Object.entries(sources))if(spatialSourceChanged(name,value))changed=true;
  const houseStamp=`${CONFIG.house.lat}:${CONFIG.house.lon}`;
  if(spatialRuntime.refs.get("houseStamp")!==houseStamp){spatialRuntime.refs.set("houseStamp",houseStamp);changed=true}
  if(!changed)return;
  const started=performance.now();
  spatialRuntime.poiIndex.clear();spatialRuntime.osmIndex.clear();spatialRuntime.cadastreIndex.clear();
  spatialRuntime.normalizedPois=[];spatialRuntime.poiByRaw=new WeakMap();
  const seen=new Set();
  const addPoi=(sourceType,raw,overrides={})=>{
    const poi=makeNormalizedPoi(sourceType,raw,overrides);if(!poi)return;
    const dedupe=`${poi.sourceType}|${poi.id}|${poi.lat.toFixed(6)}|${poi.lon.toFixed(6)}`;
    if(seen.has(dedupe))return;seen.add(dedupe);
    spatialRuntime.normalizedPois.push(poi);spatialRuntime.poiIndex.insertPoint(poi,poi.lat,poi.lon);
    if(raw&&typeof raw==="object")spatialRuntime.poiByRaw.set(raw,poi);
  };
  for(const b of state.bss||[])addPoi("bss",b,{kind:b.piezo?"station piézométrique":"forage ou ouvrage BSS",priority:b.piezo?19:17});
  for(const c of state.cavities||[])addPoi("cavity",c,{kind:cavityType(c),title:cavityName(c),priority:18});
  for(const o of state.observations||[])addPoi("observation",o,{kind:o.mode==="sight"?"ligne de visée observée":o.mode==="zone"?"zone d’observation approximative":"observation ponctuelle",title:o.name||"Observation locale",priority:19});
  for(const h of state.heritageItems||[])addPoi("heritage",h,{kind:h.category||"patrimoine",title:h.name||"Lieu patrimonial",priority:21});
  for(const l of state.loreItems||[])addPoi("lore",l,{kind:l.category||"mémoire locale",title:l.name||"Repère local",priority:20});
  for(const f of state.cartofriches||[])addPoi("cartofriches",f,{kind:f.type||"site Cartofriches",title:f.name||"Site recensé",priority:22});
  if(OFFLINE_TEST&&territoryUsesEmbeddedData("offlineDemo",CONFIG.territory)&&!state.cartofriches?.length&&!state.loreItems?.length&&!state.localCavities?.length){
    for(const d of OFFLINE_DEMO_POINTS)addPoi("demo",d,{kind:d.kind,title:d.name,priority:21});
  }
  addPoi("house",CONFIG.house,{id:"house",title:state.address?.label||"Repère de départ",kind:"repère de départ",source:"Repère privé de l’Atlas",priority:24});
  if(state.userLocation)addPoi("location",state.userLocation,{id:"user-location",title:"Ma position",kind:"position actuelle",source:"Géolocalisation ponctuelle du navigateur",priority:50});
  for(const f of state.osm||[]){
    const bounds=featureBounds(f);if(bounds)spatialRuntime.osmIndex.insert(f,bounds);
    const t=f.tags||{};
    if(["spring","sinkhole","cave_entrance"].includes(t.natural)&&Array.isArray(f.coords)&&f.coords.length){
      const c=f.coords[Math.floor(f.coords.length/2)];
      addPoi("osm-natural",f,{id:f.id,title:t.name||t.natural,kind:`point naturel OSM · ${t.natural}`,lat:c?.[1],lon:c?.[0],source:"OpenStreetMap",priority:12,tags:t});
    }
  }
  for(const f of state.cadastreBuildings||[]){const bounds=featureBounds(f);if(bounds)spatialRuntime.cadastreIndex.insert({kind:"building",feature:f},bounds)}
  for(const f of state.cadastreParcels||[]){const bounds=featureBounds(f);if(bounds)spatialRuntime.cadastreIndex.insert({kind:"parcel",feature:f},bounds)}
  spatialRuntime.dirty=false;spatialRuntime.rebuilds++;spatialRuntime.lastBuildMs=performance.now()-started;
}
function queryNormalizedPois(extent,sourceTypes=null){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.poiIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const allowed=sourceTypes==null?null:new Set(Array.isArray(sourceTypes)?sourceTypes:[sourceTypes]);
  const results=candidates.filter(p=>inExtent(p.lat,p.lon,extent)&&(!allowed||allowed.has(p.sourceType)));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}

function extentAroundPoint(point,radiusMeters){
  const latDelta=radiusMeters/111320;
  const lonScale=Math.max(.08,Math.cos(rad(point.lat)));
  const lonDelta=radiusMeters/(111320*lonScale);
  return {west:point.lon-lonDelta,east:point.lon+lonDelta,south:point.lat-latDelta,north:point.lat+latDelta};
}
function normalizedPoiByUid(uid){
  ensureSpatialIndexes();
  return spatialRuntime.normalizedPois.find(p=>p.uid===uid)||null;
}
function rawPoiText(poi,keys){
  for(const key of keys){
    const value=poi?.raw?.[key];
    if(value!=null&&String(value).trim())return String(value).trim();
  }
  return "";
}
function poiRelationEntries(poi,limit=7){
  if(!poi)return[];
  const cacheKey=`${descriptionRuntime.revision}|${poi.uid}|${limit}`;
  const cached=relationRuntime.cache.get(cacheKey);if(cached)return cached;
  const candidates=queryNormalizedPois(extentAroundPoint(poi,2600)).filter(p=>p.uid!==poi.uid&&p.sourceType!=="location");
  const commune=rawPoiText(poi,["commune","comm_nom","city"]),period=rawPoiText(poi,["period","periode","siecle"]),place=rawPoiText(poi,["place","lieu_dit","lieudit"]);
  const ranked=[];
  for(const other of candidates){
    const distance=distanceMeters(poi,other);if(distance>2500)continue;
    const reasons=[];let score=0,kind="géographique";
    if(distance<=180){score+=30;reasons.push("proximité immédiate")}
    else if(distance<=500){score+=22;reasons.push("même voisinage")}
    else if(distance<=1200){score+=12;reasons.push("secteur proche")}
    else score+=5;
    if(other.category===poi.category){score+=24;reasons.push(`même famille · ${poiCategoryLabel(poi.category)}`);kind="typologique"}
    if(other.sourceType===poi.sourceType&&poi.sourceType!=="osm-natural"){score+=15;reasons.push("même catalogue documentaire");kind="documentaire"}
    const otherCommune=rawPoiText(other,["commune","comm_nom","city"]);
    if(commune&&otherCommune&&commune.toLowerCase()===otherCommune.toLowerCase()){score+=10;reasons.push(`même commune · ${commune}`)}
    const otherPeriod=rawPoiText(other,["period","periode","siecle"]);
    if(period&&otherPeriod&&period.toLowerCase()===otherPeriod.toLowerCase()){score+=13;reasons.push(`même période · ${period}`);kind="documentaire"}
    const otherPlace=rawPoiText(other,["place","lieu_dit","lieudit"]);
    if(place&&otherPlace&&place.toLowerCase()===otherPlace.toLowerCase()){score+=18;reasons.push(`même lieu-dit · ${place}`);kind="documentaire"}
    if(score<14)continue;
    ranked.push({poi:other,distance,score,kind,reasons:[...new Set(reasons)].slice(0,3)});
  }
  ranked.sort((a,b)=>b.score-a.score||a.distance-b.distance||b.poi.priority-a.poi.priority);
  const result=[],perCategory=new Map();
  for(const entry of ranked){
    const key=entry.poi.category,count=perCategory.get(key)||0;
    if(count>=3)continue;
    result.push(entry);perCategory.set(key,count+1);
    if(result.length>=limit)break;
  }
  relationRuntime.cache.set(cacheKey,result);return result;
}
function primaryNormalizedPoiForCell(cell,x,y){
  const f=cell?.feature;if(!f)return null;
  if(f.normalizedPoi)return f.normalizedPoi;
  if(Array.isArray(f.normalizedPois)&&f.normalizedPois.length)return f.normalizedPois[0];
  if(f.record&&typeof f.record==="object"){
    const mapped=spatialRuntime.poiByRaw.get(f.record);if(mapped)return mapped;
  }
  if(!state.lastGrid)return null;
  const coord=gridToCoord(x,y,state.lastGrid.extent);
  const cellRadius=Math.max(35,(currentZoom().widthKm*1000/CONFIG.gridW+currentZoom().heightKm*1000/CONFIG.gridH)*.72);
  return queryNormalizedPois(extentAroundPoint(coord,cellRadius)).sort((a,b)=>distanceMeters(coord,a)-distanceMeters(coord,b)||b.priority-a.priority)[0]||null;
}
function relationsNarrative(cell,x,y){
  const source=primaryNormalizedPoiForCell(cell,x,y);if(!source)return"";
  const entries=poiRelationEntries(source);if(!entries.length)return"";
  return `<section class="cell-section cell-section-relations"><h3>Lieux en relation</h3><div class="relation-list">${entries.map(entry=>{
    const p=entry.poi,distance=entry.distance<50?"moins de 50 m":`${Math.round(entry.distance/10)*10} m`;
    return `<div class="relation-item"><button class="relation-frame" type="button" data-relation-from="${escAttr(source.uid)}" data-relation-to="${escAttr(p.uid)}" data-relation-label="${escAttr(entry.reasons[0]||entry.kind)}"><strong>${esc(p.title)}</strong><span class="relation-reason"><span class="relation-kind">${esc(entry.kind)}</span>${esc(entry.reasons.join(" · "))} · ${distance}</span></button><button class="relation-open" type="button" title="Ouvrir la fiche de ${escAttr(p.title)}" aria-label="Ouvrir la fiche de ${escAttr(p.title)}" data-poi-focus="${escAttr(p.uid)}">→</button></div>`;
  }).join("")}</div><p class="relation-note">Ces rapprochements signalent une proximité, une similitude ou une source commune. Ils ne prouvent pas une connexion physique ou historique.</p></section>`;
}
function aroundMeEntries(){
  const loc=state.userLocation;if(!loc)return[];
  const radius=Number(state.aroundRadius)||500;
  return queryNormalizedPois(extentAroundPoint(loc,radius)).filter(p=>p.sourceType!=="location"&&distanceMeters(loc,p)<=radius).map(p=>({poi:p,distance:distanceMeters(loc,p),bearing:bearingDegrees(loc,p)})).sort((a,b)=>a.distance-b.distance||b.poi.priority-a.poi.priority);
}
function updateAroundMe(){
  if(!els.aroundSummary||!els.aroundList)return;
  const loc=state.userLocation;
  if(!loc){els.aroundSummary.textContent="Localise-toi pour dresser l’inventaire des lieux proches.";els.aroundList.innerHTML="";return}
  const entries=aroundMeEntries(),radius=Number(state.aroundRadius)||500;
  const counts=new Map();for(const e of entries)counts.set(e.poi.category,(counts.get(e.poi.category)||0)+1);
  const summary=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([category,n])=>`${n} ${poiCategoryLabel(category).toLowerCase()}`).join(" · ");
  const accuracyNote=Number(loc.accuracy)>radius*.6?`<br><span style="color:var(--warn)">Précision GPS ± ${Math.round(loc.accuracy)} m : les distances restent indicatives.</span>`:"";
  els.aroundSummary.innerHTML=entries.length?`<strong>${entries.length} repère${entries.length>1?"s":""}</strong> dans un rayon de ${radius>=1000?`${radius/1000} km`:`${radius} m`}<br>${esc(summary)}${accuracyNote}`:`Aucun point d’intérêt indexé dans un rayon de ${radius>=1000?`${radius/1000} km`:`${radius} m`}.${accuracyNote}`;
  const displayed=[],perCategory=new Map();
  for(const entry of entries){
    const key=entry.poi.category,count=perCategory.get(key)||0;
    if(count>=5)continue;
    displayed.push(entry);perCategory.set(key,count+1);
    if(displayed.length>=14)break;
  }
  els.aroundList.innerHTML=displayed.map(({poi,distance,bearing})=>`<button class="poi-nav-button" type="button" data-poi-focus="${escAttr(poi.uid)}"><span class="poi-nav-head"><span class="poi-nav-title">${esc(poi.title)}</span><span class="poi-nav-distance">${distance<50?"< 50 m":`${Math.round(distance/10)*10} m`}</span></span><span class="poi-nav-meta">${esc(poiCategoryLabel(poi.category))} · ${esc(cardinalDirection(bearing))}</span></button>`).join("");
}
