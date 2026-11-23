## ADDED Requirements

### Requirement: A caption count is written in the reader's locale

The `{count}` token of a stat caption with its own count (`content.captionSource`) SHALL be formatted with the reader's locale.

#### Scenario: A Dutch reader sees grouped thousands
- **GIVEN** a stat tile with `caption: "{count} messages"` and a `captionSource` that reads 3912
- **WHEN** the reader's locale is nl-NL
- **THEN** the caption SHALL read "3.912 messages"

@e2e exclude A formatting rule; the unit test mounts the tile with the locale mocked.
