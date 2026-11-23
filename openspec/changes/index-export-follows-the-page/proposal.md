---
kind: code
depends_on: []
---

# Proposal: index-export-follows-the-page

## Why

"Export this list" should export the list the user is looking at. On a
Conduction index page it does not, in three ways:

1. The Export menu (`allowExport`) forwards only the route query to
   OpenRegister's export. The page's own filter (`config.filter`), the
   active quick filter and the search box live in component state, so a
   list filtered to "Active" exports every row.
2. The same menu only appears when the schema carries a top-level
   `exportable: true`. OpenRegister keeps that flag nowhere on a schema,
   so on a real instance the menu never appears.
3. The mass-action Export, which is on by default, exports the whole
   schema with no filter at all.

So in practice the only export a user reaches is the one that ignores
what they filtered.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| humaniq | `rep-export` | Export any list to a spreadsheet. | partial | built |

Note on the row: "Only the fetched or selected rows can be exported as a
blob; humaniq never opts into the library's full filtered-list export
(allowExport + schema exportable:true), so 'export any list' is only
partly true." Turning on `allowExport` is humaniq's half. That the
filtered export works once turned on is this change.

## Competitor evidence, quoted from the humaniq matrix

Five competitors rated yes, no demand row:

- AFAS, "any view (weergave) in InSite or Profit can be exported to
  Microsoft Excel", https://help.afas.nl/help/NL/SE/Data_MnInfo_Excel_Export.htm
- Visma Raet Youforce, "Exporteren CSV with shared definitions",
  https://community.visma.com/t5/Releases-YouServe/tkb-p/nl_ys_vismayouserve_releases/page/2
- HR2day, "export to Excel, PDF or BI tools",
  https://www.hr2day.com/features/hr-analytics/data-rapportage/
- Loket.nl, "compose your own exports of complete data sets",
  https://loket.nl/functionaliteiten/rapportages/
- Personio, "export the People List with extra columns",
  https://support.personio.de/hc/en-us/articles/115001324149-Overview-of-the-People-List

## Sibling halves this change also covers

Three sibling changes name the same library gap. Each is answered here.

- stackiq `insight-exports-and-custom-reports` (design D3): "The Export
  menu forwards `$route.query` only ... `config.filter`, the active quick
  filter and the search box live in component state". Stackiq turns the
  menu on for Contracten and Organisaties only with the release that
  forwards the merged filter.
- buildiq `data-index-grid-and-saved-views` and its matrix row
  `data-export-records`: "the filtered `allowExport` menu in
  nextcloud-vue needs a schema flag OpenRegister does not serve".
- larpinq `admin-import-export`: relies on `allowExport` and
  `exportFormats` on its index pages.

## What changes

- The Export menu sends the same query the list sends: search, sort,
  facet filters, the page filter and the quick filter, without paging.
- The menu reads the schema's export flag under `configuration.exportable`
  as well as the top-level field, so OpenRegister can keep it with a
  one-word allowlist change instead of a new schema column.
- The mass-action Export exports the selected rows when there is a
  selection, and the filtered list otherwise. It never silently exports
  the whole schema.

## Affected projects

- `nextcloud-vue`: `CnIndexPage` (`showExportMenu`, `onExportClick`),
  `src/utils/indexExportHelpers.js`, `selfModeActions.js`
  (`handleMassExport`), `useListView`.
- Consumers: humaniq, stackiq, buildiq, larpinq, and every page with
  `allowExport`.

## Backward compatibility

`allowExport` stays opt-in and false by default. A schema flagged either
way enables the menu; a schema flagged nowhere still does not. A page
whose export used to include rows outside its filter now exports fewer
rows, which is the fix.

## Cross-project dependencies

- OpenRegister keeps neither place today. It drops an unknown top-level
  field (`lib/Db/Schema.php` hydrate, as stackiq's design D2 reads it),
  and it also drops an unknown `configuration` key: `setConfiguration()`
  keeps only the keys `validateConfigurationEntry()` allowlists
  (`lib/Db/Schema.php:2682-2697` and `:2856-2928` at `555af72`), and
  `exportable` is not among them. Corrected on 2026-09-27: the first
  version of this change, and stackiq's design D2, said the
  `configuration` key survives; it does not. The OpenRegister half is to
  add `exportable` to the boolean configuration keys (`$boolFields`,
  `:2683`), or to serve a top-level field. Until one of them ships, the
  Export menu does not appear on a real instance, and the filter
  forwarding in D1 and the mass export in D3 are what users get. Listed
  for the openregister lane.
- OpenRegister's export leaf must accept the same filter parameters as the
  list endpoint. Its route is `objects#export`
  (`appinfo/routes.php:1175` at `555af72`).
