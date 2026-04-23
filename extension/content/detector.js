(function initDetector(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { normalizeText } = RM.utils;

  function extractVisibleText(element) {
    if (!element) {
      return "";
    }

    return normalizeText(element.innerText || element.textContent || "");
  }

  function detectReposted(text) {
    return /\breposted\b/i.test(String(text || ""));
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
