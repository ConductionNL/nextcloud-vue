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

describe('the ai-chat widget in a titled card (DqZaakAssistent "Assistent")', () => {
	const streamState = { messages: [], currentText: '', isStreaming: false, conversationUuid: null, error: null }
	const { isContentOnlyWidgetDef } = require('../../src/utils/widgetDispatch.js')

	it('is drawn by the host in its titled card', () => {
		expect(isContentOnlyWidgetDef({ type: 'ai-chat' })).toBe(true)
	})

	it('reports the pill and the panel\'s controls for the card', async () => {
		const wrapper = mount(CnAiChatWidget, { propsData: { content: { chatAppId: 'hermiq', pill: 'Hermiq', note: 'Sees only this case' } }, provide: {} })
		await flushPromises()
		const companion = wrapper.findComponent(CnAiCompanion)
		expect(companion.props('titled')).toBe(true)
		expect(companion.props('note')).toBe('Sees only this case')
		const first = wrapper.emitted('header')[0][0]
		expect(first.pill).toEqual({ label: 'Hermiq', variant: 'purple' })
		const run = jest.fn()
		companion.vm.$emit('menu', [{ label: 'Start new chat', icon: 'Plus', run }])
		const last = wrapper.emitted('header').at(-1)[0]
		expect(last.menuActions.map((action) => action.label)).toEqual(['Start new chat'])
	})

	it('draws no titlebar, hands its controls to the card and says what it sees', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, titled: true, note: 'Sees only this case', sendLabel: 'Ask', inputPlaceholder: 'Ask about this case', streamState }, provide: {} })
		await flushPromises()
		expect(wrapper.find('.cn-ai-chat-window__titlebar').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-ai-panel"]').classes()).toContain('cn-ai-chat-window--titled')
		expect(wrapper.find('[data-testid="cn-ai-panel-note"]').text()).toBe('Sees only this case')
		expect(wrapper.find('[data-testid="cn-ai-input-send"]').text()).toBe('Ask')
		expect(wrapper.find('[data-testid="cn-ai-input-textarea"]').attributes('placeholder')).toBe('Ask about this case')
		const labels = wrapper.emitted('menu').at(-1)[0].map((action) => action.label)
		expect(labels).toContain('View all conversations')
		wrapper.emitted('menu').at(-1)[0].find((action) => action.label === 'View all conversations').run()
		await flushPromises()
		expect(wrapper.emitted('menu').at(-1)[0].map((action) => action.label)).toContain('Back to the chat')
	})

	it('keeps its titlebar and reports no menu when it is not titled', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, streamState }, provide: {} })
		await flushPromises()
		expect(wrapper.find('.cn-ai-chat-window__titlebar').exists()).toBe(true)
		expect(wrapper.emitted('menu')).toBeUndefined()
	})
})

describe('the assistant as a board side card (DqZaakAssistent r25e)', () => {
	const fs = require('fs')
	const path = require('path')
	const streamState = { messages: [], currentText: '', isStreaming: false, conversationUuid: null, error: null }
	const detail = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('stacks the input in a titled panel: box and send on a line, tools under it', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, titled: true, sendLabel: 'Ask', streamState }, provide: {} })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-ai-input"]').classes()).toContain('cn-ai-input--stacked')
	})

	it('keeps the one-line input outside a card', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, streamState }, provide: {} })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-ai-input"]').classes()).not.toContain('cn-ai-input--stacked')
	})

	it('titles the side card as a panel and shows its pill', () => {
		expect(detail).toContain('.cn-look-board .cn-detail-page__side .cn-widget-wrapper:has(.cn-ai-chat-widget) .cn-widget-wrapper__actions:has(.cn-detail-widget-header-items) {\n\tdisplay: flex;')
		expect(detail).toMatch(/:has\(\.cn-ai-chat-widget\) \.cn-widget-wrapper__title \{[^}]*font-weight: 700;/)
		expect(detail).toMatch(/:has\(\.cn-ai-chat-widget\) > \.cn-widget-wrapper__header \{[^}]*padding: 16px 18px;/)
	})
})

describe('the approval card\'s wording from the widget (DqZaakAssistent "Voorstel: taak aanmaken")', () => {
	const approval = { id: 'a1', kind: 'toolcall', title: 'Task create', app: 'dossiq', reach: 'user', reason: 'Taak Offerte beoordelen', agentId: 'g1', resolveUrl: '/index.php/apps/hermiq/api/approvals/a1/resolve' }
	const streamState = { messages: [], currentText: '', isStreaming: false, conversationUuid: 's1', error: null, pendingApprovals: [approval] }

	it('prefixes the title and words the buttons as the widget says', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, streamState, approvalWording: { titlePrefix: 'Voorstel:', allow: 'Uitvoeren', deny: 'Niet doen' } }, provide: {} })
		await flushPromises()
		expect(wrapper.find('.cn-ai-approval__title').text()).toBe('Voorstel: Task create')
		expect(wrapper.find('[data-testid="cn-ai-approval-allow-a1"]').text()).toBe('Uitvoeren')
		expect(wrapper.find('[data-testid="cn-ai-approval-deny-a1"]').text()).toBe('Niet doen')
	})

	it('keeps the catalogue name and Allow / Decline without wording', async () => {
		const wrapper = mount(CnAiChatPanel, { propsData: { visible: true, embedded: true, streamState }, provide: {} })
		await flushPromises()
		expect(wrapper.find('.cn-ai-approval__title').text()).toBe('Task create')
		expect(wrapper.find('[data-testid="cn-ai-approval-allow-a1"]').text()).toBe('Allow')
		expect(wrapper.find('[data-testid="cn-ai-approval-deny-a1"]').text()).toBe('Decline')
	})

	it('hands the manifest\'s wording, translated, through the companion to the panel', async () => {
		const cnTranslate = (text) => ({ 'Voorstel:': 'Proposal:' })[text] || text
		const wrapper = mount(CnAiChatWidget, { propsData: { content: { approvalTitlePrefix: 'Voorstel:', allowLabel: 'Uitvoeren', denyLabel: 'Niet doen' } }, provide: { cnTranslate } })
		await flushPromises()
		const expected = { titlePrefix: 'Proposal:', allow: 'Uitvoeren', deny: 'Niet doen' }
		expect(wrapper.findComponent(CnAiCompanion).props('approvalWording')).toEqual(expected)
		expect(wrapper.findComponent(CnAiChatPanel).props('approvalWording')).toEqual(expected)
	})
})
