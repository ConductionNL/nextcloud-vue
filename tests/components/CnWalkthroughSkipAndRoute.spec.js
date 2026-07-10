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
