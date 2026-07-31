/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/testing/playwright` — end-to-end helpers for the
 * behaviour this library IMPOSES on its consumers.
 *
 * WHY THIS LIVES IN nc-vue (not in each app)
 * ------------------------------------------
 * Every helper below exists *only because of* something nc-vue does. None of
 * them is app knowledge:
 *
 *  - `CnWalkthrough` and `CnSupportDialog` are nc-vue components, auto-mounted
 *    by nc-vue's `CnAppRoot` from the manifest. Both render a full-viewport
 *    layer that intercepts pointer events, and the walkthrough's step tracking
 *    can keep the network busy so `waitForLoadState('networkidle')` never
 *    settles. Any spec in any consuming app that clicks something after
 *    navigating has to clear them first.
 *  - the component-tree accessor exists because nc-vue's published bundle sets
 *    `__VUE_PROD_DEVTOOLS__ = false`, which means `__vnode` and
 *    `__vueParentComponent` are never stamped onto elements. Consumers are
 *    forced to walk from `container.__vue_app__` instead. nc-vue creates that
 *    constraint, so nc-vue should ship the workaround.
 *  - `appDialog()` exists because `CnSupportDialog` is itself a
 *    `[role="dialog"]`, so the obvious `getByRole('dialog').first()` can match
 *    nc-vue's overlay after a click that never landed and report a modal the
 *    spec never opened as showing — a PASSING test for a broken flow.
 *
 * The one exception is `retireFirstRunWizard()`, which is Nextcloud's overlay
 * rather than nc-vue's. It ships here because it has the identical failure
 * shape, every consuming app is a Nextcloud app, and nothing else in the fleet
 * owns a shared e2e layer — leaving it out meant 13 apps re-solving it, which
 * is exactly the duplication this module was created to end.
 *
 * The duplication this replaces was real and measurable: openconnector had
 * reimplemented overlay dismissal THREE separate times inside one repository
 * (`docs-screenshots.dismissOverlays`, `visual/_visual-helpers` — with its own
 * CSS-hiding variant — and a `localStorage` seed in `global-setup`), openbuild
 * had a fourth copy in `tests/e2e/support/overlays.ts` plus its own
 * `componentTree.ts` / `stagedManifest.ts`, and launchpad needed the same
 * behaviour again.
 *
 * NO DEPENDENCY ON @playwright/test
 * ---------------------------------
 * Every function takes `page` as a plain argument and calls only the public
 * `Page` surface (`locator`, `evaluate`, `addInitScript`). Nothing is imported.
 * That is deliberate, and it is the reason there is no peer dependency:
 *
 *  - a peer dep on `@playwright/test` would be a hard install cost for the
 *    many consumers of this library that never open a browser;
 *  - a version-pinned peer would fight the app's own Playwright pin — the
 *    fleet is not on one version;
 *  - duck-typing `page` means the same helpers work from a Playwright fixture,
 *    from a bare `playwright-core` script, and from an MCP-driven session.
 *
 * The trade-off is that a typo in a locator surfaces at run time rather than
 * at type-check time. Given the helpers are ~5 selectors total and are covered
 * by unit tests in `tests/testing/playwright.spec.js`, that is the cheaper
 * side of the trade.
 *
 * This file is deliberately CommonJS. Playwright does not transpile files
 * inside `node_modules`, so an ESM-syntax `.js` in a package without
 * `"type": "module"` would fail to load in exactly the runner it targets.
 *
 * IMPORT SPELLING (verified against a packed install, not the source tree):
 * this package ships no `exports` map, and Node's NATIVE ESM resolver does no
 * extension-adding resolution. Playwright's own loader, webpack and vite all
 * resolve the extensionless subpath; a plain `node --input-type=module` script
 * needs the extension:
 *
 * ```js
 * // Playwright spec (TS or JS), webpack, vite:
 * import { dismissFirstVisitOverlays } from '@conduction/nextcloud-vue/testing/playwright'
 * // Plain CommonJS:
 * const { dismissFirstVisitOverlays } = require('@conduction/nextcloud-vue/testing/playwright')
 * // Native Node ESM:
 * import { dismissFirstVisitOverlays } from '@conduction/nextcloud-vue/testing/playwright.js'
 * ```
 *
 * @module testing/playwright
 */

/**
 * localStorage key prefix `useSupportDialog` writes its per-app "seen" flag
 * under. Mirrors `src/composables/useSupportDialog.js` — kept in sync by
 * `tests/testing/playwright.spec.js`, which asserts the two agree.
 *
 * @type {string}
 */
const SUPPORT_DIALOG_STORAGE_PREFIX = 'cn-support-dialog-shown:'

/**
 * localStorage key prefix `useWalkthrough` mirrors the last-seen app version
 * under. Mirrors `WALKTHROUGH_SEEN_STORAGE_PREFIX` in
 * `src/composables/useWalkthrough.js`.
 *
 * @type {string}
 */
const WALKTHROUGH_STORAGE_PREFIX = 'cn-walkthrough-seen:'

/**
 * The version written by {@link seedWalkthroughSeen} when the caller does not
 * name one.
 *
 * It has to be higher than any real app version: `useWalkthrough` re-opens a
 * `version-bump` tour whenever `appVersion > seenVersion`, so seeding "1.0.0"
 * would suppress the first-visit tour and then immediately trip the
 * version-bump one on any app past 1.0.0.
 *
 * @type {string}
 */
const FUTURE_VERSION = '999.0.0'

/**
 * Root element of an open `CnWalkthrough` coachmark card.
 *
 * @type {string}
 */
const WALKTHROUGH_CARD = '.cn-walkthrough__card'

/**
 * The walkthrough's dimming layer — this is the element that actually eats
 * clicks, so waiting for it to detach is what proves the page is usable again.
 *
 * @type {string}
 */
const WALKTHROUGH_DIM = '.cn-walkthrough__dim'

/**
 * Close button inside the coachmark card.
 *
 * @type {string}
 */
const WALKTHROUGH_CLOSE = '.cn-walkthrough__close'

/**
 * `CnSupportDialog`'s stable hook. `CnSupportDialog.vue` stamps
 * `data-testid-modal="cn-support-dialog"` on its `NcDialog`, which is far more
 * durable than matching the close button by its (translated) accessible name.
 *
 * @type {string}
 */
const SUPPORT_DIALOG = '[data-testid-modal="cn-support-dialog"]'

/**
 * Attribute `CnAppRoot` stamps with its own `appId`
 * (`:data-nldesign-theme-scope="appId"`). It is the only place a mounted app
 * root publishes its id to the DOM, which makes it the mechanism
 * {@link mountedAppIds} uses to find NESTED roots.
 *
 * @type {string}
 */
const APP_ROOT_ID_ATTR = 'data-nldesign-theme-scope'

/**
 * Nextcloud's own first-run wizard dismissal route.
 *
 * @type {string}
 */
const FIRST_RUN_WIZARD_ROUTE = '/index.php/apps/firstrunwizard/wizard'

/**
 * `reason` returned by {@link retireFirstRunWizard} when the page has no user
 * session, so Nextcloud's wizard could not render there whatever the server
 * said.
 *
 * @type {string}
 */
const NO_USER_SESSION = 'no-user-session'

/**
 * `reason` returned by {@link dismissFirstVisitOverlays} when the page is a
 * Nextcloud GUEST surface: it is a Nextcloud page (it carries a request token)
 * but has no user session and mounts no `CnAppRoot`, so none of the overlays
 * these helpers clear can exist on it.
 *
 * @type {string}
 */
const GUEST_SURFACE = 'guest-surface'

/**
 * Read the page's Nextcloud session, IN THE BROWSER.
 *
 * A module-level arrow with no closure references, so Playwright can serialise
 * it into `page.evaluate` — and so {@link retireFirstRunWizard} and
 * {@link guestSurfaceStatus} cannot drift apart on what "logged in" means.
 *
 * Three sources, in descending order of authority:
 *
 *  1. `OC.getCurrentUser()` — the documented accessor, present on any page that
 *     loaded `core/js/dist/main`;
 *  2. `OC.currentUser` — the older global some pages still expose;
 *  3. the `data-user` attribute Nextcloud stamps on `<head>` — the only one of
 *     the three that survives on a stripped-down public template.
 *
 * `isNextcloudPage` is derived from the request TOKEN, not the user, and that
 * separation is the point. Measured on a portaliq guest portal page: it emits
 * `data-requesttoken` and NO `data-user`. Token-without-user is therefore
 * positive evidence of a guest surface, whereas "neither present" just means
 * this is not a Nextcloud page at all (an `about:blank`, a fixture, a page
 * seeded before `goto()`) and nothing may be concluded from it.
 *
 * @return {{user: (string|null), isNextcloudPage: boolean}} Session facts.
 */
const readSurfaceSession = () => {
	const oc = globalThis.OC || {}
	const head = (globalThis.document && globalThis.document.head) || null
	const attr = (name) => (head && typeof head.getAttribute === 'function' ? head.getAttribute(name) : null)

	let user = null
	try {
		if (typeof oc.getCurrentUser === 'function') {
			const current = oc.getCurrentUser()
			user = (current && current.uid) || null
		}
	} catch (e) {
		/* a partially-initialised OC can throw; absence is the answer we want */
	}
	if (!user && typeof oc.currentUser === 'string' && oc.currentUser !== '') {
		user = oc.currentUser
	}
	if (!user) {
		user = attr('data-user') || null
	}

	const token = (typeof oc.requestToken === 'string' && oc.requestToken !== '')
		? oc.requestToken
		: attr('data-requesttoken')

	return { user: user || null, isNextcloudPage: Boolean(token) }
}

/**
 * Selectors for `[role="dialog"]` elements that are NOT the application's own
 * modal — see {@link appDialog}.
 *
 * WHAT IS DELIBERATELY ABSENT: `.modal-mask`.
 *
 * A consumer asked for it, and shipping it would have broken every app in the
 * fleet. `@nextcloud/vue` v9's `NcModal` renders its ROOT element as
 * `<div class="modal-mask" role="dialog" aria-modal="true">` (verified in
 * `@nextcloud/vue/dist/chunks/NcModal-*.mjs`), and `NcDialog` is built on
 * `NcModal`. So `.modal-mask` is not a chrome wrapper sitting on top of app
 * dialogs — it IS the app's dialog, for every `NcModal`/`NcDialog` in every
 * Conduction app. `[role="dialog"]:not(.modal-mask)` would therefore match
 * NOTHING in a typical app, which is the same green-but-dead shape this helper
 * exists to prevent: the locator resolves to zero elements, and an
 * `expect(...).toBeHidden()` style assertion passes against absence.
 *
 * The chrome that motivated the request is already covered by name:
 * `#firstrunwizard` (which carries `modal-mask--opaque`) and the nc-vue support
 * dialog. An app that has a genuine reason to exclude `.modal-mask` — or any
 * other overlay — can pass it via `options.exclude`.
 *
 * @type {string[]}
 */
