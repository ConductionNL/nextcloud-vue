---
sidebar_position: 29
---

# CnTimelineView

Date-grouped event/session timeline. Renders an `events[]` array grouped by day (default) or by a custom `groupBy` function, with the event time range + title + optional location/description per row. Click-emits the original event for drilldown.

Intentionally **not** a calendar grid (month/week view) — that's a separate `CnCalendarGrid` widget tracked under [`nextcloud-vue#284`](https://github.com/ConductionNL/nextcloud-vue/issues/284) follow-ups. Consumers typically want the chronological-list view this component provides ("cohort timetable", "user's day", "activity feed").

## Try it

```vue
<CnTimelineView
  title="Cohort timetable"
  :events="events"
  @event-click="openSession" />
```

```js
const events = [
  { id: 'a', title: 'Math 101', start: '2026-05-21T09:00:00Z', end: '2026-05-21T10:30:00Z', location: 'Room 12' },
  { id: 'b', title: 'Physics',  start: '2026-05-21T11:00:00Z', end: '2026-05-21T12:00:00Z' },
  { id: 'c', title: 'Lab',      start: '2026-05-22T09:00:00Z', kind: 'break' },
]
```

## Custom grouping

Pass a `groupBy` function that returns `{ key, label }` for the group an event belongs to:

```vue
<CnTimelineView
  :events="events"
  :group-by="(evt) => ({ key: evt.cohortId, label: cohortLabel(evt.cohortId) })"
  sort="desc" />
```

## Kind-class colouring

Map an event's `kind` field to a CSS-class suffix so consumers can colour-code rows:

```vue
<CnTimelineView
  :events="events"
  :kind-class-map="{ break: 'break', holiday: 'holiday', exam: 'exam' }" />
```

Resolves to `cn-timeline-view__event--break` etc.; built-in styles cover `break` (dimmed) and `holiday` (warning-tinted). Style additional values from the consumer side.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `Array<{id?,title?,start,end?,location?,description?,kind?}>` | `[]` | Event list. `start` MUST parse to a valid Date. |
| `title` | String | `''` | Heading above the timeline. |
| `description` | String | `''` | Description under the title. |
| `emptyLabel` | String | `'No events scheduled.'` | Empty-state text. |
| `untitledLabel` | String | `'Untitled'` | Fallback for events without a title. |
| `hideCounts` | Boolean | `false` | Hide the per-group event-count badge. |
| `groupBy` | `(event) => {key, label}` | `null` | Custom grouping; default groups by ISO date with locale label. |
| `sort` | `'asc'\|'desc'` | `'asc'` | Group sort direction. |
| `kindClassMap` | `Record<string,string>` | `{}` | Optional `kind` → BEM modifier map. |
| `locale` | String | `undefined` | Locale for the default group label + time formatting. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `event-click` | `event` | Clicked event row. |

## Slots

- `#header` — replaces the default title/description header.
- `#event` — replaces the default event-row body. Scope: `{ event, formattedTime }`.

## Follow-up

- `CnCalendarGrid` — month / week grid view.
- Date-range zoom controls.
- Drag-to-create overlays.
