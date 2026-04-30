# LinkedIn Reposted Marker Technical Guide

This document explains how the current extension works internally and how to extend or debug the core pipeline. For product goals and milestone context, see [spec.md](spec.md) and [Architecture.md](Architecture.md).

## Runtime Overview

The extension is split into three active layers:

- the content runtime, which scans the LinkedIn page and applies highlights
- the background runtime, which manages queueing, fetching, and cache persistence
- the popup UI, which exposes settings and diagnostics

The shared modules under [extension/shared](extension/shared) keep route validation, payload validation, cache policy, and constants consistent across both runtimes.

## Startup Flow

1. The content script loads on LinkedIn jobs pages via [extension/manifest.json](extension/manifest.json).
2. [extension/content/index.js](extension/content/index.js) checks whether the current route is supported.
3. If the route is supported and the extension is enabled, the scanner runs once and the mutation observer starts.
4. The background service worker loads its queue, fetcher, cache, and shared settings.
5. The popup reads live queue/cache state and updates settings through `chrome.storage.local`.

## Route Support

Route support is centralized in [extension/shared/contracts.js](extension/shared/contracts.js).

Current behavior:

- `/jobs/search/` is supported
- `/jobs/search-results/` is explicitly rejected
- other `/jobs/*` pages are treated as unsupported unless they match the supported search route

This check is used in both the content runtime and background sender validation so unsupported pages do not enqueue work.

## DOM Detection

### Job Card Discovery

Job cards are discovered from anchors matching `a[href*="/jobs/view/"]` or `a[href*="currentJobId="]`.

The scanner then walks upward from each anchor until it finds a likely card container. The heuristics in [extension/content/scanner.js](extension/content/scanner.js) look for:

- visible text in a bounded range
- at least one relevant anchor
- a plausible job ID in the node tree
- exclusion of the detail panel when the anchor belongs to the right-side panel

This avoids depending only on LinkedIn CSS classes.

### Job ID Extraction

Job IDs are extracted in [extension/content/job-id.js](extension/content/job-id.js).

Supported sources:

- `/jobs/view/<id>` in the anchor URL
- `currentJobId=<id>` in the URL query string
- job-related data attributes such as `data-job-id`, `data-entity-urn`, and similar fields

If a valid numeric job ID cannot be found, the card is skipped rather than guessed.

### Reposted Text Detection

Visible text detection happens in [extension/content/detector.js](extension/content/detector.js).

The current matcher treats text as reposted when it matches patterns such as:

- `reposted`
- `reposted X hours ago`
- `last posted`
- `originally posted`

Text is normalized first so whitespace and casing do not matter.

## Highlighting

Styling is applied through [extension/content/styler.js](extension/content/styler.js) and [extension/styles/injected.css](extension/styles/injected.css).

Current behavior:

- reposted cards receive the `rm-reposted` class
- detail panels receive the `rm-detail-reposted` class
- cards may also get a badge element today, which is useful for debugging but does not match the original no-icon/no-label spec exactly
- processed elements get data attributes such as `data-rm-status`, `data-rm-detail-status`, and `data-rm-job-id`

The visual highlight is intentionally lightweight: subtle red background, red border, and rounded corners.

## Scan Cycle

The main scan entrypoint is [extension/content/scanner.js](extension/content/scanner.js).

### Left List Scan

For each discovered card:

1. Extract the job ID and URL.
2. Register the card in the in-page card registry.
3. Check the in-memory cache first.
4. If the card text already contains reposted text, mark it immediately.
5. If it is unresolved, mark it as unknown when left-list marking is enabled.
6. If prefetch is enabled, add it to the prefetch candidate list.

### Detail Panel Scan

The detail panel scan:

1. Locates the visible detail container.
2. Determines the current job ID from the URL or DOM.
3. Checks the detail header or panel text for reposted indicators.
4. Applies detail highlighting when enabled.
5. Stores the result so it can be reused by related cards.

## Deduplication and Registry

The card registry in [extension/content/card-registry.js](extension/content/card-registry.js) prevents repeated processing of the same DOM node.

It tracks:

- job ID to card mappings
- whether a card is already marked as queued for prefetch
- when the card was last queued

The scanner also uses a `visitedCards` set during each pass so one DOM node is not processed multiple times in the same scan.

