# LinkedIn Reposted Marker

LinkedIn Reposted Marker is a Chrome and Edge extension that detects reposted LinkedIn job listings and highlights them in the jobs list and detail panel.

## Overview

The extension is designed for LinkedIn Jobs pages that behave like a dynamic single-page application. It handles:

- visible DOM detection for reposted jobs
- background prefetch for unresolved jobs
- job ID mapping and cache reuse across rerenders
- viewport-aware prefetch windowing and bounded queueing
- popup controls for runtime behavior and local settings

Current implementation status:

- Milestone 1: DOM-first detection and highlighting
- Milestone 2: job ID mapping, card registry, and in-page cache reuse
- Milestone 3: background prefetch queue with async updates
- Milestone 4: viewport-aware prefetch windowing and queue prioritization
- Control menu: popup settings and debug log export

## Features

- Highlights reposted jobs in the left-side jobs list
- Highlights reposted jobs in the right-side detail panel
- Extracts LinkedIn job IDs from `/jobs/view/<id>/` URLs
- Reuses known job status from local cache
- Prefetches nearby unresolved jobs before they are opened
- Applies rate limiting and 429 backoff for safer background fetch behavior
- Lets users control prefetch, cache TTL, concurrency, and highlighting from the popup
- Exports debug logs as JSON from the popup

## Installation

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select the [extension](/Users/charliechiu/Documents/SideProject/reposted-marker/extension) directory.
5. Reload the extension after pulling new changes.

## Usage

1. Open the LinkedIn Jobs search results page at `https://www.linkedin.com/jobs/search/`.
2. Pin the extension if needed and click the toolbar icon to open the control menu.
3. Leave `Extension Enabled` on to allow scanning and highlighting.
4. Leave `Background Prefetch` on if you want unresolved jobs to be checked before opening them.
5. Adjust `Prefetch Window`, `Prefetch Concurrency`, and `Cache TTL` based on how aggressive you want prefetching to be.
6. Turn on `Debug Mode` before reproducing issues if you want useful exported logs.
7. Use `Download Debug Log` to export the current debug log as JSON.

## Important Notes

- The extension logic is intended for searches under `https://www.linkedin.com/jobs/search/`.
- If the page URL is under a `search-results` path/context, the extension is currently not supported and will not work.
- If you are not browsing from that search URL context, scanning and highlighting may not work as expected.

## Control Menu

The popup currently supports:

- enabling or disabling the extension
- enabling or disabling background prefetch
- toggling left-list highlighting
- toggling detail-panel highlighting
- adjusting prefetch window size
- adjusting prefetch concurrency
- adjusting cache TTL
- toggling debug mode
- downloading and clearing debug logs

## Architecture

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

## How It Works

- The content script scans LinkedIn job-card anchors and extracts job IDs.
- Visible card text and detail-panel text are checked first.
- Unknown jobs near the viewport are queued for background prefetch.
- The background worker fetches the LinkedIn job page, classifies reposted status, caches the result, and returns it to the tab.
- Cached results are reused immediately and refreshed opportunistically for nearby cards.
- Popup settings are stored in `chrome.storage.local` and applied live to open LinkedIn tabs.

## Verification

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
