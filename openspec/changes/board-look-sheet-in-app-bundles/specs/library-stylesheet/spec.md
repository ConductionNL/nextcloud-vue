# library-stylesheet Delta: board-look-sheet-in-app-bundles

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-look-sheet-in-app-bundles](../../)

## Purpose

An app bundle that never draws the board look does not pay for the board look's rules either.

## MODIFIED Requirements

### Requirement: The board-look rules are active only where the board look is used

The published ESM entry SHALL install the board-look rules as their own stylesheet, directly after the library
stylesheet, that takes no part in style matching until a component on the page resolves the board look. A component
that resolves the board look SHALL switch those rules on before its first render. A board-look stylesheet installed
after that SHALL be active at once. The published `nextcloud-vue.css` files SHALL keep every rule; `css/index.css`
SHALL carry every rule except the board-look block.

## ADDED Requirements

### Requirement: An app bundle carries the board-look rules switched off

`css/index.css` SHALL import the library stylesheet without the board-look block. The published build SHALL carry the
block as text in `utils/boardLookSheet.js`. When a component switches the board look on and no board-look stylesheet
is on the page, the library SHALL add one with those rules, directly after the library stylesheet and before
stylesheets added after it.

#### Scenario: An app in the default look

- **GIVEN** an app that imports `css/index.css` and draws the Nextcloud look
- **WHEN** a page of it loads
- **THEN** no `.cn-look-board` rule is in any stylesheet on the page

#### Scenario: An app in the board look

- **GIVEN** an app that imports `css/index.css` and whose manifest sets `look: "board"`
- **WHEN** CnAppRoot renders for the first time
- **THEN** a `<style data-cn-library-board>` with the board-look rules directly follows the library stylesheet

#### Scenario: The installer already put a board sheet on the page

- **GIVEN** a page where `library-style.js` installed `<style data-cn-library-board media="not all">`
- **WHEN** a component switches the board look on
- **THEN** that sheet loses its `media` attribute and no second board sheet is added
