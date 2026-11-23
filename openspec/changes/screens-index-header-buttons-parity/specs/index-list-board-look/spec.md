# index-list-board-look Delta: screens-index-header-buttons-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-header-buttons-parity](../../)

## Purpose

The index header buttons as the PqTickets, PqLeads and DqZaken boards draw
them.

## ADDED Requirements

### Requirement: The add header button carries a plus

Under the board look an `add` header button SHALL carry the `Plus` icon
before its label when the manifest names no `icon`. A named icon SHALL win.
The Nextcloud look SHALL draw the declared icon only.

#### Scenario: New request

- **GIVEN** a ticket index page under the board look with the header button `{ "action": "add", "variant": "primary", "label": "Nieuw verzoek" }`
- **WHEN** it renders
- **THEN** the primary button reads "+ Nieuw verzoek" with the plus icon before the label

@e2e include Read the primary header button's icon against pipelinq/PqTickets.

### Requirement: The header buttons keep the board button under any theme

Under the board look the index header's secondary buttons (Download and the
Actions menu) SHALL be 40px high with padding 0 14px, a 1px
`--color-border-dark` border, radius 8px, on `--color-main-background` in
`--color-main-text`, and the primary button 40px high with padding 0 16px,
no border, radius 8px, on `--color-primary-element`, whatever a theme sets
on secondary and primary buttons. The buildiq square SHALL keep its own
values.

#### Scenario: Download under the nldesign theme

- **GIVEN** a ticket index page under the board look and the nldesign theme with an `export` and an `add` header button
- **WHEN** it renders in a browser
- **THEN** Download is a 40px button with a grey border on white and the primary button has no border

@e2e include Measure the header buttons against pipelinq/PqTickets with the nldesign theme on.
