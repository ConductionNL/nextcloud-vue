## ADDED Requirements

### Requirement: An app MAY put its own control above the note composer

`CnNotesTab` MUST expose a `composer-before` scoped slot rendered directly above the note
composer. Its scope MUST carry `setText(text)`, which replaces the composer's text, and `text`,
the composer's current text. Without the slot, the tab MUST render exactly as before.

#### Scenario: A template picker fills the composer

- **GIVEN** an app mounts a template picker in the `composer-before` slot
- **WHEN** the reader picks a template and the app calls `setText` with its body
- **THEN** the composer SHALL hold that body
- **AND** sending SHALL send it as if it had been typed

#### Scenario: No slot, no change

- **GIVEN** an app that does not use the slot
- **WHEN** the notes tab renders
- **THEN** nothing SHALL render above the composer
