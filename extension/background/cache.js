(function initBackgroundCache(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const storagePrefix = "job-status:";
  const cacheTtlMs = 24 * 60 * 60 * 1000;

  const memoryCache = new Map();

  function isFresh(record) {
    if (!record) {
      return false;
    }

    return Date.now() - record.timestamp < cacheTtlMs;
  }

  function getStorageKey(jobId) {
    return `${storagePrefix}${jobId}`;
  }

  async function get(jobId) {
    const memoryRecord = memoryCache.get(jobId);
    if (isFresh(memoryRecord)) {
      return memoryRecord;
    }

    memoryCache.delete(jobId);

    const stored = await chrome.storage.local.get(getStorageKey(jobId));
    const storedRecord = stored[getStorageKey(jobId)] || null;

    if (!isFresh(storedRecord)) {
      if (storedRecord) {
        await chrome.storage.local.remove(getStorageKey(jobId));
      }

      return null;
    }

    memoryCache.set(jobId, storedRecord);
    return storedRecord;
  }

  async function set(record) {
    if (!record || !record.jobId) {
      return null;
    }

    const nextRecord = {
      jobId: record.jobId,
      url: record.url || null,
      status: record.status,
      source: record.source,
      timestamp: record.timestamp || Date.now()
    };

    memoryCache.set(nextRecord.jobId, nextRecord);
    await chrome.storage.local.set({
      [getStorageKey(nextRecord.jobId)]: nextRecord
    });

    return nextRecord;
  }

  RM.cache = {
    get,
    set
  };
})(self);
