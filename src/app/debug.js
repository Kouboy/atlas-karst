function debugFormatBytes(bytes){
  if(!Number.isFinite(bytes)||bytes<=0)return "0 o";
  const units=["o","Ko","Mo","Go"];let value=bytes,i=0;
  while(value>=1024&&i<units.length-1){value/=1024;i++}
  return `${value.toFixed(i?1:0)} ${units[i]}`;
}
function debugScanStorage(force=false){
  if(!force&&performance.now()-debugState.lastStorageScan<1500)return;
  debugState.lastStorageScan=performance.now();let bytes=0,keys=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.startsWith("atlas-karst"))continue;
      const value=localStorage.getItem(key)||"";bytes+=(key.length+value.length)*2;keys++;
    }
  }catch{}
  debugState.storageBytes=bytes;debugState.storageKeys=keys;
}
function debugRecordError(kind,error){
  const message=String(error?.message||error||"erreur inconnue");
  debugState.errors.unshift({at:new Date().toLocaleTimeString("fr-FR"),kind,message});
  debugState.errors=debugState.errors.slice(0,12);updateDebugPanel();
}
function setDebugEnabled(enabled){
  debugState.enabled=!!enabled;document.body.classList.toggle("debug-mode",debugState.enabled);
  if(els?.debugToggle){els.debugToggle.setAttribute("aria-pressed",String(debugState.enabled));els.debugToggle.textContent=debugState.enabled?"⚙ masquer":"⚙ diagnostic"}
  if(debugState.enabled){updateDebugPanel(true);scheduleFrameFit()}
}
function debugStatusText(id){
  const el=els?.[id];return el?`${el.textContent.trim()} [${el.className||"sans classe"}]`:"absent";
}
function debugRenderPhasesText(){
  const p=debugState.lastRenderPhases;
  if(!debugState.renderCount||!p)return "—";
  return `mise en page ${p.layout.toFixed(1)} · index ${p.index.toFixed(1)} · grille ${p.grid.toFixed(1)} · couches ${p.layers.toFixed(1)} · sortie ${p.output.toFixed(1)} · interface ${p.interface.toFixed(1)} ms`;
}
function debugRenderBudget(){
  const cold=debugState.renderCount<=1&&String(debugState.lastReason||"").startsWith("boot-");
  return cold?{label:"Premier rendu sous 140 ms",budget:140}:{label:"Rendu stabilisé sous 80 ms",budget:80};
}
function debugDataRendersText(){const renders=dataRenderRuntime.renders;return `${dataRenderRuntime.requests} demandes · ${renders} rendu${renders>1?"s":""} · ${dataRenderCoalescedCount()} regroupées`}
function updateDebugPanel(forceStorage=false){
  if(!debugState.enabled||!els?.debugPanel)return;
  debugScanStorage(forceStorage);
  const average=debugState.renderCount?debugState.totalRenderMs/debugState.renderCount:0;
  if(els.debugRenderTime)els.debugRenderTime.textContent=debugState.renderCount?`${debugState.lastRenderMs.toFixed(1)} ms · max ${debugState.maxRenderMs.toFixed(1)}`:"—";
  if(els.debugRenderAverage)els.debugRenderAverage.textContent=debugState.renderCount?`${average.toFixed(1)} ms · ${debugState.renderCount} rendus`:"—";
  if(els.debugDataRenders)els.debugDataRenders.textContent=debugDataRendersText();
  if(els.debugRenderPhases)els.debugRenderPhases.textContent=debugRenderPhasesText();
  if(els.debugGrid){
    const bitmap=canvasRuntime.metrics?` · bitmap ${els.mapCanvas.width} × ${els.mapCanvas.height} @${canvasRuntime.metrics.dpr}`:"";
    els.debugGrid.textContent=`${CONFIG.gridW} × ${CONFIG.gridH} · zoom ${state.zoomIndex} · ${currentDepth()} m${bitmap}`;
  }
  if(els.debugPoiCount)els.debugPoiCount.textContent=`${debugState.lastPoiCount} visibles · ${spatialRuntime.normalizedPois.length} indexés`;
  if(els.debugStorage)els.debugStorage.textContent=`${debugFormatBytes(debugState.storageBytes)} · ${debugState.storageKeys} clés`;
  if(els.debugPointer)els.debugPointer.textContent=debugState.lastPointer||"—";
  if(els.debugErrors){
    els.debugErrors.style.display=debugState.errors.length?"block":"none";
    els.debugErrors.textContent=debugState.errors.length?debugState.errors.map(e=>`${e.at} · ${e.kind} · ${e.message}`).join("\n"):"";
  }
}
function debugCheckResult(name,ok,detail=""){
  return {name,ok,detail,status:ok===true?"ok":ok===false?"bad":"warn"};
}
function runAtlasSelfCheck(){
  const checks=[];
  const ids=[...document.querySelectorAll("[id]")].map(el=>el.id);
  const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
  checks.push(debugCheckResult("Identifiants HTML uniques",duplicates.length===0,duplicates.length?duplicates.join(", "): `${ids.length} identifiants`));
  const cellCount=CANVAS_RENDERER?CONFIG.gridW*CONFIG.gridH:(els.map?.querySelectorAll(".cell").length||0);
  checks.push(debugCheckResult(CANVAS_RENDERER?"Cellules virtuelles Canvas":"Nombre de cellules",cellCount===CONFIG.gridW*CONFIG.gridH,`${cellCount} / ${CONFIG.gridW*CONFIG.gridH}`));
  checks.push(debugCheckResult("Centre géographique valide",Number.isFinite(state.center?.lat)&&Number.isFinite(state.center?.lon),`${state.center?.lat} / ${state.center?.lon}`));
  checks.push(debugCheckResult("Grille en mémoire",!!state.lastGrid&&state.lastGrid.grid?.length===CONFIG.gridH,state.lastGrid?`${state.lastGrid.grid.length} lignes`:"absente"));
  const expectedCorners=[[0,0],[CONFIG.gridW-1,0],[0,CONFIG.gridH-1],[CONFIG.gridW-1,CONFIG.gridH-1]];
  let targetOk=true,targetDetails=[];
  for(const [x,y] of expectedCorners){
    const r=CANVAS_RENDERER?canvasCellRect(x,y):els.map?.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`)?.getBoundingClientRect();
    if(!r){targetOk=false;targetDetails.push(`${x},${y}: absent`);continue}
    const pos=mapPositionFromClient(r.left+r.width/2,r.top+r.height/2);
    const ok=!!pos&&pos.x===x&&pos.y===y;targetOk=targetOk&&ok;targetDetails.push(`${x},${y}:${pos?`${pos.x},${pos.y}`:"?"}`);
  }
  checks.push(debugCheckResult("Ciblage des quatre coins",targetOk,targetDetails.join(" · ")));
  const renderBudget=debugRenderBudget();
  checks.push(debugCheckResult(renderBudget.label,debugState.lastRenderMs<=renderBudget.budget,`${debugState.lastRenderMs.toFixed(1)} / ${renderBudget.budget} ms`));
  checks.push(debugCheckResult("Contrôleur de navigation",inputRuntime.bound,`${inputRuntime.panCount} déplacements · ${inputRuntime.pinchZoomCount} pincements · dernier : ${inputRuntime.lastGesture}`));
  const phaseValues=Object.values(debugState.lastRenderPhases||{});
  checks.push(debugCheckResult("Phases CPU mesurées",phaseValues.length===6&&phaseValues.every(Number.isFinite),debugRenderPhasesText()));
  checks.push(debugCheckResult("Rafales de données bornées",dataRenderRuntime.renders<=dataRenderRuntime.requests&&dataRenderRuntime.maxBatchSize<=32,`${debugDataRendersText()} · lot max ${dataRenderRuntime.maxBatchSize}`));
  const canvasBudgetOk=!CANVAS_RENDERER||performanceRuntime.canvasPixels<=performanceRuntime.canvasPixelBudget*1.02;
  checks.push(debugCheckResult("Budget bitmap Canvas",canvasBudgetOk,CANVAS_RENDERER?`${performanceRuntime.canvasPixels.toLocaleString("fr-FR")} / ${performanceRuntime.canvasPixelBudget.toLocaleString("fr-FR")} pixels · DPR ${performanceRuntime.effectiveDpr}`:"moteur DOM"));
  checks.push(debugCheckResult("Index spatial",spatialRuntime.normalizedPois.length>0,`${spatialRuntime.normalizedPois.length} POI · ${spatialRuntime.osmIndex.count} objets OSM · ${spatialRuntime.cadastreIndex.count} objets cadastraux`));
  checks.push(debugCheckResult("Audio prêt",!!retroAudio,retroAudio?.isEnabled?.()?"activé":"coupé"));
  checks.push(debugCheckResult("Pipeline Canvas final",renderPipelineRuntime.lastStages.at(-1)==="fx-final"&&renderPipelineRuntime.lastFinalizedFrame===renderPipelineRuntime.frame,`${renderPipelineRuntime.lastStages.join(" → ")} · frame ${renderPipelineRuntime.lastFinalizedFrame}`));
  checks.push(debugCheckResult("FX synchronisés avec OSM",renderPipelineRuntime.lastFxOsmRevision===renderPipelineRuntime.osmRevision,`FX ${renderPipelineRuntime.lastFxOsmRevision} · OSM ${renderPipelineRuntime.osmRevision}`));
  checks.push(debugCheckResult("OSM",state.osm?.length?true:null,state.osm?.length?`${state.osm.length} objets`:debugStatusText("osmStatus")));
  checks.push(debugCheckResult("Patrimoine",state.heritageItems?.length?true:null,state.heritageItems?.length?`${state.heritageItems.length} notices`:debugStatusText("heritageStatus")));
  const html=checks.map(c=>`<div class="debug-check ${c.status}"><b>${c.status==="ok"?"✓":c.status==="bad"?"×":"!"}</b><span><strong>${esc(c.name)}</strong>${c.detail?`<br><span class="small">${esc(c.detail)}</span>`:""}</span></div>`).join("");
  if(els.debugChecks)els.debugChecks.innerHTML=html;
  updateDebugPanel(true);return checks;
}
function createDebugReport(){
  debugScanStorage(true);
  const average=debugState.renderCount?debugState.totalRenderMs/debugState.renderCount:0;
  return [
    `Atlas Karst ASCII ${APP_VERSION} — rapport diagnostic`,
    `Date : ${new Date().toISOString()}`,
    `URL : ${location.href}`,
    `Navigateur : ${navigator.userAgent}`,
    `Écran : ${screen.width} × ${screen.height} · viewport ${innerWidth} × ${innerHeight} · DPR ${devicePixelRatio}`,
    `Contexte sécurisé : ${window.isSecureContext} · protocole ${location.protocol}`,
    `Grille : ${CONFIG.gridW} × ${CONFIG.gridH} · zoom ${state.zoomIndex} · coupe ${depthSliceLabel()}`,
    `Centre : ${state.center.lat.toFixed(7)}, ${state.center.lon.toFixed(7)}`,
    `Rendus : ${debugState.renderCount} · dernier ${debugState.lastRenderMs.toFixed(2)} ms · moyenne ${average.toFixed(2)} ms · max ${debugState.maxRenderMs.toFixed(2)} ms`,
    `Rafales de données : ${debugDataRendersText()} · ${dataRenderRuntime.covered} couvertes par une interaction`,
    `Navigation : ${inputRuntime.bound?"liée":"absente"} · ${inputRuntime.panCount} déplacements · ${inputRuntime.pinchZoomCount} pincements · ${inputRuntime.wheelZoomCount} molettes · dernier ${inputRuntime.lastGesture}`,
    `Phases CPU : ${debugRenderPhasesText()}`,
    `Canvas : ${performanceRuntime.canvasPixels} pixels · budget ${performanceRuntime.canvasPixelBudget} · DPR demandé ${performanceRuntime.requestedDpr} / effectif ${performanceRuntime.effectiveDpr}`,
    `FX : ${performanceRuntime.fxActive?"actifs":"au repos"} · ${performanceRuntime.fxReason}`,
    `Points d’intérêt visibles : ${debugState.lastPoiCount} · normalisés : ${spatialRuntime.normalizedPois.length}`,
    `Index spatial : ${spatialRuntime.rebuilds} reconstructions · dernière ${spatialRuntime.lastBuildMs.toFixed(2)} ms · candidats ${spatialRuntime.lastQueryCandidates} / résultats ${spatialRuntime.lastQueryResults}`,
    `Cache local Atlas : ${debugFormatBytes(debugState.storageBytes)} · ${debugState.storageKeys} clés`,
    `Pipeline Canvas : ${renderPipelineRuntime.lastStages.join(" -> ")} · frame ${renderPipelineRuntime.lastFinalizedFrame} · FX ${renderPipelineRuntime.fxRevision} · OSM ${renderPipelineRuntime.osmRevision}`,
    `OSM : ${debugStatusText("osmStatus")}`,
    `Culture : ${debugStatusText("heritageStatus")}`,
    `Cadastre : ${debugStatusText("cadastreStatus")}`,
    `Cavités : ${debugStatusText("cavityStatus")}`,
    `Relief : ${debugStatusText("elevationStatus")}`,
    `Dernier pointeur : ${debugState.lastPointer}`,
    `Dernière sélection : ${debugState.lastSelection}`,
    `Erreurs : ${debugState.errors.length?debugState.errors.map(e=>`${e.at} ${e.kind}: ${e.message}`).join(" | "):"aucune capturée"}`
  ].join("\n");
}
function exportDebugReport(){
  const blob=new Blob([createDebugReport()],{type:"text/plain;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-karst-${APP_VERSION}-diagnostic.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
window.addEventListener("error",ev=>debugRecordError("JavaScript",ev.error||ev.message));
window.addEventListener("unhandledrejection",ev=>debugRecordError("Promesse",ev.reason));
