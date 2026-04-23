(function initContentCache(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { cacheTtlMs } = RM.constants.timing;

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
      return;
    }

    cache.set(record.jobId, {
      jobId: record.jobId,
      status: record.status,
      source: record.source,
      timestamp: record.timestamp || Date.now(),
      url: record.url || null
    });
  }

  RM.cache = {
    get,
    set
  };
})(window);
