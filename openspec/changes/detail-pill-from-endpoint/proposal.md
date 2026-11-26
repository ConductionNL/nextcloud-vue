# Proposal: detail-pill-from-endpoint

## Why
A detail page's header pills read the record (`field`), a constant (`text`) or a count of a related list (`countFrom`). Some states cannot be stored on the record: learniq's pupil page header shows the pupil's state today ("In de klas", "Ziek gemeld") or her oldest open signal, which its own endpoint (`GET /api/pupils/{id}/page`, `header.statePill`) works out per request. learniq change `learner-list-and-page-follow-the-boards` T3 needs that state in the header.

## What changes
- `typePill` / `statusPill` accept `endpointSource` (`url`, `method?`, `params?`, `responsePath`): the pill shows the value the endpoint answers at `responsePath`, through `labels`, `colorMap` and `values` as a field pill. `url` and `params` take the `@objectId` and `@object.<field>` tokens (the same request grammar as a widget's `endpointSource`, through the shared response cache).
- Nothing renders while it reads, after a failed read, or for an empty or non-scalar value. The pill reads again when the record or the resolved request changes.

## Out of scope
Counts from an endpoint (use `countFrom`), pills in the index page.