const CHROME_DIALOG_SELECTORS = [
	// Nextcloud's own welcome overlay.
	'#firstrunwizard',
	// nc-vue's support prompt, both the class and the stable test hook.
	'.cn-support-dialog',
	SUPPORT_DIALOG,
	// Nextcloud's legacy jQuery dialog (`OC.dialogs.*`), still used by core for
	// file pickers and confirmations.
	'.oc-dialog',
]

/**
 * Normalise the `appId` argument shared by the seeding helpers.
 *
 * @param {string|string[]|undefined} appId One id, several, `'*'`, or nothing.
 * @return {{ ids: string[], matchAll: boolean }} Normalised selector.
 */
function normaliseAppIds(appId) {
	if (appId === undefined || appId === null || appId === '*') {
		return { ids: [], matchAll: true }
	}
	const ids = (Array.isArray(appId) ? appId : [appId]).filter(Boolean).map(String)
	return { ids, matchAll: ids.includes('*') }
}

/**
 * Is this a Playwright `BrowserContext` rather than a `Page`?
 *
 * Both expose `addInitScript`, which is why the seeding helpers can accept
 * either. `newPage` + `pages` is what only a context has; `goto` is what only a
 * page has. Duck-typed, like everything else in this module, so the same check
 * works for `playwright-core` and for a fixture stand-in.
 *
 * @param {object} target Page or BrowserContext.
 * @return {boolean} True for a BrowserContext.
 */
function isBrowserContext(target) {
	return !!target
		&& typeof target.newPage === 'function'
		&& typeof target.pages === 'function'
		&& typeof target.goto !== 'function'
}

/**
 * The explanation attached to every refusal of `'*'` in a persisting scope.
 *
 * @param {string} scope Human name of the call that was refused.
 * @return {string} Error message.
 */
