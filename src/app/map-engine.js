function bearingDegrees(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lon-a.lon);const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function confidenceLabel(v){return v==="high"?"forte":v==="low"?"faible":"moyenne"}

function createGrid(extent){
  const grid=[];
  const elevations=[];
  let minE=Infinity,maxE=-Infinity;
  for(let y=0;y<CONFIG.gridH;y++){
    const row=[];const er=[];
    for(let x=0;x<CONFIG.gridW;x++){
      const c=gridToCoord(x,y,extent), elev=elevationAt(c.lat,c.lon);
      if(Number.isFinite(elev)){minE=Math.min(minE,elev);maxE=Math.max(maxE,elev)}
      er.push(elev);
      row.push({ch:" ",cls:"",priority:0,feature:null,confidence:null,elev});
    }
    elevations.push(er);grid.push(row);
  }
  return {
    grid,elevations,
    minE:Number.isFinite(minE)?minE:null,
    maxE:Number.isFinite(maxE)?maxE:null,
    extent,
    labelBoxes:[],
    labelCounts:{place:0,poi:0,bss:0}
  };
}
function put(g,x,y,ch,cls,priority,feature=null,confidence=null){
  if(x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)return;
  const cell=g.grid[y][x];
  if(priority>=cell.priority){
    cell.ch=ch;cell.cls=cls;cell.priority=priority;cell.feature=feature;cell.confidence=confidence;
  }
}
function putText(g,x,y,text,cls,priority,feature=null){
  for(let i=0;i<text.length;i++)put(g,x+i,y,text[i],cls,priority,feature);
}
function clippedMapLabel(value,maxLength){
  const clean=String(value||"").trim().replace(/\s+/g," ");
  if(!clean||maxLength<=0)return "";
  if(clean.length<=maxLength)return clean;
  return `${clean.slice(0,Math.max(1,maxLength-1)).trimEnd()}…`;
}
function labelQuota(kind){
  const p=semanticZoom();
  return kind==="place"?p.placeMax:kind==="bss"?p.bssMax:p.poiMax;
}
function labelBoxIntersects(a,b){
  return !(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2);
}
function labelPositionFree(g,x,y,text,feature){
  if(!text||x<0||y<0||y>=CONFIG.gridH||x+text.length>CONFIG.gridW)return false;
  const box={x1:x-1,x2:x+text.length,y1:y,y2:y};
  if(g.labelBoxes.some(other=>labelBoxIntersects(box,other)))return false;
  for(let i=0;i<text.length;i++){
    const cell=g.grid[y][x+i];
    if(cell.priority>=16&&cell.feature!==feature)return false;
  }
  return true;
}
function tryMapLabel(g,anchor,value,cls,priority,feature,kind="poi",maxLength=0,centered=false){
  const quota=labelQuota(kind);
  if(quota<=0||g.labelCounts[kind]>=quota)return false;
  const label=clippedMapLabel(value,maxLength);
  if(!label)return false;
  const half=Math.floor(label.length/2);
  const candidates=centered
    ? [
        {x:anchor.x-half,y:anchor.y},
        {x:anchor.x-half,y:anchor.y+1},
        {x:anchor.x-half,y:anchor.y-1},
        {x:anchor.x+2,y:anchor.y}
      ]
    : [
        {x:anchor.x+3,y:anchor.y},
        {x:anchor.x-label.length-2,y:anchor.y},
        {x:anchor.x-half,y:anchor.y+1},
        {x:anchor.x-half,y:anchor.y-1}
      ];
  for(const pos of candidates){
    if(!labelPositionFree(g,pos.x,pos.y,label,feature))continue;
    putText(g,pos.x,pos.y,label,cls,priority,feature);
    g.labelBoxes.push({x1:pos.x-1,x2:pos.x+label.length,y1:pos.y,y2:pos.y});
    g.labelCounts[kind]++;
    return true;
  }
  return false;
}
function osmPlaceImportance(f){
  const p=f?.tags?.place;
  return p==="city"?100:p==="town"?90:p==="village"?80:p==="hamlet"?70:p==="suburb"?60:p==="neighbourhood"?55:40;
}
function bresenham(x0,y0,x1,y1,fn){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;
  let err=dx+dy;
  while(true){fn(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}
}
function pointInPolygon(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}
function polygonFill(g,points,ch,cls,priority,feature){
  if(points.length<3)return;
  const minX=clamp(Math.floor(Math.min(...points.map(p=>p.x))),0,CONFIG.gridW-1);
  const maxX=clamp(Math.ceil(Math.max(...points.map(p=>p.x))),0,CONFIG.gridW-1);
  const minY=clamp(Math.floor(Math.min(...points.map(p=>p.y))),0,CONFIG.gridH-1);
  const maxY=clamp(Math.ceil(Math.max(...points.map(p=>p.y))),0,CONFIG.gridH-1);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(pointInPolygon(x+.5,y+.5,points))put(g,x,y,ch,cls,priority,feature);
}
function lineDraw(g,points,ch,cls,priority,feature,width=1){
  for(let i=1;i<points.length;i++){
    bresenham(points[i-1].x,points[i-1].y,points[i].x,points[i].y,(x,y)=>{
      for(let oy=-Math.floor(width/2);oy<=Math.floor(width/2);oy++)
        for(let ox=-Math.floor(width/2);ox<=Math.floor(width/2);ox++)
          put(g,x+ox,y+oy,ch,cls,priority,feature);
    });
  }
}
function featureCenter(points){
  if(!points.length)return{x:0,y:0};
  return{x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
}
function coordsIntersectExtent(feature,e){
  const b=feature.bbox;
  if(b)return !(b.east<e.west||b.west>e.east||b.north<e.south||b.south>e.north);
  return feature.coords.some(([lon,lat])=>inExtent(lat,lon,e));
}
function osmFeatureInfo(f,kind){
  return {kind,name:f.tags.name||"",source:"OpenStreetMap",tags:f.tags,id:f.id};
}
function clearVegetationAround(g,cx,cy,radiusMeters,feature){
  if(state.zoomIndex<2)return;
  const z=currentZoom();
  const cellW=z.widthKm*1000/CONFIG.gridW,cellH=z.heightKm*1000/CONFIG.gridH;
  const rx=Math.max(1,Math.ceil(radiusMeters/cellW));
  const ry=Math.max(1,Math.ceil(radiusMeters/cellH));
  for(let oy=-ry;oy<=ry;oy++)for(let ox=-rx;ox<=rx;ox++){
    if((ox*ox)/(rx*rx)+(oy*oy)/(ry*ry)>1)continue;
    const x=cx+ox,y=cy+oy;
    if(x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)continue;
    const c=g.grid[y][x];
    if(c.cls==="c-forest"||c.cls==="c-scrub"){
      c.ch="░";c.cls="c-clearing";c.priority=3;c.feature=feature;
    }
  }
}
function softenVegetationNearBuilt(g){
  if(state.zoomIndex<2)return;
  const seeds=[];
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(g.grid[y][x].cls==="c-building")seeds.push([x,y]);
  }
  const seen=new Set();
  for(const [x,y] of seeds){
    const key=`${Math.round(x/2)}:${Math.round(y/2)}`;if(seen.has(key))continue;seen.add(key);
    clearVegetationAround(g,x,y,14,{kind:"abords bâtis dégagés",source:"inférence locale autour d’un bâtiment OpenStreetMap"});
  }
  const hp=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);
  clearVegetationAround(g,hp.x,hp.y,38,{kind:"emprise habitée dégagée",name:"autour de la maison",source:"correction de lecture fondée sur le repère d’habitation fourni par l’utilisateur"});
}
function renderCadastre(g){
  const detail=semanticZoom();
  if(!detail.cadastreBuildings&&!detail.parcels)return;
  const e=g.extent;
  if(state.layerParcels&&detail.parcels){
    for(const indexed of queryCadastreFeatures(e,"parcel")){
      const f=indexed.feature,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      lineDraw(g,pts,"┄","c-parcel",4,{kind:"limite de parcelle cadastrale",name:f.id||f.properties?.id||"parcelle",id:f.id,source:"Cadastre Etalab / DGFiP"});
    }
  }
  if(state.layerCadastreBuildings&&detail.cadastreBuildings){
    for(const indexed of queryCadastreFeatures(e,"building")){
      const f=indexed.feature,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      polygonFill(g,pts,"█","c-cad-building",12,{kind:"bâtiment cadastral",name:"Emprise bâtie officielle",id:f.id,source:"Cadastre Etalab / DGFiP",cadastre:true,properties:f.properties});
    }
  }
}
function drawBss(g){
  if(!state.layerBss||!state.bss.length||state.zoomIndex<1)return;
  const visible=queryNormalizedPois(g.extent,"bss");
  if(!visible.length)return;

  if(state.zoomIndex===1){
    const buckets=new Map();
    for(const poi of visible){
      const b=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
      const key=`${Math.floor(p.x/6)}:${Math.floor(p.y/4)}`;
      const bucket=buckets.get(key)||{items:[],pois:[],sx:0,sy:0};
      bucket.items.push(b);bucket.pois.push(poi);bucket.sx+=p.x;bucket.sy+=p.y;buckets.set(key,bucket);
    }
    for(const bucket of buckets.values()){
      const x=Math.round(bucket.sx/bucket.items.length),y=Math.round(bucket.sy/bucket.items.length);
      const piezo=bucket.items.some(b=>b.piezo),count=bucket.items.length;
      const info={
        kind:count>1?`groupe de ${count} ouvrages BSS`:piezo?"station piézométrique":"forage ou ouvrage BSS",
        name:count>1?`${count} ouvrages dans cette zone`:bucket.items[0].name,
        source:`BRGM · BSS ${CONFIG.territory.administration.departmentName}, regroupement visuel à cette échelle`,
        bss:true,piezo,records:bucket.items,normalizedPois:bucket.pois,
        poi:true,poiCategory:"bss",poiSourceType:"bss",poiId:`bss-cluster:${x}:${y}`
      };
      putText(g,x,y,piezo?"P":count>1?"B+":"B",piezo?"c-piezo":"c-bss",17,info);
    }
    return;
  }

  const detail=semanticZoom();
  const ordered=visible.slice().sort((a,b)=>Number(!!b.raw?.piezo)-Number(!!a.raw?.piezo)||distanceMeters(state.center,a)-distanceMeters(state.center,b));
  for(const poi of ordered){
    const b=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{kind:b.piezo?"station piézométrique":"forage ou ouvrage BSS",depth:b.depth,nature:b.nature,altitude:b.altitude,commune:b.commune,indice:b.indice,place:b.place,bss:true,piezo:!!b.piezo});
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,b.piezo?"piezo":"bss");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",17,{kind:"indice documentaire proche",name:"Quelque chose mérite peut-être un examen",source:"Brouillard de connaissance"});continue}
    const glyph=b.piezo?"P≈":currentDepth()<0?"B│":"B•";
    putText(g,p.x,p.y,glyph,b.piezo?"c-piezo":"c-bss",17,info);
    if(currentDepth()===0&&state.layerLabels&&detail.bssLabel>0){
      const label=state.zoomIndex>=5?(b.indice||b.name||b.id):(b.indice||b.name||"BSS");
      tryMapLabel(g,p,label,"c-label",14,info,"bss",detail.bssLabel,false);
    }
  }
}
function drawObservations(g){
  if(!state.layerObservations||currentDepth()!==0)return;
  const detailedGeometry=semanticZoom().observationGeometry;
  for(const poi of queryNormalizedPois(g.extent,"observation")){
    const o=poi.raw;
    const info=poiFeatureInfo(poi,{kind:o.mode==="sight"?"ligne de visée observée":"zone d’observation approximative",observation:true,confidenceLabel:confidenceLabel(o.confidence),season:o.season||"",bearing:o.bearing,distance:o.distance});
    const p=coordToGrid(poi.lat,poi.lon,g.extent),visibility=explorerMarkerState(info,poi.lat,poi.lon,"observation");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",19,{kind:"indice d’observation proche",name:"Une observation reste à révéler",source:"Brouillard de connaissance"});continue}
    if(o.mode==="sight"){
      if(detailedGeometry){
        const a=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);let n=0;
        bresenham(a.x,a.y,p.x,p.y,(x,y)=>{if(n++%2===0)put(g,x,y,"·","c-sight",15,info,o.confidence)});
      }
      put(g,p.x,p.y,"▷","c-observation",19,info,o.confidence);
    }else if(o.mode==="zone"){
      if(detailedGeometry){
        const z=currentZoom(),rx=Math.max(1,Math.round((o.radius||80)/(z.widthKm*1000/CONFIG.gridW))),ry=Math.max(1,Math.round((o.radius||80)/(z.heightKm*1000/CONFIG.gridH)));
        for(let i=0;i<72;i++){const a=i/72*Math.PI*2,x=p.x+Math.round(Math.cos(a)*rx),y=p.y+Math.round(Math.sin(a)*ry);put(g,x,y,"·","c-zone",15,info,o.confidence)}
      }
      put(g,p.x,p.y,"◎","c-observation",19,info,o.confidence);
    }
  }
}

