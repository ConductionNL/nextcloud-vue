# link-cards-settings-action Delta: link-cards-page

## ADDED Requirements

### Requirement: A link card can open the user settings

A card with `action: "user-settings"` SHALL open the user settings dialog of the host app when it is clicked or when the
space key is pressed on it, and SHALL NOT navigate. It SHALL carry `role="button"`. When no host offers the dialog, the
card SHALL NOT render.

#### Scenario: Personal settings from the Advanced page

- **GIVEN** a links page inside an app root, with a card "Personal settings" whose action is `user-settings`
- **WHEN** the reader clicks the card
- **THEN** the user settings dialog SHALL open and the route SHALL stay the same

#### Scenario: No host, no card

- **GIVEN** the same card on a page mounted outside an app root
- **WHEN** the page renders
- **THEN** the card SHALL be left out and the other cards SHALL render

### Requirement: The panel badge takes a tone

`panel.badge.tone` SHALL draw the badge in that tone: `primary` (the default) or `purple`. The badge SHALL stand on a
normal line with a 14px icon. In the board look, a card's trailing icon SHALL sit at the top of the card.

#### Scenario: Administrators only in purple

- **GIVEN** a panel badge "Administrators only" with tone `purple`
- **WHEN** the page renders
- **THEN** the badge SHALL take the purple status tint and ink
