"use strict";
const URL_FLAGS = new URLSearchParams(location.search);
const LOCAL_FILE_MODE = location.protocol==="file:";
const FORCE_ONLINE = URL_FLAGS.has("online");
const OFFLINE_TEST = URL_FLAGS.has("offline");
const APP_VERSION = "0.19";
const EXPLORATIONS_EDITION = document.body.dataset.edition === "explorations";
const NETWORK_RENDERER_REVISION = "cartographic-backbone-r1";
const CANVAS_RENDERER = !!document.createElement("canvas").getContext;
document.body.classList.add("renderer-canvas");
if(EXPLORATIONS_EDITION){
  document.body.classList.add("explorations-edition");
  const editionEyebrow=document.querySelector(".eyebrow");
  if(editionEyebrow?.firstChild)editionEyebrow.firstChild.textContent="EXPLORATIONS LOCALES · ";
  document.querySelector(".sidebar-head h1").textContent="ATLAS KARST — EXPLORATIONS";
  document.querySelector(".sidebar-head .sub").textContent="Choisis un coin du monde, regarde ce qui s’y trouve et garde la trace de tes découvertes.";
  document.querySelector("#mapCarnets").textContent="Carnet";
  document.querySelector("#mapDisplay").textContent="Carte";
  document.querySelector("#mapNotes").textContent="Observer";
  document.querySelector("#infoToggle").textContent="Ce lieu";
  document.querySelector("#mapTip").textContent="touche une case pour en savoir plus · glisse pour parcourir la carte · ⌖ = ma position";
  document.querySelector("#sidebarClose").textContent="← revenir à la carte";
  const editionLabels={carnets:"Carnet",explorer:"Explorer",noter:"Observer",sources:"À découvrir"};
  for(const tab of document.querySelectorAll(".sidebar-section-tab")){const label=editionLabels[tab.dataset.sectionTarget];if(label){tab.textContent=label;tab.setAttribute("aria-label",label)}}
  for(const cluster of document.querySelectorAll(".sidebar-cluster")){const label=editionLabels[cluster.dataset.section];if(label)cluster.querySelector("h2").textContent=label}
  const cardIcons={
    carnets:"▣",location:"⌖","map-reading":"◫",display:"◉","starting-point":"⌂",legend:"✦",
    "field-notes":"✎",time:"◷","source-status":"⌁",heritage:"⌂",cartofriches:"▧",bss:"◌",
    hydrometry:"≈",biodiversity:"♧",nature:"✿","land-cover":"▤",geology:"◆","industrial-history":"⚒"
  };
  for(const card of document.querySelectorAll("[data-ui-card]")){
    const icon=cardIcons[card.dataset.uiCard];
    const heading=card.querySelector(":scope > h2");
    if(icon&&heading){heading.dataset.explorationIcon=icon;card.dataset.explorationFamily=card.dataset.uiCard}
  }
  const legend=document.querySelector('[data-ui-card="legend"]');
  if(legend){legend.innerHTML=`<h2 data-exploration-icon="✦">Lire la carte</h2>
    <p class="exploration-legend-intro">Des signes simples pour se repérer. Touche un symbole sur la carte pour ouvrir son histoire.</p>
    <div class="exploration-legend-grid">
      <article class="exploration-legend-item family-land"><b>▤</b><span><strong>Le sol</strong><small>bois, prairies, champs et bâtiments</small></span></article>
      <article class="exploration-legend-item family-water"><b>≈</b><span><strong>L’eau</strong><small>ruisseaux, sources et stations</small></span></article>
      <article class="exploration-legend-item family-life"><b>♧</b><span><strong>Le vivant</strong><small>animaux, plantes et champignons observés</small></span></article>
      <article class="exploration-legend-item family-story"><b>⌂</b><span><strong>Les histoires</strong><small>patrimoine, friches et mémoire locale</small></span></article>
      <article class="exploration-legend-item family-underground"><b>◆</b><span><strong>Sous le sol</strong><small>cavités, forages et hypothèses</small></span></article>
      <article class="exploration-legend-item family-notes"><b>✎</b><span><strong>Ton carnet</strong><small>notes et repères ajoutés pendant l’exploration</small></span></article>
    </div>
    <div class="exploration-confidence" aria-label="Niveaux de confiance"><strong>Ce que l’on sait</strong><span class="confidence confirmed">✓ confirmé</span><span class="confidence noted">✎ noté</span><span class="confidence explore">⌕ à comprendre</span><span class="confidence check">? à vérifier</span></div>
    <p class="exploration-legend-note">Les traces souterraines et les observations partagées donnent des pistes : elles ne remplacent pas un relevé de terrain ni les consignes de sécurité.</p>`}
}

function explorationsStatusLabel(status,label){
  if(!EXPLORATIONS_EDITION)return label;
  const text=String(label||"").replace(/\s+/g," ").trim();
  if(status==="ok")return text?`Prêt · ${text}`:"Prêt à explorer";
  if(status==="bad")return text?`À vérifier · ${text}`:"À vérifier";
  if(/à synchroniser|à charger|non chargé|consultation externe|optionnel/i.test(text))return "À découvrir";
  if(/échec|indisponible|hors couverture|non trouvé/i.test(text))return `À vérifier · ${text}`;
  return text?`En route · ${text}`:"En route…";
}
if(!CANVAS_RENDERER)document.body.classList.add("canvas-unsupported");
function isNativeAndroidApp(){
  try{return window.Capacitor?.getPlatform?.()==="android"&&window.Capacitor?.isNativePlatform?.()===true}catch{return false}
}
if(isNativeAndroidApp())document.body.classList.add("native-android");
let els={};
const DEBUG_REQUESTED = URL_FLAGS.has("debug");
const debugState={
  enabled:DEBUG_REQUESTED,
  renderCount:0,totalRenderMs:0,lastRenderMs:0,maxRenderMs:0,lastPoiCount:0,
  lastRenderPhases:{layout:0,index:0,grid:0,layers:0,output:0,interface:0},
  lastPointer:"—",lastSelection:"—",lastReason:"initialisation",lastStorageScan:0,
  storageBytes:0,storageKeys:0,errors:[],bootStarted:performance.now()
};
