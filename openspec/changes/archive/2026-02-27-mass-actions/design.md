# Mass Actions — Design

## Dialog Pattern
All mass action dialogs use a two-phase pattern: confirm phase shows item count and options, then `setResult()` transitions to result phase showing success/failure. Dialogs are emit-based with no store coupling.

## Components
- **CnMassDeleteDialog** — Confirms deletion of selected items
- **CnMassCopyDialog** — Copies items with configurable naming patterns (prefix/suffix)
- **CnMassExportDialog** — Exports items with format selection (JSON, CSV)
- **CnMassImportDialog** — Imports items via file upload with validation
- **CnMassActionBar** — Conditionally renders when items are selected, hosts action buttons
- **CnRowActions** — Renders primary actions inline, overflow actions in menu
