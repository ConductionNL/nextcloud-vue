# dialog-system Delta: screens-dialog-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dialog-parity](../../)

## Purpose

Let every `Cn*` dialog draw the board dialog of the screens (canon section 5)
when an app opts in, without changing any app that does not.

## ADDED Requirements

### Requirement: An app chooses the board look once

`CnAppRoot` SHALL take a `look` prop (`"nextcloud"` or `"board"`, default
`"nextcloud"`) and SHALL read the manifest's optional top-level `look` key
when the prop is unset. It SHALL provide the value as `cnLook`. Every `Cn*`
dialog SHALL take a `look` prop; when the prop is unset the dialog SHALL use
the injected `cnLook`, and when nothing is injected it SHALL render the
Nextcloud look. The manifest schema SHALL accept `look` with exactly these
two values.

#### Scenario: Nothing set keeps the Nextcloud dialog

- **GIVEN** an app whose manifest has no `look` key
- **WHEN** it opens CnDeleteDialog
- **THEN** the dialog renders as `NcDialog size="small"` with the warning note card, as before

#### Scenario: The manifest key reaches a dialog opened from app code

- **GIVEN** a manifest with `look: "board"`
- **WHEN** app code opens CnFormDialog without a `look` prop
- **THEN** the dialog renders the board header, width and footer

#### Scenario: The prop wins over the app

- **GIVEN** a manifest with `look: "board"`
- **WHEN** a dialog is opened with `look="nextcloud"`
- **THEN** that dialog renders the Nextcloud look

### Requirement: A dialog takes one of three widths

In the board look every `Cn*` dialog SHALL take `width` (`"confirm"`,
`"form"` or `"wizard"`) and SHALL render 560px, 640px or 720px wide
respectively, capped at the viewport minus 32px. When `width` is unset the
dialog SHALL use its component default (confirm for single delete, copy,
mass delete and save view; form for form, rich submit, mass copy, mass
export and support; wizard for tabbed, advanced and schema forms, mass
import, CnWizardDialog and CnExportWizard). No other width SHALL be
reachable through these props.

#### Scenario: A delete confirmation is 560 wide

- **GIVEN** the board look on a 1440px viewport
- **WHEN** CnDeleteDialog opens
- **THEN** the dialog container is 560px wide

#### Scenario: A form app overrides to the wizard width

- **GIVEN** the board look
- **WHEN** CnFormDialog opens with `width="wizard"`
- **THEN** the container is 720px wide

#### Scenario: A phone gets the full width minus the gutter

- **GIVEN** the board look on a 390px viewport
- **WHEN** CnFormDialog opens
- **THEN** the container is 358px wide

### Requirement: A dialog can carry an eyebrow and a subtitle

Every `Cn*` dialog SHALL take `eyebrow` and `subtitle` (both default empty).
In the board look a non-empty eyebrow SHALL render above the title as
13px/700 text with 0.06em letter spacing, uppercase, in the primary text
tone (theme hooks `--cn-dialog-eyebrow-color` and
`--cn-dialog-eyebrow-transform`), 4px above the title. A non-empty subtitle
SHALL render under the title as 14px text in `--color-text-maxcontrast`. The
eyebrow SHALL NOT be a heading and SHALL NOT be part of the dialog's
accessible name. In the Nextcloud look both props SHALL be ignored.

#### Scenario: Context above the title

- **GIVEN** CnFormDialog with `eyebrow="Convert · PQ-2026-0417"` and `subtitle="Event permit for the Parkstraat street party"` in the board look
- **WHEN** it opens
- **THEN** the eyebrow sits above a 20px bold h2, the subtitle under it, and the dialog's accessible name is the title only

### Requirement: The board dialog frame

In the board look a `Cn*` dialog SHALL render: a container with radius 12px
and the shadow `0 12px 40px` at 28% of the text colour; a header row with
padding 22px 24px 0 holding the eyebrow, a 20px/700 h2 and the subtitle on
the left and a 36px round close button (20px icon, transparent ground) on
the right; a body with padding 20px 24px and an 18px gap between blocks;
and a footer with padding 16px 24px, a 1px top border in
`--color-border`, right-aligned buttons 40px high with a 10px gap. The
dimmed page behind it SHALL use the text colour at 45% opacity.

#### Scenario: The frame matches the delete board

- **GIVEN** CnDeleteDialog in the board look
- **WHEN** it renders in a browser next to `opencatalogi/OcPublicatieVerwijderen`
- **THEN** the title baseline, the close button and the footer hairline sit within 2px of the board

#### Scenario: The close button still respects loading

- **GIVEN** a board dialog with `loading` true
- **WHEN** the user presses the close button or Escape
- **THEN** the dialog stays open, as REQ-DG-015 requires

### Requirement: The footer order is fixed

In the board look a `Cn*` dialog footer SHALL render, left to right: an
optional tertiary region aligned to the far left, Cancel as an outlined
secondary button, and the primary action rightmost with a 16px or 18px
icon before its label. Cancel SHALL NOT be a text link. CnFormDialog's
Save draft SHALL render in the tertiary region as a tertiary button, with
the draft-state live region beside it. In the result phase the footer SHALL
show one secondary Close and nothing else. A dialog whose content is
read-only (no confirm) SHALL end in one secondary Close.

#### Scenario: Draft moves to the far left

- **GIVEN** CnFormDialog with drafts enabled in the board look
- **WHEN** it renders
- **THEN** Save draft is the leftmost footer button and Cancel sits directly left of the primary

#### Scenario: The result phase ends in Close

- **GIVEN** a board CnCopyDialog after `setResult({ success: true })`
- **WHEN** the footer renders
- **THEN** it holds exactly one button, Close, as a secondary

### Requirement: A destructive dialog states the consequence

In the board look CnDeleteDialog, CnMassDeleteDialog, CnFilesWidgetDeleteDialog,
CnConfirmDialog with `variant="error"` and any `Cn*` dialog whose primary has
`variant="error"` SHALL fill the primary with
`--cn-dialog-danger` (default `var(--color-error)`) and white text. The body
SHALL open with a 15px/1.6 sentence that names the item in bold (from
`nameField` or `nameFormatter`) followed by "This action cannot be undone."
when the action is irreversible; the `warningText` SHALL render under it as a
warning note (radius 8px, padding 10px 14px, 14px text, icon left), not as
the whole body. The destructive action SHALL NOT be offered inline inside a
table row.

#### Scenario: The item name is bold in the sentence

- **GIVEN** CnDeleteDialog for "Woo decision on the swimming pool tender" with a warningText in the board look
- **WHEN** it opens
- **THEN** the body reads the question with the name in a strong element, and the warning sits in a note under it

### Requirement: Type-to-confirm keeps the button off until it matches

CnDeleteDialog, CnMassDeleteDialog and CnConfirmDialog SHALL take
`confirmValue` (default empty) and `confirmLabel` for the field. When `confirmValue` is non-empty
the dialog SHALL render a labelled text field (40px, monospace value) with a
hint naming the value, and the destructive button SHALL stay disabled, with
`aria-disabled="true"` and 45% opacity, until the field's value equals
`confirmValue` exactly. Without `confirmValue` the dialog SHALL behave as
before. This requirement SHALL hold in both looks.

#### Scenario: One character short

- **GIVEN** CnDeleteDialog with `confirmValue="ticket"` and the user typed "ticke"
- **WHEN** the footer renders
- **THEN** the delete button is disabled and pressing it emits nothing

#### Scenario: An exact match enables delete

- **GIVEN** the same dialog
- **WHEN** the user types "ticket"
- **THEN** the delete button is enabled and pressing it emits `confirm`
