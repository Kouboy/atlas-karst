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
        source:"BRGM · BSS Charente, regroupement visuel à cette échelle",
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
  }else if(state.zoomIndex===3 && (OFFLINE_TEST || (Math.abs(state.center.lat-CONFIG.house.lat)<.002 && Math.abs(state.center.lon-CONFIG.house.lon)<.003))){
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
    put(g,p.x,p.y,"@","c-house",24,housePoi?poiFeatureInfo(housePoi,{kind:"maison",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""}):{kind:"maison",name:"42 rue de la Falaise",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""});
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
function drawWorldLine(g,c,line,info){
  const pts=line.points.map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  const cls=line.water?"c-water-underground":confidenceClass(line.conf);
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
  const cls=confidenceClass(poly.conf),glyph=confidenceGlyph(poly.conf);
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
  lineDraw(g,[...pts,pts[0]],poly.edge||"#","c-wall",13,info,1);
}
function drawHypothesisModel(g,c,model){
  const generic=hypothesisInfo(c,"réseau souterrain extrapolé",model);
  for(const poly of model.polygons){
    drawWorldPolygon(g,c,poly,{...generic,kind:poly.kind});
  }
  for(const line of model.lines){
    drawWorldLine(g,c,line,{...generic,kind:line.kind});
  }
  for(const point of model.points){
    const p=offsetToGrid(c,point.x,point.y,g.extent);
    put(g,p.x,p.y,point.glyph||"O","c-pillar",15,{...generic,kind:point.kind},point.conf);
  }

  // At very coarse scales, draw the bounds of the same model if every detail
  // collapses into too few cells. This is a simplification of the same geometry,
  // not a second hypothesis.
  if(state.zoomIndex<=1){
    const corners=[
      {x:model.bounds.minX,y:model.bounds.minY},
      {x:model.bounds.maxX,y:model.bounds.minY},
      {x:model.bounds.maxX,y:model.bounds.maxY},
      {x:model.bounds.minX,y:model.bounds.maxY}
    ].map(p=>offsetToGrid(c,p.x,p.y,g.extent));
    const w=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x));
    const h=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));
    if(w>=2||h>=2)lineDraw(g,[...corners,corners[0]],"░","c-hyp-low",10,{...generic,kind:"emprise simplifiée du même modèle"},1);
  }
}
function drawHypotheses(g){
  const depth=currentDepth();
  if(depth===0||!state.layerHypothesis||!state.cavities.length)return;
  const searchExtent=expandExtentBox(g.extent,1.7);
  for(const poi of queryNormalizedPois(searchExtent,"cavity")){
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
  const depth=currentDepth(),searchExtent=expandExtentBox(g.extent,2.1);
  const candidates=queryNormalizedPois(searchExtent,"cavity").map(p=>p.raw).filter(c=>{
    if(!cavityType(c).includes("carri"))return false;
    if(!depthStrength(c,depth))return false;
    return true;
  });
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const a=candidates[i],b=candidates[j];
    const distance=distanceMeters(a,b);
    if(distance<140||distance>720)continue;
    const pa=coordToGrid(a.lat,a.lon,g.extent),pb=coordToGrid(b.lat,b.lon,g.extent);
    const bothOutside=(
      (pa.x<0||pa.y<0||pa.x>=CONFIG.gridW||pa.y>=CONFIG.gridH)&&
      (pb.x<0||pb.y<0||pb.x>=CONFIG.gridW||pb.y>=CONFIG.gridH)
    );
    if(bothOutside)continue;
    const confidence=distance<300?"med":"low";
    const info={kind:"connexion possible entre exploitations",name:`${cavityName(a)} ↔ ${cavityName(b)}`,source:`connexion interprétative dans la coupe ${depthSliceLabel(depth)} · aucune continuité attestée`,confidenceLabel:confidence==="med"?"moyenne":"faible"};
    let n=0;bresenham(pa.x,pa.y,pb.x,pb.y,(x,y)=>{if(n++%3===0)put(g,x,y,"·",confidence==="med"?"c-hyp-med":"c-hyp-low",9,info,confidence)});
  }
}

function renderUndergroundBase(g){
  const depth=currentDepth();if(depth===0)return;
  const baseChar=depth===-3?":":"%";
  const baseCls=depth===-3?"c-soil":"c-rock";
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const noise=((x*17+y*31+Math.abs(depth)*13)%29===0);
    put(g,x,y,noise&&depth<=-8?":":baseChar,noise?"c-fracture":baseCls,1,{kind:depth===-3?"sol et remblais schématiques":"substrat rocheux schématique",source:`fond de coupe ${depthSliceLabel(depth)} · modèle visuel, pas une carte géologique ni un sondage`});
  }
  if(state.layerSurface){
    const ghost=createGrid(g.extent);renderSurface(ghost);
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const c=ghost.grid[y][x];
      if(c.priority>=7&&((x+y)%3===0))put(g,x,y,c.ch,"c-ghost",2,{kind:"projection fantôme de la surface",source:c.feature?.source||"surface"});
    }
  }
}

let depthTransitionTimer=0;
function playDepthTransition(direction){
  if(!ambientAllowed()||!els.depthTransition)return;
  clearTimeout(depthTransitionTimer);
  els.depthTransition.className=`depth-transition ${direction}`;
  void els.depthTransition.offsetWidth;
  els.depthTransition.classList.add("active");
  depthTransitionTimer=setTimeout(()=>{els.depthTransition.className="depth-transition"},700);
}
function pulseCard(card){
  if(!ambientAllowed()||!card)return;
  card.classList.remove("card-awake");void card.offsetWidth;card.classList.add("card-awake");
  setTimeout(()=>card.classList.remove("card-awake"),430);
}
function poiEffectKind(cell){
  if(!ambientAllowed()||!cell)return "";
  const cls=String(cell.cls||""),f=cell.feature||{};
  if(cls.includes("c-label"))return "";
  if(f.poiCategory)return f.poiCategory;
  if(cls.includes("c-user-position"))return "location";
  if(cls.includes("c-house")||cls.includes("c-address"))return "home";
  if(cls.includes("c-bss")||cls.includes("c-piezo"))return "bss";
  if(cls.includes("c-heritage"))return "heritage";
  if(cls.includes("c-carto")||cls.includes("c-lore-friche")||cls.includes("c-lore-abandoned"))return "industrial";
  if(cls.includes("c-observation")||cls.includes("c-lore")||cls.includes("c-sight")||cls.includes("c-zone"))return "memory";
  if((cls.includes("c-doc")||cls.includes("c-pillar"))&&selectableFeature(cell))return f.cavity?"cavity":"natural";
  if(cls.includes("c-demo")||cls.includes("c-explorer-hint"))return "natural";
  return "";
}

let scheduledRenderFrame=0,scheduledRenderReason="";
function scheduleRender(reason="scheduled"){
  scheduledRenderReason=reason;
  if(scheduledRenderFrame)return;
  scheduledRenderFrame=requestAnimationFrame(()=>{scheduledRenderFrame=0;const why=scheduledRenderReason;scheduledRenderReason="";render(why)});
}
function render(reason="direct"){
  const renderStarted=performance.now();
  hideHover();
  if(debugState.enabled)debugState.lastReason=reason;
  if(!drag)clearPanPreview();
  const responsiveMain=document.querySelector("main");
  if(responsiveMain)applyResponsiveGridProfile(responsiveMain);
  const z=currentZoom(),depth=currentDepth(),extent=extentFor();
  spatialRuntime.lastQueryCandidates=0;spatialRuntime.lastQueryResults=0;ensureSpatialIndexes();
  const g=createGrid(extent);
  document.body.dataset.depthBand=depth===0?"surface":depth>=-5?"shallow":depth>=-15?"middle":"deep";
  if(depth===0){
    if(state.layerSurface)renderSurface(g);
    applyRelief(g);
    drawBss(g);
    drawObservations(g);
    drawHeritage(g);
    drawLore(g);
    drawCavities(g);
    drawCartofriches(g);
    drawOfflineDemoPoints(g);
    drawUserLocation(g);
  }else{
    renderUndergroundBase(g);
    drawHypotheses(g);
    drawBss(g);
    drawCavities(g);
    drawUserLocation(g);
  }
  state.lastGrid=g;
  let visiblePoiCount=0;
  if(CANVAS_RENDERER){
    visiblePoiCount=drawCanvasMap(g,reason);
    els.map.textContent="";
  }else{
    let out="";
    for(let y=0;y<CONFIG.gridH;y++){
      for(let x=0;x<CONFIG.gridW;x++){
        const c=g.grid[y][x],shade=state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
        const attrs=`data-x="${x}" data-y="${y}"`,glyph=c.ch;
        const poiKind=poiEffectKind(c),poiClass=poiKind?` poi-fx poi-${poiKind}`:"";
        if(poiKind)visiblePoiCount++;
        const poiStyle=poiKind?` style="--poi-phase:${Math.abs((x+1)*7+(y+1)*11)%7}"`:"";
        out+=`<span class="cell ${c.cls||""}${shade}${poiClass}" ${attrs}${poiStyle}>${esc(glyph)}</span>`;
      }
      out+="\n";
    }
    els.map.innerHTML=out;
  }
  syncSelectionDom();
  if(pendingPoiFeedback)requestAnimationFrame(applyPendingPoiSelectionFeedback);
  updateSelectionAssist();
  scheduleOsmEnsure();
  if(els.locationBadge){
    const loc=state.userLocation;
    els.locationBadge.textContent=state.locationLoading?"recherche…":loc?`± ${Math.round(loc.accuracy||0)} m`:"non localisée";
  }
  els.mapTip.textContent=coarsePointer()?`pause 0,3 s = détail · toucher = sélectionner · glisser = déplacement · ⌖ = position${CANVAS_RENDERER?" · Canvas":""}`:`pause 0,3 s = détail · clic = sélectionner · glisser = déplacement · molette = zoom${CANVAS_RENDERER?" · Canvas":""}`;
  els.zoomLabel.textContent=z.label;
  els.depthLabel.textContent=depthSliceLabel(depth);
  const cellX=z.widthKm*1000/CONFIG.gridW,cellY=z.heightKm*1000/CONFIG.gridH;
  els.cellSizeLabel.textContent=`≈ ${Math.round((cellX+cellY)/2)} m`;
  els.centerLabel.textContent=`${state.center.lat.toFixed(5)} / ${state.center.lon.toFixed(5)}`;
  updateRenderModeControls();
  const renderSuffix=effectiveRenderMode()==="symbolic"?" · symbolique":" · ASCII";
  els.truthBadge.textContent=(depth===0?(state.cadastreBuildings.length&&semanticZoom().cadastreBuildings?"surface OSM + cadastre":state.osm?"surface OSM vectorielle":state.zoomIndex===3?(OFFLINE_TEST?"surface locale embarquée":"surface de secours V0.1"):"surface en attente"):`coupe interprétative · ${depthSliceMeta(depth).range}`)+renderSuffix;
  els.zoomHelp.textContent=`Fenêtre ≈ ${z.widthKm.toLocaleString("fr-FR")} × ${z.heightKm.toLocaleString("fr-FR")} km · une case ≈ ${Math.round(cellX)} × ${Math.round(cellY)} m · détail affiché : ${semanticZoom().summary}.`;
  document.querySelectorAll("[data-zoom]").forEach(b=>b.classList.toggle("active",+b.dataset.zoom===state.zoomIndex));
  document.querySelectorAll("[data-depth]").forEach(b=>b.classList.toggle("active",+b.dataset.depth===depth));
  els.zoomOut.disabled=state.zoomIndex===0;els.zoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.mapZoomOut.disabled=state.zoomIndex===0;els.mapZoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.depthUp.disabled=state.depthIndex===0;els.depthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  els.mapDepthUp.disabled=state.depthIndex===0;els.mapDepthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  updateSnapshotUI();
  const renderElapsed=performance.now()-renderStarted;
  debugState.renderCount++;debugState.lastRenderMs=renderElapsed;debugState.totalRenderMs+=renderElapsed;
  debugState.maxRenderMs=Math.max(debugState.maxRenderMs,renderElapsed);debugState.lastPoiCount=visiblePoiCount;
  updateDebugPanel();
  requestAnimationFrame(()=>{alignRenderedCenterToVisibleViewport();syncSelectionDom();updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker()});
  updateSidebarClusterStatus();
  updateAroundMe();
  updateGuidedTourUI();
  scheduleFrameFit();
}


function setCollapsibleState(container,collapsed,selector){
  if(!container)return;
  container.classList.toggle("collapsed",!!collapsed);
  const trigger=selector?container.querySelector(selector):container.querySelector(":scope > h2, :scope > .sidebar-cluster-head");
  if(trigger)trigger.setAttribute("aria-expanded",String(!collapsed));
}
function prepareReadoutSections(){
  if(!els.readoutBody)return;
  const collapsedByDefault=new Set(["À proximité","Lieux en relation","Données techniques et sources"]);
  for(const sec of els.readoutBody.querySelectorAll('.cell-section')){
    if(sec.dataset.foldableReady)continue;
    const heading=sec.querySelector(':scope > h3');
    if(!heading)continue;
    const title=(heading.textContent||'').trim();
    const body=document.createElement('div');
    body.className='cell-section-body';
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    sec.appendChild(body);
    sec.dataset.foldableReady='1';
    sec.classList.add('is-foldable');
    const collapsed=collapsedByDefault.has(title);
    sec.classList.toggle('collapsed',collapsed);
    heading.setAttribute('role','button');
    heading.setAttribute('tabindex','0');
    heading.setAttribute('aria-expanded',String(!collapsed));
    const toggle=()=>{
      const next=!sec.classList.contains('collapsed');
      sec.classList.toggle('collapsed',next);
      heading.setAttribute('aria-expanded',String(!next));
      retroAudio.play(next?'panelClose':'panelOpen');
    };
    heading.addEventListener('click',toggle);
    heading.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  }
}

function classifyAtlasControls(){
  const danger=/clear|remove|delete|reset|vider|supprimer|oublier|quitter/i;
  const sync=/sync|retry|reload|refresh|geocode|charger|actualiser|tester/i;
  const primary=/locate|observe|start|apply|add|import|exportStandalone|recenter|home/i;
  const nav=/zoom|depth|pan|prev|next|center|mapHome|mapLocate/i;
  for(const button of document.querySelectorAll('button')){
    button.classList.remove('action-primary','action-sync','action-danger','action-nav','action-subtle');
    const token=`${button.id} ${button.textContent}`;
    if(danger.test(token))button.classList.add('action-danger');
    else if(sync.test(token))button.classList.add('action-sync');
    else if(nav.test(token))button.classList.add('action-nav');
    else if(primary.test(token))button.classList.add('action-primary');
    else button.classList.add('action-subtle');
  }
}
function updateSidebarClusterStatus(){
  if(!els.sidebar?.dataset.clustered)return;
  const set=(code,text,live=false)=>{
    const el=els.sidebar.querySelector(`[data-cluster-status="${code}"]`);if(!el)return;
    el.textContent=text;el.classList.toggle('is-live',!!live);
  };
  const z=CONFIG.zooms?.[state.zoomIndex];
  set('01',state.userLocation?`GPS ±${Math.round(state.userLocation.accuracy||0)} m`:`${z?.label||'carte'} · surface`,!!state.userLocation);
  const layerInputs=[...els.sidebar.querySelectorAll('#layerSurface,#layerRelief,#layerCadastreBuildings,#layerParcels,#layerBss,#layerObservations,#layerHeritage,#layerLore,#layerCartofriches,#layerCavities,#layerHypothesis,#layerHydrology,#layerLabels,#layerHouse')];
  const active=layerInputs.filter(v=>v.checked).length;set('02',`${active}/${layerInputs.length} actifs`,active>0);
  const codex=typeof encounterCollectionStats==='function'?encounterCollectionStats().identified:0;
  const notes=(state.observations?.length||0)+(state.loreItems?.length||0);
  set('03',`${notes} notes · ${codex} fiches`,notes+codex>0);
  const sourceIds=['osmStatus','addressStatus','cadastreStatus','cavityStatus','cartofrichesStatus','heritageStatus','bssStatus','elevationStatus'];
  const statuses=sourceIds.map(id=>els[id]).filter(Boolean),ok=statuses.filter(v=>v.classList.contains('ok')).length;
  set('04',`${ok}/${statuses.length} prêtes`,ok>0);
}
function documentarySignalProfile(cell){
  const f=cell?.feature||{},p=evidenceProfile(cell);let level=1,label='contexte',color='#77a9bc';
  if(f.heritage||f.bss||f.cavity||f.cartofriches||f.source){level=4;label='source documentée';color='#79e2ab'}
  if(f.observation||f.lore){level=Math.max(level,2);label='trace locale';color='#d895b8'}
  if(currentDepth()<0||p.hypothesis){level=Math.min(level,2);label='coupe interprétative';color='#ad8bd1'}
  if(p.documented&&p.observed){level=Math.max(level,4);label='sources croisées';color='#e8bd64'}
  return {level,label,color};
}
function documentarySignalHtml(cell){
  const s=documentarySignalProfile(cell),bars=Array.from({length:5},(_,i)=>`<i class="${i<s.level?'on':''}"></i>`).join('');
  return `<div class="documentary-signal" style="--signal-color:${s.color}"><span>assise documentaire</span><span class="documentary-signal-track" aria-label="${s.level} niveaux sur 5">${bars}</span><strong>${esc(s.label)}</strong></div>`;
}

