# togglePinnedBy

The `favoredBy` list a pin or an unpin writes back.

## Signature

```js
togglePinnedBy(view: object|null, userId: string, pinned: boolean): string[]
```

`view` is the View API object. `userId` is the signed-in Nextcloud user id. `pinned` is the state to write.

## Usage

```js
import { isPinnedView, togglePinnedBy } from '@conduction/nextcloud-vue'

await api.patch(view.id, {
  favoredBy: togglePinnedBy(view, userId, !isPinnedView(view, userId)),
})
```

The list is returned, never mutated in place. A caller that patched the view object directly would show the new pin before the server accepted it, and keep showing it after the save failed.

Both directions are idempotent. Pinning a view twice leaves one entry, and unpinning one nobody pinned leaves the list exactly as it was. A blank user id returns the current list untouched, so a save cannot quietly drop everybody else's pins.