function matchAllRefusal(scope) {
	return `${scope}: '*' (or an omitted appId) cannot be persisted.\n`
		+ 'The match-all form works by installing a `Storage.prototype.getItem` shim, and a\n'
		+ 'shim is a live function on one page — it writes no concrete keys, so it cannot\n'
		+ 'serialise into `context.storageState()`. Measured: with \'*\' the in-page\n'
		+ '`getItem` reads back "1" while the saved storageState contains NO key at all,\n'
		+ 'so a global-setup looks correct and then silently fails for every spec.\n'
		+ 'Pass the explicit app id(s) instead — e.g. seedFirstVisitOverlaysSeen(context,\n'
		+ "'openconnector') — which takes the write-through branch and rides in\n"
		+ 'storageState. `mountedAppIds(page)` will tell you the ids in play, including\n'
		+ 'nested CnAppRoots.'
}

/**
 * Runs inside the browser. Kept as a single self-contained function so it can
 * be handed to `addInitScript` (future navigations) and to `evaluate` (a
 * document that is already open) without the two drifting apart.
 *
 * Returns the number of CONCRETE keys it managed to write, which is what the
 * context-scoped path uses to tell a real seed from a no-op.
 *
 * @param {object} args The serialised `{ prefix, ids, matchAll, value }`.
 * @return {number} Concrete keys written to the backing store.
 */
const applySeed = (args) => {
	const store = globalThis.__cnSeenSeeds || (globalThis.__cnSeenSeeds = [])
	store.push(args)

	if (!globalThis.__cnSeenShimInstalled) {
		globalThis.__cnSeenShimInstalled = true
		const proto = globalThis.Storage && globalThis.Storage.prototype
		if (proto) {
			const original = proto.getItem
			proto.getItem = function getItem(key) {
				const seeds = globalThis.__cnSeenSeeds || []
				for (const seed of seeds) {
					if (typeof key !== 'string' || key.indexOf(seed.prefix) !== 0) {
						continue
					}
					const id = key.slice(seed.prefix.length)
					const covered = seed.matchAll
						|| seed.ids.some((known) => id === known || id.indexOf(known + '-') === 0)
					if (covered) {
						return seed.value
					}
				}
				return original.call(this, key)
			}
		}
	}

	// Write the concrete keys THROUGH to the backing store. This is the only
	// part that survives into `storageState`, and it is why an explicit app id
	// is durable while `'*'` is not: there is no such thing as a concrete key
	// for "every app".
	let written = 0
	if (!args.matchAll) {
		for (const id of args.ids) {
			try {
				globalThis.localStorage.setItem(args.prefix + id, args.value)
				written++
			} catch (e) {
				/* private mode / quota / opaque origin — the shim still covers reads */
			}
		}
	}
	return written
}

/**
 * Make `context.storageState()` throw for the rest of the run, because a
 * match-all seed was installed on one of its pages and CANNOT be in there.
 *
 * This is the part that makes the footgun unreachable rather than merely
 * documented. `seedSupportDialogSeen(page, '*')` reads back `"1"` from inside
 * the page, so the setup step that saves the state has no way to notice it
 * saved nothing — the failure only shows up later, in every spec, as an overlay
 * that "should have been seeded". Poisoning `storageState` moves the failure to
 * the exact line that is wrong.
 *
 * The original method is preserved as `__cnOriginalStorageState` for the rare
 * caller that knows what it is doing.
 *
 * @param {object} page Playwright `Page` (duck-typed).
 * @param {string} scope Human name of the seeding call, for the message.
 * @return {void}
 */
function poisonStorageState(page, scope) {
	if (!page || typeof page.context !== 'function') {
		return
	}
	let context
	try {
		context = page.context()
	} catch (e) {
		return
	}
	if (!context || typeof context.storageState !== 'function' || context.__cnStorageStatePoisoned) {
		return
	}
	const original = context.storageState.bind(context)
	context.__cnStorageStatePoisoned = true
	context.__cnOriginalStorageState = original
	context.storageState = async () => {
		throw new Error(matchAllRefusal(scope)
			+ '\n\nThis context therefore refuses to save a storageState that would be a\n'
			+ 'silent no-op. Re-seed with explicit ids, or call\n'
			+ '`context.__cnOriginalStorageState()` if you really do want the state without\n'
			+ 'the seed in it.')
	}
}

/**
 * Install the seed on a `Page` or on a `BrowserContext`.
 *
 * PAGE scope covers the current document plus every later navigation of that
 * one page. CONTEXT scope covers every page the context already has and every
 * page it will open — and it is the scope to use when the state is going to be
 * saved with `context.storageState()`, because it REFUSES the match-all form
 * that cannot be saved.
 *
 * @param {object} target Playwright `Page` or `BrowserContext` (duck-typed).
 * @param {string} prefix Storage key prefix.
 * @param {string[]} ids Exact app ids to cover (also covers `id + '-*'`).
 * @param {boolean} matchAll Cover every app id under the prefix.
 * @param {string} value Value the seeded key reads back as.
 * @param {string} scope Human name of the calling helper, for error messages.
 * @return {Promise<void>}
 * @throws {Error} When a BrowserContext is seeded with `'*'`.
 */
async function installSeenShim(target, prefix, ids, matchAll, value, scope) {
	const payload = { prefix, ids, matchAll, value }

	if (isBrowserContext(target)) {
		if (matchAll) {
			// Refused by construction: a context-scoped seed exists to be saved,
			// and this form cannot be. Throwing here is the whole point — the
			// alternative is the measured failure in the message.
			throw new Error(matchAllRefusal(scope))
		}
		// Covers pages opened later, and later navigations of pages already open.
		await target.addInitScript(applySeed, payload)
		// …and the documents that are already loaded, so a context seeded after
		// the first `goto()` still lands in `storageState()`.
		for (const page of target.pages()) {
			await page.evaluate(applySeed, payload).catch(() => 0)
		}
		return
	}

	await target.addInitScript(applySeed, payload)
	// Best-effort for a page that is already open: `addInitScript` only affects
	// subsequent navigations, and callers do sometimes seed mid-test.
	await target.evaluate(applySeed, payload).catch(() => 0)

	if (matchAll) {
		poisonStorageState(target, scope)
	}
}