function buildSidebarClusters(){
  if(!els.sidebar||els.sidebar.dataset.clustered==='1')return;
  const cards=[...els.sidebar.querySelectorAll(':scope > .card')];
  const byTitle=new Map(cards.map(card=>[(card.querySelector(':scope > h2')?.textContent||'').trim(),card]));
  const groups=[
    {code:'01',title:'Exploration',icon:'⌖',meta:'se déplacer · se situer · enquêter',open:true,cards:['Ma position','Autour de moi','Rencontres locales','Parcours guidés','Échelle géographique','Profondeur','Navigation géographique','Aller à une cavité']},
    {code:'02',title:'Calques & lecture',icon:'▦',meta:'composer la carte · lire ses signes',open:true,cards:['Couches','Légende lisible']},
    {code:'03',title:'Carnet local',icon:'◎',meta:'mémoriser · observer · annoter',open:false,cards:['Mémoire de l’Atlas','Observations de terrain','Repères patrimoine & mystère']},
    {code:'04',title:'Sources & synchronisation',icon:'↻',meta:'charger · vérifier · archiver',open:false,cards:['Données','Patrimoine & curiosités synchronisés','Cartofriches · Cerema','Forages BSS & piézomètres','Diagnostic']}
  ];
  const frag=document.createDocumentFragment();
  for(const group of groups){
    const cluster=document.createElement('section');
    cluster.className='sidebar-cluster collapsible'+(group.open?'':' collapsed');
    cluster.dataset.group=group.title.toLowerCase();
    cluster.innerHTML=`<div class="sidebar-cluster-head" role="button" tabindex="0" aria-expanded="${group.open?'true':'false'}"><div style="min-width:0;flex:1"><h2><span class="cluster-code">[${group.code}]</span>${group.title}<span class="cluster-status" data-cluster-status="${group.code}">veille</span></h2><div class="cluster-meta">${group.meta}</div></div></div><div class="sidebar-cluster-body"></div>`;
    const body=cluster.querySelector('.sidebar-cluster-body');
    for(const title of group.cards){const card=byTitle.get(title); if(card) body.appendChild(card);}
    const head=cluster.querySelector('.sidebar-cluster-head');
    const toggle=()=>{const next=!cluster.classList.contains('collapsed');setCollapsibleState(cluster,next,'.sidebar-cluster-head');retroAudio.play(next?'panelClose':'panelOpen');scheduleFrameFit()};
    head.addEventListener('click',toggle);
    head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    frag.appendChild(cluster);
  }
  const notice=els.sidebar.querySelector('#offlineNotice'); if(notice)frag.appendChild(notice);
  const warning=els.sidebar.querySelector('.warning'); if(warning)frag.appendChild(warning);
  els.sidebar.appendChild(frag);
  els.sidebar.dataset.clustered='1';
  classifyAtlasControls();
  updateSidebarClusterStatus();
}

function prepareSidebarCards(){
  const panelMeta={
    "Mode d’utilisation":["navigation","◈"],"Autour de moi":["navigation","⌖"],"Échelle géographique":["navigation","⌗"],"Profondeur":["navigation","⇅"],"Couches":["layers","▦"],"Navigation géographique":["navigation","⌖"],
    "Mémoire de l’Atlas":["memory","◫"],"Aller à une cavité":["navigation","⌁"],"Observations de terrain":["field","◎"],"Repères patrimoine & mystère":["field","◇"],
    "Cartofriches · Cerema":["sources","F"],"Patrimoine & curiosités synchronisés":["sources","P"],"Forages BSS & piézomètres":["sources","B"],"Données":["sources","↻"],"Diagnostic":["sources","⚙"],"Légende lisible":["layers","?"],"Provenance des données":["sources","§"]
  };
  const openByDefault=new Set([
    "Ma position","Autour de moi","Rencontres locales","Parcours guidés","Échelle géographique","Profondeur","Couches","Données"
  ]);
  for(const card of els.sidebar.querySelectorAll(":scope > .card")){
    if(card.classList.contains("warning")||card.id==="offlineNotice"||card.classList.contains("collapsible"))continue;
    const heading=card.querySelector(":scope > h2");
    if(!heading)continue;
    const meta=panelMeta[heading.textContent.trim()]||["navigation","•"];
    card.dataset.panelKind=meta[0];heading.dataset.icon=meta[1];
    const body=document.createElement("div");
    body.className="card-body";
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    card.appendChild(body);
    card.classList.add("collapsible");
    const title=heading.textContent.trim();
    const collapsed=!openByDefault.has(title);
    card.classList.toggle("collapsed",collapsed);
    heading.setAttribute("role","button");
    heading.setAttribute("tabindex","0");
    heading.setAttribute("aria-expanded",String(!collapsed));
    const toggle=()=>{
      const next=!card.classList.contains("collapsed");
      card.classList.toggle("collapsed",next);
      heading.setAttribute("aria-expanded",String(!next));
      retroAudio.play(next?"panelClose":"panelOpen");
      pulseCard(card);
      scheduleFrameFit();
    };
    heading.addEventListener("click",toggle);
    heading.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}
    });
  }
}
function setAllSidebarCards(collapsed){
  for(const card of els.sidebar.querySelectorAll(".card.collapsible")){
    card.classList.toggle("collapsed",collapsed);
    card.querySelector(":scope > h2")?.setAttribute("aria-expanded",String(!collapsed));
  }
  for(const cluster of els.sidebar.querySelectorAll(".sidebar-cluster.collapsible")){
    setCollapsibleState(cluster,collapsed,'.sidebar-cluster-head');
  }
  scheduleFrameFit();
}
function mobileSidebarMode(){return matchMedia("(max-width:940px)").matches}
function setSidebarOpen(open){
  if(mobileSidebarMode()){
    document.body.classList.toggle("sidebar-open",open);
  }else{
    document.body.classList.toggle("sidebar-collapsed",!open);
  }
  setTimeout(scheduleFrameFit,240);
}
function toggleSidebar(){
  if(mobileSidebarMode())setSidebarOpen(!document.body.classList.contains("sidebar-open"));
  else setSidebarOpen(document.body.classList.contains("sidebar-collapsed"));
}
let frameFitTimer=0;
let responsiveMapScale=1;
function effectiveMapViewportRect(){
  const vr=els.viewport?.getBoundingClientRect();
  if(!vr)return null;
  let bottom=vr.bottom;
  if(mobileReadoutMode()&&els.readout&&!document.body.classList.contains("info-collapsed")){
    const sheetState=els.readout.dataset.sheetState||"peek";
    const rr=els.readout.getBoundingClientRect();
    const overlaps=rr.left<vr.right&&rr.right>vr.left&&rr.top<vr.bottom&&rr.bottom>vr.top;
    // Quand la fiche est entièrement ouverte, la carte est volontairement
    // recouverte : on conserve sa géométrie au lieu de l'écraser à quelques lignes.
    if(overlaps&&sheetState!=="full"&&rr.top>vr.top+90)bottom=Math.min(bottom,rr.top-4);
  }
  const height=Math.max(1,bottom-vr.top);
  return {left:vr.left,top:vr.top,right:vr.right,bottom,width:Math.max(1,vr.width),height,centerX:vr.left+vr.width/2,centerY:vr.top+height/2};
}
function responsiveGridProfile(main){
  const desktop=matchMedia("(min-width:941px)").matches;
  const compact=matchMedia("(max-width:520px)").matches;
  const fontSize=compact?11:12,padding=compact?12:17;
  const available=effectiveMapViewportRect();
  const roomW=Math.max(desktop?620:260,available?.width||main.clientWidth||window.innerWidth);
  const roomH=Math.max(desktop?320:190,available?.height||els.viewport?.clientHeight||window.innerHeight*.58);
  const probe=measureCanvasLayout(fontSize,padding);

  // La grille est calculée depuis la fenêtre réellement disponible, et non
  // depuis la résolution physique de l'écran. Elle fonctionne donc aussi avec
  // la mise à l'échelle Windows à 125 %, 150 % ou davantage.
  let columns=Math.floor((roomW-padding*2-8)/Math.max(1,probe.cellW));
  let rows=Math.floor((roomH-padding*2-8)/Math.max(1,probe.cellH));
  columns=Math.floor(columns/8)*8;
  rows=Math.floor(rows/(desktop?4:2))*(desktop?4:2);
  columns=clamp(columns,desktop?120:40,desktop?384:160);
  rows=clamp(rows,desktop?44:18,desktop?128:104);

  // Hystérésis pour éviter les oscillations lorsque les barres de défilement
  // apparaissent ou disparaissent d'un pixel.
  if(Math.abs(columns-CONFIG.gridW)<16)columns=CONFIG.gridW;
  if(Math.abs(rows-CONFIG.gridH)<4)rows=CONFIG.gridH;
  return {w:columns,h:rows};
}
function applyResponsiveGridProfile(main){
  const next=responsiveGridProfile(main);
  if(next.w===CONFIG.gridW&&next.h===CONFIG.gridH)return false;
  CONFIG.gridW=next.w;CONFIG.gridH=next.h;
  return true;
}
function setMapCssVariable(main,name,value){
  if(main.style.getPropertyValue(name)!==value)main.style.setProperty(name,value);
}
function alignRenderedCenterToVisibleViewport(){
  if(!mobileReadoutMode()||!els.viewport)return;
  const surface=activeMapSurface(),visible=effectiveMapViewportRect();
  if(!surface||!visible)return;
  const vr=els.viewport.getBoundingClientRect();
  const targetX=visible.centerX-vr.left;
  const targetY=visible.centerY-vr.top;
  const surfaceCenterX=surface.offsetLeft+surface.offsetWidth/2;
  const surfaceCenterY=surface.offsetTop+surface.offsetHeight/2;
  const maxX=Math.max(0,els.viewport.scrollWidth-els.viewport.clientWidth);
  const maxY=Math.max(0,els.viewport.scrollHeight-els.viewport.clientHeight);
  els.viewport.scrollLeft=clamp(surfaceCenterX-targetX,0,maxX);
  els.viewport.scrollTop=clamp(surfaceCenterY-targetY,0,maxY);
}
function fitMapFrame(){
  const main=document.querySelector("main"),surface=activeMapSurface();
  if(!main||!surface||!els.viewport)return;
  const compact=matchMedia("(max-width:520px)").matches,desktop=matchMedia("(min-width:941px)").matches;
  const baseFont=compact?11:12,basePadding=compact?12:17;
  // Une seule autorité : taille de cellule fixe + nombre de lignes/colonnes
  // calculé depuis la fenêtre disponible. Aucun second zoom CSS du Canvas.
  setMapCssVariable(main,"--map-font-size",`${baseFont}px`);
  setMapCssVariable(main,"--map-padding",`${basePadding}px`);
  const availableWidth=Math.max(280,main.clientWidth);
  setMapCssVariable(main,"--map-frame-width",desktop?`${availableWidth}px`:"100%");
  responsiveMapScale=1;
  if(applyResponsiveGridProfile(main)){scheduleRender("responsive-grid");return}
  const previousSignature=canvasRuntime.layoutSignature;
  const m=CANVAS_RENDERER?syncCanvasSize():null;
  const finalWidth=Math.ceil(m?.displayWidth||els.map.scrollWidth+2);
  const frameWidth=desktop?availableWidth:Math.min(availableWidth,finalWidth);
  setMapCssVariable(main,"--map-frame-width",`${frameWidth}px`);
  els.viewport.classList.toggle("map-centered",finalWidth<frameWidth-4);
  if(CANVAS_RENDERER&&state.lastGrid&&previousSignature!==canvasRuntime.layoutSignature)drawCanvasMap(state.lastGrid,"layout-fit");
  else if(CANVAS_RENDERER)syncRenderFxGeometry(m);
  requestAnimationFrame(()=>{
    syncRenderFxGeometry(canvasRuntime.metrics);alignRenderedCenterToVisibleViewport();
    syncSelectionDom();if(pendingPoiFeedback)applyPendingPoiSelectionFeedback();
    updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker();
  });
}
function scheduleFrameFit(){
  clearTimeout(frameFitTimer);
  frameFitTimer=setTimeout(()=>{
    frameFitTimer=0;
    requestAnimationFrame(fitMapFrame);
  },34);
}
function mobileReadoutMode(){return matchMedia?.("(max-width:940px)")?.matches}
let readoutFitTimer=0;
function setReadoutSheetState(next){
  if(!els.readout)return;
  // Les anciennes demandes « medium » sont volontairement promues vers la
  // seule taille de lecture utile. Il ne reste que deux états : replié / ouvert.
  const normalized=next==="peek"?"peek":"full";
  els.readout.dataset.sheetState=normalized;
  els.readoutSheetHandle?.setAttribute("aria-label",normalized==="full"?"Replier la fiche de cellule":"Déployer la fiche de cellule");
  requestAnimationFrame(()=>{updateWorldBoundaryFrame();updateRelationOverlay()});
  clearTimeout(readoutFitTimer);
  // La hauteur réellement libre n'est fiable qu'à la fin de la transition CSS.
  readoutFitTimer=setTimeout(()=>{readoutFitTimer=0;scheduleFrameFit()},280);
}
function cycleReadoutSheet(){
  const current=els.readout?.dataset.sheetState||"peek";
  setReadoutSheetState(current==="full"?"peek":"full");
}
function setReadoutContent(html,{title="Fiche de cellule",sheet="full",kind="poi"}={}){
  if(els.readout)els.readout.dataset.readoutKind=kind;
  if(els.readoutBody)els.readoutBody.innerHTML=html;
  if(els.readoutSheetLabel)els.readoutSheetLabel.textContent=title;
  prepareReadoutSections();
  setInfoVisible(true);
  setReadoutSheetState(sheet==="peek"?"peek":"full");
}
function plainCellIdentity(cell){
  const f=cell?.feature||{},tags=f.tags||{},cls=String(cell?.cls||"");
  const name=String(f.name||tags.name||"").trim(),ref=String(tags.ref||f.ref||"").trim();
  let label="Terrain non nommé",kind="lecture du terrain",symbol=symbolForCell(cell),qualifier="";
  if(cls.includes("water")){
    const waterway=String(tags.waterway||f.waterway||"").toLowerCase();
    label=waterway==="river"?"Rivière":waterway==="stream"?"Ruisseau":waterway==="canal"?"Canal":waterway==="ditch"?"Fossé":waterway==="drain"?"Drain / fossé":"Cours d’eau ou zone humide";
    kind="hydrographie";symbol="≈";
  }else if(cls.includes("path")){
    const highway=String(tags.highway||"").toLowerCase();
    label=highway==="footway"?"Sentier pédestre":highway==="cycleway"?"Piste cyclable":highway==="track"?"Piste / chemin agricole":"Chemin";
    kind="voie douce";symbol="·";
  }else if(cls.includes("road")){
    const highway=String(tags.highway||"").toLowerCase();
    const roads={motorway:"Autoroute",trunk:"Axe majeur",primary:"Route principale",secondary:"Route départementale",tertiary:"Route locale",residential:"Rue résidentielle",service:"Voie de service",unclassified:"Route locale",track:"Piste"};
    label=roads[highway]||"Route ou voie";kind="circulation";symbol=cls.includes("major")?"═":"─";
  }else if(cls.includes("forest")){
    label=tags.landuse==="forest"?"Forêt":"Bois / couverture arborée";kind="végétation";symbol="T";
  }else if(cls.includes("meadow")){
    label="Prairie";kind="espace ouvert";symbol=",";
  }else if(cls.includes("field")){
    const land=String(tags.landuse||f.landuse||"").toLowerCase();
    label=land==="orchard"?"Verger":land==="vineyard"?"Vigne":land==="farmland"?"Champ cultivé":"Champ / parcelle ouverte";
    kind="occupation du sol";symbol=".";
  }else if(cls.includes("building")||cls.includes("cad-building")){
    const building=String(tags.building||f.building||"").toLowerCase();
    label=building&&building!=="yes"?`Bâtiment · ${building}`:"Bâtiment cadastral";kind="bâti";symbol="█";
  }else if(cls.includes("quarry")){
    label="Carrière ou terrain d’extraction";kind="terrain remanié";symbol="q";
  }else if(cls.includes("scrub")){
    label="Friche végétale / broussailles";kind="végétation";symbol=";";
  }else if(currentDepth()<0){
    label=`Coupe interprétative ${depthSliceLabel()}`;kind="sous-sol hypothétique";symbol=cell?.ch||"▓";
  }
  const displayName=name||ref;
  if(displayName)qualifier=displayName;
  else if(f.kind&&!/objet cartographique/i.test(String(f.kind)))qualifier=String(f.kind);
  return {label,kind,symbol,qualifier,source:f.source||""};
}
function plainCellSummaryHtml(cell,x,y){
  const identity=plainCellIdentity(cell),coord=gridToCoord(x,y,state.lastGrid.extent),slope=localSlopeDegrees(x,y);
  const metrics=[Number.isFinite(cell.elev)?`alt. ≈ ${Math.round(cell.elev)} m`:"",Number.isFinite(slope)?`pente ≈ ${slope.toFixed(1)}°`:"",`${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`].filter(Boolean).join(" · ");
  const detail=identity.qualifier?`<strong>${esc(identity.qualifier)}</strong> · ${esc(identity.label)}`:esc(identity.label);
  const source=identity.source?`<span class="plain-cell-source">source : ${esc(identity.source)}</span>`:"lecture issue des couches visibles";
  return `<div class="plain-cell-summary"><div class="plain-cell-symbol">${esc(identity.symbol)}</div><div><div class="plain-cell-kicker">${esc(identity.kind)}</div><div class="plain-cell-title">${detail}</div><div class="plain-cell-detail">${esc(terrainPhrase(cell,slope,x,y))}</div><div class="plain-cell-meta">${esc(metrics)} · ${source}</div></div></div>`;
}
function collapseReadoutForPlainCell(cell,x,y){
  // Invalide une éventuelle hydratation documentaire encore en attente.
  descriptionRuntime.selectionToken++;
  const identity=plainCellIdentity(cell);
  const title=identity.qualifier?`${identity.label} · ${identity.qualifier}`:identity.label;
  setReadoutContent(plainCellSummaryHtml(cell,x,y),{title,sheet:"full",kind:"plain"});
}

