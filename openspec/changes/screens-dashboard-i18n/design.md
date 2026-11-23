# Design: screens-dashboard-i18n

## D1. Where the labels are translated

At the source of the list rather than at each render site: CnDashboardPage's
`effectivePresets` (feeds the pills, the segmented group, the custom popover,
the chip and the picker) and CnDateRangePicker's `presetOptions`. A preset
passed in already translated is translated again harmlessly: the app's
translate returns the key unchanged and the library map has no Dutch keys.

## D2. Literal keys

The library map holds literal `t('nextcloud-vue', '...')` calls, so string
extraction sees them; a dynamic `t('nextcloud-vue', label)` would not be.

## D3. Charts

`plottedSeries` maps names through the host translate after the view filter
(`displayedSeries`), so a view's `series: ["Revenue"]` keeps matching.
