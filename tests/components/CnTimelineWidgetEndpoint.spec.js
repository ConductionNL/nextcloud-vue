/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The timeline reads an app endpoint that merges its own sources
 * (`endpointSource`): its items become events with their type and author,
 * a page at a time with "Load more", and type chips narrow it on the server.
 *
 * @spec openspec/changes/timeline-endpoint-source/specs/timeline-widget/spec.md#requirement-a-timeline-can-read-an-app-endpoint-with-type-chips
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const CONTENT = {
	order: 'desc',
	endpointSource: {
		url: '/apps/pipelinq/api/timeline',
		params: { entityType: 'client', entityId: '@objectId' },
		itemsPath: 'items',
		pagesPath: 'pages',
		dateField: 'date',
		labelField: 'title',
		detailField: 'description',
		typeField: 'type',
		userField: 'user',
		typeLabels: { interaction: 'Contact moment', task: 'Task' },
		typesParam: 'types[]',
		limit: 2,
	},
	typeChips: [{ value: 'interaction', label: 'Contact moments' }, { value: 'task', label: 'Tasks' }],
}

const PAGE1 = { items: [{ id: 1, type: 'interaction', title: 'Called', description: 'x'.repeat(130), date: '2026-10-02T10:00:00Z', user: 'Pieter' }, { id: 2, type: 'task', title: 'Follow up', date: '2026-10-01T10:00:00Z' }], page: 1, pages: 2 }
const PAGE2 = { items: [{ id: 3, type: 'task', title: '', date: '2026-09-01T10:00:00Z' }], page: 2, pages: 2 }

function mountWidget(content = CONTENT) {
	return mount(CnTimelineWidget, {
		props: { objectId: 'k-1', content },
		global: { stubs: { NcButton: { props: ['ariaPressed'], template: '<button v-bind="$attrs" :aria-pressed="ariaPressed" @click="$emit(\'click\')"><slot /></button>' } } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('CnTimelineWidget: endpointSource', () => {
	it('reads the endpoint for the record and draws its items with type and author', async () => {
		axios.get.mockResolvedValueOnce({ data: PAGE1 })
		const w = mountWidget()
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/timeline', { params: { entityType: 'client', entityId: 'k-1', _page: 1, _limit: 2 } })
		const labels = w.findAll('.cn-timeline-widget__label').map((n) => n.text())
		expect(labels).toEqual(['Called', 'Follow up'])
		expect(w.findAll('.cn-timeline-widget__meta').map((n) => n.text())).toEqual(['Contact moment · Pieter', 'Task'])
		expect(w.find('.cn-timeline-widget__detail').text()).toHaveLength(123)
	})

	it('loads the next page on Load more and names an item without a title', async () => {
		axios.get.mockResolvedValueOnce({ data: PAGE1 }).mockResolvedValueOnce({ data: PAGE2 })
		const w = mountWidget()
		await flushPromises()
		await w.find('[data-testid="cn-timeline-widget-more"]').trigger('click')
		await flushPromises()
		expect(axios.get.mock.calls[1][1].params._page).toBe(2)
		expect(w.findAll('.cn-timeline-widget__label').map((n) => n.text())).toEqual(['Called', 'Follow up', '(no title)'])
		expect(w.find('[data-testid="cn-timeline-widget-more"]').exists()).toBe(false)
	})

	it('narrows to a type with its chip, on the server, and All widens again', async () => {
		axios.get.mockResolvedValue({ data: PAGE1 })
		const w = mountWidget()
		await flushPromises()
		const chips = w.findAll('[data-testid^="cn-timeline-widget-chip-"]')
		expect(chips.map((c) => c.text())).toEqual(['All', 'Contact moments', 'Tasks'])
		expect(chips[0].attributes('aria-pressed')).toBe('true')
		await chips[2].trigger('click')
		await flushPromises()
		expect(axios.get.mock.calls[1][1].params).toMatchObject({ 'types[]': 'task', _page: 1 })
		await w.findAll('[data-testid^="cn-timeline-widget-chip-"]')[0].trigger('click')
		await flushPromises()
		expect(axios.get.mock.calls[2][1].params['types[]']).toBeUndefined()
	})

	it('says so when the endpoint fails', async () => {
		axios.get.mockRejectedValueOnce(new Error('down'))
		const w = mountWidget()
		await flushPromises()
		expect(w.find('[data-testid="cn-timeline-widget-error"]').exists()).toBe(true)
	})
})

describe('CnTimelineWidget: emptyText', () => {
	it('says the configured sentence when there is nothing to show', async () => {
		axios.get.mockResolvedValue({ data: { items: [], page: 1, pages: 1 } })
		const w = mountWidget({ ...CONTENT, emptyText: 'Activities will appear here once contact moments, tasks, emails or calendar entries are linked to this record.' })
		await flushPromises()
		expect(w.find('[data-testid="cn-timeline-widget-empty"]').text()).toBe('Activities will appear here once contact moments, tasks, emails or calendar entries are linked to this record.')
	})
})