function drawCartofriches(g){
  if(!state.layerCartofriches||currentDepth()!==0||!state.cartofriches.length)return;
  for(const poi of queryNormalizedPois(g.extent,"cartofriches")){
    const f=poi.raw;
    if(!state.cartofrichesIncludeReconverted&&(f.status||"").toLowerCase().includes("reconvert"))continue;
    const m=cartofrichesMarker(f),p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{
      kind:m.label,cartofriches:true,siteType:f.type,siteStatus:f.status,address:f.address,surface:f.surface,
      occupation:f.occupation,activity:f.activity,activityEnd:f.activityEnd,updated:f.updated,
      identified:f.identified,commune:f.commune,insee:f.insee,producer:f.producer,
      sourceNature:f.sourceNature,url:f.url,security:f.security,pollution:f.pollution
    });
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cartofriches");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",22,{kind:"friche officielle proche",name:"Un site Cartofriches reste à identifier",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,m.glyph,m.cls,22,info);
    const detail=semanticZoom();
    if(state.layerLabels&&detail.poiLabel>0&&f.name)tryMapLabel(g,p,f.name,"c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function drawOfflineDemoPoints(g){
  if(!OFFLINE_TEST||currentDepth()!==0||state.cartofriches.length||state.loreItems.length||state.localCavities.length)return;
  for(const poi of queryNormalizedPois(g.extent,"demo")){
    const d=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{kind:d.kind,note:d.note,source:"Démonstration embarquée · donnée synthétique, non géographique",demo:true});
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"demo");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",21,{kind:"indice de démonstration",name:"Une balise de test est proche",source:"Démonstration embarquée"});continue}
    putText(g,p.x,p.y,d.glyph,"c-demo",21,info);
  }
}


