# DEFAULT_PINNED_VIEW_CAP

How many pinned views one page may hang under its navigation entry, when the page names no cap of its own.

```js
import { DEFAULT_PINNED_VIEW_CAP } from '@conduction/nextcloud-vue'
```

Value: `5`.

The cap exists because an app declares its own navigation budget (ADR-097) and a user must not be able to spend it. Somebody who pins eleven views would otherwise push every other app out of the menu.

Past the cap nothing is hidden: [`pinnedViewNavChildren`](./pinned-view-nav-children.md) stops adding children, and the page itself still lists every view. Raise it per page in the manifest:

```json
"savedViewPlaces": { "enabled": true, "pinnedCap": 8 }
```
