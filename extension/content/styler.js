(function initStyler(globalScope) {
  const RM = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});
  const { attributes, classes } = RM.constants;

  function getBadge(element) {
    return element ? element.querySelector(`.${classes.repostedBadge}`) : null;
  }

  function removeBadge(element) {
    const badge = getBadge(element);
    if (badge) {
      badge.remove();
    }
  }

  function ensureBadge(element) {
    if (!element) {
      return;
    }

    let badge = getBadge(element);
    if (!badge) {
      badge = document.createElement("span");
      badge.className = classes.repostedBadge;
      badge.setAttribute(attributes.badge, "reposted");
      badge.textContent = "Reposted";
      element.appendChild(badge);
    }
  }

  function clearStatus(element, isDetail) {
    if (!element) {
      return;
    }

    const className = isDetail ? classes.detailReposted : classes.reposted;
    const attributeName = isDetail ? attributes.detailStatus : attributes.status;

    element.classList.remove(className);
    element.removeAttribute(attributeName);
    element.removeAttribute(attributes.source);
    if (!isDetail) {
      removeBadge(element);
    }
  }

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
      if (!isDetail) {
        ensureBadge(element);
      }
      return;
    }

    element.classList.remove(className);
    if (!isDetail) {
      removeBadge(element);
    }
  }

  RM.styler = {
    clearStatus,
    setStatus
  };
})(window);