function setInfoVisible(visible){
  document.body.classList.toggle("info-collapsed",!visible);
  els.infoToggle.textContent=visible?"ⓘ replier":"ⓘ infos";
  if(visible&&mobileReadoutMode()&&!els.readout.dataset.sheetState)setReadoutSheetState("peek");
  setTimeout(scheduleFrameFit,30);
}
function closeMobileSidebarAfterAction(){
  if(mobileSidebarMode())setSidebarOpen(false);
}
function populateControls(){
  CONFIG.zooms.forEach((z,i)=>{
    const b=document.createElement("button");b.dataset.zoom=i;b.title=z.label;b.textContent=z.short;
    b.addEventListener("click",()=>{setZoomFromViewport(i);closeMobileSidebarAfterAction()});els.zoomButtons.appendChild(b);
  });
  CONFIG.depths.forEach((d,i)=>{
    const b=document.createElement("button");b.dataset.depth=d;b.textContent=depthSliceLabel(d);b.title=d===0?"Surface":`${depthSliceMeta(d).range} · coupe interprétative, non mesurée par défaut`;
    b.addEventListener("click",()=>{setDepthIndex(i);closeMobileSidebarAfterAction()});els.depthButtons.appendChild(b);
  });
}
function populateCavitySelect(){
  const list=state.cavities.length?state.cavities:CAVITY_INVENTORY;
  els.cavitySelect.innerHTML='<option value="">Choisir une cavité…</option>';
  list.slice().sort((a,b)=>cavityName(a).localeCompare(cavityName(b),"fr")).forEach(c=>{
    const o=document.createElement("option");o.value=c.id;o.textContent=`${cavityMarker(c).glyph} ${cavityName(c)}${c.commune?` · ${c.commune}`:""}${Number.isFinite(c.lat)?"":" · coordonnées indisponibles"}`;
    o.disabled=!Number.isFinite(c.lat);els.cavitySelect.appendChild(o);
  });
  els.cavityHelp.textContent=state.cavityInventoryOnly?"L’inventaire communal est disponible, mais le service de coordonnées n’a pas répondu. Les repères OSM et locaux restent utilisables.":"Sélectionner un repère recentre la carte et passe au zoom Secteur. Les données BRGM sont recherchées dans toute l’emprise navigable.";
}

let navigationRenderTimer=0;
function scheduleNavigationRender(delay=34){
  clearTimeout(navigationRenderTimer);
  navigationRenderTimer=setTimeout(()=>{navigationRenderTimer=0;render()},delay);
}
function moveCenter(dx,dy,fraction=null){
  retroAudio.play(dx||dy?"button":"click");
  const z=currentZoom(),step=fraction??z.pan;
  const dLat=z.heightKm/111.32*step*dy;
  const dLon=z.widthKm/kmPerLon(state.center.lat)*step*dx;
  state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},z);
  scheduleNavigationRender();
}
function setDepthIndex(i){
  clearActiveRelation();
  const previous=state.depthIndex,next=clamp(i,0,CONFIG.depths.length-1);
  if(next===previous)return;
  state.depthIndex=next;
  retroAudio.play(next>previous?"depthDown":"depthUp");
  playDepthTransition(next>previous?"down":"up");
  closeSelectionAssist();render();
}

let zoomFxTimer=0,zoomCorrectionTimer=0,zoomCorrectionSerial=0;
function clearZoomTransition(){
  clearTimeout(zoomFxTimer);
  const overlay=els.zoomTransitionCanvas;
  if(overlay){overlay.className="zoom-transition-canvas";overlay.style.cssText=""}
  els.viewport?.classList.remove("zoom-feedback");
}
function beginZoomTransition(direction,clientPoint=null){
  if(!CANVAS_RENDERER||!els.zoomTransitionCanvas||!els.mapCanvas||matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
  const source=els.mapCanvas,overlay=els.zoomTransitionCanvas;
  if(!source.width||!source.height)return;
  clearZoomTransition();
  const vr=els.viewport.getBoundingClientRect(),sr=source.getBoundingClientRect();
  if(!sr.width||!sr.height)return;
  overlay.width=source.width;overlay.height=source.height;
  const ctx=overlay.getContext("2d",{alpha:false});
  ctx.clearRect(0,0,overlay.width,overlay.height);ctx.drawImage(source,0,0);
  const left=Math.round(sr.left-vr.left+(els.viewport.scrollLeft||0));
  const top=Math.round(sr.top-vr.top+(els.viewport.scrollTop||0));
  overlay.style.left=`${left}px`;overlay.style.top=`${top}px`;
  overlay.style.width=`${Math.round(sr.width)}px`;overlay.style.height=`${Math.round(sr.height)}px`;
  const cx=Number.isFinite(clientPoint?.clientX)?clientPoint.clientX:vr.left+vr.width/2;
  const cy=Number.isFinite(clientPoint?.clientY)?clientPoint.clientY:vr.top+vr.height/2;
  const ox=clamp((cx-sr.left)/Math.max(1,sr.width),0,1),oy=clamp((cy-sr.top)/Math.max(1,sr.height),0,1);
  overlay.style.transformOrigin=`${(ox*100).toFixed(2)}% ${(oy*100).toFixed(2)}%`;
  overlay.className=`zoom-transition-canvas active ${direction==="in"?"zoom-in":"zoom-out"}`;
  els.viewport.style.setProperty("--zoom-origin-x",`${clamp((cx-vr.left)/Math.max(1,vr.width),0,1)*100}%`);
  els.viewport.style.setProperty("--zoom-origin-y",`${clamp((cy-vr.top)/Math.max(1,vr.height),0,1)*100}%`);
  els.viewport.classList.remove("zoom-feedback");void els.viewport.offsetWidth;els.viewport.classList.add("zoom-feedback");
  zoomFxTimer=setTimeout(clearZoomTransition,360);
}
function scheduleZoomAnchorCorrection(focus,clientX,clientY){
  if(!focus||!Number.isFinite(clientX)||!Number.isFinite(clientY))return;
  const serial=++zoomCorrectionSerial;
  clearTimeout(zoomCorrectionTimer);
  zoomCorrectionTimer=setTimeout(()=>{
    if(serial!==zoomCorrectionSerial||!state.lastGrid)return;
    const mapped=mapPositionFromClient(clientX,clientY);if(!mapped)return;
    const dLat=focus.lat-mapped.coord.lat,dLon=focus.lon-mapped.coord.lon;
    if(Math.abs(dLat)<1e-8&&Math.abs(dLon)<1e-8)return;
    state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},currentZoom());
    render();
  },82);
}

function setZoomIndex(i,focus=null,screen=null){
  const minZoom=0;
  const next=clamp(i,minZoom,CONFIG.zooms.length-1);
  if(next===state.zoomIndex)return;
  const direction=next>state.zoomIndex?"in":"out";
  beginZoomTransition(direction,screen);
  retroAudio.play(direction==="in"?"zoomIn":"zoomOut");
  state.zoomIndex=next;
  if(focus&&screen){
    const z=currentZoom();
    const heightDeg=z.heightKm/111.32;
    const widthDeg=z.widthKm/kmPerLon(focus.lat);
    state.center={
      lat:focus.lat+(screen.fy-.5)*heightDeg,
      lon:focus.lon-(screen.fx-.5)*widthDeg
    };
  }
  state.center=clampCenter(state.center,currentZoom());
  render();
  if(focus&&Number.isFinite(screen?.clientX)&&Number.isFinite(screen?.clientY))scheduleZoomAnchorCorrection(focus,screen.clientX,screen.clientY);
}
function viewportZoomAnchor(){
  const surface=activeMapSurface();
  if(!state.lastGrid||!els.viewport||!surface)return null;
  const vr=effectiveMapViewportRect()||els.viewport.getBoundingClientRect(),mr=surface.getBoundingClientRect();
  const clientX=clamp(vr.centerX??(vr.left+vr.width/2),mr.left+1,mr.right-1);
  const clientY=clamp(vr.centerY??(vr.top+vr.height/2),mr.top+1,mr.bottom-1);
  const pos=mapPositionFromClient(clientX,clientY);
  return pos?{...pos,clientX,clientY}:null;
}
function setZoomFromViewport(i){
  const anchor=viewportZoomAnchor();
  setZoomIndex(i,anchor?.coord,anchor?{fx:anchor.fx,fy:anchor.fy,clientX:anchor.clientX,clientY:anchor.clientY}:null);
}


function geolocationErrorLabel(err,context={}){
  const localFile=location.protocol==="file:";
  if(err?.code===1){
    if(!window.isSecureContext)return "Le navigateur bloque la géolocalisation dans ce contexte non sécurisé. Aucune fenêtre d’autorisation ne peut s’afficher ici.";
    if(context.permissionState==="denied")return localFile?"La géolocalisation est bloquée pour ce fichier local. Le navigateur peut refuser sans afficher de demande ; ouvre l’Atlas depuis une adresse HTTPS.":"La localisation est déjà bloquée pour ce site ou pour le navigateur. Réactive-la dans les réglages de permissions.";
    return localFile?"Le navigateur mobile a refusé la géolocalisation du fichier local sans afficher de demande. Une copie servie en HTTPS est nécessaire.":"Permission de localisation refusée ou bloquée par le navigateur.";
  }
  if(err?.code===2)return "Position indisponible. Vérifie que la localisation du téléphone est activée pour le navigateur.";
  if(err?.code===3)return "La recherche de position a dépassé le délai prévu.";
  return String(err?.message||"Impossible d’obtenir la position.");
}
async function geolocationPermissionState(){
  try{
    if(navigator.permissions?.query){
      const status=await navigator.permissions.query({name:"geolocation"});
      return status?.state||"unknown";
    }
  }catch{}
  return "unknown";
}
function geolocationContextHint(){
  if(!window.isSecureContext)return '<br><span class="location-warning">Cette page n’est pas dans un contexte sécurisé. Le même fichier doit être servi en HTTPS pour que le navigateur puisse demander la position.</span>';
  if(location.protocol==="file:")return '<br><span class="location-warning">Certains navigateurs mobiles bloquent la localisation des fichiers <code>file://</code> sans afficher de boîte de dialogue. Héberger ce même HTML en HTTPS contourne cette limite.</span>';
  return "";
}
function updateLocationUI(message=""){
  const loc=state.userLocation,inside=loc&&inExtent(loc.lat,loc.lon,largestExtent());
  if(els.locateMe){els.locateMe.disabled=state.locationLoading;els.locateMe.textContent=state.locationLoading?"⌖ vérification…":"⌖ me localiser"}
  if(els.mapLocate){els.mapLocate.disabled=state.locationLoading;els.mapLocate.classList.toggle("active",!!loc)}
  if(els.clearLocation)els.clearLocation.disabled=!loc;
  if(els.locationBadge)els.locationBadge.textContent=state.locationLoading?"vérification…":loc?(inside?`± ${Math.round(loc.accuracy||0)} m`:"hors emprise"):"non localisée";
  if(els.locationHelp){
    if(message)els.locationHelp.innerHTML=message;
    else if(loc)els.locationHelp.innerHTML=`Dernière mesure : <strong>${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}</strong> · précision ± ${Math.round(loc.accuracy||0)} m · ${new Date(loc.timestamp).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}. Position temporaire, non sauvegardée.`;
  }
  updateAroundMe();
  updateEncounterUI();
}
async function locateUser(){
  if(state.locationLoading)return;
  if(!navigator.geolocation){updateLocationUI('<span class="location-warning">La géolocalisation n’est pas disponible dans ce navigateur.</span>');retroAudio.play("error");return}
  state.locationLoading=true;updateLocationUI("Vérification du contexte et des permissions…");
  const permissionState=await geolocationPermissionState();
  if(!window.isSecureContext){
    state.locationLoading=false;
    updateLocationUI('<span class="location-warning">Le navigateur ne peut pas demander ta position depuis cette page : le contexte n’est pas sécurisé.</span>'+geolocationContextHint());
    retroAudio.play("error");render();return;
  }
  if(permissionState==="denied"){
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel({code:1},{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();return;
  }
  updateLocationUI(permissionState==="prompt"?"Le navigateur devrait maintenant afficher sa demande d’autorisation…":"Recherche ponctuelle de la position…");
  navigator.geolocation.getCurrentPosition(pos=>{
    state.locationLoading=false;
    const c=pos.coords;
    state.userLocation={lat:Number(c.latitude),lon:Number(c.longitude),accuracy:Number(c.accuracy)||0,altitude:Number.isFinite(c.altitude)?c.altitude:null,heading:Number.isFinite(c.heading)?c.heading:null,speed:Number.isFinite(c.speed)?c.speed:null,timestamp:pos.timestamp||Date.now()};
    const inside=inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent());
    if(inside&&state.centerOnLocation){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom())}
    updateLocationUI(inside?"":'<span class="location-warning">Position obtenue, mais elle se trouve hors de l’emprise actuelle de l’Atlas.</span>');
    retroAudio.play("success");render();
  },err=>{
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel(err,{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();
  },{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
}
function clearUserLocation(){state.userLocation=null;updateLocationUI("Position masquée. Elle n’était pas enregistrée dans l’Atlas.");render()}

function cellElementAtClient(clientX,clientY){
  if(CANVAS_RENDERER)return null;
  const hit=document.elementFromPoint?.(clientX,clientY),cell=hit?.closest?.(".cell");
  return cell&&els.map.contains(cell)?cell:null;
}
function mapGridMetrics(){
  const cells=els.map?.children;
  const expected=CONFIG.gridW*CONFIG.gridH;
  if(!cells||cells.length<expected)return null;
  const first=cells[0],nextX=CONFIG.gridW>1?cells[1]:null,nextY=CONFIG.gridH>1?cells[CONFIG.gridW]:null;
  if(!first)return null;
  const a=first.getBoundingClientRect();
  const centerX=a.left+a.width/2,centerY=a.top+a.height/2;
  let pitchX=nextX?(nextX.getBoundingClientRect().left+nextX.getBoundingClientRect().width/2-centerX):a.width;
  let pitchY=nextY?(nextY.getBoundingClientRect().top+nextY.getBoundingClientRect().height/2-centerY):a.height;
  if(!Number.isFinite(pitchX)||Math.abs(pitchX)<.1)pitchX=a.width||1;
  if(!Number.isFinite(pitchY)||Math.abs(pitchY)<.1){
    const cs=getComputedStyle(els.map);
    pitchY=(parseFloat(cs.fontSize)||12)*(parseFloat(cs.lineHeight)||1.04);
  }
  return {centerX,centerY,pitchX:Math.abs(pitchX),pitchY:Math.abs(pitchY)};
}
function mapPositionFromClient(clientX,clientY){
  if(!state.lastGrid)return null;
  if(CANVAS_RENDERER){
    const d=canvasDisplayMetrics();if(!d)return null;
    // Les glyphes sont dessinés à l'origine de chaque case. Pour convertir le
    // pointeur en indice de cellule, on travaille toutefois par rapport au CENTRE
    // des cases. Sans ce demi-pas, le centre visuel de la case x était arrondi vers
    // x+1 : la croix se retrouvait dans le coin supérieur gauche de la surbrillance.
    const gridX=(clientX-d.r.left-d.paddingX)/d.cellW-.5;
    const gridY=(clientY-d.r.top-d.paddingY)/d.cellH-.5;
    const x=clamp(Math.round(gridX),0,CONFIG.gridW-1),y=clamp(Math.round(gridY),0,CONFIG.gridH-1);
    const fx=clamp(gridX/Math.max(1,CONFIG.gridW-1),0,1),fy=clamp(gridY/Math.max(1,CONFIG.gridH-1),0,1);
    const result={coord:{lon:state.lastGrid.extent.west+fx*(state.lastGrid.extent.east-state.lastGrid.extent.west),lat:state.lastGrid.extent.north-fy*(state.lastGrid.extent.north-state.lastGrid.extent.south)},fx,fy,x,y};
    if(debugState.enabled){debugState.lastPointer=`${x}, ${y} · ${result.coord.lat.toFixed(5)} / ${result.coord.lon.toFixed(5)}`;updateDebugPanel()}
    return result;
  }
  const metrics=mapGridMetrics();
  let gridX,gridY;
  if(metrics){
    // Convert from the real centres of the rendered glyph cells. This excludes
    // <pre> padding and remains exact when the panoramic grid or font size changes.
    gridX=(clientX-metrics.centerX)/metrics.pitchX;
    gridY=(clientY-metrics.centerY)/metrics.pitchY;
  }else{
    // Conservative fallback based on the content box rather than the padded box.
    const r=els.map.getBoundingClientRect(),cs=getComputedStyle(els.map);
    if(!r.width||!r.height)return null;
    const padL=parseFloat(cs.paddingLeft)||0,padR=parseFloat(cs.paddingRight)||0;
    const padT=parseFloat(cs.paddingTop)||0,padB=parseFloat(cs.paddingBottom)||0;
    const width=Math.max(1,r.width-padL-padR),height=Math.max(1,r.height-padT-padB);
    const fx0=clamp((clientX-r.left-padL)/width,0,1),fy0=clamp((clientY-r.top-padT)/height,0,1);
    gridX=fx0*(CONFIG.gridW-1);gridY=fy0*(CONFIG.gridH-1);
  }
  const x=clamp(Math.round(gridX),0,CONFIG.gridW-1),y=clamp(Math.round(gridY),0,CONFIG.gridH-1);
  const fx=clamp(gridX/Math.max(1,CONFIG.gridW-1),0,1),fy=clamp(gridY/Math.max(1,CONFIG.gridH-1),0,1);
  const result={coord:{lon:state.lastGrid.extent.west+fx*(state.lastGrid.extent.east-state.lastGrid.extent.west),lat:state.lastGrid.extent.north-fy*(state.lastGrid.extent.north-state.lastGrid.extent.south)},fx,fy,x,y};
  if(debugState.enabled){debugState.lastPointer=`${x}, ${y} · ${result.coord.lat.toFixed(5)} / ${result.coord.lon.toFixed(5)}`;updateDebugPanel()}
  return result;
}
function eventMapPosition(ev){
  if(!state.lastGrid)return null;
  if(CANVAS_RENDERER)return mapPositionFromClient(ev.clientX,ev.clientY);
  const cell=cellElementAtClient(ev.clientX,ev.clientY)||ev.target.closest?.(".cell");
  if(cell&&els.map.contains(cell)){
    const x=+cell.dataset.x,y=+cell.dataset.y;
    return {coord:gridToCoord(x,y,state.lastGrid.extent),fx:x/(CONFIG.gridW-1),fy:y/(CONFIG.gridH-1),x,y};
  }
  return mapPositionFromClient(ev.clientX,ev.clientY);
}
function coarsePointer(){
  return !!(matchMedia?.("(hover: none) and (pointer: coarse)")?.matches || (window.innerWidth<=700&&navigator.maxTouchPoints>0));
}
function selectableFeature(cell){
  const f=cell?.feature;
  return !!(f&&(f.poiId||f.name||f.id||f.cavity||f.observation||f.lore||f.bss||f.cartofriches));
}
function assistedCell(x,y,radius=2){
  if(!state.lastGrid)return {x,y,snapped:false};
  const exact=state.lastGrid.grid[y]?.[x];
  if(selectableFeature(exact))return {x,y,snapped:false};
  let best=null;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;
    const cell=state.lastGrid.grid[ny]?.[nx];
    if(!selectableFeature(cell))continue;
    const d=Math.hypot(dx,dy);
    const named=cell.feature?.name?-.18:0;
    const important=cell.feature?.cavity||cell.feature?.observation||cell.feature?.lore?-.22:0;
    const score=d+named+important;
    if(!best||score<best.score)best={x:nx,y:ny,score,cell};
  }
  return best?{x:best.x,y:best.y,snapped:true}:{x,y,snapped:false};
}
let selectedDomCell=null,selectionNeighborDomCells=[];
function mapCellElement(x,y){
  if(CANVAS_RENDERER||!els.map||x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)return null;
  return els.map.children[y*CONFIG.gridW+x]||null;
}
function clearSelectionDom(){
  if(selectedDomCell)selectedDomCell.classList.remove("selected");
  for(const el of selectionNeighborDomCells)el?.classList.remove("selection-neighbor");
  selectedDomCell=null;selectionNeighborDomCells=[];
  els.canvasSelectionMarker?.classList.remove("visible");
}
function syncSelectionDom(){
  clearSelectionDom();
  if(!state.selectedCell||!state.lastGrid||!inExtent(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent)){
    els.viewport?.classList.remove("selection-active");
    return false;
  }
  const p=coordToGrid(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent);
  const x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1);
  state.selectedCell.x=x;state.selectedCell.y=y;
  const selectedPoi=state.selectedCell.poiUid?normalizedPoiByUid(state.selectedCell.poiUid):null;
  state.selectedCell.feature=selectedPoi?symbolicPoiFeatureInfo(selectedPoi):(state.lastGrid.grid[y]?.[x]?.feature||null);
  if(CANVAS_RENDERER){positionCanvasMarker(els.canvasSelectionMarker,x,y,true);els.viewport?.classList.add("selection-active");return true}
  const target=mapCellElement(x,y);
  if(!target){els.viewport?.classList.remove("selection-active");return false}
  target.classList.add("selected");selectedDomCell=target;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const neighbor=mapCellElement(x+dx,y+dy);if(neighbor){neighbor.classList.add("selection-neighbor");selectionNeighborDomCells.push(neighbor)}
  }
  els.viewport?.classList.add("selection-active");return true;
}
function closeSelectionAssist(){
  state.selectionAssistVisible=false;
  updateSelectionAssist();
}
function cellSelectionSound(cell){
  const f=cell?.feature||{},cls=String(cell?.cls||""),tags=f.tags||{};
  const normalized={cavity:"cellCavity",bss:"cellBss",heritage:"cellHeritage",memory:"cellMemory",industrial:"cellIndustrial",home:"cellHome",location:"cellLocation",natural:"cellTerrain"}[f.poiCategory];
  if(normalized)return normalized;
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(currentDepth()<0||cell?.confidence)return "cellUnderground";
  if(f.kind==="maison"||cls.includes("house"))return "cellHome";
  if(f.cavity||/cavit|grotte|carri[eè]re souterraine|souterrain/.test(descriptor))return "cellCavity";
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/.test(descriptor))return "cellBss";
  if(f.heritage)return "cellHeritage";
  if(f.observation||f.lore)return "cellMemory";
  if(f.cartofriches||f.siteType||f.siteStatus)return "cellIndustrial";
  if(cls.includes("quarry")||tags.landuse==="quarry"||/carri[eè]re|extraction/.test(descriptor))return "cellQuarry";
  if(cls.includes("water")||tags.waterway||tags.natural==="water"||tags.landuse==="reservoir")return "cellWater";
  if(cls.includes("road")||tags.highway)return "cellRoad";
  if(cls.includes("building")||cls.includes("cad-building")||tags.building)return "cellBuilding";
  if(cls.includes("forest")||["forest","wood"].includes(tags.landuse)||tags.natural==="wood")return "cellForest";
  if(cls.includes("field")||cls.includes("meadow")||["farmland","meadow","grass"].includes(tags.landuse))return "cellField";
  return "cellTerrain";
}
function playCellSelectionSound(cell,{snapped=false}={}){
  const poiKind=poiSelectionKind(cell);
  const poiSound={cavity:"poiCavity",bss:"poiBss",heritage:"poiHeritage",memory:"poiMemory",industrial:"poiIndustrial",natural:"poiNatural",home:"poiHome",location:"poiLocation"}[poiKind];
  retroAudio.play(poiSound||cellSelectionSound(cell));
  if(snapped)setTimeout(()=>retroAudio.play("snapAccent"),110);
}