function drawHeritage(g){
  if(!state.layerHeritage||currentDepth()!==0)return;
  const visible=queryNormalizedPois(g.extent,"heritage").filter(p=>state.heritageEnabled[p.raw?.category]!==false);
  if(!visible.length)return;
  if(state.zoomIndex<=1){
    const stepX=state.zoomIndex===0?9:6,stepY=state.zoomIndex===0?5:4,buckets=new Map();
    for(const poi of visible){const p=coordToGrid(poi.lat,poi.lon,g.extent),key=`${Math.floor(p.x/stepX)}:${Math.floor(p.y/stepY)}`,b=buckets.get(key)||{items:[],pois:[],sx:0,sy:0};b.items.push(poi.raw);b.pois.push(poi);b.sx+=p.x;b.sy+=p.y;buckets.set(key,b)}
    for(const b of buckets.values()){
      const x=Math.round(b.sx/b.items.length),y=Math.round(b.sy/b.items.length),single=b.items.length===1?b.items[0]:null,singlePoi=b.pois.length===1?b.pois[0]:null,d=heritageMarkerDefinition(single?.category||"monument");
      const info=singlePoi?poiFeatureInfo(singlePoi,heritageFeatureInfo(single)):{kind:`groupe de ${b.items.length} lieux patrimoniaux`,name:`${b.items.length} lieux documentés dans cette zone`,source:"Regroupement visuel de plusieurs sources patrimoniales",heritage:true,records:b.items,normalizedPois:b.pois,poi:true,poiCategory:"heritage",poiSourceType:"heritage",poiId:`heritage-cluster:${x}:${y}`};
      putText(g,x,y,single?d.glyph:"P+",single?d.cls:"c-heritage-monument",21,info);
    }
    return;
  }
  const ordered=visible.slice().sort((a,b)=>heritagePriority(b.raw)-heritagePriority(a.raw));
  for(const poi of ordered){
    const item=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent),d=heritageMarkerDefinition(item.category),info=poiFeatureInfo(poi,heritageFeatureInfo(item));
    putText(g,p.x,p.y,d.glyph,d.cls,heritagePriority(item),info);
    const detail=semanticZoom();if(state.layerLabels&&detail.poiLabel>0&&item.name)tryMapLabel(g,p,item.name,"c-label",15,info,"poi",detail.poiLabel,false);
  }
}
function heritagePriority(item){return item.category==="monument"?23:item.category==="garden"?22:item.category==="house"||item.category==="museum"?21:19}
function heritageFeatureInfo(item){
  const d=heritageMarkerDefinition(item.category);
  return {id:item.id,kind:d.label,name:item.name,source:item.source,heritage:true,heritageCategory:item.category,reference:item.ref||item.wikidata||"",description:item.description||item.wikipediaDescription||"",period:item.period||"",protection:item.protection||"",commune:item.commune||"",address:item.address||"",url:item.url||item.wikipediaUrl||"",license:item.license||"",record:item,lat:item.lat,lon:item.lon};
}

