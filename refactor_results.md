# Refactor Results

## Overview
This refactor followed the `refactor.md` direction with a reliability-first approach:
1. lock runtime contracts and supported routes
2. harden queue/cache/fetch runtime behavior
3. reduce content coupling and improve popup diagnostics

## Incremental Commits
1. `f4a2980` - `refactor(core): add shared contracts and route support foundation`
2. `e1d32c4` - `refactor(runtime): harden queue and unify cache fetch policy`
3. `0be0439` - `refactor(content-ui): decouple scanner messaging and add diagnostics`

## What Was Improved

### 1) Canonical contracts and route support matrix
- Added `extension/shared/contracts.js`.
- Added payload validators:
  - `validatePrefetchPayload`
  - `validateJobStatusPayload`
- Added route support classification via `getRouteSupport`.
- Enforced support target to LinkedIn jobs search route (`/jobs/search/`) and explicit non-support for `/jobs/search-results/`.

### 2) Shared settings as a source of truth
- Refactored `extension/shared/settings.js` to schema-driven normalization.
- Centralized defaults and range validation in one schema.
- Added runtime policy fields used by background reliability logic:
  - `fetchTimeoutMs`
  - `errorRetryMinutes`
  - `rateLimitRetryMinutes`
  - `queueMaxPendingTasks`
  - `prefetchMinIntervalMs`
  - `maxMemoryCacheEntries`

### 3) Background ingress hardening
- Updated `extension/background/index.js`:
  - strict sender route checks for prefetch ingress
  - strict payload validation before enqueue
  - safe reject path with debug logs for malformed or unsupported messages
- Added background message endpoints for operator diagnostics/actions:
  - `QUEUE_STATUS_REQUEST`
  - `CACHE_CLEAR_REQUEST`

### 4) Queue invariants and observability
- Refactored `extension/background/queue.js`:
  - explicit queue pause state (`pausedUntil`, `pauseReason`)
  - requeue behavior when queue is paused
  - schedule guard to avoid re-entrant scheduler overlap
  - invariant correction between `activeCount` and `activeByJobId`
  - bounded pending task trimming from settings
  - non-blocking broadcast failure logging
- Added `getStatus()` for real diagnostics:
  - `pending`
  - `active`
  - `paused`
  - `pausedUntil`
  - `pauseReason`

### 5) Unified cache freshness and authority
- Added `extension/shared/cache-policy.js`.
- Refactored both caches to use shared policy rules:
  - `extension/content/cache.js`
  - `extension/background/cache.js`
- Implemented authority/override logic with source priority and status safety:
  - higher-priority source can override lower-priority source
  - newer compatible results can override older results
  - `error` and `rate_limited` do not overwrite valid states
  - `unknown` acts as fallback only
- Added bounded background memory cache with eviction tracking.
- Added cache operations for runtime controls:
  - `clearAll()`
  - `pruneExpired()`
  - `getStats()`

### 6) Fetch resilience and policy-driven backoff
- Refactored `extension/background/fetcher.js`:
  - timeout moved to settings (`fetchTimeoutMs`)
  - retry windows moved to settings (`errorRetryMinutes`, `rateLimitRetryMinutes`)
  - stronger URL/payload validation before fetch
  - retained `retry-after` parsing with deterministic fallback
- Reused shared normalize utility with optional HTML stripping for fetched content.

### 7) Content pipeline boundary cleanup
- Refactored scanner/messaging coupling:
  - added `scanner.applyBackgroundResult(...)` as a scanner-level API
  - messaging no longer reaches scanner internals directly
- Added manual rescan cooldown in content messaging to avoid action flooding.
- Updated content runtime bootstrap (`extension/content/index.js`) to stop scanning on unsupported routes and respect route matrix during SPA navigation.

### 8) Detection accuracy improvements
- Expanded repost detection patterns in `extension/content/detector.js`.
- Reduced false negatives for alternate repost phrasing patterns.

### 9) Popup diagnostics and safe operator actions
- Enhanced `extension/ui/popup.html` and `extension/ui/popup.js`.
- Added real runtime diagnostics:
  - page support indicator
  - queue status summary
  - cache status summary
- Added operator actions:
  - `Rescan Page`
  - `Clear Cache`
- Kept existing debug log download/clear actions.

## Supporting Structural Changes
- Updated `extension/shared/constants.js`:
  - global runtime compatibility (`globalThis`)
  - new message types for diagnostics/actions
- Updated `extension/shared/utils.js`:
  - global runtime compatibility
  - `normalizeText` now supports optional HTML stripping
- Updated `extension/manifest.json` to load new shared modules in content runtime.

## Validation
- `get_errors` returned no editor/compile errors after refactor.
- Git history now contains three focused incremental refactor commits.

## Notes
- Existing unrelated user change in `.gitignore` was intentionally not included in refactor commits.
- This refactor established runtime contracts and observability foundations first; this makes later testing/tooling phases safer to add.
