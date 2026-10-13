/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `filterStrip`: a second filter strip on one field under the toolbar, with
 * counts within the active quick filter (board PqWachtrij: the kind in the
 * quick filters, the channel in this strip).
 *
 * @spec openspec/changes/screens-filter-strip/specs/index-filter-strip/spec.md#requirement-an-index-page-can-draw-a-second-filter-strip
 */
var mockCounts = jest.fn()

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/fetchFilterCounts.js'),
	fetchFilterCounts: (...args) => mockCounts(...args),
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = { title: 'Ticket', properties: { channel: { title: 'Kanaal', enum: ['web', 'email', 'desk'] }, kind: { title: 'Soort' } } }

async function mountPage(extra = {}) {
	const w = mount(CnIndexPage, {
		propsData: {
			title: 'Wachtrij',
			register: 'pipelinq',
			schema: SCHEMA,
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 9, limit: 20 },
			...extra,
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Queue' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
		},
	})
	await flushPromises()
	return w
}

const pills = (w) => w.findAll('.cn-index-page__filter-strip-pill').map((b) => b.element.textContent.replace(/\s+/g, ' ').trim())

describe('CnIndexPage filterStrip', () => {
	beforeEach(() => {
		mockCounts.mockReset()
		mockCounts.mockResolvedValue({ all: 9, v0: 5, v1: 2, v2: 2 })
	})

	it('draws All and the schema enum values, nothing without the key', async () => {
		const w = await mountPage({ filterStrip: { field: 'channel' } })
		expect(pills(w)).toEqual(['All', 'web', 'email', 'desk'])
		expect(w.find('[data-testid="cn-index-filter-strip"]').attributes('aria-label')).toBe('Kanaal')
		expect(mockCounts).not.toHaveBeenCalled()
		const none = await mountPage()
		expect(none.find('[data-testid="cn-index-filter-strip"]').exists()).toBe(false)
	})

	it('uses the options and counts each pill within the active quick filter', async () => {
		const w = await mountPage({
			schema: 'ticket',
			quickFilters: [{ label: 'Klachten', filter: { kind: 'complaint' } }],
			filterStrip: { field: 'channel', allLabel: 'Alle', options: [{ value: 'web', label: 'Mijn Zuiddrecht' }, { value: 'email', label: 'E-mail' }, { value: 'desk', label: 'Balie' }], showCount: true },
		})
		await w.vm.onQuickFilterChange(0)
		await flushPromises()
		expect(pills(w)).toEqual(['Alle 9', 'Mijn Zuiddrecht 5', 'E-mail 2', 'Balie 2'])
		const last = mockCounts.mock.calls[mockCounts.mock.calls.length - 1][0]
		expect(last.baseFilter).toEqual({ kind: 'complaint' })
		expect(last.entries).toEqual([{ key: 'all', filter: {} }, { key: 'v0', filter: { channel: 'web' } }, { key: 'v1', filter: { channel: 'email' } }, { key: 'v2', filter: { channel: 'desk' } }])
	})

	it('a pill sets the field filter, All clears it, and the active pill is pressed', async () => {
		const w = await mountPage({ filterStrip: { field: 'channel' }, activeFilters: { channel: ['email'] } })
		expect(w.find('[data-testid="cn-index-filter-strip-v1"]').attributes('aria-pressed')).toBe('true')
		expect(w.find('[data-testid="cn-index-filter-strip-all"]').attributes('aria-pressed')).toBe('false')
		await w.find('[data-testid="cn-index-filter-strip-v2"]').trigger('click')
		await w.find('[data-testid="cn-index-filter-strip-all"]').trigger('click')
		expect(w.emitted('filter-change')).toEqual([[{ key: 'channel', values: ['desk'] }], [{ key: 'channel', values: [] }]])
	})

	it('is a manifest key', () => {
		const manifest = (filterStrip) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'Queue', route: '/queue', type: 'index', title: 'Queue', config: { register: 'r', schema: 'ticket', filterStrip } }],
		})
		expect(validateManifestV2(manifest({ field: 'channel', showCount: true, options: [{ value: 'web', label: 'Web' }] })).valid).toBe(true)
		expect(validateManifestV2(manifest({ showCount: true })).valid).toBe(false)
	})
})
