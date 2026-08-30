import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const templateUrl = new URL("src/index.template.html", root);
const outputUrl = new URL("index.html", root);
const explorationsOutputUrl = new URL("explorations.html", root);
// Capacitor consumes this small, generated web root. The main index.html stays
// committed at the repository root for the standalone and GitHub Pages builds.
// The Android test workflow can deliberately embed the Explorations skin without
// changing the default desktop/mobile build used by contributors.
const mobileOutputUrl = new URL("www/index.html", root);
const mobileEdition = process.env.ATLAS_MOBILE_EDITION === "explorations" ? "explorations" : "instrumental";
const styleUrl = new URL("src/styles/atlas.css", root);
const scriptUrls = [
  new URL("src/app/runtime.js", root),
  new URL("src/app/performance.js", root),
  new URL("src/app/debug.js", root),
  new URL("src/app/territory-model.js", root),
  new URL("src/app/bootstrap.js", root),
  new URL("src/app/source-registry.js", root),
  new URL("src/app/canvas-renderer.js", root),
  new URL("src/app/audio.js", root),
  new URL("src/app/exploration-model.js", root),
  new URL("src/app/experiences.js", root),
  new URL("src/app/data-services.js", root),
  new URL("src/app/hydrometry-service.js", root),
  new URL("src/app/biodiversity-service.js", root),
  new URL("src/app/nature-service.js", root),
  new URL("src/app/land-service.js", root),
  new URL("src/app/geology-service.js", root),
  new URL("src/app/poi-annotations.js", root),
  new URL("src/app/startup-loader.js", root),
  new URL("src/app/source-controller.js", root),
  new URL("src/app/territory-controller.js", root),
  new URL("src/app/fieldwork-controller.js", root),
  new URL("src/app/experience-controller.js", root),
  new URL("src/app/view-controller.js", root),
  new URL("src/app/lifecycle-controller.js", root),
  new URL("src/app/map-engine.js", root),
  new URL("src/app/cell-inspector.js", root),
  new URL("src/app/ui-shell.js", root),
  new URL("src/app/input-controller.js", root),
  new URL("src/app/carnet-format.js", root),
  new URL("src/app/snapshot-manager.js", root),
  new URL("src/app/main.js", root),
  new URL("src/app/session-health.js", root),
  new URL("src/app/application-controller.js", root)
];

const STYLE_MARKER = "/* @atlas-inline:styles */";
const SCRIPT_MARKER = "/* @atlas-inline:scripts */";
const SOURCE_GUARD_PATTERN = /<!-- @atlas-source-guard:start -->[\s\S]*?<!-- @atlas-source-guard:end -->\n?/;
const GENERATED_NOTICE = "<!-- Fichier généré par npm run build — modifier les sources dans src/. -->";

function readText(url) {
  return readFileSync(url, "utf8").replace(/\r\n?/g, "\n");
}

function replaceSingle(source, marker, replacement) {
  const first = source.indexOf(marker);
  const last = source.lastIndexOf(marker);
  if (first < 0 || first !== last) {
    throw new Error(`Le marqueur ${marker} doit apparaître exactement une fois.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + marker.length);
}

export function buildAtlasHtml({ edition = "instrumental" } = {}) {
  const sourceTemplate = readText(templateUrl);
  if (!SOURCE_GUARD_PATTERN.test(sourceTemplate)) {
    throw new Error("La protection d’ouverture directe du gabarit est absente.");
  }
  const template = sourceTemplate.replace(SOURCE_GUARD_PATTERN, "");
  const styles = readText(styleUrl).trimEnd();
  const scripts = scriptUrls.map((url) => readText(url).trim()).join("\n\n");
  let html = replaceSingle(template, STYLE_MARKER, styles);
  html = replaceSingle(html, SCRIPT_MARKER, scripts);
  if (edition === "explorations") {
    html = html.replace("<title>Atlas Karst ASCII v0.19 · carnet partageable</title>", "<title>Atlas Karst — Explorations · carnet de territoire</title>");
    html = html.replace('<body data-depth-band="surface" data-ui-version="field-notebook">', '<body data-edition="explorations" data-depth-band="surface" data-ui-version="field-notebook">');
  }
  return html.replace(/^(<!doctype html>)/i, `$1\n${GENERATED_NOTICE}`);
}

function main() {
  const generated = buildAtlasHtml();
  const explorations = buildAtlasHtml({ edition: "explorations" });
  if (process.argv.includes("--check")) {
    const current = readText(outputUrl);
    const currentExplorations = readText(explorationsOutputUrl);
    if (current !== generated || currentExplorations !== explorations) {
      console.error("× Les pages Atlas ne sont pas synchronisées avec les sources. Lance npm run build.");
      process.exitCode = 1;
      return;
    }
    console.log("✓ index.html est synchronisé avec les sources");
    return;
  }
  writeFileSync(outputUrl, generated);
  writeFileSync(explorationsOutputUrl, explorations);
  mkdirSync(new URL("www/", root), { recursive: true });
  writeFileSync(mobileOutputUrl, mobileEdition === "explorations" ? explorations : generated);
  console.log("✓ index.html autonome reconstruit");
  console.log("✓ explorations.html expérimental reconstruit");
  console.log(`✓ copie mobile Capacitor reconstruite (${mobileEdition})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