/**
 * Pre-emptively mark `CnSupportDialog` as already seen, so it never opens.
 *
 * This is the cheap form and the one to prefer: dismissing the dialog costs a
 * visibility poll plus a click in EVERY test, while seeding costs one
 * `addInitScript` for the whole file. `useSupportDialog` treats a positively
 * set local flag as authoritative even in `persistence: 'server'` mode (it
 * short-circuits before the preferences `GET`), so the seed works for both
 * backends.
 *
 * Call it BEFORE `page.goto()` — `addInitScript` only applies to navigations
 * that start after it is registered. A best-effort write is also applied to
 * the current document so a mid-test call is not silently useless.
 *
 * NESTED `CnAppRoot` CAVEAT — found in the field, handle it or the dialog
 * comes back:
 * a nested `CnAppRoot` (OpenBuild's `/builder/:slug` mounts one, and any app
 * hosting a "virtual app" does the same) passes its OWN `appId` — typically
 * `{outerAppId}-{slug}` — down to `useSupportDialog`. Because the flag is
 * namespaced per app id, a dialog marked seen for the outer shell opens again
 * over the nested one, on top of a page the test thinks it already cleared.
 * So a bare id here also covers every id prefixed with `{appId}-`. When a
 * nested id does not follow that convention, pass `'*'` (or the explicit list)
 * to cover every app on the page.
 *
 * `'*'` AND `storageState` DO NOT MIX — and the helper now enforces that.
 * The match-all form has no concrete keys to write, so it works by shimming
 * `Storage.prototype.getItem`. A shim is a live function on one page; it cannot
 * serialise. Measured on openconnector:
 *
 * ```
 * explicit 'openconnector'  in-page getItem: "1"  persisted: cn-support-dialog-shown:openconnector=1
 * matchAll  '*'             in-page getItem: "1"  persisted: NONE
 * ```
 *
 * Both read back `"1"` inside the page, which is why a `global-setup` that
 * saves `storageState` looked correct and then failed for every spec. So:
 *
 *  - passing a `BrowserContext` with `'*'` THROWS immediately, and
 *  - passing a `Page` with `'*'` poisons that page's `context.storageState()`,
 *    so the save fails loudly instead of writing a state with nothing in it.
 *
 * Use the BrowserContext form with explicit ids whenever the state is going to
 * be saved — see {@link seedFirstVisitOverlaysSeen}.
 *
 * INERT ON A GUEST SURFACE — READ THIS BEFORE DEBUGGING A SEED THAT "DID
 * NOTHING". `CnSupportDialog` is auto-mounted by `CnAppRoot`, and a page with
 * no user session does not mount one. Measured on a portaliq public portal
 * page: `data-requesttoken` present, `data-user` absent, no `CnAppRoot` in the
 * DOM. The seed still writes its key and still reads back `"1"` — it simply has
 * no reader, because `useSupportDialog` never runs there.
 *
 * That is the RIGHT behaviour (there is no dialog to suppress) and the seed is
 * deliberately left unconditional: it is normally called BEFORE `page.goto()`,
 * where there is no document yet to interrogate, so a "is this a guest surface"
 * probe here would be measuring `about:blank` and would answer wrong every
 * time. Call {@link guestSurfaceStatus} AFTER the page has loaded when you need
 * the answer, and {@link dismissFirstVisitOverlays} reports it for you.
 *
 * @param {object} target Playwright `Page` or `BrowserContext`.
 * @param {string|string[]} [appId] App id(s). `'*'`/omitted covers all, but is
 *   page-scoped only and can never be persisted.
 * @return {Promise<void>}
 * @throws {Error} When a `BrowserContext` is seeded with `'*'` or no appId.
 *
 * @example
 * test.beforeEach(async ({ page }) => {
 *   await seedSupportDialogSeen(page, 'openbuild') // also covers openbuild-<slug>
 *   await page.goto('/apps/openbuild/')
 * })
 */
async function seedSupportDialogSeen(target, appId) {
	const { ids, matchAll } = normaliseAppIds(appId)
	await installSeenShim(target, SUPPORT_DIALOG_STORAGE_PREFIX, ids, matchAll, '1', 'seedSupportDialogSeen')
}

/**
 * Pre-emptively mark the `CnWalkthrough` tour as already seen.
 *
 * Seeds the localStorage mirror `useWalkthrough` reads synchronously, with a
 * version far above any real app version so neither the `first-visit` nor the
 * `version-bump` trigger fires. When the app also serves the per-user
 * `completionConfigKey` preference, a truthy server value wins — but a server
 * that answers `{"value": null}` (never written) falls back to this mirror,
 * which is the common case.
 *
 * Same nested-`CnAppRoot` coverage rule, the same `'*'`/`storageState` refusal,
 * and the same GUEST-SURFACE caveat — the tour is mounted by `CnAppRoot`, so on
 * a page with no user session and no app root this seed writes a key nothing
 * ever reads. See {@link seedSupportDialogSeen} for all three, and
 * {@link guestSurfaceStatus} for the probe that tells you which surface you are
 * on.
 *
 * @param {object} target Playwright `Page` or `BrowserContext`.
 * @param {string|string[]} [appId] App id(s); `'*'`/omitted covers all, and is
 *   page-scoped only.
 * @param {string} [version] Version to record as seen.
 * @return {Promise<void>}
 * @throws {Error} When a `BrowserContext` is seeded with `'*'` or no appId.
 */
async function seedWalkthroughSeen(target, appId, version = FUTURE_VERSION) {
	const { ids, matchAll } = normaliseAppIds(appId)
	await installSeenShim(target, WALKTHROUGH_STORAGE_PREFIX, ids, matchAll, String(version), 'seedWalkthroughSeen')
}

/**
 * Seed both first-visit overlays in one call — the pre-emptive counterpart of
 * {@link dismissFirstVisitOverlays}.
 *
 * PREFER THE `BrowserContext` FORM IN A `global-setup`. A context-scoped seed
 * covers every page the context already has AND every page it opens later, and
 * it refuses the `'*'` form outright — which is the form that reads back
 * correctly inside the page and then persists nothing.
 *
 * Both seeds are INERT on a guest surface, for the reason spelled out on
 * {@link seedSupportDialogSeen}: nc-vue mounts neither overlay without a
 * `CnAppRoot`, and a logged-out page has none. Harmless, and worth knowing
 * before you spend an afternoon on a seed that "did not take" —
 * {@link guestSurfaceStatus} answers it in one call.
 *
 * @param {object} target Playwright `Page` or `BrowserContext`.
 * @param {string|string[]} [appId] App id(s). Required (and explicit) when
 *   `target` is a `BrowserContext`.
 * @return {Promise<void>}
 * @throws {Error} When a `BrowserContext` is seeded with `'*'` or no appId.
 *
 * @example
 * // global-setup.js — durable for every spec, context and browser in the run.
 * const context = await browser.newContext()
 * await seedFirstVisitOverlaysSeen(context, 'openconnector')
 * const page = await context.newPage()
 * await page.goto('/apps/openconnector/')
 * await retireFirstRunWizard(page)
 * await context.storageState({ path: STORAGE_STATE })
 */
