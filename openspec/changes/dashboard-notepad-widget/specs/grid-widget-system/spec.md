# grid-widget-system Delta: dashboard-notepad-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-notepad-widget](../../)

## Purpose

A personal notepad on the dashboard, typed into in place. Row `d-notes`
(launchpad matrix).

## ADDED Requirements

### Requirement: A notepad widget is typed into in place

The widget registry SHALL carry a `notepad` type whose card is editable
in view mode. Text SHALL be saved after the reader stops typing and on
blur, a "Saved" message SHALL confirm a successful write, and a failed
write SHALL keep the text and say it was not saved. When the card is not
focused its markdown SHALL render.

#### Scenario: A clerk notes a phone number

- GIVEN a start page with a notepad card
- WHEN the clerk clicks in the card, types "Terugbellen mevrouw Jansen 06 12345678" and clicks elsewhere
- THEN the card says Saved
- AND after a reload the line is still there

#### Scenario: A failed save keeps the text

- GIVEN the preferences endpoint answers 500
- WHEN the clerk types a line
- THEN the line stays in the card and the card says it was not saved

### Requirement: A note belongs to the person who wrote it

The notepad text SHALL be stored in the reader's user preferences under a
key naming the dashboard and the widget, and SHALL NOT be stored in the
dashboard layout. Two readers of the same dashboard SHALL each see only
their own note in the same card.

#### Scenario: Two colleagues, one team dashboard

- GIVEN a team dashboard with one notepad card
- WHEN Anna writes "Offerte nakijken" and Bram opens the dashboard
- THEN Bram's card is empty
- AND Anna's card shows her line

### Requirement: A user may add a notepad to their own dashboard

The `notepad` type SHALL declare `userAddable: true`, so a user can add
it from the add-widget list without naming a register or a schema.

#### Scenario: Adding a notepad

- GIVEN a dashboard with `userLayout` enabled
- WHEN the reader opens Add widget
- THEN Notepad is offered and adding it needs no configuration
