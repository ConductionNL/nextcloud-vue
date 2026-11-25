# Proposal: dashboard-auto-refresh

## Why

pipelinq's My work (requirement REQ-MW-190) must fetch its items again every 5 minutes while it is open, without a
reload and without moving the scroll position, offer a refresh button that spins while it fetches, and warn "Data may be
outdated. Last updated: <time>" with Retry when fetching keeps failing for more than 10 minutes. My work is a manifest
dashboard page, and a dashboard page can only refresh from its overflow Actions menu, once, without telling a failing
page from a quiet one.

## What changes

- `config.autoRefresh` on a dashboard page (`true`, or `{ intervalSeconds, staleAfterSeconds, button }`, defaults 300,
  600, true): a timer fires `cn:page:refresh` every interval and is cleared when the page goes; a header button fires it
  at once and spins until the reads land; a warning with Retry shows when the reads fail and the last good one is older
  than `staleAfterSeconds`.
- `useEndpointSource`'s read resolves `true` when it answered and `false` when it failed, which the page reads through
  the refresh payload's `waitUntil`. Nothing else changes for its callers.
- Manifest schema: `config.autoRefresh` described. A page without it behaves as before.
