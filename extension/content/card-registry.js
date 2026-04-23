(function initCardRegistry(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  const jobToCards = new Map();
  const cardState = new WeakMap();

  function ensureState(card) {
    let state = cardState.get(card);
    if (!state) {
      state = {
        jobId: null,
        prefetchQueued: false,
        lastQueuedAt: 0
      };
      cardState.set(card, state);
    }

    return state;
  }

  function registerCard(jobId, card) {
    if (!jobId || !card) {
      return;
    }

    const state = ensureState(card);
    state.jobId = jobId;

    let cards = jobToCards.get(jobId);
    if (!cards) {
      cards = new Set();
      jobToCards.set(jobId, cards);
    }

    cards.add(card);
  }

  function getCards(jobId) {
    return Array.from(jobToCards.get(jobId) || []);
  }

  function setPrefetchQueued(card, queued) {
    const state = ensureState(card);
    state.prefetchQueued = queued;
    if (queued) {
      state.lastQueuedAt = Date.now();
    }
  }

  function isPrefetchQueued(card) {
    return ensureState(card).prefetchQueued;
  }

  function setPrefetchQueuedForJob(jobId, queued) {
    const cards = getCards(jobId);
    for (const card of cards) {
      setPrefetchQueued(card, queued);
    }
  }

  function getLastQueuedAt(card) {
    return ensureState(card).lastQueuedAt;
  }

  RM.cardRegistry = {
    getCards,
    getLastQueuedAt,
    isPrefetchQueued,
    registerCard,
    setPrefetchQueued,
    setPrefetchQueuedForJob
  };
})(window);
