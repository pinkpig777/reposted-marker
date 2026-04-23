(function initContentCache(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { reposted, notReposted } = RM.constants.status;
  const sourcePriority = RM.constants.sourcePriority;

  const cache = new Map();

  function isFresh(record) {
    return RM.cachePolicy.isFresh(record, RM.settings.getSnapshot(), RM.constants);
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

    const nextRecord = {
      jobId: record.jobId,
      status: record.status,
      source: record.source,
      timestamp: record.timestamp || Date.now(),
      url: record.url || null,
      nextRetryAt: record.nextRetryAt || null
    };
    const existingRecord = get(nextRecord.jobId);

    if (!RM.cachePolicy.shouldReplaceRecord(existingRecord, nextRecord, sourcePriority)) {
      return existingRecord;
    }

    cache.set(record.jobId, nextRecord);
    return nextRecord;
  }

  function shouldRefresh(record) {
    if (!record) {
      return false;
    }

    if (record.status !== reposted && record.status !== notReposted) {
      return false;
    }

    return RM.cachePolicy.shouldRefresh(record, RM.constants);
  }

  RM.cache = {
    get,
    set,
    shouldRefresh
  };
})(window);
