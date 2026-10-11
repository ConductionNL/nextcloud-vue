# cell-labels-and-draft-indicator Delta: cell-labels-and-draft-indicator

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [cell-labels-and-draft-indicator](../../)

## Purpose

A list cell and a detail page say the same thing about the same value, a
boolean cell can be seen on a themed instance, and a form never tells a person
their record was saved when the save failed.

## ADDED Requirements

### Requirement: A built-in cell widget shows an enum value by its label

CnCellRenderer SHALL show an enum value through the built-in `badge` widget,
the built-in `link` widget and the `swatch` format by the same label the plain
enum cell shows: the property's `x-enum-labels` (or `enumLabels`) entry for
the value, or the value itself when it has none, passed through the injected
`cnTranslate`. When the column has a `formatter` the cell SHALL show the
formatter's output unchanged. The `badge` widget SHALL look its colour up by
the stored value when `widgetProps.colorMap` has an entry for it
(case-insensitive), and by its label otherwise.

#### Scenario: A badge column shows the label

- **GIVEN** a property with `enum: ["active"]` and `x-enum-labels: { active: "Active" }`
- **WHEN** a column with `widget: "badge"` renders the value `active`
- **THEN** the badge reads "Active"

#### Scenario: The badge colour stays keyed on the stored value

- **GIVEN** the same column with `widgetProps.colorMap: { active: "success" }` and a translation of "Active" to "Actief"
- **WHEN** it renders the value `active`
- **THEN** the badge reads "Actief" and has the success variant

#### Scenario: A formatter still wins

- **GIVEN** a badge column with an app formatter that returns its own label
- **WHEN** it renders a value
- **THEN** the badge reads exactly what the formatter returned, not translated again

### Requirement: The boolean check mark is drawn in the success text colour

CnCellRenderer SHALL draw the check mark of a true boolean cell in
`--color-text-success`, falling back to `--color-success-text` and then
`--color-success`, so a theme whose `--color-success` is a pale fill still
gives the mark at least 3:1 contrast against the page.

#### Scenario: A pale success fill

- **GIVEN** a theme with a pale `--color-success` and a dark `--color-text-success`
- **WHEN** a true boolean cell renders in a browser
- **THEN** the check mark has the text colour and at least 3:1 contrast against white

### Requirement: The draft indicator never reads as a server save after a failed save

While CnFormDialog shows a result with an `error` (or `success: false`), and
after CnFormPage's submit failed, the local draft indicator SHALL NOT say
"Saving" or "Saved". It SHALL say "Draft kept on this device" when a local
draft is stored, and nothing otherwise. Before a result, or after a
successful one, the indicator SHALL behave as before.

#### Scenario: A failed save in the dialog

- **GIVEN** a CnFormDialog whose local draft is stored
- **WHEN** the host calls `setResult({ success: false, error: "server said no" })`
- **THEN** the indicator reads "Draft kept on this device" beside the error

#### Scenario: A local write is still pending

- **GIVEN** a CnFormDialog showing an error result
- **WHEN** a local draft write is pending
- **THEN** the indicator says nothing

#### Scenario: A failed submit on a form page

- **GIVEN** a CnFormPage with draft recovery on and a stored draft
- **WHEN** its submit handler rejects
- **THEN** the indicator reads "Draft kept on this device"
