# interaction-form-widget Delta: interaction-form-fits-and-reads-dutch

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [interaction-form-fits-and-reads-dutch](../../)

## Purpose

The interaction form fits a narrow dashboard card and speaks the reader's language.

## ADDED Requirements

### Requirement: The interaction form fits its card and reads in the reader's language

Every select of a form widget, including the client picker, SHALL take the width of its field, however narrow the card. Every label the widget writes itself SHALL have a Dutch translation in the library catalogue. A label the manifest supplies (a channel, an outcome, the submit label) SHALL be translated by the app's translate when that gives a translation, else by the library catalogue, else shown as written.

#### Scenario: pipelinq's Nieuw contactmoment at 1100 wide

- **GIVEN** the widget in a 234px card, with channels `Phone` and `Counter` and submit label `Save contact moment`, for a Dutch reader whose app has no translation for those words
- **WHEN** the card is shown
- **THEN** every control stays inside the card
- **AND** it reads "Kanaal", "Telefoon", "Balie", "Uitkomst" and "Contactmoment opslaan"

#### Scenario: The app's own wording

- **GIVEN** an app that translates "Phone" as "Bellen"
- **WHEN** the channel select is shown
- **THEN** it reads "Bellen"
