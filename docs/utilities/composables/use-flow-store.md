# useFlowStore

Shared state for the flow editor: the flow being edited, the node catalogue, and the run history.

A Pinia store (id `cnFlow`) rather than a per-component composable, because the two halves of the editor render in different places — the canvas ([`CnFlowDetail`](../../components/cn-flow-detail.md)) sits in the page body and the controls ([`CnFlowSidebar`](../../components/cn-flow-sidebar.md)) sit in Nextcloud's app sidebar — so they cannot pass props to one another.

Persistence is OpenRegister's flow API (`/apps/openregister/api/flows`), not a consuming app's own register. That is deliberate: an app-owned register meant every app that wanted flows also needed its own resolver and its own executor.

:::warning Node types are the catalogue's ids, verbatim
Never map, strip or re-namespace a node `type` on the way in or out. The predecessor to this store fed its palette from the catalogue's namespaced ids (`openregister.set-fields`) while its config panes and its executor matched bare ones (`set-fields`), so every node placed from the palette had no config pane and was skipped at run time — with the run still reporting success. One vocabulary, end to end.
:::

## Signature

```js
import { useFlowStore } from '@conduction/nextcloud-vue'

const flowStore = useFlowStore()
await flowStore.load()
```

## State

| Field | Type | Description |
|-------|------|-------------|
| `flow` | `object` | The flow currently being edited. Starts as a blank definition (`app: 'openregister'`, `trigger: 'object.updated'`, `executionMode: 'async'`, `enabled: false`). |
| `flows` | `array` | The loaded flow list. |
| `selectedNodeId` | `string \| null` | Node whose config pane is open. |
| `paletteDragType` | `string \| null` | Catalogue id of the node being dragged from the palette. |
| `nodeCatalog` | `array` | Available node types, from `/api/flow/node-catalog`. |
| `eventCatalog` | `array` | Available triggers, from `/api/flow/event-catalog`. |
| `runs` | `array` | Run history for the open flow. |
| `steps` | `array` | Steps of the inspected run. |
| `inspectedRunUuid` | `string \| null` | Run whose steps are loaded. |
| `loading` / `saving` / `running` | `boolean` | In-flight markers, one per operation, so a save cannot be mistaken for a load. |
| `dirty` | `boolean` | Unsaved edits exist. |
| `error` | `string` | Last error message, or empty. |

## Getters

| Name | Type | Description |
|------|------|-------------|
| `nodes` | `array` | Nodes of the open flow. |
| `edges` | `array` | Edges of the open flow. |
| `selectedNode` | `object \| null` | The node matching `selectedNodeId`. |
| `catalogEntry` | `(type) => object \| null` | Catalogue entry for a node type. |
| `flowForRun` | `object` | The flow as a runnable document. |

## Actions

| Name | Description |
|------|-------------|
| `load(app?)` | Load the flow list, optionally filtered by app. |
| `loadNodeCatalog()` | Load the node catalogue. |
| `loadEventCatalog()` | Load the trigger catalogue. |
| `open(id)` | Open one flow from the loaded list for editing. |
| `addNode(type, position?)` | Append a node of a catalogue type. |
| `moveNode(id, position)` | Reposition a node on the canvas. |
| `connect(source, target)` | Add an edge. |
| `removeNode(id)` | Remove a node and the edges touching it. |
| `setNodeConfig(id, key, value)` | Set one config key on a node. |
| `setNodeConfigAll(id, config)` | Replace a node's whole config. |
| `setFlowField(key, value)` | Set a top-level flow field (name, trigger, cron, …). |
| `save()` | POST a new flow or PUT an existing one. Resolves to the stored flow, or `null` on failure. |
| `remove(id)` | Delete a flow. |
| `run()` | Queue a run of the open flow. Resolves to the queued run. |
| `loadRuns()` | Load run history for the open flow. |
| `inspectRun(uuid)` | Load one run's steps into `steps`. |

## Notes

- Every action records failures in `error` and resolves rather than throwing, so a caller that only awaits does not need a `try`/`catch` per call — but a caller that cares whether a write landed must check the resolved value (`save()` and `run()` resolve to `null` on failure).
- `open()` matches on a string comparison of the id, so a numeric id from the API and a string id from a route both resolve.
