## Context

nc-vue has two dependency-missing surfaces today, both dead-ending at a link:

1. **`CnDependencyMissing.vue`** — a full-page screen mounted by `CnAppRoot` in the
   `dependency-missing` phase when one or more `manifest.dependencies` are
   unresolved. It renders a plain `<a>` per dependency via `resolveLink()` pointing
   at `/index.php/settings/apps/...` (REQ-JMR-011).
2. **`CnAppRoot`'s `or-missing` guard** — a capabilities-based `NcEmptyContent`
   (driven by the `requiresApps` prop, REQ-OR-1..7) with a single link to
   `orStoreLink` (`OR_STORE_LINK = /index.php/settings/apps/integration/openregister`).

Both make the user leave the app to install/enable the dependency by hand.
Meanwhile the dependency model is all-or-nothing: `dependencyStatuses` maps every
`manifest.dependencies` string through `useAppStatus(id)`, and `unresolvedDependencies`
> 0 forces `phase === 'dependency-missing'` — there is no notion of an optional
integration whose absence should merely warn.

Nextcloud already exposes a one-call install-and-enable primitive: `POST
/index.php/settings/apps/enable` auto-downloads the app from the (signature-verified)
app store, runs its migrations and enables it. It is admin-only, CSRF-protected and
carries `#[PasswordConfirmationRequired]` (a 30-minute confirmation window), which is
why `confirmPassword()` must run first. Its 200 response is
`{ data: { update_required: bool } }`; on failure it returns HTTP 500 with
`{ data: { message } }`.

## Goals / Non-Goals

**Goals:**
- One admin click to install-and-enable (or just enable) a missing dependency from
  either surface, then reload so the freshly installed app's assets are present.
- A HARD vs SOFT dependency distinction: HARD blocks the shell (existing behaviour);
  SOFT surfaces a dismissible in-shell banner and never blocks.
- Backward-compatible manifest schema — string entries keep meaning "hard".
- Graceful non-admin and failure paths (ask-your-administrator copy; fall back to the
  existing store link on error).
- Fix the raw `app-availability.*` keys that render untranslated today.

**Non-Goals:**
- No new backend/PHP — the change consumes Nextcloud's own `settings/apps/enable`
  endpoint. nc-vue ships no controller.
- No per-user (non-admin) install flow — Nextcloud gates the endpoint to admins.
- No change to `useAppStatus`'s detection logic (appswebroots-first) or to the
  `serverAppStatuses` `dependency_statuses` initial-state contract.
- No polling/progress bar beyond a busy state — a full page reload settles the UI.

## Declarative-vs-imperative decision (ADR-031)

N/A. This is a frontend-only change to a shared Vue component library. It introduces
no OpenRegister schema register, no object notifications, and no server-side
declarative config, so ADR-031's declarative-vs-imperative categorisation does not
apply. The one server interaction is a call to Nextcloud's built-in
`settings/apps/enable` endpoint.

## Seed Data

N/A — no OpenRegister schemas, registers, or seed objects are introduced by this
change.

## Decisions

**1. A composable, not a mixin, for the install call.**
`useAppInstaller` follows the existing `useAppStatus` composable pattern (plain
function returning `ref`s — allowed for composables even though *components* stay
Vue 2.7 Options API). It centralises `confirmPassword()` + axios so both surfaces and
the soft-dependency banner share one implementation and one error shape. Alternative
(inlining the call in each component) was rejected — three copies would drift.

**2. `POST settings/apps/enable` covers both install and enable.**
The endpoint downloads-if-missing then enables, so "Install and enable" (not
installed) and "Enable" (installed-but-disabled) hit the same call; only the button
*label* differs, chosen from `dep.enabled` (`false` ⇒ "Enable"). `confirmPassword()`
runs first because of `#[PasswordConfirmationRequired]`; a rejected/cancelled
confirmation short-circuits without calling the endpoint.

**3. Full page reload on success.**
A newly installed app's JS/CSS and its `OC.appswebroots` entry only exist after a
fresh page load, and `useAppStatus` caches results module-side for the page lifetime.
Rather than surgically invalidate caches and hot-mount assets, success calls
`window.location.reload()` — simplest and matches how the setup phase already expects
a reload to re-derive status.

**4. Admin gating via `getCurrentUser().isAdmin`.**
`@nextcloud/auth` is already a dependency. Non-admins cannot hit the endpoint, so both
surfaces branch on `isAdmin`: admins get the action button; non-admins get
"ask your administrator to enable {name}" copy (replacing today's dead-end link,
which non-admins cannot act on anyway).

**5. HARD vs SOFT via a union schema entry.**
`dependencies` items become `string | { id, required?: boolean, name? }`. String =
hard (unchanged). `required: false` = soft. This is the least invasive schema shape,
keeps all existing manifests valid, and normalises cleanly: `dependencyStatuses`
maps each entry to `{ id, required, name, status }`, and `unresolvedDependencies`
splits into hard (gate the phase) and soft (feed the banner). Alternative (a separate
`softDependencies` array) was rejected as a second parallel list to keep in sync.

**6. Soft-dependency banner = `NcNoteCard`, dismissal in `localStorage`.**
Rendered inside the shell (non-blocking), one dismissible `NcNoteCard` per unresolved
soft dependency, each carrying the shared install/enable action. Dismissal persists
under `cn-soft-dep-dismissed:{appId}:{depId}` — the same per-app+browser localStorage
convention `CnAppRoot` already uses for `cn-walkthrough-seen:{appId}`. Per-dependency
keys let each notice be dismissed independently.

**7. English defaults for `app-availability.*`.**
`translate` defaults to identity and no app defines these keys, so today the raw keys
render. Provide English default strings and render them whenever `translate(key)`
returns the key unchanged (i.e. `translate('app-availability.title') === 'app-availability.title'`).
This keeps real l10n working for apps that DO supply the keys.

## Risks / Trade-offs

- **[Full reload loses in-app state]** → Acceptable: it only fires after a deliberate
  admin install action on a screen that is otherwise a dead-end; there is no unsaved
  work behind a blocking dependency screen.
- **[Install takes 10–30s; the tab looks stuck]** → `installing` drives a busy/disabled
  button + spinner so the admin sees progress; the button is disabled while in flight.
- **[Endpoint 500 / store unreachable]** → `error` is surfaced inline and the original
  store link stays as a manual fallback, so the surface never becomes strictly worse
  than today.
- **[Schema union entry could be mis-typed by manifest authors]** → the validator/
  normaliser defaults `required` to `true` and ignores unknown keys per the schema's
  `additionalProperties:false` on the object form, failing safe to HARD.
- **[Soft dep silently ignored if author forgets `required:false`]** → documented in
  the manifest schema `description`; string + object-without-`required` both default
  to hard, matching today's expectation.
