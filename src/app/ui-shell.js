const uiShellRuntime={ready:true,bound:false,fitRequests:0,fitRuns:0,fitCoalesced:0,gridChanges:0,sidebarChanges:0,infoChanges:0,sectionSwitches:0,nativeSubsections:0,activeSection:"explorer",lastGridProfile:"—"};
let uiShellMain=null,uiShellResizeObserver=null,frameFitTimer=0,frameFitRaf=0,depthTransitionTimer=0;

function playDepthTransition(direction){
  if(!ambientAllowed()||!els.depthTransition)return;
  clearTimeout(depthTransitionTimer);
  els.depthTransition.className=`depth-transition ${direction}`;
  void els.depthTransition.offsetWidth;
  els.depthTransition.classList.add("active");
  depthTransitionTimer=setTimeout(()=>{els.depthTransition.className="depth-transition"},700);
}

function poiEffectKind(cell){
  if(!ambientAllowed()||!cell)return "";
  const cls=String(cell.cls||""),f=cell.feature||{};
  if(cls.includes("c-label"))return "";
  if(f.poiCategory)return f.poiCategory;
  if(cls.includes("c-user-position"))return "location";
  if(cls.includes("c-house")||cls.includes("c-address"))return "home";
  if(cls.includes("c-bss")||cls.includes("c-piezo"))return "bss";
  if(cls.includes("c-nature-area"))return "natural";
  if(cls.includes("c-heritage"))return "heritage";
  if(cls.includes("c-carto")||cls.includes("c-lore-friche")||cls.includes("c-lore-abandoned"))return "industrial";
  if(cls.includes("c-observation")||cls.includes("c-lore")||cls.includes("c-personal")||cls.includes("c-user-hypothesis")||cls.includes("c-sight")||cls.includes("c-zone"))return "memory";
  if((cls.includes("c-doc")||cls.includes("c-pillar"))&&selectableFeature(cell))return f.cavity?"cavity":"natural";
  if(cls.includes("c-demo")||cls.includes("c-explorer-hint"))return "natural";
  return "";
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
  for(const sec of els.readoutBody.querySelectorAll(".cell-section")){
    if(sec.dataset.foldableReady)continue;
    const heading=sec.querySelector(":scope > h3");
    if(!heading)continue;
    const title=(heading.textContent||"").trim(),body=document.createElement("div");
    body.className="cell-section-body";
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    sec.appendChild(body);sec.dataset.foldableReady="1";sec.classList.add("is-foldable");
    const collapsed=collapsedByDefault.has(title);
    sec.classList.toggle("collapsed",collapsed);
    heading.setAttribute("role","button");heading.setAttribute("tabindex","0");heading.setAttribute("aria-expanded",String(!collapsed));
    const toggle=()=>{
      const next=!sec.classList.contains("collapsed");
      sec.classList.toggle("collapsed",next);heading.setAttribute("aria-expanded",String(!next));
      retroAudio.play(next?"panelClose":"panelOpen");
    };
    heading.addEventListener("click",toggle);
    heading.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle()}});
  }
}

function classifyAtlasControls(){
  const danger=/clear|remove|delete|reset|vider|supprimer|oublier|quitter/i;
  const sync=/sync|retry|reload|refresh|geocode|charger|actualiser|tester/i;
  const primary=/locate|observe|start|apply|add|import|exportStandalone|recenter|home/i;
  const nav=/zoom|depth|pan|prev|next|center|mapHome|mapLocate/i;
  for(const button of document.querySelectorAll("button")){
    button.classList.remove("action-primary","action-sync","action-danger","action-nav","action-subtle");
    const token=`${button.id} ${button.textContent}`;
    if(danger.test(token))button.classList.add("action-danger");
    else if(sync.test(token))button.classList.add("action-sync");
    else if(nav.test(token))button.classList.add("action-nav");
    else if(primary.test(token))button.classList.add("action-primary");
    else button.classList.add("action-subtle");
  }
}

