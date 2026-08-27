# DEFAULT_EDGE_LINE_TYPE

The router a flow connection is drawn with when its edge does not name one.

```js
import { DEFAULT_EDGE_LINE_TYPE } from '@conduction/nextcloud-vue'

DEFAULT_EDGE_LINE_TYPE // 'smoothstep'
```

Stated once rather than defaulted separately in each reader. `useFlowStore`'s
`canvasEdges` getter, `CnFlowEdge`'s `lineType` prop, the line context menu's
"already drawn this way" check and
[`CnFlowEdgeEditModal`](../components/cn-flow-edge-edit-modal.md) all have to
agree that an absent `lineType` means angled — and four independent
`|| 'smoothstep'` fallbacks are three chances to disagree.

See [`EDGE_LINE_TYPES`](./edge-line-types.md) for the full vocabulary.
