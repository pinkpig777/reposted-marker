(function initBackgroundFetcher(globalScope) {
  const RM = (globalScope.RepostedMarkerBackground = globalScope.RepostedMarkerBackground || {});

  function normalizeText(text) {
    return String(text || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  async function fetchJobStatus(task) {
    try {
      const response = await fetch(task.url, {
        credentials: "include"
      });

      if (!response.ok) {
        return {
          jobId: task.jobId,
          url: task.url,
          status: "error",
          source: "prefetch",
          timestamp: Date.now()
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
      return {
        jobId: task.jobId,
        url: task.url,
        status: "error",
        source: "prefetch",
        timestamp: Date.now()
      };
    }
  }

  RM.fetcher = {
    fetchJobStatus
  };
})(self);