function drawLore(g){
  if(!state.layerLore||currentDepth()!==0||!state.loreItems.length)return;
  for(const poi of queryNormalizedPois(g.extent,"lore")){
    const item=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent),def=loreMarkerDefinition(item.category);
    const info=poiFeatureInfo(poi,{
      kind:def.label,source:item.source||"Repère local enregistré dans cet atlas",
      lore:true,category:item.category,categoryLabel:def.label,period:item.period||"",note:item.note||""
    });
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"lore");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",20,{kind:"lieu intrigant à proximité",name:"Un détail du paysage attire l’attention",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,def.glyph,def.cls,20,info);
    const detail=semanticZoom();
    if(state.layerLabels&&detail.poiLabel>0&&item.name)tryMapLabel(g,p,item.name,"c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function renderSurface(g){
  if(state.osm){
    const z=currentZoom(), e=g.extent;
    const features=queryOsmFeatures(e);
    const polygons=[],lines=[],labels=[];
    for(const f of features){
      const t=f.tags;
      if(t.place){labels.push(f);continue}
      if(t.building){polygons.push({f,kind:"building"});continue}
      if(t.landuse||["wood","water","scrub"].includes(t.natural)){polygons.push({f,kind:"land"});continue}
      if(t.waterway||t.highway||t.natural==="cliff"){lines.push(f);continue}
      if(t.natural==="spring"||t.natural==="sinkhole"||t.natural==="cave_entrance"){labels.push(f)}
    }
    for(const item of polygons){
      const f=item.f,t=f.tags,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      if(item.kind==="building"){
        if(!semanticZoom().osmBuildings)continue;
        polygonFill(g,pts,"█","c-building",9,osmFeatureInfo(f,"bâtiment"));
      }else{
        if(!f.closed){
          lineDraw(g,pts,"·","c-contour",2,osmFeatureInfo(f,"limite de terrain"));
          continue;
        }
        let ch=".",cls="c-field",pri=1,kind="terrain";
        const lu=t.landuse,n=t.natural,detail=semanticZoom();
        if(!detail.fineLand&&(["meadow","grass","farmland","orchard","vineyard"].includes(lu)||n==="scrub"))continue;
        if(lu==="forest"||n==="wood"){ch="T";cls="c-forest";kind="bois";pri=1}
        else if(["meadow","grass"].includes(lu)){ch=",";cls="c-meadow";kind="prairie";pri=1}
        else if(["farmland","orchard","vineyard"].includes(lu)){ch=".";cls="c-field";kind=lu;pri=1}
        else if(lu==="residential"||lu==="industrial"){ch="░";cls="c-residential";kind=lu;pri=3}
        else if(lu==="quarry"){ch="q";cls="c-quarry";kind="carrière à ciel ouvert";pri=4}
        else if(n==="water"){ch="~";cls="c-water";kind="surface d’eau";pri=5}
        else if(n==="scrub"){ch='"';cls="c-scrub";kind="broussailles"}
        else if(lu==="cemetery"){ch="†";cls="c-residential";kind="cimetière"}
        polygonFill(g,pts,ch,cls,pri,osmFeatureInfo(f,kind));
      }
    }
    for(const f of lines){
      const t=f.tags,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e)),detail=semanticZoom();
      if(t.waterway){
        const majorWater=t.waterway==="river"||t.waterway==="canal";
        if(!majorWater&&!detail.minorWater)continue;
        // Une largeur en cellules ne doit pas être constante quand chaque case
        // représente de 100 m à moins de 2 m. Loin du terrain, même une rivière
        // reste un fil ; le double trait n’apparaît qu’aux zooms réellement proches.
        const waterWidth=majorWater&&state.zoomIndex>=4?2:1;
        const waterGlyph=state.zoomIndex<=1?"~":"≈";
        lineDraw(g,pts,waterGlyph,"c-water",8,osmFeatureInfo(f,t.waterway),waterWidth);
      }
      else if(t.natural==="cliff"){
        if(state.zoomIndex===0)continue;
        lineDraw(g,pts,"|","c-contour",6,osmFeatureInfo(f,"escarpement"),1);
      }
      else if(t.highway){
        const motorway=["motorway","motorway_link","trunk","trunk_link"].includes(t.highway);
        const arterial=["primary","primary_link","secondary","secondary_link"].includes(t.highway);
        const major=motorway||arterial;
        const path=["track","path","footway","cycleway","bridleway","steps"].includes(t.highway);
        if(path&&!detail.paths)continue;
        if(!major&&!path&&!detail.minorRoads)continue;
        /* Une route reste toujours un trait d’une cellule. À grande échelle, la
           hiérarchie est portée par le glyphe et la teinte, jamais par une largeur
           de trois cellules qui transformerait une départementale en ruban géant. */
        let roadGlyph="─",roadClass="c-road",roadPriority=7;
        if(path){roadGlyph="·";roadClass="c-path";roadPriority=5}
        else if(motorway){
          roadGlyph=state.zoomIndex>=4?"═":state.zoomIndex>=2?"━":"─";
          roadClass=state.zoomIndex<=1?"c-road-major c-road-far":"c-road-major";
          roadPriority=8;
        }else if(arterial){
          roadGlyph=state.zoomIndex>=3?"━":"─";
          roadClass=state.zoomIndex===0?"c-road c-road-far":"c-road-major";
          roadPriority=8;
        }
        lineDraw(g,pts,roadGlyph,roadClass,roadPriority,osmFeatureInfo(f,`voie ${t.highway}`),1);
      }
    }
    softenVegetationNearBuilt(g);
    if(state.layerLabels){
      const detail=semanticZoom();
      const ordered=labels.slice().sort((a,b)=>osmPlaceImportance(b)-osmPlaceImportance(a));
      for(const f of ordered){
        const name=f.tags.name;if(!name)continue;
        const isPlace=!!f.tags.place;
        if(isPlace&&detail.placeTypes&&!detail.placeTypes.has(f.tags.place))continue;
        if(!isPlace&&detail.poiLabel<=0)continue;
        const pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e)),c=featureCenter(pts);
        const anchor={x:Math.round(c.x),y:Math.round(c.y)};
        const importance=isPlace?Math.max(10,Math.round(osmPlaceImportance(f)/7)):12;
        tryMapLabel(
          g,anchor,name,"c-label",importance,osmFeatureInfo(f,isPlace?"nom de lieu":"point naturel OSM"),
          isPlace?"place":"poi",isPlace?detail.placeLabel:detail.poiLabel,true
        );
      }
    }
  }else if(territoryUsesEmbeddedData("fallbackSurface",CONFIG.territory)&&state.zoomIndex===3 && (OFFLINE_TEST || (Math.abs(state.center.lat-CONFIG.house.lat)<.002 && Math.abs(state.center.lon-CONFIG.house.lon)<.003))){
    const sourceH=FALLBACK_SURFACE.length,sourceW=Math.max(...FALLBACK_SURFACE.map(row=>row.length));
    for(let y=0;y<CONFIG.gridH;y++){
      const sy=clamp(Math.round((y/Math.max(1,CONFIG.gridH-1))*(sourceH-1)),0,sourceH-1);
      const src=FALLBACK_SURFACE[sy]||"";
      for(let x=0;x<CONFIG.gridW;x++){
        const sx=clamp(Math.round((x/Math.max(1,CONFIG.gridW-1))*(sourceW-1)),0,Math.max(0,src.length-1));
        const ch=src[sx]||" ";
        if(ch===".")put(g,x,y,ch,"c-field",1,{kind:"surface de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch===";")put(g,x,y,ch,"c-forest",1,{kind:"végétation de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="~")put(g,x,y,ch,"c-water",8,{kind:"eau de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="=")put(g,x,y,ch,"c-road",7,{kind:"voie de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="#")put(g,x,y,ch,"c-building",9,{kind:"bâtiment de secours",source:"capture cartographique V0.1 rééchantillonnée"});
      }
    }
  }
  renderCadastre(g);
  if(state.layerHouse){
    const p=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);
    const source=state.houseBuilding?"centre d’un bâtiment du Cadastre Etalab, rapproché du point BAN":state.address?"Géoplateforme / Base Adresse Nationale":"repère de secours ou réglage manuel";
    ensureSpatialIndexes();
    const housePoi=spatialRuntime.normalizedPois.find(v=>v.sourceType==="house");
    put(g,p.x,p.y,"@","c-house",24,housePoi?poiFeatureInfo(housePoi,{kind:"repère de départ",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""}):{kind:"repère de départ",name:state.address?.label||"Repère de départ",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""});
  }
}

function applyRelief(g){
  if(!state.layerRelief||!state.elevation)return;
  const range=(g.maxE??0)-(g.minE??0);
  for(let y=0;y<CONFIG.gridH;y++){
    for(let x=0;x<CONFIG.gridW;x++){
      const c=g.grid[y][x],v=c.elev;
      if(Number.isFinite(v)&&range>0)c.shade=Math.round((v-g.minE)/range*7);
    }
  }
  const step=currentZoom().contour;
  for(let y=1;y<CONFIG.gridH-1;y++){
    for(let x=1;x<CONFIG.gridW-1;x++){
      const v=g.elevations[y][x],r=g.elevations[y][x+1],d=g.elevations[y+1][x];
      if(!Number.isFinite(v)||!Number.isFinite(r)||!Number.isFinite(d))continue;
      const crossing=Math.floor(v/step)!==Math.floor(r/step)||Math.floor(v/step)!==Math.floor(d/step);
      if(crossing&&g.grid[y][x].priority<=2)put(g,x,y,"·","c-contour",3,{kind:`courbe de niveau ${Math.round(v/step)*step} m`,source:`relief ${state.elevation?.source||"modèle altimétrique"}`});
    }
  }
}

