const experienceControllerRuntime={ready:true,bound:false,encounterStarts:0,codexOpens:0,encounterActions:0,encounterCloses:0,tourSelections:0,tourStarts:0,tourMoves:0,tourStops:0,lastAction:"initialisation"};

function accountExperienceAction(action){experienceControllerRuntime.lastAction=action}
function startEncounterFromControl(testMode=false){
  experienceControllerRuntime.encounterStarts++;accountExperienceAction(testMode?"rencontre test":"rencontre locale");
  startLocalEncounter({testMode});
}
function openCodexFromControl(){
  experienceControllerRuntime.codexOpens++;accountExperienceAction("ouverture du codex");openCodex();
}
function closeEncounterFromControl(action="fermeture de la rencontre"){
  experienceControllerRuntime.encounterCloses++;accountExperienceAction(action);closeEncounterOverlay();
}
function handleEncounterControlClick(event){
  if(!event.target.closest?.("[data-encounter-choice],[data-codex-entry],[data-encounter-action]"))return;
  experienceControllerRuntime.encounterActions++;accountExperienceAction("action dans la rencontre");handleEncounterClick(event);
}
function moveGuidedTour(index,{announce=true,action="déplacement dans le parcours"}={}){
  experienceControllerRuntime.tourMoves++;accountExperienceAction(action);focusGuidedTourStep(index,{announce});
}
function bindExperienceController(){
  if(experienceControllerRuntime.bound)return;
  experienceControllerRuntime.bound=true;

  els.encounterEnabled.addEventListener("change",event=>{
    state.encounterEnabled=event.target.checked;saveEncounterCollection();updateEncounterUI();retroAudio.play("toggle");accountExperienceAction("préférence de rencontre");
  });
  els.observeSurroundings.addEventListener("click",()=>startEncounterFromControl(false));
  els.testEncounter.addEventListener("click",()=>startEncounterFromControl(true));
  els.openCodex.addEventListener("click",openCodexFromControl);
  els.encounterClose.addEventListener("click",()=>closeEncounterFromControl());
  els.encounterBody.addEventListener("click",handleEncounterControlClick);
  els.encounterOverlay.addEventListener("click",event=>{if(event.target===els.encounterOverlay)closeEncounterFromControl("fermeture par l’arrière-plan")});
  window.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&els.encounterOverlay.classList.contains("active")){event.preventDefault();closeEncounterFromControl("fermeture au clavier")}
  });

  els.guidedTourSelect.addEventListener("change",event=>{
    experienceControllerRuntime.tourSelections++;accountExperienceAction("sélection du parcours");
    state.guidedTourId=event.target.value;state.guidedTourStep=0;
    if(state.guidedTourActive)moveGuidedTour(0,{action:"changement de parcours"});else updateGuidedTourUI();
    retroAudio.play("toggle");
  });
  els.guidedTourStart.addEventListener("click",()=>{experienceControllerRuntime.tourStarts++;accountExperienceAction("début du parcours");startGuidedTour()});
  els.guidedTourPrev.addEventListener("click",()=>moveGuidedTour(state.guidedTourStep-1,{action:"étape précédente"}));
  els.guidedTourNext.addEventListener("click",()=>moveGuidedTour(state.guidedTourStep+1,{action:"étape suivante"}));
  els.guidedTourRecenter.addEventListener("click",()=>moveGuidedTour(state.guidedTourStep,{announce:false,action:"recentrage du parcours"}));
  els.guidedTourStop.addEventListener("click",()=>{experienceControllerRuntime.tourStops++;accountExperienceAction("fin du parcours");stopGuidedTour()});
}
