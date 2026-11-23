---
kind: code
---

# Proposal: view-presentation-picker

## Summary

When a user saves or edits a view, they pick how it shows: a table, a board
grouped by a status field, or a calendar by a date field. A new
`CnViewPresentationPicker` offers the three types and, per type, only the
fields of the view's schema that can serve the role. `CnSaveViewDialog` and
the edit form of `CnSavedViewsControl` carry it, so OpenRegister's Tables page
and every leaf app offer the same choice.

## Why

openregister rows `rec-kanban` and `rec-calendar`, rated partial. The backend
stores and validates `presentation` since `object-views-kanban-calendar`
(archived `2026-07-25`), and `CnObjectKanban` and `CnObjectCalendar` already
draw a view that asks for one. No screen lets anyone ask. OpenRegister's
change `saved-view-presentation-picker` (openregister PR #4452) puts the
editor in nextcloud-vue (its design D-1: props `schema` and `value`, emits
`input`) and says OpenRegister builds no local copy; its tasks wait on this.

Read on openregister development, 7 October 2026:

- `View.presentation`: `{viewType: "table"|"kanban"|"calendar", kanban?: {groupByField, cardFields?, columnOrder?}, calendar?: {dateField, endDateField?}}`; null reads back as `{viewType: "table"}` (`lib/Db/View.php:428-449`).
- `ViewService` refuses a kanban without `kanban.groupByField`, a calendar
  without `calendar.dateField`, and a field that is not a property of the
  view's schema, with a message naming the path (`lib/Service/ViewService.php:437-485`).

## What changes

- New `CnViewPresentationPicker` (props `schema`, `value`; emits `input`).
- `CnSaveViewDialog` gains an optional `schema` prop; with it, the dialog
  shows the picker and emits `presentation` in `confirm`.
- `CnSavedViewsControl` edit form shows the picker for a view the user may
  edit (`@self.access` `owner` or `write`).
- A refusal naming a presentation path is shown under that picker; the form
  stays open.

## Rows unblocked

- openregister `rec-kanban`, `rec-calendar` (the nextcloud-vue half).
- Leaf apps that save views: dossiq and pipelinq (boards by status),
  planninq and decidiq (calendars by date).

## Affected projects

- `nextcloud-vue`: new component, `CnSaveViewDialog`, `CnSavedViewsControl`.
- `openregister`: places the picker in `EditView.vue` and its save form
  (its change).

## Backward compatibility

Additive. Without a `schema` prop `CnSaveViewDialog` renders as today and
emits no `presentation`. A view without `presentation` stays a table.

## Theming

`CnSegmentedControl`, `NcSelect`; Nextcloud CSS variables only.
