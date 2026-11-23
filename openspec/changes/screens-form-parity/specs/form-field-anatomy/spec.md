# form-field-anatomy Delta: screens-form-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-form-parity](../../)

## Purpose

One field anatomy for every schema-driven form in the library (CnFormDialog,
CnTabbedFormDialog, CnRichSubmitDialog, CnAdvancedFormDialog's properties
tab, CnFormPage), matching the screens when the app takes the board look.

## ADDED Requirements

### Requirement: The label sits above the input

In the board look every auto-rendered text, number, date, select and
textarea field SHALL render its own `label` element above the control
(14px/600, `--cn-field-label-size`) with a 6px gap, and SHALL pass
`labelOutside` to the Nextcloud input so the control draws no label of its
own. The control SHALL be 40px high (`--cn-field-height`), radius 8px, with
a 1px `--color-border-maxcontrast` border and 15px text; a textarea SHALL
keep the same border, radius and text with padding 10px 12px. The label's
`for` SHALL point at the control. Without the board look the fields SHALL
render as before.

#### Scenario: A title field

- **GIVEN** a board look CnFormDialog with a string field "Title"
- **WHEN** it renders in a browser
- **THEN** a 14px bold label sits 6px above a 40px input, and clicking the label focuses the input

### Requirement: Optional fields are marked, required fields are not

In the board look a field that is not required SHALL show " (optional)"
after its label text, in weight 400 and `--color-text-maxcontrast`, as part
of the label's accessible name; the word SHALL come from a translatable
`optionalLabel` prop (default "optional"). A required field SHALL carry no
visible mark and SHALL set `aria-required="true"` on its control. No field
SHALL render an asterisk. This SHALL apply to CnFormDialog, CnTabbedFormDialog,
CnRichSubmitDialog, CnAdvancedFormDialog's properties tab and CnFormPage.

#### Scenario: Mixed fields

- **GIVEN** a board look form with a required "Title" and an optional "Decision date"
- **WHEN** it renders
- **THEN** the labels read "Title" and "Decision date (optional)", no label contains "*", and the title input has `aria-required="true"`

#### Scenario: The Nextcloud look keeps the asterisk

- **GIVEN** the same form without the board look
- **WHEN** it renders
- **THEN** the required label still ends in " *"

### Requirement: Hint under the input, error above it

A field's short help (`field.help`, or `field.description` where the form
uses it as help) SHALL render under the control as 13px text in
`--color-text-maxcontrast`, with the control's `aria-describedby` pointing
at it. In the board look a field error SHALL render between the label and
the control, in 600 weight in `--color-error-text` with a 20px error icon
and a visually hidden "Error:" prefix, the control SHALL take a 2px
`--color-error` border (`--cn-field-error-border`), and the field group
SHALL take a 4px `--color-error` left edge with 16px left padding. In both
looks an invalid control SHALL carry `aria-invalid="true"` and
`aria-describedby` SHALL list the error before the hint.

#### Scenario: An invalid email

- **GIVEN** a board look form page whose email field fails validation
- **WHEN** the error renders
- **THEN** the message sits between the label and the input, the input has `aria-invalid="true"` and a 2px error border, and its `aria-describedby` names the error then the hint

### Requirement: A failed submit shows an error summary

In the board look CnFormPage, on a submit or Next that fails validation,
SHALL render at the top of the form a summary with `role="alert"` and
`tabindex="-1"`: a heading "There are N errors" (or "There is 1 error"), one
sentence, and a list with one link per error whose text is the error
message and whose target is the field's control. The summary SHALL receive
focus. A link SHALL move focus to its control. The summary SHALL go away on
the next successful validation. Without the board look the form SHALL keep
its single error line.

#### Scenario: Two errors

- **GIVEN** a board look form page where email and postcode fail
- **WHEN** the user presses Next
- **THEN** focus moves to a summary headed "There are 2 errors" listing both messages as links, and the first link focuses the email input

### Requirement: Short fields can pair up

A form field SHALL accept `width: "half"` (default `"full"`). In the board
look consecutive half fields SHALL sit in a grid of
`repeat(auto-fit, minmax(220px, 1fr))` with a 16px gap, so two share a row
when the form is at least 456px wide and stack below that. Without the board
look `width` SHALL be ignored.

#### Scenario: Date and status side by side

- **GIVEN** two consecutive half fields in a 640px board dialog
- **WHEN** the form renders
- **THEN** they share one row; at 390px they stack

### Requirement: A public form says what optional means

CnFormPage in `mode: "public"` with the board look SHALL render, above the
first field, the sentence "A field without (optional) must be filled in."
(translatable via `optionalNoticeLabel`, hidden with
`showOptionalNotice: false`) whenever the form has at least one required
field.

#### Scenario: The sentence on a citizen step

- **GIVEN** a public board look form page with required and optional fields
- **WHEN** it renders
- **THEN** the sentence appears once, above the first field
