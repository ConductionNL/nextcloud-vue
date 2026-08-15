# Design — cn-setup-wizard

## Manifest `setup` block (v2 schema)

```jsonc
"setup": {
  "enabled": true,
  "version": 1,                       // bump to re-trigger setup after a breaking change
  "completionConfigKey": "setup_completed_version",
  "steps": [
    { "id": "welcome", "type": "info", "title": "...", "body": "...", "required": false },
    { "id": "config",  "type": "config-fields", "title": "...", "schema": "<ref|inline JSON Schema>",
      "configKeys": ["..."], "required": true },
    { "id": "region",  "type": "choice", "title": "...", "configKey": "legal_region",
      "options": [ { "value": "...", "label": "..." } ], "multiple": false, "required": true },
    { "id": "seed",    "type": "run-action", "title": "...", "action": "seed", "required": false },
    { "id": "done",    "type": "summary", "title": "...", "healthCheck": true, "required": false },
    { "id": "custom",  "type": "component", "title": "...", "component": "MyStep", "required": false }
  ]
}
```

`additionalProperties:false` on the block + each step (matches the schema's strictness). Step `id` unique; `type` enum closed. Keep BOTH schema copies in sync (the gate uses hydra's canonical copy — learned with `cacheTtl`).

## CnSetupWizard (wraps CnWizardDialog)

`props`: `appId`, `steps` (from `manifest.setup.steps`), `status` (from `useSetupStatus`), label overrides. Maps each step to a built-in renderer; emits `@complete`, `@close`, `@step-action(actionId)`. Built-in renderers:

- `info` → `NcNoteCard` + body.
- `config-fields` → `fieldsFromSchema(schema)` rendered via the same field components `CnFormDialog` uses; "Save & continue" POSTs the app settings endpoint, then `next()`.
- `choice` → `NcSelect` (single/multi) bound to `configKey`; persists via settings POST.
- `run-action` → "Run" button → `POST /apps/{appId}/api/setup/action/{action}`, poll/await, `setResult()` (success/error). Disabled while a prerequisite `required` step is unmet (server also 422-guards).
- `summary` → recap list + (if `healthCheck`) a `CnConfigurationCard` reading `GET /api/setup/status` / health.
- `component` → render the app-registered component or forward the `#step-<id>` slot.

## useSetupStatus(appId, manifest)

Mirrors `useAppStatus.js`. Fetches `GET /apps/{appId}/api/setup/status` (cached per appId for the page lifetime), cross-references `manifest.setup.steps[].required`, returns `{ steps, requiredUnmet, optionalUnmet, completed, loading, refresh() }`. `completed` honours `manifest.setup.version` vs the returned `version`.

## CnAppRoot `setup` phase

New phase after `dependency-missing`, before `shell` (mirror `unresolvedDependencies`/`CnDependencyMissing`). Driven by `useSetupStatus`: if `manifest.setup.enabled` and `requiredUnmet.length > 0` → render `CnSetupWizard` gating (no shell), `#setup` slot overridable. If only `optionalUnmet` → render shell but auto-open the wizard once (after the help-us modal), dismissible; reopenable from admin.

## CnAdminSettingsShell entry

`showSetup` (default true when `manifest.setup.enabled`) + `showHelp` props add two buttons to the version-card `#actions`: "Run setup wizard" (mounts `CnSetupWizard`) and "Help us / Suggest a feature" (mounts `CnSuggestFeatureModal`, reusing the `cnAppId`/`cnFeatureRequestRepo` inject). Satisfies "both modals from the admin page, not personal settings".

## Server-side contract (client side here; apps implement)

- `GET  /apps/{appId}/api/setup/status` → `{ version, completed, steps: { <id>: { done, detail } } }`.
- `POST /apps/{appId}/api/setup/action/{actionId}` → `{ success, message, detail }`; 422 when a prerequisite required step is unmet.

## Reuse / not rebuild

`CnWizardDialog`, `fieldsFromSchema`, `CnFormDialog`, `CnSettingsCard`, `CnConfigurationCard`, `CnSuggestFeatureModal`, `CnActionsMenu`, `useAppStatus` pattern, `observability.health.checks`. New files: `CnSetupWizard/`, `composables/useSetupStatus.js`; edits: `CnAppRoot.vue`, `CnAdminSettingsShell.vue`, both schema copies, barrels, docs, baselines.
