/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAiChatPanel: the sessions menu leads with the sessions about the page's
 * file or record, and the titlebar lists and removes the open session's links.
 *
 * @spec openspec/changes/ai-chat-sessions-about-the-page/specs/ai-companion/spec.md
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

const axios = require('@nextcloud/axios').default
const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default

const streamState = {
	isStreaming: false,
	currentText: '',
	toolCalls: [],
	error: null,
	messages: [],
	conversationUuid: null,
}

const stubs = {
	NcActionButton: {
		name: 'NcActionButton',
		props: ['ariaLabel', 'disabled'],
		template: '<button class="stub-action-btn" :aria-label="ariaLabel" @click="$emit(\'click\', $event)"><slot /></button>',
	},
	CnAiMessageList: { name: 'CnAiMessageList', template: '<div />' },
	CnAiInput: { name: 'CnAiInput', methods: { focus() {} }, template: '<div />' },
	CnAiHistoryList: { name: 'CnAiHistoryList', template: '<div />' },
}

const fileLink = { type: 'file', id: '24753', label: 'subsidiebesluit.docx' }
const recent = [{ uuid: 'r1', title: 'Recent one', links: [] }]
const about = [
	{ uuid: 's1', title: 'About the decision', links: [fileLink] },
	{ uuid: 's2', title: 'Second about it', links: [fileLink, { type: 'object', id: 'obj-1', label: 'Alice' }] },
]

/**
 * Serve the unscoped list, and the scoped list when the request names a link.
 *
 * @param {object} [options] What the scoped request answers.
 * @param {Array<object>} [options.scoped] Sessions about the page.
 * @param {boolean} [options.fail] Fail the scoped request.
 * @return {void}
 */
function serve({ scoped = about, fail = false } = {}) {
	axios.get.mockImplementation((url, config = {}) => {
		const params = config.params || {}
		if (params.linkedType) {
			return fail
				? Promise.reject(new Error('boom'))
				: Promise.resolve({ data: { results: scoped, scope: { type: params.linkedType, id: params.linkedId, label: 'subsidiebesluit.docx' } } })
		}
		return Promise.resolve({ data: { results: String(url).endsWith('/agents') ? [] : recent } })
	})
}

function mountPanel(context) {
	return mount(CnAiChatPanel, {
		propsData: { visible: true, streamState, ...(context ? { context } : {}) },
		provide: { cnTranslate: (key, vars) => (vars && vars.label ? key.replace('{label}', vars.label) : key) },
		stubs,
	})
}

function flushPromises() {
	return new Promise((resolve) => setTimeout(resolve, 0))
}

function sessionsMenu(wrapper) {
	return wrapper.find('[data-testid="cn-ai-panel-sessions"]')
}

describe('CnAiChatPanel sessions about the page', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.delete.mockReset()
		axios.delete.mockImplementation(() => Promise.resolve({ data: {} }))
	})

	it('leads the sessions menu with the sessions about the open file, headed with its label', async () => {
		serve()
		const wrapper = mountPanel({ appId: 'files', pageKind: 'file', fileId: 24753 })
		await flushPromises()

		const scopedCall = axios.get.mock.calls.find(([, config]) => config && config.params && config.params.linkedType)
		expect(scopedCall[1].params).toEqual({ limit: 50, linkedType: 'file', linkedId: '24753' })

		const menu = sessionsMenu(wrapper)
		expect(menu.find('[data-testid="cn-ai-panel-sessions-caption"]').attributes('name')).toBe('Sessions about subsidiebesluit.docx')
		expect(menu.text()).toContain('About the decision')
		expect(menu.text()).toContain('Second about it')
		expect(menu.text()).not.toContain('Recent one')
		expect(menu.text()).toContain('View all conversations')
	})

	it('names a record by its uuid when there is no file', async () => {
		serve()
		mountPanel({ appId: 'pipelinq', pageKind: 'detail', objectUuid: 'obj-1' })
		await flushPromises()

		const scopedCall = axios.get.mock.calls.find(([, config]) => config && config.params && config.params.linkedType)
		expect(scopedCall[1].params).toEqual({ limit: 50, linkedType: 'object', linkedId: 'obj-1' })
	})

	it('keeps the unscoped list on a page without a file or record, and asks for no scope', async () => {
		serve()
		const wrapper = mountPanel()
		await flushPromises()

		expect(axios.get.mock.calls.some(([, config]) => config && config.params && config.params.linkedType)).toBe(false)
		const menu = sessionsMenu(wrapper)
		expect(menu.find('[data-testid="cn-ai-panel-sessions-caption"]').attributes('name')).toBe('Recent conversations')
		expect(menu.text()).toContain('Recent one')
	})

	it('keeps the unscoped list when nothing is about the page, rather than an empty filtered list', async () => {
		serve({ scoped: [] })
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()

		expect(sessionsMenu(wrapper).find('[data-testid="cn-ai-panel-sessions-caption"]').attributes('name')).toBe('Recent conversations')
		expect(sessionsMenu(wrapper).text()).toContain('Recent one')
	})

	it('keeps the unscoped list when the scoped request fails', async () => {
		serve({ fail: true })
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()

		expect(wrapper.vm.showScopedSessions).toBe(false)
		expect(sessionsMenu(wrapper).text()).toContain('Recent one')
	})

	it('asks again when the page moves to another file', async () => {
		serve()
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()
		await wrapper.setProps({ context: { fileId: '99' } })
		await flushPromises()

		const ids = axios.get.mock.calls
			.filter(([, config]) => config && config.params && config.params.linkedType)
			.map(([, config]) => config.params.linkedId)
		expect(ids).toEqual(['24753', '99'])
	})
})

