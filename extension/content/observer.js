(function initObserver(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { scanDebounceMs, scrollDebounceMs, routePollMs } = RM.constants.timing;
  const { debounce } = RM.utils;
  const { scanPage } = RM.scanner;

  function startObserver() {
    const debouncedScan = debounce(() => {
      scanPage();
    }, scanDebounceMs);
    const debouncedScrollScan = debounce(() => {
      scanPage();
    }, scrollDebounceMs);

    const observer = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => {
        return mutation.type === "childList" || mutation.type === "characterData";
      });

      if (hasRelevantMutation) {
        debouncedScan();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    let previousUrl = window.location.href;
    window.setInterval(() => {
      if (window.location.href === previousUrl) {
        return;
      }

      previousUrl = window.location.href;
      debouncedScan();
    }, routePollMs);

    window.addEventListener("scroll", debouncedScrollScan, { passive: true });
    window.addEventListener("resize", debouncedScrollScan, { passive: true });

    return observer;
  }

  RM.observer = {
    startObserver
  };
})(window);
