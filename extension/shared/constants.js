(function initConstants(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  RM.constants = {
    status: {
      reposted: "reposted",
      notReposted: "not_reposted",
      unknown: "unknown",
      loading: "loading",
      error: "error",
      rateLimited: "rate_limited"
    },
    source: {
      cardDom: "card_dom",
      detailDom: "detail_dom",
      prefetch: "prefetch"
    },
    sourcePriority: {
      card_dom: 1,
      detail_dom: 2,
      prefetch: 3
    },
    messageType: {
      prefetchJob: "PREFETCH_JOB",
      jobStatusResult: "JOB_STATUS_RESULT",
      jobPrefetchReleased: "JOB_PREFETCH_RELEASED"
    },
    attributes: {
      status: "data-rm-status",
      scanned: "data-rm-scanned",
      detailStatus: "data-rm-detail-status",
      jobId: "data-rm-job-id",
      source: "data-rm-source"
    },
    classes: {
      reposted: "rm-reposted",
      detailReposted: "rm-detail-reposted"
    },
    selectors: {
      jobAnchors: 'a[href*="/jobs/view/"], a[href*="currentJobId="]',
      mainRegion: "main",
      detailCandidates: [
        ".jobs-search__job-details--container",
        '[data-job-detail-container]',
        '[aria-label*="job details" i]',
        ".job-view-layout",
        ".scaffold-layout__detail"
      ]
    },
    timing: {
      scanDebounceMs: 150,
      scrollDebounceMs: 100,
      routePollMs: 500,
      cacheTtlMs: 24 * 60 * 60 * 1000,
      staleRefreshMs: 12 * 60 * 60 * 1000,
      errorRetryMs: 30 * 60 * 1000,
      rateLimitRetryMs: 60 * 60 * 1000
    },
    prefetch: {
      maxConcurrency: 1,
      minIntervalMs: 2000,
      requestTimeoutMs: 15000,
      windowAbovePx: 200,
      windowBelowPx: 900,
      maxViewportPrefetch: 12,
      staleRefreshLimit: 3
    }
  };
})(window);
