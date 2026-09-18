---
title: useNotificationPreferencesStore
---

# useNotificationPreferencesStore

Reads and writes what notifies a person, for one screen. It is what feeds
[`CnNotificationPreferences`](../../components/cn-notification-preferences.md)
and what receives its events.

```js
import { useNotificationPreferencesStore } from '@conduction/nextcloud-vue'

const store = useNotificationPreferencesStore()
await store.load()
```

## It keeps no copy beyond the page

Notification preferences are read by the server when something happens, not by
this screen. A cached copy that outlived the page would let somebody open the
screen, see what they set last week, and be looking at something an
administrator has since forced. The store holds what the page is showing and
nothing else.

## One read, not four

The catalogue, the values, the forced rows and the refusals come back together.
A screen assembled from four responses renders a cell as editable for as long
as the forced rows are still in flight, which is the moment somebody clicks it.

A failed read is surfaced on `error` rather than logged. An empty matrix with
no trace of why is indistinguishable from an app that publishes no events: the
screen would tell somebody nothing notifies them when in fact it could not ask.

## A write that fails puts the value back

Writes are optimistic, because a checkbox that waits for a round trip feels
broken. Optimism without a rollback is a screen showing a setting the server
never accepted, so the previous value is kept and restored, and the failure
goes on `error`.

## It never writes the forced rows

They are the administrator's, they sit above the person's own preference, and a
store that could write them would offer to overrule the thing that exists to
overrule the person.

## Pruning happens on the write

Rows for events the catalogue no longer has are dropped as part of the next
write somebody makes, not by a separate sweep. Nothing has to be scheduled, and
no row outlives the screen that would have shown it. The dropped ids are left on
`prunedEvents`, so a caller can say how many rather than doing it silently.

## State

| Name | Type | Description |
|---|---|---|
| `events` | `Array` | The host's catalogue. |
| `channels` | `Array` | The channels this instance has. |
| `groupValues` | `Object` | What an administrator set for the group. |
| `personalValues` | `Object` | What this person set, by event, channel and scope. |
| `forcedValues` | `Object` | What an administrator forced. Never written. |
| `refusals` | `Object` | What the platform refuses for this recipient, with reasons. |
| `digest` | `Object` | `{ [channelId]: { mode, timeOfDay } }`. |
| `loading` | `Boolean` | Whether a read is in flight. |
| `error` | `String` | The last failure, surfaced rather than swallowed. |
| `prunedEvents` | `Array` | Events dropped on the last write. |

## Actions

| Action | Arguments | Returns |
|---|---|---|
| `load` | `{ groupId }` | Reads everything the screen needs, in one request. |
| `setPreference` | `{ eventId, channelId, scope, value, groupId }` | `true` when it stuck. `value: null` clears the row, which means follow whatever is above it, and is not the same as `false`. With a `groupId` it writes the group's defaults instead of the person's own. |
| `setDigest` | `{ channelId, mode, timeOfDay }` | `true` when it stuck. |
| `testSend` | `{ eventId, channelId }` | `{ ok, message }`. A refusal comes back as `ok: false` with the reason, because "refused, because" is a result and silence would read as proof the channel works. |

## Endpoints

`NOTIFICATION_PREFERENCES_URL` and `NOTIFICATION_TEST_SEND_URL` are exported
from `composables/useNotificationPreferencesStore.js` for a host that proxies
them.

## See also

- [`CnNotificationPreferences`](../../components/cn-notification-preferences.md) — the screen.
- `utils/preferenceScopes.js` — which row applies, and pruning, as pure functions.
- `utils/notificationPreference.js` — the four levels and channel availability.
