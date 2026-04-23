(function initCardRegistry(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  const jobToCards = new Map();
  const cardState = new WeakMap();

  function ensureState(card) {
    let state = cardState.get(card);
    if (!state) {
      state = {
        jobId: null,
        prefetchQueued: false
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
    ensureState(card).prefetchQueued = queued;
  }

  function isPrefetchQueued(card) {
    return ensureState(card).prefetchQueued;
  }

  RM.cardRegistry = {
    getCards,
    isPrefetchQueued,
    registerCard,
    setPrefetchQueued
  };
})(window);
