# dashboard-placement-title Delta

## ADDED Requirements

### Requirement: A layout placement can title its card

A dashboard layout placement MAY carry `title`. The card in that placement SHALL show the placement's title, through the
host translate, instead of the widget definition's title. A `customTitle` on the placement or on the widget definition
SHALL still win, untranslated.

#### Scenario: Board PqWerkplekKlant in a call

- **WHEN** the in-call layout places the widget "New contact moment" with `title: "This contact moment"`
- **THEN** the card is titled "Dit contactmoment" in Dutch
- **AND** the page's own layout, without the placement title, keeps "Nieuw contactmoment"