function poiSelectionKind(cell){
  if(!cell)return "";
  const cls=String(cell.cls||""),f=cell.feature||{},tags=f.tags||{};
  if(f.poiCategory)return f.poiCategory;
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(f.kind==="maison"||cls.includes("c-house")||cls.includes("c-address"))return "home";
  if(f.cavity||/cavit|grotte|souterrain/.test(descriptor))return "cavity";
  if(f.bss||f.indice||cls.includes("c-bss")||cls.includes("c-piezo"))return "bss";
  if(f.heritage||cls.includes("c-heritage"))return "heritage";
  if(f.cartofriches||cls.includes("c-carto")||cls.includes("c-lore-friche")||cls.includes("c-lore-abandoned"))return "industrial";
  if(f.observation||f.lore||cls.includes("c-observation")||cls.includes("c-lore")||cls.includes("c-sight")||cls.includes("c-zone"))return "memory";
  if(cls.includes("c-user-position"))return "location";
  if(["spring","sinkhole","cave_entrance"].includes(tags.natural)||cls.includes("c-doc")||cls.includes("c-demo")||cls.includes("c-explorer-hint"))return "natural";
  return "";
}
let pendingPoiFeedback=null,poiFeedbackTimer=0,poiFeedbackSerial=0;
function applyPendingPoiSelectionFeedback(){
  const pending=pendingPoiFeedback;if(!pending||!state.lastGrid)return;
  const remaining=pending.expires-performance.now();if(remaining<=0){pendingPoiFeedback=null;els.canvasPoiMarker?.classList.remove("active","visible");return}
  const p=coordToGrid(pending.coord.lat,pending.coord.lon,state.lastGrid.extent),x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1);
  if(CANVAS_RENDERER){
    const marker=els.canvasPoiMarker;positionCanvasMarker(marker,x,y,true);marker.dataset.poiKind=pending.kind;marker.classList.remove("active");void marker.offsetWidth;marker.classList.add("active");
    clearTimeout(poiFeedbackTimer);const serial=pending.serial;poiFeedbackTimer=setTimeout(()=>{if(pendingPoiFeedback?.serial!==serial)return;pendingPoiFeedback=null;marker.classList.remove("active","visible");delete marker.dataset.poiKind},Math.max(80,remaining));return;
  }
  const glyph=mapCellElement(x,y);if(!glyph)return;
  els.map.querySelectorAll(".cell.poi-hit-active").forEach(el=>{el.classList.remove("poi-hit-active");delete el.dataset.poiKind});
  glyph.dataset.poiKind=pending.kind;glyph.classList.remove("poi-hit-active");void glyph.offsetWidth;glyph.classList.add("poi-hit-active");
  clearTimeout(poiFeedbackTimer);const serial=pending.serial;poiFeedbackTimer=setTimeout(()=>{if(pendingPoiFeedback?.serial!==serial)return;pendingPoiFeedback=null;glyph.classList.remove("poi-hit-active");delete glyph.dataset.poiKind},Math.max(80,remaining));
}
function triggerPoiSelectionFeedback(cell,x,y,coordOverride=null){
  const selectionKind=poiSelectionKind(cell);
  if(!selectionKind||!state.lastGrid)return;
  pendingPoiFeedback={
    kind:selectionKind,
    coord:coordOverride||gridToCoord(x,y,state.lastGrid.extent),
    expires:performance.now()+1120,
    serial:++poiFeedbackSerial
  };
  requestAnimationFrame(applyPendingPoiSelectionFeedback);
}

function selectGridCell(x,y,{assist=false,assistRadius=null,note="",showAssist=false,confirmIfSame=false}={}){
  if(!state.lastGrid)return;
  x=clamp(Math.round(x),0,CONFIG.gridW-1);y=clamp(Math.round(y),0,CONFIG.gridH-1);
  const defaultRadius=state.zoomIndex===CONFIG.zooms.length-1&&effectiveRenderMode()==="symbolic"?2:(state.zoomIndex<=2?2:1);
  const picked=assist?assistedCell(x,y,Number.isFinite(assistRadius)?assistRadius:defaultRadius):{x,y,snapped:false};
  x=picked.x;y=picked.y;
  const sameSelection=!!state.selectedCell&&state.selectionAssistVisible&&state.selectedCell.x===x&&state.selectedCell.y===y;
  if(confirmIfSame&&sameSelection){
    closeSelectionAssist();
    els.readoutBody?.insertAdjacentHTML("beforeend",'<div class="small" style="margin-top:7px">Sélection validée.</div>');
    return;
  }
  const cell=state.lastGrid.grid[y][x];
  state.selectedCell={x,y,coord:gridToCoord(x,y,state.lastGrid.extent),feature:cell.feature||null};
  debugState.lastSelection=`${x}, ${y} · ${cell.feature?.name||cell.feature?.kind||"terrain"}`;
  state.selectionSnapNote=picked.snapped?`Sélection accrochée à ${cell.feature?.name||cell.feature?.kind||"un repère voisin"}.`:note;
  state.selectionAssistVisible=false;
  playCellSelectionSound(cell,{snapped:picked.snapped});
  syncSelectionDom();
  updateSelectionAssist();
  const poiKind=poiSelectionKind(cell);
  if(poiKind){
    triggerPoiSelectionFeedback(cell,x,y);
    const assistHint="";
    presentCellDescription(cell,x,y,{note:state.selectionSnapNote||"Sélection mémorisée",assistHint,title:cell.feature?.name||cell.feature?.kind||"Point d’intérêt",sheet:"full"});
  }else{
    collapseReadoutForPlainCell(cell,x,y);
  }
}
function moveSelection(dx,dy){
  if(!state.selectedCell||!state.lastGrid)return;
  const p=coordToGrid(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent);
  selectGridCell(p.x+dx,p.y+dy,{assist:false,note:"Sélection ajustée manuellement",showAssist:false});
}
function selectionLoupeHtml(x,y){
  if(!state.lastGrid)return "";
  const rows=[];
  for(let yy=y-2;yy<=y+2;yy++){
    let row="";
    for(let xx=x-2;xx<=x+2;xx++){
      const ch=state.lastGrid.grid[yy]?.[xx]?.ch||" ";
      row+=(xx===x&&yy===y)?`<strong>${esc(ch===" "?"·":ch)}</strong>`:esc(ch===" "?"·":ch);
    }
    rows.push(row);
  }
  return rows.join("\n");
}
function updateSelectionAssist(){
  state.selectionAssistVisible=false;
  if(els.selectionAssist)els.selectionAssist.hidden=true;
}