function cavityMarker(c){
  const type=cavityType(c),full=`${type} ${text(c?.detail)} ${cavityName(c)}`.toLowerCase();
  if(c?.markerOverride){
    const def=localMarkerDefinition(c.markerOverride);
    return {glyph:c.markerOverride,cls:c.local?"c-doc-local":def.cls,label:def.detail};
  }
  if(type.includes("ouvrage civil"))return {glyph:"O=",cls:"c-doc-civil",label:"ouvrage civil"};
  if(type.includes("puits"))return {glyph:"Av",cls:"c-doc-anthropic",label:"puits anthropique"};
  if(type.includes("galerie")||type.includes("souterrain"))return {glyph:"A=",cls:"c-doc-anthropic",label:"galerie ou souterrain"};
  if(type.includes("carri"))return {glyph:"A#",cls:"c-doc-anthropic",label:"carrière souterraine"};
  if(type.includes("nature")){
    if(/résurgence|source|rivière/.test(full))return {glyph:"Ns",cls:"c-doc-natural",label:"résurgence ou circulation naturelle"};
    if(/aven|gouffre|vertical/.test(full))return {glyph:"Nv",cls:"c-doc-natural",label:"accès naturel vertical"};
    if(/horizontal|entrée/.test(full))return {glyph:"N>",cls:"c-doc-natural",label:"accès naturel horizontal"};
    return {glyph:"No",cls:"c-doc-natural",label:"cavité naturelle, morphologie d’entrée non précisée"};
  }
  if(type.includes("cave"))return {glyph:"Ac",cls:"c-doc-anthropic",label:"cave anthropique"};
  return {glyph:"?o",cls:"c-doc-unknown",label:"cavité de type insuffisamment précisé"};
}
function cavityInfo(c,marker){
  const o=c.observation||{};
  return {
    kind:marker.label,name:cavityName(c),id:c.id,source:c.source,type:cavityType(c),detail:c.detail,
    precision:c.precision,position:c.position,altitude:c.altitude,comments:c.comments,
    lat:c.lat,lon:c.lon,cavity:true,record:c,local:!!c.local,osm:!!c.osm,commune:c.commune||"",
    observation:!!c.local,confidenceLabel:o.confidence?confidenceLabel(o.confidence):"",season:o.season||"",
    bearing:o.bearing,distance:o.distance
  };
}
function drawCavities(g){
  if(!state.layerCavities||!state.cavities.length)return;
  const depth=currentDepth();
  for(const poi of queryNormalizedPois(g.extent,"cavity")){
    const c=poi.raw;
    if(c.local&&!state.layerObservations)continue;
    const p=coordToGrid(poi.lat,poi.lon,g.extent),m=cavityMarker(c),info=poiFeatureInfo(poi,cavityInfo(c,m));
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cavity");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",18,{kind:"anomalie souterraine proche",name:"Un repère reste à identifier",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,m.glyph,m.cls,18,info);
    const detail=semanticZoom();
    if(depth===0&&state.layerLabels&&detail.poiLabel>0)tryMapLabel(g,p,c.name||"","c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function drawUserLocation(g){
  const loc=state.userLocation;if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lon)||!inExtent(loc.lat,loc.lon,g.extent))return;
  ensureSpatialIndexes();
  const poi=spatialRuntime.normalizedPois.find(p=>p.sourceType==="location");
  const p=coordToGrid(loc.lat,loc.lon,g.extent),z=currentZoom();
  const metersPerCell=Math.max(1,((z.widthKm*1000/CONFIG.gridW)+(z.heightKm*1000/CONFIG.gridH))/2);
  const radius=clamp(Math.round((Number(loc.accuracy)||0)/metersPerCell),0,6);
  if(radius>=2){
    const points=Math.max(12,radius*8);
    for(let i=0;i<points;i++){
      const a=i/points*Math.PI*2,x=Math.round(p.x+Math.cos(a)*radius),y=Math.round(p.y+Math.sin(a)*radius);
      put(g,x,y,"·","c-user-accuracy",5,{kind:"incertitude GPS",name:`Précision approximative ± ${Math.round(loc.accuracy)} m`,source:"Géolocalisation ponctuelle du navigateur"});
    }
  }
  put(g,p.x,p.y,"⌖","c-user-position",50,poi?poiFeatureInfo(poi,{accuracy:loc.accuracy,timestamp:loc.timestamp}):{
    kind:"position actuelle",name:"Ma position",source:"Géolocalisation ponctuelle du navigateur",
    lat:loc.lat,lon:loc.lon,accuracy:loc.accuracy,timestamp:loc.timestamp
  });
}

