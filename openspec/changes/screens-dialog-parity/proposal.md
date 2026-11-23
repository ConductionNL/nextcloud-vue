---
kind: code
---

# Proposal: screens-dialog-parity

## Summary

The screens on identity.conduction.nl/screens draw every dialog the same way:
a dimmed page, a white card with radius 12, an eyebrow line above a 20px bold
title, a round close button, and a hairline footer with Cancel left of a
primary that carries an icon and a specific verb. The canon fixes the widths
at three values: 560 for a confirmation, 640 for a form, 720 for a wizard or
a dialog with a table. Our dialogs, including the generic CnConfirmDialog
that 32 screens use, sit on `NcDialog` sizes (400, 600, 900),
carry no eyebrow, put a draft button between Cancel and the primary, mark
required fields with an asterisk, and show the delete warning as the whole
body instead of a sentence plus a note.

This change adds the board look to the `Cn*` dialogs as an opt-in. An app
that sets nothing renders exactly as today.

1. Every `Cn*` dialog follows the app's board look (`look: "board"`, the
   switch `screens-chrome-parity` adds in #1391). CnAppRoot provides it as
   `cnLook` because a dialog is teleported out of the app root, where the
   `cn-look-board` class cannot reach it. A dialog's own `look` prop wins.
2. A dialog takes one of three widths by role: `confirm` (560), `form` (640),
   `wizard` (720). Each `Cn*` dialog has a default role.
3. A dialog can carry an eyebrow (context line) above its title and a
   subtitle under it.
4. The board header: 20px bold title, eyebrow 13px, round 36px close button,
   padding 22px 24px; body padding 20px 24px with an 18px gap; footer
   16px 24px above a 1px hairline, buttons 40px high with a 10px gap.
5. Footer order: an optional tertiary action far left, Cancel (outlined
   secondary), the primary rightmost with an icon. A read-only dialog ends in
   one secondary Close; a result phase never shows "Close" next to a confirm.
6. Destructive dialogs fill the primary with the danger colour and state the
   consequence as a sentence with the item name in bold, with any warning in
   a note under it.
7. Type-to-confirm: CnDeleteDialog, CnMassDeleteDialog and CnConfirmDialog
   can ask the user to type a value; the destructive button stays disabled
   until it matches.
8. Required marking in the dialogs follows `screens-form-parity`: optional
   fields say "(optional)", required fields carry no asterisk.

## Reference screens

- `opencatalogi/OcPublicatieVerwijderen` (560, destructive):
  https://identity.conduction.nl/screens/board?id=opencatalogi/OcPublicatieVerwijderen
- `buildiq/BqSchemaVerwijderen` (560, type-to-confirm):
  https://identity.conduction.nl/screens/board?id=buildiq/BqSchemaVerwijderen
- `pipelinq/PqTicketOmzetten` (640, form with eyebrow and subtitle):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqTicketOmzetten
- `dossiq/DqZaakDialogen` (twelve small dialogs, footer order):
  https://identity.conduction.nl/screens/board?id=dossiq/DqZaakDialogen
- `keepiq/KqBulkDelen` (bulk delete, archive, share):
  https://identity.conduction.nl/screens/board?id=keepiq/KqBulkDelen

Canon: section 5 of `UNIFORM-canon.md` (Zuiddrecht v2, 8 Oct 2026). Measured
across all boards: 43 dialogs at 560, 115 at 640, 51 at 720, none at another
width.

## Builds on

- `openspec/specs/dialog-system` (REQ-DG-001 to REQ-DG-015): the two-phase
  pattern, `setResult`, the label props and the focus trap stay as they are.
- `screens-chrome-parity` (#1391): the `look` key, `config.look`, the
  `cn-look-board` class and `src/css/look-board.css`.
- `zuiddrecht-pixel-gaps`, `-2`, `-3` and the #1348 opt-ins: the same rule,
  an opt-in key whose default is today's look.
- `screens-form-parity` (this PR) for the field anatomy inside a form dialog.
- `screens-wizard-parity` (this PR) uses the `wizard` width and the eyebrow.

## Affected consumers

All five (OpenRegister, OpenCatalogi, Dossiq, Pipelinq, Launchpad) and every
app that opens a `Cn*` dialog. None changes until it opts in.

## Backward compatibility

Additive. New props default to today's behaviour; no schema change here
(the `look` key comes with #1391). The existing `size` prop keeps accepting the
`NcDialog` values.

## Theming

Nextcloud variables only. The danger fill reads `--cn-dialog-danger`
(default `var(--color-error)`), so thematiq can set the board's #a30000
without the component naming an nldesign token.
