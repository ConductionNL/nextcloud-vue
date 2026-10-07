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
| `choice` | an `NcSelect` bound to `configKey` (`options[]`, `multiple?`), or cards with `display: "cards"` | `POST /api/setup/config` |
| `run-action` | auto-starts `POST /api/setup/action/{action}` on entry (spinner), result + a "Run again" button | the action itself |
| `summary` | a recap of step completion | — |
| `component` | the parent's `#step-<id>` slot (escape hatch) | up to the slot |

## Dataset cards that load themselves

A cards `choice` step can declare `loadAction`. Every card then gets its own
Load button, except the card whose value is `none`:

```json
{
  "id": "demo-data",
  "type": "choice",
  "display": "cards",
  "optionsSource": "datasets",
  "configKey": "demo_dataset",
  "loadAction": "load-demo-data",
  "title": "Load example data?"
}
```

- Load posts `{ "dataset": "<value>" }` to `/api/setup/action/{loadAction}`.
- The button spins and is disabled while the request runs.
- The server's `message` then shows on that card, as success or error.
- A successful load also selects the card, so the summary names it.
- Picking "None" and clicking Next stores the choice as before. Nothing loads.

With `loadAction` you no longer need a separate `run-action` step after the
cards. A manifest that keeps the old two-step layout still works unchanged.

## Missing apps

Before it shows a step, the wizard checks the app's dependencies: the
`dependencies` prop, or the manifest's `dependencies` that `CnAppRoot`
provides.

- **A required app is missing or disabled.** The wizard shows the list of
  apps instead of the steps, with install and enable buttons for an admin.
  Next stays disabled and no step runs. Installing an app reloads the page.
- **An optional app is missing.** The steps show as usual. The first step
  lists the app as optional and not installed.

A step can also name the apps it needs:

```json
{ "id": "link-invoices", "type": "run-action", "action": "link-invoices", "requires": ["shillinq"] }
```

When any of those apps is absent, the wizard skips the step. The summary
shows it as skipped and names the missing apps.

Setup status counts a skipped step as not applicable: neither done nor
outstanding. It does not reopen the wizard in `CnAppRoot`, and a `required`
step does not gate the app either. Once the app is installed and enabled, the
step counts again. The wizard and [`useSetupStatus`](../utilities/composables/use-setup-status.md)
check the apps the same way: the `dependency_statuses` initial state first,
then the browser's own view of the enabled apps.

## Maintenance belongs on the admin page

Register repair and schema re-import are not setup. Put them on the admin
page with [`CnAdminActionCard`](./cn-admin-action-card.md), never in the
wizard.

## On-demand steps

Mark a `run-action` step `onDemand: true` when the user should run it only when
they ask, typically a destructive one such as removing example data:

```json
{ "id": "remove-example-set", "type": "run-action", "action": "remove-example-set", "onDemand": true }
```

An on-demand step:

- **never auto-runs**, whatever the server reports. It waits for the Run button.
- **is never outstanding work.** It does not open the non-gating wizard in
  `CnAppRoot`, and a resumed wizard never opens on it.
- **is ticked in the summary only when its action succeeded in this session.**
  Otherwise the summary shows it as "Not run". Apps often report such a step as
  `done` on purpose so it never auto-runs; without the flag the summary reads
  that flag as "this happened" and ticks a removal nobody ran.

Steps without the flag behave as before: a server-done `run-action` step is
ticked and never auto-runs.

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
| `dialogTitle` | `string` | `"Set up this app"` | Dialog header. Overridden by `appName` when that prop is set. |
| `appName` | `string` | `''` | The app's display name. When set, the title becomes `Set up {appName}` instead of the generic `dialogTitle` default — pass the same display name `CnAppRoot` already resolves (`appDisplayName \|\| manifest.name \|\| appId`). |
| `submitLabel` | `string` | `"Finish"` | Final-step submit label. |
| `cancelLabel` | `string` | `"Cancel"` | Cancel label. |
| `nextLabel` | `string` | `"Next"` | Next label. |
| `backLabel` | `string` | `"Back"` | Back label. |
| `runLabel` | `string` | `"Run"` | Run-action button label, shown only as a manual fallback — the action itself starts automatically the moment the step becomes current. |
| `rerunLabel` | `string` | `"Run again"` | Run-action button label offered after a run has already finished. |
| `runningLabel` | `string` | `"Loading…"` | Label shown beside the spinner while a run-action step's action is in flight. |
| `successText` | `string` | `"Setup complete."` | Result-phase success text. |
| `cancellable` | `boolean` | `true` | Whether the wizard can be dismissed before finishing. Pass `false` when a REQUIRED step is unmet and the host is gating its shell behind this wizard — an offered-but-non-functional Cancel would be misleading. |
| `dependencies` | `Array` | `[]` | The app's dependencies in the manifest's shape (app-id strings or `{ id, name?, required? }`). Falls back to the injected manifest's `dependencies`. See [Missing apps](#missing-apps). |
| `loadLabel` | `string` | `"Load"` | Load button label on a dataset card. |
| `reloadLabel` | `string` | `"Load again"` | Load button label once that dataset loaded in this session. |
| `completedStepIds` | `Array<string>` | `[]` | Ids of steps the server already reports done (e.g. from `useSetupStatus(...).steps`). Lets a freshly (re)mounted wizard resume at the first actually-unmet step and show correct done-markers, instead of restarting from the top — this component's own local state only tracks the current session. |

## Resuming vs. starting fresh

`completedStepIds` only affects **resuming**:

- **Fresh setup** (`completedStepIds` empty) — always opens at step one, so a leading `info` / welcome step is actually seen.
- **Returning session** — opens at the first unmet **actionable** step, skipping `info` and `summary` steps (they have nothing to resume past) and on-demand steps (they are never outstanding).
- **Everything done** — opens at step one.

A server-done `choice` step also stops blocking `Next` when the user back-navigates onto it. `choiceModel` is session-local, so a resumed-past step renders blank even though its value is already persisted; the wizard treats a server-done step as satisfied instead of demanding a re-pick, and skips the redundant POST.

## Events

| Event | Payload | When |
|-------|---------|------|
| `complete` | — | The last step was submitted (setup finished). Note the wizard switches into its result phase here — the host should keep it mounted until `close`. |
| `action-result` | `{ stepId, action, success, message, dataset? }` | A `run-action` step finished, or a dataset card's Load finished (then `dataset` is the card's value). |
| `step-change` | `{ stepId, stepIndex, direction }` | The active step changed. |
| `close` | — | The dialog should close. |

## Slots

- `#step-{id}` — override a step's body (for `component` steps or any bespoke step). Scope: the `CnWizardDialog` step scope plus `{ step, runAction, saveConfig }`.

## See also

- [`CnWizardDialog`](./cn-wizard-dialog.md) — the multi-step engine this wraps.
- [`CnAppRoot`](./cn-app-root.md) — gates the shell on required-unmet setup (`setup` phase).
- [`CnAdminSettingsShell`](./cn-admin-settings-shell.md) — opens this wizard from the admin page.
- [`useSetupStatus`](../utilities/composables/use-setup-status.md) — the status composable that drives gating.
