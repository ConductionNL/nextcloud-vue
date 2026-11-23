# action-dialog Delta: action-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog](../../)

## Purpose

Give every act on a record the same dialog, configured from the manifest.

## ADDED Requirements

### Requirement: A manifest configures an action dialog

CnActionDialog SHALL draw, from its `config`: a summary row of the record (from `summary.source` or the `object` prop), groups of facts, a checklist read from `checklist.source` with each item met, not met or unknown, a reason field, and a read-only note, all texts through the host translate. Its confirm SHALL stay disabled until every `checklist.required` item is met, the `permission` source allows the act, and a required reason is given. Confirming SHALL send `confirm.request` (with the reason) or dispatch `confirm.action` (with `{ reason }` as its last argument), then show `doneText`, refresh the page and emit `done`; a refusal SHALL show the server's message. CnAppRoot SHALL offer it as the built-in modal `CnActionDialog` for `open-modal` actions.

#### Scenario: Archive a case

- **GIVEN** an `open-modal` action targeting `CnActionDialog` with dossiq's archive config
- **WHEN** a coordinator opens it on an ended case, gives a reason and presses Archive it
- **THEN** the dialog posts the reason to the archive endpoint and says the case is archived; on a case not ended the button stays disabled and the checklist says to finish the case first
