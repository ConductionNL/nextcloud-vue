# Design: screens-dialog-parity

## Component and surface

`CnDeleteDialog`, `CnCopyDialog`, `CnFormDialog`, `CnTabbedFormDialog`,
`CnAdvancedFormDialog`, `CnSchemaFormDialog`, `CnMassDeleteDialog`,
`CnMassCopyDialog`, `CnMassExportDialog`, `CnMassImportDialog`,
`CnRichSubmitDialog`, `CnSaveViewDialog`, `CnSupportDialog`, and under
`src/dialogs/` `CnConfirmDialog` (the generic confirm, on 32 screens),
`CnQuickEditDialog`, `CnTransitionInputDialog`, `CnFilesWidgetDeleteDialog`
and `CnNoteHistoryDialog`; plus `CnWizardDialog` and `CnExportWizard` for the
width and the eyebrow (their stepper is `screens-wizard-parity`). The
in-app editor modals (`CnEdit*Modal`, `CnFlow*Modal`) are buildiq tooling and
out of scope. `CnAppRoot` provides the look. New
shared stylesheet `src/css/dialog.css`.

## D1. One app-wide opt-in, not a key per dialog

Rounds one to three of the Zuiddrecht pixel match added one opt-in per page
or widget (`content.layout: "stacked"`, `config.showWidgetActions`). That
does not work for dialogs: most of them are opened from app code, not from a
manifest page, so there is no page config to read. The board look is a
property of the app, not of one dialog.

So `CnAppRoot` takes `look` (`"nextcloud"` default, or `"board"`), read from
a new optional top-level manifest key `look`, and provides it as `cnLook`.
Every `Cn*` dialog takes a `look` prop with no default of its own: when the
prop is unset it injects `cnLook`, and when nothing is provided it renders
the Nextcloud look. The other `screens-*` changes in this PR read the same
`cnLook`, so an app opts in once.

```json
{ "version": "2.54.0", "look": "board", "menu": [ ... ] }
```

Rejected: a CSS-only switch (a class on the app root). The width, the footer
order, the eyebrow and the type-to-confirm field change markup, not only
style, and a class cannot reorder buttons.

## D2. Width by role, not by pixel

The canon allows three widths and nothing else. A `width` prop with free
pixel values would let the fourth width back in. So the dialogs take
`role`-named widths: `confirm` 560, `form` 640, `wizard` 720, and each
component has a default:

| component | default width |
|---|---|
| CnConfirmDialog, CnDeleteDialog, CnFilesWidgetDeleteDialog, CnCopyDialog, CnMassDeleteDialog, CnSaveViewDialog | confirm |
| CnFormDialog, CnQuickEditDialog, CnTransitionInputDialog, CnRichSubmitDialog, CnMassCopyDialog, CnMassExportDialog, CnSupportDialog | form |
| CnTabbedFormDialog, CnAdvancedFormDialog, CnSchemaFormDialog, CnMassImportDialog, CnNoteHistoryDialog, CnWizardDialog, CnExportWizard | wizard |

`NcDialog` has no 560/640/720 size, so in the board look the dialog passes
`size="normal"` and sets `--cn-dialog-width` on the container
(`max-width: min(var(--cn-dialog-width), 100% - 32px)`). In the Nextcloud
look the existing `size` prop applies unchanged.

## D3. The eyebrow style

The boards draw the eyebrow two ways: 96 in uppercase 13px/700 with
0.06em tracking in the primary text tone (#234a78), 66 in sentence case
13px/600 grey. The uppercase one is the majority and the one the newer
boards use, so it is the default; `--cn-dialog-eyebrow-transform` and
`--cn-dialog-eyebrow-color` let a theme pick the grey one. The eyebrow is
plain text (`<span>`), not a heading, so the dialog's accessible name stays
the title.

## D4. The header is ours in the board look

`NcDialog` draws its own name heading and a square close button inside the
container. In the board look the dialog passes no `name` and renders its
own header row (eyebrow, h2, subtitle, close button) in the default slot,
keeping `aria-labelledby` on the h2. The close button calls the same
`closing` path so `noClose` during loading keeps working (REQ-DG-015).

## D5. Draft is a tertiary action

CnFormDialog's "Save draft" sits between Cancel and the primary. The canon
puts an optional tertiary far left. In the board look it moves into a
`tertiary` footer region (left aligned, `margin-inline-end: auto`) and
renders as a tertiary button. The draft-state live region moves with it.

## Risks

- Apps that already pass `size="large"` to CnFormDialog for a wide form get
  640 in the board look. Mitigation: `width` wins over the role default, so
  the app sets `width: "wizard"` for a table-heavy form.
- Our own header duplicates a piece of NcDialog. Mitigation: only in the
  board look, and the a11y tests run in both looks.
