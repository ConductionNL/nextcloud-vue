/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A column the person turns on in the sidebar's Columns tab gets the page's
 * `columnOverrides`, like a column the page declares.
 *
 * @spec openspec/changes/sidebar-column-overrides/specs/index-page/spec.md#requirement-a-column-turned-on-in-the-sidebar-gets-the-pages-column-overrides
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue(null),
	getSchema: jest.fn(() => null),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnIndexSidebar = require('../../src/components/CnIndexSidebar/CnIndexSidebar.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
}

const schema = {
	title: 'Meeting',
	properties: {
		title: { type: 'string', title: 'Title' },
		scheduledDate: { type: 'string', format: 'date', title: 'Date' },
	},
}

/**
 * @param {object} propsData Component props.
 * @return {object} The column the table renders for `scheduledDate`.
 */
function dateColumn(propsData) {
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Meetings', schema, objects: [], columns: ['title'], visibleColumns: ['title', 'scheduledDate'], ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
	})
	return wrapper.vm.tableColumns.find((column) => column.key === 'scheduledDate')
}

describe('a column turned on in the sidebar', () => {
	it("gets the page's override for its key", () => {
		const column = dateColumn({ columnOverrides: { scheduledDate: { formatter: 'numericDate' } } })
		expect(column).toEqual(expect.objectContaining({ key: 'scheduledDate', format: 'date', formatter: 'numericDate' }))
	})

	it('keeps its schema definition without an override', () => {
		const column = dateColumn({ columnOverrides: { title: { label: 'Name' } } })
		expect(column).toEqual(expect.objectContaining({ key: 'scheduledDate', label: 'Date', format: 'date' }))
		expect(column.formatter).toBeUndefined()
	})
})

/**
 * @spec openspec/changes/sidebar-column-overrides/specs/index-page/spec.md#requirement-both-column-pickers-show-a-columns-override-label
 */
describe("the sidebar's Columns tab", () => {
	const columnOverrides = { title: { label: 'Name' } }

	it('gets the overrides from the page, inline and hoisted', () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Meetings', schema, objects: [], columns: ['title'], columnOverrides, sidebar: { enabled: true } },
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		})
		expect(wrapper.findComponent(CnIndexSidebar).props('columnOverrides')).toEqual(columnOverrides)
		expect(wrapper.vm.hoistedSidebarProps.columnOverrides).toEqual(columnOverrides)
	})

	it("lists an override's label, translated like the header menu does", () => {
		const wrapper = mount(CnIndexSidebar, {
			props: { open: true, schema, showMetadata: false, columnOverrides },
			global: {
				stubs: { NcAppSidebar: true, NcAppSidebarTab: true },
				provide: { cnTranslate: (key) => ({ Name: 'Naam' })[key] || key },
			},
		})
		const labels = Object.fromEntries(wrapper.vm.allColumns.map((column) => [column.key, column.label]))
		expect(labels).toEqual({ title: 'Naam', scheduledDate: 'Date' })
	})
})
