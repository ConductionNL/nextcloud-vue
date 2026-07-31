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
 * Install the storage shim that makes a set of `{prefix}{appId}` keys read
 * back as already-seen, for both future navigations and the current document.
 *
 * The shim intercepts `Storage.prototype.getItem` rather than only writing the
 * keys, because of the nested-`CnAppRoot` caveat documented on
 * {@link seedSupportDialogSeen}: the id of a nested root is composed at run
 * time and cannot be enumerated before the page loads.
 *
 * @param {object} page Playwright `Page` (duck-typed).
 * @param {string} prefix Storage key prefix.
 * @param {string[]} ids Exact app ids to cover (also covers `id + '-*'`).
 * @param {boolean} matchAll Cover every app id under the prefix.
 * @param {string} value Value the shimmed key reads back as.
 * @return {Promise<void>}
 */
async function installSeenShim(page, prefix, ids, matchAll, value) {
	const payload = { prefix, ids, matchAll, value }

	/**
	 * Runs inside the browser. Kept as a single self-contained function so it
	 * can be handed to both `addInitScript` (future navigations) and
	 * `evaluate` (the document already open).
	 *
	 * @param {object} args The serialised payload.
	 * @return {void}
	 */
	const apply = (args) => {
		const store = globalThis.__cnSeenSeeds || (globalThis.__cnSeenSeeds = [])
		store.push(args)

		if (!globalThis.__cnSeenShimInstalled) {
			globalThis.__cnSeenShimInstalled = true
			const proto = globalThis.Storage && globalThis.Storage.prototype
			if (!proto) {
				return
			}
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

		// Also write the concrete keys through, so any consumer reading the
		// backing store directly (or after the shim is torn down by a hard
		// reload of a different origin) sees the same answer.
		if (!args.matchAll) {
			for (const id of args.ids) {
				try {
					globalThis.localStorage.setItem(args.prefix + id, args.value)
				} catch (e) {
					/* private mode / quota — the shim already covers reads */
				}
			}
		}
	}

	await page.addInitScript(apply, payload)
	// Best-effort for a page that is already open: `addInitScript` only affects
	// subsequent navigations, and callers do sometimes seed mid-test.
	await page.evaluate(apply, payload).catch(() => {})
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
 * @param {object} page Playwright `Page`.
 * @param {string|string[]} [appId] App id(s); `'*'` or omitted covers all.
 * @return {Promise<void>}
 *
 * @example
 * test.beforeEach(async ({ page }) => {
 *   await seedSupportDialogSeen(page, 'openbuild') // also covers openbuild-<slug>
 *   await page.goto('/apps/openbuild/')
 * })
 */
async function seedSupportDialogSeen(page, appId) {
	const { ids, matchAll } = normaliseAppIds(appId)
	await installSeenShim(page, SUPPORT_DIALOG_STORAGE_PREFIX, ids, matchAll, '1')
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
 * Same nested-`CnAppRoot` coverage rule as {@link seedSupportDialogSeen}.
 *
 * @param {object} page Playwright `Page`.
 * @param {string|string[]} [appId] App id(s); `'*'` or omitted covers all.
 * @param {string} [version] Version to record as seen.
 * @return {Promise<void>}
 */
async function seedWalkthroughSeen(page, appId, version = FUTURE_VERSION) {
	const { ids, matchAll } = normaliseAppIds(appId)
	await installSeenShim(page, WALKTHROUGH_STORAGE_PREFIX, ids, matchAll, String(version))
}

/**
 * Seed both first-visit overlays in one call — the pre-emptive counterpart of
 * {@link dismissFirstVisitOverlays}.
 *
 * @param {object} page Playwright `Page`.
 * @param {string|string[]} [appId] App id(s); `'*'` or omitted covers all.
 * @return {Promise<void>}
 */
async function seedFirstVisitOverlaysSeen(page, appId) {
	await seedSupportDialogSeen(page, appId)
	await seedWalkthroughSeen(page, appId)
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
 * @param {object} page Playwright `Page`.
 * @param {object} [options] Forwarded to both helpers.
 * @return {Promise<void>}
 */
async function dismissFirstVisitOverlays(page, options = {}) {
	await dismissWalkthrough(page, options)
	await dismissSupportDialog(page, options)
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
	SUPPORT_DIALOG_STORAGE_PREFIX,
	WALKTHROUGH_STORAGE_PREFIX,
	seedSupportDialogSeen,
	seedWalkthroughSeen,
	seedFirstVisitOverlaysSeen,
	dismissWalkthrough,
	dismissSupportDialog,
	dismissFirstVisitOverlays,
	mountedAppIds,
	mountedComponents,
	mountedComponentNames,
	findMounted,
	readComponentProp,
}
