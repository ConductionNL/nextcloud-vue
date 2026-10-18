/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The conversation card on board DqZaakContact: channel chips (All plus one
 * per channel, with counts) that narrow the thread, and a header action
 * ("Contact vastleggen") the app names.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationThread from '../../src/components/CnConversationThread/CnConversationThread.vue'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))

const MESSAGES = [
	{ id: 'm1', side: 'them', author: 'Sanne de Vries', text: 'First', channel: 'Message box' },
	{ id: 'm2', side: 'us', text: 'Second', channel: 'E-mail' },
	{ id: 'm3', side: 'them', author: 'Sanne de Vries', text: 'Third', channel: 'Message box' },
]

const chipTexts = (w) => w.findAll('.cn-quick-filter-bar__tab').map((b) => b.text().replace(/\s+/g, ' '))
const shown = (w) => w.findAll('[data-testid="cn-conversation-message"]').map((m) => m.find('.cn-conversation-thread__text').text())

describe('CnConversationThread channel chips', () => {
	it('draws no chips unless asked', () => {
		const w = mount(CnConversationThread, { props: { messages: MESSAGES } })
		expect(w.findAll('.cn-quick-filter-bar__tab')).toHaveLength(0)
	})

	it('draws All and each channel with its count, the declared ones first', () => {
		const w = mount(CnConversationThread, { props: { messages: MESSAGES, channelFilter: true, channels: ['E-mail', 'Letter'] } })
		expect(chipTexts(w)).toEqual(['All 3', 'E-mail 1', 'Letter 0', 'Message box 2'])
	})

	it('narrows the thread to the chosen channel, and All shows every message again', async () => {
		const w = mount(CnConversationThread, { props: { messages: MESSAGES, channelFilter: true } })
		await w.findAll('.cn-quick-filter-bar__tab')[1].trigger('click')
		expect(shown(w)).toEqual(['First', 'Third'])
		await w.findAll('.cn-quick-filter-bar__tab')[0].trigger('click')
		expect(shown(w)).toEqual(['First', 'Second', 'Third'])
	})

	it('draws a header action beside the title', () => {
		const w = mount(CnConversationThread, {
			props: { messages: MESSAGES, title: 'Conversation' },
			slots: { 'header-actions': '<button class="log">Log contact</button>' },
		})
		expect(w.find('.cn-conversation-thread__header .log').exists()).toBe(true)
	})
})

describe('CnConversationWidget channels and header action', () => {
	const content = {
		title: 'Conversation with the resident',
		field: 'messages',
		directionField: 'direction',
		outValue: 'out',
		channelField: 'medium',
		channelMap: { berichtenbox: 'Message box', email: 'E-mail', letter: 'Letter' },
		channelChips: true,
		headerAction: { label: 'Log contact', type: 'emit', event: 'log-contact' },
	}
	const objectData = {
		messages: [
			{ id: 'a', direction: 'in', medium: 'berichtenbox', text: 'Hi', time: '2026-10-04T10:00:00' },
			{ id: 'b', direction: 'out', medium: 'email', text: 'Hello', time: '2026-10-04T11:00:00' },
		],
	}

	it('offers every mapped channel as a chip, in map order', () => {
		const w = mount(CnConversationWidget, { props: { content, objectData, objectId: 'c1' } })
		expect(chipTexts(w)).toEqual(['All 2', 'Message box 1', 'E-mail 1', 'Letter 0'])
	})

	it('runs the header action with the record id', async () => {
		const dispatch = jest.fn(() => Promise.resolve(true))
		const w = mount(CnConversationWidget, {
			props: { content, objectData, objectId: 'c1' },
			global: { provide: { cnDispatchAction: dispatch } },
		})
		const button = w.find('[data-testid="cn-conversation-header-action"]')
		expect(button.text()).toBe('Log contact')
		await button.trigger('click')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledTimes(1)
		expect(dispatch.mock.calls[0][0]).toMatchObject({ event: 'log-contact', args: [{ objectId: 'c1' }] })
	})

	it('draws no header action without one', () => {
		const w = mount(CnConversationWidget, { props: { content: { ...content, headerAction: undefined }, objectData } })
		expect(w.find('[data-testid="cn-conversation-header-action"]').exists()).toBe(false)
	})
})
