# i18n Delta

## ADDED Requirements

### Requirement: A key the app translates keeps the app's translation

The root's label lookup SHALL show the app's translation of a text the app's catalogue holds, also when that translation
equals the text, and SHALL ask the library catalogue only for a text the app does not hold.

#### Scenario: Open is Open

- **GIVEN** an app whose Dutch catalogue maps "Open" to "Open" and a library that maps "Open" to "Openen"
- **THEN** a Dutch reader sees "Open"
