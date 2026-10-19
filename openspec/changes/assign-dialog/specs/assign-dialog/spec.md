# assign-dialog Delta: assign-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [assign-dialog](../../)

## Purpose

One dialog to hand a record to another user or team, in every app.

## ADDED Requirements

### Requirement: A manifest configures an assign dialog

CnAssignDialog SHALL be a built-in modal that an `open-modal` action opens by name. It SHALL search Nextcloud groups, users or both as `assignee.kinds` says, and SHALL offer what was typed as a choice when `allowTyped` is set. It SHALL say who has the record now from `currentPath`. It SHALL ask a note unless `note` is false or not required, and SHALL show `toggles` as switches that start off. Confirming SHALL be possible only with an assignee and a needed note, and SHALL send `{ <field>: id, <kindField>: kind, <note.field>: note, ...toggles }` to `confirm.request` or dispatch `confirm.action` with it, then show `doneText` and refresh the page. A refusal SHALL be shown in the server's words and the dialog SHALL stay open.

#### Scenario: Handing a case to another team

- **GIVEN** the dialog configured for dossiq's handover on case 2026-0082, now with Vergunningen
- **WHEN** the handler picks Juridische zaken, writes why, ticks the doorzending switch and confirms
- **THEN** it posts `{ team: "legal", reason, doorzending: true }` to the case's handover route and says the case is with its new team

#### Scenario: The server refuses

- **GIVEN** the dialog with a typed team name
- **WHEN** the server answers "That team could not be found."
- **THEN** the dialog shows that sentence and stays open
