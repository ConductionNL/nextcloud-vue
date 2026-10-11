/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column may name an object's system date in `@self` (`@self.created`, the
 * "Aangemaakt" column of PqKassabonnen): it reads the value from `@self` and
 * renders as a date-time although the schema has no property for it.
 *
 * @spec openspec/changes/screens-table-footer-and-system-dates-parity/specs/index-list-board-look/spec.md#requirement-a-system-date-can-be-a-column
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [{ id: '1', title: 'Bon 1', '@self': { id: '1', created: '2026-10-05T09:12:00+00:00', updated: '2026-10-06T10:00:00+00:00' } }]
const SCHEMA = { properties: { title: { type: 'string', title: 'Title' } } }

const CellStub = {
	props: ['value', 'property'],
	template: '<span class="cell" :data-format="property && property.format">{{ value }}</span>',
}

function mountTable(columns, schema = SCHEMA) {
	return mount(CnDataTable, {
		props: { rows: ROWS, columns, rowKey: 'id', schema },
		global: { stubs: { CnCellRenderer: CellStub } },
	})
}

describe('CnDataTable: system dates as columns', () => {
	it('renders @self.created and @self.updated as date-times from the @self block', () => {
		const w = mountTable([{ key: 'title', label: 'Title' }, { key: '@self.created', label: 'Created' }, { key: '@self.updated', label: 'Updated' }])
		const cells = w.findAll('tbody .cell')
		expect(cells).toHaveLength(3)
		expect(cells[1].text()).toBe('2026-10-05T09:12:00+00:00')
		expect(cells[1].attributes('data-format')).toBe('date-time')
		expect(cells[2].text()).toBe('2026-10-06T10:00:00+00:00')
		expect(cells[2].attributes('data-format')).toBe('date-time')
		expect(w.findAll('thead th').map((th) => th.text())).toEqual(expect.arrayContaining(['Created', 'Updated']))
	})

	it('also without a schema', () => {
		const w = mountTable([{ key: '@self.created', label: 'Created' }], null)
		expect(w.find('tbody .cell').attributes('data-format')).toBe('date-time')
	})

	it('lets a column\'s own format win', () => {
		const w = mountTable([{ key: '@self.created', label: 'Created', format: 'date' }])
		expect(w.find('tbody .cell').attributes('data-format')).toBe('date')
	})

	it('leaves other keys without a schema property as before', () => {
		const w = mountTable([{ key: 'title', label: 'Title' }, { key: '@self.owner', label: 'Owner' }])
		expect(w.findAll('tbody .cell')[1].attributes('data-format')).toBeUndefined()
	})

	it('keeps the column on an index page that declares it', () => {
		const page = mount(CnIndexPage, {
			props: { title: 'Receipts', schema: SCHEMA, objects: ROWS, columns: [{ key: 'title', label: 'Title' }, { key: '@self.created', label: 'Created' }] },
			global: {
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Receipts' } },
				stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnDataTable: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
			},
		})
		expect(page.vm.renderedColumns.map((c) => (typeof c === 'string' ? c : c.key))).toContain('@self.created')
	})
})
