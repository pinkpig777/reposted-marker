(function initDetector(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { normalizeText } = RM.utils;
  const repostedPatterns = [
    /\breposted\b/i,
    /reposted\s+\d+\s+(hour|day|week|month|year)s?\s+ago/i,
    /last\s+posted\b/i,
    /originally\s+posted\b/i
  ];

  function extractVisibleText(element) {
    if (!element) {
      return "";
    }

    return normalizeText(element.innerText || element.textContent || "");
  }

  function detectReposted(text) {
    const normalizedText = String(text || "");
    return repostedPatterns.some((pattern) => pattern.test(normalizedText));
  }

  function detectRepostedFromElement(element) {
    return detectReposted(extractVisibleText(element));
  }

  RM.detector = {
    detectReposted,
    detectRepostedFromElement,
    extractVisibleText
  };
})(window);
