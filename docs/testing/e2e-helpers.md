---
id: e2e-helpers
title: End-to-end helpers
---

# End-to-end helpers (`@conduction/nextcloud-vue/testing/playwright`)

Browser-test helpers for the behaviour **this library imposes** on its
consumers: its first-visit overlays, and its production bundle's missing
devtools hooks.

```js
import {
	seedFirstVisitOverlaysSeen,
	dismissFirstVisitOverlays,
	findMounted,
	readComponentProp,
} from '@conduction/nextcloud-vue/testing/playwright'
```

## Why this lives in the library

None of these helpers is app knowledge. Every one of them exists *only because
of* something nc-vue does:

- `CnWalkthrough` and `CnSupportDialog` are **nc-vue components**, auto-mounted
  by **nc-vue's `CnAppRoot`** from the manifest. Both render a full-viewport
  layer that intercepts pointer events, and the walkthrough's step tracking can
  keep the network busy so `waitForLoadState('networkidle')` never settles. Any
  spec, in any consuming app, that clicks something after navigating has to
  clear them first.
- The component-tree accessor exists because nc-vue's published bundle sets
  `__VUE_PROD_DEVTOOLS__ = false`, so `__vnode` and `__vueParentComponent` are
  never stamped onto elements and consumers are forced to walk from
  `container.__vue_app__`. nc-vue creates the constraint, so nc-vue ships the
  workaround.

The duplication this replaces was measurable: **openconnector had
reimplemented overlay dismissal three separate times inside one repository**
(`docs-screenshots.dismissOverlays`, a `visual/_visual-helpers` variant that
also hid the dialog with CSS, and a `localStorage` seed in `global-setup`),
openbuild had a fourth copy in `tests/e2e/support/overlays.ts` plus its own
`componentTree.ts` / `stagedManifest.ts`, and launchpad needed the same
behaviour again.

## No dependency on `@playwright/test`

Every helper takes `page` as a plain argument and calls only the public `Page`
surface (`locator`, `evaluate`, `addInitScript`, `keyboard`). Nothing is
imported. That is deliberate:

- a peer dependency on `@playwright/test` would be a hard install cost for the
  many consumers of this component library that never open a browser;
- a version-pinned peer would fight each app's own Playwright pin — the fleet
  is not on one version;
- duck-typing `page` means the same helpers work from a Playwright fixture,
  from a bare `playwright-core` script, and from an MCP-driven session.

TypeScript consumers get types from `testing/playwright.d.ts`, which describes
`page` **structurally** for the same reason.

The module is CommonJS on purpose: Playwright does not transpile files inside
`node_modules`, so ES-module syntax in a `.js` file would fail to load in
exactly the runner it targets.

:::note Import spelling

The package ships no `exports` map (existing deep subpaths depend on its
absence), and Node's native ESM resolver does no extension-adding resolution.
Playwright's loader, webpack and vite all resolve the extensionless form; a
plain `node` ESM script needs the extension:

```js
import { … } from '@conduction/nextcloud-vue/testing/playwright'    // Playwright / webpack / vite
const { … } = require('@conduction/nextcloud-vue/testing/playwright') // CommonJS
import { … } from '@conduction/nextcloud-vue/testing/playwright.js' // native Node ESM
```
:::

## Suppressing the first-visit overlays

### Pre-emptive (preferred)

Seeding costs one `addInitScript` for a whole spec file; dismissing costs a
visibility poll plus a click in *every* test.

```js
test.beforeEach(async ({ page }) => {
	await seedFirstVisitOverlaysSeen(page, 'openbuild')
	await page.goto('/apps/openbuild/')
})
```

- `seedSupportDialogSeen(target, appId?)` — marks `CnSupportDialog` seen.
  `useSupportDialog` treats a positively set local flag as authoritative even
  in `persistence: 'server'` mode (it short-circuits before the preferences
  `GET`), so one seed covers both backends.
- `seedWalkthroughSeen(target, appId?, version?)` — records a last-seen version
  far above any real app version. A *low* seed would suppress the
  `first-visit` tour and then immediately trip the `version-bump` one.
- `seedFirstVisitOverlaysSeen(target, appId?)` — both at once.

