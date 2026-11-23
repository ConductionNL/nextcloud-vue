/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A logs page draws the filter controls it declares (`filterControls`) and
 * keeps them in the address, so a filtered view is a link (nextcloud-vue#1291,
 * integriq observability-log-filters).
 *
 * @spec openspec/changes/logs-page-filter-controls/specs/logs-page-filter-controls/spec.md
 */
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	errors: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Call log', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Call log', properties: {} })),
}
jest.mock('../../src/store/index.js', () => ({ __esModule: true, useObjectStore: () => mockStore, createObjectStore: () => () => mockStore }))
const mockLoadOptions = jest.fn()
jest.mock('../../src/utils/optionsFrom.js', () => {
	const actual = jest.requireActual('../../src/utils/optionsFrom.js')
	return { ...actual, loadOptionsFrom: (...a) => mockLoadOptions(...a) }
})

const { mount } = require('@vue/test-utils')
const CnLogsPage = require('../../src/components/CnLogsPage/CnLogsPage.vue').default
const { queryWithControl, queryWithDefaults, selectFilters } = require('../../src/utils/logFilterControls.js')

const CONTROLS = [
	{ key: 'statusCode', label: 'Status', type: 'select', options: [{ label: 'Success', filter: { statusCode: { gte: 200, lt: 400 } } }, { label: 'Server error', filter: { statusCode: { gte: 500 } } }] },
	{ key: 'source', label: 'Source', type: 'reference', optionsFrom: { register: 'integriq', schema: 'source', labelKey: 'name', valueKey: 'uuid' } },
	{ key: 'created', label: 'Time', type: 'dateRange', range: { defaultDays: 7 } },
]
const flush = () => new Promise((resolve) => setTimeout(resolve))
const stubs = { CnDataTable: true, CnPagination: true, CnPageHeader: true, CnDetailGrid: true, NcLoadingIcon: true, NcEmptyContent: true, NcDialog: true, NcButton: true, NcSelect: true, CnDateRangePicker: true }

function mountPage(query = {}) {
	const replace = jest.fn(() => Promise.resolve())
	const w = mount(CnLogsPage, {
		propsData: { register: 'integriq', schema: 'call_log', filterControls: CONTROLS, filter: { direction: 'outbound' } },
		stubs,
		mocks: { $route: { query, params: {} }, $router: { push: jest.fn(), replace } },
	})
	return { w, replace }
}

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
	mockLoadOptions.mockReset()
	mockLoadOptions.mockResolvedValue([{ id: 'u1', label: 'BRP' }])
})

describe('logFilterControls', () => {
	it('turns the chosen select option into its filter and keeps the other query entries', () => {
		expect(selectFilters(CONTROLS, { _f_statusCode: '1' })).toEqual({ statusCode: { gte: 500 } })
		expect(selectFilters(CONTROLS, { _f_statusCode: '9' })).toEqual({})
		expect(queryWithControl({ page: '2', source: 'u1' }, CONTROLS[1], null)).toEqual({ page: '2' })
		expect(queryWithControl({}, CONTROLS[2], { from: 'A', to: 'B' })).toEqual({ 'created[gte]': 'A', 'created[lte]': 'B' })
		expect(queryWithControl({ _f_statusCode: '0' }, CONTROLS[0], 1)).toEqual({ _f_statusCode: '1' })
	})

	it('preselects the last N days only when the address holds no range', () => {
		const now = new Date('2026-11-15T00:00:00Z')
		expect(queryWithDefaults({}, CONTROLS, now)).toEqual({ 'created[gte]': '2026-11-08T00:00:00.000Z', 'created[lte]': '2026-11-15T00:00:00.000Z' })
		expect(queryWithDefaults({ 'created[gte]': 'x' }, CONTROLS, now)).toBeNull()
	})
})

describe('CnLogsPage filterControls', () => {
	it('draws the controls and loads the reference options', async () => {
		const { w } = mountPage({ 'created[gte]': 'a' })
		await flush()
		expect(w.findAll('[data-testid^="cn-logs-page-filter-"]')).toHaveLength(3)
		expect(mockLoadOptions).toHaveBeenCalledWith(expect.objectContaining({ register: 'integriq', schema: 'source', valueField: 'uuid', labelField: 'name' }))
		expect(w.vm.selectedReference(CONTROLS[1])).toBeNull()
	})

	it('folds the address into the fetch, the page filter winning a collision', async () => {
		mountPage({ _f_statusCode: '1', source: 'u1', 'created[gte]': '2026-11-01', direction: 'inbound' })
		await flush()
		expect(mockStore.fetchCollection.mock.calls[0][1]).toMatchObject({ statusCode: { gte: 500 }, source: 'u1', 'created[gte]': '2026-11-01', direction: 'outbound' })
	})

	it('writes a change to the address and restores a reference set by a row action link', async () => {
		const { w, replace } = mountPage({ source: 'u1', 'created[gte]': 'a' })
		await flush()
		expect(w.vm.selectedReference(CONTROLS[1])).toEqual({ id: 'u1', label: 'BRP' })
		w.vm.setControl(CONTROLS[0], 0)
		expect(replace).toHaveBeenLastCalledWith({ query: { source: 'u1', 'created[gte]': 'a', _f_statusCode: '0' } })
	})

	it('preselects the default range on open', async () => {
		const { replace } = mountPage({})
		await flush()
		expect(Object.keys(replace.mock.calls[0][0].query)).toEqual(['created[gte]', 'created[lte]'])
	})
})

describe('the manifest', () => {
	it('accepts filterControls on a logs page', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [{ id: 'SourceLogs', route: '/logs', type: 'logs', title: 'Logs', config: { register: 'integriq', schema: 'call_log', filterControls: CONTROLS } }] }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})
