# action-dialog-fields-and-acts Delta: action-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-fields-and-acts](../../)

## Purpose

CnActionDialog carries the archive and plan-an-item dialogs of dossiq without app code.

## ADDED Requirements

### Requirement: An action dialog asks for fields and reads a permission from a list

CnActionDialog SHALL render each entry of `fields` as a text, date, datetime or select input. A field is required unless `required: false`, and the dialog SHALL NOT confirm while a required field is empty. It SHALL send each field under its name beside the reason. Choosing a select option SHALL set the fields in its `fills` that are still empty. With `permission.listPath`, `allowedPath` and `reasonPath` SHALL read the entry of that list whose fields equal `permission.match`. `eyebrow` SHALL be filled from the record once it is read.

#### Scenario: Planning an item

- **GIVEN** the dialog with a template select, a title and a time
- **WHEN** the reader picks "Call someone back" and a time and confirms
- **THEN** the title is filled from the template and the dialog posts the template, the title and the time

#### Scenario: Archiving is not allowed

- **GIVEN** an acts endpoint answering `{ acts: [{ act: "archive", allowed: false, reason: "Only an archivist may archive." }] }`
- **THEN** the dialog shows that reason and does not confirm