async function seedFirstVisitOverlaysSeen(target, appId) {
	await seedSupportDialogSeen(target, appId)
	await seedWalkthroughSeen(target, appId)
}

/**
 * Dismiss the first-visit `CnWalkthrough` tour if it is open.
 *
 * `.cn-walkthrough__dim` covers the viewport and intercepts pointer events, so
 * the helper does not return until that layer is gone — asserting the card is
 * hidden is not enough, the DIMMER is what eats the next click.
 *
 * Prefer {@link seedWalkthroughSeen} where you can; this is for specs that
 * navigate into a state after the seed window has closed, or that deliberately
 * exercise a first-visit path and then need the page back.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} [options] `{ timeout }` in ms (default 3000).
 * @return {Promise<boolean>} True when a tour was actually dismissed.
 */
async function dismissWalkthrough(page, options = {}) {
	const timeout = options.timeout || 3000
	const card = page.locator(WALKTHROUGH_CARD).first()
	const open = await card.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)
	if (!open) {
		return false
	}
	await page.locator(WALKTHROUGH_CLOSE).first().click().catch(() => {})
	await page.locator(WALKTHROUGH_DIM).first()
		.waitFor({ state: 'detached', timeout })
		.catch(() => {})
	return true
}

/**
 * Dismiss the first-visit `CnSupportDialog` if it is open.
 *
 * Two things make the naive `isVisible()` check wrong:
 *
 *  1. In `persistence: 'server'` mode the dialog's "have I been seen" answer
 *     is an async round-trip, so it can appear a beat AFTER the caller has
 *     already moved on. An instantaneous check races it and misses; this polls.
 *  2. A NESTED `CnAppRoot` runs its own `useSupportDialog` under a different
 *     app id, so closing the outer app's dialog can be immediately followed by
 *     the nested app's. The helper therefore loops until no dialog is left
 *     (bounded by `maxDialogs`) instead of closing exactly one.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} [options] `{ timeout, maxDialogs }`.
 * @return {Promise<number>} How many dialogs were dismissed.
 */
async function dismissSupportDialog(page, options = {}) {
	const timeout = options.timeout || 3000
	const maxDialogs = options.maxDialogs || 3
	let dismissed = 0

	for (let i = 0; i < maxDialogs; i++) {
		const dialog = page.locator(SUPPORT_DIALOG).first()
		const open = await dialog
			// Only the first pass waits the full budget; later passes just check
			// whether a nested root queued another dialog behind the first.
			.waitFor({ state: 'visible', timeout: i === 0 ? timeout : 750 })
			.then(() => true)
			.catch(() => false)
		if (!open) {
			break
		}

		const clicked = await dialog.getByRole('button', { name: /close/i }).first()
			.click({ timeout })
			.then(() => true)
			.catch(() => false)

		if (clicked) {
			dismissed++
			// Deliberately NOT gated on the locator detaching. When a nested
			// CnAppRoot raises its own dialog, the replacement matches the SAME
			// selector, so "still visible" is indistinguishable from "never
			// closed" at this point — treating it as failure reported zero
			// dismissals for a pass that had in fact closed one. The loop bound
			// is what keeps this terminating; the next iteration's visibility
			// check is what decides whether there is more work.
			await dialog.waitFor({ state: 'detached', timeout: 750 }).catch(() => {})
			continue
		}

		// The dialog is up but its close control could not be reached (a higher
		// overlay, or a renamed accessible name). Escape is NcDialog's other
		// documented exit; if that does not clear it either, stop rather than
		// spin out the caller's budget.
		await page.keyboard.press('Escape').catch(() => {})
		await dialog.waitFor({ state: 'detached', timeout: 750 }).catch(() => {})
		if (await dialog.isVisible().catch(() => false)) {
			break
		}
		dismissed++
	}

	return dismissed
}

/**
 * Clear every nc-vue first-visit overlay that can swallow a click.
 *
 * Order matters: the walkthrough's dimmer sits above the support dialog, so
 * the tour goes first or the dialog's close button is unreachable.
 *
 * REPORTS "NOT APPLICABLE" ON A GUEST SURFACE INSTEAD OF SILENTLY DOING
 * NOTHING. `CnWalkthrough` and `CnSupportDialog` are both auto-mounted BY
 * `CnAppRoot`, so on a page that mounts no app root neither overlay exists and
 * this helper has nothing to clear. That is correct behaviour and the wrong
 * SHAPE: measured on a portaliq public portal page (request token present,
 * `data-user` absent, no `CnAppRoot`), the call spent its full timeout budget
 * twice over polling for elements that could not appear, and then returned the
 * same `undefined` a successful dismissal returns. The consuming spec had no
 * way to tell "cleared two overlays" from "there was nothing here" — so the
 * next consumer gets to guess, or works around it locally.
 *
 * Now it returns a result. On a guest surface it short-circuits
 * ({@link guestSurfaceStatus} decides), returning
 * `{ notApplicable: true, reason: 'guest-surface' }` immediately instead of
 * burning two timeouts. Everywhere else it reports what it actually did.
 *
 * The return value is additive: callers that ignore it are unaffected.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} [options] Forwarded to both helpers.
 * @return {Promise<{notApplicable: boolean, reason: (string|null),
 *   walkthroughDismissed: boolean, supportDialogsDismissed: number}>} What was
 *   cleared, or why nothing could be.
 *
 * @example
 * const cleared = await dismissFirstVisitOverlays(page)
 * if (cleared.notApplicable) {
 *   // guest surface: nc-vue mounts no overlays here, nothing was skipped
 * }
 */
async function dismissFirstVisitOverlays(page, options = {}) {
	const surface = await guestSurfaceStatus(page)
	if (surface.guest) {
		return {
			notApplicable: true,
			reason: GUEST_SURFACE,
			walkthroughDismissed: false,
			supportDialogsDismissed: 0,
		}
	}

	const walkthroughDismissed = await dismissWalkthrough(page, options)
	const supportDialogsDismissed = await dismissSupportDialog(page, options)

	return {
		notApplicable: false,
		reason: null,
		walkthroughDismissed,
		supportDialogsDismissed,
	}
}

