# selectByPath

Lightweight dot-path reader used by manifest `dataSource.graphql.selectors`. See [`useGraphQL`](./composables/use-graph-q-l.md#selector-helper--selectbypathobj-selector) for the full description.

```js
import { selectByPath } from '@conduction/nextcloud-vue'

selectByPath({ data: { foo: { totalCount: 7 } } }, 'data.foo.totalCount')
// → 7

selectByPath({ data: { foo: [{ count: 1 }, { count: 2 }] } }, 'data.foo[].count')
// → [1, 2]
```
