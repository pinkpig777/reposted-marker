(function initSettings(globalScope) {
  const rootKey = "extensionSettings";
  const defaults = {
    enabled: true,
    prefetchEnabled: true,
    maxPrefetchConcurrency: 1,
    prefetchWindowSize: 900,
    cacheTTLHours: 24,
    markLeftList: true,
    markDetailPanel: true,
    debugMode: false
  };

  const listeners = new Set();
  let snapshot = { ...defaults };

  function sanitizeNumber(value, fallback, min, max) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      return fallback;
    }

    return Math.min(Math.max(nextValue, min), max);
  }

  function normalize(input) {
    const source = input || {};

    return {
      enabled: Boolean(source.enabled ?? defaults.enabled),
      prefetchEnabled: Boolean(source.prefetchEnabled ?? defaults.prefetchEnabled),
      maxPrefetchConcurrency: sanitizeNumber(
        source.maxPrefetchConcurrency,
        defaults.maxPrefetchConcurrency,
        1,
        3
      ),
      prefetchWindowSize: sanitizeNumber(
        source.prefetchWindowSize,
        defaults.prefetchWindowSize,
        300,
        3000
      ),
      cacheTTLHours: sanitizeNumber(
        source.cacheTTLHours,
        defaults.cacheTTLHours,
        1,
        168
      ),
      markLeftList: Boolean(source.markLeftList ?? defaults.markLeftList),
      markDetailPanel: Boolean(source.markDetailPanel ?? defaults.markDetailPanel),
      debugMode: Boolean(source.debugMode ?? defaults.debugMode)
    };
  }

  function notify() {
    for (const listener of listeners) {
      listener({ ...snapshot });
    }
  }

  async function init() {
    const stored = await chrome.storage.local.get(rootKey);
    snapshot = normalize(stored[rootKey]);
    return { ...snapshot };
  }

  function getSnapshot() {
    return { ...snapshot };
  }

  async function update(partialSettings) {
    snapshot = normalize({
      ...snapshot,
      ...(partialSettings || {})
    });

    await chrome.storage.local.set({
      [rootKey]: snapshot
    });

    return { ...snapshot };
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[rootKey]) {
      return;
    }

    snapshot = normalize(changes[rootKey].newValue);
    notify();
  });

  const namespace = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  namespace.settings = {
    defaults: { ...defaults },
    getSnapshot,
    init,
    subscribe,
    update
  };
})(globalThis);
