---
status: draft
---
# dependency-install-actions Specification

## Purpose

Let a Conduction app resolve a missing Nextcloud app dependency in place — an
admin clicks "Install and enable" (or "Enable") on the dependency surface and
nc-vue downloads, installs and enables the app via Nextcloud's own enable endpoint
(the NC34+ `appstore` OCS API, with the legacy `settings/apps/enable` route as a
≤NC33 fallback), then reloads. Distinguish HARD dependencies (the
app cannot run; blocking `CnDependencyMissing` screen) from SOFT dependencies
(optional integrations; the app shell loads normally with a dismissible in-shell
notice). Supersedes the dead-end "go to the apps settings page" link previously
offered by `CnDependencyMissing` (REQ-JMR-011) and the `CnAppRoot` `or-missing`
guard (REQ-OR-1..7).

## ADDED Requirements

### Requirement: REQ-DIA-1 — `useAppInstaller` composable

nc-vue MUST provide a `useAppInstaller` composable (`src/composables/useAppInstaller.js`,
exported from `src/composables/index.js`) exposing reactive `installing` (boolean),
`error` (string or null) and an async `installAndEnable(appId)` action.

Because the **NC34+ OCS `appstore` endpoint** declares
`#[PasswordConfirmationRequired(strict: true)]` — which ignores the session
confirmation timestamp and demands an `Authorization: Basic base64(login:password)`
header on the request — the composable MUST use the canonical strict-confirmation
mechanism: it MUST call `addPasswordConfirmationInterceptors(axios)` from
`@nextcloud/password-confirmation` once at module load, and MUST `POST`
`generateOcsUrl('/apps/appstore/api/v1/apps/enable')` with the singular body
`{ appId, groups: [] }` and the request config `{ confirmPassword:
PwdConfirmationMode.Strict }` via `@nextcloud/axios`. The interceptor prompts for the
password and attaches the Basic-auth header to that single request; the composable MUST
NOT call the session `confirmPassword()` on this modern path.

When the OCS call fails with HTTP `404` or `405` (an older Nextcloud without the
bundled `appstore` app), it MUST fall back to the **legacy** non-strict
`POST /index.php/settings/apps/enable` with the plural body
`{ appIds: [appId], groups: [] }`, calling the session `confirmPassword()` first (the
legacy route accepts session confirmation). Any other error from the OCS call
(500, 403, network) MUST be treated as a real failure and MUST NOT trigger the legacy
fallback. A cancelled password prompt (the strict interceptor and the session
`confirmPassword()` both reject with `Error('Dialog closed')`) MUST NOT trigger the
legacy fallback and MUST leave `error` `null`. On HTTP 200 it MUST resolve; on failure
it MUST set `error` from the response message — the OCS envelope
`data.ocs.meta.message` or the legacy `data.data.message`/`data.message` (or a generic
fallback) — and reject. `installing` MUST be `true` for the whole duration (the strict
prompt + download + migrations can take 10–30s) and `false` once settled.

@e2e exclude Shared Vue-library composable with no standalone Playwright app surface; the confirmPassword() + enable round-trip is admin-only and mutates the live Nextcloud instance (installs real apps), so it is unsafe to drive in browser e2e — covered by @vue/test-utils unit tests with mocked @nextcloud/axios and @nextcloud/password-confirmation (ADR-008 / Playwright-UI-only convention).

#### Scenario: strict confirm-in-request enable via the modern OCS endpoint

- **GIVEN** `addPasswordConfirmationInterceptors(axios)` has been registered at load
- **AND** an admin calls `installAndEnable('openregister')` on NC34+
- **WHEN** the action runs
- **THEN** the composable MUST `POST` `generateOcsUrl('/apps/appstore/api/v1/apps/enable')`
  with `{ appId: 'openregister', groups: [] }` and the request config
  `{ confirmPassword: PwdConfirmationMode.Strict }`
- **AND** it MUST NOT call the session `confirmPassword()` on this path
- **AND** it MUST NOT call the legacy `/settings/apps/enable` route
- **AND** `installing` MUST be `true` while the request is in flight
- **AND** on a 200 response `installing` MUST return to `false` and `error` MUST
  stay `null`

#### Scenario: falls back to the legacy route (with session confirmPassword) when the OCS endpoint is absent

- **GIVEN** an admin calls `installAndEnable('deck')` on ≤NC33 (no `appstore` app)
- **WHEN** the OCS `POST` fails with HTTP `404` or `405`
- **THEN** the composable MUST call the session `confirmPassword()` and then retry
  `POST /index.php/settings/apps/enable` with `{ appIds: ['deck'], groups: [] }`
- **AND** on a 200 response `installing` MUST return to `false` and `error` MUST
  stay `null`

#### Scenario: password confirmation cancelled

- **WHEN** the strict interceptor (or, on the legacy path, the session
  `confirmPassword()`) rejects with `Error('Dialog closed')` because the admin
  dismisses the dialog