describe('CnAiChatPanel session links in the titlebar', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.delete.mockReset()
		axios.delete.mockImplementation(() => Promise.resolve({ data: {} }))
	})

	it('offers no session settings before a session is open', async () => {
		serve()
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-ai-panel-session-links"]').exists()).toBe(false)
	})

	it('lists the open session\'s links by label', async () => {
		serve()
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()
		wrapper.vm.onConversationSelect('s2')
		await wrapper.vm.$nextTick()

		const entry = wrapper.find('[data-testid="cn-ai-panel-session-links"]')
		expect(entry.exists()).toBe(true)
		const buttons = entry.findAll('[data-testid="cn-ai-panel-session-link-remove"]')
		expect(buttons.map((b) => b.text())).toEqual(['subsidiebesluit.docx', 'Alice'])
		expect(buttons[0].attributes('aria-label')).toBe('Remove subsidiebesluit.docx from this session')
	})

	it('says so when the open session is linked to nothing', async () => {
		serve()
		const wrapper = mountPanel()
		await flushPromises()
		wrapper.vm.onConversationSelect('r1')
		await wrapper.vm.$nextTick()

		const entry = wrapper.find('[data-testid="cn-ai-panel-session-links"]')
		expect(entry.findAll('[data-testid="cn-ai-panel-session-link-remove"]')).toHaveLength(0)
		expect(entry.html()).toContain('This session is not linked to anything')
	})

	it('removes a link and drops the session from the list about that file', async () => {
		serve()
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()
		wrapper.vm.onConversationSelect('s1')
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-ai-panel-session-link-remove"]').trigger('click')
		await flushPromises()

		expect(axios.delete).toHaveBeenCalledWith('/apps/hermiq/api/sessions/s1/links', { params: { type: 'file', id: '24753' } })
		expect(wrapper.vm.scopedConversations.map((c) => c.uuid)).toEqual(['s2'])
		expect(sessionsMenu(wrapper).text()).not.toContain('About the decision')
	})

	it('keeps the session in the scoped list when another link is removed', async () => {
		serve()
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()
		wrapper.vm.onConversationSelect('s2')
		await wrapper.vm.$nextTick()

		await wrapper.findAll('[data-testid="cn-ai-panel-session-link-remove"]')[1].trigger('click')
		await flushPromises()

		expect(wrapper.vm.scopedConversations.map((c) => c.uuid)).toEqual(['s1', 's2'])
		expect(wrapper.vm.activeConversationLinks).toEqual([fileLink])
	})

	it('shows that a removal failed and keeps the link', async () => {
		serve()
		axios.delete.mockImplementation(() => Promise.reject(new Error('403')))
		const wrapper = mountPanel({ fileId: '24753' })
		await flushPromises()
		wrapper.vm.onConversationSelect('s1')
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-ai-panel-session-link-remove"]').trigger('click')
		await flushPromises()

		expect(wrapper.vm.linkRemoveError).toBe(true)
		expect(wrapper.vm.activeConversationLinks).toEqual([fileLink])
		expect(wrapper.find('[data-testid="cn-ai-panel-session-links"]').html()).toContain('Could not remove the link')
	})
})
