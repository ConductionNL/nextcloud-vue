# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-read-only-when](../../)

## Purpose

A record page stops offering edits on a record that should not change, whatever the reader's rights.

## ADDED Requirements

### Requirement: A detail page can make a record read-only by a condition

CnDetailPage SHALL take `readOnlyWhen`, a local condition in the `visibleWhen` grammar on the record and its
`visibilityContext` records. While the condition holds, the page SHALL withdraw its Edit button and the header actions
with role `edit` or `update`, and SHALL tell its widgets that updates are refused, so inline editors are off, as when
`can.update` is false. While the record or its context records are loading, and without the option, the controls SHALL
stay as they are.

#### Scenario: A merged record

- **GIVEN** `readOnlyWhen: { field: "mergedInto", op: "notEmpty" }`
- **WHEN** a record whose `mergedInto` holds another record's id opens
- **THEN** the page shows no Edit button and no edit-role header actions

#### Scenario: A record that was not merged

- **GIVEN** the same page
- **WHEN** a record with an empty `mergedInto` opens
- **THEN** Edit shows as before
