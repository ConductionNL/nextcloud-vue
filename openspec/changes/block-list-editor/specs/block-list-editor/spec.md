# block-list-editor Delta: block-list-editor

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [block-list-editor](../../)

## Purpose

A user builds an ordered list of typed blocks and edits each block's properties, with the keyboard as well as by drag.

## ADDED Requirements

### Requirement: A user builds an ordered list of typed blocks

The editor SHALL add a block of a type from its palette, before a pinned block, with the type's field defaults, and
SHALL select it. It SHALL move a block one place with move up and down buttons and with the arrow keys on the block's
handle, and by dragging; every add, move and remove SHALL be announced in a polite live region. A block of the
`pinnedLast` type SHALL stay last and SHALL offer no move or remove. The palette SHALL be disabled at `maxBlocks`.

#### Scenario: A block moves with the keyboard

- GIVEN a list with a heading, an image and a pinned footer
- WHEN the user presses the up arrow on the image's handle
- THEN the image SHALL come before the heading
- AND the footer SHALL stay last

#### Scenario: A move is announced

- WHEN the user moves the heading down
- THEN the live region SHALL read "Heading moved to position 2 of 3"

### Requirement: The picked block's properties are edited through declared fields

Each type SHALL declare its fields (`text`, `url`, `number`, `textarea`, `markdown`, `select`, `color`). A required
field without a value SHALL be flagged. A textarea field with `fixedTokens` SHALL show the text without the tokens, list
the tokens as chips, and SHALL store the text with the tokens appended.

#### Scenario: A footer keeps its unsubscribe link

- GIVEN a footer whose text field has the fixed tokens address and unsubscribe
- WHEN the user types "See you {{unsubscribe}}"
- THEN the stored text SHALL be "See you", then the address token, then the unsubscribe token, one per line
