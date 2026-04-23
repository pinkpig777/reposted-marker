(function initPrefetch(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { isPrefetchQueued, setPrefetchQueued } = RM.cardRegistry;

  function queueJob(jobData, card) {
    if (!jobData || !card || isPrefetchQueued(card)) {
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
