# Proposal: aggregate-merge-by-label

## Why

DqDashboard draws Zaken per status with one bar per status name: Ontvangen, In behandeling, Wacht op inwoner, Besluit,
Publiceren. Status types are declared per case type, so a case aggregate grouped on `status` gets one key per case
type's "Ontvangen", and the chart drew the same label several times ("Onbekend" twice for two dangling ids). An
undocumented `mergeByLabel` folded same-label bars, but only after `topN` had cut the list, without sorting again, and a
merged bar drilled into its first key only, which listed a fraction of the cases it counted. The manifest schema refused
the key.

## What changes

`aggregate.mergeByLabel: true` resolves every group's label, folds the groups whose labels read the same into one
(values summed, first colour kept), sorts again and only then applies `topN` and `otherBucket`. A merged bar keeps all
its keys; its drilldown puts them in the query as a list, and a bar with one key keeps a plain value. Manifest schema
2.141.0 accepts the key on an aggregate. Without it nothing changes.

## Scope

nextcloud-vue CnChartWidget and the manifest schema; dossiq sets it on the Dashboard status chart (R22-DASH).
