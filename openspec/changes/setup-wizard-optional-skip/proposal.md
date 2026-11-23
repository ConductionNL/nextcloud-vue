# Proposal: setup-wizard-optional-skip

## Why

Board PqInstellen, step 4 of 7 (Organisatie), puts "(optioneel)" after every field, offers "Deze stap overslaan" beside Annuleren, Terug and Volgende, and closes with "Per veld opgeslagen als je verdergaat. Je kunt alles later wijzigen …". The setup wizard drew the fields without the marker, had no way to skip a step, and showed no note on a config-fields step.

## What changes

- A setup step may set `skippable: true`: CnWizardDialog draws "Skip this step" (tertiary, first in the footer) on that step; it moves on without validating, so nothing of the step is saved.
- A config-fields step may set `optionalLabels: true`: a field its schema does not require reads "{label} (optional)".
- A config-fields step draws its `note` under the fields, and its intro as a plain paragraph in the board look.

## Scope

CnWizardDialog, CnSetupWizard, the v2 manifest schema (`skippable`, `optionalLabels`; 2.159.0, renumber at merge), l10n en/nl, docs.
