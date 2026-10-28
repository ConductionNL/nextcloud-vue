# expandable-row-as-drawn

## ADDED Requirements

### Requirement: An expandable row's header button draws its icon

A header button in an expandable row layout MAY name an `icon`; the row MUST draw that CnIcon before the button's label.

#### Scenario: Bewerken with the pencil

- GIVEN an expandable row layout with the button `{ action: "edit", label: "Edit", icon: "Pencil" }`
- WHEN the row renders
- THEN the Edit button shows the pencil icon before its label

### Requirement: A board look expandable row keeps the board's controls

In the board look an expandable row MUST set its title 14px after the toggle, draw its header buttons and row menu 40px high, its order numbers 12px bold in the soft ink, and its footer action as a light primary pill.

#### Scenario: the open Verkoop pipeline

- GIVEN the pipelines index in the board look with Verkoop open
- WHEN the row renders
- THEN Bewerken and the row menu are 40px high
- AND the order numbers are 12px bold
- AND "Fase toevoegen" is a light primary pill without a border