function hashString(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function scenarioFactor(){return state.scenario==="prudent"?0.72:state.scenario==="extensive"?1.35:1}
function undergroundVisualContract(depth=currentDepth()){
  if(depth>=-3)return {base:"#101d1a",grid:"rgba(119,176,155,.055)",rock:"#172722",ground:"#172722",groundMark:"#5c7f72",fracture:"rgba(140,189,170,.18)",fractureText:"#759b8d",high:"rgba(151,122,184,.72)",med:"rgba(126,99,159,.50)",low:"rgba(100,76,126,.30)",highText:"#d9a5f8",medText:"#b579d6",lowText:"#805d91",edge:"#d5bce6",water:"#59cde6",pillar:"#e9bd78",ghost:"rgba(157,191,172,.18)"};
  if(depth>=-8)return {base:"#0d191b",grid:"rgba(112,153,176,.05)",rock:"#18252a",ground:"#18252a",groundMark:"#597682",fracture:"rgba(117,161,178,.18)",fractureText:"#6f919d",high:"rgba(137,124,190,.72)",med:"rgba(109,98,159,.50)",low:"rgba(82,73,122,.30)",highText:"#cfc2ff",medText:"#a99cdd",lowText:"#776d9f",edge:"#c4beec",water:"#58cce9",pillar:"#e8b879",ghost:"rgba(147,182,187,.17)"};
  if(depth>=-14)return {base:"#10151d",grid:"rgba(124,133,184,.05)",rock:"#1c2130",ground:"#1c2130",groundMark:"#626b91",fracture:"rgba(133,139,184,.18)",fractureText:"#747ca4",high:"rgba(130,112,184,.70)",med:"rgba(103,85,153,.48)",low:"rgba(79,64,116,.29)",highText:"#c7b5ec",medText:"#9d89c9",lowText:"#71618f",edge:"#c7b5e7",water:"#56bfdf",pillar:"#ddb079",ghost:"rgba(144,160,190,.16)"};
  if(depth>=-22)return {base:"#171418",grid:"rgba(170,130,112,.045)",rock:"#292126",ground:"#292126",groundMark:"#80665f",fracture:"rgba(178,134,118,.16)",fractureText:"#967369",high:"rgba(145,102,155,.68)",med:"rgba(113,78,126,.46)",low:"rgba(85,58,95,.28)",highText:"#d8a9d3",medText:"#aa7fa9",lowText:"#795b78",edge:"#dca9ca",water:"#4cb7d5",pillar:"#dba36f",ghost:"rgba(177,151,137,.15)"};
  return {base:"#1b1511",grid:"rgba(183,132,91,.045)",rock:"#30231d",ground:"#30231d",groundMark:"#8d6956",fracture:"rgba(190,139,96,.16)",fractureText:"#a07860",high:"rgba(157,103,128,.66)",med:"rgba(123,78,101,.44)",low:"rgba(91,57,74,.27)",highText:"#dfa9bc",medText:"#b17e93",lowText:"#7e5a68",edge:"#e2a8b3",water:"#43aac8",pillar:"#d99a65",ghost:"rgba(183,145,117,.14)"};
}
let appliedUndergroundDepth=null;
function applyUndergroundVisualContract(depth=currentDepth()){
  if(depth===0||depth===appliedUndergroundDepth)return;
  appliedUndergroundDepth=depth;const visual=undergroundVisualContract(depth),style=document.body.style;
  for(const [name,value] of Object.entries({
    "--ug-base":visual.base,"--ug-ground":visual.ground,"--ug-ground-mark":visual.groundMark,
    "--ug-fracture":visual.fractureText,"--ug-high":visual.highText,"--ug-med":visual.medText,
    "--ug-low":visual.lowText,"--ug-edge":visual.edge,"--ug-water":visual.water,
    "--ug-pillar":visual.pillar,"--ug-ghost":visual.ghost
  }))style.setProperty(name,value);
  canvasRuntime.styleCache.clear();
}
const hypothesisModelCache=new Map();
function hypothesisDepthProfile(c){
  const type=cavityType(c),measured=documentedCavityDepth(c);
  if(Number.isFinite(measured)){
    const half=type.includes("ouvrage civil")?3:type.includes("carri")?7:10;
    return {top:Math.min(-.5,measured+half),bottom:measured-half,core:measured,documented:true,basis:"profondeur fournie par la notice"};
  }
  if(type.includes("ouvrage civil")||type.includes("galerie")||type.includes("souterrain"))return {top:-1,bottom:state.scenario==="extensive"?-14:-10,core:-4,documented:false,basis:"enveloppe générique d’ouvrage peu profond"};
  if(type.includes("carri")){
    if(state.scenario==="prudent")return {top:-5,bottom:-20,core:-12,documented:false,basis:"enveloppe prudente de carrière"};
    if(state.scenario==="extensive")return {top:-3,bottom:-45,core:-18,documented:false,basis:"enveloppe extensive de carrière"};
    return {top:-4,bottom:-30,core:-14,documented:false,basis:"enveloppe générique de carrière"};
  }
  if(type.includes("nature")){
    if(state.scenario==="prudent")return {top:-3,bottom:-27,core:-13,documented:false,basis:"enveloppe prudente de cavité naturelle"};
    if(state.scenario==="extensive")return {top:-1,bottom:-50,core:-22,documented:false,basis:"enveloppe extensive de cavité naturelle"};
    return {top:-2,bottom:-40,core:-18,documented:false,basis:"enveloppe générique de cavité naturelle"};
  }
  return {top:-4,bottom:-20,core:-11,documented:false,basis:"enveloppe générique, type insuffisamment documenté"};
}
function depthStrength(c,depth){
  const p=hypothesisDepthProfile(c);
  if(depth>p.top||depth<p.bottom)return 0;
  const radius=Math.max(1,(p.top-p.bottom)/2),distance=Math.abs(depth-p.core)/radius;
  return clamp(1-distance*.55,.28,1);
}
function offsetToCoord(origin,xMeters,yMeters){return {lat:origin.lat+yMeters/111320,lon:origin.lon+xMeters/(kmPerLon(origin.lat)*1000)}}
function offsetToGrid(origin,xMeters,yMeters,extent){const c=offsetToCoord(origin,xMeters,yMeters);return coordToGrid(c.lat,c.lon,extent)}
function rotatedPoint(cx,cy,x,y,angle){const ca=Math.cos(angle),sa=Math.sin(angle);return {x:cx+x*ca-y*sa,y:cy+x*sa+y*ca}}
function rectangleWorld(cx,cy,w,h,angle){return [rotatedPoint(cx,cy,-w/2,-h/2,angle),rotatedPoint(cx,cy,w/2,-h/2,angle),rotatedPoint(cx,cy,w/2,h/2,angle),rotatedPoint(cx,cy,-w/2,h/2,angle)]}
function circleWorld(cx,cy,r,steps=18){return Array.from({length:steps},(_,i)=>{const a=i/steps*Math.PI*2;return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}})}
function hypothesisConfidence(index,total){const t=total<=1?0:index/(total-1);return t<.34?"high":t<.72?"med":"low"}
function confidenceGlyph(conf){return conf==="high"?"▓":conf==="med"?"▒":"░"}
function confidenceClass(conf){return `c-hyp-${conf}`}
function hypothesisInfo(c,kind,model){
  const profile=model.profile||hypothesisDepthProfile(c),slice=depthSliceMeta(model.depth);
  return {kind,name:c.name,source:profile.documented?"projection stable calée sur une profondeur déclarée":"projection interprétative stable · profondeur locale non mesurée",cavity:c,hypothesisModel:model.key,depthStatus:profile.documented?`profondeur de référence ${Math.abs(profile.core)} m`:`${slice.label} · ${slice.range}`,comments:`Empreinte horizontale commune aux différentes coupes. ${profile.basis}. Les variations entre niveaux correspondent au même volume vertical, pas à de nouvelles galeries générées.`};
}
function expandModelBounds(model,p){model.bounds.minX=Math.min(model.bounds.minX,p.x);model.bounds.maxX=Math.max(model.bounds.maxX,p.x);model.bounds.minY=Math.min(model.bounds.minY,p.y);model.bounds.maxY=Math.max(model.bounds.maxY,p.y)}
function finalizeHypothesisModel(model){
  model.bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(const poly of model.polygons)for(const p of poly.points)expandModelBounds(model,p);
  for(const line of model.lines)for(const p of line.points)expandModelBounds(model,p);
  for(const point of model.points)expandModelBounds(model,point);
  if(!Number.isFinite(model.bounds.minX))model.bounds={minX:-5,maxX:5,minY:-5,maxY:5};
  return model;
}
function buildQuarryModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.6,1.45),rooms=clamp(Math.round((4+rnd()*3)*sizeScale),2,9),mainAngle=rnd()*Math.PI*2;
  let cx=0,cy=0,previous={x:0,y:0};
  for(let i=0;i<rooms;i++){
    const conf=hypothesisConfidence(i,rooms),roomAngle=mainAngle+(rnd()-.5)*.30;
    if(i>0){const advance=(24+rnd()*22)*sizeScale,drift=(rnd()-.5)*16*sizeScale;cx+=Math.cos(mainAngle)*advance-Math.sin(mainAngle)*drift;cy+=Math.sin(mainAngle)*advance+Math.cos(mainAngle)*drift;model.lines.push({points:[previous,{x:cx,y:cy}],glyph:"=",conf:"med",kind:"galerie de liaison"})}
    const w=(22+rnd()*30)*sizeScale,h=(11+rnd()*17)*sizeScale;
    model.polygons.push({points:rectangleWorld(cx,cy,w,h,roomAngle),conf,kind:"salle de carrière extrapolée",edge:"#"});
    if(w>27&&h>15){const cols=Math.max(1,Math.floor(w/15)),rows=Math.max(1,Math.floor(h/11));for(let ix=1;ix<=cols;ix++)for(let iy=1;iy<=rows;iy++){const lx=-w/2+ix*w/(cols+1),ly=-h/2+iy*h/(rows+1),pillar=rotatedPoint(cx,cy,lx,ly,roomAngle);model.points.push({...pillar,glyph:"O",conf:"high",kind:"pilier supposé"})}}
    previous={x:cx,y:cy};
  }
  if(state.scenario!=="prudent"){const spurAngle=mainAngle+(rnd()<.5?-1:1)*(.45+rnd()*.55),len=(45+rnd()*75)*sizeScale;model.lines.push({points:[previous,{x:previous.x+Math.cos(spurAngle)*len,y:previous.y+Math.sin(spurAngle)*len}],glyph:"·",conf:"low",kind:"prolongement très incertain",dashed:true})}
}
function buildNaturalModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.6,1.5),segments=clamp(Math.round((24+rnd()*18)*sizeScale),14,64);let angle=rnd()*Math.PI*2,x=0,y=0;
  for(let i=0;i<segments;i++){if(rnd()<.32)angle+=(rnd()-.5)*1.15;else angle+=(rnd()-.5)*.24;const step=(5+rnd()*5)*sizeScale,next={x:x+Math.cos(angle)*step,y:y+Math.sin(angle)*step},conf=hypothesisConfidence(i,segments);model.lines.push({points:[{x,y},next],glyph:confidenceGlyph(conf),conf,kind:"conduit naturel extrapolé"});x=next.x;y=next.y;if(rnd()<.11){const radius=(6+rnd()*10)*sizeScale;model.polygons.push({points:circleWorld(x,y,radius,18),conf:"med",kind:"élargissement naturel supposé",edge:"·"})}}
  if(state.layerHydrology){const waterAngle=angle+(rnd()-.5)*.5,len=(40+rnd()*55)*sizeScale;model.lines.push({points:[{x,y},{x:x+Math.cos(waterAngle)*len,y:y+Math.sin(waterAngle)*len}],glyph:"≈",conf:"low",kind:"écoulement souterrain supposé",water:true})}
}
function buildCivilModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.65,1.45),angle=rnd()*Math.PI*2,length=(75+rnd()*135)*sizeScale,end={x:Math.cos(angle)*length,y:Math.sin(angle)*length};model.lines.push({points:[{x:0,y:0},end],glyph:"=",conf:"high",kind:"ouvrage linéaire extrapolé"});
  if(state.scenario!=="prudent"){const branchAt=.35+rnd()*.35,base={x:end.x*branchAt,y:end.y*branchAt},branchAngle=angle+(rnd()<.5?-1:1)*(.65+rnd()*.55),branchLength=(35+rnd()*70)*sizeScale;model.lines.push({points:[base,{x:base.x+Math.cos(branchAngle)*branchLength,y:base.y+Math.sin(branchAngle)*branchLength}],glyph:"·",conf:"low",kind:"branche secondaire supposée",dashed:true})}
}
function assignVerticalEnvelope(model,c,rnd){
  const profile=model.profile,type=cavityType(c),nominalHalf=profile.documented?Math.max(2,(profile.top-profile.bottom)/2):type.includes("ouvrage civil")?4:type.includes("carri")?9:16;
  for(const item of [...model.polygons,...model.lines,...model.points]){
    const confFactor=item.conf==="low"?.72:item.conf==="med"?.9:1,waterShift=item.water?-8:0,center=clamp(profile.core+waterShift+(rnd()-.5)*(type.includes("nature")?5:2.5),profile.bottom+1,profile.top-1),half=Math.max(2,nominalHalf*confFactor*(item.water?.8:1));
    item.zTop=Math.min(profile.top,center+half);item.zBottom=Math.max(profile.bottom,center-half);
    if(item.water){item.zTop=Math.min(item.zTop,-18);item.zBottom=Math.max(profile.bottom,Math.min(item.zBottom,-45))}
  }
}
function getHypothesisMaster(c){
  const profile=hypothesisDepthProfile(c),key=`master:${c.id}:${state.scenario}:${state.layerHydrology?1:0}`;
  if(hypothesisModelCache.has(key))return hypothesisModelCache.get(key);
  const rnd=mulberry32(hashString(key)),scale=scenarioFactor(),model={key,depth:null,scale,profile,polygons:[],lines:[],points:[],bounds:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}},type=cavityType(c);
  if(type.includes("carri"))buildQuarryModel(model,c,rnd,scale);else if(type.includes("ouvrage civil")||type.includes("galerie")||type.includes("souterrain"))buildCivilModel(model,c,rnd,scale);else buildNaturalModel(model,c,rnd,scale);
  assignVerticalEnvelope(model,c,rnd);finalizeHypothesisModel(model);hypothesisModelCache.set(key,model);return model;
}
function getHypothesisModel(c,depth){
  if(!depthStrength(c,depth))return null;
  const master=getHypothesisMaster(c),key=`slice:${master.key}:${depth}`;
  if(hypothesisModelCache.has(key))return hypothesisModelCache.get(key);
  const visible=item=>depth<=item.zTop&&depth>=item.zBottom,model={key,depth,scale:master.scale,profile:master.profile,polygons:master.polygons.filter(visible),lines:master.lines.filter(visible),points:master.points.filter(visible),bounds:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}};
  if(!model.polygons.length&&!model.lines.length&&!model.points.length)return null;
  finalizeHypothesisModel(model);hypothesisModelCache.set(key,model);return model;
}
function hypothesisModelIntersects(c,model,e){
  const sw=offsetToCoord(c,model.bounds.minX,model.bounds.minY);
  const ne=offsetToCoord(c,model.bounds.maxX,model.bounds.maxY);
  return !(ne.lon<e.west||sw.lon>e.east||ne.lat<e.south||sw.lat>e.north);
}
function expandExtentMeters(e,meters){
  const centerLat=(e.south+e.north)/2,latPad=meters/111320;
  const lonPad=meters/(Math.max(.08,kmPerLon(centerLat))*1000);
  return {west:e.west-lonPad,east:e.east+lonPad,south:e.south-latPad,north:e.north+latPad};
}
function hypothesisOriginSearchPaddingMeters(){
  // Borne supérieure prudente des modèles générés : conduit naturel maximal,
  // prolongement hydrologique compris. Le filtre exact par emprise intervient ensuite.
  const scale=clamp(scenarioFactor(),.6,1.5);
  return Math.ceil(100+64*10*scale+140*scale);
}
function visibleHypothesisPois(extent){
  const searchExtent=expandExtentMeters(extent,hypothesisOriginSearchPaddingMeters());
  return queryNormalizedPois(searchExtent,"cavity").sort((a,b)=>String(a.uid).localeCompare(String(b.uid)));
}
function segmentIntersectsExtent(a,b,e){
  if(inExtent(a.lat,a.lon,e)||inExtent(b.lat,b.lon,e))return true;
  let t0=0,t1=1;const dx=b.lon-a.lon,dy=b.lat-a.lat;
  for(const [p,q] of [[-dx,a.lon-e.west],[dx,e.east-a.lon],[-dy,a.lat-e.south],[dy,e.north-a.lat]]){
    if(p===0){if(q<0)return false;continue}
    const r=q/p;
    if(p<0){if(r>t1)return false;t0=Math.max(t0,r)}else{if(r<t0)return false;t1=Math.min(t1,r)}
  }
  return true;
}
function drawWorldLine(g,c,line,info){
  const pts=line.points.map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  const cls=line.water?"c-water-underground c-underground-line":`${confidenceClass(line.conf)} c-underground-line${line.dashed?" c-underground-dashed":""}`;
  if(line.dashed){
    for(let i=1;i<pts.length;i++){
      let n=0;
      bresenham(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,(x,y)=>{
        if(n++%2===0)put(g,x,y,line.glyph,cls,12,info,line.conf);
      });
    }
  }else{
    lineDraw(g,pts,line.glyph,cls,12,info,1);
    for(const p of pts)put(g,p.x,p.y,line.glyph,cls,12,info,line.conf);
  }
}
function drawWorldPolygon(g,c,poly,info){
  const pts=poly.points.map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
  const minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
  const cls=`${confidenceClass(poly.conf)} c-underground-volume`,glyph=confidenceGlyph(poly.conf);
  if(maxX-minX<1&&maxY-minY<1){
    const center=offsetToGrid(c,
      poly.points.reduce((s,p)=>s+p.x,0)/poly.points.length,
      poly.points.reduce((s,p)=>s+p.y,0)/poly.points.length,
      g.extent
    );
    put(g,center.x,center.y,glyph,cls,12,info,poly.conf);
    return;
  }
  polygonFill(g,pts,glyph,cls,11,info);
  lineDraw(g,[...pts,pts[0]],poly.edge||"#","c-wall c-underground-edge",13,info,1);
}
function undergroundModelGridSpan(g,c,model){
  const corners=[
    {x:model.bounds.minX,y:model.bounds.minY},{x:model.bounds.maxX,y:model.bounds.minY},
    {x:model.bounds.maxX,y:model.bounds.maxY},{x:model.bounds.minX,y:model.bounds.maxY}
  ].map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  return {
    width:Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),
    height:Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y))
  };
}
function drawHypothesisModel(g,c,model){
  const generic=hypothesisInfo(c,"réseau souterrain extrapolé",model);
  const span=undergroundModelGridSpan(g,c,model);
  if(Math.max(span.width,span.height)<3){
    const p=offsetToGrid(c,0,0,g.extent);
    put(g,p.x,p.y,"◇","c-underground-locator c-hyp-low",14,{...generic,kind:"emprise souterraine simplifiée à cette échelle"},"low");
    return;
  }
  for(const poly of model.polygons){
    drawWorldPolygon(g,c,poly,{...generic,kind:poly.kind});
  }
  for(const line of model.lines){
    drawWorldLine(g,c,line,{...generic,kind:line.kind});
  }
  for(const point of model.points){
    const p=offsetToGrid(c,point.x,point.y,g.extent);
    put(g,p.x,p.y,point.glyph||"O","c-pillar c-underground-pillar",15,{...generic,kind:point.kind},point.conf);
  }
}
function drawHypotheses(g){
  const depth=currentDepth();
  // Aux deux échelles les plus lointaines, une galerie de quelques dizaines de
  // mètres tient dans moins d'une cellule. Les repères documentés suffisent :
  // inventer une empreinte agrandie nuirait à la lecture et au coût du rendu.
  if(depth===0||state.zoomIndex<=1||!state.layerHypothesis||!state.cavities.length)return;
  for(const poi of visibleHypothesisPois(g.extent)){
    const c=poi.raw;
    if(c.local&&!state.layerObservations)continue;
    const marker=cavityMarker(c),info=poiFeatureInfo(poi,cavityInfo(c,marker));
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cavity");
    if(visibility!=="known")continue;
    const model=getHypothesisModel(c,depth);
    if(!model||!hypothesisModelIntersects(c,model,g.extent))continue;
    drawHypothesisModel(g,c,model);
  }
  if(state.scenario==="extensive")drawPossibleConnections(g);
}
function drawPossibleConnections(g){
  const depth=currentDepth(),searchExtent=expandExtentMeters(g.extent,760);
  const candidates=queryNormalizedPois(searchExtent,"cavity").map(p=>p.raw).filter(c=>{
    if(!cavityType(c).includes("carri"))return false;
    if(!depthStrength(c,depth))return false;
    return true;
  }).sort((a,b)=>String(a.id||cavityName(a)).localeCompare(String(b.id||cavityName(b))));
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const a=candidates[i],b=candidates[j];
    const distance=distanceMeters(a,b);
    if(distance<140||distance>720)continue;
    if(!segmentIntersectsExtent(a,b,g.extent))continue;
    const pa=coordToGrid(a.lat,a.lon,g.extent),pb=coordToGrid(b.lat,b.lon,g.extent);
    const confidence=distance<300?"med":"low";
    const info={kind:"connexion possible entre exploitations",name:`${cavityName(a)} ↔ ${cavityName(b)}`,source:`connexion interprétative dans la coupe ${depthSliceLabel(depth)} · aucune continuité attestée`,confidenceLabel:confidence==="med"?"moyenne":"faible"};
    let n=0;bresenham(pa.x,pa.y,pb.x,pb.y,(x,y)=>{if(n++%3===0)put(g,x,y,"·",`${confidence==="med"?"c-hyp-med":"c-hyp-low"} c-underground-line c-underground-dashed`,9,info,confidence)});
  }
}

