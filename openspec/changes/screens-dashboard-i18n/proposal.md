---
kind: code
---

# Proposal: screens-dashboard-i18n

## Summary

On PqVerkoopoverzicht (pipelinq, board look, Dutch user) the dashboard's
period labels print in English ("Last 30 days", "Custom range") and so do
parts of the charts. Two library causes:

1. The default date-range presets carry English labels that no component
   translates: CnDashboardPage draws `preset.label` as written in its pills,
   its segmented group and its date chip, and CnDateRangePicker does the same
   in its select. The `nextcloud-vue` catalogue has no entries for them.
2. CnChartWidget draws a chart view's `label` and hands series `name`s to
   ApexCharts (legend, tooltip) as written in the manifest, without the host
   translate function every other manifest label goes through.

This change:

- adds `translatePresetLabel(label, translate)` to CnDateRangePicker: the
  app's catalogue first, then the library's own translation of the seven
  default labels (new `nextcloud-vue` keys, Dutch added), else the label as
  written; CnDashboardPage's `effectivePresets` and the picker's options use it;
- runs a chart's view labels and series names through `cnTranslate`. Views
  keep filtering on the name as written.

Also checked (round6 dossiq gap 11): the object-list footer strings "+{count}
more" and "Add" already go through `t('nextcloud-vue', ...)` and have Dutch
entries ("+{count} meer", "Toevoegen"); the board draws neither on a dashboard
list card, which `screens-dashboard-legacy-widgets` handles for the Add footer.

## Affected consumers

Every app with a dashboard date range or a chart with views or named series.
An app without translations sees the same English text as before.

## Backward compatibility

Text only. No props, no schema change.
