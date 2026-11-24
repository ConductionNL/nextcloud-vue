/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAiChatPanel shows what a turn is about as a removable chip, and sends
 * that scope with every turn until the chip is removed.
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
	CnAiMessageList: { name: 'CnAiMessageList', template: '<div />' },
	CnAiInput: { name: 'CnAiInput', methods: { focus() {} }, template: '<div />' },
	CnAiHistoryList: { name: 'CnAiHistoryList', template: '<div />' },
}

function mountPanel(context) {
	return mount(CnAiChatPanel, {
		propsData: { visible: true, streamState, context },
		provide: { cnTranslate: (key) => key },
		stubs,
	})
}

function chip(wrapper) {
	return wrapper.find('[data-testid="cn-ai-panel-scope"]')
}

function send(wrapper) {
	wrapper.findComponent({ name: 'CnAiInput' }).vm.$emit('send', { text: 'When is delivery?', attachments: [] })
	const events = wrapper.emitted('send')
	return events[events.length - 1]
}

describe('CnAiChatPanel turn scope', () => {
	it('shows "About this document" on a document page and sends the scope', () => {
		const w = mountPanel({ appId: 'filinq', pageKind: 'document', fileId: '24753' })
		expect(chip(w).text()).toBe('About this document')
		expect(send(w)[3]).toEqual({ type: 'file', fileId: 24753 })
	})

	it('shows "About this folder" on a folder page', () => {
		const w = mountPanel({ appId: 'filinq', pageKind: 'folder', fileId: 12 })
		expect(chip(w).text()).toBe('About this folder')
		expect(send(w)[3]).toEqual({ type: 'folder', fileId: 12 })
	})

	it('shows no chip and sends no scope on a page about no file', () => {
		const w = mountPanel({ appId: 'dossiq', pageKind: 'index' })
		expect(chip(w).exists()).toBe(false)
		expect(send(w)[3]).toBeNull()
	})

	it('sends the next turns unscoped once the chip is removed', async () => {
		const w = mountPanel({ appId: 'filinq', pageKind: 'document', fileId: 7 })
		await w.find('[data-testid="cn-ai-panel-scope-remove"]').trigger('click')
		expect(chip(w).exists()).toBe(false)
		expect(send(w)[3]).toBeNull()
	})

	it('brings the chip back when the page moves to another file', async () => {
		const w = mountPanel({ appId: 'filinq', pageKind: 'document', fileId: 7 })
		await w.find('[data-testid="cn-ai-panel-scope-remove"]').trigger('click')
		await w.setProps({ context: { appId: 'filinq', pageKind: 'document', fileId: 8 } })
		expect(chip(w).exists()).toBe(true)
		expect(send(w)[3]).toEqual({ type: 'file', fileId: 8 })
	})
})
