/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the `calendar` view mode on CnIndexPage (index-calendar-view-mode).
 *
 * @spec openspec/changes/index-calendar-view-mode/tasks.md#task-1
 * @spec openspec/changes/index-calendar-view-mode/tasks.md#task-2
 */

// `mock`-prefixed so jest.mock()'s hoisted factory can reference the var.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
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
	CnObjectCalendar: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const ROWS = [
	{ id: 'a', title: 'Kerkstraat 12', inspectionDate: '2026-09-03', inspectionEnd: '2026-09-05' },
	{ id: 'b', title: 'Molenlaan 3', inspectionDate: '2026-09-10', inspectionEnd: '2026-09-10' },
]

const CALENDAR = { dateField: 'inspectionDate', endDateField: 'inspectionEnd', titleField: 'title' }

function mountPage(propsData = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Inspections', objects: ROWS, ...propsData },
		stubs,
		mocks: {
			$route: { params: {}, query: {}, name: 'inspections' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
	})
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	jest.clearAllMocks()
})

describe('CnIndexPage calendar view mode', () => {
	it('renders CnObjectCalendar with the configured fields and the current rows', () => {
		const wrapper = mountPage({ viewMode: 'calendar', calendar: CALENDAR, viewModes: ['table', 'calendar'] })
		const calendar = wrapper.findComponent({ name: 'CnObjectCalendar' })
		expect(calendar.exists()).toBe(true)
		expect(calendar.props('dateField')).toBe('inspectionDate')
		expect(calendar.props('endDateField')).toBe('inspectionEnd')
		expect(calendar.props('titleField')).toBe('title')
		expect(calendar.props('objects')).toHaveLength(2)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).exists()).toBe(false)
		wrapper.unmount()
	})

	it('offers the segment only when viewModes lists calendar and a date field is named', () => {
		expect(mountPage({ viewModes: ['table', 'calendar'], calendar: CALENDAR }).vm.effectiveToggleModes).toContain('calendar')
		expect(mountPage({ viewModes: ['table'], calendar: CALENDAR }).vm.effectiveToggleModes).not.toContain('calendar')
		expect(mountPage({ viewModes: ['table', 'calendar'], calendar: {} }).vm.effectiveToggleModes).not.toContain('calendar')
	})

	it('opens the record on an entry click, as a row click does', async () => {
		const wrapper = mountPage({ viewMode: 'calendar', calendar: CALENDAR, selectable: false })
		wrapper.findComponent({ name: 'CnObjectCalendar' }).vm.$emit('object-click', ROWS[0])
		await tick()
		expect(wrapper.emitted('row-click')).toBeTruthy()
		wrapper.unmount()
	})

	it('a page that does not opt in is unchanged', () => {
		const wrapper = mountPage({})
		expect(wrapper.vm.currentViewMode).not.toBe('calendar')
		expect(wrapper.findComponent({ name: 'CnObjectCalendar' }).exists()).toBe(false)
		wrapper.unmount()
	})

	it('"+N" on a day switches to the table filtered to that day', async () => {
		const wrapper = mountPage({ viewMode: 'calendar', calendar: CALENDAR })
		wrapper.findComponent({ name: 'CnObjectCalendar' }).vm.$emit('day-select', '2026-09-10')
		await tick()
		expect(wrapper.vm.currentViewMode).toBe('table')
		wrapper.unmount()
	})
})

describe('CnIndexPage calendar month range', () => {
	function lastParams() {
		const calls = mockStore.fetchCollection.mock.calls
		return calls[calls.length - 1][1] || {}
	}

	async function mountSelfFetch() {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Inspections', register: 'inspect', schema: 'inspection', viewModes: ['table', 'calendar'], calendar: CALENDAR },
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn() } },
		})
		await tick()
		return wrapper
	}

	it('adds the month window to the request and moves it with the month', async () => {
		const wrapper = await mountSelfFetch()
		wrapper.vm.onViewModeChange('calendar')
		await tick()
		wrapper.vm.onCalendarRange({ rangeStart: '2026-08-30', rangeEnd: '2026-10-03' })
		await tick()
		expect(lastParams()['inspectionDate[lte]']).toBe('2026-10-03')
		expect(lastParams()['inspectionEnd[gte]']).toBe('2026-08-30')
		wrapper.vm.onCalendarRange({ rangeStart: '2026-09-27', rangeEnd: '2026-10-31' })
		await tick()
		expect(lastParams()['inspectionDate[lte]']).toBe('2026-10-31')
		expect(lastParams()['inspectionEnd[gte]']).toBe('2026-09-27')
		wrapper.unmount()
	})

	it('uses a start/end window on the date field alone when there is no end field', async () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Inspections', register: 'inspect', schema: 'inspection', viewMode: 'calendar', viewModes: ['table', 'calendar'], calendar: { dateField: 'inspectionDate' } },
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn() } },
		})
		await tick()
		wrapper.vm.onCalendarRange({ rangeStart: '2026-09-01', rangeEnd: '2026-09-30' })
		await tick()
		expect(lastParams()['inspectionDate[gte]']).toBe('2026-09-01')
		expect(lastParams()['inspectionDate[lte]']).toBe('2026-09-30')
		wrapper.unmount()
	})

	it('removes the range when leaving calendar mode', async () => {
		const wrapper = await mountSelfFetch()
		wrapper.vm.onViewModeChange('calendar')
		await tick()
		wrapper.vm.onCalendarRange({ rangeStart: '2026-08-30', rangeEnd: '2026-10-03' })
		await tick()
		expect(lastParams()['inspectionDate[lte]']).toBeDefined()
		wrapper.vm.onViewModeChange('table')
		await tick()
		await tick()
		expect(lastParams()['inspectionDate[lte]']).toBeUndefined()
		expect(lastParams()['inspectionEnd[gte]']).toBeUndefined()
		wrapper.unmount()
	})
})
