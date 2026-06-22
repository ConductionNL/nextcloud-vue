# Proposal: cn-setup-wizard

kind: feature — the **central, abstract first-time setup wizard** for Conduction apps (hydra ADR-042). Generalises the requirements captured first by three per-app specs (`procest`, `shillinq`, `pipelinq` `first-time-setup`). Owned by `@conduction/nextcloud-vue`; the manifest schema's canonical copy lives in hydra.

## Summary

Apps need configuration + seed data before they are usable, with no shared way to drive or gate it, and the browser cannot seed at all (OpenRegister enforces RBAC on `saveObject`). This change adds a declarative, manifest-driven setup wizard that:

1. renders setup steps from a new manifest `setup` block,
2. gates the app shell until REQUIRED steps are met,
3. runs privileged work (seeding, init) through a standard server-side action contract — never a browser write,
4. is reachable (alongside the existing "help us" modal) from the abstract admin page.

It is built almost entirely by **composing existing primitives** — `CnWizardDialog`, `fieldsFromSchema`, `CnAppRoot`'s phased boot, `CnSuggestFeatureModal`/`CnActionsMenu`, `CnAdminSettingsShell` — so the new surface area is a thin component + a composable + a schema block + two CnAppRoot/CnAdminSettingsShell hooks.

**What changes:**

1. **Manifest `setup` block** (v2 schema, both `src/schemas/app-manifest-v2.schema.json` and the canonical `hydra/scripts/schemas/app-manifest-v2.schema.json`): `{ enabled, version, completionConfigKey, steps[] }`; step types `info` | `config-fields` | `choice` | `run-action` | `summary` | `component`, each with a `required` flag.
2. **`CnSetupWizard`** — wraps `CnWizardDialog`, maps `setup.steps[]` → built-in step renderers (reusing `fieldsFromSchema` + `CnSettingsCard`/`CnFormDialog` for `config-fields`, `NcSelect` for `choice`, a POST+poll runner for `run-action`, a health card for `summary`), with `#step-<id>` slot escape hatch.
3. **`useSetupStatus(appId, manifest)`** — composable (mirrors `useAppStatus`) reading `GET /apps/{appId}/api/setup/status`, returning `{ steps, requiredUnmet, optionalUnmet, completed, loading }`.
4. **`CnAppRoot` `setup` phase** — after dependency-check, gates the shell on `requiredUnmet`; `#setup` slot to override; optional-only-unmet auto-opens once (after the help-us modal), dismissible.
5. **`CnAdminSettingsShell`** — `showSetup` / `showHelp` actions opening `CnSetupWizard` / `CnSuggestFeatureModal`.

The server-side `/api/setup/status|action` contract is implemented per-app (procest/shillinq/pipelinq changes); this change defines the client contract `CnSetupWizard` calls.
