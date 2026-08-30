import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  ["android/app/src/main/assets/public/index.html", "data-edition=\"explorations\"", "édition Explorations embarquée"],
  ["android/app/src/main/java/fr/kouboy/atlaskarst/CarnetFilesPlugin.java", "@CapacitorPlugin(name = \"CarnetFiles\")", "pont de documents Android"],
  ["android/app/src/main/java/fr/kouboy/atlaskarst/MainActivity.java", "registerPlugin(CarnetFilesPlugin.class)", "pont de documents enregistré"],
  ["android/app/src/main/AndroidManifest.xml", "ACCESS_FINE_LOCATION", "permission de localisation à la demande"]
];

for (const [relative, expected, label] of required) {
  const file = resolve(root, relative);
  if (!existsSync(file)) throw new Error(`${label} absent : ${relative}`);
  if (!readFileSync(file, "utf8").includes(expected)) throw new Error(`${label} invalide : ${relative}`);
  console.log(`✓ ${label}`);
}

const gradle = readFileSync(resolve(root, "android/app/build.gradle"), "utf8");
if (!/versionCode\s+3\b/.test(gradle) || !/versionName\s+"0\.19\.2-companion"/.test(gradle)) {
  throw new Error("version compagnon Android invalide");
}
console.log("✓ version compagnon 0.19.2 (code 3)");
