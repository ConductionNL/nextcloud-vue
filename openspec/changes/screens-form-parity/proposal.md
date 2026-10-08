---
kind: code
---

# Proposal: screens-form-parity

## Summary

Every form on the screens, in a dialog or on a page, draws a field the same
way: the label above the input in 14px/600, a 6px gap, a 40px input with
radius 8 and a 1px dark border, 15px text, and a 13px grey hint under it.
Optional fields say "(optional)" after the label in grey; required fields
carry no mark at all, and there are no asterisks. Short fields sit two per
row in an auto-fit grid (`minmax(220px, 1fr)`). An error puts its message
between the label and the input, in the error colour with an icon, gives
the input an error border, and lists every error in a summary at the top of
the form that links to each field. Citizen forms add the sentence "A field
without (optional) must be filled in" above the first field.

Our forms differ:

- CnFormDialog, CnRichSubmitDialog and CnAdvancedFormDialog's properties
  tab append " *" to a required label (15 places);
- the fields use `NcTextField`'s own label, which sits inside the input box,
  not above it; only CnCopyDialog and CnMassExportDialog use `labelOutside`;
- the help text renders under the error, as `small`, at 0.85em;
- CnFormPage shows a single error line at the bottom, no summary, and no
  sentence about optional fields;
- no form can put two short fields on one row.

This change adds the board field anatomy behind the board look (`cnLook`,
from `screens-dialog-parity`). One part applies in both looks because it is
an accessibility fix rather than a style: an error message is tied to its
input with `aria-describedby` and `aria-invalid`.

1. Label above the input, one size, one gap, one input height.
2. "(optional)" on optional fields, no asterisk on required ones.
3. The hint under the input, the error between label and input.
4. An error summary at the top of a form page on a failed submit.
5. Half-width fields (`width: "half"`) that pair up on wide screens.
6. The citizen sentence on public form pages.

The switch is `look: "board"` from `screens-chrome-parity` (#1391); this
PR's `screens-dialog-parity` makes it readable in code as `cnLook`.

## Reference screens

- `decidiq/DcNieuwBesluit` (staff form in a dialog, "(niet verplicht)",
  two per row):
  https://identity.conduction.nl/screens/board?id=decidiq/DcNieuwBesluit
- `pipelinq/PqTicketOmzetten` (select with a hint, checkboxes with a
  second line):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqTicketOmzetten
- `portaliq/FormulierFouten` (error summary, error above input):
  https://identity.conduction.nl/screens/board?id=portaliq/FormulierFouten
- `portaliq/WooVerzoekGegevens` (citizen step with optional fields):
  https://identity.conduction.nl/screens/board?id=portaliq/WooVerzoekGegevens
- `portaliq/FormulierVelden` (every field type):
  https://identity.conduction.nl/screens/board?id=portaliq/FormulierVelden

Canon: section 5 ("Required fields") and section 6 of `UNIFORM-canon.md`.

The citizen boards are drawn at the citizen scale (17px text, 48px inputs,
19px labels, 3px error borders, NL Design System form tokens). Those values
belong to portaliq's site theme, not to this library: the requirements here
fix the anatomy and order, and every size is a token the citizen theme
sets.

## Builds on

- `screens-chrome-parity` (#1391): the `look: "board"` switch, the
  `cn-look-board` class and `src/css/look-board.css`.
- `openspec/specs/dialog-system` REQ-DG-006 (client-side validation) and
  REQ-DG-014 (labels via props).
- `openspec/specs/manifest-form-logic` (`visibleWhen`, `validation`) and
  `manifest-form-page-type`.
- `field-help-in-place` (the info popover on a field description): the
  popover stays; the hint line is the short help.
- `form-dialog-autosave` (the draft state, moved by `screens-dialog-parity`).
- `screens-dialog-parity` and `screens-wizard-parity` (this PR).

## Affected consumers

Every app with a manifest form page or a CnFormDialog: all five, and
portaliq's public forms through CnFormPage in public mode.

## Backward compatibility

Additive behind `cnLook`, except the `aria-describedby`/`aria-invalid`
wiring, which only adds attributes. The asterisk stays in the Nextcloud
look.

## Theming

Field sizes are tokens (`--cn-field-label-size`, `--cn-field-height`,
`--cn-field-text-size`, `--cn-field-hint-size`, `--cn-field-error-border`)
with the staff values as defaults; the input border uses
`--color-border-maxcontrast`, the error `--color-error` and
`--color-error-text`.
