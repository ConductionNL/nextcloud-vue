# Design: index-export-follows-the-page

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `showExportMenu()` returns true only for `allowExport` and a truthy
  `effectiveSchema.exportable` (`src/components/CnIndexPage/CnIndexPage.vue:3589-3590`).
- `onExportClick(format)` (`:5852`) passes `$route.query` to
  `buildExportUrl(register, schema, routeQuery, format)`
  (`src/utils/indexExportHelpers.js:33`), which spreads it after `format`.
- The list itself is fetched with `buildParams(page)`
  (`src/composables/useListView.js:136`): `_search`, `_order`, the active
  facet filters, `_extend`, and the fixed filters merged last.
- `handleMassExport` (`src/components/CnIndexPage/selfModeActions.js:151`)
  calls `runSelfExportRequest` with register, schema and format only.

## Decisions

### D1. The export query is the list query without paging

`onExportClick` takes the parameters the list last fetched with, from
`useListView` in self-fetch mode or from the host's current query
otherwise, drops `_limit` and `_page`, and hands them to
`buildExportUrl`. One builder, so the file and the table cannot drift:
a filter that narrows the table narrows the file.

Rejected: writing the page filter and the quick filter into the route so
`$route.query` carries them. A route that repeats the manifest's fixed
filter is a route that shows it to the user as if they had chosen it.

### D2. The flag is read in both places OpenRegister could keep it

`showExportMenu()` reads `effectiveSchema.exportable`, then
`effectiveSchema.configuration.exportable`. Either true enables the menu.
The top-level field wins when both are set.

Neither survives an OpenRegister save today: `Schema::setConfiguration()`
keeps only allowlisted configuration keys (`lib/Db/Schema.php:2856-2928`
in openregister `555af72`), and a top-level field without a setter is
dropped by `hydrate()`. Reading `configuration.exportable` lets
OpenRegister fix it by adding one word to its `$boolFields` allowlist
(`:2683`), which is the smaller of its two options. The proposal lists it
for the openregister lane.

Rejected: dropping the flag and trusting `allowExport` alone. The flag
is how a schema owner says a register may leave the building; the page
maker should not be able to override that by setting a prop. The export
leaf enforces the right per user either way (OpenRegister's
`ExportRightService`).

### D3. The mass export is the selection or the filter

With rows selected, `handleMassExport` sends their ids. With none, it
sends the D1 query. The dialog says which of the two it will do before
the user confirms ("Export 12 selected rows" or "Export 340 rows matching
the current filter"). Exporting the whole schema is still possible: clear
the filter.

## Files

- `src/components/CnIndexPage/CnIndexPage.vue`: `showExportMenu`,
  `onExportClick`.
- `src/utils/indexExportHelpers.js`: take a params object, strip paging.
- `src/composables/useListView.js`: expose the last params.
- `src/components/CnIndexPage/selfModeActions.js`: `handleMassExport`.
- `src/components/CnMassExportDialog/CnMassExportDialog.vue`: the sentence.

## Risks

- [OpenRegister's export leaf ignores a parameter the list honours] ->
  the jest test asserts the URL; an e2e against a real OpenRegister is a
  consumer check, named in the tasks.
