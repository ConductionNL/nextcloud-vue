# CnActivityCard

The `activity` integration's widget, by surface: a count and the latest event on a dashboard, a compact day-grouped feed on a detail page, a chip for a single event. The full merged feed (kind chips, the reads toggle, a date range, export) is [CnActivityTab](./cn-activity-tab.md), which the integration also registers as its expanded widget (`widgetExpanded`), so a detail page that mounts it can drop its separate audit and version tabs.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showVisibility` | Boolean | `false` | Show a visibility chip on each row of the detail-page feed. |
| `integrationId` | String | `'activity'` | Stable integration id. |
| `register` | String | required | OpenRegister register id. |
| `schema` | String | required | OpenRegister schema id. |
| `objectId` | String | required | Parent object id. |
| `surface` | String | `'detail-page'` | Rendering surface. |
| `value` | String, Number | `''` | A single event id, for the single-entity surface. |
| `title` | String | "Activity" | Pre-translated card title. |
| `icon` | Object | Timeline icon | Material Design Icon component. |
| `apiBase` | String | `/apps/openregister/api` | Base API URL. |
| `collapsible` | Boolean | `true` | Whether the card body is collapsible. |
| `pageSize` | Number | `12` | Compact-feed page size. |

## Slots

None.