function renderUndergroundSurfaceGhost(g){
  const extent=g.extent,detail=semanticZoom(),features=state.osm?queryOsmFeatures(extent):[];
  for(const feature of features){
    const tags=feature.tags||{},coords=feature.coords||[];if(coords.length<2)continue;
    const points=coords.map(([lon,lat])=>coordToGrid(lat,lon,extent));
    const majorRoad=["motorway","trunk","primary","secondary"].includes(tags.highway);
    const namedRoad=state.zoomIndex>=3&&tags.highway&&String(tags.name||tags.ref||"").trim();
    const majorWater=["river","canal"].includes(tags.waterway);
    if(majorRoad||namedRoad||majorWater){
      lineDraw(g,points,"·","c-ghost c-underground-ghost",2,{kind:"projection fantôme de la surface",source:"axe principal OpenStreetMap"},1);
      continue;
    }
    if(state.zoomIndex>=4&&tags.building&&detail.osmBuildings&&feature.closed){
      lineDraw(g,[...points,points[0]],"·","c-ghost c-underground-ghost",2,{kind:"projection fantôme du bâti",source:"OpenStreetMap"},1);
    }
  }
  if(state.zoomIndex>=4&&state.layerCadastreBuildings&&detail.cadastreBuildings){
    for(const indexed of queryCadastreFeatures(extent,"building")){
      const points=indexed.feature.coords.map(([lon,lat])=>coordToGrid(lat,lon,extent));
      lineDraw(g,[...points,points[0]],"·","c-ghost c-underground-ghost",2,{kind:"projection fantôme du bâti",source:"Cadastre Etalab / DGFiP"},1);
    }
  }
}

