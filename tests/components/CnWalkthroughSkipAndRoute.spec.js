/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnWalkthrough item-7 fixes (ADR-062):
 *  - the coachmark "Skip" ENDS the tour (persists completion), never advances;
 *  - a first-visit tour whose first step is page-anchored only auto-opens on
 *    that page — deep-linking onto another route defers it.
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
 * A CENTERED first step is not page-anchored, whatever it targets.
 *
 * `placement: 'center'` renders a card in the middle of the screen and
 * spotlights nothing — `locateTarget()` returns early on `isCentered` and never
 * resolves the target. Gating auto-start on that step's route therefore asks
 * the user to stand somewhere the step will not point at, and the tour is
 * parked in `_pendingAutoTour` instead of opening.
 *
 * Measured 2026-08-27, one instance, same user, empty seen-state: opencatalogi
 * anchored its centered welcome to `Catalogs` and pipelinq to `Products`, so
 * neither tour appeared on the landing page; dossiq anchored to `Dashboard` and
 * worked. 19 of 20 fleet manifests declare a walkthrough.
 */
const centeredSteps = [
	{ id: 'welcome', sinceVersion: '1.0.0', title: 'Welcome', body: 'Hi', placement: 'center', target: { kind: 'page', ref: 'Products' }, advanceOn: { type: 'manual' } },
	{ id: 'next', sinceVersion: '1.0.0', title: 'Next', target: { kind: 'page', ref: 'Products' }, advanceOn: { type: 'manual' } },
]

function centeredManifest() {
	return { version: '1.0.0', walkthrough: { enabled: true, version: 1, tours: [{ id: 'getting-started', trigger: 'first-visit', steps: centeredSteps }] } }
}

describe('CnWalkthrough — a centered first step does not gate on a route', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	it('auto-opens on an UNRELATED route when the first step is centered', async () => {
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: { appId: 'centered-app', manifest: centeredManifest() },
			mocks: { $router: router, $route: { name: 'Dashboard', params: {} } },
		})
		await w.vm.$nextTick()
		// Landing route is `Dashboard`; the centered welcome names `Products`.
		// It spotlights nothing, so it must still open here.
		expect(w.vm.active).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
		expect(w.vm._pendingAutoTour).toBeFalsy()
	})

	it('firstStepPage() returns null for a centered first step', async () => {
		const w = mount(CnWalkthrough, { propsData: { appId: 'centered-app-2', manifest: centeredManifest() } })
		await w.vm.$nextTick()
		expect(w.vm.firstStepPage({ steps: centeredSteps })).toBeNull()
	})

	it('CONTROL: the same target WITHOUT placement:center still defers off-route', async () => {
		// Identical tour, one property removed. If this also auto-opened, the
		// change would have deleted ADR-062's deep-link guard rather than
		// scoping it to steps that spotlight nothing.
		const nonCentered = centeredSteps.map((s, i) => (i === 0 ? { ...s, placement: undefined } : s))
		const router = fakeRouter()
		const w = mount(CnWalkthrough, {
			propsData: {
				appId: 'control-app',
				manifest: { version: '1.0.0', walkthrough: { enabled: true, version: 1, tours: [{ id: 'getting-started', trigger: 'first-visit', steps: nonCentered }] } },
			},
			mocks: { $router: router, $route: { name: 'Dashboard', params: {} } },
		})
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(false)
		expect(w.vm._pendingAutoTour).toBeTruthy()
	})
})
