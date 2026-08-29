# useFlowStore

Pinia store behind the flow editor. Talks to OpenRegister's **one** flow store (`/apps/openregister/api/flows`), scoped by an owning app id.

[`CnFlowDetail`](../../components/cn-flow-detail.md) (the canvas) and [`CnFlowSidebar`](../../components/cn-flow-sidebar.md) (the controls) render in different parts of the tree — the page body and Nextcloud's app sidebar — so they cannot pass props to one another. They share this store instead. A consuming app that hosts the two halves itself imports it directly.

## Signature

```js
import { useFlowStore } from '@conduction/nextcloud-vue'

const store = useFlowStore()

await store.load({ app: 'openconnector' })   // list, scoped to one app
await store.load({ app: null })              // every app's flows
store.open(flowId)                           // or 'new' for a blank flow
await store.save()
await store.run({ uuid, register, schema })  // queue a run against a subject
```

## State

| Key | What it holds |
|---|---|
| `flow` | The flow being edited. `open('new')` seeds it with the manual-trigger start node (`seedStartNode()`), so a new flow renders as the same editor holding only a starting point. |
| `flows` | The list, as last loaded. |
| `nodeCatalog` | The step types the ENGINE can execute. Authoritative — see below. |
| `catalogLoading` | Whether the catalogue request is in flight — an in-flight catalogue is NOT a failed one. |
| `eventCatalog` | The triggers a flow may subscribe to. |
| `runs` / `steps` | Recent runs, and the per-node steps of the run being inspected. |
| `runObjects` | What the inspected run **touched**, grouped by node. Distinct from `steps`, which is what it *did*: a step that wrote nothing still has a step row, and an object written by an app a node called into has no step of its own. |
| `checkResult` | The engine's verdict on the unsaved canvas, from `check()`. Cleared by any edit that could change it. |
| `editingNodeId` | The node whose edit dialog (`CnFlowNodeEditModal`) is open, or null. |
| `sidebarOpen` | Whether the controls sidebar shows. The re-open button lives on the canvas toolbar — the other half of the tree. |
| `loading` / `saving` / `running` / `checking` / `dirty` / `error` | Status flags. |

## Getters worth knowing

- `canvasEdges` — the edges as drawable `{id, source, target, edge}` lines, whatever dialect the stored flow speaks. This store writes `{source, target}`; the engine equally accepts `{from, to}` with **list** endpoints (several `from` = join, several `to` = split). One stored edge fans out into one line per pair.
- `roleOfNodeType(type)` — `trigger` / `step` / `end` from the catalogue, with a naming-convention fallback only while the catalogue has not loaded.
- `missingEnds` — which of trigger/end the flow lacks, decided by node **role**, never graph position. Empty flows report nothing.
- `startNodeIds` — the nodes a run enters through, decided the way the engine decides: explicit `start`/`initial` wins, else sources, else the first node.
- `catalogEntry(type)` — alias-aware: an entry matches on its id or any of its published `aliases`.

## Actions beyond CRUD

- `check()` — `POST /api/flow/validate`: the engine's own preflight over the **canvas**, without saving. A 400 still carries the preflight's report and is stored as the verdict, not treated as a transport failure.
- `autoSort()` — longest-path layering from the start nodes, left-to-right. Coordinates change and nothing else, which is what makes it safe on a working flow. Unreachable nodes go one column past everything, never at the origin where they would hide under the entry points.
- `seedStartNode()` — puts the one node every flow starts from onto a blank canvas.
- `loadRunObjects(runUuid)` — `GET /api/flow-runs/{uuid}/objects`: the objects a run touched, grouped by the node that touched them. Called automatically by `inspectRun()`, so the steps and what they changed arrive together rather than behind a second click. A failure empties the list rather than leaving the previous run's objects on screen — stale rows here read as *this* run having touched them.
- `setNodeName(id, name)` / `setNodeConfigById(id, config)` — the edit dialog's commit path: it edits a draft and writes it back for whichever node it was opened on, which is not necessarily the selected one.

## The catalogue is authoritative

`nodeCatalog` holds the node ids **exactly as the engine's registry publishes them** — `openregister.set-fields`, `hermiq.agent-step`. `addNode()` stores that id verbatim.

This is load-bearing. The builder this was ported from fed its palette from the catalogue and then matched **bare** ids everywhere else, so every step placed from the palette had no configuration pane and was skipped at run time while the run reported success. Nothing built on this store may introduce a second vocabulary.

`catalogEntry(type)` returns `null` for a type the engine does not know — a meaningful answer that should be **shown**, not hidden, because that step will fail when the flow runs.

## `owner` and `organisation` are never sent

`save()` strips both. The server stamps them, and a client-supplied `owner` would let an author mint a flow that **runs as somebody else** — a trigger fires with no acting user, so the owner is the identity the run executes as.

## Running requires a saved flow

`run()` refuses when the flow has no id. The engine walks the **stored** document, so running unsaved canvas state would report on a graph that is not the one on screen.
