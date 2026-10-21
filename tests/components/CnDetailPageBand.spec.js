/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can draw a band across the page above the body and the side
 * column (detail-band): ids, `{ widgetId, span }` and inline definitions
 * resolve, a span is clamped to 1-12, an entry whose `visibleWhen` fails
 * takes no room, and the band renders before the body.
 *
 * @spec openspec/changes/detail-band/specs/detail-page/spec.md#requirement-a-detail-page-can-draw-a-band-across-the-page-above-the-body-and-the-side-column
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const WIDGETS = [
	{ id: 'kpi-views', type: 'stat', title: 'Views' },
	{ id: 'kpi-sessions', type: 'stat', title: 'Sessions' },
	{ id: 'notice', type: 'banner', content: { text: 'Home page fine' } },
	{ id: 'hidden', type: 'stat', title: 'Hidden', visibleWhen: { field: 'status', op: 'eq', value: 'draft' } },
	{ id: 'facts', type: 'stat', title: 'Facts' },
]

function makeStore(object) {
	return {
		objects: { 'portaliq-portal': { 'p-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Portal',
			register: 'portaliq',
			schema: 'portal',
			objectId: 'p-1',
			objectStore: makeStore({ id: 'p-1', status: 'published' }),
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'facts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			sideColumn: ['facts'],
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'portal' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

describe('CnDetailPage: the band', () => {
	it('resolves ids, { widgetId, span } and inline definitions, clamping the span', () => {
		const wrapper = mountPage({
			band: ['notice', { widgetId: 'kpi-views', span: 3 }, { widgetId: 'kpi-sessions', span: 40 }, { type: 'stat', title: 'Inline', span: 0 }, 'unknown'],
		})
		const resolved = wrapper.vm.bandWidgets.map((entry) => [entry.widget.id, entry.span])
		expect(resolved).toEqual([['notice', 12], ['kpi-views', 3], ['kpi-sessions', 12], ['cn-band-3', 1]])
	})

	it('frames a banner bare and anything else as a card unless the entry says otherwise', () => {
		const wrapper = mountPage({ band: ['notice', 'kpi-views', { widgetId: 'kpi-sessions', chrome: 'bare' }, { widgetId: 'facts', chrome: 'frame' }] })
		expect(wrapper.vm.bandWidgets.map((entry) => entry.chrome)).toEqual(['bare', 'card', 'bare', 'card'])
	})

	it('leaves out an entry whose visibleWhen does not hold', async () => {
		const wrapper = mountPage({ band: ['hidden', 'kpi-views'] })
		await flushPromises()
		expect(wrapper.vm.bandWidgets.map((entry) => entry.widget.id)).toEqual(['kpi-views'])
	})

	it('draws no band without config.band', async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.vm.showsBand).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-band"]').exists()).toBe(false)
	})

	it('draws the band before the body and the side column', async () => {
		const wrapper = mountPage({ band: [{ widgetId: 'kpi-views', span: 3 }] })
		await flushPromises()
		const html = wrapper.html()
		const band = html.indexOf('data-testid="cn-detail-page-band"')
		expect(band).toBeGreaterThan(-1)
		expect(band).toBeLessThan(html.indexOf('cn-detail-page__body'))
		expect(band).toBeLessThan(html.indexOf('data-testid="cn-detail-page-side"'))
		expect(wrapper.find('[data-testid="cn-detail-page-band-kpi-views"]').attributes('style')).toContain('--cn-band-span: 3')
	})
})
