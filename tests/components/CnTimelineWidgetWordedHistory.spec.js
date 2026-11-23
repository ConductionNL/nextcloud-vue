/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqEvenement "Geschiedenis": the event's history in words. Audit
 * entries take the History card's labels (`actionLabels`, `changeLabels`,
 * `excludeActions`), a related record's event can name the record in its
 * label and keep only the rows a condition holds for, and `limit` keeps the
 * newest few.
 *
 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-related-records-event-can-name-the-record
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

const AUDIT = [
	{ id: 1, action: 'create', user: 'Pieter Jansen', created: '2026-09-24T10:00:00Z' },
	{ id: 2, action: 'read', user: 'System', created: '2026-10-01T10:00:00Z' },
	{ id: 3, action: 'update', user: 'Lotte Mulder', created: '2026-10-06T10:00:00Z', changed: { capacity: { old: 60, new: 80 } } },
]
const REGISTRATIONS = [
	{ id: 'r1', name: 'Joke van Dam', status: 'waitlist', '@self': { created: '2026-10-07T08:51:00Z' } },
	{ id: 'r2', name: 'Sanne de Vries', status: 'confirmed', '@self': { created: '2026-10-02T08:00:00Z' } },
]

function mountWidget(content) {
	axios.get.mockImplementation((url) => Promise.resolve({ data: { results: String(url).includes('audit-trails') ? AUDIT : REGISTRATIONS } }))
	return mount(CnTimelineWidget, { props: { register: 'pipelinq', schema: 'campaignEvent', objectId: 'e1', content } })
}

const labels = (w) => w.findAll('.cn-timeline-widget__label').map((n) => n.text())

beforeEach(() => axios.get.mockReset())

describe('CnTimelineWidget worded history', () => {
	it('words audit entries with the card\'s labels and leaves reads out', async () => {
		const w = mountWidget({
			auditTrail: true,
			order: 'desc',
			excludeActions: ['read'],
			actionLabels: { create: 'Event created' },
			changeLabels: [{ field: 'capacity', label: 'Places raised from {changed.capacity.old} to {changed.capacity.new}' }],
		})
		await flushPromises()
		expect(labels(w)).toEqual(['Places raised from 60 to 80', 'Event created'])
	})

	it('names a related record in its label and keeps the rows the condition holds for', async () => {
		const w = mountWidget({
			order: 'desc',
			related: [{ schema: 'eventRegistration', field: 'event', label: '{name} is on the waiting list', when: { field: 'status', value: 'waitlist' } }],
		})
		await flushPromises()
		expect(labels(w)).toEqual(['Joke van Dam is on the waiting list'])
	})

	it('keeps the newest few with limit', async () => {
		const w = mountWidget({ auditTrail: true, order: 'desc', excludeActions: ['read'], limit: 1 })
		await flushPromises()
		expect(w.findAll('[data-testid="cn-timeline-widget-event"]')).toHaveLength(1)
	})
})
