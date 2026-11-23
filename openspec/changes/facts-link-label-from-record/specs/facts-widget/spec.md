## ADDED Requirements

### Requirement: A facts link can take its words from the record

A facts link's `label` and `note` SHALL fill `{path}` and `{path:format}` placeholders from the record the card shows. The `first-segment` and `last-segment` formats SHALL read the first or the last part of a `/`-separated path. A label without placeholders SHALL be translated as before.

#### Scenario: a work instruction
- **GIVEN** a case type whose knowledgeBasePage is "Woo en informatie/Hoe we Woo-verzoeken behandelen"
- **THEN** the link reads "Hoe we Woo-verzoeken behandelen" with the note "Uit Collectives, team Woo en informatie."
