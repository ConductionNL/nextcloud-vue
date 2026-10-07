/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTimelineWidget: an object's dated events from its fields, related
 * objects, audit trail and OpenRegister timeline, in time order.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default
// The aggregator the barrel imports; requiring it proves the wiring, not just the module.
require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
const { BUILT_IN_WIDGETS } = require('../../src/components/CnWidgetGrid/builtInWidgets.js')
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')

const booking = {
	'@self': { created: '2026-09-01T09:00:00Z' },
	depositClearedAt: '2026-09-03T10:00:00Z',
	confirmationSentAt: '2026-09-02T08:00:00Z',
	startsAt: '2099-01-01',
	endsAt: '2099-01-02',
}
const fields = [
	{ field: '@self.created', label: 'Booking created' },
	{ field: 'depositClearedAt', label: 'Deposit cleared' },
	{ field: 'confirmationSentAt', label: 'Confirmation mail sent' },
	{ field: 'startsAt', label: 'Starts' },
	{ field: 'endsAt', label: 'Ends' },
]

function mountWidget(content, extra = {}) {
	return mount(CnTimelineWidget, {
		props: { register: 'pipelinq', schema: 'booking', objectId: 'b1', content, ...extra },
	})
}

const labels = (wrapper) => wrapper.findAll('.cn-timeline-widget__label').map((w) => w.text())

describe('CnTimelineWidget', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('is registered as the `timeline` detail-page widget type and as a v2 built-in', () => {
		expect(getWidgetTypeEntry('timeline').renderer).toBe(CnTimelineWidget)
		expect(getWidgetTypeEntry('timeline').surfaces).toEqual(['detail-page'])
		expect(BUILT_IN_WIDGETS.timeline).toBe(CnTimelineWidget)
	})

	it('lists the object\'s date fields in time order and marks the future upcoming', async () => {
		const wrapper = mountWidget({ title: 'Timeline', fields }, { object: booking })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(labels(wrapper)).toEqual(['Booking created', 'Confirmation mail sent', 'Deposit cleared', 'Starts', 'Ends'])
		const events = wrapper.findAll('[data-testid="cn-timeline-widget-event"]')
		expect(events[3].text()).toContain('Upcoming')
		expect(events[0].text()).not.toContain('Upcoming')
		expect(events[0].find('time').attributes('datetime')).toBe('2026-09-01T09:00:00.000Z')
	})

	it('reads the object from the detail page context', async () => {
		const wrapper = mount(CnTimelineWidget, {
			props: { content: { fields } },
			global: { provide: { cnObjectContext: { value: { objectId: 'b1', register: 'pipelinq', schema: 'booking', object: booking } } } },
		})
		await flushPromises()
		expect(labels(wrapper)).toHaveLength(5)
	})

	it('fetches the object when only its id is known', async () => {
		axios.get.mockResolvedValue({ data: booking })
		const wrapper = mountWidget({ fields })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/booking/b1')
		expect(labels(wrapper)).toHaveLength(5)
	})

	it('merges related objects and the audit trail into the same order', async () => {
		axios.get.mockImplementation((url) => {
			if (url.endsWith('/payment')) {
				return Promise.resolve({ data: { results: [{ '@self': { id: 'p1', created: '2026-09-02T12:00:00Z' }, title: 'EUR 250' }] } })
			}
			if (url.endsWith('/audit-trails')) {
				return Promise.resolve({ data: { results: [{ id: 1, action: 'update', actorDisplayName: 'Ruben', created: '2026-09-04T00:00:00Z' }] } })
			}
			return Promise.reject(new Error('unexpected ' + url))
		})
		const wrapper = mountWidget({
			fields: fields.slice(0, 2),
			related: [{ schema: 'payment', field: 'booking', label: 'Payment received' }],
			auditTrail: true,
		}, { object: booking })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/payment', { params: { booking: 'b1', _limit: 50 } })
		expect(labels(wrapper)).toEqual(['Booking created', 'Payment received', 'Deposit cleared', 'Updated by Ruben'])
	})

	it('asks OpenRegister for the audit trail at its real route, audit-trails', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		mountWidget({ auditTrail: true }, { object: booking })
		await flushPromises()
		const urls = axios.get.mock.calls.map((c) => c[0])
		expect(urls.some((u) => u.endsWith('/objects/pipelinq/booking/b1/audit-trails'))).toBe(true)
		expect(urls.some((u) => u.endsWith('/audit-trail'))).toBe(false)
	})

	it('turns a list on the object, such as a status history, into dated events', async () => {
		const withHistory = {
			...booking,
			statusHistory: [
				{ status: 'Awaiting deposit', changedAt: '2026-09-01T09:14:00Z', reason: 'Booking created' },
				{ status: 'Confirmed', changedAt: '2026-09-01T09:17:00Z', reason: 'Deposit cleared' },
				{ status: 'Ignored', reason: 'no date, so no event' },
			],
		}
		const wrapper = mountWidget({
			lists: [{ field: 'statusHistory', dateField: 'changedAt', labelField: 'status', detailField: 'reason' }],
		}, { object: withHistory })
		await flushPromises()
		expect(labels(wrapper)).toEqual(['Awaiting deposit', 'Confirmed'])
		expect(wrapper.text()).toContain('Deposit cleared')
	})

	it('says which part failed instead of showing a shorter history as complete', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = mountWidget({ fields, auditTrail: true }, { object: booking })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-timeline-widget-error"]').text()).toContain('changes')
		expect(labels(wrapper)).toHaveLength(5)
	})

	it('says nothing happened yet when there are no dated facts', async () => {
		const wrapper = mountWidget({ fields }, { object: {} })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-timeline-widget-empty"]').exists()).toBe(true)
	})

	it('lists newest first with order: desc', async () => {
		const wrapper = mountWidget({ fields, order: 'desc' }, { object: booking })
		await flushPromises()
		expect(labels(wrapper)[0]).toBe('Ends')
	})
})
