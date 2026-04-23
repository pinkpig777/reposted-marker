importScripts("../shared/settings.js", "../shared/debug-log.js", "cache.js", "fetcher.js", "queue.js");

(function initBackground(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  globalScope.RepostedMarker.settings.init();
  globalScope.RepostedMarker.debugLog.init();

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (!message || message.type !== "PREFETCH_JOB" || !message.payload) {
      return;
    }

    globalScope.RepostedMarker.debugLog.log("prefetch_message_received", {
      jobId: message.payload.jobId,
      tabId: sender.tab ? sender.tab.id : null
    });
    RM.queue.enqueue(message.payload, sender.tab ? sender.tab.id : null);
  });
})(self);
