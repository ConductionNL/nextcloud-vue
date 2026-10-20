/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab can hold a stack of widgets (screens-relation-pages): the Overzicht of
 * a person or organisation page shows the record's card, then its open cases,
 * then its latest contact moments, and only on that tab.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { fetchListTotal } from '../../src/utils/fetchFilterCounts.js'

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchListTotal: jest.fn(),
}))

const WIDGETS = [
	{ id: 'w-card', type: 'data', title: 'Contact' },
	{ id: 'w-cases', type: 'record-list', title: 'Cases', content: { register: 'r', schema: 'case', filter: { requester: '@objectId' } } },
	{ id: 'w-moments', type: 'record-list', title: 'Latest contact moments', content: { register: 'r', schema: 'moment' } },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountTabs(tabs) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectId: 'p-1', objectData: { id: 'p-1' }, register: 'r', schema: 'person' },
		global: {
			stubs: {
				CnDetailWidgetHost: {
					name: 'CnDetailWidgetHost',
					props: ['widget', 'chrome'],
					template: '<div class="host">{{ widget.id }}|{{ chrome }}</div>',
				},
			},
		},
	})
}

beforeEach(() => {
	fetchListTotal.mockReset()
	fetchListTotal.mockResolvedValue(2)
})

describe('CnTabsWidget widgetIds (a stack)', () => {
	it('renders every widget of the stack as a card, in order', async () => {
		const w = mountTabs([{ widgetIds: ['w-card', 'w-cases', 'w-moments'], label: 'Overview' }])
		await nextTick()
		const hosts = w.findAll('.host').map((h) => h.text())
		expect(hosts).toEqual(['w-card|card', 'w-cases|card', 'w-moments|card'])
		expect(w.find('[data-testid="cn-tabs-widget-stack"]').exists()).toBe(true)
		expect(w.find('.cn-tabs-widget__stack-first .host').text()).toBe('w-card|card')
	})

	it('skips an id that names no widget', async () => {
		const w = mountTabs([{ widgetIds: ['w-card', 'missing', 'w-cases'] }])
		await nextTick()
		expect(w.findAll('.host').map((h) => h.text())).toEqual(['w-card|card', 'w-cases|card'])
	})

	it('renders a single resolving id as a plain tab, without a stack', async () => {
		const w = mountTabs([{ widgetIds: ['w-card', 'missing'] }])
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-stack"]').exists()).toBe(false)
		expect(w.findAll('.host').map((h) => h.text())).toEqual(['w-card|bare'])
	})

	// @spec openspec/changes/tab-stack-keeps-cards/specs/tab-stack-keeps-cards/spec.md#requirement-a-stack-stays-cards-when-one-of-its-widgets-shows
	it('keeps a stack of titled cards when the record hides all but one of its widgets', async () => {
		const widgets = [
			{ id: 'w-request', type: 'facts', title: 'The request', visibleWhen: { field: 'kind', op: 'eq', value: 'general' } },
			{ id: 'w-report', type: 'facts', title: 'The report', visibleWhen: { field: 'kind', op: 'eq', value: 'youth' } },
		]
		const w = mount(CnTabsWidget, {
			props: { content: { tabs: [{ widgetIds: ['w-request', 'w-report'], label: 'Overview' }] }, availableWidgets: widgets, objectId: 'c-1', objectData: { id: 'c-1', kind: 'youth' }, register: 'r', schema: 'case' },
			global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget', 'chrome'], template: '<div class="host">{{ widget.id }}|{{ chrome }}</div>' } } },
		})
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-stack"]').exists()).toBe(true)
		expect(w.findAll('.host').map((h) => h.text())).toEqual(['w-report|card'])
	})

	it('labels the tab after the first widget when it sets no label', async () => {
		const w = mountTabs([{ widgetIds: ['w-card', 'w-cases'] }])
		await nextTick()
		expect(w.find('[role="tab"]').text()).toContain('Contact')
	})

	it('counts the first widget of the stack that has a list', async () => {
		const w = mountTabs([{ widgetIds: ['w-card', 'w-cases', 'w-moments'], label: 'Overview', countFrom: 'widget' }])
		await flush()
		expect(fetchListTotal).toHaveBeenCalledTimes(1)
		expect(fetchListTotal).toHaveBeenCalledWith('r', 'case', { requester: '@objectId' }, expect.objectContaining({ objectId: 'p-1' }))
		expect(w.find('[role="tab"]').text()).toContain('2')
	})

	it('leaves a widgetId tab as it was', async () => {
		const w = mountTabs([{ widgetId: 'w-cases' }])
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-stack"]').exists()).toBe(false)
		expect(w.findAll('.host').map((h) => h.text())).toEqual(['w-cases|bare'])
	})
})

describe('CnTabsWidget stack grid', () => {
	const IDS = ['w-card', 'w-cases', 'w-moments']
	const spans = (w) => [
		w.find('.cn-tabs-widget__stack-first'),
		...w.findAll('.cn-tabs-widget__stack-item'),
	].map((el) => el.attributes('style') || '')

	it('keeps the plain vertical stack without columns or layout', async () => {
		const w = mountTabs([{ widgetIds: IDS, label: 'Overview' }])
		await flush()
		expect(w.find('.cn-tabs-widget__stack--grid').exists()).toBe(false)
		expect(spans(w).every((style) => style === '')).toBe(true)
	})

	it('gives every widget a share of the 12 columns with `columns`', async () => {
		const w = mountTabs([{ widgetIds: IDS, label: 'Overview', columns: 3 }])
		await flush()
		expect(w.find('.cn-tabs-widget__stack--grid').exists()).toBe(true)
		expect(spans(w)).toEqual(['grid-column: span 4;', 'grid-column: span 4;', 'grid-column: span 4;'])
	})

	it('takes the width of each widget from `layout`, the rest from `columns` or the whole row', async () => {
		const w = mountTabs([{ widgetIds: IDS, label: 'Overview', layout: [{ widgetId: 'w-card', gridWidth: 3 }, { widgetId: 'w-cases', gridWidth: 9 }] }])
		await flush()
		expect(spans(w)).toEqual(['grid-column: span 3;', 'grid-column: span 9;', 'grid-column: span 12;'])
	})

	it('clamps a width to 1..12 and ignores a bad columns value', async () => {
		const w = mountTabs([{ widgetIds: IDS, label: 'Overview', columns: 'x', layout: [{ widgetId: 'w-card', gridWidth: 40 }] }])
		await flush()
		expect(spans(w)[0]).toBe('grid-column: span 12;')
	})
})
