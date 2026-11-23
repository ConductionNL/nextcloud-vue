---
kind: code
---

# Proposal: dashboard-board-termijnen

## Summary

Three gaps between dossiq's DqTermijnen, DqDoorlooptijd and DqProcesanalyse boards and CnDashboardPage under the board look.

1. The header keeps its actions on the title's row. The description and its segmented period run under both at the header's full width. As two flex columns the description shared the title's column, so on Termijnen the period group wrapped and the actions dropped to a line of their own.
2. A stacked board stat tile in the `kpiRow` sits 18px 20px inside its card, as the board draws it. The card-fit cell added its own 8px 14px, so the label sat 29px from the tile's top and 37px from its side, and the row stood about 1.4 times the board's height.
3. A page filter can be a segmented group on the description line (`control: "segmented"`, `placement: "description"`), and an endpoint widget can read the chosen value in its `responsePath` (`phaseDays.@workspace.measure`). DqProcesanalyse switches its matrix between the mean and the median this way.

## Scope

- `src/css/look-board.css`: the header grid and the KPI row inset, both under `.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)`. Without the board look nothing changes.
- `src/components/CnDashboardPage/CnDashboardPage.vue`: segmented page filters on the description line or in the filter row.
- `src/composables/useEndpointSource.js`: tokens in `responsePath`, resolved like URL tokens; a token without a value blocks the read.
- Manifest schema: `pageFilters[].control` (`select` | `segmented`) and `pageFilters[].placement` (`row` | `description`) are new keys, added by the batch integration's schema bump.
