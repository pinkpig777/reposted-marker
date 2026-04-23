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
      if (!message || message.type !== messageType.jobStatusResult) {
        return;
      }

      handleJobStatusResult(message.payload);
    });
  }

  RM.messaging = {
    startMessageListener
  };
})(window);
