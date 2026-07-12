# Tasks — dependency-hardsoft-install-actions

## 1. Dependency & composable

- [x] 1.1 Add `@nextcloud/password-confirmation` to `package.json` dependencies and install (spec_ref: REQ-DIA-1; files: `package.json`, `package-lock.json`)
- [x] 1.2 Create `src/composables/useAppInstaller.js` — `installing`/`error` refs + async `installAndEnable(appId)` that registers `addPasswordConfirmationInterceptors(axios)` at load and `POST`s the NC34+ OCS `appstore` endpoint `generateOcsUrl('/apps/appstore/api/v1/apps/enable')` `{ appId, groups:[] }` with `{ confirmPassword: PwdConfirmationMode.Strict }` (the strict route ignores the session timestamp and needs a per-request `Authorization: Basic` header — the interceptor supplies it), falling back to the legacy `POST /index.php/settings/apps/enable` `{ appIds:[appId], groups:[] }` — preceded by the non-strict session `confirmPassword()` — only on a 404/405; a cancelled prompt (`Error('Dialog closed')`) leaves `error` null and does not fall back; set `error` from `data.ocs.meta.message` (OCS) or `data.message` (legacy) on failure (spec_ref: REQ-DIA-1; files: `src/composables/useAppInstaller.js`)
- [x] 1.3 Export `useAppInstaller` from `src/composables/index.js` barrel (spec_ref: REQ-DIA-1; files: `src/composables/index.js`)

## 2. Manifest HARD/SOFT model

- [x] 2.1 Extend `dependencies.items` in both `src/schemas/app-manifest.schema.json` and `src/schemas/app-manifest-v2.schema.json` to `oneOf` string OR `{ id, required?, name? }` (object `additionalProperties:false`, `required` defaults true) with an updated description; bump schema `version` (spec_ref: REQ-DIA-4; files: `src/schemas/app-manifest.schema.json`, `src/schemas/app-manifest-v2.schema.json`)
- [x] 2.2 Normalise string+object entries in `CnAppRoot` `dependencyStatuses` to `{ id, required, name, status }` (spec_ref: REQ-DIA-4, REQ-DIA-5; files: `src/components/CnAppRoot/CnAppRoot.vue`)
- [x] 2.3 Split `unresolvedDependencies` into hard vs soft; gate `phase === 'dependency-missing'` on unresolved HARD only (spec_ref: REQ-DIA-5; files: `src/components/CnAppRoot/CnAppRoot.vue`)

## 3. Install/enable actions on both surfaces

- [x] 3.1 Add admin-aware (`getCurrentUser().isAdmin`) install/enable button to `CnDependencyMissing.vue` via `useAppInstaller`; label from installed-vs-disabled; reload on success; show error + keep `resolveLink` fallback (spec_ref: REQ-DIA-2; files: `src/components/CnDependencyMissing/CnDependencyMissing.vue`)
- [x] 3.2 Add non-admin "ask your administrator to enable {name}" copy to `CnDependencyMissing.vue` (spec_ref: REQ-DIA-2; files: `src/components/CnDependencyMissing/CnDependencyMissing.vue`)
- [x] 3.3 Wire the same admin-aware install/enable action into the `CnAppRoot` `or-missing` guard action slot; reload on success, fall back to `orStoreLink`; non-admin copy; keep `#or-missing` slot override precedence (spec_ref: REQ-DIA-3; files: `src/components/CnAppRoot/CnAppRoot.vue`)

## 4. Soft-dependency banner & i18n

- [x] 4.1 Render a dismissible `NcNoteCard` per unresolved+undismissed SOFT dependency inside the shell, carrying the install/enable action (spec_ref: REQ-DIA-6; files: `src/components/CnAppRoot/CnAppRoot.vue`)
- [x] 4.2 Persist dismissal under `localStorage` key `cn-soft-dep-dismissed:{appId}:{depId}`, independent per dependency (spec_ref: REQ-DIA-6; files: `src/components/CnAppRoot/CnAppRoot.vue`)
- [x] 4.3 Provide English default copy for `app-availability.title|description|action`, rendered when `translate(key)` returns the key unchanged (spec_ref: REQ-DIA-7; files: `src/components/CnAppRoot/CnAppRoot.vue`)

## 5. Tests & docs

- [x] 5.1 Unit-test `useAppInstaller` with mocked `@nextcloud/axios` + `@nextcloud/password-confirmation` (interceptors registered at load, modern-OCS strict-flag enable, strict-prompt cancel = no fallback + no error, 404/405→legacy fallback with session `confirmPassword()` success + failure, legacy-prompt cancel, modern-500/403-does-not-fall-back, OCS/legacy error-message extraction) (spec_ref: REQ-DIA-1; files: `test/`)
- [x] 5.2 Component-test `CnDependencyMissing` admin/non-admin + install-success/fail branches with mocked `useAppInstaller` and `@nextcloud/auth` (spec_ref: REQ-DIA-2; files: `test/`)
- [x] 5.3 Unit-test `CnAppRoot` dependency normalisation, hard-gates/soft-does-not, soft banner + dismissal persistence, and app-availability default copy (spec_ref: REQ-DIA-3, REQ-DIA-5, REQ-DIA-6, REQ-DIA-7; files: `test/`)
- [x] 5.4 Validator/unit-test both string and object `dependencies` forms accept & normalise (spec_ref: REQ-DIA-4; files: `test/`)
- [x] 5.5 Update JSDoc/prop docs and the component reference for `useAppInstaller`, `CnDependencyMissing`, and `CnAppRoot`; run `npm test` and `npm run build` (spec_ref: REQ-DIA-1..7; files: `src/`, `docs/`)

## Acceptance criteria

- An admin on either dependency surface can click one button to install-and-enable (or enable) a missing app; the page reloads and the app proceeds.
- A non-admin sees "ask your administrator to enable {name}" instead of a dead-end link on both surfaces.
- An unresolved HARD dependency blocks the shell (phase `dependency-missing`); an unresolved SOFT dependency never blocks and instead shows a dismissible in-shell `NcNoteCard`.
- Soft-dependency dismissal persists across reloads, independently per dependency.
- Existing string-only manifests validate and behave exactly as before; object entries default to HARD unless `required: false`.
- The `or-missing` guard renders English copy, never the raw `app-availability.*` keys.
- An install failure shows the error inline and leaves the original store link usable.
- `npm test` and `npm run build` pass.
