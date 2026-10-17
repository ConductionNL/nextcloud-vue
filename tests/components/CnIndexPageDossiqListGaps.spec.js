/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dossiq list boards: `?_view=map` opens the map once the page offers it
 * (DqZakenKaart), a column can carry the row link instead of the first one
 * (DqTeamwachtrij), and a named source counts its quick filters (DqTaken).
 *
 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md
 */
var mockGet = jest.fn(() => Promise.resolve({ data: { results: [], total: 7 } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
	},
}))

import { mount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveIndexSource } from '../../src/composables/indexSources.js'

const SCHEMA = { title: 'Zaak', properties: { title: { type: 'string' } } }

function mountPage(query, props = {}) {
	return mount(CnIndexPage, {
		props: { title: 'Zaken', schema: SCHEMA, objects: [{ id: '1', title: 'Een' }], ...props },
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn(), replace: jest.fn() }, $route: { query, params: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnMapView: true, CnMapWidget: true },
		},
	})
}

describe('CnIndexPage: ?_view= and a mode that arrives later', () => {
	it('opens the map once the page offers it', async () => {
		const w = mountPage({ _view: 'map' })
		expect(w.vm.currentViewMode).not.toBe('map')
		await w.setProps({ mapConfig: { geometryField: 'location' } })
		expect(w.vm.currentViewMode).toBe('map')
		w.unmount()
	})

	it('opens the map at once when it is already offered', () => {
		const w = mountPage({ _view: 'map' }, { mapConfig: { geometryField: 'location' } })
		expect(w.vm.currentViewMode).toBe('map')
		w.unmount()
	})

	it('leaves a view the reader picked first', async () => {
		const w = mountPage({ _view: 'map' })
		w.vm.onViewModeChange('cards')
		await w.setProps({ mapConfig: { geometryField: 'location' } })
		expect(w.vm.currentViewMode).toBe('cards')
		w.unmount()
	})
})

describe('CnDataTable: a column with link: true names the row', () => {
	const rows = [{ id: '1', waiting: '3 dagen', title: 'Kapvergunning', '@self': { unread: true } }]
	function mountTable(columns) {
		return mount(CnDataTable, {
			props: { rows, columns, rowKey: 'id' },
			global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } } },
		})
	}

	it('moves the title look and the marks to that column', () => {
		const w = mountTable([{ key: 'waiting', label: 'Wacht' }, { key: 'title', label: 'Zaak', link: true }])
		const heads = w.findAll('thead th')
		expect(heads[0].classes()).not.toContain('cn-table-head--title')
		expect(heads[1].classes()).toContain('cn-table-head--title')
		const cells = w.findAll('[data-testid="cn-object-row"] td')
		expect(cells[0].classes()).not.toContain('cn-table-col--title')
		expect(cells[1].classes()).toContain('cn-table-col--title')
		expect(cells[0].find('[data-testid="cn-unread-marker"]').exists()).toBe(false)
		expect(cells[1].find('[data-testid="cn-unread-marker"]').exists()).toBe(true)
	})

	it('keeps the first column without the flag', () => {
		const w = mountTable([{ key: 'waiting', label: 'Wacht' }, { key: 'title', label: 'Zaak' }])
		expect(w.findAll('[data-testid="cn-object-row"] td')[0].classes()).toContain('cn-table-col--title')
	})
})

describe('CnIndexPage: a named source counts its quick filters', () => {
	function host(count) {
		return {
			namedSource: count ? { count } : {},
			sourceConfig: { scope: 'assigned' },
			countEntries: [{ key: 'tab:0', filter: {} }, { key: 'tab:2', filter: { overdue: true } }],
			countRequestKey: 'k',
			$route: { params: {} },
			selfFetchTokenCtx: () => ({}),
			tabCounts: null,
			savedViewCounts: null,
		}
	}

	it('asks the source for each tab, the tab filter over sourceConfig', async () => {
		const count = jest.fn((config) => Promise.resolve(config.overdue ? 2 : 9))
		const self = host(count)
		await CnIndexPage.methods.loadNamedSourceCounts.call(self, 'k')
		expect(count).toHaveBeenCalledWith({ scope: 'assigned' })
		expect(count).toHaveBeenCalledWith({ scope: 'assigned', overdue: true })
		expect(self.tabCounts).toEqual({ 0: 9, 2: 2 })
	})

	it('shows none for a source without count', async () => {
		const self = host(null)
		await CnIndexPage.methods.loadNamedSourceCounts.call(self, 'k')
		expect(self.tabCounts).toBeNull()
	})

	it('the tasks source counts one row of the inbox for its total', async () => {
		mockGet.mockClear()
		const total = await resolveIndexSource('tasks').count({ scope: 'pooled' })
		expect(total).toBe(7)
		expect(mockGet.mock.calls[0][1].params).toMatchObject({ scope: 'pooled', limit: 1 })
	})
})
