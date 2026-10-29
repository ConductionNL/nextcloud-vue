# board-settings-checkbox-native-box Delta

## ADDED Requirements

### Requirement: A board settings checkbox is the native box

In the board look a checkbox in a settings section (`.settings-section` or `.cn-settings-section`) SHALL be drawn as an
18px square with a 2px corner and a grey 1px edge while open, filled in the primary colour with a white tick once
checked, with the component's glyph hidden. Its label SHALL be on weight 400. The Nextcloud look SHALL keep the glyph.

#### Scenario: PqBeheer modules

- **GIVEN** the menu structure settings in the board look
- **THEN** Verkoop, Kassa and Producten show an 18px box and a regular label, not the outline glyph
