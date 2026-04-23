(function initMessaging(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { setStatus } = RM.styler;
  const { findDetailPanel, getCurrentDetailJobId, rememberRecord } = RM.scanner;
  const { setPrefetchQueuedForJob } = RM.cardRegistry;

  function handleJobStatusResult(payload) {
    if (!payload || !payload.jobId) {
      return;
    }

    setPrefetchQueuedForJob(payload.jobId, false);
    const record = rememberRecord(payload);

    if (!record || record.jobId !== getCurrentDetailJobId()) {
      return;
    }

    const detailPanel = findDetailPanel();
    if (!detailPanel) {
      return;
    }

    setStatus(detailPanel, record.status, true, record.source);
  }

  function startMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message) {
        return;
      }

      if (message.type === messageType.jobStatusResult) {
        handleJobStatusResult(message.payload);
        return;
      }

      if (message.type === messageType.jobPrefetchReleased && message.payload && message.payload.jobId) {
        setPrefetchQueuedForJob(message.payload.jobId, false);
      }
    });
  }

  RM.messaging = {
    startMessageListener
  };
})(window);