function documentarySignalProfile(cell){
  const feature=cell?.feature||{},profile=evidenceProfile(cell);let level=1,label="contexte",color="#77a9bc";
  if(feature.heritage||feature.bss||feature.cavity||feature.cartofriches||feature.source){level=4;label="source documentée";color="#79e2ab"}
  if(feature.observation||feature.lore){level=Math.max(level,2);label="trace locale";color="#d895b8"}
  if(currentDepth()<0||profile.hypothesis){level=Math.min(level,2);label="coupe interprétative";color="#ad8bd1"}
  if(profile.documented&&profile.observed){level=Math.max(level,4);label="sources croisées";color="#e8bd64"}
  return {level,label,color};
}

function documentarySignalHtml(cell){
  const signal=documentarySignalProfile(cell),bars=Array.from({length:5},(_,index)=>`<i class="${index<signal.level?"on":""}"></i>`).join("");
  return `<div class="documentary-signal" style="--signal-color:${signal.color}"><span>assise documentaire</span><span class="documentary-signal-track" aria-label="${signal.level} niveaux sur 5">${bars}</span><strong>${esc(signal.label)}</strong></div>`;
}

function sidebarCardByKey(key){
  return els.sidebar?.querySelector(`[data-ui-card="${key}"]`)||null;
}
function mapReadingProfile(){
  const compact=matchMedia("(max-width:520px)").matches,nativeAndroid=isNativeAndroidApp();
  const base=compact?(nativeAndroid?12:11):(nativeAndroid?13:12);
  const profiles={dense:{factor:.88,label:"serré"},standard:{factor:1,label:"standard"},comfort:{factor:1.17,label:"confort"},large:{factor:1.34,label:"grand"}};
  const profile=profiles[state.mapReadingSize]||profiles.standard;
  return {...profile,fontSize:Math.round(base*profile.factor*10)/10,padding:compact?12:17};
}
function updateMapReadingSizeUI(){
  const profile=mapReadingProfile();
  if(els.mapReadingSize)els.mapReadingSize.value=state.mapReadingSize;
  if(els.mapReadingSizeHelp)els.mapReadingSizeHelp.textContent=`Réglage ${profile.label} · ${profile.fontSize}px. Une taille plus grande améliore la lecture et les cibles, mais montre moins de caractères sur la même emprise.`;
}
function setMapReadingSize(value){
  if(!["dense","standard","comfort","large"].includes(value))return;
  state.mapReadingSize=value;
  try{localStorage.setItem(MAP_READING_SIZE_PREF_KEY,value)}catch{}
  updateMapReadingSizeUI();scheduleFrameFit();
}
function sidebarSectionStorageKey(){return "atlas-karst-ui-section-v1"}
function syncTerrainDock(section=uiShellRuntime.activeSection){
  for(const button of document.querySelectorAll(".terrain-dock [data-terrain-section]")){
    const active=button.dataset.terrainSection===section;button.classList.toggle("active",active);button.setAttribute("aria-current",active?"page":"false");
  }
}
function prepareTerrainLightShell(){
  if(!isNativeAndroidApp()||!els.sidebar||els.sidebar.dataset.terrainLight==="1")return;
  els.sidebar.dataset.terrainLight="1";document.body.classList.add("terrain-light");
  const labels={carnets:"Carnet",explorer:"Carte",noter:"Observer",sources:"Autour"};
  for(const tab of els.sidebar.querySelectorAll(".sidebar-section-tab")){
    const label=labels[tab.dataset.sectionTarget];if(label){tab.textContent=label;tab.setAttribute("aria-label",label)}
  }
  for(const cluster of els.sidebar.querySelectorAll(":scope > .sidebar-cluster")){
    const label=labels[cluster.dataset.section],heading=cluster.querySelector(":scope > .sidebar-cluster-head h2");if(label&&heading)heading.textContent=label;
  }
  const advanced=new Set(["display","starting-point","legend","time","cartofriches","heritage","bss","hydrometry","biodiversity","nature","land-cover","geology","industrial-history","diagnostic"]);
  for(const key of advanced){const card=sidebarCardByKey(key);if(card)card.dataset.terrainAdvanced="true"}
  const cavitySearch=sidebarCardByKey("location")?.querySelector('[data-ui-subsection="cavity-search"]');if(cavitySearch)cavitySearch.dataset.terrainAdvanced="true";
  const toggle=document.createElement("button");
  toggle.type="button";toggle.className="terrain-advanced-toggle";toggle.setAttribute("aria-expanded","false");toggle.innerHTML="<span>☰</span> Outils avancés";
  toggle.addEventListener("click",()=>{
    const next=!document.body.classList.contains("terrain-advanced");document.body.classList.toggle("terrain-advanced",next);toggle.setAttribute("aria-expanded",String(next));toggle.innerHTML=next?"<span>×</span> Fermer les outils avancés":"<span>☰</span> Outils avancés";
    scheduleFrameFit();
  });
  els.sidebar.querySelector(".sidebar-head")?.insertAdjacentElement("afterend",toggle);
  for(const button of document.querySelectorAll(".terrain-dock [data-terrain-section]"))button.addEventListener("click",()=>{
    const section=button.dataset.terrainSection;
    openSidebarPanel(section,"");
  });
  const locationCard=sidebarCardByKey("location"),readingCard=sidebarCardByKey("map-reading"),fieldCard=sidebarCardByKey("field-notes"),statusCard=sidebarCardByKey("source-status"),carnetCard=sidebarCardByKey("carnets");
  const readingBody=readingCard?.querySelector(":scope > .card-body"),displayCard=sidebarCardByKey("display"),renderPanel=displayCard?.querySelector(".render-mode-panel"),renderNote=displayCard?.querySelector(".render-mode-note");
  if(readingBody&&renderPanel){
    const quickRender=document.createElement("div");quickRender.className="terrain-render-mode";quickRender.append(renderPanel);if(renderNote)quickRender.append(renderNote);readingBody.append(quickRender);
  }
  setCollapsibleState(locationCard,false,"h2");setCollapsibleState(readingCard,false,"h2");setCollapsibleState(fieldCard,false,"h2");setCollapsibleState(statusCard,false,"h2");setCollapsibleState(carnetCard,true,"h2");
}
function activateSidebarSection(section,{focus=false}={}){
  if(!els.sidebar?.dataset.clustered)return false;
  const target=String(section||"explorer"),clusters=[...els.sidebar.querySelectorAll(":scope > .sidebar-cluster")],buttons=[...els.sidebar.querySelectorAll(".sidebar-section-tab")];
  if(!clusters.some(cluster=>cluster.dataset.section===target))return false;
  for(const cluster of clusters)cluster.hidden=cluster.dataset.section!==target;
  for(const button of buttons){const selected=button.dataset.sectionTarget===target;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus()}
  els.sidebar.dataset.activeSection=target;uiShellRuntime.activeSection=target;uiShellRuntime.sectionSwitches=(uiShellRuntime.sectionSwitches||0)+1;
  try{localStorage.setItem(sidebarSectionStorageKey(),target)}catch{}
  syncTerrainDock(target);
  scheduleFrameFit();return true;
}
function openSidebarPanel(section,title=""){
  setSidebarOpen(true);activateSidebarSection(section);
  const cluster=els.sidebar.querySelector(`.sidebar-cluster[data-section="${section}"]`),card=[...cluster?.querySelectorAll(".card")||[]].find(item=>(item.querySelector(":scope > h2")?.textContent||"").trim()===title);
  if(card){setCollapsibleState(card,false,"h2");requestAnimationFrame(()=>card.scrollIntoView({block:"start",behavior:"auto"}))}
}

