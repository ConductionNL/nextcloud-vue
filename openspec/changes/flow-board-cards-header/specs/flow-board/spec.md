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
