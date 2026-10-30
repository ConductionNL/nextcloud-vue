# action-buttons Delta: action-visible-follows-workspace

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-visible-follows-workspace](../../)

## Purpose

An action shown or hidden by a workspace value follows that value.

## ADDED Requirements

### Requirement: An action's workspace condition follows the workspace

When an action in CnActionButtons carries a `visibleWhen` that reads the page workspace (`{ workspace: "<key>", op, value }`), the action SHALL show or hide again whenever that workspace changes, also after the page has mounted.

#### Scenario: PqWerkplekKlant, the call starts

- **GIVEN** the werkplek header with "Contact vastleggen" carrying `visibleWhen: { workspace: "callActive", op: "neq", value: true }`
- **WHEN** a call starts after the page has mounted
- **THEN** "Contact vastleggen" leaves the header
- **AND** it comes back when the call ends
