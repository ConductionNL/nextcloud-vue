# flow-canvas-fit-below-chrome Delta: flow-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-canvas-fit-below-chrome](../../)

## Purpose

Keep the steps of a canvas flow page clear of the chrome that floats over the canvas.

## ADDED Requirements

### Requirement: The canvas frames the graph clear of floating chrome

A graph canvas given `fitInset` SHALL frame the graph, on first render and from its fit control, inside the canvas
less the inset on each side. A canvas flow page SHALL pass the reach of its canvas toolbar, run card and side panel
as that inset, measured when the canvas fits, and SHALL give the canvas a definite height.

#### Scenario: Editing a flow on the canvas layout

- **GIVEN** a flow opened on a `layout: "canvas"` page with the toolbar floating over the top of the canvas
- **WHEN** the steps have their size and the canvas frames them
- **THEN** the top step stands below the toolbar
- **AND** a click on that step selects it

#### Scenario: A canvas without floating chrome

- **GIVEN** a graph canvas without `fitInset`
- **WHEN** it renders
- **THEN** Vue Flow frames the graph on init with its own padding, as before
