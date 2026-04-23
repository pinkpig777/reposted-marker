(function initContracts(globalScope) {
  const namespace = (globalScope.RepostedMarker = globalScope.RepostedMarker || {});

  const supportedStatuses = new Set([
    "reposted",
    "not_reposted",
    "unknown",
    "error",
    "rate_limited"
  ]);

  const sourceAliases = {
    card: "card_dom",
    card_dom: "card_dom",
    detail: "detail_dom",
    detail_dom: "detail_dom",
    dom: "card_dom",
    prefetch: "prefetch"
  };

  function normalizeJobId(jobId) {
    const normalized = String(jobId || "").trim();
    return /^\d+$/.test(normalized) ? normalized : null;
  }

  function normalizeSource(source) {
    const key = String(source || "").trim().toLowerCase();
    return sourceAliases[key] || null;
  }

  function normalizeStatus(status) {
    const normalized = String(status || "").trim().toLowerCase();
    return supportedStatuses.has(normalized) ? normalized : null;
  }

  function toLinkedInUrl(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ""), "https://www.linkedin.com/");
      if (url.origin !== "https://www.linkedin.com") {
        return null;
      }

      return url;
    } catch (_error) {
      return null;
    }
  }

  function getRouteSupport(rawUrl) {
    const url = toLinkedInUrl(rawUrl);
    if (!url) {
      return {
        supported: false,
        reason: "invalid_url",
        path: ""
      };
    }

    const path = url.pathname || "";
    const isSearch = /^\/jobs\/search\/?$/i.test(path);
    const isSearchResults = /^\/jobs\/search-results\/?$/i.test(path);
    const isJobsPage = /^\/jobs(\/|$)/i.test(path);

    if (isSearch) {
      return {
        supported: true,
        reason: "supported",
        path
      };
    }

    if (isSearchResults) {
      return {
        supported: false,
        reason: "search_results_not_supported",
        path
      };
    }

    if (isJobsPage) {
      return {
        supported: false,
        reason: "jobs_route_not_supported",
        path
      };
    }

    return {
      supported: false,
      reason: "non_jobs_route",
      path
    };
  }

  function validatePrefetchPayload(payload) {
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: "payload_invalid"
      };
    }

    const jobId = normalizeJobId(payload.jobId);
    if (!jobId) {
      return {
        ok: false,
        error: "job_id_invalid"
      };
    }

    const url = toLinkedInUrl(payload.url);
    const hasSupportedJobReference = Boolean(
      url && (/\/jobs\/view\//i.test(url.pathname) || normalizeJobId(url.searchParams.get("currentJobId")))
    );
    if (!url || !hasSupportedJobReference) {
      return {
        ok: false,
        error: "url_invalid"
      };
    }

    const priority = Number(payload.priority || 0);
    return {
      ok: true,
      value: {
        forceRefresh: Boolean(payload.forceRefresh),
        jobId,
        priority: Number.isFinite(priority) ? Math.max(priority, 0) : 0,
        url: url.toString()
      }
    };
  }

  function validateJobStatusPayload(payload) {
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: "payload_invalid"
      };
    }

    const jobId = normalizeJobId(payload.jobId);
    const status = normalizeStatus(payload.status);
    const source = normalizeSource(payload.source);

    if (!jobId) {
      return {
        ok: false,
        error: "job_id_invalid"
      };
    }

    if (!status) {
      return {
        ok: false,
        error: "status_invalid"
      };
    }

    if (!source) {
      return {
        ok: false,
        error: "source_invalid"
      };
    }

    let nextRetryAt = null;
    if (payload.nextRetryAt != null) {
      const retryAt = Number(payload.nextRetryAt);
      if (Number.isFinite(retryAt) && retryAt > 0) {
        nextRetryAt = retryAt;
      }
    }

    const timestamp = Number(payload.timestamp);
    return {
      ok: true,
      value: {
        jobId,
        nextRetryAt,
        source,
        status,
        timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
        url: payload.url || null
      }
    };
  }

  namespace.contracts = {
    getRouteSupport,
    normalizeJobId,
    normalizeSource,
    normalizeStatus,
    validateJobStatusPayload,
    validatePrefetchPayload
  };
})(globalThis);