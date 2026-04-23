(function initContentScript(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  let observerController = null;
  let settingsUnsubscribe = null;

  function isSupportedRoute() {
    if (!RM.contracts || typeof RM.contracts.getRouteSupport !== "function") {
      return /^\/jobs\/search\/?$/i.test(window.location.pathname);
    }

    return RM.contracts.getRouteSupport(window.location.href).supported;
  }

  function stopRuntime() {
    if (observerController) {
      observerController.stop();
      observerController = null;
    }
  }

  function applySettings(settings) {
    if (!isSupportedRoute()) {
      stopRuntime();
      RM.scanner.clearPageMarks();
      return;
    }

    if (!settings.enabled) {
      stopRuntime();
      RM.scanner.clearPageMarks();
      return;
    }

    RM.scanner.scanPage();
    if (!observerController) {
      observerController = RM.observer.startObserver();
    }
  }

  async function init() {
    if (!/^\/jobs(\/|$)/.test(window.location.pathname)) {
      return;
    }

    await RM.settings.init();
    await RM.debugLog.init();

    if (!isSupportedRoute()) {
      RM.debugLog.log("content_route_unsupported", {
        path: window.location.pathname
      });
      return;
    }

    RM.messaging.startMessageListener();
    RM.debugLog.log("content_initialized", {
      path: window.location.pathname
    });
    applySettings(RM.settings.getSnapshot());

    if (!settingsUnsubscribe) {
      settingsUnsubscribe = RM.settings.subscribe((settings) => {
        RM.debugLog.log("settings_applied_to_content", settings);
        applySettings(settings);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  init();
})(window);
