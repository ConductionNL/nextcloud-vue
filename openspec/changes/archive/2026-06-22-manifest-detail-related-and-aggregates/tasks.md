# Tasks: Manifest detail related-collections, summary-aggregates & relation-link

## Phase 1 — relatedCollections

- [x] Create `CnRelatedCollections` (titled `CnObjectListWidget` sections;
      maps descriptor → content blob, `limit` default 10; re-emits
      `row-click`). (REQ-MDRA-2)
- [x] Add `CnDetailPage.relatedCollections` prop; render below the body;
      re-emit `related-row-click`. (REQ-MDRA-1)

## Phase 2 — summaryAggregates

- [x] Extend `fetchAggregateValue` / `flattenAggFilter` with an optional
      `ctx` forwarded to `resolveFilterTokens` (back-compatible). (REQ-MDRA-4)
- [x] Create `CnSummaryAggregates` (one `/value` fetch per descriptor scoped
      to the object context; labelled chips; currency/number format).
      (REQ-MDRA-3)
- [x] Add `CnDetailPage.summaryAggregates` prop; render in the header.

## Phase 3 — relation-link action

- [x] Create `CnRelationLinkModal` (CnResourceSelect link-mode → patch
      `fkField` on the current object via `saveObject`; emit `linked`;
      surface store error). (REQ-MDRA-5)
- [x] Add `CnDetailPage.relationLinks` prop; render a button per entry that
      opens the modal with the page context; re-fetch + emit `relation-linked`
      on `linked`.

## Phase 4 — barrels, tests, docs

- [x] Export `CnRelatedCollections`, `CnSummaryAggregates`,
      `CnRelationLinkModal` from the barrels.
- [x] Unit tests: `CnRelatedCollections.spec.js`, `CnSummaryAggregates.spec.js`,
      `CnRelationLinkModal.spec.js`, `CnDetailPageRelatedCollections.spec.js`.
- [x] Docs: `cn-related-collections.md`, `cn-summary-aggregates.md`,
      `cn-relation-link-modal.md`; add the props/events to
      `docs/components/cn-detail-page.md` + `src/.../CnDetailPage.md`.
- [x] `check:docs`, `check:jsdoc`, lint clean on changed src; full jest suite
      green.