function bindNativeSidebarShell(){
  if(!els.sidebar||els.sidebar.dataset.clustered==="1")return;
  const navigation=els.sidebar.querySelector(".sidebar-section-tabs"),placements={
    carnets:["carnets"],explorer:["location","map-reading","display","starting-point","legend"],noter:["field-notes","time"],sources:["source-status","heritage","cartofriches","bss","hydrometry","biodiversity","nature","land-cover","geology","industrial-history","diagnostic"]
  };
  for(const tab of navigation?.querySelectorAll(".sidebar-section-tab")||[]){
    const section=tab.dataset.sectionTarget;
    tab.addEventListener("click",()=>activateSidebarSection(section));
    tab.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const tabs=[...navigation.querySelectorAll("button")],index=tabs.indexOf(tab),next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;activateSidebarSection(tabs[next].dataset.sectionTarget,{focus:true})});
  }
  for(const [section,keys] of Object.entries(placements)){
    const body=els.sidebar.querySelector(`.sidebar-cluster[data-section="${section}"] .sidebar-cluster-body`);
    for(const key of keys){const card=sidebarCardByKey(key);if(card&&body)body.appendChild(card)}
  }
  const sourcesBody=els.sidebar.querySelector('.sidebar-cluster[data-section="sources"] .sidebar-cluster-body');
  if(sourcesBody){
    const utilities=document.createElement("section");utilities.className="card interface-utilities";utilities.innerHTML='<h2>Réglages</h2><div class="card-body"><div class="grid2 interface-utility-actions"></div></div>';
    const actions=utilities.querySelector(".interface-utility-actions");if(els.audioToggle)actions.appendChild(els.audioToggle);if(els.debugToggle)actions.appendChild(els.debugToggle);sourcesBody.appendChild(utilities);
    const warning=els.sidebar.querySelector(".warning");if(warning)sourcesBody.appendChild(warning);
  }
  const notice=els.sidebar.querySelector("#offlineNotice");if(notice)els.sidebar.appendChild(notice);
  els.sidebar.dataset.clustered="1";uiShellRuntime.nativeSubsections=els.sidebar.querySelectorAll("[data-ui-subsection]").length;
  prepareTerrainLightShell();
  let initial="explorer";try{initial=localStorage.getItem(sidebarSectionStorageKey())||initial}catch{}
  if(isNativeAndroidApp())initial="explorer";
  activateSidebarSection(initial);
  classifyAtlasControls();
}

