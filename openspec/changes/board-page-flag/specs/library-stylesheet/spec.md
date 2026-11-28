# library-stylesheet Delta: board-page-flag

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-page-flag](../../)

## Purpose

Board-look rules for surfaces teleported to `<body>` do not make the browser restyle the whole page on every DOM
insertion.

## ADDED Requirements

### Requirement: Teleported board surfaces key on a page flag, not on body :has()

The library SHALL keep the attribute `data-cn-board-page` on `<html>` while the page shows an element with
`cn-look-board` and no element with `cn-look-nextcloud`, from the first `enableBoardLookStyle()` call on, updated
before the next style pass after any element is inserted, removed or re-classed. Library rules for surfaces outside
every board-look root SHALL key on `:root[data-cn-board-page] body` and SHALL NOT use a `:has()` anchored at `<body>`
or `<html>`.

#### Scenario: A board-look app

- **GIVEN** a component that resolved the board look renders a `.cn-look-board` root
- **WHEN** the page has no `.cn-look-nextcloud` element
- **THEN** `<html>` carries `data-cn-board-page` and an action menu teleported to `<body>` is drawn in the board look

#### Scenario: A page that opts out of the board look

- **GIVEN** a board-look app showing a page with `config.look: "nextcloud"` (its root has `cn-look-nextcloud`)
- **WHEN** the page is shown
- **THEN** `<html>` has no `data-cn-board-page` and teleported surfaces keep Nextcloud's styling

#### Scenario: Leaving the board look

- **GIVEN** `<html>` carries `data-cn-board-page`
- **WHEN** the last `.cn-look-board` element is removed or loses the class
- **THEN** the flag is removed
