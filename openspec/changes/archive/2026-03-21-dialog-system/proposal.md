# Dialog System — Components Spec

## Problem
Specifies the two-phase dialog pattern used by all 8 dialog components: CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog.
---

## Proposed Solution
Implement Dialog System — Components Spec following the detailed specification. Key requirements include:
- Requirement: REQ-DG-001 — Two-Phase Confirm-Then-Result Pattern
- Requirement: REQ-DG-002 — setResult Ref Pattern
- Requirement: REQ-DG-003 — CnDeleteDialog — Single-Item Delete Confirmation
- Requirement: REQ-DG-004 — CnCopyDialog — Single-Item Copy with Naming Pattern
- Requirement: REQ-DG-005 — CnFormDialog — Schema-Driven Create/Edit Form

## Scope
This change covers all requirements defined in the dialog-system specification.

## Success Criteria
- Confirm phase renders action prompt with confirm and cancel buttons
- Confirm triggers loading state and emits confirm event
- Result phase shows success and auto-closes after 2000ms
- Result phase shows error without auto-closing
- Timeout is cleaned up on destroy to prevent memory leaks
