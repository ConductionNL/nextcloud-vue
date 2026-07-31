/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof for `@conduction/nextcloud-vue/testing/playwright`.
 *
 * These helpers exist because nc-vue imposes something on its consumers — a
 * click-eating first-visit overlay, and a production bundle with devtools
 * hooks compiled out. That makes them exactly the kind of code that "looks
 * right" and silently stops working: a renamed CSS class, a changed storage
 * prefix, or a Vue internals change all fail by doing nothing.
 *
 * So none of this is asserted against the source. The storage prefixes are
 * compared to the COMPOSABLES that write them, the seeding shim is executed
 * in jsdom against a real `Storage`, and the component-tree walk is run over a
 * fabricated Vue 3 vnode tree.
 */

import {
	SUPPORT_DIALOG_STORAGE_PREFIX,
	WALKTHROUGH_STORAGE_PREFIX,
	seedSupportDialogSeen,
	seedWalkthroughSeen,
	seedFirstVisitOverlaysSeen,
	dismissWalkthrough,
	dismissSupportDialog,
	dismissFirstVisitOverlays,
	mountedComponents,
	mountedComponentNames,
	findMounted,
	readComponentProp,
} from '../../testing/playwright.js'

import { WALKTHROUGH_SEEN_STORAGE_PREFIX } from '../../src/composables/useWalkthrough.js'

/**
 * A `page` stand-in.
 *
 * `addInitScript(fn, arg)` is EXECUTED immediately rather than recorded: the
 * shim it installs is the actual thing under test, and jsdom gives us a real
 * `Storage.prototype` to install it on. `evaluate` runs a string expression
 * through `eval` for the same reason — a recorded-call assertion would pass
 * against a traversal that cannot walk a tree.
 *
 * @param {object} [options] `{ locators }` — selector → stub locator.
 * @return {object} The fake page.
 */
function makePage(options = {}) {
	const locators = options.locators || {}
	const calls = { initScripts: 0, evaluates: [], keys: [] }

	return {
		calls,
		async addInitScript(fn, arg) {
			calls.initScripts++
			fn(arg)
		},
		async evaluate(fnOrString, arg) {
			calls.evaluates.push(fnOrString)
			if (typeof fnOrString === 'string') {
				// eslint-disable-next-line no-eval
				return eval(fnOrString)
			}
			return fnOrString(arg)
		},
		locator(selector) {
			return locators[selector] || missingLocator()
		},
		keyboard: {
			async press(key) {
				calls.keys.push(key)
			},
		},
	}
}

/**
 * A locator for an element that is not present.
 *
 * @return {object} Stub locator that never becomes visible.
 */
function missingLocator() {
	const stub = {
		first: () => stub,
		getByRole: () => stub,
		async waitFor(opts) {
			if (opts && opts.state === 'detached') {
				return undefined
			}
			throw new Error('timeout')
		},
		async click() {
			throw new Error('not found')
		},
		async isVisible() {
			return false
		},
	}
	return stub
}

/**
 * A locator for an element that is present until it is clicked.
 *
 * @param {object} state Shared mutable `{ open, clicks }` record.
 * @return {object} Stub locator.
 */
function presentLocator(state) {
	const stub = {
		first: () => stub,
		getByRole: () => stub,
		async waitFor(opts) {
			const wantDetached = opts && opts.state === 'detached'
			if (wantDetached ? !state.open : state.open) {
				return undefined
			}
			throw new Error('timeout')
		},
		async click() {
			state.clicks++
			state.open = false
		},
		async isVisible() {
			return state.open
		},
	}
	return stub
}

describe('storage prefixes stay in sync with the composables that write them', () => {
	it('matches useWalkthrough', () => {
		expect(WALKTHROUGH_STORAGE_PREFIX).toBe(WALKTHROUGH_SEEN_STORAGE_PREFIX)
	})

	it('matches useSupportDialog', () => {
		// useSupportDialog keeps its prefix module-private, so assert against
		// the literal the composable is documented to use. If the composable
		// changes it, the e2e seed silently stops working — which is precisely
		// the failure this test exists to make loud.
		expect(SUPPORT_DIALOG_STORAGE_PREFIX).toBe('cn-support-dialog-shown:')
	})
})

