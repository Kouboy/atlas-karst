const poiAnnotationRuntime={ready:true,bound:false,loads:0,saves:0,clears:0,lastKey:"",lastError:""};

function normalizePoiAnnotations(value){
  const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{},out={};
  for(const [key,raw] of Object.entries(source)){
    if(!key||!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const title=String(raw.title||"").trim().slice(0,120),note=String(raw.note||"").trim().slice(0,2400),speciesNames={};
    for(const [speciesKey,name] of Object.entries(raw.speciesNames&&typeof raw.speciesNames==="object"?raw.speciesNames:{})){
      const clean=String(name||"").trim().slice(0,120);if(clean)speciesNames[String(speciesKey)]=clean;
    }
    if(title||note||Object.keys(speciesNames).length)out[String(key)]={title,note,speciesNames,updatedAt:String(raw.updatedAt||"")};
  }
  return out;
}
function loadPoiAnnotations(){
  try{state.poiAnnotations=normalizePoiAnnotations(JSON.parse(localStorage.getItem(territoryStorageKey(POI_ANNOTATIONS_KEY))||"{}"));poiAnnotationRuntime.loads++;poiAnnotationRuntime.lastError=""}
  catch(error){state.poiAnnotations={};poiAnnotationRuntime.lastError=String(error?.message||error)}
  return state.poiAnnotations;
}
function persistPoiAnnotations(){
  try{localStorage.setItem(territoryStorageKey(POI_ANNOTATIONS_KEY),JSON.stringify(state.poiAnnotations||{}));poiAnnotationRuntime.saves++;poiAnnotationRuntime.lastError=""}
  catch(error){poiAnnotationRuntime.lastError=String(error?.message||error)}
}
function poiAnnotationKey(feature){
  if(!feature)return "";
  const direct=String(feature.poiId||feature.normalizedPoi?.uid||"").trim();if(direct)return direct;
  if(!feature.poi&&!feature.poiSourceType)return "";
  const source=String(feature.poiSourceType||feature.sourceType||"poi"),id=String(feature.id||feature.indice||feature.name||"").trim();
  return id?`${source}:${id}`:"";
}
function poiAnnotationFor(feature){const key=poiAnnotationKey(feature);return key?(state.poiAnnotations?.[key]||null):null}
function poiAnnotationDisplayTitle(feature,fallback=""){return poiAnnotationFor(feature)?.title||fallback}
function poiSpeciesDisplayName(feature,species){return poiAnnotationFor(feature)?.speciesNames?.[String(species?.speciesKey||"")]||species?.vernacularName||""}
function poiAnnotationSection(feature){
  const key=poiAnnotationKey(feature);if(!key)return "";
  const annotation=poiAnnotationFor(feature)||{title:"",note:"",speciesNames:{}},species=(feature.species||[]).slice(0,12),aliases=species.length?`<div class="poi-species-aliases"><h4>Noms usuels personnels</h4>${species.map(item=>`<label>${esc(item.scientificName||item.speciesKey)}<input type="text" data-poi-species-key="${esc(String(item.speciesKey||""))}" maxlength="120" value="${esc(annotation.speciesNames?.[String(item.speciesKey)]||"")}" placeholder="${esc(item.vernacularName||"Ajouter un nom usuel")}"><small>${item.vernacularName?`nom publié : ${esc(item.vernacularName)}`:"aucun nom usuel fourni par la source"}</small></label>`).join("")}${(feature.species||[]).length>species.length?`<small>${feature.species.length-species.length} autres espèces restent accessibles dans les autres mailles ou fiches.</small>`:""}</div>`:"";
  return `<section class="cell-section cell-section-annotation"><h3>Mes annotations de carnet</h3><form class="poi-annotation-form" data-poi-annotation-key="${esc(key)}"><label>Nom personnel du point<input name="poiAnnotationTitle" type="text" maxlength="120" value="${esc(annotation.title||"")}" placeholder="Conserver le nom de la source"></label><label>Note personnelle<textarea name="poiAnnotationNote" maxlength="2400" placeholder="Observation, contexte, piste à vérifier…">${esc(annotation.note||"")}</textarea></label>${aliases}<div class="poi-annotation-actions"><button type="submit">▣ enregistrer</button><button type="button" data-clear-poi-annotation>× effacer</button></div><div class="poi-annotation-status" aria-live="polite">${annotation.updatedAt?`Enregistré dans ce carnet le ${esc(new Date(annotation.updatedAt).toLocaleString("fr-FR"))}.`:"Ces champs seront inclus dans le carnet partagé."}</div></form></section>`;
}
function refreshPoiAnnotationReadout(message="Annotation enregistrée dans le carnet"){
  const selected=state.selectedCell;if(!selected||!state.lastGrid)return;
  const base=state.lastGrid.grid[selected.y]?.[selected.x];if(!base)return;
  const cell={...base,feature:selected.feature||base.feature};
  presentCellDescription(cell,selected.x,selected.y,{note:message,title:poiAnnotationDisplayTitle(cell.feature,cell.feature?.name||cell.feature?.kind||"Point d’intérêt"),sheet:"full"});
}
function savePoiAnnotationForm(form){
  const key=String(form?.dataset.poiAnnotationKey||"");if(!key)return;
  const title=String(form.elements.poiAnnotationTitle?.value||"").trim().slice(0,120),note=String(form.elements.poiAnnotationNote?.value||"").trim().slice(0,2400),speciesNames={};
  for(const input of form.querySelectorAll("[data-poi-species-key]")){const value=String(input.value||"").trim().slice(0,120);if(value)speciesNames[input.dataset.poiSpeciesKey]=value}
  if(title||note||Object.keys(speciesNames).length)state.poiAnnotations[key]={title,note,speciesNames,updatedAt:new Date().toISOString()};else delete state.poiAnnotations[key];
  poiAnnotationRuntime.lastKey=key;persistPoiAnnotations();descriptionRuntime.revision++;descriptionRuntime.cache.clear();
  if(typeof autosaveActiveTerritory==="function")autosaveActiveTerritory();refreshPoiAnnotationReadout();
}
function clearPoiAnnotationForm(form){
  const key=String(form?.dataset.poiAnnotationKey||"");if(!key)return;
  delete state.poiAnnotations[key];poiAnnotationRuntime.clears++;poiAnnotationRuntime.lastKey=key;persistPoiAnnotations();descriptionRuntime.revision++;descriptionRuntime.cache.clear();
  if(typeof autosaveActiveTerritory==="function")autosaveActiveTerritory();refreshPoiAnnotationReadout("Annotation retirée du carnet");
}
function bindPoiAnnotations(){
  if(poiAnnotationRuntime.bound)return;poiAnnotationRuntime.bound=true;
  document.addEventListener("submit",event=>{const form=event.target.closest?.("form[data-poi-annotation-key]");if(!form)return;event.preventDefault();savePoiAnnotationForm(form)});
  document.addEventListener("click",event=>{const clear=event.target.closest?.("[data-clear-poi-annotation]");if(!clear)return;clearPoiAnnotationForm(clear.closest("form[data-poi-annotation-key]"))});
}
