# Tasks — cn-setup-wizard

## Phase 1: Manifest schema

- [ ] Add the `setup` block to `src/schemas/app-manifest-v2.schema.json` (`$defs.setup` + step `$defs`; `additionalProperties:false`; closed `type` enum; unique step ids).
- [ ] Mirror the identical block into `../hydra/scripts/schemas/app-manifest-v2.schema.json` (canonical gate copy).
- [ ] Extend `validateManifest()` coverage / fixtures so a manifest with a `setup` block validates and a malformed one fails.

## Phase 2: Component + composable

- [ ] `src/composables/useSetupStatus.js` (mirror `useAppStatus.js`): fetch `GET /apps/{appId}/api/setup/status`, cross-reference required flags, return `{ steps, requiredUnmet, optionalUnmet, completed, loading, refresh }`.
- [ ] `src/components/CnSetupWizard/CnSetupWizard.vue` wrapping `CnWizardDialog`; built-in renderers for `info` / `config-fields` (`fieldsFromSchema`) / `choice` (`NcSelect`) / `run-action` (POST `/api/setup/action/{id}` + result) / `summary` (health) / `component` (+ `#step-<id>` slot). JSDoc on every prop/event/slot.
- [ ] `src/components/CnSetupWizard/index.js`; add `CnSetupWizard` + `useSetupStatus` to `src/components/index.js` / `src/composables/*` barrels + `src/index.js`.

## Phase 3: Integration hooks

- [ ] `CnAppRoot.vue`: add the `setup` phase after dependency-check (gates on `requiredUnmet`), `#setup` slot, optional-unmet auto-open-once.
- [ ] `CnAdminSettingsShell.vue`: `showSetup` / `showHelp` props → two `#actions` buttons mounting `CnSetupWizard` / `CnSuggestFeatureModal`.

## Phase 4: Tests + docs

- [ ] `tests/components/CnSetupWizard.spec.js` (renders each step type; required gates; run-action POST; emits complete) + `tests/composables/useSetupStatus.spec.js`.
- [ ] Schema fixture test: a `setup` manifest validates.
- [ ] `docs/components/cn-setup-wizard.md` + `docs/utilities/composables/use-setup-status.md`; run `npm run check:docs`, `npm run prebuild:docs` (regenerate partials), `npm run check:jsdoc` (+ `jsdoc-baselines:update` if coverage improved).
- [ ] `npm test` green.

## Phase 5: Loop

- [ ] `openspec validate cn-setup-wizard --strict`; apply → verify → archive.