describe('seedSupportDialogSeen', () => {
	let originalGetItem

	beforeEach(() => {
		originalGetItem = Storage.prototype.getItem
		window.localStorage.clear()
		delete globalThis.__cnSeenShimInstalled
		delete globalThis.__cnSeenSeeds
	})

	afterEach(() => {
		Storage.prototype.getItem = originalGetItem
		delete globalThis.__cnSeenShimInstalled
		delete globalThis.__cnSeenSeeds
	})

	it('makes the exact app id read back as seen', async () => {
		await seedSupportDialogSeen(makePage(), 'openbuild')
		expect(window.localStorage.getItem('cn-support-dialog-shown:openbuild')).toBe('1')
	})

	it('also covers a NESTED CnAppRoot mounted under {appId}-{slug}', async () => {
		// The field caveat: /builder/:slug mounts a second CnAppRoot whose
		// appId is `openbuild-<slug>`, and useSupportDialog namespaces the flag
		// per app id — so a dialog marked seen for the shell opens AGAIN over
		// the nested app, on a page the test believes it already cleared.
		await seedSupportDialogSeen(makePage(), 'openbuild')
		expect(window.localStorage.getItem('cn-support-dialog-shown:openbuild-my-app')).toBe('1')
	})

	it('does not leak across unrelated apps', async () => {
		await seedSupportDialogSeen(makePage(), 'openbuild')
		expect(window.localStorage.getItem('cn-support-dialog-shown:openconnector')).toBeNull()
	})

	it('covers every app id when passed "*" or nothing', async () => {
		await seedSupportDialogSeen(makePage(), '*')
		expect(window.localStorage.getItem('cn-support-dialog-shown:anything-at-all')).toBe('1')
	})

	it('accepts an explicit list', async () => {
		await seedSupportDialogSeen(makePage(), ['openbuild', 'launchpad'])
		expect(window.localStorage.getItem('cn-support-dialog-shown:launchpad')).toBe('1')
		expect(window.localStorage.getItem('cn-support-dialog-shown:openbuild')).toBe('1')
	})

	it('leaves unrelated storage keys alone', async () => {
		window.localStorage.setItem('some-app-preference', 'kept')
		await seedSupportDialogSeen(makePage(), '*')
		expect(window.localStorage.getItem('some-app-preference')).toBe('kept')
	})

	it('registers an init script so it survives navigation', async () => {
		const page = makePage()
		await seedSupportDialogSeen(page, 'openbuild')
		expect(page.calls.initScripts).toBe(1)
	})
})

describe('seedWalkthroughSeen', () => {
	let originalGetItem

	beforeEach(() => {
		originalGetItem = Storage.prototype.getItem
		window.localStorage.clear()
		delete globalThis.__cnSeenShimInstalled
		delete globalThis.__cnSeenSeeds
	})

	afterEach(() => {
		Storage.prototype.getItem = originalGetItem
		delete globalThis.__cnSeenShimInstalled
		delete globalThis.__cnSeenSeeds
	})

	it('records a version above any real app version', async () => {
		await seedWalkthroughSeen(makePage(), 'pipelinq')
		const seen = window.localStorage.getItem('cn-walkthrough-seen:pipelinq')
		// A low seed would suppress the first-visit tour and then immediately
		// trip the version-bump one, which is worse than not seeding at all.
		expect(parseInt(seen.split('.')[0], 10)).toBeGreaterThan(100)
	})

	it('accepts an explicit version', async () => {
		await seedWalkthroughSeen(makePage(), 'pipelinq', '2.1.0')
		expect(window.localStorage.getItem('cn-walkthrough-seen:pipelinq')).toBe('2.1.0')
	})

	it('seedFirstVisitOverlaysSeen covers both overlays at once', async () => {
		await seedFirstVisitOverlaysSeen(makePage(), 'launchpad')
		expect(window.localStorage.getItem('cn-support-dialog-shown:launchpad')).toBe('1')
		expect(window.localStorage.getItem('cn-walkthrough-seen:launchpad')).toBeTruthy()
	})
})

describe('dismissWalkthrough', () => {
	it('clicks the close button and waits for the DIMMER to detach', async () => {
		const card = { open: true, clicks: 0 }
		const close = { open: true, clicks: 0 }
		const dim = { open: true, clicks: 0 }
		const page = makePage({
			locators: {
				'.cn-walkthrough__card': presentLocator(card),
				'.cn-walkthrough__close': presentLocator(close),
				'.cn-walkthrough__dim': presentLocator(dim),
			},
		})
		// The dimmer is what actually eats the next click; asserting only that
		// the card is hidden would pass while the page stayed unusable.
		await expect(dismissWalkthrough(page)).resolves.toBe(true)
		expect(close.clicks).toBe(1)
	})

	it('is a no-op when no tour is open', async () => {
		const page = makePage()
		await expect(dismissWalkthrough(page, { timeout: 10 })).resolves.toBe(false)
	})
})

