# SAVED_VIEW_ROUTE_SUFFIX

What [`savedViewRouteName`](./saved-view-route-name.md) appends to a page id to name that page's saved-view route.

```js
import { SAVED_VIEW_ROUTE_SUFFIX } from '@conduction/nextcloud-vue'
```

Value: `'__view'`.

The double underscore is doing work. A page id is an author's word, so `cases` and `cases-view` can both be real pages in one manifest, and a one-word suffix would let a page collide with another page's view route. vue-router keeps the last registration and drops the first in silence, so the collision reads as "the wrong screen opened".

Match on this constant rather than on the literal when you need to tell a view route from a page route.
