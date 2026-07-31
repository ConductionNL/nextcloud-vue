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
	CHROME_DIALOG_SELECTORS,
	FIRST_RUN_WIZARD_ROUTE,
	seedSupportDialogSeen,
	seedWalkthroughSeen,
	seedFirstVisitOverlaysSeen,
	dismissWalkthrough,
	dismissSupportDialog,
	dismissFirstVisitOverlays,
	appDialog,
	retireFirstRunWizard,
	mountedComponents,
	mountedComponentNames,
	findMounted,
	readComponentProp,
} from '../../testing/playwright.js'

import { WALKTHROUGH_SEEN_STORAGE_PREFIX } from '../../src/composables/useWalkthrough.js'

/**
 * The PRISTINE `Storage` accessors, captured at module load — before any test
 * has installed the seeding shim.
 *
 * This is the load-bearing detail of the persistence proof below. Playwright
 * builds `storageState` in the driver process from the browser's real backing
 * store; it never asks the page's JavaScript. So a `Storage.prototype.getItem`
 * shim is invisible to it — which is exactly why the match-all seed reads back
 * `"1"` in the page and persists nothing.
 *
 * Modelling that faithfully means the fake `storageState()` must NOT read
 * through whatever `getItem` currently is. If it did, the shim would answer,
 * the fake would report the key as persisted, and the test would certify the
 * bug as fixed.
 */
const PRISTINE_GET_ITEM = Storage.prototype.getItem
const PRISTINE_KEY = Storage.prototype.key
const PRISTINE_LENGTH = Object.getOwnPropertyDescriptor(Storage.prototype, 'length').get

/**
 * The real contents of the localStorage backing store, read without going
 * through any shim — i.e. what Playwright would actually serialise.
 *
 * @return {Array<{name: string, value: string}>} Entries, in store order.
 */
function readBackingStore() {
	const store = window.localStorage
	const total = PRISTINE_LENGTH.call(store)
	const entries = []
	for (let i = 0; i < total; i++) {
		const name = PRISTINE_KEY.call(store, i)
		entries.push({ name, value: PRISTINE_GET_ITEM.call(store, name) })
	}
	return entries
}

/**
 * A `page` stand-in.
 *
 * `addInitScript(fn, arg)` is EXECUTED immediately rather than recorded: the
 * shim it installs is the actual thing under test, and jsdom gives us a real
 * `Storage.prototype` to install it on. `evaluate` runs a string expression
 * through `eval` for the same reason — a recorded-call assertion would pass
 * against a traversal that cannot walk a tree.
 *
 * @param {object} [options] `{ locators, context }`.
 * @return {object} The fake page.
 */
function makePage(options = {}) {
	const locators = options.locators || {}
	const calls = { initScripts: 0, evaluates: [], keys: [], locators: [] }

	const page = {
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
			calls.locators.push(selector)
			return locators[selector] || missingLocator()
		},
		keyboard: {
			async press(key) {
				calls.keys.push(key)
			},
		},
	}
	if (options.context) {
		page.context = () => options.context
	}
	return page
}

/**
 * A `BrowserContext` stand-in that models the two behaviours the persistence
 * fix depends on.
 *
 * 1. `addInitScript` is RECORDED, not run: on a real context it applies to
 *    pages opened later and to later navigations — never retroactively to the
 *    current document. `newPage()` replays the recorded scripts, which is the
 *    moment a real init script would run.
 * 2. `storageState()` serialises the backing store via {@link readBackingStore},
 *    i.e. without the page's JavaScript in the loop, exactly as Playwright does.
 *
 * @param {object} [options] `{ origin }`.
 * @return {object} The fake context.
 */
function makeContext(options = {}) {
	const origin = options.origin || 'http://localhost:8080'
	const initScripts = []
	const pages = []

	const context = {
		initScripts,
		async addInitScript(fn, arg) {
			initScripts.push([fn, arg])
		},
		pages() {
			return pages.slice()
		},
		async newPage() {
			const page = makePage({ context })
			pages.push(page)
			// A real page runs every registered init script at document start.
			for (const [fn, arg] of initScripts) {
				fn(arg)
			}
			return page
		},
		async storageState() {
			return { cookies: [], origins: [{ origin, localStorage: readBackingStore() }] }
		},
	}
	return context
}

/**
 * Wipe the browser and load ONLY what a `storageState` file carries — the
 * "fresh worker picks up the saved state" half of a Playwright run.
 *
 * Every shim is torn down first, because a new browser process has none. What
 * survives this is, by definition, what actually persisted.
 *
 * @param {object} state A `storageState()` result.
 * @return {void}
 */
