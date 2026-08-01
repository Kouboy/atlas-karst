import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const atlasVersion = packageMetadata.atlasVersion;
const sourceScripts = ["runtime.js", "performance.js", "debug.js", "main.js"].map((name) => ({
  name,
  source: readFileSync(new URL(`../src/app/${name}`, import.meta.url), "utf8")
}));
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
check("balayages CRT supprimés", () => !html.includes("fx-vector-sweep") && !html.includes("fx-ascii-refresh") && !html.includes("fxVectorSweep") && !html.includes("fxAsciiRefresh"));
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
