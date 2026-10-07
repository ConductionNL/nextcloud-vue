# setup-wizard-close-on-server: a closed setup wizard stays closed everywhere

## Why

- `CnAppRoot` remembered a closed or finished setup wizard only in the browser
  (`localStorage`). Every other browser, device or cleared profile opened it
  again while an optional step was unanswered. OpenRegister worked around it by
  watching the internal `setupWizardDismissed` flag and posting its own
  `dismiss-setup` action (openregister#4445). Ruben decided on 7 October 2026
  that the library records the close on the server, for every app.
- `CnSetupWizard` drew the step intro (`body`) for info, choice, run-action and
  summary steps, but not for `config-fields` steps, so pipelinq's organisation
  step ("Your organisation details…") showed no intro.

## What changes

1. New optional manifest key `setup.dismissAction` (schema 2.53.0). When set,
   `CnAppRoot` posts `POST /apps/{appId}/api/setup/action/{dismissAction}` with
   `{ finished }` once per page load when the user closes or finishes the
   wizard. This reuses the setup action endpoint every app already has. Setup
   endpoints are admin-only, so the record is per instance.
2. `CnAppRoot` reads `dismissed` from `GET /api/setup/status`: `true`, or the
   `setup.version` the wizard was closed at, so a version bump opens it again.
   An app may instead answer its outstanding optional steps when it records the
   close (OpenRegister's `dismiss-setup`); that needs nothing from the library.
3. `CnAppRoot` emits a public `setup-wizard-dismissed` event
   (`{ appId, version, finished }`) once per close.
4. Without `dismissAction`, nothing is posted and the close is remembered in the
   browser as before. The localStorage record is kept in both cases.
5. A `config-fields` step draws its `body` as an info note above its fields.

## Impact

- `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnSetupWizard/CnSetupWizard.vue`,
  `src/schemas/app-manifest-v2.schema.json` (2.53.0)
- Not affected: a `CnSetupWizard` an app mounts itself (pipelinq's "Run the setup
  wizard again" card) posts nothing and keeps working as before.
- Adoption per app: declare `setup.dismissAction` and handle that action in the
  app's `SetupController::runAction`, either by answering the open optional steps
  or by storing the version and returning `dismissed` from `/api/setup/status`.
  OpenRegister can set `"dismissAction": "dismiss-setup"` and drop
  `src/services/wizardDismissal.js`.
