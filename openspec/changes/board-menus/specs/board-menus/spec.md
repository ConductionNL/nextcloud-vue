# board-menus Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-menus](../../)

## Purpose

An Actions menu in the board look draws the board's menu, although it opens outside the board-look root.

## ADDED Requirements

### Requirement: A board menu draws the board's card and rows

On a page with a board-look root every NcActions menu SHALL draw a card 6px in with a hairline border, a 10px radius
and a drop shadow, rows at least 36px high, 10px in, 6px rounded, with 14px text at 400 and an 18px icon 10px before
it, and group captions in 12px bold capitals. A detail page's header menu SHALL be 344px wide and open with its right edge on its trigger's.

#### Scenario: DqZaakMeer

- **GIVEN** a dossiq case in the board look
- **WHEN** the handler opens "Meer"
- **THEN** the menu is 344px wide, ends under the end of "Meer" and has the board's border, radius and shadow
- **AND** "Levensloop: wat kan er met deze zaak" is one 36px row

#### Scenario: Nextcloud look

- **GIVEN** an app without `look: "board"`
- **THEN** its menus keep Nextcloud's own styles

### Requirement: An admin entry shows its tag

An admin-only entry in a board detail page's header menu SHALL show its tag ("beheerder") at the end of the row.

#### Scenario: DqZaakMeer Beheer

- **WHEN** the handler opens "Meer" on a case
- **THEN** "Ruwe gegevens bekijken" ends in "beheerder"
