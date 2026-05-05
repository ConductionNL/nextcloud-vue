4-column dashboard row (default) — responsive, collapses to 2 at 1200px:

```vue
<CnKpiGrid>
  <CnStatsBlock title="Cases" :count="42" count-label="open" variant="primary" />
  <CnStatsBlock title="Contacts" :count="128" count-label="total" variant="success" />
  <CnStatsBlock title="Tasks" :count="7" count-label="due today" variant="warning" />
  <CnStatsBlock title="Overdue" :count="3" count-label="items" variant="error" />
</CnKpiGrid>
```

2-column layout:

```vue
<CnKpiGrid :columns="2">
  <CnStatsBlock title="Open tickets" :count="15" variant="primary" />
  <CnStatsBlock title="Resolved" :count="284" variant="success" />
</CnKpiGrid>
```

3-column layout:

```vue
<CnKpiGrid :columns="3">
  <CnStatsBlock title="Schemas" :count="12" variant="primary" />
  <CnStatsBlock title="Objects" :count="4821" variant="success" />
  <CnStatsBlock title="Registers" :count="3" variant="info" />
</CnKpiGrid>
```
