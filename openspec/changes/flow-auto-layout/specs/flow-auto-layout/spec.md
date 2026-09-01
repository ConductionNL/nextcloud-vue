---
status: proposed
capability: flow-auto-layout
---

# Flow auto layout

## Purpose

A flow whose nodes carry no usable positions must still open as a readable
graph. Declared (`x-openregister-flows`), generated and imported flows all
arrive position-less and already published; rendering them as stored stacks
every node on one point, which also makes the run replay's per-node badges
unreadable.

Per ADR-065 the canvas is a geometry-only renderer, so the layout is computed
by the flow document's owner (`useFlowStore`), never by `CnGraphCanvas`.

## ADDED Requirements

### Requirement: A flow without usable positions is laid out before render

When `useFlowStore.open()` loads a flow in which no node carries a position,
or in which every positioned node sits on one identical point and at least two
do, the store SHALL compute a layered layout for all nodes before the canvas
renders: start nodes in the leftmost column, every node one column past the
furthest node leading to it, back edges excluded from layering so a loop
terminates the pass, barycenter ordering within columns, and fixed grid
spacing such that no two nodes share a cell.

The layout SHALL be deterministic: the same nodes, edges and start ids SHALL
produce the same coordinates on every open.

#### Scenario: the imported dossiq case flow opens readable

- **GIVEN** the 18-node "Case behandeling" flow as its declaration ships it,
  published and with no node positions
- **WHEN** the flow is opened
- **THEN** every node has finite coordinates and no two nodes share a point
- **AND** every edge points left to right except the flow's one loop-back
- @e2e exclude nextcloud-vue has no Playwright harness and the canvas needs a
  real browser; covered by unit tests over the real declaration fixture
  (`flowGraphLayout.spec.js`, `useFlowStore.autoLayout.spec.js`), and the
  consuming apps' e2e suites open imported flows

#### Scenario: a pile of explicit identical positions is laid out too

- **GIVEN** a flow whose importer stamped the same point on every node
- **WHEN** the flow is opened
- **THEN** the nodes are laid out as if they carried no positions
- @e2e exclude covered by unit tests over `needsFullLayout` and the store's
  open fallback; no e2e harness in this package

#### Scenario: a loop does not hang or stretch the layout

- **GIVEN** a flow with a cycle among its steps
- **WHEN** the layout runs
- **THEN** it terminates, and the loop's members keep the columns their
  forward path gives them
- @e2e exclude pure algorithm behaviour; covered by unit tests over cyclic
  graphs, including one no start node can reach

### Requirement: The render fallback is not an edit

The open-time layout SHALL work on a graph-locked (published or deprecated)
flow, SHALL NOT push an undo entry, SHALL NOT mark the document dirty, SHALL
NOT set a lifecycle refusal, and SHALL NOT write to the stored flow list row.
A viewer who only looks at a flow persists nothing.

Computed coordinates SHALL reach the server only through the existing save
path, when an author of an editable flow saves their own edit.

#### Scenario: a published imported flow opens laid out, and stays clean

- **GIVEN** a published flow with no node positions
- **WHEN** it is opened
- **THEN** its nodes are laid out
- **AND** the document is not dirty, the undo stack is empty and no lifecycle
  refusal is raised
- @e2e exclude covered by unit tests asserting dirty, undo stack, refusal and
  the untouched list row; no e2e harness in this package

### Requirement: An arranged flow is never rearranged behind its author's back

A flow holding at least two distinct positioned points SHALL open with every
positioned node exactly where it was saved. Nodes without a position in such
a flow SHALL be placed beneath the arranged graph, in run order, rather than
left stacked at the origin.

The Arrange action (`autoSort()`) SHALL keep its edit semantics: refused on a
locked graph, undoable and marked dirty on an editable one.

#### Scenario: positioned nodes are untouched, loose nodes slot beneath

- **GIVEN** a flow with one positioned node and one node without a position
- **WHEN** it is opened
- **THEN** the positioned node keeps its exact coordinates
- **AND** the loose node is placed below the arranged graph
- @e2e exclude covered by unit tests over `placeLooseNodes` (reference
  equality on kept nodes) and the store fallback; no e2e harness in this
  package

#### Scenario: Arrange still refuses a locked graph

- **GIVEN** a published flow open in the editor
- **WHEN** `autoSort()` is invoked
- **THEN** the graph is unchanged and a lifecycle refusal is raised
- @e2e exclude covered by unit tests over the `pushUndo()` gate; no e2e
  harness in this package
