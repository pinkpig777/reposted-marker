(function initSettings(globalScope) {
  const rootKey = "extensionSettings";
  const schema = {
    enabled: {
      default: true,
      type: "boolean"
    },
    prefetchEnabled: {
      default: true,
      type: "boolean"
    },
    maxPrefetchConcurrency: {
      default: 1,
      max: 3,
      min: 1,
      type: "number"
    },
    prefetchWindowSize: {
      default: 900,
      max: 3000,
      min: 300,
      type: "number"
    },
    cacheTTLHours: {
      default: 24,
      max: 168,
      min: 1,
      type: "number"
    },
    fetchTimeoutMs: {
      default: 15000,
      max: 60000,
      min: 5000,
      type: "number"
    },
    errorRetryMinutes: {
      default: 30,
      max: 180,
      min: 1,
      type: "number"
    },
    rateLimitRetryMinutes: {
      default: 60,
      max: 720,
      min: 5,
      type: "number"
    },
    queueMaxPendingTasks: {
      default: 24,
      max: 200,
      min: 8,
      type: "number"
    },
    prefetchMinIntervalMs: {
      default: 2000,
      max: 10000,
      min: 500,
      type: "number"
    },
    maxMemoryCacheEntries: {
      default: 500,
      max: 5000,
      min: 100,
      type: "number"
    },
    markLeftList: {
      default: true,
      type: "boolean"
    },
    markDetailPanel: {
      default: true,
      type: "boolean"
    },
    debugMode: {
      default: false,
      type: "boolean"
    }
  };
  const defaults = Object.keys(schema).reduce((accumulator, key) => {
    accumulator[key] = schema[key].default;
    return accumulator;
  }, {});

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
    const normalized = {};

    for (const [key, field] of Object.entries(schema)) {
      const candidate = source[key];
      if (field.type === "boolean") {
        normalized[key] = Boolean(candidate ?? field.default);
        continue;
      }

      normalized[key] = sanitizeNumber(
        candidate,
        field.default,
        field.min,
        field.max
      );
    }

    return normalized;
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
    schema,
    getSnapshot,
    init,
    subscribe,
    update
  };
})(globalThis);
