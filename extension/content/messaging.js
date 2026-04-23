(function initMessaging(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { messageType } = RM.constants;
  const { setPrefetchQueuedForJob } = RM.cardRegistry;
  let lastManualRescanAt = 0;
  const rescanCooldownMs = 1000;

  function handleJobStatusResult(payload) {
    const validation = RM.contracts.validateJobStatusPayload(payload);
    if (!validation.ok) {
      return;
    }

    const recordPayload = validation.value;

    RM.debugLog.log("job_status_result_received", {
      jobId: recordPayload.jobId,
      status: recordPayload.status,
      source: recordPayload.source
    });
    setPrefetchQueuedForJob(recordPayload.jobId, false);
    RM.scanner.applyBackgroundResult(recordPayload);
  }

  function handleRescanRequest() {
    if (Date.now() - lastManualRescanAt < rescanCooldownMs) {
      return;
    }

    lastManualRescanAt = Date.now();
    RM.scanner.scanPage();
    RM.debugLog.log("manual_rescan_triggered", {
      path: window.location.pathname
    });
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
        return;
      }

      if (message.type === messageType.rescanPage) {
        handleRescanRequest();
      }
    });
  }

  RM.messaging = {
    startMessageListener
  };
})(window);
