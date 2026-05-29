# CnExportWizard — configurable export trigger dialog

## Why

The scholiq triage ([scholiq#131](https://codeberg.org/Conduction/scholiq/pulls/131)) flagged `AuditPackExportModal` and `RequestExportModal` as customs because they share the same "configurable export trigger" shape but no lib widget covers it. Both pick scope (regulation + date range), pick format, pick delivery, and emit a server-side export. Other fleet apps (opencatalogi data-exchange, decidesk audit pack) have the same shape coming.

`CnMassExportDialog` exists but is format-only (no scope, no delivery). `CnFormDialog` is too generic (no export-specific UX, no result-phase jobId surface). The export-wizard pattern needs its own widget.

## What changes

1. **New component** — `src/components/CnExportWizard/CnExportWizard.vue` (~390 LOC). Two-phase dialog (form → result). Renders scope pickers (`date-range`, `regulation`, `schema`) per the `scopes` prop, plus format + delivery selects. Email delivery reveals a recipient input. Result phase shows success/error banners; success can carry a `jobId` rendered in the banner.
2. **Public API** — props for `dialogTitle`, `description`, `scopes`, `formats`, `deliveries`, `regulations`, `fieldLabels`, `defaults`, plus UI string overrides (`confirmLabel`, `cancelLabel`, `closeLabel`, `successText`, `jobLabel`, `emailPlaceholder`). Emits `@confirm(payload)` + `@close`. Public method `setResult({success?, jobId?, message?, error?})`.
3. **Polling** — the wizard does NOT poll. Consumers handle async job polling and translate the final status into a single `setResult()` call. Documented + tested.
4. **Barrel exports** — added to `src/components/index.js` and `src/index.js`.
5. **Docs** — `docs/components/cn-export-wizard.md` with full prop/event/method tables + polling-pattern recipe.
6. **Tests** — `tests/components/CnExportWizard.spec.js` (14 cases) covering form vs result phase, scope-conditional rendering, regulation select-vs-input, email recipient reveal, emit on confirm, loading lifecycle, jobId display, label overrides.
7. **jsdoc-baselines** — `CnExportWizard: 1` (100% from day one per the new-component contract).

## Non-goals

- Actual polling logic (consumer-side; many flavours — long-poll, SSE, websocket).
- Domain-specific scope pickers (e.g. tenant tree, audience picker) — those compose `CnExportWizard` from the outside or use `CnFormDialog` directly.
- Internationalisation strings (component takes labels as props; the consumer wires translations).

## Consumer impact

Unblocks scholiq:
- `AuditPackExportModal` → `CnExportWizard` with `scopes=['date-range','regulation']`, `regulations=['GDPR','AVG']`, `formats=['pdf','zip']`.
- `RequestExportModal` → `CnExportWizard` with `scopes=['date-range','regulation']`, `deliveries=['download','email']`.

Available for future use by opencatalogi data-exchange + decidesk audit-pack.

## References

- [nextcloud-vue#283](https://codeberg.org/Conduction/nextcloud-vue/issues/283)
- [scholiq#131](https://codeberg.org/Conduction/scholiq/pulls/131) — consuming-app PR documenting the lib gap.
- `CnFormDialog`, `CnMassExportDialog` — adjacent patterns.
