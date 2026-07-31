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

- `seedSupportDialogSeen(page, appId?)` — marks `CnSupportDialog` seen.
  `useSupportDialog` treats a positively set local flag as authoritative even
  in `persistence: 'server'` mode (it short-circuits before the preferences
  `GET`), so one seed covers both backends.
- `seedWalkthroughSeen(page, appId?, version?)` — records a last-seen version
  far above any real app version. A *low* seed would suppress the
  `first-visit` tour and then immediately trip the `version-bump` one.
- `seedFirstVisitOverlaysSeen(page, appId?)` — both at once.

**Call these before `page.goto()`.** `addInitScript` only applies to
navigations that start after it is registered. (A best-effort write is also
applied to the already-open document, so a mid-test call is not silently
useless.)

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
2. When a nested id does not follow that convention, pass `'*'` (or an explicit
   array) to cover every app on the page:
   `await seedSupportDialogSeen(page, '*')`.

`mountedAppIds(page)` returns the `appId` of every mounted `CnAppRoot` in
document order, if you would rather discover the real nested id once and feed
it in explicitly.
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
  is what makes the dialog's close button reachable.

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

## Not included: `baseUrl`

Deliberately. Which host a suite points at is app-level configuration, not
something the component library can or should know.
