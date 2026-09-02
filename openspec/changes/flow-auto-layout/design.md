# Design: flow-auto-layout

## Where the layout lives, and why

ADR-065 draws the line: `CnGraphCanvas` renders the geometry it is given and
never invents any. `CnFlowDetail.canvasNodes()` documents the same rule from
the other side — the mapping owns the rendering vocabulary, the store owns the
flow DOCUMENT. Node coordinates are part of the document (they survive save),
so computing them belongs to the document's owner: `useFlowStore`, where
`autoSort()` already lived. The new module `flowGraphLayout.js` holds the pure
math so it can be unit-tested without pinia, axios, or a DOM.

## Edit versus rendering fallback

The defect was a category error: a rendering fallback implemented as an edit.
The two are kept as distinct actions with distinct contracts:

| | `autoSort()` (Arrange button) | `applyRenderLayout()` (open fallback) |
|---|---|---|
| gate | `pushUndo()` — refused when locked | none — runs on published flows |
| undo entry | yes | no |
| `dirty` | set | untouched (stays false) |
| lifecycle refusal | set when locked | never |
| scope | whole graph, always | only what has no usable position |

A viewer of a published flow therefore mutates nothing observable: the
coordinates land on the in-memory copy `open()` deep-cloned from the list row
(asserted by test: the list row keeps its position-less nodes), nothing marks
the document dirty, and nothing persists. Replay on a read-only published
version stays pure.

## When the fallback fires

`needsFullLayout(nodes)` is true in exactly two cases:

1. No node carries a position (declared/generated/imported flows).
2. At least two nodes carry positions and every positioned node sits on one
   identical point. That is the same pile with coordinates written down; an
   importer stamping `{x: 0, y: 0}` everywhere produces it. A single node
   parked anywhere — the origin included — still counts as arranged, matching
   `hasPosition()`'s documented stance that (0, 0) is a legitimate place.

Otherwise, if some nodes lack positions, `placeLooseNodes()` keeps every
placed node by reference (reference equality is the proof no field changed)
and slots the loose ones beneath the lowest placed node: columns from the
whole graph's layering so run order still reads left to right, rows counted
among the loose nodes only, y offset one row below the arranged graph's
lowest point. Chosen over relaying the whole graph because a flow with even
one placed node is an arrangement, and over stacking loose nodes in one spot
because that is the pile again, one row lower.

## The layered pass

1. **Layer.** Iterative DFS from `startNodeIds` (the engine's own notion of
   entry) classifies back edges — an edge into a node still on the DFS stack.
   Longest-path layering then runs over the remaining acyclic graph in
   topological order, so a node sits one column past the furthest node that
   leads to it, triggers in column 0, and every non-back edge points strictly
   right. Dropping back edges (rather than budgeting the walk, as before) is
   what makes a loop terminate without inflating columns. Unreachable nodes
   go one column past everything — never at the origin, where they would hide
   under the entry points.
2. **Order.** One left-to-right barycenter pass: within a column, a node's
   key is the mean row of its already-placed predecessors, ties broken by
   document order. Parallel branches keep their own rows instead of braiding.
3. **Place.** `x = 60 + column * 260`, `y = 96 + row * 170` — the constants
   `autoSort()` already used, top margin included (the floating toolbar
   swallows pointer events on anything under it). One (column, row) cell per
   node means no two nodes can overlap by construction.

Determinism: every collection is iterated in insertion order, every sort is
stable with an index tie-break, no randomness, no timestamps. Same input,
same coordinates — asserted by running the pass twice over the real fixture.

## Persistence

No forced write on view. On a draft, the computed coordinates sit on the
in-memory document; the moment the author makes any real edit and saves, the
existing save path (`save()` sends the whole flow) carries them along, and the
flow is stable from then on. On a published flow the server refuses graph
writes anyway; the layout is recomputed on each open, which is acceptable
because it is deterministic — the same flow always opens looking the same.

## Alternatives rejected

- **dagre / elkjs**: not in the dependency tree, real bundle weight, and the
  in-app CSP allows no CDN script. The simple pass covers the shapes flows
  take.
- **Layout in `CnGraphCanvas`**: violates ADR-065; the canvas would mutate
  the graph it is handed.
- **Layout in `CnFlowDetail.canvasNodes()`**: leaves the store's document
  position-less, so Arrange, save, and the sidebar would disagree with what
  is on screen; and the mapping runs per render, the layout should run per
  open.
- **Relaxing `pushUndo()` for autoSort**: would let the Arrange button edit a
  published graph, which the server refuses on save — the gate is correct,
  the fallback simply is not an edit.