## Mutation Handling

The observer in [extension/content/observer.js](extension/content/observer.js) watches for:

- child list changes
- character data changes
- route changes via URL polling
- scroll and resize events

All of those paths are debounced before calling `scanPage()` so LinkedIn DOM churn does not trigger a full rescan on every mutation.

## Cache Design

There are two cache layers:

- the content-side cache in [extension/content/cache.js](extension/content/cache.js)
- the persistent background cache in [extension/background/cache.js](extension/background/cache.js)

### Content Cache

The content cache is session-local and optimized for the current page lifecycle.

It stores normalized records with:

- job ID
- status
- source
- timestamp
- URL
- next retry time when relevant

### Background Cache

The background cache persists records in `chrome.storage.local` and keeps a bounded in-memory mirror for fast access.

It also tracks:

- hits
- misses
- writes
- evictions

Freshness and replacement policy are shared through [extension/shared/cache-policy.js](extension/shared/cache-policy.js).

## Queueing and Prefetch

Prefetch is initiated from the content runtime in [extension/content/prefetch.js](extension/content/prefetch.js).

### Candidate Selection

The scanner queues only unresolved cards when prefetch is enabled.

Before a card is queued, the prefetch logic checks:

- whether the card is already queued
- whether the card is still cooling down
- whether the card is inside the viewport window
- whether the queue is currently allowed to accept more work

Viewport windowing is controlled by settings and constants so scrolling does not flood the queue.

### Message Shape

Content sends a `PREFETCH_JOB` message with:

- `jobId`
- `url`
- `priority`
- `forceRefresh`

The payload is validated in [extension/shared/contracts.js](extension/shared/contracts.js) before the background queue accepts it.

### Background Queue

The queue implementation in [extension/background/queue.js](extension/background/queue.js) is responsible for:

- pending task ordering
- concurrency limits
- cooldown behavior
- pause and resume when rate limited
- deduplication by job ID

The queue will first reuse a cached result when possible. If no fresh cache record exists, it fetches the job page and classifies the response.

## Fetch and Classification

The fetcher in [extension/background/fetcher.js](extension/background/fetcher.js) loads the LinkedIn job URL with credentials included.

Classification currently works by:

1. fetching the job page HTML
2. normalizing the response text
3. checking for reposted text in the HTML
4. returning `reposted`, `not_reposted`, `error`, or `rate_limited`

If LinkedIn returns HTTP 429, the queue enters a paused state and resumes after the retry window.

## Message Passing

The content runtime listens for:

- `JOB_STATUS_RESULT`
- `JOB_PREFETCH_RELEASED`
- `RESCAN_PAGE`

The background runtime listens for:

- `PREFETCH_JOB`
- `QUEUE_STATUS_REQUEST`
- `CACHE_CLEAR_REQUEST`

Validation and source normalization are centralized so each boundary sees the same record structure.

## Popup and Diagnostics

The popup in [extension/ui/popup.html](extension/ui/popup.html) and [extension/ui/popup.js](extension/ui/popup.js) controls:

- extension enabled/disabled
- prefetch enabled/disabled
- left-list marking
- detail-panel marking
- debug mode
- prefetch window size
- prefetch concurrency
- cache TTL

It also shows live runtime data:

- supported page status
- queue status
- cache status

The debug log buffer is implemented in [extension/shared/debug-log.js](extension/shared/debug-log.js).

## Implementation Order

If you want to add or modify behavior, do it in this order:

1. update shared constants or contracts first
2. update content detection and styling next
3. update queue/fetch/cache behavior in the background worker
4. update popup controls and diagnostics last

That keeps the runtime boundaries consistent and reduces the chance of a content/background mismatch.

## Practical Debug Checklist

When something is not working, check these first:

1. Is the current route supported by `shared/contracts.js`?
2. Does the card have a valid job ID?
3. Does the visible text actually contain reposted markers?
4. Is the card already cached or already queued?
5. Is prefetch disabled in settings?
6. Is the queue paused because of rate limiting?
7. Is the card inside the prefetch window?

## Notes

- The current codebase is implementation-oriented and does not rely on a separate test harness yet.
- Prefetch classification still depends on matching reposted text in fetched HTML.
- The popup currently exports and clears logs; a dedicated logs page is not implemented yet.
