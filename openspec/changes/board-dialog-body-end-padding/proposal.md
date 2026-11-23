# Proposal: board-dialog-body-end-padding

## Why

Board DqInstellen draws the setup wizard's content 672px wide in a 720px dialog (24px each side). On :8080 it ran 684px:
NcDialog's scoped `.dialog__content[data-v-…] { padding-inline-end: 12px }` has the same specificity as the board
dialog's `.cn-dialog-board .dialog__content { padding: 22px 24px 20px }`, and on the admin page its chunk loads later,
so it won. The case dialogs (DqOverdragen, DqBerichtVersturen, DqNieuweZaak) measured 24px on both sides already.

## What changes

`.cn-dialog-board .dialog .dialog__content { padding-inline-end: 24px }`, which outranks NcDialog's rule whatever the
load order. Board look only. Checked on :8080 with the rule injected: the wizard content is 672px.
