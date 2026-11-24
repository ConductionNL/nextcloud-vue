# Tasks: audit-label-action-prefix

### Task 1: Wildcard action labels and the tool token
- **spec_ref**: `openspec/changes/audit-label-action-prefix/specs/audit-trail/spec.md#requirement-an-action-label-can-cover-every-action-under-a-prefix`
- **files**: `src/utils/auditLabels.js`, `docs/components/cn-audit-trail-card.md`
- [x] Implement: `.*` keys in `actionLabelFor`, `{toolId}` in `fillAuditLabel`
- [x] Test: `tests/utils/auditLabels.spec.js`
