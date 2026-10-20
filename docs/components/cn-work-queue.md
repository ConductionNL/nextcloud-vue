# CnWorkQueue

One list of everything waiting on the reader: tasks, consultations, mentions, calendar items and work they cover for a colleague, from as many sources as the server declares. dossiq's personal queue is the first; pipelinq's queue has the same shape.

- The component names no source. The server answers the groups, each with a key, a label, a sentence saying what closes it, and its items. A new kind of work needs no change here.
- A source that could not be read is named at the top ("Calendar could not be read, so this list is incomplete."). It is not folded into "Nothing is waiting on you": those are different sentences.
- A group can be hidden until tomorrow. The server keeps that choice, so it follows the reader to another device.
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
