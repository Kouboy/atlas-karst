import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startAtlasServer } from "./serve.mjs";

const outputDirectory = new URL("../test-results/", import.meta.url);
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
  assert.match(await page.title(), /Atlas Karst ASCII v0\.16s/);
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
  });

  await withPage("rendus symbolique et ASCII", { width: 1280, height: 720 }, async (page) => {
    await openOfflineAtlas(page);
    assert.equal(await page.locator("body").getAttribute("data-effective-render"), "symbolic");
    await page.getByRole("button", { name: "⌁ ASCII", exact: true }).click();
    await page.locator('body[data-effective-render="ascii"]').waitFor();
    assert.equal(await page.locator("#renderModeAscii").getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "▰ symbolique", exact: true }).click();
    await page.locator('body[data-effective-render="symbolic"]').waitFor();
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
