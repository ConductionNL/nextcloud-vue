# board-tab-stack-empty-first Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tab-stack-empty-first](../../)

## Purpose

A tab panel starts with the first card that shows, joined to the open tab.

## ADDED Requirements

### Requirement: A board tab stack skips a first widget that renders nothing

In the board look, when the first widget of a CnTabsWidget stack renders no content, its slot SHALL take no room, and
the card of the next stack item SHALL join the open tab: a top border and a square top-left corner with the board card
radius on the other corners. The Nextcloud look SHALL be unchanged.

#### Scenario: A case whose E-mail tab has no mail card

- GIVEN a case page in the board look whose E-mail tab stack starts with a widget that renders nothing
- WHEN the E-mail tab opens
- THEN the "Gekoppelde mail" card starts right under the tab strip
- AND its top-left corner is square, joined to the open tab