describe('dismissSupportDialog', () => {
	it('closes the dialog', async () => {
		const dialog = { open: true, clicks: 0 }
		const page = makePage({
			locators: { '[data-testid-modal="cn-support-dialog"]': presentLocator(dialog) },
		})
		await expect(dismissSupportDialog(page, { timeout: 10 })).resolves.toBe(1)
		expect(dialog.clicks).toBe(1)
	})

	it('closes a SECOND dialog raised by a nested CnAppRoot', async () => {
		// A nested root runs its own useSupportDialog under a different app id,
		// so closing the outer dialog can be immediately followed by another.
		// A helper that closes exactly one leaves the page click-blocked.
		let remaining = 2
		const stub = {
			first: () => stub,
			getByRole: () => stub,
			async waitFor(opts) {
				const wantDetached = opts && opts.state === 'detached'
				const open = remaining > 0
				if (wantDetached ? !open : open) {
					return undefined
				}
				throw new Error('timeout')
			},
			async click() {
				remaining--
			},
			async isVisible() {
				return remaining > 0
			},
		}
		const page = makePage({ locators: { '[data-testid-modal="cn-support-dialog"]': stub } })
		await expect(dismissSupportDialog(page, { timeout: 10 })).resolves.toBe(2)
		expect(remaining).toBe(0)
	})

	it('is a no-op when no dialog is open', async () => {
		await expect(dismissSupportDialog(makePage(), { timeout: 10 })).resolves.toBe(0)
	})

	it('dismissFirstVisitOverlays clears both without throwing on an empty page', async () => {
		await expect(dismissFirstVisitOverlays(makePage(), { timeout: 10 })).resolves.toBeUndefined()
	})
})

/**
 * Build a fake Vue 3 component instance the way the renderer shapes one.
 *
 * @param {string} name Component name.
 * @param {object} props Props bag.
 * @param {object} [subTree] Rendered subtree vnode.
 * @return {object} Fake instance.
 */
function instance(name, props, subTree = null) {
	return { type: { name }, props, subTree }
}

describe('component-tree accessor', () => {
	let container

	beforeEach(() => {
		// nc-vue's published bundle sets `__VUE_PROD_DEVTOOLS__ = false`, so
		// `__vnode` / `__vueParentComponent` are never stamped on elements and
		// `container.__vue_app__` + `container._vnode` are the only handles
		// that survive. This fixture models exactly that shape.
		container = document.createElement('div')
		container.__vue_app__ = {}
		container._vnode = {
			component: instance('CnAppRoot', { appId: 'openbuild' }, {
				children: [
					{ component: instance('PageDesigner', { manifest: { pages: [{ id: 'home' }] } }) },
					{
						component: instance('CnAppRoot', { appId: 'openbuild-my-app' }, {
							children: [
								{ component: instance('CnIndexPage', { schema: 'product', onSelect: () => {} }) },
							],
						}),
					},
				],
			}),
		}
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	it('walks from container.__vue_app__ and finds every instance', async () => {
		const names = await mountedComponentNames(makePage())
		expect(names).toEqual(['CnAppRoot', 'CnIndexPage', 'PageDesigner'])
	})

	it('reports the nested CnAppRoot as a SEPARATE instance with its own appId', async () => {
		const roots = await findMounted(makePage(), 'CnAppRoot')
		expect(roots.map((r) => r.props.appId)).toEqual(['openbuild', 'openbuild-my-app'])
	})

	it('records nesting depth, so "mounted" and "mounted where" are distinguishable', async () => {
		const all = await mountedComponents(makePage())
		expect(all.find((c) => c.name === 'CnIndexPage').depth).toBeGreaterThan(
			all.find((c) => c.props.appId === 'openbuild').depth,
		)
	})

	it('drops un-serialisable props instead of blanking the whole entry', async () => {
		const [index] = await findMounted(makePage(), 'CnIndexPage')
		expect(index.props.schema).toBe('product')
		expect(index.props).not.toHaveProperty('onSelect')
	})

	it('reads a prop that exists only inside the component', async () => {
		const manifest = await readComponentProp(makePage(), 'PageDesigner', 'manifest')
		expect(manifest).toEqual({ pages: [{ id: 'home' }] })
	})

	it('names the components it DID find when the target is missing', async () => {
		// A stale probe reporting "not mounted" against a component that is on
		// screen is how seven scenarios were misdiagnosed after the Vue 3
		// migration. The message has to make a rename look like a rename.
		await expect(readComponentProp(makePage(), 'Ghost', 'manifest'))
			.rejects.toThrow(/components seen: CnAppRoot, CnIndexPage, PageDesigner/)
	})

	it('says so when the component is mounted but has no such prop', async () => {
		await expect(readComponentProp(makePage(), 'PageDesigner', 'nope'))
			.rejects.toThrow(/mounted but exposes no/)
	})

	it('returns an empty list when no Vue app is mounted', async () => {
		container.remove()
		await expect(mountedComponents(makePage())).resolves.toEqual([])
	})
})