function reloadFromStorageState(state) {
	Storage.prototype.getItem = PRISTINE_GET_ITEM
	delete globalThis.__cnSeenShimInstalled
	delete globalThis.__cnSeenSeeds
	window.localStorage.clear()
	for (const origin of state.origins) {
		for (const { name, value } of origin.localStorage) {
			window.localStorage.setItem(name, value)
		}
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

/**
 * The `'*'` persistence trap, and the proof that it is now unreachable.
 *
 * MEASURED BY THE CONSUMER (openconnector), before this fix:
 *
 * ```
 * explicit 'openconnector'  in-page getItem: "1"  persisted: cn-support-dialog-shown:openconnector=1
 * matchAll  '*'             in-page getItem: "1"  persisted: NONE
 * ```
 *
 * BOTH read back `"1"` inside the page. That is the entire problem: a
 * `global-setup` that seeds and then saves `storageState` has no signal at all
 * that it saved nothing, and the failure surfaces later as an overlay in every
 * single spec — the green-but-dead shape this module exists to prevent.
 *
 * Documenting it was not enough, so the combination is now refused: a
 * BrowserContext-scoped seed throws on `'*'`, and a page-scoped `'*'` poisons
 * that context's `storageState()`.
 */
describe("the '*' seed cannot silently fail to persist", () => {
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

	describe('the trap itself is real — the premise, measured here', () => {
		it("'*' reads back as seen INSIDE the page", async () => {
			await seedSupportDialogSeen(makePage(), '*')
			expect(window.localStorage.getItem('cn-support-dialog-shown:anything')).toBe('1')
		})

		it('…while writing NO key a storageState could ever carry', async () => {
			await seedSupportDialogSeen(makePage(), '*')
			// Read the backing store the way Playwright's driver does — without
			// the page's `getItem` in the loop. This is the "persisted: NONE"
			// column of the table above, reproduced.
			const persisted = readBackingStore()
				.filter((e) => e.name.startsWith(SUPPORT_DIALOG_STORAGE_PREFIX))
			expect(persisted).toEqual([])
		})

		it('POSITIVE CONTROL: an explicit id DOES write a key to that same store', async () => {
			// Without this, the assertion above would also pass against a broken
			// `readBackingStore()` that can never see anything.
			await seedSupportDialogSeen(makePage(), 'openconnector')
			const persisted = readBackingStore()
				.filter((e) => e.name.startsWith(SUPPORT_DIALOG_STORAGE_PREFIX))
			expect(persisted).toEqual([
				{ name: 'cn-support-dialog-shown:openconnector', value: '1' },
			])
		})
	})

	describe('the BrowserContext overload persists, end to end', () => {
		it('survives save → fresh browser → reload from storageState', async () => {
			// The full openconnector global-setup shape.
			const context = makeContext()
			await seedFirstVisitOverlaysSeen(context, 'openconnector')
			await context.newPage()

			const state = await context.storageState()
			const names = state.origins[0].localStorage.map((e) => e.name)
			expect(names).toContain(`${SUPPORT_DIALOG_STORAGE_PREFIX}openconnector`)
			expect(names).toContain(`${WALKTHROUGH_STORAGE_PREFIX}openconnector`)

			// A new worker: no shim, no page, ONLY the saved state.
			reloadFromStorageState(state)
			expect(Storage.prototype.getItem).toBe(PRISTINE_GET_ITEM)
			expect(window.localStorage.getItem(`${SUPPORT_DIALOG_STORAGE_PREFIX}openconnector`)).toBe('1')
			expect(window.localStorage.getItem(`${WALKTHROUGH_STORAGE_PREFIX}openconnector`)).toBeTruthy()
		})

		it('also seeds pages the context had open BEFORE the call', async () => {
			const context = makeContext()
			await context.newPage()
			await seedSupportDialogSeen(context, 'openconnector')
			const state = await context.storageState()
			expect(state.origins[0].localStorage.map((e) => e.name))
				.toContain(`${SUPPORT_DIALOG_STORAGE_PREFIX}openconnector`)
		})

		it('accepts an explicit list of ids', async () => {
			const context = makeContext()
			await seedSupportDialogSeen(context, ['openconnector', 'openbuild'])
			await context.newPage()
			const names = (await context.storageState()).origins[0].localStorage.map((e) => e.name)
			expect(names).toContain(`${SUPPORT_DIALOG_STORAGE_PREFIX}openconnector`)
			expect(names).toContain(`${SUPPORT_DIALOG_STORAGE_PREFIX}openbuild`)
		})

		it('still covers a NESTED CnAppRoot on the pages it seeded', async () => {
			const context = makeContext()
			await seedSupportDialogSeen(context, 'openbuild')
			await context.newPage()
			// The `{appId}-{slug}` coverage comes from the shim, which is
			// page-lifetime — so it holds within the run even though only the
			// exact id is what persists.
			expect(window.localStorage.getItem('cn-support-dialog-shown:openbuild-my-app')).toBe('1')
		})
	})

	describe("the previously-broken path now THROWS instead of no-op'ing", () => {
		it("refuses a BrowserContext seeded with '*'", async () => {
			await expect(seedSupportDialogSeen(makeContext(), '*'))
				.rejects.toThrow(/cannot be persisted/)
		})

		it('refuses a BrowserContext with the appId omitted entirely', async () => {
			await expect(seedFirstVisitOverlaysSeen(makeContext()))
				.rejects.toThrow(/cannot be persisted/)
		})

		it('names the fix in the message, not just the problem', async () => {
			await expect(seedSupportDialogSeen(makeContext(), '*'))
				.rejects.toThrow(/Pass the explicit app id/)
		})

		it('writes nothing at all when it refuses', async () => {
			await seedSupportDialogSeen(makeContext(), '*').catch(() => {})
			expect(readBackingStore()).toEqual([])
		})

		it("poisons storageState() when a PAGE is seeded with '*'", async () => {
			// The page-scoped match-all form is still legitimate for a spec that
			// never persists. What it must never do again is let a global-setup
			// save a state with nothing in it.
			const context = makeContext()
			const page = makePage({ context })
			await seedSupportDialogSeen(page, '*')
			await expect(context.storageState()).rejects.toThrow(/cannot be persisted/)
		})

		it('leaves storageState() alone when the page seed is explicit', async () => {
			const context = makeContext()
			const page = makePage({ context })
			await seedFirstVisitOverlaysSeen(page, 'openconnector')
			const state = await context.storageState()
			expect(state.origins[0].localStorage.map((e) => e.name))
				.toContain(`${SUPPORT_DIALOG_STORAGE_PREFIX}openconnector`)
		})

		it('keeps the original method reachable for a caller that means it', async () => {
			const context = makeContext()
			const page = makePage({ context })
			await seedSupportDialogSeen(page, '*')
			await expect(context.__cnOriginalStorageState()).resolves.toHaveProperty('origins')
		})

		it('tolerates a page with no context() at all', async () => {
			// playwright-core scripts and MCP sessions hand over a duck-typed
			// page; the poison step must degrade, not throw.
			await expect(seedSupportDialogSeen(makePage(), '*')).resolves.toBeUndefined()
		})
	})
})

describe('appDialog', () => {
	/**
	 * A page whose `locator()` just records the selector, so the generated CSS
	 * can be run against a real jsdom document.
	 *
	 * @return {object} Fake page.
	 */
	function selectorPage() {
		const page = {
			selectors: [],
			locator(selector) {
				page.selectors.push(selector)
				const loc = { selector, first: () => loc }
				return loc
			},
		}
		return page
	}

	/**
	 * Build the overlay stack a Nextcloud page actually presents.
	 *
	 * The app's own dialog is modelled as `@nextcloud/vue` renders it: `NcModal`
	 * puts `role="dialog"` on a `.modal-mask` root, and `NcDialog` is built on
	 * `NcModal`. That detail is the reason `.modal-mask` is NOT a default
	 * exclusion.
	 *
	 * @return {HTMLElement} The container to remove afterwards.
	 */
	function mountOverlays() {
		const root = document.createElement('div')
		root.innerHTML = `
			<div id="firstrunwizard" role="dialog" class="modal-mask modal-mask--opaque"></div>
			<div class="modal-mask cn-support-dialog" role="dialog" data-testid-modal="cn-support-dialog"></div>
			<div class="oc-dialog" role="dialog"></div>
			<div class="modal-mask" role="dialog" id="app-modal"></div>
		`
		document.body.appendChild(root)
		return root
	}

	let root

	beforeEach(() => {
		root = mountOverlays()
	})

	afterEach(() => {
		root.remove()
	})

	it('returns a Locator, so it composes with getByRole chains', () => {
		const locator = appDialog(makePage())
		expect(typeof locator.getByRole).toBe('function')
	})

	it('matches the app\'s own dialog and nothing else', () => {
		const page = selectorPage()
		appDialog(page)
		const matched = Array.from(document.querySelectorAll(page.selectors[0]))
		expect(matched.map((el) => el.id)).toEqual(['app-modal'])
	})

	it('POSITIVE CONTROL: the naive getByRole("dialog") would match the chrome first', () => {
		// This is the failure the helper exists to stop: a spec that clicks,
		// misses, and then asserts on the first `[role=dialog]` matches
		// Nextcloud's wizard and reports a modal it never opened as showing.
		const naive = Array.from(document.querySelectorAll('[role="dialog"]'))
		expect(naive[0].id).toBe('firstrunwizard')
		expect(naive.length).toBeGreaterThan(1)
	})

	it.each([
		['NC first-run wizard', 'firstrunwizard'],
	])('excludes %s', (_label, id) => {
		const page = selectorPage()
		appDialog(page)
		const matched = Array.from(document.querySelectorAll(page.selectors[0]))
		expect(matched.map((el) => el.id)).not.toContain(id)
	})

	it('excludes the nc-vue support dialog by class AND by test hook', () => {
		expect(CHROME_DIALOG_SELECTORS).toContain('.cn-support-dialog')
		expect(CHROME_DIALOG_SELECTORS).toContain('[data-testid-modal="cn-support-dialog"]')
		const page = selectorPage()
		appDialog(page)
		expect(document.querySelectorAll(page.selectors[0]).length).toBe(1)
	})

	it("excludes Nextcloud's legacy .oc-dialog", () => {
		expect(CHROME_DIALOG_SELECTORS).toContain('.oc-dialog')
	})

	it('does NOT exclude .modal-mask by default — it IS the app\'s own NcModal root', () => {
		// `@nextcloud/vue` v9 renders NcModal as
		// `<div class="modal-mask" role="dialog">`, and NcDialog wraps NcModal.
		// A blanket `.modal-mask` exclusion would make this locator match
		// nothing in a typical app — the same green-but-dead shape it exists to
		// prevent, since an assertion then passes against absence.
		expect(CHROME_DIALOG_SELECTORS).not.toContain('.modal-mask')
	})

	it('PROOF: excluding .modal-mask would swallow the app\'s own dialog', () => {
		const page = selectorPage()
		appDialog(page, { exclude: ['.modal-mask'] })
		expect(document.querySelectorAll(page.selectors[0]).length).toBe(0)
	})

	it('accepts extra exclusions for an app that needs them', () => {
		const page = selectorPage()
		appDialog(page, { exclude: ['#app-modal'] })
		expect(document.querySelectorAll(page.selectors[0]).length).toBe(0)
	})

	it('can return the whole match set instead of the first', () => {
		const page = makePage()
		const all = appDialog(page, { all: true })
		// `.first()` is not applied, so what comes back is the raw locator.
		expect(all.first).toBeDefined()
	})

	it('emits a selector jsdom can actually parse', () => {
		const page = selectorPage()
		appDialog(page)
		expect(() => document.querySelectorAll(page.selectors[0])).not.toThrow()
	})
})

describe('retireFirstRunWizard', () => {
	let originalFetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
		globalThis.OC = { requestToken: 'tok-123' }
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		delete globalThis.OC
	})

	/**
	 * Record the DELETE and answer with a status.
	 *
	 * @param {number|Error} answer Status to return, or an error to throw.
	 * @return {object} `{ calls }` record.
	 */
	function stubFetch(answer) {
		const calls = []
		globalThis.fetch = async (url, init) => {
			calls.push({ url, init })
			if (answer instanceof Error) {
				throw answer
			}
			return { status: answer }
		}
		return calls
	}

	it('retires the wizard server-side, so it holds for every context', async () => {
		const calls = stubFetch(200)
		await expect(retireFirstRunWizard(makePage()))
			.resolves.toEqual({ status: 200, installed: true, cleared: true })
		expect(calls[0].url).toBe(FIRST_RUN_WIZARD_ROUTE)
		expect(calls[0].init.method).toBe('DELETE')
	})

	it('sends the CSRF token Nextcloud requires for a state change', async () => {
		const calls = stubFetch(200)
		await retireFirstRunWizard(makePage())
		// Without this header NC rejects the request, and the wizard survives —
		// silently, since the helper would still see a response.
		expect(calls[0].init.headers.requesttoken).toBe('tok-123')
	})

	it('treats a 404 as "nothing to retire", NOT as a failure', async () => {
		// An instance without the firstrunwizard app installed must not fail a
		// shared global-setup.
		stubFetch(404)
		await expect(retireFirstRunWizard(makePage()))
			.resolves.toEqual({ status: 404, installed: false, cleared: true })
	})

	it('reports a real failure as NOT cleared', async () => {
		stubFetch(403)
		const result = await retireFirstRunWizard(makePage())
		expect(result.cleared).toBe(false)
		expect(result.installed).toBe(true)
	})

	it('reports a thrown request as status -1 rather than rejecting', async () => {
		stubFetch(new Error('network down'))
		const result = await retireFirstRunWizard(makePage())
		expect(result).toEqual({ status: -1, installed: true, cleared: false })
	})

	it('tolerates a page with no OC global', async () => {
		delete globalThis.OC
		const calls = stubFetch(200)
		await expect(retireFirstRunWizard(makePage())).resolves.toHaveProperty('cleared', true)
		expect(calls[0].init.headers.requesttoken).toBe('')
	})

	it('accepts a route override', async () => {
		const calls = stubFetch(200)
		await retireFirstRunWizard(makePage(), { route: '/custom/wizard' })
		expect(calls[0].url).toBe('/custom/wizard')
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
