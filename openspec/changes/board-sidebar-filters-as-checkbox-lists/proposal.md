# Proposal: board-sidebar-filters-as-checkbox-lists

## Why

Board DqZakenSorteren draws the side panel's filters as checkbox lists: "Filters" with "Alles wissen" beside it, then
per field (Team, Status, Zaaktype) a label over one row per value, a checkbox, the value and its count at the end. Live
(24 Oct) drew a picker per field and Clear all as a separate button. Coordinator: build it (24 Oct).

## What changes

In the board look CnIndexSidebar draws a multi-value field with at most 12 values as checkbox rows: label and count from
the facet (the field's own options without one; a "No value" row for the facet's missing count). Ticking a row emits the
field's new values through the same `filter-change` event. A single-choice field, a reference field and a field with more
values keep the picker; date ranges and text fields are unchanged. "Clear all" moves beside the Filters heading as a
link. The Nextcloud look is unchanged. New l10n key "No value" (en, nl). No schema change.