function storyChoice(seed,items){return items[Math.abs(seed)%items.length]}
function cardinalDirection(bearing){
  if(!Number.isFinite(bearing))return "";
  return ["nord","nord-est","est","sud-est","sud","sud-ouest","ouest","nord-ouest"][Math.round(((bearing%360)+360)%360/45)%8];
}
function localSlopeProfile(x,y){
  const g=state.lastGrid;if(!g)return null;const z=currentZoom();
  const l=g.elevations[y]?.[Math.max(0,x-1)],r=g.elevations[y]?.[Math.min(CONFIG.gridW-1,x+1)],u=g.elevations[Math.max(0,y-1)]?.[x],d=g.elevations[Math.min(CONFIG.gridH-1,y+1)]?.[x];
  if(![l,r,u,d].every(Number.isFinite))return null;
  const dx=z.widthKm*1000/Math.max(1,CONFIG.gridW-1)*2,dy=z.heightKm*1000/Math.max(1,CONFIG.gridH-1)*2;
  const eastGradient=(r-l)/dx,southGradient=(d-u)/dy;
  const angle=Math.atan(Math.hypot(eastGradient,southGradient))*180/Math.PI;
  const downEast=-eastGradient,downNorth=southGradient;
  const bearing=(Math.atan2(downEast,downNorth)*180/Math.PI+360)%360;
  return {angle,bearing,direction:cardinalDirection(bearing)};
}
function localSlopeDegrees(x,y){return localSlopeProfile(x,y)?.angle??null}
function terrainPhrase(cell,slope,x,y){
  const seed=x*37+y*71,profile=localSlopeProfile(x,y),direction=profile?.direction;
  if(currentDepth()<0)return storyChoice(seed,[
    `Sous la surface, cette case appartient à la coupe interprétative ${depthSliceLabel()}. Le dessin est une section d’un même volume hypothétique, pas une galerie levée sur le terrain.`,
    `À ${depthSliceLabel()}, l’Atlas montre une possibilité spatiale cohérente entre les niveaux. La profondeur locale et la forme exacte restent inconnues.`,
    `Cette tranche souterraine prolonge un modèle de lecture. Elle aide à comparer les couches, mais ne peut servir ni d’itinéraire ni de plan topographique.`
  ]);
  const cls=cell.cls||"";
  if(cls.includes("water"))return storyChoice(seed,[
    "L’eau donne ici sa direction au paysage. Le cours visible relie naturellement cette case aux points situés en amont et en aval.",
    "Le réseau hydrographique traverse la cellule et constitue le repère le plus net de sa lecture.",
    "Cette case appartient au corridor humide du territoire ; relief, végétation et chemins tendent à s’organiser autour de lui."
  ]);
  if(cls.includes("road"))return storyChoice(seed,[
    "Une voie traverse la cellule et impose une lecture linéaire du lieu, davantage tournée vers le passage que vers l’épaisseur du terrain.",
    "La circulation structure ici la carte : le tracé relie les espaces voisins et coupe les motifs naturels de la surface."
  ]);
  if(cls.includes("building")||cls.includes("cad-building"))return storyChoice(seed,[
    "Le bâti occupe la cellule. La trame devient plus précise, mais ce contour cadastral ne raconte ni l’usage actuel ni l’état du bâtiment.",
    "Ici, le paysage se resserre autour d’une construction documentée par son emprise, sans que l’Atlas prétende connaître ce qui se passe derrière les murs."
  ]);
  if(cls.includes("forest"))return storyChoice(seed,[
    "La couverture boisée domine la cellule. Elle donne une continuité au paysage tout en rendant les détails du sol plus difficiles à lire.",
    "Cette case se fond dans une masse forestière : les ruptures de pente et les anciens tracés y deviennent plus discrets."
  ]);
  if(cls.includes("quarry"))return "La surface porte la marque d’une extraction ou d’un terrain remanié. Ce signal décrit l’usage du sol ; il ne suffit pas à prouver une exploitation souterraine.";
  if(cls.includes("field")||cls.includes("meadow"))return storyChoice(seed,[
    "La cellule s’ouvre sur un espace cultivé ou herbacé. Les limites, chemins et inflexions du relief y deviennent plus faciles à suivre.",
    "Le terrain est ici peu masqué : la géométrie des parcelles et la pente prennent davantage de présence dans la lecture."
  ]);
  if(Number.isFinite(slope)){
    const tail=direction?` La pente semble s’abaisser vers le ${direction}.`:"";
    if(slope<1.5)return storyChoice(seed,["Le relief paraît presque immobile ici.","La surface est remarquablement calme à l’échelle de la grille."])+tail;
    if(slope<5)return storyChoice(seed,["Le terrain s’incline doucement, sans rupture marquée.","Une pente légère donne une direction au lieu sans le brusquer."])+tail;
    if(slope<11)return storyChoice(seed,["La pente devient lisible et commence à gouverner la forme du lieu.","Le relief prend ici une présence nette, suffisante pour orienter écoulements et parcours."])+tail;
    return storyChoice(seed,["La déclivité est franche : cette case appartient à une rupture de relief notable.","Le terrain se cabre ici ; toute interprétation du sous-sol doit d’abord tenir compte de cette rupture."])+tail;
  }
  return "Aucun objet nommé ne domine cette case. Elle demeure néanmoins une pièce du relief, utile pour comprendre les continuités entre les lieux voisins.";
}
function featureNarrative(f){
  if(!f)return "";
  const name=f.name?` <strong>${esc(f.name)}</strong>`:"";
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`;
  if(f.cavity||/cavit|grotte|carri[eè]re|souterrain/i.test(descriptor)){
    const depth=Number.isFinite(f.depth)?` Une profondeur de ${Math.abs(f.depth)} m est déclarée dans la fiche ; elle ne décrit pas à elle seule toute l’enveloppe de la cavité.`:" Sa profondeur et son développement ne sont pas suffisamment documentés dans l’Atlas.";
    return `Un repère souterrain documenté apparaît ici :${name||" un ouvrage sans nom lisible"}.${depth}`;
  }
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/i.test(`${f.kind||""} ${f.nature||""}`)){
    const nature=f.nature?` Il s’agit d’un ${esc(String(f.nature).toLowerCase())}.`:"";
    const depth=Number.isFinite(f.depth)?` La profondeur finale annoncée est de ${Math.abs(f.depth)} m.`:"";
    return `La Banque du sous-sol signale ici${name||" un ouvrage"}.${nature}${depth} Ce point renseigne verticalement le secteur, sans prouver l’existence d’une galerie accessible.`;
  }
  if(f.observation){
    const confidence=f.confidenceLabel?` Son niveau de confiance est ${esc(f.confidenceLabel)}.`:"";
    const season=f.season?` Elle est associée à ${esc(f.season)}.`:"";
    return `Une observation locale a été déposée ici :${name}.${confidence}${season} Elle reste volontairement distincte d’une donnée institutionnelle.`;
  }
  if(f.heritage){
    const excerpt=String(f.description||"").replace(/\s+/g," ").trim();
    const lead=f.heritageCategory==="monument"?"Une notice patrimoniale officielle signale ici":f.heritageCategory==="garden"?"Le label Jardin remarquable distingue ici":f.heritageCategory==="house"?"Le label Maison des Illustres rattache ce lieu à":f.heritageCategory==="museum"?"Un Musée de France est localisé ici :":"Une page géolocalisée documente ici";
    const context=[f.period&&`période ${esc(f.period)}`,f.protection&&esc(f.protection)].filter(Boolean).join(" · ");
    return `${lead}${name||" un lieu notable"}.${context?` <span class="cell-source-line">${context}</span>`:""}${excerpt?` <span class="heritage-excerpt">${esc(excerpt.slice(0,360))}${excerpt.length>360?"…":""}</span>`:" La source confirme le lieu, mais l’Atlas n’invente pas son histoire manquante."}`;
  }
  if(f.lore)return `Ce point appartient à la mémoire locale de l’Atlas :${name}. Il conserve une trace, une ambiance ou une piste de recherche sans prendre la place d’une source officielle.`;
  if(f.cartofriches||f.siteType||f.siteStatus){
    const status=f.siteStatus?` Son statut est « ${esc(f.siteStatus)} ».`:"";
    const activity=f.activity?` L’activité mentionnée est ${esc(f.activity)}.`:"";
    return `La couche Cartofriches rattache cette case à${name||" un site recensé"}.${status}${activity} Cette notice décrit une trajectoire foncière ou industrielle, pas le sous-sol.`;
  }
  if(f.tags?.natural==="spring")return `Une source est cartographiée ici${name}. Sa présence signale un contact visible avec l’eau, mais ne permet pas à elle seule de reconstruire le réseau souterrain qui l’alimente.`;
  if(f.tags?.place)return `La carte nomme ici${name||` ${esc(f.kind||"un lieu")}`}. Ce toponyme sert de repère spatial ; il ne constitue pas en soi une description du site.`;
  return `La carte associe cette case à${name||` ${esc(f.kind||"un objet cartographique")}`}. La fiche conserve les attributs disponibles sans leur prêter davantage de précision qu’ils n’en ont.`;
}
function evidenceProfile(cell){
  const f=cell?.feature||{};
  const documented=!!(f.source||f.bss||f.cavity||f.heritage||f.cartofriches||f.tags||f.id);
  const observed=!!(f.observation||f.lore||f.confidenceLabel);
  const hypothesis=currentDepth()<0||!!cell?.confidence||!!f.hypothesisModel;
  return {documented,observed,interpreted:true,hypothesis};
}
function readingLedgerHtml(cell){
  const p=evidenceProfile(cell),chip=(cls,label,on)=>`<span class="reading-chip ${cls}${on?" active":""}">${label}</span>`;
  return `<div class="cell-reading-ledger" aria-label="Nature de la lecture">${chip("documented","fait",p.documented)}${chip("observed","observation",p.observed)}${chip("interpreted","interprétation",p.interpreted)}${chip("hypothesis","hypothèse",p.hypothesis)}</div>`;
}
function criticalReading(cell){
  const f=cell?.feature||{},descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(currentDepth()<0)return "La coupe aide à comparer les niveaux et à garder une continuité spatiale. Elle ne permet pas d’affirmer qu’une galerie passe sous cette cellule, ni que la profondeur affichée est mesurée localement.";
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/.test(descriptor))return "Cet ouvrage décrit un point vertical du sous-sol. Il peut éclairer la nature ou l’épaisseur des terrains traversés, mais il ne transforme pas le voisinage en cavité connue.";
  if(f.cavity||/cavit|grotte|souterrain/.test(descriptor))return "La présence du repère est documentée. En revanche, l’emprise, les accès, la stabilité et les connexions éventuelles restent inconnus tant qu’aucun plan ou levé local ne les établit.";
  if(f.heritage)return "La notice permet d’identifier et de contextualiser le lieu. Elle ne prouve pas que chaque détail historique, chaque dépendance ou chaque état du bâtiment soit encore observable aujourd’hui.";
  if(f.observation||f.lore)return "Cette information enrichit l’enquête locale. Sa valeur dépend de sa date, de sa précision et de la possibilité de la recouper avec une autre source.";
  if(f.cartofriches||f.siteType)return "Le statut du site renseigne son histoire d’usage. Il ne suffit pas à conclure sur une pollution, une accessibilité ou une structure souterraine particulière.";
  return "Ici, l’Atlas décrit surtout un contexte de terrain. Toute conclusion plus précise demanderait une source dédiée, une observation datée ou une mesure locale.";
}
function poiCategoryLabel(category){return {cavity:"cavité",bss:"ouvrage du sous-sol",heritage:"patrimoine",memory:"mémoire locale",industrial:"site anthropisé",natural:"repère naturel",home:"maison",location:"position"}[category]||"repère"}
function nearbyEntries(x,y){
  if(!state.lastGrid)return [];
  const center=gridToCoord(x,y,state.lastGrid.extent),z=currentZoom();
  const latRadius=(z.heightKm/111.32/Math.max(1,CONFIG.gridH-1))*7;
  const lonRadius=(z.widthKm/kmPerLon(center.lat)/Math.max(1,CONFIG.gridW-1))*7;
  const extent={west:center.lon-lonRadius,east:center.lon+lonRadius,south:center.lat-latRadius,north:center.lat+latRadius};
  const current=state.lastGrid.grid[y]?.[x]?.feature,currentId=current?.poiId||current?.id;
  const seen=new Set(),out=[];
  for(const p of queryNormalizedPois(extent).filter(p=>p.title&&p.uid!==currentId).sort((a,b)=>distanceMeters(center,a)-distanceMeters(center,b))){
    const key=p.uid||`${p.category}:${p.title}`;if(seen.has(key))continue;seen.add(key);
    const distance=Math.round(distanceMeters(center,p)),bearing=bearingDegrees(center,p);
    out.push({title:p.title,distance,bearing,direction:cardinalDirection(bearing),category:p.category});
    if(out.length>=3)break;
  }
  if(!out.length){
    for(let r=1;r<=5&&out.length<3;r++)for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++){
      if(Math.max(Math.abs(xx-x),Math.abs(yy-y))!==r)continue;
      const f=state.lastGrid.grid[yy]?.[xx]?.feature;if(!f||!f.name)continue;
      const key=f.poiId||f.id||`${f.kind}:${f.name}`;if(seen.has(key))continue;seen.add(key);
      const coord=gridToCoord(xx,yy,state.lastGrid.extent),distance=Math.round(distanceMeters(center,coord)),bearing=bearingDegrees(center,coord);
      out.push({title:f.name,distance,bearing,direction:cardinalDirection(bearing),category:f.poiCategory||poiSelectionKind({feature:f,cls:state.lastGrid.grid[yy]?.[xx]?.cls})||"natural"});
      if(out.length>=3)break;
    }
  }
  return out;
}
function nearbyNarrative(x,y){
  const entries=nearbyEntries(x,y);if(!entries.length)return "";
  return `<ul class="cell-nearby-list">${entries.map(e=>`<li><strong>${esc(e.title)}</strong><div class="cell-nearby-distance">${poiCategoryLabel(e.category)} · environ ${e.distance<50?"moins de 50":Math.round(e.distance/10)*10} m${e.direction?` vers le ${e.direction}`:""}</div></li>`).join("")}</ul>`;
}
function technicalCellLines(cell,x,y){
  const c=gridToCoord(x,y,state.lastGrid.extent),parts=[];
  parts.push(`<strong>Case ${x}, ${y}</strong> · ${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`);
  if(Number.isFinite(cell.elev)){const slope=localSlopeDegrees(x,y);parts.push(`Altitude interpolée : <strong>${Math.round(cell.elev)} m</strong>${Number.isFinite(slope)?` · pente locale ≈ ${slope.toFixed(1)}°`:""}`)}
  if(cell.feature){
    const f=cell.feature;
    parts.push(`Lecture : <strong>${esc(f.kind||"objet cartographique")}</strong>${f.name?` · ${esc(f.name)}`:""}`);
    if(f.id)parts.push(`Identifiant : <code>${esc(f.id)}</code>`);
    if(f.type)parts.push(`Type source : ${esc(f.type)}${f.detail?` · ${esc(f.detail)}`:""}`);
    if(f.position||f.precision)parts.push(`Positionnement : ${esc(f.position||"non précisé")}${f.precision?` · précision annoncée ${f.precision} m`:""}`);
    if(Number.isFinite(f.altitude))parts.push(`Altitude de la fiche : ${f.altitude} m`);
    if(Number.isFinite(f.depth))parts.push(`Profondeur déclarée / finale : <strong>${f.depth} m</strong>`);
    if(f.nature)parts.push(`Nature de l’ouvrage : ${esc(f.nature)}`);
    if(f.commune)parts.push(`Commune : ${esc(f.commune)}`);
    if(f.indice)parts.push(`Indice BSS : ${esc(f.indice)}`);
    if(f.place)parts.push(`Lieu-dit : ${esc(f.place)}`);
    if(f.record?.coordinateSource)parts.push(`Coordonnées : ${esc(f.record.coordinateSource)}`);
    if(f.season)parts.push(`Saison / date d’observation : ${esc(f.season)}`);
    if(f.categoryLabel)parts.push(`Catégorie : <strong>${esc(f.categoryLabel)}</strong>`);
    if(f.siteType)parts.push(`Type Cartofriches : <strong>${esc(f.siteType)}</strong>`);
    if(f.siteStatus)parts.push(`Statut Cartofriches : <strong>${esc(f.siteStatus)}</strong>`);
    if(f.address)parts.push(`Adresse : ${esc(f.address)}`);
    if(Number.isFinite(f.surface))parts.push(`Surface du site : ${Math.round(f.surface).toLocaleString("fr-FR")} m²`);
    if(f.activity)parts.push(`Ancienne activité : ${esc(f.activity)}${f.activityEnd?` · fin signalée ${esc(f.activityEnd)}`:""}`);
    if(f.occupation)parts.push(`Occupation : ${esc(f.occupation)}`);
    if(f.security)parts.push(`Sécurisation : ${esc(f.security)}`);
    if(f.pollution)parts.push(`Pollution / état environnemental : ${esc(f.pollution)}`);
    if(f.updated)parts.push(`Dernière actualisation signalée : ${esc(f.updated)}`);
    if(f.producer)parts.push(`Producteur Cartofriches : ${esc(f.producer)}`);
    if(f.period)parts.push(`Période / couche historique : ${esc(f.period)}`);
    if(f.reference)parts.push(`Référence patrimoniale : <code>${esc(f.reference)}</code>`);
    if(f.protection)parts.push(`Protection / label : ${esc(f.protection)}`);
    if(f.license)parts.push(`Licence : ${esc(f.license)}`);
    if(f.description&&f.heritage)parts.push(`Notice : ${esc(String(f.description).slice(0,900))}`);
    if(f.url&&f.heritage){const href=safeExternalUrl(f.url);if(href)parts.push(`<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">ouvrir la notice source ↗</a>`)}
    if(f.note)parts.push(`Note : ${esc(f.note)}`);
    if(Number.isFinite(f.bearing))parts.push(`Visée : ${f.bearing.toFixed(0)}° · distance estimée ${Math.round(f.distance||0)} m`);
    if(f.confidenceLabel)parts.push(`Confiance de l’observation : <strong>${esc(f.confidenceLabel)}</strong>`);
    if(f.comments)parts.push(`Commentaire source : ${esc(f.comments).slice(0,360)}`);
    if(cell.confidence)parts.push(`Confiance du volume affiché : <strong>${cell.confidence==="high"?"forte":cell.confidence==="med"?"moyenne":"faible"}</strong>`);
    if(f.source)parts.push(`Source : ${esc(f.source)}`);
  }else parts.push("Aucun objet précis n’est associé à cette case.");
  if(currentDepth()<0)parts.push("La forme souterraine visible appartient au modèle d’extrapolation, sauf les marqueurs explicitement documentés.");
  return parts;
}
function cellPresentationCategory(cell){
  const key=cellSelectionSound(cell);
  const categories={
    cellWater:["Milieu aquatique","≈"],cellForest:["Couverture boisée","T"],cellField:["Espace ouvert",cell?.cls?.includes("meadow")?",":"."],
    cellRoad:["Voie et circulation","─"],cellBuilding:["Bâti","█"],cellQuarry:["Terrain d’extraction","q"],cellCavity:["Repère souterrain","A#"],
    cellBss:["Donnée du sous-sol","B•"],cellHeritage:["Patrimoine documenté","MH"],cellMemory:["Mémoire locale","◎"],cellIndustrial:["Site anthropisé","F"],
    cellHome:["Repère privé","⌂"],cellUnderground:["Interprétation souterraine","▓"],cellTerrain:["Lecture du terrain",symbolForCell(cell)]
  };
  return categories[key]||categories.cellTerrain;
}
function documentedCellFacts(cell){
  const f=cell.feature,facts=[];
  if(f){
    facts.push(`<span class="cell-fact-kind">source</span><strong>${esc(f.kind||f.type||"Objet cartographique")}</strong>${f.name?` : ${esc(f.name)}`:""}`);
    if(f.protection)facts.push(`<span class="cell-fact-kind">statut</span>${esc(f.protection)}`);
    if(f.categoryLabel)facts.push(`<span class="cell-fact-kind">catégorie</span>${esc(f.categoryLabel)}`);
    if(f.siteStatus)facts.push(`<span class="cell-fact-kind">état</span>${esc(f.siteStatus)}`);
    if(Number.isFinite(f.depth))facts.push(`<span class="cell-fact-kind">mesure</span>Profondeur déclarée : ${f.depth} m`);
    if(f.confidenceLabel)facts.push(`<span class="cell-fact-kind">confiance</span>${esc(f.confidenceLabel)}`);
    if(f.source)facts.push(`<span class="cell-fact-kind">origine</span>${esc(f.source)}`);
  }else facts.push("Aucun repère ponctuel n’est attaché à cette case ; la lecture repose sur le terrain et les couches de surface.");
  if(currentDepth()<0)facts.push(`<span class="cell-fact-kind">prudence</span>Le volume souterrain affiché est une extrapolation, sauf marqueur explicitement documenté.`);
  return facts;
}
function featureDescriptionFingerprint(f){
  if(!f)return "none";
  return [f.poiId,f.id,f.indice,f.name,f.kind,f.type,f.nature,f.source,f.updated,f.depth,f.confidenceLabel,f.siteStatus,f.period].map(v=>String(v??"").slice(0,80)).join("~");
}
function cellDescriptionCacheKey(cell,x,y){
  const coord=gridToCoord(x,y,state.lastGrid.extent),slope=localSlopeDegrees(x,y);
  return [descriptionRuntime.revision,state.zoomIndex,state.depthIndex,state.scenario,CONFIG.gridW,CONFIG.gridH,coord.lat.toFixed(6),coord.lon.toFixed(6),cell.ch,cell.cls,Number.isFinite(cell.elev)?Math.round(cell.elev):"",Number.isFinite(slope)?slope.toFixed(1):"",featureDescriptionFingerprint(cell.feature)].join("|");
}
function trimDescriptionCache(){
  while(descriptionRuntime.cache.size>descriptionRuntime.maxEntries){
    const first=descriptionRuntime.cache.keys().next().value;descriptionRuntime.cache.delete(first);
  }
}
function buildCellDescriptionBundle(cell,x,y){
  const slope=localSlopeDegrees(x,y),f=cell.feature;
  const title=f?.name||f?.kind||"Case sans nom";
  const terrain=terrainPhrase(cell,slope,x,y),feature=featureNarrative(f);
  const meta=[Number.isFinite(cell.elev)?`altitude ≈ ${Math.round(cell.elev)} m`:"",Number.isFinite(slope)?`pente ≈ ${slope.toFixed(1)}°`:"",currentDepth()<0?`niveau ${depthSliceLabel()}`:"surface"].filter(Boolean).join(" · ");
  const [category,symbol]=cellPresentationCategory(cell);
  const immediate=`<article class="cell-sheet-card">
    <header class="cell-sheet-head"><div class="cell-sheet-symbol">${esc(symbol)}</div><div><div class="cell-sheet-kicker">${esc(category)}</div><div class="cell-sheet-title">${esc(title)}</div><div class="cell-sheet-meta">${esc(meta)}</div>${documentarySignalHtml(cell)}${readingLedgerHtml(cell)}</div></header>
    <section class="cell-section cell-section-reading"><h3>Lecture du lieu</h3><p>${terrain}${feature?` ${feature}`:""}</p></section>`;
  return {key:cellDescriptionCacheKey(cell,x,y),immediate,cell,x,y,title,details:null};
}
function buildCellDescriptionDetails(bundle){
  if(bundle.details)return bundle.details;
  const {cell,x,y}=bundle,facts=documentedCellFacts(cell),nearby=nearbyNarrative(x,y),relations=relationsNarrative(cell,x,y),critical=criticalReading(cell);
  bundle.details=`<section class="cell-section"><h3>Ce qui est documenté</h3><ul class="cell-facts">${facts.map(v=>`<li>${v}</li>`).join("")}</ul></section>
    ${nearby?`<section class="cell-section cell-section-nearby"><h3>À proximité</h3>${nearby}</section>`:""}
    ${relations}
    <section class="cell-section cell-section-critical"><h3>Ce que l’on peut en déduire</h3><p><strong>Lecture prudente.</strong> ${critical}</p></section>
    <details class="technical-details"><summary>Données techniques et sources</summary><div>${technicalCellLines(cell,x,y).join("<br>")}</div></details>`;
  return bundle.details;
}
function getCellDescriptionBundle(cell,x,y){
  const key=cellDescriptionCacheKey(cell,x,y),cached=descriptionRuntime.cache.get(key);
  if(cached){descriptionRuntime.hits++;descriptionRuntime.cache.delete(key);descriptionRuntime.cache.set(key,cached);return cached}
  descriptionRuntime.misses++;
  const bundle=buildCellDescriptionBundle(cell,x,y);descriptionRuntime.cache.set(key,bundle);trimDescriptionCache();return bundle;
}
function presentCellDescription(cell,x,y,{note="",assistHint="",title="Case sélectionnée",sheet="full"}={}){
  const bundle=getCellDescriptionBundle(cell,x,y),token=++descriptionRuntime.selectionToken;
  descriptionRuntime.lastKey=bundle.key;
  const footer=`<div class="readout-note"><span>▹</span><span>${esc(note||"Sélection mémorisée")}.${assistHint}</span></div>`;
  const placeholder=`<div class="cell-deferred is-loading" data-cell-details-token="${token}">Lecture documentaire en cours…</div>`;
  setReadoutContent(`${bundle.immediate}${placeholder}</article>${footer}`,{title,sheet,kind:"poi"});
  const hydrate=()=>{
    if(token!==descriptionRuntime.selectionToken)return;
    const target=els.readoutBody?.querySelector(`[data-cell-details-token="${token}"]`);if(!target)return;
    const details=buildCellDescriptionDetails(bundle);
    target.outerHTML=`<div class="cell-deferred">${details}</div>`;
    requestAnimationFrame(prepareReadoutSections);
  };
  if(bundle.details)requestAnimationFrame(hydrate);
  else if("requestIdleCallback" in window)requestIdleCallback(hydrate,{timeout:180});
  else setTimeout(hydrate,24);
}
function cellDescription(cell,x,y){
  const bundle=getCellDescriptionBundle(cell,x,y);
  return `${bundle.immediate}<div class="cell-deferred">${buildCellDescriptionDetails(bundle)}</div></article>`;
}

