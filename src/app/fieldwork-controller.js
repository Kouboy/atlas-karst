const fieldworkRuntime={ready:true,bound:false,locationRequests:0,locationSuccesses:0,locationErrors:0,houseChanges:0,observationsAdded:0,observationsRemoved:0,loreAdded:0,loreRemoved:0};

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

function bindFieldworkController(){
  if(fieldworkRuntime.bound)return;
  fieldworkRuntime.bound=true;
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
    const mode=els.observationMode.value,glyph=els.localType.value,def=localMarkerDefinition(glyph),name=els.localName.value.trim()||def.detail;
    const target=state.selectedCell.coord,confidence=els.observationConfidence.value,season=els.observationSeason.value.trim();
    const o={id:`OBS-${Date.now()}`,mode,glyph,name,lat:target.lat,lon:target.lon,confidence,season,radius:clamp(Number(els.observationRadius.value)||80,10,1000),source:"Observation locale enregistrée dans cet atlas"};
    if(mode==="sight"){o.origin={...CONFIG.house};o.distance=distanceMeters(CONFIG.house,target);o.bearing=bearingDegrees(CONFIG.house,target)}
    state.observations.push(o);fieldworkRuntime.observationsAdded++;markSpatialIndexesDirty();saveLocalCavities();refreshCavities();render();
    els.localHelp.innerHTML=mode==="sight"?`Visée <strong>${o.bearing.toFixed(0)}°</strong> sur environ <strong>${Math.round(o.distance)} m</strong> enregistrée.`:`Observation <strong>${esc(name)}</strong> enregistrée avec une confiance ${confidenceLabel(confidence)}.`;
    els.localName.value="";
  });
  els.removeLocalMarker.addEventListener("click",()=>{
    if(!state.selectedCell){els.localHelp.textContent="Sélectionne d’abord l’observation à supprimer.";return}
    const f=state.selectedCell.feature;let id=f?.observation?f.record?.id:f?.record?.observation?.id||null;
    if(!id){const nearby=state.observations.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id}
    if(!id){els.localHelp.textContent="Aucune observation locale suffisamment proche de la sélection.";return}
    state.observations=state.observations.filter(o=>o.id!==id);fieldworkRuntime.observationsRemoved++;saveLocalCavities();refreshCavities();render();els.localHelp.textContent="Observation locale supprimée.";
  });
  els.addLoreItem.addEventListener("click",()=>{
    if(!state.selectedCell){els.loreHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
    const category=els.loreCategory.value,def=loreMarkerDefinition(category),target=state.selectedCell.coord;
    const item={id:`LOR-${Date.now()}`,category,name:els.loreName.value.trim()||def.label,period:els.lorePeriod.value.trim(),source:els.loreSource.value.trim()||"Repère local enregistré dans cet atlas",note:els.loreNote.value.trim(),lat:target.lat,lon:target.lon};
    state.loreItems.push(item);fieldworkRuntime.loreAdded++;markSpatialIndexesDirty();saveLoreItems();render();
    els.loreHelp.innerHTML=`Repère <strong>${esc(item.name)}</strong> enregistré en catégorie <strong>${def.glyph}</strong>.`;
    els.loreName.value="";els.lorePeriod.value="";els.loreSource.value="";els.loreNote.value="";
  });
  els.removeLoreItem.addEventListener("click",()=>{
    if(!state.selectedCell){els.loreHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
    const f=state.selectedCell.feature;let id=f?.lore?f.record?.id:null;
    if(!id){const nearby=state.loreItems.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id}
    if(!id){els.loreHelp.textContent="Aucun repère patrimoine / mystère suffisamment proche de la sélection.";return}
    state.loreItems=state.loreItems.filter(o=>o.id!==id);fieldworkRuntime.loreRemoved++;saveLoreItems();render();els.loreHelp.textContent="Repère patrimoine / mystère supprimé.";
  });
  els.aroundRadius.addEventListener("change",e=>{state.aroundRadius=Number(e.target.value)||500;updateAroundMe();retroAudio.play("toggle")});
  els.refreshAround.addEventListener("click",locateUser);
}
