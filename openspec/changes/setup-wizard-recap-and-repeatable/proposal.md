# The setup recap can say why and reopen a step; a step can ask for a list

## Why
humaniq's setup wizard (board HuInrichten, change `setup-wizard-six-steps` tasks 1.1 and 1.2) closes on a recap where
every row carries a line of explanation and a Wijzigen link, and its first step asks for one or more administrations.
CnSetupWizard had neither, and the manifest schema refused the keys.

## What changes
- `summaryHint` on any step: a muted line under its recap row.
- `summaryEditable: true` on a summary step: a Change button per row that jumps to that step.
- A `config-fields` property `repeatable: true` on an array of objects: rows of sub-fields with add and remove, empty
  rows left out, posted as one list.
- A `config-fields` step with `action` posts its values to `/api/setup/action/{action}`; `success: false` keeps it open.
- Manifest schema: `summaryHint` and `summaryEditable` on a setup step.