**Call these before `page.goto()`.** `addInitScript` only applies to
navigations that start after it is registered. (A best-effort write is also
applied to the already-open document, so a mid-test call is not silently
useless.)

### In a `global-setup`: pass the **context**, with explicit ids

`target` may be a `Page` **or** a `BrowserContext`. Use the context form
whenever the state is going to be saved:

```js
// global-setup.js — durable for every spec, context and browser in the run.
const context = await browser.newContext()
await seedFirstVisitOverlaysSeen(context, 'openconnector')

const page = await context.newPage()
await page.goto('/apps/openconnector/')
await retireFirstRunWizard(page)

await context.storageState({ path: STORAGE_STATE })
```

:::danger `'*'` cannot be persisted — and the helpers now refuse to pretend it can

The match-all form has no concrete key to write, so it works by installing a
`Storage.prototype.getItem` shim. A shim is a live function on one page; it
cannot serialise into `storageState`. Measured on openconnector:

| `appId` | In-page `getItem` | Persisted into `storageState` |
| --- | --- | --- |
| `'openconnector'` | `"1"` | `cn-support-dialog-shown:openconnector=1` |
| `'*'` | `"1"` | **nothing** |

**Both read back `"1"` inside the page.** That is the whole trap: a
`global-setup` that seeds with `'*'` and then saves `storageState` looks
correct during setup and then silently fails for every spec — the
green-but-dead shape this module exists to prevent.

So the combination is refused rather than documented:

- `seedSupportDialogSeen(context, '*')` — and an omitted `appId` — **throws**.
- `seedSupportDialogSeen(page, '*')` still works for a spec that never
  persists, but it poisons that page's `context.storageState()`, so a save
  fails loudly instead of writing a state with nothing in it. (The untouched
  method stays reachable as `context.__cnOriginalStorageState()`.)

If you do not know the app ids, `mountedAppIds(page)` will tell you — including
nested `CnAppRoot`s.
:::

:::warning Nested `CnAppRoot` — a real caveat, found in the field

A nested `CnAppRoot` mounts under a **different `appId`** than the outer shell.
OpenBuild's `/builder/:slug` does exactly this, and any app hosting a "virtual
app" does the same: the nested root passes its own id (typically
`{outerAppId}-{slug}`) down to `useSupportDialog`.

Because the "seen" flag is namespaced per app id, **a support dialog marked
seen for the outer app opens again over the nested one** — on a page the test
believes it already cleared.

The helpers handle this two ways:

1. A bare `appId` also covers every id prefixed with `{appId}-`. So
   `seedSupportDialogSeen(page, 'openbuild')` covers `openbuild-my-app`.
2. When a nested id does not follow that convention, pass an explicit **array**
   of ids: `await seedSupportDialogSeen(page, ['openbuild', 'openbuild:vapp'])`.
   The `'*'` form also covers everything, but only for the lifetime of that page
   — it can never be persisted (see above).

`mountedAppIds(page)` returns the `appId` of every mounted `CnAppRoot` in
document order, if you would rather discover the real nested id once and feed
it in explicitly. That is the durable option, and the one to reach for first.
:::

### Reactive

For specs that navigate into a state after the seeding window has closed, or
that deliberately exercise a first-visit path and then need the page back:

```js
await dismissFirstVisitOverlays(page)
```

- `dismissWalkthrough(page, { timeout })` → `Promise<boolean>`. Waits for
  `.cn-walkthrough__dim` to **detach**, not merely for the card to hide — the
  dimmer is what eats the next click.
- `dismissSupportDialog(page, { timeout, maxDialogs })` → `Promise<number>`.
  Polls rather than checking instantaneously (in `server` persistence the
  dialog's "have I been seen" answer is an async round-trip, so it can appear a
  beat after the caller moved on), and **loops** rather than closing exactly
  one — see the nested-`CnAppRoot` caveat above.
