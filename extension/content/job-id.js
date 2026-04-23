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
    const rawUrl = String(url || "");
    const pathMatch = rawUrl.match(/\/jobs\/view\/(\d+)/i);
    if (pathMatch) {
      return pathMatch[1];
    }

    try {
      const parsedUrl = new URL(rawUrl, window.location.origin);
      const currentJobId = parsedUrl.searchParams.get("currentJobId");
      if (currentJobId && /^\d+$/.test(currentJobId)) {
        return currentJobId;
      }
    } catch (_error) {
      return null;
    }

    return null;
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
