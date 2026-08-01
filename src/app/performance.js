const AMBIENT_PREF_KEY = "atlas-karst-ambient-motion-v1";
const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const performanceRuntime = {
  canvasPixels: 0,
  canvasPixelBudget: 0,
  requestedDpr: 1,
  effectiveDpr: 1,
  fxActive: false,
  fxReason: "initialisation"
};
const dataRenderRuntime = {
  timer:0,batchStarted:0,reasons:new Set(),pendingRequests:0,requests:0,renders:0,covered:0,
  scheduledBatchSize:0,lastBatchSize:0,maxBatchSize:0,lastReason:"—"
};
const DATA_RENDER_DELAY=90,DATA_RENDER_MAX_WAIT=220;
let renderFxIdleTimer = 0;
let scheduledRenderFrame=0,scheduledRenderReason="";

function scheduleRender(reason="scheduled") {
  scheduledRenderReason=reason;
  if(scheduledRenderFrame)return;
  scheduledRenderFrame=requestAnimationFrame(()=>{
    scheduledRenderFrame=0;const why=scheduledRenderReason;scheduledRenderReason="";render(why);
  });
}

function clearDataRenderTimer(){
  clearTimeout(dataRenderRuntime.timer);dataRenderRuntime.timer=0;
}

function flushDataRenderBatch(){
  clearDataRenderTimer();
  const reasons=[...dataRenderRuntime.reasons],size=dataRenderRuntime.pendingRequests;
  dataRenderRuntime.reasons.clear();dataRenderRuntime.pendingRequests=0;dataRenderRuntime.batchStarted=0;
  if(!size)return;
  dataRenderRuntime.scheduledBatchSize+=size;
  scheduleRender(`data-batch:${reasons.join("+")}`);
}

function scheduleDataRender(reason="data"){
  const label=String(reason||"data");
  dataRenderRuntime.requests++;
  dataRenderRuntime.pendingRequests++;
  dataRenderRuntime.reasons.add(label);
  const now=performance.now();if(!dataRenderRuntime.batchStarted)dataRenderRuntime.batchStarted=now;
  clearDataRenderTimer();
  const remaining=Math.max(0,DATA_RENDER_MAX_WAIT-(now-dataRenderRuntime.batchStarted));
  if(remaining===0){flushDataRenderBatch();return}
  dataRenderRuntime.timer=setTimeout(flushDataRenderBatch,Math.min(DATA_RENDER_DELAY,remaining));
}

function accountDataRender(reason){
  const label=String(reason||"");
  if(label.startsWith("data-batch:")){
    const size=Math.max(1,dataRenderRuntime.scheduledBatchSize);
    dataRenderRuntime.scheduledBatchSize=0;dataRenderRuntime.renders++;
    dataRenderRuntime.lastBatchSize=size;dataRenderRuntime.maxBatchSize=Math.max(dataRenderRuntime.maxBatchSize,size);
    dataRenderRuntime.lastReason=label.slice(11)||"data";
    return;
  }
  let covered=dataRenderRuntime.pendingRequests;
  if(covered){dataRenderRuntime.reasons.clear();dataRenderRuntime.pendingRequests=0;dataRenderRuntime.batchStarted=0;clearDataRenderTimer()}
  if(scheduledRenderFrame&&scheduledRenderReason.startsWith("data-batch:")){
    cancelAnimationFrame(scheduledRenderFrame);scheduledRenderFrame=0;scheduledRenderReason="";
    covered+=dataRenderRuntime.scheduledBatchSize;dataRenderRuntime.scheduledBatchSize=0;
  }
  dataRenderRuntime.covered+=covered;
}

function dataRenderCoalescedCount(){return Math.max(0,dataRenderRuntime.requests-dataRenderRuntime.renders)}

function ambientAllowed() {
  return !!state.ambientMotion && !reducedMotionQuery?.matches;
}

function adaptiveCanvasDpr(width, height, compact = false) {
  const requested = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75);
  const pixelBudget = compact ? 3_500_000 : 8_000_000;
  const budgetDpr = Math.sqrt(pixelBudget / Math.max(1, width * height));
  const effective = Math.max(1, Math.min(requested, budgetDpr));
  performanceRuntime.requestedDpr = requested;
  performanceRuntime.effectiveDpr = Math.round(effective * 100) / 100;
  performanceRuntime.canvasPixelBudget = pixelBudget;
  return performanceRuntime.effectiveDpr;
}

function setRenderFxActivity(active, reason = "idle") {
  const fx = els.renderFxLayer;
  clearTimeout(renderFxIdleTimer);
  renderFxIdleTimer = 0;
  const running = !!active && ambientAllowed() && !document.hidden;
  document.body.classList.toggle("motion-disabled", !ambientAllowed());
  performanceRuntime.fxActive = running;
  performanceRuntime.fxReason = reason;
  if (!fx) return;
  fx.classList.toggle("fx-active", running);
  fx.dataset.motionState = running ? "active" : ambientAllowed() ? "idle" : "disabled";
  fx.dataset.motionReason = reason;
}

function pulseRenderFxActivity(duration = 900, reason = "render") {
  if (!ambientAllowed() || document.hidden) {
    setRenderFxActivity(false, document.hidden ? "hidden" : "disabled");
    return;
  }
  setRenderFxActivity(true, reason);
  renderFxIdleTimer = setTimeout(() => setRenderFxActivity(false, "idle"), duration);
}

function syncAmbientMotionState({ pulse = false, reason = "preference" } = {}) {
  if (pulse) pulseRenderFxActivity(900, reason);
  else setRenderFxActivity(false, reason);
}
