/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `quickFilterPlacement: "card"`: the lenses as a segmented control at the
 * top of the list card, a caption beside them and the filter strip under
 * them (board PqWachtrij).
 *
 * @spec openspec/changes/index-lenses-in-list-card/specs/index-lenses-in-list-card/spec.md#requirement-the-quick-filters-can-sit-in-the-list-card
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

const SCHEMA = { title: 'Ticket', properties: { channel: { title: 'Kanaal', enum: ['web', 'email'] }, kind: { title: 'Soort' } } }

const LENSES = [
	{ label: 'All', filter: {}, default: true },
	{ label: 'Requests', filter: { kind: 'request' } },
]

async function mountPage(extra = {}) {
	const w = mount(CnIndexPage, {
		propsData: {
			title: 'Wachtrij',
			register: 'pipelinq',
			schema: SCHEMA,
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 9, limit: 20 },
			quickFilters: LENSES,
			filterStrip: { field: 'channel' },
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

describe('CnIndexPage quickFilterPlacement card', () => {
	beforeEach(() => {
		mockCounts.mockReset()
		mockCounts.mockResolvedValue({})
	})

	it('draws the lenses as a segmented control in the list card, the caption beside and the strip under them', async () => {
		const w = await mountPage({ quickFilterPlacement: 'card', quickFilterCaption: 'Kind, then channel' })
		const main = w.find('.cn-index-page__main')
		const head = main.find('[data-testid="cn-index-card-lenses"]')
		expect(head.exists()).toBe(true)
		const options = head.findAll('.cn-segmented-control__option')
		expect(options.map((o) => o.text().replace(/\s+/g, ' ').trim())).toEqual(['All', 'Requests'])
		expect(options[0].attributes('aria-checked')).toBe('true')
		expect(head.find('[data-testid="cn-index-card-lenses-caption"]').text()).toBe('Kind, then channel')
		expect(main.find('[data-testid="cn-index-filter-strip"]').exists()).toBe(true)
		expect(w.findAll('[data-testid="cn-index-filter-strip"]')).toHaveLength(1)
		expect(w.find('[data-testid="cn-index-page-quick-filter-row"]').exists()).toBe(false)
		expect(w.vm.quickFilterTabsInToolbar).toBe(false)
	})

	it('a segment picks the lens', async () => {
		const w = await mountPage({ quickFilterPlacement: 'card' })
		await w.findAll('[data-testid="cn-index-card-lenses"] .cn-segmented-control__option')[1].trigger('click')
		expect(w.emitted('quick-filter-change')).toEqual([[1]])
		expect(w.findAll('[data-testid="cn-index-card-lenses"] .cn-segmented-control__option')[1].attributes('aria-checked')).toBe('true')
	})

	it('keeps the lenses when the lens has no rows', async () => {
		const w = await mountPage({ quickFilterPlacement: 'card', objects: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 } })
		expect(w.find('.cn-index-page__main [data-testid="cn-index-card-lenses"]').exists()).toBe(true)
	})

	it('leaves other placements as they were', async () => {
		const w = await mountPage()
		expect(w.find('[data-testid="cn-index-card-lenses"]').exists()).toBe(false)
		expect(w.find('.cn-index-page__main [data-testid="cn-index-filter-strip"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-filter-strip"]').exists()).toBe(true)
	})

	it('is a manifest key', () => {
		const manifest = (config) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'Queue', route: '/queue', type: 'index', title: 'Queue', config: { register: 'r', schema: 'ticket', ...config } }],
		})
		expect(validateManifestV2(manifest({ quickFilterPlacement: 'card', quickFilterCaption: 'Kind, then channel' })).valid).toBe(true)
		expect(validateManifestV2(manifest({ quickFilterPlacementByView: { table: 'card' } })).valid).toBe(true)
		expect(validateManifestV2(manifest({ quickFilterCaption: 3 })).valid).toBe(false)
	})
})
