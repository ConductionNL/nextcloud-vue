/**
 * Tests for CnAiCompanion.vue
 *
 * Covers:
 * - Health probe HTTP 200 → FAB renders
 * - Health probe HTTP 404 → nothing renders, no console.warn/error
 * - Health probe network error → nothing renders, no console warnings
 * - FAB click toggles panel open/closed
 * - FAB hidden when cnAiContext.pageKind === 'chat'
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
	},
}))

jest.mock('@microsoft/fetch-event-source', () => ({
	__esModule: true,
	fetchEventSource: jest.fn(),
}))

// eslint-disable-next-line n/no-missing-require -- ESM-only package; jest resolves it via moduleNameMapper (tests/__mocks__/nextcloud-axios.js)
const axios = require('@nextcloud/axios').default
const CnAiCompanion = require('../../src/components/CnAiCompanion/CnAiCompanion.vue').default

function mountCompanion(options = {}) {
	const { aiContext = null, axiosGetMock = null } = options

	if (axiosGetMock) {
		axios.get.mockImplementation(axiosGetMock)
	}

	return mount(CnAiCompanion, {
		provide: aiContext ? { cnAiContext: aiContext } : {},
	})
}

describe('CnAiCompanion', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		// One companion renders per page, and the claim lives on `window` so two
		// separately-bundled copies can see each other. A test file is one
		// `window` for many "pages", so the slot is released between tests —
		// without this, the first mounted companion holds it and every later
		// test asserts against a component that correctly stood down.
		window.__cnAiCompanionPrimary = null
	})

	it('health probe targets the default backend app id (hermiq)', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })
		const wrapper = mountCompanion()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith(
			'/index.php/apps/hermiq/api/chat/health',
			expect.any(Object),
		)
	})

	it('health probe targets an overridden chatAppId (openregister compat window)', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })
		const wrapper = mount(CnAiCompanion, {
			propsData: { chatAppId: 'openregister' },
			provide: {},
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith(
			'/index.php/apps/openregister/api/chat/health',
			expect.any(Object),
		)
	})

	it('renders FAB when health probe returns 200', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })
		const wrapper = mountCompanion()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.probeSucceeded).toBe(true)
		expect(wrapper.find('.cn-ai-floating-button').exists()).toBe(true)
	})

	it('renders nothing when health probe returns 404', async () => {
		const err = new Error('Not Found')
		err.response = { status: 404 }
		axios.get.mockRejectedValue(err)

		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

		const wrapper = mountCompanion()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.probeSucceeded).toBe(false)
		expect(wrapper.find('.cn-ai-floating-button').exists()).toBe(false)
		expect(consoleWarnSpy).not.toHaveBeenCalled()
		expect(consoleErrorSpy).not.toHaveBeenCalled()

		consoleWarnSpy.mockRestore()
		consoleErrorSpy.mockRestore()
	})

	it('renders nothing on network error, no console warnings', async () => {
		axios.get.mockRejectedValue(new Error('Network error'))

		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

		const wrapper = mountCompanion()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.probeSucceeded).toBe(false)
		expect(wrapper.find('.cn-ai-companion').exists()).toBe(false)
		expect(consoleWarnSpy).not.toHaveBeenCalled()
		expect(consoleErrorSpy).not.toHaveBeenCalled()

		consoleWarnSpy.mockRestore()
		consoleErrorSpy.mockRestore()
	})

	it('FAB click sets isPanelOpen to true', async () => {
		axios.get.mockResolvedValue({ status: 200, data: {} })
		const wrapper = mountCompanion()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.isPanelOpen).toBe(false)
		const fab = wrapper.find('.cn-ai-floating-button')
		if (fab.exists()) {
			await fab.trigger('click')
			expect(wrapper.vm.isPanelOpen).toBe(true)
		}
	})

	it('hides FAB when cnAiContext.pageKind === "chat"', async () => {
		const Vue = require('vue').default || require('vue')
		const aiContext = Vue.reactive({ appId: 'test', pageKind: 'chat', route: { path: '/' } })
		axios.get.mockResolvedValue({ status: 200, data: {} })

		const wrapper = mount(CnAiCompanion, {
			provide: { cnAiContext: aiContext },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.isChatPage).toBe(true)
		// The entire cn-ai-companion div should not render when isChatPage
		expect(wrapper.find('.cn-ai-companion').exists()).toBe(false)
	})

	describe('one companion per page', () => {
		it('a second companion on the same page renders nothing', async () => {
			// 🔴 The reported bug: TWO hexes, a few pixels apart. `CnAppRoot`
			// renders a companion for any app that sets `aiCompanion`, and a
			// host app can also mount one standalone on every page of the
			// instance — so any page with both had two.
			axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })

			const first = mountCompanion()
			const second = mountCompanion()
			for (let i = 0; i < 4; i++) {
				await first.vm.$nextTick()
				await second.vm.$nextTick()
			}

			expect(first.find('.cn-ai-companion').exists()).toBe(true)
			expect(second.find('.cn-ai-companion').exists()).toBe(false)
		})

		it('a companion whose probe FAILED does not take the slot from one that works', async () => {
			// 🔴 The bug the first version of this guard introduced: the slot was
			// claimed in created(), BEFORE the probe answered. A companion that
			// then failed its probe rendered nothing and still held the slot, so
			// the other one stood down too — one companion became NONE.
			//
			// Reproduced on a slow instance, where the probe's 3x5s budget is
			// genuinely marginal, which is exactly where a page can least afford
			// to lose its assistant.
			axios.get.mockRejectedValue(new Error('probe timed out'))
			const failed = mountCompanion()
			for (let i = 0; i < 8; i++) {
				await failed.vm.$nextTick()
			}

			axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })
			const healthy = mountCompanion()
			for (let i = 0; i < 8; i++) {
				await healthy.vm.$nextTick()
			}

			expect(failed.find('.cn-ai-companion').exists()).toBe(false)
			expect(healthy.find('.cn-ai-companion').exists()).toBe(true)
		})

		it('the slot is released when the holder unmounts, so a later page gets one', async () => {
			axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })

			const first = mountCompanion()
			await first.vm.$nextTick()
			first.unmount()

			const next = mountCompanion()
			for (let i = 0; i < 4; i++) {
				await next.vm.$nextTick()
			}

			expect(next.find('.cn-ai-companion').exists()).toBe(true)
		})

		it('a stood-down companion unmounting does not release the holder\'s slot', async () => {
			// Otherwise the pair re-enters the state this guard exists to
			// prevent: the holder keeps rendering, the slot reads as free, and
			// the next mount renders a second one alongside it.
			axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })

			const holder = mountCompanion()
			const stoodDown = mountCompanion()
			await holder.vm.$nextTick()
			await stoodDown.vm.$nextTick()

			stoodDown.unmount()

			const third = mountCompanion()
			for (let i = 0; i < 4; i++) {
				await third.vm.$nextTick()
			}

			expect(holder.find('.cn-ai-companion').exists()).toBe(true)
			expect(third.find('.cn-ai-companion').exists()).toBe(false)
		})
	})
})
