---
kind: code
---

# Proposal: action-dialog

## Summary

ARCH-AUDIT's top move: dossiq hand-builds 18 dialogs that share one shape, a summary of the record, a checklist, a reason, a note and a confirm that runs an act. CnActionDialog is that dialog, configured from the manifest and opened by name with an `open-modal` action. CaseArchiveDialog (board DqArchiveren) is its first consumer: the case summary, a readiness checklist from an endpoint, a reason, a read-only note and Archive it.

## Scope

- New `src/components/CnActionDialog/`, exported.
- `src/components/CnAppRoot/CnAppRoot.vue`: `CnActionDialog` is a built-in modal every app can open by name; an app's own registry entry of that name wins.
- Manifest: the dialog's `config` rides an `open-modal` action's `props`, which are free-form; documenting it in the schema rides the next bump.
