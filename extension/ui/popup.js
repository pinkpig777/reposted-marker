(async function initPopup(globalScope) {
  const settingsApi = globalScope.RepostedMarker.settings;
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
    render(settings);
    statusText.textContent = "Saved locally.";
  }

  const currentSettings = await settingsApi.init();
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
})(window);
