# CnDeviceFramesWidget

Several small pages side by side, each in a phone frame with a title and an optional status line. Registered under the
`device-frames` widget type, a container for dashboards and detail pages.

The board DqInspectie ("Inspectie in het veld") draws what an inspector sees on the phone: the day offline, a checklist
question with a photo, and the queue of changes waiting to synchronise. Each frame stacks widgets of the same page, the
way the `sections` widget does, so every frame is configuration.

## Content shape

```json
{
  "id": "frames",
  "type": "device-frames",
  "content": {
    "width": 350,
    "status": { "followConnection": true, "offlineText": "Offline · synced at 07:42", "onlineText": "Online" },
    "frames": [
      { "key": "today", "title": "Today", "widgetIds": ["today-runs", "offline-note"] },
      { "key": "question", "title": "Kerkplein 7", "widgetIds": ["checklist-run"] },
      { "key": "sync", "title": "Synchronise", "widgetIds": ["sync-queue"], "status": { "text": "3 changes waiting", "tone": "info" } }
    ]
  }
}
```

| Key | Description |
|---|---|
| `frames` | `[{ key?, title, widgetIds? \| sections?, status? }]`, in order. `widgetIds` names widgets of the page, stacked in the frame; `sections` takes the `sections` widget's entries instead (titles, two columns). |
| `status` | The status line of every frame; a frame's own `status` wins. `{ text?, tone?, followConnection?, onlineText?, offlineText? }`. With `followConnection` the line reads `offlineText` while the device is offline and `onlineText` otherwise, and follows the browser's online and offline events. `tone` is `warning` (the default while offline), `success` (the default while online) or `info`. |
| `width` | The frame width in pixels (default 350, at least 240). |

Titles and status texts go through the app's translate. The frames wrap onto the next row when the page is narrower;
on a phone a frame takes the full width without its bezel. Place the widget without a card title.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `availableWidgets` | `Array` | `[]` | The page's widget definitions, for `widgetIds` (handed in by the page host). |
| `objectId` | `String\|Number` | `''` | Forwarded to the children on a detail page. |
| `objectData` | `Object` | `null` | Forwarded to the children on a detail page. |
| `objectType` | `String` | `''` | Forwarded to the children. |
| `schemaObject` | `Object` | `null` | Forwarded to the children. |
| `register` | `String\|Object` | `''` | Forwarded to the children. |
| `schema` | `String\|Object` | `''` | Forwarded to the children. |
| `store` | `Object` | `null` | Forwarded to the children. |
| `surface` | `String` | `'app-dashboard'` | Forwarded to the children. |
| `integrationContext` | `Object` | `null` | Forwarded to integration children. |
| `cnRegistry` | `Object` | `{}` | The app's component registry, for custom child types. |
