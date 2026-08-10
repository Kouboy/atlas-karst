import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const atlasVersion = packageMetadata.atlasVersion;
const atlasCss = readFileSync(new URL("../src/styles/atlas.css", import.meta.url), "utf8");
const sourceScripts = ["runtime.js", "performance.js", "debug.js", "territory-model.js", "bootstrap.js", "source-registry.js", "canvas-renderer.js", "audio.js", "exploration-model.js", "experiences.js", "data-services.js", "hydrometry-service.js", "biodiversity-service.js", "startup-loader.js", "source-controller.js", "territory-controller.js", "fieldwork-controller.js", "experience-controller.js", "view-controller.js", "lifecycle-controller.js", "map-engine.js", "cell-inspector.js", "ui-shell.js", "input-controller.js", "carnet-format.js", "snapshot-manager.js", "main.js", "session-health.js", "application-controller.js"].map((name) => ({
  name,
  source: readFileSync(new URL(`../src/app/${name}`, import.meta.url), "utf8")
}));
const sourceByName = Object.fromEntries(sourceScripts.map(({ name, source }) => [name, source]));
const failures = [];

function check(label, test) {
  try {
    assert.ok(test(), label);
    console.log(`✓ ${label}`);
  } catch (error) {
    failures.push(error.message);
    console.error(`× ${label}`);
  }
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const functions = [...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
const duplicateFunctions = [...new Set(functions.filter((name, index) => functions.indexOf(name) !== index))];
const registeredBlock = html.match(/els\s*=\s*Object\.fromEntries\(\[([\s\S]*?)\]\.map\(id=>\[id,document\.getElementById\(id\)\]\)\);/);
const registeredIds = registeredBlock ? [...registeredBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]) : [];
const missingRegisteredIds = registeredIds.filter((id) => !ids.includes(id));
const classicScripts = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);

