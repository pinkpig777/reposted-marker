(function initJobId(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function extractNumericId(value) {
    const normalized = String(value || "").trim();
    return /^\d+$/.test(normalized) ? normalized : null;
  }

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
    const jobId = extractJobIdFromElement(anchor) || extractJobIdFromUrl(url);

    if (!jobId || !url) {
      return null;
    }

    return {
      jobId,
      url
    };
  }

  function extractJobIdFromElement(element) {
    if (!element || !(element instanceof Element)) {
      return null;
    }

    const candidateAttributes = [
      "data-job-id",
      "data-entity-urn",
      "data-occludable-job-id",
      "data-job-urn"
    ];

    for (const attribute of candidateAttributes) {
      const value = element.getAttribute(attribute);
      const directId = extractNumericId(value);
      if (directId) {
        return directId;
      }

      const urnMatch = String(value || "").match(/(\d{6,})/);
      if (urnMatch) {
        return urnMatch[1];
      }
    }

    if (element instanceof HTMLAnchorElement) {
      const hrefId = extractJobIdFromUrl(element.href || element.getAttribute("href"));
      if (hrefId) {
        return hrefId;
      }
    }

    return null;
  }

  function extractJobIdFromNodeTree(element) {
    if (!element || !(element instanceof Element)) {
      return null;
    }

    let current = element;
    while (current && current !== document.body) {
      const currentId = extractJobIdFromElement(current);
      if (currentId) {
        return currentId;
      }

      const linkedAnchor = current.querySelector && current.querySelector('a[href*="/jobs/view/"], a[href*="currentJobId="]');
      const anchorId = extractJobIdFromElement(linkedAnchor);
      if (anchorId) {
        return anchorId;
      }

      current = current.parentElement;
    }

    return null;
  }

  RM.jobId = {
    extractJobIdFromElement,
    extractJobIdFromNodeTree,
    extractJobIdFromUrl,
    getJobDataFromAnchor,
    toAbsoluteJobUrl
  };
})(window);
