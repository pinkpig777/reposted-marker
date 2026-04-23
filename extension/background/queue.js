(function initBackgroundQueue(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const shared = globalScope.RepostedMarker;
  const { messageType } = shared.constants;

  const pendingTasks = [];
  const pendingByJobId = new Map();
  const activeByJobId = new Map();

  let activeCount = 0;
  let queuePausedUntil = 0;
  let queuePauseReason = null;
  let lastRequestAt = 0;
  let resumeTimerId = null;
  let scheduleQueued = false;

  function getSettings() {
    return shared.settings.getSnapshot();
  }

  function getMinIntervalMs() {
    const settings = getSettings();
    return Math.max(Number(settings.prefetchMinIntervalMs) || shared.constants.prefetch.minIntervalMs, 200);
  }

  function getMaxPendingTasks() {
    const settings = getSettings();
    return Math.max(Number(settings.queueMaxPendingTasks) || 24, 1);
  }

  function getMaxConcurrency() {
    const settings = getSettings();
    return Math.max(Number(settings.maxPrefetchConcurrency) || 1, 1);
  }

  function assertInvariants() {
    if (activeCount !== activeByJobId.size) {
      activeCount = activeByJobId.size;
    }
  }

  function mergeTabId(task, tabId) {
    if (Number.isInteger(tabId)) {
      task.tabIds.add(tabId);
    }
  }

  function notifyTab(tabId, message, eventName, details) {
    chrome.tabs.sendMessage(tabId, message).catch((error) => {
      shared.debugLog.log("prefetch_broadcast_failed", {
        error: error && error.message ? error.message : "unknown_error",
        eventName,
        tabId,
        ...(details || {})
      });
    });
  }

  function broadcastResult(task, record) {
    for (const tabId of task.tabIds) {
      notifyTab(tabId, {
        type: messageType.jobStatusResult,
        payload: record
      }, "JOB_STATUS_RESULT", {
        jobId: task.jobId
      });
    }
  }

  function broadcastRelease(task) {
    for (const tabId of task.tabIds) {
      notifyTab(tabId, {
        type: messageType.jobPrefetchReleased,
        payload: {
          jobId: task.jobId
        }
      }, "JOB_PREFETCH_RELEASED", {
        jobId: task.jobId
      });
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
    while (pendingTasks.length > getMaxPendingTasks()) {
      const droppedTask = pendingTasks.pop();
      if (droppedTask) {
        pendingByJobId.delete(droppedTask.jobId);
        shared.debugLog.log("prefetch_dropped", {
          jobId: droppedTask.jobId,
          reason: "queue_trim"
        });
        broadcastRelease(droppedTask);
      }
    }
  }

  function releasePendingTasks(reason) {
    while (pendingTasks.length > 0) {
      const pendingTask = pendingTasks.pop();
      pendingByJobId.delete(pendingTask.jobId);
      shared.debugLog.log("prefetch_released", {
        jobId: pendingTask.jobId,
        reason: reason || "settings_disabled"
      });
      broadcastRelease(pendingTask);
    }
  }

  function queueIsPaused() {
    return queuePausedUntil > Date.now();
  }

  function clearPauseIfExpired() {
    if (queuePausedUntil <= Date.now()) {
      queuePausedUntil = 0;
      queuePauseReason = null;
    }
  }

  function pauseQueue(untilMs, reason, task) {
    queuePausedUntil = Math.max(queuePausedUntil, untilMs || 0);
    queuePauseReason = reason || "rate_limited";
    shared.debugLog.log("prefetch_queue_paused", {
      jobId: task ? task.jobId : null,
      pausedUntil: queuePausedUntil,
      reason: queuePauseReason
    });
    scheduleResume();
  }

  function requeueTask(task, reason) {
    if (!task || pendingByJobId.has(task.jobId) || activeByJobId.has(task.jobId)) {
      return;
    }

    task.enqueuedAt = Date.now();
    pendingByJobId.set(task.jobId, task);
    pendingTasks.push(task);
    sortPendingTasks();
    trimPendingTasks();

    shared.debugLog.log("prefetch_requeued", {
      jobId: task.jobId,
      reason: reason || "retry_pending"
    });
  }

  async function processTask(task) {
    const settings = getSettings();
    if (!settings.enabled || !settings.prefetchEnabled) {
      shared.debugLog.log("prefetch_skipped", {
        jobId: task.jobId,
        reason: "settings_disabled"
      });
      broadcastRelease(task);
      return { action: "released" };
    }

    if (queueIsPaused()) {
      return {
        action: "requeue",
        reason: "queue_paused"
      };
    }

    let cachedRecord = null;
    if (!task.forceRefresh) {
      cachedRecord = await RM.cache.get(task.jobId);
      if (cachedRecord) {
        shared.debugLog.log("prefetch_cache_hit", {
          jobId: task.jobId,
          forceRefresh: false
        });
        broadcastResult(task, cachedRecord);
        return { action: "completed" };
      }
    }

    const waitMs = Math.max((lastRequestAt + getMinIntervalMs()) - Date.now(), 0);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (queueIsPaused()) {
      return {
        action: "requeue",
        reason: "queue_paused"
      };
    }

    lastRequestAt = Date.now();
    const fetchedRecord = await RM.fetcher.fetchJobStatus(task);
    const storedRecord = await RM.cache.set(fetchedRecord);

    if (storedRecord && storedRecord.status === "rate_limited") {
      pauseQueue(storedRecord.nextRetryAt || 0, "rate_limited", task);
    }

    if (storedRecord) {
      broadcastResult(task, storedRecord);
      return { action: "completed" };
    }

    if (cachedRecord) {
      broadcastResult(task, cachedRecord);
      return { action: "completed" };
    }

    broadcastRelease(task);
    return { action: "released" };
  }

  function scheduleResume() {
    clearPauseIfExpired();
    if (resumeTimerId || !queueIsPaused()) {
      return;
    }

    resumeTimerId = setTimeout(() => {
      resumeTimerId = null;
      requestSchedule();
    }, Math.max(queuePausedUntil - Date.now(), 0));
  }

  async function runTask(task) {
    let outcome = null;
    try {
      outcome = await processTask(task);
    } catch (error) {
      shared.debugLog.log("prefetch_task_failed", {
        jobId: task.jobId,
        message: error && error.message ? error.message : "unknown_error"
      });
      outcome = {
        action: "released"
      };
      broadcastRelease(task);
    } finally {
      activeByJobId.delete(task.jobId);
      activeCount -= 1;
      assertInvariants();

      if (outcome && outcome.action === "requeue") {
        requeueTask(task, outcome.reason);
      }

      requestSchedule();
    }
  }

  function scheduleNow() {
    scheduleQueued = false;
    const settings = getSettings();

    if (!settings.enabled || !settings.prefetchEnabled) {
      releasePendingTasks("settings_disabled");
      return;
    }

    clearPauseIfExpired();
    if (queueIsPaused()) {
      scheduleResume();
      return;
    }

    while (activeCount < getMaxConcurrency() && pendingTasks.length > 0) {
      const task = pendingTasks.shift();
      if (!task) {
        break;
      }

      pendingByJobId.delete(task.jobId);
      if (activeByJobId.has(task.jobId)) {
        continue;
      }

      activeByJobId.set(task.jobId, task);
      activeCount += 1;
      assertInvariants();

      runTask(task);
    }
  }

  function requestSchedule() {
    if (scheduleQueued) {
      return;
    }

    scheduleQueued = true;
    Promise.resolve().then(scheduleNow);
  }

  function getStatus() {
    clearPauseIfExpired();
    return {
      active: activeCount,
      pauseReason: queuePauseReason,
      paused: queueIsPaused(),
      pausedUntil: queueIsPaused() ? queuePausedUntil : null,
      pending: pendingTasks.length
    };
  }

  function clearPending(reason) {
    releasePendingTasks(reason || "manual_clear");
  }

  function enqueue(task, tabId) {
    const settings = getSettings();
    if (!settings.enabled || !settings.prefetchEnabled) {
      shared.debugLog.log("prefetch_enqueue_ignored", {
        jobId: task.jobId,
        reason: "settings_disabled"
      });
      return;
    }

    if (!task || !task.jobId || !task.url) {
      shared.debugLog.log("prefetch_enqueue_ignored", {
        reason: "task_invalid"
      });
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
    shared.debugLog.log("prefetch_enqueued", {
      jobId: nextTask.jobId,
      priority: nextTask.priority,
      forceRefresh: nextTask.forceRefresh,
      pendingCount: pendingTasks.length
    });
    sortPendingTasks();
    trimPendingTasks();
    requestSchedule();
  }

  RM.queue = {
    clearPending,
    enqueue,
    getStatus
  };
})(self);
