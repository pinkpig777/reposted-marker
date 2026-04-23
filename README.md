# LinkedIn Reposted Marker

Chrome/Edge extension for marking reposted LinkedIn job postings in the jobs list and detail panel.

This repository currently implements **Milestone 4** from `spec.md`, plus a popup control menu for runtime settings.

- Milestone 1: DOM-first detection and highlighting
- Milestone 2: job ID mapping, card registry, and in-page cache reuse
- Milestone 3: background prefetch queue with async updates back into the left job list
- Milestone 4: viewport-aware prefetch windowing and bounded priority queueing
- Control menu: popup settings for runtime behavior and persisted local preferences

## Current Scope

Implemented now:

- Detects `Reposted` text from visible job cards in the left-side jobs list
- Detects `Reposted` text from the visible job detail panel
- Extracts LinkedIn job IDs from `/jobs/view/<id>/` URLs
- Maps multiple rendered cards back to the same job ID
- Reuses known job status across rerenders with an in-page cache
- Prefetches unresolved jobs in a background service worker
- Persists prefetched job status in `chrome.storage.local`
- Pushes async status results back to the active LinkedIn tab
- Throttles prefetch traffic to one request at a time with a minimum delay between requests
- Honors `429 Too Many Requests` responses with a cached cooldown before retrying
- Queues prefetch only for cards inside a near-viewport window
- Prioritizes cards closest to the viewport and bounds the worker queue
- Refreshes stale cached results opportunistically for nearby cards
- Stores extension settings locally and applies them live to open LinkedIn tabs
- Provides a popup control menu for enable/disable, prefetch, marking, TTL, window size, concurrency, and debug mode
- Highlights reposted items with a light red background and red border
- Rescans dynamically loaded LinkedIn jobs content with a debounced `MutationObserver`
- Handles SPA-style route changes on LinkedIn jobs pages
- Limits duplicate queueing for jobs already pending or in flight

Not implemented yet:

- Advanced multi-state job markers

## Project Structure

```text
extension/
  manifest.json
  background/
    cache.js
    fetcher.js
    index.js
    queue.js
  content/
    cache.js
    card-registry.js
    detector.js
    index.js
    job-id.js
    messaging.js
    observer.js
    prefetch.js
    scanner.js
    styler.js
  shared/
    constants.js
    settings.js
    utils.js
  ui/
    popup.html
    popup.js
  styles/
    injected.css
```

## Load Locally

1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `extension/` directory from this repo
5. If the extension was already loaded, click `Reload` after pulling new changes
6. Click the extension icon in the toolbar to open the control menu

## How It Works

- The content script runs only on `https://www.linkedin.com/jobs/*`
- It scans job-card anchors that match `/jobs/view/` and extracts their job IDs
- Cards are registered by job ID so rerendered DOM can reuse existing results
- Visible card text and detail-panel text are checked first
- Cards still marked `unknown` are considered for prefetch only when they fall inside the near-viewport window
- Older cached results are reused immediately and refreshed in the background only for nearby cards
- The background worker fetches the LinkedIn job page, classifies reposted status, caches the result, and sends it back to the tab
- The worker keeps a bounded, priority-sorted queue so cards nearest the viewport win when scrolling produces many candidates
- If LinkedIn responds with `429`, the worker pauses follow-up prefetches and waits until the retry window expires
- Matching left-side cards are updated asynchronously when results arrive
- The popup writes settings into `chrome.storage.local`, and content/background scripts react to those changes live
- Debounced rescans run after DOM mutations, scroll, resize, and route changes

## Control Menu

The popup control menu currently supports:

- Enable or disable the extension
- Enable or disable background prefetch
- Toggle left-list highlighting
- Toggle detail-panel highlighting
- Adjust prefetch window size
- Adjust prefetch concurrency
- Adjust cache TTL
- Toggle debug mode for future diagnostics

## Manual Verification

Use this build on a real LinkedIn jobs page and confirm:

1. A visible left-list job card containing `Reposted` is highlighted automatically
2. Opening a reposted job highlights the detail panel
3. A left-side card without visible reposted text becomes highlighted a short time later if prefetch finds `Reposted`
4. Scrolling to load more jobs triggers scanning and background queueing for new cards
5. Rapid scrolling does not trigger a flood of requests for far-off cards
6. Toggling the popup settings updates open LinkedIn jobs tabs without reloading the extension
7. Repeated LinkedIn rerenders do not cause obvious flicker or duplicate queue churn

## Known Limits

- Prefetch currently fetches the job page HTML directly and classifies it by text match, so LinkedIn markup changes can require selector or parser adjustment
- Viewport window sizes and queue limits are hardcoded defaults until the popup overrides them
- Failed prefetches back off before retrying, and `429` responses trigger a longer cooldown
- Debug mode is persisted now, but no debug overlay is implemented yet
- No automated browser test harness is included yet

## Next Milestones

- Milestone 5: optional full options page and deeper diagnostics
