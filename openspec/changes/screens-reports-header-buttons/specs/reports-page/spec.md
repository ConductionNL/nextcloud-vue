# reports-page Delta: screens-reports-header-buttons

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-reports-header-buttons](../../)

## Purpose

A reports page carries buttons beside its title, as board DcRapportages draws "Downloaden" and the buildiq square.

## ADDED Requirements

### Requirement: A reports page carries header buttons

A reports page SHALL draw each `headerButtons` entry that has a `label` and an `action` as a button beside its title,
with its `icon` and translated label. A click SHALL run the `headerActions` entry whose id is the button's `action` (a
function or registry handler is called with `{ actionId }`, `navigate` pushes `route` with `params`, `type: "navigate"`
with a `target` opens that URL in a new tab) and SHALL emit `header-action` `{ action, id }`, except for
`handler: "none"`. Without the board look the buttons SHALL keep their declared order. Under the board look the secondary
buttons SHALL come first, then the buildiq square, then the primary buttons. A page without header buttons SHALL render
its header as before.

#### Scenario: The board's Downloaden button and square

- **GIVEN** a reports page under the board look with `headerButtons: [{ "label": "Downloaden", "action": "download", "icon": "Download" }]` and a `headerActions` entry `download`
- **WHEN** the page renders
- **THEN** "Downloaden" is drawn beside the title as a 40px button, followed by the buildiq square
- **AND** a click on it emits `header-action` with id `download`

#### Scenario: No header buttons

- **GIVEN** a reports page without `headerButtons`
- **WHEN** the page renders
- **THEN** the title stands alone, with no button row and no buildiq square
