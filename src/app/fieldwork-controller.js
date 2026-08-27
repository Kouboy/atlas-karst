const fieldworkRuntime={ready:true,bound:false,locationRequests:0,locationSuccesses:0,locationErrors:0,houseChanges:0,observationsAdded:0,observationsRemoved:0,observationsEdited:0,personalAdded:0,personalRemoved:0,personalEdited:0,loreAdded:0,loreRemoved:0,loreEdited:0,undergroundAdded:0,undergroundRemoved:0,undergroundEdited:0,ledgerActions:0,editing:null,undergroundEditing:null};

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
  updateAroundMe();updateEncounterUI();
}
async function locateUser(){
  if(state.locationLoading)return;
  fieldworkRuntime.locationRequests++;
  if(!navigator.geolocation){fieldworkRuntime.locationErrors++;updateLocationUI('<span class="location-warning">La géolocalisation n’est pas disponible dans ce navigateur.</span>');retroAudio.play("error");return}
  state.locationLoading=true;updateLocationUI("Vérification du contexte et des permissions…");
  const permissionState=await geolocationPermissionState();
  if(!window.isSecureContext){
    state.locationLoading=false;fieldworkRuntime.locationErrors++;
    updateLocationUI('<span class="location-warning">Le navigateur ne peut pas demander ta position depuis cette page : le contexte n’est pas sécurisé.</span>'+geolocationContextHint());
    retroAudio.play("error");render();return;
  }
  if(permissionState==="denied"){
    state.locationLoading=false;fieldworkRuntime.locationErrors++;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel({code:1},{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();return;
  }
  updateLocationUI(permissionState==="prompt"?"Le navigateur devrait maintenant afficher sa demande d’autorisation…":"Recherche ponctuelle de la position…");
  return new Promise(resolve=>navigator.geolocation.getCurrentPosition(pos=>{
      state.locationLoading=false;fieldworkRuntime.locationSuccesses++;
      const c=pos.coords;
      state.userLocation={lat:Number(c.latitude),lon:Number(c.longitude),accuracy:Number(c.accuracy)||0,altitude:Number.isFinite(c.altitude)?c.altitude:null,heading:Number.isFinite(c.heading)?c.heading:null,speed:Number.isFinite(c.speed)?c.speed:null,timestamp:pos.timestamp||Date.now()};
      const inside=inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent());
      if(inside&&state.centerOnLocation)state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());
      updateLocationUI(inside?"":'<span class="location-warning">Position obtenue, mais elle se trouve hors de l’emprise actuelle de l’Atlas.</span>');
      retroAudio.play("success");render();resolve(state.userLocation);
    },err=>{
      state.locationLoading=false;fieldworkRuntime.locationErrors++;
      updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel(err,{permissionState}))}</span>${geolocationContextHint()}`);
      retroAudio.play("error");render();resolve(null);
    },{enableHighAccuracy:true,timeout:20000,maximumAge:30000}));
}
function clearUserLocation(){state.userLocation=null;updateLocationUI("Position masquée. Elle n’était pas enregistrée dans l’Atlas.");render()}

function saveHousePosition(coord,sourceLabel="placement manuel",persist=true){
  CONFIG.house={lat:+coord.lat,lon:+coord.lon};markSpatialIndexesDirty();fieldworkRuntime.houseChanges++;
  if(els.houseLat){els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7)}
  if(persist){HOUSE_WAS_SAVED=true;try{localStorage.setItem(territoryStorageKey("atlas-karst-house-v06"),JSON.stringify(CONFIG.house));if(CONFIG.territory.id===LEGACY_TERRITORY_PROFILE.id)localStorage.removeItem("atlas-karst-house-v05")}catch{}}
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

function fieldworkEntryDate(value){
  const date=new Date(value);return Number.isNaN(date.getTime())?"date non renseignée":date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
}
function fieldworkId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function fieldworkRecords(filter=els.fieldworkLedgerFilter?.value||"all"){
  const observations=(state.observations||[]).map(record=>({kind:"observation",record,id:String(record.id||""),title:record.name||"Observation sans titre",note:record.note||"",date:record.updatedAt||record.createdAt||record.season||"",meta:[record.mode==="sight"?"visée":record.mode==="zone"?`zone ≈ ${Math.round(record.radius||0)} m`:"point",confidenceLabel(record.confidence||"med"),record.season].filter(Boolean).join(" · ")}));
  const personal=(state.personalMarkers||[]).map(record=>({kind:"personal",record,id:String(record.id||""),title:record.name||personalMarkerDefinition(record.category).label,note:record.note||"",date:record.updatedAt||record.createdAt||record.date||"",meta:[personalMarkerDefinition(record.category).label,record.geometry==="zone"?`zone ≈ ${Math.round(record.radius||0)} m`:"point",confidenceLabel(record.confidence||"med"),record.date].filter(Boolean).join(" · ")}));
  const lore=(state.loreItems||[]).map(record=>({kind:"lore",record,id:String(record.id||""),title:record.name||"Repère sans titre",note:record.note||"",date:record.updatedAt||record.createdAt||record.period||"",meta:[record.category||"mémoire locale",record.period,record.source].filter(Boolean).join(" · ")}));
  return [...observations,...personal,...lore].filter(entry=>filter==="all"||entry.kind===filter).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title,"fr"));
}
function renderFieldworkLedger(){
  if(!els.fieldworkLedgerList)return;
  const all=fieldworkRecords("all"),entries=fieldworkRecords();
  if(els.fieldworkLedgerSummary)els.fieldworkLedgerSummary.textContent=all.length?`${all.length} repère${all.length>1?"s":""} personnel${all.length>1?"s":""} dans ce carnet · ${all.filter(item=>item.kind==="observation").length} observation${all.filter(item=>item.kind==="observation").length>1?"s":""} · ${all.filter(item=>item.kind==="personal").length} carte personnelle · ${all.filter(item=>item.kind==="lore").length} mémoire${all.filter(item=>item.kind==="lore").length>1?"s":""}.`:"Aucun repère personnel dans ce carnet.";
  els.fieldworkLedgerList.replaceChildren();
  if(!entries.length){const empty=document.createElement("div");empty.className="fieldwork-ledger-empty";empty.textContent=all.length?"Aucun repère dans cette catégorie.":"Sélectionne une case, puis consigne une première observation ou un souvenir local.";els.fieldworkLedgerList.append(empty);return}
  for(const entry of entries){
    const article=document.createElement("article");article.className="fieldwork-ledger-entry";
    const head=document.createElement("div");head.className="fieldwork-ledger-entry-head";
    const title=document.createElement("h4");title.textContent=entry.title;
    const kind=document.createElement("span");kind.className="fieldwork-ledger-kind";kind.textContent=entry.kind==="observation"?"observation":entry.kind==="personal"?"carte":"mémoire";head.append(title,kind);
    const meta=document.createElement("div");meta.className="fieldwork-ledger-meta";meta.textContent=[entry.meta,entry.date&&fieldworkEntryDate(entry.date)].filter(Boolean).join(" · ");article.append(head,meta);
    if(entry.note){const note=document.createElement("div");note.className="fieldwork-ledger-note";note.textContent=entry.note;article.append(note)}
    const actions=document.createElement("div");actions.className="fieldwork-ledger-actions";
    for(const [action,label] of [["focus","⌖ voir"],["edit","✎ modifier"],["delete","× supprimer"]]){const button=document.createElement("button");button.type="button";button.dataset.fieldworkAction=action;button.dataset.fieldworkKind=entry.kind;button.dataset.fieldworkId=entry.id;button.textContent=label;if(action==="delete")button.className="action-danger";actions.append(button)}
    article.append(actions);els.fieldworkLedgerList.append(article);
  }
}
function fieldworkRecord(kind,id){const records=kind==="observation"?state.observations:kind==="personal"?state.personalMarkers:state.loreItems;return (records||[]).find(item=>String(item.id)===String(id))||null}
function clearFieldworkEditing(kind=""){
  if(kind!=="lore"){fieldworkRuntime.editing=null;if(els.addLocalMarker)els.addLocalMarker.textContent="＋ enregistrer l’observation"}
  if(kind!=="personal"){fieldworkRuntime.editing=null;if(els.addPersonalMarker)els.addPersonalMarker.textContent="＋ enregistrer sur la carte"}
  if(kind!=="observation"){fieldworkRuntime.editing=null;if(els.addLoreItem)els.addLoreItem.textContent="＋ enregistrer le repère"}
}
function startFieldworkEditing(kind,id){
  const record=fieldworkRecord(kind,id);if(!record)return;
  fieldworkRuntime.ledgerActions++;fieldworkRuntime.editing={kind,id:String(id)};
  if(kind==="observation"){
    els.observationMode.value=record.mode||"point";els.observationConfidence.value=record.confidence||"med";els.localType.value=record.glyph||"?o";els.observationRadius.value=String(record.radius||80);els.observationSeason.value=record.season||"";els.localName.value=record.name||"";els.localNote.value=record.note||"";els.addLocalMarker.textContent="✓ mettre à jour l’observation";els.localHelp.textContent="Modification active : choisis une autre case si tu veux déplacer le repère, puis enregistre.";
  }else if(kind==="personal"){
    els.personalCategory.value=record.category||"question";els.personalGeometry.value=record.geometry||"point";els.personalConfidence.value=record.confidence||"med";els.personalRadius.value=String(record.radius||80);els.personalDate.value=record.date||"";els.personalName.value=record.name||"";els.personalNote.value=record.note||"";els.addPersonalMarker.textContent="✓ mettre à jour le repère";els.personalHelp.textContent="Modification active : choisis une autre case si tu veux déplacer le repère, puis enregistre.";
  }else{
    els.loreCategory.value=record.category||"anecdote";els.lorePeriod.value=record.period||"";els.loreName.value=record.name||"";els.loreSource.value=record.source||"";els.loreNote.value=record.note||"";els.addLoreItem.textContent="✓ mettre à jour le repère";els.loreHelp.textContent="Modification active : choisis une autre case si tu veux déplacer le repère, puis enregistre.";
  }
}
function focusFieldworkRecord(kind,id){
  const record=fieldworkRecord(kind,id);if(!record)return;
  fieldworkRuntime.ledgerActions++;state.center=clampCenter({lat:record.lat,lon:record.lon},currentZoom());render("fieldwork-ledger-focus");
  const poi=queryNormalizedPois(state.lastGrid?.extent||largestExtent(),kind).find(item=>String(item.id)===String(id));
  if(poi)selectSymbolicPoi(poi,"Repère de carnet sélectionné");
}
function deleteFieldworkRecord(kind,id){
  if(kind==="observation"){state.observations=state.observations.filter(item=>String(item.id)!==String(id));fieldworkRuntime.observationsRemoved++;saveLocalCavities();refreshCavities()}
  else if(kind==="personal"){state.personalMarkers=state.personalMarkers.filter(item=>String(item.id)!==String(id));fieldworkRuntime.personalRemoved++;savePersonalMarkers()}
  else{state.loreItems=state.loreItems.filter(item=>String(item.id)!==String(id));fieldworkRuntime.loreRemoved++;saveLoreItems()}
  fieldworkRuntime.ledgerActions++;clearFieldworkEditing();markSpatialIndexesDirty();descriptionRuntime.cache.clear();renderFieldworkLedger();autosaveActiveTerritory();render("fieldwork-ledger-delete");
}
function bindFieldworkLedger(){
  els.fieldworkLedgerFilter?.addEventListener("change",renderFieldworkLedger);els.fieldworkLedgerRefresh?.addEventListener("click",renderFieldworkLedger);
  els.fieldworkLedgerList?.addEventListener("click",event=>{const button=event.target.closest?.("[data-fieldwork-action]");if(!button)return;const {fieldworkAction:action,fieldworkKind:kind,fieldworkId:id}=button.dataset;if(action==="focus")focusFieldworkRecord(kind,id);else if(action==="edit")startFieldworkEditing(kind,id);else if(action==="delete")deleteFieldworkRecord(kind,id)});
}

function renderUndergroundHypothesisList(){
  if(!els.undergroundHypothesisList)return;
  const entries=(state.undergroundHypotheses||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
  els.undergroundHypothesisList.replaceChildren();
  if(!entries.length){const empty=document.createElement("div");empty.className="fieldwork-ledger-empty";empty.textContent="Aucune hypothèse personnelle à cette étape. Ces notes restent des interprétations, pas des données de terrain.";els.undergroundHypothesisList.append(empty);return}
  for(const item of entries){const definition=undergroundHypothesisDefinition(item.kind),article=document.createElement("article");article.className="fieldwork-ledger-entry";const head=document.createElement("div");head.className="fieldwork-ledger-entry-head";const title=document.createElement("h4");title.textContent=item.name||definition.label;const kind=document.createElement("span");kind.className="fieldwork-ledger-kind";kind.textContent=`hypothèse · ${depthSliceLabel(item.depth)}`;head.append(title,kind);const meta=document.createElement("div");meta.className="fieldwork-ledger-meta";meta.textContent=[definition.label,item.geometry==="zone"?`zone ≈ ${Math.round(item.radius||0)} m`:"indice ponctuel",confidenceLabel(item.confidence||"low")].join(" · ");article.append(head,meta);if(item.note){const note=document.createElement("div");note.className="fieldwork-ledger-note";note.textContent=item.note;article.append(note)}const actions=document.createElement("div");actions.className="fieldwork-ledger-actions";for(const [action,label] of [["focus","⌖ voir"],["edit","✎ modifier"],["delete","× supprimer"]]){const button=document.createElement("button");button.type="button";button.dataset.undergroundAction=action;button.dataset.undergroundId=item.id;button.textContent=label;if(action==="delete")button.className="action-danger";actions.append(button)}article.append(actions);els.undergroundHypothesisList.append(article)}
}
function undergroundHypothesisRecord(id){return(state.undergroundHypotheses||[]).find(item=>String(item.id)===String(id))||null}
function clearUndergroundEditing(){fieldworkRuntime.undergroundEditing=null;if(els.addUndergroundHypothesis)els.addUndergroundHypothesis.textContent="＋ inscrire l’hypothèse"}
function startUndergroundEditing(id){const item=undergroundHypothesisRecord(id);if(!item)return;fieldworkRuntime.undergroundEditing=String(id);els.undergroundKind.value=item.kind||"unknown";els.undergroundDepth.value=String(item.depth||-14);els.undergroundGeometry.value=item.geometry||"point";els.undergroundConfidence.value=item.confidence||"low";els.undergroundRadius.value=String(item.radius||80);els.undergroundName.value=item.name||"";els.undergroundNote.value=item.note||"";els.addUndergroundHypothesis.textContent="✓ mettre à jour l’hypothèse";els.undergroundHelp.textContent="Modification active : choisis une autre case si tu veux déplacer cette interprétation, puis enregistre."}
function deleteUndergroundHypothesis(id){state.undergroundHypotheses=state.undergroundHypotheses.filter(item=>String(item.id)!==String(id));fieldworkRuntime.undergroundRemoved++;clearUndergroundEditing();markSpatialIndexesDirty();descriptionRuntime.cache.clear();saveUndergroundHypotheses();renderUndergroundHypothesisList();autosaveActiveTerritory();render("underground-hypothesis-delete")}
function focusUndergroundHypothesis(id){const item=undergroundHypothesisRecord(id);if(!item)return;state.depthIndex=Math.max(0,CONFIG.depths.indexOf(Number(item.depth)));state.center=clampCenter({lat:item.lat,lon:item.lon},currentZoom());if(els.depthControl)els.depthControl.value=String(state.depthIndex);render("underground-hypothesis-focus");const poi=queryNormalizedPois(state.lastGrid?.extent||largestExtent(),"underground").find(value=>String(value.id)===String(id));if(poi)selectSymbolicPoi(poi,"Hypothèse personnelle sélectionnée")}

function bindFieldworkController(){
  if(fieldworkRuntime.bound)return;
  fieldworkRuntime.bound=true;
  bindFieldworkLedger();renderFieldworkLedger();renderUndergroundHypothesisList();
  els.undergroundHypothesisList?.addEventListener("click",event=>{const button=event.target.closest?.("[data-underground-action]");if(!button)return;const action=button.dataset.undergroundAction,id=button.dataset.undergroundId;if(action==="focus")focusUndergroundHypothesis(id);else if(action==="edit")startUndergroundEditing(id);else if(action==="delete")deleteUndergroundHypothesis(id)});
  els.mapLocate.addEventListener("click",locateUser);
  els.locateMe.addEventListener("click",locateUser);
  els.clearLocation.addEventListener("click",clearUserLocation);
  els.centerOnLocation.addEventListener("change",e=>{state.centerOnLocation=e.target.checked;if(e.target.checked&&state.userLocation&&inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent())){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());render()}});
  els.placeHouse.addEventListener("click",()=>{
    if(!state.selectedCell){els.houseHelp.innerHTML='<span class="house-placement-note">Clique d’abord une case : elle sera entourée en jaune.</span>';return}
    saveHousePosition(state.selectedCell.coord,"case sélectionnée");state.center=clampCenter({...CONFIG.house},currentZoom());render();
  });
  els.resetHouse.addEventListener("click",()=>{saveHousePosition({...HOUSE_ESTIMATE},"centre du territoire actif");recenterOnHouse("reset-home")});
  els.geocodeHouse.addEventListener("click",async()=>{
    const a=await fetchAddress(true);if(!a)return;
    if(state.cadastreBuildings.length){CONFIG.house={lat:a.lat,lon:a.lon};markSpatialIndexesDirty();state.address=a;snapHouseToBuilding(true)}
    else saveHousePosition({lat:a.lat,lon:a.lon},`adresse officielle : ${a.label}`,true);
    state.center=clampCenter({...CONFIG.house},currentZoom());render();
  });
  els.snapHouseBuilding.addEventListener("click",()=>{if(snapHouseToBuilding(true)){state.center=clampCenter({...CONFIG.house},currentZoom());render()}});
  els.openHistory.addEventListener("click",()=>window.open(`https://remonterletemps.ign.fr/comparer/?lat=${CONFIG.house.lat}&lon=${CONFIG.house.lon}&z=16&mode=split-h`,"_blank","noopener"));
  els.applyHouseCoords.addEventListener("click",()=>{
    const lat=Number(els.houseLat.value),lon=Number(els.houseLon.value);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){els.houseHelp.innerHTML='<span class="house-placement-note">Coordonnées invalides.</span>';return}
    if(!inExtent(lat,lon,largestExtent())){els.houseHelp.innerHTML='<span class="house-placement-note">Ces coordonnées sont hors de l’emprise chargée.</span>';return}
    saveHousePosition({lat,lon},"saisie numérique");state.center=clampCenter({...CONFIG.house},currentZoom());render();
  });
  els.addLocalMarker.addEventListener("click",()=>{
    if(!state.selectedCell){els.localHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
    const mode=els.observationMode.value,glyph=els.localType.value,def=localMarkerDefinition(glyph),name=els.localName.value.trim()||def.detail,editing=fieldworkRuntime.editing?.kind==="observation"?fieldworkRecord("observation",fieldworkRuntime.editing.id):null;
    const target=state.selectedCell.coord,confidence=els.observationConfidence.value,season=els.observationSeason.value.trim();
    const o={...(editing||{}),id:editing?.id||fieldworkId("OBS"),mode,glyph,name,note:els.localNote.value.trim().slice(0,2400),lat:target.lat,lon:target.lon,confidence,season,radius:clamp(Number(els.observationRadius.value)||80,10,1000),source:"Observation locale enregistrée dans cet atlas",createdAt:editing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(mode==="sight"){o.origin={...CONFIG.house};o.distance=distanceMeters(CONFIG.house,target);o.bearing=bearingDegrees(CONFIG.house,target)}
    else{delete o.origin;delete o.distance;delete o.bearing}
    if(editing){state.observations=state.observations.map(item=>item.id===o.id?o:item);fieldworkRuntime.observationsEdited++}else{state.observations.push(o);fieldworkRuntime.observationsAdded++}
    clearFieldworkEditing();markSpatialIndexesDirty();saveLocalCavities();refreshCavities();renderFieldworkLedger();autosaveActiveTerritory();render();
    els.localHelp.innerHTML=editing?`Observation <strong>${esc(name)}</strong> mise à jour.`:mode==="sight"?`Visée <strong>${o.bearing.toFixed(0)}°</strong> sur environ <strong>${Math.round(o.distance)} m</strong> enregistrée.`:`Observation <strong>${esc(name)}</strong> enregistrée avec une confiance ${confidenceLabel(confidence)}.`;
    els.localName.value="";els.localNote.value="";
  });
  els.removeLocalMarker.addEventListener("click",()=>{
    if(!state.selectedCell){els.localHelp.textContent="Sélectionne d’abord l’observation à supprimer.";return}
    const f=state.selectedCell.feature;let id=f?.observation?f.record?.id:f?.record?.observation?.id||null;
    if(!id){const nearby=state.observations.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id}
    if(!id){els.localHelp.textContent="Aucune observation locale suffisamment proche de la sélection.";return}
    deleteFieldworkRecord("observation",id);els.localHelp.textContent="Observation locale supprimée.";
  });
  els.addPersonalMarker.addEventListener("click",()=>{
    if(!state.selectedCell){els.personalHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
    const category=els.personalCategory.value,definition=personalMarkerDefinition(category),editing=fieldworkRuntime.editing?.kind==="personal"?fieldworkRecord("personal",fieldworkRuntime.editing.id):null,target=state.selectedCell.coord;
    const item={...(editing||{}),id:editing?.id||fieldworkId("PER"),category,geometry:els.personalGeometry.value==="zone"?"zone":"point",confidence:els.personalConfidence.value||"med",radius:clamp(Number(els.personalRadius.value)||80,10,1000),date:els.personalDate.value.trim().slice(0,120),name:els.personalName.value.trim().slice(0,160)||definition.label,note:els.personalNote.value.trim().slice(0,2400),lat:target.lat,lon:target.lon,source:"Repère personnel enregistré dans ce carnet",createdAt:editing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editing){state.personalMarkers=state.personalMarkers.map(record=>record.id===item.id?item:record);fieldworkRuntime.personalEdited++}else{state.personalMarkers.push(item);fieldworkRuntime.personalAdded++}
    clearFieldworkEditing();markSpatialIndexesDirty();descriptionRuntime.cache.clear();savePersonalMarkers();renderFieldworkLedger();autosaveActiveTerritory();render();
    els.personalHelp.innerHTML=editing?`Repère <strong>${esc(item.name)}</strong> mis à jour.`:`Repère <strong>${esc(item.name)}</strong> enregistré comme <strong>${esc(definition.label)}</strong>.`;
    els.personalName.value="";els.personalNote.value="";els.personalDate.value="";
  });
  els.removePersonalMarker.addEventListener("click",()=>{
    if(!state.selectedCell){els.personalHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
    const feature=state.selectedCell.feature;let id=feature?.personal?feature.record?.id:null;
    if(!id){const nearby=state.personalMarkers.map(item=>({item,d:distanceMeters(item,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.item.id}
    if(!id){els.personalHelp.textContent="Aucun repère personnel suffisamment proche de la sélection.";return}
    deleteFieldworkRecord("personal",id);els.personalHelp.textContent="Repère personnel supprimé.";
  });
  els.addUndergroundHypothesis.addEventListener("click",()=>{
    if(!state.selectedCell){els.undergroundHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
    const editing=fieldworkRuntime.undergroundEditing?undergroundHypothesisRecord(fieldworkRuntime.undergroundEditing):null,kind=els.undergroundKind.value,definition=undergroundHypothesisDefinition(kind),target=state.selectedCell.coord;
    const item={...(editing||{}),id:editing?.id||fieldworkId("HYP"),kind,depth:Number(els.undergroundDepth.value)||-14,geometry:els.undergroundGeometry.value==="zone"?"zone":"point",confidence:els.undergroundConfidence.value||"low",radius:clamp(Number(els.undergroundRadius.value)||80,10,1000),name:els.undergroundName.value.trim().slice(0,160)||definition.label,note:els.undergroundNote.value.trim().slice(0,2400),lat:target.lat,lon:target.lon,source:"Hypothèse personnelle enregistrée dans ce carnet",createdAt:editing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editing){state.undergroundHypotheses=state.undergroundHypotheses.map(record=>record.id===item.id?item:record);fieldworkRuntime.undergroundEdited++}else{state.undergroundHypotheses.push(item);fieldworkRuntime.undergroundAdded++}
    clearUndergroundEditing();markSpatialIndexesDirty();descriptionRuntime.cache.clear();saveUndergroundHypotheses();renderUndergroundHypothesisList();autosaveActiveTerritory();render();
    els.undergroundHelp.innerHTML=editing?`Hypothèse <strong>${esc(item.name)}</strong> mise à jour.`:`Hypothèse <strong>${esc(item.name)}</strong> enregistrée à <strong>${esc(depthSliceLabel(item.depth))}</strong>, avec une confiance ${confidenceLabel(item.confidence)}.`;els.undergroundName.value="";els.undergroundNote.value="";
  });
  els.removeUndergroundHypothesis.addEventListener("click",()=>{
    if(!state.selectedCell){els.undergroundHelp.textContent="Sélectionne d’abord l’hypothèse à supprimer.";return}
    const feature=state.selectedCell.feature;let id=feature?.userHypothesis?feature.record?.id:null;
    if(!id){const nearby=state.undergroundHypotheses.filter(item=>Number(item.depth)===currentDepth()).map(item=>({item,d:distanceMeters(item,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.item.id}
    if(!id){els.undergroundHelp.textContent="Aucune hypothèse personnelle suffisamment proche à cette profondeur.";return}deleteUndergroundHypothesis(id);els.undergroundHelp.textContent="Hypothèse personnelle supprimée.";
  });
  els.addLoreItem.addEventListener("click",()=>{
    if(!state.selectedCell){els.loreHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
    const category=els.loreCategory.value,def=loreMarkerDefinition(category),target=state.selectedCell.coord,editing=fieldworkRuntime.editing?.kind==="lore"?fieldworkRecord("lore",fieldworkRuntime.editing.id):null;
    const item={...(editing||{}),id:editing?.id||fieldworkId("LOR"),category,name:els.loreName.value.trim()||def.label,period:els.lorePeriod.value.trim(),source:els.loreSource.value.trim()||"Repère local enregistré dans cet atlas",note:els.loreNote.value.trim().slice(0,2400),lat:target.lat,lon:target.lon,createdAt:editing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editing){state.loreItems=state.loreItems.map(record=>record.id===item.id?item:record);fieldworkRuntime.loreEdited++}else{state.loreItems.push(item);fieldworkRuntime.loreAdded++}
    clearFieldworkEditing();markSpatialIndexesDirty();saveLoreItems();renderFieldworkLedger();autosaveActiveTerritory();render();
    els.loreHelp.innerHTML=editing?`Repère <strong>${esc(item.name)}</strong> mis à jour.`:`Repère <strong>${esc(item.name)}</strong> enregistré en catégorie <strong>${def.glyph}</strong>.`;
    els.loreName.value="";els.lorePeriod.value="";els.loreSource.value="";els.loreNote.value="";
  });
  els.removeLoreItem.addEventListener("click",()=>{
    if(!state.selectedCell){els.loreHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
    const f=state.selectedCell.feature;let id=f?.lore?f.record?.id:null;
    if(!id){const nearby=state.loreItems.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id}
    if(!id){els.loreHelp.textContent="Aucun repère patrimoine / mystère suffisamment proche de la sélection.";return}
    deleteFieldworkRecord("lore",id);els.loreHelp.textContent="Repère patrimoine / mystère supprimé.";
  });
  els.aroundRadius.addEventListener("change",e=>{state.aroundRadius=Number(e.target.value)||500;updateAroundMe();retroAudio.play("toggle")});
  els.refreshAround.addEventListener("click",locateUser);
}
