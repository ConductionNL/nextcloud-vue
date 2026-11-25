---
kind: code
---

# Proposal: setup-and-walkthrough-from-initial-state

## Summary

A live measure of the LaunchPad workspace (25 Nov 2026, sandbox reference
stack) found `GET /api/setup/status` asked twice per page load and the two
walkthrough preferences (`<completionConfigKey>` and its `-progress` twin)
asked on every load. Requests of one session are served one at a time by the
PHP session lock, so each extra boot read adds to the time before the page is
usable (ADR-124: 300 ms).

1. `useSetupStatus` starts at most one read per app: the second caller during
   the first read (CnAppRoot's `setupState` re-evaluates when the manifest
   object is replaced) shares it instead of starting another GET.
2. A page MAY carry the setup status in its initial state (`setup_status`):
   the endpoint's document, or `{ forbidden: true }` for a caller who may not
   read it. Then no request is made.
3. A page MAY carry both walkthrough preferences in its initial state
   (`walkthrough_preferences`: `{ seen, progress }`, each the stored value).
   Then CnAppRoot makes neither preference GET.

An app that carries nothing behaves as before.
