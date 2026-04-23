(function initContentScript(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function isJobsPage() {
    return /^\/jobs(\/|$)/.test(window.location.pathname);
  }

  function init() {
    if (!isJobsPage()) {
      return;
    }

    RM.messaging.startMessageListener();
    RM.scanner.scanPage();
    RM.observer.startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  init();
})(window);
