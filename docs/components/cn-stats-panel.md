---
sidebar_position: 12
---

# CnStatsPanel

Data-driven statistics panel that renders sections of stat blocks and list items from a single `sections` prop. Drop it into a sidebar tab, a dashboard widget, or any container that needs structured statistics.

**Wraps**: CnStatsBlock, CnKpiGrid, NcListItem, NcLoadingIcon, CnIcon

## When to use

Use CnStatsPanel when you have statistics to display and want a consistent layout without manually wiring up CnStatsBlock, CnKpiGrid, and NcListItem. You describe **what** to show (sections, items, layout) and the component handles **how** it renders.

Typical placements:
- Sidebar statistics tab (e.g. audit trail stats, register overview)
- Dashboard panel or widget
- Any area that summarises counts, breakdowns, or ranked lists

## Concepts

### Sections

The `sections` prop is an array. Each section is either a **stats** section or a **list** section, rendered in order.

### Stats sections

Render CnStatsBlock cards. Choose a layout per section:

- **`stack`** — Vertical column. Blocks default to `horizontal: true` (icon left, content right). Best for sidebars.
- **`grid`** — CnKpiGrid wrapper with configurable columns (2, 3, or 4). Blocks default to `horizontal: false` (icon above content). Best for wider areas or KPI breakdowns.

### List sections

Render NcListItem entries with icon and subname. Use these for ranked lists like "most active objects" or "action distribution".

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | Array | `[]` | Section definitions (see data shape below) |
| `loading` | Boolean | `false` | Global loading state — hides all sections and shows a spinner |
| `loadingLabel` | String | `'Loading...'` | Text shown next to the loading spinner |
| `emptyLabel` | String | `'No data available'` | Default text shown when a section has no items. Can be overridden per section via `section.emptyLabel`. |

### Section data shape

**Stats section:**

```js
{
  type: 'stats',
  id: 'totals',                // unique id, used for slot naming
  title: 'System Totals',      // section heading (optional)
  layout: 'stack',             // 'stack' or 'grid'
  columns: 2,                  // grid columns (2|3|4), only for layout: 'grid'
  loading: false,              // per-section loading state
  emptyLabel: 'No stats yet',  // empty text for this section (overrides component prop)
  items: [/* StatItem[] */],
}
```

**StatItem:**

```js
{
  title: 'Objects',
  count: 42,
  countLabel: 'objects',
  variant: 'primary',          // 'default' | 'primary' | 'success' | 'warning' | 'error'
  icon: PackageIcon,           // component ref (e.g. imported MDI icon) or string for CnIcon registry
  iconSize: 24,                // icon pixel size (default: 24)
  horizontal: true,            // override layout default (stack=true, grid=false)
  showZeroCount: true,         // show "0" instead of empty label (default: true)
  breakdown: { size: '2 MB' }, // key-value breakdown passed to CnStatsBlock
  route: { name: 'Objects' },  // Vue Router location for clickable navigation
  clickable: false,            // enable click event without route
  loading: false,              // per-item loading state
}
```

**List section:**

```js
{
  type: 'list',
  id: 'topObjects',            // unique id, used for slot naming
  title: 'Most Active',        // section heading (optional)
  loading: false,              // per-section loading state
  emptyLabel: 'No items yet',  // empty text for this section (overrides component prop)
  items: [/* ListItem[] */],
}
```

**ListItem:**

