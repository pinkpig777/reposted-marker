(function initContentCache(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { cacheTtlMs } = RM.constants.timing;
  const sourcePriority = RM.constants.sourcePriority;

  const cache = new Map();

  function isFresh(record) {
    if (!record) {
      return false;
    }

    return Date.now() - record.timestamp < cacheTtlMs;
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
      url: record.url || null
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
