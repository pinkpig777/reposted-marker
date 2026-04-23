# LinkedIn Reposted Marker Architecture

This document focuses on implementation details. For setup and day-to-day usage, see [README.md](README.md).

## Overview

The extension targets LinkedIn Jobs pages that behave like a dynamic single-page application. It combines:

- visible DOM detection for reposted jobs
- background prefetch for unresolved jobs
- job ID mapping and cache reuse across rerenders
- viewport-aware prefetch windowing and bounded queueing
- popup controls for runtime behavior and local settings

## Current Implementation Status

- Milestone 1: DOM-first detection and highlighting
- Milestone 2: job ID mapping, card registry, and in-page cache reuse
- Milestone 3: background prefetch queue with async updates
- Milestone 4: viewport-aware prefetch windowing and queue prioritization
- Control menu: popup settings and debug log export

## Project Structure

```text
extension/
  manifest.json
  assets/
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
    debug-log.js
    settings.js
    utils.js
  styles/
    injected.css
  ui/
    popup.html
    popup.js
```

## Runtime Flow

1. The content script scans LinkedIn job-card anchors and extracts job IDs.
2. Visible card text and detail-panel text are checked first.
3. Unknown jobs near the viewport are queued for background prefetch.
4. The background worker fetches the LinkedIn job page, classifies reposted status, caches the result, and returns it to the tab.
5. Cached results are reused immediately and refreshed opportunistically for nearby cards.
6. Popup settings are stored in `chrome.storage.local` and applied live to open LinkedIn tabs.

## Verification Checklist

Manual checks for the current build:

1. A visible left-list job card containing `Reposted` is highlighted automatically.
2. Opening a reposted job highlights the detail panel.
3. A left-side card without visible reposted text becomes highlighted later if prefetch resolves it as reposted.
4. Scrolling loads new jobs without causing excessive request volume.
5. Updating popup settings changes behavior on already-open LinkedIn jobs tabs.
6. Debug log export downloads a JSON file after reproducing an issue.

## Limitations

- Prefetch currently classifies jobs by matching text in fetched LinkedIn HTML.
- Selector and parser adjustments may be needed if LinkedIn changes its markup.
- Debug mode persists and records logs, but no on-page debug overlay exists yet.
- There is no automated browser test harness in the repository yet.

## Roadmap

- Milestone 5: optional full options page and deeper diagnostics
- Milestone 6: advanced multi-state job markers
