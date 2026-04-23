(function initPrefetch(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { error, rateLimited } = RM.constants.status;
  const {
    minIntervalMs,
    windowAbovePx,
    windowBelowPx,
    maxViewportPrefetch,
    staleRefreshLimit
  } = RM.constants.prefetch;
  const { getLastQueuedAt, isPrefetchQueued, setPrefetchQueued } = RM.cardRegistry;

  function isCoolingDown(jobData, card) {
    const cachedRecord = RM.cache.get(jobData.jobId);
    if (cachedRecord && (cachedRecord.status === error || cachedRecord.status === rateLimited)) {
      return true;
    }

    const lastQueuedAt = getLastQueuedAt(card);
    return Date.now() - lastQueuedAt < minIntervalMs;
  }

  function queueJob(jobData, card) {
    return queueJobWithOptions(jobData, card, {});
  }

  function getCardDistanceFromViewport(card) {
    const rect = card.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.bottom >= 0 && rect.top <= viewportHeight) {
      return 0;
    }

    if (rect.top > viewportHeight) {
      return rect.top - viewportHeight;
    }

    return Math.abs(rect.bottom);
  }

  function isCardInPrefetchWindow(card) {
    if (!card) {
      return false;
    }

    const settings = RM.settings.getSnapshot();
    const rect = card.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const belowPx = Math.max(settings.prefetchWindowSize || windowBelowPx, 0);
    const abovePx = Math.max(Math.round(belowPx / 4), windowAbovePx);

    return rect.bottom >= -abovePx && rect.top <= viewportHeight + belowPx;
  }

  function queueJobWithOptions(jobData, card, options) {
    if (!jobData || !card || isPrefetchQueued(card) || isCoolingDown(jobData, card)) {
      return false;
    }

    setPrefetchQueued(card, true);

    chrome.runtime.sendMessage({
      type: messageType.prefetchJob,
      payload: {
        jobId: jobData.jobId,
        url: jobData.url,
        priority: options.priority || 0,
        forceRefresh: Boolean(options.forceRefresh)
      }
    }, () => {
      if (chrome.runtime.lastError) {
        setPrefetchQueued(card, false);
      }
    });

    return true;
  }

  function queueCandidates(candidates) {
    const settings = RM.settings.getSnapshot();
    if (!settings.prefetchEnabled) {
      return;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return;
    }

    const inWindow = candidates
      .filter((candidate) => candidate && candidate.card && candidate.jobData && isCardInPrefetchWindow(candidate.card))
      .map((candidate) => {
        return {
          ...candidate,
          priority: getCardDistanceFromViewport(candidate.card)
        };
      })
      .sort((left, right) => left.priority - right.priority);

    let staleRefreshCount = 0;
    let queuedCount = 0;

    for (const candidate of inWindow) {
      if (queuedCount >= maxViewportPrefetch) {
        break;
      }

      if (candidate.forceRefresh) {
        if (staleRefreshCount >= staleRefreshLimit) {
          continue;
        }
      }

      const queued = queueJobWithOptions(candidate.jobData, candidate.card, candidate);
      if (!queued) {
        continue;
      }

      if (candidate.forceRefresh) {
        staleRefreshCount += 1;
      }

      queuedCount += 1;
    }
  }

  RM.prefetch = {
    queueCandidates,
    queueJob
  };
})(window);
