(function initJobId(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function toAbsoluteJobUrl(url) {
    if (!url) {
      return null;
    }

    try {
      return new URL(url, window.location.origin).toString();
    } catch (_error) {
      return null;
    }
  }

  function extractJobIdFromUrl(url) {
    const match = String(url || "").match(/\/jobs\/view\/(\d+)/i);
    return match ? match[1] : null;
  }

  function getJobDataFromAnchor(anchor) {
    if (!anchor) {
      return null;
    }

    const url = toAbsoluteJobUrl(anchor.getAttribute("href"));
    const jobId = extractJobIdFromUrl(url);

    if (!jobId || !url) {
      return null;
    }

    return {
      jobId,
      url
    };
  }

  RM.jobId = {
    extractJobIdFromUrl,
    getJobDataFromAnchor,
    toAbsoluteJobUrl
  };
})(window);