function symbolForCell(cell){
  const f=cell.feature;
  if(f?.cavity)return cavityMarker(f.record||f).glyph;
  const ch=cell.ch===" "?"∅":cell.ch;
  return ch;
}
function featureTagSummary(f){
  if(!f?.tags)return "";
  const keys=["highway","waterway","landuse","natural","building","surface","ref","place"];
  return keys.filter(k=>f.tags[k]).map(k=>`${k}=${f.tags[k]}`).join(" · ");
}
function hoverDescription(cell,x,y){
  const c=gridToCoord(x,y,state.lastGrid.extent),f=cell.feature;
  const title=f?.name||f?.kind||"case sans objet nommé";
  const kind=f?.kind||"aucun objet cartographique précis";
  const confidence=cell.confidence?`hypothèse ${cell.confidence==="high"?"forte":cell.confidence==="med"?"moyenne":"faible"}`:"";
  const tags=featureTagSummary(f),slope=localSlopeDegrees(x,y);
  const extra=[
    Number.isFinite(f?.depth)?`prof. ${f.depth} m`:"",
    f?.confidenceLabel?`confiance ${f.confidenceLabel}`:"",
    f?.categoryLabel?`cat. ${f.categoryLabel}`:"",
    f?.siteType?f.siteType:"",
    f?.siteStatus?f.siteStatus:"",
    Number.isFinite(f?.surface)?`${Math.round(f.surface).toLocaleString("fr-FR")} m²`:"",
    f?.period?`période ${f.period}`:"",
    Number.isFinite(f?.bearing)?`visée ${Math.round(f.bearing)}° / ${Math.round(f.distance||0)} m`:"",
    f?.season||"",f?.note?f.note:""
  ].filter(Boolean).join(" · ");
  const description=f?.heritage&&f?.description?`${String(f.description).replace(/\s+/g," ").slice(0,180)}${String(f.description).length>180?"…":""}`:"";
  const source=f?.source||"Atlas local · cellule cartographique";
  const sourceMode=f?.source?"REPÈRE DOCUMENTÉ":"CELLULE";
  const position=`${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
  const relief=Number.isFinite(cell.elev)?`≈ ${Math.round(cell.elev)} m${Number.isFinite(slope)?` · ${slope.toFixed(1)}°`:""}`:"non renseigné";
  const detail=[confidence,tags,extra,description].filter(Boolean).join(" · ");
  return `
    <div class="tip-kicker"><span>LOCAL SCAN // SURVOL</span><strong>${esc(sourceMode)}</strong></div>
    <div class="tip-head">
      <code class="tip-symbol">${esc(symbolForCell(cell))}</code>
      <div><span class="tip-name">${esc(title)}</span><span class="tip-kind">${esc(kind)}</span></div>
    </div>
    <div class="tip-data">
      <span><b>Relief</b>${esc(relief)}</span>
      <span><b>Position</b>${esc(position)}</span>
    </div>
    ${detail?`<div class="tip-detail">${esc(detail)}</div>`:""}
    <div class="tip-source">${esc(source)}</div>
    <div class="tip-action">clic → ouvrir la fiche complète</div>
  `;
}
const HOVER_DWELL_MS=320;
let hoveredKey="",hoverCandidateKey="",hoverCandidate=null,hoverDwellTimer=0;
function hideHover(){
  clearTimeout(hoverDwellTimer);hoverDwellTimer=0;hoverCandidate=null;hoverCandidateKey="";hoveredKey="";
  els.hoverTip.classList.remove("visible");
  els.hoverCellIndicator?.classList.remove("visible");els.canvasHoverMarker?.classList.remove("visible");
}
function positionHoverTipBesideRect(r){
  const pad=12,offset=11;
  const tipRect=els.hoverTip.getBoundingClientRect();
  let left=r.right+offset,top=r.top-Math.min(6,tipRect.height*.12);
  if(left+tipRect.width>window.innerWidth-pad)left=r.left-tipRect.width-offset;
  if(top+tipRect.height>window.innerHeight-pad)top=r.bottom-tipRect.height;
  top=Math.round(clamp(top,pad,Math.max(pad,window.innerHeight-tipRect.height-pad)));
  left=Math.round(clamp(left,pad,Math.max(pad,window.innerWidth-tipRect.width-pad)));
  els.hoverTip.style.transform="none";
  els.hoverTip.style.left=`${left}px`;
  els.hoverTip.style.top=`${top}px`;
}
function positionHoverTipBesideCell(target){positionHoverTipBesideRect(target.getBoundingClientRect())}
function revealCanvasHoverCandidate(){
  hoverDwellTimer=0;const candidate=hoverCandidate;
  if(!candidate||state.placingHouse||drag||pinch||!state.lastGrid)return;
  if(candidate.poiUid){
    const poi=normalizedPoiByUid(candidate.poiUid),region=canvasRuntime.symbolicPoiHitRegions?.find(v=>v.poi.uid===candidate.poiUid);if(!poi||!region)return;
    const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent),base=state.lastGrid.grid[p.y]?.[p.x];if(!base)return;
    const cell={...base,feature:symbolicPoiFeatureInfo(poi),cls:`${base.cls||""} c-symbolic-poi`};hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,p.x,p.y);els.hoverTip.classList.add("visible");
    const rect=symbolicPoiRegionClientRect(region);if(rect)positionHoverTipBesideRect(rect);return;
  }
  const pos=mapPositionFromClient(candidate.clientX,candidate.clientY);if(!pos||`${pos.x}:${pos.y}`!==candidate.key)return;
  const cell=state.lastGrid.grid[pos.y]?.[pos.x];if(!cell||(cell.ch===" "&&!cell.feature))return;
  hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,pos.x,pos.y);els.hoverTip.classList.add("visible");
  const rect=canvasCellRect(pos.x,pos.y);if(rect)positionHoverTipBesideRect(rect);
}
function scheduleCanvasHover(pos,ev){
  if(!pos||ev.pointerType!=="mouse"||state.placingHouse||drag||pinch)return;
  const hit=symbolicPoiHitFromClient(ev.clientX,ev.clientY,1.05);
  const px=hit?coordToGrid(hit.poi.lat,hit.poi.lon,state.lastGrid.extent):pos;
  positionCanvasMarker(els.canvasHoverMarker,px.x,px.y,true);
  const key=hit?`poi:${hit.poi.uid}`:`${pos.x}:${pos.y}`;if(key===hoverCandidateKey)return;
  clearTimeout(hoverDwellTimer);els.hoverTip.classList.remove("visible");hoveredKey="";hoverCandidateKey=key;
  hoverCandidate={key,clientX:ev.clientX,clientY:ev.clientY,poiUid:hit?.poi.uid||""};hoverDwellTimer=setTimeout(revealCanvasHoverCandidate,HOVER_DWELL_MS);
}
function revealHoverCandidate(){
  hoverDwellTimer=0;
  const candidate=hoverCandidate;
  if(!candidate||state.placingHouse||drag||pinch||!state.lastGrid)return;
  const target=cellElementAtClient(candidate.clientX,candidate.clientY);
  if(!target||target!==candidate.target)return;
  const x=+target.dataset.x,y=+target.dataset.y,cell=state.lastGrid.grid[y]?.[x];
  if(!cell||(cell.ch===" "&&!cell.feature))return;
  const key=`${x}:${y}`;hoveredKey=key;
  els.hoverTip.innerHTML=hoverDescription(cell,x,y);
  els.hoverTip.classList.add("visible");
  positionHoverTipBesideCell(target);
}
function scheduleHover(target,ev){
  if(!target||ev.pointerType&&ev.pointerType!=="mouse"||state.placingHouse||drag||pinch)return;
  const key=`${target.dataset.x}:${target.dataset.y}`;
  if(key===hoveredKey&&els.hoverTip.classList.contains("visible"))return;
  if(key===hoverCandidateKey)return;
  clearTimeout(hoverDwellTimer);
  els.hoverTip.classList.remove("visible");hoveredKey="";
  hoverCandidateKey=key;hoverCandidate={target,clientX:ev.clientX,clientY:ev.clientY};
  hoverDwellTimer=setTimeout(revealHoverCandidate,HOVER_DWELL_MS);
}
function saveHousePosition(coord,sourceLabel="placement manuel",persist=true){
  CONFIG.house={lat:+coord.lat,lon:+coord.lon};markSpatialIndexesDirty();
  if(els.houseLat){els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7)}
  if(persist){HOUSE_WAS_SAVED=true;try{localStorage.setItem("atlas-karst-house-v06",JSON.stringify(CONFIG.house));localStorage.removeItem("atlas-karst-house-v05")}catch{}}
  state.placingHouse=false;activeMapSurface()?.classList.remove("placing-house");
  els.placeHouse.classList.remove("active");
  els.houseHelp.innerHTML=`Repère enregistré : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong> · ${sourceLabel}.`;
  hideHover();render();
}
function setHousePlacement(active){
  state.placingHouse=active;els.placeHouse.classList.toggle("active",active);activeMapSurface()?.classList.toggle("placing-house",active);
  hideHover();
  els.houseHelp.innerHTML=active?'<span class="house-placement-note">Clique maintenant l’emplacement de la maison sur la carte. Le glisser-déposer est temporairement désactivé.</span>':`Repère actuel : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong>.`;
}

function downloadBlob(content,type,filename){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function buildAtlasSnapshot(){
  const layerKeys=["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"];
  return {
    format:"atlas-karst-snapshot",schema:2,appVersion:APP_VERSION,createdAt:new Date().toISOString(),
    house:{...CONFIG.house},
    view:{mode:"classic",renderMode:state.renderMode,zoomIndex:state.zoomIndex,depthIndex:state.depthIndex,center:{...state.center},scenario:state.scenario,layers:Object.fromEntries(layerKeys.map(k=>[k,!!state[k]]))},
    data:{
      osm:state.osm||[],osmMeta:state.osmMeta||null,osmBaseCoverage:state.osmBaseCoverage||[],osmDetailCoverage:state.osmDetailCoverage||[],
      officialCavities:state.officialCavities||[],cartofriches:state.cartofriches||[],heritageItems:state.heritageItems||[],heritageEnabled:state.heritageEnabled||{},
      cadastreBuildings:state.cadastreBuildings||[],cadastreParcels:state.cadastreParcels||[],address:state.address||null,
      bss:state.bss||[],elevation:state.elevation||null,observations:state.observations||[],loreItems:state.loreItems||[],encounterCollection:state.encounterCollection||{},encounterEnabled:!!state.encounterEnabled
    }
  };
}
function snapshotCounts(s=buildAtlasSnapshot()){
  const d=s.data||{};return {osm:d.osm?.length||0,buildings:d.cadastreBuildings?.length||0,parcels:d.cadastreParcels?.length||0,cavities:d.officialCavities?.length||0,carto:d.cartofriches?.length||0,bss:d.bss?.length||0,observations:d.observations?.length||0,lore:d.loreItems?.length||0,heritage:d.heritageItems?.length||0,codex:Object.values(d.encounterCollection||{}).filter(v=>encounterStatusRank(v?.status)>=2).length,elevation:d.elevation?"oui":"non"};
}
function updateSnapshotUI(source=state.snapshotSource){
  if(!els.snapshotStatus)return;
  const c=snapshotCounts();
  els.snapshotStatus.innerHTML=`<span><strong>État actif :</strong> ${esc(source||"session courante")}</span><span>OSM ${c.osm.toLocaleString("fr-FR")} · bâti ${c.buildings.toLocaleString("fr-FR")} · parcelles ${c.parcels.toLocaleString("fr-FR")}</span><span>Cavités ${c.cavities} · Cartofriches ${c.carto} · patrimoine ${c.heritage} · BSS ${c.bss.toLocaleString("fr-FR")}</span><span>Observations ${c.observations} · mémoire locale ${c.lore} · codex ${c.codex}/${LOCAL_ENCOUNTERS.length} · relief ${c.elevation}</span>`;
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
  const db=await openSnapshotDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");tx.objectStore(SNAPSHOT_DB_STORE).put(snapshot,SNAPSHOT_DB_KEY);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
}
async function loadSnapshotFromDb(){
  try{const db=await openSnapshotDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readonly");const req=tx.objectStore(SNAPSHOT_DB_STORE).get(SNAPSHOT_DB_KEY);req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)}})}catch{return null}
}
async function deleteSnapshotFromDb(){
  try{const db=await openSnapshotDb();await new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");tx.objectStore(SNAPSHOT_DB_STORE).delete(SNAPSHOT_DB_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}catch{}
}
function applyAtlasSnapshot(snapshot,{source="instantané",renderNow=true}={}){
  if(!snapshot||snapshot.format!=="atlas-karst-snapshot"||!snapshot.data)throw new Error("Format d’instantané non reconnu");
  const d=snapshot.data,v=snapshot.view||{};
  if(snapshot.house&&Number.isFinite(+snapshot.house.lat)&&Number.isFinite(+snapshot.house.lon)){
    CONFIG.house={lat:+snapshot.house.lat,lon:+snapshot.house.lon};markSpatialIndexesDirty();
    els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  }
  state.osm=Array.isArray(d.osm)?d.osm:[];markMapDataRevision("osm");state.osmMeta=d.osmMeta||null;
  state.osmBaseCoverage=Array.isArray(d.osmBaseCoverage)?d.osmBaseCoverage:[];state.osmDetailCoverage=Array.isArray(d.osmDetailCoverage)?d.osmDetailCoverage:[];
  state.osmCavities=extractOsmCavities(state.osm);
  state.officialCavities=Array.isArray(d.officialCavities)?d.officialCavities:[];
  state.cartofriches=Array.isArray(d.cartofriches)?d.cartofriches:[];state.heritageItems=Array.isArray(d.heritageItems)?d.heritageItems.map(normalizeHeritageItem).filter(Boolean):[];state.heritageEnabled={...state.heritageEnabled,...(d.heritageEnabled||{})};
  state.cadastreBuildings=Array.isArray(d.cadastreBuildings)?d.cadastreBuildings:[];state.cadastreParcels=Array.isArray(d.cadastreParcels)?d.cadastreParcels:[];
  state.address=d.address||null;state.bss=Array.isArray(d.bss)&&d.bss.length?d.bss:mergeBssItems(BSS_EMBEDDED_LOCAL);state.elevation=d.elevation||null;
  state.observations=Array.isArray(d.observations)?d.observations:[];state.loreItems=Array.isArray(d.loreItems)?d.loreItems:[];state.encounterCollection=d.encounterCollection&&typeof d.encounterCollection==="object"?d.encounterCollection:state.encounterCollection;state.encounterEnabled=d.encounterEnabled!==undefined?!!d.encounterEnabled:state.encounterEnabled;saveEncounterCollection();
  state.zoomIndex=clamp(Number(v.zoomIndex??state.zoomIndex),0,CONFIG.zooms.length-1);state.depthIndex=clamp(Number(v.depthIndex??state.depthIndex),0,CONFIG.depths.length-1);
  state.center=v.center&&Number.isFinite(+v.center.lat)&&Number.isFinite(+v.center.lon)?clampCenter({lat:+v.center.lat,lon:+v.center.lon},CONFIG.zooms[state.zoomIndex]):{...CONFIG.house};
  state.scenario=v.scenario||state.scenario;els.scenario.value=state.scenario;
  state.renderMode=v.renderMode==="ascii"?"ascii":v.renderMode==="symbolic"?"symbolic":state.renderMode;
  if(v.layers)for(const [k,value] of Object.entries(v.layers)){if(k in state){state[k]=!!value;if(els[k])els[k].checked=!!value}}
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
  updateSnapshotUI(source);
  updateEncounterUI();
  if(renderNow)render();
}
function exportSnapshotJson(){
  const snapshot=buildAtlasSnapshot();
  downloadBlob(JSON.stringify(snapshot,null,2),"application/json;charset=utf-8",`atlas-karst-${new Date().toISOString().slice(0,10)}.atlas.json`);
  els.snapshotHelp.textContent="Sauvegarde JSON exportée. Elle peut être chargée dans cette version ou une version ultérieure compatible.";
}
async function importSnapshotFile(file){
  if(!file)return;
  try{
    const snapshot=JSON.parse(await file.text());
    applyAtlasSnapshot(snapshot,{source:`sauvegarde importée · ${file.name}`});
    try{await saveSnapshotToDb(snapshot);els.snapshotHelp.textContent="Sauvegarde chargée et mémorisée dans ce navigateur pour le prochain démarrage."}
    catch(err){els.snapshotHelp.textContent=`Sauvegarde chargée pour cette session, mais le navigateur n’a pas pu la mémoriser (${err?.message||"stockage indisponible"}). Exporte plutôt un HTML autonome.`}
  }catch(err){els.snapshotHelp.textContent=`Import impossible : ${err?.message||"fichier invalide"}`}
  els.snapshotFile.value="";
}
function exportStandaloneHtml(){
  const snapshot=buildAtlasSnapshot();
  const clone=document.documentElement.cloneNode(true);
  const map=clone.querySelector("#map");if(map)map.textContent="";
  const tip=clone.querySelector("#hoverTip");if(tip)tip.textContent="";
  const assist=clone.querySelector("#selectionAssist");if(assist)assist.setAttribute("hidden","");
  const snapTag=clone.querySelector("#atlas-snapshot");
  snapTag.textContent=JSON.stringify(snapshot).replace(/</g,"\\u003c");
  const title=clone.querySelector("title");if(title)title.textContent=`Atlas Karst ASCII ${APP_VERSION} · instantané autonome`;
  const html="<!doctype html>\n"+clone.outerHTML;
  downloadBlob(html,"text/html;charset=utf-8",`atlas-karst-autonome-${new Date().toISOString().slice(0,10)}.html`);
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
  const blob=new Blob([header+lines.join("\n")],{type:"text/plain;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-karst-${z.id}-${d}m.txt`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

let suppressClickUntil=0;
activeMapSurface().addEventListener("click",ev=>{
  if(Date.now()<suppressClickUntil)return;
  if(state.placingHouse){
    const pos=eventMapPosition(ev);if(pos)saveHousePosition(pos.coord,"placement manuel sur la grille");
    return;
  }
  const pos=eventMapPosition(ev);if(!pos||!state.lastGrid)return;
  if(effectiveRenderMode()==="symbolic"){
    const hit=symbolicPoiHitFromClient(ev.clientX,ev.clientY,1.18);if(hit&&selectSymbolicPoi(hit.poi))return;
  }
  const symbolicAssist=effectiveRenderMode()==="symbolic";
  const radius=[1,1,1,2,2,3][state.zoomIndex]||1;
  selectGridCell(pos.x,pos.y,{assist:symbolicAssist,assistRadius:radius,note:"Sélection directe",showAssist:false});
});
activeMapSurface().addEventListener("dblclick",ev=>{
  ev.preventDefault();
  if(state.placingHouse)return;
  const pos=eventMapPosition(ev);if(!pos)return;
  state.center=clampCenter(pos.coord,currentZoom());
  if(state.zoomIndex<CONFIG.zooms.length-1){beginZoomTransition("in",{clientX:ev.clientX,clientY:ev.clientY});retroAudio.play("zoomIn");state.zoomIndex++}
  state.center=clampCenter(state.center,currentZoom());
  render();
});
let lastWheelZoomAt=0;
els.viewport.addEventListener("wheel",ev=>{
  if(Math.abs(ev.deltaY)<2)return;
  ev.preventDefault();
  const now=performance.now();
  if(now-lastWheelZoomAt<120)return;
  lastWheelZoomAt=now;
  const pos=eventMapPosition(ev);if(!pos)return;
  const dir=ev.deltaY<0?1:-1;
  setZoomIndex(state.zoomIndex+dir,pos.coord,{fx:pos.fx,fy:pos.fy,clientX:ev.clientX,clientY:ev.clientY});
},{passive:false});
let drag=null;
const touchPointers=new Map();
let pinch=null,pinchConsumed=false,lastPinchZoomAt=0;
function applyPanPreview(dx,dy){
  const surface=activeMapSurface();if(!surface)return;
  const safeX=clamp(Number(dx)||0,-window.innerWidth*1.5,window.innerWidth*1.5);
  const safeY=clamp(Number(dy)||0,-window.innerHeight*1.5,window.innerHeight*1.5);
  const transform=`translate3d(${safeX.toFixed(2)}px,${safeY.toFixed(2)}px,0)`;
  surface.style.transform=transform;
  if(CANVAS_RENDERER&&els.renderFxLayer)els.renderFxLayer.style.transform=transform;
}
function clearPanPreview(){
  const surface=activeMapSurface();if(surface)surface.style.transform="";
  if(els.renderFxLayer)els.renderFxLayer.style.transform="translateZ(0)";
}
function panGeographicPixelSpan(){
  if(CANVAS_RENDERER){
    const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas?.getBoundingClientRect();
    if(!m||!r)return {width:1,height:1};
    const scaleX=m.width?Math.abs(r.width/m.width):1,scaleY=m.height?Math.abs(r.height/m.height):1;
    return {
      width:Math.max(1,(CONFIG.gridW-1)*m.cellW*scaleX),
      height:Math.max(1,(CONFIG.gridH-1)*m.cellH*scaleY)
    };
  }
  const m=mapGridMetrics();
  return m?{width:Math.max(1,(CONFIG.gridW-1)*m.pitchX),height:Math.max(1,(CONFIG.gridH-1)*m.pitchY)}:{width:1,height:1};
}
function isPanPointer(ev){
  return ev.isPrimary!==false && (ev.pointerType!=="mouse" || ev.button===0);
}
function pointerDistance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function beginPinch(){
  if(touchPointers.size<2||state.placingHouse)return false;
  const pair=[...touchPointers.entries()].slice(0,2),a=pair[0][1],b=pair[1][1];
  const distance=pointerDistance(a,b);if(distance<14)return false;
  if(drag){drag=null;clearPanPreview();activeMapSurface()?.classList.remove("dragging")}
  pinch={ids:[pair[0][0],pair[1][0]],distance};
  pinchConsumed=true;suppressClickUntil=Date.now()+900;
  activeMapSurface()?.classList.add("pinching");els.viewport.classList.add("panning");
  return true;
}
function handlePinchMove(ev){
  if(!pinch)return false;
  const a=touchPointers.get(pinch.ids[0]),b=touchPointers.get(pinch.ids[1]);
  if(!a||!b)return false;
  const distance=pointerDistance(a,b);if(!Number.isFinite(distance)||distance<8)return true;
  const ratio=distance/pinch.distance,now=performance.now();
  if(now-lastPinchZoomAt<130)return true;
  const dir=ratio>=1.20?1:ratio<=.84?-1:0;if(!dir)return true;
  const minZoom=0,next=clamp(state.zoomIndex+dir,minZoom,CONFIG.zooms.length-1);
  pinch.distance=distance;lastPinchZoomAt=now;
  if(next===state.zoomIndex)return true;
  const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,pos=mapPositionFromClient(midX,midY);
  if(pos)setZoomIndex(next,pos.coord,{fx:pos.fx,fy:pos.fy,clientX:midX,clientY:midY});
  return true;
}
activeMapSurface().addEventListener("pointerdown",ev=>{
  if(ev.pointerType==="touch"){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size>=2&&beginPinch()){ev.preventDefault();return}
    if(state.placingHouse)return;
  }
  if(!isPanPointer(ev)||state.placingHouse||drag||pinch)return;
  const rect=els.viewport.getBoundingClientRect(),panSpan=panGeographicPixelSpan();
  drag={
    pointerId:ev.pointerId,
    pointerType:ev.pointerType||"mouse",
    x:ev.clientX,y:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,
    center:{...state.center},
    extent:extentFor(),
    rect:{width:rect.width,height:rect.height},
    panSpan,
    moved:false,dx:0,dy:0
  };
  try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
  activeMapSurface()?.classList.add("dragging");
  els.viewport.classList.add("panning");
  if(ev.pointerType!=="mouse")ev.preventDefault();
});
activeMapSurface().addEventListener("pointerover",ev=>{
  if(CANVAS_RENDERER||ev.pointerType!=="mouse"||drag||pinch||state.placingHouse)return;
  const target=ev.target?.closest?.(".cell");
  if(target&&els.map.contains(target))scheduleHover(target,ev);
});
activeMapSurface().addEventListener("pointerout",ev=>{
  if(CANVAS_RENDERER||ev.pointerType!=="mouse")return;
  const from=ev.target?.closest?.(".cell"),to=ev.relatedTarget?.closest?.(".cell");
  if(from&&from!==to)hideHover();
});
activeMapSurface().addEventListener("pointermove",ev=>{
  if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId)){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(handlePinchMove(ev)){ev.preventDefault();return}
  }
  if(CANVAS_RENDERER&&ev.pointerType==="mouse"&&!drag&&!pinch&&!state.placingHouse){const pos=mapPositionFromClient(ev.clientX,ev.clientY);if(pos)scheduleCanvasHover(pos,ev)}
  if(!drag)return;
  if(ev.pointerId!==drag.pointerId)return;
  drag.lastX=ev.clientX;drag.lastY=ev.clientY;
  const dx=drag.lastX-drag.x,dy=drag.lastY-drag.y;
  const threshold=drag.pointerType==="touch"?8:4;
  if(!drag.moved&&Math.hypot(dx,dy)<=threshold)return;
  if(!drag.moved)retroAudio.panStart();
  drag.moved=true;drag.dx=dx;drag.dy=dy;
  retroAudio.panMove(dx,dy);
  if(state.selectionAssistVisible)closeSelectionAssist();
  hideHover();
  ev.preventDefault();
  applyPanPreview(dx,dy);
});
activeMapSurface().addEventListener("pointerleave",ev=>{if(!drag&&ev.pointerType==="mouse")hideHover()});
function endDrag(ev){
  if(!drag||ev.pointerId!==drag.pointerId)return;
  const current=drag;
  const moved=current.moved;
  drag=null;
  if(moved){
    retroAudio.panEnd();
    suppressClickUntil=Date.now()+700;
    ev.preventDefault();
  }else if(current.pointerType!=="mouse"&&!state.placingHouse){
    const pos=eventMapPosition(ev);
    if(pos){suppressClickUntil=Date.now()+700;selectGridCell(pos.x,pos.y,{assist:true,assistRadius:state.zoomIndex===CONFIG.zooms.length-1?2:null,note:"Sélection tactile",showAssist:true,confirmIfSame:true});ev.preventDefault()}
  }
  try{activeMapSurface()?.releasePointerCapture?.(current.pointerId)}catch{}

  if(moved&&current.panSpan?.width>0&&current.panSpan?.height>0){
    // Le relâchement peut arriver quelques pixels après le dernier pointermove.
    // On utilise donc la dernière position réelle connue, puis le pas exact entre
    // le centre de la première et de la dernière cellule. Les marges du Canvas ne
    // participent plus à la conversion géographique, ce qui supprime la dérive.
    const finalX=Number.isFinite(current.lastX)?current.lastX:current.x+current.dx;
    const finalY=Number.isFinite(current.lastY)?current.lastY:current.y+current.dy;
    const dx=finalX-current.x,dy=finalY-current.y;
    const latSpan=current.extent.north-current.extent.south;
    const lonSpan=current.extent.east-current.extent.west;
    const candidate={
      lat:current.center.lat+(dy/current.panSpan.height)*latSpan,
      lon:current.center.lon-(dx/current.panSpan.width)*lonSpan
    };
    if(Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lon)){
      state.center=clampCenter(candidate,currentZoom());
      render("pan-release");
    }
  }

  clearPanPreview();
  activeMapSurface()?.classList.remove("dragging");
  els.viewport.classList.remove("panning");
  if(CANVAS_RENDERER){syncSelectionDom();updateWorldBoundaryFrame()}
}
function finishMapPointer(ev){
  const wasTouch=ev.pointerType==="touch";
  if(wasTouch)touchPointers.delete(ev.pointerId);
  if(pinch||pinchConsumed){
    suppressClickUntil=Date.now()+900;
    if(ev.cancelable)ev.preventDefault();
    if(pinch&&(!touchPointers.has(pinch.ids[0])||!touchPointers.has(pinch.ids[1]))){
      pinch=null;activeMapSurface()?.classList.remove("pinching");
      if(!drag)els.viewport.classList.remove("panning");
    }
    try{activeMapSurface()?.releasePointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size===0)pinchConsumed=false;
    return;
  }
  endDrag(ev);
}
activeMapSurface().addEventListener("pointerup",finishMapPointer);
activeMapSurface().addEventListener("pointercancel",finishMapPointer);
activeMapSurface().addEventListener("lostpointercapture",ev=>{
  if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId))touchPointers.delete(ev.pointerId);
  if(pinchConsumed)return;
  if(drag&&ev.pointerId===drag.pointerId)endDrag(ev);
});
els.viewport.addEventListener("scroll",()=>{if(CANVAS_RENDERER){syncRenderFxGeometry(canvasRuntime.metrics);syncSelectionDom();if(hoverCandidate){if(hoverCandidate.poiUid){const poi=normalizedPoiByUid(hoverCandidate.poiUid);if(poi&&state.lastGrid){const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);positionCanvasMarker(els.canvasHoverMarker,p.x,p.y,true)}}else{const [x,y]=hoverCandidate.key.split(":").map(Number);positionCanvasMarker(els.canvasHoverMarker,x,y,true)}}updateWorldBoundaryFrame()}},{passive:true});
els.selectionUp.addEventListener("click",()=>moveSelection(0,-1));
els.selectionDown.addEventListener("click",()=>moveSelection(0,1));
els.selectionLeft.addEventListener("click",()=>moveSelection(-1,0));
els.selectionRight.addEventListener("click",()=>moveSelection(1,0));
els.selectionCenter.addEventListener("click",()=>{if(state.selectedCell){state.center=clampCenter({...state.selectedCell.coord},currentZoom());render();closeSelectionAssist()}});
els.selectionAssistClose.addEventListener("click",closeSelectionAssist);
els.exportSnapshotJson.addEventListener("click",exportSnapshotJson);
els.importSnapshotJson.addEventListener("click",()=>els.snapshotFile.click());
els.snapshotFile.addEventListener("change",e=>importSnapshotFile(e.target.files?.[0]));
els.exportStandaloneHtml.addEventListener("click",exportStandaloneHtml);
els.clearSavedSnapshot.addEventListener("click",async()=>{await deleteSnapshotFromDb();els.snapshotHelp.textContent="La sauvegarde locale a été oubliée. Les données restent visibles jusqu’à la fermeture de cette session.";state.snapshotSource="session courante";updateSnapshotUI()});

