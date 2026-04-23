(function initBackgroundFetcher(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const shared = globalScope.RepostedMarker;

  function parseRetryAfterMillis(headerValue) {
    if (!headerValue) {
      return null;
    }

    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryDateMs = Date.parse(headerValue);
    if (!Number.isNaN(retryDateMs)) {
      return Math.max(retryDateMs - Date.now(), 0);
    }

    return null;
  }

  function getRetryMs(status) {
    const settings = shared.settings.getSnapshot();
    if (status === "rate_limited") {
      return settings.rateLimitRetryMinutes * 60 * 1000;
    }

    return settings.errorRetryMinutes * 60 * 1000;
  }

  async function fetchJobStatus(task) {
    const validation = shared.contracts.validatePrefetchPayload(task);
    if (!validation.ok) {
      return {
        jobId: task && task.jobId ? String(task.jobId) : "",
        nextRetryAt: Date.now() + getRetryMs("error"),
        source: "prefetch",
        status: "error",
        timestamp: Date.now(),
        url: task && task.url ? String(task.url) : null
      };
    }

    const normalizedTask = validation.value;
    const settings = shared.settings.getSnapshot();
    const requestTimeoutMs = settings.fetchTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, requestTimeoutMs);

    try {
      const response = await fetch(normalizedTask.url, {
        credentials: "include",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMillis(response.headers.get("retry-after")) || getRetryMs("rate_limited");
        shared.debugLog.log("prefetch_rate_limited", {
          jobId: normalizedTask.jobId,
          retryAfterMs
        });
        return {
          jobId: normalizedTask.jobId,
          url: normalizedTask.url,
          status: "rate_limited",
          source: "prefetch",
          timestamp: Date.now(),
          nextRetryAt: Date.now() + retryAfterMs
        };
      }

      if (!response.ok) {
        shared.debugLog.log("prefetch_http_error", {
          jobId: normalizedTask.jobId,
          statusCode: response.status
        });
        return {
          jobId: normalizedTask.jobId,
          url: normalizedTask.url,
          status: "error",
          source: "prefetch",
          timestamp: Date.now(),
          nextRetryAt: Date.now() + getRetryMs("error")
        };
      }

      const html = await response.text();
      const normalized = shared.utils.normalizeText(html, { stripHtml: true });
      const detectedStatus = /\breposted\b/i.test(normalized) ? "reposted" : "not_reposted";
      shared.debugLog.log("prefetch_completed", {
        jobId: normalizedTask.jobId,
        status: detectedStatus
      });

      return {
        jobId: normalizedTask.jobId,
        url: normalizedTask.url,
        status: detectedStatus,
        source: "prefetch",
        timestamp: Date.now()
      };
    } catch (_error) {
      clearTimeout(timeoutId);
      shared.debugLog.log("prefetch_exception", {
        jobId: normalizedTask.jobId
      });
      return {
        jobId: normalizedTask.jobId,
        url: normalizedTask.url,
        status: "error",
        source: "prefetch",
        timestamp: Date.now(),
        nextRetryAt: Date.now() + getRetryMs("error")
      };
    }
  }

  RM.fetcher = {
    fetchJobStatus
  };
})(self);
