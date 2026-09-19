# withPinnedViewChildren

A manifest menu with every page's pinned views hanging under it.

## Signature

```js
withPinnedViewChildren(menu: object[], options: {
  manifest: object,
  views: object[],
  userId: string,
}): object[]
```

`menu` is the manifest's `menu[]`. `manifest` is read for its `pages[]`. `views` are the views visible to this user. `userId` is the signed-in Nextcloud user id.

## Usage

```js
import { withPinnedViewChildren } from '@conduction/nextcloud-vue'

const menu = withPinnedViewChildren(manifest.menu, { manifest, views, userId })
```

The input is never mutated. Entries that gain nothing are returned as they came, so a menu with no pinned views anywhere comes back identical and a consumer can compare by reference.

## Where a view hangs

A page names `savedViewPlaces.navGroup` when it wants its views under a particular entry. Otherwise they hang under the entry that points at the page.

A page that declares places but whose entry is nowhere in the menu contributes nothing. Inventing an entry here would be the top-level entry [`pinnedViewNavChildren`](./pinned-view-nav-children.md) exists to avoid, and the app's own navigation budget is not this function's to spend.

Call it where you build the app navigation, then let `CnAppNav` render the result.