```js
{
  key: 'obj-1',                // unique key for v-for
  name: 'Object A',            // display name
  subname: '42 entries',        // secondary text
  bold: false,                  // bold name (default: false)
  icon: CogOutline,            // component ref or string for CnIcon registry
  iconSize: 32,                // icon pixel size (default: 32)
}
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `stat-click` | `{ section, item, index }` | A clickable stat block was clicked |
| `list-click` | `{ section, item }` | A list item was clicked |

## Slots

| Slot | Scoped data | Description |
|------|-------------|-------------|
| `header` | — | Content above all sections (filters, selectors) |
| `footer` | — | Content below all sections |
| `section-{id}` | `{ section }` | Replace an entire section's content |
| `item-icon-{sectionId}` | `{ item }` | Override icon rendering for list items in a section |
| `item-subname-{sectionId}` | `{ item }` | Override subname rendering for list items in a section |

## Usage

### Stacked stats in a sidebar

```vue
<CnStatsPanel :sections="[{
  type: 'stats',
  id: 'totals',
  title: 'Register Totals',
  layout: 'stack',
  items: [
    { title: 'Registers', count: 5, countLabel: 'registers', variant: 'primary', icon: DatabaseOutline },
    { title: 'Schemas', count: 12, countLabel: 'schemas', variant: 'primary', icon: TableIcon },
    { title: 'Objects', count: 340, countLabel: 'objects', icon: PackageIcon, breakdown: { invalid: 3 } },
  ],
}]" />
```

### Grid + list with custom icons

```vue
<CnStatsPanel :sections="sections">
  <!-- Override list icons with conditional rendering -->
  <template #item-icon-actions="{ item }">
    <Pencil v-if="item.key === 'update'" :size="32" />
    <Plus v-else-if="item.key === 'create'" :size="32" />
    <Delete v-else-if="item.key === 'delete'" :size="32" />
    <Eye v-else :size="32" />
  </template>
</CnStatsPanel>
```

```js
computed: {
  sections() {
    return [
      {
        type: 'stats',
        id: 'operations',
        title: 'Operations',
        layout: 'grid',
        columns: 2,
        items: [
          { title: 'Create', count: 10, countLabel: 'ops', variant: 'success', icon: Plus },
          { title: 'Update', count: 25, countLabel: 'ops', variant: 'warning', icon: Pencil },
          { title: 'Delete', count: 3, countLabel: 'ops', variant: 'error', icon: Delete },
          { title: 'Read', count: 80, countLabel: 'ops', icon: Eye },
        ],
      },
      {
        type: 'list',
        id: 'actions',
        title: 'Action Distribution',
        items: this.actionDistribution.map(a => ({
          key: a.action,
          name: a.action,
          subname: `${a.count} entries`,
        })),
      },
    ]
  },
},
```

### With header filters and loading state

```vue
<CnStatsPanel
  :sections="registerSections"
  :loading="dashboardStore.loading"
  loading-label="Loading statistics...">
  <template #header>
    <div class="filterGroup">
      <NcSelect v-bind="registerOptions" @update:model-value="onRegisterChange" />
      <NcSelect v-bind="schemaOptions" @update:model-value="onSchemaChange" />
    </div>
  </template>
</CnStatsPanel>
```

### Mixed layouts (stack hero + grid breakdown)

Split a single visual group into two sections — one stacked "hero" block and one grid:

```js
sections: [
  {
    type: 'stats',
    id: 'hero',
    title: 'Audit Trail Statistics',
    layout: 'stack',
    items: [{ title: 'Total', count: 1250, countLabel: 'entries', variant: 'primary', icon: TextBoxOutline }],
  },
  {
    type: 'stats',
    id: 'breakdown',
    layout: 'grid',
    columns: 2,
    items: [
      { title: 'Create', count: 400, countLabel: 'ops', variant: 'success', icon: Plus },
      { title: 'Update', count: 600, countLabel: 'ops', variant: 'warning', icon: Pencil },
      { title: 'Delete', count: 50, countLabel: 'ops', variant: 'error', icon: Delete },
      { title: 'Read', count: 200, countLabel: 'ops', icon: Eye },
    ],
  },
]
```

## Icons

Icons can be provided two ways:

1. **Component reference** (recommended) — import an MDI icon and pass it directly:
   ```js
   import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
   // ...
   { icon: DatabaseOutline }
   ```

2. **String name** — uses the CnIcon registry (must be registered at app boot via `registerIcons()`):
   ```js
   { icon: 'DatabaseOutline' }
   ```
