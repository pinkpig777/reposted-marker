(function initScanner(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { attributes, selectors } = RM.constants;
  const { detectRepostedFromElement, extractVisibleText } = RM.detector;
  const { setStatus } = RM.styler;

  function isElementVisible(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isLikelyJobCard(element, anchor) {
    if (!element || !anchor) {
      return false;
    }

    const text = extractVisibleText(element);
    if (text.length < 20 || text.length > 1200) {
      return false;
    }

    if (!element.contains(anchor)) {
      return false;
    }

    const anchorCount = element.querySelectorAll(selectors.jobAnchors).length;
    return anchorCount >= 1 && anchorCount <= 6;
  }

  function findJobCardContainer(anchor) {
    if (!anchor) {
      return null;
    }

    const listItem = anchor.closest("li");
    if (isLikelyJobCard(listItem, anchor)) {
      return listItem;
    }

    let current = anchor;
    const mainRegion = document.querySelector(selectors.mainRegion);

    while (current && current !== document.body && current !== mainRegion) {
      if (isLikelyJobCard(current, anchor)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function findDetailPanel() {
    for (const selector of selectors.detailCandidates) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const visibleCandidate = candidates.find((candidate) => {
        if (!isElementVisible(candidate)) {
          return false;
        }

        return extractVisibleText(candidate).length > 80;
      });

      if (visibleCandidate) {
        return visibleCandidate;
      }
    }

    return null;
  }

  function scanJobCards() {
    const anchors = Array.from(document.querySelectorAll(selectors.jobAnchors));
    const visitedCards = new Set();

    for (const anchor of anchors) {
      const card = findJobCardContainer(anchor);
      if (!card || visitedCards.has(card)) {
        continue;
      }

      visitedCards.add(card);
      card.setAttribute(attributes.scanned, "true");

      const status = detectRepostedFromElement(card) ? "reposted" : "unknown";
      setStatus(card, status, false);
    }
  }

  function scanDetailPanel() {
    const detailPanel = findDetailPanel();
    if (!detailPanel) {
      return;
    }

    const status = detectRepostedFromElement(detailPanel) ? "reposted" : "unknown";
    setStatus(detailPanel, status, true);
  }

  function scanPage() {
    scanJobCards();
    scanDetailPanel();
  }

  RM.scanner = {
    findDetailPanel,
    findJobCardContainer,
    scanPage
  };
})(window);
