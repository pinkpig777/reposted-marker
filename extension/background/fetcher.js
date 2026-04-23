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

      return {
        jobId: task.jobId,
        url: task.url,
        status: /\breposted\b/i.test(normalized) ? "reposted" : "not_reposted",
        source: "prefetch",
        timestamp: Date.now()
      };
    } catch (_error) {
      clearTimeout(timeoutId);
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
