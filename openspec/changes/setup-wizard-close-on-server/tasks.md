# Tasks: setup-wizard-close-on-server

- [x] `setup.dismissAction` in the manifest schema (2.53.0), slug pattern
- [x] `CnAppRoot` posts the dismiss action once on close or finish, never breaks the close on failure
- [x] `CnAppRoot` reads `dismissed` (true or a version) from the setup status
- [x] `setup-wizard-dismissed` event
- [x] `config-fields` steps draw their intro
- [x] Tests: `tests/components/CnAppRoot.setupWizardServerDismiss.spec.js`, `tests/components/CnSetupWizard.spec.js`,
      `tests/schemas/app-manifest-v2.schema.spec.js`
