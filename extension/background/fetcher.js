(function initBackgroundFetcher(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});
  const requestTimeoutMs = 15000;

  function normalizeText(text) {
    return String(text || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

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

  async function fetchJobStatus(task) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, requestTimeoutMs);

    try {
      const response = await fetch(task.url, {
        credentials: "include",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMillis(response.headers.get("retry-after")) || (60 * 60 * 1000);
        globalScope.RepostedMarker.debugLog.log("prefetch_rate_limited", {
          jobId: task.jobId,
          retryAfterMs
        });
        return {
          jobId: task.jobId,
          url: task.url,
          status: "rate_limited",
          source: "prefetch",
          timestamp: Date.now(),
          nextRetryAt: Date.now() + retryAfterMs
        };
      }

      if (!response.ok) {
        globalScope.RepostedMarker.debugLog.log("prefetch_http_error", {
          jobId: task.jobId,
          statusCode: response.status
        });
        return {
          jobId: task.jobId,
          url: task.url,
          status: "error",
          source: "prefetch",
          timestamp: Date.now(),
          nextRetryAt: Date.now() + (30 * 60 * 1000)
        };
      }

      const html = await response.text();
      const normalized = normalizeText(html);
      const detectedStatus = /\breposted\b/i.test(normalized) ? "reposted" : "not_reposted";
      globalScope.RepostedMarker.debugLog.log("prefetch_completed", {
        jobId: task.jobId,
        status: detectedStatus
      });

      return {
        jobId: task.jobId,
        url: task.url,
        status: detectedStatus,
        source: "prefetch",
        timestamp: Date.now()
      };
    } catch (_error) {
      clearTimeout(timeoutId);
      globalScope.RepostedMarker.debugLog.log("prefetch_exception", {
        jobId: task.jobId
      });
      return {
        jobId: task.jobId,
        url: task.url,
        status: "error",
        source: "prefetch",
        timestamp: Date.now(),
        nextRetryAt: Date.now() + (30 * 60 * 1000)
      };
    }
  }

  RM.fetcher = {
    fetchJobStatus
  };
})(self);
