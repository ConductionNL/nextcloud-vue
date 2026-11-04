# Proposal: settings-section-title-translated

## Why

PQ-NEXT baseline (3 Nov) on board PqBeheer: pipelinq declares its lead settings card in `adminSections.json` as
"Lead Management" with an English description. CnSettingsFieldsSection sends every field label, hint and placeholder
through the app's translate function, but not the card's title and description, so the Dutch page shows
"Lead Management" where the board draws "Leadbeheer".

## What changes

- CnSettingsFieldsSection translates `name`, `description` and `detailedDescription` with the same function as its
  field texts. A title an app already translated is not a translation key and stays as it is.

## Not in this change

- No new props, no CSS.
