# cnindexpage-export-action Specification

## Purpose
TBD - created by archiving change cnindexpage-export-action. Update Purpose after archive.
## Requirements
### Requirement: CnIndexPage accepts allowExport prop

CnIndexPage SHALL accept an `allowExport: boolean` prop (default `false`), allowing apps to opt-in to export functionality per page.

#### Scenario: Export prop controls menu visibility

- **GIVEN** a CnIndexPage with `allowExport: true` and a schema flagged `exportable: true`
- **WHEN** the component renders
- **THEN** an Export menu appears in the toolbar
- **AND** when `allowExport: false`, no Export menu appears

@e2e include Mount CnIndexPage with both `allowExport: true` and `false`; verify menu presence.

### Requirement: Export action on index pages

When `CnIndexPage` is passed `allowExport: true` and the schema is flagged `exportable: true` in the register, an Export menu SHALL appear in the toolbar (or header bar) with CSV and Excel options.

#### Scenario: Export menu renders

- **GIVEN** a CnIndexPage with `allowExport: true` and a schema flagged `exportable: true`
- **WHEN** the page renders
- **THEN** an Export menu appears in the toolbar with "Export as CSV" and "Export as Excel" entries

@e2e include Render a test index page with `allowExport: true`; assert Export menu visible.

### Requirement: Export delegates to OR export leaf

Clicking an export option SHALL navigate the browser to `GET /apps/openregister/api/objects/{register}/{schema}/export?format=csv|excel`, passing the current route filters through as query parameters.

#### Scenario: CSV export with filters

- **GIVEN** an index page at route `/cases?status=open&assignee=me`
- **WHEN** the user clicks "Export as CSV"
- **THEN** the browser navigates to `/apps/openregister/api/objects/procest/case/export?format=csv&status=open&assignee=me`
- **AND** OpenRegister serializes the CSV (applies filters, honors RBAC access)

@e2e include Navigate to a filtered index page; click Export; verify the network request includes filters.

#### Scenario: Graceful fallback when export not available

- **GIVEN** a page with `allowExport: false` or a schema without `exportable: true`
- **THEN** no Export menu appears (no error, no broken UI)

@e2e include Render an index page without `allowExport` or a non-exportable schema; assert Export menu absent.

### Requirement: Configuration

CnIndexPage's `allowExport` prop SHALL default to `false`. Apps MUST explicitly opt-in per page.

#### Scenario: Opt-in prevents unexpected exports

- **GIVEN** an app using CnIndexPage without setting `allowExport`
- **THEN** no Export menu appears (default safe posture)

@e2e exclude Default behavior; covered by prop contract tests.

