# Design: dialog-system

## Architecture

This change implements the dialog-system specification as part of the @conduction/nextcloud-vue component library. Specifies the two-phase dialog pattern used by all 8 dialog components: CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog.

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
