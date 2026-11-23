/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The calendar card on a detail page can carry "Afspraak maken" and
 * "Bestaande koppelen" in its title row (DqZaakTaken, DqTaak Afspraken),
 * opt-in through `headerActions`: the same create and link-existing flows the
 * calendar tab runs, against the same OpenRegister endpoints, and the list
 * reads again afterwards.
 */

const { mount } = require('@vue/test-utils')

jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const CnCalendarCard = require('../CnCalendarCard.vue').default

const STUBS = {
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
	NcButton: { template: '<button v-bind="$attrs"><slot /><slot name="icon" /></button>' },
	CnIcon: { props: ['name'], template: '<i :data-name="name" />' },
	CnCalendarEventCreate: { name: 'CnCalendarEventCreate', template: '<div class="create-modal" />' },
	CnCalendarEventPicker: { name: 'CnCalendarEventPicker', template: '<div class="picker-modal" />' },
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountCard(props = {}) {
	return mount(CnCalendarCard, {
		props: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'detail-page', ...props },
		global: { stubs: STUBS },
	})
}

describe('CnCalendarCard header actions', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
	})

	afterEach(() => {
		delete global.fetch
	})

	it('draws no buttons without headerActions', async () => {
		const wrapper = mountCard()
		await flush()
		expect(wrapper.find('[data-testid="cn-calendar-card-create"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-calendar-card-link"]').exists()).toBe(false)
	})

	it('draws the buttons it is asked for, in the order asked, on a detail page only', async () => {
		const wrapper = mountCard({ headerActions: ['link', 'create'] })
		await flush()
		const ids = wrapper.findAll('[data-testid^="cn-calendar-card-"]').map((el) => el.attributes('data-testid'))
		expect(ids.filter((id) => id === 'cn-calendar-card-link' || id === 'cn-calendar-card-create')).toEqual(['cn-calendar-card-link', 'cn-calendar-card-create'])
		const dashboard = mountCard({ headerActions: ['link', 'create'], surface: 'app-dashboard' })
		await flush()
		expect(dashboard.find('[data-testid="cn-calendar-card-create"]').exists()).toBe(false)
	})

	it('creates a meeting on the object and reads the list again', async () => {
		const wrapper = mountCard({ headerActions: ['create'] })
		await flush()
		await wrapper.find('[data-testid="cn-calendar-card-create"]').trigger('click')
		const modal = wrapper.findComponent({ name: 'CnCalendarEventCreate' })
		expect(modal.exists()).toBe(true)
		expect(modal.attributes('objectid') ?? modal.props?.('objectId')).toBeDefined()
		global.fetch.mockClear()
		modal.vm.$emit('created')
		await flush()
		expect(wrapper.findComponent({ name: 'CnCalendarEventCreate' }).exists()).toBe(false)
		expect(global.fetch).toHaveBeenCalled()
	})

	it('links an existing meeting through the object\'s link endpoint and reads the list again', async () => {
		const wrapper = mountCard({ headerActions: ['link'] })
		await flush()
		await wrapper.find('[data-testid="cn-calendar-card-link"]').trigger('click')
		const picker = wrapper.findComponent({ name: 'CnCalendarEventPicker' })
		expect(picker.exists()).toBe(true)
		global.fetch.mockClear()
		picker.vm.$emit('link', { calendarUri: 'personal', eventUid: 'ev-1' })
		await flush()
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/objects/r1/s1/o1/events/link')
		expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ calendarUri: 'personal', eventUid: 'ev-1' }) })
		expect(global.fetch.mock.calls.length).toBeGreaterThan(1)
	})

	it('says it when the link is refused, in the server\'s words', async () => {
		const wrapper = mountCard({ headerActions: ['link'] })
		await flush()
		await wrapper.find('[data-testid="cn-calendar-card-link"]').trigger('click')
		global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Not your calendar' }) })
		wrapper.findComponent({ name: 'CnCalendarEventPicker' }).vm.$emit('link', { calendarUri: 'x', eventUid: 'y' })
		await flush()
		expect(wrapper.find('[role="alert"]').text()).toContain('Not your calendar')
	})

	it('draws the create button secondary when asked', async () => {
		const primary = mountCard({ headerActions: ['create'] })
		await flush()
		expect(primary.find('[data-testid="cn-calendar-card-create"]').attributes('variant')).toBe('primary')
		const quiet = mountCard({ headerActions: ['create'], createVariant: 'secondary', createIcon: 'CalendarPlusOutline' })
		await flush()
		expect(quiet.find('[data-testid="cn-calendar-card-create"]').attributes('variant')).toBe('secondary')
		expect(quiet.find('[data-testid="cn-calendar-card-create-icon"]').attributes('data-name')).toBe('CalendarPlusOutline')
	})
})
