# isPinnedView

Whether one user has pinned one saved view.

## Signature

```js
isPinnedView(view: object|null, userId: string|null): boolean
```

`view` is the View API object. `userId` is the signed-in Nextcloud user id.

## Usage

```js
import { isPinnedView } from '@conduction/nextcloud-vue'
import { getCurrentUser } from '@nextcloud/auth'

isPinnedView(view, getCurrentUser()?.uid)
```

Pinning writes OpenRegister's existing `favoredBy` list, not a second boolean meaning almost the same thing. That is how two sources of truth for one intention get born, and then a view is pinned in the menu and unpinned in the list.

A missing view, a missing user id or a `favoredBy` that is not an array all answer `false`. Nothing here throws, so a list can be rendered before the user is resolved.

Write the other direction with [`togglePinnedBy`](./toggle-pinned-by.md).
