(function initPrefetch(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { error, rateLimited } = RM.constants.status;
  const { minIntervalMs } = RM.constants.prefetch;
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
    if (!jobData || !card || isPrefetchQueued(card) || isCoolingDown(jobData, card)) {
      return;
    }

    setPrefetchQueued(card, true);

    chrome.runtime.sendMessage({
      type: messageType.prefetchJob,
      payload: {
        jobId: jobData.jobId,
        url: jobData.url
      }
    }, () => {
      if (chrome.runtime.lastError) {
        setPrefetchQueued(card, false);
      }
    });
  }

  RM.prefetch = {
    queueJob
  };
})(window);
