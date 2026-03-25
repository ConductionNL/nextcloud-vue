# Proposal: Single-Object Dialogs

## Problem
The package had mass-action dialogs (CnMassDeleteDialog, CnMassCopyDialog) but no single-object equivalents. Apps like OpenCatalogi implemented their own store-coupled versions, duplicating logic and breaking the emit-based pattern.

## Solution
Add three generic, emit-based single-object dialogs plus schema-driven form auto-generation:
- **CnDeleteDialog** -- confirm deletion of a single object
- **CnCopyDialog** -- confirm copy of a single object with name input
- **CnFormDialog** -- auto-generated form from schema via `fieldsFromSchema()`
- **fieldsFromSchema() + resolveWidget()** -- utilities for schema-to-form-field conversion
- **CnIndexPage integration** -- dialog override system with slots, built-in row actions (Edit/Copy/Delete)
