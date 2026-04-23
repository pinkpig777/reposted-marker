(function initStyler(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { attributes, classes } = RM.constants;

  function setStatus(element, status, isDetail, source) {
    if (!element) {
      return;
    }

    const className = isDetail ? classes.detailReposted : classes.reposted;
    const attributeName = isDetail ? attributes.detailStatus : attributes.status;

    element.setAttribute(attributeName, status);
    if (source) {
      element.setAttribute(attributes.source, source);
    }

    if (status === "reposted") {
      element.classList.add(className);
      return;
    }

    element.classList.remove(className);
  }

  RM.styler = {
    setStatus
  };
})(window);
