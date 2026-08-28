const VIEW_LAYER_CONTROL_IDS=["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerHydrometry","layerBiodiversity","layerNatureAreas","layerIndustrialHistory","layerLandCover","layerGeology","layerObservations","layerPersonal","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerUserHypotheses","layerHydrology","layerLabels","layerHouse","ambientMotion"];
const VIEW_LAYER_FILTER_KEY="atlas-karst-layer-filter-v1";
const viewControllerRuntime={ready:true,bound:false,modeChanges:0,scenarioChanges:0,layerChanges:0,cavitySelections:0,recenters:0,debugActions:0,lastAction:"initialisation"};

function accountViewAction(action){viewControllerRuntime.lastAction=action}
function recenterSelectedView(){
  viewControllerRuntime.recenters++;accountViewAction("recentrage de la sélection");
  if(!state.selectedCell){setReadoutContent("<strong>Aucune case mémorisée.</strong><br>Clique d’abord un point de la carte.",{title:"Aucune sélection",sheet:"peek"});return}
  state.center=clampCenter(state.selectedCell.coord,currentZoom());render("selection-recenter");
}
function setScenarioFromControl(value){
  viewControllerRuntime.scenarioChanges++;accountViewAction(`scénario ${value}`);
  state.scenario=value;hypothesisModelCache.clear();render("scenario-change");
}
function setLayerFromControl(id,enabled){
  viewControllerRuntime.layerChanges++;accountViewAction(`couche ${id}`);state[id]=enabled;
  if(id==="layerHydrology")hypothesisModelCache.clear();
  if(id==="ambientMotion"){
    try{localStorage.setItem(AMBIENT_PREF_KEY,state.ambientMotion?"on":"off")}catch{}
    syncAmbientMotionState({pulse:state.ambientMotion,reason:"preference"});
  }
  render(`layer-change:${id}`);
}
function layerControlIdsForCategory(category=els.layerCategoryFilter?.value||"all"){
  if(category==="all")return [...VIEW_LAYER_CONTROL_IDS];
  return [...els.layerSwitchList?.querySelectorAll(`[data-layer-category="${category}"] input[id]`)||[]].map(input=>input.id).filter(id=>VIEW_LAYER_CONTROL_IDS.includes(id));
}
function applyLayerCategoryFilter(category=els.layerCategoryFilter?.value||"all"){
  const normalized=["all","terrain","documents","underground","interface"].includes(category)?category:"all";
  if(els.layerCategoryFilter)els.layerCategoryFilter.value=normalized;
  for(const label of els.layerSwitchList?.querySelectorAll("[data-layer-category]")||[])label.hidden=normalized!=="all"&&label.dataset.layerCategory!==normalized;
  try{localStorage.setItem(VIEW_LAYER_FILTER_KEY,normalized)}catch{}
}
function setLayerControlGroup(ids,enabled,reason){
  const targets=ids.filter(id=>VIEW_LAYER_CONTROL_IDS.includes(id));if(!targets.length)return;
  viewControllerRuntime.layerChanges+=targets.length;accountViewAction(reason);
  for(const id of targets){state[id]=enabled;if(els[id])els[id].checked=enabled}
  if(targets.includes("layerHydrology"))hypothesisModelCache.clear();
  if(targets.includes("ambientMotion")){
    try{localStorage.setItem(AMBIENT_PREF_KEY,state.ambientMotion?"on":"off")}catch{}
    syncAmbientMotionState({pulse:state.ambientMotion,reason:"preference"});
  }
  render(reason);
}
function focusCavityFromControl(id){
  const cavity=state.cavities.find(item=>item.id===id);if(!cavity||!Number.isFinite(cavity.lat))return;
  viewControllerRuntime.cavitySelections++;accountViewAction("sélection de cavité");
  state.zoomIndex=2;state.center=clampCenter({lat:cavity.lat,lon:cavity.lon},currentZoom());state.selectedCavity=cavity.id;render("cavity-focus");
  setReadoutContent(`<strong>${esc(cavityName(cavity))}</strong><br>${esc(cavityMarker(cavity).label)} · ${esc(cavity.id)}${cavity.commune?` · ${esc(cavity.commune)}`:""}<br>La carte est recentrée sur le point inventorié. Descends à −8 m ou −14 m pour voir les scénarios, sans confondre leur dessin avec une topographie réelle.`,{title:cavityName(cavity),sheet:"full"});
}
function runViewDebugAction(action,handler){viewControllerRuntime.debugActions++;accountViewAction(action);return handler()}
function bindViewController(){
  if(viewControllerRuntime.bound)return;
  viewControllerRuntime.bound=true;
  els.recenterSelected.addEventListener("click",recenterSelectedView);
  els.scenario.addEventListener("change",event=>setScenarioFromControl(event.target.value));
  els.renderModeSymbolic?.addEventListener("click",()=>{viewControllerRuntime.modeChanges++;accountViewAction("mode symbolique");setRenderMode("symbolic")});
  els.renderModeAscii?.addEventListener("click",()=>{viewControllerRuntime.modeChanges++;accountViewAction("mode ASCII");setRenderMode("ascii")});
  for(const id of VIEW_LAYER_CONTROL_IDS)els[id].addEventListener("change",event=>setLayerFromControl(id,event.target.checked));
  let savedFilter="all";try{savedFilter=localStorage.getItem(VIEW_LAYER_FILTER_KEY)||"all"}catch{}
  applyLayerCategoryFilter(savedFilter);
  els.layerCategoryFilter?.addEventListener("change",event=>applyLayerCategoryFilter(event.target.value));
  els.layersShowCategory?.addEventListener("click",()=>setLayerControlGroup(layerControlIdsForCategory(),true,"couches de la catégorie affichées"));
  els.layersHideCategory?.addEventListener("click",()=>setLayerControlGroup(layerControlIdsForCategory(),false,"couches de la catégorie masquées"));
  els.layersSelectAll?.addEventListener("click",()=>setLayerControlGroup(VIEW_LAYER_CONTROL_IDS,true,"toutes les couches affichées"));
  els.layersClearAll?.addEventListener("click",()=>setLayerControlGroup(VIEW_LAYER_CONTROL_IDS,false,"toutes les couches masquées"));
  els.cavitySelect.addEventListener("change",event=>focusCavityFromControl(event.target.value));
  if(els.debugToggle)els.debugToggle.addEventListener("click",()=>runViewDebugAction("bascule du diagnostic",()=>setDebugEnabled(!debugState.enabled)));
  if(els.runSelfCheck)els.runSelfCheck.addEventListener("click",()=>runViewDebugAction("auto-diagnostic",runAtlasSelfCheck));
  if(els.exportDebugReport)els.exportDebugReport.addEventListener("click",()=>runViewDebugAction("export du diagnostic",exportDebugReport));
  window.addEventListener("keydown",event=>{
    if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==="d"){
      event.preventDefault();runViewDebugAction("raccourci du diagnostic",()=>setDebugEnabled(!debugState.enabled));
    }
  });
}
