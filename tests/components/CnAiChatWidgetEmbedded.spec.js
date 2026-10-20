/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The AI Chat Companion embedded in the page (`embedded`, and the `ai-chat`
 * widget over it): the same companion and window, always open, without the
 * launcher hex, and without taking the page's single floating-companion slot
 * (DqZaakAssistent draws the assistant as a tab).
 */
import { flushPromises, mount } from '@vue/test-utils'

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
const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default
const CnAiChatWidget = require('../../src/components/CnAiCompanion/CnAiChatWidget.vue').default
const { __resetAppInstalledCacheForTests } = require('../../src/utils/appInstalled.js')
const { DASHBOARD_CATALOG_WIDGET_KEYS } = require('../../src/utils/libraryWidgetKeys.js')

let savedAppsWebRoots
beforeEach(() => {
	jest.clearAllMocks()
	savedAppsWebRoots = window.OC.appswebroots
	window.OC.appswebroots = { hermiq: '/apps/hermiq' }
	__resetAppInstalledCacheForTests()
	window.__cnAiCompanionPrimary = null
	axios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } })
})
afterEach(() => {
	window.OC.appswebroots = savedAppsWebRoots
	__resetAppInstalledCacheForTests()
	window.__cnAiCompanionPrimary = null
})

describe('CnAiCompanion embedded', () => {
	it('renders the window open, in the page, without the launcher', async () => {
		const wrapper = mount(CnAiCompanion, { propsData: { embedded: true }, provide: {} })
		await flushPromises()

		expect(wrapper.find('.cn-ai-floating-button').exists()).toBe(false)
		const panel = wrapper.findComponent(CnAiChatPanel)
		expect(panel.props('visible')).toBe(true)
		expect(panel.props('embedded')).toBe(true)
		expect(wrapper.find('[data-testid="cn-ai-companion-embedded"]').exists()).toBe(true)
	})

	it('leaves the page\'s floating-companion slot free', async () => {
		mount(CnAiCompanion, { propsData: { embedded: true }, provide: {} })
		await flushPromises()
		expect(window.__cnAiCompanionPrimary).toBeNull()

		const floating = mount(CnAiCompanion, { provide: {} })
		await flushPromises()
		expect(floating.vm.isPrimaryCompanion).toBe(true)
		expect(floating.find('.cn-ai-floating-button').exists()).toBe(true)
	})

	it('renders nothing when the chat backend does not answer', async () => {
		axios.get.mockRejectedValue(Object.assign(new Error('down'), { response: { status: 503 } }))
		jest.spyOn(console, 'info').mockImplementation(() => {})
		const wrapper = mount(CnAiCompanion, { propsData: { embedded: true }, provide: {} })
		await flushPromises()
		await new Promise((resolve) => setTimeout(resolve, 2400))
		await flushPromises()
		expect(wrapper.findComponent(CnAiChatPanel).exists()).toBe(false)
	}, 10000)
})

describe('CnAiChatPanel embedded', () => {
	const streamState = { messages: [], currentText: '', isStreaming: false, conversationUuid: null, error: null }

	it('is a region in the page: no position, no close button, Escape keeps it', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, streamState }, provide: {} })
		await flushPromises()
		const win = wrapper.find('[data-testid="cn-ai-panel"]')
		expect(win.classes()).toContain('cn-ai-chat-window--embedded')
		expect(win.classes()).not.toContain('cn-ai-chat-window--bottom-right')
		expect(win.attributes('role')).toBe('region')
		expect(wrapper.find('[data-testid="cn-ai-panel-close"]').exists()).toBe(false)
		await win.trigger('keydown', { key: 'Escape' })
		expect(wrapper.emitted('close')).toBeUndefined()
	})

	it('stays a dialog anchored to the launcher when floating', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, streamState }, provide: {} })
		await flushPromises()
		const win = wrapper.find('[data-testid="cn-ai-panel"]')
		expect(win.classes()).toContain('cn-ai-chat-window--bottom-right')
		expect(win.attributes('role')).toBe('dialog')
		expect(wrapper.find('[data-testid="cn-ai-panel-close"]').exists()).toBe(true)
	})
})

describe('the ai-chat widget', () => {
	it('mounts the companion embedded, on the backend the content names', async () => {
		const wrapper = mount(CnAiChatWidget, { propsData: { content: { chatAppId: 'hermiq' } }, provide: {} })
		await flushPromises()
		const companion = wrapper.findComponent(CnAiCompanion)
		expect(companion.props('embedded')).toBe(true)
		expect(companion.props('chatAppId')).toBe('hermiq')
	})

	it('is a library widget key', () => {
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('ai-chat')
	})
})