els.syncOsm.addEventListener("click",syncOsmNow);
els.testOsm.addEventListener("click",testOsmServers);
els.openOsmQuery.addEventListener("click",openCurrentOverpassQuery);
els.importOsmJson.addEventListener("click",()=>els.osmFile.click());
els.osmFile.addEventListener("change",e=>importOsmJsonFile(e.target.files?.[0]));

els.syncPiezo.addEventListener("click",syncHubeauPiezo);
els.openBssDownload.addEventListener("click",()=>window.open(BSS_DOWNLOAD_URL,"_blank","noopener"));
els.importBss.addEventListener("click",()=>els.bssFile.click());
els.bssFile.addEventListener("change",e=>importBssFile(e.target.files?.[0]));
els.clearBss.addEventListener("click",()=>{
  try{localStorage.removeItem(BSS_LOCAL_KEY);localStorage.removeItem("atlas-karst-bss-v09b")}catch{}
  state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL);
  updateBssUI("Couche réinitialisée sur les 736 ouvrages BRGM embarqués.");
  els.layerBss.checked=true;state.layerBss=true;
  render();
});
els.syncCartofriches.addEventListener("click",syncCartofriches);
els.downloadCartofriches.addEventListener("click",()=>window.open(CARTOFRICHES_DOWNLOAD,"_blank","noopener"));
els.importCartofriches.addEventListener("click",()=>els.cartofrichesFile.click());
els.cartofrichesFile.addEventListener("change",e=>importCartofrichesFile(e.target.files?.[0]));
els.clearCartofriches.addEventListener("click",()=>{
  state.cartofriches=[];
  try{localStorage.removeItem(CARTOFRICHES_KEY)}catch{}
  updateCartofrichesUI("Couche locale vidée.");
  render();
});
els.cartofrichesReconverted.addEventListener("change",e=>{
  state.cartofrichesIncludeReconverted=e.target.checked;
  saveCartofriches();updateCartofrichesUI();render();
});
els.sidebarToggle.addEventListener("click",toggleSidebar);
els.sidebarClose.addEventListener("click",()=>setSidebarOpen(false));
els.sidebarBackdrop.addEventListener("click",()=>setSidebarOpen(false));
els.collapseCards.addEventListener("click",()=>setAllSidebarCards(true));
els.expandCards.addEventListener("click",()=>setAllSidebarCards(false));
els.infoToggle.addEventListener("click",()=>setInfoVisible(document.body.classList.contains("info-collapsed")));
els.readoutSheetHandle.addEventListener("click",cycleReadoutSheet);
els.mapDepthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
els.mapZoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
els.mapZoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
els.mapDepthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
function recenterOnHouse(reason="home"){
  clearActiveRelation();
  state.center=clampCenter({...CONFIG.house},currentZoom());
  state.selectedCavity=null;state.selectedCell=null;
  render(reason);
}
els.mapHome.addEventListener("click",()=>recenterOnHouse("map-home"));
els.mapLocate.addEventListener("click",locateUser);
els.locateMe.addEventListener("click",locateUser);
els.clearLocation.addEventListener("click",clearUserLocation);
els.centerOnLocation.addEventListener("change",e=>{state.centerOnLocation=e.target.checked;if(e.target.checked&&state.userLocation&&inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent())){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());render()}});
els.zoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
els.zoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
els.depthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
els.depthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
document.querySelectorAll("[data-pan-x]").forEach(b=>b.addEventListener("click",()=>moveCenter(+b.dataset.panX,+b.dataset.panY)));
els.homeBtn.addEventListener("click",()=>recenterOnHouse("panel-home"));
els.placeHouse.addEventListener("click",()=>{
  if(!state.selectedCell){els.houseHelp.innerHTML='<span class="house-placement-note">Clique d’abord une case : elle sera entourée en jaune.</span>';return}
  saveHousePosition(state.selectedCell.coord,"case sélectionnée");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.resetHouse.addEventListener("click",()=>{
  saveHousePosition({...HOUSE_ESTIMATE},"coordonnées précises fournies par l’utilisateur");
  recenterOnHouse("reset-home");
});
els.geocodeHouse.addEventListener("click",async()=>{
  const a=await fetchAddress(true);if(!a)return;
  if(state.cadastreBuildings.length){
    CONFIG.house={lat:a.lat,lon:a.lon};markSpatialIndexesDirty();
    state.address=a;
    snapHouseToBuilding(true);
  }else{
    saveHousePosition({lat:a.lat,lon:a.lon},`adresse officielle : ${a.label}`,true);
  }
  state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.snapHouseBuilding.addEventListener("click",()=>{if(snapHouseToBuilding(true)){state.center=clampCenter({...CONFIG.house},currentZoom());render()}});
els.openHistory.addEventListener("click",()=>{window.open(`https://remonterletemps.ign.fr/comparer/?lat=${CONFIG.house.lat}&lon=${CONFIG.house.lon}&z=16&mode=split-h`,"_blank","noopener")});
els.applyHouseCoords.addEventListener("click",()=>{
  const lat=Number(els.houseLat.value),lon=Number(els.houseLon.value);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)){els.houseHelp.innerHTML='<span class="house-placement-note">Coordonnées invalides.</span>';return}
  const e=largestExtent();
  if(!inExtent(lat,lon,e)){els.houseHelp.innerHTML='<span class="house-placement-note">Ces coordonnées sont hors de l’emprise chargée.</span>';return}
  saveHousePosition({lat,lon},"saisie numérique");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.addLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const mode=els.observationMode.value,glyph=els.localType.value,def=localMarkerDefinition(glyph),name=els.localName.value.trim()||def.detail;
  const target=state.selectedCell.coord,confidence=els.observationConfidence.value,season=els.observationSeason.value.trim();
  const o={id:`OBS-${Date.now()}`,mode,glyph,name,lat:target.lat,lon:target.lon,confidence,season,radius:clamp(Number(els.observationRadius.value)||80,10,1000),source:"Observation locale enregistrée dans cet atlas"};
  if(mode==="sight"){o.origin={...CONFIG.house};o.distance=distanceMeters(CONFIG.house,target);o.bearing=bearingDegrees(CONFIG.house,target)}
  state.observations.push(o);markSpatialIndexesDirty();saveLocalCavities();refreshCavities();render();
  els.localHelp.innerHTML=mode==="sight"?`Visée <strong>${o.bearing.toFixed(0)}°</strong> sur environ <strong>${Math.round(o.distance)} m</strong> enregistrée.`:`Observation <strong>${esc(name)}</strong> enregistrée avec une confiance ${confidenceLabel(confidence)}.`;
  els.localName.value="";
});
els.removeLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.textContent="Sélectionne d’abord l’observation à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.observation?f.record?.id:f?.record?.observation?.id||null;
  if(!id){
    const nearby=state.observations.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.localHelp.textContent="Aucune observation locale suffisamment proche de la sélection.";return}
  state.observations=state.observations.filter(o=>o.id!==id);saveLocalCavities();refreshCavities();render();els.localHelp.textContent="Observation locale supprimée.";
});

