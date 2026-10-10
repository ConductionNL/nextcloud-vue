/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-index-stat-row: an index page draws KPI tiles above its list
 * (`statRow`, DqTeamwachtrij / PqContracten) and cards beside it
 * (`sidePanel`, "Team vandaag", "Werkvoorraad per zaaktype"). Both resolve
 * their widget types like a dashboard. Without the keys the page renders as
 * before.
 *
 * @spec openspec/changes/screens-index-stat-row/specs/index-page/spec.md
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnIndexPageWidgets from '../../src/components/CnIndexPage/CnIndexPageWidgets.vue'

/**
 * @param {string} name probe name
 * @return {object} a component that prints its content
 */
function Probe(name) {
	return {
		name,
		props: ['content', 'widgetId'],
		template: `<div class="probe" data-type="${name}" :data-id="widgetId">{{ content.label || '' }}</div>`,
	}
}

const registry = { stat: Probe('stat'), 'team-today': Probe('team-today') }

const STAT_ROW = [
	{ id: 'unassigned', type: 'stat', content: { label: 'Without handler' } },
	{ id: 'longest', type: 'stat', content: { label: 'Waiting longest' } },
	{ id: 'due', type: 'stat', content: { label: 'Due in 7 days' } },
]

const SIDE_PANEL = [
	{ id: 'team', type: 'team-today', title: 'Team today' },
	{ id: 'workload', type: 'stat', title: 'Workload per case type', headerLink: { label: 'All', href: '#all' } },
]

/**
 * @param {object} extra page props
 * @param {object} provide extra provides
 * @return {object} wrapper
 */
function mountPage(extra = {}, provide = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Queue', schema: { title: 'Case', properties: {} }, objects: [], ...extra },
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Queue' } },
			provide: { cnRegistry: registry, ...provide },
			stubs: {
				CnActionsBar: { template: '<div class="cn-actions-bar" />' },
				CnWidgetWrapper: { props: ['title', 'showTitle', 'showActions', 'headerLink'], template: '<section class="ww" :data-title="title" :data-show-title="String(showTitle)" :data-actions="String(showActions)" :data-link="headerLink ? headerLink.label : \'\'"><slot /></section>' },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

describe('CnIndexPage: stat row and side panel', () => {
	it('renders neither without the keys, and no side-panel layout class', () => {
		const w = mountPage()
		expect(w.find('[data-testid="cn-index-page-stat-row"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-page-side-panel"]').exists()).toBe(false)
		expect(w.classes()).not.toContain('cn-index-page--with-side-panel')
	})

	it('draws the stat row in listed order, in an auto grid, above the toolbar, without titles or menus', () => {
		const w = mountPage({ statRow: STAT_ROW })
		const row = w.find('[data-testid="cn-index-page-stat-row"]')
		expect(row.exists()).toBe(true)
		expect(row.classes()).toContain('cn-kpi-grid--cols-auto')
		expect(row.findAll('.probe').map((p) => p.attributes('data-id'))).toEqual(['unassigned', 'longest', 'due'])
		expect(row.findAll('.ww').every((ww) => ww.attributes('data-show-title') === 'false' && ww.attributes('data-actions') === 'false')).toBe(true)
		const children = [...w.element.children]
		expect(children.indexOf(row.element)).toBeLessThan(children.indexOf(w.find('.cn-actions-bar').element))
	})

	it('draws the side panel as an aside with titled cards and their header links, and sets the layout class', () => {
		const w = mountPage({ sidePanel: SIDE_PANEL }, { cnTranslate: (k) => ({ 'Team today': 'Team vandaag' })[k] || k })
		expect(w.classes()).toContain('cn-index-page--with-side-panel')
		const aside = w.find('[data-testid="cn-index-page-side-panel"]')
		expect(aside.element.tagName).toBe('ASIDE')
		expect(aside.classes()).toContain('cn-index-page__side-panel')
		const cards = aside.findAll('.ww')
		expect(cards.map((c) => c.attributes('data-title'))).toEqual(['Team vandaag', 'Workload per case type'])
		expect(cards[1].attributes('data-link')).toBe('All')
		expect(aside.find('.probe[data-type="team-today"]').exists()).toBe(true)
	})

	it('resolves a library catalog type when the app registers none', () => {
		const w = mount(CnIndexPageWidgets, {
			propsData: { widgets: [{ id: 'x', type: 'stat', content: {} }, { id: 'y', type: 'people', content: {} }] },
		})
		expect(w.vm.entries.map((e) => e.id)).toEqual(['x', 'y'])
		expect(w.vm.entries[0].renderer).toBeTruthy()
	})

	it('skips an entry without an id or with a type nothing resolves, with a development warning', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = mount(CnIndexPageWidgets, {
			propsData: { widgets: [{ type: 'stat' }, { id: 'z', type: 'no-such-widget' }, { id: 'ok', type: 'stat' }] },
		})
		expect(w.vm.entries.map((e) => e.id)).toEqual(['ok'])
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no-such-widget'))
		warn.mockRestore()
	})
})
