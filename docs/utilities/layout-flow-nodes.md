# layoutFlowNodes

Lays every node out in layers on a fixed grid (triggers left, forward edges pointing right). Returns new node objects with `x`, `y` and `position` set; the input is never mutated. Parameters: `nodes` (array of flow nodes), `lines` (array of `{ source, target }` edges), `startIds` (ids a run enters through).

```js
import { layoutFlowNodes } from '@conduction/nextcloud-vue'

layoutFlowNodes(nodes, lines, startIds)
```

Pure function over plain arrays, with no Vue or Pinia dependency, so any graph canvas (for example one drawn on `CnGraphCanvas`) can use it. See also [`useFlowStore`](./composables/use-flow-store.md).
