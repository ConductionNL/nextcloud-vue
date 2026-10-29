# flow-board-canvas-chrome Delta: flow-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-board-canvas-chrome](../../)

## Purpose

Finish the canvas flow page of boards PqFlow and PqFlowRun: the header menu, the last run on the path line, the legend
card, the canvas controls, the inspector and the run panel.

## ADDED Requirements

### Requirement: A canvas flow page has a More menu and names its last run

A flow page with `layout: "canvas"` SHALL draw a More menu in its header, in the editor and in a run. In a run the
header SHALL keep the buildiq button and the More menu. In the editor the path line SHALL start with a neutral pill
naming the newest run's date and outcome. The meta part `saved` SHALL add when the flow was last saved to the version.

#### Scenario: The editor

- **GIVEN** a flow with runs on a canvas page
- **WHEN** the page opens
- **THEN** the header has a More menu with "Show runs"
- **AND** the path line starts with "Last run {date} {outcome}"

#### Scenario: A run

- **GIVEN** the same page on `?run=<uuid>`
- **THEN** the header keeps the More menu, with "Play on the canvas" and "Back to the flow"

#### Scenario: The card layout

- **GIVEN** a flow page without `layout`
- **THEN** no More menu and no last run pill are drawn

### Requirement: A canvas run shows its legend as one card with the zoom

In a run on a canvas page the outcome legend SHALL be titled "Outcome per step", SHALL name the taken and the not
taken route, and SHALL stand in the canvas toolbar (CnFlowDetail `toolbar-start`) with the zoom and the side panel
toggle. The canvas corner controls SHALL carry icons and accessible names.

#### Scenario: The legend

- **GIVEN** a run on a canvas page
- **THEN** the canvas toolbar holds "Outcome per step", the outcome pills, "Taken route" and "Not taken"
- **AND** no separate legend is drawn under the canvas

### Requirement: The canvas inspector and run panel read as the boards draw them

On a canvas page the inspector of a selected step SHALL show the step's kind and type over its name with the close
button beside it, a step name field, each setting's description under it, a switch with a description as a card, the
step's recent log lines without a disclosure, and a footer with Delete step and a primary Done. In a run, the step tab
SHALL show the step's kind and type, name, outcome and timing, a note when the step failed and the flow went on, and
"Edit this step" and "Play on the canvas"; the run card's buttons SHALL carry their icons.

#### Scenario: A selected step

- **GIVEN** a canvas page with step "Mail the resident" selected
- **THEN** the inspector says "Action · Send an e-mail" over "Mail the resident"
- **AND** a "Step name" field holds the name and writes it back
- **AND** "Recent log lines of this step" is open

#### Scenario: A step in a run

- **GIVEN** a run where step "Post" failed and the flow went on
- **WHEN** "Post" is selected in the "This step" tab
- **THEN** the tab shows "Post", its "Warning" pill and the note that the run went on
- **AND** "Play on the canvas" asks the canvas to replay the run

### Requirement: A flow page manifest can name its layout

The app manifest schemas SHALL accept `config.layout` as the dashboard layout array or as the word `canvas` or `cards`,
and SHALL refuse any other word.

#### Scenario: PqFlow's manifest

- **GIVEN** a `flow` page with `config.layout: "canvas"`
- **WHEN** the manifest is validated
- **THEN** it is valid
- **AND** `config.layout: "grid"` is not
