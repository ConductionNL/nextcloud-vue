---
status: proposed
capability: flow-canvas
---

# Flow canvas

## Purpose

Defines the behaviour of `CnGraphCanvas` once it is built on
[Vue Flow](https://vueflow.dev) (`@vue-flow/core`) — the library ADR-081 named
as the reason for the Vue 3 migration, and which n8n itself runs.

The canvas RENDERS a graph and REPORTS interaction. It never mutates the graph
it is given.

## MODIFIED Requirements

### Requirement: The canvas speaks Vue Flow's model

`CnGraphCanvas` SHALL accept `nodes` and `edges` in Vue Flow's shape —
`{ id, type, position: { x, y }, data }` and `{ id, source, target }` — and
SHALL emit Vue Flow's interaction events.

It SHALL NOT translate them from the previous hand-rolled shape. The graph page
is not in production, so there is no consumer to preserve, and a translation
layer can only expose what the old API could already express.

`nodeWidth` and `nodeHeight` SHALL be removed. They existed so hand-drawn edges
could guess a node's centre, with the documented failure "set them to match what
your node slot actually renders, or edges will attach off-centre". Vue Flow
measures the rendered node.

#### Scenario: a graph renders from Vue Flow shaped input

- **WHEN** the canvas is given three nodes and two edges
- **THEN** three node elements and two edge elements are rendered
- **AND** the edges terminate on the rendered nodes, with no width/height hints
  supplied by the consumer

#### Scenario: the canvas reports changes rather than applying them

- **WHEN** a node is dragged to a new position
- **THEN** `nodes-change` is emitted describing the change
- **AND** the `nodes` prop passed in is not mutated

### Requirement: Capabilities gained from the library

The canvas SHALL expose Vue Flow's richer options in place of the hand-rolled
approximations: `<Background>` with `snapToGrid`/`snapGrid` in place of
`showGrid`/`gridSize`; `fitView` and viewport props in place of manual `viewBox`
arithmetic; `connectionMode` in place of the boolean `connectable`; and
`<MiniMap>` and `<Controls>`, which had no previous equivalent.

#### Scenario: fitView frames the whole graph

- **WHEN** a graph larger than the viewport is rendered with `fitView`
- **THEN** every node is within the visible viewport

## ADDED Requirements

### Requirement: The canvas is fully keyboard operable

⚠️ Every affordance in this requirement EXISTS TODAY in the hand-rolled canvas.
It is written as an ADDED requirement because the components implementing it are
new, not because the behaviour is. Vue Flow is pointer-first; adopting it
without this would be a WCAG 2.2 AA regression (2.1.1 Keyboard) on a fleet that
gates accessibility.

The node component SHALL be focusable (`tabindex="0"`), SHALL expose
`role="button"`, an `aria-label` naming the node, and `aria-pressed` reflecting
selection.

A node SHALL be movable, connectable and resizable using only the keyboard.

#### Scenario: a node is selected and moved without a pointer

- **WHEN** a user tabs to a node and presses an arrow key
- **THEN** the node moves by one step and `nodes-change` is emitted
- **AND** holding Shift moves it by a coarse step

#### Scenario: a connection is made without a pointer

- **WHEN** a user presses `c` on a focused node, then `c` on another node
- **THEN** a connection between them is emitted
- **AND** pressing `Escape` at any point cancels without emitting

#### Scenario: every exit of a multi-exit node is keyboard reachable

- **WHEN** a user presses `c` repeatedly on a node that has several out-ports
- **THEN** the armed port advances through them
- **AND** the armed port is visually ringed and marked `aria-pressed`

> This scenario is the one most likely to be quietly dropped, and the one that
> matters most. The current implementation records the cost of its absence:
> "without this the keyboard could only ever reach the first, so every other
> branch was mouse-only." A routing node whose second branch needs a mouse is a
> keyboard failure on the feature the canvas exists for.

### Requirement: Read-only means every interaction is refused

`readOnly` SHALL disable dragging, connecting AND selection.

#### Scenario: a read-only canvas cannot be edited

- **WHEN** a canvas is rendered read-only
- **THEN** dragging a node does not move it
- **AND** no connection can be started, by pointer or keyboard
- **AND** no element becomes selected

> Asserted as three separate outcomes on purpose: expressed as three Vue Flow
> flags, missing one produces a canvas that looks locked and is not.

### Requirement: The canvas is themed from Nextcloud variables

Vue Flow's stylesheet SHALL be themed through Nextcloud CSS variables, with no
hardcoded colours, and SHALL render correctly in light and dark themes.

#### Scenario: dark theme

- **WHEN** the canvas renders under the dark theme
- **THEN** node, edge, background and control colours follow the theme
