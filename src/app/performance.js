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
let renderFxIdleTimer = 0;

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
