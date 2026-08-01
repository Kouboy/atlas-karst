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

function render(reason="direct"){
  accountDataRender(reason);
  const renderStarted=performance.now();
  let phaseStarted=renderStarted;
  hideHover();
  if(debugState.enabled)debugState.lastReason=reason;
  if(!drag)clearPanPreview();
  const responsiveMain=document.querySelector("main");
  if(responsiveMain)applyResponsiveGridProfile(responsiveMain);
  const z=currentZoom(),depth=currentDepth(),extent=extentFor();
  phaseStarted=performance.now();const layoutMs=phaseStarted-renderStarted;
  spatialRuntime.lastQueryCandidates=0;spatialRuntime.lastQueryResults=0;ensureSpatialIndexes();
  const indexMs=performance.now()-phaseStarted;
  const composed=composeMapGrid(extent,depth),g=composed.grid;
  document.body.dataset.depthBand=depth===0?"surface":depth>=-5?"shallow":depth>=-15?"middle":"deep";
  if(depth<0)applyUndergroundVisualContract(depth);
  state.lastGrid=g;
  const outputStarted=performance.now();
  let visiblePoiCount=0;
  if(CANVAS_RENDERER){
    visiblePoiCount=drawCanvasMap(g,reason);
    els.map.textContent="";
  }else{
    visiblePoiCount=renderDomMap(g);
  }
  const outputMs=performance.now()-outputStarted;
  const interfaceStarted=performance.now();
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
  requestAnimationFrame(()=>{alignRenderedCenterToVisibleViewport();syncSelectionDom();updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker()});
  updateSidebarClusterStatus();
  updateAroundMe();
  updateGuidedTourUI();
  scheduleFrameFit();
  const interfaceMs=performance.now()-interfaceStarted;
  const renderElapsed=performance.now()-renderStarted;
  debugState.lastRenderPhases={layout:layoutMs,index:indexMs,grid:composed.gridMs,layers:composed.layersMs,output:outputMs,interface:interfaceMs};
  debugState.renderCount++;debugState.lastRenderMs=renderElapsed;debugState.totalRenderMs+=renderElapsed;
  debugState.maxRenderMs=Math.max(debugState.maxRenderMs,renderElapsed);debugState.lastPoiCount=visiblePoiCount;
  updateDebugPanel();
  if(debugState.enabled&&String(reason).startsWith("data-batch:"))requestAnimationFrame(runAtlasSelfCheck);
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

bindInputController();
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
els.mapLocate.addEventListener("click",locateUser);
els.locateMe.addEventListener("click",locateUser);
els.clearLocation.addEventListener("click",clearUserLocation);
els.centerOnLocation.addEventListener("change",e=>{state.centerOnLocation=e.target.checked;if(e.target.checked&&state.userLocation&&inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent())){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());render()}});
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
  if(savedSnapshot){
    populateCavitySelect();
    render("boot-snapshot");
    scheduleFrameFit();updateSnapshotUI();
    if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
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
    render("boot-offline");
  }else{
    if(els.offlineNotice)els.offlineNotice.style.display="none";
    render("boot-online");
    Promise.allSettled([fetchOverpass(),fetchAddress(),fetchCadastre(),fetchCavities(),fetchElevation()]).then(()=>updateSnapshotUI());
  }
  scheduleFrameFit();updateSnapshotUI();
  if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);
}
bootAtlas();
