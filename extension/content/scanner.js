(function initScanner(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { attributes, selectors, source, status } = RM.constants;
  const { detectRepostedFromElement, extractVisibleText } = RM.detector;
  const { getJobDataFromAnchor, extractJobIdFromNodeTree, extractJobIdFromUrl } = RM.jobId;
  const { clearStatus, setStatus } = RM.styler;
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
    if (text.length < 20 || text.length > 2200) {
      return false;
    }

    if (!element.contains(anchor)) {
      return false;
    }

    const anchorCount = element.querySelectorAll(selectors.jobAnchors).length;
    const elementJobId = extractJobIdFromNodeTree(element);
    return (anchorCount >= 1 && anchorCount <= 8) || Boolean(elementJobId);
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

  function findDetailHeader(detailPanel) {
    if (!detailPanel) {
      return null;
    }

    const heading = detailPanel.querySelector("h1");
    if (!heading) {
      return detailPanel;
    }

    let current = heading;
    while (current && current !== detailPanel) {
      const text = extractVisibleText(current);
      const rect = current.getBoundingClientRect();
      if (detectRepostedFromElement(current) && rect.height > 40 && rect.height < 320) {
        return current;
      }

      if (text.includes("responses managed") || text.includes("over 100 people clicked apply")) {
        return current;
      }

      current = current.parentElement;
    }

    return heading.parentElement || detailPanel;
  }

  function extractDetailIdentity(detailPanel) {
    if (!detailPanel) {
      return null;
    }

    const title = RM.utils.normalizeText(
      (detailPanel.querySelector("h1") && detailPanel.querySelector("h1").textContent) || ""
    );

    let company = "";
    const text = extractVisibleText(detailPanel);
    const titleIndex = title ? text.indexOf(title) : -1;
    if (titleIndex >= 0) {
      const trailing = text.slice(titleIndex + title.length).trim();
      company = trailing.split(" reposted ")[0].split(" · ")[0].trim();
    }

    return {
      company,
      title
    };
  }

  function getCurrentDetailJobId() {
    return extractJobIdFromUrl(window.location.href) || extractJobIdFromNodeTree(findDetailPanel());
  }

  function applyRecordToCard(card, record) {
    if (!card || !record) {
      return;
    }

    const settings = RM.settings.getSnapshot();
    if (!settings.enabled || !settings.markLeftList) {
      clearStatus(card, false);
      return;
    }

    setStatus(card, record.status, false, record.source);
  }

  function applyRecordToRegisteredCards(record) {
    if (!record || !record.jobId) {
      return;
    }

    const cards = getCards(record.jobId).concat(findCardsByJobId(record.jobId));
    for (const card of cards) {
      applyRecordToCard(card, record);
    }
  }

  function findCardsByIdentity(identity) {
    if (!identity || !identity.title) {
      return [];
    }

    const anchors = Array.from(document.querySelectorAll(selectors.jobAnchors));
    const matchedCards = [];
    const seenCards = new Set();

    for (const anchor of anchors) {
      const card = findJobCardContainer(anchor);
      if (!card || seenCards.has(card)) {
        continue;
      }

      const cardText = extractVisibleText(card);
      if (!cardText.includes(identity.title)) {
        continue;
      }

      if (identity.company && !cardText.includes(identity.company)) {
        continue;
      }

      seenCards.add(card);
      matchedCards.push(card);
    }

    return matchedCards;
  }

  function applyRecordToLikelyCards(record, identity) {
    const directCards = getCards(record.jobId).concat(findCardsByJobId(record.jobId));
    if (directCards.length > 0) {
      for (const card of directCards) {
        applyRecordToCard(card, record);
      }
      return;
    }

    const fallbackCards = findCardsByIdentity(identity);
    for (const card of fallbackCards) {
      card.setAttribute(attributes.jobId, record.jobId);
      registerCard(record.jobId, card);
      applyRecordToCard(card, record);
    }
  }

  function findCardsByJobId(jobId) {
    if (!jobId) {
      return [];
    }

    const anchors = Array.from(document.querySelectorAll(selectors.jobAnchors));
    const matchedCards = [];
    const seenCards = new Set();

    for (const anchor of anchors) {
      const anchorJobId = extractJobIdFromNodeTree(anchor);
      if (anchorJobId !== jobId) {
        continue;
      }

      const card = findJobCardContainer(anchor);
      if (!card || seenCards.has(card)) {
        continue;
      }

      seenCards.add(card);
      card.setAttribute(attributes.jobId, jobId);
      registerCard(jobId, card);
      matchedCards.push(card);
    }

    const attributedCards = Array.from(document.querySelectorAll(`[${attributes.jobId}="${jobId}"]`));
    for (const card of attributedCards) {
      if (seenCards.has(card)) {
        continue;
      }

      seenCards.add(card);
      registerCard(jobId, card);
      matchedCards.push(card);
    }

    return matchedCards;
  }

  function rememberRecord(record) {
    const storedRecord = cache.set(record);
    applyRecordToRegisteredCards(storedRecord);
    return storedRecord;
  }

  function scanJobCards() {
    const settings = RM.settings.getSnapshot();
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

        if (settings.prefetchEnabled && cache.shouldRefresh(cachedRecord)) {
          prefetchCandidates.push({
            card,
            forceRefresh: true,
            jobData
          });
        }

        continue;
      }

      if (detectRepostedFromElement(card)) {
        const record = rememberRecord({
          jobId: jobData.jobId,
          url: jobData.url,
          status: status.reposted,
          source: source.cardDom,
          timestamp: Date.now()
        });
        applyRecordToCard(card, record);
        continue;
      }

      if (settings.markLeftList) {
        setStatus(card, status.unknown, false, source.cardDom);
      } else {
        clearStatus(card, false);
      }

      if (settings.prefetchEnabled) {
        prefetchCandidates.push({
          card,
          forceRefresh: false,
          jobData
        });
      }
    }

    RM.prefetch.queueCandidates(prefetchCandidates);
  }

  function scanDetailPanel() {
    const settings = RM.settings.getSnapshot();
    const detailPanel = findDetailPanel();
    if (!detailPanel) {
      return;
    }

    const detailHeader = findDetailHeader(detailPanel);
    const detailIdentity = extractDetailIdentity(detailHeader || detailPanel);

    const jobId = getCurrentDetailJobId();
    const detailStatus = detectRepostedFromElement(detailHeader || detailPanel)
      ? status.reposted
      : status.notReposted;

    if (settings.markDetailPanel) {
      setStatus(detailHeader || detailPanel, detailStatus, true, source.detailDom);
    } else {
      clearStatus(detailHeader || detailPanel, true);
    }

    if (!jobId) {
      return;
    }

    const record = rememberRecord({
      jobId,
      url: window.location.href,
      status: detailStatus,
      source: source.detailDom,
      timestamp: Date.now()
    });
    applyRecordToLikelyCards(record, detailIdentity);
  }

  function scanPage() {
    scanJobCards();
    scanDetailPanel();
  }

  function clearPageMarks() {
    const cards = document.querySelectorAll(`[${attributes.status}]`);
    for (const card of cards) {
      clearStatus(card, false);
    }

    const detailPanels = document.querySelectorAll(`[${attributes.detailStatus}]`);
    for (const panel of detailPanels) {
      clearStatus(panel, true);
    }
  }

  RM.scanner = {
    applyRecordToRegisteredCards,
    clearPageMarks,
    findDetailPanel,
    findJobCardContainer,
    getCurrentDetailJobId,
    rememberRecord,
    scanPage
  };
})(window);
