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
| `flow` | The flow being edited. |
| `flows` | The list, as last loaded. |
| `nodeCatalog` | The step types the ENGINE can execute. Authoritative — see below. |
| `eventCatalog` | The triggers a flow may subscribe to. |
| `runs` / `steps` | Recent runs, and the per-node steps of the run being inspected. |
| `loading` / `saving` / `running` / `dirty` / `error` | Status flags. |

## The catalogue is authoritative

`nodeCatalog` holds the node ids **exactly as the engine's registry publishes them** — `openregister.set-fields`, `hermiq.agent-step`. `addNode()` stores that id verbatim.

This is load-bearing. The builder this was ported from fed its palette from the catalogue and then matched **bare** ids everywhere else, so every step placed from the palette had no configuration pane and was skipped at run time while the run reported success. Nothing built on this store may introduce a second vocabulary.

`catalogEntry(type)` returns `null` for a type the engine does not know — a meaningful answer that should be **shown**, not hidden, because that step will fail when the flow runs.

## `owner` and `organisation` are never sent

`save()` strips both. The server stamps them, and a client-supplied `owner` would let an author mint a flow that **runs as somebody else** — a trigger fires with no acting user, so the owner is the identity the run executes as.

## Running requires a saved flow

`run()` refuses when the flow has no id. The engine walks the **stored** document, so running unsaved canvas state would report on a graph that is not the one on screen.
