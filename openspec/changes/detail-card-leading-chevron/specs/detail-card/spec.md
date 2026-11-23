## ADDED Requirements

### Requirement: A collapsible card can lead with its chevron

A collapsible detail card with `chevronStart` SHALL draw its collapse button before the title, and no collapse button
after the header actions. The collapse button SHALL carry a translated name and `aria-expanded`.

#### Scenario: the ideal customer profile card
- **GIVEN** a collapsible card "Ideal customer profile" with `chevronStart` and an "Edit profile" action
- **WHEN** the card renders
- **THEN** the collapse button comes before the title, the action stands alone on the right
- **AND** the button reports `aria-expanded="true"` until it is pressed
