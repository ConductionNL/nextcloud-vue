# Tasks: optional-step-requires

> A step whose required apps are absent is not applicable (ADR-032 `kind: code`).

## Implementation Tasks

### Task 1: Setup status leaves out steps whose apps are absent
- **spec_ref**: `openspec/changes/optional-step-requires/specs/cn-setup-wizard/spec.md#requirement-a-step-whose-required-apps-are-absent-is-not-applicable`
- **files**: `src/composables/useSetupStatus.js`, `src/composables/useDependencyCheck.js`, `tests/composables/useSetupStatus.spec.js`
- **acceptance_criteria**:
  - An optional or required step whose `requires` app is absent is in neither `requiredUnmet` nor `optionalUnmet`
  - The same steps count again once the app is installed and enabled
  - The `dependency_statuses` initial state wins over the browser check, as in the wizard
- [x] Implement
- [x] Test

### Task 2: The wizard and CnAppRoot agree
- **spec_ref**: `openspec/changes/optional-step-requires/specs/cn-setup-wizard/spec.md#requirement-a-step-whose-required-apps-are-absent-is-not-applicable`
- **files**: `src/components/CnSetupWizard/CnSetupWizard.vue`, `tests/components/CnAppRoot.setupGate.spec.js`, `tests/components/CnSetupWizard.spec.js`
- **acceptance_criteria**:
  - The wizard resolves skipped steps through the shared `missingRequiredApps`
  - `CnAppRoot` does not auto-open the wizard for an optional step whose app is absent
  - `CnAppRoot` does not gate on a required step whose app is absent
  - The wizard does not offer or wait for a required step whose app is absent
- [x] Implement
- [x] Test

### Task 3: Docs, schema wording and changelog
- **files**: `docs/components/cn-setup-wizard.md`, `docs/components/cn-app-root.md`, `docs/utilities/composables/use-setup-status.md`, `src/schemas/app-manifest-v2.schema.json`, `CHANGELOG.md`
- **acceptance_criteria**:
  - The "do not mark such a step required" caveat is replaced by the new behaviour
  - Schema 2.48.1 records the reworded `requires` description in the hash ledger
- [x] Document
