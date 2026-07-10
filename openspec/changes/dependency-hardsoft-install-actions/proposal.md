---
kind: code
---

## Why

Today when a Conduction app is missing a required Nextcloud app, both of nc-vue's
dependency surfaces (the full-page `CnDependencyMissing` screen and `CnAppRoot`'s
built-in `or-missing` guard) dead-end the user at a plain link to the Nextcloud
apps settings page — the user leaves the app, hunts for the right entry, installs
and enables it manually, then navigates back. Admins can do this in one click via
Nextcloud's own `settings/apps/enable` endpoint, but nc-vue never offers it.

Separately, the dependency model is all-or-nothing: every entry in
`manifest.dependencies` is treated as HARD (its absence blocks the whole app shell
behind `CnDependencyMissing`). Apps increasingly have SOFT/optional integrations
(e.g. `deck` for task sync, `spreed` for calls) whose absence should NOT block the
shell — it should surface a dismissible in-shell notice, not a blocking screen.

## What Changes

- Add a new `useAppInstaller` composable that wraps `confirmPassword()` from
  `@nextcloud/password-confirmation` (**new dependency**) followed by a `POST` to
  the NC34+ bundled-`appstore` OCS endpoint (`/ocs/v2.php/apps/appstore/api/v1/apps/enable`,
  via `@nextcloud/axios`), falling back to the legacy `POST /index.php/settings/apps/enable`
  route on ≤NC33 (a 404/405). This single admin-only endpoint auto-downloads from the
  app store (signature-verified), runs migrations, and enables the app — covering both
  "install" and "enable" in one call. Exposes `installing`, `error`, and
  `installAndEnable(appId)` state.
- Add admin-aware **"Install and enable" / "Enable"** action buttons to BOTH
  dependency surfaces: `CnDependencyMissing.vue` and `CnAppRoot`'s `or-missing`
  guard. Label is "Install and enable" when the app is not installed vs "Enable"
  when installed-but-disabled (from `dep.enabled`). On success the page reloads
  (a freshly installed app's scripts/appswebroots only exist after a full load);
  on error the message is shown and the existing store link remains as a fallback.
  Non-admins see "ask your administrator to enable X" copy instead of the current
  dead-end settings link.
- **BREAKING (schema, backward-compatible in practice):** extend the manifest
  `dependencies` schema so an entry may be either a string (HARD dependency —
  current behaviour) or an object `{ id, required?: boolean, name? }` where
  `required: false` marks a SOFT dependency. Existing string-only manifests are
  unaffected.
- `CnAppRoot` blocks (phase `dependency-missing`) only on unresolved **HARD**
  dependencies. Unresolved **SOFT** dependencies surface as a dismissible
  `NcNoteCard` banner inside the shell carrying the same install/enable action;
  dismissal is persisted per app+dependency in `localStorage`.
- Fix the untranslated `app-availability.*` keys rendered raw today in the
  `or-missing` guard (the `translate` prop defaults to identity and no app defines
  those strings) by supplying sensible English defaults directly.

## Capabilities

### New Capabilities
- `dependency-install-actions`: In-place install/enable of missing Nextcloud app
  dependencies from nc-vue's dependency surfaces (the `useAppInstaller` composable,
  admin-aware action buttons on `CnDependencyMissing` and the `CnAppRoot`
  `or-missing` guard), the HARD-vs-SOFT dependency model and its manifest-schema
  extension, the dismissible soft-dependency in-shell banner, and the English
  defaults for the `app-availability.*` copy.

### Modified Capabilities
<!-- The CnDependencyMissing screen (REQ-JMR-011, defined in the unarchived
     add-json-manifest-renderer change) and the CnAppRoot or-missing guard
     (REQ-OR-1..7, defined in the unarchived cnapproot-app-availability-guard
     change) are both touched, but neither capability is yet synced into
     openspec/specs/, so there is no base delta to MODIFY. Their behavioural
     additions are captured as scenarios inside the new
     dependency-install-actions capability and cross-referenced by REQ id. -->

## Impact

- **New dependency**: `@nextcloud/password-confirmation` added to `package.json`.
  `@nextcloud/axios` and `@nextcloud/auth` (`getCurrentUser().isAdmin`) are already
  present.
- **New file**: `src/composables/useAppInstaller.js` (+ barrel export in
  `src/composables/index.js`).
- **Modified components**: `src/components/CnDependencyMissing/CnDependencyMissing.vue`,
  `src/components/CnAppRoot/CnAppRoot.vue` (`dependencyStatuses`,
  `unresolvedDependencies`, phase gating, `or-missing` template, `app-availability`
  defaults, new soft-dependency banner).
- **Modified schemas**: `src/schemas/app-manifest.schema.json`,
  `src/schemas/app-manifest-v2.schema.json` (`dependencies` items accept a string
  OR an object).
- **Consumers**: all 5 (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad).
  Backward compatible — string-only manifests and non-admin users keep working;
  admins gain the in-place action. No theming changes (Nextcloud CSS variables
  only; `NcNoteCard`/`NcButton` inherit host theme).
