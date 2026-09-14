---
kind: code
---

# Proposal: object-list-widget-grouping-select-facet

## Summary

`CnObjectListWidget` grows five seams — `groupBy`, `selectable` +
`bulkActions`, `sortable`, `facet`, and a click-to-upload button riding the
existing `dropZone` action — so it can host dossiq's Documents tab
(`src/views/cases/components/DossierTab.vue`) without removing any of that
tab's shipped capability.

Opened as the decision recorded in dossiq
`openspec/changes/documents-on-the-case/tasks.md#2.2` (Ruben, 2026-09-11,
option b): "Grow `CnObjectListWidget` further — row grouping, a facet control
and multi-select — and then swap." That entry is the measurement this change
is built from; this proposal restates it as its own nextcloud-vue change with
its own file-and-line evidence, per that decision's own condition.

## Motivation

Task 2.2 originally read "swap the Documents tab onto the generic library
list." Measured against `DossierTab.vue` as it stands today, that tab does
five things the widget could not do before this change:

1. **Groups rows by type**, rendered through `DossierGroup`, not one flat
   table — `DossierTab.vue:93-120` (the `dossier-tab__groups` container and
   the `v-for="group in visibleGroups"` loop), backed by `groups` data
   (`DossierTab.vue:199-200`) fetched as pre-grouped from
   `/apps/dossiq/api/cases/{id}/dossier` (`DossierTab.vue:301-320`).
2. **Multi-selects rows** with bulk actions — `selectedIds` state
   (`DossierTab.vue:202`), `toggleSelect` (`DossierTab.vue:468-481`), and a
   `BulkActionsBar` (`DossierTab.vue:47-54`) wired to mark-final,
   change-confidentiality, ZIP-download and clear-selection
   (`DossierTab.vue:492-578`).
3. **Sorts interactively** via a dropdown, not a fixed manifest default —
   `DossierTab.vue:14-21` (the `NcSelect` bound to `sortKey`), options at
   `DossierTab.vue:250-256`.
4. **Filters by keyword**, faceted on the keywords actually in use —
   `DossierTab.vue:22-29` (the `NcSelect` bound to `keywordFilter`),
   `availableKeywords` (`DossierTab.vue:264-266`, via
   `collectKeywords(this.groups)`) and `visibleGroups`
   (`DossierTab.vue:274-276`, via `filterGroupsByKeywords`). This is sibling
   task 2.3, already shipped.
5. **Uploads via a click-to-pick button**, not drag-and-drop alone —
   `DossierTab.vue:30-35` (the Upload button) and `:39-45` (the hidden file
   input), `triggerFilePicker` / `onFilesSelected`
   (`DossierTab.vue:361-378`).

`CnObjectListWidget` as of nextcloud-vue 2.47.0 (#1090: `extend`,
`rowActions`, `dropZone`) already carries per-row actions through
`CnRowActions` and a drag-and-drop `dropZone` — so open-in-Files, Versions
and Delete per row (`DossierTab.vue:116-119`) are NOT part of this gap; a
`rowActions` config already covers them. Nor is column-level sorting
machinery: `CnDataTable` already emits a `sort` event on a sortable header
click (`CnDataTable.vue:1230-1245`) and already renders a checkbox column
given `selectable` + `selectedIds` (`CnDataTable.vue:73-152`,
`:423-431`) — `CnObjectListWidget` simply never wired either one. That
halved the size of this change: sorting and selection needed the widget to
forward existing `CnDataTable` capability, not build new capability from
scratch.

One DossierTab affordance is deliberately OUT of this gap list: the live
document count in the tab title (`DossierTab.vue:11`,
`{{ t('dossiq', 'Documents') }} ({{ total }})`). That count lives on the
page's tab label, which is `CnTabs`/manifest schema territory
(`src/schemas/app-manifest-v2.schema.json` `sidebarTabs[]` has no badge/count
field), not `CnObjectListWidget`'s render surface — extending it would be a
materially different, larger change than "grow the list widget." It is also
not among the five capabilities Ruben's decision named to carry over
(grouping, multi-select, sorting, keyword filtering, upload). Recorded here
as a known, deliberate scope cut rather than a silent one.

## Affected projects

- `nextcloud-vue`: `CnObjectListWidget` (`src/components/CnObjectListWidget/CnObjectListWidget.vue`).
- Consumer: dossiq's Documents tab (`documents-on-the-case` task 2.2), once
  this change is released. No other current consumer of `CnObjectListWidget`
  is known to need these five keys, so the defaults are chosen to be fully
  inert when absent (verified by the pre-existing 53-test suite staying
  green unmodified).

## Backward compatibility

Every new key is opt-in and additive:

- No `groupBy` → the existing single-`CnDataTable` render path, unchanged.
- No `selectable` → no checkbox column, no bulk bar; `content.selectable`
  must be exactly `true` to turn it on.
- No `sortable` → columns keep whatever `sortable` they declared directly
  (or none); the fixed `content.sort` default still seeds the initial fetch
  order exactly as before.
- No `facet` → no filter chips render, `facetedRows` is `visibleRows`
  unchanged.
- No `dropZone` → no upload button (it rides the same action a drop already
  required); `content.upload: false` opts a drop-only widget out of the
  button without touching `dropZone` itself.

## Theming

None — the new chips/bar/group-heading markup uses the existing NC CSS
custom properties (`--color-primary-element`, `--color-border`,
`--color-text-maxcontrast`, …), matching the rest of the widget's plain-HTML
controls (Add, View all).