- `dismissFirstVisitOverlays(page, options)` — the tour first, then the dialog.
  Order matters: the tour's dimmer sits above the dialog, so clearing it first
  is what makes the dialog's close button reachable. Returns
  `{ notApplicable, reason, walkthroughDismissed, supportDialogsDismissed }`; on
  a guest surface it short-circuits rather than polling — see
  [Guest surfaces](#guest-surfaces-guestsurfacestatuspage).

## Locating the app's own modal

```js
import { appDialog } from '@conduction/nextcloud-vue/testing/playwright'

await page.getByRole('button', { name: 'Add source' }).click()
await expect(appDialog(page)).toBeVisible()
await appDialog(page).getByRole('textbox', { name: 'Name' }).fill('demo')
```

`appDialog(page, options?)` returns a **`Locator`**, so it composes with
`.getByRole()` chains like any other.

:::warning `getByRole('dialog').first()` can pass against chrome you never opened

At least two other things on a Nextcloud page claim `role="dialog"`:
`#firstrunwizard` and nc-vue's own `CnSupportDialog`. Both are full-viewport
masks that **hide nothing** a visibility assertion inspects, so they break
*clicks* rather than renders — the button underneath stays `toBeVisible()` while
the click is swallowed with "subtree intercepts pointer events".

The trap is what happens next. Because the overlays are themselves dialogs, a
spec that clicks, misses, and then asserts on `getByRole('dialog').first()`
matches **the overlay**, goes green, and reports that a modal it never opened is
showing. A passing test for a broken flow.
:::

Excluded by default (`CHROME_DIALOG_SELECTORS`): `#firstrunwizard`,
`.cn-support-dialog`, `[data-testid-modal="cn-support-dialog"]`, `.oc-dialog`.
Add your own with `appDialog(page, { exclude: ['.my-overlay'] })`, or get the
whole match set with `{ all: true }`.

:::note `.modal-mask` is deliberately **not** excluded

It is `@nextcloud/vue`'s `NcModal` **root** — the element that carries
`role="dialog"` for every `NcModal` and `NcDialog`, including your own.
Excluding it would make this locator match *nothing* in a typical app, which is
the same green-but-dead shape it exists to prevent: the locator resolves to zero
elements and a "not visible" assertion passes against absence.

The chrome that motivates the request is already covered by name —
`#firstrunwizard` carries `modal-mask--opaque`, and the support dialog is matched
by class and by test hook.
:::

## Retiring Nextcloud's first-run wizard

```js
import { retireFirstRunWizard } from '@conduction/nextcloud-vue/testing/playwright'

const { cleared, status } = await retireFirstRunWizard(page)
if (!cleared) {
	console.warn(`[globalSetup] wizard dismissal returned ${status}`)
}
```

`#firstrunwizard` is Nextcloud's own overlay, with the identical failure shape
as the one described above — it hides nothing, so only the *click* is
intercepted.

`retireFirstRunWizard(page)` issues `DELETE /apps/firstrunwizard/wizard`, the
wizard app's own dismissal route, from inside the page (so the session cookie
and CSRF token come along for free). It records the dismissal **server-side
against the user**, so unlike a `localStorage` seed it holds for every spec,
every context and every browser in the run — one call in `global-setup` instead
of a re-dismissal in every `beforeEach`.

| Field | Meaning |
| --- | --- |
| `status` | HTTP status, or `-1` when the request itself threw. |
| `cleared` | `true` when nothing will block clicks — a 2xx, a 404, **or a guest surface**. |
| `installed` | `false` when the firstrunwizard app is not installed (404); `null` when the status could not tell us. |
| `notApplicable` | `true` when the wizard could never have rendered here at all. |
| `reason` | Why, when `notApplicable` — currently `'no-user-session'`. |

A `404` means there is no wizard to retire, which is a success for the caller's
purposes. It is reported, never thrown, so one shared `global-setup` works on
instances with and without the app.

### On a guest surface it says so, instead of inventing an overlay

Unauthenticated, `DELETE /apps/firstrunwizard/wizard` answers **401**. That used
to fall through to the catch-all failure branch and come back as
`{ installed: true, cleared: false }` — *"a blocking overlay remains"*. That was
not merely unhelpful, it was **false**: Nextcloud's first-run wizard is a
per-user overlay and cannot render for a visitor with no session, so a public
portal spec that guarded on `cleared` failed its own setup over an overlay that
does not exist.

The full decision table:

