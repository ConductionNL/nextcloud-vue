# useObjectPresence

Who else has this record open, live.

## Signature

```js
import { useObjectPresence } from '@conduction/nextcloud-vue'

const { others, count, active, depart } =
  useObjectPresence(register, schema, objectUuid, options)
```

## Arguments

| Name | Type | Description |
|------|------|-------------|
| `register` | `string \| Ref<string>` | OpenRegister register slug. |
| `schema` | `string \| Ref<string>` | OpenRegister schema slug. |
| `objectUuid` | `string \| Ref<string>` | The record being read. |
| `options.enabled` | `boolean` | Set `false` to make the whole thing inert. Default `true`. |

Each address part may be a value, a ref or a getter. A widget host that reuses one instance across records needs the getter form, or presence stays pinned to the first record it saw.

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `others` | `ComputedRef<Array<object>>` | The other readers, `{ user, arrivedAt }`. The viewer is left out. |
| `count` | `ComputedRef<number>` | How many others. |
| `active` | `Ref<boolean>` | Whether this client is beating. |
| `depart` | `() => Promise<void>` | Leave early, before the route or the tab does. |

## Usage

```vue
<CnPresenceAvatars :present="others" />
```

```js
setup() {
  const { others, count } = useObjectPresence('dossiq', 'zaak', props.objectId)
  return { others, count }
}
```

## A heartbeat, not a connection

notify_push knows nothing about who is looking at what. A socket can be open while the tab showing this record closed ten minutes ago, and a socket can drop while the reader is still there. So the client says "still here" on a timer, and the server stops believing it after its window. Two missed beats read as gone, which survives a lost socket where connection tracking does not.

The pace is the server's. Its `beatSeconds` wins whenever it answers with one, because the window is its decision and a client pacing itself to a stale copy drops off the list while its user is still reading.

## The list arrives twice, and that is the point

Every beat answers the current list, so this is correct on an instance with no notify_push at all. It simply learns at beat pace. The push is the optimisation: it carries the new list the moment somebody arrives or leaves.

Relying on the push alone would make presence a feature that silently does nothing wherever notify_push is not installed, which is most development instances and some production ones.

## Departure is sent twice, also on purpose

Scope disposal covers a route change and an unmount. `beforeunload` with `sendBeacon` covers a closed tab, which fires no Vue hook at all. Without the beacon, a closed tab lingers for a whole window on everybody else's screen. The server is idempotent about it.

Render the result with [`CnPresenceAvatars`](../../components/cn-presence-avatars.md), or place [`CnObjectPresenceWidget`](../../components/cn-object-presence-widget.md) from a manifest and write no component at all.