/**
 * A `Locator` for the application's OWN modal — never the chrome on top of it.
 *
 * `page.getByRole('dialog').first()` is the obvious way to grab a modal and the
 * wrong one. On a Nextcloud page at least two other things claim
 * `role="dialog"`: `#firstrunwizard`, Nextcloud's welcome overlay, and
 * `CnSupportDialog`, nc-vue's support prompt. Both are full-viewport masks that
 * HIDE nothing a visibility assertion inspects, so they break clicks rather
 * than renders — the button under them stays `toBeVisible()` while the click is
 * swallowed with "subtree intercepts pointer events".
 *
 * The trap is what happens next. Because the overlays are themselves dialogs, a
 * spec that clicks, misses, and then asserts on `getByRole('dialog').first()`
 * matches the OVERLAY, goes green, and reports that a modal it never opened is
 * showing. That is a passing test for a broken flow, and it is why this belongs
 * in the shared layer rather than in one app's `support/` folder: nc-vue is what
 * puts `CnSupportDialog` on the page, so nc-vue owns the workaround.
 *
 * Returns a `Locator`, so it composes:
 * `appDialog(page).getByRole('button', { name: 'Save' })`.
 *
 * ON `.modal-mask`: it is NOT excluded by default, on purpose. It is
 * `@nextcloud/vue`'s `NcModal` ROOT — the element that carries `role="dialog"`
 * for every `NcModal` and `NcDialog`, including the app's own. Excluding it
 * would make this locator match nothing at all. Pass it in `options.exclude` if
 * a specific app really needs it.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} [options] `{ exclude, all }`.
 * @param {string[]} [options.exclude] Extra selectors to treat as chrome, added
 *   to {@link CHROME_DIALOG_SELECTORS}.
 * @param {boolean} [options.all] Return the full match set instead of `.first()`.
 * @return {object} Playwright `Locator`.
 *
 * @example
 * await page.getByRole('button', { name: 'Add source' }).click()
 * await expect(appDialog(page)).toBeVisible()
 * await appDialog(page).getByRole('textbox', { name: 'Name' }).fill('demo')
 */
function appDialog(page, options = {}) {
	const exclude = CHROME_DIALOG_SELECTORS.concat(options.exclude || [])
	// Self-exclusion, not descendant-exclusion: `filter({ hasNot })` asks about
	// a dialog's CHILDREN, whereas the overlays being ruled out ARE the matched
	// element. A `:not()` chain is the honest way to say it.
	const notChrome = exclude.map((selector) => `:not(${selector})`).join('')
	const located = page.locator(`[role="dialog"]${notChrome}`)
	return options.all ? located : located.first()
}

/**
 * Retire Nextcloud's own first-run wizard for the logged-in user, SERVER-SIDE.
 *
 * The wizard mounts as `#firstrunwizard`, a `[role="dialog"]` carrying
 * `modal-mask--opaque`, and it is the other full-viewport overlay a fresh
 * instance puts in front of an app — the `CnSupportDialog` seed says nothing
 * about it. Its failure mode is the nasty one described on {@link appDialog}:
 * it hides nothing, so `toBeVisible()` keeps passing and only the CLICK is
 * intercepted.
 *
 * `DELETE /apps/firstrunwizard/wizard` is the wizard app's own dismissal route
 * and records the result against the user, so unlike a `localStorage` seed it
 * holds for every spec, every context and every browser in the run — one call
 * in `global-setup` instead of a re-dismissal in every `beforeEach`. Issued
 * from inside the page so the session cookie and the CSRF token come along for
 * free.
 *
 * GRACEFUL WHEN THE APP IS NOT INSTALLED: a `404` means there is no wizard to
 * retire, which is a success for the caller's purposes, not a failure. It is
 * reported as `{ cleared: true, installed: false }` rather than thrown, so a
 * shared `global-setup` works on instances with and without the app.
 *
 * TRUTHFUL ON A GUEST SURFACE — and it used to lie here.
 * Unauthenticated, `DELETE /apps/firstrunwizard/wizard` answers `401`. The
 * helper used to fold that into its catch-all failure branch and report
 * `{ installed: true, cleared: false }` — i.e. "a blocking overlay remains".
 * That is not merely unhelpful, it is FALSE: Nextcloud's first-run wizard is a
 * per-user overlay and cannot render for a visitor with no session, so there
 * was never anything there to block a click. A public-portal spec that trusted
 * the return value would fail its own setup over an overlay that does not
 * exist.
 *
 * So the session is consulted, not just the status code:
 *
 * | condition                          | result                                                                  |
 * | ---------------------------------- | ----------------------------------------------------------------------- |
 * | 2xx                                | `{installed: true,  cleared: true,  notApplicable: false}`               |
 * | 404                                | `{installed: false, cleared: true,  notApplicable: false}`               |
 * | 401, or a Nextcloud page with no user | `{installed: null, cleared: true,  notApplicable: true, reason: 'no-user-session'}` |
 * | anything else                      | `{installed: true,  cleared: false, notApplicable: false}`               |
 *
 * WHY `cleared: true` FOR A GUEST. `cleared` documents one thing: "nothing will
 * block clicks". On a guest surface nothing will, so `true` is the honest
 * answer — reporting `false` would make every caller that guards on it treat a
 * perfectly usable page as broken. `notApplicable: true` is what keeps it
 * distinguishable from a real dismissal, so a spec that wants to assert the
 * wizard was genuinely retired asserts `notApplicable === false` and gets a
 * failure if it silently ran as a guest.
 *
 * WHY `installed: null` RATHER THAN A BOOLEAN. A `401` is answered by
 * Nextcloud's auth layer before the wizard app is consulted at all, so the
 * response carries no information about whether the app is installed. `true`
 * and `false` would both be inventions; `null` says "not known from here". It
 * is falsy, so existing `if (installed)` checks behave as they did.
 *
 * The 2xx and 404 branches are evaluated BEFORE the session check on purpose:
 * if the server actually accepted the dismissal, that is dispositive and there
 * is nothing to second-guess.
 *
 * @param {object} page Playwright `Page`, on a Nextcloud page (the request is
 *   same-origin and needs `window.OC.requestToken`). A logged-out page is
 *   handled rather than misreported — see the table above.
 * @param {object} [options] `{ route }` to override the dismissal route.
 * @return {Promise<{status: number, cleared: boolean, installed: (boolean|null),
 *   notApplicable: boolean, reason: (string|null)}>}
 *   `status` is the HTTP status, or `-1` when the request itself threw.
 *   `cleared` is true when nothing will block clicks. `installed` is `null`
 *   when the status could not tell us. `notApplicable` is true when the wizard
 *   could never have rendered on this surface, with `reason` naming why.
 *
 * @example
 * const { cleared, notApplicable, status } = await retireFirstRunWizard(page)
 * if (notApplicable) {
 *   // guest surface — there is no wizard here, and that is fine
 * } else if (!cleared) {
 *   console.warn(`first-run wizard dismissal returned ${status}`)
 * }
 */
