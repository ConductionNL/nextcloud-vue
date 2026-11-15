---
kind: code
---

# Proposal: notice-text-from-endpoint

## Summary

Board DqTeamwachtrij draws "Bron niet beschikbaar" above the team queue with the words of the source that is down, and only on that saved view. A notice had a fixed text, and a page's notices showed on every view.

## Scope

- `src/components/CnCardNotices/CnCardNotices.vue` (`textFrom`), `src/components/CnIndexPage/CnIndexPage.vue` (`savedViews` on a page notice), docs, `tests/components/CnCardNoticesTextFrom.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
