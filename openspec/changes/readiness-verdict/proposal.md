# Proposal: readiness-verdict

## Why

Board DqZaakDocumenten draws "Volledigheid van de aanvraag": the documents the case type requires, each present or missing,
"2 van 5 aanwezig, 3 ontbreken", the verdict "Nog niet ontvankelijk", and "Ontvankelijkheid bevestigen", which only works once
everything is there. `CnReadinessChecklist` already draws the items with their state in words, but has no count, no verdict
and no action.

## What changes

- `summary`: a count above the list, a template with `{met}`, `{open}` and `{total}`.
- `verdict`: `{ met, unmet }`, the verdict in words beside the count.
- `note`: a line under the list.
- `confirmLabel`: a button that stays off until every item is met and emits `confirm`; an `actions` slot beside it.

Backward compatible: without these props the list draws as it did. Covers gap 10 of the dossiq component-gap audit
(decision 281), in place of the proposed `CnCompletenessCheck`.
