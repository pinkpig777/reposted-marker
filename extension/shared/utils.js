(function initUtils(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  function debounce(callback, waitMs) {
    let timeoutId = null;

    return function debounced(...args) {
      globalScope.clearTimeout(timeoutId);
      timeoutId = globalScope.setTimeout(() => {
        callback.apply(this, args);
      }, waitMs);
    };
  }

  function normalizeText(text, options) {
    const config = options || {};
    const base = String(text || "");
    const withoutHtml = config.stripHtml ? base.replace(/<[^>]+>/g, " ") : base;

    return withoutHtml.replace(/\s+/g, " ").trim().toLowerCase();
  }

  RM.utils = {
    debounce,
    normalizeText
  };
})(globalThis);