| Condition | Result |
| --- | --- |
| 2xx | `installed: true`, `cleared: true`, `notApplicable: false` |
| 404 | `installed: false`, `cleared: true`, `notApplicable: false` |
| 401, or a Nextcloud page with no user | `installed: null`, `cleared: true`, `notApplicable: true`, `reason: 'no-user-session'` |
| anything else | `installed: true`, `cleared: false`, `notApplicable: false` |

Two choices worth stating outright:

- **`cleared: true` for a guest.** `cleared` documents exactly one thing —
  *"nothing will block clicks"*. On a guest surface nothing will, so `true` is
  the honest answer; `false` would make every caller that guards on it treat a
  perfectly usable page as broken. `notApplicable` is what keeps a guest run
  distinguishable from a real dismissal, so a spec that means to prove the
  wizard was genuinely retired asserts `notApplicable === false` and gets a
  failure if it silently ran logged-out.
- **`installed: null`, not a boolean.** A 401 is answered by Nextcloud's auth
  layer before the wizard app is consulted, so the response carries no
  information about whether it is installed. `true` and `false` would both be
  inventions. `null` is falsy, so an existing `if (installed)` behaves as before.

The 2xx and 404 branches are checked *before* the session, on purpose: if the
server actually accepted the dismissal, that is dispositive.

## Guest surfaces: `guestSurfaceStatus(page)`

```js
import { guestSurfaceStatus } from '@conduction/nextcloud-vue/testing/playwright'

const surface = await guestSurfaceStatus(page)
// { guest, user, isNextcloudPage, appRoots }
```

`CnWalkthrough` and `CnSupportDialog` are both auto-mounted **by `CnAppRoot`**.
A page that mounts no app root has neither overlay — so `seedSupportDialogSeen`,
`seedWalkthroughSeen` and `dismissFirstVisitOverlays` all have nothing to do
there. That is correct behaviour, but doing it *silently* is the wrong shape:
measured on a portaliq public portal page, `dismissFirstVisitOverlays` spent its
full timeout budget twice polling for elements that could not appear, and then
returned the same `undefined` a successful dismissal returned.

The measured guest signature is three facts together, and all three are
required:

| Fact | Why it is needed |
| --- | --- |
| `data-requesttoken` **present** | Proves this *is* a Nextcloud page, so "no user" means logged-out rather than "not a Nextcloud page" (an `about:blank`, a fixture, a page seeded before `goto()`). |
| `data-user` **absent** | The per-user state `useSupportDialog` / `useWalkthrough` read cannot exist. |
| no mounted `CnAppRoot` | Neither overlay was ever instantiated. |

A logged-out page that *does* mount a `CnAppRoot` is **not** reported as a guest
surface — the overlays it mounts are real and still need clearing.

### What each helper does about it

- **`dismissFirstVisitOverlays(page)`** now returns
  `{ notApplicable, reason, walkthroughDismissed, supportDialogsDismissed }`. On
  a guest surface it short-circuits with
  `{ notApplicable: true, reason: 'guest-surface' }` **immediately**, instead of
  burning two timeouts. The return value is additive — callers that ignore it
  are unaffected.
- **The seeding helpers stay unconditional.** They are meant to be called
  *before* `page.goto()` — that is what makes `addInitScript` work — and before
  a navigation there is no document to interrogate, so a guest probe inside them
  would be measuring `about:blank` and would answer wrong every time. They write
  their key regardless; on a guest surface nothing reads it. Call
  `guestSurfaceStatus(page)` **after** the page has loaded when you need to know
  whether any of it mattered.

:::warning Do not "work around" a guest surface locally
If a seed appears not to have taken on a public page, the seed is not broken —
there is no overlay to suppress. Check `guestSurfaceStatus(page).guest` before
reaching for a CSS-hiding hack.
:::

## Reading the component tree

Some assertions are structurally not expressible in DOM selectors. "The nested
app is **not** mounted" looks identical from outside to "the nested app is
mounted but still loading". Only the component tree tells them apart.

```js
const roots = await findMounted(page, 'CnAppRoot')
expect(roots.map((r) => r.props.appId)).toEqual(['openbuild', 'openbuild-my-app'])

const staged = await readComponentProp(page, 'PageDesigner', 'manifest')
```

