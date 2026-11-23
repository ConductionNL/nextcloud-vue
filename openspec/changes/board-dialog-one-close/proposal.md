---
kind: code
---

# Proposal: board-dialog-one-close

## Summary

A board-look dialog opened with `spawnDialog` showed two close buttons: the board header's round one and NcModal's own.
Seen on shillinq's Generate invoices wizard (board ShFactuurGenereren). The rule that hides NcModal's button,
`.cn-dialog-board .modal-container__close { display: none }`, has the same specificity as NcButton's scoped
`.button-vue[data-v-…] { display: flex }`. A spawned dialog's chunk can load NcButton's stylesheet after the library's,
and then the later rule wins (measured on :8080: the library rule in sheet 549, NcButton's again in sheet 559).

The rule is now `.modal-mask.cn-dialog-board .modal-container__close`, three parts, so it wins whatever the order.

## Scope

- `src/css/dialog.css`: one selector.
- Nothing changes outside the board look; in the board look a dialog has one close button, as before when the order
  happened to favour the library.
