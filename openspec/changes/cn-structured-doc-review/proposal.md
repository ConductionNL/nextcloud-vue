# CnStructuredDocReview — XML/JSON review surface

## Why

The scholiq triage flagged `OsoDossierReviewView` as a custom because no lib widget combines a syntax-highlighted document body, a validation-issues panel, a status pill, and an approve/reject decision row in one surface. The shape recurs across regulated data-exchange flows (OSO dossiers, ZGW envelopes, BAG payloads, audit packs).

## What

`src/components/CnStructuredDocReview/CnStructuredDocReview.vue` (~330 LOC). Composes `CnJsonViewer` for the body. Renders typed `issues[]` with severity-coloured rows. Status pill driven by the closed-ish enum (`valid`, `invalid`, `needs-review`, `approved`, `rejected`, `pending`) — unknown values render with neutral styling. Approve / Reject buttons with gating (errors block approve; reject requires comment when configured).

## Non-goals

- Validation logic — consumer-supplied via `issues[]`. The component renders; it doesn't compute.
- Inline editing — read-only review.
- Signature capture — pair with `CnSignatureCapture` when an evidentiary signature is part of the verdict.

## References

- [nextcloud-vue#292](https://codeberg.org/Conduction/nextcloud-vue/issues/292).
- scholiq `OsoDossierReviewView`.
