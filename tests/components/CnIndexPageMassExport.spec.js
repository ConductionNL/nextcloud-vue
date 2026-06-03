/**
 * Tests for CnIndexPage's self-fetch mass export.
 *
 * In self-fetch (manifest) mode there is no `@mass-export` listener (CnPageRenderer
 * forwards props, not events), so the page must perform the export itself against
 * OpenRegister's objects export endpoint and trigger the download. Regression
 * guard: previously onMassExportConfirm only `$emit`'d, so pressing Export on a
 * manifest page did nothing — no fetch, no error.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {}, loading: {}, pagination: {}, facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Decision', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Decision', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnPageHeader: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true, NcEmptyContent: true, CnIcon: true,
}

function mountPage(propsData) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
	})
}

describe('CnIndexPage — self-fetch mass export', () => {
	let fetchMock, clickSpy, createSpy

	beforeEach(() => {
		fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			blob: async () => new Blob(['data'], { type: 'text/csv' }),
			headers: { get: () => 'attachment; filename="decidesk_decision.csv"' },
		})
		global.fetch = fetchMock
		// jsdom doesn't implement these — define them so they're spy-able.
		createSpy = jest.fn(() => 'blob:mock')
		window.URL.createObjectURL = createSpy
		window.URL.revokeObjectURL = jest.fn()
		clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
		delete window.URL.createObjectURL
		delete window.URL.revokeObjectURL
	})

	it('fetches the OR export endpoint with the chosen format and downloads the file', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await wrapper.vm.onMassExportConfirm({ format: 'csv' })

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const url = fetchMock.mock.calls[0][0]
		expect(url).toContain('/apps/openregister/api/objects/decidesk/decision/export')
		expect(url).toContain('type=csv')
		expect(createSpy).toHaveBeenCalled()
		expect(clickSpy).toHaveBeenCalled()
	})

	it('self-handles instead of emitting mass-export in self-fetch mode', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await wrapper.vm.onMassExportConfirm({ format: 'excel' })
		expect(wrapper.emitted('mass-export')).toBeFalsy()
	})

	it('emits mass-export (no fetch) when NOT in self-fetch mode', async () => {
		const wrapper = mountPage({ title: 'Decisions' })
		await wrapper.vm.onMassExportConfirm({ format: 'csv' })
		expect(fetchMock).not.toHaveBeenCalled()
		expect(wrapper.emitted('mass-export')[0][0]).toEqual({ format: 'csv' })
	})
})

describe('CnIndexPage — self-fetch mass import', () => {
	let fetchMock

	beforeEach(() => {
		fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		global.fetch = fetchMock
	})

	afterEach(() => {
		delete global.fetch
	})

	it('POSTs the file to the OR register import endpoint (multipart, no Content-Type)', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		const file = new File(['{}'], 'objects.json', { type: 'application/json' })
		await wrapper.vm.onMassImportConfirm({ file, options: {} })

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, opts] = fetchMock.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/registers/decidesk/import')
		expect(opts.method).toBe('POST')
		expect(opts.body).toBeInstanceOf(FormData)
		expect(opts.body.get('file')).toBe(file)
		// multipart: browser must set the boundary, so we must NOT send Content-Type
		expect(opts.headers['Content-Type']).toBeUndefined()
		expect(wrapper.emitted('mass-import')).toBeFalsy()
	})

	it('adds the schema (query + field) for CSV uploads', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		const file = new File(['a,b'], 'rows.csv', { type: 'text/csv' })
		await wrapper.vm.onMassImportConfirm({ file, options: {} })

		const [url, opts] = fetchMock.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/registers/decidesk/import')
		expect(url).toContain('schema=decision')
		expect(opts.body.get('schema')).toBe('decision')
	})

	it('emits mass-import (no fetch) when NOT in self-fetch mode', async () => {
		const wrapper = mountPage({ title: 'Decisions' })
		const file = new File(['{}'], 'objects.json')
		await wrapper.vm.onMassImportConfirm({ file, options: {} })
		expect(fetchMock).not.toHaveBeenCalled()
		expect(wrapper.emitted('mass-import')[0][0]).toEqual({ file, options: {} })
	})
})