- **THEN** the composable MUST NOT trigger the legacy fallback
- **AND** `error` MUST stay `null`
- **AND** `installing` MUST be `false`
- **AND** the action MUST reject

#### Scenario: a strict 403 does NOT fall back

- **GIVEN** the OCS `POST` returns HTTP 403 (e.g. wrong password / missing Basic
  header from the strict middleware)
- **WHEN** `installAndEnable` handles the rejection
- **THEN** the composable MUST NOT call the legacy `/settings/apps/enable` route
- **AND** `installing` MUST be `false`
- **AND** the action MUST reject so the caller can fall back to the store link

#### Scenario: a modern non-404/405 error does NOT fall back

- **GIVEN** the OCS `POST` returns HTTP 500 with
  `{ data: { ocs: { meta: { message: 'could not enable app' } } } }`
- **WHEN** `installAndEnable` handles the rejection
- **THEN** the composable MUST NOT call the legacy `/settings/apps/enable` route
- **AND** `error` MUST equal `'could not enable app'` (from `data.ocs.meta.message`)
- **AND** `installing` MUST be `false`
- **AND** the action MUST reject so the caller can fall back to the store link

#### Scenario: legacy fallback also fails

- **GIVEN** the OCS `POST` fails with HTTP 405 and the legacy `POST` then returns
  HTTP 500 with `{ data: { message: 'Could not download app' } }`
- **WHEN** `installAndEnable` handles the rejection
- **THEN** `error` MUST equal `'Could not download app'`
- **AND** `installing` MUST be `false`
- **AND** the action MUST reject so the caller can fall back to the store link

### Requirement: REQ-DIA-2 — Admin-aware install/enable button on CnDependencyMissing

`CnDependencyMissing` MUST render, per unresolved dependency, an admin-aware
action driven by `useAppInstaller` when `getCurrentUser().isAdmin` from
`@nextcloud/auth` is true. The button label MUST be the `installLabel`
("Install and enable") when the dependency is not installed and the `enableLabel`
("Enable") when `dep.enabled === false` (installed but disabled). On success the
component MUST reload the page (`window.location.reload()`). On error it MUST show
the error message and keep the existing store link (`resolveLink(dep)`) as a
fallback. When the current user is NOT an admin, the component MUST render
"ask your administrator to enable {name}" copy instead of the action.

@e2e exclude Shared Vue-library component; its success path performs a real app install + full page reload against the live instance and its admin/non-admin branch depends on getCurrentUser().isAdmin — covered by @vue/test-utils component tests that mock useAppInstaller and @nextcloud/auth (ADR-008 / Playwright-UI-only convention).

#### Scenario: admin installs a not-installed hard dependency

- **GIVEN** an admin views `CnDependencyMissing` with a dependency
  `{ id: 'openregister', enabled: undefined }`
- **WHEN** the admin clicks the "Install and enable" button
- **THEN** `useAppInstaller.installAndEnable('openregister')` MUST be called
- **AND** on success the page MUST reload

#### Scenario: admin enables an installed-but-disabled dependency

- **GIVEN** a dependency `{ id: 'deck', enabled: false }`
- **WHEN** an admin views the screen
- **THEN** the action label MUST be "Enable" (not "Install and enable")

#### Scenario: install failure falls back to store link

- **GIVEN** an admin clicks the action and `installAndEnable` rejects with an error
- **WHEN** the rejection is handled
- **THEN** the error message MUST be shown
- **AND** the store link produced by `resolveLink(dep)` MUST remain available

#### Scenario: non-admin sees ask-your-administrator copy

- **GIVEN** `getCurrentUser().isAdmin` is `false`
- **WHEN** a dependency is unresolved
- **THEN** the component MUST render "ask your administrator to enable {name}"
  copy and MUST NOT render the install/enable button

### Requirement: REQ-DIA-3 — Install/enable action on the CnAppRoot or-missing guard

The `CnAppRoot` `or-missing` guard (REQ-OR-3) MUST, for an admin, render the same
`useAppInstaller`-driven "Install and enable" action as the primary
`NcEmptyContent` action, reloading on success and falling back to `orStoreLink` on
error. For a non-admin it MUST render "ask your administrator to enable {app}" copy
in place of the store link. The `#or-missing` slot override (REQ-OR-4) MUST still
take precedence when a consumer supplies it.

@e2e exclude Success path installs a real app and reloads the live instance; admin gating from @nextcloud/auth — covered by @vue/test-utils component tests mocking useAppInstaller and @nextcloud/auth (ADR-008 / Playwright-UI-only convention).

#### Scenario: admin action in the or-missing guard

- **GIVEN** `missingApps = ['openregister']` and the user is an admin
- **WHEN** the guard renders
- **THEN** the primary action MUST invoke `installAndEnable('openregister')`
- **AND** on success MUST reload the page

#### Scenario: non-admin in the or-missing guard

- **GIVEN** `missingApps = ['openregister']` and the user is NOT an admin
- **THEN** the guard MUST render "ask your administrator to enable" copy instead of
  a bare store link

### Requirement: REQ-DIA-4 — HARD vs SOFT dependency manifest model

