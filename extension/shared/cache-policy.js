(function initCachePolicy(globalScope) {
  const namespace = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function getNumber(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function getRetryWindowMs(status, settings, constants) {
    const errorRetryMinutes = getNumber(settings.errorRetryMinutes, 30);
    const rateLimitRetryMinutes = getNumber(settings.rateLimitRetryMinutes, 60);

    if (status === "rate_limited") {
      return rateLimitRetryMinutes * 60 * 1000;
    }

    if (status === "error") {
      return errorRetryMinutes * 60 * 1000;
    }

    return 0;
  }

  function getTtlMs(record, settings, constants) {
    if (!record) {
      return 0;
    }

    const cacheTtlHours = getNumber(settings.cacheTTLHours, 24);
    const cacheTtlMs = cacheTtlHours * 60 * 60 * 1000;
    if (record.nextRetryAt) {
      return Math.max(getNumber(record.nextRetryAt, 0) - getNumber(record.timestamp, Date.now()), 0);
    }

    return getRetryWindowMs(record.status, settings, constants) || cacheTtlMs;
  }

  function isFresh(record, settings, constants) {
    if (!record || !record.timestamp) {
      return false;
    }

    return Date.now() - record.timestamp < getTtlMs(record, settings, constants);
  }

  function shouldRefresh(record, constants) {
    if (!record) {
      return false;
    }

    const staleRefreshMs = getNumber(constants && constants.timing && constants.timing.staleRefreshMs, 12 * 60 * 60 * 1000);
    if (record.status !== "reposted" && record.status !== "not_reposted") {
      return false;
    }

    return Date.now() - getNumber(record.timestamp, 0) >= staleRefreshMs;
  }

  function isValidStatus(status) {
    return status === "reposted" || status === "not_reposted";
  }

  function getPriority(source, sourcePriority) {
    return getNumber(sourcePriority && sourcePriority[source], 0);
  }

  function shouldReplaceRecord(existingRecord, nextRecord, sourcePriority) {
    if (!existingRecord) {
      return true;
    }

    if (!nextRecord) {
      return false;
    }

    const existingStatus = existingRecord.status;
    const nextStatus = nextRecord.status;
    const existingTs = getNumber(existingRecord.timestamp, 0);
    const nextTs = getNumber(nextRecord.timestamp, Date.now());

    if (nextStatus === "unknown") {
      return !isValidStatus(existingStatus) && nextTs >= existingTs;
    }

    if ((nextStatus === "error" || nextStatus === "rate_limited") && isValidStatus(existingStatus)) {
      return false;
    }

    const existingPriority = getPriority(existingRecord.source, sourcePriority);
    const nextPriority = getPriority(nextRecord.source, sourcePriority);

    if (nextPriority > existingPriority) {
      return true;
    }

    if (nextTs > existingTs && nextPriority >= existingPriority) {
      return true;
    }

    return false;
  }

  namespace.cachePolicy = {
    getTtlMs,
    isFresh,
    shouldRefresh,
    shouldReplaceRecord
  };
})(globalThis);
