# Design: index-calendar-view-mode

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `CnObjectCalendar` (`src/components/CnObjectCalendar/CnObjectCalendar.vue`)
  takes `objects`, `dateField`, `endDateField`, `titleField`, `rowKey`,
  `visibleDate`, `loading` and `maxEventsPerDay`. It renders one month,
  spans an object from `dateField` to `endDateField` inclusive, emits
  `range-change` when the month moves and `object-click` on an entry. It
  fetches nothing. Exported from `src/index.js:188`, mounted nowhere.
- `CnIndexPage` renders `board` and `dateAxis` from `displayObjects`
  behind `currentViewMode` (`src/components/CnIndexPage/CnIndexPage.vue:538`,
  `:556`), with the allowed values in the `viewMode` validator (`:1447`)
  and `availableViewModes` (`:1545-1548`). The pattern was set by
  `cnindexpage-map-viewmode` and followed by `status-board-and-date-axis`.
- OpenRegister serves `GET /api/views/{id}/calendar?start=&end=`
  (`appinfo/routes.php:1794`) for a saved view. An index page without a
  saved view uses its ordinary list query.

## Decisions

### D1. A view mode, the same way board and date axis are

```json
"config": {
  "viewModes": ["table", "calendar"],
  "calendar": { "dateField": "inspectionDate", "endDateField": "inspectionEnd", "titleField": "address" }
}
```

A calendar page type would need its own search, filters, sidebar and
detail navigation, which the index page already has. The validator and
`availableViewModes` gain `calendar`; the toggle shows it only when
`config.viewModes` lists it.

### D2. The month is a filter on the list query

On entering calendar mode and on each `range-change`, the page adds a
range condition on `dateField` (and on `endDateField` when set, so
entries that started before the month but run into it are included) to
the query it already sends, and resets pagination to one page sized to
the month. Leaving calendar mode removes the condition. When the page is
showing a saved view, it asks `/api/views/{id}/calendar` instead, which
is the endpoint `CnObjectCalendar`'s own documentation names.

Rejected: fetching every row and letting the calendar pick. A schema
with thirty thousand inspections would load thirty thousand rows to draw
one month.

### D3. More than fits is a count, and the count opens the day

`maxEventsPerDay` already shows "+N". The "+N" becomes a button that
switches the page to the table view filtered to that day, rather than a
popover that becomes a second list.

### D4. The calendar is operable from the keyboard

Month navigation buttons already carry labels. Each day cell becomes a
focusable grid cell with arrow-key movement, and each entry a button, so
a keyboard user can reach every record the mouse can.

## Files

- `src/components/CnIndexPage/CnIndexPage.vue`: the mode, the range
  condition, the saved-view branch.
- `src/components/CnObjectCalendar/CnObjectCalendar.vue`: the "+N" button
  and the keyboard grid.
- `src/components/CnActionsBar/CnActionsBar.vue`: the toggle segment.
- `src/schemas/app-manifest-v2.schema.json`: `calendar` in `viewModes` and
  the `calendar` block.

## Theming

Entries use the schema's status colour when the page names a status
field, otherwise `--color-primary-element-light`. Today uses
`--color-primary-element`.
