(function initBackgroundQueue(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  const minIntervalMs = 4000;
  const maxPendingTasks = 24;
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

  function broadcastRelease(task) {
    for (const tabId of task.tabIds) {
      chrome.tabs.sendMessage(tabId, {
        type: "JOB_PREFETCH_RELEASED",
        payload: {
          jobId: task.jobId
        }
      }).catch(() => {});
    }
  }

  function compareTasks(left, right) {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.enqueuedAt - right.enqueuedAt;
  }

  function sortPendingTasks() {
    pendingTasks.sort(compareTasks);
  }

  function trimPendingTasks() {
    while (pendingTasks.length > maxPendingTasks) {
      const droppedTask = pendingTasks.pop();
      if (droppedTask) {
        pendingByJobId.delete(droppedTask.jobId);
        broadcastRelease(droppedTask);
      }
    }
  }

  function releasePendingTasks() {
    while (pendingTasks.length > 0) {
      const pendingTask = pendingTasks.pop();
      pendingByJobId.delete(pendingTask.jobId);
      broadcastRelease(pendingTask);
    }
  }

  async function processTask(task) {
    const settings = globalScope.RepostedMarker.settings.getSnapshot();
    if (!settings.enabled || !settings.prefetchEnabled) {
      broadcastRelease(task);
      return;
    }

    let cachedRecord = null;

    if (!task.forceRefresh) {
      cachedRecord = await RM.cache.get(task.jobId);
      if (cachedRecord) {
        broadcastResult(task, cachedRecord);
        return;
      }
    }

    if (queuePausedUntil > Date.now()) {
      return;
    }

    const waitMs = Math.max((lastRequestAt + minIntervalMs) - Date.now(), 0);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (queuePausedUntil > Date.now()) {
      return;
    }

    lastRequestAt = Date.now();
    const fetchedRecord = await RM.fetcher.fetchJobStatus(task);
    const storedRecord = await RM.cache.set(fetchedRecord);

    if (storedRecord && storedRecord.status === "rate_limited") {
      queuePausedUntil = Math.max(queuePausedUntil, storedRecord.nextRetryAt || 0);
    }

    if (storedRecord) {
      broadcastResult(task, storedRecord);
      return;
    }

    if (cachedRecord) {
      broadcastResult(task, cachedRecord);
      return;
    }

    broadcastRelease(task);
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
    const settings = globalScope.RepostedMarker.settings.getSnapshot();
    const maxConcurrency = settings.maxPrefetchConcurrency;

    if (!settings.enabled || !settings.prefetchEnabled) {
      releasePendingTasks();
      return;
    }

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
    const settings = globalScope.RepostedMarker.settings.getSnapshot();
    if (!settings.enabled || !settings.prefetchEnabled) {
      return;
    }

    const existingTask = pendingByJobId.get(task.jobId);
    if (existingTask) {
      mergeTabId(existingTask, tabId);
      existingTask.priority = Math.min(existingTask.priority, task.priority || 0);
      existingTask.forceRefresh = existingTask.forceRefresh || Boolean(task.forceRefresh);
      sortPendingTasks();
      return;
    }

    const activeTask = activeByJobId.get(task.jobId);
    if (activeTask) {
      mergeTabId(activeTask, tabId);
      activeTask.priority = Math.min(activeTask.priority, task.priority || 0);
      activeTask.forceRefresh = activeTask.forceRefresh || Boolean(task.forceRefresh);
      return;
    }

    const nextTask = {
      enqueuedAt: Date.now(),
      forceRefresh: Boolean(task.forceRefresh),
      jobId: task.jobId,
      priority: task.priority || 0,
      url: task.url,
      tabIds: new Set()
    };

    mergeTabId(nextTask, tabId);
    pendingByJobId.set(nextTask.jobId, nextTask);
    pendingTasks.push(nextTask);
    sortPendingTasks();
    trimPendingTasks();
    schedule();
  }

  RM.queue = {
    enqueue
  };
})(self);
