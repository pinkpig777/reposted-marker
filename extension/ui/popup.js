(async function initPopup(globalScope) {
  const settingsApi = globalScope.RepostedMarker.settings;
  const debugLogApi = globalScope.RepostedMarker.debugLog;
  const statusText = document.getElementById("statusText");

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

  async function save(partialSettings) {
    statusText.textContent = "Saving…";
    const settings = await settingsApi.update(partialSettings);
    await debugLogApi.log("settings_updated_from_popup", partialSettings);
    render(settings);
    statusText.textContent = "Saved locally.";
  }

  const currentSettings = await settingsApi.init();
  await debugLogApi.init();
  render(currentSettings);

  for (const id of toggles) {
    document.getElementById(id).addEventListener("change", async (event) => {
      await save({
        [id]: event.target.checked
      });
    });
  }

  for (const [id, formatter] of Object.entries(ranges)) {
    const input = document.getElementById(id);
    const valueLabel = document.getElementById(`${id}Value`);

    input.addEventListener("input", () => {
      valueLabel.textContent = formatter(Number(input.value));
    });

    input.addEventListener("change", async () => {
      await save({
        [id]: Number(input.value)
      });
    });
  }

  document.getElementById("downloadLogs").addEventListener("click", async () => {
    statusText.textContent = "Preparing debug log…";
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
    statusText.textContent = `Downloaded ${entries.length} log entries.`;
  });

  document.getElementById("clearLogs").addEventListener("click", async () => {
    await debugLogApi.clear();
    statusText.textContent = "Debug log cleared.";
  });
})(window);
