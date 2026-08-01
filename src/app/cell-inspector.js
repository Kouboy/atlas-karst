const cellInspectorRuntime={ready:true,selections:0,touchSelections:0,poiSelections:0,plainSelections:0,hoverReveals:0,lastInput:"—"};
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

function mapPositionFromClient(clientX,clientY){
  if(!state.lastGrid)return null;
  const d=canvasDisplayMetrics();if(!d)return null;
  // Les glyphes sont dessinés à l'origine de chaque case. La conversion du
  // pointeur travaille par rapport au centre afin de conserver l'alignement.
  const gridX=(clientX-d.r.left-d.paddingX)/d.cellW-.5;
  const gridY=(clientY-d.r.top-d.paddingY)/d.cellH-.5;
  const x=clamp(Math.round(gridX),0,CONFIG.gridW-1),y=clamp(Math.round(gridY),0,CONFIG.gridH-1);
  const fx=clamp(gridX/Math.max(1,CONFIG.gridW-1),0,1),fy=clamp(gridY/Math.max(1,CONFIG.gridH-1),0,1);
  const result={coord:{lon:state.lastGrid.extent.west+fx*(state.lastGrid.extent.east-state.lastGrid.extent.west),lat:state.lastGrid.extent.north-fy*(state.lastGrid.extent.north-state.lastGrid.extent.south)},fx,fy,x,y};
  if(debugState.enabled){debugState.lastPointer=`${x}, ${y} · ${result.coord.lat.toFixed(5)} / ${result.coord.lon.toFixed(5)}`;updateDebugPanel()}
  return result;
}
function eventMapPosition(ev){
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
function clearSelectionDom(){
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
  positionCanvasMarker(els.canvasSelectionMarker,x,y,true);
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
  const marker=els.canvasPoiMarker;positionCanvasMarker(marker,x,y,true);marker.dataset.poiKind=pending.kind;marker.classList.remove("active");void marker.offsetWidth;marker.classList.add("active");
  clearTimeout(poiFeedbackTimer);const serial=pending.serial;poiFeedbackTimer=setTimeout(()=>{if(pendingPoiFeedback?.serial!==serial)return;pendingPoiFeedback=null;marker.classList.remove("active","visible");delete marker.dataset.poiKind},Math.max(80,remaining));
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

function selectSymbolicPoi(poi,note="Balise cartographique sélectionnée"){
  if(!poi||!state.lastGrid)return false;
  const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent),x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1),base=state.lastGrid.grid[y]?.[x];if(!base)return false;
  const feature=symbolicPoiFeatureInfo(poi),cell={...base,feature,cls:`${base.cls||""} c-symbolic-poi`};
  state.selectedCell={x,y,coord:{lat:poi.lat,lon:poi.lon},feature,poiUid:poi.uid};state.selectionSnapNote=note;state.selectionAssistVisible=false;
  debugState.lastSelection=`${x}, ${y} · ${poi.title}`;playCellSelectionSound(cell,{snapped:true});syncSelectionDom();updateSelectionAssist();triggerPoiSelectionFeedback(cell,x,y,{lat:poi.lat,lon:poi.lon});
  cellInspectorRuntime.selections++;cellInspectorRuntime.poiSelections++;cellInspectorRuntime.lastInput=note;
  presentCellDescription(cell,x,y,{note,title:poi.title||poi.kind||"Point d’intérêt",sheet:"full"});return true;
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
  cellInspectorRuntime.selections++;
  if(/tactile/i.test(note))cellInspectorRuntime.touchSelections++;
  if(poiKind)cellInspectorRuntime.poiSelections++;else cellInspectorRuntime.plainSelections++;
  cellInspectorRuntime.lastInput=note||"sélection directe";
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
    const cell={...base,feature:symbolicPoiFeatureInfo(poi),cls:`${base.cls||""} c-symbolic-poi`};hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,p.x,p.y);els.hoverTip.classList.add("visible");cellInspectorRuntime.hoverReveals++;
    const rect=symbolicPoiRegionClientRect(region);if(rect)positionHoverTipBesideRect(rect);return;
  }
  const pos=mapPositionFromClient(candidate.clientX,candidate.clientY);if(!pos||`${pos.x}:${pos.y}`!==candidate.key)return;
  const cell=state.lastGrid.grid[pos.y]?.[pos.x];if(!cell||(cell.ch===" "&&!cell.feature))return;
  hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,pos.x,pos.y);els.hoverTip.classList.add("visible");cellInspectorRuntime.hoverReveals++;
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
  cellInspectorRuntime.hoverReveals++;
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
