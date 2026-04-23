(function initBackgroundCache(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const shared = globalScope.RepostedMarker;
  const storagePrefix = "job-status:";

  const memoryCache = new Map();
  const stats = {
    evictions: 0,
    hits: 0,
    misses: 0,
    writes: 0
  };

  function getSettings() {
    return shared.settings.getSnapshot();
  }

  function getConstants() {
    return shared.constants || {};
  }

  function isFresh(record) {
    return shared.cachePolicy.isFresh(record, getSettings(), getConstants());
  }

  function getStorageKey(jobId) {
    return `${storagePrefix}${jobId}`;
  }

  function touchMemoryCache(jobId, record) {
    if (!jobId || !record) {
      return;
    }

    if (memoryCache.has(jobId)) {
      memoryCache.delete(jobId);
    }

    memoryCache.set(jobId, record);
    trimMemoryCache();
  }

  function trimMemoryCache() {
    const settings = getSettings();
    const maxEntries = Math.max(Number(settings.maxMemoryCacheEntries) || 500, 1);

    while (memoryCache.size > maxEntries) {
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
      stats.evictions += 1;
    }
  }

  function normalizeRecord(record) {
    if (!record || !record.jobId) {
      return null;
    }

    return {
      jobId: record.jobId,
      nextRetryAt: record.nextRetryAt || null,
      source: record.source,
      status: record.status,
      timestamp: record.timestamp || Date.now(),
      url: record.url || null
    };
  }

  async function readStorageRecord(jobId) {
    const key = getStorageKey(jobId);
    const stored = await chrome.storage.local.get(key);
    return stored[key] || null;
  }

  async function readExistingRecord(jobId) {
    const memoryRecord = memoryCache.get(jobId);
    if (isFresh(memoryRecord)) {
      return memoryRecord;
    }

    memoryCache.delete(jobId);

    const storedRecord = await readStorageRecord(jobId);
    if (!isFresh(storedRecord)) {
      if (storedRecord) {
        await chrome.storage.local.remove(getStorageKey(jobId));
      }
      return null;
    }

    touchMemoryCache(jobId, storedRecord);
    return storedRecord;
  }

  async function get(jobId) {
    const existingRecord = await readExistingRecord(jobId);
    if (existingRecord) {
      stats.hits += 1;
      return existingRecord;
    }

    stats.misses += 1;
    return null;
  }

  async function set(record) {
    const nextRecord = normalizeRecord(record);
    if (!nextRecord) {
      return null;
    }

    const existingRecord = await readExistingRecord(nextRecord.jobId);
    const shouldReplace = shared.cachePolicy.shouldReplaceRecord(
      existingRecord,
      nextRecord,
      shared.constants.sourcePriority
    );

    if (!shouldReplace && existingRecord) {
      return existingRecord;
    }

    const finalRecord = shouldReplace ? nextRecord : existingRecord;
    if (!finalRecord) {
      return null;
    }

    touchMemoryCache(finalRecord.jobId, finalRecord);
    await chrome.storage.local.set({
      [getStorageKey(finalRecord.jobId)]: finalRecord
    });
    stats.writes += 1;

    return finalRecord;
  }

  async function clearAll() {
    const allItems = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allItems).filter((key) => key.startsWith(storagePrefix));

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }

    memoryCache.clear();
    return keysToRemove.length;
  }

  async function pruneExpired() {
    for (const [jobId, record] of memoryCache.entries()) {
      if (!isFresh(record)) {
        memoryCache.delete(jobId);
      }
    }

    const allItems = await chrome.storage.local.get(null);
    const keysToRemove = [];
    for (const [key, record] of Object.entries(allItems)) {
      if (!key.startsWith(storagePrefix)) {
        continue;
      }

      if (!isFresh(record)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }

  function getStats() {
    return {
      ...stats,
      memoryEntries: memoryCache.size
    };
  }

  RM.cache = {
    clearAll,
    get,
    getStats,
    pruneExpired,
    set
  };
})(self);
