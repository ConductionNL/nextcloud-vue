# A self-fetching widget tells its host what it shows

## Why
launchpad's `widget-calculated-fields` (tasks 19, 20, 35) evaluates calculated fields over a widget's data. Its chart
and count widgets are CnChartWidget and CnStatsBlockWidget, which fetch their own data and keep it inside, so the host
has nothing to evaluate against. The hook is generic: any host that derives values from a widget, or exports what it
shows, needs the same thing.

## What changes
A mixin, `widgetData`: a widget defines a `widgetData` computed with a plain summary of what it shows, and the mixin
emits `data` with it once it is known and on every change. CnChartWidget emits `{ series, categories, labels, total }`
(`total` the sum of its first series), CnStatsBlockWidget `{ count }` for one source or `{ counts }` for entries.
Nothing is emitted before there is data.
