---
kind: code
---

# Proposal: assign-dialog

## Summary

ARCH-AUDIT MOVE item. dossiq's CaseHandoverDialog hands a case to another team with a reason and a doorzending switch; its BulkReassignModal and ReassignSelectionDialog hand work to another handler, and pipelinq tickets need the same. CnAssignDialog is that dialog, configured from the manifest: a user or team search, a note, switches, and a request or action to run. It is a built-in modal, next to CnActionDialog.

## Scope

- New `src/components/CnAssignDialog/`, exported and registered in `utils/builtInModals.js`.
- Stacked on `comp/CnActionDialog`, which introduces the built-in modal registry.
- No schema change: the config travels in an `open-modal` action's `props`.
