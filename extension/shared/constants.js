(function initConstants(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  RM.constants = {
    attributes: {
      status: "data-rm-status",
      scanned: "data-rm-scanned",
      detailStatus: "data-rm-detail-status"
    },
    classes: {
      reposted: "rm-reposted",
      detailReposted: "rm-detail-reposted"
    },
    selectors: {
      jobAnchors: 'a[href*="/jobs/view/"]',
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
      routePollMs: 500
    }
  };
})(window);
