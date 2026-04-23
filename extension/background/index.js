importScripts("cache.js", "fetcher.js", "queue.js");

(function initBackground(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (!message || message.type !== "PREFETCH_JOB" || !message.payload) {
      return;
    }

    RM.queue.enqueue(message.payload, sender.tab ? sender.tab.id : null);
  });
})(self);
