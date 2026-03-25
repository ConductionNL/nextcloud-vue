# Design: Single-Object Dialogs

## Key Decisions

1. **Two-phase pattern** -- Same confirm-then-result pattern as mass dialogs (user confirms, parent calls `setResult()` to resolve).
2. **Schema-driven forms** -- `CnFormDialog` auto-generates fields from JSON Schema via `fieldsFromSchema()`. No manual field definition needed.
3. **Three-level slot override** in CnIndexPage: `#form-dialog` (replace entire dialog), `#form-fields` (replace all fields), `#field-{key}` (replace single field).
4. **Backward compatible** -- `@add` listener check gates form dialog; `setDeleteResult`/`setCopyResult` aliases preserve existing API.
5. **Widget resolution priority** -- explicit widget > enum (NcSelect) > type (number/boolean/checkbox) > format (date/email/url) > text fallback.
6. **Client-side validation** -- required, minLength, maxLength, pattern, min, max derived from schema constraints.
