# Tasks: setup-wizard-opens-at-a-step

### Task 1: The address can open the setup wizard at a step
- **spec_ref**: `openspec/changes/setup-wizard-opens-at-a-step/specs/setup-wizard/spec.md#requirement-the-address-can-open-the-setup-wizard-at-a-step`
- **files**: `src/components/CnSetupWizard/CnSetupWizard.vue`, `src/components/CnAppRoot/CnAppRoot.vue`, `docs/components/cn-setup-wizard.md`
- [x] Implement: `startStep` on the wizard, `?setup=<stepId>` in the app root
- [x] Test: `tests/components/CnSetupWizard.spec.js`, `tests/components/CnAppRoot.setupWizard.spec.js`
