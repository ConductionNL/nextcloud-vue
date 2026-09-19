# pinnedViewNavChildren

The navigation children one page's pinned views contribute.

## Signature

```js
pinnedViewNavChildren(page: object, views: object[], userId: string): object[]
```

`page` is the manifest page. `views` are the views visible to this user. `userId` is the signed-in Nextcloud user id.

## Usage

```js
import { pinnedViewNavChildren } from '@conduction/nextcloud-vue'

pinnedViewNavChildren(page, views, userId)
// [{ id: 'cases-view-42', label: 'Mine, this week', route: 'cases__view', params: { viewId: '42' }, icon: 'BookmarkOutline' }]
```

## Children, never top-level entries

An app declares its own navigation budget (ADR-097). A user who pins eight views must not be able to spend it, so a pinned view hangs under the page's entry and never beside it.

Past the cap the rest are left to the page, which lists every view it has. Nothing is hidden and nothing is unbounded. The cap is the page's `savedViewPlaces.pinnedCap`, or [`DEFAULT_PINNED_VIEW_CAP`](./default-pinned-view-cap.md).

The order is the views' own, so the list reads the same in the menu as on the page. A view the page cannot build a target for is skipped rather than rendered as a dead entry.

This does one page. [`withPinnedViewChildren`](./with-pinned-view-children.md) does a whole menu.
