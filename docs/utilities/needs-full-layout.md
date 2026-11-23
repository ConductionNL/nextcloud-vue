# needsFullLayout

True when no node carries a position, or when two or more positioned nodes all sit on the same point. Any other arrangement is treated as deliberate.

```js
import { needsFullLayout } from '@conduction/nextcloud-vue'

needsFullLayout(nodes)
```

Pure function over plain arrays, with no Vue or Pinia dependency, so any graph canvas (for example one drawn on `CnGraphCanvas`) can use it. See also [`useFlowStore`](./composables/use-flow-store.md).
