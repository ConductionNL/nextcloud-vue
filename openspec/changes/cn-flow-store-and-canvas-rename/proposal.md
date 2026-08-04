---
kind: code
---

# Proposal: cn-flow-store-and-canvas-rename

## Summary

Land the shared flow-authoring surface — `useFlowStore`, `CnFlowDetail`,
`CnFlowSidebar`, `CnFlowIndexPage` — and give the canvas real connection ports.
Hermiq then deletes its own copies and consumes the library.

## Two corrections to the first draft of this proposal

Both were wrong, and both were wrong in the way this repo's own ADR-065 warns
about — a claim inherited from a document rather than checked against the tree.

**1. The shared flow store already exists.** This proposal originally asked for
a new `createFlowStore` "alongside `createObjectStore`". It is already written:
`src/composables/useFlowStore.js`, 429 lines, on the unmerged local branch
`feat/flow-authoring-vue3`, together with `CnFlowDetail` (434), `CnFlowSidebar`
(343), `CnFlowIndexPage` (169), `CnFlowEditModal` (180) and a spec — 1,917 lines
across 16 files. It calls exactly the endpoints the draft specified.

So the answer to "why does hermiq have its own flow store" is worse than the
draft said. It is not only that hermiq should not have one — **one already
existed, and neither hermiq nor this proposal knew.** That is the ADR-065 defect
verbatim: the fleet built DMN decision tables twice, six weeks apart, in
ignorance, and the second attempt was the less capable one. This would have been
the third instance, in the repo the ADR was written to protect.

The work is therefore CONSOLIDATION, not creation.

**2. The Vue line was wrong.** The draft said the canvas change targets Vue 2.7,
citing ADR-065 Decision 5 ("`@conduction/nextcloud-vue` declares `peer vue:
^2.7.0` with no `^3` branch"). Hermiq is **pure Vue 3** — it depends on
`@conduction/nextcloud-vue@2.1.0-vue3.17`, and its webpack config says of the
sibling checkout: *"the Vue 2 BETA submodule — do NOT use it for this Vue 3
build"*. The `feat/vue-3` branch exists and carries `CnGraphCanvas`. ADR-065 is
stale on this point and should be annotated.

## What the existing branch already gets right

It was written in the **action-node** dialect before the engine accepted it:
`addNode(type, x, y)` creates `{id, type, config}` and `connect()` creates an
edge carrying no type at all. Under the pre-inversion engine that shape was
refused outright, which is why the branch has sat unmerged running nothing.

`or-flow-action-nodes` makes it correct. This is the same observation the old
`FlowDefinitionBuilder` comment made and declined to act on — node-shaped
authoring is what people write, because that is how a diagram reads.

## What it does NOT have

Measured against `CnFlowDetail.vue` on that branch — every one of these is a
defect reported against hermiq's canvas and fixed there this cycle, and every
one returns if the branch is adopted unchanged:

| Missing | Consequence |
| --- | --- |
| the one-box chrome reset | a card inside a card |
| start/end roles, role-coloured ports | every port reads the same regardless of role |
| a sidebar open/close control | 346px of permanent chrome, no way to dismiss |
| zoom controls | one passing mention of zoom, no keyboard-reachable control |
| node `exits` / `fromExit` | branching cannot be authored at all |

## The incompatibility to reconcile

`useFlowStore.connect()` persists `{source, target}`; the engine reads
`{from, to}` and the migrated flows are stored that way. `CnGraphCanvas` wants
`{source, target}`.

Resolution: **persist `from`/`to`, map to `source`/`target` for the canvas** —
one spelling on disk, the canvas's own shape at its prop boundary. This is what
hermiq's `canvasEdges` getter already did, and it is what REQ-FE-004's removal
in `or-flow-action-nodes` requires.

## Ports

The canvas gains per-node ports, which is what makes branching drawable:

- an **in-port** on the left of every non-start node, on the border;
- an **out-port** on the right, on the border;
- **one out-port per branch** for a node declaring `exits`;
- **loop in/out ports at the TOP** of a loop node, so the nodes repeated by the
  loop are a visible sub-list. Pagination is the motivating case: the loop
  yields a page of objects and re-enters until the source is exhausted;
- edges that **originate and terminate at ports**, and route **around** other
  nodes rather than through them;
- **multi-select**, and a canvas that **grows** when a node is dragged past its
  edge, displacing the others away from the drag.

## Impact

- **Affected specs**: `flow-store`, `cn-flow-canvas`
- **Affected apps**: hermiq deletes `src/api/flows.js`, `src/store/flowEditor.js`,
  `FlowBuilder.vue`, `FlowSidebar.vue`, `FlowIndex.vue`
- **Vue line**: 3 (`feat/vue-3`), NOT 2.7
- **Base**: `feat/flow-authoring-vue3` branched 20 commits behind `feat/vue-3`
  and must be reconciled onto it

## Capabilities

### New Capabilities
- `flow-store` — the shared client for OpenRegister's flow store

### Modified Capabilities
- `cn-flow-canvas` — connection ports, routing, multi-select, canvas growth