els.addLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const category=els.loreCategory.value,def=loreMarkerDefinition(category),target=state.selectedCell.coord;
  const item={
    id:`LOR-${Date.now()}`,
    category,
    name:els.loreName.value.trim()||def.label,
    period:els.lorePeriod.value.trim(),
    source:els.loreSource.value.trim()||"Repère local enregistré dans cet atlas",
    note:els.loreNote.value.trim(),
    lat:target.lat,
    lon:target.lon
  };
  state.loreItems.push(item);markSpatialIndexesDirty();saveLoreItems();render();
  els.loreHelp.innerHTML=`Repère <strong>${esc(item.name)}</strong> enregistré en catégorie <strong>${def.glyph}</strong>.`;
  els.loreName.value=""; els.lorePeriod.value=""; els.loreSource.value=""; els.loreNote.value="";
});
els.removeLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.lore?f.record?.id:null;
  if(!id){
    const nearby=state.loreItems.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];
    if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.loreHelp.textContent="Aucun repère patrimoine / mystère suffisamment proche de la sélection.";return}
  state.loreItems=state.loreItems.filter(o=>o.id!==id);saveLoreItems();render();els.loreHelp.textContent="Repère patrimoine / mystère supprimé.";
});



els.aroundRadius.addEventListener("change",e=>{state.aroundRadius=Number(e.target.value)||500;updateAroundMe();retroAudio.play("toggle")});
els.refreshAround.addEventListener("click",locateUser);
document.addEventListener("click",e=>{
  const focus=e.target.closest?.("[data-poi-focus]");
  if(focus){e.preventDefault();focusNormalizedPoi(focus.dataset.poiFocus);return}
  const relation=e.target.closest?.("[data-relation-from][data-relation-to]");
  if(relation){e.preventDefault();framePoiRelation(relation.dataset.relationFrom,relation.dataset.relationTo,relation.dataset.relationLabel||"relation")}
});


els.encounterEnabled.addEventListener("change",e=>{state.encounterEnabled=e.target.checked;saveEncounterCollection();updateEncounterUI();retroAudio.play("toggle")});
els.observeSurroundings.addEventListener("click",()=>startLocalEncounter());
els.testEncounter.addEventListener("click",()=>startLocalEncounter({testMode:true}));
els.openCodex.addEventListener("click",()=>openCodex());
els.encounterClose.addEventListener("click",closeEncounterOverlay);
els.encounterBody.addEventListener("click",handleEncounterClick);
els.encounterOverlay.addEventListener("click",e=>{if(e.target===els.encounterOverlay)closeEncounterOverlay()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&els.encounterOverlay.classList.contains("active")){e.preventDefault();closeEncounterOverlay()}});

els.guidedTourSelect.addEventListener("change",e=>{
  state.guidedTourId=e.target.value;state.guidedTourStep=0;
  if(state.guidedTourActive)focusGuidedTourStep(0);else updateGuidedTourUI();
  retroAudio.play("toggle");
});
els.guidedTourStart.addEventListener("click",startGuidedTour);
els.guidedTourPrev.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep-1));
els.guidedTourNext.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep+1));
els.guidedTourRecenter.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep,{announce:false}));
els.guidedTourStop.addEventListener("click",stopGuidedTour);

const heritageToggleBindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
for(const [id,key] of Object.entries(heritageToggleBindings))els[id].addEventListener("change",e=>{state.heritageEnabled[key]=e.target.checked;saveHeritage();updateHeritageUI();render()});
els.syncCultureHeritage.addEventListener("click",syncCultureHeritage);
els.syncWikipediaHeritage.addEventListener("click",syncWikipediaHeritage);
els.clearHeritage.addEventListener("click",clearHeritage);

els.recenterSelected.addEventListener("click",()=>{
  if(!state.selectedCell){setReadoutContent("<strong>Aucune case mémorisée.</strong><br>Clique d’abord un point de la carte.",{title:"Aucune sélection",sheet:"peek"});return}
  state.center=clampCenter(state.selectedCell.coord,currentZoom());render();
});
els.exportBtn.addEventListener("click",exportTxt);
els.retryData.addEventListener("click",async()=>{
  state.allowNetwork=true;
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  els.retryData.textContent="↻ recharger toutes les données";
  try{
    ["atlas-karst-address-v06","atlas-karst-cadastre-v06","atlas-karst-cavities-v06","atlas-karst-elevation-v06","atlas-karst-elevation-v09d"]
      .forEach(k=>localStorage.removeItem(k));
  }catch{}
  await syncOsmNow();
  Promise.allSettled([fetchAddress(true),fetchCadastre(),fetchCavities(),fetchElevation()]);
});
els.scenario.addEventListener("change",e=>{state.scenario=e.target.value;hypothesisModelCache.clear();render()});
els.renderModeSymbolic?.addEventListener("click",()=>setRenderMode("symbolic"));
els.renderModeAscii?.addEventListener("click",()=>setRenderMode("ascii"));
["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"].forEach(id=>{
  els[id].addEventListener("change",e=>{
    state[id]=e.target.checked;
    if(id==="layerHydrology")hypothesisModelCache.clear();
    if(id==="ambientMotion"){
      try{localStorage.setItem(AMBIENT_PREF_KEY,state.ambientMotion?"on":"off")}catch{}
      syncAmbientMotionState({pulse:state.ambientMotion,reason:"preference"});
    }
    render();
  });
});
els.cavitySelect.addEventListener("change",e=>{
  const c=state.cavities.find(v=>v.id===e.target.value);
  if(!c||!Number.isFinite(c.lat))return;
  state.zoomIndex=2;state.center=clampCenter({lat:c.lat,lon:c.lon},currentZoom());state.selectedCavity=c.id;render();
  setReadoutContent(`<strong>${esc(cavityName(c))}</strong><br>${esc(cavityMarker(c).label)} · ${esc(c.id)}${c.commune?` · ${esc(c.commune)}`:""}<br>La carte est recentrée sur le point inventorié. Descends à −8 m ou −14 m pour voir les scénarios, sans confondre leur dessin avec une topographie réelle.`,{title:cavityName(c),sheet:"full"});
});
window.addEventListener("resize",()=>{
  if(!mobileSidebarMode())document.body.classList.remove("sidebar-open");
  scheduleFrameFit();
});
if(typeof ResizeObserver!=="undefined"){
  const responsiveMapObserver=new ResizeObserver(()=>scheduleFrameFit());
  responsiveMapObserver.observe(document.querySelector("main"));
}
if(els.debugToggle)els.debugToggle.addEventListener("click",()=>setDebugEnabled(!debugState.enabled));
if(els.runSelfCheck)els.runSelfCheck.addEventListener("click",runAtlasSelfCheck);
if(els.exportDebugReport)els.exportDebugReport.addEventListener("click",exportDebugReport);
window.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="d"){
    e.preventDefault();setDebugEnabled(!debugState.enabled);
  }
});
window.addEventListener("keydown",e=>{
  const tag=e.target?.tagName?.toLowerCase();
  if(["input","select","textarea","button","a"].includes(tag)||e.target?.isContentEditable)return;
  const k=e.key.toLowerCase();
  const controlled=["arrowleft","arrowright","arrowup","arrowdown","q","d","z","s","+","-","[","]","h"];
  if(controlled.includes(k)||e.key==="=")e.preventDefault();
  if(k==="arrowleft"||k==="q")moveCenter(-1,0);
  else if(k==="arrowright"||k==="d")moveCenter(1,0);
  else if(k==="arrowup"||k==="z")moveCenter(0,1);
  else if(k==="arrowdown"||k==="s")moveCenter(0,-1);
  else if(e.key==="+"||e.key==="=")setZoomFromViewport(state.zoomIndex+1);
  else if(e.key==="-")setZoomFromViewport(state.zoomIndex-1);
  else if(e.key==="[")setDepthIndex(state.depthIndex-1);
  else if(e.key==="]")setDepthIndex(state.depthIndex+1);
  else if(k==="h"){state.layerHypothesis=!state.layerHypothesis;els.layerHypothesis.checked=state.layerHypothesis;render()}
});

// Les navigateurs mobiles n’autorisent Web Audio qu’après un geste explicite.
// On arme donc le moteur dès le premier contact, avant les gestionnaires métier.
document.addEventListener("pointerdown",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){retroAudio.silence();setRenderFxActivity(false,"hidden")}
  else pulseRenderFxActivity(650,"visible");
});
window.addEventListener("blur",()=>setRenderFxActivity(false,"blur"));
window.addEventListener("focus",()=>pulseRenderFxActivity(650,"focus"));
reducedMotionQuery?.addEventListener?.("change",()=>syncAmbientMotionState({pulse:false,reason:"system-preference"}));
document.addEventListener("touchstart",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("keydown",()=>retroAudio.unlock(),{capture:true});
document.addEventListener("toggle",ev=>{
  if(ev.target instanceof HTMLDetailsElement)retroAudio.play(ev.target.open?"panelOpen":"panelClose");
},true);

const syncSoundTargets={
  syncOsm:()=>[els.osmStatus],
  syncCultureHeritage:()=>[els.heritageStatus],
  syncWikipediaHeritage:()=>[els.heritageStatus],
  syncCartofriches:()=>[els.cartofrichesStatus],
  syncPiezo:()=>[els.bssStatus],
  retryData:()=>[els.osmStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
};
const quietButtonIds=new Set([
  "audioToggle","mapZoomOut","mapZoomIn","zoomOut","zoomIn","mapDepthUp","mapDepthDown","depthUp","depthDown",
  "selectionUp","selectionDown","selectionLeft","selectionRight","locateMe","mapLocate","debugToggle","runSelfCheck","exportDebugReport","guidedTourStart","guidedTourPrev","guidedTourNext","guidedTourRecenter","guidedTourStop","observeSurroundings","openCodex","encounterClose"
]);
document.addEventListener("click",ev=>{
  const button=ev.target.closest?.("button");
  if(!button||button.disabled||quietButtonIds.has(button.id)||button.dataset.audioQuiet!==undefined||button.dataset.zoom!==undefined||button.dataset.depth!==undefined||button.dataset.panX!==undefined)return;
  const syncTargets=syncSoundTargets[button.id]?.()||null;
  if(syncTargets){retroAudio.play("sync");syncTargets.forEach(status=>armOperationSound(status));return}
  if(["mapHome","homeBtn","recenterSelected","selectionCenter"].includes(button.id)){retroAudio.play("home");return}
  if(/export|download|openHistory|openBssDownload|openOsmQuery/i.test(button.id)){retroAudio.play("export");return}
  if(/clear|remove|reset/i.test(button.id)){retroAudio.play("delete");return}
  if(["sidebarToggle","sidebarClose","collapseCards","expandCards","infoToggle","selectionAssistClose"].includes(button.id)){retroAudio.play("panel");return}
  retroAudio.play("button");
},true);
document.addEventListener("change",ev=>{
  const control=ev.target;
  if(control?.matches?.('input[type="checkbox"],select'))retroAudio.play("toggle");
});
els.audioToggle.addEventListener("click",()=>retroAudio.toggle());
[els.osmStatus,els.heritageStatus,els.cartofrichesStatus,els.bssStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
  .filter(Boolean).forEach(status=>operationStatusObserver.observe(status,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]}));

async function bootAtlas(){
  retroAudio.init();
  setDebugEnabled(DEBUG_REQUESTED);
  try{state.ambientMotion=localStorage.getItem(AMBIENT_PREF_KEY)!=="off"}catch{}
  try{const savedMode=localStorage.getItem(RENDER_MODE_PREF_KEY);if(savedMode==="ascii"||savedMode==="symbolic")state.renderMode=savedMode}catch{}
  if(els.ambientMotion)els.ambientMotion.checked=state.ambientMotion;
  if(els.aroundRadius)els.aroundRadius.value=String(state.aroundRadius);
prepareSidebarCards();
  buildSidebarClusters();
  if(mobileSidebarMode()){
    setSidebarOpen(false);
    setInfoVisible(false);
  }else{
    setSidebarOpen(true);
    setInfoVisible(true);
    setReadoutSheetState("peek");
  }
  loadLocalCavities();
  loadLoreItems();
  loadHeritage();
  loadCartofriches();
  loadBssLocal();
  loadEncounterCollection();
  els.layerBss.checked=true;state.layerBss=true;
  updateLocationUI();
  updateEncounterUI();
  populateControls();
  refreshCavities();
  els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  els.houseHelp.innerHTML=`Repère actuel : <strong>${CONFIG.house.lat.toFixed(7)}, ${CONFIG.house.lon.toFixed(7)}</strong>. Cette version peut exporter cet état en sauvegarde réimportable ou en HTML autonome.`;
  if(els.osmHelp){
    els.osmHelp.innerHTML=LOCAL_FILE_MODE
      ? "Cette copie est ouverte en <code>file://</code>. Les requêtes sont valides, mais les serveurs Overpass peuvent refuser l’origine locale faute de Referer. Utilise <strong>tester les serveurs</strong> pour obtenir un diagnostic précis."
      : "Cette copie est ouverte depuis une origine web. OSM peut utiliser le Referer du site et synchroniser directement les fenêtres visibles.";
  }

  const savedSnapshot=EMBEDDED_SNAPSHOT||await loadSnapshotFromDb();
  if(savedSnapshot){
    try{applyAtlasSnapshot(savedSnapshot,{source:EMBEDDED_SNAPSHOT?"instantané embarqué":"sauvegarde locale",renderNow:false})}
    catch(err){console.warn("Instantané ignoré",err);state.allowNetwork=true}
  }
  render("boot");
  scheduleFrameFit();
  updateSnapshotUI();
  if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);

  if(savedSnapshot){
    populateCavitySelect();
    render();
    return;
  }
  if(OFFLINE_TEST){
    state.zoomIndex=3;
    state.center={...CONFIG.house};
    state.layerBss=false;
    els.layerBss.checked=false;
    els.offlineNotice.style.display="block";
    els.retryData.textContent="↻ tenter les services en ligne";
    setStatus("osm","ok","instantané embarqué minimal");
    setStatus("address","ok","coordonnées locales");
    setStatus("cadastre","bad","non embarqué");
    setStatus("cavities","bad","repères locaux seulement");
    updateCartofrichesUI();
    updateHeritageUI();
    updateBssUI();
    setStatus("elevation","bad","non embarqué");
    els.sourceNote.innerHTML="Mode de démonstration hors ligne. Exporte une sauvegarde ou un HTML autonome après synchronisation pour conserver un état plus complet.";
    populateCavitySelect();
    render();
  }else{
    if(els.offlineNotice)els.offlineNotice.style.display="none";
    Promise.allSettled([fetchOverpass(),fetchAddress(),fetchCadastre(),fetchCavities(),fetchElevation()]).then(()=>updateSnapshotUI());
  }
}
bootAtlas();
