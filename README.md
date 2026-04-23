# LinkedIn Reposted Marker

Chrome/Edge extension for marking reposted LinkedIn job postings in the jobs list and detail panel.

This repository currently implements **Milestone 3** from `spec.md`, which includes:

- Milestone 1: DOM-first detection and highlighting
- Milestone 2: job ID mapping, card registry, and in-page cache reuse
- Milestone 3: background prefetch queue with async updates back into the left job list

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
- Highlights reposted items with a light red background and red border
- Rescans dynamically loaded LinkedIn jobs content with a debounced `MutationObserver`
- Handles SPA-style route changes on LinkedIn jobs pages
- Limits duplicate queueing for jobs already pending or in flight

Not implemented yet:

- Popup or options UI
- Settings storage
- Prefetch windowing and viewport prioritization
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
    utils.js
  styles/
    injected.css
```

## Load Locally

1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `extension/` directory from this repo
5. If the extension was already loaded, click `Reload` after pulling new changes

## How It Works

- The content script runs only on `https://www.linkedin.com/jobs/*`
- It scans job-card anchors that match `/jobs/view/` and extracts their job IDs
- Cards are registered by job ID so rerendered DOM can reuse existing results
- Visible card text and detail-panel text are checked first
- Cards still marked `unknown` are sent to the background prefetch queue
- The background worker fetches the LinkedIn job page, classifies reposted status, caches the result, and sends it back to the tab
- If LinkedIn responds with `429`, the worker pauses follow-up prefetches and waits until the retry window expires
- Matching left-side cards are updated asynchronously when results arrive
- A debounced observer rescans after LinkedIn mutates the page

## Manual Verification

Use this build on a real LinkedIn jobs page and confirm:

1. A visible left-list job card containing `Reposted` is highlighted automatically
2. Opening a reposted job highlights the detail panel
3. A left-side card without visible reposted text becomes highlighted a short time later if prefetch finds `Reposted`
4. Scrolling to load more jobs triggers scanning and background queueing for new cards
5. Repeated LinkedIn rerenders do not cause obvious flicker or duplicate queue churn

## Known Limits

- Prefetch currently fetches the job page HTML directly and classifies it by text match, so LinkedIn markup changes can require selector or parser adjustment
- Queueing is bounded and rate-limited, but still not viewport-aware yet
- Failed prefetches back off before retrying, and `429` responses trigger a longer cooldown
- No automated browser test harness is included yet

## Next Milestones

- Milestone 4: viewport-aware prefetch windowing and performance tuning
- Milestone 5: popup/options UI and configurable behavior
