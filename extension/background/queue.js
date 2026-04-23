(function initBackgroundQueue(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  const maxConcurrency = 3;
  const pendingTasks = [];
  const pendingByJobId = new Map();
  const activeByJobId = new Map();
  let activeCount = 0;

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

    const fetchedRecord = await RM.fetcher.fetchJobStatus(task);
    const storedRecord = await RM.cache.set(fetchedRecord);
    broadcastResult(task, storedRecord);
  }

  function schedule() {
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
