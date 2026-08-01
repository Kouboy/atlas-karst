import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startAtlasServer } from "./serve.mjs";

const outputDirectory = new URL("../test-results/", import.meta.url);
const standaloneUrl = new URL("../index.html?offline&debug", import.meta.url).href;
const sourceTemplateUrl = new URL("../src/index.template.html?offline&debug", import.meta.url).href;
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const escapedAtlasVersion = packageMetadata.atlasVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleVersionPattern = new RegExp(`Atlas Karst ASCII v${escapedAtlasVersion}`);
await mkdir(outputDirectory, { recursive: true });

const server = await startAtlasServer({ port: 0, silent: true });
const address = server.address();
assert.ok(address && typeof address !== "string", "adresse du serveur local indisponible");
const baseURL = `http://127.0.0.1:${address.port}`;
let browser;
let failures = 0;

async function closeServer() {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function runtimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function openOfflineAtlas(page, query = "?offline&debug") {
  await page.goto(`${baseURL}/${query}`, { waitUntil: "domcontentloaded" });
  assert.match(await page.title(), titleVersionPattern);
  await page.locator("#viewport").waitFor({ state: "visible" });
  await page.waitForFunction(() => /^(symbolic|ascii)$/.test(document.body.dataset.effectiveRender || ""));
  if (query.includes("debug")) {
    await page.waitForFunction(() => document.getElementById("debugRenderTime")?.textContent !== "—");
  }
}

async function withPage(name, viewport, scenario) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = runtimeErrors(page);
  try {
    await scenario(page);
    assert.deepEqual(errors, [], `erreurs navigateur dans ${name}`);
    console.log(`✓ ${name}`);
  } catch (error) {
    failures++;
    const safeName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const screenshotPath = fileURLToPath(new URL(`${safeName}.png`, outputDirectory));
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    console.error(`× ${name}\n  ${error.stack || error.message}`);
  } finally {
    await context.close();
  }
}

