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
