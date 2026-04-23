(function initDebugLog(globalScope) {
  const rootKey = "debugLogEntries";
  const maxEntries = 300;
  let entries = [];

  async function init() {
    const stored = await chrome.storage.local.get(rootKey);
    entries = Array.isArray(stored[rootKey]) ? stored[rootKey] : [];
    return entries.slice();
  }

  async function persist() {
    await chrome.storage.local.set({
      [rootKey]: entries
    });
  }

  function shouldLog() {
    const settings = globalScope.RepostedMarker && globalScope.RepostedMarker.settings;
    return !settings || settings.getSnapshot().debugMode;
  }

  async function log(event, details) {
    if (!shouldLog()) {
      return;
    }

    entries.push({
      timestamp: new Date().toISOString(),
      event,
      details: details || {}
    });

    if (entries.length > maxEntries) {
      entries = entries.slice(entries.length - maxEntries);
    }

    await persist();
  }

  function getEntries() {
    return entries.slice();
  }

  async function clear() {
    entries = [];
    await persist();
  }

  const namespace = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  namespace.debugLog = {
    clear,
    getEntries,
    init,
    log
  };
})(globalThis);
