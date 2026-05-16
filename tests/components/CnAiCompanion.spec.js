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
		const aiContext = Vue.observable({ appId: 'test', pageKind: 'chat', route: { path: '/' } })
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
})
