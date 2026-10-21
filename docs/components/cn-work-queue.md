# CnWorkQueue

One list of everything waiting on the reader: tasks, consultations, mentions, calendar items and work they cover for a colleague, from as many sources as the server declares. dossiq's personal queue is the first; pipelinq's queue has the same shape.

- The component names no source. The server answers the groups, each with a key, a label, a sentence saying what closes it, and its items. A new kind of work needs no change here.
- A source that could not be read is named at the top ("Calendar could not be read, so this list is incomplete."). It is not folded into "Nothing is waiting on you": those are different sentences.
- A group can be hidden until tomorrow. The server keeps that choice, so it follows the reader to another device.
- It reads again on `cn:page:refresh`, so work planned or closed in a dialog shows at once.
- An item opens by its `route` (through the router), its `href` (like a link, so a ctrl or middle click opens a new tab), or `itemHref`; otherwise the queue emits `open`.

It is also the `work-queue` catalog widget, taking the same `content`.

## Usage

```vue
<CnWorkQueue
  title="Your queue"
  :content="{
    source: { url: '/apps/dossiq/api/personal-queue' },
    hide: '/apps/dossiq/api/personal-queue/groups/{group}/hide',
    show: '/apps/dossiq/api/personal-queue/groups/{group}/show',
  }">
  <template #actions>
    <NcButton @click="planning = true">Plan an item</NcButton>
  </template>
</CnWorkQueue>
```

The source answers:

```json
{
  "groups": [
    {
      "key": "tasks",
      "label": "Tasks",
      "closesWhen": "Closes when you complete the task.",
      "items": [
        { "id": "t1", "title": "Ask advice", "dueAt": "21 Oct", "deadlineTier": "overdue", "route": { "name": "TaskDetail", "params": { "id": "t1" } } },
        { "id": "t2", "title": "Plan the site visit", "covered": true, "coveredFor": "Sanne de Vries", "waiting": { "on": "applicant", "days": 4, "chases": 2 } }
      ]
    }
  ],
  "hiddenGroups": [],
  "unavailable": [{ "source": "calendar", "label": "Calendar" }]
}
```

An item with `deadlineTier: "overdue"` is drawn as late. `waiting` reads "Waiting on the applicant for 4 days, chased 2 times".

## Content

| Key | Description |
|-----|-------------|
| `source` | An endpointSource answering `{ groups, hiddenGroups?, unavailable? }` |
| `hide`, `show` | Url templates with `{group}` that hide a group until tomorrow and show it again, each answering `{ hiddenGroups }`; without `hide` no group can be hidden |
| `itemHref` | A template filled from an item, for items with no `route` or `href` |
| `waitingParties` | Words for `waiting.on` beyond the library's applicant, third party and us, through the app's translate |
| `emptyText` | Text when nothing is waiting, through the app's translate |
| `itemsPath` | Read a flat list at this path of the answer (`{ items, total }`) as one group without a heading. An item's `routeName` opens `{ name: routeName, params: { id } }` |
| `totalPath` | Where the answer holds the full count, for `viewAll` |
| `viewAll` | `{ route \| href, label }`: a link under the list while the total exceeds what is shown; `{count}` in the label is the total (default "View all ({count})") |
| `dueField` | The item field shown as its due text (default `dueAt`) |
| `lateField` | An item field that marks it late when true (default: `deadlineTier` is `overdue`) |
| `subField` | An item field shown under the title |
| `kind` | `{ field, labels }`: the item's kind ahead of the sub line, through the app's translate (`{ field: "entityType", labels: { lead: "Lead", request: "Request" } }`) |

A flat list, as pipelinq's worklist answers it:

```json
{
  "type": "work-queue",
  "content": {
    "source": { "url": "/apps/pipelinq/api/worklist/mine", "params": { "limit": 5 } },
    "itemsPath": "items",
    "totalPath": "total",
    "dueField": "dueDate",
    "lateField": "isOverdue",
    "subField": "stageOrStatus",
    "kind": { "field": "entityType", "labels": { "lead": "Lead", "request": "Request" } },
    "viewAll": { "route": { "name": "MyWork" }, "label": "View all ({count})" },
    "emptyText": "No items assigned to you"
  }
}
```

A failed read shows the error with a retry, never the empty text and never a count of 0.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above |
| `title` | String | `''` | The heading above the queue; none when empty |

## Slots

| Slot | Description |
|------|-------------|
| `actions` | Buttons beside the title, such as "Plan an item" |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | the item | An item with no route or href was opened |
