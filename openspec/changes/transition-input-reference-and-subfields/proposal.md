---
kind: code
---

# Proposal: transition-input-reference-and-subfields

## Summary

`CnTransitionInputDialog`, the dialog that asks for a lifecycle step's
inputs, learns two things. An input that points at another record (a uuid
with a `$ref`) is picked from a list of records, never typed. And an input
that is an object can be filled one field at a time: the dialog asks for the
named sub-fields only and sends the object with the rest of it intact.

## Why

learniq's spec PR #1787 (merged on learniq development) has two changes that
wait on it:

- `learner-merge-page-action` (rows `gov-merge-duplicate-accounts`): the
  `merge` transition on `LearnerProfile` takes `mergedInto`, a
  `format: uuid` string with `$ref: LearnerProfile`. Its design D2: "A uuid
  typed by hand is the most likely way to merge into the wrong person. The
  input is a picker over `learner-profile` filtered on `lifecycle: active`
  and excluding the current profile." The dialog "has no reference picker
  today".
- `attendance-flag-report-actions` (row `att-report-absence-to-authority`):
  `recordMunicipalityFeedback` declares `inputs: [{field: municipalityFeedback}]`,
  an object with `masRoute`, `note`, `receivedAt`, `recordedBy`. Its design
  D3: the dialog asks for `masRoute` and `note` only, because `receivedAt` and
  `recordedBy` are stamped; "If the dialog cannot address a property inside an
  object, nextcloud-vue adds that."

## What changes

- An input whose schema property resolves to an object reference
  (`fieldsFromSchema` gives it `reference`) renders `CnResourceSelect` for
  that schema, as `CnFormDialog` already does.
- An input declaration may carry `picker: {filter, excludeSelf, labelField}`:
  `filter` narrows the candidates by field values, `excludeSelf` removes the
  record the transition runs on.
- An input whose schema property is `type: object` renders its
  sub-properties. An input declaration may carry `fields: [...]` naming the
  sub-properties to ask for; the others are not shown. The dialog sends the
  object merged over the record's current value, so unasked sub-fields keep
  their values.
- `CnResourceSelect` gains `filter` and `exclude` props for the above.
- `CnDetailPage` `config.lifecycleActions` gains `inputs: {<action>: [...]}`
  to give these hints for server-declared transitions.

## Rows unblocked

- learniq `gov-merge-duplicate-accounts` (`learner-merge-page-action`).
- learniq `att-report-absence-to-authority` (`attendance-flag-report-actions`).

## Affected projects

- `nextcloud-vue`: `CnTransitionInputDialog`, `CnLifecycleActions`,
  `CnDetailPage`, `CnResourceSelect`, the v2 manifest schema.
- OpenRegister: none. The transition endpoint already takes
  `{action, data}` and checks `data` keys against the declared inputs; the
  dialog still sends only declared top-level keys.

## Backward compatibility

Additive. An input without `picker` or `fields` and a scalar property renders
as today. `filter` and `exclude` on `CnResourceSelect` default to empty.

## Theming

`CnResourceSelect` and existing dialog styles; Nextcloud CSS variables only.
