# Proposal: nl-flow-wizard-strings

## Why

DqFlow and DqInstellen showed English to a Dutch reader: l10n/nl.json had no Dutch for about 70 strings of CnSetupWizard,
CnWizardDialog ("{context}, step {step} of {total}"), CnStepper ("completed"), CnFlowsPage and CnFlowDetail, and a new
flow was seeded with the literal name "New flow". Nothing stopped a new untranslated string from shipping: the library
had 1,614 such strings.

## What changes

- Dutch for every `t('nextcloud-vue', ...)` string in those five components (75 strings and one plural), written in the
  Conduction voice. The English sources with em-dashes are split into two sentences or use a colon in Dutch.
- useFlowStore seeds a new flow as `t('nextcloud-vue', 'New flow')` ("Nieuwe flow").
- A ratchet spec: every `t()` / `n()` literal in src/ has an entry in l10n/nl.json, except the 1,538 listed in
  tests/l10n/nl-missing-baseline.json. A new string must be translated; a listed string that gets its Dutch must leave
  the list.
