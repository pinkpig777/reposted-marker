# LinkedIn Reposted Marker

Chrome/Edge extension for highlighting LinkedIn job postings that visibly contain `Reposted`.

This repository currently implements **Milestone 1** from `spec.md`: DOM-first detection and highlighting only.

## Current Scope

Implemented in this milestone:

- Detects `Reposted` text from visible job cards in the left-side jobs list
- Detects `Reposted` text from the visible job detail panel
- Highlights reposted items with a light red background and red border
- Rescans dynamically loaded LinkedIn jobs content with a debounced `MutationObserver`
- Handles SPA-style route changes on LinkedIn jobs pages
- Avoids duplicate visual reapplication by toggling extension-owned classes and data attributes

Not implemented yet:

- Background prefetch queue
- Job ID extraction and state registry
- Persistent or in-memory cache
- Popup or options UI
- Settings storage

## Project Structure

```text
extension/
  manifest.json
  content/
    detector.js
    index.js
    observer.js
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

## How It Works

- The content script runs only on `https://www.linkedin.com/jobs/*`
- It scans job-card anchors that match `/jobs/view/`
- For each likely card container, it checks normalized visible text for the word `reposted`
- It separately scans the visible detail panel for the same signal
- A debounced observer rescans after LinkedIn mutates the page

## Manual Verification

Use this milestone build on a real LinkedIn jobs page and confirm:

1. A visible left-list job card containing `Reposted` is highlighted automatically
2. Opening a reposted job highlights the detail panel
3. Scrolling to load more jobs triggers scanning for new cards
4. Repeated LinkedIn rerenders do not cause obvious flicker

## Known Limits

- Detection is DOM-only, so jobs without a visible reposted label remain unknown
- Selector heuristics are intentionally lightweight and may need adjustment if LinkedIn changes its layout
- No automated browser test harness is included yet

## Next Milestones

- Milestone 2: job ID mapping, state reuse, cache layer
- Milestone 3: background prefetch for unresolved cards
