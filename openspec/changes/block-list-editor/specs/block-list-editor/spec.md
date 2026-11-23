# block-list-editor Delta: block-list-editor

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [block-list-editor](../../)

## Purpose

A user builds an ordered list of typed blocks and orders it with or without a pointer.

## ADDED Requirements

### Requirement: A user orders blocks with or without a pointer

`CnBlockListEditor` SHALL offer a drag handle and Move up and Move down buttons on every block that is not pinned. After a move by either route
it SHALL announce the new position in a `status` live region and emit `move`. After a button move focus SHALL stay on that button, or go to the
other one when the block reached the end. Every control's accessible name SHALL hold its visible label, the block type and the position.

#### Scenario: Move a block down with the keyboard

- **GIVEN** three blocks
- **WHEN** the user presses Move down on the first
- **THEN** it stands second, and a screen reader hears "Block moved to position 2 of 3"
- **AND** focus stays on its Move down button

#### Scenario: A block reaches the end

- **WHEN** the user presses Move down on the second of three blocks
- **THEN** focus goes to its Move up button, because Move down is now disabled

### Requirement: A pinned block stays where it is

A block with `pinned` SHALL show no move or remove control, SHALL NOT give way to a neighbour's move or a drag, and new blocks SHALL land above
a pinned end of the list.

#### Scenario: A new block above a pinned end

- **GIVEN** a text block and a pinned block last
- **WHEN** the user adds a block
- **THEN** it lands second, and the pinned block stays last

### Requirement: Each block type has its own editor

The component SHALL render the `block-<type>` slot for a block of that type, falling back to `block`, and SHALL give it `update(changes)`,
which merges the fields into that block only. With `collapsible` an editor SHALL show only after the user presses the block's name.

#### Scenario: Editing one block

- **WHEN** a slot calls `update({ body: 'x' })` on the second block
- **THEN** only the second block holds `body`

### Requirement: A draft waits for the user

A block with `draft` SHALL show Keep and Discard. Keep SHALL remove the marker and leave the block. Discard SHALL remove the block. While a draft
waits a notice SHALL name the first waiting position, and `pending-drafts` SHALL report all waiting positions on mount and on every change.

#### Scenario: Board LqLesMaken "1 AI-concept"

- **GIVEN** a draft in block 4
- **THEN** the notice names block 4, and `pending-drafts` reports `[4]`
- **WHEN** the user presses Keep
- **THEN** the marker is gone, and `pending-drafts` reports `[]`