async function retireFirstRunWizard(page, options = {}) {
	const route = options.route || FIRST_RUN_WIZARD_ROUTE

	const status = await page.evaluate(async (url) => {
		try {
			const oc = globalThis.OC || {}
			const res = await globalThis.fetch(url, {
				method: 'DELETE',
				// Nextcloud rejects a state-changing request without this header.
				headers: { requesttoken: oc.requestToken || '' },
			})
			return res.status
		} catch (e) {
			return -1
		}
	}, route).catch(() => -1)

	if (status >= 200 && status < 300) {
		return { status, installed: true, cleared: true, notApplicable: false, reason: null }
	}
	if (status === 404) {
		return { status, installed: false, cleared: true, notApplicable: false, reason: null }
	}

	const session = await page.evaluate(readSurfaceSession)
		.catch(() => ({ user: null, isNextcloudPage: false }))

	// A 401 is Nextcloud's auth layer saying "no session" outright. The second
	// arm covers instances that answer differently (403, or a redirect that
	// resolves to something else) but whose page still shows the guest
	// signature: a request token, no user.
	if (status === 401 || (session.isNextcloudPage && !session.user)) {
		return {
			status,
			installed: null,
			cleared: true,
			notApplicable: true,
			reason: NO_USER_SESSION,
		}
	}

	return { status, installed: true, cleared: false, notApplicable: false, reason: null }
}

/**
 * What kind of Nextcloud surface this page is — logged-in app, or guest.
 *
 * Exported because the seeding helpers CANNOT answer this for you. They are
 * meant to be called BEFORE `page.goto()` (that is what makes `addInitScript`
 * work), and before a navigation there is no document to interrogate: probing
 * at seed time would be measuring `about:blank`. So the honest split is that
 * the seeds stay unconditional and cheap, and this is the probe you call AFTER
 * the page has loaded when you need to know whether any of it mattered.
 *
 * Measured on a portaliq public portal page: `data-requesttoken` present,
 * `data-user` absent, no `CnAppRoot` mounted. That combination is the
 * signature, and all three parts are required:
 *
 *  - a request token proves this is a Nextcloud page, so "no user" means
 *    logged-out rather than "not a Nextcloud page at all";
 *  - no user means `CnSupportDialog`'s and `CnWalkthrough`'s per-user state
 *    cannot be read or written;
 *  - no mounted `CnAppRoot` means neither overlay was ever instantiated —
 *    nc-vue auto-mounts both FROM the app root, so no root is no overlays.
 *
 * A guest page that DOES mount a `CnAppRoot` is not reported as a guest
 * surface, because the overlays it mounts are real and still need clearing.
 *
 * @param {object} page Playwright `Page`.
 * @return {Promise<{guest: boolean, user: (string|null), isNextcloudPage: boolean,
 *   appRoots: string[]}>} The surface facts, and the verdict derived from them.
 *
 * @example
 * const surface = await guestSurfaceStatus(page)
 * if (surface.guest) {
 *   // seedSupportDialogSeen / dismissFirstVisitOverlays are no-ops here
 * }
 */
async function guestSurfaceStatus(page) {
	const session = await page.evaluate(readSurfaceSession)
		.catch(() => ({ user: null, isNextcloudPage: false }))
	const appRoots = await mountedAppIds(page).catch(() => [])

	return {
		guest: Boolean(session.isNextcloudPage) && !session.user && appRoots.length === 0,
		user: session.user || null,
		isNextcloudPage: Boolean(session.isNextcloudPage),
		appRoots,
	}
}

/**
 * The `appId` of every `CnAppRoot` currently mounted on the page, outer shell
 * first.
 *
 * Useful for the nested-root caveat: run it once after the app has loaded to
 * discover the real nested id, then feed it to the seeding helpers for the
 * rest of the suite instead of relying on the `{appId}-` prefix convention.
 *
 * @param {object} page Playwright `Page`.
 * @return {Promise<string[]>} Mounted app ids, in document order.
 */
async function mountedAppIds(page) {
	return page.evaluate((attr) => {
		const nodes = document.querySelectorAll('[data-testid="cn-app-root"][' + attr + ']')
		return Array.prototype.map.call(nodes, (el) => el.getAttribute(attr)).filter(Boolean)
	}, APP_ROOT_ID_ATTR)
}

/**
 * The browser-side component-tree walk, as a source string.
 *
 * WHY A STRING: it is injected into `page.evaluate` by three different
 * exported helpers. Keeping one copy means the traversal — the part that is
 * subtle — cannot drift between them.
 *
 * WHY IT WALKS FROM `__vue_app__` AND NOT FROM AN ELEMENT:
 *
 *  - Vue 2's `el.__vue__` back-reference does not exist in Vue 3 at all. Every
 *    probe that used it started throwing "not mounted" after the migration,
 *    against components that were mounted, on screen, and holding exactly the
 *    state under test. The message was wrong; the probe was stale.
 *  - Vue 3's `el.__vueParentComponent` / `el.__vnode` are only stamped when
 *    `__DEV__ || __FEATURE_PROD_DEVTOOLS__`. This library's published bundle
 *    sets `__VUE_PROD_DEVTOOLS__ = false`, so both are absent at run time —
 *    measured, not assumed.
 *  - `container.__vue_app__` and `container._vnode` are assigned
 *    UNCONDITIONALLY by `createApp().mount()`. They are the only handles that
 *    survive a production build.
 *
 * Nextcloud mounts several Vue apps per page (the notifications bell, the
 * unified search, the app root, …), so every container is searched rather than
 * assuming one root.
 *
 * @type {string}
 */
