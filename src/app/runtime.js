"use strict";
const URL_FLAGS = new URLSearchParams(location.search);
const LOCAL_FILE_MODE = location.protocol==="file:";
const FORCE_ONLINE = URL_FLAGS.has("online");
const OFFLINE_TEST = URL_FLAGS.has("offline");
const APP_VERSION = "0.18h";
const NETWORK_RENDERER_REVISION = "cartographic-backbone-r1";
const CANVAS_RENDERER = !!document.createElement("canvas").getContext;
document.body.classList.add("renderer-canvas");
if(!CANVAS_RENDERER)document.body.classList.add("canvas-unsupported");
let els={};
const DEBUG_REQUESTED = URL_FLAGS.has("debug");
const debugState={
  enabled:DEBUG_REQUESTED,
  renderCount:0,totalRenderMs:0,lastRenderMs:0,maxRenderMs:0,lastPoiCount:0,
  lastRenderPhases:{layout:0,index:0,grid:0,layers:0,output:0,interface:0},
  lastPointer:"—",lastSelection:"—",lastReason:"initialisation",lastStorageScan:0,
  storageBytes:0,storageKeys:0,errors:[],bootStarted:performance.now()
};