function prepareSidebarCards(){
  const panelMeta={
    "Carnets":["navigation","⊕"],"À proximité":["navigation","⌖"],"Affichage":["layers","▦"],"Point de départ":["navigation","⌖"],
    "Importer et exporter":["memory","◫"],"Rechercher une cavité":["navigation","⌁"],"Notes de terrain":["field","◎"],"Repères, récits et mémoire locale":["field","◇"],
    "Cartofriches · Cerema":["sources","F"],"Patrimoine & curiosités synchronisés":["sources","P"],"Forages BSS & piézomètres":["sources","B"],"Cours d’eau mesurés":["sources","H"],"Biodiversité locale":["sources","V"],"État des sources":["sources","↻"],"Diagnostic":["sources","⚙"],"Légende":["layers","?"]
  };
  const openByDefault=new Set(["Se situer","Carnets","Affichage","État des sources","Notes de terrain"]);
  for(const card of els.sidebar.querySelectorAll("#sidebarCardPool > .card:not([data-prototype-reserve]):not([data-interface-retired])")){
    if(card.classList.contains("warning")||card.id==="offlineNotice"||card.classList.contains("collapsible"))continue;
    const heading=card.querySelector(":scope > h2");if(!heading)continue;
    const meta=panelMeta[heading.textContent.trim()]||["navigation","•"];
    card.dataset.panelKind=meta[0];heading.dataset.icon=meta[1];
    const body=document.createElement("div");body.className="card-body";
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    card.appendChild(body);card.classList.add("collapsible");
    const title=heading.textContent.trim(),collapsed=!openByDefault.has(title);
    card.classList.toggle("collapsed",collapsed);heading.setAttribute("role","button");heading.setAttribute("tabindex","0");heading.setAttribute("aria-expanded",String(!collapsed));
    const toggle=()=>{
      const next=!card.classList.contains("collapsed");card.classList.toggle("collapsed",next);heading.setAttribute("aria-expanded",String(!next));
      retroAudio.play(next?"panelClose":"panelOpen");scheduleFrameFit();
    };
    heading.addEventListener("click",toggle);heading.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle()}});
  }
}