check("version visible cohérente", () => Boolean(atlasVersion) && html.includes(`v${atlasVersion}`) && html.includes(`const APP_VERSION = "${atlasVersion}"`));
check("version du HUD liée au runtime", () => html.includes('id="appVersionLabel"') && html.includes('els.appVersionLabel.textContent=`V${APP_VERSION}`'));
check("livrable autonome généré", () => html.includes("Fichier généré par npm run build") && !html.includes("@atlas-inline:"));
check("identifiants HTML uniques", () => duplicateIds.length === 0);
check("fonctions nommées uniques", () => duplicateFunctions.length === 0);
check("registre des éléments détecté", () => Boolean(registeredBlock));
check("registre sans identifiant absent", () => missingRegisteredIds.length === 0);
check("registre central des sources", () =>
  sourceByName["source-registry.js"].includes("const SOURCE_REGISTRY_SCHEMA_VERSION=1") &&
  (sourceByName["source-registry.js"].match(/statusElementId:/g)||[]).length===11 &&
  sourceByName["source-registry.js"].includes("function setSourceStatus") &&
  sourceByName["source-registry.js"].includes("function sourceReferencesForSnapshot") &&
  sourceByName["application-controller.js"].includes("initializeSourceRegistryUI()") &&
  sourceByName["data-services.js"].includes("setSourceStatus(kind,status,label)") &&
  sourceByName["carnet-format.js"].includes("sourceReferencesForSnapshot(snapshot)") &&
  !sourceByName["carnet-format.js"].includes("function carnetSourceRegistry") &&
  registeredIds.includes("sourceCatalogList") && html.includes('id="mainAttribution">Attributions des sources en cours de préparation…')
);
check("diagnostic entièrement enregistré", () => [
  "debugPanel",
  "debugToggle",
  "debugRenderTime",
  "debugRenderAverage",
  "debugRenderPhases",
  "debugGrid",
  "debugPoiCount",
  "debugStorage",
  "debugPointer",
  "debugErrors",
  "debugChecks",
  "runSelfCheck",
  "exportDebugReport"
].every((id) => registeredIds.includes(id)));
check("pipeline Canvas final vérifié", () => html.includes('recordCanvasStage("fx-final")'));
check("repos graphique borné", () => html.includes("pulseRenderFxActivity") && html.includes("render-fx-layer.fx-active") && html.includes("adaptiveCanvasDpr"));
check("rafales de données regroupées", () =>
  sourceByName["performance.js"].includes("function scheduleDataRender") &&
  sourceByName["performance.js"].includes("DATA_RENDER_MAX_WAIT=220") &&
  sourceByName["main.js"].includes("accountDataRender(reason)") &&
  sourceByName["data-services.js"].includes('scheduleDataRender("osm-sync-complete")') &&
  sourceByName["data-services.js"].includes('scheduleDataRender("cadastre-sync")')
);
check("peaux cartographiques consolidées", () =>
  (atlasCss.match(/body\[data-effective-render="symbolic"\] #viewport\{/g)||[]).length===1 &&
  (atlasCss.match(/body\[data-effective-render="ascii"\] #viewport\{/g)||[]).length===1 &&
  !atlasCss.includes("#viewport::before") &&
  !atlasCss.includes("#viewport::after")
);
check("balayages CRT supprimés", () => ![
  "vectorSweep","crtSweep","crtFlicker","vectorPulseSoft","vectorGridDrift",
  "asciiNoiseDrift","asciiBloomPulse","asciiRefreshJitter","fxVectorSweep","fxAsciiRefresh"
].some((token)=>atlasCss.includes(token)));
check("moteur Canvas isolé", () =>
  sourceByName["canvas-renderer.js"].includes("function drawAsciiCanvasMap") &&
  sourceByName["canvas-renderer.js"].includes("function drawSymbolicCanvasMap") &&
  sourceByName["canvas-renderer.js"].includes("function finalizeCanvasFrame") &&
  sourceByName["canvas-renderer.js"].includes("const renderPipelineRuntime") &&
  !sourceByName["main.js"].includes("function drawSymbolicCanvasMap") &&
  !sourceByName["main.js"].includes("const canvasRuntime")
);
check("services de données isolés", () =>
  sourceByName["data-services.js"].includes("async function overpassRequest") &&
  sourceByName["data-services.js"].includes("async function fetchCadastre") &&
  sourceByName["data-services.js"].includes("async function syncCultureHeritage") &&
  sourceByName["data-services.js"].includes("function cartofrichesDepartmentFilter") &&
  sourceByName["data-services.js"].includes("comm_insee__greater") &&
  !sourceByName["data-services.js"].includes("long__greater") &&
  sourceByName["data-services.js"].includes("async function fetchElevation") &&
  sourceByName["data-services.js"].includes("async function fetchBss") &&
  !sourceByName["main.js"].includes("async function overpassRequest") &&
  !sourceByName["main.js"].includes("async function fetchCadastre")
);
check("démarrage réseau étagé", () =>
  sourceByName["startup-loader.js"].includes("const STARTUP_DATA_CONCURRENCY=2") &&
  sourceByName["startup-loader.js"].includes("requestIdleCallback") &&
  sourceByName["startup-loader.js"].includes('document.addEventListener("visibilitychange",resume)') &&
  sourceByName["startup-loader.js"].includes("function runStartupDataLoad") &&
  sourceByName["application-controller.js"].includes("runStartupDataLoad()") &&
  !sourceByName["main.js"].includes("Promise.allSettled([fetchOverpass()")
);
check("contrôleur de terrain isolé", () =>
  sourceByName["fieldwork-controller.js"].includes("function bindFieldworkController") &&
  sourceByName["fieldwork-controller.js"].includes("async function locateUser") &&
  sourceByName["fieldwork-controller.js"].includes("function saveHousePosition") &&
  sourceByName["fieldwork-controller.js"].includes('els.addLocalMarker.addEventListener("click"') &&
  sourceByName["fieldwork-controller.js"].includes('els.addLoreItem.addEventListener("click"') &&
  sourceByName["application-controller.js"].includes("bindFieldworkController()") &&
  !sourceByName["main.js"].includes("async function locateUser") &&
  !sourceByName["main.js"].includes("function saveHousePosition") &&
  !sourceByName["main.js"].includes("els.addLocalMarker.addEventListener")
);
check("contrôleur des sources isolé", () =>
  sourceByName["source-controller.js"].includes("function bindSourceController") &&
  sourceByName["source-controller.js"].includes("function resetBssSource") &&
  sourceByName["source-controller.js"].includes("function clearCartofrichesSource") &&
  sourceByName["source-controller.js"].includes("async function retryAllDataSources") &&
  sourceByName["source-controller.js"].includes('els.osmFile.addEventListener("change"') &&
  sourceByName["application-controller.js"].includes("bindSourceController()") &&
  !sourceByName["main.js"].includes("els.syncOsm.addEventListener") &&
  !sourceByName["main.js"].includes("els.syncCartofriches.addEventListener") &&
  !sourceByName["main.js"].includes("els.retryData.addEventListener")
);
check("repli cadastral par emprise", () =>
  sourceByName["data-services.js"].includes("function cadastreExtentGeometry") &&
  sourceByName["data-services.js"].includes("async function fetchApiCartoCadastreParcels") &&
  sourceByName["data-services.js"].includes("https://apicarto.ign.fr/api/cadastre/parcelle") &&
  sourceByName["snapshot-manager.js"].includes("state.cadastreBuildings.length||state.cadastreParcels.length")
);
check("gestionnaire de territoires isolé", () =>
  sourceByName["territory-controller.js"].includes("async function activateTerritory") &&
  sourceByName["territory-controller.js"].includes("async function openStoredTerritory") &&
  sourceByName["territory-controller.js"].includes("async function renameStoredTerritory") &&
  sourceByName["territory-controller.js"].includes("async function duplicateStoredTerritory") &&
  sourceByName["territory-controller.js"].includes("async function deleteStoredTerritory") &&
  sourceByName["territory-controller.js"].includes("function resetTerritoryRuntimeData") &&
  sourceByName["territory-controller.js"].includes("async function syncCoreTerritorySources") &&
  sourceByName["application-controller.js"].includes("bindTerritoryController()") &&
  sourceByName["territory-model.js"].includes("function territoryStorageKey") &&
  sourceByName["data-services.js"].includes("geocodage/reverse") &&
  !sourceByName["data-services.js"].includes("communes/16/16418") &&
  !sourceByName["data-services.js"].includes("42 rue de la Falaise")
);
check("contrôleur des expériences isolé", () =>
  sourceByName["experience-controller.js"].includes("function bindExperienceController") &&
  sourceByName["experience-controller.js"].includes("function startEncounterFromControl") &&
  sourceByName["experience-controller.js"].includes("function openCodexFromControl") &&
  sourceByName["experience-controller.js"].includes("function moveGuidedTour") &&
  sourceByName["application-controller.js"].includes("bindExperienceController()") &&
  !sourceByName["main.js"].includes("els.testEncounter.addEventListener") &&
  !sourceByName["main.js"].includes("els.guidedTourStart.addEventListener") &&
  !sourceByName["main.js"].includes("els.encounterBody.addEventListener")
);
check("contrôleur de vue isolé", () =>
  sourceByName["view-controller.js"].includes("function bindViewController") &&
  sourceByName["view-controller.js"].includes("function setLayerFromControl") &&
  sourceByName["view-controller.js"].includes("function focusCavityFromControl") &&
  sourceByName["view-controller.js"].includes("function runViewDebugAction") &&
  sourceByName["application-controller.js"].includes("bindViewController()") &&
  !sourceByName["main.js"].includes("els.scenario.addEventListener") &&
  !sourceByName["main.js"].includes("els.cavitySelect.addEventListener") &&
  !sourceByName["main.js"].includes("els.runSelfCheck.addEventListener")
);
check("cycle de vie applicatif isolé", () =>
  sourceByName["lifecycle-controller.js"].includes("function bindLifecycleController") &&
  sourceByName["lifecycle-controller.js"].includes("function handleLifecycleVisibility") &&
  sourceByName["lifecycle-controller.js"].includes("function unlockAudioFromGesture") &&
  sourceByName["lifecycle-controller.js"].includes("function handleGlobalActionSound") &&
  sourceByName["application-controller.js"].includes("bindLifecycleController()") &&
  !sourceByName["main.js"].includes('document.addEventListener("visibilitychange"') &&
  !sourceByName["main.js"].includes("operationStatusObserver.observe") &&
  !sourceByName["main.js"].includes("quietButtonIds")
);
check("orchestrateur applicatif isolé", () =>
  sourceByName["application-controller.js"].includes("function bindApplicationController") &&
  sourceByName["application-controller.js"].includes("async function bootAtlas") &&
  sourceByName["application-controller.js"].includes("function startAtlasApplication") &&
  sourceByName["application-controller.js"].includes("function handleDocumentNavigation") &&
  sourceByName["main.js"].includes('function render(reason="direct")') &&
  !sourceByName["main.js"].includes("bootAtlas") &&
  !sourceByName["main.js"].includes("addEventListener") &&
  !sourceByName["main.js"].includes("bindInputController")
);
check("sessions longues bornées", () =>
  sourceByName["session-health.js"].includes("const SESSION_CACHE_LIMITS=") &&
  sourceByName["session-health.js"].includes("function runSessionMaintenance") &&
  sourceByName["session-health.js"].includes("function clearTransientSessionResources") &&
  sourceByName["session-health.js"].includes('window.addEventListener("pagehide"') &&
  sourceByName["application-controller.js"].includes("bindSessionHealth()") &&
  sourceByName["audio.js"].includes("function suspend()") &&
  sourceByName["main.js"].includes('scheduleSessionMaintenance("rendu")')
);
check("services applicatifs ordonnés", () =>
  sourceByName["audio.js"].includes("const retroAudio") &&
  sourceByName["exploration-model.js"].includes("function ensureSpatialIndexes") &&
  sourceByName["experiences.js"].includes("function startLocalEncounter") &&
  sourceByName["experiences.js"].includes("function startGuidedTour") &&
  !sourceByName["main.js"].includes("const retroAudio") &&
  !sourceByName["main.js"].includes("function startLocalEncounter")
);
check("moteur cartographique isolé et mesuré", () =>
  sourceByName["map-engine.js"].includes("function composeMapGrid") &&
  sourceByName["main.js"].includes("debugState.lastRenderPhases=") &&
  !sourceByName["main.js"].includes("function renderSurface") &&
  !sourceByName["main.js"].includes("function renderUndergroundBase")
);
check("moteur Canvas exclusif", () =>
  sourceByName["runtime.js"].includes('const CANVAS_RENDERER = !!document.createElement("canvas").getContext') &&
  sourceByName["canvas-renderer.js"].includes("function activeMapSurface(){return els.mapCanvas}") &&
  !sourceByName["map-engine.js"].includes("function renderDomMap") &&
  !sourceByName["runtime.js"].includes("RENDERER_MODE") &&
  !html.includes('id="map"') &&
  !html.includes("renderer-dom")
);
check("contrôleur de navigation isolé", () =>
  sourceByName["input-controller.js"].includes("function bindInputController") &&
  sourceByName["input-controller.js"].includes("function handleMapPointerMove") &&
  sourceByName["input-controller.js"].includes("function handlePinchMove") &&
  sourceByName["application-controller.js"].includes("bindInputController()") &&
  !sourceByName["main.js"].includes("function endDrag") &&
  !sourceByName["main.js"].includes("let drag=")
);
check("inspecteur de cellule isolé", () =>
  sourceByName["cell-inspector.js"].includes("function mapPositionFromClient") &&
  sourceByName["cell-inspector.js"].includes("function selectGridCell") &&
  sourceByName["cell-inspector.js"].includes("function selectSymbolicPoi") &&
  sourceByName["cell-inspector.js"].includes("function presentCellDescription") &&
  sourceByName["cell-inspector.js"].includes("function scheduleCanvasHover") &&
  !sourceByName["main.js"].includes("function selectGridCell") &&
  !sourceByName["main.js"].includes("function hoverDescription") &&
  !sourceByName["canvas-renderer.js"].includes("function selectSymbolicPoi")
);
check("modèle de territoire central", () =>
  sourceByName["territory-model.js"].includes("const LEGACY_TERRITORY_PROFILE=") &&
  sourceByName["territory-model.js"].includes("function normalizeTerritoryProfile") &&
  sourceByName["territory-model.js"].includes("function applyTerritoryProfileToConfig") &&
  sourceByName["territory-model.js"].includes("function territoryDepartmentValues") &&
  sourceByName["bootstrap.js"].includes("territory:ACTIVE_TERRITORY") &&
  sourceByName["snapshot-manager.js"].includes("territory:territorySnapshot(CONFIG.territory)") &&
  !sourceByName["data-services.js"].includes('code_departement:"16"') &&
  !sourceByName["data-services.js"].includes('params:{q:"Charente"}')
);
check("gestionnaire d’instantanés isolé", () =>
  sourceByName["snapshot-manager.js"].includes("function validateAtlasSnapshot") &&
  sourceByName["snapshot-manager.js"].includes("function buildAtlasSnapshot") &&
  sourceByName["snapshot-manager.js"].includes("async function saveSnapshotToDb") &&
  sourceByName["snapshot-manager.js"].includes("async function listTerritoriesFromDb") &&
  sourceByName["snapshot-manager.js"].includes("async function loadTerritorySnapshotFromDb") &&
  sourceByName["snapshot-manager.js"].includes("const TERRITORY_SNAPSHOT_PREFIX") === false &&
  sourceByName["bootstrap.js"].includes("const TERRITORY_SNAPSHOT_PREFIX") &&
  sourceByName["snapshot-manager.js"].includes("function exportStandaloneHtml") &&
  sourceByName["application-controller.js"].includes("bindSnapshotManager()") &&
  !sourceByName["main.js"].includes("function applyAtlasSnapshot") &&
  !sourceByName["main.js"].includes("function openSnapshotDb")
);
check("format canonique du carnet", () =>
  sourceByName["carnet-format.js"].includes('const ATLAS_CARNET_FORMAT="atlas-carnet"') &&
  sourceByName["carnet-format.js"].includes("async function buildAtlasCarnet") &&
  sourceByName["carnet-format.js"].includes("async function validateAtlasCarnet") &&
  sourceByName["carnet-format.js"].includes("async function atlasCarnetToSnapshot") &&
  sourceByName["carnet-format.js"].includes('excluded:["osm","cadastreBuildings","cadastreParcels","elevation","coverage"]') &&
  sourceByName["snapshot-manager.js"].includes("function importedTerritoryCopy") &&
  html.includes("exporter le carnet .atlas") &&
  html.includes("application/vnd.atlas+carnet+json")
);
check("coque d’interface isolée", () =>
  sourceByName["ui-shell.js"].includes("function bindUiShell") &&
  sourceByName["ui-shell.js"].includes("function bindNativeSidebarShell") &&
  sourceByName["ui-shell.js"].includes("function responsiveGridProfile") &&
  sourceByName["ui-shell.js"].includes("function scheduleFrameFit") &&
  sourceByName["application-controller.js"].includes("bindUiShell()") &&
  !sourceByName["main.js"].includes("function fitMapFrame") &&
  !sourceByName["main.js"].includes("function prepareSidebarCards")
);
check("architecture carnet minimaliste", () =>
  html.includes('data-ui-version="field-notebook"') &&
  sourceByName["ui-shell.js"].includes("function activateSidebarSection") &&
  ["carnets","explorer","noter","sources"].every((section)=>html.includes(`id="sidebar-section-${section}"`)&&html.includes(`data-section-target="${section}"`)) &&
  ["carnets","location","display","starting-point","legend","field-notes","source-status","hydrometry","biodiversity","diagnostic"].every((key)=>html.includes(`data-ui-card="${key}"`)) &&
  ["nearby","cavity-search","memory","lore"].every((key)=>html.includes(`data-ui-subsection="${key}"`)) &&
  !sourceByName["ui-shell.js"].includes("function renamePreparedSidebarCard") &&
  !sourceByName["ui-shell.js"].includes("function mergePreparedSidebarCards") &&
  !sourceByName["ui-shell.js"].includes('document.createElement("nav")') &&
  !sourceByName["ui-shell.js"].includes("updateSidebarClusterStatus") &&
  atlasCss.includes('body[data-ui-version="field-notebook"] .sidebar-section-tabs') &&
  atlasCss.includes('body[data-ui-version="field-notebook"] .sidebar-cluster') &&
  atlasCss.includes("--ui-bg:#07100c") &&
  atlasCss.includes("--ui-text:#dce9e1") &&
  atlasCss.includes("font-family:Arial,Helvetica,sans-serif") &&
  !atlasCss.includes("--ui-paper:") &&
  html.includes('data-interface-retired="map-scale-duplicate"') &&
  html.includes('data-interface-retired="map-depth-duplicate"')
);
check("contrat souterrain harmonisé", () =>
  sourceByName["map-engine.js"].includes("function undergroundVisualContract") &&
  sourceByName["map-engine.js"].includes("function renderUndergroundSurfaceGhost") &&
  sourceByName["map-engine.js"].includes("c-underground-volume") &&
  sourceByName["map-engine.js"].includes("c-underground-line") &&
  sourceByName["canvas-renderer.js"].includes("function symbolicDrawUndergroundLinesAndEdges") &&
  !sourceByName["map-engine.js"].includes("renderSurface(ghost)") &&
  !sourceByName["map-engine.js"].includes("emprise simplifiée du même modèle")
);
check("révision OSM propagée", () => html.includes('markMapDataRevision("osm")'));
check("dernière vue OSM reprise", () => html.includes("osmEnsurePending") && html.includes("scheduleOsmEnsure(0)"));
check("Canvas accessible au clavier", () => /<canvas[^>]+id="mapCanvas"[^>]+tabindex="0"/.test(html));
check("au moins un script applicatif", () => classicScripts.length > 0);

for (const [index, source] of classicScripts.entries()) {
  try {
    new vm.Script(source, { filename: `index.html#script-${index + 1}` });
    console.log(`✓ syntaxe du script ${index + 1}`);
  } catch (error) {
    failures.push(`syntaxe du script ${index + 1}: ${error.message}`);
    console.error(`× syntaxe du script ${index + 1}`);
  }
}

for (const { name, source } of sourceScripts) {
  try {
    new vm.Script(source, { filename: `src/app/${name}` });
    console.log(`✓ syntaxe de la source ${name}`);
  } catch (error) {
    failures.push(`syntaxe de la source ${name}: ${error.message}`);
    console.error(`× syntaxe de la source ${name}`);
  }
}

if (duplicateFunctions.length) console.error(`  Fonctions dupliquées : ${duplicateFunctions.join(", ")}`);
if (duplicateIds.length) console.error(`  Identifiants dupliqués : ${duplicateIds.join(", ")}`);
if (missingRegisteredIds.length) console.error(`  Identifiants enregistrés mais absents : ${missingRegisteredIds.join(", ")}`);

if (failures.length) {
  console.error(`\n${failures.length} contrôle(s) en échec.`);
  process.exitCode = 1;
} else {
  console.log(`\nTous les contrôles sont passés (${ids.length} identifiants, ${functions.length} fonctions nommées).`);
}