The manifest `dependencies` array MUST accept, per entry, either a string (a HARD
dependency — the app cannot run without it) or an object `{ id, required?, name? }`
where `required: false` marks a SOFT (optional) dependency and `required` defaults
to `true`. `name` overrides the display label. The manifest JSON schemas
(`src/schemas/app-manifest.schema.json` and `src/schemas/app-manifest-v2.schema.json`)
MUST be updated to permit both forms backward-compatibly, so existing string-only
manifests remain valid.

@e2e exclude Manifest schema + validator capability with no browser surface — covered by validateManifest unit tests asserting both the string and object dependency forms (ADR-008 / Playwright-UI-only convention).

#### Scenario: string entry is a hard dependency

- **GIVEN** `dependencies: ['openregister']`
- **WHEN** the manifest is validated and normalised
- **THEN** `openregister` MUST be treated as a HARD dependency (`required: true`)

#### Scenario: object entry with required false is soft

- **GIVEN** `dependencies: [{ id: 'deck', required: false, name: 'Deck' }]`
- **WHEN** the manifest is validated and normalised
- **THEN** `deck` MUST be treated as a SOFT dependency with display name `Deck`

#### Scenario: object entry defaults to hard

- **GIVEN** `dependencies: [{ id: 'openregister' }]`
- **WHEN** the manifest is normalised
- **THEN** `openregister` MUST be treated as a HARD dependency (`required` defaults
  to `true`)

### Requirement: REQ-DIA-5 — Only unresolved HARD dependencies block the shell

`CnAppRoot`'s `dependencyStatuses`/`unresolvedDependencies` computeds MUST normalise
both string and object dependency entries. The `dependency-missing` phase MUST
activate only when an unresolved dependency is HARD. Unresolved SOFT dependencies
MUST NOT gate the shell — the app proceeds to the `setup`/`shell` phase as if they
were resolved.

@e2e exclude CnAppRoot phase-machine computed logic — covered by @vue/test-utils unit tests over dependencyStatuses/unresolvedDependencies/phase (ADR-008 / Playwright-UI-only convention).

#### Scenario: unresolved hard dependency blocks

- **GIVEN** `dependencies: ['openregister']` and `openregister` is not enabled
- **WHEN** the phase is computed
- **THEN** `phase` MUST equal `'dependency-missing'`

#### Scenario: unresolved soft dependency does not block

- **GIVEN** `dependencies: [{ id: 'deck', required: false }]` and `deck` is not
  enabled, and no hard dependency is unresolved
- **WHEN** the phase is computed
- **THEN** `phase` MUST NOT equal `'dependency-missing'`
- **AND** the app MUST advance to the `setup`/`shell` phase

### Requirement: REQ-DIA-6 — Dismissible soft-dependency banner in the shell

`CnAppRoot` MUST render a non-blocking dismissible `NcNoteCard` (warning/info type)
inside the shell for each SOFT dependency that is unresolved and not yet dismissed.
The banner MUST carry the same admin-aware
install/enable action (REQ-DIA-2 / REQ-DIA-3). Dismissal MUST be persisted per
app+dependency using a `localStorage` key (e.g. `cn-soft-dep-dismissed:{appId}:{depId}`)
so a dismissed notice does not reappear on reload. Multiple unresolved soft
dependencies MUST each be dismissible independently.

@e2e exclude Shell banner + localStorage persistence in a shared Vue library; install action installs a real app — covered by @vue/test-utils component tests with a mocked localStorage and useAppInstaller (ADR-008 / Playwright-UI-only convention).

#### Scenario: soft dependency shows a dismissible banner

- **GIVEN** an unresolved soft dependency `{ id: 'deck', required: false }` that has
  not been dismissed
- **WHEN** the shell renders
- **THEN** a dismissible `NcNoteCard` MUST render offering the install/enable action

#### Scenario: dismissal persists across reload

- **GIVEN** the soft-dependency banner for `deck`
- **WHEN** the user dismisses it
- **THEN** `localStorage` key `cn-soft-dep-dismissed:{appId}:deck` MUST be set
- **AND** the banner MUST NOT render again on the next mount

### Requirement: REQ-DIA-7 — English defaults for app-availability copy

`CnAppRoot` MUST render human-readable English text for the missing-app guard
instead of the raw `app-availability.title` / `app-availability.description` /
`app-availability.action` keys. Because the `translate` prop defaults to an identity
function and no consumer app defines these strings, `CnAppRoot` MUST provide
sensible English default copy that renders when `translate` returns the key
unchanged.

@e2e exclude i18n default-copy fallback in a shared Vue library — covered by @vue/test-utils unit test asserting rendered text is not the raw key (ADR-008 / Playwright-UI-only convention).

#### Scenario: raw key falls back to English default

- **GIVEN** `translate` is the default identity function
- **WHEN** the `or-missing` guard renders
- **THEN** the title/description/action MUST render English prose, NOT the literal
  strings `app-availability.title` / `app-availability.description` /
  `app-availability.action`
