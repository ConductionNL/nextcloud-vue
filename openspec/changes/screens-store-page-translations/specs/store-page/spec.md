# store-page Delta: screens-store-page-translations

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-store-page-translations](../../)

## Purpose

The store page reads in one language.

## ADDED Requirements

### Requirement: The store page reads in the user's language

The store page SHALL run its description through the app's translate, SHALL show a label for each kind of the default
vocabulary instead of its id (an app's own translation of the id winning), and every text the page itself writes
SHALL have a Dutch catalogue entry.

#### Scenario: The kind chips

- **WHEN** the page offers the default kinds
- **THEN** the chips read "All kinds", "App template", "Adapter", "Source template", "Configuration template" and "Agent template" in the user's language, and no chip shows an id

#### Scenario: The description

- **GIVEN** the manifest description has an entry in the app's catalogue
- **WHEN** the page renders
- **THEN** the lead paragraph is the translated text
