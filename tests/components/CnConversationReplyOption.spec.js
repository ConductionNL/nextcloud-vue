/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reply box as DqZaakContact draws it: a line beside its label saying
 * where the answer goes, and a switch under it ("Log as a contact moment on
 * this case") whose state travels with the reply to the app's action.
 *
 * @spec openspec/changes/conversation-reply-option/specs/conversation-source/spec.md#requirement-a-reply-can-carry-a-hint-and-an-option
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationThread from '../../src/components/CnConversationThread/CnConversationThread.vue'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(async () => ({ data: {} })) } }))

const OPTION = { label: 'Log as a contact moment on this case', key: 'logContactMoment', value: true }

describe('CnConversationThread reply hint and option', () => {
	it('draws the hint beside the label and the option on by default', () => {
		const w = mount(CnConversationThread, { props: { messages: [], replyHint: 'Goes to the message box in the portal', replyOption: OPTION } })
		expect(w.find('[data-testid="cn-conversation-reply-hint"]').text()).toBe('Goes to the message box in the portal')
		const option = w.find('[data-testid="cn-conversation-reply-option"] input')
		expect(option.element.checked).toBe(true)
		expect(w.find('[data-testid="cn-conversation-reply-option"]').text()).toContain('Log as a contact moment on this case')
	})

	it('sends the option state with the text', async () => {
		const w = mount(CnConversationThread, { props: { messages: [], replyOption: OPTION } })
		await w.find('textarea').setValue('Hello')
		await w.find('[data-testid="cn-conversation-reply-option"] input').setValue(false)
		await w.find('form').trigger('submit')
		expect(w.emitted('send')[0]).toEqual(['Hello', { logContactMoment: false }])
	})

	it('sends no option and draws none without one', async () => {
		const w = mount(CnConversationThread, { props: { messages: [] } })
		expect(w.find('[data-testid="cn-conversation-reply-option"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-conversation-reply-hint"]').exists()).toBe(false)
		await w.find('textarea').setValue('Hello')
		await w.find('form').trigger('submit')
		expect(w.emitted('send')[0]).toEqual(['Hello', {}])
	})
})

describe('CnConversationWidget reply option', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('passes the option to the reply action, in its args and its props', async () => {
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: [] }) }))
		const dispatch = jest.fn(async () => true)
		const w = mount(CnConversationWidget, {
			props: {
				content: {
					source: { register: 'r', schema: 'm', filter: { case: '@objectId' } },
					replyHint: 'Goes to the message box in the portal',
					replyOption: OPTION,
					replyAction: { type: 'open-modal', target: 'PortalMessageDialog', props: { caseId: '@objectId' } },
				},
				objectId: 'case-1',
				objectData: { id: 'case-1' },
			},
			global: { provide: { cnTranslate: (key) => key, cnDispatchAction: dispatch }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
		})
		await flushPromises()
		expect(w.find('[data-testid="cn-conversation-reply-hint"]').text()).toBe('Goes to the message box in the portal')
		await w.find('textarea').setValue('We sent it.')
		await w.find('form').trigger('submit')
		await flushPromises()
		const action = dispatch.mock.calls[0][0]
		expect(action.args).toEqual([{ text: 'We sent it.', objectId: 'case-1', logContactMoment: true }])
		expect(action.props).toEqual({ caseId: 'case-1', text: 'We sent it.', logContactMoment: true })
	})
})

describe('CnConversationThread reply row (board DqZaakContact)', () => {
	it('draws the option and the buttons in one row, Send with its icon', () => {
		const w = mount(CnConversationThread, { props: { messages: [], replyOption: OPTION } })
		const foot = w.find('.cn-conversation-thread__reply-foot')
		expect(foot.exists()).toBe(true)
		expect(foot.find('[data-testid="cn-conversation-reply-option"]').exists()).toBe(true)
		expect(foot.find('[data-testid="cn-conversation-send"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-conversation-send"] .send-icon').exists()).toBe(true)
	})
})
