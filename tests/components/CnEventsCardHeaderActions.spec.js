/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A task's appointments (DqTaak Afspraken) carry "Bestaande koppelen" and
 * "Afspraak maken" in the card's title row: CnEventsCard reports them when
 * `content.headerActions` asks, and runs the calendar leaf's own flows
 * against the address it reads, `/api/flow-tasks/{id}/events`, which
 * OpenRegister guards by the task's visibility.
 */

const { mount } = require('@vue/test-utils')

const CnEventsCard = require('../../src/components/CnEventsCard/CnEventsCard.vue').default

const STUBS = {
	NcLoadingIcon: { template: '<i />' },
	CnCalendarEventCreate: { name: 'CnCalendarEventCreate', props: ['eventsUrl', 'objectId'], template: '<div class="create" />' },
	CnCalendarEventPicker: { name: 'CnCalendarEventPicker', template: '<div class="picker" />' },
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountCard(content) {
	return mount(CnEventsCard, {
		props: { objectId: 'task-1', content: { source: { kind: 'flow-task' }, ...content } },
		global: { stubs: STUBS },
	})
}

const lastHeader = (wrapper) => wrapper.emitted('header').at(-1)[0]

describe('CnEventsCard header actions', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
	})

	afterEach(() => {
		delete global.fetch
	})

	it('reports no buttons unless asked', async () => {
		const wrapper = mountCard({})
		await flush()
		expect(lastHeader(wrapper).actions).toEqual([])
	})

	it('reports the buttons asked for, in that order, the create one primary', async () => {
		const wrapper = mountCard({ headerActions: ['link', 'create'] })
		await flush()
		const actions = lastHeader(wrapper).actions
		expect(actions.map((action) => action.label)).toEqual(['Link an existing one', 'Make an appointment'])
		expect(actions[1].variant).toBe('primary')
	})

	it('makes a meeting on the task\'s own events address and reads the list again', async () => {
		const wrapper = mountCard({ headerActions: ['create'] })
		await flush()
		lastHeader(wrapper).actions[0].run()
		await wrapper.vm.$nextTick()
		const form = wrapper.findComponent({ name: 'CnCalendarEventCreate' })
		expect(form.props('eventsUrl')).toBe('/apps/openregister/api/flow-tasks/task-1/events')
		global.fetch.mockClear()
		form.vm.$emit('created')
		await flush()
		expect(wrapper.findComponent({ name: 'CnCalendarEventCreate' }).exists()).toBe(false)
		expect(global.fetch.mock.calls[0][0]).toContain('/flow-tasks/task-1/events')
	})

	it('links a picked meeting to the task, and says it when that is refused', async () => {
		const wrapper = mountCard({ headerActions: ['link'] })
		await flush()
		lastHeader(wrapper).actions[0].run()
		await wrapper.vm.$nextTick()
		global.fetch.mockClear()
		global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Not your task' }) })
		wrapper.findComponent({ name: 'CnCalendarEventPicker' }).vm.$emit('link', { calendarUri: 'personal', eventUid: 'ev-1' })
		await flush()
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toContain('/flow-tasks/task-1/events/link')
		expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ calendarUri: 'personal', eventUid: 'ev-1' }) })
		expect(wrapper.find('[data-testid="cn-events-card-link-error"]').text()).toBe('Not your task')
	})

	it('reports the create action without the primary variant and with its own icon when asked', async () => {
		const wrapper = mountCard({ headerActions: ['create'], createVariant: 'secondary', createIcon: 'CalendarPlusOutline' })
		await flush()
		const [create] = lastHeader(wrapper).actions
		expect(create.variant).toBeUndefined()
		expect(create.icon).toBe('CalendarPlusOutline')
	})
})
