# LinkedIn Reposted Marker

LinkedIn Reposted Marker is a Chrome and Edge extension that highlights reposted LinkedIn job listings, so you can scan job results faster.

## At a Glance

- Highlights reposted jobs in the left-side jobs list
- Highlights reposted jobs in the right-side detail panel
- Prefetches unresolved jobs in the background
- Lets you tune behavior from the popup
- Exports debug logs as JSON when debugging is needed

## Installation

1. Download this repository as a ZIP file from GitHub (`Code` -> `Download ZIP`).
2. Unzip the downloaded file.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable Developer Mode.
5. Click `Load unpacked`.
6. Select the extracted `reposted-marker/extension` directory.
7. If you update the source later, reload the extension in the browser.

If you cloned with Git instead of ZIP, you can skip steps 1-2.

## Quick Start

1. Open the LinkedIn Jobs search results page at `https://www.linkedin.com/jobs/search/`.
2. Pin the extension if needed and click the toolbar icon to open the control menu.
3. Leave `Extension Enabled` on to allow scanning and highlighting.
4. Leave `Background Prefetch` on if you want unresolved jobs to be checked before opening them.

## Daily Usage Tips

- Adjust `Prefetch Window`, `Prefetch Concurrency`, and `Cache TTL` based on how aggressive you want prefetching to be.
- Turn on `Debug Mode` only when reproducing issues.
- Use `Download Debug Log` to export the current debug log as JSON.

## Important Notes

- Supported context: `https://www.linkedin.com/jobs/search/`
- Not supported: pages under a `search-results` path/context
- If you are not browsing from the supported search URL context, scanning and highlighting may not work as expected.

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

## More Docs

- Architecture and technical details: [Architecture.md](Architecture.md)
- Product requirements: [spec.md](spec.md)
