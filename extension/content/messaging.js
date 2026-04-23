(function initMessaging(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { clearStatus, setStatus } = RM.styler;
  const { findDetailPanel, getCurrentDetailJobId, rememberRecord } = RM.scanner;
  const { setPrefetchQueuedForJob } = RM.cardRegistry;

  function handleJobStatusResult(payload) {
    if (!payload || !payload.jobId) {
      return;
    }

    RM.debugLog.log("job_status_result_received", {
      jobId: payload.jobId,
      status: payload.status,
      source: payload.source
    });
    setPrefetchQueuedForJob(payload.jobId, false);
    const record = rememberRecord(payload);
    const settings = RM.settings.getSnapshot();

    if (!settings.enabled || !record || record.jobId !== getCurrentDetailJobId()) {
      return;
    }

    const detailPanel = findDetailPanel();
    if (!detailPanel) {
      return;
    }

    if (settings.markDetailPanel) {
      setStatus(detailPanel, record.status, true, record.source);
      return;
    }

    clearStatus(detailPanel, true);
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
        RM.debugLog.log("job_prefetch_released", {
          jobId: message.payload.jobId
        });
        setPrefetchQueuedForJob(message.payload.jobId, false);
      }
    });
  }

  RM.messaging = {
    startMessageListener
  };
})(window);
