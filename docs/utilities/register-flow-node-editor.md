# registerFlowNodeEditor

Register the editor component for one flow node type. A node whose
configuration IS another product surface — a synchronization, a mapping, a
source — deserves that surface as its editor: `CnFlowDetail` opens the
registered component instead of the generic
[`CnFlowNodeEditModal`](../components/cn-flow-node-edit-modal.md) when the
edited node's type has one.

```js
import { registerFlowNodeEditor } from '@conduction/nextcloud-vue'
import SynchronizationNodeEditor from './modals/SynchronizationNodeEditor.vue'

// At app bootstrap, before a flow editor can open:
registerFlowNodeEditor('openconnector.synchronization-run', SynchronizationNodeEditor)
```

## The contract a registered editor signs

The same one the generic dialog implements — the registry hands over
rendering, never the draft semantics:

- Read the node through `useFlowStore()`: `editingNode` / `editingNodeId`.
- Edit a **draft** of your own; the node must not change while the dialog is
  open.
- Commit with `setNodeConfigById(id, config)` (+ `setNodeName(id, name)`).
- Close by setting `editingNodeId = null` — committing first is Done, not
  committing is Cancel.
- `removeNode(id)` after closing implements a Remove action.

## Collision policy

Last registration wins, with a `console.warn` — a hot-reloading dev bundle
re-registers, and refusing that would make dev builds sticky.

## Related

- `resolveFlowNodeEditor(nodeId)` — the lookup `CnFlowDetail` performs;
  returns the component or `null` for the generic dialog.
- `unregisterFlowNodeEditor(nodeId)` — exists for tests; apps have no reason
  to call it.
