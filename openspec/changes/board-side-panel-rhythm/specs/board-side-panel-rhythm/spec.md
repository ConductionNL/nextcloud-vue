# board-side-panel-rhythm Delta: board-side-panel-rhythm

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-side-panel-rhythm](../../)

## Purpose

Match the side panel of an index page in the board look to the dossiq saved
view boards.

## ADDED Requirements

### Requirement: The board side panel matches the board rhythm

In the board look, on an index page, the side panel section SHALL have a 10px
padding, and the header subtitle SHALL have a 2px top margin, a 14px size and
a normal line height. The saved view name and the share row SHALL use a normal
line height. The saved-view manage menu SHALL be 278px wide. The Nextcloud look
SHALL be unchanged.

#### Scenario: Section padding

- **GIVEN** an index page in the board look with its side panel open
- **WHEN** a tab renders its section
- **THEN** the section content starts 20px from the panel edge

#### Scenario: Subtitle under the title

- **GIVEN** the same side panel
- **WHEN** the header renders a subtitle
- **THEN** the subtitle sits 2px under the title at a normal line height

#### Scenario: Manage menu width

- **GIVEN** a saved view's manage menu opened in the board look
- **WHEN** it renders
- **THEN** it is 278px wide outside
