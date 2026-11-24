# Proposal: period-field-on-register-forms

## Why

launchpad's dashboards have a period (This month, Quarter, Year) that a widget follows when its register source names the date field of its records as `periodField` (launchpad dashboard-period-and-download REQ-DPD-002). The stat, stats-block and table/object-list config forms rebuild their content from their own fields. So they have no place to choose that date field, and they drop a `periodField` the content already holds when it is saved.

## What changes

- `fetchDateFields(register, schema)`: the date fields of a source, from a sample of five of its records.
- `CnPeriodFieldSelect` (internal): the optional "Date field for the period". It shows only where the host provides `cnOffersPeriodField` (a boolean or a ref), so apps without a dashboard period see no change.
- `CnStatWidgetForm` (`source.periodField`), `CnStatsBlockWidgetForm` (`dataSource.periodField`) and `CnObjectListWidgetForm` (`periodField`) keep the choice. They write it only when it is set, so content without one is emitted exactly as before.

## Impact

Three forms, one internal component, one util, two strings in every catalogue. No public export changes.