function setAllSidebarCards(collapsed){
  for(const card of els.sidebar.querySelectorAll(".card.collapsible")){
    card.classList.toggle("collapsed",collapsed);card.querySelector(":scope > h2")?.setAttribute("aria-expanded",String(!collapsed));
  }
  for(const cluster of els.sidebar.querySelectorAll(".sidebar-cluster.collapsible"))setCollapsibleState(cluster,collapsed,".sidebar-cluster-head");
  scheduleFrameFit();
}

function mobileSidebarMode(){return matchMedia("(max-width:940px)").matches}

function setSidebarOpen(open){
  const before=mobileSidebarMode()?document.body.classList.contains("sidebar-open"):!document.body.classList.contains("sidebar-collapsed");
  if(mobileSidebarMode())document.body.classList.toggle("sidebar-open",open);
  else document.body.classList.toggle("sidebar-collapsed",!open);
  if(before!==open)uiShellRuntime.sidebarChanges++;
  setTimeout(scheduleFrameFit,240);
}

function toggleSidebar(){
  if(mobileSidebarMode())setSidebarOpen(!document.body.classList.contains("sidebar-open"));
  else setSidebarOpen(document.body.classList.contains("sidebar-collapsed"));
}

function effectiveMapViewportRect(){
  const viewportRect=els.viewport?.getBoundingClientRect();if(!viewportRect)return null;
  let bottom=viewportRect.bottom;
  if(mobileReadoutMode()&&els.readout&&!document.body.classList.contains("info-collapsed")){
    const sheetState=els.readout.dataset.sheetState||"peek",readoutRect=els.readout.getBoundingClientRect();
    const overlaps=readoutRect.left<viewportRect.right&&readoutRect.right>viewportRect.left&&readoutRect.top<viewportRect.bottom&&readoutRect.bottom>viewportRect.top;
    if(overlaps&&sheetState!=="full"&&readoutRect.top>viewportRect.top+90)bottom=Math.min(bottom,readoutRect.top-4);
  }
  const height=Math.max(1,bottom-viewportRect.top);
  return {left:viewportRect.left,top:viewportRect.top,right:viewportRect.right,bottom,width:Math.max(1,viewportRect.width),height,centerX:viewportRect.left+viewportRect.width/2,centerY:viewportRect.top+height/2};
}

function responsiveGridProfile(main){
  const desktop=matchMedia("(min-width:941px)").matches;
  const {fontSize,padding}=mapReadingProfile(),available=effectiveMapViewportRect();
  const roomW=Math.max(desktop?620:260,available?.width||main.clientWidth||window.innerWidth);
  const roomH=Math.max(desktop?320:190,available?.height||els.viewport?.clientHeight||window.innerHeight*.58);
  const probe=measureCanvasLayout(fontSize,padding);
  let columns=Math.floor((roomW-padding*2-8)/Math.max(1,probe.cellW));
  let rows=Math.floor((roomH-padding*2-8)/Math.max(1,probe.cellH));
  columns=Math.floor(columns/8)*8;rows=Math.floor(rows/(desktop?4:2))*(desktop?4:2);
  columns=clamp(columns,desktop?120:40,desktop?384:160);rows=clamp(rows,desktop?44:18,desktop?128:104);
  if(Math.abs(columns-CONFIG.gridW)<16)columns=CONFIG.gridW;
  if(Math.abs(rows-CONFIG.gridH)<4)rows=CONFIG.gridH;
  return {w:columns,h:rows};
}

