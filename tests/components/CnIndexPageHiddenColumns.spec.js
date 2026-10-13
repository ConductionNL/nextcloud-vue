/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A declared column with `hidden: true` starts hidden: it is not in the table
 * until the visible-column set names it, which the person does from the
 * Columns tab (screens-column-hidden-by-default).
 *
 * @spec openspec/changes/screens-column-hidden-by-default/specs/index-page/spec.md
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
		meetingType: { type: 'string', title: 'Type' },
		scheduledDate: { type: 'string', format: 'date-time', title: 'Date' },
	},
}

const columns = [
	'title',
	{ key: 'meetingType', label: 'Type', hidden: true },
	'scheduledDate',
	{ key: 'custom', label: 'Custom', hidden: true },
	{ key: 'other', label: 'Other' },
]

const keysOf = (wrapper) => wrapper.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))

/**
 * @param {object} propsData Component props.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData) {
	return mount(CnIndexPage, {
		propsData: { title: 'Meetings', ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
	})
}

describe('a column marked hidden: true', () => {
	it('is left out when the page has no visible-column set', () => {
		const wrapper = mountPage({ schema, columns, objects: [] })
		expect(keysOf(wrapper)).toEqual(['title', 'scheduledDate', 'other'])
	})

	it('shows once the visible-column set names it, governed or not', () => {
		const wrapper = mountPage({ schema, columns, objects: [], visibleColumns: ['title', 'meetingType', 'scheduledDate', 'custom'] })
		expect(keysOf(wrapper)).toEqual(expect.arrayContaining(['title', 'meetingType', 'scheduledDate', 'custom', 'other']))
	})

	it('stays hidden while the visible-column set does not name it', () => {
		const wrapper = mountPage({ schema, columns, objects: [], visibleColumns: ['title', 'scheduledDate'] })
		expect(keysOf(wrapper)).toEqual(['title', 'scheduledDate', 'other'])
	})

	it('starts outside the seeded visible set of a self-fetching page, so the Columns tab shows it off', () => {
		const wrapper = mountPage({ register: 'decidiq', schema: 'meeting', columns })
		expect(wrapper.vm.list.visibleColumns.value).toEqual(['title', 'scheduledDate', 'other'])
		expect(keysOf(wrapper)).not.toContain('meetingType')
		expect(keysOf(wrapper)).not.toContain('custom')
	})

	it('changes nothing for a page without the key', () => {
		const plain = ['title', { key: 'meetingType', label: 'Type' }, 'scheduledDate']
		const wrapper = mountPage({ schema, columns: plain, objects: [] })
		expect(keysOf(wrapper)).toEqual(['title', 'meetingType', 'scheduledDate'])
	})
})
