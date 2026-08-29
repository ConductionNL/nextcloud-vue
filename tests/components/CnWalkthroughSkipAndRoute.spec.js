/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnWalkthrough item-7 fixes (ADR-062):
 *  - the coachmark "Skip" ENDS the tour (persists completion), never advances;
 *  - a first-visit tour whose first step SPOTLIGHTS something on a page only
 *    auto-opens on that page — deep-linking onto another route defers it;
 *  - but a `placement: "center"` first step spotlights nothing, so it is never
 *    route-gated. That last one is a regression guard: the gate did not check
 *    `placement`, so a welcome card anchored to any route other than the app's
 *    landing route was deferred and never opened — silently, with no error.
 *    Measured across the fleet as opencatalogi (anchored `Catalogs`) and
 *    pipelinq (anchored `Products`) showing no walkthrough at `#/` while
 *    dossiq (anchored to its landing `Dashboard`) worked.
 */
const { mount } = require('@vue/test-utils')
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const steps = [
	{ id: 'welcome', sinceVersion: '1.0.0', title: 'Welcome', body: 'Hi', target: { kind: 'page', ref: 'Home' }, advanceOn: { type: 'manual' } },
	{ id: 'next', sinceVersion: '1.0.0', title: 'Next', target: { kind: 'page', ref: 'Home' }, advanceOn: { type: 'manual' } },
]

function manifest() {
	return { version: '1.0.0', walkthrough: { enabled: true, version: 1, tours: [{ id: 'getting-started', trigger: 'first-visit', steps }] } }
}

function fakeRouter() {
	return { afterEach: (cb) => { fakeRouter._cb = cb; return () => {} } }
}

describe('CnWalkthrough — skip + route-gated auto-start', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	it('skip() ends the tour (completes) instead of advancing a step', async () => {
		const w = mount(CnWalkthrough, { propsData: { appId: 'skip-app', manifest: manifest() } })
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
		w.vm.skip()
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(false)
		expect(w.emitted('complete')).toBeTruthy()
		expect(w.emitted('dismiss')).toBeTruthy()
	})

	it('defers a page-anchored first-visit tour when deep-linked onto another route', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'route-app', manifest: manifest() },
			mocks: { $router: router, $route: { name: 'SomeDetail', params: {} } },
		})
		await w.vm.$nextTick()
		// Not on the tour's first-step page ('Home') → does not auto-open.
		expect(w.vm.active).toBe(false)
		expect(w.vm._pendingAutoTour).toBeTruthy()
		// User navigates to the start page → the deferred tour opens.
		fakeRouter._cb({ name: 'Home', params: {} })
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
	})

	it('auto-opens immediately when already on the first-step page', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'route-app-2', manifest: manifest() },
			mocks: { $router: router, $route: { name: 'Home', params: {} } },
		})
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
	})
})

/**
 * A centered welcome step is a card in the middle of the screen. It highlights
 * no element, so "is the user on the right page?" is not a question about it —
 * and answering it anyway is what stopped the tour opening at all.
 */
describe('CnWalkthrough — a centered welcome step is never route-gated', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	const centeredManifest = (ref) => ({
		version: '1.0.0',
		walkthrough: {
			enabled: true,
			version: 1,
			tours: [{
				id: 'getting-started',
				trigger: 'first-visit',
				steps: [
					{ id: 'welcome', sinceVersion: '1.0.0', placement: 'center', title: 'Welcome', body: 'Hi', target: { kind: 'page', ref }, advanceOn: { type: 'manual' } },
					{ id: 'next', sinceVersion: '1.0.0', title: 'Next', target: { kind: 'page', ref }, advanceOn: { type: 'manual' } },
				],
			}],
		},
	})

	// The exact shape of the fleet defect: welcome anchored to `Catalogs`, user
	// lands on `Home`. Before the fix this parked in _pendingAutoTour forever.
	it('opens on the landing route even when anchored to a different page', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'centered-app', manifest: centeredManifest('Catalogs') },
			mocks: { $router: router, $route: { name: 'Home', params: {} } },
		})
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
		expect(w.vm._pendingAutoTour).toBeFalsy()
	})

	it('opens on a deep-linked route too — a welcome card has no wrong screen', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'centered-app-2', manifest: centeredManifest('Catalogs') },
			mocks: { $router: router, $route: { name: 'SomeDetail', params: {} } },
		})
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
	})

	it('reports no first-step page for a centered step, whatever it is anchored to', () => {
		const w = mount(CnWalkthrough, { propsData: { appId: 'centered-app-3', manifest: centeredManifest('Catalogs') } })
		const tour = w.vm.manifest.walkthrough.tours[0]
		expect(w.vm.firstStepPage(tour)).toBeNull()
		expect(w.vm.routeMatchesTour(tour, 'AnyRouteAtAll')).toBe(true)
		expect(w.vm.routeMatchesTour(tour, undefined)).toBe(true)
	})

	// The control. ADR-062's actual purpose — not popping a spotlight over the
	// wrong screen — has to survive the fix, or this "fix" is just a revert.
	it('still gates a first step that genuinely spotlights an element', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'spotlight-app', manifest: manifest() },
			mocks: { $router: router, $route: { name: 'SomeDetail', params: {} } },
		})
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(false)
		expect(w.vm._pendingAutoTour).toBeTruthy()
	})
})
