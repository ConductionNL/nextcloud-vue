# library-stylesheet Delta: board-look-has-flags

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-look-has-flags](../../)

## Purpose

A board-look page does not re-style whole subtrees on every node a page load inserts.

## ADDED Requirements

### Requirement: The board-look anchors no :has() outside the subject

The board-look stylesheet that the published build carries SHALL contain no `:has()` in a compound other than a
selector's subject, except in compounds that also read a user-interaction state (hover, focus, checked and the like).
Each such compound SHALL be replaced by a flag class whose selector has the same specificity as the compound it
replaces. When the board look is switched on, the library SHALL keep each flag on exactly the elements that match its
compound, and SHALL bring the flags up to date after a DOM change before the browser renders the change.

#### Scenario: A non-subject :has() in the board rules

- **GIVEN** the board-look rule `.cn-look-board .a:has(.b) .c { … }`
- **WHEN** the library is built
- **THEN** the board-look sheet holds `.cn-look-board :where(.cn-h-<hash>):not(.cn-h.cn-h) .c { … }`
- **AND** the build's flag table maps `cn-h-<hash>` to `.a:has(.b)`

#### Scenario: The flag follows the DOM

- **GIVEN** a board-look page with an element `.a`
- **WHEN** a `.b` is inserted below it
- **THEN** `.a` carries the flag before the next frame is rendered
- **AND** when the `.b` is removed again, the flag is removed

#### Scenario: Specificity is kept

- **GIVEN** any selector of the board-look sheets
- **WHEN** the build rewrites it
- **THEN** the rewritten selector has the same specificity as the original