| Helper | Returns |
| --- | --- |
| `mountedComponents(page)` | Every instance, in tree order: `{ name, depth, props }`. |
| `mountedComponentNames(page)` | Sorted unique component names. |
| `findMounted(page, name)` | All instances of one component. |
| `readComponentProp(page, name, prop)` | One prop, structurally cloned. |
| `mountedAppIds(page)` | The `appId` of every mounted `CnAppRoot`. |

### Why it walks from `__vue_app__`

- Vue 2's `el.__vue__` back-reference **does not exist in Vue 3**. Every probe
  that used it began throwing "not mounted" after the migration — against
  components that were mounted, on screen, and holding exactly the state under
  test. The message was wrong; the probe was stale.
- Vue 3's `el.__vueParentComponent` / `el.__vnode` are only stamped when
  `__DEV__ || __FEATURE_PROD_DEVTOOLS__`. This library's published bundle sets
  `__VUE_PROD_DEVTOOLS__ = false`, so both are absent at run time — measured,
  not assumed.
- `container.__vue_app__` and `container._vnode` are assigned
  **unconditionally** by `createApp().mount()`. They are the only handles that
  survive a production build.

Nextcloud mounts several Vue apps per page (the notifications bell, unified
search, the app root, …), so every container is searched rather than assuming
a single root.

Props are JSON-cloned **per property**, so one un-serialisable prop (a router
instance, an event handler) cannot blank the whole entry. When a component is
not found, the thrown error names every component that *was* found — so a
rename reads as a rename instead of as a phantom "not mounted".

## Which instance is the suite talking to?

```js
import { resolveBaseUrl, absoluteUrl, baseUrlParts } from '@conduction/nextcloud-vue/testing/playwright'

// playwright.config.ts
export default defineConfig({ use: { baseURL: resolveBaseUrl() } })
```

| Helper | Returns |
| --- | --- |
| `resolveBaseUrl(options?)` | The base URL, trailing slashes stripped. **Throws** when unset. |
| `absoluteUrl(pathname, options?)` | `pathname` resolved against it. |
| `baseUrlParts(options?)` | `{ protocol, hostname, port }` for Node's `http.request()`. |
| `BASE_URL_ENV_VARS` | `['PLAYWRIGHT_BASE_URL', 'BASE_URL']`, in precedence order. |

Pass `{ env }` to read a different environment object — useful in a config test.

### Two rules, both learned the hard way

**1. There is no default, ever.** Configs that read
`process.env.NEXTCLOUD_URL || 'http://localhost:8080'`, and specs that
hardcoded `http://localhost:8080` outright, pointed at the **shared dev
container**. Those suites created fixtures in an environment other sessions
were using and reported measurements taken somewhere nobody intended. Two specs
went further and used Node's `http.request()` with a structured `port: 8080` —
which neither reads `use.baseURL` nor looks like a URL to anyone grepping for
"localhost:8080" — firing failed logins, and therefore brute-force lockouts on
`admin`, into somebody else's instance. Failing loudly on an unset variable is
strictly better than defaulting to someone else's Nextcloud.

**2. Both variable names are accepted.** `PLAYWRIGHT_BASE_URL` is what you set
locally; `BASE_URL` is what the shared `ConductionNL/.github` quality workflow
exports. An earlier app-local revision read `PLAYWRIGHT_BASE_URL` only, and
openconnector's "E2E Tests (Playwright)" job hard-failed on **every** CI run
with `Error: PLAYWRIGHT_BASE_URL is not set` — locally correct, dead everywhere
it mattered (openconnector#1115). Strict about never inventing a target;
permissive about which variable names it.

### Why this lives here after all

An earlier version of this page said the opposite — that "which host a suite
points at is app-level configuration, not something the component library can
or should know". That was the right instinct applied to the wrong noun. The
library still never knows the host: `resolveBaseUrl()` refuses to invent one.
What is shared is the **contract** — which variables name it, and the refusal
to default — and that contract is what three apps re-derived and two got wrong
in opposite directions.

### It throws when called, not when imported

The app-local originals ran the check at module scope. That is fine in a file
only e2e specs import; it is wrong for a shared module, where it would make
`require('@conduction/nextcloud-vue/testing/playwright')` fatal in every
process with no e2e environment — a unit-test run, a lint pass, a docs build
that only wanted `appDialog`.
