# Tasks: screens-wizard-parity

## Implementation Tasks

### Task 1: The board stepper
- **spec_ref**: `openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-board-stepper`
- **files**: `src/components/CnStepper/CnStepper.vue` (new, internal), `src/components/CnWizardDialog/CnWizardDialog.vue`
- [ ] Implement: extract the stepper into CnStepper with a `look` prop; board styles for the three states
- [ ] Test: classes and icons per state; the Nextcloud look renders the stacked stepper unchanged

### Task 2: The stepper is an ordered list with the current step marked
- **spec_ref**: `openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-stepper-is-an-ordered-list-with-the-current-step-marked`
- **files**: `src/components/CnStepper/CnStepper.vue`, `tests/a11y/CnWizardDialog.a11y.spec.js`, e2e specs that select `role="tab"` inside a wizard
- [ ] Implement: `ol`/`li`, `aria-current`, jump-back buttons, hidden "completed" text
- [ ] Test: axe clean in both looks; focus order with and without `allowJumpBack`

### Task 3: The wizard eyebrow names the step
- **spec_ref**: `openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-wizard-eyebrow-names-the-step`
- **files**: `src/components/CnWizardDialog/CnWizardDialog.vue`, `src/components/CnSetupWizard/CnSetupWizard.vue`
- [ ] Implement: `eyebrowContext`, `stepEyebrow`, pass through from CnSetupWizard
- [ ] Test: the eyebrow text on step change; translated placeholders

### Task 4: The wizard footer
- **spec_ref**: `openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-wizard-footer`
- **files**: `src/components/CnWizardDialog/CnWizardDialog.vue`
- [ ] Implement: chevron icons, `submitIcon`, `wizard` width
- [ ] Test: button order and icons on first, middle and last step

### Task 5: A stepped form page uses the board stepper and footer
- **spec_ref**: `openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-a-stepped-form-page-uses-the-board-stepper-and-footer`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `src/components/CnStepper/CnStepper.vue`, `e2e/screens-wizard-parity.e2e.js`
- [ ] Implement: card, stepper, hairline footer with Cancel or Previous left and the primary right
- [ ] Test: footer positions in a browser against `buildiq/BqDataImporteren`

### Task 6: Documentation
- **files**: `docs/components/cn-wizard-dialog.md`, `docs/components/cn-form-page.md`
- [ ] JSDoc on the new props; a board-look screenshot per component
