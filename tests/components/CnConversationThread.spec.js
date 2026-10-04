/**
 * Tests for CnConversationThread: the messages between you and the other
 * party, and a box to answer. Also covers the `conversation` detail widget.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnConversationThread = require('../../src/components/CnConversationThread/CnConversationThread.vue').default
const CnConversationWidget = require('../../src/components/CnConversationThread/CnConversationWidget.vue').default

const messages = [
	{ id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them', text: 'I would like to see all documents.' },
	{ id: 2, time: 'yesterday', side: 'us', text: 'Construction starts in March.' },
]

const mountThread = (propsData, options = {}) => mount(CnConversationThread, { propsData: { messages, ...propsData }, ...options })

describe('CnConversationThread', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	it('renders one item per message with author, text and side', () => {
		const rows = mountThread().findAll('[data-testid="cn-conversation-message"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].attributes('data-side')).toBe('them')
		expect(rows[0].text()).toContain('Sanne de Vries')
		expect(rows[0].text()).toContain('I would like to see all documents.')
		expect(rows[1].attributes('data-side')).toBe('us')
	})

	it('names our own message "You" when it carries no author', () => {
		expect(mountThread().findAll('.cn-conversation-thread__author')[1].text()).toBe('You')
	})

	it('puts a machine readable time on a date and shows other text as is', () => {
		const times = mountThread().findAll('time')
		expect(times[0].attributes('datetime')).toBe(new Date('2026-10-04T10:52:00').toISOString())
		expect(times[1].text()).toBe('yesterday')
		expect(times[1].attributes('datetime')).toBeUndefined()
	})

	it('hides the decorative initials from assistive technology', () => {
		const avatar = mountThread().find('.cn-conversation-thread__avatar')
		expect(avatar.text()).toBe('SV')
		expect(avatar.attributes('aria-hidden')).toBe('true')
	})

	it('says so when there are no messages', () => {
		const wrapper = mountThread({ messages: [] })
		expect(wrapper.find('[data-testid="cn-conversation-empty"]').text()).toBe('No messages yet.')
		expect(wrapper.find('ol').exists()).toBe(false)
	})

	it('ties the reply box to a visible label', () => {
		const wrapper = mountThread({ replyLabel: 'Answer to the resident' })
		const label = wrapper.find('label')
		expect(label.text()).toBe('Answer to the resident')
		expect(label.attributes('for')).toBe(wrapper.find('textarea').attributes('id'))
	})

	it('keeps Send disabled until there is text', async () => {
		const wrapper = mountThread()
		const send = () => wrapper.find('[data-testid="cn-conversation-send"]')
		expect(send().attributes('disabled')).toBeDefined()
		await wrapper.find('textarea').setValue('   ')
		expect(send().attributes('disabled')).toBeDefined()
		await wrapper.find('textarea').setValue('Hello')
		expect(send().attributes('disabled')).toBeUndefined()
	})

	it('emits send with the trimmed text and clears the box when no endpoint is set', async () => {
		const wrapper = mountThread()
		await wrapper.find('textarea').setValue('  Hello there ')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.emitted('send')[0]).toEqual(['Hello there'])
		expect(wrapper.find('textarea').element.value).toBe('')
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('sends with Ctrl+Enter from the keyboard', async () => {
		const wrapper = mountThread()
		await wrapper.find('textarea').setValue('Hello')
		await wrapper.find('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
		expect(wrapper.emitted('send')).toHaveLength(1)
	})

	it('does not send an empty reply', async () => {
		const wrapper = mountThread()
		await wrapper.find('form').trigger('submit')
		expect(wrapper.emitted('send')).toBeUndefined()
	})

	it('posts the reply to the endpoint, emits sent and clears the box', async () => {
		axios.post.mockResolvedValue({ data: { id: 9, message: 'Hello' } })
		const wrapper = mountThread({ endpoint: '/apps/x/api/cases/1/messages', payload: { channel: 'portal' } })
		await wrapper.find('textarea').setValue('Hello')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/apps/x/api/cases/1/messages', { channel: 'portal', message: 'Hello' })
		expect(wrapper.emitted('sent')[0]).toEqual([{ id: 9, message: 'Hello' }])
		expect(wrapper.find('textarea').element.value).toBe('')
	})

	it('keeps the text and says so when the endpoint refuses', async () => {
		axios.post.mockRejectedValue(new Error('500'))
		const wrapper = mountThread({ endpoint: '/x' })
		await wrapper.find('textarea').setValue('Hello')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(wrapper.find('textarea').element.value).toBe('Hello')
		const error = wrapper.find('[data-testid="cn-conversation-error"]')
		expect(error.attributes('role')).toBe('alert')
		expect(wrapper.find('textarea').attributes('aria-describedby')).toBe(error.attributes('id'))
		expect(wrapper.emitted('error')).toHaveLength(1)
	})

	it('renders no reply box on a read-only thread', () => {
		expect(mountThread({ allowReply: false }).find('form').exists()).toBe(false)
	})
})

describe('CnConversationWidget (conversation widget type)', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	const record = {
		contact: [
			{ id: 1, from: 'Sanne', sentAt: '2026-10-04T10:52:00', body: 'Hi', direction: 'inbound' },
			{ id: 2, from: 'Pieter', sentAt: '2026-10-04T11:00:00', body: 'Hello', direction: 'outbound' },
		],
	}
	const content = {
		field: 'contact',
		authorField: 'from',
		timeField: 'sentAt',
		textField: 'body',
		sideField: 'direction',
		usValue: 'outbound',
		endpoint: '/apps/x/api/cases/@objectId/messages',
	}

	it('maps the record\'s own field names onto the thread', () => {
		const wrapper = mount(CnConversationWidget, { propsData: { content, objectData: record, objectId: 'abc' } })
		const rows = wrapper.findAll('[data-testid="cn-conversation-message"]')
		expect(rows.map((row) => row.attributes('data-side'))).toEqual(['them', 'us'])
		expect(rows[1].text()).toContain('Pieter')
		expect(rows[1].text()).toContain('Hello')
	})

	it('fills the record id into the endpoint and shows an accepted reply at once', async () => {
		axios.post.mockResolvedValue({ data: { message: 'On it' } })
		const wrapper = mount(CnConversationWidget, { propsData: { content, objectData: record, objectId: 'abc' } })
		await wrapper.find('textarea').setValue('On it')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/apps/x/api/cases/abc/messages', { message: 'On it' })
		const rows = wrapper.findAll('[data-testid="cn-conversation-message"]')
		expect(rows).toHaveLength(3)
		expect(rows[2].attributes('data-side')).toBe('us')
	})

	it('renders the empty state for a record without messages', () => {
		const wrapper = mount(CnConversationWidget, { propsData: { content: {}, objectData: {} } })
		expect(wrapper.find('[data-testid="cn-conversation-empty"]').exists()).toBe(true)
	})
})
