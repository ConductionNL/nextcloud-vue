# Design: view-presentation-picker

Read on openregister development and PR branch `spec/missing-parts` (#4452),
nextcloud-vue development `3eefb4f00`, on 7 October 2026. No board draws the
picker; it sits under the name field of the save dialog, the order a user
decides in: what is it called, how does it look, who sees it.

## D1. Which properties a role offers

Taken from openregister `saved-view-presentation-picker` D-2:

| Role | Offered properties |
|---|---|
| `kanban.groupByField` | a string property with an `enum`, the property a schema lifecycle (`x-openregister-lifecycle`) names as its state, or a relation to one object |
| `kanban.cardFields` | any scalar property, at most four |
| `kanban.columnOrder` | the values of the chosen `groupByField` enum, as a drag list; hidden when the field has no enum |
| `calendar.dateField`, `calendar.endDateField` | a property with `format` `date` or `date-time` |

A type whose required role has no candidate is shown disabled with the reason
("This schema has no date field"). The server stays the authority; the filter
keeps a user from picking what will be refused.

## D2. Value shape

The picker emits exactly OpenRegister's shape. Switching type keeps the
other type's sub-object out of the emitted value, so a board turned back into
a table emits `{viewType: "table"}` and not a stale `kanban` block.

## D3. Refusals

OpenRegister's 400 message names the path (`kanban.groupByField`,
`calendar.dateField`, `calendar.endDateField`). The dialog matches those
three literal paths, which are part of the server's validation contract, and
puts the message under that picker; any other message goes to the top. This
matches a stable token, not a sentence.

## D4. Switching the open view

OpenRegister's REQ-VIEW-PRES-07 (switch the open view's presentation from the
page header) is OpenRegister page work over `CnSegmentedControl`. It is not
specified here; this change gives it the picker to reuse for the field choice.

## Files

- `src/components/CnViewPresentationPicker/` (vue, index.js, md), `src/components/index.js`
- `src/utils/presentationCandidates.js`
- `src/components/CnSaveViewDialog/CnSaveViewDialog.vue`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`
- `tests/utils/presentationCandidates.spec.js`, `tests/components/CnViewPresentationPicker.spec.js`, `tests/components/CnSaveViewDialog.spec.js`
