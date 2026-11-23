# flow-board-cards-header Delta: flow-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-board-cards-header](../../)

## Purpose

Draw the head of a board flow page in the cards layout as board DqFlow does.

## ADDED Requirements

### Requirement: The flow's name is the page heading

A board-look flow page SHALL draw the flow's name as the page's level one heading.

#### Scenario: The flow page has a heading of its own

- GIVEN a board-look flow page for the flow "Omgevingsvergunning regulier"
- WHEN the page is drawn
- THEN its `h1` reads "Omgevingsvergunning regulier"

### Requirement: A page can keep the Active switch's name fixed

A board-look flow page SHALL name the switch that turns the flow on Active or Paused after the flow's state, unless
the page sets `toggleLabel: "fixed"`; then the switch SHALL be named Active whatever the state, and the switch alone
SHALL show whether the flow runs.

#### Scenario: A paused flow with a fixed label

- GIVEN a flow page with `config.toggleLabel: "fixed"` and a flow that is switched off
- WHEN the page is drawn
- THEN the switch is named Active and is not checked

### Requirement: The cards layout spaces its head as the board

In the board look, a flow page in the cards layout SHALL put its head, notice and cards 20px apart, the title row 4px
under the head's top and the path 6px under the title row with 8px of head below it, and SHALL draw the notice
without margins of its own. The canvas layout SHALL keep its own spacing.

#### Scenario: The cards start 20px under the notice

- GIVEN board DqFlow's flow page in the board look
- WHEN the page is drawn
- THEN the notice starts 20px under the head and the cards 20px under the notice

### Requirement: The board-look flow title is the page title

In the board look, a flow page's `h1` SHALL be set as every board page title: 28px, weight 700, line height 1.2, in
both layouts. In the cards layout the title SHALL sit at the top of its row beside the header buttons, and the Active
switch's row SHALL be as tall as the buttons. The Nextcloud look SHALL keep its own title.

#### Scenario: The flow title stands as the other board titles

- GIVEN board DqFlow's flow page in the board look
- WHEN the page is drawn
- THEN its title is 28px at weight 700 with a 33.6px line, level with the tops of the header buttons

### Requirement: The cards layout sets its cards as the board

In the board look, a flow page in the cards layout SHALL start its palette, canvas and inspector cards at the top of
their row, each as tall as its own content, with the canvas card 542px tall. The palette SHALL set its app labels in
the muted ink at a 1.2 line, its steps without the core button margin, "More steps" as a 400 link without a button's
height, and its note at a normal line. A step card on the canvas SHALL set its name at a 1.2 line and its pill at 12px
with 2px by 8px of padding. The inspector SHALL set its outcomes 8px by 16px apart at 14px without cell padding, the
step names at weight 500, and the log summary at a normal line. The canvas layout and the Nextcloud look SHALL keep
their own.

#### Scenario: The palette is as tall as its steps

- GIVEN board DqFlow's flow page in the board look, with four palette groups and ten steps
- WHEN the page is drawn
- THEN the palette card ends under its note, steps 41px apart, and the canvas card is 542px tall beside it
