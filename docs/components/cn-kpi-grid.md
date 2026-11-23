---
sidebar_position: 10
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnKpiGrid.md'

# CnKpiGrid

Responsive grid layout for KPI/statistics cards. Adapts columns to screen width.

## Try it

<Playground component="CnKpiGrid" />

## Props

![CnKpiGrid showing KPI metric cards on the dashboard](/img/screenshots/cn-kpi-grid.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Number \| `"auto"` | `4` | Number of columns (2, 3, or 4), or `"auto"` for `repeat(auto-fit, minmax(200px, 1fr))` |
| `grid-class` | String | `''` | Extra classes to add on top of the grid |

## Slots

| Slot | Description |
|------|-------------|
| default | CnStatsBlock components |

## Usage

```vue
<CnKpiGrid :columns="4">
  <CnStatsBlock title="Contacts" :count="150" variant="primary" />
  <CnStatsBlock title="Companies" :count="42" variant="success" />
  <CnStatsBlock title="Leads" :count="23" variant="warning" />
  <CnStatsBlock title="Deals" :count="8" variant="info" />
</CnKpiGrid>
```

## `columns: "auto"`

`columns="auto"` lays the tiles out as `repeat(auto-fit, minmax(200px, 1fr))`
with a 16px gap: four in a row at 1240px, two at 700px, one on a phone, each at
least 200px wide. `CnDashboardPage` uses it for `config.kpiRow`.
## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnKpiGrid.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnKpiGrid/CnKpiGrid.vue) and update automatically whenever the component changes.

<GeneratedRef />