function renderUndergroundBase(g){
  const depth=currentDepth();if(depth===0)return;
  const baseCls=depth===-3?"c-soil":"c-rock";
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const texture=(x*17+y*31+Math.abs(depth)*13)%17===0;
    const fracture=depth<=-8&&(x*37+y*19+Math.abs(depth)*11)%97===0;
    put(g,x,y,fracture?"╱":texture?"·":" ",`${fracture?"c-fracture":baseCls} c-underground-base`,1,{kind:depth===-3?"sol et remblais schématiques":"substrat rocheux schématique",source:`fond de coupe ${depthSliceLabel(depth)} · modèle visuel, pas une carte géologique ni un sondage`});
  }
  if(state.layerSurface)renderUndergroundSurfaceGhost(g);
}

function composeMapGrid(extent,depth=currentDepth()){
  const gridStarted=performance.now();
  const grid=createGrid(extent);
  const gridMs=performance.now()-gridStarted;
  const layersStarted=performance.now();
  if(depth===0){
    if(state.layerSurface)renderSurface(grid);
    applyRelief(grid);
    drawBss(grid);
    drawObservations(grid);
    drawHeritage(grid);
    drawLore(grid);
    drawCavities(grid);
    drawCartofriches(grid);
    drawOfflineDemoPoints(grid);
    drawUserLocation(grid);
  }else{
    renderUndergroundBase(grid);
    drawHypotheses(grid);
    drawBss(grid);
    drawCavities(grid);
    drawUserLocation(grid);
  }
  return {grid,gridMs,layersMs:performance.now()-layersStarted};
}
