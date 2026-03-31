---
sidebar_position: 10
---

# CnKpiGrid

Responsive grid layout for KPI/statistics cards. Adapts columns to screen width.

## Props

![CnKpiGrid showing KPI metric cards on the dashboard](/img/screenshots/cn-kpi-grid.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Number | `4` | Number of columns (2, 3, or 4) |
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
