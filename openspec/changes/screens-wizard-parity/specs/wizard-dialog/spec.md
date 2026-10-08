# wizard-dialog Delta: screens-wizard-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-wizard-parity](../../)

## Purpose

Let CnWizardDialog, CnSetupWizard and a stepped CnFormPage draw the board
stepper and footer of the screens (canon section 6) when the app takes the
board look.

## ADDED Requirements

### Requirement: The board stepper

In the board look CnWizardDialog SHALL render its steps as one row, wrapping
when needed, with an 8px gap. Each step SHALL show a 28px circle and, beside
it with an 8px gap, its label in 14px. A finished step SHALL show a filled
`--color-success` circle with a 16px check icon (SVG, not a text glyph) and
a label in the secondary text colour. The current step SHALL show a filled
`--color-primary-element` circle with its number in 14px/700 and a 14px/700
label in the main text colour. An upcoming step SHALL show a circle with a
2px `--color-border-dark` outline, its number in 14px/600 and a label in
`--color-text-maxcontrast`. Between two steps a 2px connector SHALL grow to
fill the row, in `--color-success` after a finished step and in
`--color-border` otherwise. Labels SHALL NOT wrap.

#### Scenario: Step 3 of 5

- **GIVEN** a board wizard with five steps on step three
- **WHEN** it renders
- **THEN** steps one and two show a green check, step three a primary circle with "3" and a bold label, steps four and five an outlined circle

#### Scenario: Nothing set keeps the stacked stepper

- **GIVEN** an app without the board look
- **WHEN** CnWizardDialog renders
- **THEN** the 34px circles with the label under them render as before

### Requirement: The stepper is an ordered list with the current step marked

In both looks the stepper SHALL be an `ol` with an accessible name ("Steps"),
each step an `li`, and the current step SHALL carry `aria-current="step"`.
The stepper SHALL NOT use `role="tablist"` or `role="tab"`. When
`allowJumpBack` is true a finished step SHALL be a `button` inside its `li`;
otherwise the step SHALL contain no interactive element. The check icon and
the circle SHALL be hidden from assistive technology; a finished step SHALL
carry a visually hidden "completed" text.

#### Scenario: A screen reader hears the current step

- **GIVEN** a wizard on step two of four
- **WHEN** the accessibility tree is read
- **THEN** it holds a list of four items and only the second has `aria-current="step"`

#### Scenario: Jump back is a real button

- **GIVEN** `allowJumpBack` true on step three
- **WHEN** the user tabs through the stepper
- **THEN** steps one and two receive focus as buttons and step three does not

### Requirement: The wizard eyebrow names the step

In the board look CnWizardDialog SHALL take `eyebrowContext` (default the
dialog title) and SHALL render the eyebrow "<context>, step N of M", updated
on every step change. A `stepEyebrow` label prop SHALL allow the sentence to
be translated with `{context}`, `{step}` and `{total}` placeholders.

#### Scenario: The eyebrow follows the step

- **GIVEN** a board wizard "New newsletter" with six steps
- **WHEN** the user moves from step five to step six
- **THEN** the eyebrow reads "New newsletter, step 6 of 6"

### Requirement: The wizard footer

In the board look CnWizardDialog SHALL render its footer, left to right, as
Cancel (secondary, when `cancellable`), Back (secondary with a chevron-left
icon, from step two on) and the primary rightmost: Next with a
chevron-right icon after the label, or on the last step `submitLabel` with
the `submitIcon` (default a check). The dialog SHALL take the `wizard` width
(720px) from `screens-dialog-parity`. Step buttons SHALL use chevrons, not
arrows.

#### Scenario: The last step finishes with the verb

- **GIVEN** a board wizard on its last step with `submitLabel="Create blast"`
- **WHEN** the footer renders
- **THEN** it shows Cancel, Back and a primary "Create blast" with an icon, in that order, in a 720px dialog

### Requirement: A stepped form page uses the board stepper and footer

In the board look CnFormPage SHALL render its form inside a white card
(1px `--color-border`, radius 12px, padding 24px) and, when it has `steps`,
the board stepper above the fields. It SHALL end in a footer inside the card
with a 1px top hairline and padding 16px 0 0: on the left Cancel (when the
page has a `cancelRoute` or a `cancel` listener) on the first step or
Previous (secondary, chevron left) after it, and on the right the primary
(Next with chevron right, or the submit label with its icon). Without the
board look CnFormPage SHALL render as before.

#### Scenario: Previous left, Next right

- **GIVEN** a board form page with three steps on step two
- **WHEN** it renders
- **THEN** the footer shows Previous at the left edge of the card and Next at the right edge, under a hairline
