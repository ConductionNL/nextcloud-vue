---
sidebar_position: 24
---

# CnSetupWizard

Abstract, manifest-driven **first-time setup wizard** (ADR-042). Wraps
[`CnWizardDialog`](./cn-wizard-dialog.md) and renders a `manifest.setup.steps[]`
array by each step's `type`, reusing the same field components the admin pages
use. It is the second modal in the first-open flow (after the "help us" modal),
and is also openable from the admin page via
[`CnAdminSettingsShell`](./cn-admin-settings-shell.md).

It NEVER writes OpenRegister objects from the browser — OpenRegister enforces
RBAC on `saveObject`, so all persistence goes through a per-app server contract
(`POST /apps/{appId}/api/setup/config` and `/api/setup/action/{actionId}`), which
runs privileged. [`CnAppRoot`](./cn-app-root.md)'s `setup` phase gates the app
shell while a `required` step is unmet.

## Step types

| `type` | Renders | Persists via |
|--------|---------|--------------|
| `info` | a note card (`title` + `body`) | — |
| `config-fields` | fields from a JSON Schema (`fieldsFromSchema`) | `POST /api/setup/config` |
| `choice` | an `NcSelect` bound to `configKey` (`options[]`, `multiple?`) | `POST /api/setup/config` |
| `run-action` | a "Run" button → `POST /api/setup/action/{action}` + result | the action itself |
| `summary` | a recap of step completion | — |
| `component` | the parent's `#step-<id>` slot (escape hatch) | up to the slot |

## Try it

```vue
<template>
  <CnSetupWizard
    :app-id="'procest'"
    :steps="manifest.setup.steps"
    @action-result="onActionResult"
    @complete="onComplete"
    @close="show = false" />
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | — (required) | App id; builds the `/apps/{appId}/api/setup/*` URLs. |
| `steps` | `Array` | `[]` | The `manifest.setup.steps` array to render. |
| `dialogTitle` | `string` | `"Set up this app"` | Dialog header. |
| `submitLabel` | `string` | `"Finish"` | Final-step submit label. |
| `cancelLabel` | `string` | `"Cancel"` | Cancel label. |
| `nextLabel` | `string` | `"Next"` | Next label. |
| `backLabel` | `string` | `"Back"` | Back label. |
| `runLabel` | `string` | `"Run"` | Run-action button label. |
| `successText` | `string` | `"Setup complete."` | Result-phase success text. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `complete` | — | The last step was submitted (setup finished). |
| `action-result` | `{ stepId, action, success, message }` | A `run-action` step finished. |
| `step-change` | `{ stepId, stepIndex, direction }` | The active step changed. |
| `close` | — | The dialog should close. |

## Slots

- `#step-{id}` — override a step's body (for `component` steps or any bespoke step). Scope: the `CnWizardDialog` step scope plus `{ step, runAction, saveConfig }`.

## See also

- [`CnWizardDialog`](./cn-wizard-dialog.md) — the multi-step engine this wraps.
- [`CnAppRoot`](./cn-app-root.md) — gates the shell on required-unmet setup (`setup` phase).
- [`CnAdminSettingsShell`](./cn-admin-settings-shell.md) — opens this wizard from the admin page.
- [`useSetupStatus`](../utilities/composables/use-setup-status.md) — the status composable that drives gating.
