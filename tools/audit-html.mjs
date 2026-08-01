import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const atlasVersion = packageMetadata.atlasVersion;
const sourceScripts = ["runtime.js", "performance.js", "debug.js", "bootstrap.js", "canvas-renderer.js", "audio.js", "exploration-model.js", "experiences.js", "data-services.js", "map-engine.js", "cell-inspector.js", "ui-shell.js", "input-controller.js", "snapshot-manager.js", "main.js"].map((name) => ({
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
check("livrable autonome généré", () => html.includes("Fichier généré par npm run build") && !html.includes("@atlas-inline:"));
check("identifiants HTML uniques", () => duplicateIds.length === 0);
check("fonctions nommées uniques", () => duplicateFunctions.length === 0);
check("registre des éléments détecté", () => Boolean(registeredBlock));
check("registre sans identifiant absent", () => missingRegisteredIds.length === 0);
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
check("balayages CRT supprimés", () => !html.includes("fx-vector-sweep") && !html.includes("fx-ascii-refresh") && !html.includes("fxVectorSweep") && !html.includes("fxAsciiRefresh"));
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
  sourceByName["data-services.js"].includes("async function fetchElevation") &&
  sourceByName["data-services.js"].includes("async function fetchBss") &&
  !sourceByName["main.js"].includes("async function overpassRequest") &&
  !sourceByName["main.js"].includes("async function fetchCadastre")
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
  sourceByName["map-engine.js"].includes("function renderDomMap") &&
  sourceByName["main.js"].includes("debugState.lastRenderPhases=") &&
  !sourceByName["main.js"].includes("function renderSurface") &&
  !sourceByName["main.js"].includes("function renderUndergroundBase")
);
check("contrôleur de navigation isolé", () =>
  sourceByName["input-controller.js"].includes("function bindInputController") &&
  sourceByName["input-controller.js"].includes("function handleMapPointerMove") &&
  sourceByName["input-controller.js"].includes("function handlePinchMove") &&
  sourceByName["main.js"].includes("bindInputController()") &&
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
check("gestionnaire d’instantanés isolé", () =>
  sourceByName["snapshot-manager.js"].includes("function validateAtlasSnapshot") &&
  sourceByName["snapshot-manager.js"].includes("function buildAtlasSnapshot") &&
  sourceByName["snapshot-manager.js"].includes("async function saveSnapshotToDb") &&
  sourceByName["snapshot-manager.js"].includes("function exportStandaloneHtml") &&
  sourceByName["main.js"].includes("bindSnapshotManager()") &&
  !sourceByName["main.js"].includes("function applyAtlasSnapshot") &&
  !sourceByName["main.js"].includes("function openSnapshotDb")
);
check("coque d’interface isolée", () =>
  sourceByName["ui-shell.js"].includes("function bindUiShell") &&
  sourceByName["ui-shell.js"].includes("function buildSidebarClusters") &&
  sourceByName["ui-shell.js"].includes("function responsiveGridProfile") &&
  sourceByName["ui-shell.js"].includes("function scheduleFrameFit") &&
  sourceByName["main.js"].includes("bindUiShell()") &&
  !sourceByName["main.js"].includes("function fitMapFrame") &&
  !sourceByName["main.js"].includes("function prepareSidebarCards")
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