function applyResponsiveGridProfile(main){
  const next=responsiveGridProfile(main);uiShellRuntime.lastGridProfile=`${next.w} × ${next.h}`;
  if(next.w===CONFIG.gridW&&next.h===CONFIG.gridH)return false;
  CONFIG.gridW=next.w;CONFIG.gridH=next.h;uiShellRuntime.gridChanges++;return true;
}

function setMapCssVariable(main,name,value){if(main.style.getPropertyValue(name)!==value)main.style.setProperty(name,value)}

function alignRenderedCenterToVisibleViewport(){
  if(!mobileReadoutMode()||!els.viewport)return;
  const surface=activeMapSurface(),visible=effectiveMapViewportRect();if(!surface||!visible)return;
  const viewportRect=els.viewport.getBoundingClientRect();
  const targetX=visible.centerX-viewportRect.left,targetY=visible.centerY-viewportRect.top;
  const surfaceCenterX=surface.offsetLeft+surface.offsetWidth/2,surfaceCenterY=surface.offsetTop+surface.offsetHeight/2;
  const maxX=Math.max(0,els.viewport.scrollWidth-els.viewport.clientWidth),maxY=Math.max(0,els.viewport.scrollHeight-els.viewport.clientHeight);
  els.viewport.scrollLeft=clamp(surfaceCenterX-targetX,0,maxX);els.viewport.scrollTop=clamp(surfaceCenterY-targetY,0,maxY);
}

function fitMapFrame(){
  uiShellRuntime.fitRuns++;
  if(!CANVAS_RENDERER)return;
  const main=uiShellMain||document.querySelector("main"),surface=activeMapSurface();if(!main||!surface||!els.viewport)return;
  const desktop=matchMedia("(min-width:941px)").matches;
  // L’APK libère davantage de surface que le navigateur. On en consacre une
  // petite part à la lisibilité des glyphes et des cartouches de carte.
  const {fontSize:baseFont,padding:basePadding}=mapReadingProfile();
  setMapCssVariable(main,"--map-font-size",`${baseFont}px`);setMapCssVariable(main,"--map-padding",`${basePadding}px`);
  const availableWidth=Math.max(280,main.clientWidth);setMapCssVariable(main,"--map-frame-width",desktop?`${availableWidth}px`:"100%");
  if(applyResponsiveGridProfile(main)){scheduleRender("responsive-grid");return}
  const previousSignature=canvasRuntime.layoutSignature,m=syncCanvasSize();
  const finalWidth=Math.ceil(m?.displayWidth||availableWidth),frameWidth=desktop?availableWidth:Math.min(availableWidth,finalWidth);
  setMapCssVariable(main,"--map-frame-width",`${frameWidth}px`);els.viewport.classList.toggle("map-centered",finalWidth<frameWidth-4);
  if(state.lastGrid&&previousSignature!==canvasRuntime.layoutSignature)drawCanvasMap(state.lastGrid,"layout-fit");
  else syncRenderFxGeometry(m);
  requestAnimationFrame(()=>{
    syncRenderFxGeometry(canvasRuntime.metrics);alignRenderedCenterToVisibleViewport();syncSelectionDom();
    if(pendingPoiFeedback)applyPendingPoiSelectionFeedback();
    updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker();
  });
}

function scheduleFrameFit(){
  uiShellRuntime.fitRequests++;
  if(frameFitTimer||frameFitRaf)uiShellRuntime.fitCoalesced++;
  clearTimeout(frameFitTimer);
  frameFitTimer=setTimeout(()=>{
    frameFitTimer=0;
    if(frameFitRaf)return;
    frameFitRaf=requestAnimationFrame(()=>{frameFitRaf=0;fitMapFrame()});
  },34);
}

