(function initScanner(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { attributes, selectors, source, status } = RM.constants;
  const { detectRepostedFromElement, extractVisibleText } = RM.detector;
  const { getJobDataFromAnchor, extractJobIdFromUrl } = RM.jobId;
  const { setStatus } = RM.styler;
  const { registerCard, getCards } = RM.cardRegistry;
  const cache = RM.cache;

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

  function getCurrentDetailJobId() {
    return extractJobIdFromUrl(window.location.href);
  }

  function applyRecordToCard(card, record) {
    if (!card || !record) {
      return;
    }

    setStatus(card, record.status, false, record.source);
  }

  function applyRecordToRegisteredCards(record) {
    if (!record || !record.jobId) {
      return;
    }

    const cards = getCards(record.jobId);
    for (const card of cards) {
      applyRecordToCard(card, record);
    }
  }

  function rememberRecord(record) {
    const storedRecord = cache.set(record);
    applyRecordToRegisteredCards(storedRecord);
    return storedRecord;
  }

  function scanJobCards() {
    const anchors = Array.from(document.querySelectorAll(selectors.jobAnchors));
    const visitedCards = new Set();
    const prefetchCandidates = [];

    for (const anchor of anchors) {
      const jobData = getJobDataFromAnchor(anchor);
      const card = findJobCardContainer(anchor);
      if (!card || !jobData || visitedCards.has(card)) {
        continue;
      }

      visitedCards.add(card);
      card.setAttribute(attributes.scanned, "true");
      card.setAttribute(attributes.jobId, jobData.jobId);
      registerCard(jobData.jobId, card);

      const cachedRecord = cache.get(jobData.jobId);
      if (cachedRecord) {
        applyRecordToCard(card, cachedRecord);

        if (cache.shouldRefresh(cachedRecord)) {
          prefetchCandidates.push({
            card,
            forceRefresh: true,
            jobData
          });
        }

        continue;
      }

      if (detectRepostedFromElement(card)) {
        rememberRecord({
          jobId: jobData.jobId,
          url: jobData.url,
          status: status.reposted,
          source: source.cardDom,
          timestamp: Date.now()
        });
        continue;
      }

      setStatus(card, status.unknown, false, source.cardDom);
      prefetchCandidates.push({
        card,
        forceRefresh: false,
        jobData
      });
    }

    RM.prefetch.queueCandidates(prefetchCandidates);
  }

  function scanDetailPanel() {
    const detailPanel = findDetailPanel();
    if (!detailPanel) {
      return;
    }

    const jobId = getCurrentDetailJobId();
    const detailStatus = detectRepostedFromElement(detailPanel)
      ? status.reposted
      : status.notReposted;

    setStatus(detailPanel, detailStatus, true, source.detailDom);

    if (!jobId) {
      return;
    }

    rememberRecord({
      jobId,
      url: window.location.href,
      status: detailStatus,
      source: source.detailDom,
      timestamp: Date.now()
    });
  }

  function scanPage() {
    scanJobCards();
    scanDetailPanel();
  }

  RM.scanner = {
    applyRecordToRegisteredCards,
    findDetailPanel,
    findJobCardContainer,
    getCurrentDetailJobId,
    rememberRecord,
    scanPage
  };
})(window);