const TREE_WALKER_SOURCE = `
	const out = []
	const seen = []

	function safeValue(value) {
		if (typeof value === 'function' || typeof value === 'symbol') {
			return undefined
		}
		try {
			return JSON.parse(JSON.stringify(value))
		} catch (e) {
			return '[unserialisable ' + typeof value + ']'
		}
	}

	function safeProps(props) {
		const safe = {}
		if (!props) {
			return safe
		}
		for (const key of Object.keys(props)) {
			const value = safeValue(props[key])
			if (value !== undefined) {
				safe[key] = value
			}
		}
		return safe
	}

	function visitInstance(instance, depth) {
		if (!instance) {
			return
		}
		// \`type\` is the component's options object; \`__name\` is the
		// filename-derived fallback the SFC compiler adds for \`<script setup>\`.
		const type = instance.type || {}
		const label = type.name || type.__name
		if (label) {
			seen.push(String(label))
			out.push({ name: String(label), depth: depth, props: safeProps(instance.props) })
		}
		visitVNode(instance.subTree, label ? depth + 1 : depth)
	}

	function visitVNode(vnode, depth) {
		if (!vnode || typeof vnode !== 'object') {
			return
		}
		if (vnode.component) {
			visitInstance(vnode.component, depth)
			return
		}
		// Element/fragment children are an array of vnodes; a text vnode's
		// children is a string, which Array.isArray correctly rejects.
		if (Array.isArray(vnode.children)) {
			for (const child of vnode.children) {
				visitVNode(child, depth)
			}
		}
		// Suspense keeps its real content off \`children\`.
		visitVNode(vnode.ssContent, depth)
	}

	const containers = Array.prototype.filter.call(
		document.querySelectorAll('*'),
		(el) => el.__vue_app__ !== undefined,
	)

	for (const container of containers) {
		visitVNode(container._vnode, 0)
	}
`

/**
 * Wrap the shared traversal plus a caller-supplied tail into a single
 * self-invoking expression.
 *
 * `page.evaluate` is given a STRING rather than a function on purpose: a
 * string expression needs no serialisation round-trip and works identically
 * whether the caller's `page` came from `@playwright/test`, bare
 * `playwright-core`, or an MCP session. Arguments are baked in as JSON
 * literals for the same reason (a string form of `evaluate` takes no args).
 *
 * @param {string} tail Statements appended after the walk; must `return`.
 * @param {object} [args] Values exposed to the tail as `args`.
 * @return {string} A self-invoking expression to evaluate in the page.
 */
function treeWalkerExpression(tail, args = {}) {
	return '(() => {\n'
		+ 'const args = ' + JSON.stringify(args) + ';\n'
		+ TREE_WALKER_SOURCE
		+ '\n' + tail
		+ '\n})()'
}

/**
 * Every component instance mounted on the page, in tree order.
 *
 * Answers questions that DOM selectors structurally cannot. "The nested app is
 * NOT mounted" looks identical from the outside to "the nested app is mounted
 * but still loading" — only the component tree tells them apart.
 *
 * Props are reduced to values that survive JSON serialisation, per property,
 * so one un-serialisable prop (a router instance, an event handler) cannot
 * blank the whole entry.
 *
 * @param {object} page Playwright `Page`.
 * @return {Promise<Array<{name: string, depth: number, props: object}>>} Flat
 *   list of mounted components.
 */
async function mountedComponents(page) {
	return page.evaluate(treeWalkerExpression('return out'))
}

/**
 * The de-duplicated, sorted names of every mounted component.
 *
 * Worth putting in an assertion message: a rename then reads as a rename
 * instead of as a phantom "component missing".
 *
 * @param {object} page Playwright `Page`.
 * @return {Promise<string[]>} Sorted unique component names.
 */
async function mountedComponentNames(page) {
	const all = await mountedComponents(page)
	return Array.from(new Set(all.map((c) => c.name))).sort()
}

/**
 * All mounted instances of one named component.
 *
 * @param {object} page Playwright `Page`.
 * @param {string} componentName Component `name` (or `<script setup>` `__name`).
 * @return {Promise<Array<{name: string, depth: number, props: object}>>} Matches.
 */
async function findMounted(page, componentName) {
	const all = await mountedComponents(page)
	return all.filter((c) => c.name === componentName)
}

/**
 * Read one prop off a mounted component as plain JSON.
 *
 * This is the generic form of the per-app `readStagedManifest()` helpers apps
 * kept writing: an in-editor buffer, a resolved manifest, a computed filter
 * set — state that only exists inside the component and would be changed by
 * reading it back through an API.
 *
 * @param {object} page Playwright `Page`.
 * @param {string} componentName Component to locate, by `name`.
 * @param {string} propName Prop to read.
 * @return {Promise<*>} A structured clone of the prop value.
 * @throws {Error} When the component is not mounted, or has no such prop. The
 *   message lists every component that WAS found, so a rename shows up as a
 *   rename and not as a phantom "not mounted".
 */
async function readComponentProp(page, componentName, propName) {
	const result = await page.evaluate(treeWalkerExpression(`
		const match = out.filter((c) => c.name === args.name)
		if (match.length === 0) {
			return { error: 'no mounted <' + args.name + '> found', components: Array.from(new Set(seen)).sort() }
		}
		if (!(args.prop in match[0].props)) {
			return { error: '<' + args.name + '> is mounted but exposes no ' + args.prop + ' prop', props: Object.keys(match[0].props).sort() }
		}
		return { value: match[0].props[args.prop] }
	`, { name: componentName, prop: propName }))

	if (result.error) {
		const extra = result.components
			? ' (components seen: ' + result.components.join(', ') + ')'
			: (result.props ? ' (props seen: ' + result.props.join(', ') + ')' : '')
		throw new Error('cannot read `' + propName + '` — ' + result.error + extra)
	}
	return result.value
}

module.exports = {
	// Exported because consumers assert against a saved `storageState` file
	// directly — `state.origins[0].localStorage` keyed by these prefixes is the
	// only way to prove a seed actually persisted rather than merely read back.
	SUPPORT_DIALOG_STORAGE_PREFIX,
	WALKTHROUGH_STORAGE_PREFIX,
	CHROME_DIALOG_SELECTORS,
	FIRST_RUN_WIZARD_ROUTE,
	// The two `reason` strings. Exported so a spec can compare against the
	// constant instead of retyping the literal and drifting.
	NO_USER_SESSION,
	GUEST_SURFACE,
	guestSurfaceStatus,
	seedSupportDialogSeen,
	seedWalkthroughSeen,
	seedFirstVisitOverlaysSeen,
	dismissWalkthrough,
	dismissSupportDialog,
	dismissFirstVisitOverlays,
	appDialog,
	retireFirstRunWizard,
	mountedAppIds,
	mountedComponents,
	mountedComponentNames,
	findMounted,
	readComponentProp,
}