function setInfoVisible(visible){
  const before=!document.body.classList.contains("info-collapsed");
  document.body.classList.toggle("info-collapsed",!visible);els.infoToggle.textContent=EXPLORATIONS_EDITION?(visible?"Fermer la fiche":"Ce lieu"):(visible?"Masquer la fiche":"Fiche");
  if(before!==visible)uiShellRuntime.infoChanges++;
  if(visible&&mobileReadoutMode()&&!els.readout.dataset.sheetState)setReadoutSheetState("peek");
  setTimeout(scheduleFrameFit,30);
}

function closeMobileSidebarAfterAction(){if(mobileSidebarMode())setSidebarOpen(false)}

function populateControls(){
  CONFIG.zooms.forEach((zoom,index)=>{
    const button=document.createElement("button");button.dataset.zoom=index;button.title=zoom.label;button.textContent=zoom.short;
    button.addEventListener("click",()=>{setZoomFromViewport(index);closeMobileSidebarAfterAction()});els.zoomButtons.appendChild(button);
  });
  CONFIG.depths.forEach((depth,index)=>{
    const button=document.createElement("button");button.dataset.depth=depth;button.textContent=depthSliceLabel(depth);button.title=depth===0?"Surface":`${depthSliceMeta(depth).range} · coupe interprétative, non mesurée par défaut`;
    button.addEventListener("click",()=>{setDepthIndex(index);closeMobileSidebarAfterAction()});els.depthButtons.appendChild(button);
  });
}

function populateCavitySelect(){
  const fallback=territoryUsesEmbeddedData("cavityInventory",CONFIG.territory)?CAVITY_INVENTORY:[];
  const list=state.cavities.length?state.cavities:fallback;
  els.cavitySelect.innerHTML='<option value="">Choisir une cavité…</option>';
  list.slice().sort((a,b)=>cavityName(a).localeCompare(cavityName(b),"fr")).forEach(cavity=>{
    const option=document.createElement("option");option.value=cavity.id;option.textContent=`${cavityMarker(cavity).glyph} ${cavityName(cavity)}${cavity.commune?` · ${cavity.commune}`:""}${Number.isFinite(cavity.lat)?"":" · coordonnées indisponibles"}`;
    option.disabled=!Number.isFinite(cavity.lat);els.cavitySelect.appendChild(option);
  });
  els.cavityHelp.textContent=state.cavityInventoryOnly?"L’inventaire communal est disponible, mais le service de coordonnées n’a pas répondu. Les repères OSM et locaux restent utilisables.":"Sélectionner un repère recentre la carte et passe au zoom Secteur. Les données BRGM sont recherchées dans toute l’emprise navigable.";
}

function bindUiShell(){
  if(uiShellRuntime.bound)return;
  uiShellRuntime.bound=true;uiShellMain=document.querySelector("main");
  els.sidebarToggle.addEventListener("click",toggleSidebar);
  els.sidebarClose.addEventListener("click",()=>setSidebarOpen(false));
  els.sidebarBackdrop.addEventListener("click",()=>setSidebarOpen(false));
  els.collapseCards.addEventListener("click",()=>setAllSidebarCards(true));
  els.expandCards.addEventListener("click",()=>setAllSidebarCards(false));
  els.infoToggle.addEventListener("click",()=>setInfoVisible(document.body.classList.contains("info-collapsed")));
  els.mapCarnets?.addEventListener("click",()=>openSidebarPanel("carnets","Carnets"));
  els.mapDisplay?.addEventListener("click",()=>openSidebarPanel("explorer","Affichage"));
  els.mapNotes?.addEventListener("click",()=>openSidebarPanel("noter","Notes de terrain"));
  els.mapReadingSize?.addEventListener("change",event=>setMapReadingSize(event.target.value));
  window.addEventListener("resize",()=>{if(!mobileSidebarMode())document.body.classList.remove("sidebar-open");scheduleFrameFit()});
  if(typeof ResizeObserver!=="undefined"&&uiShellMain){uiShellResizeObserver=new ResizeObserver(()=>scheduleFrameFit());uiShellResizeObserver.observe(uiShellMain)}
}
