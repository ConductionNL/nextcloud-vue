# action-dialog-checkbox-field Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-checkbox-field](../../)

## Purpose

An action dialog can ask a yes or no beside its reason.

## ADDED Requirements

### Requirement: An action dialog field can be a checkbox

A CnActionDialog `fields[]` entry with `type: "checkbox"` SHALL render a checkbox whose `label` and `hint` are filled
from the record. It SHALL start at `default` (false when absent), SHALL be sent and emitted as a boolean under its
`field`, and SHALL NOT block the action unless `required: true`, in which case it must be ticked.

#### Scenario: DqArchiveren

- **GIVEN** the archive dialog with a checkbox field labelled "Let {initiatorDisplayName} know the case is closed" and `default: true`
- **THEN** it reads "Let Sanne de Vries know the case is closed", is ticked, and the archive request carries `false` once it is unticked
