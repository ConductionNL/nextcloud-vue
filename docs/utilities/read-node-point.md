# readNodePoint

Reads a node's point in either spelling (flat `x`/`y` first, then `position: { x, y }`). Returns `{ x, y }` or `null` when the node has none.

```js
import { readNodePoint } from '@conduction/nextcloud-vue'

readNodePoint(node)
```

Pure function over plain arrays, with no Vue or Pinia dependency, so any graph canvas (for example one drawn on `CnGraphCanvas`) can use it. See also [`useFlowStore`](./composables/use-flow-store.md).
