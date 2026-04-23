(async function initPopup(globalScope) {
  const settingsApi = globalScope.RepostedMarker.settings;
  const debugLogApi = globalScope.RepostedMarker.debugLog;
  const { contracts, constants } = globalScope.RepostedMarker;
  const { messageType } = constants;
  const statusText = document.getElementById("statusText");
  const pageSupportText = document.getElementById("pageSupportText");
  const queueStatusText = document.getElementById("queueStatusText");
  const cacheStatusText = document.getElementById("cacheStatusText");
  let refreshTimerId = null;

  const toggles = [
    "enabled",
    "prefetchEnabled",
    "markLeftList",
    "markDetailPanel",
    "debugMode"
  ];

  const ranges = {
    prefetchWindowSize: (value) => `${value}px`,
    maxPrefetchConcurrency: (value) => `${value}`,
    cacheTTLHours: (value) => `${value}h`
  };

  function setStatus(message) {
    statusText.textContent = message;
  }

  function render(settings) {
    for (const id of toggles) {
      const input = document.getElementById(id);
      input.checked = settings[id];
    }

    for (const [id, formatter] of Object.entries(ranges)) {
      const input = document.getElementById(id);
      const value = Number(settings[id]);
      input.value = String(value);
      document.getElementById(`${id}Value`).textContent = formatter(value);
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    return tabs && tabs[0] ? tabs[0] : null;
  }

  function renderPageSupport(url) {
    const support = contracts.getRouteSupport(url || "");
    pageSupportText.textContent = support.supported ? "Supported" : "Not Supported";
  }

  function renderRuntimeStatus(payload) {
    if (!payload || !payload.ok) {
      queueStatusText.textContent = "Unavailable";
      cacheStatusText.textContent = "Unavailable";
      return;
    }

    const queue = payload.queue || {};
    const cache = payload.cache || {};
    const queueState = queue.paused ? `Paused (${queue.pending}/${queue.active})` : `${queue.pending} pending, ${queue.active} active`;
    queueStatusText.textContent = queueState;
    cacheStatusText.textContent = `${cache.memoryEntries || 0} entries, ${cache.hits || 0} hits`;
  }

  async function refreshRuntimeInfo() {
    try {
      const activeTab = await getActiveTab();
      renderPageSupport(activeTab && activeTab.url ? activeTab.url : "");

      const payload = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: messageType.queueStatusRequest }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false });
            return;
          }

          resolve(response || { ok: false });
        });
      });

      renderRuntimeStatus(payload);
    } catch (_error) {
      queueStatusText.textContent = "Unavailable";
      cacheStatusText.textContent = "Unavailable";
    }
  }

  async function save(partialSettings) {
    setStatus("Saving...");
    const settings = await settingsApi.update(partialSettings);
    await debugLogApi.log("settings_updated_from_popup", partialSettings);
    render(settings);
    setStatus("Saved locally.");
  }

  const currentSettings = await settingsApi.init();
  await debugLogApi.init();
  render(currentSettings);

  for (const id of toggles) {
    document.getElementById(id).addEventListener("change", async (event) => {
      try {
        await save({
          [id]: event.target.checked
        });
      } catch (_error) {
        setStatus("Failed to save setting.");
      }
    });
  }

  for (const [id, formatter] of Object.entries(ranges)) {
    const input = document.getElementById(id);
    const valueLabel = document.getElementById(`${id}Value`);

    input.addEventListener("input", () => {
      valueLabel.textContent = formatter(Number(input.value));
    });

    input.addEventListener("change", async () => {
      try {
        await save({
          [id]: Number(input.value)
        });
      } catch (_error) {
        setStatus("Failed to save setting.");
      }
    });
  }

  document.getElementById("rescanPage").addEventListener("click", async () => {
    const activeTab = await getActiveTab();
    if (!activeTab || !Number.isInteger(activeTab.id)) {
      setStatus("No active tab available.");
      return;
    }

    const support = contracts.getRouteSupport(activeTab.url || "");
    if (!support.supported) {
      setStatus("Current tab is not a supported LinkedIn jobs search page.");
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, {
      type: messageType.rescanPage
    }, () => {
      if (chrome.runtime.lastError) {
        setStatus("Rescan request failed.");
        return;
      }

      setStatus("Rescan requested.");
    });
  });

  document.getElementById("clearCache").addEventListener("click", async () => {
    setStatus("Clearing cache...");

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: messageType.cacheClearRequest }, (payload) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false });
          return;
        }

        resolve(payload || { ok: false });
      });
    });

    if (!response.ok) {
      setStatus("Failed to clear cache.");
      return;
    }

    setStatus("Cache cleared.");
    await refreshRuntimeInfo();
  });

  document.getElementById("downloadLogs").addEventListener("click", async () => {
    setStatus("Preparing debug log...");
    const entries = debugLogApi.getEntries();
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: settingsApi.getSnapshot(),
      entries
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reposted-marker-debug-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${entries.length} log entries.`);
  });

  document.getElementById("clearLogs").addEventListener("click", async () => {
    await debugLogApi.clear();
    setStatus("Debug log cleared.");
  });

  await refreshRuntimeInfo();
  refreshTimerId = globalScope.setInterval(refreshRuntimeInfo, 3000);
  globalScope.addEventListener("unload", () => {
    if (refreshTimerId) {
      globalScope.clearInterval(refreshTimerId);
      refreshTimerId = null;
    }
  });
})(window);
