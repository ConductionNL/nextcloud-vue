# CnRealtimeToast

"Just updated by Anouk Bakker": a change someone else made to what the page shows, as board DqWerkbord draws it at the bottom of the board, with a close button. The page reads again on the change, so a reload is not needed.

```vue
<CnRealtimeToast :source="{ url: '/apps/dossiq/api/board/changes', interval: 15000 }" title-template="Just updated by {actor}" />
```

On an index page: `config.realtime: { "url": "/apps/dossiq/api/cases/changes", "views": ["board"] }` shows it while the page is in board view.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | Object | `null` | `{ url, interval?, sinceParam? }`: poll `GET <url>?since=<now>` every `interval` ms (default 15000, at least 2000). The answer is `{ changes: [{ id, actor, actorId, text, at }], now }`; the first poll only learns `now`. |
| `channel` | String | `''` | Or listen on this `@nextcloud/event-bus` channel; each payload is one change. |
| `titleTemplate` | String | `''` | The title with `{actor}`, through the host translate. Default "Just updated by {actor}". |
| `textField` | String | `text` | Where the change's text is read. |
| `actorField` | String | `actor` | Where the actor's name is read. |
| `refreshOnChange` | Boolean | `true` | Emit `cn:page:refresh` on a change, so the page's lists read again. |

A change whose `actorId` is the current user shows nothing. A newer change replaces the toast. The toast is `role="status"`, fixed at the bottom start of the window (`--cn-realtime-toast-offset` moves it past a navigation column).

## Events

| Event | Payload |
|-------|---------|
| `change` | The change shown. |
