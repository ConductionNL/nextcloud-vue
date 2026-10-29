# flow-board-canvas-layout Delta: flow-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-board-canvas-layout](../../)

## Purpose

Draw a flow page as the Pq canvas boards draw it, and keep a run free of editing chrome on every board flow page.

## ADDED Requirements

### Requirement: A run on a board flow page shows no editing chrome

A board-look flow page that shows a run SHALL hide the canvas toolbar's editing buttons (add a step, arrange, undo)
and SHALL NOT show the read-only lock, version, unsaved, owner, missing-ends or catalogue notices. Notices about the
run itself (a refused request, a replay over another graph, skipped steps) SHALL stay.

#### Scenario: A run of a published flow

- **GIVEN** a published flow opened on `?run=<uuid>` on a board-look page
- **WHEN** the run is shown
- **THEN** no "Add a step", arrange or undo button is drawn
- **AND** neither "This version is read-only" nor "This is version 1 of the flow" is shown

#### Scenario: Editing the same flow

- **GIVEN** the same published flow without a run
- **WHEN** the editor is shown
- **THEN** the lock notice and the editing buttons are drawn as before

### Requirement: A flow page can be laid out as a canvas page

A flow page with `layout: "canvas"` SHALL draw the header actions on a row under the title, Check and Run with their
icons; the canvas without a card frame; the validity as a pill in the canvas toolbar beside a side panel toggle; and
the inspector as a floating panel over the canvas with a close button. The panel SHALL be drawn while a step is
selected, a test result is open, a run is open or the toggle opened it, and SHALL be hidden otherwise. In a run the
header SHALL hold the run's status pill and a warning count pill when steps warned, and the run card SHALL stand over
the canvas. Without `layout` the page SHALL keep the card layout.

#### Scenario: The editor with no step selected

- **GIVEN** a flow page with `layout: "canvas"` and no step selected
- **WHEN** the page is drawn
- **THEN** no inspector panel is drawn
- **AND** the canvas toolbar shows the validity pill and the side panel toggle

#### Scenario: Selecting a step

- **GIVEN** the same page
- **WHEN** a step is selected
- **THEN** the inspector panel is drawn with a close button
- **AND** closing it clears the selection and hides the panel

#### Scenario: A run

- **GIVEN** the same page on `?run=<uuid>` for a finished run where one step warned
- **WHEN** the page is drawn
- **THEN** the header shows the run's status pill and "1 step with a warning"
- **AND** the run card stands over the canvas and the side panel holds the log tabs
