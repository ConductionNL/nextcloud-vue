# CnEventsCard

The appointments booked on a record that is not an OpenRegister object, as a list: each event's summary, its time (start to end) and its place. Widget type `events`, for a detail page.

It reads a `source` or an `endpoint`. `{ kind: "flow-task" }` reads OpenRegister's `/api/flow-tasks/{id}/events`, the appointments on a task of the task engine; the rows carry `summary`, `dtstart` / `dtend` and `location`. It lists and does not create. A refused or failed read says so ("The appointments could not be loaded") instead of showing an empty list.

## Usage

```json
{ "id": "task-appointments", "type": "events", "title": "Appointments",
  "content": { "source": { "kind": "flow-task" }, "emptyText": "Nobody has booked an appointment on this task" } }
```

```vue
<CnEventsCard :source="{ kind: 'flow-task' }" :objectId="taskUuid" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | Object | `null` | Where the events come from: `{ kind: 'flow-task', id? }`. `id` may be left out or written `@objectId` for `objectId`. Also read from `content.source`. |
| `endpoint` | String | `''` | An events URL of its own; `{id}` is filled with the record id. Also read from `content.endpoint`. |
| `objectId` | String \| Number | `''` | The page's record id. |
| `apiBase` | String | `'/apps/openregister/api'` | The OpenRegister API base. |
| `content` | Object | `{}` | The widget content: `source`, `endpoint`, `emptyText` (through the app's translate). |
| `emptyLabel` | String | `''` | The empty line; defaults to `content.emptyText`, then "No appointments yet". |
| `failedLabel` | String | `''` | The failure line; defaults to "The appointments could not be loaded". |
