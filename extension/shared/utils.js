(function initUtils(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function debounce(callback, waitMs) {
    let timeoutId = null;

    return function debounced(...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(this, args);
      }, waitMs);
    };
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  RM.utils = {
    debounce,
    normalizeText
  };
})(window);
