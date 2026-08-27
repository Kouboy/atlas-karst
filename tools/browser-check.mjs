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

function parseCssRgb(value) {
  const parts=String(value).match(/[\d.]+/g)?.slice(0,3).map(Number)||[];
  return parts.length===3?parts:null;
}

function contrastRatio(foreground,background) {
  const luminance=value=>{
    const rgb=parseCssRgb(value);assert.ok(rgb,`couleur CSS illisible : ${value}`);
    const channels=rgb.map(channel=>{const normalized=channel/255;return normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4});
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  };
  const lighter=Math.max(luminance(foreground),luminance(background)),darker=Math.min(luminance(foreground),luminance(background));
  return (lighter+.05)/(darker+.05);
}

async function openOfflineAtlas(page, query = "?offline&debug") {
  await page.goto(`${baseURL}/${query}`, { waitUntil: "domcontentloaded" });
  assert.match(await page.title(), titleVersionPattern);
  await page.locator("#viewport").waitFor({ state: "visible" });
  await page.waitForFunction(() => /^(symbolic|ascii)$/.test(document.body.dataset.effectiveRender || ""));
  await page.waitForFunction(() => territoryControllerRuntime.managerReady === true);
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
    const identity=await page.evaluate(()=>({version:document.getElementById("appVersionLabel")?.textContent,territory:document.getElementById("territorySummary")?.textContent,debugVisible:getComputedStyle(document.getElementById("debugToggle")).display!=="none"}));
    assert.equal(identity.version,`V${packageMetadata.atlasVersion}`);
    assert.match(identity.territory,/Atlas historique d.Angoulême · 16 × 16 km/);
    assert.equal(identity.debugVisible,true,"le bouton diagnostic doit rester accessible");
    const coldMs = Number.parseFloat(await page.locator("#debugRenderTime").innerText());
    assert.ok(coldMs <= 140, `premier rendu trop lent : ${coldMs} ms`);
    await page.evaluate(() => {
      render("test-warm-budget");
      runAtlasSelfCheck();
    });
    const checks = await page.locator("#debugChecks").innerText();
    assert.match(checks, /Pipeline Canvas final/);
    assert.match(checks, /FX synchronisés avec OSM/);
    assert.match(checks, /Coque responsive/);
    assert.match(checks, /Gestionnaire de territoires/);
    assert.match(checks, /Gestionnaire d’instantanés/);
    assert.match(checks, /Rendu stabilisé sous 80 ms/);
    assert.equal(await page.locator(".debug-check.bad").count(), 0);
    const warmMs = Number.parseFloat(await page.locator("#debugRenderTime").innerText());
    assert.ok(warmMs <= 80, `rendu stabilisé trop lent : ${warmMs} ms`);
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
      const visibleAnimations = document.getAnimations().filter((animation) => {
        if(animation.playState!=="running")return false;
        const target=animation.effect?.target;
        if(!(target instanceof Element))return false;
        const rect=target.getBoundingClientRect(),style=getComputedStyle(target);
        return style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
      }).map((animation)=>`${animation.animationName||"transition"}:${animation.effect?.target?.id||animation.effect?.target?.className||"élément"}`);
      const renderCount = Number.parseInt(document.getElementById("debugRenderAverage")?.textContent?.match(/(\d+) rendus/)?.[1] || "0", 10);
      return { motionState: fx.dataset.motionState, running, visibleAnimations, renderCount, largeScreenDpr: adaptiveCanvasDpr(3200, 2000, false) };
    });
    assert.equal(idle.motionState, "idle");
    assert.deepEqual(idle.running, [], `animations encore actives au repos : ${idle.running.join(", ")}`);
    assert.deepEqual(idle.visibleAnimations, [], `animations visibles encore actives au repos : ${idle.visibleAnimations.join(", ")}`);
    assert.ok(idle.largeScreenDpr <= 1.12, `DPR grand écran trop élevé : ${idle.largeScreenDpr}`);
    await page.waitForTimeout(600);
    const renderCountAfter = await page.evaluate(() => Number.parseInt(document.getElementById("debugRenderAverage")?.textContent?.match(/(\d+) rendus/)?.[1] || "0", 10));
    assert.equal(renderCountAfter, idle.renderCount, "nouveau rendu JavaScript pendant le repos");
    await page.locator("#ambientMotion").uncheck();
    assert.ok(await page.evaluate(() => document.body.classList.contains("motion-disabled")),"la préférence d’animation ne gouverne pas l’interface");
  });

  await withPage("rafales de données regroupées", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForTimeout(260);
    const result = await page.evaluate(async () => {
      const baseline=debugState.renderCount,requestsBefore=dataRenderRuntime.requests,rendersBefore=dataRenderRuntime.renders;
      scheduleDataRender("test-osm");scheduleDataRender("test-cadastre");scheduleDataRender("test-relief");
      await new Promise(resolve=>setTimeout(resolve,280));
      const afterBatch=debugState.renderCount;
      scheduleDataRender("test-covered");
      render("test-direct-interaction");
      await new Promise(resolve=>setTimeout(resolve,280));
      return {
        baseline,afterBatch,afterCovered:debugState.renderCount,
        requests:dataRenderRuntime.requests-requestsBefore,
        renders:dataRenderRuntime.renders-rendersBefore,
        coalesced:dataRenderCoalescedCount(),covered:dataRenderRuntime.covered,
        maxBatch:dataRenderRuntime.maxBatchSize,lastReason:debugState.lastReason
      };
    });
    assert.ok(result.baseline<=2,`le démarrage hors ligne produit encore ${result.baseline} rendus`);
    assert.equal(result.afterBatch,result.baseline+1,"la première rafale a produit plus d’un rendu");
    assert.equal(result.afterCovered,result.afterBatch+1,"la mise à jour couverte a produit un rendu supplémentaire");
    assert.equal(result.requests,4);
    assert.equal(result.renders,1);
    assert.ok(result.coalesced>=3,`seulement ${result.coalesced} demandes regroupées`);
    assert.ok(result.covered>=1,"le rendu direct n’a pas couvert la donnée en attente");
    assert.equal(result.maxBatch,3);
    assert.equal(result.lastReason,"test-direct-interaction");
  });

  await withPage("démarrage réseau étagé", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      let running=0,maxRunning=0;const starts=[];
      const task=(id,delay,fail=false)=>({id,run:()=>new Promise((resolve,reject)=>{
        running++;maxRunning=Math.max(maxRunning,running);starts.push(id);
        setTimeout(()=>{running--;fail?reject(new Error(`échec ${id}`)):resolve(id)},delay);
      })});
      const results=await runStartupQueue([
        task("osm",45),task("adresse",18),task("cavités",12,true),task("relief",8),task("cadastre",5)
      ],{concurrency:2,reason:"test"});
      let simulatedHidden=true;
      Object.defineProperty(document,"hidden",{configurable:true,get:()=>simulatedHidden});
      const visibilityStarted=performance.now(),visibilityGate=waitForStartupVisibility();
      setTimeout(()=>{simulatedHidden=false;document.dispatchEvent(new Event("visibilitychange"))},28);
      await visibilityGate;const visibilityDelay=performance.now()-visibilityStarted;
      delete document.hidden;
      return {maxRunning,starts,visibilityDelay,results:results.map(item=>({id:item.id,status:item.status})),runtime:{maxConcurrent:startupRuntime.maxConcurrent,failed:startupRuntime.failed,active:startupRuntime.active,visibilityPauses:startupRuntime.visibilityPauses}};
    });
    assert.equal(result.maxRunning,2,"plus de deux synchronisations ont travaillé ensemble");
    assert.deepEqual(result.starts.slice(0,2),["osm","adresse"],"les priorités initiales ne sont pas respectées");
    assert.equal(result.results.filter(item=>item.status==="rejected").length,1,"un échec isolé n’est pas contenu");
    assert.equal(result.runtime.maxConcurrent,2);
    assert.equal(result.runtime.failed,1);
    assert.equal(result.runtime.active,false);
    assert.ok(result.visibilityDelay>=20,"une tâche masquée n’a pas attendu le retour de la page");
    assert.equal(result.runtime.visibilityPauses,1);
  });

  await withPage("contrôleur de terrain local", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.evaluate(() => {
      Object.defineProperty(navigator,"permissions",{configurable:true,value:{query:async()=>({state:"granted"})}});
      Object.defineProperty(navigator,"geolocation",{configurable:true,value:{
        getCurrentPosition:(success)=>setTimeout(()=>success({
          coords:{latitude:CONFIG.house.lat+.00003,longitude:CONFIG.house.lon-.00002,accuracy:7,altitude:null,heading:null,speed:null},
          timestamp:Date.now()
        }),0)
      }});
      document.getElementById("locateMe").click();
    });
    await page.waitForFunction(() => fieldworkRuntime.locationSuccesses===1&&!!state.userLocation);
    const result=await page.evaluate(async()=>{
      const before={observations:state.observations.length,lore:state.loreItems.length,house:{...CONFIG.house}};
      selectGridCell(Math.floor(CONFIG.gridW/2),Math.floor(CONFIG.gridH/2),{note:"test terrain"});
      document.getElementById("placeHouse").click();
      document.getElementById("localName").value="Observation de terrain test";
      document.getElementById("addLocalMarker").click();
      document.getElementById("loreName").value="Mémoire locale test";
      document.getElementById("loreSource").value="Scénario navigateur";
      document.getElementById("addLoreItem").click();
      document.getElementById("clearLocation").click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const checks=runAtlasSelfCheck();
      return {
        before,
        after:{observations:state.observations.length,lore:state.loreItems.length,house:{...CONFIG.house},userLocation:state.userLocation},
        persisted:{house:!!localStorage.getItem("atlas-karst-house-v06"),observations:JSON.parse(localStorage.getItem("atlas-karst-observations-v06")||"[]").length,lore:JSON.parse(localStorage.getItem(LORE_KEY)||"[]").length},
        runtime:{...fieldworkRuntime},
        badChecks:checks.filter(check=>check.ok===false).map(check=>check.name)
      };
    });
    assert.equal(result.after.userLocation,null,"la position ponctuelle n’a pas été effacée");
    assert.equal(result.after.observations,result.before.observations+1);
    assert.equal(result.after.lore,result.before.lore+1);
    assert.notDeepEqual(result.after.house,result.before.house,"le repère maison n’a pas été déplacé");
    assert.equal(result.persisted.house,true);
    assert.equal(result.persisted.observations,result.after.observations);
    assert.equal(result.persisted.lore,result.after.lore);
    assert.equal(result.runtime.ready,true);assert.equal(result.runtime.bound,true);
    assert.deepEqual({requests:result.runtime.locationRequests,successes:result.runtime.locationSuccesses,errors:result.runtime.locationErrors},{requests:1,successes:1,errors:0});
    assert.equal(result.runtime.houseChanges,1);assert.equal(result.runtime.observationsAdded,1);assert.equal(result.runtime.loreAdded,1);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après travail de terrain : ${result.badChecks.join(", ")}`);
  });

  await withPage("contrôleur des sources locales", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.locator("#osmFile").setInputFiles({
      name:"atlas-test.osm.json",mimeType:"application/json",
      buffer:Buffer.from(JSON.stringify({elements:[{type:"node",id:991001,lat:45.5981,lon:.1472,tags:{natural:"spring",name:"Source test"}}]}))
    });
    await page.waitForFunction(()=>sourceControllerRuntime.imports===1&&(state.osm||[]).some(feature=>feature.id==="node/991001"));
    await page.locator("#bssFile").setInputFiles({
      name:"atlas-test-bss.csv",mimeType:"text/csv",
      buffer:Buffer.from("code_bss;nom;latitude;longitude\nTEST-BSS;Forage test;45.5981;0.1472\n")
    });
    await page.waitForFunction(()=>sourceControllerRuntime.imports===2&&state.bss.some(item=>item.id==="TEST-BSS"));
    await page.locator("#cartofrichesFile").setInputFiles({
      name:"atlas-test-cartofriches.csv",mimeType:"text/csv",
      buffer:Buffer.from("site_id;site_nom;lat;long;site_statut;comm_nom\nTEST-CF;Friche test;45.59815;0.14725;friche sans projet;Gond-Pontouvre\n")
    });
    await page.waitForFunction(()=>sourceControllerRuntime.imports===3&&state.cartofriches.some(item=>item.id==="TEST-CF"));
    const imported=await page.evaluate(()=>({
      osm:state.osm.some(feature=>feature.id==="node/991001"),
      bss:state.bss.some(item=>item.id==="TEST-BSS"),
      cartofriches:state.cartofriches.some(item=>item.id==="TEST-CF"),
      savedBss:JSON.parse(localStorage.getItem(BSS_LOCAL_KEY)||"{}").items?.some(item=>item.id==="TEST-BSS")||false,
      savedCartofriches:JSON.parse(localStorage.getItem(CARTOFRICHES_KEY)||"{}").items?.some(item=>item.id==="TEST-CF")||false
    }));
    assert.deepEqual(imported,{osm:true,bss:true,cartofriches:true,savedBss:true,savedCartofriches:true});
    const cultureCoordinates=await page.evaluate(()=>([
      heritageCoordinates({coordonnees_au_format_WGS84:"45.5981,0.1472"}),
      heritageCoordinates({coordonnees_au_format_WGS84:"45,5981 ; 0,1472"}),
      normalizeCultureRecord({Reference:"PA-TEST",Titre_editorial_de_la_notice:"Monument test",coordonnees_au_format_WGS84:"45.5981,0.1472"},"monument")
    ]));
    assert.deepEqual(cultureCoordinates.map(value=>value&&{lat:value.lat,lon:value.lon}),[{lat:45.5981,lon:.1472},{lat:45.5981,lon:.1472},{lat:45.5981,lon:.1472}]);
    assert.equal(cultureCoordinates[2].name,"Monument test");
    const partialCadastre=await page.evaluate(async()=>{
      localStorage.removeItem(territoryStorageKey("atlas-karst-cadastre-v06"));localStorage.removeItem(territoryStorageKey("atlas-karst-cadastre-v07"));
      const originalFetch=fetchJsonMaybeGzip,originalFallback=fetchApiCartoCadastreParcels;
      fetchJsonMaybeGzip=async url=>{
        if(url.includes("-batiments.json.gz"))return {type:"FeatureCollection",features:[{id:"BAT-TEST",type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[.1471,45.5980],[.1473,45.5980],[.1473,45.5982],[.1471,45.5982],[.1471,45.5980]]]}}]};
        throw new TypeError("refus CORS simulé pour les parcelles");
      };
      fetchApiCartoCadastreParcels=async()=>({type:"FeatureCollection",source:"API Carto IGN · Parcellaire Express PCI",features:[{id:"PAR-TEST",type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[.1470,45.5979],[.1474,45.5979],[.1474,45.5983],[.1470,45.5983],[.1470,45.5979]]]}}]});
      try{await fetchCadastre()}finally{fetchJsonMaybeGzip=originalFetch;fetchApiCartoCadastreParcels=originalFallback}
      return {buildings:state.cadastreBuildings.length,parcels:state.cadastreParcels.length,status:els.cadastreStatus.textContent,className:els.cadastreStatus.className,title:els.cadastreStatus.title};
    });
    assert.deepEqual({buildings:partialCadastre.buildings,parcels:partialCadastre.parcels,status:partialCadastre.status,className:partialCadastre.className},{buildings:1,parcels:1,status:"1 bât. · 1 parc. · API Carto",className:"ok"});
    assert.match(partialCadastre.title,/API Carto IGN/);
    const result=await page.evaluate(async()=>{
      document.getElementById("clearBss").click();
      document.getElementById("clearCartofriches").click();
      const heritageToggle=document.getElementById("heritageMonuments");heritageToggle.checked=false;heritageToggle.dispatchEvent(new Event("change",{bubbles:true}));
      document.getElementById("clearHeritage").click();
      window.__sourceRetryCalls=[];
      syncOsmNow=async()=>{window.__sourceRetryCalls.push("osm")};
      fetchAddress=async()=>{window.__sourceRetryCalls.push("adresse")};
      fetchCadastre=async()=>{window.__sourceRetryCalls.push("cadastre")};
      fetchCavities=async()=>{window.__sourceRetryCalls.push("cavités")};
      fetchElevation=async()=>{window.__sourceRetryCalls.push("relief")};
      document.getElementById("retryData").click();
      await new Promise(resolve=>setTimeout(resolve,30));
      const checks=runAtlasSelfCheck();
      return {
        runtime:{...sourceControllerRuntime},calls:[...window.__sourceRetryCalls],
        state:{bssTest:state.bss.some(item=>item.id==="TEST-BSS"),cartofriches:state.cartofriches.length,heritageMonuments:state.heritageEnabled.monument},
        storage:{bss:localStorage.getItem(BSS_LOCAL_KEY),cartofriches:localStorage.getItem(CARTOFRICHES_KEY)},
        badChecks:checks.filter(check=>check.ok===false).map(check=>check.name)
      };
    });
    assert.equal(result.runtime.ready,true);assert.equal(result.runtime.bound,true);
    assert.equal(result.runtime.operations,8);assert.equal(result.runtime.imports,3);assert.equal(result.runtime.clears,3);assert.equal(result.runtime.filterChanges,1);assert.equal(result.runtime.retries,1);
    assert.deepEqual(result.calls,["osm","adresse","cadastre","cavités","relief"]);
    assert.deepEqual(result.state,{bssTest:false,cartofriches:0,heritageMonuments:false});
    assert.deepEqual(result.storage,{bss:null,cartofriches:null});
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après gestion des sources : ${result.badChecks.join(", ")}`);
  });

  await withPage("contrôleur des expériences", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForFunction(()=>experienceControllerRuntime.bound&&guidedTourRuntime.tours.length>0);
    assert.equal(await page.locator('[data-prototype-reserve="rencontres-locales"]').isHidden(),true,"le prototype Rencontres locales ne doit plus apparaître dans l’interface active");
    assert.equal(await page.locator('[data-prototype-reserve="parcours-guides"]').isHidden(),true,"le prototype Parcours guidés ne doit plus apparaître dans l’interface active");
    await page.evaluate(()=>document.getElementById("testEncounter").click());
    await page.waitForFunction(()=>encounterRuntime.screen==="encounter"&&state.encounterSession?.testMode===true);
    await page.locator('[data-encounter-action="begin"]').click();
    await page.locator("[data-encounter-choice]").first().click();
    await page.waitForFunction(()=>!!document.querySelector('[data-encounter-action="continue"]'));
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>encounterRuntime.screen==="closed"&&!document.body.classList.contains("encounter-open"));
    await page.evaluate(()=>document.getElementById("openCodex").click());
    await page.waitForFunction(()=>encounterRuntime.screen==="codex"&&document.querySelectorAll("[data-codex-entry]").length===LOCAL_ENCOUNTERS.length);
    await page.locator("[data-codex-entry]").first().click();
    await page.locator("#encounterClose").click();
    await page.waitForFunction(()=>encounterRuntime.screen==="closed");
    const tour=await page.evaluate(async()=>{
      document.getElementById("guidedTourStart").click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const started={id:state.guidedTourId,step:state.guidedTourStep,active:state.guidedTourActive,title:guidedTourCurrent()?.title||""};
      document.getElementById("guidedTourNext").click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const nextStep=state.guidedTourStep;
      document.getElementById("guidedTourRecenter").click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      document.getElementById("guidedTourStop").click();
      const checks=runAtlasSelfCheck();
      const functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      return {
        started,nextStep,stopped:{active:state.guidedTourActive,step:state.guidedTourStep,tourClass:document.body.classList.contains("tour-active")},
        runtime:{...experienceControllerRuntime},badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)
      };
    });
    assert.equal(tour.started.active,true);assert.equal(tour.started.step,0);assert.ok(tour.started.id&&tour.started.title);
    assert.equal(tour.nextStep,1);
    assert.deepEqual(tour.stopped,{active:false,step:0,tourClass:false});
    assert.equal(tour.runtime.ready,true);assert.equal(tour.runtime.bound,true);
    assert.equal(tour.runtime.encounterStarts,1);assert.equal(tour.runtime.codexOpens,1);assert.equal(tour.runtime.encounterActions,3);assert.equal(tour.runtime.encounterCloses,2);
    assert.equal(tour.runtime.tourStarts,1);assert.equal(tour.runtime.tourMoves,2);assert.equal(tour.runtime.tourStops,1);
    assert.deepEqual(tour.badChecks,[],`diagnostic en échec après les expériences : ${tour.badChecks.join(", ")}`);
  });

  await withPage("contrôleur de vue et préférences", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.evaluate(()=>document.getElementById("renderModeAscii").click());
    await page.waitForFunction(()=>document.body.dataset.effectiveRender==="ascii");
    const result=await page.evaluate(async()=>{
      const change=(id,checked)=>{const control=document.getElementById(id);control.checked=checked;control.dispatchEvent(new Event("change",{bubbles:true}))};
      change("layerHydrology",false);change("ambientMotion",false);
      const scenario=document.getElementById("scenario");scenario.value="extensive";scenario.dispatchEvent(new Event("change",{bubbles:true}));
      const cavity={id:"TEST-VIEW-CAVITY",name:"Cavité de contrôle",type:"cavité naturelle",lat:CONFIG.house.lat+.00042,lon:CONFIG.house.lon-.00031,commune:"Test"};
      state.cavities=[...state.cavities,cavity];markSpatialIndexesDirty();populateCavitySelect();
      const cavitySelect=document.getElementById("cavitySelect");cavitySelect.value=cavity.id;cavitySelect.dispatchEvent(new Event("change",{bubbles:true}));
      const cavityReadout=document.getElementById("readoutBody").textContent;
      selectGridCell(Math.floor(CONFIG.gridW*.58),Math.floor(CONFIG.gridH*.46),{note:"test vue"});
      const selectedCoord={...state.selectedCell.coord};document.getElementById("recenterSelected").click();
      document.getElementById("debugToggle").click();
      await new Promise(resolve=>requestAnimationFrame(resolve));
      return {selectedCoord,cavity,cavityReadout,afterControls:{mode:state.renderMode,hydrology:state.layerHydrology,ambient:state.ambientMotion,scenario:state.scenario,selectedCavity:state.selectedCavity,center:{...state.center},debug:debugState.enabled},storedMotion:localStorage.getItem(AMBIENT_PREF_KEY)};
    });
    await page.keyboard.press("Control+Shift+D");
    await page.waitForFunction(()=>debugState.enabled===true);
    await page.waitForFunction(()=>{
      const panel=document.getElementById("debugPanel"),cluster=panel?.closest(".sidebar-cluster");
      return panel&&!panel.classList.contains("collapsed")&&cluster&&!cluster.classList.contains("collapsed")&&getComputedStyle(panel).display!=="none";
    });
    await page.evaluate(()=>document.getElementById("runSelfCheck").click());
    const diagnostic=await page.evaluate(()=>{
      const checks=runAtlasSelfCheck(),functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      const panel=document.getElementById("debugPanel"),cluster=panel.closest(".sidebar-cluster");
      return {runtime:{...viewControllerRuntime},debug:debugState.enabled,revealed:!panel.classList.contains("collapsed")&&!cluster.classList.contains("collapsed")&&document.activeElement===panel.querySelector(":scope > h2"),motionDisabled:document.body.classList.contains("motion-disabled"),badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)};
    });
    assert.equal(result.afterControls.mode,"ascii");assert.equal(result.afterControls.hydrology,false);assert.equal(result.afterControls.ambient,false);assert.equal(result.afterControls.scenario,"extensive");
    assert.equal(result.afterControls.selectedCavity,"TEST-VIEW-CAVITY");assert.deepEqual(result.afterControls.center,result.selectedCoord);assert.equal(result.afterControls.debug,false);assert.equal(result.storedMotion,"off");
    assert.equal(diagnostic.debug,true);assert.equal(diagnostic.revealed,true);assert.equal(diagnostic.motionDisabled,true);assert.match(result.cavityReadout,/Cavité de contrôle/);
    assert.equal(diagnostic.runtime.ready,true);assert.equal(diagnostic.runtime.bound,true);
    assert.equal(diagnostic.runtime.modeChanges,1);assert.equal(diagnostic.runtime.scenarioChanges,1);assert.equal(diagnostic.runtime.layerChanges,2);assert.equal(diagnostic.runtime.cavitySelections,1);assert.equal(diagnostic.runtime.recenters,1);assert.equal(diagnostic.runtime.debugActions,3);
    assert.deepEqual(diagnostic.badChecks,[],`diagnostic en échec après les réglages de vue : ${diagnostic.badChecks.join(", ")}`);
  });

  await withPage("cycle de vie et retours audio", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      const before={...lifecycleControllerRuntime},calls=[];
      const originalAudio={unlock:retroAudio.unlock,silence:retroAudio.silence,suspend:retroAudio.suspend,play:retroAudio.play,toggle:retroAudio.toggle};
      retroAudio.unlock=()=>calls.push("unlock");retroAudio.silence=()=>calls.push("silence");retroAudio.suspend=()=>calls.push("suspend");retroAudio.play=name=>calls.push(name);retroAudio.toggle=()=>calls.push("toggle-audio");
      document.dispatchEvent(new Event("pointerdown",{bubbles:true}));
      document.dispatchEvent(new Event("touchstart",{bubbles:true}));
      document.dispatchEvent(new KeyboardEvent("keydown",{key:"a",bubbles:true}));
      bindLifecycleController();
      document.dispatchEvent(new Event("pointerdown",{bubbles:true}));
      Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"));
      delete document.hidden;
      window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"));
      reducedMotionQuery?.dispatchEvent?.(new Event("change"));
      const details=document.createElement("details");document.body.append(details);details.dispatchEvent(new Event("toggle",{bubbles:true}));
      const button=document.createElement("button");button.id="lifecycleTestButton";document.body.append(button);button.click();
      const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.id="lifecycleTestCheckbox";document.body.append(checkbox);checkbox.dispatchEvent(new Event("change",{bubbles:true}));
      document.getElementById("audioToggle").click();
      details.remove();button.remove();checkbox.remove();
      Object.assign(retroAudio,originalAudio);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const checks=runAtlasSelfCheck(),functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      return {before,after:{...lifecycleControllerRuntime},calls,badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)};
    });
    assert.equal(result.after.ready,true);assert.equal(result.after.bound,true);assert.equal(result.after.statusObservers,10);
    assert.equal(result.after.unlockAttempts-result.before.unlockAttempts,4,"le branchement idempotent a doublé les gestes");
    assert.equal(result.after.visibilityChanges-result.before.visibilityChanges,2);
    assert.equal(result.after.focusChanges-result.before.focusChanges,2);
    assert.equal(result.after.motionPreferenceChanges-result.before.motionPreferenceChanges,1);
    assert.equal(result.after.audioActions-result.before.audioActions,4);
    assert.deepEqual(result.calls,["unlock","unlock","unlock","unlock","suspend","panelClose","button","toggle","toggle-audio"]);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après le cycle de vie : ${result.badChecks.join(", ")}`);
  });

  await withPage("orchestrateur et démarrage unique", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      const before={...applicationControllerRuntime},calls=[];
      const originalFocus=focusNormalizedPoi,originalRelation=framePoiRelation,originalExport=exportTxt;
      focusNormalizedPoi=uid=>calls.push(`focus:${uid}`);
      framePoiRelation=(from,to,label)=>calls.push(`relation:${from}:${to}:${label}`);
      exportTxt=()=>calls.push("export");
      bindApplicationController();
      await Promise.all([startAtlasApplication(),startAtlasApplication()]);
      document.getElementById("readoutSheetHandle").click();
      const focusButton=document.createElement("button");focusButton.dataset.poiFocus="POI-TEST";focusButton.innerHTML="<span>ouvrir</span>";document.body.append(focusButton);focusButton.querySelector("span").click();
      const relationButton=document.createElement("button");relationButton.dataset.relationFrom="A";relationButton.dataset.relationTo="B";relationButton.dataset.relationLabel="test";relationButton.innerHTML="<span>cadrer</span>";document.body.append(relationButton);relationButton.querySelector("span").click();
      document.getElementById("exportBtn").click();
      focusButton.remove();relationButton.remove();
      focusNormalizedPoi=originalFocus;framePoiRelation=originalRelation;exportTxt=originalExport;
      const checks=runAtlasSelfCheck(),functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      return {before,after:{...applicationControllerRuntime},calls,badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)};
    });
    assert.equal(result.after.ready,true);assert.equal(result.after.bound,true);assert.equal(result.after.bootCompleted,true);assert.equal(result.after.bootMode,"hors-ligne");assert.equal(result.after.bootStarts,1);assert.equal(result.after.lastError,"");assert.ok(result.after.bootMs>=0);
    assert.equal(result.after.documentActions-result.before.documentActions,4,"l’orchestrateur a doublé un branchement documentaire");
    assert.deepEqual(result.calls,["focus:POI-TEST","relation:A:B:test","export"]);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après l’orchestration : ${result.badChecks.join(", ")}`);
  });

  await withPage("stabilité d’une session longue", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      const before={...sessionHealthRuntime},suspends=[];
      const originalSuspend=retroAudio.suspend;retroAudio.suspend=()=>suspends.push("audio");
      for(let index=0;index<SESSION_CACHE_LIMITS.canvasStyles+24;index++)canvasRuntime.styleCache.set(`test-style-${index}`,index);
      for(let index=0;index<SESSION_CACHE_LIMITS.hypotheses+24;index++)hypothesisModelCache.set(`test-hypothesis-${index}`,index);
      for(let index=0;index<SESSION_CACHE_LIMITS.relations+24;index++)relationRuntime.cache.set(`test-relation-${index}`,index);
      for(let index=0;index<SESSION_CACHE_LIMITS.osmStorage+7;index++)localStorage.setItem(`atlas-karst-osm-v010d-test-${index}`,JSON.stringify({savedAt:index+1,value:{index}}));
      const maintenance=runSessionMaintenance("test saturation");
      const controller=new AbortController();state.osmAbortController=controller;
      window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));
      const aborted=controller.signal.aborted;
      window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      retroAudio.suspend=originalSuspend;
      const osmKeys=[];for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key?.startsWith("atlas-karst-osm-v010d-"))osmKeys.push(key)}
      const checks=runAtlasSelfCheck(),functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      return {before,after:{...sessionHealthRuntime},maintenance,sizes:{styles:canvasRuntime.styleCache.size,hypotheses:hypothesisModelCache.size,relations:relationRuntime.cache.size,osm:osmKeys.length},aborted,suspends,badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)};
    });
    assert.ok(result.maintenance.cacheEvictions>=72);assert.equal(result.maintenance.storageEvictions,7);
    assert.ok(result.sizes.styles<=192);assert.ok(result.sizes.hypotheses<=480);assert.ok(result.sizes.relations<=240);assert.ok(result.sizes.osm<=18);
    assert.equal(result.aborted,true);assert.deepEqual(result.suspends,["audio"]);
    assert.equal(result.after.suspensions-result.before.suspensions,1);assert.equal(result.after.resumes-result.before.resumes,1);assert.equal(result.after.transientClears-result.before.transientClears,1);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après entretien prolongé : ${result.badChecks.join(", ")}`);
  });

  await withPage("profil territorial généralisable", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(()=>{
      const custom=normalizeTerritoryProfile({
        id:"territoire-test-paris",label:"Territoire de test",
        center:{lat:48.8566,lon:2.3522},sizeKm:{width:16,height:16},
        administration:{countryCode:"FR",departmentCode:"75",departmentName:"Paris",communeInsee:"75056"},
        embeddedData:{bss:false,cavityInventory:false,fallbackSurface:false,offlineDemo:false},
        provenance:"test navigateur"
      });
      const snapshot=buildAtlasSnapshot();
      snapshot.territory=custom;snapshot.house={...custom.center};snapshot.view.center={...custom.center};
      snapshot.data={...snapshot.data,bss:[],officialCavities:[],observations:[],loreItems:[]};
      applyAtlasSnapshot(snapshot,{source:"territoire synthétique",renderNow:true});
      const extent=largestExtent();
      const width=distanceMeters({lat:custom.center.lat,lon:extent.west},{lat:custom.center.lat,lon:extent.east});
      const height=distanceMeters({lat:extent.south,lon:custom.center.lon},{lat:extent.north,lon:custom.center.lon});
      const rebuilt=buildAtlasSnapshot();
      const cartofrichesFilter=cartofrichesDepartmentFilter(custom);
      const cartofrichesPoint=normalizeCartofrichesRow({site_id:"CF-TEST",site_nom:"Friche test",comm_insee:"75056",geompoint:"POINT (2.3522 48.8566)"});
      return {
        id:CONFIG.territory.id,label:CONFIG.territory.label,center:{...CONFIG.dataCenter},
        size:{width:CONFIG.dataWidthKm,height:CONFIG.dataHeightKm},width,height,
        departmentValues:territoryDepartmentValues(CONFIG.territory,true),communeInsee:CONFIG.communeInsee,
        embedded:{...CONFIG.territory.embeddedData},bss:state.bss.length,cavityInventory:state.cavities.length,
        snapshotTerritory:rebuilt.territory,cartofrichesFilter,
        cartofrichesPoint:cartofrichesPoint?{id:cartofrichesPoint.id,lat:cartofrichesPoint.lat,lon:cartofrichesPoint.lon,source:cartofrichesPoint.coordinateSource}:null
      };
    });
    assert.equal(result.id,"territoire-test-paris");
    assert.equal(result.label,"Territoire de test");
    assert.deepEqual(result.center,{lat:48.8566,lon:2.3522});
    assert.deepEqual(result.size,{width:16,height:16});
    assert.ok(Math.abs(result.width-16000)<40,`largeur territoriale inattendue : ${result.width} m`);
    assert.ok(Math.abs(result.height-16000)<40,`hauteur territoriale inattendue : ${result.height} m`);
    assert.deepEqual(result.departmentValues,["75","075","Paris"]);
    assert.equal(result.communeInsee,"75056");
    assert.deepEqual(result.embedded,{bss:false,cavityInventory:false,fallbackSurface:false,offlineDemo:false});
    assert.equal(result.bss,0,"les BSS historiques ont fui dans le territoire synthétique");
    assert.equal(result.cavityInventory,0,"l’inventaire historique a fui dans le territoire synthétique");
    assert.equal(result.snapshotTerritory.id,"territoire-test-paris");
    assert.deepEqual(result.cartofrichesFilter,{comm_insee__greater:"75000",comm_insee__less:"76000"});
    assert.deepEqual(result.cartofrichesPoint,{id:"CF-TEST",lat:48.8566,lon:2.3522,source:"geompoint WKT · longitude/latitude corrigé"});
  });

  await withPage("création et cloisonnement d’un territoire", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      state.observations=[{id:"OBS-LEGACY",mode:"point",glyph:"◎",name:"Trace historique",lat:CONFIG.house.lat,lon:CONFIG.house.lon,confidence:"high"}];
      saveLocalCavities();
      const legacyObservationKey=territoryStorageKey(OBSERVATION_KEY,CONFIG.territory);
      const profile=enrichTerritoryAdministration(createUserTerritoryProfile({label:"Territoire parisien",center:{lat:48.85837,lon:2.294481}}),{
        citycode:"75107",city:"Paris",postcode:"75007",context:"75, Paris, Île-de-France"
      });
      await activateTerritory(profile,{sync:false,persist:false});
      const customObservationKey=territoryStorageKey(OBSERVATION_KEY,CONFIG.territory);
      const customState={
        id:CONFIG.territory.id,label:CONFIG.territory.label,center:{...state.center},house:{...CONFIG.house},size:{width:CONFIG.dataWidthKm,height:CONFIG.dataHeightKm},
        administration:{...CONFIG.territory.administration},embedded:{...CONFIG.territory.embeddedData},observations:state.observations.length,bss:state.bss.length,
        identity:document.getElementById("territorySummary").textContent,controls:{name:els.territoryName.value,lat:Number(els.territoryLat.value),lon:Number(els.territoryLon.value)},
        runtime:{...territoryControllerRuntime},legacyObservationKey,customObservationKey
      };
      state.observations=[{id:"OBS-CUSTOM",mode:"point",glyph:"◎",name:"Trace parisienne",lat:CONFIG.house.lat,lon:CONFIG.house.lon,confidence:"high"}];
      saveLocalCavities();
      await activateTerritory(LEGACY_TERRITORY_PROFILE,{sync:false,persist:false});
      return {...customState,restoredLegacy:state.observations.map(item=>item.id),customStored:JSON.parse(localStorage.getItem(customObservationKey)||"[]").map(item=>item.id)};
    });
    assert.equal(result.label,"Territoire parisien");
    assert.deepEqual(result.center,{lat:48.85837,lon:2.294481});assert.deepEqual(result.house,result.center);
    assert.deepEqual(result.size,{width:16,height:16});assert.equal(result.administration.departmentCode,"75");assert.equal(result.administration.communeInsee,"75107");
    assert.deepEqual(result.embedded,{bss:false,cavityInventory:false,fallbackSurface:false,offlineDemo:false});
    assert.equal(result.observations,0,"les observations historiques ont fui dans le nouveau territoire");assert.equal(result.bss,0,"les BSS historiques ont fui dans le nouveau territoire");
    assert.match(result.identity,/Territoire parisien · 16 × 16 km/);assert.equal(result.controls.name,"Territoire parisien");assert.equal(result.controls.lat,48.85837);assert.equal(result.controls.lon,2.294481);
    assert.notEqual(result.legacyObservationKey,result.customObservationKey);assert.deepEqual(result.restoredLegacy,["OBS-LEGACY"]);assert.deepEqual(result.customStored,["OBS-CUSTOM"]);
    assert.equal(result.runtime.bound,true);assert.equal(result.runtime.lastError,"");assert.ok(result.runtime.created>=1);
  });

  await withPage("bibliothèque multi-territoires étanche", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      await clearTerritoryLibraryFromDb();
      const legacySnapshot=buildAtlasSnapshot();
      await writeSnapshotDbValues([[SNAPSHOT_DB_KEY,legacySnapshot]]);
      const migrated=await loadSnapshotFromDb(),afterMigration=await listTerritoriesFromDb();
      const migration={id:migrated?.territory?.id,entries:afterMigration.length,count:snapshotRuntime.migrations,oldKey:await readSnapshotDbValue(SNAPSHOT_DB_KEY)};
      await clearTerritoryLibraryFromDb();

      const paris=createUserTerritoryProfile({label:"Carnet Paris",center:{lat:48.8566,lon:2.3522}});
      await activateTerritory(paris,{sync:false,persist:true,saveCurrent:false});
      state.observations=[{id:"OBS-PARIS",mode:"point",glyph:"◎",name:"Trace parisienne",lat:48.8566,lon:2.3522,confidence:"high"}];
      state.encounterCollection={paris:{status:"catalogued"}};
      await persistActiveTerritory();

      const lyon=createUserTerritoryProfile({label:"Carnet Lyon",center:{lat:45.764,lon:4.8357}});
      await activateTerritory(lyon,{sync:false,persist:true,saveCurrent:true});
      state.observations=[{id:"OBS-LYON",mode:"point",glyph:"◎",name:"Trace lyonnaise",lat:45.764,lon:4.8357,confidence:"medium"}];
      state.encounterCollection={lyon:{status:"seen"}};
      await persistActiveTerritory();

      await openStoredTerritory(paris.id);
      const parisState={id:CONFIG.territory.id,observations:state.observations.map(item=>item.id),encounters:Object.keys(state.encounterCollection),network:state.allowNetwork};
      await renameStoredTerritory(paris.id,"Carnet Paris renommé");
      const copy=await duplicateStoredTerritory(paris.id);
      const beforeDelete=await listTerritoriesFromDb();
      await deleteStoredTerritory(copy.id,{confirmUser:false});
      const afterDelete=await listTerritoriesFromDb();

      await openStoredTerritory(lyon.id);
      const lyonState={id:CONFIG.territory.id,observations:state.observations.map(item=>item.id),encounters:Object.keys(state.encounterCollection),network:state.allowNetwork};
      const finalEntries=await listTerritoriesFromDb();
      return {
        migration,parisState,lyonState,copy,
        beforeDelete:beforeDelete.map(item=>({id:item.id,label:item.label})),afterDelete:afterDelete.map(item=>({id:item.id,label:item.label})),
        finalEntries:finalEntries.map(item=>({id:item.id,label:item.label})),selectOptions:[...els.territoryLibrarySelect.options].map(option=>option.value),
        runtime:{...territoryControllerRuntime},snapshotRuntime:{migrations:snapshotRuntime.migrations,lastError:snapshotRuntime.lastError}
      };
    });
    assert.equal(result.migration.id,"angouleme-karst");assert.equal(result.migration.entries,1);assert.ok(result.migration.count>=1);assert.equal(result.migration.oldKey,null);
    assert.match(result.parisState.id,/^carnet-paris-/);assert.deepEqual(result.parisState.observations,["OBS-PARIS"]);assert.deepEqual(result.parisState.encounters,["paris"]);assert.equal(result.parisState.network,false);
    assert.match(result.lyonState.id,/^carnet-lyon-/);assert.deepEqual(result.lyonState.observations,["OBS-LYON"]);assert.deepEqual(result.lyonState.encounters,["lyon"]);assert.equal(result.lyonState.network,false);
    assert.equal(result.beforeDelete.length,3);assert.equal(result.afterDelete.length,2);assert.ok(result.beforeDelete.some(item=>item.id===result.copy.id));assert.ok(!result.afterDelete.some(item=>item.id===result.copy.id));
    assert.deepEqual(new Set(result.finalEntries.map(item=>item.label)),new Set(["Carnet Paris renommé","Carnet Lyon"]));
    assert.deepEqual(new Set(result.selectOptions),new Set(result.finalEntries.map(item=>item.id)));
    assert.equal(result.runtime.managerReady,true);assert.ok(result.runtime.saves>=4);assert.ok(result.runtime.loads>=2);assert.ok(result.runtime.renames>=1);assert.ok(result.runtime.duplicates>=1);assert.ok(result.runtime.deletes>=1);
    assert.equal(result.runtime.lastError,"");assert.equal(result.snapshotRuntime.lastError,"");
  });

  await withPage("instantané local restauré", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result = await page.evaluate(async () => {
      await deleteSnapshotFromDb();
      state.zoomIndex=4;state.depthIndex=2;state.renderMode="ascii";state.layerHydrology=false;
      state.center=clampCenter({lat:CONFIG.house.lat+.00021,lon:CONFIG.house.lon-.00017},CONFIG.zooms[state.zoomIndex]);
      state.observations=[...state.observations,{id:"OBS-ROUNDTRIP",mode:"point",glyph:"◎",name:"Test round-trip",lat:state.center.lat,lon:state.center.lon,confidence:"high",source:"test"}];
      const expected={zoomIndex:state.zoomIndex,depthIndex:state.depthIndex,renderMode:state.renderMode,layerHydrology:state.layerHydrology,center:{...state.center},observations:state.observations.length,territory:territorySnapshot(CONFIG.territory)};
      const snapshot=buildAtlasSnapshot();
      await saveSnapshotToDb(snapshot);
      state.zoomIndex=0;state.depthIndex=0;state.renderMode="symbolic";state.layerHydrology=true;state.center={...CONFIG.house};state.observations=[];
      const loaded=await loadSnapshotFromDb();
      applyAtlasSnapshot(loaded,{source:"test IndexedDB",renderNow:true});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      let futureError="";
      try{validateAtlasSnapshot({...snapshot,schema:SNAPSHOT_SCHEMA_VERSION+1})}catch(error){futureError=String(error.message||error)}
      const legacy={...snapshot};delete legacy.schema;
      const legacyAccepted=validateAtlasSnapshot(legacy)===legacy&&snapshotRuntime.lastSchema===1;
      const schema2={...snapshot,schema:2};delete schema2.territory;
      const schema2Accepted=validateAtlasSnapshot(schema2)===schema2&&snapshotRuntime.lastSchema===2;
      validateAtlasSnapshot(loaded);
      const carnet=await buildAtlasCarnet(loaded),portableSnapshot=await atlasCarnetToSnapshot(carnet),tampered=JSON.parse(JSON.stringify(carnet));
      tampered.content.observations.push({id:"ALTERATION",name:"Ne doit pas passer"});
      let integrityError="";try{await validateAtlasCarnet(tampered)}catch(error){integrityError=String(error.message||error)}
      carnetRuntime.lastError="";snapshotRuntime.lastError="";
      const importedCopy=importedTerritoryCopy(portableSnapshot,[{id:portableSnapshot.territory.id}],"controle.atlas");
      const checks=runAtlasSelfCheck();
      const functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      await deleteSnapshotFromDb();
      return {
        expected,
        restored:{zoomIndex:state.zoomIndex,depthIndex:state.depthIndex,renderMode:state.renderMode,layerHydrology:state.layerHydrology,center:{...state.center},observations:state.observations.length,territory:territorySnapshot(CONFIG.territory)},
        loadedSchema:loaded.schema,futureError,legacyAccepted,schema2Accepted,badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name),
        carnet:{format:carnet.format,schema:carnet.schema,algorithm:carnet.integrity.algorithm,bytes:carnet.integrity.bytes,cachePolicy:carnet.cachePolicy,observations:carnet.content.observations.length,portableObservations:portableSnapshot.data.observations.length,portableOsm:portableSnapshot.data.osm.length,portableCadastre:portableSnapshot.data.cadastreBuildings.length+portableSnapshot.data.cadastreParcels.length,portableElevation:portableSnapshot.data.elevation,integrityError,copyId:importedCopy.snapshot.territory.id,originalId:portableSnapshot.territory.id,copied:importedCopy.copied},
        runtime:{bound:snapshotRuntime.bound,applied:snapshotRuntime.applied,dbSaves:snapshotRuntime.dbSaves,dbLoads:snapshotRuntime.dbLoads,dbDeletes:snapshotRuntime.dbDeletes,lastError:snapshotRuntime.lastError}
      };
    });
    assert.deepEqual(result.restored,result.expected,"l’état restauré diffère de l’instantané enregistré");
    assert.equal(result.loadedSchema,3);
    assert.match(result.futureError,/plus récent/);
    assert.equal(result.legacyAccepted,true,"un instantané historique sans schéma n’est plus accepté");
    assert.equal(result.schema2Accepted,true,"un instantané du schéma 2 n’est plus accepté");
    assert.equal(result.carnet.format,"atlas-carnet");assert.equal(result.carnet.schema,1);assert.match(result.carnet.algorithm,/^(SHA-256|FNV-1A-32)$/);assert.ok(result.carnet.bytes>0);
    assert.equal(result.carnet.cachePolicy.embedded,false);assert.deepEqual(result.carnet.cachePolicy.excluded,["osm","cadastreBuildings","cadastreParcels","elevation","coverage"]);
    assert.equal(result.carnet.portableObservations,result.carnet.observations);assert.equal(result.carnet.portableOsm,0);assert.equal(result.carnet.portableCadastre,0);assert.equal(result.carnet.portableElevation,null);
    assert.match(result.carnet.integrityError,/modifié ou endommagé/);assert.equal(result.carnet.copied,true);assert.notEqual(result.carnet.copyId,result.carnet.originalId);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec après restauration : ${result.badChecks.join(", ")}`);
    assert.equal(result.runtime.bound,true);
    assert.ok(result.runtime.applied>=1&&result.runtime.dbSaves>=1&&result.runtime.dbLoads>=1&&result.runtime.dbDeletes>=2);
    assert.equal(result.runtime.lastError,"");
    await page.evaluate(()=>document.getElementById("exportSnapshotJson").click());
    await page.waitForFunction(()=>snapshotRuntime.exports>=1&&!![...document.querySelectorAll("a[download]")].find(link=>link.download.endsWith(".atlas")));
    const exportedJson=await page.evaluate(async()=>{
      const link=[...document.querySelectorAll("a[download]")].find(item=>item.download.endsWith(".atlas"));
      const parsed=JSON.parse(await (await fetch(link.href)).text());
      return {filename:link.download,format:parsed.format,schema:parsed.schema,territory:parsed.territory,integrity:parsed.integrity,cachePolicy:parsed.cachePolicy};
    });
    assert.match(exportedJson.filename,/\.atlas$/);
    assert.equal(exportedJson.format,"atlas-carnet");
    assert.equal(exportedJson.schema,1);
    assert.equal(exportedJson.territory.id,"angouleme-karst");
    assert.deepEqual(exportedJson.territory.sizeKm,{width:16,height:16});
    assert.match(exportedJson.integrity.digest,/^[a-f0-9]{8,64}$/);assert.equal(exportedJson.cachePolicy.embedded,false);
    await page.evaluate(()=>document.getElementById("exportStandaloneHtml").click());
    await page.waitForFunction(()=>snapshotRuntime.standaloneExports>=1&&!![...document.querySelectorAll("a[download]")].find(link=>link.download.endsWith(".html")));
    const exportedHtml=await page.evaluate(async()=>{
      const link=[...document.querySelectorAll("a[download]")].find(item=>item.download.endsWith(".html"));
      const text=await (await fetch(link.href)).text();
      return {filename:link.download,hasSnapshot:text.includes('"format":"atlas-karst-snapshot"'),hasTitle:text.includes(`Atlas Karst ASCII ${APP_VERSION} · instantané autonome`)};
    });
    assert.match(exportedHtml.filename,/\.html$/);
    assert.equal(exportedHtml.hasSnapshot,true,"l’export HTML ne contient pas l’instantané");
    assert.equal(exportedHtml.hasTitle,true,"l’export HTML n’est pas identifié comme instantané autonome");
  });

  await withPage("registre central des sources", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(()=>{
      const ids=SOURCE_REGISTRY.map(source=>source.id);
      const references=sourceReferencesForSnapshot({data:{
        osm:[{id:1}],osmMeta:{loadedAt:"2026-08-10T10:00:00Z"},address:{label:"test"},
        officialCavities:[{id:"c1"}],cartofriches:[{id:"f1"}],bss:[{id:"b1"}],hydrometry:[{id:"h1",syncedAt:"2026-08-10"}],biodiversity:[{id:"bio1",syncedAt:"2026-08-10"}],elevation:{min:1},
        heritageItems:[{id:"m1",category:"monument",syncedAt:"2026-08-09"},{id:"w1",category:"wikipedia",syncedAt:"2026-08-08"}]
      }});
      setSourceStatus("heritage","ok","2 notices");
      const catalog=[...document.querySelectorAll("#sourceCatalogList .source-catalog-entry")].map(entry=>({id:entry.dataset.sourceId,status:entry.querySelector("[data-source-catalog-status]")?.textContent}));
      const attribution=document.getElementById("mainAttribution").textContent;
      const checks=runAtlasSelfCheck(),functionalChecks=checks.filter(check=>!/^(Premier rendu|Rendu stabilisé) sous \d+ ms$/.test(check.name));
      return {schema:SOURCE_REGISTRY_SCHEMA_VERSION,ids,catalog,references,attribution,runtime:{...sourceRegistryRuntime},badChecks:functionalChecks.filter(check=>check.ok===false).map(check=>check.name)};
    });
    assert.equal(result.schema,1);assert.equal(result.ids.length,11);assert.equal(new Set(result.ids).size,11);assert.equal(result.catalog.length,11);
    assert.equal(result.catalog.find(source=>source.id==="culture")?.status,"2 notices");assert.equal(result.catalog.find(source=>source.id==="wikipedia")?.status,"2 notices");
    assert.equal(result.references.find(source=>source.id==="culture")?.count,1);assert.equal(result.references.find(source=>source.id==="wikipedia")?.count,1);
    assert.equal(result.references.find(source=>source.id==="hydrometry")?.count,1);assert.equal(result.references.find(source=>source.id==="hydrometry")?.disposition,"embedded");
    assert.equal(result.references.find(source=>source.id==="biodiversity")?.count,1);assert.equal(result.references.find(source=>source.id==="biodiversity")?.disposition,"embedded");
    assert.equal(result.references.find(source=>source.id==="openstreetmap")?.disposition,"consulted");assert.equal(result.references.find(source=>source.id==="adresse")?.disposition,"embedded");
    assert.match(result.attribution,/OpenStreetMap \(ODbL\)/);assert.match(result.attribution,/Wikipédia francophone \(CC BY-SA\)/);assert.match(result.attribution,/restent privés/);
    assert.equal(result.runtime.lastError,"");assert.ok(result.runtime.catalogRenders>=1);assert.ok(result.runtime.attributionRenders>=1);assert.ok(result.runtime.statusUpdates>=1);
    assert.deepEqual(result.badChecks,[],`diagnostic en échec avec le registre : ${result.badChecks.join(", ")}`);
  });

  await withPage("hydrométrie bornée et portable", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      const originalFetch=window.fetch;
      window.fetch=async url=>{
        const value=String(url);
        if(value.includes("referentiel/stations"))return new Response(JSON.stringify({api_version:"2.0.1",data:[{code_station:"R-TEST",libelle_station:"Station témoin",libelle_site:"La rivière témoin",libelle_commune:"Angoulême",latitude_station:CONFIG.house.lat,longitude_station:CONFIG.house.lon,type_station:"STANDARD"}]}),{status:200,headers:{"Content-Type":"application/json"}});
        if(value.includes("observations_tr"))return new Response(JSON.stringify({data:[{code_station:"R-TEST",grandeur_hydro:"H",date_obs:"2026-08-10T10:00:00Z",resultat_obs:634},{code_station:"R-TEST",grandeur_hydro:"Q",date_obs:"2026-08-10T10:00:00Z",resultat_obs:3380}]}),{status:200,headers:{"Content-Type":"application/json"}});
        return originalFetch(url);
      };
      state.allowNetwork=true;
      const items=await syncHydrometry();
      window.fetch=originalFetch;
      ensureSpatialIndexes();
      const poi=spatialRuntime.normalizedPois.find(item=>item.sourceType==="hydrometry"),snapshot=buildAtlasSnapshot(),carnet=await buildAtlasCarnet(),primary=primaryDocumentarySection(symbolicPoiFeatureInfo(poi));
      return {count:items?.length||0,height:items?.[0]?.heightM,flow:items?.[0]?.flowM3s,poiCategory:poi?.category,snapshotCount:snapshot.data.hydrometry?.length||0,carnetCount:carnet.sources.extracts.hydrometry?.length||0,primary,status:document.getElementById("hydrometryStatus").textContent,requests:{...hydrometryRuntime}};
    });
    assert.equal(result.count,1);assert.equal(result.height,.634);assert.equal(result.flow,3.38);assert.equal(result.poiCategory,"hydrology");
    assert.equal(result.snapshotCount,1);assert.equal(result.carnetCount,1);assert.match(result.primary,/La rivière témoin/);assert.match(result.primary,/0\.634 m/);assert.match(result.primary,/3\.380 m³\/s/);assert.match(result.status,/1 stations/);assert.ok(result.requests.stationRequests>=1);assert.ok(result.requests.observationRequests>=1);
  });

  await withPage("biodiversité agrégée sans coordonnées brutes", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      const originalFetch=window.fetch,extent=largestExtent(),rawLat=extent.south+(extent.north-extent.south)*.4137,rawLon=extent.west+(extent.east-extent.west)*.5289;
      window.fetch=async url=>{
        const value=String(url),params=new URL(value).searchParams,taxon=params.get("taxonKey"),record=taxon==="1"?{key:101,speciesKey:1001,species:"Animalia testii",vernacularName:"Animal témoin",kingdom:"Animalia",class:"Aves",order:"Passeriformes",family:"Testidae",genus:"Animalia",basisOfRecord:"HUMAN_OBSERVATION",decimalLatitude:rawLat,decimalLongitude:rawLon,eventDate:"2026-05-03",year:2026,coordinateUncertaintyInMeters:24,datasetTitle:"Faune témoin",license:"http://creativecommons.org/licenses/by/4.0/"}:taxon==="6"?{key:102,speciesKey:1002,species:"Planta testii",vernacularName:"Plante témoin",kingdom:"Plantae",class:"Magnoliopsida",family:"Testaceae",basisOfRecord:"PRESERVED_SPECIMEN",decimalLatitude:rawLat+.0001,decimalLongitude:rawLon+.0001,eventDate:"2018-04-01",year:2018,coordinateUncertaintyInMeters:50,datasetTitle:"Flore témoin",license:"http://creativecommons.org/publicdomain/zero/1.0/"}:{key:103,speciesKey:1003,species:"Fungus testii",vernacularName:"Champignon témoin",kingdom:"Fungi",family:"Testaceae",basisOfRecord:"OBSERVATION",decimalLatitude:rawLat+.0002,decimalLongitude:rawLon+.0002,eventDate:"2008-10-10",year:2008,coordinateUncertaintyInMeters:10,datasetTitle:"Fonge témoin",license:"http://creativecommons.org/licenses/by-nc/4.0/"};
        return new Response(JSON.stringify({count:40000,results:[record]}),{status:200,headers:{"Content-Type":"application/json"}});
      };
      state.allowNetwork=true;const cells=await syncBiodiversity();window.fetch=originalFetch;ensureSpatialIndexes();
      const serialized=JSON.stringify(cells),pois=spatialRuntime.normalizedPois.filter(item=>item.sourceType==="biodiversity"),features=pois.map(symbolicPoiFeatureInfo),snapshot=buildAtlasSnapshot(),carnet=await buildAtlasCarnet(),composition=composeMapGrid(largestExtent(),0),asciiClasses=new Set(composition.grid.grid.flat().map(cell=>String(cell.cls||"")).filter(cls=>cls.includes("c-biodiversity"))),symbolicCategories=new Set(symbolicVisiblePois(composition.grid).filter(item=>item.sourceType==="biodiversity").map(item=>item.category));
      state.biodiversityEnabled.fungi=false;const filtered=biodiversityVisibleSpecies(cells[0]).length;state.biodiversityEnabled.fungi=true;
      const crowded=[];for(let i=0;i<40;i++)crowded.push(biodiversityRecord({key:`p${i}`,speciesKey:`p${i}`,species:`Plante ${i}`,decimalLatitude:rawLat,decimalLongitude:rawLon,eventDate:`2026-07-${String(i%28+1).padStart(2,"0")}`},BIODIVERSITY_GROUPS[1],extent));for(let i=0;i<10;i++)crowded.push(biodiversityRecord({key:`a${i}`,speciesKey:`a${i}`,species:`Animal ${i}`,class:i<6?"Insecta":i<8?"Aves":"Mammalia",decimalLatitude:rawLat,decimalLongitude:rawLon,eventDate:i<6?"2026-01-01":"2010-01-01"},BIODIVERSITY_GROUPS[0],extent));for(let i=0;i<5;i++)crowded.push(biodiversityRecord({key:`f${i}`,speciesKey:`f${i}`,species:`Champignon ${i}`,decimalLatitude:rawLat,decimalLongitude:rawLon,eventDate:"2005-01-01"},BIODIVERSITY_GROUPS[2],extent));const balancedCell=aggregateBiodiversityRecords(crowded,"2026-08-10")[0],balanced=balancedCell.groupCounts,animalClasses=[...new Set(balancedCell.species.filter(item=>item.group==="animals").map(item=>item.taxonClass))];
      return {cells:cells.length,species:biodiversityUniqueSpecies(cells),rawFields:serialized.includes("decimalLatitude")||serialized.includes("decimalLongitude"),rawCoordinate:serialized.includes(String(rawLat))||serialized.includes(String(rawLon)),precision:Math.min(...features.flatMap(feature=>feature.species).map(item=>item.uncertaintyM)),featureCounts:features.map(feature=>feature.speciesCount),filtered,snapshotCount:snapshot.data.biodiversity.length,carnetCount:carnet.sources.extracts.biodiversity.length,poiCategories:pois.map(poi=>poi.category),asciiClasses:[...asciiClasses],symbolicCategories:[...symbolicCategories],primary:features.map(primaryDocumentarySection).join(" "),balanced,animalClasses,summary:els.biodiversitySummary.textContent,status:els.biodiversityStatus.textContent,runtime:{...biodiversityRuntime}};
    });
    assert.equal(result.cells,1);assert.equal(result.species,3);assert.equal(result.rawFields,false);assert.equal(result.rawCoordinate,false);assert.ok(result.precision>=1000);
    assert.deepEqual(result.featureCounts,[1,1,1]);assert.equal(result.filtered,2);assert.equal(result.snapshotCount,1);assert.equal(result.carnetCount,1);assert.deepEqual(result.poiCategories.sort(),["biodiversity-animals","biodiversity-fungi","biodiversity-plants"]);assert.deepEqual(result.asciiClasses.sort(),["c-biodiversity-animals","c-biodiversity-fungi","c-biodiversity-plants"]);assert.deepEqual(result.symbolicCategories.sort(),["biodiversity-animals","biodiversity-fungi","biodiversity-plants"]);assert.match(result.primary,/Animal témoin/);assert.match(result.primary,/oiseau/);assert.match(result.primary,/famille Testidae/);assert.match(result.primary,/observation humaine/);assert.match(result.primary,/Plante témoin/);assert.match(result.primary,/Champignon témoin/);assert.equal(result.balanced.animals,10);assert.equal(result.balanced.fungi,5);assert.equal(result.balanced.plants,17);assert.deepEqual(result.animalClasses.sort(),["Aves","Insecta","Mammalia"]);assert.match(result.summary,/1 faune/);assert.match(result.summary,/1 flore/);assert.match(result.status,/3 espèces/);assert.equal(result.runtime.occurrenceRequests,5);
  });

  await withPage("carnet portable importé sans écrasement", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const result=await page.evaluate(async()=>{
      await clearTerritoryLibraryFromDb();
      state.observations=[{id:"OBS-CARNET",mode:"point",glyph:"◎",name:"Observation portable",lat:CONFIG.house.lat,lon:CONFIG.house.lon,confidence:"high",source:"test"}];
      state.loreItems=[{id:"NOTE-CARNET",name:"Note portable",lat:CONFIG.house.lat,lon:CONFIG.house.lon,note:"Texte conservé"}];
      const sourceSnapshot=buildAtlasSnapshot(),sourceId=sourceSnapshot.territory.id,carnet=await buildAtlasCarnet(sourceSnapshot);
      await saveSnapshotToDb(sourceSnapshot);
      const file=new File([JSON.stringify(carnet)],"controle.atlas",{type:"application/vnd.atlas+carnet+json"});
      await importSnapshotFile(file);
      const imported={id:CONFIG.territory.id,label:CONFIG.territory.label,observations:state.observations.map(item=>item.id),notes:state.loreItems.map(item=>item.id),osm:state.osm.length,cadastre:state.cadastreBuildings.length+state.cadastreParcels.length,elevation:state.elevation,entries:(await listTerritoriesFromDb()).map(item=>item.id),help:els.snapshotHelp.textContent};
      const tampered=JSON.parse(JSON.stringify(carnet));tampered.content.notes[0].note="altération";
      await importSnapshotFile(new File([JSON.stringify(tampered)],"controle-altere.atlas",{type:"application/vnd.atlas+carnet+json"}));
      const afterTamper={id:CONFIG.territory.id,entries:(await listTerritoriesFromDb()).map(item=>item.id),help:els.snapshotHelp.textContent};
      await clearTerritoryLibraryFromDb();carnetRuntime.lastError="";snapshotRuntime.lastError="";
      return {sourceId,imported,afterTamper,runtime:{imports:carnetRuntime.imports,validated:carnetRuntime.validated}};
    });
    assert.notEqual(result.imported.id,result.sourceId);assert.match(result.imported.label,/— import$/);assert.deepEqual(result.imported.observations,["OBS-CARNET"]);assert.deepEqual(result.imported.notes,["NOTE-CARNET"]);
    assert.equal(result.imported.osm,0);assert.equal(result.imported.cadastre,0);assert.equal(result.imported.elevation,null);assert.equal(result.imported.entries.length,2);assert.match(result.imported.help,/nouvelle copie/);
    assert.equal(result.afterTamper.id,result.imported.id);assert.deepEqual(result.afterTamper.entries,result.imported.entries);assert.match(result.afterTamper.help,/intégrité incorrect/);assert.equal(result.runtime.imports,1);assert.ok(result.runtime.validated>=1);
  });

  await withPage("annotations personnelles portables", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.evaluate(()=>{
      const extent=largestExtent(),grid=biodiversityGridPosition(CONFIG.house.lat,CONFIG.house.lon,extent);
      state.biodiversity=[{id:`BIO-${grid.x}-${grid.y}`,cellCode:`${grid.x+1}-${grid.y+1}`,name:"Maille biodiversité annotable",lat:grid.lat,lon:grid.lon,cellCols:grid.cols,cellRows:grid.rows,species:[{speciesKey:"ANNOT-1",scientificName:"Avis exemplaris",vernacularName:"",group:"animals",taxonClass:"Aves",family:"Exemplaridae",basisOfRecord:"HUMAN_OBSERVATION",sampledRecords:2,latestDate:"2026-05-01",earliestDate:"2025-04-01",uncertaintyM:1000}],speciesCount:1,sampledRecords:2,groupCounts:{animals:1},datasets:["Jeu témoin"],licenses:["CC BY"],source:"GBIF · test",url:"https://www.gbif.org/"}];
      state.layerBiodiversity=true;markSpatialIndexesDirty();ensureSpatialIndexes();render("test-annotation");
      const poi=spatialRuntime.normalizedPois.find(item=>item.sourceType==="biodiversity"&&item.raw?.displayGroup==="animals");if(!poi)throw new Error("POI biodiversité absent");selectSymbolicPoi(poi,"Test d’annotation");
    });
    const form=page.locator("form[data-poi-annotation-key]");await form.waitFor();
    await form.locator('[name="poiAnnotationTitle"]').fill("Le petit guetteur");
    await form.locator('[name="poiAnnotationNote"]').fill("Vu près de la haie après la pluie.");
    await form.locator('[data-poi-species-key="ANNOT-1"]').fill("Oiseau des haies");
    await form.getByRole("button",{name:/enregistrer/i}).click();
    await page.waitForFunction(()=>document.getElementById("readoutBody").textContent.includes("Oiseau des haies")&&document.getElementById("readoutSheetLabel").textContent==="Le petit guetteur");
    const result=await page.evaluate(async()=>{
      const key=Object.keys(state.poiAnnotations)[0],snapshot=buildAtlasSnapshot(),carnet=await buildAtlasCarnet(snapshot),portable=await atlasCarnetToSnapshot(carnet),stored=JSON.parse(localStorage.getItem(territoryStorageKey(POI_ANNOTATIONS_KEY))||"{}");
      state.poiAnnotations={};applyAtlasSnapshot(portable,{source:"test annotations",renderNow:false});
      return {key,active:state.poiAnnotations[key],snapshot:snapshot.data.poiAnnotations[key],carnet:carnet.content.annotations[key],portable:portable.data.poiAnnotations[key],stored:stored[key],summary:carnet.summary.annotations};
    });
    assert.ok(result.key);for(const copy of [result.active,result.snapshot,result.carnet,result.portable,result.stored]){assert.equal(copy.title,"Le petit guetteur");assert.equal(copy.note,"Vu près de la haie après la pluie.");assert.equal(copy.speciesNames["ANNOT-1"],"Oiseau des haies")};assert.equal(result.summary,1);
  });

  await withPage("repères de carnet éditables", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.locator("#sidebar-tab-noter").click();
    await page.evaluate(()=>{render("test-reperes");selectGridCell(Math.floor(CONFIG.gridW/2),Math.floor(CONFIG.gridH/2),{note:"Test de carnet"})});
    await page.locator("#localName").fill("Trouvé au bord du chemin");await page.locator("#localNote").fill("Une note longue qui doit suivre le territoire et le partage.");await page.locator("#addLocalMarker").click();
    await page.locator('details[data-ui-subsection="lore"] summary').click();
    await page.locator("#loreName").fill("Le vieux pommier");await page.locator("#loreNote").fill("Le voisin raconte qu’il servait de repère.");await page.locator("#addLoreItem").click();
    const entries=page.locator("#fieldworkLedgerList .fieldwork-ledger-entry");assert.equal(await entries.count(),2);
    await entries.filter({hasText:"Le vieux pommier"}).getByRole("button",{name:/modifier/i}).click();await page.locator("#loreNote").fill("Le voisin raconte qu’il servait de repère depuis longtemps.");await page.locator("#addLoreItem").click();
    const result=await page.evaluate(async()=>{const snapshot=buildAtlasSnapshot(),carnet=await buildAtlasCarnet(snapshot);return {obs:state.observations[0],lore:state.loreItems[0],snapshot:snapshot.data,content:carnet.content,summary:els.fieldworkLedgerSummary.textContent,list:els.fieldworkLedgerList.textContent}});
    assert.match(result.obs.note,/note longue/);assert.match(result.lore.note,/depuis longtemps/);assert.match(result.snapshot.observations[0].note,/note longue/);assert.match(result.content.notes[0].note,/depuis longtemps/);assert.match(result.summary,/2 repères/);assert.match(result.list,/Trouvé au bord du chemin/);assert.match(result.list,/Le vieux pommier/);
  });

  await withPage("carte personnelle portable", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);await page.locator("#sidebar-tab-noter").click();await page.evaluate(()=>{render("test-carte-personnelle");selectGridCell(Math.floor(CONFIG.gridW/2),Math.floor(CONFIG.gridH/2),{note:"Test carte personnelle"})});
    await page.locator('details[data-ui-subsection="personal-map"] summary').click();await page.selectOption("#personalCategory","water");await page.selectOption("#personalGeometry","zone");await page.locator("#personalName").fill("Suintement du chemin");await page.locator("#personalDate").fill("août 2026");await page.locator("#personalNote").fill("Eau visible après plusieurs jours de pluie.");await page.locator("#addPersonalMarker").click();
    const result=await page.evaluate(async()=>{ensureSpatialIndexes();const marker=state.personalMarkers[0],poi=spatialRuntime.normalizedPois.find(item=>item.sourceType==="personal"),snapshot=buildAtlasSnapshot(),carnet=await buildAtlasCarnet(snapshot),portable=await atlasCarnetToSnapshot(carnet);return {marker,poi,feature:symbolicPoiFeatureInfo(poi),snapshot:snapshot.data.personalMarkers[0],carnet:carnet.content.personalMarkers[0],portable:portable.data.personalMarkers[0],visible:state.layerPersonal,ledger:els.fieldworkLedgerList.textContent}});
    for(const copy of [result.marker,result.snapshot,result.carnet,result.portable]){assert.equal(copy.category,"water");assert.equal(copy.geometry,"zone");assert.equal(copy.name,"Suintement du chemin");assert.match(copy.note,/Eau visible/)}assert.equal(result.poi.category,"memory");assert.equal(result.feature.personal,true);assert.equal(result.visible,true);assert.match(result.ledger,/Suintement du chemin/);
  });

  await withPage("filtres groupés des couches", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const terrainBefore=await page.evaluate(()=>state.layerSurface);
    await page.selectOption("#layerCategoryFilter","documents");
    const filtered=await page.evaluate(()=>({visible:[...document.querySelectorAll("#layerSwitchList [data-layer-category]")].filter(item=>!item.hidden).map(item=>item.dataset.layerCategory),terrainHidden:document.querySelector('[data-layer-category="terrain"]').hidden}));
    assert.ok(filtered.visible.length>=8&&filtered.visible.every(value=>value==="documents"));assert.equal(filtered.terrainHidden,true);
    await page.locator("#layersHideCategory").click();
    assert.equal(await page.evaluate(()=>["layerBss","layerHydrometry","layerBiodiversity","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities"].every(id=>state[id]===false&&document.getElementById(id).checked===false)),true);
    assert.equal(await page.evaluate(()=>state.layerSurface),terrainBefore);
    await page.locator("#layersSelectAll").click();const inactiveAfterSelectAll=await page.evaluate(()=>VIEW_LAYER_CONTROL_IDS.filter(id=>id!=="ambientMotion"&&(state[id]!==true||document.getElementById(id).checked!==true)));assert.deepEqual(inactiveAfterSelectAll,[]);
    await page.locator("#layersClearAll").click();assert.equal(await page.evaluate(()=>VIEW_LAYER_CONTROL_IDS.every(id=>state[id]===false&&document.getElementById(id).checked===false)),true);
    await page.locator("#layersSelectAll").click();
  });

  await withPage("coque responsive regroupée", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForTimeout(350);
    const batching=await page.evaluate(async()=>{
      const before={requests:uiShellRuntime.fitRequests,runs:uiShellRuntime.fitRuns,coalesced:uiShellRuntime.fitCoalesced};
      for(let index=0;index<8;index++)scheduleFrameFit();
      await new Promise(resolve=>setTimeout(resolve,140));
      return {
        bound:uiShellRuntime.bound,ready:uiShellRuntime.ready,profile:uiShellRuntime.lastGridProfile,
        requests:uiShellRuntime.fitRequests-before.requests,runs:uiShellRuntime.fitRuns-before.runs,coalesced:uiShellRuntime.fitCoalesced-before.coalesced,
        clusters:document.querySelectorAll("#sidebar > .sidebar-cluster").length
      };
    });
    assert.equal(batching.bound,true);assert.equal(batching.ready,true);assert.match(batching.profile,/\d+ × \d+/);
    assert.ok(batching.requests>=8&&batching.requests<=12,`${batching.requests} demandes pour la rafale étalon`);
    assert.ok(batching.runs<=2,`${batching.runs} ajustements pour une seule rafale`);
    assert.ok(batching.coalesced>=batching.requests-batching.runs-1,`seulement ${batching.coalesced} ajustements regroupés`);assert.equal(batching.clusters,4);
    const collapseBar=await page.evaluate(()=>{const sidebar=document.getElementById("sidebar"),button=document.getElementById("sidebarClose");sidebar.scrollTop=sidebar.scrollHeight;const s=sidebar.getBoundingClientRect(),b=button.getBoundingClientRect(),style=getComputedStyle(button);return {position:style.position,top:b.top,sidebarTop:s.top,leftGap:Math.abs(b.left-s.left),rightGap:Math.abs(b.right-s.right),width:b.width,sidebarWidth:s.width,scrollTop:sidebar.scrollTop}});
    assert.equal(collapseBar.position,"sticky");assert.ok(collapseBar.scrollTop>100);assert.ok(Math.abs(collapseBar.top-collapseBar.sidebarTop)<=2);assert.ok(collapseBar.leftGap<=2&&collapseBar.rightGap<=20);assert.ok(collapseBar.width>=collapseBar.sidebarWidth-20);
    await page.locator("#sidebarToggle").click();
    await page.locator("body.sidebar-collapsed").waitFor();
    await page.locator("#sidebarToggle").click();
    await page.waitForFunction(()=>!document.body.classList.contains("sidebar-collapsed"));
    await page.locator("#infoToggle").click();
    await page.locator("body.info-collapsed").waitFor();
    await page.locator("#infoToggle").click();
    await page.waitForFunction(()=>!document.body.classList.contains("info-collapsed"));
  });

  await withPage("architecture carnet minimaliste", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page,"?offline");
    const initial=await page.evaluate(()=>{
      const styleOf=selector=>{const style=getComputedStyle(document.querySelector(selector));return {radius:style.borderRadius,shadow:style.boxShadow,image:style.backgroundImage,animation:style.animationName}};
      return {
        tabs:[...document.querySelectorAll(".sidebar-section-tab")].map(tab=>({label:tab.textContent.trim(),selected:tab.getAttribute("aria-selected")})),
        active:document.getElementById("sidebar").dataset.activeSection,
        visible:[...document.querySelectorAll("#sidebar > .sidebar-cluster")].filter(cluster=>!cluster.hidden).map(cluster=>cluster.dataset.section),
        nativeSubsections:uiShellRuntime.nativeSubsections,
        retired:[...document.querySelectorAll("[data-interface-retired]")].every(element=>element.hidden),
        clearDuplicateHidden:document.getElementById("clearSavedSnapshot")?.hidden,
        selectionOptions:document.querySelector('[data-interface-advanced="selection-export"]')?.tagName,
        technicalDetails:document.querySelectorAll("details.technical-details").length,
        audioLocation:document.getElementById("audioToggle")?.closest('[data-section="sources"]')?.dataset.section,
        debugLocation:document.getElementById("debugToggle")?.closest('[data-section="sources"]')?.dataset.section,
        orphanCards:[...document.querySelectorAll("#sidebar > .card")].filter(card=>!card.hidden&&card.id!=="offlineNotice").map(card=>card.querySelector(":scope > h2")?.textContent.trim()),
        poolActiveCards:document.querySelectorAll('#sidebarCardPool > [data-ui-card]:not([data-interface-retired])').length,
        nativePlacement:{carnets:document.querySelector('[data-ui-card="carnets"]')?.closest("[data-section]")?.dataset.section,location:document.querySelector('[data-ui-card="location"]')?.closest("[data-section]")?.dataset.section,notes:document.querySelector('[data-ui-card="field-notes"]')?.closest("[data-section]")?.dataset.section,status:document.querySelector('[data-ui-card="source-status"]')?.closest("[data-section]")?.dataset.section},
        tabLinks:[...document.querySelectorAll(".sidebar-section-tab")].every(tab=>document.getElementById(tab.getAttribute("aria-controls"))?.getAttribute("aria-labelledby")===tab.id),
        typography:{sidebar:getComputedStyle(document.getElementById("sidebar")).fontFamily,statusbar:getComputedStyle(document.querySelector(".statusbar")).fontFamily,readout:getComputedStyle(document.getElementById("readout")).fontFamily,canvas:getComputedStyle(document.getElementById("mapCanvas")).fontFamily},
        shellStyle:styleOf("#sidebar"),cardStyle:styleOf(".sidebar-cluster .card"),buttonStyle:styleOf(".sidebar-section-tab"),
        palette:{
          sidebar:{color:getComputedStyle(document.getElementById("sidebar")).color,background:getComputedStyle(document.getElementById("sidebar")).backgroundColor},
          heading:{color:getComputedStyle(document.querySelector(".sidebar-cluster-head h2")).color,background:getComputedStyle(document.getElementById("sidebar")).backgroundColor},
          control:{color:getComputedStyle(document.querySelector('.sidebar-cluster button:not(.sidebar-section-tab)')).color,background:getComputedStyle(document.querySelector('.sidebar-cluster button:not(.sidebar-section-tab)')).backgroundColor},
          statusbar:{color:getComputedStyle(document.querySelector(".statusbar")).color,background:getComputedStyle(document.querySelector(".statusbar")).backgroundColor}
        }
      };
    });
    assert.deepEqual(initial.tabs.map(tab=>tab.label),["Carnets","Explorer","Noter","Sources"]);
    assert.equal(initial.active,"explorer");assert.deepEqual(initial.visible,["explorer"]);assert.equal(initial.tabs[1].selected,"true");
    assert.equal(initial.nativeSubsections,6);assert.equal(initial.retired,true);assert.equal(initial.clearDuplicateHidden,true);assert.equal(initial.selectionOptions,"DETAILS");assert.ok(initial.technicalDetails>=4);
    assert.equal(initial.audioLocation,"sources");assert.equal(initial.debugLocation,"sources");assert.deepEqual(initial.orphanCards,[]);assert.equal(initial.poolActiveCards,0);assert.deepEqual(initial.nativePlacement,{carnets:"carnets",location:"explorer",notes:"noter",status:"sources"});assert.equal(initial.tabLinks,true);
    for(const font of [initial.typography.sidebar,initial.typography.statusbar,initial.typography.readout])assert.match(font,/Arial|Helvetica/);assert.match(initial.typography.canvas,/mono/i);
    for(const style of [initial.shellStyle,initial.cardStyle,initial.buttonStyle]){assert.equal(style.radius,"0px");assert.equal(style.shadow,"none");assert.equal(style.image,"none");assert.equal(style.animation,"none")}
    for(const [name,pair] of Object.entries(initial.palette)){
      const background=parseCssRgb(pair.background);assert.ok(background&&Math.max(...background)<64,`${name} n’utilise pas un fond sombre : ${pair.background}`);
      assert.ok(contrastRatio(pair.color,pair.background)>=4.5,`${name} manque de contraste : ${pair.color} sur ${pair.background}`);
    }
    await page.locator("#mapCarnets").click();await page.waitForFunction(()=>document.getElementById("sidebar").dataset.activeSection==="carnets");
    await page.locator("#mapDisplay").click();await page.waitForFunction(()=>document.getElementById("sidebar").dataset.activeSection==="explorer");
    assert.equal(await page.locator('.card:has(> h2:text-is("Affichage"))').evaluate(card=>card.classList.contains("collapsed")),false);
    await page.locator("#mapNotes").click();await page.waitForFunction(()=>document.getElementById("sidebar").dataset.activeSection==="noter");
    await page.getByRole("tab",{name:"Noter",exact:true}).press("ArrowRight");
    await page.waitForFunction(()=>document.getElementById("sidebar").dataset.activeSection==="sources");
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),"Sources");
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
          shell:{bound:uiShellRuntime.bound,sidebarOpen:document.body.classList.contains("sidebar-open"),infoCollapsed:document.body.classList.contains("info-collapsed")},
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
        assert.equal(layout.shell.bound,true);
        assert.equal(layout.shell.sidebarOpen,false,"le panneau mobile est ouvert au démarrage");
        assert.equal(layout.shell.infoCollapsed,true,"la fiche mobile occupe la carte au démarrage");
        for (const control of layout.controls) {
          assert.ok(control.height >= 44, `${control.id} mesure moins de 44 px de haut`);
          if (control.id.startsWith("map")) assert.ok(control.width >= 44, `${control.id} mesure moins de 44 px de large`);
        }
        if(viewport.name==="mobile portrait"){
          await page.locator("#sidebarToggle").click();
          await page.locator("body.sidebar-open").waitFor();
          const backdropFilter=await page.locator("#sidebarBackdrop").evaluate(element=>getComputedStyle(element).backdropFilter);
          assert.match(backdropFilter,/blur\(5px\)/,"le flou de fond du panneau mobile est absent");
          await page.locator("#sidebarBackdrop").click({position:{x:385,y:100}});
          await page.waitForFunction(()=>!document.body.classList.contains("sidebar-open"));
          await page.locator("#infoToggle").click();
          await page.waitForFunction(()=>!document.body.classList.contains("info-collapsed"));
        }
      }
    });
  }

  await withPage("moteur Canvas unique", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page, "?offline&renderer=dom");
    assert.match(await page.locator("body").getAttribute("class"), /renderer-canvas/);
    assert.equal(await page.locator("#map").count(), 0,"l’ancienne surface DOM existe encore");
    assert.ok(await page.locator("#mapCanvas").evaluate((canvas) => canvas.width > 0 && canvas.height > 0),"le Canvas n’a pas été initialisé");
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

  await withPage("inspecteur desktop persistant", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    await page.waitForTimeout(450);
    const target = await page.evaluate(() => {
      let best=null;
      for(let y=8;y<CONFIG.gridH-8;y++)for(let x=12;x<CONFIG.gridW-12;x++){
        const cell=state.lastGrid.grid[y]?.[x];
        if(!cell||(cell.ch===" "&&!cell.feature))continue;
        const rect=canvasCellRect(x,y);if(!rect)continue;
        const score=Math.hypot(x-CONFIG.gridW/2,y-CONFIG.gridH/2);
        if(!best||score<best.score)best={x:rect.left+rect.width/2,y:rect.top+rect.height/2,score};
      }
      return best;
    });
    assert.ok(target, "aucune cellule dessinée pour l’inspecteur");
    const {x,y}=target;
    await page.mouse.move(x, y);
    await page.locator("#hoverTip.visible").waitFor();
    const hoverState = await page.evaluate(() => ({ reveals: cellInspectorRuntime.hoverReveals, text: els.hoverTip.textContent.trim() }));
    assert.ok(hoverState.reveals >= 1, "le survol n’a pas été enregistré");
    assert.match(hoverState.text, /LOCAL SCAN|SURVOL/);
    await page.mouse.click(x, y);
    await page.waitForFunction(() => cellInspectorRuntime.selections >= 1 && !!state.selectedCell);
    const selected = await page.evaluate(() => ({
      coord:{...state.selectedCell.coord},kind:els.readout.dataset.readoutKind,
      sheet:els.readout.dataset.sheetState,text:els.readoutBody.textContent.trim(),
      marker:els.canvasSelectionMarker.classList.contains("visible"),selections:cellInspectorRuntime.selections
    }));
    assert.ok(["plain","poi"].includes(selected.kind));
    assert.equal(selected.sheet, "full");
    assert.ok(selected.text.length > 30, "la fiche sélectionnée est vide");
    assert.equal(selected.marker, true);
    await page.locator("#mapCanvas").press("+");
    await page.waitForFunction((zoom) => state.zoomIndex > zoom, 3);
    const afterZoom = await page.evaluate(() => ({ coord:{...state.selectedCell.coord},marker:els.canvasSelectionMarker.classList.contains("visible"),active:els.viewport.classList.contains("selection-active") }));
    assert.deepEqual(afterZoom.coord, selected.coord, "la sélection géographique dérive après le zoom clavier");
    assert.equal(afterZoom.marker, true);
    assert.equal(afterZoom.active, true);
  });

  await withPage("inspecteur tactile mobile", { width: 390, height: 844 }, async (page) => {
    await openOfflineAtlas(page);
    const result = await page.evaluate(async () => {
      const surface=activeMapSurface(),rect=surface.getBoundingClientRect();
      const x=rect.left+rect.width*.36,y=rect.top+rect.height*.42;
      const before=cellInspectorRuntime.touchSelections;
      const fire=(type,buttons)=>surface.dispatchEvent(new PointerEvent(type,{
        bubbles:true,cancelable:true,pointerId:71,pointerType:"touch",isPrimary:true,
        clientX:x,clientY:y,button:0,buttons
      }));
      fire("pointerdown",1);fire("pointerup",0);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return {
        before,touchSelections:cellInspectorRuntime.touchSelections,selections:cellInspectorRuntime.selections,
        selected:!!state.selectedCell,kind:els.readout.dataset.readoutKind,sheet:els.readout.dataset.sheetState,
        infoOpen:!document.body.classList.contains("info-collapsed"),marker:els.canvasSelectionMarker.classList.contains("visible"),
        touches:touchPointers.size,panning:els.viewport.classList.contains("panning")
      };
    });
    assert.equal(result.touchSelections, result.before + 1, "le toucher n’a pas été identifié comme sélection tactile");
    assert.ok(result.selections >= 1);
    assert.equal(result.selected, true);
    assert.ok(["plain","poi"].includes(result.kind));
    assert.equal(result.sheet, "full");
    assert.equal(result.infoOpen, true);
    assert.equal(result.marker, true);
    assert.equal(result.touches, 0);
    assert.equal(result.panning, false);
  });

  await withPage("déplacement direct sans rafale", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    const before = await page.evaluate(() => ({ center: { ...state.center }, renders: debugState.renderCount, pans: inputRuntime.panCount }));
    const box = await page.locator("#mapCanvas").boundingBox();
    assert.ok(box, "Canvas sans géométrie pour le déplacement");
    const x = box.x + box.width * .52, y = box.y + box.height * .52;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y + 45, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction((count) => inputRuntime.panCount > count && debugState.lastReason === "pan-release", before.pans);
    const after = await page.evaluate(() => ({
      center: { ...state.center }, renders: debugState.renderCount, pans: inputRuntime.panCount,
      surfaceTransform: activeMapSurface()?.style.transform || "", fxTransform: els.renderFxLayer?.style.transform || ""
    }));
    assert.notDeepEqual(after.center, before.center, "le drag n’a pas déplacé le centre");
    assert.equal(after.pans, before.pans + 1, "le drag a été compté plusieurs fois");
    assert.equal(after.renders, before.renders + 1, "le drag a produit plusieurs rendus cartographiques");
    assert.equal(after.surfaceTransform, "", "l’aperçu de déplacement subsiste après le relâchement");
    assert.match(after.fxTransform, /translateZ\(0(?:px)?\)|translate3d\(0px, 0px, 0px\)|^$/, "les effets ne sont plus alignés après le déplacement");
  });

  await withPage("pincement tactile unifié", { width: 390, height: 844 }, async (page) => {
    await openOfflineAtlas(page);
    const result = await page.evaluate(async () => {
      const surface=activeMapSurface(),rect=surface.getBoundingClientRect();
      const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
      const before={zoom:state.zoomIndex,renders:debugState.renderCount,pinches:inputRuntime.pinchZoomCount};
      const fire=(type,pointerId,x,y,isPrimary=false)=>surface.dispatchEvent(new PointerEvent(type,{
        bubbles:true,cancelable:true,pointerId,pointerType:"touch",isPrimary,clientX:x,clientY:y,
        button:0,buttons:type==="pointerup"?0:1
      }));
      fire("pointerdown",41,cx-42,cy,true);
      fire("pointerdown",42,cx+42,cy,false);
      fire("pointermove",41,cx-92,cy,true);
      fire("pointerup",41,cx-92,cy,true);
      fire("pointerup",42,cx+42,cy,false);
      await new Promise(resolve=>setTimeout(resolve,140));
      return {
        before,zoom:state.zoomIndex,renders:debugState.renderCount,pinches:inputRuntime.pinchZoomCount,
        lastGesture:inputRuntime.lastGesture,touches:touchPointers.size,pinchActive:!!pinch,
        panning:els.viewport.classList.contains("panning"),pinching:surface.classList.contains("pinching")
      };
    });
    assert.equal(result.zoom, result.before.zoom + 1, "le pincement n’a pas augmenté le zoom d’un niveau");
    assert.equal(result.pinches, result.before.pinches + 1, "le pincement a été compté plusieurs fois");
    assert.ok(result.renders <= result.before.renders + 2, "le pincement a déclenché une rafale de rendus");
    assert.equal(result.lastGesture, "pincement");
    assert.equal(result.touches, 0, "des pointeurs tactiles restent mémorisés");
    assert.equal(result.pinchActive, false);
    assert.equal(result.panning, false);
    assert.equal(result.pinching, false);
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
