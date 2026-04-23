(function initContentScript(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  let observerController = null;
  let settingsUnsubscribe = null;

  function isJobsPage() {
    return /^\/jobs(\/|$)/.test(window.location.pathname);
  }

  function stopRuntime() {
    if (observerController) {
      observerController.stop();
      observerController = null;
    }
  }

  function applySettings(settings) {
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
    if (!isJobsPage()) {
      return;
    }

    await RM.settings.init();
    await RM.debugLog.init();
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
