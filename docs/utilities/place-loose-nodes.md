# placeLooseNodes

Slots position-less nodes beneath an arranged graph. Positioned nodes are returned as the same object; loose nodes get a layered pass shifted below the lowest positioned node.

```js
import { placeLooseNodes } from '@conduction/nextcloud-vue'

placeLooseNodes(nodes, lines, startIds)
```

Pure function over plain arrays, with no Vue or Pinia dependency, so any graph canvas (for example one drawn on `CnGraphCanvas`) can use it. See also [`useFlowStore`](./composables/use-flow-store.md).
