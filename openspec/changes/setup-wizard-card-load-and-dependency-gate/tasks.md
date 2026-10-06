# Tasks: setup-wizard-card-load-and-dependency-gate

> Card load button, dependency gate, admin action card (ADR-032 `kind: code`).

## Implementation Tasks

### Task 1: A dataset card loads itself
- **spec_ref**: `openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-a-dataset-card-loads-itself`
- **files**: `src/components/CnChoiceCards/CnChoiceCards.vue`, `src/components/CnSetupWizard/CnSetupWizard.vue`, `tests/components/CnSetupWizard.spec.js`, `tests/components/CnChoiceCards.spec.js`
- **acceptance_criteria**:
  - Every card except `none` shows a Load button when the step declares `loadAction`
  - Load POSTs `{ dataset }` to `/api/setup/action/{loadAction}` and shows a spinner, then the result on that card
  - A step without `loadAction` renders exactly as before
- [x] Implement
- [x] Test

### Task 2: Missing required apps replace the steps
- **spec_ref**: `openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-the-wizard-checks-dependencies-before-any-step`
- **files**: `src/components/CnSetupWizard/CnSetupWizard.vue`, `src/components/CnWizardDialog/CnWizardDialog.vue`, `tests/components/CnSetupWizard.spec.js`
- **acceptance_criteria**:
  - A missing required dependency shows the dependency list instead of the steps, with Next disabled
  - A missing optional dependency is listed and does not block
  - A step with `requires` on an absent app is skipped and shown as skipped in the summary
- [x] Implement
- [x] Test

### Task 3: Admin action card
- **spec_ref**: `openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-an-admin-action-card-runs-one-server-action`
- **files**: `src/components/CnAdminActionCard/`, `src/components/index.js`, `src/index.js`, `tests/components/CnAdminActionCard.spec.js`
- **acceptance_criteria**:
  - Title, explanation and one button; the click POSTs the action and shows a spinner, then the result
  - Exported from the package barrel
- [x] Implement
- [x] Test

### Task 4: Schema and docs
- **spec_ref**: `openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-a-dataset-card-loads-itself`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-setup-wizard.md`, `docs/components/cn-admin-action-card.md`, `l10n/en.json`, `l10n/nl.json`
- **acceptance_criteria**:
  - The schema accepts `loadAction` and `requires` on a step
  - Docs describe both keys and the new component
- [x] Implement
- [x] Test
