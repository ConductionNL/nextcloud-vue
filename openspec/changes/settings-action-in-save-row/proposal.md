# Proposal: settings-action-in-save-row

## Why

r33 DqBeheerGeavanceerd "Financiële integratie": the board draws "Willekeurig geheim genereren" beside "Opslaan"; live drew it as a row of its own in the form, the card 67px taller.

## What changes

- A CnSettingsFieldsSection action field with `placement: 'save'` stands in the save row before Save when the form has one; otherwise it stays in the form.
