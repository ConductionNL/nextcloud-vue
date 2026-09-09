---
kind: code
---

# Proposal: form-dialog-autosave

## Summary

Keep what a user typed in `CnFormDialog` when they close it, lose the tab or
navigate away, and offer it back when the same form opens again. Long forms
also get an explicit "Save draft" that stores the object with a draft marker
instead of validating it. A small "Saved" indicator tells the user the draft
is safe.

Opened from the dossiq competitor analysis, round 2, Tier B row B12
(`concurrentie-analyse/procest/_round2/compare/tier-b-and-sibling.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq has no draft or intermediate submission anywhere (M1 3.14). A case
handler who fills a 27-field case type form and loses the tab starts over.
Two competitors keep the work:

- Valtimo GZAC stores an `IntermediateSubmission` per task form
  (`valtimo/round2/code-census.md`).
- xxllnc Zaaksysteem autosaves the case data pane and shows an "OPGESLAGEN"
  indicator (`xxllnc-zaken/round2/case-detail-anatomy.md`).

## Affected projects

- `nextcloud-vue`: `CnFormDialog`, `CnFormPage`, a `useFormDraft` composable
  and the `dialog-system` capability.
- Consumers: every app that opens `CnFormDialog`. dossiq case create, task
  create and the case type editor benefit first.

## Backward compatibility

Local draft recovery is on by default because it changes nothing the user did
not type. "Save draft" as a server-side draft is opt-in through
`allowDraft: true` and needs a schema with a draft-capable field, declared as
`draftField` (default `isDraft`). A schema without it never shows the button.

## Theming

The indicator uses `--color-text-maxcontrast` and `--color-success-text`.
