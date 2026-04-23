importScripts(
  "../shared/constants.js",
  "../shared/contracts.js",
  "../shared/settings.js",
  "../shared/debug-log.js",
  "../shared/utils.js",
  "../shared/cache-policy.js",
  "cache.js",
  "fetcher.js",
  "queue.js"
);

(function initBackground(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const shared = globalScope.RepostedMarker;
  const { messageType } = shared.constants;

  let previousSettings = { ...shared.settings.defaults };

  function isSupportedPrefetchSender(sender) {
    const senderUrl = sender && sender.url;
    const tabId = sender && sender.tab && sender.tab.id;
    if (!Number.isInteger(tabId) || !senderUrl) {
      return false;
    }

    return shared.contracts.getRouteSupport(senderUrl).supported;
  }

  function onSettingsChanged(nextSettings) {
    const policyChanged =
      nextSettings.cacheTTLHours !== previousSettings.cacheTTLHours ||
      nextSettings.errorRetryMinutes !== previousSettings.errorRetryMinutes ||
      nextSettings.rateLimitRetryMinutes !== previousSettings.rateLimitRetryMinutes;

    if (policyChanged && RM.cache && typeof RM.cache.pruneExpired === "function") {
      RM.cache.pruneExpired().catch(() => {});
    }

    previousSettings = { ...nextSettings };
  }

  shared.settings.init().then((settings) => {
    previousSettings = { ...settings };
  }).catch(() => {});
  shared.debugLog.init();
  shared.settings.subscribe(onSettingsChanged);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return false;
    }

    if (message.type === messageType.queueStatusRequest) {
      sendResponse({
        ok: true,
        cache: RM.cache.getStats(),
        queue: RM.queue.getStatus()
      });
      return false;
    }

    if (message.type === messageType.cacheClearRequest) {
      RM.cache.clearAll().then(() => {
        RM.queue.clearPending("cache_cleared");
        sendResponse({ ok: true });
      }).catch(() => {
        sendResponse({ ok: false });
      });
      return true;
    }

    if (message.type !== messageType.prefetchJob || !message.payload) {
      return false;
    }

    if (!isSupportedPrefetchSender(sender)) {
      shared.debugLog.log("prefetch_message_rejected", {
        reason: "unsupported_sender",
        senderUrl: sender && sender.url ? sender.url : null
      });
      return false;
    }

    const validation = shared.contracts.validatePrefetchPayload(message.payload);
    if (!validation.ok) {
      shared.debugLog.log("prefetch_message_rejected", {
        error: validation.error,
        reason: "payload_invalid"
      });
      return false;
    }

    shared.debugLog.log("prefetch_message_received", {
      jobId: validation.value.jobId,
      tabId: sender.tab ? sender.tab.id : null
    });

    RM.queue.enqueue(validation.value, sender.tab ? sender.tab.id : null);
    return false;
  });
})(self);
