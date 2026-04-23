(function initContentCache(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { cacheTtlMs, errorRetryMs, rateLimitRetryMs } = RM.constants.timing;
  const { error, rateLimited } = RM.constants.status;
  const sourcePriority = RM.constants.sourcePriority;

  const cache = new Map();

  function isFresh(record) {
    if (!record) {
      return false;
    }

    const ttlMs = getTtlMs(record);
    return Date.now() - record.timestamp < ttlMs;
  }

  function getTtlMs(record) {
    if (!record) {
      return 0;
    }

    if (record.nextRetryAt) {
      return Math.max(record.nextRetryAt - record.timestamp, 0);
    }

    if (record.status === rateLimited) {
      return rateLimitRetryMs;
    }

    if (record.status === error) {
      return errorRetryMs;
    }

    return cacheTtlMs;
  }

  function get(jobId) {
    const record = cache.get(jobId);
    if (!isFresh(record)) {
      cache.delete(jobId);
      return null;
    }

    return record;
  }

  function set(record) {
    if (!record || !record.jobId) {
      return null;
    }

    const existingRecord = get(record.jobId);
    const nextRecord = {
      jobId: record.jobId,
      status: record.status,
      source: record.source,
      timestamp: record.timestamp || Date.now(),
      url: record.url || null,
      nextRetryAt: record.nextRetryAt || null
    };

    if (existingRecord) {
      const existingPriority = sourcePriority[existingRecord.source] || 0;
      const nextPriority = sourcePriority[nextRecord.source] || 0;

      if (existingPriority > nextPriority) {
        return existingRecord;
      }
    }

    cache.set(record.jobId, nextRecord);
    return nextRecord;
  }

  RM.cache = {
    get,
    set
  };
})(window);
