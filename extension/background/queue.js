(function initBackgroundQueue(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  const maxConcurrency = 1;
  const minIntervalMs = 4000;
  const pendingTasks = [];
  const pendingByJobId = new Map();
  const activeByJobId = new Map();
  let activeCount = 0;
  let queuePausedUntil = 0;
  let lastRequestAt = 0;
  let resumeTimerId = null;

  function mergeTabId(task, tabId) {
    if (Number.isInteger(tabId)) {
      task.tabIds.add(tabId);
    }
  }

  function broadcastResult(task, record) {
    for (const tabId of task.tabIds) {
      chrome.tabs.sendMessage(tabId, {
        type: "JOB_STATUS_RESULT",
        payload: record
      }).catch(() => {});
    }
  }

  async function processTask(task) {
    const cachedRecord = await RM.cache.get(task.jobId);
    if (cachedRecord) {
      broadcastResult(task, cachedRecord);
      return;
    }

    const waitMs = Math.max((lastRequestAt + minIntervalMs) - Date.now(), 0);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    lastRequestAt = Date.now();
    const fetchedRecord = await RM.fetcher.fetchJobStatus(task);
    const storedRecord = await RM.cache.set(fetchedRecord);

    if (storedRecord && storedRecord.status === "rate_limited") {
      queuePausedUntil = Math.max(queuePausedUntil, storedRecord.nextRetryAt || 0);
    }

    broadcastResult(task, storedRecord);
  }

  function scheduleResume() {
    if (resumeTimerId || queuePausedUntil <= Date.now()) {
      return;
    }

    resumeTimerId = setTimeout(() => {
      resumeTimerId = null;
      schedule();
    }, Math.max(queuePausedUntil - Date.now(), 0));
  }

  function schedule() {
    if (queuePausedUntil > Date.now()) {
      scheduleResume();
      return;
    }

    while (activeCount < maxConcurrency && pendingTasks.length > 0) {
      const task = pendingTasks.shift();
      pendingByJobId.delete(task.jobId);
      activeByJobId.set(task.jobId, task);
      activeCount += 1;

      processTask(task)
        .catch(() => {})
        .finally(() => {
          activeByJobId.delete(task.jobId);
          activeCount -= 1;
          schedule();
        });
    }
  }

  function enqueue(task, tabId) {
    const existingTask = pendingByJobId.get(task.jobId);
    if (existingTask) {
      mergeTabId(existingTask, tabId);
      return;
    }

    const activeTask = activeByJobId.get(task.jobId);
    if (activeTask) {
      mergeTabId(activeTask, tabId);
      return;
    }

    const nextTask = {
      jobId: task.jobId,
      url: task.url,
      tabIds: new Set()
    };

    mergeTabId(nextTask, tabId);
    pendingByJobId.set(nextTask.jobId, nextTask);
    pendingTasks.push(nextTask);
    schedule();
  }

  RM.queue = {
    enqueue
  };
})(self);
