/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's case header is a card holding the stages bars. `headerCard`
 * draws the header as that card; `headerWidget` names a widget in `widgets`
 * to render inside it, under the title, without a card of its own, and takes
 * it out of the body grid. Without either key the header renders as before.
 *
 * (Where the favourites, follow, dwell and attention blocks go is the app's
 * layout: a `layout` entry's `gridY` puts them under the tabs, and
 * `sideColumn` takes a widget id. Nothing in the library to add.)
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-detail-header-can-be-a-card-that-holds-a-widget
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const store = {
	objects: { 'reg-case': { 'id-1': { name: '2026-0082' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const WIDGETS = [
	{ id: 'case-stages', type: 'stages', title: 'Progress' },
	{ id: 'case-data', type: 'data', title: 'Data' },
]
const LAYOUT = [
	{ id: '1', widgetId: 'case-stages', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
	{ id: '2', widgetId: 'case-data', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 4 },
]

const stubs = {
	CnDashboardGrid: { props: ['layout'], template: '<div class="grid"><span v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId" :data-y="it.gridY" /></div>' },
	CnDetailWidgetHost: { props: ['widget', 'chrome'], template: '<div class="host" :data-widget="widget && widget.id" :data-chrome="chrome" />' },
}

function mountPage(props = {}) {
	return mount(CnDetailPage, {
		propsData: { title: 'Case', register: 'reg', schema: 'case', objectId: 'id-1', objectStore: store, widgets: WIDGETS, layout: LAYOUT, ...props },
		global: { stubs },
	})
}

const header = (w) => w.find('[data-testid="cn-detail-page-header"]')
const cells = (w) => w.findAll('.cell').map((c) => [c.attributes('data-widget'), c.attributes('data-y')])

describe('CnDetailPage: header card and header widget', () => {
	it('renders the header as before, with every widget in the grid, without the keys', () => {
		const w = mountPage()
		expect(header(w).classes()).toEqual(['cn-detail-page__header'])
		expect(w.find('[data-testid="cn-detail-page-header-widget"]').exists()).toBe(false)
		expect(cells(w)).toEqual([['case-stages', '0'], ['case-data', '2']])
	})

	it('draws the header as a card with headerCard', () => {
		expect(header(mountPage({ headerCard: true })).classes()).toContain('cn-detail-page__header--card')
	})

	it('renders the named widget inside the header, bare, and takes it out of the grid', () => {
		const w = mountPage({ headerCard: true, headerWidget: 'case-stages' })
		const slot = header(w).find('[data-testid="cn-detail-page-header-widget"]')
		expect(slot.exists()).toBe(true)
		expect(slot.find('.host').attributes('data-widget')).toBe('case-stages')
		expect(slot.find('.host').attributes('data-chrome')).toBe('bare')
		expect(header(w).classes()).toContain('cn-detail-page__header--with-widget')
		// The freed row closes up.
		expect(cells(w)).toEqual([['case-data', '0']])
	})

	it('renders nothing extra for an id that names no widget', () => {
		const w = mountPage({ headerWidget: 'nope' })
		expect(w.find('[data-testid="cn-detail-page-header-widget"]').exists()).toBe(false)
		expect(cells(w)).toEqual([['case-stages', '0'], ['case-data', '2']])
	})
})