try {
  browser = await chromium.launch({ headless: true });

  await withPage("diagnostic et pipeline Canvas", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForFunction(() => document.getElementById("debugChecks")?.textContent?.includes("Pipeline Canvas final"));
    const checks = await page.locator("#debugChecks").innerText();
    assert.match(checks, /Pipeline Canvas final/);
    assert.match(checks, /FX synchronisés avec OSM/);
    assert.equal(await page.locator(".debug-check.bad").count(), 0);
    const renderMs = Number.parseFloat(await page.locator("#debugRenderTime").innerText());
    assert.ok(renderMs <= 80, `rendu trop lent : ${renderMs} ms`);
    assert.match(await page.locator("#debugRenderPhases").innerText(), /grille .* couches .* sortie .* interface/);
  });

  await withPage("repos graphique économe", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForTimeout(2_200);
    const idle = await page.evaluate(() => {
      const fx = document.getElementById("renderFxLayer");
      const running = [...fx.querySelectorAll(":scope > div")].filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.opacity !== "0" && style.animationName !== "none" && style.animationPlayState === "running";
      }).map((element) => element.className);
      const renderCount = Number.parseInt(document.getElementById("debugRenderAverage")?.textContent?.match(/(\d+) rendus/)?.[1] || "0", 10);
      return { motionState: fx.dataset.motionState, running, renderCount, largeScreenDpr: adaptiveCanvasDpr(3200, 2000, false) };
    });
    assert.equal(idle.motionState, "idle");
    assert.deepEqual(idle.running, [], `animations encore actives au repos : ${idle.running.join(", ")}`);
    assert.ok(idle.largeScreenDpr <= 1.12, `DPR grand écran trop élevé : ${idle.largeScreenDpr}`);
    await page.waitForTimeout(600);
    const renderCountAfter = await page.evaluate(() => Number.parseInt(document.getElementById("debugRenderAverage")?.textContent?.match(/(\d+) rendus/)?.[1] || "0", 10));
    assert.equal(renderCountAfter, idle.renderCount, "nouveau rendu JavaScript pendant le repos");
  });

  await withPage("rendus symbolique et ASCII", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    assert.equal(await page.locator("body").getAttribute("data-effective-render"), "symbolic");
    await page.getByRole("button", { name: "⌁ ASCII", exact: true }).click();
    await page.locator('body[data-effective-render="ascii"]').waitFor();
    assert.equal(await page.locator("#renderModeAscii").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#renderFxLayer").getAttribute("data-motion-state"), "active");
    await page.getByRole("button", { name: "▰ symbolique", exact: true }).click();
    await page.locator('body[data-effective-render="symbolic"]').waitFor();
    assert.equal(await page.locator("#renderFxLayer").getAttribute("data-motion-state"), "active");
  });

  await withPage("sous-sol harmonisé selon le zoom", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const comparison = await page.evaluate(() => {
      const center={...state.center};
      state.cavities=[
        {id:"test-quarry",name:"Carrière test",type:"carrière souterraine",depth:14,lat:center.lat,lon:center.lon},
        {id:"test-natural",name:"Conduit test",type:"cavité naturelle",depth:18,lat:center.lat+.00034,lon:center.lon+.00046}
      ];
      state.layerCavities=true;state.layerHypothesis=true;state.layerHydrology=true;state.layerSurface=true;
      state.depthIndex=CONFIG.depths.indexOf(-14);state.zoomIndex=0;markSpatialIndexesDirty();render("test-underground-far");
      const farClasses=state.lastGrid.grid.flat().map(cell=>String(cell.cls||""));
      state.zoomIndex=4;render("test-underground-near");
      const nearClasses=state.lastGrid.grid.flat().map(cell=>String(cell.cls||""));
      const phases={...debugState.lastRenderPhases};
      const shallow=undergroundVisualContract(-3),deep=undergroundVisualContract(-35);
      state.scenario="extensive";
      const edgeCavity={id:"test-edge-quarry",name:"Carrière hors champ",type:"carrière souterraine",depth:14,lat:center.lat,lon:center.lon};
      state.cavities=[edgeCavity];hypothesisModelCache.clear();markSpatialIndexesDirty();
      const edgeModel=getHypothesisModel(edgeCavity,-14);
      const edgePoints=[...edgeModel.polygons.flatMap(item=>item.points),...edgeModel.lines.flatMap(item=>item.points),...edgeModel.points]
        .sort((a,b)=>Math.hypot(b.x,b.y)-Math.hypot(a.x,a.y));
      state.zoomIndex=5;
      const edgeTarget=edgePoints.find(point=>{
        const target=offsetToCoord(edgeCavity,point.x,point.y),extent=extentFor(target,currentZoom());
        return !inExtent(edgeCavity.lat,edgeCavity.lon,expandExtentBox(extent,1.7));
      });
      if(!edgeTarget)throw new Error("modèle étalon trop court pour le test hors champ");
      state.center=offsetToCoord(edgeCavity,edgeTarget.x,edgeTarget.y);render("test-underground-origin-outside");
      const originOutside=!inExtent(edgeCavity.lat,edgeCavity.lon,state.lastGrid.extent);
      const edgeVisibleBefore=state.lastGrid.grid.flat().filter(cell=>cell.feature?.hypothesisModel===edgeModel.key).length;
      state.center=offsetToCoord(state.center,12,8);render("test-underground-after-pan");
      const edgeVisibleAfter=state.lastGrid.grid.flat().filter(cell=>cell.feature?.hypothesisModel===edgeModel.key).length;
      setRenderMode("ascii");const asciiBand=document.body.dataset.depthBand;
      setRenderMode("symbolic");
      return {
        farGeometry:farClasses.filter(cls=>/c-underground-(?:volume|line|edge|locator)/.test(cls)).length,
        nearLines:nearClasses.filter(cls=>cls.includes("c-underground-line")).length,
        nearVolumes:nearClasses.filter(cls=>cls.includes("c-underground-volume")).length,
        phases,asciiBand,mode:document.body.dataset.effectiveRender,paletteChanges:shallow.ground!==deep.ground,
        originOutside,edgeVisibleBefore,edgeVisibleAfter
      };
    });
    assert.equal(comparison.farGeometry,0,"une géométrie artificielle subsiste au zoom territoire");
    assert.ok(comparison.nearLines>0,"les conduits souterrains ne sont pas tracés au zoom proche");
    assert.ok(comparison.nearVolumes>0,"les volumes souterrains ne sont pas tracés au zoom proche");
    assert.ok(comparison.paletteChanges,"la profondeur ne modifie pas le contrat chromatique");
    assert.ok(comparison.originOutside,"l’origine étalon devrait être hors champ");
    assert.ok(comparison.edgeVisibleBefore>0,"la galerie disparaît lorsque son origine sort du champ");
    assert.ok(comparison.edgeVisibleAfter>0,"la galerie disparaît après un déplacement qui conserve son emprise visible");
    assert.ok(comparison.phases.layers<40,`projection souterraine trop coûteuse : ${comparison.phases.layers.toFixed(1)} ms`);
    assert.equal(comparison.asciiBand,"middle");
    assert.equal(comparison.mode,"symbolic");
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile portrait", width: 390, height: 844 },
    { name: "mobile paysage", width: 844, height: 390 }
  ]) {
    await withPage(`mise en page ${viewport.name}`, viewport, async (page) => {
      await openOfflineAtlas(page, "?offline");
      const layout = await page.evaluate(() => {
        const canvas = document.getElementById("mapCanvas").getBoundingClientRect();
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          canvas: { width: canvas.width, height: canvas.height },
          controls: [...document.querySelectorAll(".statusbar .toolbar-button,.map-actions button")]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return { id: element.id, width: rect.width, height: rect.height };
            })
        };
      });
      assert.ok(layout.bodyWidth <= layout.viewportWidth, "débordement horizontal");
      assert.ok(layout.canvas.width > 250 && layout.canvas.height > 200, "Canvas trop petit");
      if (viewport.width <= 940) {
        for (const control of layout.controls) {
          assert.ok(control.height >= 44, `${control.id} mesure moins de 44 px de haut`);
          if (control.id.startsWith("map")) assert.ok(control.width >= 44, `${control.id} mesure moins de 44 px de large`);
        }
      }
    });
  }

  await withPage("moteur DOM de secours", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page, "?offline&renderer=dom");
    assert.match(await page.locator("body").getAttribute("class"), /renderer-dom/);
    assert.equal(await page.locator("#map .cell").count(), 120 * 44);
  });

  await withPage("navigation clavier", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const center = page.locator("#centerLabel");
    const before = await center.innerText();
    await page.locator("#sidebarToggle").press("ArrowRight");
    assert.equal(await center.innerText(), before, "un bouton a déplacé la carte");
    await page.locator("#mapCanvas").press("ArrowRight");
    await page.waitForFunction((value) => document.getElementById("centerLabel")?.textContent !== value, before);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "mapCanvas");
  });

  await withPage("livrable autonome file", { width: 1280, height: 720 }, async (page) => {
    await page.goto(standaloneUrl, { waitUntil: "domcontentloaded" });
    assert.match(await page.title(), titleVersionPattern);
    await page.locator('body[data-effective-render="symbolic"]').waitFor();
    await page.waitForFunction(() => document.getElementById("debugRenderTime")?.textContent !== "—");
    assert.ok(await page.locator("#mapCanvas").isVisible(), "Canvas autonome invisible");
  });

  await withPage("gabarit redirigé vers le livrable", { width: 1280, height: 720 }, async (page) => {
    await page.goto(sourceTemplateUrl, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.endsWith("/index.html") && url.searchParams.has("offline"));
    assert.match(await page.title(), titleVersionPattern);
    await page.locator('body[data-effective-render="symbolic"]').waitFor();
    assert.ok(await page.locator("#mapCanvas").isVisible(), "redirection du gabarit incomplète");
  });
} finally {
  if (browser) await browser.close();
  await closeServer();
}

if (failures) {
  console.error(`\n${failures} scénario(s) navigateur en échec.`);
  process.exitCode = 1;
} else {
  console.log("\nTous les scénarios navigateur sont passés.");
}
