import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startAtlasServer } from "./serve.mjs";

const server = await startAtlasServer({ port: 0, silent: true });
const address = server.address();
assert.ok(address && typeof address !== "string", "adresse du serveur local indisponible");
const baseURL = `http://127.0.0.1:${address.port}`;
let browser;

async function closeServer() {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${baseURL}/?offline&debug`, { waitUntil: "domcontentloaded" });
  await page.locator("#viewport").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.getElementById("debugRenderTime")?.textContent !== "—");

  const rows = await page.evaluate(() => {
    const center = { ...state.center };
    state.cavities = [
      { id: "bench-quarry", name: "Carrière étalon", type: "carrière souterraine", depth: 14, lat: center.lat, lon: center.lon },
      { id: "bench-natural", name: "Conduit étalon", type: "cavité naturelle", depth: 18, lat: center.lat + .00034, lon: center.lon + .00046 }
    ];
    state.layerCavities = true;
    state.layerHypothesis = true;
    state.layerHydrology = true;
    state.layerSurface = true;
    markSpatialIndexesDirty();

    const results = [];
    for (const mode of ["symbolic", "ascii"]) {
      setRenderMode(mode);
      for (const zoomIndex of [0, 2, 4, 5]) {
        for (const depth of [-3, -14, -35]) {
          state.zoomIndex = zoomIndex;
          state.depthIndex = CONFIG.depths.indexOf(depth);
          render("benchmark-prime");
          render("benchmark-measure");
          results.push({
            mode,
            zoom: CONFIG.zooms[zoomIndex].label,
            depth,
            totalMs: Number(debugState.lastRenderMs.toFixed(1)),
            layersMs: Number(debugState.lastRenderPhases.layers.toFixed(1)),
            outputMs: Number(debugState.lastRenderPhases.output.toFixed(1))
          });
        }
      }
    }
    return results;
  });

  console.table(rows);
  const worst = rows.reduce((candidate, row) => row.totalMs > candidate.totalMs ? row : candidate, rows[0]);
  console.log(`Pire échantillon chaud : ${worst.totalMs} ms (${worst.mode}, ${worst.zoom}, ${worst.depth} m)`);
} finally {
  if (browser) await browser.close();
  await closeServer();
}
